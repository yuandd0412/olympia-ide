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

The panel is **verdict-driven**: colour is derived from the verdict.
Ordering by verdict rather than by test-case index is the design intent —
the live `frontend/src/components/runner/RunnerPanel.tsx` keeps rows in
case order. Severity order: AC first, then WA / MLE / TLE / RE. CE is a
whole-run verdict — a failed build short-circuits before any case is
evaluated — so it never appears on a case row.

## Continuity Anchors

| Anchor                 | Purpose                                  |
|------------------------|------------------------------------------|
| `oler-typography-system` | Reuses the SF Pro / JetBrains Mono pair |
| `oler-color-palette`   | Reuses the neutral + accent palette       |
| `judgment-colors`      | Verdict colors as first-class tokens     |

The six verdict colours. The first five come from
`02-design-system/tokens.md`; `MLE` landed in the mainline afterwards as
`--color-mle` (`#5e5ce6` dark / `#4433cf` light,
`frontend/src/index.css`), so it is not in the v0 token sheet.

| Verdict | Token            | Hex     | Meaning                                |
|---------|------------------|---------|----------------------------------------|
| AC      | `--oler-ac`      | `#34c759` | Accepted                              |
| WA      | `--oler-wa`      | `#ff453a` | Wrong Answer                         |
| MLE     | `--color-mle`    | `#5e5ce6` | Memory Limit Exceeded                |
| TLE     | `--oler-tle`     | `#ff9f0a` | Time Limit Exceeded                  |
| RE      | `--oler-re`      | `#c45c4a` | Runtime Error                        |
| CE      | `--oler-ce`      | `#c49a3c` | Compile Error                        |

`verdictColor` (`frontend/src/lib/design/tokens.ts`) is the single
mapping the badges, the status bar and the result banner read; an unknown
verdict code falls back to the WA colour rather than rendering nothing.

## Key Features

1. **Verdict badges** — every test case row has a verdict badge
   using the matching token. Badge is 6px-radius, 11px caption text,
   with a `0.15` alpha tint background and the verdict color
   foreground.
2. **Test case results grid** — left half. Columns: `#`, `Time`,
   `Memory`, `Verdict`, `Action`. Default sort: by index, but rows
   with non-AC verdicts are pinned to the top. *Live today:* the rows
   carry `#` and the verdict badge only — no per-row time/memory column,
   and no re-sorting.
3. **Diff viewer panel** — right half. When a row is selected, the
   expected vs actual output is shown side by side. Differences are
   inline-highlighted: `--state-error` for actual, `--state-success`
   for expected.
4. **Timing / memory stats** — per-row. `--oler-mono` (12px),
   tabular-nums. Time in ms, memory in KB / MB. Color-coded: green
   within budget, amber if within 80% of limit, red if at limit.
   *Live today:* the numbers are aggregate, not per-row — the verdict
   banner shows `totalTimeMs` and `maxMemoryKb`, and a per-case memory
   figure appears only when that case is judged `MLE`. `maxMemoryKb` is
   the measured peak working set (`PeakWorkingSetSize`), not an
   estimate; when the sample fails the judge reports `0`, which the UI
   renders as `未测得` rather than a size (`memoryLabel`,
   `frontend/src/lib/design/tokens.ts`). None of the budget
   colour-coding is implemented.
5. **Pass rate summary bar** — top of the panel, 4px tall.
   `passed / total` plus percentage. `--oler-primary` fill. If
   100% AC, fill is `--state-success` and the bar gets a check
   icon at the right. *Live today:* **Unbuilt** — there is no pass-rate
   bar; the panel shows a `测试用例 (N)` count and the overall verdict badge.
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

The sketch's per-row `Memory` column and its uniform `1.1MB` values are
illustrative. The live panel has no per-row time/memory readout (see Key
Features 2 and 4); it reports one aggregate peak — `maxMemoryKb`, a measured
`PeakWorkingSetSize` — next to the overall verdict badge.

## State Colors

| State               | Token                | Use                                |
|---------------------|----------------------|------------------------------------|
| AC badge            | `--oler-ac`          | Background tint + foreground       |
| WA badge            | `--oler-wa`          | Background tint + foreground       |
| MLE badge           | `--color-mle`        | Background tint + foreground       |
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

Only the badge tints above are live. The diff highlights and the
in-budget / near-limit / at-limit rows are **Unbuilt**: `RunnerPanel.tsx`
renders plain side-by-side expected and actual panes whose border and tint follow
the verdict through the theme tokens (`--color-ac` + `--color-ac-soft` for AC,
`--color-mle` + `--color-mle-soft` for MLE, `--color-wa` + `--color-wa-soft` for
anything else), with no inline diff and no budget comparison.

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
- Time / memory budget. The limits are already per-problem:
  `runCodeAction` (`frontend/src/stores/useAppStore.ts`) passes the active
  problem's `timeLimitMs` / `memoryLimitKb` to `run_code`, and the judge
  falls back to 1000 ms / 262144 KB only when no problem is bound. What is
  missing is a user-facing override — Settings carries no budget control
  (`AppSettings`, `frontend/src/types/index.ts`). Phase 5+ adds one.
- Compile cache. v1 always rebuilds; Phase 5+ adds a
  content-hash skip when source hasn't changed.

## Verdict to UI Cross-Reference

- The same verdict tokens are **meant** to feed the **Mistakes** tab in
  `03-shell-pages/mistakes.md` — every non-AC row writing to the mistake
  journal. That tab is **Unbuilt**: no component, no nav tab, and nothing
  in `frontend/src-tauri/src` names `mistakes.json`, so no failing row is
  recorded anywhere today. `verdictColor` (`frontend/src/lib/design/tokens.ts`)
  is the mapping both surfaces would share.
- The "Open in AI coach" deep link from the Mistakes tab references this
  panel's row index to seed the prompt — **Unbuilt** with its tab. What *is*
  live is the automatic context: `AiCoachPage.tsx` already sends the last
  run's verdict, time and peak memory plus up to three failing cases (an
  `MLE` case sends its measured `memoryKb` rather than its output).
- The time / memory budgets this panel evaluates against come from the bound
  problem, **not** from the Settings tab: `03-shell-pages/settings.md`'s
  default-budget control is **Unbuilt** (`AppSettings` carries no limit
  fields, and the judge's own fallbacks are 1000 ms / 262144 KB).
