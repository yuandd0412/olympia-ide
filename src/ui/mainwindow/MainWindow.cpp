#include "MainWindow.h"
#include <QToolBar>
#include <QTabBar>
#include <QStackedWidget>
#include <QLabel>
#include "ui/editor/OlerEditor.h"

MainWindow::MainWindow(QWidget *parent) : QMainWindow(parent) {
    setWindowTitle("Oler IDE v2");
    resize(1280, 800);
    buildActivityBar();
    buildTabBar();
    buildContentPages();
}

MainWindow::~MainWindow() = default;

void MainWindow::buildActivityBar() {
    m_activityBar = addToolBar("Activity");
    m_activityBar->setMovable(false);
    m_activityBar->setFloatable(false);
    m_activityBar->setIconSize({24, 24});
    m_activityBar->setFixedWidth(56);
    auto acts = {
        tr("Editor"), tr("Problems"), tr("Training"), tr("Mistakes"), tr("AI Coach"), tr("Settings")
    };
    int i = 0;
    for (const auto &name : acts) {
        auto *a = m_activityBar->addAction(name);
        a->setCheckable(true);
        a->setData(i++);
    }
    m_activityBar->actions().at(0)->setChecked(true);
    connect(m_activityBar, &QToolBar::actionTriggered, this, [this](QAction *a) {
        int idx = a->data().toInt();
        m_tabBar->setCurrentIndex(idx);
    });
}

void MainWindow::buildTabBar() {
    m_tabBar = new QTabBar(this);
    m_tabBar->setFixedHeight(36);
    m_tabBar->addTab(tr("Editor"));      // 1st tab
    m_tabBar->addTab(tr("Problems"));
    m_tabBar->addTab(tr("Training"));
    m_tabBar->addTab(tr("Mistakes"));
    m_tabBar->addTab(tr("AI Coach"));
    m_tabBar->addTab(tr("Settings"));
    connect(m_tabBar, &QTabBar::currentChanged, this, &MainWindow::onTabChanged);
}

void MainWindow::buildContentPages() {
    m_pages = new QStackedWidget(this);
    auto placeholder = [](const QString &name) {
        auto *lbl = new QLabel(name + " (Phase 5+)");
        lbl->setAlignment(Qt::AlignCenter);
        return lbl;
    };
    m_pages->addWidget(buildEditorPage());      // index 0: Editor
    m_pages->addWidget(placeholder("Problems"));
    m_pages->addWidget(placeholder("Training"));
    m_pages->addWidget(placeholder("Mistakes"));
    m_pages->addWidget(placeholder("AI Coach"));
    m_pages->addWidget(placeholder("Settings"));
    setCentralWidget(m_pages);
}

QWidget *MainWindow::buildEditorPage() {
    m_editorPage = new OlerEditor(this);
    m_editorPage->setPlainText(
        "// Oler IDE v2 - sample C++\n"
        "#include <iostream>\n"
        "\n"
        "int main() {\n"
        "    std::cout << \"Hello, OI!\" << std::endl;\n"
        "    return 0;\n"
        "}\n"
    );
    return m_editorPage;
}

void MainWindow::onTabChanged(int index) {
    if (m_pages && index >= 0) m_pages->setCurrentIndex(index);
    // sync activity bar
    if (m_activityBar) {
        for (auto *a : m_activityBar->actions()) {
            a->setChecked(a->data().toInt() == index);
        }
    }
}
