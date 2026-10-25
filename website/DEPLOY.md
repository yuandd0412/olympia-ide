# 官网与安装包发布指南

域名：`olympia.dpdns.org`（Cloudflare Pages，项目 `olympia-ide`）。
本目录 `website/` 是零构建静态站。

## 限制与结论

| 托管 | 单文件上限 | 能否放下完整安装器 |
|---|---|---|
| Cloudflare Pages | 25 MiB | 否 |
| Gitee Release 附件 | 100 MB（十进制） | 否 |
| GitHub Releases | 不适用 | 没往那边发过：引导器只重试 Gitee，官网按钮也是 Gitee |

安装器实测 276,970,953 B（264.1 MiB，2026-10-25 01:23 编译）。里面打的是整个 Electron 产品：主程序
`Olympia.exe` 239 MB、内置 MinGW `toolchain/` 496 MB（机房没有编译器，这块必须留）。
**所以"单文件 <100 MB"在这个产品上不可能靠压缩做到**，方案只能是分卷或换宿主。

分卷由 Inno 自己做，不再需要 `copy /b` 之类的合并脚本 —— `oss/build/win32/code.iss`
里已开：

```ini
DiskSpanning=yes
DiskSliceSize=94371840   ; 90 MiB，给十进制 100 MB 留余量
```

下表由 `node build/make-release.mjs` 从真产物反推（`scripts/oneoff/installer-manifest.mjs` 可单独读一次），
别手抄——手抄的那次对得上，下一次打包就悄悄错了，而发版的人正是照它逐片核对「有没有下全」的。
最近一次：2026-10-25 01:23 出分卷（`vscode-win32-x64-user-setup`），2026-10-25 03:06 收发布目录，发行标签 v1.0.0。
产品版本 1.140.0。安装器本体（`OlympiaSetup.exe` + 各分卷）总计 276,970,953 B，共 4 个文件，
最大一片 94,371,840 B（十进制口径也在 100 MB 以内），分卷编号 1–3 连续成套：

| 文件 | 字节 |
|---|---|
| `OlympiaSetup.exe` | 2,619,996（启动器，双击它） |
| `OlympiaSetup-1.bin` | 91,751,424 |
| `OlympiaSetup-2.bin` | 94,371,840 |
| `OlympiaSetup-3.bin` | 88,227,693 |

`OlympiaSetup-web.exe`（1,807,485 B，官网按钮指向的引导器）不在这条 gulp 链路里，是
`make-release.mjs` 单独编出来再收进发布目录的——它把发行标签**编译进了二进制**（本次 ReleaseTag=v1.0.0），
所以换标签必须重跑那个脚本，否则它会去旧标签找文件。要说清楚的是：引导器本身按标签取
`SHA256SUMS.txt` 再逐片下载校验，它不写死某个安装包；**在外面发旧版的是 Gitee 发行版里那批附件**，
不传新文件它就还是退役的 Tauri 内容。要上传的是发布目录 `dist\olympia-release-v1.0.0` 里的**全部**文件
（`OlympiaSetup.exe` + 各 `OlympiaSetup-<n>.bin` 分卷 + `OlympiaSetup-web.exe` + `SHA256SUMS.txt` + `说明.txt`），文件名一个都不能改。

用户把**全部文件放进同一个目录**，只双击 `OlympiaSetup.exe` 即可；缺片时向导会提示
"安装程序需要下一张磁盘"（该文案在 `oss/build/win32/i18n/Default.zh-cn.isl` 的
`ChangeDiskTitle`）。

## 1. 出包

```powershell
# ① 先完全退出所有 Olympia 窗口（进程还在会让打包中途失败并留下半空的产物目录）

# ② 四阶段打包（bundle → toolchain → extensions → node-compile-cache），约 9–12 分钟
#    第 0 阶段先对 oss/build/ 跑一次类型检查（1 秒），省掉"跑到第 3 阶段才炸"那一轮
powershell -NoProfile -ExecutionPolicy Bypass -File build\oss-package.ps1

# ③ 编译安装器（约 18 分钟）。注意 ② 不产出安装器，这一步才有
cd oss; npm run gulp -- vscode-win32-x64-user-setup
```

