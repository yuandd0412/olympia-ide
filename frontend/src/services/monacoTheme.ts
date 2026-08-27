export const registerMonacoThemes = (monaco: any) => {
  if (!monaco) return;

  // Dark Theme (One Dark Pro)
  monaco.editor.defineTheme('oler-dark-theme', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c678dd', fontStyle: 'bold' },
      { token: 'string', foreground: '98c379' },
      { token: 'number', foreground: 'd19a66' },
      { token: 'type', foreground: 'e5c07b' },
      { token: 'identifier', foreground: 'abb2bf' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#abb2bf',
      'editorGutter.background': '#1e1e1e',
      'editorLineNumber.foreground': '#636d83',
      'editorLineNumber.activeForeground': '#c678dd',
      'editor.lineHighlightBackground': '#2c313c',
      'editorCursor.foreground': '#528bff',
      'editor.selectionBackground': '#3e4451',
    },
  });

  // Light Theme (GitHub Light)
  monaco.editor.defineTheme('oler-light-theme', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6e7781', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'cf222e', fontStyle: 'bold' },
      { token: 'string', foreground: '0a3069' },
      { token: 'number', foreground: '0550ae' },
      { token: 'type', foreground: '8250df' },
      { token: 'identifier', foreground: '1f2328' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1f2328',
      'editorGutter.background': '#ffffff',
      'editorLineNumber.foreground': '#8c959f',
      'editorLineNumber.activeForeground': '#0969da',
      'editor.lineHighlightBackground': '#f6f8fa',
      'editorCursor.foreground': '#0969da',
      'editor.selectionBackground': '#add6ff80',
    },
  });
};