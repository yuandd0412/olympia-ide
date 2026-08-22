#pragma once
#include <QMainWindow>
#include <QVector>

class QTabBar;
class QStackedWidget;
class QLabel;
class QTimer;
class QToolButton;
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
    bool eventFilter(QObject *obj, QEvent *ev) override;

private slots:
    void onTabChanged(int index);
    void toggleMaxRestore();

private:
    void buildTitlebar();
    void buildActivityBar();
    void buildTabBar();
    void buildContentPages();
    QWidget *buildEditorPage();
    void openFile();
    bool saveCurrentFile(bool saveAs);
    void runCurrentFile();
    void openProblem(const OlerProblem &problem);

    QColor accentColor() const;
    void refreshChromeIcons();

    QWidget *m_titlebar = nullptr;      // 32px custom frameless caption
    QLabel *m_clock = nullptr;
    QTimer *m_clockTimer = nullptr;
    QToolButton *m_minBtn = nullptr;
    QToolButton *m_maxBtn = nullptr;
    QToolButton *m_closeBtn = nullptr;

    QWidget *m_activityRail = nullptr;          // 56px left rail
    QVector<QToolButton *> m_railButtons;
    QTabBar *m_tabBar = nullptr;        // 36px
    QStackedWidget *m_pages = nullptr;
    OlerEditor *m_editorPage = nullptr;      // 1st tab (Editor)
    OlerRunPanel *m_runPanel = nullptr;      // bottom half of the editor page
    QLabel *m_editorTitle = nullptr;         // file name + dirty dot
    OlerProblemsPage *m_problemsPage = nullptr; // 2nd tab
    OlerMistakesPage *m_mistakesPage = nullptr; // 4th tab
    OlerTrainingPage *m_trainingPage = nullptr; // 3rd tab
    OlerSettingsPage *m_settingsPage = nullptr; // 6th tab
    OlerAiPage *m_aiPage = nullptr;             // 5th tab
    OlerRunner *m_runner = nullptr;
};