产物在 `oss\.build\win32-x64\user-setup\`。

## 2. 一条命令收出发布目录

```powershell
node build\make-release.mjs --tag v1.0.0
```

它做六件事，全都不需要你抄数字：

1. 收 `OlympiaSetup.exe` + 各 `.bin`，**逐片校验**每片 < 100,000,000 B（Gitee 十进制上限）、
   编号连续（缺片会让用户卡在"下一张磁盘"）、没有上一次编译留下的旧片（按落盘时间卡）；
2. 把上一次的 `dist\olympia-release-<tag>` **整份挪成** `.bak-<时间戳>`，不覆盖也不删——
   那是已经发出去的那组字节，已经装上的学生还要靠它对照；
3. 生成 `SHA256SUMS.txt`（coreutils 格式 `<hex>  *<名>`，CRLF）；
4. 用**同一个 tag** 编译引导器 `oss\build\win32\code-web.iss`（标签是编译进二进制的，
   换 tag 必须重编，否则它去旧标签找文件）；
5. 按实测数字重写目录里的 `说明.txt`；
6. 把 `website\index.html` 的分卷体积、总字节、引导器大小改成本次产物的真值。

传之前自己核对一遍线上是否真的存在（**先传后部署**，顺序反了官网按钮就是 404）：

```powershell
node scripts\oneoff\check-website.mjs --online   # HEAD 每条下载直链
```

## 3. 上传 Gitee Release

仓库：<https://gitee.com/yuanddMSK/olympia-ide>（需已完成实名认证）。

**当前状态（2026-10-15 实测）**：这个仓库只有一个发行版，标签是 `v0.1.0`，而且是 prerelease，
正文还在描述已经退役的 Tauri 版；fork 的分卷、引导器、`SHA256SUMS.txt` 全挂在那一个标签下，
而 `.../releases/download/v1.0.0/OlympiaSetup-web.exe` 目前 **404**。所以发新版就是：

1. 仓库 → **发行版** → 新建标签 `v1.0.0`（必须与 `make-release --tag` 一致）；
2. 把 `dist\olympia-release-v1.0.0\` 里的**全部**文件作为附件上传 —— 一个都不能漏，
   文件名**不能改**（Inno 按原始名找下一片，引导器按清单里的名字下载）；
3. 旧的 `v0.1.0` 不要删附件（已经装了 0.1.0 的学生还要对照），但请在那条发行版说明里写明
   "旧版 Tauri，勿下载；新版见 v1.0.0"。

**GitHub 那边不做兜底**（2026-10-21 核实）：`yuandd0412/olympia-ide` 只有源码，没有 v1.0.0 的
发行版，`.../releases/download/v1.0.0/SHA256SUMS.txt` 取不到东西，引导器换过去也只会再失败一次。
所以 `code-web.iss` 里的 `GITHUB_BASE` 已经删掉，引导器只对 Gitee 重试；哪天真的在 GitHub 建了
同标签、同附件的 release，再把那一站加回去。附件目前只有一份，传 Gitee 时别漏片。

### 3.1 实际怎么传（2026-10-24 在 v1.0.0 上实测，这几步一个都不能少）

用浏览器驱动 Gitee 的发行版编辑页 `https://gitee.com/<owner>/<repo>/releases/<tag>/edit`，
下面四件事按顺序做，缺一步都会出现"看起来传了、其实没挂上"：

1. **真正的 file input 不在表单里**：它挂在 `<body>` 上，类名 `dz-hidden-input`。
   往 `#git-release-form` 里面找 input 是找不到的。
2. **Dropzone 的 `autoProcessQueue: false`**：`setInputFiles` 只是把文件塞进队列，
   必须手动调一次 `dz.processQueue()` 才会真的发 XHR，否则永远停在排队态。
3. **上传 ≠ 挂到发行版**：上传成功只生成了附件实体，还要点 `#btn-submit-release`
   （它 `type` 不是 `submit`，是 JS 触发）保存发行版，附件才出现在列表里。
   判据：保存前页面上的下载链接数 = 0（正常现象），保存后 = 附件数。
4. **上传成功后 Gitee 会往 `#git-release-form` 里累积 `input[name="attach_id_array[]"]`**，
   7 个附件就是 7 个 hidden input。

**最容易踩的坑：同名附件是「覆盖」不是「新增」。**
先传新的、再按旧 id 删旧的 —— 删旧 id 时会把刚传的新文件一起删光，发行版附件直接清零
（2026-10-24 在 v1.0.0 上真发生过一次：16:32 删完附件归零，16:36 全量重传才恢复）。
所以策略只能是「**先删旧的，再传新的**」，或者「根本没有同名冲突就根本不删」。

删除走后台接口：

```
DELETE /<owner>/<repo>/attach_files/destroy_json_format?id=<attachId>
Headers: X-CSRF-Token: <页面里的 csrf>  +  X-Requested-With: XMLHttpRequest
成功返回: {"error":0,"msg":"删除附件成功"}
```

**限制与校验方式**：单附件 ≤ 100,000,000 B（十进制，不是 MiB）；仓库总附件 ≤ 1 G；
**Gitee 会忽略 `Range` 头**，所以校验下载直链必须用 `HEAD`，
用 `GET` + `Range: bytes=0-1` 会把整个文件下下来（几百 MB）。

