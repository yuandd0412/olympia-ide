import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAppStore } from '../../stores/useAppStore';
import { Check, ChevronRight, ChevronLeft, Moon, Sun, Key, Code2, Sparkles, Loader2, Swords, Flame, Download, CheckCircle2, AlertTriangle, ListOrdered, Rocket } from 'lucide-react';
import { tauriApi, onToolchainProgress, type ToolchainStatus } from '../../services/tauriApi';
import type { ThemeType } from '../../types';
import { fadeItem, EASE_OUT } from '../../lib/motion';

type StepMeta = {
  title: string;
  subtitle: string;
  badge: string;
  icon?: React.ReactNode;
};

/** ShortestPath-style guided setup: progress dots, staggered fade-in,
 *  slide page transitions, agenda on welcome, summary on finish. */
export const OnboardingWizard: React.FC = () => {
  const { settings, updateSettings } = useAppStore();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  const [theme, setTheme] = useState<ThemeType>(settings.theme || 'OneDarkPro');
  const [enableTemplate, setEnableTemplate] = useState(settings.enableCodeTemplate || false);
  const [template, setTemplate] = useState(settings.codeTemplate || "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}");
  const [apiKey, setApiKey] = useState(settings.aiApiKey || '');
  const [baseUrl, setBaseUrl] = useState(settings.aiBaseUrl || 'https://api.deepseek.com/v1');
  const [model, setModel] = useState(settings.aiModel || 'gpt-4o-mini');
  const [saving, setSaving] = useState(false);

  const TC_STEP = 1;
  const [tc, setTc] = useState<ToolchainStatus | null>(null);
  const [tcBusy, setTcBusy] = useState(false);
  const [tcPhase, setTcPhase] = useState<'idle' | 'download' | 'verify' | 'extract'>('idle');
  const [tcPct, setTcPct] = useState(0);
  const [tcErr, setTcErr] = useState<string | null>(null);

  useEffect(() => {
    const un = onToolchainProgress((p) => {
      setTcPhase(p.phase);
      if (p.phase === 'download' && p.total) {
        setTcPct(Math.min(100, Math.round((p.downloaded * 100) / p.total)));
      }
    });
    return () => { un.then((f) => f()); };
  }, []);

  useEffect(() => {
    if (step !== TC_STEP || tc || tcBusy) return;
    setTcBusy(true);
    tauriApi.detectToolchain()
      .then((s) => {
        setTc(s);
        // 检测到内置/已安装工具链时同步写入设置：否则 compilerPath 仍是裸默认
        // "g++"，在 PATH 上没有 g++ 的新设备上每次编译都会失败（编译异常）。
        if (
          s.gppPath &&
          (s.variant === 'appdata' || s.variant === 'bundled') &&
          (settings.compilerPath === 'g++' || !settings.compilerPath)
        ) {
          void updateSettings({ compilerPath: s.gppPath });
        }
      })
      .catch(() => setTc({ variant: 'none', gppPath: null, version: null }))
      .finally(() => setTcBusy(false));
  }, [step, tc, tcBusy, settings.compilerPath, updateSettings]);

  const handleInstallToolchain = async () => {
    setTcBusy(true);
    setTcErr(null);
    setTcPct(0);
    setTcPhase('download');
    try {
      const s = await tauriApi.installToolchain();
      setTc(s);
      if (s.gppPath && (s.variant === 'appdata' || s.variant === 'bundled')) {
        await updateSettings({ compilerPath: s.gppPath });
      }
    } catch (e: any) {
      setTcErr(String(e?.message || e));
    } finally {
      setTcBusy(false);
    }
  };

  const steps: StepMeta[] = [
    {
      title: '欢迎来到 Olympia',
      subtitle: '几步配置好竞赛环境。所有改动实时生效，随时可返回调整。',
      badge: '开始',
      icon: (
        <motion.div
          animate={reduce ? undefined : { y: [0, -6, 0], rotate: [0, 2, -2, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="relative mb-3"
        >
          <div className="absolute inset-0 bg-[var(--accent)] opacity-20 blur-xl rounded-full" />
          <div className="p-4 rounded-3xl bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/30 relative">
            <Sparkles className="w-10 h-10" />
          </div>
        </motion.div>
      ),
    },
    {
      title: '编译环境',
      subtitle: '检测 MinGW-w64 (G++)；缺失时可一键下载内置工具链。',
      badge: '工具链',
    },
    {
      title: '界面主题',
      subtitle: '深色沉浸专注，或浅色清爽明快？选择后立即生效。',
      badge: '主题',
    },
    {
      title: '代码模板',
      subtitle: '新建文件时自动填入常用竞赛代码骨架。',
      badge: '模板',
    },
    {
      title: 'AI 竞赛教练',
      subtitle: '接入大模型 API（含本机 Ollama），答疑与复杂度分析。',
      badge: 'AI',
    },
    {
      title: '全部就绪',
      subtitle: '偏好已保存。下面是你的配置摘要。',
      badge: '完成',
    },
  ];

  const agenda = ['编译环境', '界面主题', '代码模板', 'AI 地址 / Key / 模型'];

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
      return;
    }
    setSaving(true);
    await updateSettings({
      theme,
      enableCodeTemplate: enableTemplate,
      codeTemplate: template,
      aiBaseUrl: baseUrl,
      aiApiKey: apiKey,
      aiModel: model,
      preferTerminalRun: false,
      isFirstRun: false,
    });
    setSaving(false);
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  // Walking all six steps used to be the only way out: closing the app mid-wizard replayed it from
  // step one on every launch. Memoised so the Escape listener below subscribes once.
  const handleSkip = useCallback(async () => {
    setSaving(true);
    await updateSettings({ isFirstRun: false });
    setSaving(false);
  }, [updateSettings]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void handleSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSkip]);

  const fade = (i: number) => fadeItem(i, !!reduce);

  const fillOllama = () => {
    setBaseUrl('http://127.0.0.1:11434/v1');
    setApiKey((k) => (k.trim() ? k : 'ollama'));
  };

  const fillCloud = (url: string) => {
    setBaseUrl(url);
    setApiKey((k) => (k.trim() === 'ollama' ? '' : k));
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-md flex items-center justify-center p-6" style={{ WebkitAppRegion: 'no-drag' } as any}>
      <motion.div
        layout
        className="w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 28 }}
      >
        {/* Top progress track */}
        <div className="w-full h-1 bg-[var(--bg-elevated)]">
          <motion.div
            className="h-full bg-[var(--accent)] shadow-sm"
            initial={{ width: '0%' }}
            animate={{ width: (((step + 1) / steps.length) * 100) + '%' }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>

        <div className="flex-1 p-10 min-h-[460px] flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: reduce ? 0 : 36 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduce ? 0 : -36 }}
              transition={{ duration: reduce ? 0 : 0.32, ease: EASE_OUT }}
              className="flex-1 flex flex-col"
            >
              {/* Header: badge + title + lead (ShortestPath page-head) */}
              <div className="text-center mb-7 flex flex-col items-center">
                <motion.span
                  {...fade(0)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[10px] font-bold tracking-wide text-[var(--text-tertiary)] uppercase mb-3"
                >
                  {step + 1} / {steps.length} · {steps[step].badge}
                </motion.span>
                {step === 0 && steps[0].icon}
                <motion.h1 {...fade(1)} className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
                  {steps[step].title}
                </motion.h1>
                <motion.p {...fade(2)} className="text-xs text-[var(--text-secondary)] max-w-md leading-relaxed">
                  {steps[step].subtitle}
                </motion.p>
              </div>

              {/* Step 0: Welcome + numbered agenda (SP ①②③ list) */}
              {step === 0 && (
                <div className="flex-1 flex flex-col gap-5">
                  <div className="grid grid-cols-3 gap-3.5 w-full">
                    {[
                      { icon: <Code2 className="w-5 h-5" />, color: 'var(--accent)', sub: 'bg-[var(--accent-subtle)]', title: '内置极速评测', desc: '多样例毫秒级比对，逐个标出 AC / WA / MLE / TLE / RE。' },
                      { icon: <Swords className="w-5 h-5" />, color: '#ff9f0a', sub: 'bg-[#ff9f0a]/15', title: '自动化对拍', desc: '随机数据生成，极速比对暴力与正解。' },
                      { icon: <Flame className="w-5 h-5" />, color: '#34c759', sub: 'bg-[#34c759]/15', title: '真实比赛模式', desc: '倒计时锁定 AI，沉浸式实战模拟。' },
                    ].map((f, i) => (
                      <motion.div
                        key={f.title}
                        {...fade(3 + i)}
                        whileHover={reduce ? undefined : { y: -3 }}
                        className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] flex flex-col items-center text-center gap-2"
                      >
                        <div className={`p-2 rounded-xl ${f.sub}`} style={{ color: f.color }}>{f.icon}</div>
                        <h3 className="font-semibold text-xs text-[var(--text-primary)]">{f.title}</h3>
                        <p className="text-[11px] text-[var(--text-tertiary)] leading-normal">{f.desc}</p>
                      </motion.div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                    <motion.div {...fade(6)} className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] mb-2.5">
                      <ListOrdered className="w-4 h-4 text-[var(--accent)]" />
                      <span>接下来你将依次配置</span>
                    </motion.div>
                    <ul className="space-y-1.5">
                      {agenda.map((item, i) => (
                        <motion.li
                          key={item}
                          {...fade(7 + i)}
                          className="flex items-center gap-2.5 text-[12px] text-[var(--text-secondary)]"
                        >
                          <span className="w-5 h-5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] text-[10px] font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          {item}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Step 1: Toolchain */}
              {step === 1 && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  {tcBusy && !tc && tcPhase === 'idle' && (
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                      <span>正在检测编译环境...</span>
                    </div>
                  )}

                  {tc && tc.variant !== 'none' && (
                    <motion.div
                      {...fade(0)}
                      className="w-full max-w-md p-5 rounded-2xl border border-[#34c759]/30 bg-[#34c759]/10 flex flex-col items-center gap-2 text-center"
                    >
                      <div className="p-2 rounded-xl bg-[#34c759]/15 text-[#34c759]"><CheckCircle2 className="w-6 h-6" /></div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">编译环境已就绪</p>
                      {tc.version && <p className="text-[11px] font-mono text-[var(--text-secondary)]">{tc.version}</p>}
                      {tc.gppPath && <p className="text-[10px] font-mono text-[var(--text-tertiary)] break-all">{tc.gppPath}</p>}
                    </motion.div>
                  )}

                  {tc && tc.variant === 'none' && (
                    <motion.div {...fade(0)} className="w-full max-w-md p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] flex flex-col gap-3 text-center">
                      <div className="p-2 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] mx-auto"><Download className="w-6 h-6" /></div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        未检测到 G++。可自动下载 <span className="font-mono font-semibold text-[var(--text-primary)]">MinGW 13.1.0</span>（约 69 MB，国内镜像），安装到用户目录并完成配置。
                      </p>
                      {tcBusy ? (
                        <div className="w-full flex flex-col gap-2">
                          <div className="w-full h-1.5 rounded-full bg-[var(--bg-base)] overflow-hidden">
                            <div
                              className={'h-full rounded-full transition-all duration-300 ' + (tcPhase === 'download' ? 'bg-[var(--accent)]' : 'bg-[#ff9f0a]')}
                              style={{ width: tcPhase === 'download' ? `${Math.max(4, tcPct)}%` : '100%', opacity: tcPhase === 'download' ? 1 : 0.5 }}
                            />
                          </div>
                          <p className="text-[11px] text-[var(--text-tertiary)] font-mono">
                            {tcPhase === 'download' && `下载中 ${tcPct}%`}
                            {tcPhase === 'verify' && '校验完整性 (sha256)...'}
                            {tcPhase === 'extract' && '解压工具链...'}
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={handleInstallToolchain}
                          className="flex items-center justify-center gap-2 bg-[var(--accent)] hover:brightness-110 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-[var(--accent)]/20 mx-auto"
                        >
                          <Download className="w-3.5 h-3.5" /> 自动下载并安装
                        </button>
                      )}
                      <p className="text-[10px] text-[var(--text-tertiary)]">也可跳过，稍后在设置中手动指定编译器。</p>
                    </motion.div>
                  )}

                  {tcErr && (
                    <div className="w-full max-w-md p-3 rounded-xl border border-[#ff453a]/30 bg-[#ff453a]/10 flex items-center gap-2 text-[11px] text-[#ff453a]">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left break-all">{tcErr}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Theme */}
              {step === 2 && (
                <div className="flex-1 flex items-center justify-center gap-6">
                  <motion.button
                    whileHover={reduce ? undefined : { scale: 1.02 }}
                    whileTap={reduce ? undefined : { scale: 0.98 }}
                    onClick={() => { setTheme('OneDarkPro'); updateSettings({ theme: 'OneDarkPro' }); }}
                    className={'flex-1 p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3.5 cursor-pointer ' + (theme === 'OneDarkPro' ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md ring-2 ring-[var(--accent)]/30' : 'border-[var(--border)] bg-[var(--bg-elevated)] opacity-70 hover:opacity-100')}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#1e1e1e] border border-[#333] flex items-center justify-center text-[#7aa2f7]">
                      <Moon className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <span className="font-bold text-xs text-[var(--text-primary)] block">One Dark Pro</span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block mt-0.5">深色护眼，高对比高亮</span>
                    </div>
                  </motion.button>
                  <motion.button
                    whileHover={reduce ? undefined : { scale: 1.02 }}
                    whileTap={reduce ? undefined : { scale: 0.98 }}
                    onClick={() => { setTheme('GitHubLight'); updateSettings({ theme: 'GitHubLight' }); }}
                    className={'flex-1 p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3.5 cursor-pointer ' + (theme === 'GitHubLight' ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md ring-2 ring-[var(--accent)]/30' : 'border-[var(--border)] bg-[var(--bg-elevated)] opacity-70 hover:opacity-100')}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white border border-[#e1e4e8] flex items-center justify-center text-[#e5a43b]">
                      <Sun className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <span className="font-bold text-xs text-[var(--text-primary)] block">GitHub Light</span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block mt-0.5">清爽浅色，极简排版</span>
                    </div>
                  </motion.button>
                </div>
              )}

              {/* Step 3: Template */}
              {step === 3 && (
                <div className="flex-1 flex flex-col gap-4">
                  <motion.label {...fade(0)} className="flex items-center gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-[var(--accent)] rounded cursor-pointer"
                      checked={enableTemplate}
                      onChange={(e) => setEnableTemplate(e.target.checked)}
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">启用代码缺省源 (Template)</span>
                      <span className="text-[11px] text-[var(--text-tertiary)]">开启后，每次新建文件自动填入下方代码。</span>
                    </div>
                  </motion.label>
                  <AnimatePresence>
                    {enableTemplate && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex-1 min-h-0 flex flex-col overflow-hidden"
                      >
                        <textarea
                          value={template}
                          onChange={(e) => setTemplate(e.target.value)}
                          className="w-full h-40 bg-[var(--bg-base)] text-[var(--text-primary)] font-mono text-xs p-4 rounded-2xl border border-[var(--border)] resize-none focus:border-[var(--accent)] outline-none"
                          spellCheck={false}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Step 4: AI — base URL + key + model (parity with Settings) */}
              {step === 4 && (
                <div className="flex-1 flex flex-col gap-3 justify-center">
                  <motion.div {...fade(0)} className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 text-[var(--text-primary)] font-semibold text-xs">
                        <Key className="w-4 h-4 text-[var(--accent)]" />
                        <span>AI 竞赛教练（可选）</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={fillOllama}
                          className={
                            'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ' +
                            (baseUrl.includes('11434')
                              ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                              : 'border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]')
                          }
                        >
                          本机
                        </button>
                        <button
                          type="button"
                          onClick={() => fillCloud('https://api.deepseek.com/v1')}
                          className={
                            'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ' +
                            (!baseUrl.includes('11434')
                              ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                              : 'border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]')
                          }
                        >
                          云端
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                      在 <b>本机 Ollama</b> 与 <b>云端</b> 之间一键切换；手动改地址/Key/模型均可。
                    </p>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">API 地址</span>
                      <input
                        type="text"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="https://api.deepseek.com/v1 或 http://127.0.0.1:11434/v1"
                        className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs font-mono focus:border-[var(--accent)] outline-none transition-all text-[var(--text-primary)]"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">API Key</span>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-... 或 ollama"
                        className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs font-mono focus:border-[var(--accent)] outline-none transition-all text-[var(--text-primary)]"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">模型</span>
                      <input
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="deepseek-chat / gemma4:12b"
                        className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs font-mono focus:border-[var(--accent)] outline-none transition-all text-[var(--text-primary)]"
                      />
                    </label>
                  </motion.div>
                </div>
              )}

              {/* Step 5: Summary (SP completion page) */}
              {step === 5 && (
                <div className="flex-1 flex flex-col gap-4">
                  <motion.div {...fade(0)} className="flex items-center gap-3 p-4 rounded-2xl border border-[#34c759]/30 bg-[#34c759]/10">
                    <div className="p-2 rounded-xl bg-[#34c759]/15 text-[#34c759]"><Rocket className="w-5 h-5" /></div>
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">全部就绪 🎉</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">偏好已保存并生效，可随时在设置中重新打开本向导。</p>
                    </div>
                  </motion.div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] divide-y divide-[var(--border)]">
                    {[
                      ['主题', theme === 'OneDarkPro' ? 'One Dark Pro' : 'GitHub Light'],
                      ['工具链', tc && tc.variant !== 'none' ? (tc.version || '已就绪') : '稍后配置'],
                      ['代码模板', enableTemplate ? '已启用' : '关闭'],
                      ['AI 地址', baseUrl.trim() ? baseUrl : '未配置'],
                      ['AI 模型', model.trim() ? model : '未配置'],
                      ['AI Key', apiKey.trim() ? '已配置' : '未配置（可跳过）'],
                    ].map(([label, value], i) => (
                      <motion.div key={label} {...fade(1 + i)} className="flex items-center justify-between px-4 py-3 text-xs">
                        <span className="text-[var(--text-secondary)]">{label}</span>
                        <span className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                          <Check className="w-3.5 h-3.5 text-[#34c759]" />
                          {value}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer: progress dots + nav (ShortestPath .progress .dot) */}
        <div className="p-6 pt-0 flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2" aria-label="步骤">
            {steps.map((s, i) => (
              <motion.button
                key={s.badge}
                type="button"
                aria-label={`${i + 1} ${s.badge}`}
                onClick={() => i < step && setStep(i)}
                animate={{
                  scale: i === step ? 1.25 : 1,
                }}
                transition={{ duration: reduce ? 0 : 0.32, ease: EASE_OUT }}
                className={
                  'w-2 h-2 rounded-full transition-colors duration-300 ' +
                  (i === step
                    ? 'bg-[var(--accent)]'
                    : i < step
                      ? 'bg-[var(--accent)]/45 cursor-pointer'
                      : 'bg-[#2c3550]')
                }
              />
            ))}
            <span className="ml-2 text-[10px] font-mono text-[var(--text-tertiary)] tabular-nums">
              {step + 1}/{steps.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {step < steps.length - 1 && (
              <button
                type="button"
                onClick={() => void handleSkip()}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                跳过向导
              </button>
            )}
            {step > 0 && (
              <motion.button
                whileHover={reduce ? undefined : { scale: 1.03 }}
                whileTap={reduce ? undefined : { scale: 0.97 }}
                onClick={handleBack}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/40 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> 上一步
              </motion.button>
            )}
            <motion.button
              whileHover={reduce ? undefined : { scale: 1.03 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              onClick={handleNext}
              disabled={saving}
              className="flex items-center gap-2 bg-[var(--accent)] hover:brightness-110 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-[var(--accent)]/20 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 保存中...</>
              ) : step === steps.length - 1 ? (
                <><Check className="w-4 h-4" /> 开启体验</>
              ) : (
                <>下一步 <ChevronRight className="w-4 h-4" /></>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
