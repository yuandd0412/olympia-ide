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
    QFont uiFont;
    uiFont.setFamilies({QStringLiteral("Segoe UI"),
                        QStringLiteral("system-ui"),
                        QStringLiteral("sans-serif")});
    uiFont.setPixelSize(13);
    app.setFont(uiFont);
    CThemeManager::instance()->applyTheme(
        OlerSettings::instance()->value("theme").toString());
    MainWindow w;
    w.show();
    return app.exec();
}
