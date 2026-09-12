import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  Palette,
  Terminal,
  Sparkles,
  Info,
  Moon,
  Sun,
  Code2,
  Trophy,
  Clock,
  LogOut,
  Type,
  Minus,
  Plus,
  Keyboard,
  Wand2,
  Check,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { registerMonacoThemes } from '../../services/monacoTheme';
import { tauriApi } from '../../services/tauriApi';
import type { AppSettings, ThemeType } from '../../types';

const CODE_FONTS = [
  { id: 'Cascadia Mono', name: 'Cascadia Mono' },
  { id: 'JetBrains Mono', name: 'JetBrains Mono' },
  { id: 'Fira Code', name: 'Fira Code' },
  { id: 'Consolas', name: 'Consolas' },
  { id: 'Courier New', name: 'Courier New' },
  { id: 'Source Code Pro', name: 'Source Code Pro' },
];

const FONT_SIZE_PRESETS = [12, 13, 14, 15, 16, 18, 20];

const SHORTCUTS: Array<[string, string]> = [
  ['Ctrl+R', '编译并评测当前代码'],
  ['Ctrl+S', '保存当前文件'],
  ['Ctrl+N', '新建代码标签页'],
  ['Ctrl+W', '关闭当前标签页'],
  ['Ctrl+E', '回到编辑器'],
  ['Ctrl+K', '打开最近做题'],
];

/* ---- 规范控件：表单行 / 开关 / 药丸组 / 分区 ---- */

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <section className="pt-6 first:pt-0">
    <div className="flex items-center gap-2 mb-4">
      <span className="text-[var(--accent)]">{icon}</span>
      <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">{title}</h2>
    </div>
    <div className="space-y-3.5">{children}</div>
  </section>
);

const Row: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="flex items-start gap-4">
    <label className="w-[140px] shrink-0 pt-1.5 text-right text-xs text-[var(--text-secondary)]">{label}</label>
    <div className="flex-1 min-w-0">
      {children}
      {hint && <p className="text-[11px] text-[var(--text-tertiary)] mt-1 leading-relaxed">{hint}</p>}
    </div>
  </div>
);

const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={'relative w-9 h-5 rounded-full transition-colors cursor-pointer ' + (checked ? 'bg-[var(--accent)]' : 'bg-[var(--bg-elevated)] border border-[var(--border)]')}
  >
    <span
      className={'absolute top-0.5 w-4 h-4 rounded-full transition-all ' + (checked ? 'left-[18px] bg-[var(--text-primary)]' : 'left-0.5 bg-[var(--text-tertiary)]')}
    />
  </button>
);

const Pills: React.FC<{ value: string; options: Array<{ id: string; label: string; icon?: React.ReactNode }>; onChange: (id: string) => void }> = ({ value, options, onChange }) => (
  <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
    {options.map((o) => (
      <button
        key={o.id}
        type="button"
        onClick={() => onChange(o.id)}
        className={
          'px-3 py-1 rounded-md text-xs transition-colors cursor-pointer flex items-center gap-1.5 ' +
          (value === o.id
            ? 'bg-[var(--accent-subtle)] text-[var(--text-primary)] font-medium'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]')
        }
      >
        {value === o.id && <Check className="w-3 h-3 text-[var(--accent)]" />}
        {o.icon}
        {o.label}
      </button>
    ))}
  </div>
);

