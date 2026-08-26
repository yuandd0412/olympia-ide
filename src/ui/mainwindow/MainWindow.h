#pragma once
#include <QMainWindow>
#include <QVector>

class QTabBar;
class QStackedWidget;
class QLabel;
class QTimer;
class QToolButton;
class QCloseEvent;
class QFileSystemModel;
class QTreeView;
class OlerEditor;

namespace OlerIcons { enum class Name; }

// Forward declarations for page widgets and models.
class OlerRunPanel;
class OlerProblemsPage;
class OlerMistakesPage;
class OlerTrainingPage;
class OlerSettingsPage;
class OlerAiPage;
class OlerRunner;
struct OlerProblem;
struct OlerMistake;

class MainWindow : public QMainWindow {
    Q_OBJECT
public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow() override;

protected:
#ifdef Q_OS_WIN
    bool nativeEvent(const QByteArray &eventType, void *message,
                     qint64 *result) override;
#endif
    void showEvent(QShowEvent *ev) override;
    void changeEvent(QEvent *ev) override;
    void closeEvent(QCloseEvent *ev) override;

private slots:
    void toggleMaxRestore();

private:
    void buildTitlebar();
#ifdef Q_OS_WIN
    void applyNativeWindowTreatments();
#endif
    void buildActivityBar();
    void buildContentPages();
    QWidget *buildEditorPage();
    void switchToPage(int index);
    void connectEditor(OlerEditor *editor);
    void activateEditor(int index);
    void updateEditorChrome();
    bool openEditorFile(const QString &path);
    void closeEditorTab(int index);
    void refreshWorkspace(const QString &filePath);
    void openFile();
    bool saveCurrentFile(bool saveAs);
    void runCurrentFile();
    void openProblem(const OlerProblem &problem);
    void redoMistake(const OlerMistake &mistake);
    bool confirmDocumentReplacement(OlerEditor *editor = nullptr);

    QColor accentColor() const;
    void refreshChromeIcons();

    QWidget *m_titlebar = nullptr;      // 32px custom frameless caption
    QLabel *m_logo = nullptr;
    QLabel *m_clock = nullptr;
    QTimer *m_clockTimer = nullptr;
    QToolButton *m_minBtn = nullptr;
    QToolButton *m_maxBtn = nullptr;
    QToolButton *m_closeBtn = nullptr;

    QWidget *m_activityRail = nullptr;          // 56px left rail
    QVector<QToolButton *> m_railButtons;
    QStackedWidget *m_pages = nullptr;
    QTabBar *m_editorTabs = nullptr;
    QStackedWidget *m_editorStack = nullptr;
    QVector<OlerEditor *> m_editors;
    QWidget *m_workspacePane = nullptr;
    QFileSystemModel *m_workspaceModel = nullptr;
    QTreeView *m_workspaceTree = nullptr;
    OlerEditor *m_editorPage = nullptr;      // 1st tab (Editor)
    OlerRunPanel *m_runPanel = nullptr;      // bottom half of the editor page
    QLabel *m_editorTitle = nullptr;         // file name + dirty dot
    QLabel *m_posLabel = nullptr;            // statusbar Ln/Col
    OlerProblemsPage *m_problemsPage = nullptr; // 2nd tab
    OlerMistakesPage *m_mistakesPage = nullptr; // 4th tab
    OlerTrainingPage *m_trainingPage = nullptr; // 3rd tab
    OlerSettingsPage *m_settingsPage = nullptr; // 6th tab
    OlerAiPage *m_aiPage = nullptr;             // 5th tab
    OlerRunner *m_runner = nullptr;
    bool m_runInProgress = false;
};
