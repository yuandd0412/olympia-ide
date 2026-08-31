import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface ExtractedProblem {
  title: string;
  pageStart: number;
  pageEnd: number;
  text: string;
}

/**
 * Heuristic problem-boundary detection for contest-style PDFs.
 * Recognized headings: 第N题 / T1 / Problem 2 / 试题二. Section markers
 * like "一、单项选择题" are deliberately NOT boundaries (CSP papers use
 * them for sections, not problems) — those fall back to manual marking.
 */
const HEADING_RE =
  /^(第\s*[0-9一二三四五六七八九十百]+\s*题|[Tt]\s*\d+\s*[：:.、]|Problem\s*\d+|试题\s*[0-9一二三四五六七八九十]+)/;

export async function extractPdfProblems(
  url: string
): Promise<{ totalPages: number; problems: ExtractedProblem[] }> {
  const loadingTask = pdfjsLib.getDocument({ url });
  const doc = await loadingTask.promise;
  const totalPages = doc.numPages;

  const pageLines: string[][] = [];
  for (let i = 1; i <= totalPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const lines: string[] = [];
    let cur = '';
    for (const item of tc.items as Array<{ str?: string; hasEOL?: boolean }>) {
      if (typeof item.str !== 'string') continue;
      cur += item.str;
      if (item.hasEOL) {
        lines.push(cur);
        cur = '';
      }
    }
    if (cur.trim()) lines.push(cur);
    pageLines.push(lines);
  }
  await loadingTask.destroy();

  const boundaries: { page: number; line: number; title: string }[] = [];
  pageLines.forEach((lines, pi) => {
    lines.forEach((ln, li) => {
      const t = ln.trim();
      if (t.length >= 2 && t.length <= 60 && HEADING_RE.test(t)) {
        boundaries.push({ page: pi + 1, line: li, title: t.slice(0, 40) });
      }
    });
  });

  const problems: ExtractedProblem[] = [];
  boundaries.forEach((b, idx) => {
    const next = boundaries[idx + 1];
    let endPage = b.page;
    if (next) {
      endPage = next.line === 0 ? next.page - 1 : next.page;
    } else {
      endPage = totalPages;
    }
    const chunks: string[] = [];
    for (let p = b.page; p <= Math.max(b.page, endPage); p++) {
      let ls = pageLines[p - 1];
      if (p === b.page) ls = ls.slice(b.line + 1);
      if (next && p === next.page) ls = ls.slice(0, next.line);
      chunks.push(ls.join('\n'));
    }
    problems.push({
      title: b.title,
      pageStart: b.page,
      pageEnd: Math.max(b.page, endPage),
      text: chunks.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    });
  });

  return { totalPages, problems };
}
