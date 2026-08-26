import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  Upload,
  BookOpen,
  Clock,
  Cpu,
  Copy,
  Check,
  PanelLeftClose
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';

interface ProblemViewerPanelProps {
  onClose: () => void;
}

export const ProblemViewerPanel: React.FC<ProblemViewerPanelProps> = ({ onClose }) => {
  const {
    viewerProblem,
    viewerPdfUrl,
    setViewerPdfUrl,
    problems,
    setActiveProblem,
  } = useAppStore();

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setViewerPdfUrl(url);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="w-96 h-full flex flex-col overflow-hidden border-r shrink-0 bg-[var(--bg-surface)]" style={{ borderColor: 'var(--border)' }}>
      {/* Top Header Controls */}
      <div className="h-9 px-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 max-w-[50%]">
          <button onClick={onClose} className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer" title="隐藏侧边栏">
            <PanelLeftClose className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-[var(--text-primary)] truncate">
            {viewerPdfUrl ? "本地 PDF 题面" : (viewerProblem ? viewerProblem.id : "题面阅读")}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
          <select
            value={viewerProblem?.id || ''}
            onChange={(e) => {
              const p = problems.find((x) => x.id === e.target.value);
              if (p) setActiveProblem(p);
            }}
            className="w-24 bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] px-1 py-0.5 rounded text-[10px] outline-none cursor-pointer truncate"
          >
            <option value="">选择题目...</option>
            {problems.map((p) => (
              <option key={p.id} value={p.id}>{p.id}</option>
            ))}
          </select>

          <label className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer" title="打开本地 PDF (CSP/NOI 题单)">
            <Upload className="w-3.5 h-3.5" />
            <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 select-text space-y-5">
        {viewerPdfUrl ? (
          <div className="w-full h-full flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border)] text-xs text-[var(--text-tertiary)] select-none">
              <span>PDF 已载入</span>
              <button onClick={() => setViewerPdfUrl(null)} className="text-[var(--accent)] hover:underline cursor-pointer">
                关闭 PDF
              </button>
            </div>
            <iframe src={viewerPdfUrl} className="w-full h-[800px] flex-1 rounded border border-[var(--border)] bg-white" title="PDF Viewer" />
          </div>
        ) : viewerProblem ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-3">
              <h1 className="text-sm font-bold text-[var(--text-primary)] leading-tight">
                {viewerProblem.title}
              </h1>
              <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--text-tertiary)]">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {viewerProblem.timeLimitMs}ms</span>
                <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {viewerProblem.memoryLimitKb / 1024}MB</span>
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 select-none">题目描述</h3>
              <div className="prose prose-invert max-w-none text-xs leading-relaxed text-[var(--text-primary)]">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{viewerProblem.descriptionMd || '暂无题目描述。'}</ReactMarkdown>
              </div>
            </div>

            {viewerProblem.inputFormat && (
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 select-none">输入格式</h3>
                <div className="text-xs leading-relaxed text-[var(--text-primary)]">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{viewerProblem.inputFormat}</ReactMarkdown>
                </div>
              </div>
            )}

            {viewerProblem.outputFormat && (
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 select-none">输出格式</h3>
                <div className="text-xs leading-relaxed text-[var(--text-primary)]">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{viewerProblem.outputFormat}</ReactMarkdown>
                </div>
              </div>
            )}

            {viewerProblem.samples.map((s, idx) => (
              <div key={idx} className="flex flex-col gap-2 p-3 rounded-lg border bg-[var(--bg-elevated)] border-[var(--border)]">
                <div>
                  <div className="flex items-center justify-between mb-1 select-none">
                    <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">输入 #{idx + 1}</span>
                    <button onClick={() => handleCopy(s.input, idx * 2)} className="flex items-center gap-1 text-[9px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer">
                      {copiedIdx === idx * 2 ? <><Check className="w-2.5 h-2.5 text-[#34c759]" /> 复制成功</> : <><Copy className="w-2.5 h-2.5" /> 复制</>}
                    </button>
                  </div>
                  <pre className="p-1.5 rounded bg-black/20 font-mono text-[11px] overflow-auto">{s.input}</pre>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1 select-none">
                    <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">输出 #{idx + 1}</span>
                    <button onClick={() => handleCopy(s.output, idx * 2 + 1)} className="flex items-center gap-1 text-[9px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer">
                      {copiedIdx === idx * 2 + 1 ? <><Check className="w-2.5 h-2.5 text-[#34c759]" /> 复制成功</> : <><Copy className="w-2.5 h-2.5" /> 复制</>}
                    </button>
                  </div>
                  <pre className="p-1.5 rounded bg-black/20 font-mono text-[11px] overflow-auto">{s.output}</pre>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[var(--text-tertiary)]">
            <BookOpen className="w-6 h-6 mb-2 opacity-40 text-[var(--accent)]" />
            <p className="text-[11px] font-medium text-[var(--text-secondary)]">暂无题面信息</p>
            <p className="text-[10px] mt-1">可在上方选择题目，或导入本地 PDF 题单</p>
          </div>
        )}
      </div>
    </div>
  );
};
