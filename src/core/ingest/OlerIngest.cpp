#include "OlerIngest.h"
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QRegularExpression>
#include <QUrl>

namespace {

QString difficultyName(int diff) {
    switch (diff) {
    case 1: return QStringLiteral("入门");
    case 2: return QStringLiteral("普及-");
    case 3: return QStringLiteral("普及/提高-");
    case 4: return QStringLiteral("普及+/提高");
    case 5: return QStringLiteral("提高+/省选-");
    case 6: return QStringLiteral("省选/NOI-");
    case 7: return QStringLiteral("NOI/NOI+/CTSC");
    default: return QStringLiteral("暂无评定");
    }
}

QString inferOj(const QString &pid) {
    const QString upper = pid.toUpper();
    if (upper.startsWith(QLatin1String("CF"))) return QStringLiteral("Codeforces");
    if (upper.startsWith(QLatin1String("AT"))) return QStringLiteral("AtCoder");
    if (upper.startsWith(QLatin1String("SP"))) return QStringLiteral("SPOJ");
    if (upper.startsWith(QLatin1String("UVA"))) return QStringLiteral("UVa");
    return QStringLiteral("Luogu");
}

} // namespace

OlerIngest::OlerIngest(QObject *parent)
    : QObject(parent), m_nam(new QNetworkAccessManager(this)) {
    connect(m_nam, &QNetworkAccessManager::finished,
            this, &OlerIngest::onReplyFinished);
}

OlerIngest::~OlerIngest() = default;

void OlerIngest::fetchProblem(const QString &pid) {
    const QString trimmed = pid.trimmed();
    static const QRegularExpression safePid(
        QStringLiteral("^[A-Za-z0-9_+-]{1,64}$"));
    if (!safePid.match(trimmed).hasMatch()) {
        emit fetchFailed(trimmed, tr("题目 ID 包含非法字符"));
        return;
    }

    const QUrl url(QStringLiteral("https://www.luogu.com.cn/problem/%1?_contentOnly=1")
                       .arg(trimmed));
    QNetworkRequest request(url);
    request.setHeader(QNetworkRequest::UserAgentHeader,
                      QStringLiteral("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AetherIDE/0.1.0"));
    request.setRawHeader("Accept", "application/json");
    request.setRawHeader("x-requested-with", "XMLHttpRequest");
    request.setAttribute(QNetworkRequest::User, trimmed);

    m_nam->get(request);
}

void OlerIngest::onReplyFinished(QNetworkReply *reply) {
    reply->deleteLater();
    const QString pid = reply->request().attribute(QNetworkRequest::User).toString();

    if (reply->error() != QNetworkReply::NoError) {
        emit fetchFailed(pid, tr("网络请求失败：%1").arg(reply->errorString()));
        return;
    }

    const int statusCode =
        reply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt();
    if (statusCode != 200) {
        emit fetchFailed(pid, tr("服务器返回 HTTP %1").arg(statusCode));
        return;
    }

    const QByteArray data = reply->readAll();
    OlerProblemDetail detail;
    QString error;
    if (!parseLuoguJson(data, pid, detail, &error)) {
        emit fetchFailed(pid, error);
        return;
    }

    emit problemFetched(detail);
}

