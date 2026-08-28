# 官网与安装包发布指南（Cloudflare）

域名：`olympia.dpdns.org`（已托管在 Cloudflare）。
本目录 `website/` 是零构建静态站，可直接发布到 Cloudflare Pages。

## 架构

| 内容 | 位置 | 说明 |
|---|---|---|
| 官网页面 | Cloudflare Pages → `olympia.dpdns.org` | 本目录静态文件 |
| 精简版安装包（~6 MB） | R2 桶 → `dl.olympia.dpdns.org` | Pages 单文件上限 25 MiB，安装包放 R2 统一管理 |
| 完整版安装包（~80 MB） | R2 桶 → `dl.olympia.dpdns.org` | 同上 |

## 步骤

### 1. 发布官网到 Pages

```powershell
cd D:\oler-ide-v2\website
npx wrangler pages deploy . --project-name olympia-ide
```

首次执行会打开浏览器登录 Cloudflare。完成后在 Cloudflare 控制台：
**Workers & Pages → olympia-ide → Custom domains** 绑定 `olympia.dpdns.org`。

### 2. 创建 R2 下载桶并绑定 dl 子域

```powershell
npx wrangler r2 bucket create olympia-downloads
```

控制台：**R2 → olympia-downloads → Settings → Custom Domains**
绑定 `dl.olympia.dpdns.org`（域名同在 Cloudflare，一键签发证书）。

### 3. 上传安装包

构建产物位于 `frontend/src-tauri/target/release/bundle/nsis/`：

```powershell
# 精简版（默认 tauri build 产物）
npx wrangler r2 object put olympia-downloads/Olympia-IDE_0.1.0_x64-setup.exe ^
  --file ..\src-tauri\target\release\bundle\nsis\Olympia IDE_0.1.0_x64-setup.exe

# 完整版（tauri:full 产物，内置 MinGW 工具链）
npx wrangler r2 object put olympia-downloads/Olympia-IDE_0.1.0_x64-full-setup.exe ^
  --file ..\src-tauri\target\release\bundle\nsis\Olympia IDE_0.1.0_x64-full-setup.exe
```

上传完成后，官网两个下载按钮即可用（链接已在 `index.html` 中写好）。

### 4. 版本升级流程

1. `frontend/package.json` 与 `src-tauri/tauri.conf.json` 中升版本号；
2. `npm run tauri build`（精简版）与 `npm run tauri:full`（完整版）；
3. 以新文件名上传 R2（保留旧版本供回滚），更新 `index.html` 中的链接与版本号；
4. `npx wrangler pages deploy . --project-name olympia-ide` 重新发布官网。

## 备注

- 编译工具链（MinGW 13.1.0，sha256 `6b41fdf2…`）精简版走国内镜像
  清华 TUNA 自动下载，无需自托管；如需自托管可上传同一 7z 到 R2
  并在 `src-tauri/src/toolchain.rs` 的 `MIRRORS` 数组中加一个源。
- R2 免费额度：10 GB 存储 / 每月流量免费，对本项目绰绰有余。
