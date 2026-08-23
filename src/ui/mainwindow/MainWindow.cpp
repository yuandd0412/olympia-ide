#include "MainWindow.h"
#include "ui/common/OlerIcons.h"
#include "ui/common/OlerTheme.h"
#include "core/theme/CThemeManager.h"
#include <QAction>
#include <QFileDialog>
#include <QHBoxLayout>
#include <QLabel>
#include <QSplitter>
#include <QStackedWidget>
#include <QStatusBar>
#include <QTabBar>
#include <QTimer>
#include <QToolButton>
#include <QVBoxLayout>
#include <QWindow>
#include <QFutureWatcher>
#include <QPainter>
#include <QPixmap>
#include <QSvgRenderer>
#include <QTime>
#include <QtConcurrent/QtConcurrentRun>
#ifdef Q_OS_WIN
#include <windows.h>
#include <windowsx.h>
#endif
#include "ui/editor/OlerEditor.h"
#include <functional>
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
    setWindowTitle("Aether");
    resize(1280, 800);
#ifdef Q_OS_WIN
    setWindowFlag(Qt::FramelessWindowHint); // custom titlebar (spec 3.1)
#endif
    m_runner = new OlerRunner(this);
    buildTitlebar();
    buildActivityBar();
    buildTabBar();
    buildContentPages();

    m_clockTimer = new QTimer(this);
    connect(m_clockTimer, &QTimer::timeout, this, [this] {
        m_clock->setText(QTime::currentTime().toString("hh:mm"));
    });
    m_clockTimer->start(10000);
    m_clock->setText(QTime::currentTime().toString("hh:mm"));

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

    statusBar()->showMessage(tr("就绪 · Ctrl+O 打开 · Ctrl+R 编译运行"));
}

MainWindow::~MainWindow() = default;

void MainWindow::buildTitlebar() {
    // 32px caption: logo + "Oler IDE" left; clock + window controls right.
    m_titlebar = new QWidget;
    m_titlebar->setObjectName(QStringLiteral("titlebar"));
    m_titlebar->setFixedHeight(32);
    auto *layout = new QHBoxLayout(m_titlebar);
    layout->setContentsMargins(12, 0, 8, 0);
    layout->setSpacing(8);

    // Logo: 18px primary circle with white bolt (SVG), rendered at full size.
    {
        const QString svg = QStringLiteral(
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>"
            "<path d='M13 2L3 14h9l-1 8 10-12h-9l1-8z'"
            " fill='%1'/></svg>").arg(QColor("#ffffff").name());
        QPixmap pm(72, 72); // 4x for crisp display
        pm.fill(Qt::transparent);
        QPainter p(&pm);
        p.setRenderHint(QPainter::Antialiasing);
        p.setBrush(accentColor());
        p.setPen(Qt::NoPen);
        p.drawEllipse(1, 1, 70, 70);
        QSvgRenderer bolt(svg.toUtf8());
        bolt.render(&p, QRectF(20, 20, 32, 32));
        p.end();
        auto *logo = new QLabel(m_titlebar);
        logo->setPixmap(pm);
        logo->setFixedSize(18, 18);
        logo->setScaledContents(true);
        logo->setStyleSheet(
            "border-radius:9px;background:" + accentColor().name() + ";");
        layout->addWidget(logo);
    }

    auto *title = new QLabel(QStringLiteral("Aether"), m_titlebar);
    title->setObjectName(QStringLiteral("titlebarTitle"));
    layout->addWidget(title);
    layout->addStretch();

    m_clock = new QLabel(m_titlebar);
    m_clock->setObjectName(QStringLiteral("titlebarClock"));
    layout->addWidget(m_clock);

    auto mkBtn = [this](OlerIcons::Name icon, const QString &objName,
                        const std::function<void()> &slot) {
        auto *b = new QToolButton(m_titlebar);
        b->setObjectName(objName);
        b->setFixedSize(28, 24);
        b->setIcon(OlerIcons::make(icon, QColor("#a0a0a3"), 14));
        b->setAutoRaise(true);
        connect(b, &QToolButton::clicked, this, [slot] { slot(); });
        return b;
    };
    m_minBtn = mkBtn(OlerIcons::Name::Minimize, QStringLiteral("tbBtn"),
                     [this] { showMinimized(); });
    m_maxBtn = mkBtn(OlerIcons::Name::Maximize, QStringLiteral("tbBtn"),
                     [this] { toggleMaxRestore(); });
    m_closeBtn = mkBtn(OlerIcons::Name::Close, QStringLiteral("tbClose"),
                       [this] { close(); });
    layout->addWidget(m_minBtn);
    layout->addWidget(m_maxBtn);
    layout->addWidget(m_closeBtn);

}

void MainWindow::toggleMaxRestore() {
    if (isMaximized())
        showNormal();
    else
        showMaximized();
    refreshChromeIcons();
}

