# Glossary — OI Terms

> Source: v0 design briefs in `D:\oler\oler-ide-redesign\*.json` +
> general OI community usage. The Chinese-language entries match the
> UI surface vocabulary; English is the conventional form used in
> international contests.

This glossary is the **UI surface vocabulary** the Oler IDE uses.
When a verdict badge, a problem card chip, or a settings label needs a
term, the canonical reference is here. New terms must be added before
they appear in the UI.

## Verdicts (Judgement Colors)

| Code | Chinese    | English                    | Token (in `02-design-system/tokens.md`) | Color     |
|------|------------|----------------------------|------------------------------------------|-----------|
| AC   | 通过       | Accepted                   | `--oler-ac`                              | `#34c759` |
| WA   | 答案错误   | Wrong Answer               | `--oler-wa`                              | `#ff453a` |
| TLE  | 时间超限   | Time Limit Exceeded        | `--oler-tle`                             | `#ff9f0a` |
| RE   | 运行错误   | Runtime Error              | `--oler-re`                              | `#c45c4a` |
| CE   | 编译错误   | Compile Error              | `--oler-ce`                              | `#c49a3c` |
| PE   | 格式错误   | Presentation Error         | (uses `--oler-wa` until Phase 5+)        | `#ff453a` |
| MLE  | 内存超限   | Memory Limit Exceeded      | (uses `--oler-tle` until Phase 5+)       | `#ff9f0a` |
| OLE  | 输出超限   | Output Limit Exceeded      | (uses `--oler-tle` until Phase 5+)       | `#ff9f0a` |

PE, MLE, and OLE are aliases of WA / TLE in v1 — they share the same
token so the verdict palette stays focused. Phase 5+ may split them if
a real diagnostic value emerges.

## OI Tiers (Problem Difficulty)

| Chinese   | English     | Typical source                                          |
|-----------|-------------|---------------------------------------------------------|
| 入门      | Beginner    | Luogu "入门" / Codeforces Div.4 / AtCoder A              |
| 普及      | Popular     | Luogu "普及" / Codeforces Div.3 / AtCoder B-C           |
| 提高      | Advanced    | Luogu "提高" / Codeforces Div.2 / AtCoder C-D           |
| NOI       | National    | Luogu "NOI" / NOI series / Codeforces Div.1             |
| 省选      | Provincial  | Provincial team-selection contests (intermediate NOI)   |

The four-tier scale is what the **Problems tab difficulty chip**
(`03-shell-pages/problems.md`) and the **Training tab** filter use.

## Contests / Formats

| Code    | Full name                                       | Notes                              |
|---------|-------------------------------------------------|------------------------------------|
| NOI     | National Olympiad in Informatics (全国青少年信息学奥林匹克竞赛) | Top-tier domestic OI contest       |
| NOIP    | National Olympiad in Informatics in Provinces (全国青少年信息学奥林匹克联赛) | Provincial prelim                  |
| CSP     | Certified Software Professional (非专业级软件能力认证)        | Two rounds, S / J                  |
| IOI     | International Olympiad in Informatics            | 4-person national team             |
| APIO    | Asia-Pacific Informatics Olympiad                | Regional                           |
| WC      | Winter Camp (NOI 冬令营)                       | National training camp             |
| CTSC    | China Team Selection Contest (中国国家队选拔赛)     | National team selection            |
| ACM     | ACM-ICPC                                       | University-tier, team format       |
| CCPC    | China Collegiate Programming Contest             | University-tier, domestic          |
| OI      | Olympiad in Informatics (信息学奥林匹克)         | Domestic umbrella term             |

## Scoring Systems

| Term      | Chinese   | Meaning                                                       |
|-----------|-----------|---------------------------------------------------------------|
| ACM 赛制  | ACM rule  | Per-problem, no penalty for wrong submissions, no partial     |
| OI 赛制   | OI rule   | Per-problem, score is the best single submission (0..100)     |
| IOI 赛制  | IOI rule  | Per-problem, partial credit on subtask passes                 |
| 提交制    | Submit    | Code is judged after contest ends; you cannot see verdicts live |
| 滚榜      | Scoreboard reveal | Final scoreboard updated live as contest ends             |
| 罚时      | Penalty   | Time + 20min per wrong submission (ACM rule)                  |

