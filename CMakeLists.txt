cmake_minimum_required(VERSION 3.20)
project(OlerIDE VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

if(WIN32 AND NOT DEFINED CMAKE_PREFIX_PATH)
    list(APPEND CMAKE_PREFIX_PATH "C:/Qt/6.8.0/mingw_64")
endif()

find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets)

# Vendor ECM
set(ECM_DIR "${CMAKE_SOURCE_DIR}/cmake/shims" CACHE PATH "ECM shim directory" FORCE)
add_subdirectory(third_party/extra-cmake-modules EXCLUDE_FROM_ALL)
include(cmake/shims/ECMConfig.cmake)

# v1 教训: QRC_SYNTAX=OFF avoids katehighlightingindexer STATUS_HEAP_CORRUPTION on MinGW.
# MUST be set before add_subdirectory(syntax-highlighting) so the cache var is locked in.
set(QRC_SYNTAX OFF CACHE BOOL "Skip QRC_SYNTAX (avoids katehighlightingindexer STATUS_HEAP_CORRUPTION)" FORCE)
set(BUILD_TESTING OFF CACHE BOOL "Skip KSyntax tests" FORCE)

# Vendor KSyntaxHighlighting 6.8.0 (LGPL)
add_subdirectory(third_party/syntax-highlighting EXCLUDE_FROM_ALL)

add_executable(oler-ide
    src/app/main.cpp
    src/core/theme/CThemeManager.cpp
    src/core/settings/OlerSettings.cpp
    src/core/runner/OlerRunner.cpp
    src/ui/editor/OlerEditor.cpp
    src/ui/mainwindow/MainWindow.cpp
    resources/themes/themes.qrc
)
target_include_directories(oler-ide PRIVATE src)

# v1 教训: MinGW 13.1.0 下 libQt6EntryPoint.a 引用 MSVC __imp___argc, 必须 FALSE
if(MINGW)
    set_target_properties(oler-ide PROPERTIES WIN32_EXECUTABLE FALSE)
else()
    set_target_properties(oler-ide PROPERTIES WIN32_EXECUTABLE TRUE)
endif()

target_link_libraries(oler-ide PRIVATE
    Qt6::Core Qt6::Gui Qt6::Widgets
    KF6SyntaxHighlighting
)

# Regression smoke test: proves the pre-generated index.katesyntax is loaded
# and definitionForName("C++") returns a valid Definition at runtime.
# Not built by default; invoke with:
#   cmake --build build --target test_highlight
# Defends against future breakage of data/CMakeLists.txt or the qrc resource path.
add_executable(test_highlight
    tests/test_highlight.cpp
)
target_include_directories(test_highlight PRIVATE src)
if(MINGW)
    set_target_properties(test_highlight PROPERTIES WIN32_EXECUTABLE FALSE)
endif()
target_link_libraries(test_highlight PRIVATE
    Qt6::Core Qt6::Gui Qt6::Widgets
    KF6SyntaxHighlighting
)

# Phase 4a regression test: OlerSettings defaults / persistence / signals.
add_executable(test_settings
    tests/test_settings.cpp
    src/core/settings/OlerSettings.cpp
)
target_include_directories(test_settings PRIVATE src)
if(MINGW)
    set_target_properties(test_settings PROPERTIES WIN32_EXECUTABLE FALSE)
endif()
target_link_libraries(test_settings PRIVATE Qt6::Core)

# Phase 4b regression test: full compile+run+verdict pipeline (real g++).
add_executable(test_runner
    tests/test_runner.cpp
    src/core/runner/OlerRunner.cpp
    src/core/settings/OlerSettings.cpp
)
target_include_directories(test_runner PRIVATE src)
if(MINGW)
    set_target_properties(test_runner PROPERTIES WIN32_EXECUTABLE FALSE)
endif()
target_link_libraries(test_runner PRIVATE Qt6::Core)

# KSyntax DLL lives in build/bin/ (KSyntax's install target), but oler-ide.exe
# is in build/. Without this copy, `oler-ide.exe` 启动时找不到 libKF6SyntaxHighlighting.dll → 0xC0000135 STATUS_DLL_NOT_FOUND.
# Task 9 will run full windeployqt to also pull Qt DLLs; this just covers the KSyntax one for now.
add_custom_command(TARGET oler-ide POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "$<TARGET_FILE_DIR:oler-ide>/bin/libKF6SyntaxHighlighting.dll"
        "$<TARGET_FILE_DIR:oler-ide>/libKF6SyntaxHighlighting.dll"
)

# Deploy Qt runtime DLLs alongside oler-ide.exe so it can launch without
# manually prepending C:\Qt\6.8.0\mingw_64\bin to PATH (0xC0000135 STATUS_DLL_NOT_FOUND otherwise).
# `find_program` is preferred over a hard-coded path so windeployqt from
# the same toolchain that built Qt (via CMAKE_PREFIX_PATH) is used.
find_program(WINDEPLOYQT_EXECUTABLE windeployqt HINTS "${CMAKE_PREFIX_PATH}/bin")
if(WINDEPLOYQT_EXECUTABLE)
    add_custom_command(TARGET oler-ide POST_BUILD
        COMMAND "${WINDEPLOYQT_EXECUTABLE}"
            --no-translations
            --no-system-d3d-compiler
            --no-opengl-sw
            --release
            "$<TARGET_FILE:oler-ide>"
        COMMENT "Running windeployqt to copy Qt runtime DLLs into the build directory"
        VERBATIM
    )
else()
    message(WARNING "windeployqt not found; oler-ide.exe will require C:\\Qt\\6.8.0\\mingw_64\\bin on PATH at runtime (0xC0000135 otherwise). Set CMAKE_PREFIX_PATH to the Qt install dir, e.g. C:/Qt/6.8.0/mingw_64.")
endif()
