# 官网与安装包发布指南

域名：`olympia.dpdns.org`（Cloudflare Pages，项目 `olympia-ide`）。
本目录 `website/` 是零构建静态站。

## 限制与结论

| 托管 | 单文件上限 | 能否放下完整安装器 |
|---|---|---|
| Cloudflare Pages | 25 MiB | 否 |
| Gitee Release 附件 | 100 MB（十进制） | 否 |
| GitHub Releases | 不适用 | 没往那边发过：引导器只重试 Gitee，官网按钮也是 Gitee |

安装器实测 276,862,975 B（264.0 MiB，2026-10-22 09:27 编译）。里面打的是整个 Electron 产品：主程序
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
最近一次：2026-10-22 09:27 出分卷（`vscode-win32-x64-user-setup`），2026-10-22 10:04 收发布目录，发行标签 v1.0.0。
产品版本 1.140.0。安装器本体（`OlympiaSetup.exe` + 各分卷）总计 276,862,975 B，共 4 个文件，
最大一片 94,371,840 B（十进制口径也在 100 MB 以内），分卷编号 1–3 连续成套：

| 文件 | 字节 |
|---|---|
| `OlympiaSetup.exe` | 2,620,119（启动器，双击它） |
| `OlympiaSetup-1.bin` | 91,751,424 |
| `OlympiaSetup-2.bin` | 94,371,840 |
| `OlympiaSetup-3.bin` | 88,119,592 |

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

## 4. 官网

上一步 `--online` 绿了再部署：

```powershell
cd website; npx wrangler pages deploy . --project-name olympia-ide --branch main
```

**这一步现在是必须的，不是可选的**：2026-10-15 实测 `https://olympia.dpdns.org/` 上还是
一个 16,533 B 的旧页面，唯一下载链接指向 `v0.1.0/Olympia%20IDE_0.1.0_x64-setup.exe`
（退役的 Tauri 版）。仓库里的 `website\index.html` 已经改好，但没部署，等于没改。

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
