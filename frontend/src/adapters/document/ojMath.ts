/**
 * OJ math preprocessing shared by the Markdown adapter — pure helpers, kept
 * out of the component file so it stays fast-refresh friendly.
 */

/** Luogu/CF-style macros (backup if preprocess missed a case). */
export const KATEX_MACROS: Record<string, string> = {
  '\\red': '\\textcolor{#ff453a}{#1}',
  '\\green': '\\textcolor{#34c759}{#1}',
  '\\blue': '\\textcolor{#7daed4}{#1}',
  '\\purple': '\\textcolor{#bf5af2}{#1}',
  '\\orange': '\\textcolor{#ff9f0a}{#1}',
  '\\lto': '\\to',
  '\\le': '\\leq',
  '\\ge': '\\geq',
};

/**
 * Rewrite OJ color macros to KaTeX-native \textcolor before parsing.
 * Nested `\red{\leq}` is a common failure when relying on macro expansion alone.
 */
export function prepareMath(src: string): string {
  if (!src) return src;
  return src
    .replace(/\\red\s*\{/g, '\\textcolor{#ff453a}{')
    .replace(/\\green\s*\{/g, '\\textcolor{#34c759}{')
    .replace(/\\blue\s*\{/g, '\\textcolor{#7daed4}{')
    .replace(/\\purple\s*\{/g, '\\textcolor{#bf5af2}{')
    .replace(/\\orange\s*\{/g, '\\textcolor{#ff9f0a}{');
}
