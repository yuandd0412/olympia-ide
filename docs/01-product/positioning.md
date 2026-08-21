# Product Positioning

> Source: `D:\oler\oler-ide-redesign\orchestration-summary.json` (project.designRead,
> project.styleDefinitionBrief, designSource.styleConstraints) +
> `D:\oler\oler-ide-redesign\colors_and_type.css` (brand tokens, judgement colors).

Oler IDE is a **desktop competitive-programming IDE** built for OI (Olympiad in
Informatics) students in China. It targets a tier that consumer-grade editors
under-serve: beginners and intermediate trainees who are studying seriously and
need a tool that gets out of the way, plus advanced students who want a single
window that already knows what an OI session looks like.

## Target Users

- **All OI levels** — 入门 (beginner) / 普及 (popular tier) / 提高 (advanced
  tier) / NOI (national) candidates. The same shell adapts as the user grows.
- **Style-aware power users** who care about information density, dark-first
  theming, and keyboard-driven workflows. Audience is comfortable with VSCode
  or JetBrains density; rejects anything that feels like a "toy editor".
- **Single-machine students** with no time to wire up toolchains. They want to
  install Oler IDE and have `g++ 17`, MinGW, OJ credential management, and
  AI assistant already working.

## Core Differentiators

1. **Built-in, not "download prompts"** — g++ 17, MinGW 13.1.0, OJ credential
   storage, and AI model descriptions ship in the installer. The user never
   has to follow an external setup guide. This is the central product
   philosophy (see AGENTS.md / User Memory: 内置/打包 > 引导下载).
2. **Information density first** — inspired by Luogu (洛谷) problem lists and
   VSCode's tab bar. No hero whitespace, no marketing-grade gradients on
   working surfaces. layoutVariance=2, visualDensity=4 in the v0 design
   dials.
3. **Dark-first with two accent systems** — One Dark Pro (blue/violet, Atom
   classic) and Amber/Terracotta (#d97757) coexist across the 4 shipped
   themes. Users pick a combination, not a single look.
4. **OI-native surface vocabulary** — verdict colors (AC / WA / TLE / RE / CE)
   are first-class design tokens, not afterthought badges. The test-results
   panel and mistake book use them as the primary signal.

## Visual Style

| Axis              | Decision                                                                  |
|-------------------|---------------------------------------------------------------------------|
| Mode              | Dark-first (4 themes: OneDarkPro, OneLight, AmberDark, AmberLight)         |
| Accent            | Amber/terracotta `#d97757` (warm) + One Dark Pro blue/violet (cool)       |
| Surface           | Border-first; floating shadows only on overlays / popovers                |
| Radius ceiling    | 12px (radiusMax in styleConstraints)                                      |
| Static shadow     | alpha <= 0.05 (no depth illusions on idle surfaces)                       |
| Base font size    | 13px compact, with 11/12/14/16/20/28/36px scale                           |
| Type system       | SF Pro Display (UI) + JetBrains Mono (code), tabular-nums for stats       |
| Motion intensity  | 1 (low; quick 0.1-0.3s transitions, no theatrical animation)              |

## Capability Pillars

- **Shell 5-tab UI** — Problems / Training / Mistakes / AI / Settings, all
  reachable from a 56px ActivityBar and a 36px TabBar.
- **Code editor** — Monaco-grade editing experience (KSyntax 6 highlighting,
  C++ first, 374 XML definitions pending index regeneration).
- **Compiler pipeline** — local g++ 17 invocation with sample I/O and OJ-grade
  verdict evaluation.
- **OJ adapters** — credential vault + submit abstraction for major OJs
  (Luogu, Codeforces, AtCoder are the first targets; 普及/提高/NOI as OI tiers).
- **AI coach** — `dots.ai` assistant with prompt chips, code-block rendering,
  and a model selector; Phase 7+.

## Non-Goals (v2)

- General web/mobile development. No HTML/CSS/JSON tooling, no language server
  protocol layer beyond what OI needs.
- Plugin marketplace in v1. The architecture must allow it later, but no
  surface is built in v1.
- Cloud sync / multi-device in v1. Local-only credential store.
- Non-MingW toolchains. v2 is MinGW 13.1.0 + Qt 6.8.0 strictly.

## Roadmap (full detail in `08-roadmap/phases.md`)

- **Phase 0** — Safety rails + repo init. ✅
- **Phase 1** — Skeleton: empty main window + ABI chain verified. ✅
- **Phase 2** — 4-theme system (QSS). ✅
- **Phase 3** — Vendor ECM + KSyntax highlighting. ✅
- **Phase 4** — Core classes (OlerApi + 7 building blocks). 🚧
- **Phase 5** — Shell 5-tab UI (this is where the v0 page designs land).
- **Phase 6** — Compiler pipeline + OJ adapters.
- **Phase 7+** — AI coach (`dots.ai`).

The v0 design files in `D:\oler\oler-ide-redesign\` are the visual north star
for Phase 5+. The page nodes (`page-shell-problems`, `page-shell-training`,
`page-shell-mistakes`, `page-shell-ai`, `page-shell-settings`, plus
`page-welcome`, `page-test-results`, and the four editor subpages) are
documented one per file in this docs tree.
