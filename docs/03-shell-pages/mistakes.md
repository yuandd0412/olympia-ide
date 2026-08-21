# Shell — Mistakes (错题本)

> Source: `D:\oler\oler-ide-redesign\orchestration-summary.json` →
> `pages[?nodeId=page-shell-mistakes]` (visualNorthStar, continuityAnchors) +
> `oler-ide-redesign.design` → `data[?id=page-shell-mistakes]`
> (interactions: nav-problems / nav-training / nav-ai / nav-settings).

The Mistakes tab is the user's **WA / TLE / RE / CE history**, presented
as a filterable journal. Every non-AC submission from the
`05-test-results/panel.md` is captured here, tagged with the verdict, and
made filterable so the user can find "all my TLE on graph problems from
last week" in one click.

## Visual North Star

> *"Mistake journal with verdict-colored tags (WA/TLE/RE/CE), filterable
> list, frequency heatmap hint, review actions."*
> — orchestration-summary.json

The Mistakes tab is the most **verdict-driven** page in the shell. Color
is not decoration here — it is the primary filter dimension.

## Continuity Anchors

| Anchor                | Dimension  | Purpose                |
|-----------------------|------------|------------------------|
| `shared-shell-layout` | structural | Sidebar / main layout  |
| `oler-nav-56px`       | 56px       | ActivityBar            |
| `oler-tabbar-36px`    | 36px       | TabBar                 |

Verdict color tokens come from `02-design-system/tokens.md`:

| Verdict | Token            | Hex     |
|---------|------------------|---------|
| WA      | `--oler-wa`      | `#ff453a` |
| TLE     | `--oler-tle`     | `#ff9f0a` |
| RE      | `--oler-re`      | `#c45c4a` |
| CE      | `--oler-ce`      | `#c49a3c` |
| AC      | `--oler-ac`      | `#34c759` (used only when "show accepted" is on) |

## Key Features

1. **Verdict tag list** — left rail of the main pane shows counts per
   verdict (WA: 24, TLE: 11, RE: 4, CE: 2). Clicking a tag filters the
   list. Multi-select supported (Shift+click).
2. **Filterable list** — center column. Each row: problem title, OJ
   source, verdict tag, timestamp, "Re-open" action. Sorted by
   timestamp descending by default.
3. **Frequency heatmap hint** — right column. A 7x4 grid (days x
   weeks) showing submission density. Darker = more submissions. The
   "hint" wording in the v0 brief signals that the heatmap is
   non-interactive in v1.
4. **Review actions** — per-row hover: "Re-open" (load problem +
   last submission code in the editor), "Mark reviewed" (moves to
   archive, removes from active list), "Find similar" (links to AI
   coach with the failure context pre-loaded).

## Layout Sketch

```
+----------------------------------------------------------+
| ActivityBar(56) | [WA 24] [TLE 11] [RE 4] [CE 2] [All]   |
|                 +---------------------+------------------+
|  P  icon        |  Problem | OJ | v | t   |  heatmap 7x4  |
|  T  icon        |  [row]                              |
|  M  icon        |  [row]                              |
|  A  icon        |  [row]                              |
|  S  icon        |  [row]                              |
|                 |  [row]                              |
|                 |  ...                                |
+-----------------+--------------------------------------+
```

## State Colors

| State                  | Token                  | Use                            |
|------------------------|------------------------|--------------------------------|
| WA row indicator       | `--oler-wa`            | Left border + tag              |
| TLE row indicator      | `--oler-tle`           | Left border + tag              |
| RE row indicator       | `--oler-re`            | Left border + tag              |
| CE row indicator       | `--oler-ce`            | Left border + tag              |
| "Mark reviewed" hover  | `--state-success`      | Archive action affordance      |
| Heatmap cell           | `--oler-primary` + alpha | Submission density           |

## Phase 5+ 待实装 (Pending)

- Persistence. The mistake list is currently in-memory only; Phase 5+
  will write to `~/.oleride/mistakes.json` (local SQLite may follow).
- Heatmap interactivity. Clicking a cell should filter the list to
  that day's submissions. Visual-only in v1.
- "Find similar" AI bridge. The AI coach's prompt is hard-coded for
  now; the real implementation will inject the failing test case and
  diff into the prompt in Phase 7+.
- Archive view. "Mark reviewed" hides rows; there is no dedicated
  Archive view yet.

## Cross-Tab Navigation

| DOM id           | Target page              |
|------------------|--------------------------|
| `nav-problems`   | `page-shell-problems`    |
| `nav-training`   | `page-shell-training`    |
| `nav-ai`         | `page-shell-ai`          |
| `nav-settings`   | `page-shell-settings`    |
