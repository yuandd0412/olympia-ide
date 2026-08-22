#pragma once
#include <QMainWindow>
#include <QVector>

class QToolBar;
class QTabBar;
class QStackedWidget;
class QLabel;
class QToolButton;
class QWidget;
class OlerEditor;
class OlerRunner;
class OlerRunPanel;
class OlerProblemsPage;
class OlerMistakesPage;
class OlerTrainingPage;
class OlerSettingsPage;
class OlerAiPage;
struct OlerProblem;

class MainWindow : public QMainWindow {
    Q_OBJECT
public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow() override;

private slots:
    void onTabChanged(int index);

private:
    void buildActivityBar();
    void buildTabBar();
    void buildContentPages();
    QWidget *buildEditorPage();
    void openFile();
    bool saveCurrentFile(bool saveAs);
    void runCurrentFile();
    void openProblem(const OlerProblem &problem);

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