#ifdef Q_OS_WIN
void MainWindow::applyNativeWindowTreatments() {
    // Restore native frame styles so DWM animations, snap and resize work,
    // then strip the visible frame in WM_NCCALCSIZE. Standard recipe for
    // custom-titlebar windows on Windows 10/11.
    HWND hwnd = reinterpret_cast<HWND>(winId());
    const LONG_PTR style = GetWindowLongPtrW(hwnd, GWL_STYLE);
    SetWindowLongPtrW(hwnd, GWL_STYLE,
                      style | WS_CAPTION | WS_THICKFRAME | WS_MAXIMIZEBOX |
                          WS_MINIMIZEBOX);

    // Win11: rounded corners + dark system chrome.
    HMODULE dwm = GetModuleHandleW(L"dwmapi.dll");
    if (dwm) {
        using Fn = HRESULT(WINAPI *)(HWND, DWORD, LPCVOID, DWORD);
        auto setAttr = reinterpret_cast<Fn>(
            GetProcAddress(dwm, "DwmSetWindowAttribute"));
        if (setAttr) {
            BOOL dark = TRUE;
            setAttr(hwnd, 20 /*DWMWA_USE_IMMERSIVE_DARK_MODE*/, &dark,
                    sizeof(dark));
            UINT round = 2 /*DWMWCP_ROUND*/;
            setAttr(hwnd, 33 /*DWMWA_WINDOW_CORNER_PREFERENCE*/, &round,
                    sizeof(round));
        }
    }
}
#endif

void MainWindow::showEvent(QShowEvent *ev) {
    QMainWindow::showEvent(ev);
#ifdef Q_OS_WIN
    static bool applied = false;
    if (!applied) {
        applied = true;
        applyNativeWindowTreatments();
    }
#endif
}

void MainWindow::changeEvent(QEvent *ev) {
    QMainWindow::changeEvent(ev);
    if (ev->type() == QEvent::WindowStateChange) {
        // Maximized frameless+thickframe windows overflow the screen by the
        // invisible resize border; compensate with content margins.
        const int pad = isMaximized() ? 8 : 0;
        centralWidget()->setContentsMargins(pad, 0, pad, 0);
        if (m_maxBtn) {
            m_maxBtn->setIcon(OlerIcons::make(
                isMaximized() ? OlerIcons::Name::Restore
                              : OlerIcons::Name::Maximize,
                QColor("#a0a0a3"), 14));
        }
    }
}

QColor MainWindow::accentColor() const {
    return OlerTheme::accentForTheme(CThemeManager::instance()->currentTheme());
}

void MainWindow::buildActivityBar() {
    // 56px left rail (spec 3.1): 40x40 icon buttons, active = primary-muted
    // bg + primary icon; icons re-tinted in refreshChromeIcons().
    m_activityRail = new QWidget;
    m_activityRail->setObjectName("activityRail");
    m_activityRail->setFixedWidth(56);
    auto *railLayout = new QVBoxLayout(m_activityRail);
    railLayout->setContentsMargins(8, 8, 8, 8);
    railLayout->setSpacing(4);

    const struct { OlerIcons::Name icon; const char *full; } acts[] = {
        {OlerIcons::Name::Code,        "编辑器"},
        {OlerIcons::Name::CheckSquare, "题库"},
        {OlerIcons::Name::Target,      "训练"},
        {OlerIcons::Name::Book,        "错题本"},
        {OlerIcons::Name::Message,     "AI 教练"},
        {OlerIcons::Name::Settings,    "设置"},
    };
    for (const auto &a : acts) {
        auto *btn = new QToolButton(m_activityRail);
        btn->setProperty("navIcon", true);
        btn->setToolTip(QString::fromLatin1(a.full));
        btn->setCheckable(true);
        btn->setFixedSize(40, 40);
        btn->setIconSize(QSize(20, 20));
        connect(btn, &QToolButton::clicked, this, [this](bool checked) {
            Q_UNUSED(checked);
            m_tabBar->setCurrentIndex(
                static_cast<QToolButton *>(sender())->property("pageIdx").toInt());
        });
        m_railButtons.append(btn);
        railLayout->addWidget(btn);
    }
    // pageIdx property must match stack order.
    for (int i = 0; i < m_railButtons.size(); ++i)
        m_railButtons[i]->setProperty("pageIdx", i);
    railLayout->addStretch();
    m_railButtons.first()->setChecked(true);
    refreshChromeIcons();
}

void MainWindow::refreshChromeIcons() {
    const QColor idle("#6e6d68");
    const QColor hover("#a0a0a3"); // hover tint handled by QSS overlay
    static const OlerIcons::Name names[] = {
        OlerIcons::Name::Code,     OlerIcons::Name::CheckSquare,
        OlerIcons::Name::Target,   OlerIcons::Name::Book,
        OlerIcons::Name::Message,  OlerIcons::Name::Settings,
    };
    for (int i = 0; i < m_railButtons.size(); ++i) {
        const bool active = m_railButtons[i]->isChecked();
        m_railButtons[i]->setIcon(
            OlerIcons::make(names[i], active ? accentColor() : idle, 20));
    }
    Q_UNUSED(hover);
}

