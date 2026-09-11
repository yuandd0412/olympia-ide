import type * as Monaco from 'monaco-editor';

const CPP_KEYWORDS = [
  'alignas', 'alignof', 'and', 'auto', 'bool', 'break', 'case', 'catch', 'char',
  'class', 'const', 'constexpr', 'continue', 'decltype', 'default', 'delete',
  'do', 'double', 'else', 'enum', 'explicit', 'export', 'extern', 'false',
  'float', 'for', 'friend', 'goto', 'if', 'inline', 'int', 'long', 'mutable',
  'namespace', 'new', 'noexcept', 'nullptr', 'operator', 'private', 'protected',
  'public', 'register', 'return', 'short', 'signed', 'sizeof', 'static',
  'struct', 'switch', 'template', 'this', 'throw', 'true', 'try', 'typedef',
  'typeid', 'typename', 'union', 'unsigned', 'using', 'virtual', 'void',
  'volatile', 'while', 'long long', 'unsigned int', 'size_t', 'll',
];

interface Snippet {
  label: string;
  body: string;
  detail: string;
  doc?: string;
}

const STL_SNIPPETS: Snippet[] = [
  { label: 'ios', body: 'ios::sync_with_stdio(false);\ncin.tie(nullptr);', detail: '快速 IO', doc: '解除 cin/cout 同步，竞赛必备' },
  { label: 'allmacro', body: '#define all(x) (x).begin(), (x).end()', detail: 'all 宏' },
  { label: 'llmacro', body: '#define ll long long', detail: 'll 宏' },
  { label: 'freopen', body: 'freopen("${1:in}.in", "r", stdin);\nfreopen("${1:in}.out", "w", stdout);', detail: '文件重定向', doc: 'OI 文件 IO 模板' },
  { label: 'vint', body: 'vector<int> ${1:v};', detail: 'vector<int>' },
  { label: 'vll', body: 'vector<long long> ${1:v};', detail: 'vector<long long>' },
  { label: 'pii', body: 'pair<int, int> ${1:p};', detail: 'pair<int,int>' },
  { label: 'psh', body: '${1:v}.push_back(${2:x});', detail: 'push_back' },
  { label: 'sortasc', body: 'sort(${1:v}.begin(), ${1:v}.end());', detail: '升序排序' },
  { label: 'sortdesc', body: 'sort(${1:v}.begin(), ${1:v}.end(), greater<>());', detail: '降序排序' },
  { label: 'lb', body: 'lower_bound(${1:v}.begin(), ${1:v}.end(), ${2:x}) - ${1:v}.begin()', detail: 'lower_bound 下标' },
  { label: 'ub', body: 'upper_bound(${1:v}.begin(), ${1:v}.end(), ${2:x}) - ${1:v}.begin()', detail: 'upper_bound 下标' },
  { label: 'pq', body: 'priority_queue<int, vector<int>, greater<int>> ${1:pq};', detail: '小根堆' },
  { label: 'qpow', body: 'long long qpow(long long a, long long b, long long mod) {\n    long long res = 1;\n    a %= mod;\n    for (; b; b >>= 1, a = a * a % mod)\n        if (b & 1) res = res * a % mod;\n    return res;\n}', detail: '快速幂' },
  { label: 'dsu', body: 'struct DSU {\n    vector<int> f;\n    DSU(int n) : f(n + 1) { iota(f.begin(), f.end(), 0); }\n    int find(int x) { return f[x] == x ? x : f[x] = find(f[x]); }\n    bool merge(int a, int b) {\n        a = find(a); b = find(b);\n        if (a == b) return false;\n        f[a] = b; return true;\n    }\n};', detail: '并查集' },
  { label: 'sieve', body: 'vector<bool> is_comp(${1:n} + 1, false);\nvector<int> primes;\nfor (int i = 2; i <= ${1:n}; i++) {\n    if (!is_comp[i]) {\n        primes.push_back(i);\n        for (long long j = (long long)i * i; j <= ${1:n}; j += i)\n            is_comp[j] = true;\n    }\n}', detail: '埃氏筛' },
  { label: 'dijkstra', body: 'vector<long long> dist(n + 1, LLONG_MAX);\npriority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<>> pq;\ndist[${1:s}] = 0;\npq.push({0, ${1:s}});\nwhile (!pq.empty()) {\n    auto [d, u] = pq.top(); pq.pop();\n    if (d > dist[u]) continue;\n    for (auto [v, w] : adj[u]) {\n        if (dist[u] + w < dist[v]) {\n            dist[v] = dist[u] + w;\n            pq.push({dist[v], v});\n        }\n    }\n}', detail: 'Dijkstra 堆优化' },
  { label: 'bfs', body: 'queue<int> q;\nvector<int> dist(n + 1, -1);\nq.push(${1:s});\ndist[${1:s}] = 0;\nwhile (!q.empty()) {\n    int u = q.front(); q.pop();\n    for (int v : adj[u]) {\n        if (dist[v] == -1) {\n            dist[v] = dist[u] + 1;\n            q.push(v);\n        }\n    }\n}', detail: 'BFS 模板' },
];

let registered = false;

/**
 * C++ completion for the built-in editor: keywords, OI-oriented STL snippets
 * and identifiers already present in the buffer. Registered once per app run.
 */
export function registerCppCompletion(monaco: typeof Monaco): void {
  if (registered) return;
  registered = true;

  monaco.languages.registerCompletionItemProvider('cpp', {
    triggerCharacters: ['.', '>', ':', '<'],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: Monaco.languages.CompletionItem[] = [];

      for (const k of CPP_KEYWORDS) {
        suggestions.push({
          label: k,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: k,
          range,
          detail: 'C++ 关键字',
          sortText: 'b' + k,
        });
      }

      for (const s of STL_SNIPPETS) {
        suggestions.push({
          label: s.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: s.body,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: s.detail + '（模板）',
          documentation: s.doc ? { value: s.doc } : undefined,
          range,
          sortText: 'a' + s.label,
        });
      }

      // 本文件中已出现的标识符（无重复、排除当前词）
      const text = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      const seen = new Set<string>(CPP_KEYWORDS);
      for (const s of STL_SNIPPETS) seen.add(s.label);
      const words = text.match(/[A-Za-z_]\w{2,}/g) ?? [];
      for (let i = words.length - 1; i >= 0; i--) {
        const w = words[i];
        if (seen.has(w) || w === word.word) continue;
        seen.add(w);
        suggestions.push({
          label: w,
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: w,
          range,
          detail: '文中标识符',
          sortText: 'c' + w,
        });
      }

      return { suggestions };
    },
  });
}
