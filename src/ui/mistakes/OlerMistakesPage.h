#pragma once
#include <QWidget>
#include "core/mistakes/OlerMistakes.h"

class QVBoxLayout;
class QLabel;

// Mistakes tab — pixel port of pages/shell-mistakes.html: verdict filter
// chips, card rows with left verdict stripe, 7x4 heatmap hint rail.
class OlerMistakesPage : public QWidget {
    Q_OBJECT
public:
    explicit OlerMistakesPage(QWidget *parent = nullptr);

signals:
    // "重做" clicked: user wants the problem re-opened in the editor.
    void redoRequested(const QString &problemId);

private slots:
    void rebuild();

private:
    void refreshChips();
    QWidget *buildRow(const OlerMistake &m);

    OlerMistakes *m_store;
    QString m_verdictFilter; // empty = all
    QVBoxLayout *m_listLayout = nullptr;
    QWidget *m_listHost = nullptr;
};
