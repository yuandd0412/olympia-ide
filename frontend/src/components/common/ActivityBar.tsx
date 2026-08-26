import React from 'react';
import { Code2, Swords, BookOpen, Bot, Settings, Moon, Sun } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';

export const ActivityBar: React.FC = () => {
  const { activeNav, setActiveNav, settings, updateSettings } = useAppStore();

  const navItems = [
    { id: 'editor', label: '代码编辑器 (Ctrl+E)', icon: Code2 },
    { id: 'stress', label: '对拍器 (Stress Tester)', icon: Swords },
    { id: 'problems', label: '题库 (Ctrl+K)', icon: BookOpen },
    { id: 'ai', label: 'AI 竞赛教练', icon: Bot },
  ];

  return (
    <aside className="w-12 border-r flex flex-col items-center justify-between py-2 select-none shrink-0 relative" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      <div className="flex flex-col gap-2 w-full items-center">
        {navItems.map((item) => {
          const isActive = activeNav === item.id;
          const isAi = item.id === 'ai';
          const isContestActive = useAppStore.getState().contestEndTime !== null && Date.now() < (useAppStore.getState().contestEndTime || 0);
          
          if (isAi && isContestActive) {
            return (
              <div key={item.id} title="比赛期间已禁用 AI 教练" className="relative p-2.5 rounded-xl text-[var(--text-tertiary)] opacity-30 cursor-not-allowed flex items-center justify-center">
                <item.icon className="w-5 h-5" />
              </div>
            );
          }

          return (
            <button key={item.id} onClick={() => setActiveNav(item.id as any)} title={item.label} className={"relative p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center group " + (isActive ? "text-white shadow-sm" : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]")}>
              {isActive && <div className="absolute inset-0 rounded-xl" style={{ backgroundColor: 'var(--accent)' }} />}
              <item.icon className="w-5 h-5 relative z-10" />
            </button>
          );
        })}
      </div>
      <div className="w-full flex flex-col items-center gap-1">
        <button onClick={() => { const nextTheme = settings.theme === 'GitHubLight' ? 'OneDarkPro' : 'GitHubLight'; updateSettings({ theme: nextTheme }); }} title="切换主题" className="relative p-2.5 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-all cursor-pointer">
          {settings.theme === 'GitHubLight' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
        <button onClick={() => setActiveNav('settings')} title="设置 (Settings)" className={"relative p-2.5 rounded-xl transition-all cursor-pointer " + (activeNav === 'settings' ? "text-[var(--accent)] bg-[var(--accent-subtle)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]")}>
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
