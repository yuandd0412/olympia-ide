export interface Sample {
  input: string;
  output: string;
}

export interface Problem {
  id: string;
  title: string;
  oj: string;
  difficulty: string;
  tags: string[];
  timeLimitMs: number;
  memoryLimitKb: number;
  descriptionMd: string;
  inputFormat: string;
  outputFormat: string;
  samples: Sample[];
  hint: string;
  sourceUrl: string;
  isFavorite: boolean;
  lastPracticed?: string;
}

export interface Mistake {
  id: string;
  problemId: string;
  oj: string;
  title: string;
  verdict: 'AC' | 'WA' | 'TLE' | 'RE' | 'CE' | string;
  when: string;
  code: string;
  userNotes: string;
  reviewed: boolean;
}

export interface SolveRecord {
  id: string;
  problemId: string;
  oj: string;
  title: string;
  difficulty: string;
  solvedAt: string;
  timeMs: number;
  memoryKb: number;
  verdict: string;
}

export interface TrainingSession {
  id: string;
  title: string;
  date: string;
  problemIds: string[];
  completed: boolean;
}

export type ThemeType = 'OneDarkPro' | 'GitHubLight';

export interface AppSettings {
  isFirstRun?: boolean;
  theme: ThemeType;
  compilerPath: string;
  compilerFlags: string[];
  enableCodeTemplate: boolean;
  codeTemplate: string;
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  preferTerminalRun: boolean;
  dailyGoal: number;
  autoSave: boolean;
  fontSize: number;
  fontFamily: string;
}

export interface TerminalCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface TerminalLog {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  timestamp: string;
  durationMs: number;
}

export interface TestCaseInput {
  id: number;
  input: string;
  expectedOutput: string;
}

export interface TestCaseResult {
  id: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  verdict: 'AC' | 'WA' | 'TLE' | 'RE' | 'CE' | string;
  timeMs: number;
  memoryKb: number;
  errorMessage?: string;
}

export interface RunResult {
  success: boolean;
  isCompilationError: boolean;
  compilerOutput: string;
  testcases: TestCaseResult[];
  overallVerdict: string;
  totalTimeMs: number;
  maxMemoryKb: number;
}

export interface CodeTab {
  id: string;
  title: string;
  code: string;
  isModified: boolean;
  /** 保存到磁盘的绝对路径；未落盘过时为空 */
  filePath?: string;
  problemId?: string;
  testcases: TestCaseInput[];
  runResult?: RunResult | null;
}

export interface StressRoundResult {
  round: number;
  passed: boolean;
  input: string;
  solOutput: string;
  bruteOutput: string;
  errorMsg?: string;
}

export interface StressTestResult {
  totalRounds: number;
  passedRounds: number;
  success: boolean;
  isCompilationError: boolean;
  compilerOutput: string;
  failedRound?: StressRoundResult | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type NavTab = 'editor' | 'problems' | 'ai' | 'settings' | 'stress';
export interface SyntaxErrorMarker {
  line: number;
  column: number;
  message: string;
  severity: string;
}
