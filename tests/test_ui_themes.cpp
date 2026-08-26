#include "core/theme/CThemeManager.h"
#include "ui/common/OlerTheme.h"
#include <QApplication>
#include <QRegularExpression>
#include <QStringList>
#include <cstdio>

static int failures = 0;

static void check(bool cond, const char *what) {
    if (cond) {
        std::fprintf(stderr, "  ok: %s\n", what);
    } else {
        std::fprintf(stderr, "  FAIL: %s\n", what);
        ++failures;
    }
}

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);

    auto *tm = CThemeManager::instance();
    const QStringList themes = tm->availableThemes();
    check(themes.size() == 5, "available themes count == 5");

    static const QRegularExpression unreplacedTokens(QStringLiteral("%[A-Z0-9_]+%"));

    for (const QString &themeName : themes) {
        tm->applyTheme(themeName);
        check(tm->currentTheme() == themeName,
              QString("applyTheme: %1 active").arg(themeName).toUtf8().constData());

        const QString qss = app.styleSheet();
        check(!qss.isEmpty(),
              QString("stylesheet not empty for %1").arg(themeName).toUtf8().constData());

        // Defend against unreplaced %TOKEN% placeholders
        auto match = unreplacedTokens.match(qss);
        if (match.hasMatch()) {
            std::fprintf(stderr, "  FAIL: %s has unreplaced token: %s\n",
                         themeName.toUtf8().constData(),
                         match.captured(0).toUtf8().constData());
            ++failures;
        } else {
            std::fprintf(stderr, "  ok: %s has 0 unresolved %%TOKEN%% placeholders\n",
                         themeName.toUtf8().constData());
        }

        // Test theme-aware dynamic token dispatch
        const QColor bgBase = OlerTheme::token(OlerTheme::Token::BgBase);
        const QColor textPrim = OlerTheme::token(OlerTheme::Token::TextPrimary);
        const QColor accent = OlerTheme::accentForTheme(themeName);

        check(bgBase.isValid(), "token(BgBase) is valid");
        check(textPrim.isValid(), "token(TextPrimary) is valid");
        check(accent.isValid(), "accentForTheme is valid");

        const bool isLight = (themeName == "OneLight" || themeName == "AmberLight");
        if (isLight) {
            check(bgBase.lightness() > 180, "light theme: BgBase has high lightness");
            check(textPrim.lightness() < 100, "light theme: TextPrimary has dark text for contrast");
        } else {
            check(bgBase.lightness() < 80, "dark theme: BgBase has low lightness");
            check(textPrim.lightness() > 150, "dark theme: TextPrimary has light text for contrast");
        }
    }

    if (failures == 0) {
        std::fprintf(stderr, "test_ui_themes: PASS (all 5 themes verified successfully)\n");
        return 0;
    }
    std::fprintf(stderr, "test_ui_themes: %d failure(s)\n", failures);
    return 1;
}
