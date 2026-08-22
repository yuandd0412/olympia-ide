// test_solves: regression test for OlerSolves (streak / counts / reload).
#include "core/solves/OlerSolves.h"
#include <QDate>
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

int main() {
    QTemporaryDir dir;
    check(dir.isValid(), "temp dir valid");
    const QString path = dir.filePath("solves.json");

    const QDate today = QDate::currentDate();

    // Empty store: streak 0.
    {
        OlerSolves s(path);
        check(s.streak() == 0, "empty: streak 0");
        check(s.countOn(today) == 0, "empty: count today 0");
    }

    // Solve yesterday + today -> streak 2; survives reload.
    {
        OlerSolves s(path);
        s.addSolve(today.addDays(-1));
        s.addSolve(today.addDays(-1));
        s.addSolve(today);
        check(s.countOn(today) == 1, "count today 1");
        check(s.countOn(today.addDays(-1)) == 2, "count yesterday 2");
        check(s.streak() == 2, "streak 2 (today+yesterday)");
        check(s.save(), "save ok");
    }
    {
        OlerSolves s(path); // reload
        check(s.streak() == 2, "streak survives reload");
    }

    // Gap kills the streak.
    {
        OlerSolves s(path);
        s.addSolve(today.addDays(-3));
        check(s.streak() == 2, "gap at -2 days does not extend streak");
    }

    if (failures == 0) {
        std::fprintf(stderr, "test_solves: PASS\n");
        return 0;
    }
    std::fprintf(stderr, "test_solves: %d failure(s)\n", failures);
    return 1;
}
