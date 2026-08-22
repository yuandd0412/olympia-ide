#pragma once
#include <QWidget>
#include "core/mistakes/OlerMistakes.h"

class QTableWidget;
class QLabel;

// Mistakes tab (00-design-spec section 4.3): verdict filter chips,
// journal list, frequency heatmap hint rail.
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