bool OlerIngest::parseLuoguJson(const QByteArray &jsonData, const QString &pid,
                               OlerProblemDetail &detail, QString *errorOut) {
    QJsonParseError parseErr;
    const QJsonDocument doc = QJsonDocument::fromJson(jsonData, &parseErr);
    if (parseErr.error != QJsonParseError::NoError || !doc.isObject()) {
        if (errorOut) *errorOut = tr("JSON 解析错误：%1").arg(parseErr.errorString());
        return false;
    }

    const QJsonObject root = doc.object();
    const int code = root.value(QLatin1String("code")).toInt(200);
    if (code != 200 && root.contains(QLatin1String("code"))) {
        const QString msg = root.value(QLatin1String("message")).toString();
        if (errorOut) *errorOut = msg.isEmpty() ? tr("题目不存在或无权访问") : msg;
        return false;
    }

    const QJsonObject currentData = root.value(QLatin1String("currentData")).toObject();
    const QJsonObject problem = currentData.contains(QLatin1String("problem"))
                                    ? currentData.value(QLatin1String("problem")).toObject()
                                    : root;

    if (problem.isEmpty() || !problem.contains(QLatin1String("pid"))) {
        if (errorOut) *errorOut = tr("响应中未找到题目数据");
        return false;
    }

    detail.meta.id = problem.value(QLatin1String("pid")).toString(pid);
    detail.meta.title = problem.value(QLatin1String("title")).toString();
    detail.meta.oj = inferOj(detail.meta.id);
    detail.meta.difficulty =
        difficultyName(problem.value(QLatin1String("difficulty")).toInt(0));
    detail.meta.url =
        QStringLiteral("https://www.luogu.com.cn/problem/%1").arg(detail.meta.id);

    // Tags
    for (const auto &t : problem.value(QLatin1String("tags")).toArray()) {
        if (t.isString())
            detail.meta.tags.append(t.toString());
        else if (t.isDouble())
            detail.meta.tags.append(QString::number(t.toInt()));
    }

    // Limits
    const QJsonObject limits = problem.value(QLatin1String("limits")).toObject();
    const QJsonArray timeLimits = limits.value(QLatin1String("time")).toArray();
    if (!timeLimits.isEmpty())
        detail.timeLimitMs = timeLimits.first().toInt(1000);
    const QJsonArray memoryLimits = limits.value(QLatin1String("memory")).toArray();
    if (!memoryLimits.isEmpty())
        detail.memoryLimitMb = memoryLimits.first().toInt(131072) / 1024;

    // Samples
    const QJsonArray samplesArr = problem.value(QLatin1String("samples")).toArray();
    for (const auto &s : samplesArr) {
        if (s.isArray()) {
            const QJsonArray pair = s.toArray();
            if (pair.size() >= 2) {
                detail.samples.append(qMakePair(pair.at(0).toString(), pair.at(1).toString()));
            }
        } else if (s.isObject()) {
            const QJsonObject sampleObj = s.toObject();
            const QString in = sampleObj.value(QLatin1String("input")).toString(
                sampleObj.value(QLatin1String("in")).toString());
            const QString out = sampleObj.value(QLatin1String("output")).toString(
                sampleObj.value(QLatin1String("out")).toString());
            if (!in.isEmpty() || !out.isEmpty())
                detail.samples.append(qMakePair(in, out));
        }
    }

    // Description markdown parts
    QStringList sections;
    const QString background = problem.value(QLatin1String("background")).toString();
    if (!background.trimmed().isEmpty())
        sections << QStringLiteral("### 题目背景\n%1").arg(background.trimmed());
    const QString desc = problem.value(QLatin1String("description")).toString();
    if (!desc.trimmed().isEmpty())
        sections << QStringLiteral("### 题目描述\n%1").arg(desc.trimmed());
    const QString inFormat = problem.value(QLatin1String("inputFormat")).toString();
    if (!inFormat.trimmed().isEmpty())
        sections << QStringLiteral("### 输入格式\n%1").arg(inFormat.trimmed());
    const QString outFormat = problem.value(QLatin1String("outputFormat")).toString();
    if (!outFormat.trimmed().isEmpty())
        sections << QStringLiteral("### 输出格式\n%1").arg(outFormat.trimmed());
    const QString hint = problem.value(QLatin1String("hint")).toString();
    if (!hint.trimmed().isEmpty())
        sections << QStringLiteral("### 说明/提示\n%1").arg(hint.trimmed());

    detail.description = sections.join(QStringLiteral("\n\n"));
    return true;
}

