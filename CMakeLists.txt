cmake_minimum_required(VERSION 3.20)
project(OlerIDE VERSION 0.1.0 LANGUAGES CXX)

enable_testing()

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

if(WIN32 AND NOT DEFINED CMAKE_PREFIX_PATH)
    list(APPEND CMAKE_PREFIX_PATH "C:/Qt/6.8.0/mingw_64")
endif()

find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets Concurrent Svg Network)

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
    src/core/problems/OlerProblems.cpp
    src/core/mistakes/OlerMistakes.cpp
    src/core/solves/OlerSolves.cpp
    src/core/ingest/OlerIngest.cpp
    src/ui/editor/OlerEditor.cpp
    src/ui/common/OlerIcons.cpp
    src/ui/common/OlerTheme.cpp
    src/ui/runner/OlerRunPanel.cpp
    src/ui/problems/OlerProblemsPage.cpp
    src/ui/mistakes/OlerMistakesPage.cpp
    src/ui/training/OlerTrainingPage.cpp
    src/ui/settings/OlerSettingsPage.cpp
    src/ui/ai/OlerAiPage.cpp
    src/ui/mainwindow/MainWindow.cpp
    resources/themes/themes.qrc
)
target_include_directories(oler-ide PRIVATE src)
target_compile_definitions(oler-ide PRIVATE
    OLER_SYNTAX_DATA_DIR="${CMAKE_SOURCE_DIR}/third_party/syntax-highlighting/data"
)

# v1 教训: MinGW 13.1.0 下 libQt6EntryPoint.a 引用 MSVC __imp___argc, 必须 FALSE
if(MINGW)
    set_target_properties(oler-ide PROPERTIES WIN32_EXECUTABLE FALSE)
else()
    set_target_properties(oler-ide PROPERTIES WIN32_EXECUTABLE TRUE)
endif()

target_link_libraries(oler-ide PRIVATE
    Qt6::Core Qt6::Gui Qt6::Widgets Qt6::Concurrent Qt6::Svg Qt6::Network
    KF6SyntaxHighlighting
)

# Regression smoke test: proves the pre-generated index.katesyntax is loaded
# and definitionForName("C++") returns a valid Definition at runtime.
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

# Phase 4c regression test: OlerProblems + OlerMistakes persistence.
add_executable(test_models
    tests/test_models.cpp
    src/core/problems/OlerProblems.cpp
    src/core/mistakes/OlerMistakes.cpp
)
target_include_directories(test_models PRIVATE src)
if(MINGW)
    set_target_properties(test_models PROPERTIES WIN32_EXECUTABLE FALSE)
endif()
target_link_libraries(test_models PRIVATE Qt6::Core)

# Phase 5 regression test: OlerSolves streak / counting / persistence.
add_executable(test_solves
    tests/test_solves.cpp
    src/core/solves/OlerSolves.cpp
)
target_include_directories(test_solves PRIVATE src)
if(MINGW)
    set_target_properties(test_solves PROPERTIES WIN32_EXECUTABLE FALSE)
endif()
target_link_libraries(test_solves PRIVATE Qt6::Core)

# Phase 6 regression test: OlerIngest scraping / parsing / workspace creation.
add_executable(test_ingest
    tests/test_ingest.cpp
    src/core/ingest/OlerIngest.cpp
    src/core/problems/OlerProblems.cpp
)
target_include_directories(test_ingest PRIVATE src)
if(MINGW)
    set_target_properties(test_ingest PROPERTIES WIN32_EXECUTABLE FALSE)
endif()
target_link_libraries(test_ingest PRIVATE Qt6::Core Qt6::Network)

# UI Theme verification test: checks QSS resolution and theme tokens across all 5 themes.
add_executable(test_ui_themes
    tests/test_ui_themes.cpp
    src/core/theme/CThemeManager.cpp
    src/ui/common/OlerTheme.cpp
    resources/themes/themes.qrc
)
target_include_directories(test_ui_themes PRIVATE src)
if(MINGW)
    set_target_properties(test_ui_themes PROPERTIES WIN32_EXECUTABLE FALSE)
endif()
target_link_libraries(test_ui_themes PRIVATE Qt6::Core Qt6::Gui Qt6::Widgets)

add_test(NAME test_highlight COMMAND test_highlight)
add_test(NAME test_settings COMMAND test_settings)
add_test(NAME test_runner COMMAND test_runner)
add_test(NAME test_models COMMAND test_models)
add_test(NAME test_solves COMMAND test_solves)
add_test(NAME test_ingest COMMAND test_ingest)
add_test(NAME test_ui_themes COMMAND test_ui_themes)

# KSyntax DLL lives in build/bin/ (KSyntax's install target), but oler-ide.exe
# is in build/. Without this copy, `oler-ide.exe` 启动时找不到 libKF6SyntaxHighlighting.dll → 0xC0000135 STATUS_DLL_NOT_FOUND.
add_custom_command(TARGET oler-ide POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "$<TARGET_FILE_DIR:oler-ide>/bin/libKF6SyntaxHighlighting.dll"
        "$<TARGET_FILE_DIR:oler-ide>/libKF6SyntaxHighlighting.dll"
)

# Keep syntax data beside the executable so the editor remains usable when
# the build directory is moved without the source tree.
add_custom_command(TARGET oler-ide POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory
        "$<TARGET_FILE_DIR:oler-ide>/syntax-highlighting/data"
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${CMAKE_SOURCE_DIR}/resources/ksyntax/index.katesyntax"
        "$<TARGET_FILE_DIR:oler-ide>/syntax-highlighting/data/index.katesyntax"
    COMMAND ${CMAKE_COMMAND} -E copy_directory
        "${CMAKE_SOURCE_DIR}/third_party/syntax-highlighting/data/syntax"
        "$<TARGET_FILE_DIR:oler-ide>/syntax-highlighting/data/syntax"
)

# Deploy Qt runtime DLLs alongside oler-ide.exe so it can launch without
# manually prepending C:\Qt\6.8.0\mingw_64\bin to PATH (0xC0000135 STATUS_DLL_NOT_FOUND otherwise).
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
