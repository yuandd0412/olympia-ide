import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { save as saveFileDialogApi } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import type {
  AppSettings,
  ChatMessage,

  Problem,
  RunResult,
  SolveRecord,
  StressTestResult,
  TestCaseInput,
  TrainingSession,
} from '../types';

export interface ToolchainStatus {
  /** "bundled" | "appdata" | "system" | "none" */
  variant: string;
  gppPath: string | null;
  version: string | null;
}

export interface ToolchainProgress {
  phase: 'download' | 'verify' | 'extract';
  downloaded: number;
  total: number | null;
}

export function onToolchainProgress(handler: (p: ToolchainProgress) => void) {
  return listen<ToolchainProgress>('olympia://toolchain-progress', (e) => handler(e.payload));
}

export const tauriApi = {
  async getSettings(): Promise<AppSettings> {
    try {
      return await invoke<AppSettings>('get_settings');
    } catch {
      return {
        theme: 'OneDarkPro',
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
      };
    }
  },

  async updateSettings(settings: AppSettings): Promise<void> {
    await invoke('update_settings', { settings });
  },

  async getProblems(): Promise<Problem[]> {
    return await invoke<Problem[]>('get_problems');
  },

  async saveProblemsList(problems: Problem[]): Promise<void> {
    await invoke('save_problems_list', { problems });
  },

  async fetchProblemOnline(problemId: string): Promise<Problem> {
    return await invoke<Problem>('fetch_problem_online', { problemId });
  },

  async toggleFavoriteProblem(problemId: string): Promise<Problem[]> {
    return await invoke<Problem[]>('toggle_favorite_problem', { problemId });
  },

  

  async getSolves(): Promise<SolveRecord[]> {
    return await invoke<SolveRecord[]>('get_solves');
  },

  async recordSolveEntry(solve: SolveRecord): Promise<SolveRecord[]> {
    return await invoke<SolveRecord[]>('record_solve_entry', { solve });
  },

  async getSessions(): Promise<TrainingSession[]> {
    return await invoke<TrainingSession[]>('get_sessions');
  },

  async saveSessionsList(sessions: TrainingSession[]): Promise<void> {
    await invoke('save_sessions_list', { sessions });
  },

  async runCode(
    sourceCode: string,
    testcases: TestCaseInput[],
    compilerPath?: string,
    flags?: string[],
    timeLimitMs?: number
  ): Promise<RunResult> {
    return await invoke<RunResult>('run_code', {
      sourceCode,
      testcases,
      compilerPath,
      flags,
      timeLimitMs,
    });
  },

  async runStressTest(
    solCode: string,
    bruteCode: string,
    genCode: string,
    maxRounds: number,
    timeLimitMs?: number,
    compilerPath?: string,
    flags?: string[]
  ): Promise<StressTestResult> {
    return await invoke<StressTestResult>('run_stress_test', {
      solCode,
      bruteCode,
      genCode,
      maxRounds,
      timeLimitMs,
      compilerPath,
      flags,
    });
  },

  async writeTempCode(code: string, extension: string): Promise<{ srcPath: string, exePath: string }> {
    return await invoke('write_temp_code', { code, extension });
  },

  async checkSyntax(code: string, compilerPath: string, compilerFlags: string[]): Promise<any[]> {
    return await invoke('check_syntax', { code, compilerPath, compilerFlags });
  },

  async openUrl(url: string): Promise<void> {
    try {
      await invoke('open_url', { url });
    } catch (e) {
      console.error('Failed to open url:', e);
      window.open(url, '_blank');
    }
  },

  async runTerminalCommand(
    command: string,
    cwd?: string
  ): Promise<{ exitCode: number; stdout: string; stderr: string; durationMs: number }> {
    return await invoke('run_terminal_command', {
      command,
      cwd,
    });
  },

  async chatWithAi(
    messages: ChatMessage[],
    baseUrl?: string,
    apiKey?: string,
    model?: string
  ): Promise<string> {
    return await invoke<string>('chat_with_ai', {
      messages,
      baseUrl,
      apiKey,
      model,
    });
  },

  async detectToolchain(): Promise<ToolchainStatus> {
    return await invoke<ToolchainStatus>('detect_toolchain');
  },

  /** Dev-C++ style run: compile headlessly, then open an interactive CMD window. */
  async runConsole(sourceCode: string, compilerPath?: string, flags?: string[]): Promise<string> {
    return await invoke<string>('run_in_console', {
      sourceCode,
      compilerPath,
      flags,
    });
  },

  /** 弹出系统"保存文件"对话框;返回所选绝对路径,取消返回 null */
  async saveFileDialog(defaultName: string): Promise<string | null> {
    const path = await saveFileDialogApi({
      defaultPath: defaultName,
      filters: [{ name: 'C++ 源文件', extensions: ['cpp', 'cc', 'cxx', 'h', 'hpp'] }],
    });
    return path ?? null;
  },

  async writeFile(path: string, contents: string): Promise<void> {
    await writeTextFile(path, contents);
  },

  /** Downloads (with CN mirror fallback), verifies and extracts the pinned MinGW toolchain. */
  async installToolchain(): Promise<ToolchainStatus> {
    return await invoke<ToolchainStatus>('install_toolchain');
  },
};


