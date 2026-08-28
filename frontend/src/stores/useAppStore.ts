import { create } from 'zustand';
import { tauriApi } from '../services/tauriApi';
import type {
  AppSettings,
  CodeTab,
  NavTab,
  Problem,
  SolveRecord,
  StressTestResult,
  TestCaseInput,
} from '../types';

const DEFAULT_BRUTE_CPP = `#include <iostream>
using namespace std;

// 暴力 / 保证正确的基准代码 (Standard / Brute-force)
int main() {
    long long a, b;
    if (cin >> a >> b) {
        cout << a + b << endl;
    }
    return 0;
}
`;

const DEFAULT_GEN_CPP = `#include <iostream>
#include <random>
#include <chrono>

using namespace std;

// 随机测试数据生成器 (Testcase Generator)
int main() {
    mt19937_64 rng(chrono::steady_clock::now().time_since_epoch().count());
    uniform_int_distribution<long long> dist(1, 1000000000);
    
    long long a = dist(rng);
    long long b = dist(rng);
    cout << a << " " << b << "\n";
    return 0;
}
`;

interface AppState {
  contestEndTime: number | null;
  setContestEndTime: (timeMs: number | null) => void;
  activeNav: NavTab;
  settings: AppSettings;
  problems: Problem[];
  activeProblem: Problem | null;

  // Multi-tab Code Editor state
  tabs: CodeTab[];
  activeTabId: string;

  isRunning: boolean;
  
  solves: SolveRecord[];
  
  // Stress Tester (对拍器) State
  stressSolCode: string;
  stressBruteCode: string;
  stressGenCode: string;
  stressMaxRounds: number;
  stressResult: StressTestResult | null;
  isStressRunning: boolean;

  // PDF & Markdown Problem Viewer state
  viewerPdfUrl: string | null;
  viewerProblem: Problem | null;

  // Integrated Terminal State
  terminalLogs: import('../types').TerminalLog[];
  terminalHistory: string[];
  isTerminalRunning: boolean;
  /** True once loadInitialData has fetched persisted state — gate first-run UI on this. */
  hydrated: boolean;

  // UI Search & Filter state
  isDetailModalOpen: boolean;
  modalProblem: Problem | null;
  searchQuery: string;
  selectedDifficulty: string;
  selectedVerdict: string;
  terminalRunSignal: number;

  // Actions
  setActiveNav: (nav: NavTab) => void;
  loadInitialData: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  
  // Tab Actions
  openNewTab: (title?: string, code?: string, problemId?: string, testcases?: TestCaseInput[]) => string;
  closeTab: (tabId: string) => void;
  closeAllTabs: () => void;
  saveActiveTab: () => Promise<void>;
  setActiveTabId: (tabId: string) => void;
  updateActiveCode: (code: string) => void;
  updateTabTitle: (tabId: string, title: string) => void;
  
  // Testcase Actions
  addTestcase: () => void;
  updateTestcase: (id: number, input: string, expectedOutput: string) => void;
  removeTestcase: (id: number) => void;
  
  // Runner & Stress Actions
  runCodeAction: () => Promise<void>;
  setStressSolCode: (code: string) => void;
  setStressBruteCode: (code: string) => void;
  setStressGenCode: (code: string) => void;
  setStressMaxRounds: (rounds: number) => void;
  runStressAction: () => Promise<void>;
  importStressFailToRunner: () => void;

  // Terminal Actions
  executeTerminalCommand: (command: string) => Promise<void>;
  clearTerminal: () => void;

  // Problem & Viewer Actions
  setActiveProblem: (problem: Problem) => void;
  toggleFavorite: (problemId: string) => Promise<void>;
  fetchOnlineProblem: (problemId: string) => Promise<Problem>;
  openProblemModal: (problem: Problem) => void;
  closeProblemModal: () => void;
  setViewerPdfUrl: (url: string | null) => void;
  setViewerProblem: (problem: Problem | null) => void;

  // Filters
  setSearchQuery: (q: string) => void;
  setSelectedDifficulty: (d: string) => void;
  setSelectedVerdict: (v: string) => void;
}

const getSavedTheme = (): import('../types').ThemeType => {
  try {
    const saved = localStorage.getItem('olympia-saved-theme');
    if (saved === 'GitHubLight' || saved === 'OneDarkPro') return saved;
  } catch {}
  return 'OneDarkPro';
};

