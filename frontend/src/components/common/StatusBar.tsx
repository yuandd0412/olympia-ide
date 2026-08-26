import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  Moon,
  Sun,
  Code2,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';

export const StatusBar: React.FC = () => {
  const {
    settings,
    updateSettings,
    tabs,
    activeTabId,
    isRunning,
    activeProblem,
  } = useAppStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const runResult = activeTab?.runResult;

  const handleToggleTheme = () => {
    const next = settings.theme === 'GitHubLight' ? 'OneDarkPro' : 'GitHubLight';
    updateSettings({ theme: next });
  };

  const isLight = settings.theme === 'GitHubLight';

  return (
    <footer
      className="h-6 px-3 border-t flex items-center justify-between text-[11px] font-mono select-none shrink-0 z-10"
      style={{
        backgroundColor: isLight ? '#f6f8fa' : '#181818',
        borderColor: isLight ? '#d0d7de' : '#2b2b2b',
        color: isLight ? '#57606a' : '#8b949e',
      }}
    >
      {/* Left Section: Toolchain & Limits */}
      <div className="flex items-center gap-3">
        {/* Compiler Toolchain Badge */}
        <div
          title={`当前 C++ 编译器：${settings.compilerPath}，参数：${settings.compilerFlags.join(' ')}`}
          className="flex items-center gap-1.5 hover:text-[var(--text-primary)] cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-[#34c759] shadow-xs shrink-0" />
          <span className="font-semibold">MinGW 13.1.0 (x64)</span>
          <span className="opacity-60 text-[10px]">C++17</span>
        </div>

        <span className="opacity-30">|</span>

        {/* Problem Limits if active */}
        {activeProblem ? (
          <div className="flex items-center gap-2 text-[10px]">
            <span className="font-semibold text-[var(--accent)]">{activeProblem.id}</span>
            <span className="truncate max-w-[140px] opacity-80">{activeProblem.title}</span>
            <span className="opacity-60">{activeProblem.timeLimitMs}ms / {Math.round(activeProblem.memoryLimitKb / 1024)}MB</span>
          </div>
        ) : (
          <span className="opacity-60 text-[10px]">自由练习模式 (Free Code)</span>
        )}
      </div>

      {/* Center Section: Evaluation Live State */}
      <div className="flex items-center gap-2">
        {isRunning ? (
          <div className="flex items-center gap-1.5 text-[var(--accent)] font-semibold animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>正在编译与多样例评测...</span>
          </div>
        ) : runResult ? (
          runResult.isCompilationError ? (
            <div className="flex items-center gap-1 text-[#ff9f0a] font-semibold">
              <XCircle className="w-3 h-3" />
              <span>Compilation Error</span>
            </div>
          ) : runResult.overallVerdict === 'AC' ? (
            <div className="flex items-center gap-1 text-[#34c759] font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              <span>AC 全样例通过 ({runResult.totalTimeMs}ms · {runResult.maxMemoryKb}KB)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[#ff453a] font-semibold">
              <XCircle className="w-3 h-3" />
              <span>{runResult.overallVerdict} 评测未通过 ({runResult.totalTimeMs}ms)</span>
            </div>
          )
        ) : (
          <span className="opacity-60 text-[10px] flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 opacity-70" />
            <span>就绪 (Ctrl+R 运行评测)</span>
          </span>
        )}
      </div>

      {/* Right Section: Encoding, Indentation, Theme Switcher & Shortcuts */}
      <div className="flex items-center gap-3">
        <span className="hover:text-[var(--text-primary)] cursor-default">UTF-8</span>
        <span className="hover:text-[var(--text-primary)] cursor-default">Spaces: 4</span>
        <span className="hover:text-[var(--text-primary)] cursor-default flex items-center gap-1">
          <Code2 className="w-3 h-3 opacity-70" /> C++
        </span>

        <span className="opacity-30">|</span>

        {/* Theme Pill Toggle */}
        <button
          onClick={handleToggleTheme}
          title={`当前主题：${settings.theme === 'GitHubLight' ? 'GitHub Light (浅色)' : 'One Dark Pro (深色)'}，点击切换`}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-black/10 transition-colors cursor-pointer text-[10px]"
        >
          {settings.theme === 'GitHubLight' ? (
            <>
              <Sun className="w-3 h-3 text-[#e5a43b]" />
              <span>GitHub Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3 h-3 text-[#7aa2f7]" />
              <span>One Dark Pro</span>
            </>
          )}
        </button>
      </div>
    </footer>
  );
};
