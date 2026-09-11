# THIRD-PARTY NOTICES / 第三方组件声明

本应用（Olympia IDE）基于多个开源组件构建。我们尊重并感谢所有上游作者。
本文件按组件列出许可证信息及法定声明；完整的许可证文本随安装包一同分发。

Olympia IDE 自身以 **MIT License** 许可发布（见仓库根目录 LICENSE）。
分发渠道：https://github.com/yuandd0412/olympia-ide

---

## 1. MinGW-w64 / GCC 13.1.0 工具链（完整版安装包内置）

- 来源：niXman/mingw-builds-binaries（rt_v11-rev1，x86_64-posix-seh-msvcrt）
- 许可证：**GPL-3.0-or-later**（GCC、Binutils）及其自带 **运行时库例外**
  （GCC Runtime Library Exception），mingw-w64 头文件与运行库为各自上游许可
  （详见安装包内 `mingw64/licenses/` 目录与 `mingw64/share/` 下各组件声明）。
- 完整许可证文本：随完整版安装包分发于 `mingw64/licenses/` 目录。
- 对应源码获取途径（GPL-3.0 第 6 条书面要约）：
  - 源码仓库：https://github.com/niXman/mingw-builds-binaries （tag 13.1.0-rt_v11-rev1）
  - 官方镜像：https://download.qt.io/development_releases/prebuilt/mingw_64/
  - 国内镜像：https://mirrors.tuna.tsinghua.edu.cn/qt/development_releases/prebuilt/mingw_64/
- 本工具链作为独立进程被调用（mere aggregation），不影响 Olympia IDE 自身的 MIT 许可。

## 2. Rust 依赖（编译进主程序）

tauri、tokio、reqwest、serde、uuid、chrono、regex、dirs、sha2、
sevenz-rust、futures-util、tauri-plugin-shell / fs / dialog / log 等。
许可证：MIT / Apache-2.0（双许可，个别为 Apache-2.0 或 MIT）。
完整清单见各 crate 的 Cargo.toml 与仓库 Cargo.lock。

## 3. 前端依赖（打包进 WebView 资源）

主要组件及许可证：

- react / react-dom — MIT
- monaco-editor — MIT
- @xterm/xterm — MIT
- zustand — MIT
- framer-motion (motion) — MIT
- lucide-react — ISC
- react-markdown / remark-math / rehype-katex — MIT
- katex（含内置字体）— MIT；字体为 SIL Open Font License 1.1
- pdfjs-dist — Apache-2.0
- tailwindcss — MIT
- react-resizable-panels — MIT

完整清单（覆盖全部 npm 依赖及其传递依赖，含版本号与许可证字段）见本文件末尾
附录，由 `npm run notices` 从 `package-lock.json` 生成；`npm run notices:check`
可校验附录是否过期。

## 4. 运行时

- Microsoft WebView2 Runtime：不由本安装包分发，由操作系统或 Microsoft 官方
  安装程序提供，受微软自身条款约束。

## 5. 品牌资产

- Olympia IDE 标志（判定环）与界面文案为本项目原创，MIT License。

---

## 附录：前端 npm 依赖清单（由 `npm run notices` 从 package-lock.json 生成，请勿手工编辑）

