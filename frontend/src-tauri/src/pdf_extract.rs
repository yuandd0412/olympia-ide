//! PDF problem extraction, sunk from the WebView (pdfjs) into a Rust command.
//! Crate choice (spec webview-sink S2): `pdf-extract` — pure Rust, no bundled
//! binaries or system deps. Revisit pdfium bindings only if CJK quality
//! proves insufficient.

use serde::Serialize;
use std::path::PathBuf;
use std::sync::OnceLock;

/// Field-level compatible with the former frontend `ExtractedProblem`
/// (services/pdfExtract.ts): title / pageStart / pageEnd / text.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractedProblem {
    pub title: String,
    pub page_start: u32,
    pub page_end: u32,
    pub text: String,
}

/// Same heuristic as the removed pdfjs implementation: 第N题 / T1： / Problem 2 /
/// 试题二 style headings are boundaries; section markers like "一、单项选择题"
/// are deliberately NOT boundaries (CSP papers use them for sections, not
/// problems) — those fall back to manual marking in the viewer.
const HEADING_RE: &str = r"^(第\s*[0-9一二三四五六七八九十百]+\s*题|[Tt]\s*\d+\s*[：:.、]|Problem\s*\d+|试题\s*[0-9一二三四五六七八九十]+)";

fn heading_re() -> &'static regex::Regex {
    static RE: OnceLock<regex::Regex> = OnceLock::new();
    RE.get_or_init(|| regex::Regex::new(HEADING_RE).expect("heading regex"))
}

/// Heading gate: trimmed line of 2..=60 chars starting with a heading pattern.
fn is_heading(line: &str) -> bool {
    let t = line.trim();
    let n = t.chars().count();
    (2..=60).contains(&n) && heading_re().is_match(t)
}

/// Port of the TS `.replace(/\n{3,}/g, '\n\n').trim()`: runs of 3+ newlines
/// collapse to exactly two, edges trimmed.
fn collapse_and_trim(s: &str) -> String {
    let flush = |out: &mut String, run: usize| {
        if run >= 3 {
            out.push_str("\n\n");
        } else {
            for _ in 0..run {
                out.push('\n');
            }
        }
    };
    let mut out = String::with_capacity(s.len());
    let mut run = 0usize;
    for ch in s.chars() {
        if ch == '\n' {
            run += 1;
        } else {
            flush(&mut out, run);
            run = 0;
            out.push(ch);
        }
    }
    flush(&mut out, run);
    out.trim().to_string()
}

/// Faithful port of the pdfjs splitter in services/pdfExtract.ts: each
/// heading opens a problem spanning up to the next heading (exclusive of its
/// heading line) or the last page.
fn split_problems(pages: &[Vec<String>]) -> Vec<ExtractedProblem> {
    let total_pages = pages.len() as u32;
    // (page, 1-based; line index within the page; title, trimmed + capped at 40 chars)
    let mut boundaries: Vec<(u32, usize, String)> = Vec::new();
    for (pi, lines) in pages.iter().enumerate() {
        for (li, ln) in lines.iter().enumerate() {
            let t = ln.trim();
            if is_heading(t) {
                boundaries.push(((pi + 1) as u32, li, t.chars().take(40).collect()));
            }
        }
    }

    let mut problems: Vec<ExtractedProblem> = Vec::new();
    for (idx, (page, line, title)) in boundaries.iter().enumerate() {
        // A next heading at line 0 of the following page ends this problem on
        // the previous page; otherwise the range runs into the next page.
        let end_page = match boundaries.get(idx + 1) {
            Some((next_page, 0, _)) => next_page.saturating_sub(1),
            Some((next_page, _, _)) => *next_page,
            None => total_pages,
        };
        let last = (*page).max(end_page);
        let mut chunks: Vec<String> = Vec::new();
        for p in *page..=last {
            let ls: &[String] = pages[(p - 1) as usize].as_slice();
            let start = if p == *page { (*line + 1).min(ls.len()) } else { 0 };
            let stop = match boundaries.get(idx + 1) {
                Some((next_page, next_line, _)) if p == *next_page => (*next_line).min(ls.len()),
                _ => ls.len(),
            };
            if start < stop {
                chunks.push(ls[start..stop].join("\n"));
            }
        }
        problems.push(ExtractedProblem {
            title: title.clone(),
            page_start: *page,
            page_end: last,
            text: collapse_and_trim(&chunks.join("\n")),
        });
    }
    problems
}

