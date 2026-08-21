# Shell — AI Coach (dots.ai)

> Source: `D:\oler\oler-ide-redesign\orchestration-summary.json` →
> `pages[?nodeId=page-shell-ai]` (visualNorthStar, continuityAnchors) +
> `oler-ide-redesign.design` → `data[?id=page-shell-ai]`
> (interactions: nav-problems / nav-training / nav-mistakes / nav-settings).

The AI tab is the in-shell assistant, branded as **dots.ai**. It is a chat
interface, not a copilot side-panel — the model gets the full conversation
context, including the current problem and the user's last submission, so
the user can ask "why is this WA" and get a useful answer.

## Visual North Star

> *"Chat interface with message bubbles, code block rendering, suggested
> prompts chips, model selector, clean conversation flow."*
> — orchestration-summary.json

The shell frame is unchanged, but the content area is replaced with a
chat surface: message list + composer at the bottom, model selector and
context indicator in the top-right.

## Continuity Anchors

| Anchor                | Dimension  | Purpose                |
|-----------------------|------------|------------------------|
| `shared-shell-layout` | structural | Sidebar / chat layout  |
| `oler-nav-56px`       | 56px       | ActivityBar            |
| `oler-tabbar-36px`    | 36px       | TabBar                 |

Plus from the design library, `oler-typography-system` and
`oler-color-palette` (the same anchors used by the welcome page and
test-results panel).

## Key Features

1. **Message bubbles** — user on the right (subtle `--oler-bg-elevated`
   surface, no border), assistant on the left (transparent + 1px
   `--oler-border`). Both wrap text using `--oler-body` (13px /
   line-height 1.5).
2. **Code block rendering** — assistant code blocks use `--oler-mono`,
   12px, with a 1px `--oler-border` and `--oler-bg-surface`. Syntax
   highlight reuses the tokens from `02-design-system/tokens.md`
   (`.syn-keyword`, `.syn-function`, etc.). A small "Copy" button in
   the top-right of each block.
3. **Suggested prompts chips** — under the empty state and on demand,
   a row of 3-5 prompt chips. Examples: "Explain my WA",
   "Optimize for TLE", "Find a similar problem", "Generate test cases".
4. **Model selector** — top-right dropdown. Lists the available
   `dots.ai` models the user has installed (Phase 7+ will manage
   the install / download). Current selection shown as a chip with
   `--oler-primary-subtle` background.

## Layout Sketch

```
+----------------------------------------------------------+
| ActivityBar(56) | dots.ai                       [gpt-x v]|
|                 +--------------------------------------+
|  P  icon        |  [assistant] hi, what are we working on?|
|  T  icon        |  [user]      solve P1001 but WA on case 3|
|  M  icon        |  [assistant] 你的代码在 case 3 输入...   |
|  A  icon        |   ```cpp                                    |
|  S  icon        |   for (int i = 0; i < n; ++i) { ... }         |
|                 |   ```                                        |
|                 |  [chip: Explain WA] [chip: Optimize TLE]     |
|                 +--------------------------------------+
|                 |  [ type a message... ]              [Send]   |
+-----------------+--------------------------------------+
```

## State Colors

| State                | Token                       | Use                            |
|----------------------|-----------------------------|--------------------------------|
| User bubble          | `--oler-bg-elevated`        | Right-side bubble surface      |
| Assistant bubble     | transparent + `--oler-border` | Left-side bubble border     |
| Code block surface   | `--oler-bg-surface`         | Inline code container          |
| Active prompt chip   | `--oler-primary-subtle`     | Suggested-prompt background    |
| Model selector chip  | `--oler-primary-subtle`     | Selected model indicator       |
| Send button          | `--oler-primary`            | Primary action                 |
| Send button disabled | `--oler-text-muted`         | Composer empty                 |

## Phase 5+ 待实装 (Pending)

- Real model integration. v1 ships the chat surface with a mocked
  echo assistant. Phase 7+ will plug in the dots.ai model and the
  user-managed model directory.
- Conversation persistence. v1 is in-memory; Phase 7+ writes
  `~/.oleride/conversations/{uuid}.json` and exposes a history
  sidebar.
- Problem context injection. The "Explain my WA" chip is currently
  a static prompt; Phase 7+ will inject the failing test case +
  diff + last code into the prompt.
- Suggested prompts learning. v1 has a fixed prompt list; Phase 7+
  will surface prompts based on the user's most recent verdict
  type and topic.

## Cross-Tab Navigation

| DOM id           | Target page              |
|------------------|--------------------------|
| `nav-problems`   | `page-shell-problems`    |
| `nav-training`   | `page-shell-training`    |
| `nav-mistakes`   | `page-shell-mistakes`    |
| `nav-settings`   | `page-shell-settings`    |
