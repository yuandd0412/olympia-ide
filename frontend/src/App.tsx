import React, { useEffect, useState } from 'react';
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

import { CustomTitleBar } from './components/common/CustomTitleBar';
import { OnboardingWizard } from './components/common/OnboardingWizard';

import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';

export const App: React.FC = () => {
  const { activeNav, setActiveNav, loadInitialData, runCodeAction, settings } = useAppStore();
  const [showViewer, setShowViewer] = useState(true);

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
      // Ctrl+K -> Toggle Problems Tab
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveNav(useAppStore.getState().activeNav === 'problems' ? 'editor' : 'problems');
      }
      // Ctrl+E -> Toggle Editor Tab
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setActiveNav('editor');
      }
      // Ctrl+N -> New Tab
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        useAppStore.getState().openNewTab();
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
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const url = URL.createObjectURL(file);
      useAppStore.getState().setViewerPdfUrl(url);
      setShowViewer(true);
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
      
      {settings.isFirstRun && <OnboardingWizard />}

      {/* Top Application Body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Navigation Activity Rail */}
        <ActivityBar />

        {/* Main Content Region */}
        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          {activeNav === 'editor' && (
            <PanelGroup orientation="horizontal" className="w-full h-full">
              {showViewer && (
                <>
                  <Panel defaultSize={35} minSize={20} className="h-full">
                    <ProblemViewerPanel onClose={() => setShowViewer(false)} />
                  </Panel>
                  <PanelResizeHandle className="w-[1px] bg-[var(--border)] hover:bg-[var(--accent)] hover:w-1 transition-all cursor-col-resize z-50" />
                </>
              )}

              <Panel minSize={30} className="h-full flex flex-col min-w-0">
                {/* Editor Top Bar */}
                <div className="flex items-center w-full relative">
                  {!showViewer && (
                    <button 
                      onClick={() => setShowViewer(true)} 
                      className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
                      title="打开题面阅读器"
                    >
                      <PanelLeftOpen className="w-4 h-4" />
                    </button>
                  )}
                  <div className={`flex-1 transition-all ${!showViewer ? 'pl-8' : ''}`}>
                    <EditorTabBar />
                  </div>
                </div>

                {/* Vertical Split for Editor and Runner */}
                <PanelGroup orientation="vertical" className="flex-1 min-h-0">
                  <Panel defaultSize={60} minSize={20} className="relative">
                    <MonacoCodeEditor />
                  </Panel>
                  <PanelResizeHandle className="h-[1px] bg-[var(--border)] hover:bg-[var(--accent)] hover:h-1 transition-all cursor-row-resize z-50" />
                  <Panel defaultSize={40} minSize={20} className="relative">
                    <RunnerPanel />
                  </Panel>
                </PanelGroup>
              </Panel>
            </PanelGroup>
          )}

          {activeNav === 'stress' && <StressTesterPage />}
          {activeNav === 'problems' && <ProblemsPage />}
          {activeNav === 'ai' && <AiCoachPage />}
          {activeNav === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Bottom Professional Status Bar */}
      <StatusBar />
    </div>
  );
};

export default App;


