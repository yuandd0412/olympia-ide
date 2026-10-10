// zh-cn dictionary batch 23 -- chat attachments: files, images, notebooks, context, browser sharing
export default {
	// ---- generic attachment ----
	'{0} - {1}': '{0} - {1}',
	'cell': '单元格',
	'file': '文件',
	'{0} (Delete)': '{0}（删除）',
	'Remove from context': '从上下文中移除',
	'Attached file, {0}, line {1} to line {2}': '已附加文件 {0}，第 {1} 行至第 {2} 行',
	'Attached file, {0}': '已附加文件 {0}',
	'Omitted this file: {0}': '已省略该文件：{0}',
	'Failed to save file: {0}': '保存文件失败：{0}',
	'{0} does not support this file type.': '{0} 不支持该文件类型。',
	'This folder contains {0} images, which exceeds the maximum of {1} images per request. Older images will not be sent.':
		'该文件夹包含 {0} 张图片，超过每次请求最多 {1} 张图片的上限。较早的图片将不会被发送。',
	'The full value of the chat attachment resource, including scheme and path':
		'对话附件资源的完整值，包含协议和路径',

	// ---- terminal attachment ----
	'Terminal command, {0}': '终端命令，{0}',
	'Command: {0}, exit code: {1}': '命令：{0}，退出码：{1}',
	'Output:': '输出：',

	// ---- images ----
	'Image not sent because {0} does not support images: {1}': '图片未发送，因为 {0} 不支持图片：{1}',
	'Omitted this image: {0}': '已省略该图片：{0}',
	'Partially omitted this image: {0}': '已部分省略该图片：{0}',
	'Image not sent due to limit: {0}': '因超出限制未发送图片：{0}',
	'Attached image, {0}. Image support depends on the model selected by Auto.':
		'已附加图片 {0}。图片支持情况取决于 Auto 所选的模型。',
	'Attached image, {0}': '已附加图片 {0}',
	'Save Image As...': '图片另存为...',
	'Failed to save image: {0}': '保存图片失败：{0}',
	'{0} does not support images.': '{0} 不支持图片。',
	'This image was not sent because the maximum of {0} images per request was exceeded.':
		'该图片未发送，因为超过了每次请求最多 {0} 张图片的上限。',
	'This image was not sent because this model\'s image limit was exceeded.':
		'该图片未发送，因为超出了此模型的图片数量上限。',
	'This GIF was partially omitted - current frame will be sent.': '该 GIF 已被部分省略 —— 将发送当前帧。',
	'Image support depends on the model selected by Auto.': '图片支持情况取决于 Auto 所选的模型。',

	// ---- prompt / instructions ----
	'Prompt file, {0}': '提示词文件，{0}',
	'Instructions attachment, {0}': '指令附件，{0}',
	'Prompt': '提示词',
	'Instructions': '指令',
	'Link to chat {0}': '指向对话 {0} 的链接',
	'Open chat "{0}"': '打开对话「{0}」',

	// ---- notebook ----
	'Attached Notebook output, {0}': '已附加笔记本输出，{0}',
	'Omitted this Notebook ouput: {0}': '已省略该笔记本输出：{0}',
	'Partially omitted this Notebook output: {0}': '已部分省略该笔记本输出：{0}',

	// ---- element picker ----
	'Attached element, {0}': '已附加元素，{0}',
	'ELEMENT': '元素',
	'KEY COMPUTED STYLES': '关键计算样式',
	'HTML PATH': 'HTML 路径',
	'ATTRIBUTES': '属性',
	'POSITION & SIZE': '位置与尺寸',
	'INNER TEXT': '内部文本',
	'SCREENSHOT': '屏幕截图',
	'Screenshot of attached element {0}': '所附加元素 {0} 的屏幕截图',
	'Show More...': '显示更多...',

	// ---- browser page sharing ----
	'This browser page is not shared with the agent.': '此浏览器页面未与智能体共享。',
	'This browser page cannot be shared because its address is blocked by network policy.':
		'此浏览器页面无法共享，因为其地址被网络策略阻止。',
	'Browser tools are not enabled.': '浏览器工具未启用。',
	'This browser page is no longer open.': '此浏览器页面已不再打开。',
	'Attached browser page, {0}': '已附加浏览器页面，{0}',
	'Browser page not shared with agent, {0}': '浏览器页面未与智能体共享，{0}',
	'Browser page blocked by network policy, {0}': '浏览器页面被网络策略阻止，{0}',
	'Browser tools are not enabled, {0}': '浏览器工具未启用，{0}',
	'Browser page unavailable, {0}': '浏览器页面不可用，{0}',

	// ---- context ----
	'context': '上下文',
	'Enable current {0} context': '启用当前 {0} 上下文',
	'Disable {0} context {1}': '禁用 {0} 上下文 {1}',
	'Disable current {0} context': '禁用当前 {0} 上下文',
	'Add {0} to context': '将 {0} 添加到上下文',
	'Pin selection': '固定选区',
	'Current file context': '当前文件上下文',
	'Current {0} context': '当前 {0} 上下文',
	'Suggested context, {0}': '建议的上下文，{0}',
	'Suggested context, {0}, {1}, line {2} to line {3}': '建议的上下文，{0}，{1}，第 {2} 行至第 {3} 行',
	'Suggested context, {0}, {1}': '建议的上下文，{0}，{1}',
	'Suggested browser context, {0}': '建议的浏览器上下文，{0}',
	'Open {0} in Browser': '在浏览器中打开 {0}',
};