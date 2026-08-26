import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { tauriApi } from '../../services/tauriApi';
import type { ChatMessage } from '../../types';

export const AiCoachPage: React.FC = () => {
  const contestEndTime = useAppStore((s) => s.contestEndTime);
    const isContestActive = contestEndTime !== null && Date.now() < contestEndTime;

  if (isContestActive) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-base)] select-none">
        <div className="max-w-md w-full p-8 rounded-3xl border border-[#ff453a]/30 bg-[var(--bg-surface)] shadow-2xl flex flex-col items-center gap-4 relative overflow-hidden">
          <div className="p-4 rounded-2xl bg-[#ff453a]/15 text-[#ff453a] ring-8 ring-[#ff453a]/5">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            比赛模式进行中 · AI 教练已锁定
          </h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            为了保证竞赛模拟的纯粹性与真实赛场环境，比赛期间将严格禁用 AI 算法辅导与思路提示。
          </p>
          <div className="p-3 w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center gap-2 text-xs font-mono font-bold text-[#ff453a]">
            <span>比赛进行中，倒计时结束后将自动解除锁定</span>
          </div>
        </div>
      </div>
    );
  }

  const { settings, activeProblem, tabs, activeTabId } = useAppStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const currentCode = activeTab?.code || '';
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        '👋 你好！我是你的 **AI 竞赛教练**。我可以为你提供：\n\n- 💡 **算法与数据结构思路指引**（可选择无剧透提示）\n- ⏱️ **时空复杂度精细化分析**（$\\mathcal{O}(N \\log N)$、常数优化）\n- 🐞 **边界特判与死循环 Bug 排查**\n- 📚 **经典题型与模板代码解读**\n\n请在下方输入你的问题，或直接点击预置快捷提示词！',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (userText?: string) => {
    const textToSend = userText || input;
    if (!textToSend.trim() || isLoading) return;

    let enrichedContent = textToSend.trim();
    if (activeProblem && !userText) {
      enrichedContent = `【当前题目上下文: ${activeProblem.id} - ${activeProblem.title}】\n\n${textToSend.trim()}`;
    }

    const newMsgs: ChatMessage[] = [
      ...messages,
      { role: 'user', content: enrichedContent },
    ];
    setMessages(newMsgs);
    setInput('');
    setIsLoading(true);

    try {
      const systemPrompt: ChatMessage = {
        role: 'system',
        content: `You are an expert Olympiad in Informatics (NOIP/NOI/ICPC/Codeforces) algorithm coach and C++ performance mentor.
Your advice must be precise, helpful, and concise. Format mathematical formulas using LaTeX ($...$ for inline, $$...$$ for display).
Use clean Markdown code blocks with language identifiers. If the user asks for hints, avoid directly giving the complete solution code upfront; guide their algorithmic thinking step by step.`,
      };

      const reply = await tauriApi.chatWithAi(
        [systemPrompt, ...newMsgs],
        settings.aiBaseUrl,
        settings.aiApiKey,
        settings.aiModel
      );

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ 请求出错: ${err.message || String(err)}\n\n请前往「设置」检查你的 AI API Key 和 Base URL 是否有效。`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(codeText);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const promptChips = [
    {
      label: '分析当前题目思路（防剧透）',
      prompt: `请针对当前题目 ${activeProblem?.id || 'P1001'} (${activeProblem?.title || 'A+B'})，给出分阶段算法思路提示（不要直接提供完整 AC 代码）：`,
    },
    {
      label: '检查当前代码边界与潜在 Bug',
      prompt: `请帮我审查以下 C++ 代码在竞赛场景下可能存在的边界溢出、死循环或未特判 Bug：\n\`\`\`cpp\n${currentCode}\n\`\`\``,
    },
    {
      label: '优化常数与时间复杂度',
      prompt: `请分析当前题目的时间复杂度瓶颈，并给出 C++ 快速 IO 与数据结构常数优化建议。`,
    },
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div
        className="h-12 px-6 border-b flex items-center justify-between shrink-0"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-[var(--text-primary)]">
            AI 竞赛教练
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-tertiary)] border border-[var(--border)]">
            {settings.aiModel || 'gpt-4o-mini'}
          </span>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                role: 'assistant',
                content: '对话已重置。请问有什么算法问题需要探讨？',
              },
            ])
          }
          className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 rounded transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>清空会话</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 select-text">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              className={`flex gap-3 max-w-3xl ${
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  isUser
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--accent)]'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Bubble */}
              <div
                className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                  isUser
                    ? 'bg-[var(--accent)] text-white border-transparent'
                    : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border)]'
                }`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code({ className, children, ...props }) {
                      const isInline = !className;
                      const codeContent = String(children).replace(/\n$/, '');
                      if (isInline) {
                        return (
                          <code
                            className="font-mono bg-black/20 px-1 py-0.5 rounded text-[11px]"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      }
                      return (
                        <div className="relative my-2.5 rounded-xl overflow-hidden border border-[var(--border)] bg-black/30 font-mono text-[11px]">
                          <div className="flex items-center justify-between px-3 py-1.5 bg-black/20 border-b border-[var(--border)] select-none">
                            <span className="text-[10px] text-[var(--text-tertiary)] uppercase">
                              C++
                            </span>
                            <button
                              onClick={() => handleCopy(codeContent)}
                              className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] hover:text-white cursor-pointer"
                            >
                              {copiedCode === codeContent ? (
                                <>
                                  <Check className="w-3 h-3 text-[#34c759]" /> 已复制
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" /> 复制代码
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="p-3 overflow-x-auto">
                            <code>{children}</code>
                          </pre>
                        </div>
                      );
                    },
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 max-w-3xl mr-auto">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--accent)] shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl border bg-[var(--bg-surface)] border-[var(--border)] flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
              <span>教练正在分析算法与时空复杂度...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Composer */}
      <div
        className="p-4 border-t space-y-3 shrink-0"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Quick Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
          {promptChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip.prompt)}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer whitespace-nowrap"
            >
              <Zap className="w-3 h-3 text-[var(--accent)]" />
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        {/* Text Input Area */}
        <div
          className="flex items-end gap-2 p-2 rounded-2xl border bg-[var(--bg-elevated)] border-[var(--border)] focus-within:border-[var(--accent)] transition-all"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="向 AI 教练提问算法思路、优化建议或排查 Bug (Enter 发送, Shift+Enter 换行)..."
            rows={2}
            className="flex-1 bg-transparent text-xs text-[var(--text-primary)] outline-none resize-none p-1 placeholder:text-[var(--text-tertiary)]"
          />

          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="p-2 rounded-xl text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