export const useAppStore = create<AppState>((set, get) => ({
  contestEndTime: null,
  setContestEndTime: (timeMs) => set({ contestEndTime: timeMs }),
  activeNav: 'editor',
  settings: {
    isFirstRun: true,
    theme: getSavedTheme(),
    compilerPath: 'g++',
    compilerFlags: ['-O2', '-std=c++17', '-Wall', '-Wextra'],
    enableCodeTemplate: false,
    codeTemplate: '',
    aiBaseUrl: 'https://api.openai.com/v1',
    aiApiKey: '',
    aiModel: 'gpt-4o-mini',
    preferTerminalRun: false,
    dailyGoal: 5,
    autoSave: true,
    fontSize: 14,
    fontFamily: 'Cascadia Mono',
  },
  problems: [],
  activeProblem: null,

  tabs: [
    {
      id: 'tab-1',
      title: 'P1001.cpp',
      code: '',
      isModified: false,
      problemId: 'P1001',
      testcases: [{ id: 1, input: '20 30', expectedOutput: '50' }],
      runResult: null,
    },
  ],
  activeTabId: 'tab-1',

  isRunning: false,
  solves: [],

  // Stress testing initial state
  stressSolCode: '',
  stressBruteCode: DEFAULT_BRUTE_CPP,
  stressGenCode: DEFAULT_GEN_CPP,
  stressMaxRounds: 50,
  stressResult: null,
  isStressRunning: false,

  viewerPdfUrl: null,
  viewerProblem: null,

  // Integrated Terminal Initial State
  terminalLogs: [
    {
      id: 'init-1',
      command: 'g++ --version',
      stdout: 'g++ (MinGW-W64 x86_64-posix-seh) 13.1.0\nCopyright (C) 2023 Free Software Foundation, Inc.',
      stderr: '',
      exitCode: 0,
      timestamp: new Date().toLocaleTimeString(),
      durationMs: 12,
    },
  ],
  terminalHistory: ['g++ --version'],
  isTerminalRunning: false,
  hydrated: false,

  isDetailModalOpen: false,
  modalProblem: null,
  searchQuery: '',
  selectedDifficulty: '全部',
  selectedVerdict: '全部',

  setActiveNav: (nav) => set({ activeNav: nav }),

  loadInitialData: async () => {
    try {
      const [settings, problems, solves] = await Promise.all([
        tauriApi.getSettings(),
        tauriApi.getProblems(),
        tauriApi.getSolves(),
      ]);

      const activeP = problems[0] || null;
      let initialTestcases: TestCaseInput[] = [{ id: 1, input: '20 30', expectedOutput: '50' }];
      if (activeP && activeP.samples.length > 0) {
        initialTestcases = activeP.samples.map((s, idx) => ({
          id: idx + 1,
          input: s.input,
          expectedOutput: s.output,
        }));
      }

      const initialCode = settings.enableCodeTemplate ? (settings.codeTemplate || '') : '';

      set({
        settings,
        problems,
        activeProblem: activeP,
        tabs: [
          {
            id: 'tab-1',
            title: activeP ? (activeP.id + '.cpp') : 'solution.cpp',
            code: initialCode,
            isModified: false,
            problemId: activeP ? activeP.id : undefined,
            testcases: initialTestcases,
            runResult: null,
          },
        ],
        activeTabId: 'tab-1',
        viewerProblem: activeP,
        solves,
        hydrated: true,
      });

      document.documentElement.setAttribute('data-theme', settings.theme);
      try {
        localStorage.setItem('olympia-saved-theme', settings.theme);
      } catch {}
    } catch (err) {
      console.error('Failed to load initial data:', err);
      set({ hydrated: true });
    }
  },

  updateSettings: async (newSettings) => {
    const updated = { ...get().settings, ...newSettings };
    set({ settings: updated });
    document.documentElement.setAttribute('data-theme', updated.theme);
    try {
      localStorage.setItem('olympia-saved-theme', updated.theme);
    } catch {}
    await tauriApi.updateSettings(updated);
  },

  openNewTab: (title, code, problemId, testcases) => {
    const currentTabs = get().tabs;
    const nextNum = currentTabs.length + 1;
    const tabId = 'tab-' + crypto.randomUUID();
    const defaultContent = get().settings.enableCodeTemplate ? (get().settings.codeTemplate || '') : '';

    const newTab: CodeTab = {
      id: tabId,
      title: title || ('solution_' + nextNum + '.cpp'),
      code: code !== undefined ? code : defaultContent,
      isModified: false,
      problemId,
      testcases: testcases || [{ id: 1, input: '', expectedOutput: '' }],
      runResult: null,
    };
    set({
      tabs: [...currentTabs, newTab],
      activeTabId: tabId,
      activeNav: 'editor',
    });
    return tabId;
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    const filtered = tabs.filter((t) => t.id !== tabId);
    let nextActive = '';
    if (filtered.length > 0) {
      if (activeTabId === tabId) {
        const idx = tabs.findIndex((t) => t.id === tabId);
        const nextIdx = Math.max(0, idx - 1);
        nextActive = filtered[nextIdx]?.id || filtered[0].id;
      } else {
        nextActive = activeTabId;
      }
    }
    set({ tabs: filtered, activeTabId: nextActive });
  },

  closeAllTabs: () => {
    set({ tabs: [], activeTabId: '' });
  },

  saveActiveTab: async () => {
    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    const updated = tabs.map((t) =>
      t.id === activeTabId ? { ...t, isModified: false } : t
    );
    set({ tabs: updated });
  },

  setActiveTabId: (tabId) => set({ activeTabId: tabId }),

  updateActiveCode: (newCode) => {
    const { tabs, activeTabId } = get();
    const updated = tabs.map((t) =>
      t.id === activeTabId ? { ...t, code: newCode, isModified: true } : t
    );
    set({ tabs: updated });
  },

  updateTabTitle: (tabId, title) => {
    const { tabs } = get();
    const updated = tabs.map((t) => (t.id === tabId ? { ...t, title } : t));
    set({ tabs: updated });
  },

  addTestcase: () => {
    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;
    const currentTc = activeTab.testcases;
    const nextId = currentTc.length > 0 ? Math.max(...currentTc.map((t) => t.id)) + 1 : 1;
    const updatedTc = [...currentTc, { id: nextId, input: '', expectedOutput: '' }];
    const updatedTabs = tabs.map((t) =>
      t.id === activeTabId ? { ...t, testcases: updatedTc } : t
    );
    set({ tabs: updatedTabs });
  },

  updateTestcase: (id, input, expectedOutput) => {
    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;
    const updatedTc = activeTab.testcases.map((tc) =>
      tc.id === id ? { ...tc, input, expectedOutput } : tc
    );
    const updatedTabs = tabs.map((t) =>
      t.id === activeTabId ? { ...t, testcases: updatedTc } : t
    );
    set({ tabs: updatedTabs });
  },

  removeTestcase: (id) => {
    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;
    const updatedTc = activeTab.testcases.filter((tc) => tc.id !== id);
    const updatedTabs = tabs.map((t) =>
      t.id === activeTabId ? { ...t, testcases: updatedTc } : t
    );
    set({ tabs: updatedTabs });
  },

  runCodeAction: async () => {
    const { tabs, activeTabId, settings, activeProblem } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    set({ isRunning: true });

    try {
      const res = await tauriApi.runCode(
        activeTab.code,
        activeTab.testcases,
        settings.compilerPath,
        settings.compilerFlags,
        activeProblem ? activeProblem.timeLimitMs : 1000
      );

      const updatedTabs = tabs.map((t) =>
        t.id === activeTabId ? { ...t, runResult: res } : t
      );
      set({ tabs: updatedTabs, isRunning: false });

      if (activeProblem) {
        if (res.overallVerdict === 'AC') {
          const solve: SolveRecord = {
            id: crypto.randomUUID(),
            problemId: activeProblem.id,
            oj: activeProblem.oj,
            title: activeProblem.title,
            difficulty: activeProblem.difficulty,
            solvedAt: new Date().toISOString(),
            timeMs: res.totalTimeMs,
            memoryKb: res.maxMemoryKb,
            verdict: 'AC',
          };
          const updatedSolves = await tauriApi.recordSolveEntry(solve);
          set({ solves: updatedSolves });
        }
      }
    } catch (err) {
      const updatedTabs = tabs.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              runResult: {
                success: false,
                isCompilationError: true,
                compilerOutput: String(err),
                testcases: [],
                overallVerdict: 'CE',
                totalTimeMs: 0,
                maxMemoryKb: 0,
              },
            }
          : t
      );
      set({ tabs: updatedTabs, isRunning: false });
    }
  },

  setStressSolCode: (code) => set({ stressSolCode: code }),
  setStressBruteCode: (code) => set({ stressBruteCode: code }),
  setStressGenCode: (code) => set({ stressGenCode: code }),
  setStressMaxRounds: (rounds) => set({ stressMaxRounds: rounds }),

  runStressAction: async () => {
    const {
      stressSolCode,
      stressBruteCode,
      stressGenCode,
      stressMaxRounds,
      settings,
    } = get();

    set({ isStressRunning: true, stressResult: null });

    try {
      const res = await tauriApi.runStressTest(
        stressSolCode,
        stressBruteCode,
        stressGenCode,
        stressMaxRounds,
        2000,
        settings.compilerPath,
        settings.compilerFlags
      );
      set({ stressResult: res, isStressRunning: false });
    } catch (err) {
      set({
        isStressRunning: false,
        stressResult: {
          totalRounds: stressMaxRounds,
          passedRounds: 0,
          success: false,
          isCompilationError: true,
          compilerOutput: String(err),
          failedRound: null,
        },
      });
    }
  },

  importStressFailToRunner: () => {
    const { stressResult, tabs, activeTabId } = get();
    if (!stressResult || !stressResult.failedRound) return;
    const fail = stressResult.failedRound;

    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    const nextId = activeTab.testcases.length + 1;
    const updatedTc = [
      ...activeTab.testcases,
      {
        id: nextId,
        input: fail.input,
        expectedOutput: fail.bruteOutput,
      },
    ];

    const updatedTabs = tabs.map((t) =>
      t.id === activeTabId ? { ...t, testcases: updatedTc } : t
    );
    set({ tabs: updatedTabs, activeNav: 'editor' });
  },

  terminalRunSignal: 0,
  triggerTerminalRun: () => set((state) => ({ terminalRunSignal: state.terminalRunSignal + 1 })),
  executeTerminalCommand: async (command) => {
    if (!command.trim()) return;
    const { terminalLogs, terminalHistory } = get();

    if (command.trim().toLowerCase() === 'clear' || command.trim().toLowerCase() === 'cls') {
      set({ terminalLogs: [] });
      return;
    }

    set({ isTerminalRunning: true });

    try {
      const res = await tauriApi.runTerminalCommand(command);
      const newLog = {
        id: crypto.randomUUID(),
        command,
        stdout: res.stdout,
        stderr: res.stderr,
        exitCode: res.exitCode,
        timestamp: new Date().toLocaleTimeString(),
        durationMs: res.durationMs,
      };

      const updatedHistory = [command, ...terminalHistory.filter((c) => c !== command)].slice(0, 50);

      set({
        terminalLogs: [...terminalLogs, newLog],
        terminalHistory: updatedHistory,
        isTerminalRunning: false,
      });
    } catch (err) {
      const newLog = {
        id: crypto.randomUUID(),
        command,
        stdout: '',
        stderr: String(err),
        exitCode: -1,
        timestamp: new Date().toLocaleTimeString(),
        durationMs: 0,
      };
      set({
        terminalLogs: [...terminalLogs, newLog],
        isTerminalRunning: false,
      });
    }
  },

  clearTerminal: () => set({ terminalLogs: [] }),

  setActiveProblem: (problem) => {
    const testcases = problem.samples.map((s, idx) => ({
      id: idx + 1,
      input: s.input,
      expectedOutput: s.output,
    }));
    if (testcases.length === 0) {
      testcases.push({ id: 1, input: '', expectedOutput: '' });
    }

    const { tabs, openNewTab, setActiveTabId } = get();
    const existing = tabs.find((t) => t.problemId === problem.id);
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      const template = get().settings.enableCodeTemplate ? (get().settings.codeTemplate || '') : '';
      openNewTab(problem.id + '.cpp', template, problem.id, testcases);
    }

    set({
      activeProblem: problem,
      viewerProblem: problem,
      activeNav: 'editor',
    });
  },

  toggleFavorite: async (problemId) => {
    const updated = await tauriApi.toggleFavoriteProblem(problemId);
    set({ problems: updated });
  },

  fetchOnlineProblem: async (problemId) => {
    const p = await tauriApi.fetchProblemOnline(problemId);
    const existing = get().problems.filter((x) => x.id !== p.id);
    const updated = [p, ...existing];
    await tauriApi.saveProblemsList(updated);
    set({ problems: updated });
    return p;
  },

  openProblemModal: (problem) => set({ isDetailModalOpen: true, modalProblem: problem }),
  closeProblemModal: () => set({ isDetailModalOpen: false, modalProblem: null }),

  setViewerPdfUrl: (url) => set({ viewerPdfUrl: url }),
  setViewerProblem: (problem) => set({ viewerProblem: problem }),

  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedDifficulty: (d) => set({ selectedDifficulty: d }),
  setSelectedVerdict: (v) => set({ selectedVerdict: v }),
}));