QVector<OlerProblemDetail> OlerIngest::parseProblemSheetJson(
    const QByteArray &jsonData, QString *errorOut) {
    QVector<OlerProblemDetail> results;
    QJsonParseError parseErr;
    const QJsonDocument doc = QJsonDocument::fromJson(jsonData, &parseErr);
    if (parseErr.error != QJsonParseError::NoError) {
        if (errorOut) *errorOut = parseErr.errorString();
        return results;
    }

    auto parseOne = [](const QJsonObject &obj) -> OlerProblemDetail {
        OlerProblemDetail d;
        d.meta.id = obj.value(QLatin1String("id")).toString(
            obj.value(QLatin1String("pid")).toString());
        if (d.meta.id.isEmpty()) return d;
        d.meta.title = obj.value(QLatin1String("title")).toString(d.meta.id);
        d.meta.oj = obj.value(QLatin1String("oj")).toString(inferOj(d.meta.id));
        d.meta.difficulty = obj.value(QLatin1String("difficulty")).toString(
            QStringLiteral("入门"));
        d.meta.url = obj.value(QLatin1String("url")).toString();
        d.timeLimitMs = obj.value(QLatin1String("timeLimitMs")).toInt(1000);
        d.memoryLimitMb = obj.value(QLatin1String("memoryLimitMb")).toInt(128);
        for (const auto &t : obj.value(QLatin1String("tags")).toArray())
            d.meta.tags.append(t.toString());
        for (const auto &s : obj.value(QLatin1String("samples")).toArray()) {
            if (s.isObject()) {
                const auto so = s.toObject();
                d.samples.append(qMakePair(so.value(QLatin1String("in")).toString(
                                               so.value(QLatin1String("input")).toString()),
                                           so.value(QLatin1String("out")).toString(
                                               so.value(QLatin1String("output")).toString())));
            } else if (s.isArray()) {
                const auto sa = s.toArray();
                if (sa.size() >= 2)
                    d.samples.append(qMakePair(sa.at(0).toString(), sa.at(1).toString()));
            }
        }
        return d;
    };

    if (doc.isArray()) {
        for (const auto &v : doc.array()) {
            if (v.isObject()) {
                const auto d = parseOne(v.toObject());
                if (d.isValid()) results.append(d);
            }
        }
    } else if (doc.isObject()) {
        const QJsonObject root = doc.object();
        if (root.contains(QLatin1String("problems")) &&
            root.value(QLatin1String("problems")).isArray()) {
            for (const auto &v : root.value(QLatin1String("problems")).toArray()) {
                if (v.isObject()) {
                    const auto d = parseOne(v.toObject());
                    if (d.isValid()) results.append(d);
                }
            }
        } else {
            const auto d = parseOne(root);
            if (d.isValid()) results.append(d);
        }
    }
    return results;
}

QVector<OlerProblemDetail> OlerIngest::parseMarkdownSheet(const QString &markdownText) {
    QVector<OlerProblemDetail> results;
    // Matches headers like: # P1001 A+B Problem or ## [P1001] A+B Problem
    static const QRegularExpression headerRe(
        QStringLiteral("^(?:#{1,4})\\s*(?:\\[([A-Za-z0-9_+-]+)\\]|([A-Za-z0-9_+-]{2,10}))[\\s:：-]+(.*?)$"),
        QRegularExpression::MultilineOption);

    auto it = headerRe.globalMatch(markdownText);
    QVector<int> starts;
    QVector<QPair<QString, QString>> metaList;
    while (it.hasNext()) {
        const auto m = it.next();
        starts.append(m.capturedStart());
        const QString pid = m.captured(1).isEmpty() ? m.captured(2) : m.captured(1);
        const QString title = m.captured(3).trimmed();
        metaList.append({pid.trimmed(), title.isEmpty() ? pid.trimmed() : title});
    }

    for (int idx = 0; idx < starts.size(); ++idx) {
        const int from = starts.at(idx);
        const int to = (idx + 1 < starts.size()) ? starts.at(idx + 1) : markdownText.length();
        const QString block = markdownText.mid(from, to - from);

        OlerProblemDetail d;
        d.meta.id = metaList.at(idx).first;
        d.meta.title = metaList.at(idx).second;
        d.meta.oj = inferOj(d.meta.id);
        d.meta.difficulty = QStringLiteral("普及");
        d.description = block;

        // Find code fences
        static const QRegularExpression codeFence(
            QStringLiteral("```(?:[a-zA-Z0-9_+-]*)\\n([\\s\\S]*?)```"));
        auto fenceIt = codeFence.globalMatch(block);
        QVector<QString> blocks;
        while (fenceIt.hasNext())
            blocks.append(fenceIt.next().captured(1));

        for (int b = 0; b + 1 < blocks.size(); b += 2) {
            d.samples.append(qMakePair(blocks.at(b), blocks.at(b + 1)));
        }
        if (d.isValid())
            results.append(d);
    }
    return results;
}

