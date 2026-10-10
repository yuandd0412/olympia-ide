import React, { useEffect, useRef, useState } from 'react';
import { ActivityBar } from './components/common/ActivityBar';
import { StatusBar } from './components/common/StatusBar';
import { EditorTabBar } from './components/editor/EditorTabBar';
import { MonacoCodeEditor } from './components/editor/MonacoCodeEditor';
import { RunnerPanel } from './components/runner/RunnerPanel';
import { StressTesterPage } from './components/stress/StressTesterPage';
import { ProblemViewerPanel } from './components/viewer/ProblemViewerPanel';
import { ProblemsPage } from './components/problems/ProblemsPage';
import { AiCoachPage } from './components/ai/AiCoachPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { useAppStore } from './stores/useAppStore';
import { PanelLeftOpen } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { tabFade } from './ports/motion';

import { CustomTitleBar } from './components/common/CustomTitleBar';
import { ContestBar } from './components/common/ContestBar';
import { OnboardingWizard } from './components/common/OnboardingWizard';

import {
  SplitGroup,
  SplitPanel,
  SplitSeparator,
  useSplitLayout,
  type SplitPanelHandle,
  type SplitPanelSize,
} from './ports/layout';

export const App: React.FC = () => {
  const { activeNav, setActiveNav, loadInitialData, runCodeAction, settings, hydrated } = useAppStore();
  const reduce = useReducedMotion();
  const tabMotion = tabFade(!!reduce);
  const viewerRef = useRef<SplitPanelHandle | null>(null);
  const [viewerCollapsed, setViewerCollapsed] = useState(false);
  const collapseViewer = () => {
    setViewerCollapsed(true);
    viewerRef.current?.collapse();
  };
  const expandViewer = () => {
    setViewerCollapsed(false);
    viewerRef.current?.expand();
  };
  // Keep React state in lockstep with the real panel: layout restore can
  // remount the group as collapsed while useState re-initializes to false,
  // which previously hid the expand button and stranded the sidebar.
  // ResizeObserver-backed onResize fires on mount, so this also rehydrates.
  const handleViewerResize = (size: SplitPanelSize) => {
    const collapsed = size.pixels <= 1 || size.percentage < 0.5;
    setViewerCollapsed((prev) => (prev === collapsed ? prev : collapsed));
  };

  const horizontalLayout = useSplitLayout('olympia-layout-horizontal', localStorage);
  const verticalLayout = useSplitLayout('olympia-layout-vertical', localStorage);

  useEffect(() => {
    loadInitialData();

    // Disable default browser context menu globally
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenu);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+R or Cmd+R -> Run Code
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        runCodeAction();
      }
      // F9 / Ctrl+Enter -> Run Code, the two chords students expect from Dev-C++ and OJ clients
      if (e.key === 'F9' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        runCodeAction();
      }
      // Ctrl+K -> Toggle Problems Tab
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveNav(useAppStore.getState().activeNav === 'problems' ? 'editor' : 'problems');
      }
      // Ctrl+E -> Back to the editor
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setActiveNav('editor');
      }
      // Ctrl+N -> New Tab
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        useAppStore.getState().openNewTab();
      }
      // Ctrl+S or Cmd+S -> Save Active Tab
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        useAppStore.getState().saveActiveTab();
      }
      // Ctrl+W -> Close Tab
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        const state = useAppStore.getState();
        state.closeTab(state.activeTabId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [loadInitialData, runCodeAction, setActiveNav]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const url = URL.createObjectURL(file);
      useAppStore.getState().setViewerPdfUrl(url);
      expandViewer();
      setActiveNav('editor');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="w-screen h-screen flex flex-col overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)] select-none"
    >
      <CustomTitleBar />
      <ContestBar />
      
      {/* Gate on hydrated: isFirstRun defaults to true until persisted settings arrive,
          so rendering earlier makes the wizard flash on every launch. */}
      {hydrated && settings.isFirstRun && <OnboardingWizard />}

      {/* Top Application Body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Navigation Activity Rail */}
        <ActivityBar />

        {/* Main Content Region */}
        <main className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
          <AnimatePresence mode="wait">
            {activeNav === 'editor' && (
              <motion.div
                key="editor"
                {...tabMotion}
                className="w-full h-full"
              >
                <SplitGroup
                  id="olympia-layout-horizontal"
                  orientation="horizontal"
                  layoutBinding={horizontalLayout}
                  className="w-full h-full"
                >
                  <SplitPanel
                    id="problem-viewer"
                    handle={viewerRef}
                    defaultSize="35%"
                    minSize="20%"
                    maxSize="60%"
                    collapsible
                    collapsedSize="0"
                    className="h-full"
                    onResize={handleViewerResize}
                  >
                    <ProblemViewerPanel onClose={collapseViewer} />
                  </SplitPanel>
                  {/* Always keep the separator mounted — conditional unmount
                      desyncs the group layout and blocks expand(). */}
                  <SplitSeparator
                    className={
                      'w-1 transition-all cursor-col-resize z-50 relative group flex items-center justify-center ' +
                      (viewerCollapsed
                        ? 'bg-transparent hover:bg-[var(--accent)]'
                        : 'bg-[var(--border)] hover:bg-[var(--accent)]')
                    }
                  >
                    <div className="w-0.5 h-8 rounded-full bg-[var(--text-tertiary)] opacity-40 group-hover:opacity-100 group-hover:bg-[var(--accent)]" />
                  </SplitSeparator>

                  <SplitPanel id="editor-main" minSize="30%" className="h-full flex flex-col min-w-0">
                    {/* Editor Top Bar */}
                    <div className="flex items-center w-full relative">
                      {viewerCollapsed && (
                        <button
                          onClick={expandViewer}
                          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
                          title="打开题面阅读器"
                        >
                          <PanelLeftOpen className="w-4 h-4" />
                        </button>
                      )}
                      <div className={'flex-1 ' + (viewerCollapsed ? 'pl-8' : '')}>
                        <EditorTabBar />
                      </div>
                    </div>

                    {/* Vertical Split for Editor and Runner */}
                    <SplitGroup
                      id="olympia-layout-vertical"
                      orientation="vertical"
                      layoutBinding={verticalLayout}
                      className="flex-1 min-h-0"
                    >
                      <SplitPanel id="code-editor" defaultSize="60%" minSize="20%" maxSize="85%" className="relative">
                        <MonacoCodeEditor />
                      </SplitPanel>
                      <SplitSeparator className="h-1 bg-[var(--border)] hover:bg-[var(--accent)] transition-all cursor-row-resize z-50 relative group flex items-center justify-center">
                        <div className="h-0.5 w-8 rounded-full bg-[var(--text-tertiary)] opacity-40 group-hover:opacity-100 group-hover:bg-[var(--accent)]" />
                      </SplitSeparator>
                      <SplitPanel id="code-runner" defaultSize="40%" minSize="15%" maxSize="80%" className="relative">
                        <RunnerPanel />
                      </SplitPanel>
                    </SplitGroup>
                  </SplitPanel>
                </SplitGroup>
              </motion.div>
            )}

            {activeNav === 'stress' && (
              <motion.div key="stress" {...tabMotion} className="w-full h-full">
                <StressTesterPage />
              </motion.div>
            )}

            {activeNav === 'problems' && (
              <motion.div key="problems" {...tabMotion} className="w-full h-full">
                <ProblemsPage />
              </motion.div>
            )}

            {activeNav === 'ai' && (
              <motion.div key="ai" {...tabMotion} className="w-full h-full">
                <AiCoachPage />
              </motion.div>
            )}

            {activeNav === 'settings' && (
              <motion.div key="settings" {...tabMotion} className="w-full h-full">
                <SettingsPage />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Bottom Professional Status Bar */}
      <StatusBar />
    </div>
  );
};

export default App;
