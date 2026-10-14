// 许可证面检查：随包发出的许可文本、安装向导那一页、以及产品在应用里指向它们的方式，是不是真对得上。
//
// 为什么要有这台检查台：上游拷许可证的那一行用的是 `gulp.src([product.licenseFileName, …], { allowEmpty: true })`，
// 而本产品的 `licenseFileName` 写的是 `LICENSE`——`oss/` 里只有 `LICENSE.txt`。glob 什么都匹配不到，
// `allowEmpty` 把这件事咽了下去，于是装机目录里一份 MIT 正文都没有（只有 LICENSES.chromium.html 与
// resources/app/ThirdPartyNotices.txt）。装向导那边同理：许可页由 code.iss 顶部 `RootLicenseFileName`
// 兜底决定，它原先硬写 `LICENSE.rtf` 否则 `LICENSE.txt`，学生读到的是 Microsoft 的英文 MIT，
// 与「这份产品是 Olympia」没有关系。两处都只有按名字去查文件真的存不存在才看得见。
//
// 顺带说一句被真机编译验证过的 Inno 事实：`LicenseFile` 是 [Languages] 认的参数
//（写个不存在的参数名会 `Unrecognized parameter name` 直接编译失败），所以 [Languages] 每行末尾
// 拼上来的那份是真正生效的按语言许可页，不是死代码。
//
//   node scripts/oneoff/check-licence-surface.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const oss = path.join(repoRoot, 'oss');

let failed = 0;
function report(ok, label) {
	console.log(`${ok ? 'ok   ' : 'FAIL '} ${label}`);
	if (!ok) { failed++; }
}
function note(label) { console.log(`注意  ${label}`); }

const product = JSON.parse(fs.readFileSync(path.join(oss, 'product.json'), 'utf8'));
const gulpfile = fs.readFileSync(path.join(oss, 'build/gulpfile.vscode.ts'), 'utf8');
const iss = fs.readFileSync(path.join(oss, 'build/win32/code.iss'), 'utf8');
const noticeFile = path.join(oss, 'NOTICE.olympia.txt');
const noticeRaw = fs.readFileSync(noticeFile, 'utf8');
const notice = noticeRaw.replace(/^\uFEFF/, '');
// 清单里写的是 Windows 路径（反斜杠），比对时统一成正斜杠，别让写法差异冒充缺失。
const noticeFlat = notice.replace(/\\/g, '/');

// 1) 三份文本要真的在仓库里，而且不是空壳
for (const name of ['LICENSE.txt', 'NOTICE.olympia.txt', 'ThirdPartyNotices.txt']) {
	const size = fs.existsSync(path.join(oss, name)) ? fs.statSync(path.join(oss, name)).size : 0;
	report(size > 400, `${name} 在 oss/ 里存在且有内容（${size} 字节）`);
}
report(notice.startsWith('Olympia IDE —— 许可证与第三方组件说明'), 'NOTICE.olympia.txt 的标题行在（读到的开头：' + JSON.stringify(notice.slice(0, 18)) + '）');
// Inno 的许可页按 BOM 判编码：没有 BOM 的 UTF-8 在中文 Windows（ACP 936）上是乱码。
report(noticeRaw.charCodeAt(0) === 0xFEFF, 'NOTICE.olympia.txt 带 UTF-8 BOM（安装向导那一页才不会是乱码）');

// 2) product.json 指着的许可文件名必须真的存在——这就是当初静默失效的那一处
report(typeof product.licenseFileName === 'string' && fs.existsSync(path.join(oss, product.licenseFileName)),
	`product.json 的 licenseFileName = ${JSON.stringify(product.licenseFileName)} 指得到真实文件`);

// 3) 打包要把三份都拷进产品
report(gulpfile.includes('product.licenseFileName'), '打包仍按 product.licenseFileName 拷 MIT 正文（不要写死文件名）');
report(gulpfile.includes('NOTICE.olympia.txt'), '打包清单里有 NOTICE.olympia.txt');
report(/licenceFiles[\s\S]{0,220}existsSync[\s\S]{0,120}throw new Error/.test(gulpfile),
	'打包前会检查这些文件存在，缺了就报错而不是静默少拷（allowEmpty 单独用会吞掉问题）');

