#pragma once
#include <QWidget>
#include "core/problems/OlerProblems.h"

class QLineEdit;
class QLabel;
class QScrollArea;
class QGridLayout;
class QVBoxLayout;

// Problems tab — pixel port of pages/shell-problems.html:
// search(36px) → quick actions → recent horizontal strip → 4-col grid → stats.
class OlerProblemsPage : public QWidget {
    Q_OBJECT
public:
    explicit OlerProblemsPage(QWidget *parent = nullptr);

signals:
    void openRequested(const OlerProblem &problem);

private slots:
    void rebuild();
    void addProblem();

private:
    void rebuildRecent();
    QWidget *makeRecentCard(const OlerProblem &p);
    QWidget *makeCard(const OlerProblem &p);
    QWidget *buildStatsStrip();
    void refreshStats();

    OlerProblems *m_store;
    QLineEdit *m_search = nullptr;
    QWidget *m_recentRowHost = nullptr;
    QGridLayout *m_grid = nullptr;
    QWidget *m_gridHost = nullptr;
    QLabel *m_totalValue = nullptr;
    QLabel *m_solvedValue = nullptr;
    QLabel *m_streakValue = nullptr;
};
