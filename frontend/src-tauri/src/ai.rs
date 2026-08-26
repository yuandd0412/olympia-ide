use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
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

    let url = if base_url.ends_with("/chat/completions") {
        base_url
    } else {
        format!("{}/chat/completions", base_url.trim_end_matches('/'))
    };

    let client = reqwest::Client::new();
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
