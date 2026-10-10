import { tauriApi } from '../../services/tauriApi';
import type { ExtractedProblem } from '../../ports/document';

/**
 * PDF text extraction implementation of `ports/document`. Extraction itself
 * lives in Rust (src-tauri `extract_pdf_problems` command) since the
 * webview-sink work — this adapter only binds the invoke bridge to the port.
 * `path` is an absolute filesystem path to the PDF.
 */
export async function extractPdf(path: string): Promise<ExtractedProblem[]> {
  return tauriApi.extractPdfProblems(path);
}
