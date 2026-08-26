#include "MainWindow.h"
#include "ui/common/OlerIcons.h"
#include "ui/common/OlerTheme.h"
#include "core/theme/CThemeManager.h"
#include <QAction>
#include <QCloseEvent>
#include <QDesktopServices>
#include <QDir>
#include <QFileDialog>
#include <QFile>
#include <QFileSystemModel>
#include <QHBoxLayout>
#include <QLabel>
#include <QSplitter>
#include <QStackedWidget>
#include <QStatusBar>
#include <QTabBar>
#include <QTimer>
#include <QToolButton>
#include <QTreeView>
#include <QVBoxLayout>
#include <QWindow>
#include <QFutureWatcher>
#include <QPainter>
#include <QPixmap>
#include <QMessageBox>
#include <QInputDialog>
#include <QLineEdit>
#include <QRegularExpression>
#include <QSvgRenderer>
#include <QTime>
#include <QUrl>
#include <QtConcurrent/QtConcurrentRun>
#include <utility>
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
    buildContentPages();

    connect(CThemeManager::instance(), &CThemeManager::themeChanged,
            this, [this](const QString &) {
                refreshChromeIcons();
                if (m_logo)
                    m_logo->setPixmap(
                        OlerIcons::make(OlerIcons::Name::Logo, accentColor(), 18)
                            .pixmap(18, 18));
            });

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

    // Right side: cursor position + encoding (mono, per docs/04-editor).
    m_posLabel = new QLabel(QStringLiteral("Ln 1, Col 1"), this);
    m_posLabel->setObjectName(QStringLiteral("posLabel"));
    statusBar()->addPermanentWidget(m_posLabel);
    auto *encTag = new QLabel(QStringLiteral("C++17"), this);
    encTag->setObjectName(QStringLiteral("encTag"));
    statusBar()->addPermanentWidget(encTag);
    statusBar()->addPermanentWidget(new QLabel(QStringLiteral("UTF-8"), this));
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

    // Logo: Aether brand mark (halo + star), tinted with the theme accent.
    {
        m_logo = new QLabel(m_titlebar);
        m_logo->setPixmap(OlerIcons::make(OlerIcons::Name::Logo,
                                          accentColor(), 18).pixmap(18, 18));
        layout->addWidget(m_logo);
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
        // Maximize-button glyph follows window state.
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
            switchToPage(
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
        // Strip the standard frame entirely. When maximized, a THICKFRAME
        // window overshoots the monitor by the resize-border width —
        // compensate so the client area lands exactly on-screen.
        auto *params = reinterpret_cast<NCCALCSIZE_PARAMS *>(msg->lParam);
        if (IsZoomed(msg->hwnd)) {
            const int pad = GetSystemMetrics(SM_CXFRAME) +
                            GetSystemMetrics(SM_CXPADDEDBORDER);
            params->rgrc[0].left += pad;
            params->rgrc[0].right -= pad;
            params->rgrc[0].bottom -= pad;
        }
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
    connect(m_mistakesPage, &OlerMistakesPage::redoRequested,
            this, &MainWindow::redoMistake);
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

    // Real file tab strip (docs/04-editor: active tab = surface + top accent).
    m_editorTabs = new QTabBar(page);
    m_editorTabs->setObjectName(QStringLiteral("edTabBar"));
    m_editorTabs->setFixedHeight(34);
    m_editorTabs->setExpanding(false);
    m_editorTabs->setMovable(false);
    m_editorTabs->setTabsClosable(true);
    connect(m_editorTabs, &QTabBar::currentChanged,
            this, &MainWindow::activateEditor);
    connect(m_editorTabs, &QTabBar::tabCloseRequested,
            this, &MainWindow::closeEditorTab);
    layout->addWidget(m_editorTabs);

    auto *editorShell = new QSplitter(Qt::Horizontal, page);
    editorShell->setObjectName(QStringLiteral("editorShell"));
    m_workspacePane = new QWidget(editorShell);
    m_workspacePane->setMinimumWidth(180);
    m_workspacePane->setMaximumWidth(280);
    auto *workspaceLayout = new QVBoxLayout(m_workspacePane);
    workspaceLayout->setContentsMargins(4, 4, 4, 4);
    workspaceLayout->setSpacing(4);

    auto *workspaceActions = new QHBoxLayout;
    workspaceActions->setContentsMargins(0, 0, 0, 0);
    workspaceActions->setSpacing(2);
    auto *newFileButton = new QToolButton(m_workspacePane);
    newFileButton->setText(QStringLiteral("+文件"));
    newFileButton->setToolTip(tr("在当前目录新建文件"));
    auto *newFolderButton = new QToolButton(m_workspacePane);
    newFolderButton->setText(QStringLiteral("+目录"));
    newFolderButton->setToolTip(tr("在当前目录新建文件夹"));
    auto *refreshButton = new QToolButton(m_workspacePane);
    refreshButton->setText(QStringLiteral("刷新"));
    refreshButton->setToolTip(tr("刷新文件树"));
    auto *openFolderButton = new QToolButton(m_workspacePane);
    openFolderButton->setText(QStringLiteral("打开"));
    openFolderButton->setToolTip(tr("在系统文件管理器中打开当前目录"));
    workspaceActions->addWidget(newFileButton);
    workspaceActions->addWidget(newFolderButton);
    workspaceActions->addWidget(refreshButton);
    workspaceActions->addWidget(openFolderButton);
    workspaceActions->addStretch();
    workspaceLayout->addLayout(workspaceActions);

    m_workspaceTree = new QTreeView(m_workspacePane);
    m_workspaceTree->setObjectName(QStringLiteral("workspaceTree"));
    m_workspaceTree->setHeaderHidden(true);
    m_workspaceTree->setAnimated(true);
    m_workspaceModel = new QFileSystemModel(m_workspaceTree);
    m_workspaceModel->setFilter(QDir::AllEntries | QDir::NoDotAndDotDot);
    m_workspaceTree->setModel(m_workspaceModel);
    for (int column = 1; column < 4; ++column)
        m_workspaceTree->hideColumn(column);
    connect(m_workspaceTree, &QTreeView::doubleClicked, this,
            [this](const QModelIndex &index) {
                if (!m_workspaceModel->isDir(index))
                    openEditorFile(m_workspaceModel->filePath(index));
            });
    workspaceLayout->addWidget(m_workspaceTree, 1);

    const auto currentWorkspaceDirectory = [this]() {
        if (!m_editorPage || m_editorPage->filePath().isEmpty())
            return QString();
        return QFileInfo(m_editorPage->filePath()).absolutePath();
    };
    const auto validEntryName = [](const QString &name) {
        if (name.isEmpty() || QFileInfo(name).fileName() != name ||
            name == QStringLiteral(".") || name == QStringLiteral(".."))
            return false;
        return !name.contains(QRegularExpression(QStringLiteral("[<>:\"/\\\\|?*]")));
    };
    const auto requireWorkspace = [this, currentWorkspaceDirectory]() {
        const QString directory = currentWorkspaceDirectory();
        if (!directory.isEmpty())
            return directory;
        QMessageBox::information(this, tr("工作区"),
                                 tr("请先打开一个本地源文件。"));
        return QString();
    };
    connect(newFileButton, &QToolButton::clicked, this,
            [this, currentWorkspaceDirectory, validEntryName, requireWorkspace] {
                const QString directory = requireWorkspace();
                if (directory.isEmpty())
                    return;
                bool ok = false;
                const QString name = QInputDialog::getText(
                    this, tr("新建文件"), tr("文件名："), QLineEdit::Normal,
                    QStringLiteral("new.cpp"), &ok).trimmed();
                if (!ok)
                    return;
                if (!validEntryName(name)) {
                    QMessageBox::warning(this, tr("新建文件"),
                                         tr("文件名无效，请输入不带路径的文件名。"));
                    return;
                }
                const QString path = QDir(directory).filePath(name);
                if (QFileInfo::exists(path)) {
                    QMessageBox::warning(this, tr("新建文件"),
                                         tr("文件已存在：%1").arg(name));
                    return;
                }
                QFile file(path);
                if (!file.open(QIODevice::WriteOnly | QIODevice::Text)) {
                    QMessageBox::warning(this, tr("新建文件"),
                                         tr("无法创建文件：%1").arg(path));
                    return;
                }
                file.close();
                openEditorFile(path);
            });
    connect(newFolderButton, &QToolButton::clicked, this,
            [this, currentWorkspaceDirectory, validEntryName, requireWorkspace] {
                const QString directory = requireWorkspace();
                if (directory.isEmpty())
                    return;
                bool ok = false;
                const QString name = QInputDialog::getText(
                    this, tr("新建文件夹"), tr("文件夹名："), QLineEdit::Normal,
                    QStringLiteral("new-folder"), &ok).trimmed();
                if (!ok)
                    return;
                if (!validEntryName(name)) {
                    QMessageBox::warning(this, tr("新建文件夹"),
                                         tr("文件夹名无效，请输入不带路径的名称。"));
                    return;
                }
                const QString path = QDir(directory).filePath(name);
                if (!QDir().mkdir(path)) {
                    QMessageBox::warning(this, tr("新建文件夹"),
                                         tr("无法创建文件夹，可能已经存在：%1").arg(name));
                    return;
                }
                refreshWorkspace(m_editorPage->filePath());
            });
    connect(refreshButton, &QToolButton::clicked, this,
            [this, requireWorkspace] {
                if (!requireWorkspace().isEmpty())
                    refreshWorkspace(m_editorPage->filePath());
            });
    connect(openFolderButton, &QToolButton::clicked, this,
            [this, requireWorkspace] {
                const QString directory = requireWorkspace();
                if (!directory.isEmpty())
                    QDesktopServices::openUrl(QUrl::fromLocalFile(directory));
            });

    auto *splitter = new QSplitter(Qt::Vertical, editorShell);
    m_editorStack = new QStackedWidget(splitter);
    m_editorPage = new OlerEditor(m_editorStack);
    m_editorStack->addWidget(m_editorPage);
    m_editors.append(m_editorPage);
    connectEditor(m_editorPage);
    m_runPanel = new OlerRunPanel(splitter);
    splitter->addWidget(m_editorStack);
    splitter->addWidget(m_runPanel);
    splitter->setStretchFactor(0, 3);
    splitter->setStretchFactor(1, 1);
    splitter->setSizes({600, 200});
    editorShell->addWidget(m_workspacePane);
    editorShell->addWidget(splitter);
    editorShell->setStretchFactor(1, 1);
    layout->addWidget(editorShell, /*stretch*/ 1);

    // Sample code for first-run; not associated with any file.
    m_editorPage->setPlainText(
        "// Oler IDE v2 - sample C++\n"
        "#include <iostream>\n"
        "\n"
        "int main() {\n"
        "    std::cout << \"Hello, OI!\" << std::endl;\n"
        "    return 0;\n"
        "}\n");

    m_editorTabs->addTab(QStringLiteral("main.cpp"));
    m_editorTabs->setCurrentIndex(0);
    updateEditorChrome();

    return page;
}

void MainWindow::connectEditor(OlerEditor *editor) {
    connect(editor, &OlerEditor::fileChanged, this,
            [this, editor](const QString &) {
                const int index = m_editors.indexOf(editor);
                if (index >= 0 && m_editorTabs) {
                    const QString name = editor->filePath().isEmpty()
                                             ? QStringLiteral("main.cpp")
                                             : QFileInfo(editor->filePath()).fileName();
                    m_editorTabs->setTabText(
                        index, name + (editor->document()->isModified()
                                          ? QStringLiteral(" *")
                                          : QString()));
                    m_editorTabs->setTabToolTip(
                        index, editor->filePath().isEmpty()
                                   ? QStringLiteral("未保存文件")
                                   : editor->filePath());
                }
                if (editor == m_editorPage)
                    updateEditorChrome();
            });
    connect(editor->document(), &QTextDocument::modificationChanged, this,
            [this, editor](bool) {
                if (editor == m_editorPage)
                    updateEditorChrome();
            });
    connect(editor, &QPlainTextEdit::cursorPositionChanged, this,
            [this, editor] {
                if (editor != m_editorPage || !m_posLabel)
                    return;
                const QTextCursor c = editor->textCursor();
                m_posLabel->setText(QStringLiteral("Ln %1, Col %2")
                                        .arg(c.blockNumber() + 1)
                                        .arg(c.positionInBlock() + 1));
            });
}

void MainWindow::activateEditor(int index) {
    if (index < 0 || index >= m_editors.size())
        return;
    m_editorPage = m_editors.at(index);
    if (m_editorStack)
        m_editorStack->setCurrentIndex(index);
    updateEditorChrome();
}

void MainWindow::updateEditorChrome() {
    if (!m_editorPage)
        return;
    const QString name = m_editorPage->filePath().isEmpty()
                             ? QStringLiteral("main.cpp")
                             : QFileInfo(m_editorPage->filePath()).fileName();
    const QString decorated =
        name + (m_editorPage->document()->isModified()
                    ? QStringLiteral(" *")
                    : QString());
    if (m_editorTabs) {
        const int index = m_editors.indexOf(m_editorPage);
        if (index >= 0) {
            m_editorTabs->setTabText(index, decorated);
            m_editorTabs->setTabToolTip(
                index, m_editorPage->filePath().isEmpty()
                           ? QStringLiteral("未保存文件")
                           : m_editorPage->filePath());
        }
    }
    if (m_editorTitle)
        m_editorTitle->setText(decorated);
    if (m_posLabel) {
        const QTextCursor c = m_editorPage->textCursor();
        m_posLabel->setText(QStringLiteral("Ln %1, Col %2")
                                .arg(c.blockNumber() + 1)
                                .arg(c.positionInBlock() + 1));
    }
    refreshWorkspace(m_editorPage->filePath());
}

void MainWindow::refreshWorkspace(const QString &filePath) {
    if (!m_workspaceTree || !m_workspaceModel)
        return;
    if (filePath.isEmpty()) {
        if (m_workspacePane)
            m_workspacePane->setVisible(false);
        return;
    }
    const QString directory = QFileInfo(filePath).absolutePath();
    if (m_workspaceModel->rootPath() != directory)
        m_workspaceModel->setRootPath(directory);
    m_workspaceTree->setRootIndex(m_workspaceModel->index(directory));
    m_workspaceTree->setCurrentIndex(m_workspaceModel->index(filePath));
    if (m_workspacePane)
        m_workspacePane->setVisible(true);
}

bool MainWindow::openEditorFile(const QString &path) {
    const QString absolute = QFileInfo(path).absoluteFilePath();
    for (int i = 0; i < m_editors.size(); ++i) {
        if (!m_editors.at(i)->filePath().isEmpty() &&
            QFileInfo(m_editors.at(i)->filePath()).absoluteFilePath() == absolute) {
            m_editorTabs->setCurrentIndex(i);
            return true;
        }
    }

    auto *editor = new OlerEditor(m_editorStack);
    if (!editor->loadFile(absolute)) {
        editor->deleteLater();
        m_runPanel->showMessage(
            tr("<span style='color:#ff453a'>无法打开 %1</span>")
                .arg(absolute.toHtmlEscaped()));
        return false;
    }
    connectEditor(editor);
    m_editorStack->addWidget(editor);
    m_editors.append(editor);
    m_editorTabs->addTab(QFileInfo(absolute).fileName());
    m_editorTabs->setCurrentIndex(m_editors.size() - 1);
    return true;
}

void MainWindow::closeEditorTab(int index) {
    if (index < 0 || index >= m_editors.size() || m_editors.size() <= 1)
        return;
    OlerEditor *editor = m_editors.at(index);
    if (!confirmDocumentReplacement(editor))
        return;

    m_editorStack->removeWidget(editor);
    m_editors.removeAt(index);
    m_editorTabs->removeTab(index);
    editor->deleteLater();
    const int next = qMin(index, m_editors.size() - 1);
    m_editorTabs->setCurrentIndex(next);
}

void MainWindow::switchToPage(int index) {
    if (!m_pages || index < 0) return;
    m_pages->setCurrentIndex(index);
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
    if (!confirmDocumentReplacement())
        return;
    if (!openEditorFile(path))
        return;
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
    static const QRegularExpression safeId(
        QStringLiteral("^[A-Za-z0-9_-]{1,64}$"));
    if (!safeId.match(problem.id).hasMatch()) {
        m_runPanel->showMessage(
            tr("<span style='color:#ff453a'>题目 ID 包含非法路径字符</span>"));
        return;
    }
    if (!confirmDocumentReplacement())
        return;

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
                    .arg(problem.id,
                         problem.title.simplified().replace(
                             QRegularExpression(QStringLiteral("[\\r\\n]+")),
                             QStringLiteral(" ")),
                         problem.oj);
            f.write(tmpl.toUtf8());
        }
    }
    if (!openEditorFile(mainCpp))
        return;
    switchToPage(0); // switch to Editor
}

