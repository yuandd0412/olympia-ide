# Shell — Training (训练)

> Source: `D:\oler\oler-ide-redesign\orchestration-summary.json` →
> `pages[?nodeId=page-shell-training]` (visualNorthStar, continuityAnchors) +
> `oler-ide-redesign.design` → `data[?id=page-shell-training]`
> (interactions: nav-problems / nav-mistakes / nav-ai / nav-settings).

The Training tab is where the user plans OI study sessions. Think of it as
a planner + progress dashboard, not a content feed. The aim is to make
"what should I solve today" answerable in under 2 seconds.

## Visual North Star

> *"Training dashboard with streak counter, daily goal progress bar, planned
> sessions list, completion stats chart."*
> — orchestration-summary.json

The layout is a vertical dashboard: streak + goal at the top, planned
sessions in the middle, stats chart at the bottom. Densest area is the
middle list; the top stats are glanceable in one eye-fixation.

## Continuity Anchors

Same shell frame as every other page:

| Anchor                | Dimension  | Purpose                |
|-----------------------|------------|------------------------|
| `shared-shell-layout` | structural | Sidebar / main layout  |
| `oler-nav-56px`       | 56px       | ActivityBar (left)     |
| `oler-tabbar-36px`    | 36px       | TabBar (top)           |

## Key Features

1. **Streak counter** — top-left hero stat. Big numeric (36px display
   font), with a small "days" label and a flame icon. `--state-warning`
   (`#ff9f0a`) for the icon, `--oler-text-primary` for the number.
2. **Daily goal progress bar** — top-right. Shows `n / 5 problems solved
   today` with a 4px-tall progress bar. Fill color: `--oler-primary`.
   At >= 100% it switches to `--state-success`.
3. **Planned sessions list** — middle column. Each row: date, problem
   count, estimated time, "Start" button. Clicking "Start" loads the
   first problem into the editor (`04-editor/`).
4. **Completion stats chart** — bottom 200px. A simple bar chart of
   the last 30 days' solved count. `--oler-primary` bars, no axis
   gridlines, weekday tick marks at the bottom in `--oler-text-tertiary`.

## Layout Sketch

```
+----------------------------------------------------------+
| ActivityBar(56) | [streak 12]    [n / 5 today progress]  |
|                 +--------------------------------------+
|  P  icon        |  Planned sessions                     |
|  T  icon        |  [row] [row] [row] [row]              |
|  M  icon        |  [row] [row] [row] [row]              |
|  A  icon        +--------------------------------------+
|  S  icon        |  Last 30 days                         |
|                 |  [bar chart]                          |
|                 |  M T W T F S S M T W T F S S ...      |
+-----------------+--------------------------------------+
```

## State Colors

| State                | Token                | Use                                |
|----------------------|----------------------|------------------------------------|
| Streak icon          | `--state-warning`    | Flame / fire glyph                 |
| Goal progress fill   | `--oler-primary`     | Default                            |
| Goal >= 100% fill    | `--state-success`    | Goal complete                      |
| Chart bars           | `--oler-primary`     | Default                            |
| Empty chart          | `--oler-text-muted`  | No data placeholder                |

## Current implementation

- Streak, daily progress, total solves, and the 30-day chart are driven by
  the persisted solve history in `~/.oleride/solves.json`.
- Training plans can be created, completed, and deleted from the Training
  page. Plans are persisted in the `training/sessions` settings key.
- The daily goal is configurable from Settings and updates the progress bar
  immediately.

Follow-up work:

- Add hover tooltips to chart bars with the exact date and solve count.
- Link a planned session to a selected problem and its local workspace.

## Cross-Tab Navigation

| DOM id           | Target page              |
|------------------|--------------------------|
| `nav-problems`   | `page-shell-problems`    |
| `nav-mistakes`   | `page-shell-mistakes`    |
| `nav-ai`         | `page-shell-ai`          |
| `nav-settings`   | `page-shell-settings`    |
