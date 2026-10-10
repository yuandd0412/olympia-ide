use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// Fold the frontend-assembled context (problem / code / testcase summary)
/// into the last user message so the request stays a plain chat on the wire.
/// A conversation with no user message gets the context as its own user turn.
pub fn merge_context(mut messages: Vec<ChatMessage>, context: &str) -> Vec<ChatMessage> {
    match messages.iter_mut().rev().find(|m| m.role == "user") {
        Some(last) => last.content.push_str(&format!("\n\n---\n{}", context)),
        None => messages.push(ChatMessage {
            role: "user".to_string(),
            content: context.to_string(),
        }),
    }
    messages
}

pub async fn ask_ai_coach(
    base_url: String,
    api_key: String,
    model: String,
    messages: Vec<ChatMessage>,
) -> Result<String, String> {
    if api_key.trim().is_empty() {
        return Ok(
            "💡 请先在「设置」页面中配置你的 AI API Key（支持 DeepSeek / OpenAI / Claude / Ollama / 任何兼容 OpenAI 接口的模型服务）。\n\n配置完成后即可向 AI 竞赛教练询问算法思路、时间复杂度分析与调试建议！"
                .to_string(),
        );
    }

    let url = chat_completions_url(&base_url);

    // Without a timeout a hung endpoint would leave the UI spinner forever.
    let client = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(15))
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;
    let body = json!({
        "model": model,
        "messages": messages,
        "temperature": 0.6,
        "max_tokens": 2048,
    });

    let resp = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("AI request failed: {}", e))?;

    if !resp.status().is_success() {
        let err_text = resp.text().await.unwrap_or_default();
        return Err(format!("AI API returned error: {}", err_text));
    }

    let res_json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse AI response: {}", e))?;

    let mut reply = res_json
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c0| c0.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|cnt| cnt.as_str())
        .ok_or_else(|| "Empty content from AI response".to_string())?
        .to_string();

    if let Ok(re) = regex::Regex::new(r"(?s)<think>.*?</think>") {
        reply = re.replace_all(&reply, "").to_string();
    }
    
    Ok(reply)
}

/// Default local Ollama base (OpenAI-compatible /v1 endpoint).
const OLLAMA_DEFAULT_BASE: &str = "http://127.0.0.1:11434/v1";

/// Join a base URL with `/chat/completions`, never doubling the suffix.
pub fn chat_completions_url(base_url: &str) -> String {
    let t = base_url.trim();
    if t.ends_with("/chat/completions") {
        t.to_string()
    } else {
        format!("{}/chat/completions", t.trim_end_matches('/'))
    }
}

/// Derive Ollama's native tag-list URL from a possibly `/v1`-style base:
/// `http://127.0.0.1:11434/v1` -> `http://127.0.0.1:11434/api/tags`.
pub fn ollama_tags_url(base_url: &str) -> String {
    let t = base_url.trim().trim_end_matches('/');
    let t = t.strip_suffix("/v1").unwrap_or(t);
    format!("{}/api/tags", t)
}

/// Model ids from an OpenAI-style `/models` reply: `{"data":[{"id":...}]}`.
fn model_ids_from_openai_list(v: &Value) -> Vec<String> {
    v.get("data")
        .and_then(|d| d.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|m| m.get("id").and_then(|i| i.as_str()))
                .map(str::to_string)
                .collect()
        })
        .unwrap_or_default()
}

/// Model names from Ollama's native `/api/tags` reply: `{"models":[{"name":...}]}`.
fn model_names_from_tags(v: &Value) -> Vec<String> {
    v.get("models")
        .and_then(|d| d.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|m| m.get("name").and_then(|n| n.as_str()))
                .map(str::to_string)
                .collect()
        })
        .unwrap_or_default()
}

/// Best-effort model discovery for an Ollama-style server. Any failure
/// (server down, unknown shape) yields an empty list so the UI can simply
/// hide the model dropdown instead of surfacing an error.
pub async fn list_ollama_models(base_url: Option<String>) -> Vec<String> {
    let base = base_url
        .map(|b| b.trim().trim_end_matches('/').to_string())
        .filter(|b| !b.is_empty())
        .unwrap_or_else(|| OLLAMA_DEFAULT_BASE.to_string());

    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
    {
        Ok(c) => c,
        Err(_) => return vec![],
    };

    // OpenAI-compatible /models first, then Ollama's native /api/tags.
    if let Ok(resp) = client.get(format!("{}/models", base)).send().await {
        if resp.status().is_success() {
            if let Ok(v) = resp.json::<Value>().await {
                let ids = model_ids_from_openai_list(&v);
                if !ids.is_empty() {
                    return ids;
                }
            }
        }
    }
    if let Ok(resp) = client.get(ollama_tags_url(&base)).send().await {
        if resp.status().is_success() {
            if let Ok(v) = resp.json::<Value>().await {
                return model_names_from_tags(&v);
            }
        }
    }
    vec![]
}

