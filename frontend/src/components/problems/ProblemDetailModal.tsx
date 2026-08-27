import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { X, Play, ExternalLink, Clock, Cpu, Copy, Check } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import type { Problem } from '../../types';

interface Props {
  problem: Problem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProblemDetailModal: React.FC<Props> = ({ problem, isOpen, onClose }) => {
  const { setActiveProblem } = useAppStore();
  const [copiedIdx, setCopiedIdx] = React.useState<number | null>(null);

  if (!isOpen || !problem) return null;

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleOpenEditor = () => {
    setActiveProblem(problem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 select-none animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden text-sm"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Modal Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between shrink-0"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="font-mono text-sm font-bold px-2 py-0.5 rounded border"
              style={{
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent)',
                borderColor: 'var(--border)',
              }}
            >
              {problem.id}
            </span>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              {problem.title}
            </h2>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'rgba(52, 199, 89, 0.15)',
                color: 'var(--color-ac)',
              }}
            >
              {problem.difficulty}
            </span>
          </div>

          <div className="flex items-center gap-2">

            <a
              href={problem.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-all"
              title="在浏览器中查看原题"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={handleOpenEditor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs text-white shadow-sm transition-all hover:brightness-110 active:scale-95 cursor-pointer"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>开始练习</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-all cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 select-text">
          {/* Limits Pill */}
          <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-tertiary)] select-none">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 时间限制: {problem.timeLimitMs} ms
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" /> 空间限制: {problem.memoryLimitKb / 1024} MB
            </span>
            <span className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border)]">
              来源: {problem.oj}
            </span>
          </div>

          {/* Description Markdown with KaTeX */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 select-none">
              题目描述
            </h3>
            <div className="prose prose-invert max-w-none text-sm leading-relaxed text-[var(--text-primary)]">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {problem.descriptionMd || '暂无题目描述。'}
              </ReactMarkdown>
            </div>
          </div>

          {/* Input Format */}
          {problem.inputFormat && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 select-none">
                输入格式
              </h3>
              <div className="text-sm leading-relaxed text-[var(--text-primary)]">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {problem.inputFormat}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Output Format */}
          {problem.outputFormat && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 select-none">
                输出格式
              </h3>
              <div className="text-sm leading-relaxed text-[var(--text-primary)]">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {problem.outputFormat}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Samples */}
          {problem.samples.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-3 select-none">
                输入输出样例
              </h3>
              <div className="space-y-4">
                {problem.samples.map((s, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-2 gap-4 p-4 rounded-xl border bg-[var(--bg-elevated)] border-[var(--border)]"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5 select-none">
                        <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                          样例输入 #{idx + 1}
                        </span>
                        <button
                          onClick={() => handleCopy(s.input, idx * 2)}
                          className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          {copiedIdx === idx * 2 ? (
                            <>
                              <Check className="w-3 h-3 text-[#34c759]" /> 已复制
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> 复制
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-2.5 rounded-lg bg-black/20 font-mono text-xs overflow-auto border border-white/5">
                        {s.input}
                      </pre>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5 select-none">
                        <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                          样例输出 #{idx + 1}
                        </span>
                        <button
                          onClick={() => handleCopy(s.output, idx * 2 + 1)}
                          className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          {copiedIdx === idx * 2 + 1 ? (
                            <>
                              <Check className="w-3 h-3 text-[#34c759]" /> 已复制
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> 复制
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-2.5 rounded-lg bg-black/20 font-mono text-xs overflow-auto border border-white/5">
                        {s.output}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hint */}
          {problem.hint && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 select-none">
                说明 / 提示
              </h3>
              <div className="text-sm leading-relaxed text-[var(--text-primary)]">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {problem.hint}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
