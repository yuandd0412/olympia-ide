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
        <svg width="17" height="17" viewBox="0 0 512 512" aria-hidden="true" className="drop-shadow-[0_0_6px_rgba(0,122,204,0.5)]">
          <path d="M 294.8 111.1 A 150 150 0 1 0 400.9 217.2" fill="none" stroke="#2f9ce8" strokeWidth="56" strokeLinecap="round" />
          <path d="M 170 266 L 243 340 L 350 205" fill="none" stroke="#34c759" strokeWidth="56" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
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
