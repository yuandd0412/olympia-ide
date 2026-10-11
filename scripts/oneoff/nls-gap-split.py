import io, os, re, collections, sys

# The scan root must be resolved from this file's own location, not from the caller's
# cwd: os.walk() on a missing directory yields nothing, so a relative 'src/vs' made the
# script print "0 / 0" from the repo root — a perfect-looking "nothing left to translate"
# that was really "I read no files at all".
_HERE = os.path.dirname(os.path.abspath(__file__))
_CANDIDATES = (
    os.path.normpath(os.path.join(_HERE, '..', '..', 'oss', 'src', 'vs')),
    os.path.join('src', 'vs'),
)
ROOT = next((p for p in _CANDIDATES if os.path.isdir(p)), None)
if ROOT is None:
    sys.exit('scan root not found — expected %s' % (', '.join(_CANDIDATES),))

CJK = re.compile(r'[㐀-䶿一-鿿]')
PAIR = re.compile(r"localize2?\s*\(\s*[^,]+?,\s*(['\"])((?:(?!\1).){3,200}?)\1", re.S)

# Paths whose strings only render inside the AI/Copilot-shaped subsystems.
AI_MARKERS = ('/chat', '/sessions', '/agentHost', '/agentsVoice', '/mcp', '/copilot',
              '/customizationMarketplace', '/agentFinder', '/browserView', '/editSessions')

ai = 0
other = collections.Counter()
scanned = 0
unreadable = 0
for root, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in ('test', 'browser-media')]
    for name in files:
        if not name.endswith('.ts'):
            continue
        real = os.path.join(root, name)
        # Logical path keeps a literal 'src/vs/' prefix no matter where ROOT resolved to,
        # so the AI markers and the parts[2:5] area bucketing below stay meaningful. It is
        # a label only — reading the file uses `real`.
        path = ('src/vs/' + os.path.relpath(real, ROOT)).replace(os.sep, '/')
        try:
            src = io.open(real, encoding='utf-8').read()
        except Exception:
            unreadable += 1
            continue
        scanned += 1
        for m in PAIR.finditer(src):
            msg = m.group(2)
            if CJK.search(msg) or not re.search(r'[A-Za-z]{3}', msg):
                continue
            if any(marker in path for marker in AI_MARKERS):
                ai += 1
            else:
                parts = path.split('/')
                other['/'.join(parts[2:5])] += 1

# Both past failures of this script looked identical to success: an empty walk and a
# swallowed read error each reported "0 / 0". Refuse to report a number that was not
# measured over a real corpus.
if not scanned:
    sys.exit('read 0 .ts files under %s — the scan is broken, not finished' % ROOT)
print('scanned %d .ts files under %s' % (scanned, ROOT))
if unreadable:
    print('!! %d file(s) could not be read and were skipped' % unreadable)
print('english defaults inside AI subsystems:', ai)
print('english defaults elsewhere:', sum(other.values()))
for k, v in other.most_common(18):
    print('  %5d  vs/%s' % (v, k))
