#pragma once
#include <QWidget>
#include "core/problems/OlerProblems.h"

class QLineEdit;
class QTableWidget;
class QLabel;

// Problems tab (docs/03-shell-pages/problems.md): search bar, problem
// cards, recent strip. Dense list style — no hero, no marketing chrome.
class OlerProblemsPage : public QWidget {
    Q_OBJECT
public:
    explicit OlerProblemsPage(QWidget *parent = nullptr);

signals:
    // Double-click / Enter on a card: user wants to work on this problem.
    void openRequested(const OlerProblem &problem);

private slots:
    void rebuild();
    void addProblem();

private:
    void openRow(int row);

    OlerProblems *m_store;
    QLineEdit *m_search = nullptr;
    QLabel *m_recentLabel = nullptr;
    QTableWidget *m_table = nullptr;
};
