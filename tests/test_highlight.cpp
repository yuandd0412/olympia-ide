// test_highlight: regression test for Oler v2 Phase 4 kateindexer fix.
// Verifies that KSyntax's Repository can resolve common definitions at
// runtime and that the kateindexer-stub-replacement actually wires up
// the syntax data.
//
// No QApplication, no event loop, no Qt platform plugin. We only need
// KSyntax's static `initResource()` (which the KSyntax DLL runs from
// its Repository() constructor) and a custom search path pointing at
// the on-disk syntax folder. With `QRC_SYNTAX=OFF` (Oler project
// config, see CMakeLists.txt) the syntax definitions are NOT bundled
// in a qrc, so the qrc path used by the original test simply does
// not exist. We assert the disk artifact instead, then load
// definitions from the source tree.

#include <KSyntaxHighlighting/Repository>
#include <KSyntaxHighlighting/Definition>
#include <KSyntaxHighlighting/Theme>
#include <QFile>
#include <QString>
#include <QStringList>
#include <cstdio>
#include <cstdlib>

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
    // 1. Verify the pre-generated index.katesyntax artifact produced by
    //    task 2's CMakeLists patch is present in the build tree.
    const char *kIndexBuild = R"(D:/oler-ide-v2/build/third_party/syntax-highlighting/data/index.katesyntax)";
    QFile idx(QString::fromLatin1(kIndexBuild));
    check(idx.open(QFile::ReadOnly), "build/index.katesyntax opens");
    if (idx.isOpen()) {
        const qint64 sz = idx.size();
        idx.close();
        char szbuf[96];
        std::snprintf(szbuf, sizeof(szbuf), "build/index.katesyntax size > 30 KB (got %lld bytes)",
                      static_cast<long long>(sz));
        check(sz > 30000, szbuf);
    }

    // 2. Wire the Repository up to the source-tree syntax folder.
    //    KSyntax's `addCustomSearchPath(P)` looks in `P/syntax/*.xml`.
    //    Allow override via env var so a non-default project root still works.
    KSyntaxHighlighting::Repository repo;
    const QByteArray envOverride = qgetenv("OLER_KSYNTAX_DATA_DIR");
    const QString dataDir = envOverride.isEmpty()
        ? QString::fromLatin1(R"(D:/oler-ide-v2/third_party/syntax-highlighting/data)")
        : QString::fromLocal8Bit(envOverride);
    repo.addCustomSearchPath(dataDir);
    {
        char buf[256];
        std::snprintf(buf, sizeof(buf), "addCustomSearchPath('%s')",
                      dataDir.toLocal8Bit().constData());
        check(true, buf);  // not a real check, just a breadcrumb in the log
    }

    // 3. Verify the Repository can resolve common definitions.
    for (const char *lang : {"C++", "Python", "JavaScript", "Java", "Rust"}) {
        auto def = repo.definitionForName(QString::fromLatin1(lang));
        char buf[128];
        std::snprintf(buf, sizeof(buf), "definitionForName(\"%s\") valid", lang);
        check(def.isValid(), buf);
    }

    // 4. Verify themes work via the theme_data qrc bundled in the KSyntax DLL
    //    (always linked, regardless of QRC_SYNTAX; see data/CMakeLists.txt:52).
    //    Note: the .theme files' `name` field is the user-facing label with
    //    spaces and Title Case (e.g. "Breeze Dark"), not the kebab-case
    //    filename (e.g. breeze-dark.theme). `Repository::theme()` looks up
    //    by user-facing name. (OlerEditor's kThemeMap uses kebab-case; that
    //    is a separate bug for a later task — out of scope here.)
    for (const char *themeName : {"Breeze Dark", "Breeze Light", "Atom One Dark", "Atom One Light"}) {
        auto theme = repo.theme(QString::fromLatin1(themeName));
        char buf[128];
        std::snprintf(buf, sizeof(buf), "theme(\"%s\") valid", themeName);
        check(theme.isValid(), buf);
    }

    if (failures == 0) {
        std::fprintf(stderr, "test_highlight: PASS\n");
        return 0;
    } else {
        std::fprintf(stderr, "test_highlight: %d failure(s)\n", failures);
        return 1;
    }
}
