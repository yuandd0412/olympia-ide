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
  const { settings, updateSettings } = useAppStore();

  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  // Keep local form in sync with global store changes (e.g. from ActivityBar or shortcuts)
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

  return (
    <div className="w-full h-full flex flex-col p-6 overflow-y-auto select-none space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            鍋忓ソ璁剧疆
          </h1>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            閰嶇疆 IDE 鐣岄潰涓婚�銆佹湰鍦?C++ 缂栬瘧鍣ㄨ矾寰勪笌 AI 绠楁硶鏁欑粌
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
              <span>淇濆瓨閰嶇疆</span>
            </>
          )}
        </button>
      </div>

      {/* Contest Mode (比赛模式) */}
      <div
        className="p-5 rounded-2xl border space-y-4"
        style={{
          backgroundColor: 'rgba(255, 69, 58, 0.05)',
          borderColor: 'rgba(255, 69, 58, 0.3)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#ff453a] animate-pulse" />
          <span className="text-xs font-bold text-[#ff453a]">
            比赛模式 (Contest Mode)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[var(--text-secondary)]">
            开启后将强制禁用 AI 助手功能，模拟真实比赛环境。设置的时间结束后将自动恢复。
          </p>
          <div className="flex items-center gap-2">
            <select
              className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
              onChange={(e) => {
                const hours = parseInt(e.target.value);
                if (hours > 0) {
                  useAppStore.getState().setContestEndTime(Date.now() + hours * 3600 * 1000);
                }
              }}
            >
              <option value="0">开启比赛模式</option>
              <option value="2">开启 2 小时</option>
              <option value="3.5">开启 3.5 小时</option>
              <option value="4">开启 4 小时</option>
              <option value="5">开启 5 小时</option>
            </select>
            {useAppStore.getState().contestEndTime !== null && Date.now() < useAppStore.getState().contestEndTime! && (
              <button
                onClick={() => useAppStore.getState().setContestEndTime(null)}
                className="px-2 py-1 bg-[#ff453a] text-white rounded text-xs font-bold hover:brightness-110"
              >
                结束比赛
              </button>
            )}
          </div>
        </div>
        {useAppStore.getState().contestEndTime !== null && Date.now() < useAppStore.getState().contestEndTime! && (
          <p className="text-[#ff453a] text-xs font-bold mt-2">
            当前处于比赛模式，结束时间: {new Date(useAppStore.getState().contestEndTime!).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Theme Section */}
      <div
        className="p-5 rounded-2xl border space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-bold text-[var(--text-primary)]">
            IDE 鐣岄潰涓婚� (Theme Palette)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {THEMES.map((th) => {
            const isSelected = form.theme === th.id;
            return (
              <div
                key={th.id}
                onClick={() => handleSelectTheme(th.id)}
                className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] ring-2 ring-[var(--accent)] shadow-xs'
                    : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--text-tertiary)]'
                }`}
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
                        {th.isLight ? '娴呰壊鏃ュ厜妯″紡' : '娣辫壊鏆楅粦妯″紡'}
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

      {/* Custom Boilerplate (缂虹渷婧愰厤缃? */}
      <div
        className="p-5 rounded-2xl border space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-xs font-bold text-[var(--text-primary)]">
              鏂板缓鏂囦欢缂虹渷婧?(Custom Code Boilerplate)
            </span>
          </div>

          {/* Toggle Switch */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {form.enableCodeTemplate ? '已启用' : '未启用(新建纯空白文件)'}
            </span>
            <input
              type="checkbox"
              checked={form.enableCodeTemplate}
              onChange={(e) =>
                setForm({ ...form, enableCodeTemplate: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[var(--border)] rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent)] relative"></div>
          </label>
        </div>

        <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
          {form.enableCodeTemplate
            ? '已开启自定义缺省源。新建代码文件或开启新题目时，将自动填充下方你编写的模板代码。'
            : '未开启自定义缺省源。新建代码标签页默认完全为空 (0 行空白文件)。'}
        </p>

        {/* Monaco Editor Container for Template (Only if enabled) */}
        {form.enableCodeTemplate && (
          <div className="h-56 w-full rounded-xl overflow-hidden border border-[var(--border)] relative bg-[var(--bg-base)] animate-in fade-in duration-200">
            <Editor
              height="100%"
              language="cpp"
              value={form.codeTemplate || ''}
              theme={form.theme === 'GitHubLight' ? 'vs' : 'vs-dark'}
              onChange={(val) => setForm({ ...form, codeTemplate: val || '' })}
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
        )}
      </div>

      {/* Compiler Configuration */}
      <div
        className="p-5 rounded-2xl border space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-bold text-[var(--text-primary)]">
            C++ 缂栬瘧鍣ㄧ幆澧?(MinGW / GCC)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
              缂栬瘧鍣ㄥ彲鎵ц�璺�緞 (g++)
            </label>
            <input
              type="text"
              value={form.compilerPath}
              onChange={(e) =>
                setForm({ ...form, compilerPath: e.target.value })
              }
              placeholder="g++ 鎴?C:\Qt\Tools\mingw1310_64\bin\g++.exe"
              className="w-full p-2.5 rounded-xl border text-xs font-mono outline-none focus:border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
              缂栬瘧鍙傛暟鏍囧織 (绌烘牸鍒嗛殧)
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

      {/* Luogu Online API Explanation Card */}
      <div
        className="p-5 rounded-2xl border space-y-3"
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
          Oler IDE 通过调用洛谷公开内容接口（<code className="font-mono text-[var(--accent)]">https://www.luogu.com.cn/problem/{'{id}'}?_contentOnly=1</code>）自动解析题面 LaTeX 源码、时空限制与输入输出样例，并缓存于本地（<code className="font-mono text-[var(--accent)]">~/.oleride/problems.json</code>），支持无网络离线练习。
        </p>
      </div>

      {/* AI Coach API Settings */}
      <div
        className="p-5 rounded-2xl border space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-bold text-[var(--text-primary)]">
            AI 绔炶禌鏁欑粌妯″瀷鎺ュ彛 (OpenAI / DeepSeek 鍏煎�)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
              API Base URL
            </label>
            <input
              type="text"
              value={form.aiBaseUrl}
              onChange={(e) => setForm({ ...form, aiBaseUrl: e.target.value })}
              placeholder="https://api.deepseek.com/v1"
              className="w-full p-2.5 rounded-xl border text-xs font-mono outline-none focus:border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
              API Key
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
              妯″瀷鍚嶇О (Model)
            </label>
            <input
              type="text"
              value={form.aiModel}
              onChange={(e) => setForm({ ...form, aiModel: e.target.value })}
              placeholder="deepseek-chat 鎴?gpt-4o-mini"
              className="w-full p-2.5 rounded-xl border text-xs font-mono outline-none focus:border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]"
            />
          </div>
        </div>
      </div>

      {/* Editor & Goal Preferences */}
      <div
        className="p-5 rounded-2xl border space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-bold text-[var(--text-primary)]">
            甯歌�鍋忓ソ
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
              姣忔棩鍋氶�鐩�爣 (棰?
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={form.dailyGoal}
              onChange={(e) =>
                setForm({ ...form, dailyGoal: parseInt(e.target.value) || 5 })
              }
              className="w-full p-2.5 rounded-xl border text-xs font-mono outline-none focus:border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
              缂栬緫鍣ㄥ瓧鍙?(px)
            </label>
            <input
              type="number"
              min={11}
              max={24}
              value={form.fontSize}
              onChange={(e) =>
                setForm({ ...form, fontSize: parseInt(e.target.value) || 14 })
              }
              className="w-full p-2.5 rounded-xl border text-xs font-mono outline-none focus:border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};


