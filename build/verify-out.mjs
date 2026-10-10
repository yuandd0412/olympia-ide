// Verify Chinese strings and Olympia commands actually reached the compiled out/ tree.
//
// Two traps this script exists to avoid:
//   1. TypeScript escapes non-ASCII as \uXXXX in the emitted JS, so every check must
//      decode before comparing.
//   2. Do NOT grep for the English original to prove translation -- once translated the
//      English is gone, so that grep passes vacuously or (worse) looks like a failure.
//      Assert on the actual Chinese value instead.
//   node build/verify-out.mjs
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const OSS = 'D:/oler-ide-v2/oss';
const OUT = `${OSS}/out`;

function decode(text) {
	return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

let failures = 0;
function check(label, cond, detail = '') {
	console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}${detail ? '   ' + detail : ''}`);
	if (!cond) { failures++; }
}

function read(rel) {
	const p = `${OUT}/${rel}`;
	if (!existsSync(p)) { return null; }
	return decode(readFileSync(p, 'utf8'));
}
function readAbs(rel) {
	const p = `${OSS}/${rel}`;
	return existsSync(p) ? decode(readFileSync(p, 'utf8')) : null;
}

// ---- 1. workbench Chinese UI ----
console.log('== 中文文案进入 out/ ==');
const editor = read('vs/workbench/browser/parts/editor/editor.contribution.js');
check('编辑器菜单「向上拆分」', !!editor && editor.includes('向上拆分'));
check('编辑器菜单「向右拆分」', !!editor && editor.includes('向右拆分'));
check('编辑器菜单「编辑器组」', !!editor && editor.includes('编辑器组'));

const layout = read('vs/workbench/browser/actions/layoutActions.js');
check('布局菜单「自定义布局」', !!layout && layout.includes('自定义布局'));
check('布局菜单「底部面板」', !!layout && layout.includes('底部面板'));

const settings = read('vs/workbench/contrib/preferences/browser/settingsLayout.js');
check('设置页含 Olympia 分类', !!settings && settings.includes('olympia'));
check('设置页含「编译器」分类', !!settings && settings.includes('编译器'));

const welcome = read('vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted.js');
check('起始页「装完，就打比赛」', !!welcome && welcome.includes('装完，就打比赛'));

const notifications = read('vs/workbench/browser/parts/notifications/notificationsStatus.js');
check('通知中心「免打扰」', !!notifications && notifications.includes('免打扰'));

const fileActions = read('vs/workbench/contrib/files/browser/fileActions.js');
check('文件操作「新建文件」', !!fileActions && fileActions.includes('新建文件'));

const replaceService = read('vs/workbench/contrib/search/browser/replaceService.js');
check('搜索「搜索和替换」', !!replaceService && replaceService.includes('搜索和替换'));

const scm = read('vs/workbench/contrib/scm/browser/scm.contribution.js');
check('源代码管理「仓库」', !!scm && scm.includes('仓库'));

// ---- 2. top menu bar fully localized ----
console.log('\n== 顶部菜单栏 ==');
const menubar = read('vs/workbench/browser/parts/titlebar/menubar.contribution.js');
for (const cn of ['文件', '编辑', '选择', '视图', '转到', '终端', '帮助', '首选项']) {
	// the call shape is localize({ key, comment: [...] }, "&&<cn>"), which contains a comma,
	// so match on the localized literal alone rather than trying to span the argument list
	check(`&&${cn}`, !!menubar && menubar.includes(`"&&${cn}"`));
}
check('菜单栏已无英文 File/Edit/Help',
	!!menubar && !/"&&(File|Edit|Selection|View|Go|Terminal|Help|Preferences)"/.test(menubar));

// ---- 2b. batch 14-18: debug / editor config / extensions / terminal ----
// NOTE: every path below was resolved by actually locating the emitted string
// (build/locate-zh2.mjs), not guessed. Guessed paths make the check fail even
// when translation shipped correctly, which is worse than no check at all.
console.log('\n== 调试面板 ==');
const debugAccessHelp = read('vs/workbench/contrib/debug/browser/runAndDebugAccessibilityHelp.js');
check('调试「聚焦到断点视图」', !!debugAccessHelp && debugAccessHelp.includes('聚焦到断点视图'));
const breakpointsView = read('vs/workbench/contrib/debug/browser/breakpointsView.js');
check('调试「移除所有断点」', !!breakpointsView && breakpointsView.includes('移除所有断点'));
const watchView = read('vs/workbench/contrib/debug/browser/watchExpressionsView.js');
check('调试「移除所有表达式」', !!watchView && watchView.includes('移除所有表达式'));
const debugCommands = read('vs/workbench/contrib/debug/browser/debugCommands.js');
check('调试「不调试直接运行」', !!debugCommands && debugCommands.includes('不调试直接运行'));
const debugContribution = read('vs/workbench/contrib/debug/browser/debug.contribution.js');
check('调试「展开惰性变量」', !!debugContribution && debugContribution.includes('展开惰性变量'));

console.log('\n== 编辑器设置 ==');
const editorOpts = read('vs/editor/common/config/editorOptions.js');
for (const cn of ['控制是否显示缩略图（minimap）。', '控制编辑器是否渲染缩进参考线。']) {
	check(`编辑器设置「${cn}」`, !!editorOpts && editorOpts.includes(cn));
}
check('编辑器设置无英文 minimap 描述', !!editorOpts && !editorOpts.includes('Controls whether the minimap is shown.'));

console.log('\n== 集成终端 ==');
const termCfg = read('vs/workbench/contrib/terminal/common/terminalConfiguration.js');
for (const cn of ['控制终端光标是否闪烁。', '控制终端字号（像素）。', '控制是否在终端中启用字体连字。']) {
	check(`终端设置「${cn}」`, !!termCfg && termCfg.includes(cn));
}
const termStrings = read('vs/workbench/contrib/terminal/common/terminalStrings.js');
for (const cn of ['在自定义工作目录中创建新终端', '重命名当前活动的终端', '在终端中显示该命令']) {
	check(`终端「${cn}」`, !!termStrings && termStrings.includes(cn));
}

console.log('\n== 扩展面板 ==');
const extContribution = read('vs/workbench/contrib/extensions/browser/extensions.contribution.js');
for (const cn of ['管理扩展', '安装或搜索扩展']) {
	check(`扩展「${cn}」`, !!extContribution && extContribution.includes(cn));
}
const extWorkbench = read('vs/workbench/contrib/extensions/browser/extensionsWorkbenchService.js');
check('扩展「连同依赖项一起卸载扩展」', !!extWorkbench && extWorkbench.includes('连同依赖项一起卸载扩展'));
check('扩展「自动更新」', !!extWorkbench && extWorkbench.includes('自动更新'));

console.log('\n== 主题与无障碍（批次 19/20） ==');
const editorColors = read('vs/platform/theme/common/colors/editorColors.js');
check('主题「粘滞视图阴影颜色」已中文化', !!editorColors && editorColors.includes('编辑器中粘滞视图的阴影颜色'));
check('主题该条英文原文已消失', !!editorColors && !editorColors.includes('Shadow color of sticky scroll in the editor'));

const a11yConfig = read('vs/workbench/contrib/accessibility/browser/accessibilityConfiguration.js');
for (const cn of ['每当文件被保存时都进行播报，包括自动保存。', '当文件或笔记本被格式化时进行播报。', '当编辑被撤销时进行播报。']) {
	check(`无障碍信号「${cn}」`, !!a11yConfig && a11yConfig.includes(cn));
}
check('无障碍信号无英文原文', !!a11yConfig && !a11yConfig.includes('Announces when a file is saved.'));

console.log('\n== AI 对话界面（批次 21） ==');
const modelPicker = read('vs/workbench/contrib/chat/browser/widget/input/modelPicker/modelPickerItemSections.js');
check('模型选择「没有可用模型」', !!modelPicker && modelPicker.includes('没有可用模型'));

const confirmCarousel = read('vs/workbench/contrib/chat/browser/widget/chatContentParts/toolInvocationParts/chatToolConfirmationCarouselPart.js');
check('工具确认「全部允许」', !!confirmCarousel && confirmCarousel.includes('全部允许'));
// "Allow Once" only appears in comments/tests in the carousel part; the shipped label lives in
// the permission enum schema, so assert against the file that actually renders it.
const sessionPerms = read('vs/platform/agentHost/node/sessionPermissions.js');
check('工具确认「仅允许一次」', !!sessionPerms && sessionPerms.includes('仅允许一次'));

const chatInlineAnchor = read('vs/workbench/contrib/chat/browser/widget/chatContentParts/chatInlineAnchorWidget.js');
check('聊天「将文件添加到对话」', !!chatInlineAnchor && chatInlineAnchor.includes('将文件添加到对话'));

const chatArtifacts = read('vs/workbench/contrib/chat/browser/widget/chatArtifactsWidget.js');
check('聊天「对话产物」', !!chatArtifacts && chatArtifacts.includes('对话产物'));

console.log('\n== 批次 29-33：问题报告/浏览器/评论/搜索/差异 ==');
const issueReporter = read('vs/workbench/contrib/issue/browser/baseIssueReporterService.js');
check('问题报告「在 GitHub 上创建」', !!issueReporter && issueReporter.includes('在 GitHub 上创建'));

const browserView = read('vs/workbench/contrib/browserView/common/browserView.js');
check('浏览器「与智能体共享」', !!browserView && browserView.includes('与智能体共享'));

const commentsModel = read('vs/workbench/contrib/comments/browser/commentsModel.js');
check('评论「此工作区还没有任何评论。」', !!commentsModel && commentsModel.includes('此工作区还没有任何评论。'));

const searchActions = read('vs/workbench/contrib/search/browser/searchActionsFind.js');
check('搜索「将搜索限制在此文件夹」', !!searchActions && searchActions.includes('将搜索限制在此文件夹'));

const diffHelp = read('vs/workbench/contrib/codeEditor/browser/diffEditorAccessibilityHelp.js');
check('差异视图「你正处于差异编辑器中。」', !!diffHelp && diffHelp.includes('你正处于差异编辑器中。'));

const modelsWidget = read('vs/workbench/contrib/chat/browser/chatManagement/chatModelsWidget.js');
check('模型管理「添加模型」', !!modelsWidget && modelsWidget.includes('添加模型'));

// ---- 3. Olympia extension artifacts ----
console.log('\n== Olympia 扩展产物 ==');
for (const f of ['extension.js', 'precheck.js', 'compile.js']) {
	check(`out/${f} 存在`, existsSync(`${OSS}/extensions/olympia-onboarding/out/${f}`));
}
const extJs = readAbs('extensions/olympia-onboarding/out/extension.js') ?? '';
for (const cmd of [
	'olympia.checkEnvironment', 'olympia.pickCompileProfile', 'olympia.preSubmitCheck',
	'olympia.compile', 'olympia.compileJudgeAccurate', 'olympia.compileAndRun', 'olympia.openWebsite'
]) {
	check(`命令 ${cmd}`, extJs.includes(cmd));
}
check('扩展产物含中文（提交前体检）', extJs.includes('提交前体检'));

const compileJs = readAbs('extensions/olympia-onboarding/out/compile.js') ?? '';
check('编译参数 -DONLINE_JUDGE（无值）', compileJs.includes('-DONLINE_JUDGE'));
check('编译参数不含 -DONLINE_JUDGE=luogu', !compileJs.includes('-DONLINE_JUDGE=luogu'));
for (const flag of ['-fPIC', '-fno-asm', '-march=native', '-x', 'c++']) {
	check(`评测机开关 ${flag}`, compileJs.includes(`'${flag}'`) || compileJs.includes(`"${flag}"`));
}

const preJs = readAbs('extensions/olympia-onboarding/out/precheck.js') ?? '';
for (const rule of ['crlf', 'pragmaOptimize', 'onlineJudge', 'memoryLeak', 'reservedWord', 'freopen', 'ioMix', 'removedCpp']) {
	check(`体检规则 ${rule}`, preJs.includes(rule));
}

// ---- 4. brand ----
console.log('\n== 品牌 ==');
const product = JSON.parse(readFileSync(`${OSS}/product.json`, 'utf8'));
check('product.json nameShort = Olympia', product.nameShort === 'Olympia', String(product.nameShort));
check('product.json longName 无 VS Code', !/Visual Studio Code|VS Code/.test(product.longName ?? ''), product.longName ?? '');
const icon = readFileSync(`${OSS}/src/vs/workbench/browser/media/code-icon.svg`, 'utf8');
check('logo 为 Verdict Ring', icon.includes('#5ce68c') && icon.includes('#6ec8f5'));

// ---- 5. copilot provider must stay out of the bundle ----
console.log('\n== Copilot 拆除 ==');
check('product.json 无 copilot 内置声明',
	!JSON.stringify(product.builtInExtensions ?? []).match(/copilot/i) &&
	!JSON.stringify(product.webBuiltInExtensions ?? []).match(/copilot/i));
check('out/extensions/copilot 不存在', !existsSync(`${OUT}/extensions/copilot`));
check('.build/extensions/copilot 不存在', !existsSync(`${OSS}/.build/extensions/copilot`));
check('product.json 无 chatServiceUrl（走 BYOK 自建接入层）', !product.chatServiceUrl);

// ---- 批次 53-59：搜索 / 文件 / 编辑器 / 大纲 / 批注 / SCM / 更新 / 主题 ----
console.log('\n== 批次 53-59：搜索 / 文件 / 编辑器 / 大纲 / 批注 / SCM / 更新 ==');

const searchView = read('vs/workbench/contrib/search/browser/searchView.js');
check('搜索「未找到结果（已排除」', !!searchView && searchView.includes('未找到结果（已排除'));
check('搜索「在 {1} 个文件中把 {0} 处替换为」', !!searchView && searchView.includes('在 {1} 个文件中把 {0} 处替换为'));
check('搜索视图英文原文已消失', !!searchView && !searchView.includes('No results found excluding'));

const searchNav = read('vs/workbench/contrib/search/browser/searchActionsNav.js');
check('搜索「切换全字匹配」', !!searchNav && searchNav.includes('切换全字匹配'));
check('搜索「在文件中替换」', !!searchNav && searchNav.includes('在文件中替换'));

const fileMenus = read('vs/workbench/contrib/files/browser/fileActions.contribution.js');
check('文件菜单「自动保存(A&&U)」', !!fileMenus && fileMenus.includes('自动保存(A&&U)'));

const explorerViewlet = read('vs/workbench/contrib/files/browser/explorerViewlet.js');
check('资源管理器视图「资源管理器(&&E)」', !!explorerViewlet && explorerViewlet.includes('资源管理器(&&E)'));

const explorerViewer = read('vs/workbench/contrib/files/browser/views/explorerViewer.js');
check('资源管理器「确定要将 \' 移动到 \' 中吗？」', !!explorerViewer && explorerViewer.includes("确定要将 '{0}' 移动到 '{1}' 中吗？"));

const standalone = read('vs/editor/common/standaloneStrings.js');
check('无障碍「已启用屏幕阅读器优化模式。」', !!standalone && standalone.includes('已启用屏幕阅读器优化模式。'));
check('命令面板「转到偏移量...」', !!standalone && standalone.includes('转到偏移量...'));

const ctxKeys = read('vs/editor/common/editorContextKeys.js');
check('上下文键「编辑器是否为只读」', !!ctxKeys && ctxKeys.includes('编辑器是否为只读'));
check('上下文键「当前上下文是否为多文件差异编辑器」', !!ctxKeys && ctxKeys.includes('当前上下文是否为多文件差异编辑器'));

const langs = read('vs/editor/common/languages.js');
check('补全类型「枚举成员」', !!langs && langs.includes('枚举成员'));
check('符号种类「结构体」', !!langs && langs.includes('结构体'));

const editorOptions = read('vs/editor/common/config/editorOptions.js');
check('编辑器设置「控制行的换行方式。」', !!editorOptions && editorOptions.includes('控制行的换行方式。'));

const linesOps = read('vs/editor/contrib/linesOperations/browser/linesOperations.js');
check('编辑器命令「转换为驼峰命名」', !!linesOps && linesOps.includes('转换为驼峰命名'));
check('编辑器命令「删除光标左侧全部内容」', !!linesOps && linesOps.includes('删除光标左侧全部内容'));

const multicursor = read('vs/editor/contrib/multicursor/browser/multicursor.js');
check('多光标「在每行末尾添加光标」', !!multicursor && multicursor.includes('在每行末尾添加光标'));
check('多光标「选择所有匹配项(&&O)」', !!multicursor && multicursor.includes('选择所有匹配项(&&O)'));

const indentation = read('vs/editor/contrib/indentation/browser/indentation.js');
check('缩进设置「从内容中检测缩进方式。」', !!indentation && indentation.includes('从内容中检测缩进方式。'));
check('缩进「使用制表符进行缩进。」', !!indentation && indentation.includes('使用制表符进行缩进。'));
check('缩进英文原文已消失', !!indentation && !indentation.includes('Use indentation with tabs.'));

const outlineActions = read('vs/workbench/contrib/outline/browser/outlineActions.js');
check('大纲「排序方式：位置」', !!outlineActions && outlineActions.includes('排序方式：位置'));
check('大纲「跟随光标」', !!outlineActions && outlineActions.includes('跟随光标'));

const commentsView = read('vs/workbench/contrib/comments/browser/commentsView.js');
check('批注「当前工作区的批注」', !!commentsView && commentsView.includes('当前工作区的批注'));

const scmPane = read('vs/workbench/contrib/scm/browser/scmViewPane.js');
check('源代码管理「折叠所有仓库」', !!scmPane && scmPane.includes('折叠所有仓库'));

const scmInput = read('vs/workbench/contrib/scm/browser/scmInput.js');
check('源代码管理「生成提交信息」', !!scmInput && scmInput.includes('生成提交信息'));

const updateTooltip = read('vs/workbench/contrib/update/browser/updateTooltip.js');
check('更新「自动更新已启用。祝你编程愉快！」', !!updateTooltip && updateTooltip.includes('自动更新已启用。祝你编程愉快！'));
check('更新「没有可用的更新」', !!updateTooltip && updateTooltip.includes('没有可用的更新'));

const colorRegistry = read('vs/editor/common/core/editorColorRegistry.js');
check('主题「用于高亮 Unicode 字符的背景色。」', !!colorRegistry && colorRegistry.includes('用于高亮 Unicode 字符的背景色。'));
check('主题「编辑器缩进参考线的颜色（1）。」', !!colorRegistry && colorRegistry.includes('编辑器缩进参考线的颜色（1）。'));

console.log('\n== 批次 60：笔记本 ==');
const notebookContrib = read('vs/workbench/contrib/notebook/browser/notebook.contribution.js');
check('笔记本「控制是否以紧凑形式呈现笔记本编辑器。」', !!notebookContrib && notebookContrib.includes('控制是否以紧凑形式呈现笔记本编辑器。'));

const notebookWidget = read('vs/workbench/contrib/notebook/browser/notebookEditorWidget.js');
check('笔记本「笔记本单元格的边框颜色。」', !!notebookWidget && notebookWidget.includes('笔记本单元格的边框颜色。'));

const notebookEditActions = read('vs/workbench/contrib/notebook/browser/controller/editActions.js');
check('笔记本「停止编辑所有单元格」', !!notebookEditActions && notebookEditActions.includes('停止编辑所有单元格'));
check('笔记本「清空所有输出」', !!notebookEditActions && notebookEditActions.includes('清空所有输出'));
check('笔记本「为选中的单元格添加批注」', !!notebookEditActions && notebookEditActions.includes('为选中的单元格添加批注'));

const notebookInsertActions = read('vs/workbench/contrib/notebook/browser/controller/insertCellActions.js');
check('笔记本「在上方插入代码单元格」', !!notebookInsertActions && notebookInsertActions.includes('在上方插入代码单元格'));
check('笔记本「在顶部添加 Markdown 单元格」', !!notebookInsertActions && notebookInsertActions.includes('在顶部添加 Markdown 单元格'));

console.log('\n== 批次 61：编辑器组与导航动作 ==');
const editorActions = read('vs/workbench/browser/parts/editor/editorActions.js');
check('编辑器组「拆分编辑器（垂直）」', !!editorActions && editorActions.includes('拆分编辑器（垂直）'));
check('编辑器组「合并所有编辑器组」', !!editorActions && editorActions.includes('合并所有编辑器组'));
check('编辑器组「网格编辑器布局（2x2）」', !!editorActions && editorActions.includes('网格编辑器布局（2x2）'));
check('编辑器组「新建空编辑器窗口(&&N)」', !!editorActions && editorActions.includes('新建空编辑器窗口(&&N)'));
check('编辑器组「清除最近打开的...」', !!editorActions && editorActions.includes('清除最近打开的...'));
check('编辑器组英文原文已消失', !!editorActions && !editorActions.includes('Join All Editor Groups'));

console.log('\n== 批次 62：工作台设置描述 ==');
const workbenchContrib = read('vs/workbench/browser/workbench.contribution.js');
check('设置「控制是否限制已打开编辑器的数量。」', !!workbenchContrib && workbenchContrib.includes('控制是否限制已打开编辑器的数量。'));
check('设置「控制工作台中的字体抗锯齿方式。」', !!workbenchContrib && workbenchContrib.includes('控制工作台中的字体抗锯齿方式。'));
check('设置「活动栏显示在主侧边栏的侧边、辅助侧边栏的上方。」', !!workbenchContrib && workbenchContrib.includes('活动栏显示在主侧边栏的侧边、辅助侧边栏的上方。'));
check('设置「根据当前上下文（如已打开的工作区或活动编辑器）控制窗口标题。」', !!workbenchContrib && workbenchContrib.includes('根据当前上下文（如已打开的工作区或活动编辑器）控制窗口标题。'));
check('设置「`${appName}`：例如 Olympia IDE。」', !!workbenchContrib && workbenchContrib.includes('${appName}`：例如 Olympia IDE'));
check('设置英文原文已消失', !!workbenchContrib && !workbenchContrib.includes('Controls font aliasing method in the workbench.'));

console.log('\n== 批次 63：主题颜色描述 + 工作台上下文键 ==');
const themeReg = read('vs/workbench/common/theme.js');
const wbCtxKeys = read('vs/workbench/common/contextkeys.js');
check('主题「标签页是编辑器区域中编辑器的容器」', !!themeReg && themeReg.includes('标签页是编辑器区域中编辑器的容器'));
check('主题「状态栏显示在窗口底部。」', !!themeReg && themeReg.includes('状态栏显示在窗口底部。'));
check('主题「启用新式标签页样式时活动编辑器标签页上标签页操作的不透明背景颜色。」', !!themeReg && themeReg.includes('启用新式标签页样式时活动编辑器标签页上标签页操作的不透明背景颜色。'));
check('主题「启用新式界面时，悬停于默认边侧位置活动栏项目的背景颜色。」', !!themeReg && themeReg.includes('启用新式界面时，悬停于默认边侧位置活动栏项目的背景颜色。'));
check('主题「窗口未激活时命令中心的前景色」', !!themeReg && themeReg.includes('窗口未激活时命令中心的前景色'));
check('主题「面板分区是嵌套在面板内部的视图。」', !!themeReg && themeReg.includes('面板分区是嵌套在面板内部的视图。'));
check('主题「侧边栏分区是嵌套在侧边栏内部的视图。」', !!themeReg && themeReg.includes('侧边栏分区是嵌套在侧边栏内部的视图。'));
check('主题「通知从窗口右下角滑入。」', !!themeReg && themeReg.includes('通知从窗口右下角滑入。'));
check('主题「编辑器组是编辑器的容器。」', !!themeReg && themeReg.includes('编辑器组是编辑器的容器。'));
check('主题英文原文已消失', !!themeReg && !themeReg.includes('Tabs are the containers for editors in the editor area'));
check('上下文键「窗口中打开的工作区类型」', !!wbCtxKeys && wbCtxKeys.includes('窗口中打开的工作区类型'));
check('上下文键「活动编辑器是否为所在组中的最后一个」', !!wbCtxKeys && wbCtxKeys.includes('活动编辑器是否为所在组中的最后一个'));
check('上下文键「资源所在的文件夹名称」', !!wbCtxKeys && wbCtxKeys.includes('资源所在的文件夹名称'));
check('上下文键英文原文已消失', !!wbCtxKeys && !wbCtxKeys.includes('The number of opened editor groups'));

console.log('\n== 批次 63b：被 200 字符截断漏掉的主题描述 ==');
check('主题「已打开工作区或文件夹但窗口未激活时的状态栏背景色。」', !!themeReg && themeReg.includes('已打开工作区或文件夹但窗口未激活时的状态栏背景色。'));
check('主题「面板中横向堆叠多个视图时所用的分区边框颜色。」', !!themeReg && themeReg.includes('面板中横向堆叠多个视图时所用的分区边框颜色。'));
check('主题「侧边栏分区的拖放反馈颜色。」', !!themeReg && themeReg.includes('侧边栏分区的拖放反馈颜色。'));
check('主题「标签页之间的边框，用于表示可以在两个标签页之间插入新标签页。」', !!themeReg && themeReg.includes('标签页之间的边框，用于表示可以在两个标签页之间插入新标签页。'));
check('主题超长英文原文已消失', !!themeReg && !themeReg.includes('Border between tabs to indicate that a tab can be inserted'));

console.log('\n== 批次 64：扩展作者 schema（菜单 + manifest） ==');
const menusEP = read('vs/workbench/services/actions/common/menusExtensionPoint.js');
const extReg = read('vs/workbench/services/extensions/common/extensionsRegistry.js');
check('菜单「扩展贡献的批注线程上下文菜单」', !!menusEP && menusEP.includes('扩展贡献的批注线程上下文菜单'));
check('菜单「向命令面板贡献命令。」', !!menusEP && menusEP.includes('向命令面板贡献命令。'));
check('菜单「菜单项引用了 `submenus` 区段中未定义的子菜单 `{0}`。」', !!menusEP && menusEP.includes('菜单项引用了 `submenus` 区段中未定义的子菜单 `{0}`。'));
check('菜单英文原文已消失', !!menusEP && !menusEP.includes('Contributes commands to the command palette.'));
check('扩展 schema「定义扩展的类型。」', !!extReg && extReg.includes('定义扩展的类型。'));
check('扩展 schema「该扩展不会在不受信任的工作区中启用。」', !!extReg && extReg.includes('该扩展不会在不受信任的工作区中启用。'));
check('扩展 schema「徽标图片 URL。」', !!extReg && extReg.includes('徽标图片 URL。'));
check('扩展 schema 英文原文已消失', !!extReg && !extReg.includes('Engine compatibility.'));

console.log('\n== 批次 65-67：工作台 / 终端 / 文件 / 编辑器设置 ==');
const wbContrib65 = read('vs/workbench/browser/workbench.contribution.js');
const termCfg66 = read('vs/workbench/contrib/terminal/common/terminalConfiguration.js');
const filesCfg67 = read('vs/workbench/contrib/files/browser/files.contribution.js');
const edOpts67 = read('vs/editor/common/config/editorOptions.js');
check('工作台设置「控制是否启用新式界面。」', !!wbContrib65 && wbContrib65.includes('控制是否启用新式界面。'));
check('工作台设置「预览模式的编辑器」', !!wbContrib65 && wbContrib65.includes('预览模式的编辑器'));
check('工作台设置「本地文件历史记录」', !!wbContrib65 && wbContrib65.includes('本地文件历史记录'));
check('终端设置「是否在终端中启用文件链接。」', !!termCfg66 && termCfg66.includes('是否在终端中启用文件链接。'));
check('终端设置「决定是否自动注入 shell 集成」', !!termCfg66 && termCfg66.includes('决定是否自动注入 shell 集成'));
check('终端设置「受支持的 shell：」', !!termCfg66 && termCfg66.includes('受支持的 shell：'));
check('文件设置「控制资源管理器是否以紧凑形式呈现文件夹。」', !!filesCfg67 && filesCfg67.includes('控制资源管理器是否以紧凑形式呈现文件夹。'));
check('文件设置「文件与语言之间关联关系」', !!filesCfg67 && filesCfg67.includes('文件与语言之间关联关系'));
check('编辑器设置「控制屏幕阅读器一次可以朗读编辑器中的多少行。」', !!edOpts67 && edOpts67.includes('控制屏幕阅读器一次可以朗读编辑器中的多少行。'));
check('编辑器设置「用来通过鼠标添加多个光标的修饰键。」', !!edOpts67 && edOpts67.includes('用来通过鼠标添加多个光标的修饰键。'));
check('编辑器设置英文原文已消失', !!edOpts67 && !edOpts67.includes('Controls the number of lines in the editor that can be read out by a screen reader'));

console.log('\n== 批次 68-69：桌面窗口设置 + 无障碍 ==');
const desktopCfg = read('vs/workbench/electron-browser/desktop.contribution.js');
const a11yCfg = read('vs/workbench/contrib/accessibility/browser/accessibilityConfiguration.js');
check('桌面「控制是否启用新式界面。」- 窗口「重新打开所有窗口」', !!desktopCfg && desktopCfg.includes('重新打开所有窗口'));
check('桌面「调整菜单样式」', !!desktopCfg && desktopCfg.includes('调整菜单样式'));
check('桌面「启用 macOS 原生的窗口标签页。」', !!desktopCfg && desktopCfg.includes('启用 macOS 原生的窗口标签页。'));
check('桌面「退出(&&X)」', !!desktopCfg && desktopCfg.includes('退出(&&X)'));
check('桌面英文原文已消失', !!desktopCfg && !desktopCfg.includes('Merge All Windows'));
check('无障碍「在终端获得焦点时，提供如何访问终端无障碍帮助菜单的信息。」', !!a11yCfg && a11yCfg.includes('在终端获得焦点时，提供如何访问终端无障碍帮助菜单的信息。'));
check('无障碍「控制工作台中的链接是否加下划线。」', !!a11yCfg && a11yCfg.includes('控制工作台中的链接是否加下划线。'));
check('无障碍「当出现下一处编辑建议时」', !!a11yCfg && a11yCfg.includes('当出现下一处编辑建议时'));
check('无障碍英文原文已消失', !!a11yCfg && !a11yCfg.includes('Controls whether the Accessible View is hidden.'));

console.log('\n== 批次 70：官方语言包批量生成（11,498 处 / 1,438 文件） ==');
const problemMatcher = read('vs/workbench/contrib/tasks/common/problemMatcher.js');
const agentPlugins = read('vs/workbench/contrib/chat/browser/agentPluginsView.js');
const migrationCats = read('vs/workbench/contrib/chat/browser/aiCustomization/customizationMigrationCategories.js');
check('任务「问题模式或者所提供或预定义问题模式的名称」', !!problemMatcher && problemMatcher.includes('问题模式或者所提供或预定义问题模式的名称'));
check('任务英文原文已消失', !!problemMatcher && !problemMatcher.includes('A problem pattern or the name of a contributed or predefined problem pattern'));
check('智能体「浏览智能体插件」', !!agentPlugins && agentPlugins.includes('浏览智能体插件'));
check('MCP「详细了解 MCP 服务器」', !!migrationCats && migrationCats.includes('详细了解 MCP 服务器'));
// the applier must never touch plain string literals outside localize() calls
const taskTemplates = read('vs/workbench/contrib/tasks/common/taskTemplates.js');
check('非 localize 字符串未被误改（tasks.json 模板保持英文）',
	!!taskTemplates && taskTemplates.includes('See https://go.microsoft.com/fwlink/?LinkId=733558')
	&& !taskTemplates.includes('请参阅 https://go.microsoft.com/fwlink'));

console.log('\n== 减法 / 加法：内置扩展裁剪 + olympia-contest ==');
// Removal is only real if the dev-mode scanner skips these folders. Asserting on the
// workbench bundle would be vacuous: it never contains extension names at all.
const scannerSrc = readFileSync('D:/oler-ide-v2/oss/src/vs/platform/extensionManagement/common/extensionsScannerService.ts', 'utf8');
const removedNames = ['git', 'git-base', 'github-authentication', 'php-language-features', 'ms-vscode.js-debug', 'microsoft-authentication', 'python', 'java'];
for (const n of removedNames) {
	check(`减法：${n} 已从 dev 扫描层排除`, scannerSrc.includes(`\t'${n}',`));
}
check('减法：product.json 不再声明市场内置扩展', JSON.parse(readFileSync('D:/oler-ide-v2/oss/product.json', 'utf8')).builtInExtensions.length === 0);
// addition: the contest helper must be compiled and registered
const contestPkg = JSON.parse(readFileSync('D:/oler-ide-v2/oss/extensions/olympia-contest/package.json', 'utf8'));
check('加法：olympia-contest 已注册拉取题面命令', contestPkg.contributes.commands.some(c => c.command === 'olympia.problem.pull'));
check('加法：olympia-contest 未被误排除', !scannerSrc.includes("'olympia-contest',"));
const contestOut = readFileSync('D:/oler-ide-v2/oss/extensions/olympia-contest/out/sources.js', 'utf8');
check('加法：题面拉取器已编译（洛谷/Codeforces/AtCoder）',
	contestOut.includes('lentille-context') && contestOut.includes('codeforces.com/api') && contestOut.includes('atcoder.jp'));
const contestTemplates = readFileSync('D:/oler-ide-v2/oss/extensions/olympia-contest/out/templates.js', 'utf8');
check('加法：ACM / IOI 赛制模板已编译', contestTemplates.includes('ACM') && contestTemplates.includes('IOI'));

// Copilot must not merely be excluded as an extension — the agent host registers a `copilotcli`
// provider that spawns the bundled copilot-runtime.exe on every launch regardless. Both entry
// points (local + remote server) must gate it behind an env var that defaults to OFF.
const agentHostMainSrc = readFileSync('D:/oler-ide-v2/oss/src/vs/platform/agentHost/node/agentHostMain.ts', 'utf8');
const agentHostServerSrc = readFileSync('D:/oler-ide-v2/oss/src/vs/platform/agentHost/node/agentHostServerMain.ts', 'utf8');
for (const [label, src] of [['本地 agentHost', agentHostMainSrc], ['远程 agentHost', agentHostServerSrc]]) {
	// The registration must be the FIRST statement inside an `if (isAgentEnabled(...Copilot...,
	// false))` guard, not at statement level. Compare offsets (not indentation) so the check works
	// for both nesting depths, and never fold this into one `includes()` — a bare substring test
	// passes even when the gate and the registration live in unrelated places.
	const guardOpen = 'if (isAgentEnabled(process.env[AgentHostCopilotAgentEnabledEnvVar], false)) {\n';
	const guardIdx = src.indexOf(guardOpen);
	const afterGuard = guardIdx >= 0 ? src.slice(guardIdx + guardOpen.length) : '';
	const regFirst = /^[ \t]*providerService\.registerProvider\(instantiationService\.createInstance\(CopilotAgent\)\);?[ \t]*\r?\n/.test(afterGuard);
	// no ungated copy elsewhere in the file
	const occurrences = src.split('providerService.registerProvider(instantiationService.createInstance(CopilotAgent))').length - 1;
	check(`减法：${label} 的 Copilot provider 已加门控（唯一且在 if 内）`, regFirst && occurrences === 1);
}
// the gate must default to OFF — that is what actually stops the runtime from spawning
check('减法：Copilot provider 默认关闭（默认值为 false）',
	/AgentHostCopilotAgentEnabledEnvVar\], false\)/.test(agentHostMainSrc)
	&& /AgentHostCopilotAgentEnabledEnvVar\], false\)/.test(agentHostServerSrc));

