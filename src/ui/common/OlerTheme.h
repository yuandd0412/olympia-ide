#pragma once
#include <QColor>
#include <QString>

// The single source of truth for every color used in C++ code.
// Values are lifted VERBATIM from D:\oler\oler-ide-redesign\pages\*.html
// (:root block). No ad-hoc hex allowed elsewhere (spec rule 1/10).
namespace OlerTheme {

enum class Token {
    Primary,        // #d97757
    PrimaryHover,   // #e08a6c
    PrimaryMuted,   // rgba(217,119,87,0.15)
    PrimarySubtle,  // rgba(217,119,87,0.08)
    BgBase,         // #131311
    BgSurface,      // #1a1915
    BgElevated,     // #252524
    BgOverlay,      // #2c2c2b
    BgFloating,     // #353533
    TextPrimary,    // #f1f1ef
    TextSecondary,  // #a0a0a3
    TextTertiary,   // #6e6d68
    TextMuted,      // #46443b
    Border,         // rgba(255,255,255,0.06)
    BorderHover,    // rgba(255,255,255,0.12)
    BorderActive,   // rgba(217,119,87,0.4)
    Success,        // #34c759
    Warning,        // #ff9f0a
    Error,          // #ff453a
    Info,           // #7daed4
};

QColor token(Token t);

// Theme-name -> accent mapping for the 4 shipped themes.
QColor accentForTheme(const QString &themeName);

} // namespace OlerTheme
