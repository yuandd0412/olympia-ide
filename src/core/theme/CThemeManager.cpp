#include "CThemeManager.h"
#include <QApplication>
#include <QFile>
#include <QHash>
#include <QString>
#include <QTextStream>

namespace {

// Per-theme palette used to resolve `%TOKEN%` placeholders in each
// resources/themes/*.qss file. The QSS files use placeholder names so
// themes can be added without copy-pasting 14 colors into each rule;
// CThemeManager substitutes them at applyTheme() time.
//
// The token names match the docs/02-design-system/tokens.md vocabulary,
// minus the few QSS-only ones (ACCENT is the per-theme primary tint).
struct Palette {
    QString base;
    QString surface;
    QString elevated;
    QString overlay;
    QString secondary;
    QString tertiary;
    QString border;
    QString borderHover;
    QString borderActive;
    QString primary;
    QString primaryHover;
    QString primaryMuted;
    QString primarySubtle;
    QString accent;
};

const QHash<QString, Palette> &paletteTable() {
    static const QHash<QString, Palette> t = {
        // AmberDark: warm dark, brand-default
        {"AmberDark", {
            "#131311", "#1a1915", "#252524", "#2c2c2b",
            "#a0a0a3", "#6e6d68",
            "rgba(255,255,255,0.06)", "rgba(255,255,255,0.12)",
            "rgba(217,119,87,0.40)",
            "#d97757", "#e08a6c",
            "rgba(217,119,87,0.15)", "rgba(217,119,87,0.08)",
            "#d97757"
        }},
        // MistBlue: cool dark, slate-blue accent
        {"MistBlue", {
            "#131311", "#1a1915", "#252524", "#2c2c2b",
            "#a0a0a3", "#6e6d68",
            "rgba(255,255,255,0.06)", "rgba(255,255,255,0.12)",
            "rgba(125,174,212,0.40)",
            "#7daed4", "#8fbcdc",
            "rgba(125,174,212,0.15)", "rgba(125,174,212,0.08)",
            "#7daed4"
        }},
        // OneDarkPro: Atom One Dark, distinct base palette
        {"OneDarkPro", {
            "#282c34", "#21252b", "#2c313a", "#2c313a",
            "#abb2bf", "#5c6370",
            "rgba(255,255,255,0.10)", "rgba(255,255,255,0.20)",
            "rgba(97,175,239,0.40)",
            "#61afef", "#61afef",
            "rgba(97,175,239,0.15)", "rgba(97,175,239,0.08)",
            "#61afef"
        }},
        // AmberLight: warm light, brand accent preserved
        {"AmberLight", {
            "#fafaf7", "#f0eee8", "#e8e6df", "#e0ded6",
            "#5c5a55", "#7c7a75",
            "rgba(0,0,0,0.10)", "rgba(0,0,0,0.18)",
            "rgba(217,119,87,0.40)",
            "#d97757", "#e08a6c",
            "rgba(217,119,87,0.12)", "rgba(217,119,87,0.06)",
            "#d97757"
        }},
        // OneLight: Atom One Light
        {"OneLight", {
            "#fafafa", "#ffffff", "#f0f0f0", "#e8e8e8",
            "#383a42", "#a0a1a7",
            "#d0d0d0", "#b0b0b0",
            "rgba(64,120,242,0.40)",
            "#4078f2", "#4078f2",
            "rgba(64,120,242,0.12)", "rgba(64,120,242,0.06)",
            "#4078f2"
        }},
    };
    return t;
}

QHash<QString, QString> tokenTable(const QString &theme) {
    const Palette p = paletteTable().value(theme, paletteTable().value("MistBlue"));
    return {
        {"BASE",           p.base},
        {"SURFACE",        p.surface},
        {"ELEVATED",       p.elevated},
        {"OVERLAY",        p.overlay},
        {"SECONDARY",      p.secondary},
        {"TERTIARY",       p.tertiary},
        {"BORDER",         p.border},
        {"BORDER_HOVER",   p.borderHover},
        {"BORDER_ACTIVE",  p.borderActive},
        {"PRIMARY",        p.primary},
        {"PRIMARY_HOVER",  p.primaryHover},
        {"PRIMARY_MUTED",  p.primaryMuted},
        {"PRIMARY_SUBTLE", p.primarySubtle},
        {"ACCENT",         p.accent},
    };
}

QString substituteTokens(const QString &qss, const QString &theme) {
    const QHash<QString, QString> tokens = tokenTable(theme);
    QString out = qss;
    for (auto it = tokens.constBegin(); it != tokens.constEnd(); ++it)
        out.replace(QStringLiteral("%%1%").arg(it.key()), it.value());
    return out;
}

} // namespace

CThemeManager *CThemeManager::instance() {
    static CThemeManager inst;
    return &inst;
}

CThemeManager::CThemeManager(QObject *parent) : QObject(parent), m_current("MistBlue") {}

QStringList CThemeManager::availableThemes() const {
    return {"MistBlue", "OneDarkPro", "OneLight", "AmberDark", "AmberLight"};
}

QString CThemeManager::currentTheme() const {
    return m_current;
}

void CThemeManager::applyTheme(const QString &name) {
    const QString effective = availableThemes().contains(name)
                                  ? name
                                  : QStringLiteral("MistBlue");
    QFile f(QString(":/themes/%1.qss").arg(effective));
    if (!f.open(QFile::ReadOnly | QFile::Text)) return;
    QTextStream in(&f);
    in.setEncoding(QStringConverter::Utf8);
    const QString resolved = substituteTokens(in.readAll(), effective);
    qApp->setStyleSheet(resolved);
    m_current = effective;
    emit themeChanged(effective);
}

void CThemeManager::cycleTheme() {
    auto themes = availableThemes();
    int idx = themes.indexOf(m_current);
    applyTheme(themes.at((idx + 1) % themes.size()));
}