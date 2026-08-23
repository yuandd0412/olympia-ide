#include "CThemeManager.h"
#include <QApplication>
#include <QFile>
#include <QTextStream>

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
    QFile f(QString(":/themes/%1.qss").arg(name));
    if (!f.open(QFile::ReadOnly | QFile::Text)) return;
    QTextStream in(&f);
    in.setEncoding(QStringConverter::Utf8);
    qApp->setStyleSheet(in.readAll());
    m_current = name;
    emit themeChanged(name);
}

void CThemeManager::cycleTheme() {
    auto themes = availableThemes();
    int idx = themes.indexOf(m_current);
    applyTheme(themes.at((idx + 1) % themes.size()));
}
