#pragma once
#include <QWidget>

class QLabel;
class QVBoxLayout;

// Training tab (00-design-spec section 4.2): 3 KPI cards (Streak / Today
// goal / Total), planned-sessions empty state, 30-day bar chart.
class OlerTrainingPage : public QWidget {
    Q_OBJECT
public:
    explicit OlerTrainingPage(QWidget *parent = nullptr);

private slots:
    void rebuild();
    void rebuildSessions();

private:
    QLabel *m_streakValue = nullptr;
    QLabel *m_todayValue = nullptr;
    QLabel *m_totalValue = nullptr;
    QWidget *m_goalBar = nullptr;
    QWidget *m_sessionsHost = nullptr;
    QVBoxLayout *m_sessionsLayout = nullptr;
};
