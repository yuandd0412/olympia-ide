// ---------------------------------------------------------------------------
// 共享的注释剥离词法器
//
// 放在 `scripts/oneoff/lib/` 而不是脚本旁边，是为了让「体检脚本」和「变异测试脚本」
// 用**同一份**实现 —— 两边各抄一份的话，改了一边就可能出现
// 「体检说没注释、变异说有注释」的漂移，守卫自己就不可信了。
//
// 注意：这个目录**不是**一条门禁。`check-all.mjs` 的 GATES 是显式文件列表，
// `lib/` 只是被 import 的依赖，不会被当成门去跑。
// ---------------------------------------------------------------------------

/**
 * 剥掉 CSS 的块注释。
 *
 * CSS 里只有块注释，没有行注释。
 */
export function stripComments(css) {
	return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * 剥掉 TS 的块注释与行注释。
 *
 * 断言要看的是**代码**，不是文档里的散文 —— 否则文件头里一句
 * 「这里不使用 Date.now()」就会把「禁止 Date.now()」这条断言自己判红。
 *
 * ## 这是个词法器，不是正则
 *
 * 正则版的「斜杠星号 … 星号斜杠」会被**字符串字面量**骗：上游 `startupPage.ts` 里有
 * 那个「所有文件」图标的字面量（内容就是斜杠星号星号），它会被当成块注释开头，
 * 于是从那里到下一个「星号斜杠」之间的**整段真实代码**都被当成注释吃掉 ——
 * 实测吃掉了 7578 个字符，包括我们正要断言的代码。
 *
 * ## 还得认得正则字面量
 *
 * 只认字符串还是不够。正则字面量里**也有引号**：
 *
 * ```ts
 * const keyRe = /(?:\[([A-Za-z_$][\w$]*)\s*\]|(['"])((?:[^'"\\]|\\.)*)\2)\s*:/g;
 * ```
 *
 * 这里的 `'` 会被当成字符串开头，词法器一路飘移，后面几百行都被当成字符串 ——
 * 断言于是「扫不到任何东西」，看起来像通过，其实是**什么都没查**。
 *
 * 所以这里还要判断 `/` 是「正则字面量」还是「除号」：
 * 看上一个有意义的字符/词 —— `(` `,` `=` `:` `[` `!` `&` `|` `?` `{` `;` `>` `+` `-`
 * `*` `%` `~` `^` 之后，以及 `return` / `case` / `typeof` 等关键字之后，`/` 是正则开头。
 *
 * ## 注释里的换行保留
 *
 * 这样行号不变，报错时能直接对上源码。
 */
export function stripTsComments(text) {
	let out = '';
	let i = 0;
	const n = text.length;

	// 上一个「有意义的」字符与上一个词，用来判断 `/` 是正则还是除号。
	let lastSig = '';
	let lastWord = '';
	let word = '';

	const flushWord = () => {
		lastWord = word;
		word = '';
	};
	const emit = (ch) => {
		out += ch;
		if (/[A-Za-z0-9_$]/.test(ch)) {
			word += ch;
			return;
		}
		if (/\s/.test(ch)) {
			return;   // 空白不打断「上一个词」
		}
		flushWord();
		lastSig = ch;
	};
	const regexCanStart = () => {
		if (lastWord) {
			return /^(?:return|case|typeof|instanceof|in|of|do|else|yield|await|new|delete|void|throw)$/.test(lastWord);
		}
		return '(,=:[!&|?{;>+-%*^~'.includes(lastSig);
	};

	while (i < n) {
		const c = text[i];
		const next = i + 1 < n ? text[i + 1] : '';

		if (c === '/' && next === '*') {
			i += 2;
			while (i < n) {
				if (text[i] === '*' && text[i + 1] === '/') {
					i += 2;
					break;
				}
				if (text[i] === '\n') {
					out += '\n';
				}
				i++;
			}
			continue;
		}
		if (c === '/' && next === '/') {
			while (i < n && text[i] !== '\n') {
				i++;
			}
			continue;
		}
		if (c === '/' && next !== '/' && next !== '*') {
			// 可能是正则字面量。
			flushWord();
			if (regexCanStart()) {
				let j = i + 1;
				let inClass = false;
				let closed = false;
				while (j < n) {
					const cj = text[j];
					if (cj === '\\') {
						j += 2;
						continue;
					}
					if (cj === '[') {
						inClass = true;
						j++;
						continue;
					}
					if (cj === ']') {
						inClass = false;
						j++;
						continue;
					}
					if (cj === '/' && !inClass) {
						j++;
						closed = true;
						break;
					}
					if (cj === '\n') {
						break;   // 不是正则（正则字面量不跨行）
					}
					j++;
				}
				if (closed) {
					const flagsStart = j;
					while (j < n && /[a-z]/.test(text[j])) {
						j++;
					}
					const lit = text.slice(i, j);
					out += lit;
					const flags = lit.slice(flagsStart - i);
					lastWord = flags;
					lastSig = flags ? flags[flags.length - 1] : '/';
					word = '';
					i = j;
					continue;
				}
			}
		}
		if (c === '"' || c === "'" || c === '`') {
			// 字符串字面量整段保留（含转义）—— 里面的 `//` 不是注释。
			const quote = c;
			emit(c);
			i++;
			while (i < n) {
				emit(text[i]);
				if (text[i] === '\\') {
					if (i + 1 < n) {
						emit(text[i + 1]);
						i += 2;
						continue;
					}
					i++;
					continue;
				}
				if (text[i] === quote) {
					i++;
					break;
				}
				i++;
			}
			continue;
		}
		emit(c);
		i++;
	}
	return out;
}
