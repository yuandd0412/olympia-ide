import { tauriApi, type ExtractedProblem } from './tauriApi';

export type { ExtractedProblem };

/**
 * Thin compatibility wrapper: extraction itself lives in Rust
 * (src-tauri/src/pdf_extract.rs, `extract_pdf_problems` command) since the
 * webview-sink spec. The pdfjs runtime path was removed.
 */
export async function extractPdfProblems(
  path: string
): Promise<{ totalPages: number; problems: ExtractedProblem[] }> {
  const problems = await tauriApi.extractPdfProblems(path);
  const totalPages = problems.reduce((max, p) => Math.max(max, p.pageEnd), 0);
  return { totalPages, problems };
}
