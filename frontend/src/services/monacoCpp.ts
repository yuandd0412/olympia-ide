import type * as Monaco from 'monaco-editor';

const CPP_KEYWORDS = [
  'alignas', 'alignof', 'and', 'auto', 'bool', 'break', 'case', 'catch', 'char',
  'class', 'const', 'constexpr', 'continue', 'decltype', 'default', 'delete',
  'do', 'double', 'else', 'enum', 'explicit', 'export', 'extern', 'false',
  'float', 'for', 'friend', 'goto', 'if', 'inline', 'int', 'long', 'mutable',
  'namespace', 'new', 'noexcept', 'nullptr', 'operator', 'private', 'protected',
  'public', 'return', 'short', 'signed', 'sizeof', 'static',
  'struct', 'switch', 'template', 'this', 'throw', 'true', 'try', 'typedef',
  'typeid', 'typename', 'union', 'unsigned', 'using', 'virtual', 'void',
  'volatile', 'while', 'size_t',
];

/** High-frequency contest keywords shown even before any prefix is typed. */
const HOT_KEYWORDS = new Set([
  'int', 'long', 'for', 'if', 'else', 'while', 'return', 'const', 'auto',
  'vector', 'queue', 'pair', 'string', 'using', 'namespace', 'include',
]);

interface Snippet {
  label: string;
  body: string;
  detail: string;
  doc?: string;
  /** Extra trigger aliases matched by prefix. */
  keys?: string[];
}

const STL_SNIPPETS: Snippet[] = [
  { label: 'ios', body: 'ios::sync_with_stdio(false);\ncin.tie(nullptr);', detail: '快速 IO', doc: '解除 cin/cout 同步，竞赛必备', keys: ['sync', 'fastio'] },
  { label: 'allmacro', body: '#define all(x) (x).begin(), (x).end()', detail: 'all 宏' },
  { label: 'llmacro', body: '#define ll long long', detail: 'll 宏', keys: ['longlong'] },
  { label: 'freopen', body: 'freopen("${1:in}.in", "r", stdin);\nfreopen("${1:in}.out", "w", stdout);', detail: '文件重定向', doc: 'OI 文件 IO 模板' },
  { label: 'vint', body: 'vector<int> ${1:v};', detail: 'vector<int>' },
  { label: 'vll', body: 'vector<long long> ${1:v};', detail: 'vector<long long>' },
  { label: 'pii', body: 'pair<int, int> ${1:p};', detail: 'pair<int,int>' },
  { label: 'psh', body: '${1:v}.push_back(${2:x});', detail: 'push_back', keys: ['push'] },
  { label: 'sortasc', body: 'sort(${1:v}.begin(), ${1:v}.end());', detail: '升序排序', keys: ['sort'] },
  { label: 'sortdesc', body: 'sort(${1:v}.begin(), ${1:v}.end(), greater<>());', detail: '降序排序', keys: ['sort'] },
  { label: 'lb', body: 'lower_bound(${1:v}.begin(), ${1:v}.end(), ${2:x}) - ${1:v}.begin()', detail: 'lower_bound 下标', keys: ['lower', 'bound'] },
  { label: 'ub', body: 'upper_bound(${1:v}.begin(), ${1:v}.end(), ${2:x}) - ${1:v}.begin()', detail: 'upper_bound 下标', keys: ['upper', 'bound'] },
  { label: 'pq', body: 'priority_queue<int, vector<int>, greater<int>> ${1:pq};', detail: '小根堆', keys: ['heap', 'priority'] },
  { label: 'qpow', body: 'long long qpow(long long a, long long b, long long mod) {\n    long long res = 1;\n    a %= mod;\n    for (; b; b >>= 1, a = a * a % mod)\n        if (b & 1) res = res * a % mod;\n    return res;\n}', detail: '快速幂', keys: ['pow', 'power'] },
  { label: 'dsu', body: 'struct DSU {\n    vector<int> f;\n    DSU(int n) : f(n + 1) { iota(f.begin(), f.end(), 0); }\n    int find(int x) { return f[x] == x ? x : f[x] = find(f[x]); }\n    bool merge(int a, int b) {\n        a = find(a); b = find(b);\n        if (a == b) return false;\n        f[a] = b; return true;\n    }\n};', detail: '并查集', keys: ['union', 'find'] },
  { label: 'sieve', body: 'vector<bool> is_comp(${1:n} + 1, false);\nvector<int> primes;\nfor (int i = 2; i <= ${1:n}; i++) {\n    if (!is_comp[i]) {\n        primes.push_back(i);\n        for (long long j = (long long)i * i; j <= ${1:n}; j += i)\n            is_comp[j] = true;\n    }\n}', detail: '埃氏筛', keys: ['prime'] },
  { label: 'dijkstra', body: 'vector<long long> dist(n + 1, LLONG_MAX);\npriority_queue<pair<long long, int>, vector<pair<long long, int>, greater<>> pq;\ndist[${1:s}] = 0;\npq.push({0, ${1:s}});\nwhile (!pq.empty()) {\n    auto [d, u] = pq.top(); pq.pop();\n    if (d > dist[u]) continue;\n    for (auto [v, w] : adj[u]) {\n        if (dist[u] + w < dist[v]) {\n            dist[v] = dist[u] + w;\n            pq.push({dist[v], v});\n        }\n    }\n}', detail: 'Dijkstra 堆优化', keys: ['shortest', 'graph'] },
  { label: 'bfs', body: 'queue<int> q;\nvector<int> dist(n + 1, -1);\nq.push(${1:s});\ndist[${1:s}] = 0;\nwhile (!q.empty()) {\n    int u = q.front(); q.pop();\n    for (int v : adj[u]) {\n        if (dist[v] == -1) {\n            dist[v] = dist[u] + 1;\n            q.push(v);\n        }\n    }\n}', detail: 'BFS 模板', keys: ['queue'] },
  { label: 'cin', body: 'cin >> ${1:x};', detail: '读入' },
  { label: 'cout', body: 'cout << ${1:x} << "\\\\n";', detail: '输出换行' },
];

