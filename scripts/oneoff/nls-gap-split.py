import io, os, re, collections

CJK = re.compile(r'[㐀-䶿一-鿿]')
PAIR = re.compile(r"localize2?\s*\(\s*[^,]+?,\s*(['\"])((?:(?!\1).){3,200}?)\1", re.S)

# Paths whose strings only render inside the AI/Copilot-shaped subsystems.
AI_MARKERS = ('/chat', '/sessions', '/agentHost', '/agentsVoice', '/mcp', '/copilot',
              '/customizationMarketplace', '/agentFinder', '/browserView', '/editSessions')

ai = 0
other = collections.Counter()
for root, dirs, files in os.walk('src/vs'):
    dirs[:] = [d for d in dirs if d not in ('test', 'browser-media')]
    for name in files:
        if not name.endswith('.ts'):
            continue
        path = os.path.join(root, name).replace(os.sep, '/')
        try:
            src = io.open(path, encoding='utf-8').read()
        except Exception:
            continue
        for m in PAIR.finditer(src):
            msg = m.group(2)
            if CJK.search(msg) or not re.search(r'[A-Za-z]{3}', msg):
                continue
            if any(marker in path for marker in AI_MARKERS):
                ai += 1
            else:
                parts = path.split('/')
                other['/'.join(parts[2:5])] += 1

print('english defaults inside AI subsystems:', ai)
print('english defaults elsewhere:', sum(other.values()))
for k, v in other.most_common(18):
    print('  %5d  vs/%s' % (v, k))
