import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  Swords,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  FileCode2,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';

export const StressTesterPage: React.FC = () => {
  const {
    stressSolCode,
    stressBruteCode,
    stressGenCode,
    stressMaxRounds,
    stressResult,
    isStressRunning,
    setStressSolCode,
    setStressBruteCode,
    setStressGenCode,
    setStressMaxRounds,
    runStressAction,
    importStressFailToRunner,
    settings,
  } = useAppStore();

  const [activeCodeTab, setActiveCodeTab] = useState<'sol' | 'brute' | 'gen'>('sol');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isLight = settings.theme === 'GitHubLight';

  return (
    <div className="w-full h-full flex flex-col overflow-hidden select-none bg-[var(--bg-base)]">
      {/* Top Header Bar */}
      <div
        className="h-11 px-4 border-b flex items-center justify-between shrink-0"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)]">
            <Swords className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-[var(--text-primary)]">
            对拍器 (Stress Tester)
          </span>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            通过随机生成测试数据，自动化对比待测解法与暴力正确程序
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <span>对拍组数:</span>
            <select
              value={stressMaxRounds}
              onChange={(e) => setStressMaxRounds(Number(e.target.value))}
              disabled={isStressRunning}
              className="bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] px-2 py-0.5 rounded text-xs outline-none cursor-pointer"
            >
              <option value={10}>10 组</option>
              <option value={30}>30 组</option>
              <option value={50}>50 组</option>
              <option value={100}>100 组</option>
              <option value={500}>500 组</option>
            </select>
          </div>

          <button
            onClick={runStressAction}
            disabled={isStressRunning}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 text-white shadow-xs"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {isStressRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>正在自动化对拍...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>开始对拍</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Split Layout with react-resizable-panels */}
      <PanelGroup id="olympia-stress-panels" orientation="vertical" className="flex-1 min-h-0">
        {/* Top 3 Code Editors */}
        <Panel defaultSize={55} minSize={25} maxSize={80} className="min-h-0 flex flex-col border-b border-[var(--border)]">
          {/* Sub-tab switcher */}
          <div
            className="h-8 px-3 border-b flex items-center justify-between text-xs shrink-0"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveCodeTab('sol')}
                className={'px-3 py-1 rounded-md font-mono text-xs transition-all cursor-pointer flex items-center gap-1.5 ' + (activeCodeTab === 'sol' ? 'bg-[var(--bg-base)] text-[var(--text-primary)] border border-[var(--border)] font-semibold' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]')}
              >
                <FileCode2 className="w-3 h-3 text-[var(--accent)]" />
                <span>1. 待测程序 (Solution.cpp)</span>
              </button>

              <button
                onClick={() => setActiveCodeTab('brute')}
                className={'px-3 py-1 rounded-md font-mono text-xs transition-all cursor-pointer flex items-center gap-1.5 ' + (activeCodeTab === 'brute' ? 'bg-[var(--bg-base)] text-[var(--text-primary)] border border-[var(--border)] font-semibold' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]')}
              >
                <FileCode2 className="w-3 h-3 text-[#34c759]" />
                <span>2. 暴力/基准 (Standard.cpp)</span>
              </button>

              <button
                onClick={() => setActiveCodeTab('gen')}
                className={'px-3 py-1 rounded-md font-mono text-xs transition-all cursor-pointer flex items-center gap-1.5 ' + (activeCodeTab === 'gen' ? 'bg-[var(--bg-base)] text-[var(--text-primary)] border border-[var(--border)] font-semibold' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]')}
              >
                <FileCode2 className="w-3 h-3 text-[#ff9f0a]" />
                <span>3. 数据生成器 (Generator.cpp)</span>
              </button>
            </div>

            <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
              {activeCodeTab === 'sol' && '优化解法 / 待验证代码'}
              {activeCodeTab === 'brute' && '保证正确性的暴力算法 / 题解标程'}
              {activeCodeTab === 'gen' && '随机生成 stdin 输入数据'}
            </span>
          </div>

          {/* Monaco Editor Component */}
          <div className="flex-1 w-full h-full relative">
            {activeCodeTab === 'sol' && (
              <Editor
                height="100%"
                language="cpp"
                value={stressSolCode}
                theme={isLight ? 'vs' : 'vs-dark'}
                onChange={(v) => setStressSolCode(v || '')}
                options={{
                  fontSize: 13,
                  fontFamily: 'Cascadia Mono, Consolas, monospace',
                  minimap: { enabled: false },
                  automaticLayout: true,
                  tabSize: 4,
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                }}
              />
            )}

            {activeCodeTab === 'brute' && (
              <Editor
                height="100%"
                language="cpp"
                value={stressBruteCode}
                theme={isLight ? 'vs' : 'vs-dark'}
                onChange={(v) => setStressBruteCode(v || '')}
                options={{
                  fontSize: 13,
                  fontFamily: 'Cascadia Mono, Consolas, monospace',
                  minimap: { enabled: false },
                  automaticLayout: true,
                  tabSize: 4,
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                }}
              />
            )}

            {activeCodeTab === 'gen' && (
              <Editor
                height="100%"
                language="cpp"
                value={stressGenCode}
                theme={isLight ? 'vs' : 'vs-dark'}
                onChange={(v) => setStressGenCode(v || '')}
                options={{
                  fontSize: 13,
                  fontFamily: 'Cascadia Mono, Consolas, monospace',
                  minimap: { enabled: false },
                  automaticLayout: true,
                  tabSize: 4,
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                }}
              />
            )}
          </div>
        </Panel>

        <PanelResizeHandle className="h-1 bg-[var(--border)] hover:bg-[var(--accent)] transition-all cursor-row-resize z-50 relative group flex items-center justify-center">
          <div className="h-0.5 w-8 rounded-full bg-[var(--text-tertiary)] opacity-40 group-hover:opacity-100 group-hover:bg-[var(--accent)]" />
        </PanelResizeHandle>

        {/* Bottom Results Pane */}
        <Panel defaultSize={45} minSize={20} maxSize={75} className="min-h-0 flex flex-col p-4 overflow-y-auto text-xs" style={{ backgroundColor: 'var(--bg-surface)' }}>
          {stressResult ? (
            <div className="space-y-3">
              {/* Status Banner */}
              <div className="flex items-center justify-between">
                {stressResult.isCompilationError ? (
                  <div className="flex items-center gap-2 text-[#ff9f0a] font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>编译错误: 对拍前编译失败</span>
                  </div>
                ) : stressResult.success ? (
                  <div className="flex items-center gap-2 text-[#34c759] font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>对拍全部通过！已完成 {stressResult.totalRounds} / {stressResult.totalRounds} 组随机数据比对，未发现反例</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 text-[#ff453a] font-semibold">
                      <XCircle className="w-4 h-4" />
                      <span>
                        在第 {stressResult.failedRound?.round} 组数据发现差异！({stressResult.failedRound?.errorMsg})
                      </span>
                    </div>

                    <button
                      onClick={importStressFailToRunner}
                      className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold text-white shadow-xs transition-all hover:brightness-110 cursor-pointer"
                      style={{ backgroundColor: 'var(--accent)' }}
                    >
                      <span>一键导入该测试点至主编辑器</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Compilation Error Details */}
              {stressResult.isCompilationError && (
                <pre className="p-3 rounded-xl border bg-[var(--bg-elevated)] border-[var(--border)] text-[#ff9f0a] font-mono text-xs overflow-auto">
                  {stressResult.compilerOutput}
                </pre>
              )}

              {/* Mismatch Diff Box */}
              {stressResult.failedRound && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Generated Input */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--text-secondary)]">
                        随机输入数据 (Input)
                      </span>
                      <button
                        onClick={() => handleCopy(stressResult.failedRound?.input || '', 'input')}
                        className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        {copiedField === 'input' ? (
                          <>
                            <Check className="w-3 h-3 text-[#34c759]" /> 已复制
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> 复制
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-2.5 rounded-lg border font-mono text-xs overflow-auto h-32 bg-[var(--bg-elevated)] border-[var(--border)]">
                      {stressResult.failedRound.input}
                    </pre>
                  </div>

                  {/* Solution Output (Wrong) */}
                  <div className="flex flex-col gap-1.5">
                    <span className="font-semibold text-[#ff453a]">
                      待测程序输出 (Solution Output)
                    </span>
                    <pre className="p-2.5 rounded-lg border font-mono text-xs overflow-auto h-32 bg-[#ff453a]/5 border-[#ff453a]/30 text-[var(--text-primary)]">
                      {stressResult.failedRound.solOutput || '(无输出或运行崩溃)'}
                    </pre>
                  </div>

                  {/* Standard Output (Expected) */}
                  <div className="flex flex-col gap-1.5">
                    <span className="font-semibold text-[#34c759]">
                      暴力标准输出 (Expected Output)
                    </span>
                    <pre className="p-2.5 rounded-lg border font-mono text-xs overflow-auto h-32 bg-[#34c759]/5 border-[#34c759]/30 text-[var(--text-primary)]">
                      {stressResult.failedRound.bruteOutput || '(无输出)'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[var(--text-tertiary)]">
              <Swords className="w-8 h-8 mb-2 opacity-40 text-[var(--accent)]" />
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                准备就绪，点击右上角「开始对拍」
              </p>
              <p className="text-[11px] mt-1">
                生成器将产生随机用例，同时运行待测代码与暴力基准，直至发现输出不一致的测试数据
              </p>
            </div>
          )}
        </Panel>
      </PanelGroup>
    </div>
  );
};