// 4) 安装向导真的有许可页，而且页上是我们的中文清单
//    切片按行找段首，不能用 `split('[Setup]')`：注释里出现这三个字就会把区间截断。
const issLines = iss.split(/\r?\n/);
const setupStart = issLines.findIndex(l => l.trim() === '[Setup]');
const setupEnd = issLines.findIndex((l, i) => i > setupStart && /^\[/.test(l));
const setup = setupStart < 0 ? '' : issLines.slice(setupStart + 1, setupEnd < 0 ? undefined : setupEnd).join('\n');
report(setup.length > 200, `读到了 Setup 段正文（${setup.length} 个字符；读不到就是切片错了，别把空串当通过）`);
const activeLicense = setup.split(/\r?\n/).filter(l => /^\s*[^;\s]/.test(l) && /\bLicenseFile\s*=/i.test(l));
report(activeLicense.length === 1, `Setup 段里恰好一行 LicenseFile（读到 ${activeLicense.length} 行：${activeLicense.join(' | ')}）`);
report(activeLicense.length !== 1 || activeLicense[0].includes('{#RootLicenseFileName}'),
	'那一行引用 RootLicenseFileName 宏而不是写死文件名（改一处就行，不会两处飘）');
const macroDef = iss.match(/^#define\s+RootLicenseFileName(.*)$/m)?.[1] ?? '';
report(macroDef.length > 0, `读到 RootLicenseFileName 的定义（${JSON.stringify(macroDef.slice(0, 40))}）`);
const noticeNameMacro = iss.match(/^#define\s+OlympiaNoticeFileName\s+'([^']+)'$/m)?.[1] ?? '';
report(noticeNameMacro === 'NOTICE.olympia.txt', `清单文件名收在一个宏里：${JSON.stringify(noticeNameMacro)}`);
const macroOrder = iss.indexOf('#define OlympiaNoticeFileName');
report(macroOrder > 0 && macroOrder < iss.indexOf('#define RootLicenseFileName'),
	'OlympiaNoticeFileName 定义在用它之前（ISPP 是顺序展开，写反了会拿到空串）');
report(/FileExists\(RepoDir \+ '\\' \+ OlympiaNoticeFileName\)/.test(macroDef), 'RootLicenseFileName 优先选中文清单');
report(/'LICENSE\.txt'/.test(macroDef), '找不到中文清单时才退回上游的 LICENSE.txt');
const langLines = issLines.filter(l => /^\s*Name:\s*".*MessagesFile/i.test(l));
report(langLines.length >= 1 && langLines.every(l => l.includes('{#LocalizedLanguageFile')),
	`${langLines.length} 行 [Languages] 都拼上了 LocalizedLanguageFile——按语言的许可页就是它，不是死代码`);
const commentedLicense = setup.split(/\r?\n/).filter(l => /^\s*;[^\n]*\bLicenseFile\s*=/i.test(l));
report(commentedLicense.length === 0,
	`Setup 段里没有「注释掉的 LicenseFile」（读到 ${commentedLicense.length} 行：${commentedLicense.join(' | ')}）——留着它，下一个人会以为许可页已经配好了`);

// 5) 中文清单要说清产品里到底装了什么
const MUST_MENTION = ['VS Code', 'Electron', 'Chromium', 'Node', 'MIT', 'GPL', 'MSYS2', 'binutils', 'share/licenses', 'One Dark Pro', '语言包', 'gcc', '源码', 'EPL-2.0', '运行时库例外'];
const missing = MUST_MENTION.filter(word => !noticeFlat.includes(word));
report(missing.length === 0, `NOTICE 提到 ${MUST_MENTION.length} 个必需项${missing.length ? `，缺：${missing.join('、')}` : ''}`);
report(!/需要(你|作者)确认|TODO|待确认/.test(notice), '随包文本里没有写给作者的待办（那是仓库文档的事，不是学生读到的内容）');
report(!/ThirdPartyNotices\.txt[^。\n]{0,40}(Electron|Chromium)/.test(noticeFlat) && !/(Electron|Chromium)[^。\n]{0,60}ThirdPartyNotices\.txt/.test(noticeFlat),
	'没把 Electron/Chromium 的声明算到 ThirdPartyNotices.txt 头上——那份文本里没有这两个组件，只有 npm 层');

// 6) 清单承诺的工具链许可证目录，逐个对目录名（写错、漏写都算不通过）
const toolLicences = path.join(repoRoot, 'VSCode-win32-x64/resources/app/toolchain/mingw64/share/licenses');
const listedBlock = noticeFlat.split('toolchain/mingw64/share/licenses/')[1]?.split('\n\n')[0] ?? '';
const listedDirs = [...new Set(listedBlock.split(/[\s,]+/).filter(t => /^[a-z][a-z0-9.-]*$/.test(t)))];
report(listedDirs.length >= 8, `从 NOTICE 读到 ${listedDirs.length} 个目录名（读不到就是分隔写法变了，别让空结果冒充通过）：${listedDirs.join(' ')}`);
if (fs.existsSync(toolLicences)) {
	const realDirs = fs.readdirSync(toolLicences).filter(d => fs.statSync(path.join(toolLicences, d)).isDirectory());
	const phantom = listedDirs.filter(d => !realDirs.includes(d));
	const omitted = realDirs.filter(d => !listedDirs.includes(d));
	report(phantom.length === 0 && omitted.length === 0,
		`NOTICE 列的目录与实际发出的 ${realDirs.length} 个一致${phantom.length ? `，写了不存在的：${phantom.join('、')}` : ''}${omitted.length ? `，漏了：${omitted.join('、')}` : ''}`);
} else {
	note(`还没打出工具链目录，未核对许可证正文：${toolLicences}`);
	report(listedDirs.includes('gcc-libs') && !listedDirs.includes('gcc'),
		'工具链目录清单里没有 gcc 这一项（gcc 的条款在 gcc-libs 里，虚指会让学生去找不存在的目录）');
}

// 7) 清单对内置扩展许可证的描述，以各扩展 package.json 的 license 字段为准
const trimmed = new Set((product.olympiaExcludedBuiltInExtensions ?? []).map(s => String(s).toLowerCase()));
const extRoot = path.join(oss, 'extensions');
const shipped = fs.readdirSync(extRoot)
	.filter(d => fs.existsSync(path.join(extRoot, d, 'package.json')) && !trimmed.has(d.toLowerCase()));
const licenses = shipped.map(d => {
	const pkg = JSON.parse(fs.readFileSync(path.join(extRoot, d, 'package.json'), 'utf8'));
	return { dir: d, license: typeof pkg.license === 'string' ? pkg.license : '' };
});
const undeclared = licenses.filter(l => !l.license);
report(undeclared.length === 0, `${licenses.length} 个随包扩展都声明了 license 字段${undeclared.length ? `，缺：${undeclared.map(u => u.dir).join('、')}` : ''}`);
const values = [...new Set(licenses.map(l => l.license))].sort();
const unmentioned = values.filter(v => !noticeFlat.includes(v) && !(v === 'MIT' && notice.includes('MIT')));
report(unmentioned.length === 0, `NOTICE 提到了随包扩展用到的每一种许可证：${values.join(' / ')}${unmentioned.length ? `，漏：${unmentioned.join('、')}` : ''}`);
const nonMit = licenses.filter(l => l.license !== 'MIT').sort((a, b) => a.dir.localeCompare(b.dir));
const unnamedNonMit = nonMit.filter(l => !notice.includes(l.dir));
report(unnamedNonMit.length === 0,
	`${nonMit.length} 个非 MIT 的自研扩展在 NOTICE 里逐个点名${unnamedNonMit.length ? `，漏：${unnamedNonMit.map(u => u.dir).join('、')}` : ''}`);
// 清单里写的数字就是承诺：随包目录数、MIT 数、主题数都必须数得出来，改裁剪表时这里会红。
const oneLine = notice.replace(/\r?\n\s*/g, ' ');
const CLAIMS = [
	[/随产品打包的内置扩展（(\d+) 个目录）/, shipped.length, '随包扩展目录数'],
	[/其余 (\d+) 个是 MIT/, licenses.filter(l => l.license === 'MIT').length, 'MIT 扩展数'],
	[/(\d+) 个主题/, shipped.filter(d => d.startsWith('theme-')).length, '主题数'],
	[/等 (\d+) 个目录）/, trimmed.size, '被裁掉的扩展数']
];
for (const [re, real, label] of CLAIMS) {
	const m = oneLine.match(re);
	const got = m ? Number(m[1] ?? m[2]) : NaN;
	report(got === real, `NOTICE 写的「${label}」= ${m ? got : '没这句话'}，实际 ${real}`);
}
report(nonMit.length === 0 || (/GPL-3\.0/.test(oneLine) && /分发/.test(oneLine)),
	'自研扩展里有非 MIT 的，清单必须把「改完再分发要公开」这句话说出来（光列许可证名字，学生不知道对自己意味着什么）');
// 产品自己的许可证只有一个来源：product.json 的 licenseName。清单第一节与官网页脚都必须说同一种，
// 否则学生会读到「官网说 GPL、装机清单说 MIT」，而这两句话在他手里都是承诺。
const lic = String(product.licenseName ?? '');
report(lic.length > 0, `product.json 声明了 licenseName：${JSON.stringify(lic)}`);
report(new RegExp(`自研部分[\\s\\S]{0,200}${lic.replace(/[.]/g, '\\.')}`).test(oneLine),
	`NOTICE 第一节按 product.json 的 licenseName 说明我们自己的改动（要的是「自研部分……${lic}」）`);
const siteFile = path.join(repoRoot, 'website/index.html');
if (fs.existsSync(siteFile)) {
	const site = fs.readFileSync(siteFile, 'utf8');
	report(site.includes(lic), `官网页脚写的也是 ${lic}（两句话必须同一条）`);
} else {
	note(`读不到官网文件，未核对页脚：${siteFile}`);
}

// 8) 自带第三方声明的扩展必须在清单里指到
const ownNotices = shipped.filter(d => fs.existsSync(path.join(extRoot, d, 'ThirdPartyNotices.txt'))).map(d => d);
const unnamedNoticeFolders = ownNotices.filter(d => !notice.includes(d));
report(ownNotices.length >= 2 && unnamedNoticeFolders.length === 0,
	`${ownNotices.length} 个扩展带着自己的 ThirdPartyNotices.txt，清单逐个指到${unnamedNoticeFolders.length ? `，漏：${unnamedNoticeFolders.join('、')}` : '（读不到两个以上说明扫描失效）'}`);

// 9) 应用里那条命令要打开的就是这些文件
const licencesTs = fs.readFileSync(path.join(oss, 'extensions/olympia-onboarding/src/licences.ts'), 'utf8');
const docNames = [...licencesTs.matchAll(/\{\s*file:\s*'([^']+)'/g)].map(m => m[1]);
report(docNames.length >= 3, `licences.ts 里列了 ${docNames.length} 份文档（读不到就说明正则没命中，别把空结果当通过）`);
// LICENSES.chromium.html 不是仓库文件，它随 Electron 的 zip 进来，所以按产物根目录核。
const productRoot = path.join(repoRoot, 'VSCode-win32-x64');
const unresolvable = docNames.filter(name => !fs.existsSync(path.join(oss, name)) && !fs.existsSync(path.join(productRoot, name)));
report(unresolvable.length === 0, `命令列出的文件在仓库或产物里对得上${unresolvable.length ? `，对不上：${unresolvable.join('、')}` : ''}`);
report(licencesTs.includes('env.appRoot') && !/https:\/\/github\.com/.test(licencesTs.split('openLicenceNotices')[1] ?? ''),
	'入口读的是本机安装目录，不是把用户推到 GitHub 页面（机房常常没网）');

// 10) 事实陈述，不替作者决定许可证：外层仓库根的 LICENSE 与产品自己声明的许可证还不是一致的
const outerLicence = path.join(repoRoot, 'LICENSE');
if (lic && fs.existsSync(outerLicence)) {
	const outer = fs.readFileSync(outerLicence, 'utf8');
	const outerIsMit = /MIT License/i.test(outer) && !new RegExp(lic.replace(/[.]/g, '\\.'), 'i').test(outer);
	if (outerIsMit) {
		note(`${outerLicence} 写的是 MIT，而 product.json 的 licenseName = ${lic}（清单第一节与官网页脚都已按 ${lic} 写）。`
			+ '这两处必须统一，改哪一个由作者定；oss/LICENSE.txt 不在此列——那是上游 VS Code 自己的 MIT 文本，本来就该留着');
	} else {
		report(true, `外层 LICENSE 与 product.json 的 licenseName 一致（${lic}）`);
	}
}

if (failed) { console.log(`\n${failed} 项失败`); process.exit(1); }
console.log('\n全部通过');
