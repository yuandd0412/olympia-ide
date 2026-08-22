#pragma once
#include <QWidget>

class QComboBox;
class QSpinBox;
class QLineEdit;
class QListWidget;
class QStackedWidget;
class QFormLayout;

// Settings tab (docs/03-shell-pages/settings.md + 00-design-spec §4.5):
// left section rail, right control panes. Every control binds to an
// OlerSettings key and persists immediately.
class OlerSettingsPage : public QWidget {
    Q_OBJECT
public:
    explicit OlerSettingsPage(QWidget *parent = nullptr);

private slots:
    void onThemeChanged(const QString &theme);
    void detectCompiler();

private:
    QWidget *buildAppearancePane();
    QWidget *buildCompilerPane();
    QWidget *buildBudgetsPane();
    QWidget *buildTrainingPane();
    QWidget *group(const QString &title, QFormLayout *form);

    QListWidget *m_sections = nullptr;
    QStackedWidget *m_panes = nullptr;
    QSpinBox *m_fontSize = nullptr;
    QLineEdit *m_gxxPath = nullptr;
    QComboBox *m_optLevel = nullptr;
    QComboBox *m_stdFlag = nullptr;
    QSpinBox *m_timeMs = nullptr;
    QSpinBox *m_memoryMb = nullptr;
    QSpinBox *m_dailyGoal = nullptr;
};
