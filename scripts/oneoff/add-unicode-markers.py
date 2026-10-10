"""Insert hygiene-sanctioned unicode markers above translated lines.

Why: the fork localises by rewriting `localize()` default messages *in place*, so those
files now contain Chinese string literals. Upstream's pre-commit hygiene guard treats
`allow-any-unicode-comment-file` as permission for comments only
(`oss/build/hygiene.ts`), so a Chinese literal still errors unless the line directly above
it carries `// allow-any-unicode-next-line`. Without this step every core l10n batch fails
the hook and the only alternative would be bypassing it.

Scope: only files with unstaged/staged changes right now, and only lines whose code portion
(before `//`) has non-ASCII. Idempotent - an already-marked line is left alone.

Run from `oss/` after `node ../../build/apply-zh-cn-ast.mjs --dict=...`:
    python ../../scripts/oneoff/add-unicode-markers.py
"""
import io
import subprocess

# Characters upstream's guard whitelists; keep in sync with the class in hygiene.ts.
ALLOWED = set(
    '⊃⊇✔✓🎯🧪✍️⚠️🛑🔴🚗🚙🚕🎉✨❗⇧⌥⌘×÷¦⋯…↑↓￫→←↔⟷—·•●◆▼⟪⟫┌└├⏎↩√φ'
)
MARKER = '// allow-any-unicode-next-line'

changed = subprocess.run(
    ['git', 'diff', '--name-only'], capture_output=True, text=True
).stdout.split()

total = 0
for path in changed:
    if not path.endswith('.ts'):
        continue
    lines = io.open(path, encoding='utf-8', newline='').read().split('\n')
    out = []
    added = 0
    for line in lines:
        code = line.split('//')[0]
        has_unicode = any(ord(c) > 126 and c not in ALLOWED for c in code)
        if has_unicode and (not out or MARKER not in out[-1]):
            out.append(line[:len(line) - len(line.lstrip())] + MARKER)
            added += 1
        out.append(line)
    if added:
        io.open(path, 'w', encoding='utf-8', newline='').write('\n'.join(out))
        print('markers %4d  %s' % (added, path))
        total += added

print('total %d markers in %d file(s)' % (total, len(changed)))
