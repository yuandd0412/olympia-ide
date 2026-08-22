#include "MainWindow.h"
#include <QAction>
#include <QFileDialog>
#include <QHBoxLayout>
#include <QLabel>
#include <QSplitter>
#include <QStackedWidget>
#include <QTabBar>
#include <QToolButton>
#include <QVBoxLayout>
#include <QFutureWatcher>
#include <QtConcurrent/QtConcurrentRun>
#include "ui/editor/OlerEditor.h"
#include "ui/runner/OlerRunPanel.h"
#include "ui/problems/OlerProblemsPage.h"
#include "ui/mistakes/OlerMistakesPage.h"
#include "ui/training/OlerTrainingPage.h"
#include "ui/settings/OlerSettingsPage.h"
#include "ui/ai/OlerAiPage.h"
#include "core/runner/OlerRunner.h"
#include "core/settings/OlerSettings.h"
#include "core/problems/OlerProblems.h"
#include "core/mistakes/OlerMistakes.h"
#include "core/solves/OlerSolves.h"

MainWindow::MainWindow(QWidget *parent) : QMainWindow(parent) {
    setWindowTitle("Oler IDE v2");
    resize(1280, 800);
    m_runner = new OlerRunner(this);
    buildActivityBar();
    buildTabBar();
    buildContentPages();

    auto *openAct = new QAction(this);
    openAct->setShortcut(QKeySequence::Open);
    connect(openAct, &QAction::triggered, this, &MainWindow::openFile);
    addAction(openAct);

    auto *saveAct = new QAction(this);
    saveAct->setShortcut(QKeySequence::Save);
    connect(saveAct, &QAction::triggered, this, [this] { saveCurrentFile(false); });
    addAction(saveAct);

    auto *runAct = new QAction(this);
    runAct->setShortcut(QKeySequence("Ctrl+R"));
    connect(runAct, &QAction::triggered, this, &MainWindow::runCurrentFile);
    addAction(runAct);
}

MainWindow::~MainWindow() = default;

void MainWindow::buildActivityBar() {
    // 56px left rail (docs: oler-nav-56px). Owned by the shell layout in
    // buildContentPages; here we only create the buttons.
    m_activityRail = new QWidget;
    m_activityRail->setObjectName("activityRail");
    m_activityRail->setFixedWidth(56);
    auto *railLayout = new QVBoxLayout(m_activityRail);
    railLayout->setContentsMargins(4, 8, 4, 8);
    railLayout->setSpacing(4);
    auto acts = {
        tr("Editor"), tr("Problems"), tr("Training"), tr("Mistakes"),
        tr("AI Coach"), tr("Settings")
    };
    int i = 0;
    for (const auto &name : acts) {
        auto *btn = new QToolButton(m_activityRail);
        btn->setText(name);
        btn->setCheckable(true);
        btn->setToolTip(name);
        btn->setProperty("pageIdx", i++);
        btn->setSizePolicy(QSizePolicy::Preferred, QSizePolicy::Expanding);
        connect(btn, &QToolButton::clicked, this, [this](bool checked) {
            Q_UNUSED(checked);
            m_tabBar->setCurrentIndex(
                static_cast<QToolButton *>(sender())->property("pageIdx").toInt());
        });
        m_railButtons.append(btn);
        railLayout->addWidget(btn);
    }
    railLayout->addStretch();
    m_railButtons.first()->setChecked(true);
}

