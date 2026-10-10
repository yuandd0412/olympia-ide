//! AI-assisted repair of imported problems.
//! Scrapers often miss samples / notes / I-O specs when HTML structure drifts.
//! After a fetch, we ask the configured OpenAI-compatible model to extract a
//! strict JSON object and only fill **empty** fields (never overwrite Luogu).

use crate::models::{Problem, Sample};
use serde_json::{json, Value};
use std::time::Duration;

/// Luogu statements arrive complete from ingest; their empty hint must not
/// trigger an AI pass (which would inject a model-written hint into a full
/// statement). ingest writes `oj: "Luogu"`; older saved problems may carry
/// the legacy Chinese label, so honor both.
fn is_luogu_oj(oj: &str) -> bool {
    oj == "Luogu" || oj == "洛谷"
}

/// True when the problem looks under-parsed and worth an AI pass.
pub fn needs_enrichment(p: &Problem) -> bool {
    p.samples.is_empty()
        || p.samples.iter().any(|s| s.input.trim().is_empty() || s.output.trim().is_empty())
        || p.input_format.trim().is_empty()
        || p.output_format.trim().is_empty()
        || (p.hint.trim().is_empty() && !is_luogu_oj(&p.oj))
        || p.description_md.len() < 80
}

/// Hard wall-clock cap for the whole AI pass (the strict request and its one
/// fallback retry share it): a slow endpoint must never stall problem import,
/// and timing out simply keeps the scraped fields.
const ENRICH_TOTAL: Duration = Duration::from_secs(45);

/// Best-effort AI enrichment. Returns the original problem on any failure
/// so import never breaks because the model is offline.
pub async fn enrich_problem(mut p: Problem) -> Problem {
    if !needs_enrichment(&p) {
        return p;
    }
    let settings = crate::storage::load_settings();
    if settings.ai_api_key.trim().is_empty() {
        log::debug!("enrich {}: skipped, no API key", p.id);
        return p;
    }

    let pid = p.id.clone();
    let raw = p.description_md.clone();
    let prompt = build_prompt(&p, &raw);

    let extracted = tokio::time::timeout(ENRICH_TOTAL, async move {
        let messages = vec![crate::ai::ChatMessage {
            role: "user".to_string(),
            content: prompt,
        }];
        // Slightly lower temp + more tokens: structured extraction, not chat.
        match ask_extract(
            settings.ai_base_url,
            settings.ai_api_key,
            settings.ai_model,
            messages,
        )
        .await
        {
            Ok(reply) => match extract_json_object(&reply) {
                Some(obj) => Some(obj),
                None => {
                    log::debug!("enrich {pid}: reply is not JSON, keeping scraped fields");
                    None
                }
            },
            Err(e) => {
                log::debug!("enrich {pid}: AI request failed: {e}");
                None
            }
        }
    })
    .await;

    match extracted {
        Ok(Some(obj)) => {
            merge_extracted(&mut p, &obj);
            log::debug!("enrich {}: extraction merged", p.id);
        }
        Ok(None) => {}
        Err(_) => log::debug!("enrich {}: overall timeout, keeping scraped fields", p.id),
    }
    p
}

fn build_prompt(p: &Problem, raw: &str) -> String {
    format!(
        r#"你是竞赛题目结构化抽取器。根据下面的题目原文，输出**仅含 JSON**（无 markdown 围栏、无解释），字段如下：

{{
  "description_md": "完整题面 Markdown（保留题意、公式可用 $...$；去掉输入输出格式小节与样例小节）",
  "input_format": "输入格式（纯文本）",
  "output_format": "输出格式（纯文本）",
  "samples": [{{"input": "...", "output": "..."}}],
  "hint": "提示 / Note / 特殊说明 / 数据范围补充；没有则空字符串"
}}

规则：
- 样例必须成对；无法确定输出时可省略 samples 或留空数组。
- 不要编造样例。原文缺失的信息对应字段留空字符串 []。
- 输出必须是合法 JSON。

【元数据】OJ={} ID={} 标题={}
【题面原文开始】
{}
【题面原文结束】"#,
        p.oj,
        p.id,
        p.title,
        truncate(raw, 12000)
    )
}

