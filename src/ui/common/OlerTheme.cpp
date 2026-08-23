#include "OlerTheme.h"
#include <QHash>

namespace OlerTheme {
namespace {

// Verbatim from the v0 prototype :root blocks.
const QHash<Token, QColor> &table() {
    static const QHash<Token, QColor> t = {
        {Token::Primary,       QColor(0xd9, 0x77, 0x57)},
        {Token::PrimaryHover,  QColor(0xe0, 0x8a, 0x6c)},
        {Token::PrimaryMuted,  QColor(217, 119, 87, 38)},   // 0.15 alpha
        {Token::PrimarySubtle, QColor(217, 119, 87, 20)},   // 0.08 alpha
        {Token::BgBase,        QColor(0x13, 0x13, 0x11)},
        {Token::BgSurface,     QColor(0x1a, 0x19, 0x15)},
        {Token::BgElevated,    QColor(0x25, 0x25, 0x24)},
        {Token::BgOverlay,     QColor(0x2c, 0x2c, 0x2b)},
        {Token::BgFloating,    QColor(0x35, 0x35, 0x33)},
        {Token::TextPrimary,   QColor(0xf1, 0xf1, 0xef)},
        {Token::TextSecondary, QColor(0xa0, 0xa0, 0xa3)},
        {Token::TextTertiary,  QColor(0x6e, 0x6d, 0x68)},
        {Token::TextMuted,     QColor(0x46, 0x44, 0x3b)},
        {Token::Border,        QColor(255, 255, 255, 15)},  // 0.06 alpha
        {Token::BorderHover,   QColor(255, 255, 255, 31)},  // 0.12 alpha
        {Token::BorderActive,  QColor(217, 119, 87, 102)},  // 0.4 alpha
        {Token::Success,       QColor(0x34, 0xc7, 0x59)},
        {Token::Warning,       QColor(0xff, 0x9f, 0x0a)},
        {Token::Error,         QColor(0xff, 0x45, 0x3a)},
        {Token::Info,          QColor(0x7d, 0xae, 0xd4)},
    };
    return t;
}

} // namespace

QColor token(Token t) {
    return table().value(t);
}

QColor accentForTheme(const QString &themeName) {
    // 00-design-spec section 2 theme palette table + MistBlue (v1.0).
    if (themeName == QLatin1String("OneDarkPro")) return QColor(0x61, 0xaf, 0xef);
    if (themeName == QLatin1String("OneLight"))   return QColor(0x40, 0x78, 0xf2);
    if (themeName == QLatin1String("MistBlue"))   return QColor(0x7d, 0xae, 0xd4);
    return token(Token::Primary); // AmberDark / AmberLight
}

} // namespace OlerTheme
