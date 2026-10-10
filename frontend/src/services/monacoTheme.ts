import { useAppStore } from '../stores/useAppStore';
import { editorPalette } from '../lib/design/tokens';

const monacoThemeName = (theme: string) =>
  theme === 'GitHubLight' ? 'oler-light-theme' : 'oler-dark-theme';

// Monaco's defineTheme cannot read CSS variables, so the palettes come from
// lib/design/tokens (raw mirrors of the index.css theme vars).
const withoutHash = (hex: string) => hex.slice(1);

const themeFromPalette = (
  base: 'vs-dark' | 'vs',
  palette: typeof editorPalette.dark | typeof editorPalette.light,
) => ({
  base,
  inherit: true,
  rules: [
    { token: 'comment', foreground: withoutHash(palette.tokens.comment), fontStyle: 'italic' },
    { token: 'keyword', foreground: withoutHash(palette.tokens.keyword), fontStyle: 'bold' },
    { token: 'string', foreground: withoutHash(palette.tokens.string) },
    { token: 'number', foreground: withoutHash(palette.tokens.number) },
    { token: 'type', foreground: withoutHash(palette.tokens.type) },
    { token: 'identifier', foreground: withoutHash(palette.tokens.identifier) },
  ],
  colors: {
    'editor.background': palette.chrome.editorBg,
    'editor.foreground': palette.chrome.editorFg,
    'editorGutter.background': palette.chrome.gutterBg,
    'editorLineNumber.foreground': palette.chrome.lineNumber,
    'editorLineNumber.activeForeground': palette.chrome.lineNumberActive,
    'editor.lineHighlightBackground': palette.chrome.lineHighlight,
    'editorCursor.foreground': palette.chrome.cursor,
    'editor.selectionBackground': palette.chrome.selection,
  },
});

// Wired once per app lifetime: the global Monaco theme follows the store, so
// a theme change can never be missed by an editor that was unmounted, still
// loading, or remounted with a stale prop (the "editor stays dark" bug).
let themeSyncWired = false;

export const registerMonacoThemes = (monaco: any) => {
  if (!monaco) return;

  // Dark Theme (One Dark Pro)
  monaco.editor.defineTheme('oler-dark-theme', themeFromPalette('vs-dark', editorPalette.dark));

  // Light Theme (GitHub Light)
  monaco.editor.defineTheme('oler-light-theme', themeFromPalette('vs', editorPalette.light));

  const applyStoreTheme = () => {
    monaco.editor.setTheme(monacoThemeName(useAppStore.getState().settings.theme));
  };

  // Runs before every editor creation (beforeMount), so the global theme is
  // always in lockstep with the app theme at the moment an editor is created.
  applyStoreTheme();

  if (!themeSyncWired) {
    themeSyncWired = true;
    useAppStore.subscribe((state, prev) => {
      if (state.settings.theme !== prev.settings.theme) applyStoreTheme();
    });
  }
};
