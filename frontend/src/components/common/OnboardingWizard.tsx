import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../stores/useAppStore';
import { Check, ChevronRight, Moon, Sun, Key, Code2, Sparkles, Loader2, TerminalSquare } from 'lucide-react';
import type { ThemeType } from '../../types';

export const OnboardingWizard: React.FC = () => {
  const { settings, updateSettings } = useAppStore();
  const [step, setStep] = useState(0);

  // Local state for the wizard
  const [theme, setTheme] = useState<ThemeType>(settings.theme || 'OneDarkPro');
  const [enableTemplate, setEnableTemplate] = useState(settings.enableCodeTemplate || false);
  const [template, setTemplate] = useState(settings.codeTemplate || '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}');
  const [apiKey, setApiKey] = useState(settings.aiApiKey || '');
  const [preferTerminal, setPreferTerminal] = useState(false);
  const [saving, setSaving] = useState(false);

  const steps = [
    {
      title: '欢迎来到 Olympia IDE',
      subtitle: '一款专为 OIer 打造的纯净、高效的竞赛级编程环境。',
      icon: <Sparkles className="w-12 h-12 text-[var(--accent)] mb-4" />
    },
    {
      title: '选择主题风格',
      subtitle: '深色沉浸，或是浅色清新？'
    },
    {
      title: '配置缺省源',
      subtitle: '是否需要在每次新建文件时，自动为你填入代码模板？'
    },
    {
      title: '首选运行模式',
      subtitle: '你更喜欢经典的终端编译运行，还是内置的测例一键评测？'
    },
    {
      title: '配置 AI 教练',
      subtitle: '接入大模型 API，让 AI 随时为你答疑解惑、分析错题。'
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
        className="w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, type: 'spring', bounce: 0.2 }}
      >
        {/* Progress Bar */}
        <div className="w-full h-1 bg-[var(--bg-elevated)]">
          <motion.div 
            className="h-full bg-[var(--accent)]"
            initial={{ width: '0%' }}
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex-1 p-10 min-h-[400px] flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
              {/* Header */}
              <div className="text-center mb-8 flex flex-col items-center">
                {step === 0 && steps[0].icon}
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                  {steps[step].title}
                </h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  {steps[step].subtitle}
                </p>
              </div>

              {/* Step 0: Welcome */}
              {step === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] flex flex-col items-center text-center gap-2">
                      <Code2 className="w-6 h-6 text-[var(--accent)]" />
                      <h3 className="font-semibold text-sm">内置评测机</h3>
                      <p className="text-xs text-[var(--text-tertiary)]">毫秒级测试样例运行，抛弃繁琐的终端命令。</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] flex flex-col items-center text-center gap-2">
                      <Sparkles className="w-6 h-6 text-[#ff9f0a]" />
                      <h3 className="font-semibold text-sm">智能纠错</h3>
                      <p className="text-xs text-[var(--text-tertiary)]">大模型一键分析 WA/TLE 原因。</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Theme */}
              {step === 1 && (
                <div className="flex-1 flex items-center justify-center gap-6">
                  <button
                    onClick={() => setTheme('OneDarkPro')}
                    className={`flex-1 p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-4 ${
                      theme === 'OneDarkPro' 
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)]' 
                        : 'border-[var(--border)] bg-[var(--bg-elevated)] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Moon className="w-10 h-10" />
                    <span className="font-semibold">One Dark Pro</span>
                  </button>
                  <button
                    onClick={() => setTheme('GitHubLight')}
                    className={`flex-1 p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-4 ${
                      theme === 'GitHubLight' 
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)]' 
                        : 'border-[var(--border)] bg-[var(--bg-elevated)] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Sun className="w-10 h-10" />
                    <span className="font-semibold">GitHub Light</span>
                  </button>
                </div>
              )}

              {/* Step 2: Template */}
              {step === 2 && (
                <div className="flex-1 flex flex-col gap-4">
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 accent-[var(--accent)]"
                      checked={enableTemplate}
                      onChange={(e) => setEnableTemplate(e.target.checked)}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">启用代码缺省源 (Template)</span>
                      <span className="text-xs text-[var(--text-tertiary)]">开启后，每次新建文件自动填入下方代码。</span>
                    </div>
                  </label>

                  <AnimatePresence>
                    {enableTemplate && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex-1 min-h-0 flex flex-col overflow-hidden mt-4"
                      >
                        <textarea
                          value={template}
                          onChange={(e) => setTemplate(e.target.value)}
                          className="flex-1 w-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs p-4 rounded-xl border border-[var(--border)] resize-none focus:border-[var(--accent)] outline-none"
                          spellCheck={false}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Step 3: Run Mode */}
              {step === 3 && (
                <div className="flex-1 flex items-center justify-center gap-6">
                  <button
                    onClick={() => setPreferTerminal(false)}
                    className={`flex-1 p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-4 ${
                      !preferTerminal 
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)]' 
                        : 'border-[var(--border)] bg-[var(--bg-elevated)] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Code2 className="w-10 h-10 text-[var(--text-primary)]" />
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-semibold text-[var(--text-primary)]">样例优先 (默认)</span>
                      <span className="text-xs text-[var(--text-tertiary)] text-center">使用内置多测例评测机<br/>一键运行全部样例</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setPreferTerminal(true)}
                    className={`flex-1 p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-4 ${
                      preferTerminal 
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)]' 
                        : 'border-[var(--border)] bg-[var(--bg-elevated)] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <TerminalSquare className="w-10 h-10 text-[var(--text-primary)]" />
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-semibold text-[var(--text-primary)]">终端优先</span>
                      <span className="text-xs text-[var(--text-tertiary)] text-center">使用内置交互式终端<br/>手动编译和输入数据</span>
                    </div>
                  </button>
                </div>
              )}

              {/* Step 4: API Key */}
              {step === 4 && (
                <div className="flex-1 flex flex-col gap-4 justify-center">
                  <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-[var(--text-primary)] font-semibold">
                      <Key className="w-5 h-5 text-[var(--accent)]" />
                      <span>配置 API 密钥 (可选)</span>
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      默认配置为兼容 OpenAI 格式的 API 接口。如果暂无 Key，可以跳过，后续在“设置”中配置。
                    </p>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-all"
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
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-[var(--accent)]' : 'w-2 bg-[var(--border)]'}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={saving}
            className="flex items-center gap-2 bg-[var(--accent)] hover:brightness-110 active:scale-95 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-[var(--accent)]/20 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 保存中...</>
            ) : step === steps.length - 1 ? (
              <><Check className="w-4 h-4" /> 完成配置</>
            ) : (
              <>下一步 <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