#ifdef Q_OS_WIN
bool MainWindow::nativeEvent(const QByteArray &eventType, void *message,
                             qint64 *result) {
    MSG *msg = static_cast<MSG *>(message);
    if (msg->message == WM_NCCALCSIZE && msg->wParam &&
        IsWindowVisible(msg->hwnd)) {
        // Remove the standard frame entirely; we draw our own titlebar.
        *result = 0;
        return true;
    }
    if (msg->message == WM_NCHITTEST) {
        // lParam is in physical screen px; convert to local logical px
        // (DPI-safe, unlike mapFromGlobal on the raw value).
        POINT pt{GET_X_LPARAM(msg->lParam), GET_Y_LPARAM(msg->lParam)};
        ScreenToClient(msg->hwnd, &pt);
        const qreal dpr = devicePixelRatioF();
        const QPoint p{qRound(pt.x / dpr), qRound(pt.y / dpr)};

        constexpr int B = 6; // resize border thickness (logical px)
        const int w = width(), h = height();
        const bool maximized = isMaximized();
        auto overButton = [&] {
            QWidget *c = childAt(p);
            return qobject_cast<QAbstractButton *>(c) != nullptr;
        };

        if (!maximized) {
            const bool L = p.x() < B, R = p.x() > w - B;
            const bool T = p.y() < B, Bo = p.y() > h - B;
            if (T && L)      { *result = HTTOPLEFT;     return true; }
            if (T && R)      { *result = HTTOPRIGHT;    return true; }
            if (Bo && L)     { *result = HTBOTTOMLEFT;  return true; }
            if (Bo && R)     { *result = HTBOTTOMRIGHT; return true; }
            if (L)           { *result = HTLEFT;        return true; }
            if (R)           { *result = HTRIGHT;       return true; }
            if (Bo)          { *result = HTBOTTOM;      return true; }
            if (T && !overButton()) { *result = HTTOP;  return true; }
        }
        // Caption zone: our custom bar. Everything except buttons drags,
        // giving native drag + double-click + Aero Snap for free.
        if (p.y() <= m_titlebar->height() && !overButton()) {
            *result = HTCAPTION;
            return true;
        }
        *result = HTCLIENT;
        return true;
    }
    return QMainWindow::nativeEvent(eventType, message, result);
}
#endif

void MainWindow::buildTabBar() {
    // 36px top tab strip (docs: oler-tabbar-36px). Parented into the shell
    // layout in buildContentPages.
    m_tabBar = new QTabBar;
    m_tabBar->setFixedHeight(36);
    m_tabBar->setExpanding(false);
    m_tabBar->addTab(tr("编辑器"));      // 1st tab
    m_tabBar->addTab(tr("题库"));
    m_tabBar->addTab(tr("训练"));
    m_tabBar->addTab(tr("错题本"));
    m_tabBar->addTab(tr("AI 教练"));
    m_tabBar->addTab(tr("设置"));
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

    // Shell frame: titlebar / [56px rail | (36px tab strip / page stack)].
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

    auto *root = new QWidget;
    auto *rootLayout = new QVBoxLayout(root);
    rootLayout->setContentsMargins(0, 0, 0, 0);
    rootLayout->setSpacing(0);
    rootLayout->addWidget(m_titlebar);
    rootLayout->addWidget(shell, /*stretch*/ 1);

    setCentralWidget(root);

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
    refreshChromeIcons();
}

void MainWindow::openFile() {
    const QString path = QFileDialog::getOpenFileName(
        this, tr("打开源文件"), QString(),
        tr("源文件 (*.cpp *.cc *.cxx *.c *.h *.hpp *.py *.java);;所有文件 (*)"));
    if (path.isEmpty())
        return;
    if (!m_editorPage->loadFile(path)) {
        m_runPanel->showMessage(tr("<span style='color:#ff453a'>无法打开 %1</span>")
                                    .arg(path.toHtmlEscaped()));
        return;
    }
    m_runPanel->showMessage(tr("<span style='color:#6e6d68'>opened %1 鈥?"
                               "Ctrl+R to compile &amp; run</span>")
                                .arg(QFileInfo(path).fileName().toHtmlEscaped()));
}

bool MainWindow::saveCurrentFile(bool saveAs) {
    QString path = m_editorPage->filePath();
    if (path.isEmpty() || saveAs) {
        path = QFileDialog::getSaveFileName(
            this, tr("保存源文件"),
            path.isEmpty() ? QDir::homePath() + "/main.cpp" : path,
            tr("C++ 源文件 (*.cpp);;所有文件 (*)"));
        if (path.isEmpty())
            return false;
    }
    if (!m_editorPage->saveFile(path)) {
        m_runPanel->showMessage(tr("<span style='color:#ff453a'>无法写入 %1</span>")
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
            tr("<div style='color:#6e6d68'>未找到测试点：把 <b>tests/caseN.in/.out</b> "
               "或 <b>input.txt / output.txt</b> 放在 %1 旁边。</div>")
                .arg(QFileInfo(src).fileName().toHtmlEscaped()));
        return;
    }

    m_runPanel->showMessage(tr("<div style='color:#a0a0a3'>正在编译 %1 …</div>")
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
