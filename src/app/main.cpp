#include <QApplication>
#include <QFont>
#include "ui/mainwindow/MainWindow.h"
#include "core/theme/CThemeManager.h"
#include "core/settings/OlerSettings.h"

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);
    // Rounded-first UI typeface stack (style guide §1.4): MiSans /
    // HarmonyOS Sans if installed, graceful fallback otherwise.
    QFont uiFont;
    uiFont.setFamilies({QStringLiteral("MiSans"),
                        QStringLiteral("HarmonyOS Sans SC"),
                        QStringLiteral("Segoe UI Variable Display"),
                        QStringLiteral("Segoe UI"),
                        QStringLiteral("Microsoft YaHei UI")});
    uiFont.setPointSize(10);
    app.setFont(uiFont);
    CThemeManager::instance()->applyTheme(
        OlerSettings::instance()->value("theme").toString());
    MainWindow w;
    w.show();
    return app.exec();
}
