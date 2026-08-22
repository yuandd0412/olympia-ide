#include <QApplication>
#include "ui/mainwindow/MainWindow.h"
#include "core/theme/CThemeManager.h"

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);
    CThemeManager::instance()->applyTheme("AmberDark");
    MainWindow w;
    w.show();
    return app.exec();
}
