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
