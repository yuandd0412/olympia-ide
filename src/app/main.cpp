#include <QApplication>
#include <QTimer>
#include "ui/mainwindow/MainWindow.h"
#include "core/theme/CThemeManager.h"

int main(int argc, char *argv[]) {
    qputenv("QT_QPA_PLATFORM", "minimal");
    QApplication app(argc, argv);
    CThemeManager::instance()->applyTheme("AmberDark");
    MainWindow w;
    w.show();
    QTimer::singleShot(3000, &app, &QCoreApplication::quit);
    return app.exec();
}
