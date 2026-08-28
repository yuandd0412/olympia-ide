# 官网与安装包发布指南（Cloudflare）

域名：`olympia.dpdns.org`（已托管在 Cloudflare）。
本目录 `website/` 是零构建静态站，可直接发布到 Cloudflare Pages。

## 架构

| 内容 | 位置 | 说明 |
|---|---|---|
| 官网页面 | Cloudflare Pages → `olympia.dpdns.org` | 本目录静态文件,项目名 `olympia-ide` |
| 精简版安装包(~6 MB) | Pages 静态资源 `downloads/` | 低于 25 MiB 单文件上限,随官网一起发布 |
| 完整版安装包(~105 MB) | R2 桶 → `dl.olympia.dpdns.org` | 超出 Pages 限制;R2 需在控制台先开通 |

## 步骤

### 0. 登录

```powershell
npx wrangler login
```

### 1. 发布官网 + 精简版(已完成一次,之后每次发版重复)

```powershell
# 1a. 把最新精简版拷进静态目录(此目录已 gitignore,不入库)
copy ..\src-tauri\target\release\bundle\nsis\"Olympia IDE_0.1.0_x64-setup.exe" downloads\Olympia-IDE_0.1.0_x64-setup.exe

# 1b. 发布
npx wrangler pages deploy . --project-name olympia-ide --branch main
```

发布后在控制台 **Workers & Pages → olympia-ide → Custom domains** 绑定 `olympia.dpdns.org`。

### 2. 完整版走 Gitee Release（国内直连快，无需支付方式）

完整版 ~100 MB 级别，超出 Pages 单文件 25 MiB 上限；R2 开通需要账号绑定
支付方式，因此默认走 Gitee（需实名认证，附件单文件上限 100 MB）。

> 前置：完整版产物必须先用 `scripts/strip-toolchain.py` 裁剪工具链后再
> `npm run tauri:full`，否则 ~105 MB 超 Gitee 单文件上限（裁剪后实测 49 MB）。

1. 注册 Gitee 并完成 **设置 → 实名认证**（身份证）；
2. 新建**公开**仓库（如 `olympia-ide`，无需初始化 README）；
3. 仓库页 → **创建发行版 (Releases)** → 标签 `v0.1.0` → 把完整版 exe 拖进附件 → 发布；
4. 附件直链形如 `https://gitee.com/<owner>/olympia-ide/releases/download/v0.1.0/Olympia-IDE_0.1.0_x64-full-setup.exe`，
   把它填进 `index.html` 的"完整版"按钮并重新 `pages deploy`。

若 R2 日后开通，可改走 R2：`npx wrangler r2 bucket create olympia-downloads` →
控制台 R2 → 桶 → Custom Domains 绑 `dl.olympia.dpdns.org` → 上传完整版 → 更新链接。

### 3. 版本升级流程

1. `src-tauri/tauri.conf.json` 中升 `version`（package.json 的版本号与发布无关）；
2. `npm run tauri build`（精简版）与 `npm run tauri:full`（完整版）；
3. 更新 `index.html` 中的版本号与下载文件名，精简版按步骤 1 拷贝，完整版以新文件名上传 R2（保留旧版本供回滚）；
4. `npx wrangler pages deploy . --project-name olympia-ide --branch main` 重新发布官网。

## 备注

- 编译工具链（MinGW 13.1.0，sha256 `6b41fdf2…`）精简版走国内镜像
  清华 TUNA 自动下载，无需自托管；如需自托管可上传同一 7z 到 R2
  并在 `src-tauri/src/toolchain.rs` 的 `MIRRORS` 数组中加一个源。
- R2 免费额度：10 GB 存储 / 每月流量免费，对本项目绰绰有余。