void MainWindow::buildTabBar() {
    // 36px top tab strip (docs: oler-tabbar-36px). Parented into the shell
    // layout in buildContentPages.
    m_tabBar = new QTabBar;
    m_tabBar->setFixedHeight(36);
    m_tabBar->setExpanding(false);
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
    m_problemsPage = new OlerProblemsPage;      // index 1: Problems
    m_pages->addWidget(m_problemsPage);
    m_trainingPage = new OlerTrainingPage;      // index 2: Training
    m_pages->addWidget(m_trainingPage);
    m_mistakesPage = new OlerMistakesPage;      // index 3: Mistakes
    m_pages->addWidget(m_mistakesPage);
    m_aiPage = new OlerAiPage;                  // index 4: AI Coach
    m_pages->addWidget(m_aiPage);
    m_settingsPage = new OlerSettingsPage;      // index 5: Settings
    m_pages->addWidget(m_settingsPage);

    // Shell frame: [56px rail | (36px tab strip / page stack)].
    auto *right = new QWidget;
    auto *rightLayout = new QVBoxLayout(right);
    rightLayout->setContentsMargins(0, 0, 0, 0);
    rightLayout->setSpacing(0);
    rightLayout->addWidget(m_tabBar);
    rightLayout->addWidget(m_pages, /*stretch*/ 1);

    auto *shell = new QWidget;
    auto *shellLayout = new QHBoxLayout(shell);
    shellLayout->setContentsMargins(0, 0, 0, 0);
    shellLayout->setSpacing(0);
    shellLayout->addWidget(m_activityRail);
    shellLayout->addWidget(right, /*stretch*/ 1);

    setCentralWidget(shell);

    connect(m_problemsPage, &OlerProblemsPage::openRequested,
            this, &MainWindow::openProblem);
}

QWidget *MainWindow::buildEditorPage() {
    auto *page = new QWidget(this);
    auto *layout = new QVBoxLayout(page);
    layout->setContentsMargins(0, 0, 0, 0);
    layout->setSpacing(0);

    // Title strip: file name + dirty dot (docs/04-editor/subpages.md).
    m_editorTitle = new QLabel(tr("untitled"));
    m_editorTitle->setObjectName("editorTitle");
    m_editorTitle->setFixedHeight(28);
    m_editorTitle->setAlignment(Qt::AlignVCenter | Qt::AlignLeft);
    layout->addWidget(m_editorTitle);

    auto *splitter = new QSplitter(Qt::Vertical, page);
    m_editorPage = new OlerEditor(splitter);
    m_runPanel = new OlerRunPanel(splitter);
    splitter->addWidget(m_editorPage);
    splitter->addWidget(m_runPanel);
    splitter->setStretchFactor(0, 3);
    splitter->setStretchFactor(1, 1);
    splitter->setSizes({600, 200});
    layout->addWidget(splitter, /*stretch*/ 1);

    // Sample code for first-run; not associated with any file.
    m_editorPage->setPlainText(
        "// Oler IDE v2 - sample C++\n"
        "#include <iostream>\n"
        "\n"
        "int main() {\n"
        "    std::cout << \"Hello, OI!\" << std::endl;\n"
        "    return 0;\n"
        "}\n");

    auto syncTitle = [this] {
        const QString name =
            m_editorPage->filePath().isEmpty()
                ? tr("untitled")
                : QFileInfo(m_editorPage->filePath()).fileName();
        m_editorTitle->setText(name + (m_editorPage->document()->isModified()
                                           ? QStringLiteral(" *")
                                           : QString()));
    };
    connect(m_editorPage, &OlerEditor::fileChanged, page, syncTitle);
    connect(m_editorPage->document(), &QTextDocument::modificationChanged,
            page, syncTitle);
    syncTitle();

    return page;
}

void MainWindow::onTabChanged(int index) {
    if (m_pages && index >= 0) m_pages->setCurrentIndex(index);
    // sync activity rail buttons
    for (QToolButton *btn : m_railButtons)
        btn->setChecked(btn->property("pageIdx").toInt() == index);
}

void MainWindow::openFile() {
    const QString path = QFileDialog::getOpenFileName(
        this, tr("Open source file"), QString(),
        tr("Source files (*.cpp *.cc *.cxx *.c *.h *.hpp *.py *.java);;All files (*)"));
    if (path.isEmpty())
        return;
    if (!m_editorPage->loadFile(path)) {
        m_runPanel->showMessage(tr("<span style='color:#ff453a'>Cannot open %1</span>")
                                    .arg(path.toHtmlEscaped()));
        return;
    }
    m_runPanel->showMessage(tr("<span style='color:#6e6d68'>opened %1 — "
                               "Ctrl+R to compile &amp; run</span>")
                                .arg(QFileInfo(path).fileName().toHtmlEscaped()));
}

