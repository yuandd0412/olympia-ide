import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  Palette,
  Terminal,
  Sparkles,
  Sliders,
  Check,
  Save,
  Info,
  Moon,
  Sun,
  Code2,
  Trophy,
  Flame,
  Clock,
  LogOut,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import type { AppSettings, ThemeType } from '../../types';

const THEMES: Array<{
  id: ThemeType;
  name: string;
  desc: string;
  accent: string;
  previewBg: string;
  previewFg: string;
  isLight: boolean;
}> = [
  {
    id: 'OneDarkPro',
    name: 'One Dark Pro',
    desc: '经典 VS Code / Atom 深色，高对比度代码高亮，低疲劳护眼',
    accent: '#007acc',
    previewBg: '#1e1e1e',
    previewFg: '#cccccc',
    isLight: false,
  },
  {
    id: 'GitHubLight',
    name: 'GitHub Light',
    desc: '清爽白皙日光浅色，苹果与 GitHub 极简排版，清晰明了',
    accent: '#0969da',
    previewBg: '#ffffff',
    previewFg: '#1f2328',
    isLight: true,
  },
];

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, contestEndTime, setContestEndTime } = useAppStore();

  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  // Keep local form in sync with global store changes
  React.useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSave = async () => {
    await updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSelectTheme = async (theme: ThemeType) => {
    const updated = { ...form, theme };
    setForm(updated);
    await updateSettings({ theme });
  };

  const isContestActive = contestEndTime !== null && Date.now() < contestEndTime;

  return (
    <div className="w-full h-full flex flex-col p-6 overflow-y-auto select-none space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            偏好设置
          </h1>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            配置 IDE 界面主题、比赛实战模式、本地 C++ 编译器与 AI 算法教练
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-semibold text-xs text-white shadow-xs transition-all hover:brightness-110 active:scale-95 cursor-pointer"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {saved ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>已保存</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>保存配置</span>
            </>
          )}
        </button>
      </div>

      {/* Contest Mode (比赛实战模拟模式) */}
      <div
        className="p-5 rounded-2xl border flex flex-col gap-3.5 transition-all shadow-xs"
        style={{
          backgroundColor: isContestActive ? 'rgba(255, 69, 58, 0.08)' : 'var(--bg-surface)',
          borderColor: isContestActive ? 'rgba(255, 69, 58, 0.4)' : 'var(--border)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={'w-2.5 h-2.5 rounded-full ' + (isContestActive ? 'bg-[#ff453a] animate-pulse' : 'bg-[#ff9f0a]')} />
            <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-[#ff9f0a]" />
              <span>比赛实战模拟模式 (Contest Simulation)</span>
            </span>
          </div>

          {isContestActive ? (
            <span className="px-2.5 py-0.5 rounded-full bg-[#ff453a] text-white text-[11px] font-bold shadow-xs">
              进行中 · 结束时间: {new Date(contestEndTime).toLocaleTimeString()}
            </span>
          ) : (
            <span className="text-[11px] text-[var(--text-tertiary)]">未开启</span>
          )}
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          开启后将强制禁用 AI 算法教练与思路解答功能，模拟 NOIP / CSP / NOI / ICPC 真实赛场环境。设置时长结束后将自动恢复。
        </p>

        {/* Quick Presets Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap pt-1">
          <button
            onClick={() => setContestEndTime(Date.now() + 1.5 * 3600 * 1000)}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)] text-xs font-medium text-[var(--text-primary)] transition-all cursor-pointer shadow-xs"
          >
            <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>1.5 小时 (普及组模拟)</span>
          </button>

          <button
            onClick={() => setContestEndTime(Date.now() + 3.5 * 3600 * 1000)}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[#ff9f0a] hover:bg-[#ff9f0a]/10 text-xs font-medium text-[var(--text-primary)] transition-all cursor-pointer shadow-xs"
          >
            <Flame className="w-3.5 h-3.5 text-[#ff9f0a]" />
            <span>3.5 小时 (CSP-S 提高组模拟)</span>
          </button>

          <button
            onClick={() => setContestEndTime(Date.now() + 4.0 * 3600 * 1000)}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[#ff453a] hover:bg-[#ff453a]/10 text-xs font-medium text-[var(--text-primary)] transition-all cursor-pointer shadow-xs"
          >
            <Trophy className="w-3.5 h-3.5 text-[#ff453a]" />
            <span>4.0 小时 (NOIP 模拟)</span>
          </button>

          <button
            onClick={() => setContestEndTime(Date.now() + 5.0 * 3600 * 1000)}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[#af52de] hover:bg-[#af52de]/10 text-xs font-medium text-[var(--text-primary)] transition-all cursor-pointer shadow-xs"
          >
            <Trophy className="w-3.5 h-3.5 text-[#af52de]" />
            <span>5.0 小时 (NOI / ICPC 模拟)</span>
          </button>

          {isContestActive && (
            <button
              onClick={() => setContestEndTime(null)}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#ff453a] hover:brightness-110 text-white text-xs font-bold transition-all cursor-pointer shadow-xs ml-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>提前结束比赛</span>
            </button>
          )}
        </div>
      </div>

      {/* Theme Section */}
      <div
        className="p-5 rounded-2xl border flex flex-col gap-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-bold text-[var(--text-primary)]">
            IDE 界面主题 (Theme Palette)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {THEMES.map((th) => {
            const isSelected = form.theme === th.id;
            return (
              <div
                key={th.id}
                onClick={() => handleSelectTheme(th.id)}
                className={'p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ' + (isSelected ? 'border-[var(--accent)] bg-[var(--accent-subtle)] ring-2 ring-[var(--accent)] shadow-xs' : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--text-tertiary)]')}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center border"
                      style={{
                        backgroundColor: th.previewBg,
                        borderColor: th.isLight ? '#d0d7de' : '#333333',
                        color: th.previewFg,
                      }}
                    >
                      {th.isLight ? <Sun className="w-4 h-4 text-[#e5a43b]" /> : <Moon className="w-4 h-4 text-[#7aa2f7]" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[var(--text-primary)] block">
                        {th.name}
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)] block">
                        {th.isLight ? '浅色日光模式' : '深色暗黑模式'}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: 'var(--accent)' }}
                    >
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {/* Mini Code Preview Bar */}
                <div
                  className="p-2.5 rounded-lg border font-mono text-[11px] leading-relaxed flex items-center gap-2 select-none"
                  style={{
                    backgroundColor: th.previewBg,
                    borderColor: th.isLight ? '#e1e4e8' : '#303030',
                    color: th.previewFg,
                  }}
                >
                  <span style={{ color: th.isLight ? '#cf222e' : '#c678dd' }}>int</span>
                  <span>main()</span>
                  <span style={{ color: th.isLight ? '#6e7781' : '#5c6370' }}>// {th.name}</span>
                </div>

                <p className="text-[11px] text-[var(--text-secondary)] mt-2.5 leading-normal">
                  {th.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Boilerplate (缺省源配置) */}
      <div
        className="p-5 rounded-2xl border flex flex-col gap-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-xs font-bold text-[var(--text-primary)]">
              新建文件缺省源 (Custom Code Boilerplate)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-tertiary)]">
              {form.enableCodeTemplate ? '已启用自动填入' : '未启用(新建纯空白文件)'}
            </span>
            <input
              type="checkbox"
              checked={form.enableCodeTemplate}
              onChange={(e) =>
                setForm({ ...form, enableCodeTemplate: e.target.checked })
              }
              className="w-4 h-4 accent-[var(--accent)] cursor-pointer"
            />
          </div>
        </div>

        {form.enableCodeTemplate ? (
          <div className="space-y-2">
            <p className="text-xs text-[var(--text-secondary)]">
              每次新建 <code className="font-mono text-[var(--accent)]">.cpp</code> 标签页时，自动将以下模板代码填入编辑器：
            </p>
            <div className="h-48 border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <Editor
                height="100%"
                language="cpp"
                value={form.codeTemplate}
                theme={form.theme === 'GitHubLight' ? 'vs' : 'vs-dark'}
                onChange={(v) => setForm({ ...form, codeTemplate: v || '' })}
                options={{
                  fontSize: 13,
                  fontFamily: 'Cascadia Mono, Consolas, monospace',
                  minimap: { enabled: false },
                  automaticLayout: true,
                  tabSize: 4,
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                }}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
            未开启自定义缺省源。新建代码标签页默认完全为空 (0 行空白文件)。
          </p>
        )}
      </div>

      {/* Compiler Configuration */}
      <div
        className="p-5 rounded-2xl border flex flex-col gap-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-bold text-[var(--text-primary)]">
            C++ 编译器环境 (MinGW / GCC)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
              编译器可执行路径 (g++)
            </label>
            <input
              type="text"
              value={form.compilerPath}
              onChange={(e) =>
                setForm({ ...form, compilerPath: e.target.value })
              }
              placeholder="g++ 或 C:\\Qt\\Tools\\mingw1310_64\\bin\\g++.exe"
              className="w-full p-2.5 rounded-xl border text-xs font-mono outline-none focus:border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
              编译参数标志 (空格分隔)
            </label>
            <input
              type="text"
              value={form.compilerFlags.join(' ')}
              onChange={(e) =>
                setForm({
                  ...form,
                  compilerFlags: e.target.value.split(' ').filter(Boolean),
                })
              }
              placeholder="-O2 -std=c++17 -Wall -Wextra"
              className="w-full p-2.5 rounded-xl border text-xs font-mono outline-none focus:border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]"
            />
          </div>
        </div>
      </div>

      {/* Luogu Integration Help Box */}
      <div
        className="p-5 rounded-2xl border flex flex-col gap-2"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-bold text-[var(--text-primary)]">
            洛谷 (Luogu) 题面同步机制说明
          </span>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Olympia IDE 通过调用洛谷公开内容接口（<code className="font-mono text-[var(--accent)]">https://www.luogu.com.cn/problem/{'{id}'}?_contentOnly=1</code>）自动解析题面 LaTeX 源码、时空限制与输入输出样例，并缓存于本地（<code className="font-mono text-[var(--accent)]">~/.oleride/problems.json</code>），支持无网络离线练习。
        </p>
      </div>

      {/* AI Coach Config */}
      <div
        className="p-5 rounded-2xl border flex flex-col gap-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-bold text-[var(--text-primary)]">
            AI 竞赛教练模型接口 (OpenAI / DeepSeek 兼容)
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
              API Base URL (端点地址)
            </label>
            <input
              type="text"
              value={form.aiBaseUrl}
              onChange={(e) => setForm({ ...form, aiBaseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1 或 https://api.deepseek.com"
              className="w-full p-2.5 rounded-xl border text-xs font-mono outline-none focus:border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
              API Key (令牌密钥)
            </label>
            <input
              type="password"
              value={form.aiApiKey}
              onChange={(e) => setForm({ ...form, aiApiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full p-2.5 rounded-xl border text-xs font-mono outline-none focus:border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
              模型名称 (Model)
            </label>
            <input
              type="text"
              value={form.aiModel}
              onChange={(e) => setForm({ ...form, aiModel: e.target.value })}
              placeholder="deepseek-chat 或 gpt-4o-mini"
              className="w-full p-2.5 rounded-xl border text-xs font-mono outline-none focus:border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]"
            />
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div
        className="p-5 rounded-2xl border flex flex-col gap-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-bold text-[var(--text-primary)]">
            常规偏好
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
              每日做题目标 (题)
            </label>
            <input
              type="number"
              value={form.dailyGoal}
              onChange={(e) =>
                setForm({ ...form, dailyGoal: Number(e.target.value) })
              }
              className="w-full p-2.5 rounded-xl border text-xs outline-none focus:border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
              编辑器字号 (px)
            </label>
            <input
              type="number"
              value={form.fontSize}
              onChange={(e) =>
                setForm({ ...form, fontSize: Number(e.target.value) })
              }
              className="w-full p-2.5 rounded-xl border text-xs outline-none focus:border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
