# Oler IDE

Qt 6.8 + C++17 桌面 OI 编程 IDE, 内置编译器 / OJ 凭据 / AI 助手。

## 当前状态
v2 foundation phase: 空主窗 + 4 主题切换 + KSyntax 代码高亮 (Phase 0+1+2+3)。

## 路线图
- ✅ Phase 0: 安全护栏 + 仓库 init
- 🚧 Phase 1: 骨架 (空主窗 + ABI 链验证)
- 🚧 Phase 2: 4 主题系统
- 🚧 Phase 3: Vendor 库 (ECM + KSyntax)
- ⏳ Phase 4: 核心类 (OlerApi + 7 大件)
- ⏳ Phase 5: Shell 5 tabs UI
- ⏳ Phase 6: 编译器 pipeline + OJ 适配器
- ⏳ Phase 7+: AI 助手 (dots.ai)

## 启动
```powershell
# 配置
cmake -G Ninja -B build -S . -DCMAKE_CXX_COMPILER=C:/Qt/Tools/mingw1310_64/bin/g++.exe -DCMAKE_PREFIX_PATH=C:/Qt/6.8.0/mingw_64

# 构建
cmake --build build --parallel

# 跑
build\oler-ide.exe
```

## License
MIT — see LICENSE.
