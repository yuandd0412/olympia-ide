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

for area in AREAS:
    print('=====', area)
    for root, dirs, files in os.walk(area):
        dirs[:] = [d for d in dirs if d != 'test']
        for name in sorted(files):
            if not name.endswith('.ts'):
                continue
            path = os.path.join(root, name).replace(os.sep, '/')
            src = io.open(path, encoding='utf-8', errors='ignore').read()
            for m in PAIR.finditer(src):
                msg = m.group(3)
                if CJK.search(msg) or not re.search(r'[A-Za-z]{3}', msg):
                    continue
                line = src[:m.start()].count('\n') + 1
                print('%s:%d\t%s\t%s' % (path, line, m.group(1).strip()[:40], msg.replace('\n', '\\n')))
