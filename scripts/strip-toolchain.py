# Strips non-essential pieces from the vendored MinGW toolchain so the
# "full" installer fits Gitee's 100 MB release-attachment limit.
#
# OI compile profile needs only C/C++ (g++, cc1, cc1plus, binutils, CRT,
# libstdc++). Removed here: GDB + its bundled Python runtime (opt/, the
# single biggest chunk), the Fortran front end, LTO machinery, and misc
# analysis tools. Run after (re)vendoring:
#
#   python scripts/strip-toolchain.py
#
# Then rebuild the full installer:  cd frontend && npm run tauri:full
import shutil
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent.parent / "frontend/src-tauri/vendor/mingw64"

REMOVE = [
    "opt",                                   # gdb's bundled python runtime, 187 MB
    "bin/gdb.exe",
    "bin/gdborig.exe",
    "bin/gdbserver.exe",
    "bin/lto-dump.exe",                      # 32 MB
    "bin/gcov.exe",
    "bin/gcov-tool.exe",
    "bin/gcov-dump.exe",
    "bin/gcc-ar.exe",
    "bin/gcc-nm.exe",
    "bin/gcc-ranlib.exe",
    "libexec/gcc/x86_64-w64-mingw32/13.1.0/f951.exe",    # Fortran front end, 34 MB
    "libexec/gcc/x86_64-w64-mingw32/13.1.0/lto1.exe",    # 32 MB
    # NOTE: liblto_plugin.dll must STAY — this build's linker passes
    # -fuse-linker-plugin on every link and fails hard without it.
    "libexec/gcc/x86_64-w64-mingw32/13.1.0/install-tools",
    "share/doc",
    "share/man",
    "share/info",
    "share/locale",
]

if not (ROOT / "bin/g++.exe").is_file():
    sys.exit(f"toolchain not found under {ROOT}")

freed = 0
for rel in REMOVE:
    p = ROOT / rel
    if not p.exists():
        continue
    size = p.stat().st_size if p.is_file() else sum(f.stat().st_size for f in p.rglob("*") if f.is_file())
    shutil.rmtree(p, ignore_errors=True) if p.is_dir() else p.unlink(missing_ok=True)
    freed += size
    print(f"removed {rel:60s} {size / 1e6:7.1f} MB")

print(f"\ntotal freed: {freed / 1e6:.1f} MB")
