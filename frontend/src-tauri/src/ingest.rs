use crate::models::{Problem, Sample};
use reqwest::header::{HeaderMap, HeaderValue, USER_AGENT};
use serde_json::Value;

pub async fn fetch_luogu_problem(input: String) -> Result<Problem, String> {
    let mut pid = input.trim().to_uppercase();
    
    // If the input is a full URL, extract the problem ID from it
    if pid.contains("LUOGU.COM.CN/PROBLEM/") {
        if let Some(idx) = pid.find("LUOGU.COM.CN/PROBLEM/") {
            let rest = &pid[idx + "LUOGU.COM.CN/PROBLEM/".len()..];
            // Take up to the first '?', '#', or '/'
            let end_idx = rest.find(|c| c == '?' || c == '#' || c == '/').unwrap_or(rest.len());
            pid = rest[..end_idx].to_string();
        }
    }

    let url = format!("https://www.luogu.com.cn/problem/{}", pid);

    let mut headers = HeaderMap::new();
    headers.insert(
        USER_AGENT,
        HeaderValue::from_static(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ),
    );

    let client = reqwest::Client::builder()
        .cookie_store(true)
        .default_headers(headers)
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Network error fetching problem {}: {}", pid, e))?;

    if !resp.status().is_success() {
        return Err(format!("Luogu server returned status {}", resp.status()));
    }

    let body_text = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    // Try parsing as JSON first, in case x-luogu-type works or it's old API
    let json_val: Value = if let Ok(val) = serde_json::from_str(&body_text) {
        val
    } else {
        // Fallback to lentille-context in HTML
        if let Some(caps) = regex::Regex::new(r#"<script id="lentille-context"[^>]*>(?P<data>.*?)</script>"#)
            .unwrap()
            .captures(&body_text)
        {
            serde_json::from_str(caps.name("data").unwrap().as_str())
                .map_err(|e| format!("Failed to parse lentille-context JSON: {}", e))?
        } else if let Some(_caps) = regex::Regex::new(
            r#"window\._feInjection\s*=\s*JSON\.parse\(decodeURIComponent\("(?P<data>[^"]+)"\)\)"#,
        )
        .unwrap()
        .captures(&body_text)
        {
            return Err("Legacy _feInjection found but not supported natively without urlencoding crate".to_string());
        } else {
            return Err("Failed to parse Luogu response: Neither JSON nor lentille-context found in HTML".to_string());
        }
    };

    let pdata = json_val
        .get("currentData")
        .or_else(|| json_val.get("data"))
        .and_then(|d| d.get("problem"))
        .ok_or_else(|| "Invalid Luogu problem response structure".to_string())?;

    let title = pdata
        .get("title")
        .or_else(|| pdata.get("name"))
        .and_then(|t| t.as_str())
        .unwrap_or(&pid)
        .to_string();

    let diff_num = pdata.get("difficulty").and_then(|d| d.as_i64()).unwrap_or(0);
    let difficulty = match diff_num {
        1 => "入门",
        2 => "普及-",
        3 => "普及/提高-",
        4 => "普及+/提高",
        5 => "提高+/省选-",
        6 => "省选/NOI-",
        7 => "NOI/NOI+/CTSC",
        _ => "暂无评定",
    }
    .to_string();

    // The text content might be in `content`, `contenu`, or at the root
    let content_obj = pdata.get("content").or_else(|| pdata.get("contenu"));
    
    let desc = content_obj
        .and_then(|c| c.get("description"))
        .or_else(|| pdata.get("description"))
        .and_then(|d| d.as_str())
        .unwrap_or("")
        .to_string();

    let input_fmt = content_obj
        .and_then(|c| c.get("formatI").or_else(|| c.get("inputFormat")))
        .or_else(|| pdata.get("inputFormat").or_else(|| pdata.get("formatI")))
        .and_then(|d| d.as_str())
        .unwrap_or("")
        .to_string();

    let output_fmt = content_obj
        .and_then(|c| c.get("formatO").or_else(|| c.get("outputFormat")))
        .or_else(|| pdata.get("outputFormat").or_else(|| pdata.get("formatO")))
        .and_then(|d| d.as_str())
        .unwrap_or("")
        .to_string();

    let hint = content_obj
        .and_then(|c| c.get("hint"))
        .or_else(|| pdata.get("hint"))
        .and_then(|d| d.as_str())
        .unwrap_or("")
        .to_string();

    let time_lim = pdata
        .get("limits")
        .and_then(|l| l.get("time"))
        .and_then(|t| t.as_array())
        .and_then(|arr| arr.first())
        .and_then(|v| v.as_u64())
        .unwrap_or(1000);

    let mem_lim = pdata
        .get("limits")
        .and_then(|l| l.get("memory"))
        .and_then(|t| t.as_array())
        .and_then(|arr| arr.first())
        .and_then(|v| v.as_u64())
        .unwrap_or(128000);

    let mut samples = Vec::new();
    if let Some(s_arr) = pdata.get("samples").and_then(|s| s.as_array()) {
        for item in s_arr {
            if let Some(pair) = item.as_array() {
                let inp = pair.get(0).and_then(|v| v.as_str()).unwrap_or("").to_string();
                let out = pair.get(1).and_then(|v| v.as_str()).unwrap_or("").to_string();
                samples.push(Sample {
                    input: inp,
                    output: out,
                });
            }
        }
    }

    Ok(Problem {
        id: pid.clone(),
        title,
        oj: "Luogu".to_string(),
        difficulty,
        tags: vec![],
        time_limit_ms: time_lim,
        memory_limit_kb: mem_lim,
        description_md: desc,
        input_format: input_fmt,
        output_format: output_fmt,
        samples,
        hint,
        source_url: format!("https://www.luogu.com.cn/problem/{}", pid),
        is_favorite: false,
        last_practiced: None,
    })
}
