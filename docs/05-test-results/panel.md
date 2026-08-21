# Test Results Panel

> Source: `D:\oler\oler-ide-redesign\orchestration-summary.json` →
> `pages[?nodeId=page-test-results]` (visualNorthStar, continuityAnchors) +
> `oler-ide-redesign.design` → `data[?id=page-test-results]`
> (interactions: none declared).

The test-results panel is the surface the user stares at after every
`Ctrl+R`. It is a single, full-width panel that replaces (or pins
beside) the editor and shows the verdict of every test case the local
compiler pipeline evaluated.

## Visual North Star

> *"Test case results grid with verdict badges (AC/WA/TLE/RE), diff
> viewer panel, timing/memory stats, pass rate summary bar, compilation
> output section."*
> — orchestration-summary.json

The panel is **verdict-driven**: color and order are derived from the
verdict, not from the test case index. AC first, then WA / TLE / RE / CE.

## Continuity Anchors

| Anchor                 | Purpose                                  |
|------------------------|------------------------------------------|
| `oler-typography-system` | Reuses the SF Pro / JetBrains Mono pair |
| `oler-color-palette`   | Reuses the neutral + accent palette       |
| `judgment-colors`      | Verdict colors as first-class tokens     |

The five verdict colors (from `02-design-system/tokens.md`):

| Verdict | Token            | Hex     | Meaning                                |
|---------|------------------|---------|----------------------------------------|
| AC      | `--oler-ac`      | `#34c759` | Accepted                              |
| WA      | `--oler-wa`      | `#ff453a` | Wrong Answer                         |
| TLE     | `--oler-tle`     | `#ff9f0a` | Time Limit Exceeded                  |
| RE      | `--oler-re`      | `#c45c4a` | Runtime Error                        |
| CE      | `--oler-ce`      | `#c49a3c` | Compile Error                        |

## Key Features

1. **Verdict badges** — every test case row has a verdict badge
   using the matching token. Badge is 6px-radius, 11px caption text,
   with a `0.15` alpha tint background and the verdict color
   foreground.
2. **Test case results grid** — left half. Columns: `#`, `Time`,
   `Memory`, `Verdict`, `Action`. Default sort: by index, but rows
   with non-AC verdicts are pinned to the top.
3. **Diff viewer panel** — right half. When a row is selected, the
   expected vs actual output is shown side by side. Differences are
   inline-highlighted: `--state-error` for actual, `--state-success`
   for expected.
4. **Timing / memory stats** — per-row. `--oler-mono` (12px),
   tabular-nums. Time in ms, memory in KB / MB. Color-coded: green
   within budget, amber if within 80% of limit, red if at limit.
5. **Pass rate summary bar** — top of the panel, 4px tall.
   `passed / total` plus percentage. `--oler-primary` fill. If
   100% AC, fill is `--state-success` and the bar gets a check
   icon at the right.
6. **Compilation output section** — collapsible, default open if
   `CE`. Shows the g++ stderr verbatim in `--oler-mono` inside
   `--oler-bg-surface`. Warning rows highlighted with
   `--state-warning`.

## Layout Sketch

```
+----------------------------------------------------------+
| Pass rate 4 / 5 (80%)      [----########----------]      |
+--------------------------+-------------------------------+
| # | Time | Memory | Verdict | Act | Expected  | Actual  |
| 1 |  8ms |  1.1MB |   AC    |  -  | 42        | 42      |
| 3 | 980ms|  3.2MB |   TLE   |  o  | (budget: 1s)         |
| 2 |  6ms |  1.1MB |   WA    |  o  | 1 2 3 4   | 1 2 3 4 5|
| 4 | 12ms |  1.1MB |   AC    |  -  | 7          | 7       |
| 5 |  4ms |  1.1MB |   AC    |  -  | 8          | 8       |
+--------------------------+-------------------------------+
| Compilation output (collapsed)                            |
| $ g++ -O2 -std=c++17 main.cpp -o main                    |
| main.cpp: In function 'int main()':                      |
| main.cpp:5:5: warning: ...                                |
+----------------------------------------------------------+
```

## State Colors

| State               | Token                | Use                                |
|---------------------|----------------------|------------------------------------|
| AC badge            | `--oler-ac`          | Background tint + foreground       |
| WA badge            | `--oler-wa`          | Background tint + foreground       |
| TLE badge           | `--oler-tle`         | Background tint + foreground       |
| RE badge            | `--oler-re`          | Background tint + foreground       |
| CE badge            | `--oler-ce`          | Background tint + foreground       |
| Diff expected       | `--state-success`    | Expected line highlight            |
| Diff actual         | `--state-error`      | Actual line highlight              |
| Stats in budget     | `--state-success`    | Time/memory within limits          |
| Stats near limit    | `--state-warning`    | Time/memory >= 80% of limit        |
| Stats at limit      | `--state-error`      | Time/memory >= 100% of limit       |
| Compile warning     | `--state-warning`    | g++ warning row                    |
| Compile error       | `--state-error`      | g++ error row                      |

## Keyboard Behavior (subject to Phase 5+)

- `↑` / `↓` — move selected row.
- `Enter` — open / close the diff sub-panel for the selected row.
- `Ctrl+Shift+R` — re-run all testcases (replaces the panel contents).
- `Ctrl+J` — submit to OJ (writes the current source to the OJ
  receiver's submit dialog).

## Phase 5+ 待实装 (Pending)

- Click-to-pin row. v1 selects on click but doesn't keep the row
  visible while the user scrolls. Phase 5+ adds a pin icon.
- Re-run from a single row. v1's re-run always re-evaluates all
  test cases; Phase 5+ will add "Run from case N" with the
  ability to seed state.
- Time / memory budget. v1 has hard-coded `1s / 64MB` defaults;
  Phase 5+ lets the user override per problem.
- Compile cache. v1 always rebuilds; Phase 5+ adds a
  content-hash skip when source hasn't changed.

## Verdict to UI Cross-Reference

- The same verdict tokens feed the **Mistakes** tab in
  `03-shell-pages/mistakes.md` — every non-AC row writes to the
  mistake journal.
- The "Open in AI coach" deep link from the Mistakes tab
  references this panel's row index to seed the prompt.
- The Settings tab in `03-shell-pages/settings.md` controls the
  default time / memory budgets that this panel evaluates against.
