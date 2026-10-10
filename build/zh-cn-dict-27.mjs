// zh-cn dictionary batch 27 -- MCP servers panel: lifecycle, configuration, resources, installation
export default {
	// ---- server lifecycle ----
	'Start Server': '启动服务器',
	'Stop Server': '停止服务器',
	'Restart Server': '重启服务器',
	'Reset Cached Tools': '重置工具缓存',
	'Show Configuration': '显示配置',
	'Show Installed Servers': '显示已安装的服务器',
	'Browse MCP Servers': '浏览 MCP 服务器',
	'Browse Resources...': '浏览资源...',
	'MCP Server': 'MCP 服务器',
	'Add MCP Server': '添加 MCP 服务器',
	'Add Server...': '添加服务器...',
	'Enable Plugin': '启用插件',
	'MCP Servers': 'MCP 服务器',
	'{0} (MCP Server)': '{0}（MCP 服务器）',
	'Reset Trust': '重置信任',
	'Start Prompting Server': '启动提示服务器',

	// ---- config scopes ----
	'Configuration': '配置',
	'Server configuration details': '服务器配置详情',
	'The type of the server.': '服务器的类型。',
	'URL:': 'URL：',
	'Headers:': '请求头：',
	'Workspace ({0})': '工作区（{0}）',
	'Workspace Folder': '工作区文件夹',
	'User Configuration (deprecated)': '用户配置（已弃用）',
	'Open User Configuration': '打开用户配置',
	'Open Remote User Configuration': '打开远程用户配置',
	'Open Workspace MCP Configuration': '打开工作区 MCP 配置',
	'Open Workspace Folder MCP Configuration': '打开工作区文件夹 MCP 配置',
	'Enter Server ID': '输入服务器 ID',
	'Unique identifier for this server': '此服务器的唯一标识符',
	'Enable {0} to add servers to .mcp.json, or use .vscode/mcp.json.':
		'启用 {0} 以把服务器添加到 .mcp.json，或改用 .vscode/mcp.json。',
	'Overwriting mcp server \'{0}\' from {1} with {2}.':
		'正在用 {2} 覆盖来自 {1} 的 MCP 服务器 \'{0}\'。',
	'This MCP Server is disabled because it is configured to be disabled in the Editor. Please check your [settings]({0}).':
		'此 MCP 服务器已被禁用，因为它在编辑器中被配置为禁用。请检查你的[设置]({0})。',

	// ---- errors ----
	'Failed to start MCP server \'{0}\': {1}': '启动 MCP 服务器 \'{0}\' 失败：{1}',
	'Failed to stop MCP server \'{0}\': {1}': '停止 MCP 服务器 \'{0}\' 失败：{1}',
	'MCP server {0} was unable to start successfully.': 'MCP 服务器 {0} 未能成功启动。',
	'Multiple MCP servers were unable to start successfully:\n\n{0}': '多个 MCP 服务器未能成功启动：\n\n{0}',
	'MCP server {0} has been updated and may have new tools available.':
		'MCP 服务器 {0} 已更新，可能有新的可用工具。',
	'MCP servers have been updated and may have new tools available:\n\n{0}':
		'MCP 服务器已更新，可能有新的可用工具：\n\n{0}',
	'Error loading {0} tool(s)': '加载 {0} 个工具时出错',
	'Discovering tools...': '正在发现工具...',
	'New tools available ({0})': '有新工具可用（{0}）',
	'Restarting MCP server \'{0}\' is not supported for agent-host servers. Stop and start the server instead.':
		'不支持重启智能体宿主类型的 MCP 服务器 \'{0}\'。请改为先停止再启动该服务器。',
	'This feature is currently in preview. You can disable it anytime using the setting {0}.':
		'此功能目前处于预览阶段。你可以随时通过设置项 {0} 将其禁用。',

	// ---- resources ----
	'MCP Server Resources': 'MCP 服务器资源',
	'MCP Resources...': 'MCP 资源...',
	'Select MCP Resource...': '选择 MCP 资源...',
	'Filter to an MCP resource': '筛选到某个 MCP 资源',
	'Configure SamplingModel': '配置采样模型',

	// ---- install ----
	'Install Server from Manifest...': '从清单文件安装服务器...',
	'Installs a new Model Context protocol to the mcp.json settings': '向 mcp.json 设置中安装新的 Model Context 协议',
	'Enable MCP Servers Marketplace': '启用 MCP 服务器市场',
	'Enter NPM Package Name': '输入 NPM 包名',
	'Package name (e.g., @org/package)': '包名（例如 @org/package）',
	'NPM Package': 'NPM 包',
	'Install from an NPM package name': '从 NPM 包名安装',
	'Enter Pip Package Name': '输入 Pip 包名',
	'Package name (e.g., package-name)': '包名（例如 package-name）',
	'Pip Package': 'Pip 包',
	'Install from a Pip package name': '从 Pip 包名安装',
	'Enter NuGet Package Name': '输入 NuGet 包名',
	'Package name (e.g., Package.Name)': '包名（例如 Package.Name）',
	'NuGet Package': 'NuGet 包',
	'Install from a NuGet package name': '从 NuGet 包名安装',
	'Enter Docker Image Name': '输入 Docker 镜像名',
	'Installing MCP Server {0} started. An editor is now open with more details on this MCP Server':
		'已开始安装 MCP 服务器 {0}。现已打开一个编辑器，其中包含此 MCP 服务器的更多详细信息',

	// ---- oauth / secrets ----
	'Edit Stored Input': '编辑已存储的输入',
	'Set OAuth Client Secret': '设置 OAuth 客户端密钥',
	'Delete stored client secret': '删除已存储的客户端密钥',
	'Show client secret': '显示客户端密钥',
	'Hide client secret': '隐藏客户端密钥',
	'Replace Client Secret for {0}': '替换 {0} 的客户端密钥',
	'Set Client Secret for {0}': '设置 {0} 的客户端密钥',
	'Enter the client secret for OAuth client \'{0}\'.': '请输入 OAuth 客户端 \'{0}\' 的客户端密钥。',
	'Enter a new client secret to replace the stored value': '输入新的客户端密钥以替换已存储的值',
	'Enter client secret': '输入客户端密钥',

	// ---- autostart ----
	'Automatically start MCP servers when sending a chat message': '发送对话消息时自动启动 MCP 服务器',
	'Skip Current Autostart': '跳过本次自动启动',
};