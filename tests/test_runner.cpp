// test_runner: regression test for OlerRunner (Phase 4b).
// Exercises the full pipeline with the real MinGW g++: AC, WA, TLE, RE,
// CE paths. Requires a desktop-less environment is fine (QProcess only,
// no QApplication).

#include "core/runner/OlerRunner.h"
#include <QFile>
#include <QDir>
#include <QTemporaryDir>
#include <cstdio>

static int failures = 0;

static void check(bool cond, const char *what) {
    if (cond) {
        std::fprintf(stderr, "  ok: %s\n", what);
    } else {
        std::fprintf(stderr, "  FAIL: %s\n", what);
        ++failures;
    }
}

static void checkVerdict(const OlerCaseResult &r, const char *expected, const char *what) {
    if (r.verdict == expected) {
        std::fprintf(stderr, "  ok: %s\n", what);
    } else {
        std::fprintf(stderr, "  FAIL: %s (got %s, t=%lldms, mem=%lldkb)\n",
                     what, r.verdict.toLatin1().constData(),
                     static_cast<long long>(r.timeMs),
                     static_cast<long long>(r.memoryKb));
        ++failures;
    }
}

static bool writeText(const QString &path, const QString &content) {
    QFile f(path);
    if (!f.open(QIODevice::WriteOnly | QIODevice::Text)) return false;
    return f.write(content.toUtf8()) >= 0;
}

int main() {
    QTemporaryDir dir;
    check(dir.isValid(), "temp dir valid");
    const QString src = dir.filePath("main.cpp");

    // A+B solution used for the AC/WA cases.
    const QString abSol = "#include <iostream>\n"
                          "int main() { long long a, b; std::cin >> a >> b;"
                          " std::cout << a + b << std::endl; return 0; }\n";
    // Runtime crash: null dereference (volatile so -O2 cannot remove it).
    const QString reSol = "int main() { volatile int *p = nullptr; *p = 1;"
                          " return 0; }\n";
    // Infinite loop.
    const QString tleSol = "int main() { for (;;) {} }\n";
    // Compile error.
    const QString ceSol = "int main() { return oops; }\n";

    const QString in1 = dir.filePath("case1.in");
    const QString exp1 = dir.filePath("case1.exp");
    const QString in2 = dir.filePath("case2.in");
    const QString exp2 = dir.filePath("case2.exp");
    writeText(in1, "1 2\n");
    writeText(exp1, "3\n");
    writeText(in2, "1000000000 2000000000\n");
    writeText(exp2, "3000000000\n");

    OlerRunnerConfig cfg;
    cfg.gxxPath = "C:/Qt/Tools/mingw1310_64/bin/g++.exe";
    cfg.compileFlags = {"-std=c++17", "-O2"};
    cfg.timeLimitMs = 1500;
    cfg.memoryLimitMb = 64;

    OlerRunner runner;
    const QVector<OlerTestCase> cases = {{in1, exp1}, {in2, exp2}};

    // 1. AC path.
    {
        writeText(src, abSol);
        const auto r = runner.run(cfg, src, cases);
        check(r.compileOk, "AC: compile ok");
        check(r.cases.size() == 2, "AC: two cases");
        checkVerdict(r.cases.at(0), "AC", "AC: case 1 AC");
        checkVerdict(r.cases.at(1), "AC", "AC: case 2 AC (long long)");
        check(r.cases.at(0).timeMs >= 0, "AC: time measured");
        check(r.cases.at(0).memoryKb > 0, "AC: memory measured");
    }

    // 2. WA path (int overflow on case 2).
    {
        writeText(src, "#include <iostream>\n"
                       "int main() { int a, b; std::cin >> a >> b;"
                       " std::cout << a + b << std::endl; return 0; }\n");
        const auto r = runner.run(cfg, src, cases);
        check(r.compileOk, "WA: compile ok");
        checkVerdict(r.cases.at(0), "AC", "WA: case 1 still AC");
        checkVerdict(r.cases.at(1), "WA", "WA: case 2 WA (overflow)");
    }

    // 3. TLE path.
    {
        writeText(src, tleSol);
        const auto r = runner.run(cfg, src, cases);
        check(r.compileOk, "TLE: compile ok");
        checkVerdict(r.cases.at(0), "TLE", "TLE: case 1 TLE");
        check(r.cases.at(0).timeMs >= 1500, "TLE: ran at least to budget");
    }

    // 4. RE path.
    {
        writeText(src, reSol);
        const auto r = runner.run(cfg, src, cases);
        check(r.compileOk, "RE: compile ok");
        checkVerdict(r.cases.at(0), "RE", "RE: case 1 RE");
    }

    // 5. CE path.
    {
        writeText(src, ceSol);
        const auto r = runner.run(cfg, src, cases);
        check(!r.compileOk, "CE: compile fails");
        check(!r.compileOutput.isEmpty(), "CE: compiler stderr captured");
        checkVerdict(r.cases.at(0), "CE", "CE: case verdict CE");
    }

    // 6. discoverCases: tests/*.in/.out pairs, name-sorted.
    {
        const QString proj = dir.filePath("projA");
        QDir().mkpath(proj + "/tests");
        writeText(proj + "/tests/case1.in", "1 2\n");
        writeText(proj + "/tests/case1.out", "3\n");
        writeText(proj + "/tests/case10.in", "5 5\n");
        writeText(proj + "/tests/case10.out", "10\n");
        writeText(proj + "/tests/case2.in", "3 4\n");
        // case2 has no .out -> must be skipped.
        const auto cs = OlerRunner::discoverCases(proj + "/sol.cpp");
        check(cs.size() == 2, "discover: only paired cases found");
        check(cs.at(0).inputFile.endsWith("case1.in"), "discover: sorted by name");

        // Legacy input.txt/output.txt fallback.
        const QString projB = dir.filePath("projB");
        QDir().mkpath(projB);
        writeText(projB + "/input.txt", "1 1\n");
        writeText(projB + "/output.txt", "2\n");
        const auto csB = OlerRunner::discoverCases(projB + "/main.cpp");
        check(csB.size() == 1 && csB.at(0).inputFile.endsWith("input.txt"),
              "discover: input.txt fallback");
    }

    if (failures == 0) {
        std::fprintf(stderr, "test_runner: PASS\n");
        return 0;
    }
    std::fprintf(stderr, "test_runner: %d failure(s)\n", failures);
    return 1;
}
