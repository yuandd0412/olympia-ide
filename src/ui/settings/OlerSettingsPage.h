#pragma once
#include <QWidget>

class QComboBox;
class QSpinBox;
class QLineEdit;

// Settings tab (docs/03-shell-pages/settings.md): flat grouped sections,
// every control bound to an OlerSettings key and persisted immediately.
class OlerSettingsPage : public QWidget {
    Q_OBJECT
public:
    explicit OlerSettingsPage(QWidget *parent = nullptr);

private slots:
    void onThemeChanged(const QString &theme);
    void detectCompiler();

private:
    QComboBox *m_theme = nullptr;
    QSpinBox *m_fontSize = nullptr;
    QLineEdit *m_gxxPath = nullptr;
    QComboBox *m_optLevel = nullptr;
    QComboBox *m_stdFlag = nullptr;
    QSpinBox *m_timeMs = nullptr;
    QSpinBox *m_memoryMb = nullptr;
    QSpinBox *m_dailyGoal = nullptr;
};
