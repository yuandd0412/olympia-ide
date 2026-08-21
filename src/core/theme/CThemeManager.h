#pragma once
#include <QObject>
#include <QString>
#include <QStringList>

class CThemeManager : public QObject {
    Q_OBJECT
public:
    static CThemeManager *instance();

    QStringList availableThemes() const;
    QString currentTheme() const;

    Q_INVOKABLE void applyTheme(const QString &name);
    Q_INVOKABLE void cycleTheme();  // OneDarkPro -> OneLight -> AmberDark -> AmberLight -> OneDarkPro

signals:
    void themeChanged(const QString &name);

private:
    explicit CThemeManager(QObject *parent = nullptr);
    QString m_current;
};
