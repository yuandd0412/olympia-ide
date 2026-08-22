#pragma once
#include <QMainWindow>

class QToolBar;
class QTabBar;
class QStackedWidget;
class OlerEditor;

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

    QToolBar *m_activityBar = nullptr;  // 56px
    QTabBar *m_tabBar = nullptr;        // 36px
    QStackedWidget *m_pages = nullptr;
    OlerEditor *m_editorPage = nullptr;  // 1st tab (Editor)
};
