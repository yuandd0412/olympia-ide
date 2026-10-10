import { motion, AnimatePresence } from 'framer-motion';
import { modalShell, modalCard } from '../../lib/motion';
import React, { useState } from 'react';
import {
    Download,
  ArrowRight,
  Code2,
  Filter,
  Loader2,
  Search,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { difficultyColor } from '../../lib/design';
import { ProblemDetailModal } from './ProblemDetailModal';

/** Filter chips; `全部` is the store's default `selectedDifficulty`. */
const DIFFICULTIES = ['全部', '入门', '普及', '提高', '省选', 'NOI', '暂无'];



export const ProblemsPage: React.FC = () => {
  const {
    problems,
    searchQuery,
    selectedDifficulty,
    setSearchQuery,
    setSelectedDifficulty,
    openProblemModal,
    isDetailModalOpen,
    modalProblem,
    closeProblemModal,
    fetchOnlineProblem,
    openNewTab,
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => openNewTab()}
              className="flex items-center gap-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-primary)] px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm"
              title="不绑定题目，开一个空白标签页自由写代码"
            >
              <Code2 className="w-4 h-4 text-[var(--accent)]" />
              <span>自由练习</span>
            </button>
            <button
              onClick={() => setShowFetchDialog(true)}
              className="flex items-center gap-2 bg-[var(--accent)] hover:brightness-110 active:scale-95 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>获取在线题目</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and difficulty filter. The store has carried `searchQuery` /
          `selectedDifficulty` and the grid below has always filtered on them —
          only the inputs were missing, so both were unreachable. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索题号 / 标题 / 标签"
            aria-label="搜索题目"
            className="w-full h-8 pl-9 pr-3 rounded-lg border text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)] outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {DIFFICULTIES.map((d) => {
            const active = selectedDifficulty === d;
            return (
              <button
                key={d}
                onClick={() => setSelectedDifficulty(d)}
                aria-pressed={active}
                className="px-2.5 h-7 rounded-lg text-xs font-medium border transition-all cursor-pointer"
                style={{
                  borderColor: active ? 'var(--accent)' : 'var(--border)',
                  backgroundColor: active ? 'var(--accent-subtle)' : 'transparent',
                  color: active
                    ? 'var(--accent)'
                    : d === '全部'
                      ? 'var(--text-secondary)'
                      : difficultyColor(d),
                }}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Problems Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProblems.map((p) => {
          const diffColor = difficultyColor(p.difficulty);
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
                      boxShadow: `0 0 6px ${diffColor}`,
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
          {problems.length === 0 ? (
            <>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                本地题库还是空的
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                点击右上角「获取在线题目」按题号导入题面，或先「自由练习」写代码
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                未找到匹配的题目
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                换个关键词，或清除当前筛选条件
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDifficulty('全部');
                }}
                className="mt-3 px-3 h-7 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer"
              >
                清除筛选
              </button>
            </>
          )}
        </div>
      )}

      {/* Online Fetch Dialog */}
      <AnimatePresence>
        {showFetchDialog && (
          <motion.div
            {...modalShell(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              {...modalCard(false)}
              className="w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border)',
              }}
            >
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                一键导入在线题目
              </h2>
              <p className="text-xs text-[var(--text-tertiary)]">
                支持洛谷 / Codeforces / AtCoder：输入题号或完整链接，自动识别 OJ 并解析题面与样例。题面为空的题目（如 CF 反爬拦截）会附原题链接。
              </p>

              <input
                type="text"
                value={fetchInput}
                onChange={(e) => setFetchInput(e.target.value)}
                placeholder="例如: P1001 · CF1900A · abc300_a 或粘贴题目链接"
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
