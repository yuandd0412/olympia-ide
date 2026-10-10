import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Cpu,
  FileCode,
  Layers,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { memoryLabel } from '../../lib/design';

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

  const [activePanelTab, setActivePanelTab] = useState<'cases' | 'output'>('cases');
  const [selectedCaseId, setSelectedCaseId] = useState<number>(1);

  const activeResult = runResult?.testcases.find((t) => t.id === selectedCaseId);
  // 选中项被删除后回退到第一个用例，避免输入框悬空（打字静默无效）
  const selectedCase =
    testcases.find((t) => t.id === selectedCaseId) ?? testcases[0];
  const selectedId = selectedCase?.id ?? 1;
  const activeInput = selectedCase;

  const getVerdictBadge = (verdict?: string) => {
    switch (verdict) {
      case 'AC':
        return (
          <motion.span
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--color-ac-soft)] text-[var(--color-ac)] border-[var(--color-ac)] flex items-center gap-1 font-mono"
          >
            <CheckCircle2 className="w-3 h-3" /> AC
          </motion.span>
        );
      case 'WA':
        return (
          <motion.span
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--color-wa-soft)] text-[var(--color-wa)] border-[var(--color-wa)] flex items-center gap-1 font-mono"
          >
            <XCircle className="w-3 h-3" /> WA
          </motion.span>
        );
      case 'TLE':
        return (
          <motion.span
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--color-tle-soft)] text-[var(--color-tle)] border-[var(--color-tle)] flex items-center gap-1 font-mono"
          >
            <Clock className="w-3 h-3" /> TLE
          </motion.span>
        );
      case 'MLE':
        return (
          <motion.span
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--color-mle-soft)] text-[var(--color-mle)] border-[var(--color-mle)] flex items-center gap-1 font-mono"
          >
            <Cpu className="w-3 h-3" /> MLE
          </motion.span>
        );
      case 'RE':
        return (
          <motion.span
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--color-re-soft)] text-[var(--color-re)] border-[var(--color-re)] flex items-center gap-1 font-mono"
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
            className={'px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ' + (activePanelTab === 'cases' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-xs' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]')}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>测试用例 ({testcases.length})</span>
          </button>

          <button
            onClick={() => setActivePanelTab('output')}
            className={'px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ' + (activePanelTab === 'output' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-xs' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]')}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>编译输出</span>
            {runResult?.isCompilationError && (
              <span className="w-2 h-2 rounded-full bg-[var(--color-ce)]" />
            )}
          </button>
        </div>

        {/* Global Verdict Banner */}
        {runResult && (
          <div className="flex items-center gap-3">
            {runResult.isCompilationError ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--color-ce-soft)] text-[var(--color-ce)] border border-[var(--color-ce)] font-mono">
                Compilation Error
              </span>
            ) : (
              <div className="flex items-center gap-2">
                {getVerdictBadge(runResult.overallVerdict)}
                <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
                  {runResult.totalTimeMs} ms / {memoryLabel(runResult.maxMemoryKb)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-hidden flex relative">
        <div className="absolute inset-0 bg-[var(--bg-surface)] flex">
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
                const isSel = tc.id === selectedId;
                const result = runResult?.testcases.find((r) => r.id === tc.id);
                return (
                  <div
                    key={tc.id}
                    onClick={() => setSelectedCaseId(tc.id)}
                    className={'px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-all ' + (isSel ? 'bg-[var(--accent-subtle)] border border-[var(--accent)] text-[var(--text-primary)]' : 'bg-[var(--bg-elevated)] border border-transparent hover:border-[var(--border)] text-[var(--text-secondary)]')}
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
                        className="opacity-0 hover:opacity-100 p-0.5 rounded text-[var(--text-tertiary)] hover:text-[var(--color-wa)] transition-opacity cursor-pointer"
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
                  输入 (stdin)
                </span>
                <textarea
                  value={activeInput?.input || ''}
                  onChange={(e) =>
                    updateTestcase(
                      selectedId,
                      e.target.value,
                      activeInput?.expectedOutput || ''
                    )
                  }
                  placeholder="输入测试数据..."
                  className="flex-1 w-full p-2.5 rounded-lg border font-mono text-xs resize-none outline-none focus:border-[var(--accent)] transition-all bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]"
                />
              </div>

              {/* Expected Output Column */}
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
                    期望输出 (stdout)
                  </span>
                  {activeInput?.expectedOutput && (
                    <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                      {activeInput.expectedOutput.length} 字符
                    </span>
                  )}
                </div>
                <textarea
                  value={activeInput?.expectedOutput || ''}
                  onChange={(e) =>
                    updateTestcase(
                      selectedId,
                      activeInput?.input || '',
                      e.target.value
                    )
                  }
                  placeholder="期望输出内容..."
                  className="flex-1 w-full p-2.5 rounded-lg border font-mono text-xs resize-none outline-none focus:border-[var(--accent)] transition-all bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]"
                />
              </div>

              {/* Actual Output Column (If run result available) */}
              {activeResult && (
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[var(--text-tertiary)] flex items-center gap-1.5">
                      <span>实际输出</span>
                      {activeResult.verdict === 'AC' ? (
                        <span className="text-[var(--color-ac)] text-[10px] font-semibold">100% 匹配一致</span>
                      ) : activeResult.verdict === 'MLE' ? (
                        <span className="text-[var(--color-mle)] text-[10px] font-semibold">超出内存限制（本例峰值 {memoryLabel(activeResult.memoryKb)}）</span>
                      ) : activeResult.actualOutput.trim() === activeInput?.expectedOutput.trim() ? (
                        <span className="text-[var(--color-tle)] text-[10px] font-semibold">末尾空格/换行差异</span>
                      ) : (
                        <span className="text-[var(--color-wa)] text-[10px] font-semibold">内容不符 (Diff)</span>
                      )}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                      {activeResult.timeMs}ms
                    </span>
                  </div>
                  <pre
                    className={'flex-1 w-full p-2.5 rounded-lg border font-mono text-xs overflow-auto leading-relaxed ' + (activeResult.verdict === 'AC' ? 'border-[var(--color-ac)] bg-[var(--color-ac-soft)] text-[var(--text-primary)]' : activeResult.verdict === 'MLE' ? 'border-[var(--color-mle)] bg-[var(--color-mle-soft)] text-[var(--text-primary)]' : 'border-[var(--color-wa)] bg-[var(--color-wa-soft)] text-[var(--text-primary)]')}
                  >
                    {activeResult.actualOutput || (activeResult.errorMessage && ('[Error]: ' + activeResult.errorMessage)) || '(空输出)'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Compilation Stderr / Output Tab */
          <div className="flex-1 p-3 flex flex-col gap-1.5 overflow-hidden">
            <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
              编译器控制台日志 ({settings?.compilerPath || 'g++'} {settings?.compilerFlags?.join(' ') || '-O2 -std=c++17'})
            </span>
            <pre className="flex-1 w-full p-3 rounded-lg border font-mono text-xs overflow-auto bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)] leading-relaxed whitespace-pre-wrap">
              {runResult?.compilerOutput || '暂无编译日志。点击上方「运行评测」开始编译。'}
            </pre>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
