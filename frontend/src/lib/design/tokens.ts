/**
 * Design tokens — the TS mirror of the theme CSS variables in `index.css`.
 *
 * Components read colors/radii through these constants instead of scattering
 * raw literals. Every raw hex below is a byte-identical relocation of a value
 * that already exists in the codebase (Monaco palette, contest urgency tints,
 * theme-toggle icon hues) — this module intentionally introduces no new
 * colors. CSS-variable references (`var(--…)`) are preferred everywhere the
 * webview renders; the raw palettes exist only for consumers that cannot read
 * CSS variables (Monaco's `defineTheme`).
 */

/** `name` → `var(--name)` reference, for inline styles and class strings. */
export const cssVar = (name: string): string => `var(--${name})`;

/** Background surfaces (index.css `--bg-*`). */
export const bg = {
  base: cssVar('bg-base'),
  surface: cssVar('bg-surface'),
  elevated: cssVar('bg-elevated'),
  overlay: cssVar('bg-overlay'),
} as const;

/** Text tones (index.css `--text-*`). */
export const fg = {
  primary: cssVar('text-primary'),
  secondary: cssVar('text-secondary'),
  tertiary: cssVar('text-tertiary'),
} as const;

/** Border tones (index.css `--border`, `--border-active`). */
export const line = {
  border: cssVar('border'),
  active: cssVar('border-active'),
} as const;

/** Brand accent (index.css `--accent*`). */
export const brand = {
  accent: cssVar('accent'),
  hover: cssVar('accent-hover'),
  subtle: cssVar('accent-subtle'),
} as const;

/** Verdict colors (index.css `--color-*`). */
export const verdict = {
  ac: cssVar('color-ac'),
  wa: cssVar('color-wa'),
  tle: cssVar('color-tle'),
  mle: cssVar('color-mle'),
  re: cssVar('color-re'),
  ce: cssVar('color-ce'),
} as const;

/**
 * Judge verdict → its colour. Unknown verdicts (a future code the renderer
 * does not know yet) fall back to WA rather than rendering `undefined`.
 */
export const verdictColor = (verdictCode: string): string =>
  ({
    AC: verdict.ac,
    WA: verdict.wa,
    MLE: verdict.mle,
    TLE: verdict.tle,
    RE: verdict.re,
    CE: verdict.ce,
  })[verdictCode] ?? verdict.wa;

/**
 * Peak-memory label. The judge reports `0` when the Win32 sample failed, and
 * that must not read as "used 0 KB".
 */
export const memoryLabel = (kb: number): string => (kb > 0 ? `${kb} KB` : '未测得');

/**
 * Contest urgency tints — rgba relocations of the WA/TLE hues (#ff453a /
 * #ff9f0a) previously inlined in ContestBar. Kept as literals because
 * `var()` cannot carry an alpha channel without color-mix, which not every
 * Tauri webview (WebKitGTK) supports. For inline styles only — Tailwind
 * classes cannot carry these spaces; use the `buttons` class tokens instead.
 */
export const tint = {
  waSoft: 'rgba(255, 69, 58, 0.12)',
  waHover: 'rgba(255, 69, 58, 0.15)',
  waLineSoft: 'rgba(255, 69, 58, 0.3)',
  waLine: 'rgba(255, 69, 58, 0.35)',
  waLineStrong: 'rgba(255, 69, 58, 0.4)',
  tleSoft: 'rgba(255, 159, 10, 0.08)',
  tleLine: 'rgba(255, 159, 10, 0.25)',
} as const;

/** Theme-toggle icon hues (blue moon / amber sun), shared by ActivityBar + StatusBar. */
export const themeIcon = {
  moon: '#7aa2f7',
  sun: '#e5a43b',
} as const;

/** StatusBar chrome: the dark bar sits below `--bg-surface`, the light bar on it. */
export const statusSurface = (theme: string): string =>
  theme === 'GitHubLight' ? bg.surface : bg.base;

/**
 * Raw editor palettes for Monaco's `defineTheme`, which cannot read CSS
 * variables. Byte-identical relocation of the palettes inlined in
 * `services/monacoTheme.ts`; keep in sync with the index.css theme vars.
 */
export const editorPalette = {
  dark: {
    chrome: {
      editorBg: '#1e1e1e',
      editorFg: '#abb2bf',
      gutterBg: '#1e1e1e',
      lineNumber: '#636d83',
      lineNumberActive: '#c678dd',
      lineHighlight: '#2c313c',
      cursor: '#528bff',
      selection: '#3e4451',
    },
    tokens: {
      comment: '#5c6370',
      keyword: '#c678dd',
      string: '#98c379',
      number: '#d19a66',
      type: '#e5c07b',
      identifier: '#abb2bf',
    },
  },
  light: {
    chrome: {
      editorBg: '#ffffff',
      editorFg: '#1f2328',
      gutterBg: '#ffffff',
      lineNumber: '#8c959f',
      lineNumberActive: '#0969da',
      lineHighlight: '#f6f8fa',
      cursor: '#0969da',
      selection: '#add6ff80',
    },
    tokens: {
      comment: '#6e7781',
      keyword: '#cf222e',
      string: '#0a3069',
      number: '#0550ae',
      type: '#8250df',
      identifier: '#1f2328',
    },
  },
} as const;

/* ---- Canonical class tokens (radius / borders / states / focus) ---- */

export const radius = {
  card: 'rounded-xl',
  control: 'rounded-lg',
  chip: 'rounded-md',
  pill: 'rounded-full',
} as const;

export const borders = {
  default: 'border border-[var(--border)]',
  active: 'border-[var(--border-active)]',
} as const;

export const states = {
  hoverSurface: 'hover:bg-[var(--bg-elevated)]',
  hoverText: 'hover:text-[var(--text-primary)]',
} as const;

/**
 * Keyboard focus ring for non-button interactive elements; plain `<button>`
 * gets the global rule in index.css. The WA alpha tints live here (hex/NN
 * form — no spaces, so Tailwind accepts them) instead of var()+opacity.
 */
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]';

/** Button variant classes that need the WA alpha tint (see `tint` above). */
export const buttons = {
  dangerOutline: 'border border-[#ff453a]/30 text-[var(--color-wa)] hover:bg-[#ff453a]/15',
} as const;
