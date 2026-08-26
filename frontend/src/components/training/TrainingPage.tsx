import React from 'react';
import {
  Flame,
  CheckSquare,
  Code2,
  TrendingUp,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';

export const TrainingPage: React.FC = () => {
  const { solves, settings } = useAppStore();

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySolves = solves.filter((s) => s.solvedAt.startsWith(todayStr)).length;
  const totalSolves = solves.length;

  // 30 Days Trend Data
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().split('T')[0];
    const count = solves.filter((s) => s.solvedAt.startsWith(dateStr)).length;
    return {
      date: dateStr,
      label: dateStr.slice(5),
      count,
      isToday: i === 29,
    };
  });

  const maxVal = Math.max(1, ...last30Days.map((d) => d.count));
  const goal = settings.dailyGoal || 5;
  const progressPct = Math.min(100, Math.round((todaySolves / goal) * 100));

  return (
    <div className="w-full h-full flex flex-col p-6 overflow-y-auto select-none space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          训练中心
        </h1>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
          记录日常竞赛刷题沉淀、连续打卡天数与定制化集训清单
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Streak */}
        <div
          className="p-5 rounded-2xl border flex flex-col justify-between h-28"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#ff9f0a]/15 text-[#ff9f0a]">
              <Flame className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              连续打卡天数
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-[var(--text-primary)]">
              {todaySolves > 0 ? '1' : '0'}
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">天</span>
          </div>
        </div>

        {/* Today Solved */}
        <div
          className="p-5 rounded-2xl border flex flex-col justify-between h-28"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#34c759]/15 text-[#34c759]">
              <CheckSquare className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              今日已解决
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-[var(--text-primary)]">
              {todaySolves}
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">/ {goal} 题</span>
          </div>
        </div>

        {/* Total Solved */}
        <div
          className="p-5 rounded-2xl border flex flex-col justify-between h-28"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]">
              <Code2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              历史累计解决
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-[var(--text-primary)]">
              {totalSolves}
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">题</span>
          </div>
        </div>
      </div>

      {/* Daily Goal Progress Bar */}
      <div
        className="p-5 rounded-2xl border space-y-2.5"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-[var(--text-primary)]">今日做题目标进度</span>
          <span className="font-mono text-[var(--accent)]">
            {todaySolves} / {goal} 题 ({progressPct}%)
          </span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden bg-[var(--bg-elevated)]">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progressPct}%`,
              backgroundColor: 'var(--accent)',
            }}
          />
        </div>
      </div>

      {/* 30-Day SVG Bar Chart */}
      <div
        className="p-5 rounded-2xl border space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-xs font-bold text-[var(--text-primary)]">
              近 30 天做题趋势
            </span>
          </div>
          <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
            今日做题: {todaySolves} 题
          </span>
        </div>

        {/* Bar Chart Container */}
        <div className="h-36 flex items-end justify-between gap-1 pt-4 pb-1">
          {last30Days.map((item, idx) => {
            const heightPct = item.count === 0 ? 4 : Math.max(12, (item.count / maxVal) * 100);
            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
              >
                {/* Tooltip */}
                <div className="absolute -top-7 hidden group-hover:flex px-2 py-0.5 rounded bg-black/80 text-[10px] text-white font-mono whitespace-nowrap z-10">
                  {item.date}: {item.count} 题
                </div>

                <div
                  className={`w-full rounded-t-sm transition-all duration-200 group-hover:brightness-125 ${
                    item.isToday ? 'bg-[var(--accent)] shadow-sm' : 'bg-[var(--accent)]/40'
                  }`}
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor:
                      item.count === 0 ? 'var(--border)' : undefined,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
