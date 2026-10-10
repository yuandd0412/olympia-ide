/**
 * Port: document rendering & extraction.
 *
 * Markdown+KaTeX rendering, embedded PDF viewing and PDF text extraction are
 * consumed only through this module — `components/**` must not import
 * `react-markdown`, `rehype-katex`, `katex` or `pdfjs-dist` directly, and PDF
 * viewing must not fall back to hand-rolled iframes.
 */
import type { ReactNode } from 'react';

/** One detected problem section inside a contest-style PDF. */
export interface ExtractedProblem {
  title: string;
  pageStart: number;
  pageEnd: number;
  text: string;
}

/** Props handed to a custom code renderer by the Markdown port. */
export interface MarkdownCodeRendererProps {
  className?: string;
  children?: ReactNode;
}

export interface MarkdownProps {
  children: string;
  className?: string;
  components?: {
    code?: (props: MarkdownCodeRendererProps) => ReactNode;
  };
}

export interface PdfViewerProps {
  /** URL or file path of the PDF document. */
  path: string;
  /** 1-based page number to open at. */
  page?: number;
  className?: string;
  title?: string;
}

export { Markdown } from '../adapters/document/MarkdownMathAdapter';
export { prepareMath, KATEX_MACROS } from '../adapters/document/ojMath';
export { PdfViewer } from '../adapters/document/PdfIframeAdapter';
export { extractPdf } from '../adapters/document/pdfExtractAdapter';
