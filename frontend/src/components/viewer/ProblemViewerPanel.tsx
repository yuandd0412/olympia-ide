import { motion, AnimatePresence } from 'framer-motion';
import { tauriApi } from '../../services/tauriApi';
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
  PanelLeftClose,
  ExternalLink,
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Swords,
  Layers
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import type { PracticeRecord } from '../../types';

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
    practiceRecords,
    activeRecordId,
    createPracticeRecord,
    updatePracticeRecord,
    deletePracticeRecord,
    setActiveRecordId,
    addPracticeProblem,
    updatePracticeProblem,
    removePracticeProblem,
    setContestEndTime,
  } = useAppStore();

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Import wizard state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'contest' | 'problem-set'>('problem-set');
  const [importName, setImportName] = useState('');
  const [importDuration, setImportDuration] = useState(120);
  const [importedFileName, setImportedFileName] = useState('');

  const activeRecord = practiceRecords.find((r) => r.id === activeRecordId) || null;
  const sortedProblems = activeRecord
    ? [...activeRecord.problems].sort((a, b) => a.pageStart - b.pageStart)
    : [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setViewerPdfUrl(URL.createObjectURL(file));
    setImportedFileName(file.name.replace(/\.pdf$/i, ''));
    setImportName(file.name.replace(/\.pdf$/i, ''));
    setImportType('problem-set');
    setImportDuration(120);
    setShowImportModal(true);
    e.target.value = '';
  };

  const confirmImport = () => {
    const rec: PracticeRecord = {
      id: crypto.randomUUID(),
      name: importName.trim() || importedFileName || '未命名记录',
      type: importType,
      fileName: importedFileName ? `${importedFileName}.pdf` : undefined,
      problems: [],
      createdAt: new Date().toISOString(),
      contestEndTime: importType === 'contest' ? Date.now() + importDuration * 60_000 : null,
    };
    createPracticeRecord(rec);
    if (importType === 'contest' && rec.contestEndTime) {
      setContestEndTime(rec.contestEndTime);
    }
    setShowImportModal(false);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      updatePracticeRecord(renamingId, { name: renameValue.trim() });
    }
    setRenamingId(null);
  };

  const addProblemAtCurrentPage = () => {
    if (!activeRecord) return;
    addPracticeProblem(activeRecord.id, {
      id: crypto.randomUUID(),
      title: `第${activeRecord.problems.length + 1}题`,
      pageStart: currentPage,
      pageEnd: currentPage,
    });
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const pdfMode = !!viewerPdfUrl;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15, ease: 'easeOut' }} className="w-full h-full flex flex-col overflow-hidden bg-[var(--bg-surface)]" style={{ borderColor: 'var(--border)' }}>
      {/* Top Header Controls */}
      <div className="h-9 px-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button onClick={onClose} className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer" title="隐藏侧边栏">
            <PanelLeftClose className="w-4 h-4" />
          </button>
          {activeRecord ? (
            renamingId === activeRecord.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                className="bg-[var(--bg-elevated)] text-[var(--text-primary)] px-1.5 py-0.5 rounded outline-none border border-[var(--accent)] text-xs w-36"
              />
            ) : (
              <>
                <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                  {activeRecord.type === 'contest' ? '🏆 ' : '📚 '}{activeRecord.name}
                </span>
                <button
                  onClick={() => { setRenamingId(activeRecord.id); setRenameValue(activeRecord.name); }}
                  className="p-0.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                  title="重命名"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </>
            )
          ) : (
            <span className="text-xs font-bold text-[var(--text-primary)] truncate">
              {pdfMode ? '本地 PDF 题面' : viewerProblem ? viewerProblem.id : '题面阅读'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!pdfMode && (
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
          )}

          <label className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer" title="导入本地 PDF（可创建比赛或题集）">
            <Upload className="w-3.5 h-3.5" />
            <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Record switcher (all practice records) */}
      {practiceRecords.length > 0 && (
        <div className="px-3 py-1.5 border-b flex items-center gap-1.5 overflow-x-auto shrink-0" style={{ borderColor: 'var(--border)' }}>
          <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">练习记录:</span>
          {practiceRecords.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRecordId(r.id)}
              className={
                'px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap cursor-pointer border transition-colors shrink-0 ' +
                (r.id === activeRecordId
                  ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--text-primary)]'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]')
              }
            >
              {r.type === 'contest' ? '🏆' : '📚'} {r.name}
            </button>
          ))}
          {activeRecordId && (
            <button
              onClick={() => deletePracticeRecord(activeRecordId)}
              className="p-1 rounded text-[var(--text-tertiary)] hover:text-[#ff453a] cursor-pointer shrink-0"
              title="删除当前练习记录"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 select-text space-y-4">
        {pdfMode ? (
          <div className="w-full flex flex-col gap-3">
            {/* Problem chips for the active record */}
            {activeRecord && sortedProblems.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {sortedProblems.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setCurrentPage(p.pageStart)}
                    className="px-2 py-1 rounded-lg text-[11px] border cursor-pointer transition-colors border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]"
                    title={`第 ${p.pageStart}-${p.pageEnd} 页`}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            )}

            {/* Page stepper */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] text-xs select-none">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={1}
                  value={currentPage}
                  onChange={(e) => setCurrentPage(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 bg-[var(--bg-elevated)] text-center text-[var(--text-primary)] border border-[var(--border)] rounded px-1 py-0.5 outline-none focus:border-[var(--accent)]"
                />
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-[var(--text-tertiary)]">页</span>
              </div>
              <button onClick={() => setViewerPdfUrl(null)} className="text-[var(--accent)] hover:underline cursor-pointer">
                关闭 PDF
              </button>
            </div>

            {/* PDF iframe — #page=N jumps the embedded viewer */}
            <iframe
              key={`${viewerPdfUrl}#p${currentPage}`}
              src={`${viewerPdfUrl}#page=${currentPage}`}
              className="w-full h-[700px] rounded border border-[var(--border)] bg-white"
              title="PDF Viewer"
            />

            {/* Problem marking list */}
            {activeRecord ? (
              <div className="p-3 rounded-xl border bg-[var(--bg-elevated)] border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--text-primary)]">
                    题目切分（{activeRecord.problems.length} 题）
                  </span>
                  <button
                    onClick={addProblemAtCurrentPage}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-subtle)] cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> 在第 {currentPage} 页添加题目
                  </button>
                </div>

                {sortedProblems.length === 0 && (
                  <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">
                    把页码翻到一道题的起始页，点上方按钮添加题目；再用每行的页码输入框微调起止页。
                  </p>
                )}

                {sortedProblems.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5 text-[11px]">
                    <input
                      value={p.title}
                      onChange={(e) => updatePracticeProblem(activeRecord.id, p.id, { title: e.target.value })}
                      className="flex-1 min-w-0 bg-[var(--bg-base)] text-[var(--text-primary)] border border-[var(--border)] rounded px-1.5 py-1 outline-none focus:border-[var(--accent)]"
                    />
                    <input
                      type="number"
                      min={1}
                      value={p.pageStart}
                      onChange={(e) => updatePracticeProblem(activeRecord.id, p.id, { pageStart: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-14 bg-[var(--bg-base)] text-center text-[var(--text-primary)] border border-[var(--border)] rounded px-1 py-1 outline-none focus:border-[var(--accent)]"
                      title="起始页"
                    />
                    <span className="text-[var(--text-tertiary)]">-</span>
                    <input
                      type="number"
                      min={1}
                      value={p.pageEnd}
                      onChange={(e) => updatePracticeProblem(activeRecord.id, p.id, { pageEnd: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-14 bg-[var(--bg-base)] text-center text-[var(--text-primary)] border border-[var(--border)] rounded px-1 py-1 outline-none focus:border-[var(--accent)]"
                      title="结束页"
                    />
                    <button
                      onClick={() => setCurrentPage(p.pageStart)}
                      className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--accent)] cursor-pointer"
                      title="跳转到起始页"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removePracticeProblem(activeRecord.id, p.id)}
                      className="p-1 rounded text-[var(--text-tertiary)] hover:text-[#ff453a] cursor-pointer"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[var(--text-tertiary)]">
                这份 PDF 还没有关联练习记录。点右上角导入按钮重新导入，即可选择创建比赛或题集。
              </p>
            )}
          </div>
        ) : viewerProblem ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-3">
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-sm font-bold text-[var(--text-primary)] leading-tight flex-1">
                  {viewerProblem.title}
                </h1>
                <button
                  onClick={() => tauriApi.openUrl("https://www.luogu.com.cn/problem/" + viewerProblem.id)}
                  className="flex items-center gap-1 text-[10px] text-[var(--accent)] hover:underline shrink-0 px-2 py-0.5 rounded bg-[var(--accent-subtle)] cursor-pointer"
                  title="在系统默认浏览器中打开原题链接与提交"
                >
                  <span>原题提交</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>
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

      {/* Import Wizard Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md p-6 rounded-2xl border bg-[var(--bg-surface)] border-[var(--border)] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">导入 PDF：{importedFileName}.pdf</h3>
                <button onClick={() => setShowImportModal(false)} className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setImportType('problem-set')}
                  className={'p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 cursor-pointer transition-all ' +
                    (importType === 'problem-set'
                      ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                      : 'border-[var(--border)] bg-[var(--bg-elevated)] opacity-70 hover:opacity-100')}
                >
                  <Layers className="w-5 h-5 text-[var(--accent)]" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">导入为题集</span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">日常练习，可随时改名</span>
                </button>
                <button
                  onClick={() => setImportType('contest')}
                  className={'p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 cursor-pointer transition-all ' +
                    (importType === 'contest'
                      ? 'border-[#ff9f0a] bg-[#ff9f0a]/10'
                      : 'border-[var(--border)] bg-[var(--bg-elevated)] opacity-70 hover:opacity-100')}
                >
                  <Swords className="w-5 h-5 text-[#ff9f0a]" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">创建比赛</span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">启动比赛模式，锁定 AI</span>
                </button>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                  {importType === 'contest' ? '比赛名称' : '题集名称'}
                </label>
                <input
                  autoFocus
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmImport(); }}
                  className="w-full bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs outline-none focus:border-[var(--accent)]"
                />
              </div>

              {importType === 'contest' && (
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                    比赛时长（分钟）
                  </label>
                  <input
                    type="number"
                    min={5}
                    value={importDuration}
                    onChange={(e) => setImportDuration(Math.max(5, parseInt(e.target.value) || 120))}
                    className="w-32 bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-[var(--accent)]"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={confirmImport}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[var(--accent)] hover:brightness-110 text-white cursor-pointer shadow-lg shadow-[var(--accent)]/20"
                >
                  {importType === 'contest' ? '开始比赛' : '创建题集'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
