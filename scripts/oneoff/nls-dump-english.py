import io, os, re, sys

CJK = re.compile(r'[㐀-䶿一-鿿]')
PAIR = re.compile(r"localize2?\s*\(\s*([^,]+?),\s*(['\"])((?:(?!\2).){3,200}?)\2", re.S)

AREAS = sys.argv[1:] or [
    'src/vs/workbench/browser/parts',
    'src/vs/platform/theme',
    'src/vs/workbench/contrib/tasks',
    'src/vs/workbench/contrib/extensions',
    'src/vs/workbench/contrib/multiDiffEditor',
    'src/vs/platform/files/browser',
    'src/vs/editor',
    'src/vs/platform/accessibilitySignal',
]

# Areas are named relative to the fork, so they must be resolved against the fork rather
# than the caller's cwd — an unresolvable area used to print a heading and then nothing,
# which reads exactly like "this area is fully translated".
_FORK = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'oss'))
targets = []
for a in AREAS:
    p = a if os.path.isabs(a) else os.path.join(_FORK, a)
    if not os.path.isdir(p):
        sys.exit('area does not exist: %s' % p)
    targets.append((a, p))

for label, area in targets:
    print('=====', label)
    for root, dirs, files in os.walk(area):
        dirs[:] = [d for d in dirs if d != 'test']
        for name in sorted(files):
            if not name.endswith('.ts'):
                continue
            real = os.path.join(root, name)
            path = os.path.relpath(real, _FORK).replace(os.sep, '/')
            src = io.open(real, encoding='utf-8', errors='ignore').read()
            for m in PAIR.finditer(src):
                msg = m.group(3)
                if CJK.search(msg) or not re.search(r'[A-Za-z]{3}', msg):
                    continue
                line = src[:m.start()].count('\n') + 1
                print('%s:%d\t%s\t%s' % (path, line, m.group(1).strip()[:40], msg.replace('\n', '\\n')))
