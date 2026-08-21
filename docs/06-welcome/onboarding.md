# Welcome — Onboarding

> Source: `D:\oler\oler-ide-redesign\orchestration-summary.json` →
> `pages[?nodeId=page-welcome]` (visualNorthStar, continuityAnchors) +
> `oler-ide-redesign.design` → `data[?id=page-welcome]`
> (interactions: `btn-open-shell` → `page-shell-problems` with
> transitionLabel "打开 Oler 主 UI").

The welcome page is the **first-run experience**. It only appears when
no recent project exists; once the user opens the shell, the welcome
page is replaced by `page-shell-problems` (the default landing tab).

## Visual North Star

> *"Centered onboarding hero with brand logo, 4-step quick start guide,
> demo problem cards grid, OJ receiver status badge, clean first-run
> experience."*
> — orchestration-summary.json

The welcome page is the most "marketing" surface in the app, but it
stays within the design system: no animation, no carousel, no auto-play.
The brand mark and a 4-step quick start are the only above-the-fold
elements.

## Continuity Anchors

| Anchor                  | Purpose                          |
|-------------------------|----------------------------------|
| `oler-typography-system`| Reuses the SF Pro / JetBrains Mono pair |
| `oler-color-palette`    | Reuses the neutral + accent palette      |

The same anchors used by the test-results panel — the welcome page
is the only "outside the editor" surface that does not use the shell
frame, so it does not declare `oler-nav-56px` / `oler-tabbar-36px`.

## Key Features

1. **Brand logo** — top-center, 80px square, full opacity. The asset
   is `assets/brand-logo.jpg` (image-001 in the v0 design). Below
   it: a 36px-display "Oler IDE" wordmark and a 13px-caption
   tagline ("Competitive Programming, Built In").
2. **4-step quick start** — directly below the brand mark. Each step
   is a 120px-wide card with a 24px step number (`01`, `02`, ...),
   a one-line title, and a 2-line description. Cards laid out in a
   4-wide row, gutter `--space-6`.

   | Step | Title          | Description                                          |
   |------|----------------|------------------------------------------------------|
   | 01   | Pick a problem | Browse the Problems tab and pick your first OI task. |
   | 02   | Read & think   | Use the built-in editor. No toolchain setup needed.  |
   | 03   | Run & test     | `Ctrl+R` evaluates your code against sample tests.   |
   | 04   | Submit & learn | Submit to OJ; mistakes are auto-journaled.           |
3. **Demo problem cards grid** — below the quick start, a 3x2 grid
   of demo problems. Each card: title, difficulty chip, OJ source
   badge, and a 1-line teaser. Clicking opens the problem in
   `page-editor-main`. The 6 demos are pre-bundled; no network
   fetch.
4. **OJ receiver status badge** — top-right corner. Shows the
   receiver count ("2 connected, 1 pending") with a colored dot.
   The dot uses `--state-success / warning / error` based on
   credential state. Clicking opens the Settings tab.
5. **Open shell CTA** — bottom-center, 240px-wide primary button
   using `--oler-primary`. Label: "打开 Oler 主 UI" (the
   transitionLabel in the v0 design). Clicking navigates to
   `page-shell-problems`.

## Layout Sketch

```
+----------------------------------------------------------+
|                                  [OJ: 2 ok, 1 pending]   |
|                                                          |
|                       [brand logo 80px]                  |
|                       Oler IDE                           |
|                       Competitive Programming, Built In  |
|                                                          |
|   [01 Pick]   [02 Read]   [03 Run]   [04 Submit]         |
|                                                          |
|   [demo]  [demo]  [demo]                                 |
|   [demo]  [demo]  [demo]                                 |
|                                                          |
|                  [  Open Oler shell  ]                   |
+----------------------------------------------------------+
```

## State Colors

| State              | Token                  | Use                          |
|--------------------|------------------------|------------------------------|
| Brand logo glow    | `--oler-primary-subtle`| Optional 8px radial halo     |
| Step number        | `--oler-primary`       | Big "01..04" digits          |
| Step card hover    | `--oler-bg-elevated`   | Card hover surface           |
| Open shell CTA     | `--oler-primary`       | Primary button               |
| Receiver ok        | `--state-success`      | Green dot                    |
| Receiver pending   | `--state-warning`      | Amber dot                    |
| Receiver error     | `--state-error`        | Red dot                      |

## Phase 5+ 待实装 (Pending)

- Real demo problem ingestion. v1 ships 6 hard-coded demos;
  Phase 5+ will load a `bundled-demos.json` so the marketing
  team can add / remove without rebuilding.
- Personalized first-run. v1 shows the same welcome every
  time; Phase 5+ will detect the user's first OJ receiver
  and replace step 04 with the matching sign-in flow.
- Welcome return path. v1 only shows welcome on first run;
  Phase 5+ will let the user re-open it from the Settings
  tab ("Show welcome again").

## Cross-Reference

- The "Open Oler shell" CTA is the **only** welcome interaction
  in the v0 design (`btn-open-shell` → `page-shell-problems`).
- The OJ receiver status references the same receiver list
  documented in `03-shell-pages/settings.md` and the credential
  layer planned in Phase 6.
- The 4-step quick start is a narrative bridge to the Problems
  tab (`03-shell-pages/problems.md`).
