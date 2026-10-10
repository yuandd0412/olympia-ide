import { create } from 'zustand';
import { tauriApi } from '../services/tauriApi';
import type {
  AppSettings,
  CodeTab,
  NavTab,
  PracticeProblem,
  PracticeRecord,
  Problem,
  SolveRecord,
  StressTestResult,
  TestCaseInput,
} from '../types';
import type { ExtractedProblem } from '../ports/document';

type ProblemFileMap = Record<string, string>;

const RECORDS_KEY = 'olympia-practice-records';
const PROBLEM_FILES_KEY = 'olympia-problem-files';

/** 题目 → 该题最近一次保存的文件路径（题目与文件绑定） */
const loadProblemFiles = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(PROBLEM_FILES_KEY) || '{}');
  } catch {
    return {};
  }
};

const persistProblemFiles = (m: Record<string, string>) => {
  try {
    localStorage.setItem(PROBLEM_FILES_KEY, JSON.stringify(m));
  } catch {}
};
const ACTIVE_RECORD_KEY = 'olympia-active-record';
const CONTEST_END_KEY = 'olympia-contest-end-time';

const loadRecords = (): PracticeRecord[] => {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    return raw ? (JSON.parse(raw) as PracticeRecord[]) : [];
  } catch {
    return [];
  }
};

const persistRecords = (records: PracticeRecord[]) => {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {}
};

/**
 * Rehydrate the contest deadline after a restart.
 * Primary source: the dedicated localStorage key (covers contests started
 * from Settings, which have no PracticeRecord). Fallback: any still-running
 * contest record persisted before that key existed.
 */
const loadContestEndTime = (records: PracticeRecord[]): number | null => {
  try {
    const raw = localStorage.getItem(CONTEST_END_KEY);
    if (raw) {
      const t = Number(raw);
      if (Number.isFinite(t) && t > Date.now()) return t;
      localStorage.removeItem(CONTEST_END_KEY);
    }
  } catch {}
  const activeId = localStorage.getItem(ACTIVE_RECORD_KEY);
  const ordered = [
    ...records.filter((r) => r.id === activeId),
    ...records.filter((r) => r.id !== activeId),
  ];
  for (const r of ordered) {
    if (r.type === 'contest' && typeof r.contestEndTime === 'number' && r.contestEndTime > Date.now()) {
      return r.contestEndTime;
    }
  }
  return null;
};

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

  /** True once loadInitialData has fetched persisted state — gate first-run UI on this. */
  hydrated: boolean;

  // UI Search & Filter state
  isDetailModalOpen: boolean;
  modalProblem: Problem | null;
  searchQuery: string;
  selectedDifficulty: string;
  selectedVerdict: string;

  // Actions
  setActiveNav: (nav: NavTab) => void;
  loadInitialData: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  
  // Tab Actions
  openNewTab: (title?: string, code?: string, problemId?: string, testcases?: TestCaseInput[], filePath?: string) => string;
  closeTab: (tabId: string) => void;
  closeAllTabs: () => void;
  saveActiveTab: () => Promise<boolean>;
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

  // Problem & Viewer Actions
  setActiveProblem: (problem: Problem) => Promise<void>;
  toggleFavorite: (problemId: string) => Promise<void>;
  fetchOnlineProblem: (problemId: string) => Promise<Problem>;
  openProblemModal: (problem: Problem) => void;
  closeProblemModal: () => void;
  setViewerPdfUrl: (url: string | null) => void;
  setViewerProblem: (problem: Problem | null) => void;

  // Practice Records (题集 / 比赛)
  practiceRecords: PracticeRecord[];
  activeRecordId: string | null;
  createPracticeRecord: (rec: PracticeRecord) => void;
  updatePracticeRecord: (id: string, patch: Partial<PracticeRecord>) => void;
  deletePracticeRecord: (id: string) => void;
  setActiveRecordId: (id: string | null) => void;
  addPracticeProblem: (recordId: string, problem: PracticeProblem) => void;
  updatePracticeProblem: (recordId: string, problemId: string, patch: Partial<PracticeProblem>) => void;
  removePracticeProblem: (recordId: string, problemId: string) => void;
  importPdfProblems: (record: PracticeRecord, extracted: ExtractedProblem[]) => Promise<void>;

  // 题目与文件绑定：打开题目时优先拉取上次写过的文件
  problemFiles: ProblemFileMap;
  bindProblemFile: (problemId: string, path: string) => void;

  // 瞬时 UI 状态：在线抓题期间（题面侧栏显示骨架）；保存成功提示（状态栏）
  importingProblem: boolean;
  saveHint: string | null;
  setSaveHint: (msg: string | null) => void;

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

