#pragma once
#include <QObject>
#include <QDate>
#include <QVector>

// Solved-problem log keyed by date: drives the Training tab's streak,
// daily-goal progress, and 30-day chart (docs/03-shell-pages/training.md).
class OlerSolves : public QObject {
    Q_OBJECT
public:
    static OlerSolves *instance(); // ~/.oleride/solves.json

    explicit OlerSolves(const QString &filePath, QObject *parent = nullptr);

    void addSolve(const QDate &date);
    int countOn(const QDate &date) const;

    // Consecutive days with >= 1 solve, ending today (or yesterday if
    // nothing solved today yet — a streak must not die at midnight).
    int streak() const;

    bool save(QString *errorOut = nullptr);

signals:
    void changed();

private:
    void load();

    QString m_path;
    QHash<QDate, int> m_counts;
};
