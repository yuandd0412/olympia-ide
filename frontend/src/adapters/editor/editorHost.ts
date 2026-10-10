import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { CodeEditor } from './MonacoEditorAdapter';
import type { CodeEditorHost, EditorHostOptions } from '../../ports/editor';

/**
 * Imperative editor host factory for `ports/editor`. Mounts the exact same
 * Olympia editor component the React call sites use (single code path) and
 * bridges its host handle back to the imperative caller. The promise resolves
 * once the engine is live; if the engine never becomes ready it stays pending.
 */
export function createEditorHost(
  container: HTMLElement,
  options: EditorHostOptions = {},
): Promise<CodeEditorHost> {
  return new Promise((resolve) => {
    const mount = document.createElement('div');
    mount.style.width = '100%';
    mount.style.height = '100%';
    container.appendChild(mount);
    const root = createRoot(mount);
    root.render(
      createElement(CodeEditor, {
        ...options,
        value: options.value ?? '',
        onReady: (host: CodeEditorHost) => {
          resolve({
            ...host,
            dispose: () => {
              host.dispose();
              root.unmount();
              mount.remove();
            },
          });
        },
      }),
    );
  });
}
