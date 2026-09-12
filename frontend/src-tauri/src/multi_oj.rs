//! Multi-OJ one-click import: input auto-detection plus Codeforces and
//! AtCoder scrapers. Luogu stays in `ingest.rs`; the dispatcher below routes
//! any user input (bare id or full URL) to the right scraper.

use crate::models::{Problem, Sample};
use serde_json::Value;

/// Strip HTML tags, convert block tags to newlines and decode the common
/// entities so statement text stays readable as markdown-ish plain text.
fn html_to_text(html: &str) -> String {
    let mut s = html.to_string();
    for tag in [
        "</p>", "</div>", "</ul>", "</ol>", "</li>", "<br>", "<br/>", "<br />",
        "</h1>", "</h2>", "</h3>", "</h4>", "</pre>", "</tr>", "</center>",
    ] {
        s = s.replace(tag, "\n");
    }
    let tag_re = regex::Regex::new(r"(?s)<[^>]+>").unwrap();
    s = tag_re.replace_all(&s, "").to_string();
    for (k, v) in [
        ("&lt;", "<"), ("&gt;", ">"), ("&quot;", "\""),
        ("&#39;", "'"), ("&nbsp;", " "),
    ] {
        s = s.replace(k, v);
    }
    s = s.replace("&amp;", "&");
    let num_re = regex::Regex::new(r"&#(\d+);").unwrap();
    let s = num_re
        .replace_all(&s, |c: &regex::Captures| {
            let n: u32 = c[1].parse().unwrap_or(63);
            char::from_u32(n).map(|c| c.to_string()).unwrap_or_default()
        })
        .to_string();
    let lines: Vec<String> = s.lines().map(|l| l.trim().to_string()).collect();
    lines.join("\n").replace("\n\n\n", "\n\n")
}

fn html_decode(s: &str) -> String {
    s.replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
}

/// Map a Codeforces rating to the Luogu-style difficulty vocabulary.
fn cf_difficulty(rating: Option<i64>) -> String {
    match rating {
        Some(r) if r < 1200 => "入门",
        Some(r) if r < 1400 => "普及-",
        Some(r) if r < 1700 => "普及/提高-",
        Some(r) if r < 2100 => "普及+/提高",
        Some(r) if r < 2400 => "提高+/省选-",
        Some(_) => "省选/NOI-",
        None => "暂无评定",
    }
    .to_string()
}

/// True for Codeforces indices like `1900A`, `1234F1` (digits + letter,
/// optionally one trailing sub-index digit).
fn is_cf_index(s: &str) -> bool {
    let b = s.as_bytes();
    if b.len() < 3 || b.len() > 8 || b[0] == b'0' {
        return false;
    }
    let digit_end = b.iter().take_while(|c| c.is_ascii_digit()).count();
    if digit_end < 2 || digit_end >= b.len() || !b[digit_end].is_ascii_alphabetic() {
        return false;
    }
    let rest = &b[digit_end + 1..];
    rest.is_empty() || rest.iter().all(|c| c.is_ascii_digit())
}

/// True for AtCoder task ids like `abc300_a`, `typical90_az`, `practice2a`.
fn is_atcoder_id(s: &str) -> bool {
    let b = s.as_bytes();
    if b.len() < 5 {
        return false;
    }
    match s.find('_') {
        Some(i) => {
            i >= 3
                && b[..i].iter().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit())
                && b[i + 1..].iter().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit())
        }
        None => {
            // abc300a style: lowercase prefix, digits, then a letter suffix
            let prefix_len = b.iter().take_while(|c| c.is_ascii_lowercase()).count();
            let rest = &b[prefix_len..];
            let digit_len = rest.iter().take_while(|c| c.is_ascii_digit()).count();
            prefix_len >= 2
                && digit_len >= 1
                && rest.len() > digit_len
                && rest[digit_len..].iter().all(|c| c.is_ascii_alphabetic())
        }
    }
}

/// Normalize any AtCoder spelling (ABC300A / abc300a / abc300_a) to `abc300_a`.
fn normalize_atcoder_id(s: &str) -> String {
    let lower = s.to_lowercase();
    if lower.contains('_') {
        return lower;
    }
    let prefix_len = lower.bytes().take_while(|c| c.is_ascii_lowercase()).count();
    let digits_len = lower[prefix_len..]
        .bytes()
        .take_while(|c| c.is_ascii_digit())
        .count();
    if prefix_len + digits_len < lower.len() {
        format!(
            "{}{}_{}",
            &lower[..prefix_len],
            &lower[prefix_len..prefix_len + digits_len],
            &lower[prefix_len + digits_len..]
        )
    } else {
        lower
    }
}

