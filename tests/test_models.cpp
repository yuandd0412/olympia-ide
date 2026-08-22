// test_models: regression test for OlerProblems + OlerMistakes (Phase 4c).
// No QApplication needed.

#include "core/problems/OlerProblems.h"
#include "core/mistakes/OlerMistakes.h"
#include <QFile>
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

static OlerProblem makeProblem(const QString &id, const QString &title) {
    OlerProblem p;
    p.id = id;
    p.title = title;
    p.oj = "Luogu";
    p.difficulty = "普及";
    p.url = "https://www.luogu.com.cn/problem/" + id;
    p.tags = {"dp", "graph"};
    return p;
}

int main() {
    QTemporaryDir dir;
    check(dir.isValid(), "temp dir valid");

    // ---- OlerProblems ----
    const QString probPath = dir.filePath("problems.json");
    {
        OlerProblems store(probPath);
        check(store.all().isEmpty(), "problems: empty on first run");

        bool added = store.upsert(makeProblem("P1001", "A+B Problem"));
        check(added, "problems: upsert adds new");
        added = store.upsert(makeProblem("P1002", "过河卒"));
        check(added, "problems: second upsert adds");
        added = store.upsert(makeProblem("P1001", "A+B Problem (updated)"));
        check(!added, "problems: re-upsert same id updates");
        check(store.find("P1001").title == "A+B Problem (updated)",
              "problems: update persisted in memory");
        check(!store.upsert(makeProblem("", "no id")), "problems: empty id rejected");

        store.touchRecent("P1001");
        store.touchRecent("P1002");
        store.touchRecent("P1001"); // moves to front again
        check(store.recent().size() == 2, "problems: recent dedupes");
        check(store.recent().first().id == "P1001", "problems: recent MRU order");

        check(store.save(), "problems: save ok");
        check(store.remove("P1002"), "problems: remove existing");
        check(!store.remove("P9999"), "problems: remove missing fails");
        check(store.save(), "problems: re-save after remove");
    }
    {
        OlerProblems store(probPath); // reload from disk
        check(store.all().size() == 1, "problems: reload keeps 1 after remove");
        check(store.recent().size() == 1, "problems: recent pruned of removed id");
        check(store.recent().first().title == "A+B Problem (updated)",
              "problems: roundtrip fields intact");
        check(store.recent().first().tags == QStringList({"dp", "graph"}),
              "problems: tags roundtrip");
    }

    // ---- OlerMistakes ----
    const QString mistPath = dir.filePath("mistakes.json");
    int firstId = -1;
    {
        OlerMistakes journal(mistPath);
        check(journal.entries().isEmpty(), "mistakes: empty on first run");

        OlerMistake m;
        m.problemId = "P1001";
        m.title = "A+B Problem";
        m.oj = "Luogu";
        m.verdict = "WA";
        firstId = journal.add(m);
        check(firstId > 0, "mistakes: add returns positive id");

        m.verdict = "TLE";
        const int tleId = journal.add(m);
        m.verdict = "RE";
        journal.add(m);

        check(journal.entries().size() == 3, "mistakes: three entries");
        auto counts = journal.counts();
        check(counts.value("WA") == 1 && counts.value("TLE") == 1 &&
                  counts.value("RE") == 1,
              "mistakes: counts per verdict");
        check(journal.entries().first().verdict == "RE",
              "mistakes: newest first");

        check(journal.markReviewed(firstId), "mistakes: mark reviewed");
        check(!journal.markReviewed(firstId), "mistakes: double mark rejected");
        check(journal.entries(false).size() == 2, "mistakes: reviewed hidden by default");
        check(journal.entries(true).size() == 3, "mistakes: reviewed visible with flag");

        check(journal.remove(tleId), "mistakes: remove entry");
        check(journal.save(), "mistakes: save ok");
    }
    {
        OlerMistakes journal(mistPath);
        check(journal.entries(true).size() == 2, "mistakes: reload keeps entries");
        check(journal.add(OlerMistake()) > firstId,
              "mistakes: id counter persists across reload");
    }

    if (failures == 0) {
        std::fprintf(stderr, "test_models: PASS\n");
        return 0;
    }
    std::fprintf(stderr, "test_models: %d failure(s)\n", failures);
    return 1;
}