// Set when the user changes settings while loadInitialData is still in flight
// (settings UI is not hydration-gated). The backend snapshot that hydration
// resolves with can predate that change, so it must not clobber it.
let settingsTouchedDuringHydration = false;

const initialRecords = loadRecords();

export const useAppStore = create<AppState>((set, get) => ({
  contestEndTime: loadContestEndTime(initialRecords),
  setContestEndTime: (timeMs) => {
    try {
      if (timeMs === null) localStorage.removeItem(CONTEST_END_KEY);
      else localStorage.setItem(CONTEST_END_KEY, String(timeMs));
    } catch {}
    // Clearing must also wipe persisted record deadlines, otherwise a
    // voluntary early exit would resurrect the contest on next launch.
    const records = get().practiceRecords;
    if (timeMs === null && records.some((r) => r.contestEndTime)) {
      const updated = records.map((r) => (r.contestEndTime ? { ...r, contestEndTime: null } : r));
      persistRecords(updated);
      set({ contestEndTime: null, practiceRecords: updated });
      return;
    }
    set({ contestEndTime: timeMs });
  },
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
      title: 'main.cpp',
      code: '',
      isModified: false,
      testcases: [],
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
  hydrated: false,

  isDetailModalOpen: false,
  modalProblem: null,

  problemFiles: loadProblemFiles(),

  importingProblem: false,
  saveHint: null,
  setSaveHint: (msg) => {
    set({ saveHint: msg });
    if (msg) {
      setTimeout(() => {
        // 只清除自己设置的这条提示，避免误清新提示
        if (get().saveHint === msg) set({ saveHint: null });
      }, 3500);
    }
  },

  bindProblemFile: (problemId, path) => {
    const m = { ...get().problemFiles, [problemId]: path };
    persistProblemFiles(m);
    set({ problemFiles: m });
  },


  practiceRecords: initialRecords,
  activeRecordId: localStorage.getItem(ACTIVE_RECORD_KEY) || null,

  createPracticeRecord: (rec) => {
    const records = [rec, ...get().practiceRecords];
    persistRecords(records);
    localStorage.setItem(ACTIVE_RECORD_KEY, rec.id);
    set({ practiceRecords: records, activeRecordId: rec.id });
  },

  updatePracticeRecord: (id, patch) => {
    const records = get().practiceRecords.map((r) => (r.id === id ? { ...r, ...patch } : r));
    persistRecords(records);
    set({ practiceRecords: records });
  },

  deletePracticeRecord: (id) => {
    const records = get().practiceRecords.filter((r) => r.id !== id);
    persistRecords(records);
    const activeRecordId = get().activeRecordId === id ? null : get().activeRecordId;
    if (activeRecordId === null) localStorage.removeItem(ACTIVE_RECORD_KEY);
    set({ practiceRecords: records, activeRecordId });
  },

  setActiveRecordId: (id) => {
    if (id === null) localStorage.removeItem(ACTIVE_RECORD_KEY);
    else localStorage.setItem(ACTIVE_RECORD_KEY, id);
    set({ activeRecordId: id });
  },

  addPracticeProblem: (recordId, problem) => {
    const records = get().practiceRecords.map((r) =>
      r.id === recordId ? { ...r, problems: [...r.problems, problem] } : r
    );
    persistRecords(records);
    set({ practiceRecords: records });
  },

  updatePracticeProblem: (recordId, problemId, patch) => {
    const records = get().practiceRecords.map((r) =>
      r.id === recordId
        ? { ...r, problems: r.problems.map((p) => (p.id === problemId ? { ...p, ...patch } : p)) }
        : r
    );
    persistRecords(records);
    set({ practiceRecords: records });
  },

  removePracticeProblem: (recordId, problemId) => {
    const records = get().practiceRecords.map((r) =>
      r.id === recordId ? { ...r, problems: r.problems.filter((p) => p.id !== problemId) } : r
    );
    persistRecords(records);
    set({ practiceRecords: records });
  },

  importPdfProblems: async (record, extracted) => {
    const short = record.id.replace(/-/g, '').slice(0, 6);
    const prefix = record.type === 'contest' ? `CT-${short}-` : `PS-${short}-`;
    // 去重：同一记录重复识别时，先移除旧的 PDF 题目条目
    const kept = get().problems.filter((p) => !p.id.startsWith(prefix));
    const newProblems: Problem[] = extracted.map((p, i) => ({
      id: `${prefix}${i + 1}`,
      title: p.title,
      oj: 'PDF',
      difficulty: '暂无',
      tags: [record.name],
      timeLimitMs: 1000,
      memoryLimitKb: 262144,
      descriptionMd: p.text || '（该题文本提取为空，请通过页码跳转查看 PDF 原文。）',
      inputFormat: '',
      outputFormat: '',
      samples: [],
      hint: '',
      sourceUrl: '',
      isFavorite: false,
    }));
    const problems = [...kept, ...newProblems];
    try {
      await tauriApi.saveProblemsList(problems);
    } catch (err) {
      console.error('Failed to persist PDF problems:', err);
    }
    const mapped = extracted.map((p, i) => ({
      id: newProblems[i].id,
      title: p.title,
      pageStart: p.pageStart,
      pageEnd: p.pageEnd,
    }));
    const records = get().practiceRecords.map((r) =>
      r.id === record.id ? { ...r, problems: mapped } : r
    );
    persistRecords(records);
    set({ problems, practiceRecords: records });
  },

  searchQuery: '',
  selectedDifficulty: '全部',
  selectedVerdict: '全部',

  setActiveNav: (nav) => set({ activeNav: nav }),

  loadInitialData: async () => {
    try {
      const [loadedSettings, problems, solves] = await Promise.all([
        tauriApi.getSettings(),
        tauriApi.getProblems(),
        tauriApi.getSolves(),
      ]);

      // 水合期间用户可能已在设置页/向导里改过主题（设置页不受 hydrated 门控），
      // 而 Promise.all 返回的后端快照可能是写入前的旧读数。此时以 localStorage
      // 里更新的选择为准，避免旧快照把刚选的主题覆盖回深色（首次配置时
      // “编辑器保持黑色”的根源）。
      let settings = loadedSettings;
      if (settingsTouchedDuringHydration) {
        settingsTouchedDuringHydration = false;
        settings = { ...loadedSettings, theme: getSavedTheme() };
      }

      const activeP = problems[0] || null;
      // 全新安装不再预置任何示例数据，用例列表从空白开始
      let initialTestcases: TestCaseInput[] = [{ id: 1, input: '', expectedOutput: '' }];
      if (activeP && activeP.samples.length > 0) {
        initialTestcases = activeP.samples.map((s, idx) => ({
          id: idx + 1,
          input: s.input,
          expectedOutput: s.output,
        }));
      }

      // 启动首标签页也要磁盘优先：绑定/练习文件夹里已有该题的文件时读入。
      // 否则首标签页无 filePath，Ctrl+R 的「编译=保存」会把模板覆盖写回
      // 练习根目录里的 {题号}.cpp，毁掉用户真实解答（数据丢失）。
      let initialCode = settings.enableCodeTemplate ? (settings.codeTemplate || '') : '';
      let initialTitle = activeP ? activeP.id + '.cpp' : 'solution.cpp';
      let initialFilePath: string | undefined;
      if (activeP) {
        const bound = get().problemFiles[activeP.id];
        const diskPath = bound || (await tauriApi.resolveProblemFile(activeP.id).catch(() => null));
        if (diskPath) {
          try {
            initialCode = await tauriApi.readFile(diskPath);
            initialFilePath = diskPath;
            initialTitle = diskPath.split(/[\\/]/).pop() || initialTitle;
          } catch {
            /* 文件不可读 → 退回模板 */
          }
        }
      }

      set({
        settings,
        problems,
        activeProblem: activeP,
        tabs: [
          {
            id: 'tab-1',
            title: initialTitle,
            code: initialCode,
            isModified: false,
            filePath: initialFilePath,
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
    if (!get().hydrated) settingsTouchedDuringHydration = true;
    const updated = { ...get().settings, ...newSettings };
    set({ settings: updated });
    document.documentElement.setAttribute('data-theme', updated.theme);
    try {
      localStorage.setItem('olympia-saved-theme', updated.theme);
    } catch {}
    await tauriApi.updateSettings(updated);
  },

  openNewTab: (title, code, problemId, testcases, filePath) => {
    const currentTabs = get().tabs;
    const nextNum = currentTabs.length + 1;
    const tabId = 'tab-' + crypto.randomUUID();
    const defaultContent = get().settings.enableCodeTemplate ? (get().settings.codeTemplate || '') : '';

    const newTab: CodeTab = {
      id: tabId,
      title: title || ('solution_' + nextNum + '.cpp'),
      code: code !== undefined ? code : defaultContent,
      isModified: false,
      filePath,
      problemId,
      testcases: testcases || [{ id: 1, input: '', expectedOutput: '' }],
      runResult: null,
    };
    set({
      tabs: [...currentTabs, newTab],
      activeTabId: tabId,
      activeNav: 'editor',
      // 未绑定题目的标签页 = 自由练习，不继承上一个题目
      ...(problemId === undefined ? { activeProblem: null } : {}),
    });
    return tabId;
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    const target = tabs.find((t) => t.id === tabId);
    // 防数据丢失：未保存的改动直接关掉就没了，先确认
    if (target && (target.isModified || (!target.filePath && target.code.trim()))) {
      if (!window.confirm(`「${target.title}」有未保存的更改，确定关闭？`)) return;
    }
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
    const { tabs } = get();
    const dirty = tabs.some((t) => t.isModified || (!t.filePath && t.code.trim()));
    if (dirty && !window.confirm(`有 ${tabs.length} 个标签页存在未保存的更改，全部关闭？`)) return;
    set({ tabs: [], activeTabId: '' });
  },

  saveActiveTab: async () => {
    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return false;

    try {
      // 首次保存（或未落盘过的标签页）：练习根目录已设置 → 直接写
      // {root}/{题号}.cpp，不弹对话框；未设置根目录才弹系统保存对话框
      let path: string | null | undefined = activeTab.filePath;
      if (!path) {
        const defaultPath = await tauriApi.defaultSavePath(activeTab.problemId || '', activeTab.title);
        if (defaultPath) {
          path = defaultPath;
        } else {
          path = await tauriApi.saveFileDialog(activeTab.title.endsWith('.cpp') ? activeTab.title : `${activeTab.title}.cpp`);
          if (!path) return false; // 用户取消
        }
      }
      await tauriApi.writeFile(path, activeTab.code);

      const fileName = path.split(/[\\/]/).pop() || activeTab.title;
      const savedPath = path;
      // 用保存期间最新的 tabs 快照（保存要跨多个 await，期间标签页可能被关闭，
      // 旧快照会把已关闭的标签页“复活”）
      const updated = get().tabs.map((t) =>
        t.id === activeTabId ? { ...t, isModified: false, filePath: savedPath, title: fileName } : t
      );
      set({ tabs: updated });
      // 题目与文件绑定：下次打开这道题直接拉取这个文件
      if (activeTab.problemId) {
        get().bindProblemFile(activeTab.problemId, savedPath);
      }
      // 状态栏瞬时提示保存路径（无全局 toast 系统，复用状态栏）
      get().setSaveHint(`已保存：${savedPath}`);
      return true;
    } catch (err) {
      console.error('Failed to save file:', err);
      window.alert(`保存失败：${String(err)}`);
      return false;
    }
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

    // 编译 = 保存：脏标签页（或从未落盘的标签页）先写盘，用户取消保存则中止运行
    if (activeTab.isModified || !activeTab.filePath) {
      const saved = await get().saveActiveTab();
      if (!saved) return;
    }

    set({ isRunning: true });

    try {
      // 终端优先模式暂已隐藏（交互与焦点缺陷待修），恢复前一律走内置评测
      const res = await tauriApi.runCode(
        activeTab.code,
        activeTab.testcases,
        settings.compilerPath,
        settings.compilerFlags,
        activeProblem ? activeProblem.timeLimitMs : 1000,
        activeProblem ? activeProblem.memoryLimitKb : 262144
      );

      // 评测耗时数秒，期间用户可能新开/关闭/编辑其它标签页——
      // 必须基于最新 tabs 快照写回，否则那些变更会被整体回滚
      const updatedTabs = get().tabs.map((t) =>
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
      const updatedTabs = get().tabs.map((t) =>
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

    // 与 addTestcase 相同的 id 规则：max+1，避免删过用例后 length+1 撞 id
    const nextId = activeTab.testcases.length > 0
      ? Math.max(...activeTab.testcases.map((t) => t.id)) + 1
      : 1;
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

  setActiveProblem: async (problem) => {
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
      // 题目与文件绑定：这道题之前写过 → 直接从磁盘拉取那个文件
      const boundPath = get().problemFiles[problem.id];
      if (boundPath) {
        try {
          const code = await tauriApi.readFile(boundPath);
          const fileName = boundPath.split(/[\\/]/).pop() || problem.id + '.cpp';
          openNewTab(fileName, code, problem.id, testcases, boundPath);
          set({
            activeProblem: problem,
            viewerProblem: problem,
            activeNav: 'editor',
          });
          return;
        } catch {
          // 文件已不存在（被移动/删除）→ 继续走新建流程
        }
      }
      // 练习根目录兜底：目录里已有该题号的文件（任意深度）→ 直接读入，不弹另存为
      try {
        const resolvedPath = await tauriApi.resolveProblemFile(problem.id);
        if (resolvedPath) {
          const code = await tauriApi.readFile(resolvedPath);
          const fileName = resolvedPath.split(/[\\/]/).pop() || problem.id + '.cpp';
          openNewTab(fileName, code, problem.id, testcases, resolvedPath);
          get().bindProblemFile(problem.id, resolvedPath);
          set({
            activeProblem: problem,
            viewerProblem: problem,
            activeNav: 'editor',
          });
          return;
        }
      } catch {
        // 读取失败（被移动/权限）→ 继续走新建流程
      }
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
    set({ importingProblem: true });
    try {
      const p = await tauriApi.fetchProblemOnline(problemId);
      const existing = get().problems.filter((x) => x.id !== p.id);
      const updated = [p, ...existing];
      await tauriApi.saveProblemsList(updated);
      set({ problems: updated });
      return p;
    } finally {
      set({ importingProblem: false });
    }
  },

  openProblemModal: (problem) => set({ isDetailModalOpen: true, modalProblem: problem }),
  closeProblemModal: () => set({ isDetailModalOpen: false, modalProblem: null }),

  setViewerPdfUrl: (url) => set({ viewerPdfUrl: url }),
  setViewerProblem: (problem) => set({ viewerProblem: problem }),

  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedDifficulty: (d) => set({ selectedDifficulty: d }),
  setSelectedVerdict: (v) => set({ selectedVerdict: v }),
}));
