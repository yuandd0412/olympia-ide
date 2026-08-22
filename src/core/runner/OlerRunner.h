#pragma once
#include <QObject>
#include <QString>
#include <QStringList>
#include <QVector>

class OlerSettings;

// Verdict codes are the canonical UI vocabulary (docs/09-glossary/terms.md).
namespace Verdict {
inline constexpr const char *AC = "AC";
inline constexpr const char *WA = "WA";
inline constexpr const char *TLE = "TLE";
inline constexpr const char *RE = "RE";
inline constexpr const char *CE = "CE";
}

struct OlerTestCase {
    QString inputFile;     // stdin payload fed to the program
    QString expectedFile;  // reference output compared against stdout
};

struct OlerCaseResult {
    int index = -1;
    QString verdict;       // one of Verdict::*
    qint64 timeMs = 0;
    qint64 memoryKb = -1;  // -1 = not measured
};

struct OlerRunResult {
    bool compileOk = false;
    QString compileCommand;
    QString compileOutput; // g++ stderr/stdout verbatim
    QVector<OlerCaseResult> cases;
};

struct OlerRunnerConfig {
    QString gxxPath;
    QStringList compileFlags; // full flag list except source/output
    int timeLimitMs = 1000;
    int memoryLimitMb = 64;

    static OlerRunnerConfig fromSettings(const OlerSettings *settings);
};

// Synchronous local-judge pipeline: compile once, then evaluate every
// test case with real time/memory measurement. Phase 5 UI can wrap this
// in a worker thread without changing the API.
class OlerRunner : public QObject {
    Q_OBJECT
public:
    explicit OlerRunner(QObject *parent = nullptr);

    OlerRunResult run(const OlerRunnerConfig &config,
                      const QString &sourcePath,
                      const QVector<OlerTestCase> &cases);

    // Convention-based sample lookup relative to the source folder:
    //   1. tests/<name>.in + tests/<name>.out pairs (sorted)
    //   2. fallback: <dir>/input.txt + <dir>/output.txt
    static QVector<OlerTestCase> discoverCases(const QString &sourcePath);

private:
    bool compile(const OlerRunnerConfig &config,
                 const QString &sourcePath,
                 const QString &exePath,
                 OlerRunResult &result);

    void evaluateCase(const QString &exePath,
                      const OlerTestCase &tc,
                      int index,
                      const OlerRunnerConfig &config,
                      OlerCaseResult &out);
};
