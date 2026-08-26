#include "core/ingest/OlerIngest.h"
#include <QDir>
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

int main() {
    // 1. Luogu JSON parsing test
    {
        const QByteArray luoguJson = R"({
            "code": 200,
            "currentData": {
                "problem": {
                    "pid": "P1001",
                    "title": "A+B Problem",
                    "difficulty": 1,
                    "tags": ["入门", "数学"],
                    "limits": {
                        "time": [1000],
                        "memory": [131072]
                    },
                    "samples": [
                        ["1 2\n", "3\n"],
                        ["10 20\n", "30\n"]
                    ],
                    "description": "输入两个整数 a, b，输出它们的和。",
                    "inputFormat": "一行两个整数 a, b",
                    "outputFormat": "一个整数"
                }
            }
        })";

        OlerProblemDetail detail;
        QString error;
        const bool ok = OlerIngest::parseLuoguJson(luoguJson, "P1001", detail, &error);
        check(ok, "parseLuoguJson: ok");
        check(detail.meta.id == "P1001", "parseLuoguJson: pid P1001");
        check(detail.meta.title == "A+B Problem", "parseLuoguJson: title");
        check(detail.meta.difficulty == "入门", "parseLuoguJson: difficulty 入门");
        check(detail.meta.oj == "Luogu", "parseLuoguJson: oj Luogu");
        check(detail.timeLimitMs == 1000, "parseLuoguJson: time limit 1000ms");
        check(detail.memoryLimitMb == 128, "parseLuoguJson: memory limit 128mb");
        check(detail.samples.size() == 2, "parseLuoguJson: 2 samples");
        check(detail.samples.at(0).first == "1 2\n", "parseLuoguJson: sample 1 input");
        check(detail.samples.at(0).second == "3\n", "parseLuoguJson: sample 1 output");
        check(detail.description.contains("输入两个整数"), "parseLuoguJson: description");
    }

    // 2. Problem Sheet JSON parsing test
    {
        const QByteArray sheetJson = R"([
            {
                "id": "P1002",
                "title": "过河卒",
                "oj": "Luogu",
                "difficulty": "普及-",
                "samples": [
                    {"in": "6 6 3 3\n", "out": "6\n"}
                ]
            },
            {
                "id": "CF4A",
                "title": "Watermelon",
                "oj": "Codeforces",
                "difficulty": "入门",
                "samples": [
                    ["8\n", "YES\n"]
                ]
            }
        ])";

        QString error;
        const auto list = OlerIngest::parseProblemSheetJson(sheetJson, &error);
        check(list.size() == 2, "parseProblemSheetJson: 2 problems parsed");
        check(list.at(0).meta.id == "P1002", "parseProblemSheetJson: P1002");
        check(list.at(0).samples.size() == 1, "parseProblemSheetJson: P1002 samples");
        check(list.at(0).samples.at(0).first == "6 6 3 3\n", "parseProblemSheetJson: sample in");
        check(list.at(1).meta.id == "CF4A", "parseProblemSheetJson: CF4A");
        check(list.at(1).meta.oj == "Codeforces", "parseProblemSheetJson: CF oj");
    }

    // 3. Markdown sheet parsing test
    {
        const QString md = R"(
# P1003 铺地毯
**题目描述**
为了准备一个独特的正方形……

**输入样例**
```
3
1 0 2 3
0 2 3 3
2 1 3 3
2 2
```

**输出样例**
```
3
```
)";
        const auto list = OlerIngest::parseMarkdownSheet(md);
        check(list.size() == 1, "parseMarkdownSheet: 1 problem parsed");
        if (!list.isEmpty()) {
            check(list.at(0).meta.id == "P1003", "parseMarkdownSheet: id P1003");
            check(list.at(0).meta.title == "铺地毯", "parseMarkdownSheet: title");
            check(list.at(0).samples.size() == 1, "parseMarkdownSheet: 1 sample extracted");
        }
    }

    // 4. Workspace generation test
    {
        OlerProblemDetail d;
        d.meta.id = "TEST_INGEST_01";
        d.meta.title = "Ingest Test Problem";
        d.meta.oj = "Local";
        d.meta.difficulty = "入门";
        d.samples.append(qMakePair(QStringLiteral("10 20\n"), QStringLiteral("30\n")));

        QString mainCpp, error;
        const bool ok = OlerIngest::createWorkspace(d, &mainCpp, &error);
        check(ok, "createWorkspace: success");
        check(!mainCpp.isEmpty() && QFile::exists(mainCpp), "createWorkspace: main.cpp exists");
        const QString dir = QFileInfo(mainCpp).absolutePath();
        check(QFile::exists(dir + "/tests/case1.in"), "createWorkspace: case1.in exists");
        check(QFile::exists(dir + "/tests/case1.out"), "createWorkspace: case1.out exists");

        // Clean up test workspace
        QDir(dir).removeRecursively();
    }

    // 5. Invalid PID security check
    {
        OlerProblemDetail invalidD;
        invalidD.meta.id = "../../../etc/passwd";
        invalidD.meta.title = "Path traversal";
        QString error;
        const bool ok = OlerIngest::createWorkspace(invalidD, nullptr, &error);
        check(!ok, "createWorkspace: path traversal blocked");
    }

    if (failures == 0) {
        std::fprintf(stderr, "test_ingest: PASS\n");
        return 0;
    }
    std::fprintf(stderr, "test_ingest: %d failure(s)\n", failures);
    return 1;
}
