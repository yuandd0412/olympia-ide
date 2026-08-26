import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileCode,
  Layers,
  Terminal as TerminalIcon,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { TerminalPanel } from '../terminal/TerminalPanel';

export const RunnerPanel: React.FC = () => {
  const {
    tabs,
    activeTabId,
    settings,
    addTestcase,
    updateTestcase,
    removeTestcase,
  } = useAppStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const testcases = activeTab?.testcases || [];
  const runResult = activeTab?.runResult || null;

  const [activePanelTab, setActivePanelTab] = useState<'cases' | 'output' | 'terminal'>('cases');
  const [selectedCaseId, setSelectedCaseId] = useState<number>(1);
  const terminalRunSignal = useAppStore((s) => s.terminalRunSignal);
  React.useEffect(() => { if (terminalRunSignal > 0) setActivePanelTab('terminal'); }, [terminalRunSignal]);

  const activeResult = runResult?.testcases.find((t) => t.id === selectedCaseId);
  const activeInput = testcases.find((t) => t.id === selectedCaseId);

  const getVerdictBadge = (verdict?: string) => {
    switch (verdict) {
      case 'AC':
        return (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#34c759]/20 text-[#34c759] border border-[#34c759]/30 flex items-center gap-1 font-mono"
          >
            <CheckCircle2 className="w-3 h-3" /> AC
          </motion.span>
        );
      case 'WA':
        return (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#ff453a]/20 text-[#ff453a] border border-[#ff453a]/30 flex items-center gap-1 font-mono"
          >
            <XCircle className="w-3 h-3" /> WA
          </motion.span>
        );
      case 'TLE':
        return (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#ff9f0a]/20 text-[#ff9f0a] border border-[#ff9f0a]/30 flex items-center gap-1 font-mono"
          >
            <Clock className="w-3 h-3" /> TLE
          </motion.span>
        );
      case 'RE':
        return (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#c45c4a]/20 text-[#c45c4a] border border-[#c45c4a]/30 flex items-center gap-1 font-mono"
          >
            <AlertTriangle className="w-3 h-3" /> RE
          </motion.span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col border-t text-xs overflow-hidden select-none"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Runner Header */}
      <div
        className="h-9 px-4 border-b flex items-center justify-between shrink-0"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActivePanelTab('cases')}
            className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activePanelTab === 'cases'
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>娴嬭瘯鐢ㄤ緥 ({testcases.length})</span>
          </button>

          <button
            onClick={() => setActivePanelTab('output')}
            className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activePanelTab === 'output'
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>缂栬瘧杈撳嚭</span>
            {runResult?.isCompilationError && (
              <span className="w-2 h-2 rounded-full bg-[#ff453a]" />
            )}
          </button>

          <button
            onClick={() => setActivePanelTab('terminal')}
            className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activePanelTab === 'terminal'
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>闆嗘垚缁堢 (Terminal)</span>
          </button>
        </div>

        {/* Global Verdict Banner */}
        {runResult && activePanelTab !== 'terminal' && (
          <div className="flex items-center gap-3">
            {runResult.isCompilationError ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#c49a3c]/20 text-[#c49a3c] border border-[#c49a3c]/30 font-mono">
                Compilation Error
              </span>
            ) : (
              <div className="flex items-center gap-2">
                {getVerdictBadge(runResult.overallVerdict)}
                <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
                  {runResult.totalTimeMs} ms / {runResult.maxMemoryKb} KB
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-hidden flex relative">
        <div className={`absolute inset-0 z-10 bg-[var(--bg-base)] ${activePanelTab === 'terminal' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <TerminalPanel />
        </div>

        <div className={`absolute inset-0 bg-[var(--bg-surface)] ${activePanelTab !== 'terminal' ? 'opacity-100 pointer-events-auto z-0' : 'opacity-0 pointer-events-none -z-10'} flex`}>
          {activePanelTab === 'cases' ? (
            <div className="flex-1 p-3 overflow-hidden flex gap-3">
            {/* Case List Selector (Left) */}
            <div className="w-40 border-r pr-3 flex flex-col gap-1.5 shrink-0 overflow-y-auto">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Testcases
                </span>
                <button
                  onClick={addTestcase}
                  title="添加测试例"
                  className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--accent)] transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {testcases.map((tc, idx) => {
                const isSel = tc.id === selectedCaseId;
                const result = runResult?.testcases.find((r) => r.id === tc.id);
                return (
                  <div
                    key={tc.id}
                    onClick={() => setSelectedCaseId(tc.id)}
                    className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                      isSel
                        ? 'bg-[var(--accent-subtle)] border border-[var(--accent)] text-[var(--text-primary)]'
                        : 'bg-[var(--bg-elevated)] border border-transparent hover:border-[var(--border)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="font-bold text-[11px]">#{idx + 1}</span>
                      {result && getVerdictBadge(result.verdict)}
                    </div>
                    {testcases.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTestcase(tc.id);
                        }}
                        className="opacity-0 hover:opacity-100 p-0.5 rounded text-[var(--text-tertiary)] hover:text-[#ff453a] transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Case IO Fields (Right) */}
            <div className="flex-1 flex gap-3 overflow-hidden">
              {/* Input Column */}
              <div className="flex-1 flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
                  杈撳叆 (stdin)
                </span>
                <textarea
                  value={activeInput?.input || ''}
                  onChange={(e) =>
                    updateTestcase(
                      selectedCaseId,
                      e.target.value,
                      activeInput?.expectedOutput || ''
                    )
                  }
                  placeholder="杈撳叆娴嬭瘯鏁版嵁..."
                  className="flex-1 w-full p-2.5 rounded-lg border font-mono text-xs resize-none outline-none focus:border-[var(--accent)] transition-all bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]"
                />
              </div>

              {/* Expected Output Column */}
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
                    鏈熸湜杈撳嚭 (stdout)
                  </span>
                  {activeInput?.expectedOutput && (
                    <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                      {activeInput.expectedOutput.length} 瀛楃
                    </span>
                  )}
                </div>
                <textarea
                  value={activeInput?.expectedOutput || ''}
                  onChange={(e) =>
                    updateTestcase(
                      selectedCaseId,
                      activeInput?.input || '',
                      e.target.value
                    )
                  }
                  placeholder="鏈熸湜杈撳嚭鍐呭..."
                  className="flex-1 w-full p-2.5 rounded-lg border font-mono text-xs resize-none outline-none focus:border-[var(--accent)] transition-all bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]"
                />
              </div>

              {/* Actual Output Column (If run result available) */}
              {activeResult && (
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[var(--text-tertiary)] flex items-center gap-1.5">
                      <span>瀹為檯杈撳嚭</span>
                      {activeResult.verdict === 'AC' ? (
                        <span className="text-[#34c759] text-[10px] font-semibold">100% 匹配一致</span>
                      ) : activeResult.actualOutput.trim() === activeInput?.expectedOutput.trim() ? (
                        <span className="text-[#ff9f0a] text-[10px] font-semibold">鏈熬绌烘牸/鎹㈣宸紓</span>
                      ) : (
                        <span className="text-[#ff453a] text-[10px] font-semibold">鍐呭涓嶇 (Diff)</span>
                      )}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                      {activeResult.timeMs}ms
                    </span>
                  </div>
                  <pre
                    className={`flex-1 w-full p-2.5 rounded-lg border font-mono text-xs overflow-auto leading-relaxed ${
                      activeResult.verdict === 'AC'
                        ? 'border-[#34c759]/40 bg-[#34c759]/5 text-[var(--text-primary)]'
                        : 'border-[#ff453a]/40 bg-[#ff453a]/5 text-[var(--text-primary)]'
                    }`}
                  >
                    {activeResult.actualOutput || (activeResult.errorMessage && `[Error]: ${activeResult.errorMessage}`) || '(绌鸿緭鍑?'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Compilation Stderr / Output Tab */
          <div className="flex-1 p-3 flex flex-col gap-1.5 overflow-hidden">
            <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
              缂栬瘧鍣ㄦ帶鍒跺彴鏃ュ織 ({settings?.compilerPath || 'g++'} -O2 -std=c++17)
            </span>
            <pre className="flex-1 w-full p-3 rounded-lg border font-mono text-xs overflow-auto bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)] leading-relaxed whitespace-pre-wrap">
              {runResult?.compilerOutput || '暂无编译日志。点击上方「运行」开始编译。'}
            </pre>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

