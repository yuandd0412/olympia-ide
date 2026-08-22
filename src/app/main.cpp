#include <QApplication>
#include "ui/mainwindow/MainWindow.h"
#include "core/theme/CThemeManager.h"
#include "core/settings/OlerSettings.h"

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);
    CThemeManager::instance()->applyTheme(
        OlerSettings::instance()->value("theme").toString());
    MainWindow w;
    w.show();
    return app.exec();
}
