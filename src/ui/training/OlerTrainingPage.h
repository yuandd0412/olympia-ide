#pragma once
#include <QWidget>

class QLabel;

// Training tab (docs/03-shell-pages/training.md): streak counter,
// daily-goal progress, last-30-days bar chart. Data: OlerSolves log.
class OlerTrainingPage : public QWidget {
    Q_OBJECT
public:
    explicit OlerTrainingPage(QWidget *parent = nullptr);

private slots:
    void rebuild();

private:
    QLabel *m_streakLabel = nullptr;
    QLabel *m_goalLabel = nullptr;
    QWidget *m_goalBar = nullptr;
};
