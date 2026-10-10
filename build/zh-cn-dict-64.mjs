// Batch 64 — extension-authoring schemas, surfaced in the Settings editor and in
// package.json hover docs:
//   workbench/services/actions/common/menusExtensionPoint.ts (93)
//   workbench/services/extensions/common/extensionsRegistry.ts (82)
// Several strings are deliberately duplicated in the sources (`menuItem.when`,
// `menuItem.group`, and the submenu/command `icon.light` / `icon.dark` pairs); a
// single object entry covers both sites, which is why 175 literals resolve from
// fewer entries.
export default {

	// ==================================================== menus — comment / notebook
	'The contributed comment title menu': '扩展贡献的批注标题菜单',
	'The contributed comment context menu, rendered as buttons below the comment editor':
		'扩展贡献的批注上下文菜单，以按钮形式显示在批注编辑器下方',
	"The contributed comment context menu, rendered as a right click menu on the an individual comment in the comment thread's peek view.":
		'扩展贡献的批注上下文菜单，在批注线程的速览视图中以右键菜单形式显示在单条批注上。',
	'The contributed comment thread context menu in the comments view': '批注视图中扩展贡献的批注线程上下文菜单',
	'The contributed notebook toolbar menu': '扩展贡献的笔记本工具栏菜单',
	'The contributed notebook kernel sources menu': '扩展贡献的笔记本内核来源菜单',
	'The contributed notebook cell title menu': '扩展贡献的笔记本单元格标题菜单',
	'The contributed notebook cell execution menu': '扩展贡献的笔记本单元格执行菜单',
	'The contributed interactive toolbar menu': '扩展贡献的交互式窗口工具栏菜单',
	'The contributed interactive cell title menu': '扩展贡献的交互式单元格标题菜单',
	'The contributed issue reporter menu': '扩展贡献的问题反馈菜单',

	// ======================================================== menus — testing / misc
	'The contributed test item menu': '扩展贡献的测试项菜单',
	'The menu for a gutter decoration for a test item': '测试项的装订线装饰所使用的菜单',
	'The menu for configuring testing profiles.': '用于配置测试方案的菜单。',
	'The menu for an item in the Test Results view or peek.': '测试结果视图或速览中某个条目所使用的菜单。',
	'A prominent button overlaying editor content where the message is displayed': '浮于编辑器内容之上的醒目按钮，用于显示该消息',
	'Context menu for the message in the results tree': '结果树中该消息的上下文菜单',
	'The extension context menu': '扩展上下文菜单',
	'The Timeline view title menu': '时间线视图标题菜单',
	'The Timeline view item context menu': '时间线视图中条目的上下文菜单',
	'The Ports view item context menu': '端口视图中条目的上下文菜单',
	'The Ports view item origin inline menu': '端口视图中条目的来源内联菜单',
	'The Ports view item port inline menu': '端口视图中条目的端口内联菜单',
	"The 'New File...' quick pick, shown on welcome page and File menu.": '在欢迎页和文件菜单中显示的新建文件快速选择框。',
	'The webview context menu': '网页视图的上下文菜单',
	'Share submenu shown in the top level File menu.': '在顶级文件菜单中显示的共享子菜单。',
	'The actions shown when hovering on an inline completion': '悬停在内联补全上时显示的操作',
	'The prominent button in an editor, overlays its content': '编辑器中的醒目按钮，会浮于其内容之上',
	'The contributed editor line number context menu': '扩展贡献的行号上下文菜单',
	'The result toolbar of the merge editor': '合并编辑器的结果工具栏',
	'A prominent button overlaying the multi diff editor': '浮于多差异编辑器之上的醒目按钮',
	'The resource toolbar in the multi diff editor': '多差异编辑器中的资源工具栏',
	'The commands that will contribute to the menu rendered as buttons next to the AI search title':
		'为显示在 AI 搜索标题旁的按钮菜单贡献的命令',
	'Menu Contexts': '菜单上下文',
	'Commands': '命令',
	'ID': '标识符',

	// ============================================================== menus — chat/agents
	'The Chat submenu in the text editor context menu.': '文本编辑器上下文菜单中的聊天子菜单。',
	'The Chat Editing widget toolbar menu for session changes.': '聊天编辑小部件中用于会话更改的工具栏菜单。',
	'The Chat Editing widget toolbar menu for session title.': '聊天编辑小部件中用于会话标题的工具栏菜单。',
	'The Chat Sessions menu.': '聊天会话菜单。',
	"The context menu for items in the Sessions window's session list.": '会话窗口的会话列表中条目的上下文菜单。',
	'Menu for new chat sessions.': '新建聊天会话的菜单。',
	'The Chat Multi-Diff context menu.': '聊天多差异视图的上下文菜单。',
	'The create button in the Chat Customizations management editor.': '聊天自定义管理编辑器中的创建按钮。',
	'The item context menu in the Chat Customizations management editor, including inline actions.':
		'聊天自定义管理编辑器中的条目上下文菜单，包含内联操作。',
	'The inline gutter menu in the chat editor.': '聊天编辑器中的内联装订线菜单。',
	'Actions in the chat context usage details popup.': '聊天上下文使用情况详情弹窗中的操作。',
	'The Chat new session menu.': '聊天新建会话菜单。',
	'The Changes view toolbar of the agents window.': '智能体窗口的更改视图工具栏。',
	'The Changes view toolbar primary action submenu in the agents window.': '智能体窗口中更改视图工具栏主操作的子菜单。',
	'The Changes view inline menu in the agents window.': '智能体窗口中更改视图的内联菜单。',

	// ================================================ menus — submenu / menuItem schema
	'submenu items must be an array': '子菜单项必须是数组',
	'submenu items must be an object': '子菜单项必须是对象',
	"Identifier of the command to execute. The command must be declared in the 'commands'-section":
		'要执行的命令的标识符。该命令必须在 commands 区段中声明',
	"Identifier of an alternative command to execute. The command must be declared in the 'commands'-section":
		'要执行的备用命令的标识符。该命令必须在 commands 区段中声明',
	'Condition which must be true to show this item': '必须为真才会显示该项的条件',
	'Group into which this item belongs': '该项所属的分组',
	'Identifier of the submenu to display in this item.': '在该项中显示的子菜单的标识符。',
	'Identifier of the menu to display as a submenu.': '以子菜单形式显示的菜单的标识符。',
	'The label of the menu item which leads to this submenu.': '指向该子菜单的菜单项的标签。',
	'(Optional) Icon which is used to represent the submenu in the UI. Either a file path, an object with file paths for dark and light themes, or a theme icon references, like "\\$(zap)"':
		'（可选）在界面中用于表示该子菜单的图标。可以是文件路径、包含深色与浅色主题文件路径的对象，或主题图标引用，例如 \\$(zap)',
	'Icon path when a light theme is used': '使用浅色主题时的图标路径',
	'Icon path when a dark theme is used': '使用深色主题时的图标路径',
	'Contributes menu items to the editor': '向编辑器贡献菜单项',
	'Proposed API, requires `enabledApiProposal: ["{0}"]` - {1}': '提议 API，需要 enabledApiProposal: ["{0}"] - {1}',
	'Contributes submenu items to the editor': '向编辑器贡献子菜单项',
	'expected non-empty value.': '期望为非空值。',
	'property `icon` can be omitted or must be either a string or a literal like `{dark, light}`':
		'`icon` 属性可以省略，或者必须是字符串，或者形如 `{dark, light}` 的字面量',
	'property `{0}` is mandatory and must be of type `string` or `object`':
		'`{0}` 属性是必需的，且其类型必须为 `string` 或 `object`',
	'properties `{0}` and `{1}` are mandatory and must be of type `string`':
		'`{0}` 和 `{1}` 属性是必需的，且其类型必须为 `string`',

	// ============================================================ menus — command schema
	'Identifier of the command to execute': '要执行的命令的标识符',
	'Title by which the command is represented in the UI': '在界面中表示该命令时使用的标题',
	'(Optional) Short title by which the command is represented in the UI. Menus pick either `title` or `shortTitle` depending on the context in which they show commands.':
		'（可选）在界面中表示该命令时使用的短标题。菜单会根据显示命令的上下文选择 `title` 或 `shortTitle`。',
	'(Optional) Category string by which the command is grouped in the UI': '（可选）在界面中用于对该命令分组的类别字符串',
	'(Optional) Condition which must be true to enable the command in the UI (menu and keybindings). Does not prevent executing the command by other means, like the `executeCommand`-api.':
		'（可选）必须为真才会在界面（菜单和快捷键）中启用该命令的条件。它不会阻止通过其他方式（例如 `executeCommand` API）执行该命令。',
	'(Optional) Icon which is used to represent the command in the UI. Either a file path, an object with file paths for dark and light themes, or a theme icon references, like "\\$(zap)"':
		'（可选）在界面中用于表示该命令的图标。可以是文件路径、包含深色与浅色主题文件路径的对象，或主题图标引用，例如 \\$(zap)',
	'Contributes commands to the command palette.': '向命令面板贡献命令。',

	// ==================================================== menus — runtime diagnostics
	'Command `{0}` already registered by {1} ({2})': '命令 `{0}` 已由 {1} 注册（{2}）',
	'Command `{0}` already registered': '命令 `{0}` 已经注册过了',
	'`{0}` is not a valid submenu identifier': '`{0}` 不是有效的子菜单标识符',
	'The `{0}` submenu was already previously registered.': '子菜单 `{0}` 之前已经注册过了。',
	'`{0}` is not a valid submenu label': '`{0}` 不是有效的子菜单标签',
	"Menu item references a command `{0}` which is not defined in the 'commands' section.":
		'菜单项引用了 `commands` 区段中未定义的命令 `{0}`。',
	"Menu item references an alt-command `{0}` which is not defined in the 'commands' section.":
		'菜单项引用了 `commands` 区段中未定义的备用命令 `{0}`。',
	'Menu item references the same command as default and alt-command': '菜单项的默认命令与备用命令引用了同一条命令',
	"Menu item references a submenu for a menu which doesn't have submenu support.":
		'菜单项为不支持子菜单的菜单引用了子菜单。',
	"Menu item references a submenu `{0}` which is not defined in the 'submenus' section.":
		'菜单项引用了 `submenus` 区段中未定义的子菜单 `{0}`。',
	'The `{0}` submenu was already contributed to the `{1}` menu.': '子菜单 `{0}` 已经贡献给 `{1}` 菜单了。',
	'The {0} menu contribution must check {1} in its {2} clause.': '{0} 菜单贡献必须在其 {2} 子句中检查 {1}。',

	// ==================================================== extensions — kinds & manifest
	'UI extension kind. In a remote window, such extensions are enabled only when available on the local machine.':
		'界面扩展类型。在远程窗口中，此类扩展仅在本地计算机上可用时才会启用。',
	'Workspace extension kind. In a remote window, such extensions are enabled only when available on the remote.':
		'工作区扩展类型。在远程窗口中，此类扩展仅在远程可用时才会启用。',
	'Engine compatibility.': '引擎兼容性。',
	'The publisher of the Olympia IDE extension.': 'Olympia IDE 扩展的发布者。',
	'The display name for the extension used in the Olympia IDE gallery.': '该扩展在 Olympia IDE 扩展库中显示时使用的名称。',
	'The categories used by the Olympia IDE gallery to categorize the extension.':
		'Olympia IDE 扩展库用于对该扩展进行分类的类别。',
	"Use 'Programming  Languages' instead": '请改用 Programming Languages',
	'Banner used in the Olympia IDE marketplace.': 'Olympia IDE 扩展市场中使用的横幅。',
	'The banner color on the Olympia IDE marketplace page header.': 'Olympia IDE 扩展市场页面标头处的横幅颜色。',
	'The color theme for the font used in the banner.': '横幅中所用字体的配色主题。',
	'All contributions of the Olympia IDE extension represented by this package.': '此程序包所代表的 Olympia IDE 扩展的全部贡献点。',
	'Sets the extension to be flagged as a Preview in the Marketplace.': '将该扩展标记为扩展市场中的预览版。',
	'Use `enabledApiProposals` instead.': '请改用 `enabledApiProposals`。',
	'Describe the API provided by this extension. For more details visit: https://code.visualstudio.com/api/advanced-topics/remote-extensions#handling-dependencies-with-remote-extensions':
		'描述此扩展提供的 API。更多内容请访问：https://code.visualstudio.com/api/advanced-topics/remote-extensions#handling-dependencies-with-remote-extensions。',
	'Give up entirely the ability to export any APIs. This allows other extensions that depend on this extension to run in a separate extension host process or in a remote machine.':
		'完全放弃导出任何 API 的能力。这样一来，依赖此扩展的其他扩展可以在独立的扩展宿主进程或远程计算机中运行。',
	'Activation events for the Olympia IDE extension.': 'Olympia IDE 扩展的激活事件。',

	// ================================================= extensions — activation events
	'An activation event emitted when a webview is loaded of a certain viewType': '加载某个 viewType 的网页视图时发出的激活事件',
	'An activation event emitted whenever a file that resolves to the specified language gets opened.':
		'每次打开解析为指定语言的文件时发出的激活事件。',
	'An activation event emitted whenever the specified command gets invoked.': '每次调用指定命令时发出的激活事件。',
	'An activation event emitted whenever a user is about to start debugging or about to setup debug configurations.':
		'当用户即将开始调试或即将配置调试配置时发出的激活事件。',
	'An activation event emitted whenever a "launch.json" needs to be created (and all provideDebugConfigurations methods need to be called).':
		'每次需要创建 launch.json（并调用所有 provideDebugConfigurations 方法）时发出的激活事件。',
	'An activation event emitted whenever a list of all debug configurations needs to be created (and all provideDebugConfigurations methods for the "dynamic" scope need to be called).':
		'每次需要创建所有调试配置的列表（并调用 dynamic 作用域的所有 provideDebugConfigurations 方法）时发出的激活事件。',
	'An activation event emitted whenever a debug session with the specific type is about to be launched (and a corresponding resolveDebugConfiguration method needs to be called).':
		'每次即将启动特定类型的调试会话（并需要调用相应的 resolveDebugConfiguration 方法）时发出的激活事件。',
	'An activation event emitted whenever a debug session with the specific type is about to be launched and a debug protocol tracker might be needed.':
		'每次即将启动特定类型的调试会话且可能需要调试协议跟踪器时发出的激活事件。',
	'An activation event emitted whenever a folder is opened that contains at least a file matching the specified glob pattern.':
		'每次打开包含至少一个匹配指定 glob 模式文件的文件夹时发出的激活事件。',
	'An activation event emitted after the start-up finished (after all `*` activated extensions have finished activating).':
		'启动完成后（在所有以 `*` 激活的扩展都完成激活之后）发出的激活事件。',
	'An activation event emitted whenever tasks of a certain type need to be listed or resolved.':
		'每次需要列出或解析某种类型的任务时发出的激活事件。',
	'An activation event emitted whenever a file or folder is accessed with the given scheme.':
		'每次使用给定方案访问文件或文件夹时发出的激活事件。',
	'An activation event emitted whenever an edit session is accessed with the given scheme.':
		'每次使用给定方案访问编辑会话时发出的激活事件。',
	'An activation event emitted whenever a search is started in the folder with the given scheme.':
		'每次在使用给定方案的文件夹中开始搜索时发出的激活事件。',
	'An activation event emitted whenever the specified view is expanded.': '每次展开指定视图时发出的激活事件。',
	'An activation event emitted whenever a system-wide Uri directed towards this extension is open.':
		'每次打开指向此扩展的系统级 Uri 时发出的激活事件。',
	'An activation event emitted whenever a external uri (such as an http or https link) is being opened.':
		'每次打开外部 uri（例如 http 或 https 链接）时发出的激活事件。',
	'An activation event emitted whenever the specified custom editor becomes visible.':
		'每次指定的自定义编辑器变为可见时发出的激活事件。',
	'An activation event emitted whenever the specified notebook document is opened.':
		'每次打开指定的笔记本文档时发出的激活事件。',
	'An activation event emitted whenever sessions are requested from the specified authentication provider.':
		'每次从指定的身份验证提供程序请求会话时发出的激活事件。',
	'An activation event emitted whenever a notebook output renderer is used.': '每次使用笔记本输出呈现器时发出的激活事件。',
	'An activation event emitted when a specific terminal profile is launched.': '启动特定终端配置文件时发出的激活事件。',
	'An activation event emitted when a command matches the selector associated with this ID':
		'当某条命令与此 ID 关联的选择器匹配时发出的激活事件',
	'An activation event emitted when a specified walkthrough is opened.': '打开指定演练流程时发出的激活事件。',
	'An activation event emitted when the issue reporter is opened.': '打开问题反馈界面时发出的激活事件。',
	'An activation event emitted when the specified chat participant is invoked.': '调用指定聊天参与者时发出的激活事件。',
	'An activation event emitted when the specified chat context provider is invoked.': '调用指定聊天上下文提供程序时发出的激活事件。',
	'An activation event emitted when a chat model provider for the given vendor is requested.':
		'请求给定厂商的聊天模型提供程序时发出的激活事件。',
	'An activation event emitted when the specified language model tool is invoked.': '调用指定语言模型工具时发出的激活事件。',
	'An activation event emitted when a terminal of the given shell type is opened.': '打开给定 shell 类型的终端时发出的激活事件。',
	'An activation event emitted when terminal shell integration is activated for the given shell type.':
		'为给定 shell 类型启用终端 shell 集成时发出的激活事件。',
	'An activation event emitted whenever a tool from the MCP server is requested.':
		'每次请求 MCP 服务器中的某个工具时发出的激活事件。',

	// =============================================== extensions — badges / dependencies
	"Array of badges to display in the sidebar of the Marketplace's extension page.":
		'要在扩展市场扩展页面的侧边栏中显示的徽标数组。',
	'Badge image URL.': '徽标图片 URL。',
	'Badge link.': '徽标链接。',
	'Badge description.': '徽标说明。',
	'Controls the Markdown rendering engine used in the Marketplace. Either github (default) or standard.':
		'控制扩展市场中使用的 Markdown 渲染引擎。可取 github（默认）或 standard。',
	'Dependencies to other extensions. The identifier of an extension is always ${publisher}.${name}. For example: vscode.csharp.':
		'对其他扩展的依赖。扩展的标识符始终为 ${publisher}.${name}，例如 vscode.csharp。',
	'Extensions that this extension should be colocated with in the same extension host process if possible. The identifier of an extension is always ${publisher}.${name}. For example: vscode.git.':
		'如果可能，此扩展应与之共用同一扩展宿主进程的其他扩展。扩展的标识符始终为 ${publisher}.${name}，例如 vscode.git。',
	'A set of extensions that can be installed together. The identifier of an extension is always ${publisher}.${name}. For example: vscode.csharp.':
		'可以一起安装的一组扩展。扩展的标识符始终为 ${publisher}.${name}，例如 vscode.csharp。',
	'API proposals that the respective extensions can freely use.': '相应扩展可以自由使用的 API 提议。',

	// ===================================================== extensions — extension kind
	'Define the kind of an extension. `ui` extensions are installed and run on the local machine while `workspace` extensions run on the remote.':
		'定义扩展的类型。其中 `ui` 扩展安装并在本地计算机上运行，而 `workspace` 扩展在远程运行。',
	'Define an extension which can run only on the local machine when connected to remote window.':
		'定义一种扩展，连接到远程窗口时只能在本地计算机上运行。',
	'Define an extension which can run only on the remote machine when connected remote window.':
		'定义一种扩展，连接到远程窗口时只能在远程计算机上运行。',
	'Define an extension which can run on either side, with a preference towards running on the local machine.':
		'定义一种可在任一侧运行的扩展，但优先在本地计算机上运行。',
	'Define an extension which can run on either side, with a preference towards running on the remote machine.':
		'定义一种可在任一侧运行的扩展，但优先在远程计算机上运行。',
	'Define an extension which cannot run in a remote context, neither on the local, nor on the remote machine.':
		'定义一种无法在远程上下文中运行的扩展，既不能在本地计算机上运行，也不能在远程计算机上运行。',

	// ===================================================== extensions — capabilities
	'Declare the set of supported capabilities by the extension.': '声明该扩展支持的能力集合。',
	'Declares the level of support for virtual workspaces by the extension.': '声明该扩展对虚拟工作区的支持程度。',
	'The extension will be enabled in virtual workspaces with some functionality disabled.':
		'该扩展将在虚拟工作区中启用，但部分功能会被禁用。',
	'The extension will be enabled in virtual workspaces with all functionality enabled.':
		'该扩展将在虚拟工作区中启用，全部功能均可用。',
	'The extension will not be enabled in virtual workspaces.': '该扩展不会在虚拟工作区中启用。',
	'A description of how virtual workspaces affects the extensions behavior and why it is needed. This only applies when `supported` is not `true`.':
		'描述虚拟工作区如何影响扩展的行为，以及为何需要此设置。仅当 `supported` 不为 `true` 时适用。',
	'Declares how the extension should be handled in untrusted workspaces.': '声明该扩展在不受信任的工作区中应如何处理。',
	'Declares the level of support for untrusted workspaces by the extension.': '声明该扩展对不受信任工作区的支持程度。',
	'The extension will be enabled in untrusted workspaces with some functionality disabled.':
		'该扩展将在不受信任的工作区中启用，但部分功能会被禁用。',
	'The extension will be enabled in untrusted workspaces with all functionality enabled.':
		'该扩展将在不受信任的工作区中启用，全部功能均可用。',
	'The extension will not be enabled in untrusted workspaces.': '该扩展不会在不受信任的工作区中启用。',
	'A list of configuration keys contributed by the extension that should not use workspace values in untrusted workspaces.':
		'该扩展贡献的配置键列表，在不受信任的工作区中不应使用工作区值。',
	'A description of how workspace trust affects the extensions behavior and why it is needed. This only applies when `supported` is not `true`.':
		'描述工作区信任如何影响扩展的行为，以及为何需要此设置。仅当 `supported` 不为 `true` 时适用。',
	'Declares whether the extension should be enabled in the Agents window. Requires the `agentsWindowActivation` API proposal and the experimental Agents window capability setting.':
		'声明该扩展是否应在智能体窗口中启用。需要 `agentsWindowActivation` API 提议以及实验性的智能体窗口功能开关。',

	// ========================================== extensions — sponsor / icon / l10n
	'Specify the location from where users can sponsor your extension.': '指定用户可以赞助此扩展的网址。',
	'URL from where users can sponsor your extension. It must be a valid URL with a HTTP or HTTPS protocol. Example value: https://github.com/sponsors/nvaccess':
		'用户可以赞助此扩展的网址。它必须是使用 HTTP 或 HTTPS 协议的合法网址。示例值：https://github.com/sponsors/nvaccess。',
	'Script executed before the package is published as a Olympia IDE extension.':
		'在将此程序包作为 Olympia IDE 扩展发布之前执行的脚本。',
	'The path to a 128x128 pixel icon.': '指向 128x128 像素图标的路径。',
	'The relative path to a folder containing localization (bundle.l10n.*.json) files. Must be specified if you are using the vscode.l10n API.':
		'指向包含本地化文件（bundle.l10n.*.json）的文件夹的相对路径。如果使用 vscode.l10n API，则必须指定。',
};