#include <QApplication>
#include <QFont>
#include "ui/mainwindow/MainWindow.h"
#include "core/theme/CThemeManager.h"
#include "core/settings/OlerSettings.h"

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);
    // Style guide §1.4: UI stack is Segoe UI / system-ui / sans-serif,
    // body 13px. Code uses a separate Cascadia Mono stack applied by the
    // widgets that need it (editor, status bar, stats).
    // Modern font stack: Segoe UI Variable Text (Win11) / SF Pro / PingFang / Segoe UI.
    QFont uiFont;
    uiFont.setFamilies({QStringLiteral("Segoe UI Variable Text"),
                        QStringLiteral("Segoe UI"),
                        QStringLiteral("SF Pro Text"),
                        QStringLiteral("PingFang SC"),
                        QStringLiteral("Microsoft YaHei UI"),
                        QStringLiteral("system-ui"),
                        QStringLiteral("sans-serif")});
    uiFont.setPixelSize(13);
    uiFont.setStyleStrategy(static_cast<QFont::StyleStrategy>(QFont::PreferAntialias | QFont::PreferQuality));
    app.setFont(uiFont);
    CThemeManager::instance()->applyTheme(
        OlerSettings::instance()->value("theme").toString());
    MainWindow w;
    w.show();
    return app.exec();
}