void MainWindow::redoMistake(const OlerMistake &mistake) {
    if (!mistake.title.isEmpty() && QFileInfo::exists(mistake.title)) {
        if (!confirmDocumentReplacement())
            return;
        if (openEditorFile(mistake.title))
            switchToPage(0);
        return;
    }

    const OlerProblem problem = OlerProblems::instance()->find(mistake.problemId);
    if (problem.isValid()) {
        openProblem(problem);
        return;
    }
    m_runPanel->showMessage(
        tr("<span style='color:#ff453a'>找不到该错题对应的源文件或题目</span>"));
}

bool MainWindow::confirmDocumentReplacement(OlerEditor *editor) {
    OlerEditor *target = editor ? editor : m_editorPage;
    if (!target || !target->document()->isModified())
        return true;

    QMessageBox box(QMessageBox::Warning, tr("未保存的修改"),
                    tr("当前文件有未保存的修改，要先保存吗？"),
                    QMessageBox::Save | QMessageBox::Discard |
                        QMessageBox::Cancel,
                    this);
    box.setDefaultButton(QMessageBox::Save);
    const auto choice = static_cast<QMessageBox::StandardButton>(box.exec());
    if (choice == QMessageBox::Save) {
        if (target == m_editorPage)
            return saveCurrentFile(false);
        QString path = target->filePath();
        if (path.isEmpty()) {
            path = QFileDialog::getSaveFileName(
                this, tr("保存源文件"), QDir::homePath() + "/main.cpp",
                tr("C++ 源文件 (*.cpp);;所有文件 (*)"));
            if (path.isEmpty())
                return false;
        }
        return target->saveFile(path);
    }
    return choice == QMessageBox::Discard;
}

void MainWindow::closeEvent(QCloseEvent *ev) {
    for (OlerEditor *editor : std::as_const(m_editors)) {
        if (!confirmDocumentReplacement(editor)) {
            ev->ignore();
            return;
        }
    }
    ev->accept();
}

void MainWindow::runCurrentFile() {
    if (m_runInProgress) {
        m_runPanel->showMessage(
            tr("<div style='color:#ff9f0a'>已有评测正在运行，请等待当前任务完成。</div>"));
        return;
    }

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
    m_runInProgress = true;

    const OlerRunnerConfig cfg = OlerRunnerConfig::fromSettings(OlerSettings::instance());
    auto *watcher = new QFutureWatcher<OlerRunResult>(this);
    connect(watcher, &QFutureWatcher<OlerRunResult>::finished, this,
            [this, watcher, src] {
                const OlerRunResult result = watcher->result();
                m_runInProgress = false;
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
