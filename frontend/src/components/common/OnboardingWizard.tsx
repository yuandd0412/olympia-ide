import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../stores/useAppStore';
import { Check, ChevronRight, Moon, Sun, Key, Code2, Sparkles, Loader2, TerminalSquare, Swords, Flame, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { tauriApi, onToolchainProgress, type ToolchainStatus } from '../../services/tauriApi';
import type { ThemeType } from '../../types';

export const OnboardingWizard: React.FC = () => {
  const { settings, updateSettings } = useAppStore();
  const [step, setStep] = useState(0);

  // Local state for the wizard
  const [theme, setTheme] = useState<ThemeType>(settings.theme || 'OneDarkPro');
  const [enableTemplate, setEnableTemplate] = useState(settings.enableCodeTemplate || false);
  const [template, setTemplate] = useState(settings.codeTemplate || "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}");
  const [apiKey, setApiKey] = useState(settings.aiApiKey || '');
  const [preferTerminal, setPreferTerminal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Toolchain (compiler environment) step
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
      .then(setTc)
      .catch(() => setTc({ variant: 'none', gppPath: null, version: null }))
      .finally(() => setTcBusy(false));
  }, [step, tc, tcBusy]);

  const handleInstallToolchain = async () => {
    setTcBusy(true);
    setTcErr(null);
    setTcPct(0);
    setTcPhase('download');
    try {
      const s = await tauriApi.installToolchain();
      setTc(s);
      // Backend already persisted the path when it replaced the bare "g++";
      // mirror it into the in-memory store so wizard finish won't overwrite it.
      if (s.gppPath && (s.variant === 'appdata' || s.variant === 'bundled')) {
        await updateSettings({ compilerPath: s.gppPath });
      }
    } catch (e: any) {
      setTcErr(String(e?.message || e));
    } finally {
      setTcBusy(false);
    }
  };

  const steps = [
    {
      title: '欢迎来到 Olympia IDE',
      subtitle: '一款专为 OI / ACM 竞赛选手打造的纯净、高效的竞赛级编程环境。',
      icon: (
        <motion.div
          animate={{ y: [0, -6, 0], rotate: [0, 2, -2, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="relative mb-4"
        >
          <div className="absolute inset-0 bg-[var(--accent)] opacity-20 blur-xl rounded-full" />
          <div className="p-4 rounded-3xl bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/30 relative">
            <Sparkles className="w-10 h-10" />
          </div>
        </motion.div>
      )
    },
    {
      title: '配置编译环境',
      subtitle: 'Olympia IDE 需要 MinGW-w64 (G++) 工具链来编译与评测代码，检测缺失时可在本步一键安装。'
    },
    {
      title: '选择主题风格',
      subtitle: '深色沉浸专注，或是浅色清爽明快？'
    },
    {
      title: '配置缺省源',
      subtitle: '是否需要在每次新建文件时，自动为你填入代码模板？'
    },
    {
      title: '首选运行模式',
      subtitle: '你更喜欢内置的样例评测机，还是交互式内置终端？'
    },
    {
      title: '配置 AI 竞赛教练',
      subtitle: '接入大模型 API，让 AI 随时为你答疑解惑、分析时空复杂度与排查 Bug。'
    }
  ];

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      setSaving(true);
      await updateSettings({
        theme,
        enableCodeTemplate: enableTemplate,
        codeTemplate: template,
        aiApiKey: apiKey,
        preferTerminalRun: preferTerminal,
        isFirstRun: false, // Finish onboarding
      });
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-md flex items-center justify-center p-6" style={{ WebkitAppRegion: 'no-drag' } as any}>
      <motion.div
        layout
        className="w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      >
        {/* Progress Bar */}
        <div className="w-full h-1 bg-[var(--bg-elevated)]">
          <motion.div 
            className="h-full bg-[var(--accent)] shadow-sm"
            initial={{ width: '0%' }}
            animate={{ width: (((step + 1) / steps.length) * 100) + '%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>

        <div className="flex-1 p-10 min-h-[420px] flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="flex-1 flex flex-col"
            >
              {/* Header */}
              <div className="text-center mb-8 flex flex-col items-center">
                {step === 0 && steps[0].icon}
                <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
                  {steps[step].title}
                </h1>
                <p className="text-xs text-[var(--text-secondary)] max-w-md leading-relaxed">
                  {steps[step].subtitle}
                </p>
              </div>

              {/* Step 0: Welcome Feature Highlights */}
              {step === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-3.5 w-full">
                    <motion.div whileHover={{ y: -3 }} className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] flex flex-col items-center text-center gap-2 transition-all">
                      <div className="p-2 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]">
                        <Code2 className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-xs text-[var(--text-primary)]">内置极速评测</h3>
                      <p className="text-[11px] text-[var(--text-tertiary)] leading-normal">多样例毫秒级比对，自动输出差异 Diff。</p>
                    </motion.div>

                    <motion.div whileHover={{ y: -3 }} className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] flex flex-col items-center text-center gap-2 transition-all">
                      <div className="p-2 rounded-xl bg-[#ff9f0a]/15 text-[#ff9f0a]">
                        <Swords className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-xs text-[var(--text-primary)]">自动化对拍器</h3>
                      <p className="text-[11px] text-[var(--text-tertiary)] leading-normal">随机数据生成，极速比对暴力与正解。</p>
                    </motion.div>

                    <motion.div whileHover={{ y: -3 }} className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] flex flex-col items-center text-center gap-2 transition-all">
                      <div className="p-2 rounded-xl bg-[#34c759]/15 text-[#34c759]">
                        <Flame className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-xs text-[var(--text-primary)]">真实比赛模式</h3>
                      <p className="text-[11px] text-[var(--text-tertiary)] leading-normal">倒计时锁定 AI，沉浸式实战模拟。</p>
                    </motion.div>
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
                    <div className="w-full max-w-md p-5 rounded-2xl border border-[#34c759]/30 bg-[#34c759]/10 flex flex-col items-center gap-2 text-center">
                      <div className="p-2 rounded-xl bg-[#34c759]/15 text-[#34c759]"><CheckCircle2 className="w-6 h-6" /></div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">编译环境已就绪</p>
                      {tc.version && <p className="text-[11px] font-mono text-[var(--text-secondary)]">{tc.version}</p>}
                      {tc.gppPath && <p className="text-[10px] font-mono text-[var(--text-tertiary)] break-all">{tc.gppPath}</p>}
                    </div>
                  )}

                  {tc && tc.variant === 'none' && (
                    <div className="w-full max-w-md p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] flex flex-col items-center gap-3 text-center">
                      <div className="p-2 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]"><Download className="w-6 h-6" /></div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        未检测到可用的 G++ 工具链。可自动下载 <span className="font-mono font-semibold text-[var(--text-primary)]">MinGW 13.1.0</span>（约 69 MB，国内镜像直连），安装到用户目录并自动完成配置。
                      </p>
                      {tcBusy ? (
                        <div className="w-full flex flex-col gap-2">
                          <div className="w-full h-1.5 rounded-full bg-[var(--bg-base)] overflow-hidden">
                            <div
                              className={'h-full rounded-full transition-all ' + (tcPhase === 'download' ? 'bg-[var(--accent)]' : 'bg-[#ff9f0a]')}
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
                          className="flex items-center gap-2 bg-[var(--accent)] hover:brightness-110 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-[var(--accent)]/20"
                        >
                          <Download className="w-3.5 h-3.5" /> 自动下载并安装
                        </button>
                      )}
                      <p className="text-[10px] text-[var(--text-tertiary)]">也可以跳过此步，稍后在「偏好设置」中手动指定编译器路径。</p>
                    </div>
                  )}

                  {tcErr && (
                    <div className="w-full max-w-md p-3 rounded-xl border border-[#ff453a]/30 bg-[#ff453a]/10 flex items-center gap-2 text-[11px] text-[#ff453a]">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left break-all">{tcErr}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Theme Selector */}
              {step === 2 && (
                <div className="flex-1 flex items-center justify-center gap-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setTheme('OneDarkPro')}
                    className={'flex-1 p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3.5 cursor-pointer ' + (theme === 'OneDarkPro' ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md ring-2 ring-[var(--accent)]/30' : 'border-[var(--border)] bg-[var(--bg-elevated)] opacity-70 hover:opacity-100')}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#1e1e1e] border border-[#333] flex items-center justify-center text-[#7aa2f7]">
                      <Moon className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <span className="font-bold text-xs text-[var(--text-primary)] block">One Dark Pro</span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block mt-0.5">深色护眼，高对比代码高亮</span>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setTheme('GitHubLight')}
                    className={'flex-1 p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3.5 cursor-pointer ' + (theme === 'GitHubLight' ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md ring-2 ring-[var(--accent)]/30' : 'border-[var(--border)] bg-[var(--bg-elevated)] opacity-70 hover:opacity-100')}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white border border-[#e1e4e8] flex items-center justify-center text-[#e5a43b]">
                      <Sun className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <span className="font-bold text-xs text-[var(--text-primary)] block">GitHub Light</span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block mt-0.5">清爽浅色，极简纯净排版</span>
                    </div>
                  </motion.button>
                </div>
              )}

              {/* Step 3: Code Template */}
              {step === 2 && (
                <div className="flex-1 flex flex-col gap-4">
                  <label className="flex items-center gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] cursor-pointer select-none">
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
                  </label>

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

              {/* Step 4: Run Mode */}
              {step === 3 && (
                <div className="flex-1 flex items-center justify-center gap-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPreferTerminal(false)}
                    className={'flex-1 p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3.5 cursor-pointer ' + (!preferTerminal ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md ring-2 ring-[var(--accent)]/30' : 'border-[var(--border)] bg-[var(--bg-elevated)] opacity-70 hover:opacity-100')}
                  >
                    <div className="p-3 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)]">
                      <Code2 className="w-8 h-8" />
                    </div>
                    <div className="flex flex-col items-center text-center gap-1">
                      <span className="font-bold text-xs text-[var(--text-primary)]">样例优先 (推荐)</span>
                      <span className="text-[11px] text-[var(--text-tertiary)]">使用内置多测例评测机<br/>一键运行与比对全部样例</span>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPreferTerminal(true)}
                    className={'flex-1 p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3.5 cursor-pointer ' + (preferTerminal ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md ring-2 ring-[var(--accent)]/30' : 'border-[var(--border)] bg-[var(--bg-elevated)] opacity-70 hover:opacity-100')}
                  >
                    <div className="p-3 rounded-2xl bg-[#ff9f0a]/15 text-[#ff9f0a]">
                      <TerminalSquare className="w-8 h-8" />
                    </div>
                    <div className="flex flex-col items-center text-center gap-1">
                      <span className="font-bold text-xs text-[var(--text-primary)]">终端优先</span>
                      <span className="text-[11px] text-[var(--text-tertiary)]">点击运行自动弹出 CMD 窗口<br/>交互式输入输出 (Dev-C++ 风格)</span>
                    </div>
                  </motion.button>
                </div>
              )}

              {/* Step 5: API Key */}
              {step === 4 && (
                <div className="flex-1 flex flex-col gap-4 justify-center">
                  <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] flex flex-col gap-3.5">
                    <div className="flex items-center gap-2.5 text-[var(--text-primary)] font-semibold text-xs">
                      <Key className="w-4 h-4 text-[var(--accent)]" />
                      <span>配置 AI API 密钥 (可选)</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                      支持 DeepSeek / OpenAI 等兼容接口。若暂无密钥可直接跳过，稍后在「偏好设置」中配置。
                    </p>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs font-mono focus:border-[var(--accent)] outline-none transition-all text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-0 flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <motion.div 
                key={i} 
                layout
                className={'h-1.5 rounded-full transition-all duration-300 ' + (i === step ? 'w-6 bg-[var(--accent)] shadow-xs' : 'w-2 bg-[var(--border)]')}
              />
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
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
      </motion.div>
    </div>
  );
};