#[tauri::command]
pub async fn extract_pdf_problems(path: String) -> Result<Vec<ExtractedProblem>, String> {
    if path.trim().is_empty() {
        return Err("未提供 PDF 文件路径".to_string());
    }
    let p = PathBuf::from(&path);
    if !p.is_file() {
        return Err(format!("找不到 PDF 文件: {path}"));
    }
    // pdf-extract is CPU-bound and blocking; keep it off the async threads.
    tauri::async_runtime::spawn_blocking(move || {
        let pages = pdf_extract::extract_text_by_pages(&p)
            .map_err(|e| format!("PDF 解析失败（文件可能损坏或为扫描件）: {e}"))?;
        let page_lines: Vec<Vec<String>> = pages
            .iter()
            .map(|page| page.split('\n').map(str::to_string).collect())
            .collect();
        Ok(split_problems(&page_lines))
    })
    .await
    .map_err(|e| format!("PDF 抽取任务中断: {e}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn page(lines: &[&str]) -> Vec<String> {
        lines.iter().map(|l| l.to_string()).collect()
    }

    #[test]
    fn headings_match_contest_styles() {
        for line in ["第1题", "第 12 题", "T3：", "t3:", "T10、", "Problem 5", "Problem10", "试题二", "试题 5"] {
            assert!(is_heading(line), "should match: {line}");
        }
    }

    #[test]
    fn section_markers_are_not_headings() {
        for line in [
            "一、单项选择题", // CSP section marker, not a problem boundary
            "总共10题",
            "T1",      // needs trailing punctuation
            "Problem", // no number
            "试题",
            "",
            " ",
        ] {
            assert!(!is_heading(line), "should NOT match: {line}");
        }
        // The heading regex is anchored at the start only (same as the
        // removed TS HEADING_RE), so prose that happens to open with
        // 第N题 still counts — accepted heuristic behavior.
        assert!(is_heading("第1题的最优解法是贪心"));
        assert!(is_heading("第二题内容"));
    }

    #[test]
    fn heading_length_gate() {
        let long = format!("第1题 {}", "x".repeat(60));
        assert!(!is_heading(&long), "over 60 chars must be rejected");
        let ok = format!("第1题 {}", "x".repeat(50));
        assert!(is_heading(&ok));
    }

    #[test]
    fn splits_three_problems_on_three_pages() {
        let pages = vec![
            page(&["第1题 A+B", "a+b 题面", "输入输出样例"]),
            page(&["T2: 字符串", "题面第二段"]),
            page(&["Problem 3", "third"]),
        ];
        let ps = split_problems(&pages);
        assert_eq!(ps.len(), 3);
        assert_eq!(ps[0].title, "第1题 A+B");
        assert_eq!(ps[0].page_start, 1);
        assert_eq!(ps[0].page_end, 1);
        assert_eq!(ps[0].text, "a+b 题面\n输入输出样例");
        assert_eq!(ps[1].title, "T2: 字符串");
        assert_eq!(ps[1].page_start, 2);
        assert_eq!(ps[1].text, "题面第二段");
        assert_eq!(ps[2].title, "Problem 3");
        assert_eq!(ps[2].page_start, 3);
        assert_eq!(ps[2].text, "third");
    }

    #[test]
    fn last_problem_extends_to_final_page() {
        let pages = vec![page(&["第1题", "x"]), page(&["more", "content"])];
        let ps = split_problems(&pages);
        assert_eq!(ps.len(), 1);
        assert_eq!(ps[0].page_end, 2);
        assert_eq!(ps[0].text, "x\nmore\ncontent");
    }

    #[test]
    fn next_heading_at_line_zero_ends_previous_page() {
        let pages = vec![
            page(&["第1题", "a"]),
            page(&["内容", "继续"]),
            page(&["第2题", "b"]),
        ];
        let ps = split_problems(&pages);
        assert_eq!(ps.len(), 2);
        assert_eq!(ps[0].page_end, 2);
        assert_eq!(ps[0].text, "a\n内容\n继续");
        assert_eq!(ps[1].page_start, 3);
        assert_eq!(ps[1].page_end, 3);
        assert_eq!(ps[1].text, "b");
    }

    #[test]
    fn same_page_headings_split_mid_page() {
        let pages = vec![page(&["第1题", "a", "第2题", "b"])];
        let ps = split_problems(&pages);
        assert_eq!(ps.len(), 2);
        assert_eq!(ps[0].page_start, 1);
        assert_eq!(ps[0].page_end, 1);
        assert_eq!(ps[0].text, "a");
        assert_eq!(ps[1].page_start, 1);
        assert_eq!(ps[1].page_end, 1);
        assert_eq!(ps[1].text, "b");
    }

    #[test]
    fn titles_cap_at_40_chars() {
        let long = format!("第1题 {}", "x".repeat(50));
        let pages = vec![page(&[&long, "body"])];
        let ps = split_problems(&pages);
        assert_eq!(ps[0].title.chars().count(), 40);
    }

    #[test]
    fn blank_runs_collapse_and_trim() {
        assert_eq!(collapse_and_trim("a\n\n\n\n\nb"), "a\n\nb");
        assert_eq!(collapse_and_trim("a\n\nb"), "a\n\nb");
        assert_eq!(collapse_and_trim("\n\na\n\n\n  \nb\n\n"), "a\n\n  \nb");
        assert_eq!(collapse_and_trim(""), "");
    }

    /// Hand-built single-page PDF (Helvetica, correct xref offsets computed
    /// below) exercising the real pdf-extract integration, not just the
    /// pure splitter.
    fn minimal_test_pdf(text_runs: &str) -> Vec<u8> {
        let content = format!(
            "BT /F1 14 Tf 72 720 Td ({}) Tj ET\n{}",
            "Problem 1",
            text_runs
        );
        let obj1 = b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
        let obj2 = b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
        let obj3 = b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n";
        let obj4 = format!(
            "4 0 obj\n<< /Length {} >>\nstream\n{}\nendstream\nendobj\n",
            content.len(),
            content
        );
        let obj5 = b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";

        let mut buf: Vec<u8> = b"%PDF-1.4\n".to_vec();
        let mut offsets: Vec<u32> = Vec::new();
        for obj in [&obj1[..], &obj2[..], &obj3[..], obj4.as_bytes(), &obj5[..]] {
            offsets.push(buf.len() as u32);
            buf.extend_from_slice(obj);
        }
        let xref_pos = buf.len();
        let mut xref = format!("xref\n0 6\n0000000000 65535 f \n");
        for off in offsets {
            xref += &format!("{off:010} 00000 n \n");
        }
        xref += &format!("trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF");
        buf.extend_from_slice(xref.as_bytes());
        buf
    }

    #[test]
    fn end_to_end_minimal_pdf_fixture() {
        // Td moves of 30pt with a 14pt font exceed pdf-extract's 1.5x-size
        // newline threshold, so every run lands on its own line.
        let runs = "BT /F1 14 Tf 72 690 Td (hello world) Tj ET\n\
                    BT /F1 14 Tf 72 660 Td (Problem 2) Tj ET\n\
                    BT /F1 14 Tf 72 630 Td (second body) Tj ET";
        let pdf = minimal_test_pdf(runs);
        let pages = pdf_extract::extract_text_from_mem_by_pages(&pdf).expect("fixture parses");
        assert_eq!(pages.len(), 1);
        let page_lines: Vec<Vec<String>> = pages
            .iter()
            .map(|p| p.split('\n').map(str::to_string).collect())
            .collect();
        let ps = split_problems(&page_lines);
        assert_eq!(ps.len(), 2, "pages: {pages:?}");
        assert_eq!(ps[0].title, "Problem 1");
        assert_eq!(ps[0].text, "hello world");
        assert_eq!(ps[1].title, "Problem 2");
        assert_eq!(ps[1].text, "second body");
    }
}
