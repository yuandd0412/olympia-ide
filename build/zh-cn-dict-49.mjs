// zh-cn dictionary batch 49 -- extension management core: install/uninstall errors, allow-list policy
export default {
	// ---- install errors ----
	'This extension cannot be installed because {0}': '无法安装此扩展，因为 {0}',
	'The \'{0}\' extension is not available in {1} for the {2} platform.':
		'\'{0}\' 扩展在 {1} 中不提供 {2} 平台版本。',
	'Extension \'{0}\' is already installed.': '扩展 \'{0}\' 已安装。',
	'Can\'t install \'{0}\' extension since it was reported to be problematic.':
		'无法安装 \'{0}\' 扩展，因为它被报告为存在严重问题。',
	'Can\'t install \'{0}\' extension since it was deprecated and the replacement extension \'{1}\' can\'t be found.':
		'无法安装 \'{0}\' 扩展，因为它已弃用，且找不到替代扩展 \'{1}\'。',
	'Can\'t install release version of \'{0}\' extension because it has no release version.':
		'无法安装 \'{0}\' 扩展的正式版本，因为它没有正式发布版本。',
	'Can\'t install \'{0}\' extension because it is not compatible with the current version of {1} (version {2}).':
		'无法安装 \'{0}\' 扩展，因为它与当前版本的 {1}（版本 {2}）不兼容。',
	'Failed to parse {0}: {1}.': '解析 {0} 失败：{1}。',
	'Invalid format {0}: JSON object expected.': '格式无效：{0}，应为 JSON 对象。',
	'Learn Why': '了解原因',
	'Marketplace is not enabled': '市场未启用',

	// ---- uninstall errors ----
	'Cannot uninstall \'{0}\' extension. \'{1}\' extension depends on this.':
		'无法卸载 \'{0}\' 扩展，因为 \'{1}\' 扩展依赖它。',
	'Cannot uninstall \'{0}\' extension. \'{1}\' and \'{2}\' extensions depend on this.':
		'无法卸载 \'{0}\' 扩展，因为 \'{1}\' 和 \'{2}\' 扩展依赖它。',
	'Cannot uninstall \'{0}\' extension. \'{1}\', \'{2}\' and other extension depend on this.':
		'无法卸载 \'{0}\' 扩展，因为 \'{1}\'、\'{2}\' 等扩展依赖它。',
	'Cannot uninstall \'{0}\' extension . It includes uninstalling \'{1}\' extension and \'{2}\' extension depends on this.':
		'无法卸载 \'{0}\' 扩展，这会同时卸载 \'{1}\' 扩展，而 \'{2}\' 扩展依赖它。',
	'Cannot uninstall \'{0}\' extension. It includes uninstalling \'{1}\' extension and \'{2}\' and \'{3}\' extensions depend on this.':
		'无法卸载 \'{0}\' 扩展，这会同时卸载 \'{1}\' 扩展，而 \'{2}\' 和 \'{3}\' 扩展依赖它。',
	'Cannot uninstall \'{0}\' extension. It includes uninstalling \'{1}\' extension and \'{2}\', \'{3}\' and other extensions depend on this.':
		'无法卸载 \'{0}\' 扩展，这会同时卸载 \'{1}\' 扩展，而 \'{2}\'、\'{3}\' 等扩展依赖它。',

	// ---- allow-list policy ----
	'No extensions are allowed.': '不允许任何扩展。',
	'All extensions are allowed.': '允许所有扩展。',
	'Allow or disallow the extension.': '允许或禁止此扩展。',
	'Extension is allowed.': '扩展已被允许。',
	'Extension is not allowed.': '扩展未被允许。',
	'Allow only stable versions of the extension.': '仅允许此扩展的稳定版本。',
	'Allow or disallow all extensions from the publisher.': '允许或禁止该发布者的所有扩展。',
	'All extensions from the publisher are allowed.': '该发布者的所有扩展均被允许。',
	'All extensions from the publisher are not allowed.': '该发布者的所有扩展均未被允许。',
	'Allow only stable versions of the extensions from the publisher.': '仅允许该发布者扩展的稳定版本。',
	'Allow or disallow all extensions.': '允许或禁止所有扩展。',
	'Allow all extensions.': '允许所有扩展。',
	'Disallow all extensions.': '禁止所有扩展。',
	'it is not in the [allowed list]({0})': '它不在[允许列表]({0})中',
	'the pre-release versions of this extension are not in the [allowed list]({0})':
		'此扩展的预发布版本不在[允许列表]({0})中',
	'the version {0} of this extension is not in the [allowed list]({1})':
		'此扩展的版本 {0} 不在[允许列表]({1})中',
	'the extensions from this publisher are not in the [allowed list]({1})':
		'该发布者的扩展不在[允许列表]({1})中',
	'the pre-release versions from this publisher are not in the [allowed list]({1})':
		'该发布者的预发布版本不在[允许列表]({1})中',

	// ---- install / update flow ----
	'Make sure you use the full extension ID, including the publisher, e.g.: {0}':
		'请确保使用完整的扩展 ID（包含发布者），例如：{0}',
	'Extensions installed on {0}:': '在 {0} 上已安装的扩展：',
	'Installing extensions on {0}...': '正在 {0} 上安装扩展...',
	'Installing extensions...': '正在安装扩展...',
	'Error while installing extensions: {0}': '安装扩展时出错：{0}',
	'Failed Installing Extensions: {0}': '安装扩展失败：{0}',
	'No extension to update': '没有可更新的扩展',
	'Updating extensions: {0}': '正在更新扩展：{0}',
	'Error while updating extension {0}: {1}': '更新扩展 {0} 时出错：{1}',
	'Extension \'{0}\' v{1} was successfully updated.': '扩展 \'{0}\' v{1} 更新成功。',
	'Updating the extension \'{0}\' to the version {1}': '正在将扩展 \'{0}\' 更新到版本 {1}',
	'Installing builtin extension \'{0}\' v{1}...': '正在安装内置扩展 \'{0}\' v{1}...',
	'Installing builtin extension \'{0}\'...': '正在安装内置扩展 \'{0}\'...',
};