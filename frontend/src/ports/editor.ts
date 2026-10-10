/**
 * Port: code editor.
 *
 * `components/**` may only consume editor capabilities through this module —
 * never import `@monaco-editor/react` / `monaco-editor` directly. The concrete
 * implementation (Monaco) lives in `adapters/editor/`; swapping it out must not
 * require touching business components.
 */
import type { ReactNode } from 'react';

export type EditorMarkerSeverity = 'error' | 'warning' | 'info';

/** Port-level diagnostic — adapters translate to/from the engine's shape. */
export interface EditorMarker {
  severity: EditorMarkerSeverity;
  message: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface EditorDisposable {
  dispose(): void;
}

/**
 * Imperative handle over a live editor instance. Capability-shaped on purpose:
 * no vendor namespace, no raw options objects.
 */
export interface CodeEditorHost {
  getValue(): string;
  setValue(value: string): void;
  /** Markers currently set on the active model (optionally by owner). */
  getModelMarkers(owner?: string): EditorMarker[];
  /** Replace all markers previously registered under `owner`. */
  setModelMarkers(owner: string, markers: EditorMarker[]): void;
  onDidChangeContent(listener: (value: string) => void): EditorDisposable;
  /**
   * Bind a shortcut scoped to the editor, e.g. `addCommand('mod+s', save)`.
   * Chord grammar: `mod|ctrl|alt|shift|win` joined by `+`, ending in a single
   * letter or digit key. `mod` maps to Ctrl on Windows/Linux, Cmd on macOS.
   */
  addCommand(keybinding: string, handler: () => void): void;
  focus(): void;
  dispose(): void;
}

/**
 * Props for the React editor surface. Only Olympia-relevant fields are named;
 * engine-specific extras must go through `editorOptionsExtras` (deprecated
 * escape hatch) until the port grows a named field for them.
 */
export interface CodeEditorProps {
  value: string;
  language?: string;
  /** Olympia theme name (the adapter registers themes itself). */
  themeName?: string;
  fontSize?: number;
  /** Base family — the adapter appends the platform monospace fallback stack. */
  fontFamily?: string;
  tabSize?: number;
  minimap?: boolean;
  readOnly?: boolean;
  onChange?(value: string): void;
  /** Fired once when the engine is live; the host stays valid until unmount. */
  onReady?(host: CodeEditorHost): void;
  loading?: ReactNode;
  /**
   * @deprecated Raw engine options escape hatch — kept so the migration does
   * not have to land in one step; do not use in new code.
   */
  editorOptionsExtras?: Record<string, unknown>;
}

/** Options for the imperative factory; mirrors the React surface minus events. */
export interface EditorHostOptions {
  value?: string;
  language?: string;
  themeName?: string;
  fontSize?: number;
  fontFamily?: string;
  tabSize?: number;
  minimap?: boolean;
  readOnly?: boolean;
  onChange?(value: string): void;
}

export { CodeEditor } from '../adapters/editor/MonacoEditorAdapter';
export { createEditorHost } from '../adapters/editor/editorHost';
