import { useEffect, useMemo, useRef } from 'react';
import type { FC } from 'react';
import Editor from '@monaco-editor/react';
import type { CodeEditorHost, CodeEditorProps, EditorMarker } from '../../ports/editor';
import { registerMonacoThemes } from '../../services/monacoTheme';
import { registerCppCompletion } from '../../services/monacoCpp';

/**
 * Monaco implementation of `ports/editor`. All engine-specific options are
 * owned here so call sites pass only Olympia fields; the suggestion/cursor
 * block below is the Olympia standard editing experience.
 */
const BASE_OPTIONS = {
  fontLigatures: true,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  insertSpaces: true,
  renderWhitespace: 'selection' as const,
  lineNumbers: 'on' as const,
  roundedSelection: true,
  bracketPairColorization: { enabled: true },
  cursorBlinking: 'smooth' as const,
  cursorSmoothCaretAnimation: 'on' as const,
  smoothScrolling: true,
  padding: { top: 8, bottom: 8 },
  // Enter = newline only; accept completion with Tab.
  acceptSuggestionOnEnter: 'off' as const,
  acceptSuggestionOnCommitCharacter: false,
  tabCompletion: 'on' as const,
  wordBasedSuggestions: 'currentDocument' as const,
  snippetSuggestions: 'top' as const,
  suggest: {
    selectionMode: 'never' as const,
    showWords: true,
    snippetsPreventQuickSuggestions: false,
  },
  quickSuggestions: {
    other: true,
    comments: false,
    strings: false,
  },
  suggestOnTriggerCharacters: true,
};

const MONO_FALLBACK = ', Consolas, monospace';

/** Translate a port chord ("mod+s") into a Monaco keybinding number. */
const parseKeybinding = (chord: string, monaco: any): number | null => {
  const parts = chord.toLowerCase().split('+');
  const key = parts.pop();
  if (!key || key.length !== 1) {
    console.warn(`CodeEditorHost.addCommand: unsupported keybinding "${chord}"`);
    return null;
  }
  let binding = 0;
  for (const mod of parts) {
    if (mod === 'mod' || mod === 'ctrl') binding |= monaco.KeyMod.CtrlCmd;
    else if (mod === 'shift') binding |= monaco.KeyMod.Shift;
    else if (mod === 'alt') binding |= monaco.KeyMod.Alt;
    else if (mod === 'win') binding |= monaco.KeyMod.WinCtrl;
    else {
      console.warn(`CodeEditorHost.addCommand: unsupported modifier "${mod}" in "${chord}"`);
      return null;
    }
  }
  const keyCode = monaco.KeyCode[`Key${key.toUpperCase()}`];
  if (typeof keyCode !== 'number') {
    console.warn(`CodeEditorHost.addCommand: unsupported key "${key}" in "${chord}"`);
    return null;
  }
  return binding | keyCode;
};

const MONACO_SEVERITY: Record<string, number> = { error: 8, warning: 4, info: 2 };
const severityToMonaco = (severity: number): EditorMarker['severity'] =>
  severity >= 8 ? 'error' : severity >= 4 ? 'warning' : 'info';

export const CodeEditor: FC<CodeEditorProps> = ({
  value,
  language = 'cpp',
  themeName = 'oler-dark-theme',
  fontSize = 14,
  fontFamily = 'Cascadia Mono',
  tabSize = 4,
  minimap = false,
  readOnly = false,
  onChange,
  onReady,
  loading,
  editorOptionsExtras,
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const changeListenersRef = useRef(new Set<(value: string) => void>());
  // Keep latest callbacks in refs so the host object stays stable across renders.
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onChangeRef.current = onChange;
    onReadyRef.current = onReady;
  });

  const host = useMemo<CodeEditorHost>(() => {
    const currentModel = () => editorRef.current?.getModel?.() ?? null;
    return {
      getValue: () => editorRef.current?.getValue() ?? '',
      setValue: (next) => editorRef.current?.setValue(next),
      getModelMarkers: (owner) => {
        const monaco = monacoRef.current;
        const model = currentModel();
        if (!monaco || !model) return [];
        const filter: Record<string, unknown> = { resource: model.uri };
        if (owner) filter.owner = owner;
        return (monaco.editor.getModelMarkers(filter) as any[]).map((m) => ({
          severity: severityToMonaco(m.severity),
          message: m.message,
          startLineNumber: m.startLineNumber,
          startColumn: m.startColumn,
          endLineNumber: m.endLineNumber,
          endColumn: m.endColumn,
        }));
      },
      setModelMarkers: (owner, markers) => {
        const monaco = monacoRef.current;
        const model = currentModel();
        if (!monaco || !model) return;
        const translated = markers.map((m) => ({
          ...m,
          severity: MONACO_SEVERITY[m.severity] ?? MONACO_SEVERITY.info,
        }));
        monaco.editor.setModelMarkers(model, owner, translated);
      },
      onDidChangeContent: (listener) => {
        changeListenersRef.current.add(listener);
        return {
          dispose: () => {
            changeListenersRef.current.delete(listener);
          },
        };
      },
      addCommand: (keybinding, handler) => {
        const monaco = monacoRef.current;
        if (!monaco || !editorRef.current) return;
        const binding = parseKeybinding(keybinding, monaco);
        if (binding !== null) editorRef.current.addCommand(binding, handler);
      },
      focus: () => editorRef.current?.focus(),
      dispose: () => editorRef.current?.dispose?.(),
    };
  }, []);

  const emitChange = (next: string | undefined) => {
    const val = next ?? '';
    onChangeRef.current?.(val);
    changeListenersRef.current.forEach((listener) => listener(val));
  };

  const handleMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    monaco.editor.setTheme(themeName);
    onReadyRef.current?.(host);
  };

  // Theme prop switches registered themes; re-assert on the engine so a
  // re-mounted editor never keeps a stale global theme.
  useEffect(() => {
    if (monacoRef.current) monacoRef.current.editor.setTheme(themeName);
  }, [themeName]);

  return (
    <Editor
      height="100%"
      loading={loading}
      defaultLanguage={language}
      language={language}
      value={value}
      theme={themeName}
      beforeMount={(monaco) => {
        registerMonacoThemes(monaco);
        registerCppCompletion(monaco);
      }}
      onMount={handleMount}
      onChange={emitChange}
      options={{
        ...BASE_OPTIONS,
        fontSize,
        fontFamily: fontFamily + MONO_FALLBACK,
        tabSize,
        minimap: { enabled: minimap, scale: 0.75 },
        readOnly,
        ...(editorOptionsExtras as Record<string, unknown> | undefined),
      }}
    />
  );
};

export default CodeEditor;
