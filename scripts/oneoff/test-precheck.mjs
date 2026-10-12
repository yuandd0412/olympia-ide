// One-off harness for the submission pre-flight checker ("提交前体检").
//
// The checker paints findings straight into the editor, so its contract is: report only what the
// judge's compiler actually rejects, and report nothing else. A rule that flags style makes the one
// signal that matters (a real compile error) look like noise. Rather than test a re-implementation
// of the regexes, this loads the actual build output
// (`extensions/olympia-onboarding/out/precheck.js`) with `vscode` stubbed and asserts both halves
// of that contract.
//
//   node scripts/oneoff/test-precheck.mjs
//
// Requires `npm run gulp compile-extension:olympia-onboarding` to have run first.
import Module from 'module';
import assert from 'assert';
import { createRequire } from 'module';
import { readFileSync } from 'fs';

const outDir = new URL('../../oss/extensions/olympia-onboarding/out/', import.meta.url);
try {
	readFileSync(new URL('precheck.js', outDir));
} catch {
	console.error('out/precheck.js is missing — run: npm run gulp compile-extension:olympia-onboarding (in oss/)');
	process.exit(1);
}

const require = createRequire(new URL('precheck.js', outDir));

const Severity = { Error: 0, Warning: 1, Information: 2, Hint: 3 };

class Position { constructor(line, character) { this.line = line; this.character = character; } }
class Range { constructor(start, end) { this.start = start; this.end = end; } }
class Diagnostic {
	constructor(range, message, severity) { this.range = range; this.message = message; this.severity = severity; }
}

// Rules are read from configuration with an explicit fallback; every rule defaults to on.
const ruleSwitches = {};
let optimization = 'none';

const vscodeStub = {
	DiagnosticSeverity: Severity,
	Position, Range, Diagnostic,
	workspace: {
		getConfiguration: () => ({
			get: (key, fallback) => key === 'compiler.optimization'
				? optimization
				: (key.startsWith('check.rules.') ? ruleSwitches[key.slice('check.rules.'.length)] ?? fallback : fallback)
		})
	}
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'vscode') { return vscodeStub; }
	return originalLoad.call(this, request, parent, isMain);
};

const { analyse } = require('./precheck.js');

const crlf = lines => lines.join('\r\n');
const rules = text => analyse(text).map(f => f.rule);
const check = (name, ok) => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`); if (!ok) { process.exitCode = 1; } };

// ---- the file that started this: correct code, `#define int long long`, CRLF, local freopen ----
const submitted = crlf([
	'#include <bits/stdc++.h>',
	'using namespace std;',
	'#define int long long',
	'',
	'const int N = 100007;',
	'int a[N];',
	'',
	'signed main() {',
	'\tfreopen("sum.in", "r", stdin);',
	'\tfreopen("sum.out", "w", stdout);',
	'\tint n;',
	'\tcin >> n;',
	'\tfor (int i = 1; i <= n; i++) cin >> a[i];',
	'\tlong long ans = 0;',
	'\tint* leak = new int[10];',
	'\tfor (int i = 1; i <= n; i++) ans += a[i] * i;',
	'\tcout << ans << endl;',
	'\treturn 0;',
	'}',
]);
check('a correct submission reports nothing at all', analyse(submitted).length === 0);

// ---- the rules that were reporting style, not compile errors, must stay quiet ----
check('CRLF is not reported', !rules('#include <cstdio>\r\nint main(){ return 0; }\r\n').includes('crlf'));
check('freopen is not reported', !rules('int main(){ freopen("a","r",stdin); return 0; }').includes('freopen'));
check('a missing ONLINE_JUDGE guard is not reported', !rules('int main(){ freopen("a","r",stdin); return 0; }').includes('onlineJudge'));
check('an unbalanced new is not reported', !rules('int main(){ int* p = new int[10]; return 0; }').includes('memoryLeak'));
check('mixed IO is not reported', !rules('#include <bits/stdc++.h>\nint main(){ int x; scanf("%d",&x); cout<<x; return 0; }').includes('ioMix'));

// ---- the compile-error rules, and only those, must fire ----
const asmTrap = 'int asm = 1;\nint main(){ return asm; }';
const caught = analyse(asmTrap);
check('`int asm` is one error', caught.length === 1 && caught[0].rule === 'reservedWord');
check('the error is an error, not a hint', caught[0].severity === Severity.Error);
check('the message names the identifier', caught[0].message.includes('asm'));

for (const keyword of ['and', 'or', 'not', 'xor', 'compl', 'bitand', 'bitor', 'and_eq', 'or_eq', 'not_eq', 'xor_eq']) {
	const text = `int ${keyword} = 3;\nint main(){ return ${keyword}; }`;
	check(`\`int ${keyword}\` is flagged`, rules(text).join() === 'reservedWord');
}

// ---- keywords MSVC reserves too must not be blamed on the compiler difference ----
for (const keyword of ['using', 'namespace', 'template', 'typename', 'operator', 'this', 'new', 'delete', 'true', 'false', 'virtual', 'friend', 'mutable', 'explicit', 'export']) {
	check(`\`int ${keyword}\` is not reported`, rules(`int main(){ int ${keyword === 'new' ? 'x' : keyword}; return 0; }`).length === 0);
}

// ---- ordinary code stays quiet, including across lines and inside comments ----
const ordinary = [
	'#include <bits/stdc++.h>',
	'using namespace std;',
	'bool ok(int x) { return x > 0; }',
	'int main(){',
	'\tlong long ll = 1;',
	'\tvector<bool> f(10);',
	'\tauto p = new int[10];',
	'\tdelete[] p;',
	'\tcout << (ok(3) && !ok(1)) << ll;',
	'\treturn 0;',
	'}',
].join('\n');
check('ordinary code reports nothing', analyse(ordinary).length === 0);
check('`or` inside an expression is not a declaration', rules('int main(){ int x = 1, y = 2; if (x or y) return 1; return 0; }').length === 0);
check('a reserved word in a comment is ignored', rules('/* int asm; */\nint main(){}').length === 0);
check('a reserved word in a string is ignored', rules('int main(){ puts("int asm"); return 0; }').length === 0);

check('gets is reported', rules('int main(){ char s[10]; gets(s); return 0; }').includes('removedCpp'));
check('random_shuffle is reported', rules('int main(){ vector<int> v; random_shuffle(v.begin(), v.end()); return 0; }').includes('removedCpp'));

// ---- 源码级优化属性：交上去就是编译期风险，跟本地开不开优化无关 ----
const pragma = '#pragma GCC optimize("O2")\nint main(){ return 0; }';
check('pragma optimize is reported regardless of local optimization', rules(pragma).includes('pragmaOptimize'));
check('pragma optimize inside a comment is ignored', rules('// #pragma GCC optimize("O2")\nint main(){ return 0; }').length === 0);
check('pragma optimize inside a string is ignored', rules('const char* s = "#pragma GCC optimize(\\"O2\\")";\nint main(){ return 0; }').length === 0);

ruleSwitches.reservedWord = false;
check('turning a rule off silences it', rules(asmTrap).length === 0);

console.log(process.exitCode ? '\nFAILED' : '\nall precheck assertions passed');
