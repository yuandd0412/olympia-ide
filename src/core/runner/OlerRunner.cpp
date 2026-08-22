#include "OlerRunner.h"
#include "core/settings/OlerSettings.h"
#include <QElapsedTimer>
#include <QFile>
#include <QFileInfo>
#include <QProcess>
#include <QTemporaryDir>

#ifdef Q_OS_WIN
#include <windows.h>
#include <psapi.h>
#endif

namespace {

constexpr int kCompileTimeoutMs = 30000;

// OI-style comparison: per-line right-trim, ignore trailing blank lines.
bool outputsMatch(const QString &expectedPath, const QString &actualPath) {
    QFile ef(expectedPath), af(actualPath);
    if (!ef.open(QIODevice::ReadOnly | QIODevice::Text)) return false;
    if (!af.open(QIODevice::ReadOnly | QIODevice::Text)) return false;
    auto readLines = [](QFile &f) {
        QStringList lines;
        for (const QString &raw : QString::fromUtf8(f.readAll()).split(QLatin1Char('\n')))
            lines << QString(raw).remove(QLatin1Char('\r'));
        while (!lines.isEmpty() && lines.last().trimmed().isEmpty())
            lines.removeLast();
        return lines;
    };
    return readLines(ef) == readLines(af);
}

qint64 peakWorkingSetKb(qint64 pid) {
#ifdef Q_OS_WIN
    HANDLE h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, static_cast<DWORD>(pid));
    if (!h) return -1;
    PROCESS_MEMORY_COUNTERS pmc{};
    qint64 kb = -1;
    if (GetProcessMemoryInfo(h, &pmc, sizeof(pmc)))
        kb = static_cast<qint64>(pmc.PeakWorkingSetSize) / 1024;
    CloseHandle(h);
    return kb;
#else
    return -1;
#endif
}

} // namespace

OlerRunnerConfig OlerRunnerConfig::fromSettings(const OlerSettings *settings) {
    OlerRunnerConfig c;
    c.gxxPath = settings->value("compiler/gxxPath").toString();
    c.compileFlags = QStringList{
        settings->value("compiler/stdFlag").toString(),
        settings->value("compiler/optLevel").toString(),
    };
    const QString extra = settings->value("compiler/extraFlags").toString().trimmed();
    if (!extra.isEmpty())
        c.compileFlags += extra.split(QLatin1Char(' '), Qt::SkipEmptyParts);
    c.timeLimitMs = settings->value("limits/timeMs").toInt();
    c.memoryLimitMb = settings->value("limits/memoryMb").toInt();
    return c;
}

OlerRunner::OlerRunner(QObject *parent) : QObject(parent) {}

QVector<OlerTestCase> OlerRunner::discoverCases(const QString &sourcePath) {
    QVector<OlerTestCase> cases;
    const QDir srcDir(QFileInfo(sourcePath).absolutePath());

    // 1. tests/*.in paired with same-basename .out, name-sorted.
    const QDir testsDir(srcDir.filePath(QStringLiteral("tests")));
    if (testsDir.exists()) {
        const QStringList inFiles =
            testsDir.entryList({QStringLiteral("*.in")}, QDir::Files, QDir::Name);
        for (const QString &in : inFiles) {
            const QFileInfo fi(testsDir.filePath(in));
            const QString out = fi.completeBaseName() + QStringLiteral(".out");
            if (QFileInfo::exists(testsDir.filePath(out))) {
                cases.append({fi.absoluteFilePath(), testsDir.filePath(out)});
            }
        }
    }
    if (!cases.isEmpty())
        return cases;

    // 2. Legacy single-sample layout: input.txt / output.txt.
    const QString in = srcDir.filePath(QStringLiteral("input.txt"));
    const QString out = srcDir.filePath(QStringLiteral("output.txt"));
    if (QFileInfo::exists(in) && QFileInfo::exists(out))
        cases.append({in, out});
    return cases;
}

