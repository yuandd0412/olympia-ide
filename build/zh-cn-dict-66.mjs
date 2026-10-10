// Batch 66 — workbench/contrib/terminal/common/terminalConfiguration.ts (86 lines / 42 unique)
//
// Terminal settings, plus the shell-integration / file-links / bracketed-paste
// paragraphs. Six of these are multi-line markdown descriptions (embedded \n and
// &nbsp; entities) — the key must reproduce them byte for byte.
//
// Preflight rejects any value that contains CJK punctuation but ends in an ASCII
// character, so every translation here deliberately terminates with 。
export default {
	"the terminal's current working directory, displayed for multi-root workspaces or in a single root workspace when the value differs from the initial working directory. On Windows, this will only be displayed when shell integration is enabled.":
		'终端当前的工作目录，在多根工作区中显示，或在单根工作区中当其取值与初始工作目录不同时显示。在 Windows 上，只有启用 shell 集成后才会显示此项。',

	"the command being executed according to shell integration. This also requires high confidence in the detected command line, which may not work in some prompt frameworks.":
		'根据 shell 集成识别出的正在执行的命令。这同样要求对所检测到的命令行有较高的置信度，在某些提示符框架中可能无法做到。',

	'Controls whether terminal tabs display as a list to the side of the terminal. When this is disabled a dropdown will display instead.':
		'控制终端标签页是否以列表形式显示在终端旁边。禁用后将改为显示一个下拉列表。',

	'Controls whether terminal tab statuses support animation (eg. in progress tasks).':
		'控制终端标签页的状态是否支持动画（例如进行中的任务）。',

	'Controls whether the terminal tabs view will hide under certain conditions.':
		'控制终端标签页视图是否在特定条件下隐藏。',

	'Shows the active terminal information in the view. This is particularly useful when the title within the tabs aren\'t visible.':
		'在视图中显示当前活动终端的信息。当标签页内的标题不可见时，这一点尤其有用。',

	'Controls whether terminal split and kill buttons are displays next to the new terminal button.':
		'控制是否在新建终端按钮旁显示终端的拆分与终止按钮。',

	'Controls whether focusing the terminal of a tab happens on double or single click.':
		'控制聚焦某个标签页的终端是发生在双击还是单击时。',

	'Controls whether agentic CLIs (such as Claude Code, Codex, Command Code, GitHub Copilot CLI, and Gemini CLI) are allowed to set the terminal tab title via escape sequences. When disabled, the configured tab title template is used instead.':
		'控制是否允许智能体命令行工具（例如 Claude Code、Codex、Command Code、GitHub Copilot CLI 和 Gemini CLI）通过转义序列设置终端标签页标题。禁用后将改用所配置的标签页标题模板。',

	'Controls whether to force selection when using Option+click on macOS. This will force a regular (line) selection and disallow the use of column selection mode. This enables copying and pasting using the regular terminal selection, for example, when mouse mode is enabled in tmux.':
		'控制是否在 macOS 上使用 Option+点击时强制选择。这会强制使用常规的（按行）选择，并禁止使用列选择模式，从而可以使用常规的终端选区来复制和粘贴内容，例如在 tmux 中启用了鼠标模式时。',

	'If enabled, alt/option + click will reposition the prompt cursor to underneath the mouse when {0} is set to {1} (the default value). This may not work reliably depending on your shell.':
		'启用后，当 {0} 取默认值 {1} 时，Alt/Option + 点击会把提示符光标移动到鼠标所在位置的正下方。该行为能否稳定生效取决于你使用的 shell。',

	'Enable the warning but do not show it when:\n\n- Bracketed paste mode is enabled (the shell supports multi-line paste natively)\n- The paste is handled by the shell\'s readline (in the case of pwsh)':
		'启用该警告，但在以下情况下不显示：\n\n- 启用了括号粘贴模式（shell 原生支持多行粘贴）\n- 粘贴由 shell 的 readline 处理（在 pwsh 的情况下）。',

	'Controls what font feature settings are used when ligatures are enabled, in the format of the `font-feature-settings` CSS property. Some examples which may be valid depending on the font:':
		'控制启用连字时使用哪些字体特性设置，格式与 CSS 属性 font-feature-settings 相同。以下是一些示例，是否有效取决于具体字体。',

	'When {0} is enabled and the particular {1} cannot be parsed, this is the set of character sequences that will always be drawn together. This allows the use of a fixed set of ligatures even when the font isn\'t supported.':
		'当 {0} 已启用但具体的 {1} 无法被解析时，这里给出的是一组总是会被一起绘制的字符序列。这使得即使字体本身不支持连字，也能使用一组固定的连字。',

	'When set, the foreground color of each cell will change to try meet the contrast ratio specified. Note that this will not apply to `powerline` characters per #146406. Example values:\n\n- 1: Do nothing and use the standard theme colors.\n- 4.5: [WCAG AA compliance (minimum)](https://www.w3.org/TR/UNDERSTANDING-WCAG20/visual-audio-contrast-contrast.html) (default).\n- 7: [WCAG AAA compliance (enhanced)](https://www.w3.org/TR/UNDERSTANDING-WCAG20/visual-audio-contrast7.html).\n- 21: White on black or black on white.':
		'设置后，每个单元格的文字颜色都会调整为满足指定的对比度。请注意，根据 #146406，这一规则不适用于 powerline 字符。示例取值如下。\n\n- 1：不做任何处理，使用标准主题颜色。\n- 4.5：符合 [WCAG AA（最低）](https://www.w3.org/TR/UNDERSTANDING-WCAG20/visual-audio-contrast-contrast.html)（默认值）。\n- 7：符合 [WCAG AAA（增强）](https://www.w3.org/TR/UNDERSTANDING-WCAG20/visual-audio-contrast7.html)。\n- 21：黑底白字或白底黑字。',

	'Controls the maximum number of lines the terminal keeps in its buffer. We pre-allocate memory based on this value in order to ensure a smooth experience. As such, as the value increases, so will the amount of memory.':
		'控制终端缓冲区保留的最大行数。我们会依据该值预分配内存以保证流畅体验，因此该值越大，占用的内存也越多。',

	"Controls whether to detect and set the `$LANG` environment variable to a UTF-8 compliant option since Olympia IDE's terminal only supports UTF-8 encoded data coming from the shell.":
		'控制是否检测并把 $LANG 环境变量设置为符合 UTF-8 的取值，因为 Olympia IDE 的终端只支持来自 shell 的 UTF-8 编码数据。',

	"Set the `$LANG` environment variable if the existing variable does not exist or it does not end in `'.UTF-8'`.":
		'如果 $LANG 环境变量不存在，或者它的结尾不是 .UTF-8，则设置该变量。',

	'An explicit start path where the terminal will be launched, this is used as the current working directory (cwd) for the shell process. This may be particularly useful in workspace settings if the root directory is not a convenient cwd.':
		'终端启动时使用的显式起始路径，它会作为 shell 进程的当前工作目录（cwd）。如果根目录不是一个便于操作的当前工作目录，那么在工作区设置中指定它会格外有用。',

	'Controls whether to confirm when the window closes if there are active terminal sessions. Background terminals like those launched by some extensions will not trigger the confirmation.':
		'控制窗口关闭时若存在活动的终端会话，是否弹出确认。由某些扩展启动的后台终端不会触发该确认。',

	'Controls whether to confirm killing terminals when they have child processes. When set to editor, terminals in the editor area will be marked as changed when they have child processes. Note that child process detection may not work well for shells like Git Bash which don\'t run their processes as child processes of the shell. Background terminals like those launched by some extensions will not trigger the confirmation.':
		'控制终止存在子进程的终端时是否弹出确认。设为 editor 时，编辑器区域中的终端在存在子进程的情况下会被标记为已更改。请注意，对于像 Git Bash 这类不把自身进程作为 shell 子进程运行的 shell，子进程检测可能无法正常工作。由某些扩展启动的后台终端不会触发该确认。',

	'A set of command IDs whose keybindings will not be sent to the shell but instead always be handled by Olympia IDE. This allows keybindings that would normally be consumed by the shell to act instead the same as when the terminal is not focused, for example `Ctrl+P` to launch Quick Open.\n\n&nbsp;\n\nMany commands are skipped by default. To override a default and pass that command\'s keybinding to the shell instead, add the command prefixed with the `-` character. For example add `-workbench.action.quickOpen` to allow `Ctrl+P` to reach the shell.\n\n&nbsp;\n\nThe following list of default skipped commands is truncated when viewed in Settings Editor. To see the full list, {1} and search for the first command from the list below.\n\n&nbsp;\n\nDefault Skipped Commands:\n\n{0}':
		'一组命令 ID，它们的快捷键不会发送给 shell，而是始终由 Olympia IDE 处理。这使得那些通常会被 shell 消费的快捷键能够像终端未获得焦点时那样生效，例如用 Ctrl+P 打开快速打开。\n\n&nbsp;\n\n默认会跳过许多命令。若要覆盖某个默认项、把该命令的快捷键改为发送给 shell，请在该命令前加上 - 字符。例如添加 -workbench.action.quickOpen 即可让 Ctrl+P 传到 shell。\n\n&nbsp;\n\n在设置编辑器中查看时，下面的默认跳过命令列表会被截断。要查看完整列表，请 {1} 并搜索下面列表中的第一条命令。\n\n&nbsp;\n\n默认跳过的命令：\n\n{0}。',

	'Whether or not to allow chord keybindings in the terminal. Note that when this is true and the keystroke results in a chord it will bypass {0}, setting this to false is particularly useful when you want ctrl+k to go to your shell (not Olympia IDE).':
		'是否允许在终端中使用和弦快捷键。请注意，当此项为 true 且按键组合构成和弦时，它会绕过 {0}。如果你希望 Ctrl+K 传给 shell 而不是 Olympia IDE，设为 false 会特别有用。',

	'Whether to allow menubar mnemonics (for example Alt+F) to trigger the open of the menubar. Note that this will cause all alt keystrokes to skip the shell when true. This does nothing on macOS.':
		'是否允许菜单栏助记键（例如 Alt+F）触发打开菜单栏。请注意，设为 true 时所有 Alt 按键都会跳过 shell。此项在 macOS 上不起作用。',

	'Object with environment variables that will be added to the Olympia IDE process to be used by the terminal on macOS. Set to `null` to delete the environment variable.':
		'环境变量对象，其中的变量会被添加到 Olympia IDE 进程，供 macOS 上的终端使用。设为 null 可删除该环境变量。',

	'Object with environment variables that will be added to the Olympia IDE process to be used by the terminal on Linux. Set to `null` to delete the environment variable.':
		'环境变量对象，其中的变量会被添加到 Olympia IDE 进程，供 Linux 上的终端使用。设为 null 可删除该环境变量。',

	'Object with environment variables that will be added to the Olympia IDE process to be used by the terminal on Windows. Set to `null` to delete the environment variable.':
		'环境变量对象，其中的变量会被添加到 Olympia IDE 进程，供 Windows 上的终端使用。设为 null 可删除该环境变量。',

	'A string containing all characters to be considered word separators when double-clicking to select word and in the fallback \'word\' link detection. Since this is used for link detection, including characters such as `:` that are used when detecting links will cause the line and column part of links like `file:10:5` to be ignored.':
		'一个字符串，包含在双击选中整个单词以及回退的单词链接检测中需要视为单词分隔符的所有字符。由于它也用于链接检测，如果包含用于检测链接的冒号等字符，那么 file:10:5 这类链接中的行号与列号部分会被忽略。',

	'Whether to enable file links in terminals. Links can be slow when working on a network drive in particular because each file link is verified against the file system. Changing this will take effect only in new terminals.':
		'是否在终端中启用文件链接。在网络驱动器上工作时链接可能会变慢，尤其是因为每个文件链接都要与文件系统进行校验。修改此设置只对新打开的终端生效。',

	'An array of strings containing the URI schemes that the terminal is allowed to open links for. By default, only a small subset of possible schemes are allowed for security reasons.':
		'一个字符串数组，包含终端被允许打开链接的 URI 方案。出于安全考虑，默认只允许其中很小的一部分方案。',

	'Controls what version of Unicode to use when evaluating the width of characters in the terminal. If you experience emoji or other wide characters not taking up the right amount of space or backspace either deleting too much or too little then you may want to try tweaking this setting.':
		'控制终端在计算字符宽度时使用哪个 Unicode 版本。如果你发现表情符号或其它宽字符没有占据正确的宽度，或者退格键删除的内容过多或过少，可以尝试调整此设置。',

	'When the terminal process must be shut down (for example on window or application close), this determines when the previous terminal session contents/history should be restored and processes be recreated when the workspace is next opened.\n\nCaveats:\n\n- Restoring of the process current working directory depends on whether it is supported by the shell.\n- Time to persist the session during shutdown is limited, so it may be aborted when using high-latency remote connections.':
		'当终端进程必须被关闭时（例如关闭窗口或应用程序时），此项决定何时恢复上一次终端会话的内容与历史记录，并在下次打开工作区时重新创建进程。\n\n注意事项：\n\n- 能否恢复进程的当前工作目录取决于 shell 是否支持。\n- 关闭期间持久化会话的时间是有限的，因此在使用高延迟的远程连接时可能会被中止。',

	'Revive the processes after the last window is closed on Windows/Linux or when the `workbench.action.quit` command is triggered (command palette, keybinding, menu).':
		'在 Windows/Linux 上最后一个窗口关闭之后，或触发 workbench.action.quit 命令时（命令面板、快捷键、菜单），恢复这些进程。',

	'Revive the processes after the last window is closed on Windows/Linux or when the `workbench.action.quit` command is triggered (command palette, keybinding, menu), or when the window is closed.':
		'在 Windows/Linux 上最后一个窗口关闭之后，或触发 workbench.action.quit 命令时（命令面板、快捷键、菜单），或者在窗口关闭时，恢复这些进程。',

	'Whether to draw custom glyphs instead of using the font for the following unicode ranges:\n\n{0}\n\nThis will typically result in better rendering with continuous lines, even when line height and letter spacing is used. This feature only works when {1} is enabled.':
		'是否针对以下 Unicode 范围绘制自定义字形而不使用字体：\n\n{0}\n\n这通常能让连续线条的渲染效果更好，即使使用了行高和字间距设置。此功能仅在启用 {1} 后可用。',

	'Whether to rescale glyphs horizontally that are a single cell wide but have glyphs that would overlap following cell(s). This typically happens for ambiguous width characters (eg. the roman numeral characters U+2160+) which aren\'t featured in monospace fonts. Emoji glyphs are never rescaled.':
		'是否对那些宽度为一个单元格、但字形会溢出到后续单元格的字形进行水平缩放。这通常发生在宽度不确定的字符上（例如罗马数字字符 U+2160 及以上），因为等宽字体中并不包含它们。表情符号字形永远不会被缩放。',

	'Whether to enable the kitty keyboard protocol, which allows a program in the terminal to request more detailed keyboard input reporting. This can, for example, enable `Shift+Enter` to be handled by the program.':
		'是否启用 kitty 键盘协议，它允许终端中的程序请求更详细的键盘输入上报。例如这可以让 Shift+Enter 交由程序处理。',

	'Determines whether or not shell integration is auto-injected to support features like enhanced command tracking and current working directory detection. \n\nShell integration works by injecting the shell with a startup script. The script gives VS Code insight into what is happening within the terminal.\n\nSupported shells:\n\n- Linux/macOS: bash, fish, pwsh, zsh\n - Windows: pwsh, git bash\n\nThis setting applies only when terminals are created, so you will need to restart your terminals for it to take effect.\n\n Note that the script injection may not work if you have custom arguments defined in the terminal profile, have enabled {1}, have a [complex bash `PROMPT_COMMAND`](https://code.visualstudio.com/docs/editor/integrated-terminal#_complex-bash-promptcommand), or other unsupported setup. To disable decorations, see {0}':
		'决定是否自动注入 shell 集成，以支持增强的命令跟踪和当前工作目录检测等功能。 \n\nShell 集成的工作方式是在 shell 中注入一段启动脚本。该脚本让 Olympia IDE 能够了解终端内部正在发生的事情。\n\n受支持的 shell：\n\n- Linux/macOS：bash、fish、pwsh、zsh\n - Windows：pwsh、git bash\n\n此设置仅在创建终端时生效，因此你需要重启终端才能让它起作用。\n\n 请注意，如果你在终端配置中定义了自定义参数、启用了 {1}、使用了 [复杂的 bash PROMPT_COMMAND](https://code.visualstudio.com/docs/editor/integrated-terminal#_complex-bash-promptcommand)，或者存在其它不受支持的配置，脚本注入可能无法正常工作。要关闭这些装饰，请参阅 {0}。',

	'Configures the duration in milliseconds to wait for shell integration after launch before declaring it\'s not there. The default value {0} uses a variable wait time based on whether shell integration injection is enabled and whether it\'s a remote window. Values between 1 and 499 are clamped to 500ms. Consider setting this to a large value if your shell starts very slowly.':
		'配置启动之后等待 shell 集成出现的时长（毫秒），超时即判定其不存在。默认值 {0} 会根据是否启用 shell 集成注入、以及是否为远程窗口来采用不同的等待时间。取值在 1 到 499 之间时会被限制为 500 毫秒。如果你的 shell 启动非常缓慢，可以考虑把此值设得大一些。',

	'Controls whether the terminal will ignore bracketed paste mode even if the terminal was put into the mode, omitting the {0} and {1} sequences when pasting. This is useful when the shell is not respecting the mode which can happen in sub-shells for example.':
		'控制终端是否忽略括号粘贴模式，即使终端已经进入了该模式，粘贴时也会省略 {0} 和 {1} 序列。当 shell 没有遵守该模式时（例如出现在子 shell 中），此设置会很有用。',

	'Enables image support in the terminal, this will only work when {0} is enabled. Sixel and iTerm\'s inline image protocol are supported on Linux and macOS. The kitty graphics protocol is supported on all platforms. On Windows, all image protocols will only work for versions of ConPTY >= v2 which is shipped with Windows itself, see also {1}. Images will currently not be restored between window reloads/reconnects. When enabled, transparency mode is also turned on in the terminal.':
		'在终端中启用图片支持，只有启用 {0} 后才会生效。在 Linux 和 macOS 上支持 Sixel 与 iTerm 的内联图片协议。在所有平台上都支持 kitty 图形协议。在 Windows 上，所有图片协议仅对 ConPTY >= v2 的版本有效（Windows 本身即附带该版本），另请参阅 {1}。目前窗口重载或重连之间不会恢复图片。启用后，终端还会同时开启透明模式。',

	'Controls whether terminals can be created in an untrusted workspace.\n\n**This feature bypasses a security protection that prevents terminals from launching in untrusted workspaces. The reason this is a security risk is because shells are often set up to potentially execute code automatically based on the contents of the current working directory. This should be safe to use provided your shell is set up in such a way that code execution in the folder never happens.**':
		'控制是否可以在不受信任的工作区中创建终端。\n\n**此功能会绕过一项安全保护，该保护用于阻止在不受信任的工作区中启动终端。**之所以说它存在安全风险，是因为 shell 往往会被配置成可能根据当前工作目录的内容自动执行代码。只要你的 shell 配置成绝不会在该文件夹中执行代码，使用此功能就是安全的。',
};