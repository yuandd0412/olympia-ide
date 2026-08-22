#pragma once
#include <QMainWindow>

class QToolBar;
class QTabBar;
class QStackedWidget;
class QLabel;
class OlerEditor;
class OlerRunner;
class OlerRunPanel;
class QTextEdit;

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

    QToolBar *m_activityBar = nullptr;  // 56px
    QTabBar *m_tabBar = nullptr;        // 36px
    QStackedWidget *m_pages = nullptr;
    OlerEditor *m_editorPage = nullptr;  // 1st tab (Editor)
    OlerRunPanel *m_runPanel = nullptr;  // bottom half of the editor page
    QLabel *m_editorTitle = nullptr;     // file name + dirty dot
    OlerRunner *m_runner = nullptr;
};
