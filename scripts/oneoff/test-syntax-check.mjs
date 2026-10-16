//   node scripts/oneoff/test-syntax-check.mjs
//
// 覆盖边界要说清楚：超时那一条路（20 秒没结束就中止并报 blocked）这里没有断言——
// 参数是 `<编译器> <评测机开关…> <源文件>` 这个顺序，Windows 上没有一个现成可执行文件
// 能在被这样调用时挂住 20 秒。要测它得把超时做成可注入的，那会把产品代码为测试让路。
//
// 直接对着编译好的 out/syntaxCheck.js 跑一次：截图里那份少分号的代码必须被查出来。
// 用产品自带的 g++，走的是和 F9 同一套开关（planCompile），所以这里过了就是真过了。
import Module from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const outDir = path.join(repoRoot, 'oss/extensions/olympia-onboarding/out');
const GPP = path.join(repoRoot, 'VSCode-win32-x64/resources/app/toolchain/mingw64/bin/g++.exe');

const vscodeStub = {
	DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
	Uri: { file: p => ({ fsPath: p, path: p, toString: () => `file:///${p.replace(/\\/g, '/')}` }) },
	workspace: {
		getConfiguration: () => ({
			get: (key, fallback) => (key === 'compiler.path' ? GPP : fallback)
		})
	},
	window: { showErrorMessage: async () => undefined, showWarningMessage: async () => undefined },
	env: { appRoot: path.join(repoRoot, 'VSCode-win32-x64/resources/app') }
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	return request === 'vscode' ? vscodeStub : originalLoad.call(this, request, parent, isMain);
};

const { syntaxCheck } = await import(pathToFileURL(path.join(outDir, 'syntaxCheck.js')).href);

function doc(text) {
	return { fileName: 'P1001.cpp', languageId: 'cpp', getText: () => text, lineCount: text.split('\n').length };
}

const broken = [
	'#include<bits/stdc++.h>',
	'#define int long long',
	'using namespace std;',
	'int n;',
	'signed main(){',
	'    cin >> n;',
	'    if(n<3){',
	'        cout << ',
	'    }',
	'    return 0;',
	'}',
	''
].join('\n');

const good = '#include<bits/stdc++.h>\nusing namespace std;\nint main(){int n;cin>>n;cout<<n<<endl;return 0;}\n';

let failed = 0;
function check(name, cond, extra) {
	console.log(`${cond ? 'ok   ' : 'FAIL '} ${name}${extra ? ` — ${extra}` : ''}`);
	if (!cond) { failed++; }
}

const bad = await syntaxCheck(doc(broken));
check('少分号的代码报出编译错误', bad.findings.length > 0, JSON.stringify(bad.findings.slice(0, 2)));
// g++ 说 "expected primary-expression before '}' token"：它是在收尾花括号那里才发现少了东西，
// 所以位置落在 cout 那一行或它下面那行的 `}`，两种都算指对了地方。
check('错误落在 cout 那一行附近', bad.findings.some(f => f.line === 7 || f.line === 8), bad.findings.map(f => f.line).join(','));
check('没有 blocked（编译器真的跑起来了）', !bad.blocked, bad.blocked ?? '');

const ok = await syntaxCheck(doc(good));
check('能编过的代码不报东西', ok.findings.length === 0 && !ok.blocked, JSON.stringify(ok.findings) + (ok.blocked ?? ''));

// 清空 compiler.path 不算"没有编译器"——它还会去找随包/系统的那一个，这是对的。
// 真正会骗人的是"跑起来了但什么都没报"：拿一个不是编译器的可执行文件当编译器，
// 体检必须说"没检查完"，不能说「无问题」。
const noCompiler = await (async () => {
	const saved = vscodeStub.workspace.getConfiguration;
	vscodeStub.workspace.getConfiguration = () => ({ get: (key, fallback) => (key === 'compiler.path' ? process.execPath : fallback) });
	try {
		return await syntaxCheck(doc(broken));
	} finally {
		vscodeStub.workspace.getConfiguration = saved;
	}
})();
check('跑起来但不是编译器时说"没检查完"，而不是"无问题"', !!noCompiler.blocked && noCompiler.findings.length === 0, noCompiler.blocked ?? JSON.stringify(noCompiler.findings));

console.log(failed ? `\n${failed} 处语法体检不成立` : '\nall syntax-check probes passed');
process.exit(failed ? 1 : 0);
