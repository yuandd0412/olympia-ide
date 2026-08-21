# Design Tokens

> Source: `D:\oler\oler-ide-redesign\colors_and_type.css` (the canonical v0
> design tokens; brand prefix `oler`). The 4 shipped themes
> (`resources/themes/*.qss`) instantiate subsets of these tokens for
> OneDarkPro / OneLight / AmberDark / AmberLight.

This document is the v2 design system's single source of truth for color,
type, spacing, radius, shadow, motion, and z-index. Every page in
`03-shell-pages/`, the editor (`04-editor/`), the test-results panel
(`05-test-results/`), and the welcome screen (`06-welcome/`) draws from these
tokens. No page invents its own color, type size, or radius.

## Color — Core

| Token                        | Value                       | Role                              |
|------------------------------|-----------------------------|-----------------------------------|
| `--oler-primary`             | `#d97757`                   | Brand accent (warm terracotta)    |
| `--oler-primary-hover`       | `#e08a6c`                   | Primary hover state               |
| `--oler-primary-muted`       | `rgba(217, 119, 87, 0.15)`  | Filled badge / chip background    |
| `--oler-primary-subtle`      | `rgba(217, 119, 87, 0.08)`  | Hover wash on dark surface        |

## Color — Neutrals (backgrounds + text)

| Token                        | Value                       | Role                              |
|------------------------------|-----------------------------|-----------------------------------|
| `--oler-bg-base`             | `#131311`                   | App background (darkest)          |
| `--oler-bg-surface`          | `#1a1915`                   | Card / panel surface              |
| `--oler-bg-elevated`         | `#252524`                   | Elevated card / row hover         |
| `--oler-bg-overlay`          | `#2c2c2b`                   | Popover / menu surface            |
| `--oler-bg-floating`         | `#353533`                   | Floating panel / dialog           |
| `--oler-bg-nav`              | `rgba(0, 0, 0, 0.35)`       | Top navigation backdrop           |
| `--oler-text-primary`        | `#f1f1ef`                   | Body text (high contrast)         |
| `--oler-text-secondary`      | `#a0a0a3`                   | Body text (default)               |
| `--oler-text-tertiary`       | `#6e6d68`                   | Caption / hint                    |
| `--oler-text-muted`          | `#46443b`                   | Disabled / placeholder            |

## Color — Borders

| Token                        | Value                                  | Role                       |
|------------------------------|----------------------------------------|----------------------------|
| `--oler-border`              | `rgba(255, 255, 255, 0.06)`            | Default 1px divider        |
| `--oler-border-hover`        | `rgba(255, 255, 255, 0.12)`            | Hovered surface            |
| `--oler-border-active`       | `rgba(217, 119, 87, 0.4)`              | Focused / active element   |

## Color — State (success / warning / error / info)

| Token                        | Value                       | Role                              |
|------------------------------|-----------------------------|-----------------------------------|
| `--state-success`            | `#34c759`                   | Success accent (also AC verdict)  |
| `--state-success-bg`         | `rgba(52, 199, 89, 0.15)`   | Success badge background          |
| `--state-warning`            | `#ff9f0a`                   | Warning accent (also TLE verdict) |
| `--state-warning-bg`         | `rgba(255, 159, 10, 0.15)`  | Warning badge background          |
| `--state-error`              | `#ff453a`                   | Error accent (also WA verdict)    |
| `--state-error-bg`           | `rgba(255, 69, 58, 0.15)`   | Error badge background            |
| `--state-info`               | `#7daed4`                   | Info accent (syn-function)        |
| `--state-info-bg`            | `rgba(125, 174, 212, 0.15)` | Info badge background             |

## Color — Judgement (OI verdict)

| Token                        | Value     | Verdict                                       |
|------------------------------|-----------|-----------------------------------------------|
| `--oler-ac`                  | `#34c759` | Accepted (full pass)                          |
| `--oler-wa`                  | `#ff453a` | Wrong Answer                                  |
| `--oler-tle`                 | `#ff9f0a` | Time Limit Exceeded                           |
| `--oler-re`                  | `#c45c4a` | Runtime Error (subtler red than WA)           |
| `--oler-ce`                  | `#c49a3c` | Compile Error (amber, not red)                |

These map 1:1 to test-results panel verdict badges and the Mistakes tab tags.

## Radius

| Token           | Value     | Use                                    |
|-----------------|-----------|----------------------------------------|
| `--radius-xs`   | `2px`     | Tags, inline pills                     |
| `--radius-sm`   | `6px`     | Buttons, inputs                        |
| `--radius-md`   | `8px`     | Cards, list rows                       |
| `--radius-lg`   | `12px`    | Modals, large surfaces (max)           |
| `--radius-full` | `9999px`  | Avatars, round toggles                 |

Radius ceiling is **12px** (`radiusMax: 12` in orchestration-summary). Anything
rounder than that breaks the "professional competitive" feel.

## Shadow