bool OlerIngest::createWorkspace(const OlerProblemDetail &detail,
                                QString *outMainCpp,
                                QString *errorOut) {
    if (!detail.isValid()) {
        if (errorOut) *errorOut = QStringLiteral("Invalid problem detail");
        return false;
    }

    static const QRegularExpression safeId(
        QStringLiteral("^[A-Za-z0-9_+-]{1,64}$"));
    if (!safeId.match(detail.meta.id).hasMatch()) {
        if (errorOut) *errorOut = QStringLiteral("Problem ID contains invalid path characters");
        return false;
    }

    const QString wsPath =
        QDir::homePath() + QStringLiteral("/.oleride/workspace/") + detail.meta.id;
    QDir ws(wsPath);
    if (!ws.exists() && !QDir().mkpath(ws.absolutePath())) {
        if (errorOut) *errorOut = QStringLiteral("Cannot create workspace: %1").arg(wsPath);
        return false;
    }

    // Initialize main.cpp if not present
    const QString mainCpp = ws.filePath(QStringLiteral("main.cpp"));
    if (!QFileInfo::exists(mainCpp)) {
        QFile f(mainCpp);
        if (f.open(QIODevice::WriteOnly | QIODevice::Text)) {
            const QString tmpl =
                QStringLiteral("// %1 - %2\n"
                               "// OJ: %3 | Time Limit: %4 ms | Memory Limit: %5 MB\n"
                               "// URL: %6\n"
                               "#include <bits/stdc++.h>\n"
                               "using namespace std;\n\n"
                               "int main() {\n"
                               "    ios::sync_with_stdio(false);\n"
                               "    cin.tie(nullptr);\n"
                               "    \n"
                               "    return 0;\n"
                               "}\n")
                    .arg(detail.meta.id,
                         detail.meta.title.simplified().replace(
                             QRegularExpression(QStringLiteral("[\\r\\n]+")),
                             QStringLiteral(" ")),
                         detail.meta.oj,
                         QString::number(detail.timeLimitMs),
                         QString::number(detail.memoryLimitMb),
                         detail.meta.url.isEmpty()
                             ? QStringLiteral("https://www.luogu.com.cn/problem/") + detail.meta.id
                             : detail.meta.url);
            f.write(tmpl.toUtf8());
            f.close();
        }
    }

    // Write tests/caseN.in and tests/caseN.out
    if (!detail.samples.isEmpty()) {
        const QString testsPath = ws.filePath(QStringLiteral("tests"));
        QDir().mkpath(testsPath);
        for (int i = 0; i < detail.samples.size(); ++i) {
            const QString inPath =
                QDir(testsPath).filePath(QStringLiteral("case%1.in").arg(i + 1));
            const QString outPath =
                QDir(testsPath).filePath(QStringLiteral("case%1.out").arg(i + 1));
            QFile inFile(inPath);
            if (inFile.open(QIODevice::WriteOnly | QIODevice::Text)) {
                inFile.write(detail.samples.at(i).first.toUtf8());
                inFile.close();
            }
            QFile outFile(outPath);
            if (outFile.open(QIODevice::WriteOnly | QIODevice::Text)) {
                outFile.write(detail.samples.at(i).second.toUtf8());
                outFile.close();
            }
        }
    } else {
        // Fallback placeholder input.txt / output.txt
        const QString inTxt = ws.filePath(QStringLiteral("input.txt"));
        const QString outTxt = ws.filePath(QStringLiteral("output.txt"));
        if (!QFileInfo::exists(inTxt)) {
            QFile fi(inTxt);
            if (fi.open(QIODevice::WriteOnly | QIODevice::Text)) fi.close();
        }
        if (!QFileInfo::exists(outTxt)) {
            QFile fo(outTxt);
            if (fo.open(QIODevice::WriteOnly | QIODevice::Text)) fo.close();
        }
    }

    // Save problem into store
    OlerProblems *store = OlerProblems::instance();
    store->upsert(detail.meta);
    store->touchRecent(detail.meta.id);
    store->save();

    if (outMainCpp)
        *outMainCpp = mainCpp;
    return true;
}
