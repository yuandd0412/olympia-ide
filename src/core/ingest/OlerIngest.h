#pragma once
#include "core/problems/OlerProblems.h"
#include <QObject>
#include <QString>
#include <QVector>
#include <QPair>

class QNetworkAccessManager;
class QNetworkReply;

struct OlerProblemDetail {
    OlerProblem meta;
    QString description;
    int timeLimitMs = 1000;
    int memoryLimitMb = 128;
    QVector<QPair<QString, QString>> samples; // <input, output>

    bool isValid() const { return !meta.id.isEmpty(); }
};

class OlerIngest : public QObject {
    Q_OBJECT
public:
    explicit OlerIngest(QObject *parent = nullptr);
    ~OlerIngest() override;

    // Asynchronous network fetch for supported OJ (e.g. Luogu).
    void fetchProblem(const QString &pid);

    // Static parsing helpers (pure logic, fully unit-testable offline).
    static bool parseLuoguJson(const QByteArray &jsonData, const QString &pid,
                               OlerProblemDetail &detail, QString *errorOut = nullptr);

    static QVector<OlerProblemDetail> parseProblemSheetJson(
        const QByteArray &jsonData, QString *errorOut = nullptr);

    static QVector<OlerProblemDetail> parseMarkdownSheet(
        const QString &markdownText);

    // Creates the problem workspace directory at ~/.oleride/workspace/<id>/,
    // initializes main.cpp, writes tests/caseN.in and tests/caseN.out,
    // and upserts the problem in OlerProblems store.
    static bool createWorkspace(const OlerProblemDetail &detail,
                                QString *outMainCpp = nullptr,
                                QString *errorOut = nullptr);

signals:
    void problemFetched(const OlerProblemDetail &detail);
    void fetchFailed(const QString &pid, const QString &errorMessage);

private slots:
    void onReplyFinished(QNetworkReply *reply);

private:
    QNetworkAccessManager *m_nam = nullptr;
};