## OJs (Online Judges) the Adapters Will Target

| OJ         | Domain                | Notes                                       |
|------------|-----------------------|---------------------------------------------|
| 洛谷 (Luogu)| luogu.com.cn          | Domestic; tier-1 Chinese OI platform        |
| Codeforces | codeforces.com        | International; 5 divisions                  |
| AtCoder    | atcoder.jp            | International; ABC / ARC / AGC              |
| LOJ        | libloj.ac / judge.yosupo | Chinese; hosts NOI series replays         |
| UOJ        | uoj.ac                | Chinese; hosts hackable contests             |
| 牛客      | nowcoder.com          | Chinese; hosts university contests           |
| vjudge     | vjudge.net            | Multi-OJ aggregator                         |

## OI Chinese Glossary (frequently surfaced in UI)

| Chinese                  | English / meaning                                          |
|--------------------------|------------------------------------------------------------|
| 题库 / 题单              | Problem set                                                |
| 提交                     | Submit                                                     |
| 评测                     | Judgement                                                  |
| 样例                     | Sample (input / output)                                    |
| 测试点                   | Test point (one row in test-results)                       |
| 错题本                   | Mistake journal                                            |
| 训练计划                 | Training plan                                              |
| 打卡 / 连续打卡           | Streak / day streak                                        |
| 每日一题                 | Daily problem (Luogu's recurring feature)                  |
| 比赛                     | Contest                                                    |
| 真题                     | Past contest problem                                       |
| 题解                     | Editorial (solution writeup)                               |
| 代码                     | Source / code                                              |
| 标程                     | Reference solution                                         |
| 数据范围                 | Constraints (problem statement)                            |
| 暴力                     | Brute force (informal)                                     |
| 优化                     | Optimization                                               |
| 思路                     | Approach / idea                                            |
| 通过率                   | Acceptance rate                                            |
| 难度                     | Difficulty                                                 |
| 标签                     | Tag (e.g. `dp`, `graph`, `math`)                           |
| 提示                     | Hint                                                       |
| 警告                     | Warning (compile warning)                                  |
| 报错                     | Error (compile error)                                      |
| 段错误                   | Segmentation fault (Unix-style RE)                         |
| 栈溢出                   | Stack overflow (RE subtype)                                |
| 死循环                   | Infinite loop (informal TLE cause)                         |
| 越界                     | Out-of-bounds                                              |
| 编译命令                 | Compile command (`g++ -O2 -std=c++17 main.cpp -o main`)    |
| 运行命令                 | Run command (binary path)                                  |
| 输入文件                 | Input file                                                 |
| 输出文件                 | Output file                                                |

## OI Slang (informal, used in chat / AI prompts)

| Term      | Meaning                                                        |
|-----------|----------------------------------------------------------------|
| 签到题    | Trivial "attendance" problem (warm-up)                         |
| 送分题    | "Free point" problem                                           |
| 水题      | Easy problem                                                   |
| 毒瘤题    | Pathological / evil problem (test data designed to break naive solutions) |
| 卡常      | Constant-factor optimization (informal)                        |
| 打表      | Pre-compute answers (informal; often a code smell)             |
| 对拍      | Pairwise diff testing between two solutions (validator)        |
| 跑最大点  | Run on the maximum test case (to confirm TLE / MLE)            |
| 一发 AC   | First-submission Accepted                                     |
| 一遍过    | One-pass Accepted (passed without debugging)                   |
| 调半天    | Spent half a day debugging                                     |
| 翻车      | Failed in contest                                              |
| AK        | All-Killed (solved all problems in a contest)                  |
| rk        | Rank                                                          |
| 冲省选    | "Going for provincial team selection"                          |

## Reading Order for New Contributors

1. `01-product/positioning.md` — who the product is for.
2. `02-design-system/tokens.md` — what every page uses.
3. `08-roadmap/phases.md` — what the next agent is working on.
4. `07-risks/v1-lessons.md` — what not to do.
5. The shell page you're modifying (`03-shell-pages/`, `04-editor/`,
   `05-test-results/`, or `06-welcome/`).
