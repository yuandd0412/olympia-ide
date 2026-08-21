#include <QApplication>
#include <QMainWindow>
#include <QLabel>
#include <QTimer>
#include <QtGlobal>

int main(int argc, char *argv[]) {
    qputenv("QT_QPA_PLATFORM", "minimal");  // smoke test 模式
    QApplication app(argc, argv);
    QMainWindow w;
    w.setWindowTitle("Oler IDE v2");
    w.resize(1280, 800);
    QLabel *lbl = new QLabel("Oler IDE v2 — foundation", &w);
    lbl->setAlignment(Qt::AlignCenter);
    w.setCentralWidget(lbl);
    w.show();
    QTimer::singleShot(3000, &app, &QCoreApplication::quit);
    return app.exec();
}
