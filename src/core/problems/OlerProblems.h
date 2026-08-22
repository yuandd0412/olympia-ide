#pragma once
#include <QObject>
#include <QString>
#include <QStringList>
#include <QVector>

struct OlerProblem {
    QString id;          // OJ-native id, e.g. "P1001" / "CF100A"
    QString title;
    QString oj;          // "Luogu" / "Codeforces" / "AtCoder"
    QString difficulty;  // 入门 / 普及 / 提高 / NOI (docs/09-glossary)
    QString url;
    QStringList tags;

    bool isValid() const { return !id.isEmpty(); }
};

// Problem store with a bounded "recently opened" ring. JSON-backed,
// lazily written like OlerSettings (save() is explicit).
class OlerProblems : public QObject {
    Q_OBJECT
public:
    explicit OlerProblems(const QString &filePath, QObject *parent = nullptr);

    QVector<OlerProblem> all() const;
    OlerProblem find(const QString &id) const;

    // Insert or update by id. Returns true if a new problem was added.
    bool upsert(const OlerProblem &p);
    bool remove(const QString &id);

    void touchRecent(const QString &id);
    QVector<OlerProblem> recent(int cap = 8) const;

    bool save(QString *errorOut = nullptr);

signals:
    void changed();

private:
    void load();
    int indexOf(const QString &id) const;

    QString m_path;
    QVector<OlerProblem> m_problems;
    QStringList m_recentIds;
};
