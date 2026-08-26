import React, { useRef, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { useAppStore } from '../../stores/useAppStore';
import { tauriApi } from '../../services/tauriApi';

export const MonacoCodeEditor: React.FC = () => {
  const { tabs, activeTabId, updateActiveCode, settings } = useAppStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const syntaxCheckTimer = useRef<any>(null);

  const isLight = settings.theme === 'GitHubLight';

  const defineAndApplyTheme = (monaco: any) => {
    if (!monaco) return;

    if (isLight) {
      monaco.editor.defineTheme('oler-custom-theme', {
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
    } else {
      monaco.editor.defineTheme('oler-custom-theme', {
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
    }

    monaco.editor.setTheme('oler-custom-theme');
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    defineAndApplyTheme(monaco);
    runSyntaxCheck(activeTab?.code || '');
  };

  useEffect(() => {
    if (monacoRef.current) {
      defineAndApplyTheme(monacoRef.current);
    }
  }, [settings.theme]);

  const runSyntaxCheck = async (code: string) => {
    if (!code.trim() || !monacoRef.current || !editorRef.current) return;
    try {
      const markers = await tauriApi.checkSyntax(code, settings.compilerPath, settings.compilerFlags);
      const model = editorRef.current.getModel();
      if (!model) return;
      const monacoMarkers = markers.map((m: any) => ({
        severity: m.severity === 'error' ? monacoRef.current.MarkerSeverity.Error : monacoRef.current.MarkerSeverity.Warning,
        message: m.message,
        startLineNumber: m.line,
        startColumn: m.column,
        endLineNumber: m.line,
        endColumn: m.column + 5,
      }));
      monacoRef.current.editor.setModelMarkers(model, 'owner', monacoMarkers);
    } catch (e) {
      console.error('Syntax check failed:', e);
    }
  };

  const handleEditorChange = (val: string | undefined) => {
    const code = val || '';
    updateActiveCode(code);
    
    if (syntaxCheckTimer.current) {
      clearTimeout(syntaxCheckTimer.current);
    }
    syntaxCheckTimer.current = setTimeout(() => {
      runSyntaxCheck(code);
    }, 800);
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[var(--bg-base)]">
      <Editor
        height="100%"
        defaultLanguage="cpp"
        language="cpp"
        value={activeTab?.code || ''}
        theme="oler-custom-theme"
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize: settings.fontSize || 14,
          fontFamily: `${settings.fontFamily || 'Cascadia Mono'}, Consolas, monospace`,
          fontLigatures: true,
          minimap: { enabled: true, scale: 0.75 },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          renderWhitespace: 'selection',
          lineNumbers: 'on',
          roundedSelection: true,
          bracketPairColorization: { enabled: true },
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          padding: { top: 8, bottom: 8 },
        }}
      />
    </div>
  );
};
