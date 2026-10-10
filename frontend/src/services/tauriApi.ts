import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open as openFileDialogApi, save as saveFileDialogApi } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
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

/** Mirrors the Rust `pdf_extract::ExtractedProblem` (camelCase serde). */
export interface ExtractedProblem {
  title: string;
  pageStart: number;
  pageEnd: number;
  text: string;
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
        isFirstRun: true,
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
    timeLimitMs?: number,
    memoryLimitKb?: number
  ): Promise<RunResult> {
    return await invoke<RunResult>('run_code', {
      sourceCode,
      testcases,
      compilerPath,
      flags,
      timeLimitMs,
      memoryLimitKb,
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

  /** Rust write_temp_code 只收 source_code，返回 (srcPath, exePath) 二元组 */
  async writeTempCode(code: string): Promise<{ srcPath: string, exePath: string }> {
    const [srcPath, exePath] = await invoke<[string, string]>('write_temp_code', { sourceCode: code });
    return { srcPath, exePath };
  },

  /** Rust 端参数名为 source_code / flags，invoke 键须用 camelCase: sourceCode / flags */
  async checkSyntax(code: string, compilerPath: string, compilerFlags: string[]): Promise<any[]> {
    return await invoke('check_syntax', { sourceCode: code, compilerPath, flags: compilerFlags });
  },

  async openUrl(url: string): Promise<void> {
    try {
      await invoke('open_url', { url });
    } catch (e) {
      console.error('Failed to open url:', e);
      window.open(url, '_blank');
    }
  },

  async chatWithAi(
    messages: ChatMessage[],
    baseUrl?: string,
    apiKey?: string,
    model?: string,
    context?: string
  ): Promise<string> {
    return await invoke<string>('chat_with_ai', {
      messages,
      baseUrl,
      apiKey,
      model,
      context,
    });
  },

  /** 后端 chats.json；命令未实现时返回 null（前端降级为仅内存） */
  async loadChats(): Promise<ChatMessage[] | null> {
    try {
      return await invoke<ChatMessage[]>('load_chats');
    } catch {
      return null;
    }
  },

  async saveChats(messages: ChatMessage[]): Promise<void> {
    try {
      await invoke('save_chats', { messages });
    } catch {
      /* backend not ready yet */
    }
  },

  /** List local Ollama models; empty array if unreachable. */
  async listOllamaModels(baseUrl?: string): Promise<string[]> {
    try {
      return await invoke<string[]>('list_ollama_models', { baseUrl });
    } catch {
      return [];
    }
  },

  /** Tiny completion probe; returns ok or a short error. */
  async probeAiEndpoint(baseUrl: string, apiKey: string, model: string): Promise<string> {
    return await invoke<string>('probe_ai_endpoint', { baseUrl, apiKey, model });
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

  async readFile(path: string): Promise<string> {
    return await readTextFile(path);
  },

  /** 练习文件夹：系统目录选择对话框；取消返回 null */
  async pickPracticeFolder(): Promise<string | null> {
    try {
      return (await invoke<string | null>('pick_practice_folder')) ?? null;
    } catch {
      return null;
    }
  },

  async getPracticeFolder(): Promise<string | null> {
    try {
      return (await invoke<string | null>('get_practice_folder')) ?? null;
    } catch {
      return null;
    }
  },

  async setPracticeFolder(path: string): Promise<void> {
    await invoke('set_practice_folder', { path });
  },

  /** 练习根目录下递归找 {题号}.cpp 等；未设置根目录或无命中返回 null */
  async resolveProblemFile(problemId: string): Promise<string | null> {
    try {
      return (await invoke<string | null>('resolve_problem_file', { problemId })) ?? null;
    } catch {
      return null;
    }
  },

  /** 默认保存路径 {practiceRoot}/{题号}.cpp；未设置根目录返回空串 */
  async defaultSavePath(problemId: string, title: string): Promise<string> {
    try {
      return await invoke<string>('default_save_path', { problemId, title });
    } catch {
      return '';
    }
  },

  /** Downloads (with CN mirror fallback), verifies and extracts the pinned MinGW toolchain. */
  async installToolchain(): Promise<ToolchainStatus> {
    return await invoke<ToolchainStatus>('install_toolchain');
  },

  /** 弹出系统"打开文件"对话框选 PDF；返回绝对路径,取消返回 null */
  async pickPdfFile(): Promise<string | null> {
    try {
      return (
        (await openFileDialogApi({
          multiple: false,
          filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
        })) ?? null
      );
    } catch {
      return null;
    }
  },

  /** 本地 PDF 的 iframe 预览地址（asset 协议）；仅可用于已选定的磁盘文件 */
  pdfAssetUrl(path: string): string {
    return convertFileSrc(path);
  },

  /** PDF 题目抽取（Rust pdf-extract,见 src-tauri/src/pdf_extract.rs）；失败抛中文错误 */
  async extractPdfProblems(path: string): Promise<ExtractedProblem[]> {
    return await invoke<ExtractedProblem[]>('extract_pdf_problems', { path });
  },
};