bool OlerRunner::compile(const OlerRunnerConfig &config,
                         const QString &sourcePath,
                         const QString &exePath,
                         OlerRunResult &result) {
    result.compileCommand = QStringLiteral("%1 %2 %3 -o %4")
                                .arg(config.gxxPath,
                                     config.compileFlags.join(QLatin1Char(' ')),
                                     sourcePath, exePath);
    QProcess gxx;
    gxx.setProgram(config.gxxPath);
    gxx.setArguments(config.compileFlags + QStringList{sourcePath, "-o", exePath});
    gxx.start();
    if (!gxx.waitForStarted(kCompileTimeoutMs)) {
        result.compileOutput = QStringLiteral("failed to start compiler: %1")
                                   .arg(config.gxxPath);
        return false;
    }
    if (!gxx.waitForFinished(kCompileTimeoutMs)) {
        gxx.kill();
        gxx.waitForFinished(2000);
        result.compileOutput = QStringLiteral("compilation timed out after %1 ms")
                                   .arg(kCompileTimeoutMs);
        return false;
    }
    result.compileOutput =
        QString::fromUtf8(gxx.readAllStandardError() + gxx.readAllStandardOutput());
    return gxx.exitStatus() == QProcess::NormalExit && gxx.exitCode() == 0;
}

void OlerRunner::evaluateCase(const QString &exePath,
                              const OlerTestCase &tc,
                              int index,
                              const OlerRunnerConfig &config,
                              OlerCaseResult &out) {
    out.index = index;
    out.verdict = Verdict::RE;

    QTemporaryDir scratch;
    if (!scratch.isValid())
        return;
    const QString actualPath = scratch.filePath(QStringLiteral("out.txt"));

    QProcess proc;
    proc.setProgram(exePath);
    proc.setStandardInputFile(tc.inputFile);
    proc.setStandardOutputFile(actualPath);

#ifdef Q_OS_WIN
    // Crash fast-fail: without SEM_NOGPFAULTERRORBOX, WER intercepts the
    // crashing child and the process handle stays unsignaled for seconds,
    // which misclassifies RE as TLE. The mode is inherited by children.
    const UINT oldErrorMode = ::SetErrorMode(SEM_NOGPFAULTERRORBOX | SEM_FAILCRITICALERRORS);
#endif

    QElapsedTimer timer;
    timer.start();
    proc.start();

    if (!proc.waitForStarted()) {
        out.timeMs = timer.elapsed();
#ifdef Q_OS_WIN
        ::SetErrorMode(oldErrorMode);
#endif
        return; // RE: could not launch
    }

    // Poll loop: sample peak memory and enforce the time budget.
    qint64 peakKb = -1;
    bool killedForTime = false;
    forever {
#ifdef Q_OS_WIN
        const qint64 sample = peakWorkingSetKb(proc.processId());
        if (sample > peakKb) peakKb = sample;
#endif
        if (proc.waitForFinished(20)) {
            break;
        }
        if (timer.elapsed() > config.timeLimitMs) {
            proc.kill();
            proc.waitForFinished(2000);
            killedForTime = true;
            break;
        }
    }

#ifdef Q_OS_WIN
    ::SetErrorMode(oldErrorMode);
#endif

    out.timeMs = timer.elapsed();
    out.memoryKb = peakKb;

    if (killedForTime || timer.elapsed() > config.timeLimitMs) {
        out.verdict = Verdict::TLE;
        return;
    }

    if (proc.exitStatus() != QProcess::NormalExit ||
        proc.exitCode() != 0) {
        out.verdict = Verdict::RE;
        return;
    }

    out.verdict = outputsMatch(tc.expectedFile, actualPath)
                      ? Verdict::AC
                      : Verdict::WA;
}

OlerRunResult OlerRunner::run(const OlerRunnerConfig &config,
                              const QString &sourcePath,
                              const QVector<OlerTestCase> &cases) {
    OlerRunResult result;

    QTemporaryDir workDir;
    if (!workDir.isValid()) {
        result.compileOutput = QStringLiteral("cannot create temp build dir");
        return result;
    }
    const QString exePath =
        workDir.filePath(QFileInfo(sourcePath).completeBaseName() + ".exe");

    result.compileOk = compile(config, sourcePath, exePath, result);
    if (!result.compileOk) {
        for (int i = 0; i < cases.size(); ++i) {
            OlerCaseResult r;
            r.index = i;
            r.verdict = Verdict::CE;
            result.cases.append(r);
        }
        return result;
    }

    for (int i = 0; i < cases.size(); ++i) {
        OlerCaseResult r;
        evaluateCase(exePath, cases.at(i), i, config, r);
        result.cases.append(r);
    }
    return result;
}
