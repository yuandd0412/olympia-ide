#pragma once
#include <QWidget>
#include "core/mistakes/OlerMistakes.h"

class QTableWidget;
class QLabel;

// Mistakes tab (docs/03-shell-pages/mistakes.md): verdict filter rail,
// journal list, review actions. Verdict color is the primary dimension.
class OlerMistakesPage : public QWidget {
    Q_OBJECT
public:
    explicit OlerMistakesPage(QWidget *parent = nullptr);

private slots:
    void rebuild();
    void markReviewed();
    void removeSelected();

private:
    OlerMistakes *m_store;
    QLabel *m_countsLabel = nullptr;
    QString m_verdictFilter; // empty = all
    QTableWidget *m_table = nullptr;
};
