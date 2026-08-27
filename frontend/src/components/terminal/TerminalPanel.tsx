import React, { useEffect, useRef,  } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Command, Child } from '@tauri-apps/plugin-shell';
import '@xterm/xterm/css/xterm.css';
import { useAppStore } from '../../stores/useAppStore';
import {  } from 'lucide-react';

export const TerminalPanel: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const shellChild = useRef<Child | null>(null);
  const { settings, tabs, activeTabId, terminalRunSignal } = useAppStore();
  const lastSignal = useRef(terminalRunSignal);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: {
        background: 'transparent',
        foreground: settings.theme === 'OneDarkPro' ? '#abb2bf' : '#24292e',
        cursor: settings.theme === 'OneDarkPro' ? '#528bff' : '#044289',
      },
      fontFamily: settings.fontFamily || 'Cascadia Mono, monospace',
      fontSize: settings.fontSize || 14,
      cursorBlink: true,
      convertEol: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    
    term.open(terminalRef.current);
    fit.fit();

    term.writeln('\x1b[1;34m[Olympia IDE Terminal]\x1b[0m 终端已就绪。');
    if (useAppStore.getState().settings.preferTerminalRun) {
      term.writeln('提示: 你已开启终端首选模式，点击上方运行按钮将在此处编译并运行你的代码。');
    }

    termInstance.current = term;
    fitAddon.current = fit;

    const resizeObserver = new ResizeObserver(() => {
      fit.fit();
    });
    resizeObserver.observe(terminalRef.current);

    // Spawn a cmd.exe shell
    const spawnShell = async () => {
      try {
        const cmd = Command.create('cmd', ['/Q', '/K', 'prompt  ']);
        
        cmd.on('close', () => {
          term.writeln('\r\n\x1b[1;31m[Process Exited]\x1b[0m');
          shellChild.current = null;
        });
        cmd.on('error', (err) => {
          term.writeln('\r\n\x1b[1;31m[Error] \x1b[0m' + err);
        });

        const child = await cmd.spawn();
        shellChild.current = child;

        cmd.stdout.on('data', (data) => {
          term.write(data);
        });
        
        cmd.stderr.on('data', (data) => {
          term.write(data);
        });

        term.onData((data) => {
          if (shellChild.current) {
            shellChild.current.write(data);
          }
        });

      } catch (err) {
        term.writeln('\r\n\x1b[1;31m[Terminal Init Error] \x1b[0m' + err);
      }
    };

    spawnShell();

    return () => {
      resizeObserver.disconnect();
      if (shellChild.current) {
        shellChild.current.kill();
      }
      term.dispose();
    };
  }, [settings.theme, settings.fontFamily, settings.fontSize]);

  useEffect(() => {
    if (terminalRunSignal > lastSignal.current && termInstance.current && shellChild.current) {
      lastSignal.current = terminalRunSignal;
      const term = termInstance.current;
      const shell = shellChild.current;
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (!activeTab) return;

      term.writeln('\r\n\x1b[1;36m[System]\x1b[0m 正在准备终端运行...');
      import('../../services/tauriApi').then(({ tauriApi }) => {
        tauriApi.writeTempCode(activeTab.code, "cpp").then(({ srcPath, exePath }) => {
          const compiler = settings.compilerPath || 'g++';
          const flags = settings.compilerFlags.join(' ');
          const cmd = compiler + ' ' + flags + ' "' + srcPath + '" -o "' + exePath + '"\r\n';
          term.write('> ' + cmd);
          shell.write(cmd);
          term.writeln('\x1b[1;36m[System]\x1b[0m 编译完成将自动运行 ' + exePath + '，你可以在下方直接输入测试数据。');
          setTimeout(() => {
            shell.write('"' + exePath + '"\r\n');
          }, 800); // give it time to compile
        }).catch(err => {
          term.writeln('\r\n\x1b[1;31m[Error]\x1b[0m ' + err);
        });
      });
    }
  }, [terminalRunSignal, tabs, activeTabId, settings]);

  return (
    <div className="w-full h-full p-2 bg-[var(--bg-base)] flex flex-col">
      <div ref={terminalRef} className="w-full flex-1 min-h-0" />
    </div>
  );
};
