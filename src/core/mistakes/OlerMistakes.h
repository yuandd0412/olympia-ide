#pragma once
#include <QDateTime>
#include <QObject>
#include <QString>
#include <QVector>

struct OlerMistake {
    int id = 0;          // auto-increment, persisted
    QString problemId;
    QString title;
    QString oj;
    QString verdict;     // WA / TLE / RE / CE (Verdict:: in OlerRunner.h)
    QDateTime when;
    bool reviewed = false;
};

// Mistake journal: every non-AC run can be journaled here. JSON-backed.
class OlerMistakes : public QObject {
    Q_OBJECT
public:
    static OlerMistakes *instance(); // ~/.oleride/mistakes.json

    explicit OlerMistakes(const QString &filePath, QObject *parent = nullptr);

    QVector<OlerMistake> entries(bool includeReviewed = false) const;

    // Appends a journal entry (reviewed=false). Returns the assigned id.
    int add(const OlerMistake &m);
    bool markReviewed(int id);
    bool remove(int id);

    // Verdict -> count for the filter rail (docs/03-shell-pages/mistakes.md).
    QHash<QString, int> counts() const;

    bool save(QString *errorOut = nullptr);

signals:
    void changed();
    void mistakeAdded(int id);

private:
    void load();
    int indexOf(int id) const;

    QString m_path;
    QVector<OlerMistake> m_entries;
    int m_nextId = 1;
};
