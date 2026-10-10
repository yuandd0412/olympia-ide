import io, os, re, collections

CJK = re.compile(r'[\u3400-\u4dbf\u4e00-\u9fff]')
PAIR = re.compile(r"localize2?\s*\(\s*[^,]+?,\s*(['\"])((?:(?!\1).){3,200}?)\1", re.S)

total = 0
by_top = collections.Counter()
by_area = collections.Counter()
files_scanned = 0

for root, dirs, files in os.walk('src/vs'):
    dirs[:] = [d for d in dirs if d not in ('test', 'browser-media')]
    for name in files:
        if not name.endswith('.ts'):
            continue
        files_scanned += 1
        path = os.path.join(root, name).replace(os.sep, '/')
        try:
            src = io.open(path, encoding='utf-8').read()
        except Exception:
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

print('files scanned:', files_scanned)
print('remaining english default messages:', total)
for k, v in by_top.most_common(8):
    print('  %6d  vs/%s' % (v, k))
print('--- by area/sub ---')
for k, v in by_area.most_common(16):
    print('  %6d  vs/%s' % (v, k))
