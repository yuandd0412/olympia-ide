#pragma once
#include <QWidget>
#include "core/problems/OlerProblems.h"

class QLineEdit;
class QLabel;
class QScrollArea;
class QGridLayout;
class QVBoxLayout;
class OlerIngest;

// Problems tab — pixel port of pages/shell-problems.html:
// search(36px) → quick actions → recent horizontal strip → 4-col grid → stats.
class OlerProblemsPage : public QWidget {
    Q_OBJECT
public:
    explicit OlerProblemsPage(QWidget *parent = nullptr);
    void focusSearch();

signals:
    void openRequested(const OlerProblem &problem);

private slots:
    void rebuild();
    void addProblem();
    void pullProblem();
    void importSheet();

private:
    void rebuildRecent();
    QWidget *makeRecentCard(const OlerProblem &p);
    QWidget *makeCard(const OlerProblem &p);
    void showCardContextMenu(const OlerProblem &p, const QPoint &globalPos);
    QWidget *buildStatsStrip();
    void refreshStats();

    OlerProblems *m_store = nullptr;
    OlerIngest *m_ingest = nullptr;
    QLineEdit *m_search = nullptr;
    QWidget *m_recentRowHost = nullptr;
    QGridLayout *m_grid = nullptr;
    QWidget *m_gridHost = nullptr;
    QLabel *m_totalValue = nullptr;
    QLabel *m_solvedValue = nullptr;
    QLabel *m_streakValue = nullptr;
};