// ---- bundled C++ toolchain ----
// The toolchain is the thing that makes "install and compile" true without a separate compiler, so
// assert on the files an actual compile needs rather than on the staging directory merely existing.
const tcRoot = 'D:/oler-ide-v2/oss/.build/toolchain/mingw64';
const tcBin = join(tcRoot, 'bin');
check('加法：内置 g++.exe 已就位', existsSync(join(tcBin, 'g++.exe')));
check('加法：内置编译器 gcc.exe 已就位', existsSync(join(tcBin, 'gcc.exe')));
for (const dll of ['zlib1.dll', 'libzstd.dll', 'libintl-8.dll', 'libwinpthread-1.dll', 'libstdc++-6.dll']) {
	check(`加法：内置工具链依赖 ${dll} 齐备（缺失会导致链接器无法启动）`,
		existsSync(join(tcBin, dll)));
}
// Static libraries the default GCC link line asks for by name. libgcc.a lives under the
// versioned gcc directory rather than lib/ root, so search recursively rather than assuming.
function findAny(root, name) {
	const stack = [root];
	while (stack.length) {
		const dir = stack.pop();
		let entries;
		try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
		for (const e of entries) {
			const p = join(dir, e.name);
			if (e.isDirectory()) { stack.push(p); }
			else if (e.name === name) { return p; }
		}
	}
	return undefined;
}
for (const lib of ['libstdc++.a', 'libgcc.a', 'libmingw32.a']) {
	check(`加法：内置工具链静态库 ${lib} 未被剪枝误删`, !!findAny(join(tcRoot, 'lib'), lib));
}
// the extension must resolve the bundled copy before falling back to PATH
const toolchainJs = readFileSync('D:/oler-ide-v2/oss/extensions/olympia-onboarding/out/toolchain.js', 'utf8');
check('加法：onboarding 已编译工具链解析模块', toolchainJs.includes('bundled') && toolchainJs.includes('appRoot'));
check('加法：内置工具链优先于系统 PATH', toolchainJs.indexOf('bundled') < toolchainJs.indexOf('PATH'));
// packaging must actually copy it into the product
const gulpVscode = readFileSync('D:/oler-ide-v2/oss/build/gulpfile.vscode.ts', 'utf8');
check('加法：打包任务包含内置工具链', gulpVscode.includes('.build/toolchain/**'));

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exitCode = failures === 0 ? 0 : 1;