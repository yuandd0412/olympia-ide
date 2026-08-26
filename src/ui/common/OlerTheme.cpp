#include "OlerTheme.h"
#include "core/theme/CThemeManager.h"
#include <QHash>

namespace OlerTheme {

QColor token(Token t) {
    const QString cur = CThemeManager::instance()->currentTheme();
    const bool isLight = (cur == QLatin1String("OneLight") || cur == QLatin1String("AmberLight"));
    const QColor acc = accentForTheme(cur);

    switch (t) {
    case Token::Primary:
        return acc;
    case Token::PrimaryHover:
        return isLight ? acc.darker(115) : acc.lighter(115);
    case Token::PrimaryMuted:
        return QColor(acc.red(), acc.green(), acc.blue(), isLight ? 30 : 38);
    case Token::PrimarySubtle:
        return QColor(acc.red(), acc.green(), acc.blue(), isLight ? 15 : 20);

    case Token::BgBase:
        if (cur == QLatin1String("OneDarkPro")) return QColor("#21252b");
        if (cur == QLatin1String("AmberLight")) return QColor("#f8f7f4");
        if (cur == QLatin1String("OneLight"))   return QColor("#f5f6f8");
        if (cur == QLatin1String("AmberDark"))  return QColor("#131311");
        return QColor("#121316"); // MistBlue default

    case Token::BgSurface:
        if (cur == QLatin1String("OneDarkPro")) return QColor("#282c34");
        if (cur == QLatin1String("AmberLight")) return QColor("#ffffff");
        if (cur == QLatin1String("OneLight"))   return QColor("#ffffff");
        if (cur == QLatin1String("AmberDark"))  return QColor("#1a1916");
        return QColor("#181a1f"); // MistBlue

    case Token::BgElevated:
        if (cur == QLatin1String("OneDarkPro")) return QColor("#2f343f");
        if (cur == QLatin1String("AmberLight")) return QColor("#f0ede6");
        if (cur == QLatin1String("OneLight"))   return QColor("#eceef2");
        if (cur == QLatin1String("AmberDark"))  return QColor("#242320");
        return QColor("#22252c"); // MistBlue

    case Token::BgOverlay:
        if (cur == QLatin1String("OneDarkPro")) return QColor("#383e4c");
        if (cur == QLatin1String("AmberLight")) return QColor("#e6e2d8");
        if (cur == QLatin1String("OneLight"))   return QColor("#e0e3e9");
        if (cur == QLatin1String("AmberDark"))  return QColor("#2c2a26");
        return QColor("#2b2f38"); // MistBlue

    case Token::BgFloating:
        if (isLight) return QColor("#ffffff");
        return QColor("#343438");

    case Token::TextPrimary:
        if (cur == QLatin1String("OneDarkPro")) return QColor("#f0f2f6");
        if (cur == QLatin1String("AmberLight")) return QColor("#1c1b18");
        if (cur == QLatin1String("OneLight"))   return QColor("#20232a");
        if (cur == QLatin1String("AmberDark"))  return QColor("#f5f4ef");
        return QColor("#f0f2f5"); // MistBlue

    case Token::TextSecondary:
        if (cur == QLatin1String("OneDarkPro")) return QColor("#abb2bf");
        if (cur == QLatin1String("AmberLight")) return QColor("#5c5a55");
        if (cur == QLatin1String("OneLight"))   return QColor("#4f5666");
        if (cur == QLatin1String("AmberDark"))  return QColor("#a8a69e");
        return QColor("#9da5b4"); // MistBlue

    case Token::TextTertiary:
        if (cur == QLatin1String("OneDarkPro")) return QColor("#5c6370");
        if (cur == QLatin1String("AmberLight")) return QColor("#888680");
        if (cur == QLatin1String("OneLight"))   return QColor("#9096a2");
        if (cur == QLatin1String("AmberDark"))  return QColor("#6e6d68");
        return QColor("#5c6370"); // MistBlue

    case Token::TextMuted:
        if (isLight) return QColor("#a0a4ae");
        return QColor("#404552");

    case Token::Border:
        if (isLight) return QColor(0, 0, 0, 20); // 0.08 alpha
        return QColor(255, 255, 255, 18);        // 0.07 alpha

    case Token::BorderHover:
        if (isLight) return QColor(0, 0, 0, 40); // 0.16 alpha
        return QColor(255, 255, 255, 36);        // 0.14 alpha

    case Token::BorderActive:
        return QColor(acc.red(), acc.green(), acc.blue(), 128); // 0.50 alpha

    case Token::Success:
        return QColor("#34c759");
    case Token::Warning:
        return QColor("#ff9f0a");
    case Token::Error:
        return QColor("#ff453a");
    case Token::Info:
        return QColor("#7daed4");
    }
    return acc;
}

QColor accentForTheme(const QString &themeName) {
    if (themeName == QLatin1String("OneDarkPro")) return QColor(0x61, 0xaf, 0xef);
    if (themeName == QLatin1String("OneLight"))   return QColor(0x40, 0x78, 0xf2);
    if (themeName == QLatin1String("MistBlue"))   return QColor(0x7d, 0xae, 0xd4);
    return QColor(0xd9, 0x77, 0x57); // AmberDark / AmberLight
}

} // namespace OlerTheme