/* ---- 页面 ---- */

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, contestEndTime, setContestEndTime } = useAppStore();

  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [fontSizeInput, setFontSizeInput] = useState<string>(String(settings.fontSize || 14));
  const [flagsInput, setFlagsInput] = useState<string>(form.compilerFlags.join(' '));
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState<string | null>(null);

  // Keep local form in sync with global store changes
  React.useEffect(() => {
    setForm(settings);
    setFontSizeInput(String(settings.fontSize || 14));
    const joined = settings.compilerFlags.join(' ');
    // 输入中的原始串（含末尾空格）不被 store 往回写打掉
    setFlagsInput((prev) => (prev.trim() === joined ? prev : joined));
  }, [settings]);

  const updateField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    updateSettings({ [key]: value });
  };

  const handleDetectCompiler = async () => {
    setDetecting(true);
    setDetectMsg(null);
    try {
      const st = await tauriApi.detectToolchain();
      if (st.gppPath) {
        if (form.compilerPath !== st.gppPath) updateField('compilerPath', st.gppPath);
        setDetectMsg(`✓ 已检测到：${st.version || st.gppPath}`);
      } else {
        setDetectMsg('未检测到可用工具链，可在首次启动向导中自动安装。');
      }
    } catch (e) {
      setDetectMsg('检测失败：' + String(e));
    } finally {
      setDetecting(false);
    }
  };

  const handleFontSizeChange = (valStr: string) => {
    const cleaned = valStr.replace(/[^0-9]/g, '');
    setFontSizeInput(cleaned);
    const parsed = parseInt(cleaned, 10);
    if (!isNaN(parsed) && parsed >= 10 && parsed <= 36) updateField('fontSize', parsed);
  };

  const handleFontSizeStep = (delta: number) => {
    const next = Math.max(10, Math.min(36, (parseInt(fontSizeInput, 10) || form.fontSize || 14) + delta));
    setFontSizeInput(String(next));
    updateField('fontSize', next);
  };

  const isContestActive = contestEndTime !== null && Date.now() < contestEndTime;
  const isLight = form.theme === 'GitHubLight';

  const themeOptions = [
    { id: 'OneDarkPro', label: 'One Dark Pro', icon: <Moon className="w-3 h-3 text-[#7aa2f7]" /> },
    { id: 'GitHubLight', label: 'GitHub Light', icon: <Sun className="w-3 h-3 text-[#e5a43b]" /> },
  ];

  return (
    <div className="w-full h-full overflow-y-auto select-none">
      <div className="max-w-[640px] mx-auto px-6 py-6">
        {/* 页头 */}
        <header className="mb-2">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">设置</h1>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
            所有更改即时生效并自动保存
          </p>
        </header>

        {/* 外观 */}
        <div className="border-t border-[var(--border)] pt-2 mt-2">
          <Section icon={<Palette className="w-4 h-4" />} title="外观">
            <Row label="主题">
              <Pills
                value={form.theme}
                options={themeOptions}
                onChange={(id) => updateField('theme', id as ThemeType)}
              />
            </Row>
            <Row label="编辑器字体">
              <div className="relative max-w-[280px]">
                <Type className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
                <select
                  value={form.fontFamily || 'Cascadia Mono'}
                  onChange={(e) => updateField('fontFamily', e.target.value)}
                  className="w-full appearance-none bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] rounded-md pl-8 pr-8 py-1.5 text-xs outline-none focus:border-[var(--accent)] cursor-pointer"
                  style={{ fontFamily: (form.fontFamily || 'Cascadia Mono') + ', monospace' }}
                >
                  {CODE_FONTS.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </Row>
            <Row label="字号" hint="范围 10 – 36 px">
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden">
                  <button type="button" onClick={() => handleFontSizeStep(-1)} className="px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/10 transition-colors cursor-pointer" title="减小字号">
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="text"
                    value={fontSizeInput}
                    onChange={(e) => handleFontSizeChange(e.target.value)}
                    onBlur={() => {
                      if (fontSizeInput === '' || parseInt(fontSizeInput, 10) < 10) {
                        setFontSizeInput('14');
                        updateField('fontSize', 14);
                      }
                    }}
                    className="w-10 text-center text-xs font-mono bg-transparent text-[var(--text-primary)] outline-none py-1 border-x border-[var(--border)]"
                  />
                  <button type="button" onClick={() => handleFontSizeStep(1)} className="px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/10 transition-colors cursor-pointer" title="增大字号">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  {FONT_SIZE_PRESETS.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => { setFontSizeInput(String(size)); updateField('fontSize', size); }}
                      className={
                        'px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer border ' +
                        ((form.fontSize || 14) === size
                          ? 'border-[var(--accent)] text-[var(--accent)]'
                          : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]')
                      }
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </Row>
            <Row label="实时预览">
              <div className="rounded-md border border-[var(--border)] bg-[var(--bg-base)] p-3 overflow-x-auto">
                <pre
                  className="font-mono text-[var(--text-primary)] leading-relaxed select-text"
                  style={{ fontFamily: (form.fontFamily || 'Cascadia Mono') + ', monospace', fontSize: (form.fontSize || 14) + 'px' }}
                >{`int main() {
    ios::sync_with_stdio(false);
    cout << "Olympia IDE" << '\\n';
    return 0;
}`}</pre>
              </div>
            </Row>
          </Section>
        </div>

        {/* 编译器 */}
        <div className="border-t border-[var(--border)] pt-2 mt-6">
          <Section icon={<Terminal className="w-4 h-4" />} title="编译器">
            <Row label="编译器路径" hint={detectMsg ?? '评测与语法检查均使用此 g++'}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={form.compilerPath}
                  onChange={(e) => updateField('compilerPath', e.target.value)}
                  placeholder="g++ 或完整路径 g++.exe"
                  className="flex-1 bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-xs font-mono outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={handleDetectCompiler}
                  disabled={detecting}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Wand2 className="w-3 h-3" />
                  {detecting ? '检测中' : '自动检测'}
                </button>
              </div>
            </Row>
            <Row label="编译参数" hint="空格分隔，留空使用默认 -O2 -std=c++17 -Wall -Wextra">
              <input
                type="text"
                value={flagsInput}
                onChange={(e) => {
                  setFlagsInput(e.target.value);
                  updateField('compilerFlags', e.target.value.split(/\s+/).filter(Boolean));
                }}
                onBlur={() => setFlagsInput((prev) => prev.trim())}
                placeholder="-O2 -std=c++17 -Wall"
                className="w-full bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-xs font-mono outline-none focus:border-[var(--accent)]"
              />
            </Row>
          </Section>
        </div>

        {/* 缺省源 */}
        <div className="border-t border-[var(--border)] pt-2 mt-6">
          <Section icon={<Code2 className="w-4 h-4" />} title="缺省源">
            <Row label="新建文件模板" hint="开启后，每次新建代码标签页自动填入下方模板">
              <Switch checked={form.enableCodeTemplate} onChange={(v) => updateField('enableCodeTemplate', v)} />
            </Row>
            {form.enableCodeTemplate && (
              <div className="h-40 rounded-md border border-[var(--border)] overflow-hidden">
                <Editor
                  height="100%"
                  language="cpp"
                  value={form.codeTemplate}
                  theme={isLight ? 'oler-light-theme' : 'oler-dark-theme'}
                  beforeMount={registerMonacoThemes}
                  onChange={(v) => updateField('codeTemplate', v || '')}
                  options={{
                    fontSize: 13,
                    fontFamily: (form.fontFamily || 'Cascadia Mono') + ', Consolas, monospace',
                    minimap: { enabled: false },
                    automaticLayout: true,
                    tabSize: 4,
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                  }}
                />
              </div>
            )}
          </Section>
        </div>

        {/* 比赛模式 */}
        <div className="border-t border-[var(--border)] pt-2 mt-6">
          <Section icon={<Trophy className="w-4 h-4" />} title="比赛模式">
            <Row
              label="模拟比赛"
              hint={isContestActive
                ? `进行中，结束于 ${new Date(contestEndTime).toLocaleTimeString()}，期间 AI 教练锁定`
                : '开始后倒计时并锁定 AI 教练，到时自动恢复'}
            >
              {isContestActive ? (
                <button
                  type="button"
                  onClick={() => setContestEndTime(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#ff453a] hover:brightness-110 text-white text-xs font-medium transition-all cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  提前结束比赛
                </button>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { mins: 90, label: '1.5 小时' },
                    { mins: 210, label: '3.5 小时' },
                    { mins: 240, label: '4 小时' },
                    { mins: 300, label: '5 小时' },
                  ].map((p) => (
                    <button
                      key={p.mins}
                      type="button"
                      onClick={() => setContestEndTime(Date.now() + p.mins * 60_000)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--accent)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      <Clock className="w-3 h-3 text-[var(--accent)]" />
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </Row>
          </Section>
        </div>

        {/* AI 助手 */}
        <div className="border-t border-[var(--border)] pt-2 mt-6">
          <Section icon={<Sparkles className="w-4 h-4" />} title="AI 助手">
            <Row label="API 地址" hint="任何兼容 OpenAI 接口的服务；Key 只保存在本机">
              <input
                type="text"
                value={form.aiBaseUrl}
                onChange={(e) => updateField('aiBaseUrl', e.target.value)}
                placeholder="https://api.deepseek.com/v1"
                className="w-full bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-xs font-mono outline-none focus:border-[var(--accent)]"
              />
            </Row>
            <Row label="API Key">
              <input
                type="password"
                value={form.aiApiKey}
                onChange={(e) => updateField('aiApiKey', e.target.value)}
                placeholder="sk-..."
                className="w-full bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-xs font-mono outline-none focus:border-[var(--accent)]"
              />
            </Row>
            <Row label="模型">
              <input
                type="text"
                value={form.aiModel}
                onChange={(e) => updateField('aiModel', e.target.value)}
                placeholder="deepseek-chat 或 gpt-4o-mini"
                className="w-full bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-xs font-mono outline-none focus:border-[var(--accent)]"
              />
            </Row>
          </Section>
        </div>

        {/* 快捷键 */}
        <div className="border-t border-[var(--border)] pt-2 mt-6">
          <Section icon={<Keyboard className="w-4 h-4" />} title="快捷键">
            <div className="rounded-md border border-[var(--border)] overflow-hidden">
              {SHORTCUTS.map(([key, desc], i) => (
                <div
                  key={key}
                  className={'flex items-center justify-between px-3 py-1.5 text-xs ' + (i % 2 === 0 ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-elevated)]')}
                >
                  <span className="text-[var(--text-secondary)]">{desc}</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-overlay)] border border-[var(--border)] font-mono text-[10px] text-[var(--text-secondary)]">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* 关于 */}
        <div className="border-t border-[var(--border)] pt-2 mt-6 mb-4">
          <Section icon={<Info className="w-4 h-4" />} title="关于">
            <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
              Olympia IDE v0.1.0 · MIT License ·{' '}
              <button
                type="button"
                onClick={() => tauriApi.openUrl('https://github.com/yuandd0412/olympia-ide')}
                className="text-[var(--accent)] hover:underline cursor-pointer"
              >
                GitHub 仓库
              </button>
              {' · '}
              <button
                type="button"
                onClick={() => tauriApi.openUrl('https://olympia.dpdns.org')}
                className="text-[var(--accent)] hover:underline cursor-pointer"
              >
                官网
              </button>
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
              洛谷题面通过公开接口拉取并缓存到本地 <code className="font-mono">~/.oleride/problems.json</code>，不登录、不上传、不采集任何账号信息。
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
};
