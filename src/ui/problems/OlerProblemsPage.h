#pragma once
#include <QWidget>
#include "core/problems/OlerProblems.h"

class QLineEdit;
class QScrollArea;
class QGridLayout;
class QVBoxLayout;

// Problems tab (00-design-spec section 4.1): search bar, recent strip,
// problem-card grid. Dense file-browser style — no hero, no marketing.
class OlerProblemsPage : public QWidget {
    Q_OBJECT
public:
    explicit OlerProblemsPage(QWidget *parent = nullptr);

signals:
    // Double-click on a card: user wants to work on this problem.
    void openRequested(const OlerProblem &problem);

private slots:
    void rebuild();
    void addProblem();

private:
    void rebuildRecent();

    OlerProblems *m_store;
    QLineEdit *m_search = nullptr;
    QWidget *m_recentRow = nullptr;
    QVBoxLayout *m_recentLayout = nullptr;
    QScrollArea *m_scroll = nullptr;
    QWidget *m_gridHost = nullptr;
    QGridLayout *m_grid = nullptr;
};