fn browser_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(15))
        .timeout(std::time::Duration::from_secs(25))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))
}

fn browser_ua() -> reqwest::header::HeaderValue {
    reqwest::header::HeaderValue::from_static(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    )
}

/// Codeforces problem import. The statement page often 403s non-browser
/// clients; when that happens we still return metadata from the official
/// API (title / rating / tags) plus a source link, degrading gracefully.
async fn fetch_codeforces_problem(index: String) -> Result<Problem, String> {
    // Normalize the letter case ("1900a" -> "1900A") so the API lookup matches.
    let index = index.to_uppercase();
    // `1900A` -> contest `1900`, index `A`
    let split = index
        .rfind(|c: char| c.is_ascii_alphabetic())
        .ok_or_else(|| format!("Invalid Codeforces problem id: {index}"))?;
    let contest_id = index[..split].to_string();
    let letter = index[split..].to_string();
    let url = format!(
        "https://codeforces.com/problemset/problem/{}/{}",
        contest_id, letter
    );

    // Metadata via the official API (best effort - failures degrade gracefully).
    let mut name = format!("Codeforces {index}");
    let mut rating: Option<i64> = None;
    let mut tags: Vec<String> = Vec::new();
    let meta: Result<Value, String> = async {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(20))
            .build()
            .map_err(|e| e.to_string())?;
        let resp = client
            .get("https://codeforces.com/api/problemset.problems")
            .send()
            .await
            .map_err(|e| e.to_string())?;
        let json: Value = resp.json().await.map_err(|e| e.to_string())?;
        Ok(json)
    }
    .await;
    if let Ok(json) = meta {
        if let Some(list) = json.pointer("/result/problems").and_then(|p| p.as_array()) {
            if let Some(p) = list.iter().find(|p| {
                p.get("contestId").and_then(|v| v.as_u64()).unwrap_or(0).to_string() == contest_id
                    && p.get("index").and_then(|v| v.as_str()) == Some(letter.as_str())
            }) {
                if let Some(n) = p.get("name").and_then(|v| v.as_str()) {
                    name = n.to_string();
                }
                rating = p.get("rating").and_then(|v| v.as_i64());
                tags = p
                    .get("tags")
                    .and_then(|v| v.as_array())
                    .map(|a| {
                        a.iter()
                            .filter_map(|t| t.as_str().map(String::from))
                            .collect()
                    })
                    .unwrap_or_default();
            }
        }
    }

    // Statement HTML (may 403 behind anti-bot; degrade to metadata only).
    let mut statement = String::new();
    let mut time_ms: u64 = 2000;
    let mut mem_kb: u64 = 262_144;
    let mut samples: Vec<Sample> = Vec::new();
    let mut statement_ok = false;

    let html_fetch: Result<String, String> = async {
        let client = browser_client()?;
        let resp = client
            .get(&url)
            .header(reqwest::header::USER_AGENT, browser_ua())
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            return Err(format!("HTTP {}", resp.status()));
        }
        resp.text().await.map_err(|e| e.to_string())
    }
    .await;

    if let Ok(html) = html_fetch {
        if let Some(start) = html.find("problem-statement") {
            let rest = &html[start..];
            let end = rest.find("<script").unwrap_or(rest.len());
            let chunk = &rest[..end];
            statement = html_to_text(chunk);
            statement_ok = !statement.trim().is_empty();

            let lim_re = regex::Regex::new(
                r"time limit per test:\s*(\d+)\s*second|memory limit per test:\s*(\d+)\s*megabyte",
            )
            .unwrap();
            let mut seen_time = false;
            for cap in lim_re.captures_iter(&statement) {
                if let Some(t) = cap.get(1) {
                    if !seen_time {
                        time_ms = t.as_str().parse::<u64>().unwrap_or(2) * 1000;
                        seen_time = true;
                    }
                }
                if let Some(m) = cap.get(2) {
                    mem_kb = m.as_str().parse::<u64>().unwrap_or(256) * 1024;
                }
            }

            // Samples: paired input/output pre blocks inside sample-test.
            if let Some(si) = chunk.find("sample-test") {
                let scope = &chunk[si..];
                let in_re =
                    regex::Regex::new(r#"<div class="input">.*?<pre>(?s)(.*?)</pre>"#).unwrap();
                let out_re =
                    regex::Regex::new(r#"<div class="output">.*?<pre>(?s)(.*?)</pre>"#).unwrap();
                let inputs: Vec<String> =
                    in_re.captures_iter(scope).map(|c| html_decode(&c[1])).collect();
                let outputs: Vec<String> =
                    out_re.captures_iter(scope).map(|c| html_decode(&c[1])).collect();
                for i in 0..inputs.len().max(outputs.len()) {
                    samples.push(Sample {
                        input: inputs.get(i).cloned().unwrap_or_default(),
                        output: outputs.get(i).cloned().unwrap_or_default(),
                    });
                }
            }
        }
    }

    if statement_ok {
        // Trim the duplicated sample section out of the statement text.
        if let Some(pos) = statement.find("standard input") {
            statement = statement[..pos].to_string();
        }
    } else {
        statement = format!(
            "未能抓取题面（Codeforces 对非浏览器客户端返回 403）。\n\n请在浏览器中打开原题查看题面：{url}\n\n名称、难度与标签已通过官方 API 导入。"
        );
        samples.clear();
    }

    Ok(Problem {
        id: format!("CF{index}"),
        title: name,
        oj: "Codeforces".to_string(),
        difficulty: cf_difficulty(rating),
        tags,
        time_limit_ms: time_ms,
        memory_limit_kb: mem_kb,
        description_md: statement,
        input_format: String::new(),
        output_format: String::new(),
        samples,
        hint: String::new(),
        source_url: url,
        is_favorite: false,
        last_practiced: None,
    })
}

/// AtCoder task page: public, stable structure, scrapeable end to end.
async fn fetch_atcoder_problem(task_id: String) -> Result<Problem, String> {
    let contest = task_id
        .rfind('_')
        .map(|i| task_id[..i].to_string())
        .unwrap_or_else(|| {
            // abc300a -> abc300
            let letters = task_id.bytes().take_while(|c| c.is_ascii_lowercase()).count();
            task_id[..letters].to_string()
        });
    let url = format!("https://atcoder.jp/contests/{}/tasks/{}", contest, task_id);

    let client = browser_client()?;
    let resp = client
        .get(&url)
        .header(reqwest::header::USER_AGENT, browser_ua())
        .send()
        .await
        .map_err(|e| format!("Network error fetching AtCoder {}: {}", task_id, e))?;
    if !resp.status().is_success() {
        return Err(format!("AtCoder server returned status {}", resp.status()));
    }
    let html = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    // Title: "<letter> - <name>" inside <title>.
    let title_re = regex::Regex::new(r"<title>\s*([^<]+?)\s*(?:\|[^<]*)?</title>").unwrap();
    let raw_title = title_re
        .captures(&html)
        .map(|c| c[1].trim().to_string())
        .unwrap_or_else(|| task_id.clone());
    let title = html_decode(&raw_title);

    // Limits: "Time Limit: 2 sec / Memory Limit: 1024 MiB"
    let lim_re = regex::Regex::new(
        r"Time Limit:\s*([\d.]+)\s*sec\s*/\s*Memory Limit:\s*([\d.]+)\s*(MiB|MB)",
    )
    .unwrap();
    let (time_ms, mem_kb) = lim_re
        .captures(&html)
        .map(|c| {
            let secs: f64 = c[1].parse().unwrap_or(2.0);
            let mibs: f64 = c[2].parse().unwrap_or(1024.0);
            ((secs * 1000.0).round() as u64, (mibs * 1024.0).round() as u64)
        })
        .unwrap_or((2000, 262_144));

    // Statement: inside <div id="task-statement"> ... up to the next script.
    let statement_html = html
        .find(r#"<div id="task-statement""#)
        .map(|i| {
            let rest = &html[i..];
            let end = rest.find("<script").unwrap_or(rest.len());
            rest[..end].to_string()
        })
        .unwrap_or_default();

    // Samples: h3 "Sample Input N" / "Sample Output N" (or Japanese) + <pre>.
    let in_re = regex::Regex::new(
        r#"<h3[^>]*>\s*(?:入力例|Sample Input)\s*(\d+)\s*</h3>\s*<pre>(?s)(.*?)</pre>"#,
    )
    .unwrap();
    let out_re = regex::Regex::new(
        r#"<h3[^>]*>\s*(?:出力例|Sample Output)\s*(\d+)\s*</h3>\s*<pre>(?s)(.*?)</pre>"#,
    )
    .unwrap();
    let inputs: Vec<(String, String)> = in_re
        .captures_iter(&statement_html)
        .map(|c| (c[1].to_string(), html_decode(&c[2]).trim().to_string()))
        .collect();
    let outputs: Vec<(String, String)> = out_re
        .captures_iter(&statement_html)
        .map(|c| (c[1].to_string(), html_decode(&c[2]).trim().to_string()))
        .collect();

    let samples: Vec<Sample> = inputs
        .iter()
        .enumerate()
        .map(|(i, (_n, input))| Sample {
            input: input.clone(),
            output: outputs
                .iter()
                .find(|(n, _)| *n == inputs[i].0)
                .map(|(_, o)| o.clone())
                .unwrap_or_default(),
        })
        .collect();

    // Statement markdown: strip tags, keep h2/h3 as markdown headings.
    let mut md = statement_html
        .replace("<h2>", "\n## ")
        .replace("</h2>", "\n")
        .replace("<h3>", "\n### ")
        .replace("</h3>", "\n");
    for tag in ["</p>", "<br>", "<br/>", "<br />", "</li>", "</ul>"] {
        md = md.replace(tag, "\n");
    }
    let tag_re = regex::Regex::new(r"(?s)<[^>]+>").unwrap();
    md = tag_re.replace_all(&md, "").to_string();
    md = html_decode(&md);
    let lines: Vec<String> = md
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect();
    let description_md = lines.join("\n\n");

    let upper_id = task_id.to_uppercase().replace('_', "");

    Ok(Problem {
        id: upper_id,
        title,
        oj: "AtCoder".to_string(),
        difficulty: "暂无评定".to_string(),
        tags: vec![contest],
        time_limit_ms: time_ms,
        memory_limit_kb: mem_kb,
        description_md,
        input_format: String::new(),
        output_format: String::new(),
        samples,
        hint: String::new(),
        source_url: url,
        is_favorite: false,
        last_practiced: None,
    })
}

/// One-click import dispatcher: accepts a bare id or a full URL for any of
/// Luogu / Codeforces / AtCoder and routes to the right scraper.
pub async fn fetch_problem_auto(input: String) -> Result<Problem, String> {
    let t = input.trim();
    if t.is_empty() {
        return Err("请输入题目编号或链接".to_string());
    }
    let lower = t.to_lowercase();

    // Full URLs first - the host decides the OJ.
    if lower.contains("luogu.com.cn") {
        return crate::ingest::fetch_luogu_problem(t.to_string()).await;
    }
    if lower.contains("codeforces.com") {
        let index = lower
            .split("/problem/")
            .nth(1)
            .ok_or_else(|| "无法从链接中解析 Codeforces 题号".to_string())?
            .split(['?', '#', '/'])
            .next()
            .unwrap_or("")
            .to_string();
        if index.is_empty() {
            return Err("无法从链接中解析 Codeforces 题号".to_string());
        }
        return fetch_codeforces_problem(index).await;
    }
    if lower.contains("atcoder.jp") {
        let task = lower
            .split("/tasks/")
            .nth(1)
            .ok_or_else(|| "无法从链接中解析 AtCoder 题号".to_string())?
            .split(['?', '#'])
            .next()
            .unwrap_or("")
            .to_string();
        if task.is_empty() {
            return Err("无法从链接中解析 AtCoder 题号".to_string());
        }
        return fetch_atcoder_problem(task).await;
    }

    let compact = lower.replace([' ', '-', '_'], "");
    // Explicit prefixes: "CF1900A" / "at abc300_a".
    if let Some(rest) = compact.strip_prefix("cf") {
        if is_cf_index(rest) {
            return fetch_codeforces_problem(rest.to_string()).await;
        }
    }
    if let Some(rest) = compact.strip_prefix("at") {
        if is_atcoder_id(rest) {
            return fetch_atcoder_problem(normalize_atcoder_id(rest)).await;
        }
    }
    // Bare Codeforces index: digits ending with a letter (1900a).
    if is_cf_index(&lower) {
        return fetch_codeforces_problem(lower.clone()).await;
    }
    // Bare AtCoder id: abc300a / abc300_a.
    if is_atcoder_id(&lower) {
        return fetch_atcoder_problem(normalize_atcoder_id(&lower)).await;
    }
    // Bare Luogu id (P1001 / B2001 / U123456 / T98765) or unknown input keeps
    // the historical default of Luogu so old behavior is preserved.
    crate::ingest::fetch_luogu_problem(t.to_string()).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_cf_and_atcoder_ids() {
        assert!(is_cf_index("1900a"));
        assert!(is_cf_index("1234f1"));
        assert!(!is_cf_index("p1001"));
        assert!(!is_cf_index("0a"));
        assert!(is_atcoder_id("abc300_a"));
        assert!(is_atcoder_id("abc300a"));
        assert!(is_atcoder_id("typical90_az"));
        assert!(!is_atcoder_id("p1001"));
        assert!(!is_atcoder_id("abc300"));
    }

    #[test]
    fn normalizes_atcoder_spellings() {
        assert_eq!(normalize_atcoder_id("ABC300A"), "abc300_a");
        assert_eq!(normalize_atcoder_id("abc300_a"), "abc300_a");
        assert_eq!(normalize_atcoder_id("typical90_az"), "typical90_az");
    }
}
