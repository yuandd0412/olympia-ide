# 官网与安装包发布指南

域名：`olympia.dpdns.org`（Cloudflare Pages，项目 `olympia-ide`）。
本目录 `website/` 是零构建静态站。

## 限制与结论

| 托管 | 单文件上限 | 能否放下完整安装器 |
|---|---|---|
| Cloudflare Pages | 25 MiB | 否 |
| Gitee Release 附件 | 100 MB（十进制） | 否 |
| GitHub Releases | 无（国内下载慢） | 仅作备份 |

安装器实测 295,410,537 B（281 MiB）。里面打的是整个 Electron 产品：主程序
`Olympia.exe` 239 MB、内置 MinGW `toolchain/` 455 MB（机房没有编译器，这块必须留）。
**所以"单文件 <100 MB"在这个产品上不可能靠压缩做到**，方案只能是分卷或换宿主。

分卷由 Inno 自己做，不再需要 `copy /b` 之类的合并脚本 —— `oss/build/win32/code.iss`
里已开：

```ini
DiskSpanning=yes
DiskSliceSize=94371840   ; 90 MiB，给十进制 100 MB 留余量
```

实测一次编译（v1.140.0，2026-10-11）产出 5 个文件，总计 295,781,193 B，最大一片
94,371,840 B（94.37 MB，十进制口径也在 100 MB 以内）：

| 文件 | 大小 |
|---|---|
| `OlympiaSetup.exe` | 2,598,288（启动器，双击它） |
| `OlympiaSetup-1.bin` | 91,773,440 |
| `OlympiaSetup-2.bin` | 94,371,840 |
| `OlympiaSetup-3.bin` | 94,371,840 |
| `OlympiaSetup-4.bin` | 12,665,785 |

用户把**全部文件放进同一个目录**，只双击 `OlympiaSetup.exe` 即可；缺片时向导会提示
"安装程序需要下一张磁盘"（该文案在 `oss/build/win32/i18n/Default.zh-cn.isl` 的
`ChangeDiskTitle`）。

## 1. 出包

```powershell
# ① 先完全退出所有 Olympia 窗口（进程还在会让打包中途失败并留下半空的产物目录）

# ② 四阶段打包（bundle → toolchain → extensions → node-compile-cache），约 7–9 分钟
powershell -NoProfile -ExecutionPolicy Bypass -File build\oss-package.ps1

# ③ 编译安装器（约 8 分钟）。注意 ② 不产出安装器，这一步才有
cd oss; npm run gulp -- vscode-win32-x64-user-setup
```

产物在 `oss\.build\win32-x64\user-setup\`。

## 2. 校验分卷（每次发版都要跑）

```powershell
Get-ChildItem oss\.build\win32-x64\user-setup\OlympiaSetup* |
  Select-Object Name, Length, @{n='MB';e={[math]::Round($_.Length/1MB,1)}}
(Get-ChildItem oss\.build\win32-x64\user-setup\OlympiaSetup* |
  Where-Object Length -ge 100000000).Count   # 必须是 0
Get-FileHash oss\.build\win32-x64\user-setup\OlympiaSetup* -Algorithm SHA256
```

SHA256 要连同文件名一起写进 `index.html` 的下载说明，用户下错版本时能自查。

## 3. 上传 Gitee Release

仓库：<https://gitee.com/yuanddMSK/olympia-ide>（需已完成实名认证）。

1. 仓库 → **发行版** → 新建标签，如 `v1.140.0`；
2. 把 `OlympiaSetup.exe` 和**所有** `OlympiaSetup-N.bin` 一起拖进附件 —— 一个都不能漏，
   文件名**不能改**（Inno 按原始名找下一片）；
3. 附件直链形如
   `https://gitee.com/yuanddMSK/olympia-ide/releases/download/v1.140.0/OlympiaSetup-1.bin`。

GitHub Releases 同步上传同一组文件做备份。

## 4. 官网

改 `index.html` 下载区：每个分卷一条链接 + 一句"全部下载到同一目录，双击
`OlympiaSetup.exe`"。原来的单文件按钮描述已经不适用。

```powershell
npx wrangler pages deploy . --project-name olympia-ide --branch main
```

## 5. 机房侧须知

- 用的是 user 版安装器：`PrivilegesRequired=lowest`，装到
  `%LOCALAPPDATA%\Programs\Olympia IDE`，**不需要管理员权限**；
- 卸载在"设置 → 应用"里，条目名是 `Olympia IDE (User)`；
- 以管理员身份运行 user 版会弹中文警告（`code.iss` 里那条 MsgBox），属正常提示。

## 若以后开通 Cloudflare R2

R2 单对象 5 GiB，可以回到"一个文件"的体验，Gitee 退成镜像：
`npx wrangler r2 bucket create olympia-downloads` → 控制台 R2 → 桶 → Custom Domains
绑 `dl.olympia.dpdns.org` → 上传整包 → 换 `index.html` 链接。开 R2 需要账号绑定支付方式。

## 历史：Tauri 版 0.1.0

pivot 之前的 Tauri 外壳 + NSIS 安装器约 49 MB，单文件塞得进 Gitee 附件，官网当前
（`index.html` 的 `#dl-btn`）仍指向它：
`https://gitee.com/yuanddMSK/olympia-ide/releases/download/v0.1.0/Olympia%20IDE_0.1.0_x64-setup.exe`。
旧流程依赖 `scripts/strip-toolchain.py` 裁剪工具链来控制体积，fork 版不再使用这套。
发布 fork 版后请把这条按钮一起换掉。
