import io, os, re, collections, sys

# Resolved from this file, never from the caller's cwd: os.walk() on a missing directory
# yields nothing, and this script reported that as a clean "0 remaining english".
_HERE = os.path.dirname(os.path.abspath(__file__))
_CANDIDATES = (
    os.path.normpath(os.path.join(_HERE, '..', '..', 'oss', 'src', 'vs')),
    os.path.join('src', 'vs'),
)
ROOT = next((p for p in _CANDIDATES if os.path.isdir(p)), None)
if ROOT is None:
    sys.exit('scan root not found — expected %s' % (', '.join(_CANDIDATES),))

CJK = re.compile(r'[\u3400-\u4dbf\u4e00-\u9fff]')
PAIR = re.compile(r"localize2?\s*\(\s*[^,]+?,\s*(['\"])((?:(?!\1).){3,200}?)\1", re.S)

total = 0
by_top = collections.Counter()
by_area = collections.Counter()
files_scanned = 0

unreadable = 0
for root, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in ('test', 'browser-media')]
    for name in files:
        if not name.endswith('.ts'):
            continue
        files_scanned += 1
        real = os.path.join(root, name)
        # Logical label so parts[2:4] below keeps naming real areas; reading uses `real`.
        path = ('src/vs/' + os.path.relpath(real, ROOT)).replace(os.sep, '/')
        try:
            src = io.open(real, encoding='utf-8').read()
        except Exception:
            unreadable += 1
            continue
        for m in PAIR.finditer(src):
            msg = m.group(2)
            if CJK.search(msg) or not re.search(r'[A-Za-z]{3}', msg):
                continue
            total += 1
            parts = path.split('/')
            area = parts[2] if len(parts) > 2 else '?'
            by_top[area] += 1
            by_area['/'.join(parts[2:4])] += 1

if not files_scanned:
    sys.exit('walked %s and found no .ts — this scan is broken, not clean' % ROOT)
print('files scanned:', files_scanned, '(unreadable skipped: %d)' % unreadable)
print('remaining english default messages:', total)
for k, v in by_top.most_common(8):
    print('  %6d  vs/%s' % (v, k))
print('--- by area/sub ---')
for k, v in by_area.most_common(16):
    print('  %6d  vs/%s' % (v, k))
