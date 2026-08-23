#include <QApplication>
#include <QFont>
#include "ui/mainwindow/MainWindow.h"
#include "core/theme/CThemeManager.h"
#include "core/settings/OlerSettings.h"

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);
    // Unified UI typeface (style guide §1.4); code surfaces set their own mono.
    QFont uiFont(QStringLiteral("Segoe UI"));
    uiFont.setPointSize(10);
    app.setFont(uiFont);
    CThemeManager::instance()->applyTheme(
        OlerSettings::instance()->value("theme").toString());
    MainWindow w;
    w.show();
    return app.exec();
}