/// Minimal connectivity probe for the settings page "test connection" button:
/// a 1-token chat request; Ok("ok") means the endpoint answered 2xx.
pub async fn probe_ai_endpoint(
    base_url: Option<String>,
    api_key: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    let base = base_url
        .map(|b| b.trim().to_string())
        .filter(|b| !b.is_empty())
        .ok_or("未配置服务地址")?;
    let model = model
        .map(|m| m.trim().to_string())
        .filter(|m| !m.is_empty())
        .ok_or("未填写模型名")?;
    // Ollama-style servers need no key: omit Authorization instead of failing.
    let api_key = api_key.map(|k| k.trim().to_string()).filter(|k| !k.is_empty());

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .map_err(|e| e.to_string())?;
    let body = json!({
        "model": model,
        "messages": [{"role": "user", "content": "ping"}],
        "max_tokens": 1,
    });
    let mut req = client
        .post(chat_completions_url(&base))
        .header("Content-Type", "application/json")
        .json(&body);
    if let Some(key) = api_key {
        req = req.header("Authorization", format!("Bearer {}", key));
    }
    let resp = req.send().await.map_err(|e| format!("连接失败: {e}"))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        let short: String = text.chars().take(200).collect();
        return Err(format!("HTTP {status}: {short}"));
    }
    Ok("ok".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn msg(role: &str, content: &str) -> ChatMessage {
        ChatMessage {
            role: role.to_string(),
            content: content.to_string(),
        }
    }

    #[test]
    fn context_appends_to_last_user_message() {
        let msgs = vec![
            msg("user", "first question"),
            msg("assistant", "answer"),
            msg("user", "follow-up"),
        ];
        let out = merge_context(msgs, "Problem: P1001 A+B");
        assert_eq!(out.len(), 3);
        assert_eq!(out[2].content, "follow-up\n\n---\nProblem: P1001 A+B");
    }

    #[test]
    fn context_without_user_message_becomes_new_user_turn() {
        let out = merge_context(vec![msg("system", "be concise")], "some context");
        assert_eq!(out.len(), 2);
        assert_eq!(out[1].role, "user");
        assert_eq!(out[1].content, "some context");
    }

    #[test]
    fn chat_completions_url_never_doubles_suffix() {
        assert_eq!(
            chat_completions_url("https://api.openai.com/v1"),
            "https://api.openai.com/v1/chat/completions"
        );
        assert_eq!(
            chat_completions_url("https://api.openai.com/v1/"),
            "https://api.openai.com/v1/chat/completions"
        );
        assert_eq!(
            chat_completions_url("https://x.dev/v1/chat/completions"),
            "https://x.dev/v1/chat/completions"
        );
    }

    #[test]
    fn ollama_tags_url_strips_version_suffix() {
        assert_eq!(
            ollama_tags_url("http://127.0.0.1:11434/v1"),
            "http://127.0.0.1:11434/api/tags"
        );
        assert_eq!(
            ollama_tags_url("http://127.0.0.1:11434/v1/"),
            "http://127.0.0.1:11434/api/tags"
        );
        assert_eq!(
            ollama_tags_url("http://127.0.0.1:11434"),
            "http://127.0.0.1:11434/api/tags"
        );
    }

    #[test]
    fn parses_model_lists_from_both_reply_shapes() {
        let openai = json!({"data": [{"id": "llama3"}, {"id": "qwen2:7b"}]});
        assert_eq!(
            model_ids_from_openai_list(&openai),
            vec!["llama3".to_string(), "qwen2:7b".to_string()]
        );
        let tags = json!({"models": [{"name": "llama3:latest"}]});
        assert_eq!(model_names_from_tags(&tags), vec!["llama3:latest".to_string()]);
        // Unknown shapes degrade to empty, never panic.
        assert!(model_ids_from_openai_list(&json!({})).is_empty());
        assert!(model_names_from_tags(&json!({"models": [{}]})).is_empty());
    }
}