| Token                | Value                                                                  | Use                       |
|----------------------|------------------------------------------------------------------------|---------------------------|
| `--shadow-floating`  | `0 8px 24px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.2)`           | Popovers, dialogs         |
| `--shadow-static`    | `0 1px 2px rgba(0, 0, 0, 0.05)`                                        | Reserved (alpha <= 0.05)  |

Static shadow alpha is capped at 0.05 (`staticShadowAlphaMax: 0.05` in
orchestration-summary). Idle surfaces are bordered, not shadowed. Floating
elements earn a real shadow.

## Typography

| Token                  | Value                                                                              | Role                  |
|------------------------|------------------------------------------------------------------------------------|-----------------------|
| `--font-display`       | `SF Pro Display, -apple-system, system-ui, Segoe UI, sans-serif`                   | UI typography         |
| `--font-mono`          | `JetBrains Mono, SF Mono, Fira Code, Consolas, monospace`                          | Code, stats, tables   |
| `--font-size-xs`       | `11px`                                                                             | Caption               |
| `--font-size-sm`       | `12px`                                                                             | Mono / dense          |
| `--font-size-base`     | `13px`                                                                             | Body (compact)        |
| `--font-size-md`       | `14px`                                                                             | Heading               |
| `--font-size-lg`       | `16px`                                                                             | Title                 |
| `--font-size-xl`       | `20px`                                                                             | Section header        |
| `--font-size-2xl`      | `28px`                                                                             | Display               |
| `--font-size-3xl`      | `36px`                                                                             | Hero                  |
| `--line-height-tight`  | `1.25`                                                                             | Titles, display       |
| `--line-height-normal` | `1.5`                                                                              | Body, lists           |
| `--line-height-relaxed`| `1.65`                                                                             | Long-form prose       |

`.oler-mono` sets `font-variant-numeric: tabular-nums` so timing/memory stats
in the test-results panel line up vertically.

## Spacing (4-pt grid)

| Token      | Value   | Use                                |
|------------|---------|------------------------------------|
| `--space-1`| `4px`   | Hairline gap                       |
| `--space-2`| `8px`   | Inline element gap                 |
| `--space-3`| `12px`  | Row gap                            |
| `--space-4`| `16px`  | Section padding                    |
| `--space-5`| `20px`  | Card inner padding                 |
| `--space-6`| `24px`  | Card outer padding                 |
| `--space-8`| `32px`  | Section gap                        |
| `--space-10`| `40px` | Page-level margin                  |
| `--space-12`| `48px` | Hero spacing                       |

## Motion

| Token                | Value         | Use                          |
|----------------------|---------------|------------------------------|
| `--transition-fast`  | `0.1s ease`   | Hover, focus                 |
| `--transition-normal`| `0.2s ease`   | State change                 |
| `--transition-slow`  | `0.3s ease`   | Panel open/close             |

motionIntensity=1 in the v0 design dials — no bounce, no parallax, no spring
physics. Transitions exist to make state changes legible, not to entertain.

## Z-Index Layers

| Token         | Value | Use                            |
|---------------|-------|--------------------------------|
| `--z-content` | `1`   | Page content (default)         |
| `--z-nav`     | `10`  | ActivityBar (56px rail)        |
| `--z-tabbar`  | `20`  | TabBar (36px)                  |
| `--z-overlay` | `100` | Dropdowns, popovers            |
| `--z-modal`   | `200` | Modal dialogs                  |
| `--z-toast`   | `300` | Toasts (always on top)         |

The 56px ActivityBar (`oler-nav-56px`) and 36px TabBar (`oler-tabbar-36px`)
are continuity anchors reused across every shell page (see
`03-shell-pages/*.md`).

## Syntax Highlight (matches oler-dark theme)

| Class            | Color      | Role                                |
|------------------|------------|-------------------------------------|
| `.syn-keyword`   | `#cc7a5a`  | `if`, `for`, `class`, `using`       |
| `.syn-function`  | `#7daed4`  | Function names                      |
| `.syn-type`      | `#c4a65a`  | Type names                          |
| `.syn-string`    | `#b89a6a`  | String literals                     |
| `.syn-comment`   | `#6e6d68`  | Comments (italic)                   |
| `.syn-number`    | `#8aab6e`  | Numeric literals                    |
| `.syn-operator`  | `#f1f1ef`  | Operators                           |
| `.syn-preprocessor` | `#cc7a5a` | `#include`, `#define`              |
| `.syn-variable`  | `#c3c0b6`  | Identifiers                         |

## Notes for Implementers

- v2 themes live in `resources/themes/*.qss` and are loaded by
  `src/core/theme/CThemeManager.cpp`. The QSS files currently cover a subset
  (ActivityBar, TabBar, status bar). Phase 5+ pages must extend QSS or
  fall back to in-widget stylesheet that uses the same token values.
- Any new color added to the system must land here first; no ad-hoc hex in
  page code.
- Light theme (OneLight / AmberLight) inverts the neutral scale; the verdict
  palette stays identical (red is red, green is green — readability beats
  brand symmetry in OI).