let registered = false;

/** Lower is better. Prefix hits rank above substring hits. */
function rank(prefix: string, candidate: string): number {
  if (!prefix) return 50;
  const p = prefix.toLowerCase();
  const c = candidate.toLowerCase();
  if (c === p) return 0;
  if (c.startsWith(p)) return 10;
  if (c.includes(p)) return 40;
  return 99; // filtered out later
}

function matches(prefix: string, candidate: string): boolean {
  return rank(prefix, candidate) < 99;
}

/**
 * C++ completion: contest snippets first, then prefix-filtered keywords and
 * buffer identifiers. Enter does NOT accept (editor option); Tab does.
 */
export function registerCppCompletion(monaco: typeof Monaco): void {
  if (registered) return;
  registered = true;

  monaco.languages.registerCompletionItemProvider('cpp', {
    triggerCharacters: ['.', '>', ':', '<', '_'],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const prefix = word.word;
      const range: Monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      type Row = {
        item: Monaco.languages.CompletionItem;
        r: number;
      };
      const rows: Row[] = [];
      const seen = new Set<string>();

      const push = (
        label: string,
        kind: Monaco.languages.CompletionItemKind,
        insertText: string,
        detail: string,
        r: number,
        extra?: Partial<Monaco.languages.CompletionItem>,
      ) => {
        if (seen.has(label)) return;
        seen.add(label);
        rows.push({
          r,
          item: {
            label,
            kind,
            insertText,
            range,
            detail,
            filterText: label,
            sortText: String(r).padStart(3, '0') + label,
            ...extra,
          },
        });
      };

      // --- Snippets: match label or aliases against prefix ---
      for (const s of STL_SNIPPETS) {
        const keys = [s.label, ...(s.keys ?? [])];
        if (!prefix) {
          push(
            s.label,
            monaco.languages.CompletionItemKind.Snippet,
            s.body,
            `${s.detail}（模板）`,
            0,
            {
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: s.doc ? { value: s.doc } : undefined,
            },
          );
          continue;
        }
        const best = Math.min(...keys.map((k) => rank(prefix, k)));
        if (best < 99) {
          push(
            s.label,
            monaco.languages.CompletionItemKind.Snippet,
            s.body,
            `${s.detail}（模板）`,
            best,
            {
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: s.doc ? { value: s.doc } : undefined,
            },
          );
        }
      }

      // --- Keywords: empty prefix → only hot set; else prefix filter ---
      for (const k of CPP_KEYWORDS) {
        if (!prefix) {
          if (HOT_KEYWORDS.has(k)) {
            push(k, monaco.languages.CompletionItemKind.Keyword, k, 'C++ 关键字', 30);
          }
          continue;
        }
        const r = rank(prefix, k);
        if (r < 99) push(k, monaco.languages.CompletionItemKind.Keyword, k, 'C++ 关键字', 20 + r);
      }

      // --- Buffer identifiers: prefer recent + prefix ---
      const text = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      const words = text.match(/[A-Za-z_]\w*/g) ?? [];
      // Walk backwards so nearer identifiers win ties.
      for (let i = words.length - 1; i >= 0 && rows.length < 200; i--) {
        const w = words[i];
        if (seen.has(w) || w === prefix || w.length < 2) continue;
        if (prefix && !matches(prefix, w)) continue;
        if (!prefix && w.length < 3) continue;
        const r = rank(prefix || '', w);
        // Nearer words: slight bonus via sortText only; keep rank bands stable.
        push(w, monaco.languages.CompletionItemKind.Variable, w, '文中标识符', 40 + r);
      }

      const labelOf = (i: Monaco.languages.CompletionItem) =>
        typeof i.label === 'string' ? i.label : i.label.label;
      rows.sort((a, b) => a.r - b.r || labelOf(a.item).localeCompare(labelOf(b.item)));
      return { suggestions: rows.map((x) => x.item) };
    },
  });
}
