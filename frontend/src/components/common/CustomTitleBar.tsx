import React, { useEffect, useMemo, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, Copy, X } from 'lucide-react';

export const CustomTitleBar: React.FC = () => {
  const appWindow = useMemo(() => getCurrentWindow(), []);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized);

    let unlistenFn: (() => void) | undefined;
    appWindow.onResized(async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    }).then(fn => {
      unlistenFn = fn;
    });

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, [appWindow]);

  return (
    <div
      className="w-full h-8 flex items-center justify-between shrink-0 select-none z-[9999]"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Left: App Logo / Title */}
      <div className="flex items-center px-3 gap-2 pointer-events-none">
        <div className="w-4 h-4 rounded bg-[var(--accent)] flex items-center justify-center text-[10px] font-bold text-white">
          O
        </div>
        <span className="text-xs font-semibold text-[var(--text-secondary)]">Olympia IDE</span>
      </div>

      {/* Middle: Drag Region */}
      <div data-tauri-drag-region className="flex-1 h-full cursor-default" />

      {/* Right: Window Controls */}
      <div className="flex h-full">
        <button
          className="w-11 h-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          onClick={() => appWindow.minimize()}
          title="最小化"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          className="w-11 h-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          onClick={async () => {
            await appWindow.toggleMaximize();
            setIsMaximized(await appWindow.isMaximized());
          }}
          title={isMaximized ? "向下还原" : "最大化"}
        >
          {isMaximized ? (
            <Copy className="w-3 h-3 rotate-180 scale-x-[-1]" />
          ) : (
            <Square className="w-3 h-3" />
          )}
        </button>
        <button
          className="w-11 h-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[#e81123] hover:text-white transition-colors cursor-pointer"
          onClick={() => appWindow.close()}
          title="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