上传端点是 `POST /<owner>/<repo>/attach_files/upload_attach?attach_type=release`，
响应体里有 `attach_id` 和 `url`（`https://foruda.gitee.com/attach_file/...`）。

### 3.2 Gitee 镜像同步（不会自动跑，必须手动触发）

`yuanddMSK/olympia-ide-mirror` 是从 GitHub 导入的镜像仓，**它不会自动同步**：
2026-10-25 实测，GitHub 上推了 2 个提交后，镜像的 `pushed_at` 仍停在旧提交那一刻。
公开 API 里也**没有**同步端点（`/mirror/sync`、`/mirror`、`/sync` 全部 404），
`git push` 到镜像仓不是它该有的用法。

唯一办法是**在已登录 Gitee 的浏览器里点**：
仓主页「**从 GitHub 同步**」→ 弹窗「**确定**」。
弹窗正文写的是「确定同步？……Gitee 的仓库将被覆盖，且无法恢复！！！」
—— **这一步会覆盖镜像仓、不可恢复**，点之前先确认 GitHub 那边已经推完。

仓库里带了一个自动化脚本，用本机已登录 Gitee 的 Chromium 系浏览器（eGO）
的持久登录态 + CDP 直连走完这一步：

```bash
# ① 先只读预演：检查登录态、同步按钮、弹窗内容是否对得上，不点「确定」
node scripts/oneoff/gitee-mirror-sync.mjs --ego "<eGO 可执行文件路径>" --target <sha>

# ② 确认无误再真执行（--confirm 不可省：同步是覆盖式操作）
node scripts/oneoff/gitee-mirror-sync.mjs --ego "<eGO 可执行文件路径>" --target <sha> --confirm --repo-dir . --verify-file website/DEPLOY.md
```

要点：

- **不传 `--confirm` 就只预演**：脚本在弹窗安全阀通过后停下，并清掉自己拉起的浏览器进程；
- 脚本**不碰任何凭据**，登录态来自浏览器自己的 profile；没登录 Gitee 时脚本直接报错退出；
- 两道弹窗安全阀：弹窗正文必须写明源仓库名与「强制同步」，确认按钮文案必须在白名单内，
  且按钮要等 Gitee 的远端校验结束（`disabled` 消失）才可点；
- 同步后要**核对 head 与文件字节**，不能只看脚本自己说成功（`--verify-file` 逐个比 sha256）；
- 脚本只清理**自己拉起**的浏览器进程，不会误杀你自己开着的窗口。

**推完 GitHub 记得做这一步**，否则镜像仓会一直少几个提交。

## 4. 官网

**官网不会跟着仓库自动更新** —— 改了 `website\index.html` 不部署 = 没改。
2026-10-24 16:29 `make-release.mjs` 把首页分卷表改成了本轮真值（3 片），
但线上还停在更早那版（4 片，总字节是上一轮打包的数），
表里那个 `OlympiaSetup-4.bin` 早就随旧附件删掉了 → 404，
手动下载的学生会卡在"需要下一张磁盘"。

上一步 `--online` 绿了再部署。**部署要走"清点 → 发布"两步**：

```powershell
# ① 清点：把该公开的挑到发布目录（内部指南、wrangler 本地状态都不带走）
node scripts\oneoff\stage-site.mjs --force

# ② 发布（在发布目录的父级执行，wrangler 的缓存就不会落到仓库根）
cd .scratch\publish
& "$env:APPDATA\npm\wrangler.cmd" pages deploy "site" --project-name olympia-ide --branch main
```

`stage-site.mjs` 会做前置检查（必需文件齐全、`index.html` 引用的每个本地资源都真实存在），
写一份带 sha256 的清单到 `.scratch\publish\stage-manifest.json`（**故意放在发布目录外面**——
清单里带着本机路径，放进去等于把它也发到公网上），并打印下一步该敲的命令。

### 4.1 wrangler 实测细节（2026-10-24）

| 事项 | 实测值 |
|---|---|
| wrangler 可执行文件 | **全局**装在 `%APPDATA%\npm\wrangler.cmd`（4.100.0），**不在仓库的 node_modules 里** |
| 授权（OAuth） | `%APPDATA%\xdg.config\.wrangler\config\default.toml` |
| 账号 id | `<Cloudflare account id>`（本仓不记录真值；用 `wrangler whoami` 现查） |
| 项目 / 生产分支 | `olympia-ide` / `main` |