async fn ask_extract(
    base_url: String,
    api_key: String,
    model: String,
    messages: Vec<crate::ai::ChatMessage>,
) -> Result<String, String> {
    if api_key.trim().is_empty() {
        return Err("no key".into());
    }
    let url = crate::ai::chat_completions_url(&base_url);
    // Import must never stall on a slow endpoint: connect 10s, 45s per request.
    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .timeout(Duration::from_secs(45))
        .build()
        .map_err(|e| e.to_string())?;
    let user_content = messages
        .first()
        .map(|m| m.content.clone())
        .ok_or("no messages")?;

    // Strict attempt first. Some OpenAI-compatible servers reject
    // response_format outright, others accept it yet still answer with
    // prose — either way, fall back once without it.
    match request_extract(&client, &url, &api_key, &model, &user_content, true).await {
        Ok(content) if extract_json_object(&content).is_some() => Ok(content),
        _ => request_extract(&client, &url, &api_key, &model, &user_content, false).await,
    }
}

/// One extraction request; `strict` adds `response_format: json_object`.
async fn request_extract(
    client: &reqwest::Client,
    url: &str,
    api_key: &str,
    model: &str,
    user_content: &str,
    strict: bool,
) -> Result<String, String> {
    let mut body = json!({
        "model": model,
        "messages": [
            {"role": "system", "content": "You extract contest problem fields as strict JSON only."},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.1,
        "max_tokens": 4096,
    });
    if strict {
        body["response_format"] = json!({"type": "json_object"});
    }
    let resp = client
        .post(url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        let t = resp.text().await.unwrap_or_default();
        return Err(t);
    }
    let v: Value = resp.json().await.map_err(|e| e.to_string())?;
    let content = v
        .pointer("/choices/0/message/content")
        .and_then(|c| c.as_str())
        .ok_or("empty content")?
        .to_string();
    Ok(content)
}

fn extract_json_object(s: &str) -> Option<Value> {
    let t = s.trim();
    let t = t
        .trim_start_matches("```json")
        .trim_start_matches("```JSON")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    if let Ok(v) = serde_json::from_str::<Value>(t) {
        return Some(v);
    }
    let start = t.find('{')?;
    let end = t.rfind('}')?;
    if end <= start {
        return None;
    }
    serde_json::from_str(&t[start..=end]).ok()
}

/// Fill only empty / clearly broken fields from the model output.
fn merge_extracted(p: &mut Problem, obj: &Value) {
    if let Some(desc) = obj.get("description_md").and_then(|v| v.as_str()) {
        let d = desc.trim();
        if !d.is_empty() && (p.description_md.trim().is_empty() || p.description_md.len() < 80) {
            p.description_md = d.to_string();
        }
    }
    if let Some(v) = obj.get("input_format").and_then(|v| v.as_str()) {
        let v = v.trim();
        if !v.is_empty() && p.input_format.trim().is_empty() {
            p.input_format = v.to_string();
        }
    }
    if let Some(v) = obj.get("output_format").and_then(|v| v.as_str()) {
        let v = v.trim();
        if !v.is_empty() && p.output_format.trim().is_empty() {
            p.output_format = v.to_string();
        }
    }
    if let Some(v) = obj.get("hint").and_then(|v| v.as_str()) {
        let v = v.trim();
        if !v.is_empty() && p.hint.trim().is_empty() {
            p.hint = v.to_string();
        }
    }
    if let Some(arr) = obj.get("samples").and_then(|v| v.as_array()) {
        let incoming: Vec<Sample> = arr
            .iter()
            .filter_map(|s| {
                Some(Sample {
                    input: s.get("input")?.as_str()?.to_string(),
                    output: s.get("output")?.as_str()?.to_string(),
                })
            })
            .filter(|s| !s.input.trim().is_empty() || !s.output.trim().is_empty())
            .collect();
        let existing_empty = p.samples.is_empty()
            || p.samples.iter().all(|s| s.input.trim().is_empty() && s.output.trim().is_empty());
        if existing_empty && !incoming.is_empty() {
            p.samples = incoming;
        } else if !existing_empty {
            // Fill blanks inside existing pairs only.
            for (dst, src) in p.samples.iter_mut().zip(incoming.iter()) {
                if dst.input.trim().is_empty() && !src.input.trim().is_empty() {
                    dst.input = src.input.clone();
                }
                if dst.output.trim().is_empty() && !src.output.trim().is_empty() {
                    dst.output = src.output.clone();
                }
            }
        }
    }
}

fn truncate(s: &str, n: usize) -> String {
    if s.len() <= n {
        return s.to_string();
    }
    // Do not split a UTF-8 char.
    let mut end = n;
    while end > 0 && !s.is_char_boundary(end) {
        end -= 1;
    }
    format!("{}…", &s[..end])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_json_with_fence() {
        let v = extract_json_object("```json\n{\"hint\":\"x\"}\n```").unwrap();
        assert_eq!(v["hint"], "x");
    }

    #[test]
    fn parses_json_object_with_junk_around_it() {
        let v = extract_json_object("Here you go:\n{\"a\":1}\nHope that helps!").unwrap();
        assert_eq!(v["a"], 1);
    }

    #[test]
    fn merge_fills_empty_hint_and_samples() {
        let mut p = Problem {
            id: "CF1A".into(),
            title: "t".into(),
            oj: "Codeforces".into(),
            difficulty: "入门".into(),
            tags: vec![],
            time_limit_ms: 2000,
            memory_limit_kb: 262144,
            description_md: "short".into(),
            input_format: String::new(),
            output_format: String::new(),
            samples: vec![],
            hint: String::new(),
            source_url: String::new(),
            is_favorite: false,
            last_practiced: None,
        };
        let obj = serde_json::json!({
            "description_md": "longer description",
            "input_format": "n m",
            "output_format": "answer",
            "samples": [{"input": "1 2", "output": "3"}],
            "hint": "watch overflow"
        });
        merge_extracted(&mut p, &obj);
        assert_eq!(p.input_format, "n m");
        assert_eq!(p.samples.len(), 1);
        assert_eq!(p.hint, "watch overflow");
        assert_eq!(p.description_md, "longer description");
    }

    #[test]
    fn merge_does_not_overwrite_luogu_fields() {
        let mut p = Problem {
            id: "P1001".into(),
            title: "t".into(),
            oj: "洛谷".into(),
            difficulty: "入门".into(),
            tags: vec![],
            time_limit_ms: 1000,
            memory_limit_kb: 128000,
            description_md: "A+B problem full statement here".into(),
            input_format: "two ints".into(),
            output_format: "sum".into(),
            samples: vec![Sample {
                input: "1 2".into(),
                output: "3".into(),
            }],
            hint: String::new(),
            source_url: String::new(),
            is_favorite: false,
            last_practiced: None,
        };
        let obj = serde_json::json!({
            "description_md": "WRONG",
            "input_format": "WRONG",
            "samples": [{"input": "x", "output": "y"}],
            "hint": "note from model"
        });
        merge_extracted(&mut p, &obj);
        assert_eq!(p.input_format, "two ints");
        assert_eq!(p.samples[0].input, "1 2");
        assert_eq!(p.hint, "note from model");
    }

    #[test]
    fn needs_enrichment_when_samples_missing() {
        let p = Problem {
            id: "CF1A".into(),
            title: "t".into(),
            oj: "Codeforces".into(),
            difficulty: "入门".into(),
            tags: vec![],
            time_limit_ms: 2000,
            memory_limit_kb: 262144,
            description_md: "x".repeat(200),
            input_format: String::new(),
            output_format: String::new(),
            samples: vec![],
            hint: String::new(),
            source_url: String::new(),
            is_favorite: false,
            last_practiced: None,
        };
        assert!(needs_enrichment(&p));
    }

    #[test]
    fn complete_luogu_problem_with_empty_hint_skips_enrichment() {
        // ingest writes oj "Luogu" (legacy files may say "洛谷"); with every
        // field filled except the hint, no AI pass may fire for either label.
        let mk = |oj: &str| Problem {
            id: "P1001".into(),
            title: "A+B Problem".into(),
            oj: oj.into(),
            difficulty: "入门".into(),
            tags: vec![],
            time_limit_ms: 1000,
            memory_limit_kb: 128000,
            description_md: "x".repeat(200),
            input_format: "two ints".into(),
            output_format: "sum".into(),
            samples: vec![Sample { input: "1 2".into(), output: "3".into() }],
            hint: String::new(),
            source_url: String::new(),
            is_favorite: false,
            last_practiced: None,
        };
        assert!(!needs_enrichment(&mk("Luogu")));
        assert!(!needs_enrichment(&mk("洛谷")));
        // Non-Luogu problems still get enriched on an empty hint.
        assert!(needs_enrichment(&mk("Codeforces")));
    }
}
