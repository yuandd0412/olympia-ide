import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Play, Loader2, FileCode2 } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';

export const EditorTabBar: React.FC = () => {
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    openNewTab,
    closeTab,
    updateTabTitle,
    runCodeAction,
    isRunning,
  } = useAppStore();

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleStartRename = (id: string, title: string) => {
    setEditingTabId(id);
    setEditingTitle(title);
  };

  const handleFinishRename = (id: string) => {
    if (editingTitle.trim()) {
      updateTabTitle(id, editingTitle.trim());
    }
    setEditingTabId(null);
  };

  return (
    <div
      className="h-10 border-b flex items-center justify-between px-2 select-none shrink-0"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Left Tab List with Animation */}
      <div className="flex items-center gap-1 overflow-x-auto max-w-[calc(100%-180px)] py-1">
        <AnimatePresence initial={false}>
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isEditing = editingTabId === tab.id;

            return (
              <motion.div
                key={tab.id}
                layout
                initial={{ opacity: 0, scale: 0.92, y: 2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.12 } }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                onClick={() => setActiveTabId(tab.id)}
                onDoubleClick={() => handleStartRename(tab.id, tab.title)}
                className={`group relative h-7 px-3 rounded-md flex items-center gap-2 text-xs font-mono cursor-pointer transition-all border ${
                  isActive
                    ? 'bg-[var(--bg-base)] text-[var(--text-primary)] border-[var(--border)] shadow-xs font-medium'
                    : 'bg-transparent text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 opacity-70 text-[var(--accent)] shrink-0" />

                {isEditing ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => handleFinishRename(tab.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishRename(tab.id);
                      if (e.key === 'Escape') setEditingTabId(null);
                    }}
                    autoFocus
                    className="bg-[var(--bg-elevated)] text-[var(--text-primary)] px-1 rounded outline-none border border-[var(--accent)] w-24 text-xs font-mono"
                  />
                ) : (
                  <span className="truncate max-w-[120px]">{tab.title}</span>
                )}

                {tab.isModified && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                )}

                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="p-0.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Add Tab Button */}
        <button
          onClick={() => openNewTab()}
          title="新建代码文件 (Ctrl+N)"
          className="h-7 w-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right Quick Run Action */}
      <div className="flex items-center gap-2">
        <button
          onClick={runCodeAction}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 text-white shadow-xs"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>编译运行中...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>运行评测</span>
              <kbd className="text-[10px] font-mono bg-black/20 px-1 py-0.5 rounded ml-0.5 opacity-80">
                Ctrl+R
              </kbd>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