@jridgewell/gen-mapping@0.3.13 | MIT
@jridgewell/remapping@2.3.5 | MIT
@jridgewell/resolve-uri@3.1.2 | MIT
@jridgewell/sourcemap-codec@1.5.5 | MIT
@jridgewell/trace-mapping@0.3.31 | MIT
@monaco-editor/loader@1.7.0 | MIT
@monaco-editor/react@4.7.0 | MIT
@napi-rs/canvas@1.0.8 | MIT
@napi-rs/canvas-android-arm64@1.0.8 | MIT
@napi-rs/canvas-darwin-arm64@1.0.8 | MIT
@napi-rs/canvas-darwin-x64@1.0.8 | MIT
@napi-rs/canvas-linux-arm-gnueabihf@1.0.8 | MIT
@napi-rs/canvas-linux-arm64-gnu@1.0.8 | MIT
@napi-rs/canvas-linux-arm64-musl@1.0.8 | MIT
@napi-rs/canvas-linux-riscv64-gnu@1.0.8 | MIT
@napi-rs/canvas-linux-x64-gnu@1.0.8 | MIT
@napi-rs/canvas-linux-x64-musl@1.0.8 | MIT
@napi-rs/canvas-win32-arm64-msvc@1.0.8 | MIT
@napi-rs/canvas-win32-x64-msvc@1.0.8 | MIT
@oxc-project/types@0.146.0 | MIT
@oxlint/binding-android-arm-eabi@1.80.0 | MIT
@oxlint/binding-android-arm64@1.80.0 | MIT
@oxlint/binding-darwin-arm64@1.80.0 | MIT
@oxlint/binding-darwin-x64@1.80.0 | MIT
@oxlint/binding-freebsd-x64@1.80.0 | MIT
@oxlint/binding-linux-arm-gnueabihf@1.80.0 | MIT
@oxlint/binding-linux-arm-musleabihf@1.80.0 | MIT
@oxlint/binding-linux-arm64-gnu@1.80.0 | MIT
@oxlint/binding-linux-arm64-musl@1.80.0 | MIT
@oxlint/binding-linux-ppc64-gnu@1.80.0 | MIT
@oxlint/binding-linux-riscv64-gnu@1.80.0 | MIT
@oxlint/binding-linux-riscv64-musl@1.80.0 | MIT
@oxlint/binding-linux-s390x-gnu@1.80.0 | MIT
@oxlint/binding-linux-x64-gnu@1.80.0 | MIT
@oxlint/binding-linux-x64-musl@1.80.0 | MIT
@oxlint/binding-openharmony-arm64@1.80.0 | MIT
@oxlint/binding-win32-arm64-msvc@1.80.0 | MIT
@oxlint/binding-win32-ia32-msvc@1.80.0 | MIT
@oxlint/binding-win32-x64-msvc@1.80.0 | MIT
@rolldown/binding-android-arm-eabi@1.2.5 | MIT
@rolldown/binding-android-arm64@1.2.5 | MIT
@rolldown/binding-darwin-arm64@1.2.5 | MIT
@rolldown/binding-darwin-x64@1.2.5 | MIT
@rolldown/binding-freebsd-x64@1.2.5 | MIT
@rolldown/binding-linux-arm-gnueabihf@1.2.5 | MIT
@rolldown/binding-linux-arm64-gnu@1.2.5 | MIT
@rolldown/binding-linux-arm64-musl@1.2.5 | MIT
@rolldown/binding-linux-ppc64-gnu@1.2.5 | MIT
@rolldown/binding-linux-s390x-gnu@1.2.5 | MIT
@rolldown/binding-linux-x64-gnu@1.2.5 | MIT
@rolldown/binding-linux-x64-musl@1.2.5 | MIT
@rolldown/binding-openharmony-arm64@1.2.5 | MIT
@rolldown/binding-win32-arm64-msvc@1.2.5 | MIT
@rolldown/binding-win32-x64-msvc@1.2.5 | MIT
@rolldown/pluginutils@1.0.1 | MIT
@tailwindcss/node@4.3.3 | MIT
@tailwindcss/oxide@4.3.3 | MIT
@tailwindcss/oxide-android-arm64@4.3.3 | MIT
@tailwindcss/oxide-darwin-arm64@4.3.3 | MIT
@tailwindcss/oxide-darwin-x64@4.3.3 | MIT
@tailwindcss/oxide-freebsd-x64@4.3.3 | MIT
@tailwindcss/oxide-linux-arm-gnueabihf@4.3.3 | MIT
@tailwindcss/oxide-linux-arm64-gnu@4.3.3 | MIT
@tailwindcss/oxide-linux-arm64-musl@4.3.3 | MIT
@tailwindcss/oxide-linux-x64-gnu@4.3.3 | MIT
@tailwindcss/oxide-linux-x64-musl@4.3.3 | MIT
@tailwindcss/oxide-wasm32-wasi@4.3.3 | MIT
@tailwindcss/oxide-win32-arm64-msvc@4.3.3 | MIT
@tailwindcss/oxide-win32-x64-msvc@4.3.3 | MIT
@tailwindcss/vite@4.3.3 | MIT
@tauri-apps/api@2.11.1 | Apache-2.0 OR MIT
@tauri-apps/cli@2.11.4 | Apache-2.0 OR MIT
@tauri-apps/cli-darwin-arm64@2.11.4 | Apache-2.0 OR MIT
@tauri-apps/cli-darwin-x64@2.11.4 | Apache-2.0 OR MIT
@tauri-apps/cli-linux-arm-gnueabihf@2.11.4 | Apache-2.0 OR MIT
@tauri-apps/cli-linux-arm64-gnu@2.11.4 | Apache-2.0 OR MIT
@tauri-apps/cli-linux-arm64-musl@2.11.4 | Apache-2.0 OR MIT
@tauri-apps/cli-linux-riscv64-gnu@2.11.4 | Apache-2.0 OR MIT
@tauri-apps/cli-linux-x64-gnu@2.11.4 | Apache-2.0 OR MIT
@tauri-apps/cli-linux-x64-musl@2.11.4 | Apache-2.0 OR MIT
@tauri-apps/cli-win32-arm64-msvc@2.11.4 | Apache-2.0 OR MIT
@tauri-apps/cli-win32-ia32-msvc@2.11.4 | Apache-2.0 OR MIT
@tauri-apps/cli-win32-x64-msvc@2.11.4 | Apache-2.0 OR MIT
@tauri-apps/plugin-dialog@2.7.2 | MIT OR Apache-2.0
@tauri-apps/plugin-fs@2.5.1 | MIT OR Apache-2.0
@tauri-apps/plugin-shell@2.3.5 | MIT OR Apache-2.0
@types/debug@4.1.13 | MIT
@types/estree@1.0.9 | MIT
@types/estree-jsx@1.0.5 | MIT
@types/hast@3.0.5 | MIT
@types/katex@0.16.8 | MIT
@types/mdast@4.0.4 | MIT
@types/ms@2.1.0 | MIT
@types/node@24.13.3 | MIT
@types/react@19.2.18 | MIT
@types/react-dom@19.2.5 | MIT
@types/trusted-types@2.0.7 | MIT
@types/unist@2.0.11 | MIT
@types/unist@3.0.3 | MIT
@ungap/structured-clone@1.3.3 | ISC
@vitejs/plugin-react@6.1.0 | MIT
@xterm/addon-fit@0.11.0 | MIT
@xterm/xterm@6.0.0 | MIT
bail@2.0.2 | MIT
ccount@2.0.1 | MIT
character-entities@2.0.2 | MIT
character-entities-html4@2.1.0 | MIT
character-entities-legacy@3.0.0 | MIT
character-reference-invalid@2.0.1 | MIT
clsx@2.1.1 | MIT
comma-separated-tokens@2.0.3 | MIT
commander@8.3.0 | MIT
csstype@3.2.3 | MIT
debug@4.4.3 | MIT
decode-named-character-reference@1.3.0 | MIT
dequal@2.0.3 | MIT
detect-libc@2.1.2 | Apache-2.0
devlop@1.1.0 | MIT
dompurify@3.4.8 | (MPL-2.0 OR Apache-2.0)
enhanced-resolve@5.24.5 | MIT
entities@6.0.1 | BSD-2-Clause
estree-util-is-identifier-name@3.0.0 | MIT
extend@3.0.2 | MIT
fdir@6.5.0 | MIT
framer-motion@13.1.1 | MIT
fsevents@2.3.3 | MIT
graceful-fs@4.2.11 | ISC
hast-util-from-dom@5.0.1 | ISC
hast-util-from-html@2.0.3 | MIT
hast-util-from-html-isomorphic@2.0.0 | MIT
hast-util-from-parse5@8.0.3 | MIT
hast-util-is-element@3.0.0 | MIT
hast-util-parse-selector@4.0.0 | MIT
hast-util-to-jsx-runtime@2.3.6 | MIT
hast-util-to-text@4.0.2 | MIT
hast-util-whitespace@3.0.0 | MIT
hastscript@9.0.1 | MIT
html-url-attributes@3.0.1 | MIT
inline-style-parser@0.2.7 | MIT
is-alphabetical@2.0.1 | MIT
is-alphanumerical@2.0.1 | MIT
is-decimal@2.0.1 | MIT
is-hexadecimal@2.0.1 | MIT
is-plain-obj@4.1.0 | MIT
jiti@2.7.0 | MIT
katex@0.16.47 | MIT
katex@0.16.47 | MIT
katex@0.18.4 | MIT
lightningcss@1.32.0 | MPL-2.0
lightningcss@1.33.0 | MPL-2.0
lightningcss-android-arm64@1.32.0 | MPL-2.0
lightningcss-android-arm64@1.33.0 | MPL-2.0
lightningcss-darwin-arm64@1.32.0 | MPL-2.0
lightningcss-darwin-arm64@1.33.0 | MPL-2.0
lightningcss-darwin-x64@1.32.0 | MPL-2.0
lightningcss-darwin-x64@1.33.0 | MPL-2.0
lightningcss-freebsd-x64@1.32.0 | MPL-2.0
lightningcss-freebsd-x64@1.33.0 | MPL-2.0
lightningcss-linux-arm-gnueabihf@1.32.0 | MPL-2.0
lightningcss-linux-arm-gnueabihf@1.33.0 | MPL-2.0
lightningcss-linux-arm64-gnu@1.32.0 | MPL-2.0
lightningcss-linux-arm64-gnu@1.33.0 | MPL-2.0
lightningcss-linux-arm64-musl@1.32.0 | MPL-2.0
lightningcss-linux-arm64-musl@1.33.0 | MPL-2.0
lightningcss-linux-x64-gnu@1.32.0 | MPL-2.0
lightningcss-linux-x64-gnu@1.33.0 | MPL-2.0
lightningcss-linux-x64-musl@1.32.0 | MPL-2.0
lightningcss-linux-x64-musl@1.33.0 | MPL-2.0
lightningcss-win32-arm64-msvc@1.32.0 | MPL-2.0
lightningcss-win32-arm64-msvc@1.33.0 | MPL-2.0
lightningcss-win32-x64-msvc@1.32.0 | MPL-2.0
lightningcss-win32-x64-msvc@1.33.0 | MPL-2.0
longest-streak@3.1.0 | MIT
lucide-react@1.34.0 | ISC
magic-string@0.30.21 | MIT
marked@14.0.0 | MIT
mdast-util-from-markdown@2.0.3 | MIT
mdast-util-math@3.0.0 | MIT
mdast-util-mdx-expression@2.0.1 | MIT
mdast-util-mdx-jsx@3.2.0 | MIT
mdast-util-mdxjs-esm@2.0.1 | MIT
mdast-util-phrasing@4.1.0 | MIT
mdast-util-to-hast@13.2.1 | MIT
mdast-util-to-markdown@2.1.2 | MIT
mdast-util-to-string@4.0.0 | MIT
micromark@4.0.2 | MIT
micromark-core-commonmark@2.0.3 | MIT
micromark-extension-math@3.1.0 | MIT
micromark-factory-destination@2.0.1 | MIT
micromark-factory-label@2.0.1 | MIT
micromark-factory-space@2.0.1 | MIT
micromark-factory-title@2.0.1 | MIT
micromark-factory-whitespace@2.0.1 | MIT
micromark-util-character@2.1.1 | MIT
micromark-util-chunked@2.0.1 | MIT
micromark-util-classify-character@2.0.1 | MIT
micromark-util-combine-extensions@2.0.1 | MIT
micromark-util-decode-numeric-character-reference@2.0.2 | MIT
micromark-util-decode-string@2.0.1 | MIT
micromark-util-encode@2.0.1 | MIT
micromark-util-html-tag-name@2.0.1 | MIT
micromark-util-normalize-identifier@2.0.1 | MIT
micromark-util-resolve-all@2.0.1 | MIT
micromark-util-sanitize-uri@2.0.1 | MIT
micromark-util-subtokenize@2.1.0 | MIT
micromark-util-symbol@2.0.1 | MIT
micromark-util-types@2.0.2 | MIT
monaco-editor@0.56.0 | MIT
motion-dom@13.1.1 | MIT
motion-utils@13.0.0 | MIT
ms@2.1.3 | MIT
nanoid@3.3.18 | MIT
oxlint@1.80.0 | MIT
parse-entities@4.0.2 | MIT
parse5@7.3.0 | MIT
pdfjs-dist@6.3.289 | Apache-2.0
picocolors@1.1.1 | ISC
picomatch@4.0.7 | MIT
postcss@8.5.26 | MIT
property-information@7.2.0 | MIT
react@19.2.8 | MIT
react-dom@19.2.8 | MIT
react-markdown@10.1.0 | MIT
react-resizable-panels@4.12.3 | MIT
rehype-katex@7.0.1 | MIT
remark-math@6.0.0 | MIT
remark-parse@11.0.0 | MIT
remark-rehype@11.1.2 | MIT
rolldown@1.2.5 | MIT
scheduler@0.27.0 | MIT
source-map-js@1.2.1 | BSD-3-Clause
space-separated-tokens@2.0.2 | MIT
state-local@1.0.7 | MIT
stringify-entities@4.0.4 | MIT
style-to-js@1.1.21 | MIT
style-to-object@1.0.14 | MIT
tailwind-merge@3.6.0 | MIT
tailwindcss@4.3.3 | MIT
tapable@2.3.3 | MIT
tinyglobby@0.2.17 | MIT
trim-lines@3.0.1 | MIT
trough@2.2.0 | MIT
tslib@2.8.1 | 0BSD
typescript@6.0.3 | Apache-2.0
undici-types@7.18.2 | MIT
unified@11.0.5 | MIT
unist-util-find-after@5.0.0 | MIT
unist-util-is@6.0.1 | MIT
unist-util-position@5.0.0 | MIT
unist-util-remove-position@5.0.0 | MIT
unist-util-stringify-position@4.0.0 | MIT
unist-util-visit@5.1.0 | MIT
unist-util-visit-parents@6.0.2 | MIT
vfile@6.0.3 | MIT
vfile-location@5.0.3 | MIT
vfile-message@4.0.3 | MIT
vite@8.2.2 | MIT
web-namespaces@2.0.1 | MIT
zustand@5.0.15 | MIT
zwitch@2.0.4 | MIT
