// test_settings: regression test for OlerSettings (Phase 4a).
// Covers defaults, set/get roundtrip, change signals, JSON persistence,
// and corrupt-file recovery. No QApplication needed (plain QObject).

#include "core/settings/OlerSettings.h"
#include <QFile>
#include <QVector>
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

struct ChangeRecord {
    QString key;
    QVariant value;
};

int main() {
    QTemporaryDir dir;
    check(dir.isValid(), "temp dir valid");
    const QString path = dir.filePath("settings.json");

    // 1. First run: defaults are applied and file does not exist yet.
    {
        OlerSettings s(path);
        check(s.value("theme").toString() == "MistBlue", "default theme");
        check(s.value("limits/timeMs").toInt() == 1000, "default time limit");
        check(s.value("compiler/optLevel").toString() == "-O2", "default opt level");
        check(!QFile::exists(path), "no file written until save()");
    }

    // 2. set + signal + save + reload roundtrip.
    {
        OlerSettings s(path);
        QVector<ChangeRecord> changes;
        QObject::connect(&s, &OlerSettings::settingChanged,
                         [&](const QString &k, const QVariant &v) {
                             changes.append({k, v});
                         });
        s.setValue("theme", "OneDarkPro");
        s.setValue("limits/timeMs", 2000);
        check(changes.size() == 2, "two settingChanged signals");
        check(changes.at(0).key == "theme", "signal key");
        check(changes.at(0).value.toString() == "OneDarkPro", "signal value");
        check(s.save(), "save() ok");

        // No-op write must not emit.
        changes.clear();
        s.setValue("theme", "OneDarkPro");
        check(changes.isEmpty(), "no signal on unchanged value");

        OlerSettings s2(path);
        check(s2.value("theme").toString() == "OneDarkPro", "persisted theme reloads");
        check(s2.value("limits/timeMs").toInt() == 2000, "persisted limit reloads");
    }

    // 3. Export/import keeps scalar and list values and writes the target file.
    {
        const QString backupPath = dir.filePath("settings-backup.json");
        const QString importedPath = dir.filePath("imported.json");
        OlerSettings source(path);
        source.setValue("training/sessions",
                        QStringList{QStringLiteral("2026-08-25\tGraphs")});
        check(source.exportTo(backupPath), "exportTo() ok");
        OlerSettings imported(importedPath);
        check(imported.importFrom(backupPath), "importFrom() ok");
        check(imported.value("theme").toString() == "OneDarkPro",
              "imported scalar value");
        check(imported.value("training/sessions").toStringList().size() == 1,
              "imported list value");
        check(QFile::exists(importedPath), "import writes target file");
    }

    // 4. Corrupt file: load must not crash; defaults still apply.
    {
        QFile f(path);
        f.open(QIODevice::WriteOnly | QIODevice::Truncate);
        f.write("{not valid json");
        f.close();
        OlerSettings s(path);
        check(s.value("theme").toString() == "MistBlue",
              "corrupt file falls back to defaults");
    }

    // 5. Unknown key returns the caller's default.
    {
        OlerSettings s(path);
        check(s.value("no/such/key", 42).toInt() == 42, "unknown key -> caller default");
        check(!s.contains("no/such/key"), "unknown key not contained");
    }

    if (failures == 0) {
        std::fprintf(stderr, "test_settings: PASS\n");
        return 0;
    }
    std::fprintf(stderr, "test_settings: %d failure(s)\n", failures);
    return 1;
}
