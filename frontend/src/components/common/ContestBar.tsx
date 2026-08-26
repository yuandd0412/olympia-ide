import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, LogOut, ShieldAlert } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';

export const ContestBar: React.FC = () => {
  const { contestEndTime, setContestEndTime, tabs } = useAppStore();
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    if (!contestEndTime) {
      setTimeLeftMs(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, contestEndTime - Date.now());
      setTimeLeftMs(remaining);
      if (remaining <= 0) {
        setContestEndTime(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [contestEndTime, setContestEndTime]);

  if (!contestEndTime || timeLeftMs <= 0) return null;

  const hours = Math.floor(timeLeftMs / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);

  const formatNum = (n: number) => n.toString().padStart(2, '0');
  const isUrgent = timeLeftMs < 15 * 60 * 1000; // < 15 mins

  return (
    <>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full border-b shrink-0 px-4 py-1.5 flex items-center justify-between text-xs select-none z-30 shadow-sm"
        style={{
          backgroundColor: isUrgent ? 'rgba(255, 69, 58, 0.12)' : 'rgba(255, 159, 10, 0.08)',
          borderColor: isUrgent ? 'rgba(255, 69, 58, 0.35)' : 'rgba(255, 159, 10, 0.25)',
        }}
      >
        {/* Left: Badge & Live Status */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[11px] shadow-xs text-white"
            style={{ backgroundColor: isUrgent ? '#ff453a' : '#ff9f0a' }}
          >
            <Trophy className="w-3 h-3" />
            <span>比赛模式进行中</span>
          </div>

          <span className="text-[11px] text-[var(--text-secondary)] hidden md:inline">
            NOIP / CSP 实战模拟 · AI 助手已禁用
          </span>
        </div>

        {/* Center: High-contrast Countdown Timer */}
        <div className="flex items-center gap-2">
          <Clock className={'w-3.5 h-3.5 ' + (isUrgent ? 'text-[#ff453a] animate-pulse' : 'text-[#ff9f0a]')} />
          <span className="text-[11px] font-medium text-[var(--text-tertiary)]">剩余时间:</span>
          <div className="flex items-center gap-1 font-mono font-bold text-sm tracking-wider">
            <span
              className="px-1.5 py-0.5 rounded border"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: isUrgent ? 'rgba(255, 69, 58, 0.4)' : 'var(--border)',
                color: isUrgent ? '#ff453a' : 'var(--text-primary)',
              }}
            >
              {formatNum(hours)}
            </span>
            <span className="text-[var(--text-tertiary)]">:</span>
            <span
              className="px-1.5 py-0.5 rounded border"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: isUrgent ? 'rgba(255, 69, 58, 0.4)' : 'var(--border)',
                color: isUrgent ? '#ff453a' : 'var(--text-primary)',
              }}
            >
              {formatNum(minutes)}
            </span>
            <span className="text-[var(--text-tertiary)]">:</span>
            <span
              className="px-1.5 py-0.5 rounded border"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: isUrgent ? 'rgba(255, 69, 58, 0.4)' : 'var(--border)',
                color: isUrgent ? '#ff453a' : 'var(--text-primary)',
              }}
            >
              {formatNum(seconds)}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-[#ff453a] hover:bg-[#ff453a]/15 transition-all cursor-pointer border border-[#ff453a]/30"
          >
            <LogOut className="w-3 h-3" />
            <span>提前交卷 / 退出</span>
          </button>
        </div>
      </motion.div>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-[10001] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="w-full max-w-sm p-6 rounded-2xl border bg-[var(--bg-surface)] border-[var(--border)] shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-[#ff453a]">
                <div className="p-2 rounded-xl bg-[#ff453a]/15">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">确认结束比赛？</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">提前结束将恢复所有 AI 助手功能。</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-xs text-[var(--text-secondary)] space-y-1.5">
                <div className="flex justify-between">
                  <span>当前倒计时:</span>
                  <span className="font-mono font-bold">{formatNum(hours)}:{formatNum(minutes)}:{formatNum(seconds)}</span>
                </div>
                <div className="flex justify-between">
                  <span>代码标签页:</span>
                  <span className="font-mono">{tabs.length} 个</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] cursor-pointer"
                >
                  继续比赛
                </button>
                <button
                  onClick={() => {
                    setContestEndTime(null);
                    setShowExitConfirm(false);
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#ff453a] hover:brightness-110 text-white cursor-pointer shadow-xs"
                >
                  确认交卷退出
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
