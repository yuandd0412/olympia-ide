// zh-cn dictionary batch 50 -- theme services: schema validation messages, icon theme, tmTheme loading
export default {
	// ---- unknown / load errors ----
	'Theme is unknown or not installed.': '主题未知或未安装。',
	'File icon theme is unknown or not installed.': '文件图标主题未知或未安装。',
	'Product icon theme is unknown or not installed.': '产品图标主题未知或未安装。',
	'Unable to load {0}: {1}': '无法加载 {0}：{1}',

	// ---- css contribution ----
	'Contributes CSS files to be loaded in the workbench.': '提供要在工作台中加载的 CSS 文件。',
	'Path to the CSS file. The path is relative to the extension folder.': 'CSS 文件的路径。该路径相对于扩展文件夹。',
	"'contributes.css' must be an array.": "'contributes.css' 必须是数组。",
	"'contributes.css.path' must be a string.": "'contributes.css.path' 必须是字符串。",
	"Expected 'contributes.css.path' ({0}) to be included inside extension's folder ({1}).":
		'应将 \'contributes.css.path\'（{0}）放在扩展文件夹（{1}）内。',

	// ---- colors schema ----
	"'configuration.colors' must be a array": "'configuration.colors' 必须是数组",
	'{0} must be either a color value in hex (#RRGGBB[AA] or #RGB[A]) or the identifier of a themable color which provides the default.':
		'{0} 必须是十六进制颜色值（#RRGGBB[AA] 或 #RGB[A]），或提供默认值的主题颜色标识符。',
	"'configuration.colors.id' must be defined and can not be empty": "'configuration.colors.id' 必须已定义且不能为空",
	"'configuration.colors.id' must only contain letters, digits and dots and can not start with a dot":
		"'configuration.colors.id' 只能包含字母、数字和点号，且不能以点号开头",
	"'configuration.colors.description' must be defined and can not be empty":
		"'configuration.colors.description' 必须已定义且不能为空",
	"'configuration.colors.defaults' must be defined and must contain 'light' and 'dark'":
		"'configuration.colors.defaults' 必须已定义，且必须包含 'light' 和 'dark'",
	"If defined, 'configuration.colors.defaults.highContrast' must be a string.":
		'如果已定义，\'configuration.colors.defaults.highContrast\' 必须是字符串。',
	"If defined, 'configuration.colors.defaults.highContrastLight' must be a string.":
		'如果已定义，\'configuration.colors.defaults.highContrastLight\' 必须是字符串。',

	// ---- icon theme schema ----
	'Problems parsing file icons file: {0}': '解析文件图标文件时出现问题：{0}',
	'Invalid format for file icons theme file: Object expected.':
		'文件图标主题文件格式无效：应为对象。',
	'Problems processing product icons definitions in {0}:\n{1}': '处理 {0} 中的产品图标定义时出现问题：\n{1}',
	'Problems parsing product icons file: {0}': '解析产品图标文件时出现问题：{0}',
	'Invalid format for product icons theme file: Object expected.':
		'产品图标主题文件格式无效：应为对象。',
	'Invalid format for product icons theme file: Must contain iconDefinitions and fonts.':
		'产品图标主题文件格式无效：必须包含 iconDefinitions 和 fonts。',
	"'configuration.icons' must be an object with the icon names as properties.":
		"'configuration.icons' 必须是一个以图标名称为属性的对象。",
	"'configuration.icons.description' must be defined and can not be empty":
		"'configuration.icons.description' 必须已定义且不能为空",
	"Expected `contributes.icons.default.fontPath` to have file extension 'woff', woff2' or 'ttf', is '{0}'.":
		"期望 `contributes.icons.default.fontPath` 的文件扩展名为 'woff'、'woff2' 或 'ttf'，实际为 '{0}'。",
	"Expected `contributes.icons.default.fontPath` ({0}) to be included inside extension's folder ({0}).":
		'应将 `contributes.icons.default.fontPath`（{0}）放在扩展文件夹（{0}）内。',

	// ---- json / tmTheme ----
	'Problems parsing JSON theme file: {0}': '解析 JSON 主题文件时出现问题：{0}',
	'Invalid format for JSON theme file: Object expected.': 'JSON 主题文件格式无效：应为对象。',
	"Problem parsing tmTheme file: {0}. 'settings' is not array.":
		"解析 tmTheme 文件时出现问题：{0}。'settings' 不是数组。",
	'Problems parsing tmTheme file: {0}': '解析 tmTheme 文件时出现问题：{0}',
	'Problems loading tmTheme file {0}: {1}': '加载 tmTheme 文件 {0} 时出现问题：{1}',

	// ---- picker labels ----
	'ID': 'ID',
	'Dark Default': '深色默认值',
	'Light Default': '浅色默认值',
	'High Contrast Default': '高对比度默认值',
	'Colors': '颜色',
	'Keep It': '保留',
	'No Thanks': '不用了',

	// ---- descriptions ----
	'Overrides colors from the currently selected color theme.': '覆盖当前所选颜色主题的颜色。',
	"Specifies the file icon theme used in the workbench or 'null' to not show any file icons.":
		'指定工作台使用的文件图标主题，或设为 \'null\' 以不显示任何文件图标。',
	'Specifies the product icon theme used.': '指定使用的产品图标主题。',
	'Sets the colors and styles for comments': '设置注释的颜色和样式',
	'Sets the colors and styles for strings literals.': '设置字符串字面量的颜色和样式。',
	'Sets the colors and styles for keywords.': '设置关键字的颜色和样式。',
	'Sets the colors and styles for number literals.': '设置数字字面量的颜色和样式。',
	'Sets the colors and styles for type declarations and references.': '设置类型声明和引用的颜色和样式。',
	'Sets the colors and styles for functions declarations and references.': '设置函数声明和引用的颜色和样式。',
};