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
        return isLight ? acc.darker(110) : acc.lighter(115);
    case Token::PrimaryMuted:
        return QColor(acc.red(), acc.green(), acc.blue(), isLight ? 30 : 38);
    case Token::PrimarySubtle:
        return QColor(acc.red(), acc.green(), acc.blue(), isLight ? 15 : 20);

    case Token::BgBase:
        if (cur == QLatin1String("OneDarkPro")) return QColor("#282c34");
        if (cur == QLatin1String("AmberLight")) return QColor("#fafaf7");
        if (cur == QLatin1String("OneLight"))   return QColor("#fafafa");
        return QColor("#131311"); // MistBlue / AmberDark

    case Token::BgSurface:
        if (cur == QLatin1String("OneDarkPro")) return QColor("#21252b");
        if (cur == QLatin1String("AmberLight")) return QColor("#f0eee8");
        if (cur == QLatin1String("OneLight"))   return QColor("#ffffff");
        return QColor("#1a1915");

    case Token::BgElevated:
        if (cur == QLatin1String("OneDarkPro")) return QColor("#2c313a");
        if (cur == QLatin1String("AmberLight")) return QColor("#e8e6df");
        if (cur == QLatin1String("OneLight"))   return QColor("#f0f0f0");
        return QColor("#252524");

    case Token::BgOverlay:
        if (cur == QLatin1String("OneDarkPro")) return QColor("#2c313a");
        if (cur == QLatin1String("AmberLight")) return QColor("#e0ded6");
        if (cur == QLatin1String("OneLight"))   return QColor("#e8e8e8");
        return QColor("#2c2c2b");

    case Token::BgFloating:
        if (isLight) return QColor("#ffffff");
        return QColor("#353533");

    case Token::TextPrimary:
        if (cur == QLatin1String("OneDarkPro")) return QColor("#abb2bf");
        if (cur == QLatin1String("AmberLight")) return QColor("#2c2a26");
        if (cur == QLatin1String("OneLight"))   return QColor("#383a42");
        return QColor("#f1f1ef");

    case Token::TextSecondary:
        if (cur == QLatin1String("OneDarkPro")) return QColor("#abb2bf");
        if (cur == QLatin1String("AmberLight")) return QColor("#5c5a55");
        if (cur == QLatin1String("OneLight"))   return QColor("#5c6370");
        return QColor("#a0a0a3");

    case Token::TextTertiary:
        if (cur == QLatin1String("OneDarkPro")) return QColor("#5c6370");
        if (cur == QLatin1String("AmberLight")) return QColor("#7c7a75");
        if (cur == QLatin1String("OneLight"))   return QColor("#a0a1a7");
        return QColor("#6e6d68");

    case Token::TextMuted:
        if (isLight) return QColor("#b0b0b0");
        return QColor("#46443b");

    case Token::Border:
        if (isLight) return QColor(0, 0, 0, 25);
        return QColor(255, 255, 255, 15);

    case Token::BorderHover:
        if (isLight) return QColor(0, 0, 0, 45);
        return QColor(255, 255, 255, 31);

    case Token::BorderActive:
        return QColor(acc.red(), acc.green(), acc.blue(), 102);

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
