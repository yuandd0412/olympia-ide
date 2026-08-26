import { invoke } from '@tauri-apps/api/core';
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
};


