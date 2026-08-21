# Shell — Problems (题库)

> Source: `D:\oler\oler-ide-redesign\orchestration-summary.json` →
> `pages[?nodeId=page-shell-problems]` (visualNorthStar, continuityAnchors) +
> `oler-ide-redesign.design` → `data[?id=page-shell-problems]`
> (interactions: nav-training / nav-mistakes / nav-ai / nav-settings).

The Problems tab is the **default landing page** of the Oler shell. The
"打开 Oler 主 UI" interaction in the welcome page points here, and every
other shell tab navigates away from it via the ActivityBar.

## Visual North Star

> *"Compact file-browser style with search bar, problem cards showing
> OJ/source/difficulty tags, recent problems grid, quick actions."*
> — orchestration-summary.json

The layout borrows from Luogu's problem list (洛谷题单) and VSCode's
Explorer panel: dense, scrollable, with metadata badges on every card.
**No hero, no marketing gradient, no oversized empty state.**

## Continuity Anchors

These three identifiers appear in every shell page and are reused verbatim
from the v0 design:

| Anchor                | Dimension  | Purpose                                  |
|-----------------------|------------|------------------------------------------|
| `shared-shell-layout` | structural | Sidebar / main / optional detail layout  |
| `oler-nav-56px`       | 56px       | ActivityBar (left rail)                  |
| `oler-tabbar-36px`    | 36px       | TabBar (top horizontal tabs)             |

Plus the global tokens from `02-design-system/tokens.md`:
- `--oler-bg-base` page background
- `--oler-bg-surface` for the sidebar
- `--oler-border` for separators
- `--state-info` / `--state-warning` / `--state-error` for difficulty chips

## Key Features

1. **Search bar** — keyword search across problem title, OJ source, and
   tags. Lives in the top-left of the main pane, with a 28px-tall input and
   an inline `Filter` icon. Debounced ~150ms.
2. **Problem cards grid** — every card shows: problem ID (e.g. `P1001`),
   title, OJ badge (Luogu / Codeforces / AtCoder), difficulty chip
   (入门/普及/提高/NOI), and an "Add to training" quick action.
3. **Recent problems grid** — pinned row at the top showing the last 8
   problems the user opened. Empty state: *"Pick a problem to start"*.
4. **Quick actions** — per-card hover reveals: Open in editor, Add to
   training, Add to mistakes, Copy problem URL. Each is a 24px icon
   button using `--oler-text-secondary`, with `--oler-primary` on hover.

## Layout Sketch

```
+----------------------------------------------------------+
| ActivityBar(56) | Search [          ] [Filter] [Sort v]  |
|                 +--------------------------------------+
|  P  icon        |  Recent problems (8)                  |
|  T  icon        |  [card] [card] [card] [card]          |
|  M  icon        |  [card] [card] [card] [card]          |
|  A  icon        +--------------------------------------+
|  S  icon        |  All problems                         |
|                 |  [card] [card] [card] [card]          |
|                 |  [card] [card] [card] [card]          |
|                 |  [card] [card] [card] [card]          |
+-----------------+--------------------------------------+
```

## State Colors

| State           | Token                  | Use                          |
|-----------------|------------------------|------------------------------|
| Default         | `--oler-bg-surface`    | Card background              |
| Hover           | `--oler-bg-elevated`   | Card hover surface           |
| Selected        | `--oler-border-active` | 1px primary outline          |
| Difficulty chips| `--state-info/warning/error` | 入门(灰) / 普及(蓝) / 提高(橙) / NOI(红) |

## Phase 5+ 待实装 (Pending)

- Real OJ ingest (Luogu problem set scraping, Codeforces API, AtCoder
  problemset). Phase 6 will provide the credential layer.
- Training-plan link. The "Add to training" quick action will write to the
  Training tab in Phase 5+.
- Tag filtering. Right now the filter chip strip is visual only.
- Empty-state illustration. The current placeholder text needs a brand
  mark and 2-line hint.

## Cross-Tab Navigation

The page declares these `interactions` in the v0 design (each navigates to
the corresponding shell page via the ActivityBar):

| DOM id           | Target page              |
|------------------|--------------------------|
| `nav-training`   | `page-shell-training`    |
| `nav-mistakes`   | `page-shell-mistakes`    |
| `nav-ai`         | `page-shell-ai`          |
| `nav-settings`   | `page-shell-settings`    |
