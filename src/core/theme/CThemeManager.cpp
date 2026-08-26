#include "CThemeManager.h"
#include <QApplication>
#include <QFile>
#include <QHash>
#include <QString>
#include <QTextStream>

namespace {

// Per-theme palette used to resolve `%TOKEN%` placeholders in each
// resources/themes/*.qss file. Tuned to Apple HIG / Google Material 3 standards.
struct Palette {
    QString base;
    QString surface;
    QString elevated;
    QString overlay;
    QString secondary;
    QString tertiary;
    QString textPrimary;     // body text (per theme; high contrast)
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
        // MistBlue: Apple-style dark, cool slate-blue accent (Default)
        {"MistBlue", {
            "#121316", "#181a1f", "#22252c", "#2b2f38",
            "#9da5b4", "#5c6370", "#f0f2f5",
            "rgba(255,255,255,0.07)", "rgba(255,255,255,0.14)",
            "rgba(125,174,212,0.50)",
            "#7daed4", "#9bc5e5",
            "rgba(125,174,212,0.15)", "rgba(125,174,212,0.08)",
            "#7daed4"
        }},
        // AmberDark: warm dark, brand-default
        {"AmberDark", {
            "#131311", "#1a1916", "#242320", "#2c2a26",
            "#a8a69e", "#6e6d68", "#f5f4ef",
            "rgba(255,255,255,0.07)", "rgba(255,255,255,0.14)",
            "rgba(217,119,87,0.50)",
            "#d97757", "#e68c6e",
            "rgba(217,119,87,0.15)", "rgba(217,119,87,0.08)",
            "#d97757"
        }},
        // OneDarkPro: Atom One Dark, distinct base palette
        {"OneDarkPro", {
            "#21252b", "#282c34", "#2f343f", "#383e4c",
            "#abb2bf", "#5c6370", "#f0f2f6",
            "rgba(255,255,255,0.08)", "rgba(255,255,255,0.16)",
            "rgba(97,175,239,0.50)",
            "#61afef", "#7ec0ff",
            "rgba(97,175,239,0.15)", "rgba(97,175,239,0.08)",
            "#61afef"
        }},
        // AmberLight: warm light, brand accent preserved, high contrast text
        {"AmberLight", {
            "#f8f7f4", "#ffffff", "#f0ede6", "#e6e2d8",
            "#5c5a55", "#888680", "#1c1b18",
            "rgba(0,0,0,0.08)", "rgba(0,0,0,0.16)",
            "rgba(217,119,87,0.50)",
            "#d97757", "#c66748",
            "rgba(217,119,87,0.12)", "rgba(217,119,87,0.06)",
            "#d97757"
        }},
        // OneLight: macOS clean light base with pure white card surfaces
        {"OneLight", {
            "#f5f6f8", "#ffffff", "#eceef2", "#e0e3e9",
            "#4f5666", "#9096a2", "#20232a",
            "rgba(0,0,0,0.08)", "rgba(0,0,0,0.16)",
            "rgba(64,120,242,0.50)",
            "#4078f2", "#3065dc",
            "rgba(64,120,242,0.12)", "rgba(64,120,242,0.06)",
            "#4078f2"
        }},
    };
    return t;
}

QHash<QString, QString> tokenTable(const QString &theme) {
    const Palette p = paletteTable().value(theme, paletteTable().value(QStringLiteral("MistBlue")));
    return {
        {"BASE",           p.base},
        {"SURFACE",        p.surface},
        {"ELEVATED",       p.elevated},
        {"OVERLAY",        p.overlay},
        {"SECONDARY",      p.secondary},
        {"TERTIARY",       p.tertiary},
        {"TEXT_PRIMARY",   p.textPrimary},
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