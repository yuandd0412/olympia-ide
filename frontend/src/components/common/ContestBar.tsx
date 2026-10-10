import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Trophy, Clock, LogOut, ShieldAlert } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { EASE_MODAL, modalCard, modalShell } from '../../ports/motion';
import { OButton, OCard, O_CARD_FRAME } from '../../lib/design';
import { bg, fg, line, tint, verdict } from '../../lib/design';

export const ContestBar: React.FC = () => {
  const { contestEndTime, setContestEndTime, tabs } = useAppStore();
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const reduce = useReducedMotion();

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

  const digitBoxStyle = {
    backgroundColor: bg.elevated,
    borderColor: isUrgent ? tint.waLineStrong : line.border,
    color: isUrgent ? verdict.wa : fg.primary,
  };

  return (
    <>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.18, ease: EASE_MODAL }}
        className="w-full border-b shrink-0 px-4 py-1.5 flex items-center justify-between text-xs select-none z-30 shadow-sm"
        style={{
          backgroundColor: isUrgent ? tint.waSoft : tint.tleSoft,
          borderColor: isUrgent ? tint.waLine : tint.tleLine,
        }}
      >
        {/* Left: Badge & Live Status */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[11px] shadow-xs text-white"
            style={{ backgroundColor: isUrgent ? verdict.wa : verdict.tle }}
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
          <Clock
            className={'w-3.5 h-3.5 ' + (isUrgent ? 'text-[var(--color-wa)] animate-pulse' : 'text-[var(--color-tle)]')}
          />
          <span className="text-[11px] text-[var(--text-tertiary)]">剩余时间:</span>
          <div className="flex items-center gap-1 font-mono font-bold text-sm tracking-wider">
            <span className="px-1.5 py-0.5 rounded border" style={digitBoxStyle}>
              {formatNum(hours)}
            </span>
            <span className="text-[var(--text-tertiary)]">:</span>
            <span className="px-1.5 py-0.5 rounded border" style={digitBoxStyle}>
              {formatNum(minutes)}
            </span>
            <span className="text-[var(--text-tertiary)]">:</span>
            <span className="px-1.5 py-0.5 rounded border" style={digitBoxStyle}>
              {formatNum(seconds)}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <OButton
            variant="dangerOutline"
            size="sm"
            onClick={() => setShowExitConfirm(true)}
          >
            <LogOut className="w-3 h-3" />
            <span>提前交卷 / 退出</span>
          </OButton>
        </div>
      </motion.div>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            {...modalShell(!!reduce)}
            className="fixed inset-0 z-[10001] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              {...modalCard(!!reduce)}
              className={`w-full max-w-sm p-6 shadow-2xl space-y-4 ${O_CARD_FRAME} bg-[var(--bg-surface)]`}
            >
              <div className="flex items-center gap-3 text-[var(--color-wa)]">
                <div className="p-2 rounded-xl" style={{ backgroundColor: tint.waHover }}>
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">确认结束比赛？</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">提前结束将恢复所有 AI 助手功能。</p>
                </div>
              </div>

              <OCard tone="elevated" className="p-3 text-xs text-[var(--text-secondary)] space-y-1.5">
                <div className="flex justify-between">
                  <span>当前倒计时:</span>
                  <span className="font-mono font-bold">{formatNum(hours)}:{formatNum(minutes)}:{formatNum(seconds)}</span>
                </div>
                <div className="flex justify-between">
                  <span>代码标签页:</span>
                  <span className="font-mono">{tabs.length} 个</span>
                </div>
              </OCard>

              <div className="flex items-center justify-end gap-2 pt-2">
                <OButton variant="outline" size="md" onClick={() => setShowExitConfirm(false)}>
                  继续比赛
                </OButton>
                <OButton
                  variant="danger"
                  size="md"
                  onClick={() => {
                    setContestEndTime(null);
                    setShowExitConfirm(false);
                  }}
                >
                  确认交卷退出
                </OButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
