import { motion, AnimatePresence } from 'framer-motion';
import React, { useState } from 'react';
import {
    Download,
  ArrowRight,
  Filter,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { ProblemDetailModal } from './ProblemDetailModal';



export const ProblemsPage: React.FC = () => {
  const {
    problems,
    searchQuery,
    selectedDifficulty,
    openProblemModal,
    isDetailModalOpen,
    modalProblem,
    closeProblemModal,
    fetchOnlineProblem,
  } = useAppStore();

  const [isFetching, setIsFetching] = useState(false);
  const [fetchInput, setFetchInput] = useState('');
  const [showFetchDialog, setShowFetchDialog] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const filteredProblems = problems.filter((p) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDiff =
      selectedDifficulty === '全部' || p.difficulty.includes(selectedDifficulty);

    return matchesSearch && matchesDiff;
  });

  const handleFetch = async () => {
    if (!fetchInput.trim()) return;
    setIsFetching(true);
    setFetchError(null);
    try {
      const p = await fetchOnlineProblem(fetchInput.trim());
      setShowFetchDialog(false);
      setFetchInput('');
      openProblemModal(p);
    } catch (err: any) {
      setFetchError(String(err));
    } finally {
      setIsFetching(false);
    }
  };

  const getDifficultyColor = (diff: string) => {
    if (diff.includes('入门')) return '#34c759';
    if (diff.includes('普及')) return '#ff9f0a';
    if (diff.includes('提高')) return '#ff6b22';
    if (diff.includes('省选')) return '#af52de';
    if (diff.includes('NOI')) return '#ff453a';
    return '#34c759';
  };

  const getOjBadgeStyle = (oj: string) => {
    switch (oj) {
      case 'Luogu':
        return { bg: 'rgba(115, 186, 75, 0.15)', color: '#73ba4b' };
      case 'Codeforces':
        return { bg: 'rgba(125, 174, 212, 0.15)', color: '#7daed4' };
      case 'AtCoder':
        return { bg: 'rgba(181, 120, 80, 0.15)', color: '#b57850' };
      default:
        return { bg: 'rgba(86, 182, 194, 0.15)', color: '#56b6c2' };
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-6 overflow-y-auto select-none space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              最近做题
            </h1>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              查看本地记录与最近访问的题目
            </p>
          </div>
          <button
            onClick={() => setShowFetchDialog(true)}
            className="flex items-center gap-2 bg-[var(--accent)] hover:brightness-110 active:scale-95 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>获取在线题目</span>
          </button>
        </div>
      </div>

      {/* Problems Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProblems.map((p) => {
          const diffColor = getDifficultyColor(p.difficulty);
          const ojBadge = getOjBadgeStyle(p.oj);

          return (
            <div
              key={p.id}
              onClick={() => openProblemModal(p)}
              className="group relative h-32 p-4 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border)',
              }}
            >
              {/* Card Top Row: ID + Difficulty Dot */}
              <div className="flex items-center justify-between">
                <span
                  className="font-mono text-xs font-bold px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: 'var(--accent-subtle)',
                    color: 'var(--accent)',
                    borderColor: 'var(--border)',
                  }}
                >
                  {p.id}
                </span>

                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: diffColor,
                      boxShadow: `0 0 6px ${diffColor}80`,
                    }}
                  />
                  <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
                    {p.difficulty}
                  </span>
                </div>
              </div>

              {/* Card Title */}
              <h3 className="text-xs font-semibold text-[var(--text-primary)] line-clamp-2 leading-relaxed group-hover:text-[var(--accent)] transition-colors">
                {p.title}
              </h3>

              {/* Card Bottom Row: OJ badge + Action Arrow */}
              <div className="flex items-center justify-between text-[11px]">
                <span
                  className="px-2 py-0.5 rounded font-bold"
                  style={{
                    backgroundColor: ojBadge.bg,
                    color: ojBadge.color,
                  }}
                >
                  {p.oj}
                </span>

                <div className="flex items-center gap-1 text-[var(--accent)] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                  <span className="text-[10px] font-medium">查看</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProblems.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <Filter className="w-8 h-8 text-[var(--text-tertiary)] mb-2 opacity-50" />
          <p className="text-xs text-[var(--text-secondary)] font-medium">
            未找到匹配的题目
          </p>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
            尝试更换搜索关键词，或点击右上角「拉取洛谷题目」
          </p>
        </div>
      )}

      {/* Online Fetch Dialog */}
      <AnimatePresence>
        {showFetchDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border)',
              }}
            >
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                拉取洛谷在线题目
              </h2>
              <p className="text-xs text-[var(--text-tertiary)]">
                输入洛谷题目编号（如 <code className="font-mono text-[var(--accent)]">P1001</code>）或完整的题目链接，将自动解析 LaTeX 题面与样例测试点。
              </p>

              <input
                type="text"
                value={fetchInput}
                onChange={(e) => setFetchInput(e.target.value)}
                placeholder="例如: P1001 或 https://www.luogu.com.cn/problem/P1001"
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                className="w-full p-2.5 rounded-xl border text-sm font-mono outline-none focus:border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]"
                autoFocus
              />

              {fetchError && (
                <p className="text-xs text-[#ff453a] font-medium">{fetchError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowFetchDialog(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handleFetch}
                  disabled={isFetching || !fetchInput.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isFetching ? '抓取中...' : '确定拉取'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Problem Detail Modal */}
      <ProblemDetailModal
        problem={modalProblem}
        isOpen={isDetailModalOpen}
        onClose={closeProblemModal}
      />
    </div>
  );
};
