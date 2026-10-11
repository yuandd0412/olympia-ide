"""Insert hygiene-sanctioned unicode markers above translated lines.

Why: the fork localises by rewriting `localize()` default messages *in place*, so those
files now contain Chinese string literals. Upstream's pre-commit hygiene guard treats
`allow-any-unicode-comment-file` as permission for comments only
(`oss/build/hygiene.ts`), so a Chinese literal still errors unless the line directly above
it carries `// allow-any-unicode-next-line`. Without this step every core l10n batch fails
the hook and the only alternative would be bypassing it.

Default scope: files with unstaged/staged changes right now, and only lines whose code
portion (before `//`) has non-ASCII. Idempotent — an already-marked line is left alone.

Run from `oss/` after `node ../../build/apply-zh-cn-ast.mjs --dict=...`:
    python ../../scripts/oneoff/add-unicode-markers.py

Backfilling a whole-tree debt needs the file list from the failing gate itself, because the
debt was committed before this step existed and the working tree is clean:
    python ../../scripts/oneoff/add-unicode-markers.py --from-log=/tmp/hyg.log --dry
    python ../../scripts/oneoff/add-unicode-markers.py --from-log=/tmp/hyg.log
`--from-log` reads the `path.ts(line,col): Unexpected unicode character` lines that
`npm run hygiene` prints, and `--dry` only reports what would change. Explicit paths may
also be passed as positional arguments.
"""
import io
import os
import re
import subprocess
import sys

# Characters upstream's guard whitelists; keep in sync with the class in hygiene.ts.
ALLOWED = set(
    '⊃⊇✔✓🎯🧪✍️⚠️🛑🔴🚗🚙🚕🎉✨❗⇧⌥⌘×÷¦⋯…↑↓￫→←↔⟷—·•●◆▼⟪⟫┌└├⏎↩√φ'
)
MARKER = '// allow-any-unicode-next-line'
# A hygiene error line looks like: src\vs\...\foo.ts(150,82): Unexpected unicode character: ...
ERROR_LINE = re.compile(r'^([^\s()]+\.ts)\((\d+),(\d+)\):\s*Unexpected unicode character')

args = [a for a in sys.argv[1:] if not a.startswith('--')]
DRY = '--dry' in sys.argv
log_arg = next((a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('--from-log=')), None)

per_file = {}
if log_arg:
    if not os.path.isfile(log_arg):
        sys.exit('log not found: %s' % log_arg)
    for line in io.open(log_arg, encoding='utf-8', errors='ignore'):
        m = ERROR_LINE.match(line.strip())
        if m:
            rel = m.group(1).replace(os.sep, '/')
            per_file[rel] = per_file.get(rel, 0) + 1
    changed = sorted(per_file)
    print('from log: %d unicode error(s) across %d file(s)' % (sum(per_file.values()), len(changed)))
else:
    changed = subprocess.run(
        ['git', 'diff', '--name-only'] + args, capture_output=True, text=True
    ).stdout.split()

total = 0
touched = 0
for path in changed:
    if not path.endswith('.ts'):
        continue
    if not os.path.isfile(path):
        print('SKIP (not under cwd): %s' % path)
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
        if not DRY:
            io.open(path, 'w', encoding='utf-8', newline='').write('\n'.join(out))
        print('%s markers %4d  %s' % ('DRY' if DRY else 'add ', added, path))
        total += added
        touched += 1

print('%s %d markers in %d file(s)' % ('would add' if DRY else 'total', total, touched))