- **别去 `~\.wrangler` 找凭据**：那台机器上 OAuth 配置在
  `%APPDATA%\xdg.config\.wrangler\config\default.toml`，查错地方会得出"没登录"的错误结论，
  然后卡在交互式登录上（无头环境里必挂）。`wrangler whoami` 能看到 `pages (write)` 权限才算数。
- **用全局 cmd 的绝对路径更稳**：`npx wrangler` 会先查 npm registry，网络不通时多等一轮。
- 走代理时要设 `NODE_USE_ENV_PROXY=1` + `HTTP_PROXY` / `HTTPS_PROXY`（否则 wrangler 自己不认）。

### 4.2 两个坑，都会让人以为"部署了但没生效"

**① `wrangler pages deploy .` 不认 `.gitignore`。**
2026-10-24 实测：在 `website\` 里放 `.gitignore` 写上要排除的文件，照样被上传（文件数从 13 变 14）。
所以排除规则只能自己实现 —— 这就是 `stage-site.mjs` 存在的理由。
（`.wrangler\` 这种**点开头的目录**默认不会被上传，**点开头的文件**会被。）

**② Cloudflare 只对"内容变了"的资产自动失效边缘缓存，删除路径不会。**
Pages 给静态资源发的头是 `cache-control: public, s-maxage=604800`（边缘 7 天）。
把 `DEPLOY.md` 从发布包里删掉之后，`https://olympia.dpdns.org/DEPLOY.md`
**仍然能读到旧内容**（实测：源站已经是 404，边缘还拿着旧文件，`age` 一路涨）。
带随机 query 请求能立刻拿到新结果 —— 那是绕过缓存键，不是修好了。

两种解法：
- **让这个路径的内容变一次**（本项目采用）：`stage-site.mjs` 在发布目录里写一个
  无害的占位 `DEPLOY.md`，Cloudflare 发现内容变了会自动失效边缘缓存，旧内容随之消失；
- 或者用**有 Cache Purge 权限的令牌**调 `POST /zones/<zone>/purge_cache`
  （`wrangler` 的 OAuth 令牌只有 `zone (read)`，调这个 API 会 401，实测过）。

### 4.3 部署完必须验

```powershell
node scripts\oneoff\check-website.mjs --online
```

`check-website.mjs --online` 只管下载直链和页面一致性，**查不出边缘缓存里的旧文件**，
所以还要按 body 指纹再核一遍：

- 线上 `index.html` 的 sha256 == 本地 `website\index.html` 的 sha256；
- 首页分卷表 4 行（`exe` + 3 片），总字节 276,970,953 B，**不能出现 `-4.bin`**；
- `GET /DEPLOY.md` 读到的只是占位内容，不是内部指南原文；
- `GET /<不存在的路径>` 会返回 index.html（Pages 的未匹配路径回落，**状态码仍是 200**）——
  所以判断"文件还在不在"不能只看状态码，要比 body 的 sha256。

## 5. 机房侧须知

- 用的是 user 版安装器：`PrivilegesRequired=lowest`，装到
  `%LOCALAPPDATA%\Programs\Olympia IDE`，**不需要管理员权限**；
- 卸载在"设置 → 应用"里，条目名是 `Olympia IDE (User)`；
- 以管理员身份运行 user 版会弹中文警告（`code.iss` 里那条 MsgBox），属正常提示。

## 若以后开通 Cloudflare R2

R2 单对象 5 GiB，可以回到"一个文件"的体验，Gitee 退成镜像：
`npx wrangler r2 bucket create olympia-downloads` → 控制台 R2 → 桶 → Custom Domains
绑 `dl.olympia.dpdns.org` → 上传整包 → 换 `index.html` 链接。开 R2 需要账号绑定支付方式。

## 历史：Tauri 版 0.1.0（官网已不再指向它）

pivot 之前的 Tauri 外壳 + NSIS 安装器约 49 MB，单文件塞得进 Gitee 附件，
`v0.1.0/Olympia%20IDE_0.1.0_x64-setup.exe` 那个 Release 还挂在那里，但**官网三处下载入口
（`index.html` 的首屏 CTA、下载卡、页脚）现在全部指向 fork 版的 Release 页**，
不再有指向 0.1.0 的按钮（早先写的 `#dl-btn` 这个 id 在现在的 `index.html` 里已经不存在）。
旧流程依赖 `scripts/strip-toolchain.py` 裁剪工具链来控制体积，fork 版不再使用这套：
工具链由 `build/fetch-toolchain.mjs` 从 MSYS2 组装，体积靠 Inno 自己分卷解决（见第 1、2 节）。
发新版时如果顺手要把 0.1.0 摘掉，就在 Gitee 那个 Release 的说明里写明"旧版，勿下载"，
不要直接删附件——已经装了 0.1.0 的学生还要靠它对照。
