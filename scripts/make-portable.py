# Builds a portable zip of Olympia IDE from the local release build.
#
#   python scripts/make-portable.py            # after: npm run tauri build
#
# Produces build/portable/Olympia-IDE_<version>_x64-portable.zip containing:
#   Olympia IDE/OlympiaIDE.exe      the app (no NSIS install needed)
#   Olympia IDE/THIRD-PARTY-NOTICES.md
#   Olympia IDE/使用说明.txt        WebView2 + toolchain notes
#
# The portable build keeps the slim-first-run behavior: the MinGW toolchain
# is auto-downloaded from the TUNA mirror on first run if none is detected.
import os
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).parent.parent
SRC_DIR = ROOT / "frontend/src-tauri/target/release"
OUT_DIR = ROOT / "build/portable"
APP_DIR_NAME = "Olympia IDE"
EXE_NAME = "OlympiaIDE.exe"

README_TXT = """Olympia IDE 便携版使用说明
=============================

1. 双击 OlympiaIDE.exe 即可运行，无需安装。
   （首次运行若提示缺少 WebView2，请到
     https://developer.microsoft.com/microsoft-edge/webview2/
     安装 Evergreen 运行时，仅 Windows 10 1803 以下需要手动安装。）

2. 编译工具链：本便携版不含 MinGW。首次启动时，内置向导会引导你
   自动从清华 TUNA 镜像下载 MinGW 13.1.0（约 69 MB，仅需联网一次），
   或者你也可以在「偏好设置」中指定本机已有的 g++ 路径。

3. 所有数据（设置 / 题库 / 练习记录 / 工具链）保存在用户目录
   ~/.oleride 下；删除本文件夹不会丢失这些数据。

4. 卸载：直接删除本文件夹；如需彻底清理，另删除 ~/.oleride 目录。

许可：Olympia IDE 以 MIT 协议开源；完整版安装包内含的 MinGW 工具链
遵循 GPL-3.0 及其运行时例外，详见 THIRD-PARTY-NOTICES.md。
"""


def main() -> int:
    exe = SRC_DIR / "app.exe"
    notices = SRC_DIR / "THIRD-PARTY-NOTICES.md"
    if not exe.is_file():
        print(f"error: {exe} not found — run `npm run tauri build` first", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    version = "0.1.0"
    zip_path = OUT_DIR / f"Olympia-IDE_{version}_x64-portable.zip"

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        zf.write(exe, f"{APP_DIR_NAME}/{EXE_NAME}")
        if notices.is_file():
            zf.write(notices, f"{APP_DIR_NAME}/THIRD-PARTY-NOTICES.md")
        info = zipfile.ZipInfo(f"{APP_DIR_NAME}/使用说明.txt")
        info.external_attr = 0o644 << 16
        zf.writestr(info, README_TXT.encode("utf-8"))

    size_mb = zip_path.stat().st_size / 1e6
    print(f"portable zip: {zip_path} ({size_mb:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