bool MainWindow::saveCurrentFile(bool saveAs) {
    QString path = m_editorPage->filePath();
    if (path.isEmpty() || saveAs) {
        path = QFileDialog::getSaveFileName(
            this, tr("Save source file"),
            path.isEmpty() ? QDir::homePath() + "/main.cpp" : path,
            tr("C++ sources (*.cpp);;All files (*)"));
        if (path.isEmpty())
            return false;
    }
    if (!m_editorPage->saveFile(path)) {
        m_runPanel->showMessage(tr("<span style='color:#ff453a'>Cannot write %1</span>")
                                    .arg(path.toHtmlEscaped()));
        return false;
    }
    return true;
}

void MainWindow::openProblem(const OlerProblem &problem) {
    // Per-problem workspace: ~/.oleride/workspace/<id>/ with main.cpp +
    // input.txt/output.txt placeholders on first open.
    QDir ws(QDir::homePath() + QStringLiteral("/.oleride/workspace/") + problem.id);
    if (!ws.exists() && !QDir().mkpath(ws.absolutePath())) {
        m_runPanel->showMessage(tr("<span style='color:#ff453a'>Cannot create %1</span>")
                                    .arg(ws.absolutePath().toHtmlEscaped()));
        return;
    }
    const QString mainCpp = ws.filePath(QStringLiteral("main.cpp"));
    if (!QFileInfo::exists(mainCpp)) {
        QFile f(mainCpp);
        if (f.open(QIODevice::WriteOnly | QIODevice::Text)) {
            const QString tmpl =
                QStringLiteral("// %1 - %2 (%3)\n"
                               "#include <bits/stdc++.h>\n"
                               "using namespace std;\n\n"
                               "int main() {\n"
                               "    \n"
                               "    return 0;\n"
                               "}\n")
                    .arg(problem.id, problem.title.toHtmlEscaped(), problem.oj);
            f.write(tmpl.toUtf8());
        }
    }
    if (!m_editorPage->loadFile(mainCpp))
        return;
    m_tabBar->setCurrentIndex(0); // switch to Editor
}

void MainWindow::runCurrentFile() {
    if (m_editorPage->filePath().isEmpty()) {
        if (!saveCurrentFile(/*saveAs=*/true))
            return;
    } else if (m_editorPage->document()->isModified()) {
        if (!m_editorPage->saveFile(m_editorPage->filePath()))
            return;
    }

    const QString src = m_editorPage->filePath();
    const QVector<OlerTestCase> cases = OlerRunner::discoverCases(src);
    if (cases.isEmpty()) {
        m_runPanel->showMessage(
            tr("<div style='color:#6e6d68'>No test cases found. Put "
               "<b>tests/caseN.in/.out</b> or <b>input.txt/output.txt</b> next to "
               "%1.</div>")
                .arg(QFileInfo(src).fileName().toHtmlEscaped()));
        return;
    }

    m_runPanel->showMessage(tr("<div style='color:#a0a0a3'>Compiling %1 ...</div>")
                                .arg(QFileInfo(src).fileName().toHtmlEscaped()));

    const OlerRunnerConfig cfg = OlerRunnerConfig::fromSettings(OlerSettings::instance());
    auto *watcher = new QFutureWatcher<OlerRunResult>(this);
    connect(watcher, &QFutureWatcher<OlerRunResult>::finished, this,
            [this, watcher, src] {
                const OlerRunResult result = watcher->result();
                m_runPanel->showResult(result, src);
                watcher->deleteLater();

                // Auto-journal non-AC runs (docs/05-test-results/panel.md
                // cross-reference: every non-AC row writes to the journal).
                bool hasFail = false;
                for (const OlerCaseResult &r : result.cases)
                    if (r.verdict != QLatin1String("AC"))
                        hasFail = true;
                if (hasFail) {
                    OlerMistake m;
                    m.problemId = QFileInfo(src).completeBaseName();
                    m.oj = QStringLiteral("Local");
                    m.title = src;
                    m.verdict = result.cases.first().verdict;
                    OlerMistakes::instance()->add(m);
                    OlerMistakes::instance()->save();
                } else if (!result.cases.isEmpty()) {
                    // All AC: counts as a solved problem for Training.
                    OlerSolves::instance()->addSolve(QDate::currentDate());
                    OlerSolves::instance()->save();
                }
            });
    watcher->setFuture(QtConcurrent::run([cfg, src, cases] {
        OlerRunner runner;
        return runner.run(cfg, src, cases);
    }));
}
