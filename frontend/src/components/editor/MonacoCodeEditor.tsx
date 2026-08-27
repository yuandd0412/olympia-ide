import React, { useRef, useEffect } from 'react';
import Editor, { type OnMount, type BeforeMount } from '@monaco-editor/react';
import { useAppStore } from '../../stores/useAppStore';
import { tauriApi } from '../../services/tauriApi';
import { registerMonacoThemes } from '../../services/monacoTheme';
import { Code2, Plus, BookOpen } from 'lucide-react';

export const MonacoCodeEditor: React.FC = () => {
  const { tabs, activeTabId, updateActiveCode, settings, openNewTab, setActiveNav, saveActiveTab } = useAppStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const syntaxCheckTimer = useRef<any>(null);

  const isLight = settings.theme === 'GitHubLight';
  const currentThemeName = isLight ? 'oler-light-theme' : 'oler-dark-theme';

  const handleBeforeMount: BeforeMount = (monaco) => {
    registerMonacoThemes(monaco);
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    registerMonacoThemes(monaco);
    monaco.editor.setTheme(currentThemeName);
    runSyntaxCheck(activeTab?.code || '');

    // Bind Ctrl+S / Cmd+S save command directly inside Monaco
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveActiveTab();
    });
  };

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(currentThemeName);
    }
  }, [currentThemeName]);

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

  // If no tabs are open, show a clean, elegant workbench empty state
  if (tabs.length === 0 || !activeTab) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-base)] text-[var(--text-tertiary)] select-none p-6 text-center">
        <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] mb-3 shadow-xs text-[var(--accent)]">
          <Code2 className="w-8 h-8" />
        </div>
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-1">
          当前无打开的代码标签页
        </h2>
        <p className="text-xs text-[var(--text-tertiary)] mb-5 max-w-sm leading-relaxed">
          所有代码编辑器已全部关闭。你可以新建空白代码文件，或从题目库中载入题面开始做题。
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openNewTab()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:brightness-110 active:scale-95 shadow-sm cursor-pointer"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建代码文件 (Ctrl+N)</span>
          </button>
          <button
            onClick={() => setActiveNav('problems')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] transition-all cursor-pointer shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>浏览最近做题 (Ctrl+K)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-[var(--bg-base)]">
      <Editor
        height="100%"
        defaultLanguage="cpp"
        language="cpp"
        value={activeTab?.code || ''}
        theme={currentThemeName}
        beforeMount={handleBeforeMount}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize: settings.fontSize || 14,
          fontFamily: (settings.fontFamily || 'Cascadia Mono') + ', Consolas, monospace',
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
