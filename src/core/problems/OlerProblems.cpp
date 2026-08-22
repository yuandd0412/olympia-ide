#include "OlerProblems.h"
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>

namespace {

constexpr int kRecentCap = 8;

QJsonObject problemToJson(const OlerProblem &p) {
    QJsonObject o;
    o.insert(QStringLiteral("id"), p.id);
    o.insert(QStringLiteral("title"), p.title);
    o.insert(QStringLiteral("oj"), p.oj);
    o.insert(QStringLiteral("difficulty"), p.difficulty);
    o.insert(QStringLiteral("url"), p.url);
    QJsonArray tags;
    for (const QString &t : p.tags) tags.append(t);
    o.insert(QStringLiteral("tags"), tags);
    return o;
}

OlerProblem problemFromJson(const QJsonObject &o) {
    OlerProblem p;
    p.id = o.value(QLatin1String("id")).toString();
    p.title = o.value(QLatin1String("title")).toString();
    p.oj = o.value(QLatin1String("oj")).toString();
    p.difficulty = o.value(QLatin1String("difficulty")).toString();
    p.url = o.value(QLatin1String("url")).toString();
    for (const auto &t : o.value(QLatin1String("tags")).toArray())
        p.tags << t.toString();
    return p;
}

} // namespace

OlerProblems::OlerProblems(const QString &filePath, QObject *parent)
    : QObject(parent), m_path(filePath) {
    load();
}

void OlerProblems::load() {
    QFile f(m_path);
    if (!f.open(QIODevice::ReadOnly))
        return;
    const auto doc = QJsonDocument::fromJson(f.readAll());
    if (!doc.isObject())
        return;
    const QJsonObject root = doc.object();
    for (const auto &v : root.value(QLatin1String("problems")).toArray())
        m_problems.append(problemFromJson(v.toObject()));
    for (const auto &v : root.value(QLatin1String("recent")).toArray())
        m_recentIds << v.toString();
}

int OlerProblems::indexOf(const QString &id) const {
    for (int i = 0; i < m_problems.size(); ++i)
        if (m_problems.at(i).id == id)
            return i;
    return -1;
}

QVector<OlerProblem> OlerProblems::all() const {
    return m_problems;
}

OlerProblem OlerProblems::find(const QString &id) const {
    const int i = indexOf(id);
    return i >= 0 ? m_problems.at(i) : OlerProblem{};
}

bool OlerProblems::upsert(const OlerProblem &p) {
    if (p.id.isEmpty())
        return false;
    const int i = indexOf(p.id);
    if (i >= 0) {
        m_problems[i] = p;
        emit changed();
        return false;
    }
    m_problems.append(p);
    emit changed();
    return true;
}

bool OlerProblems::remove(const QString &id) {
    const int i = indexOf(id);
    if (i < 0)
        return false;
    m_problems.removeAt(i);
    m_recentIds.removeAll(id);
    emit changed();
    return true;
}

void OlerProblems::touchRecent(const QString &id) {
    if (indexOf(id) < 0)
        return;
    m_recentIds.removeAll(id);
    m_recentIds.prepend(id);
    while (m_recentIds.size() > kRecentCap)
        m_recentIds.removeLast();
    emit changed();
}

QVector<OlerProblem> OlerProblems::recent(int cap) const {
    QVector<OlerProblem> out;
    for (const QString &id : m_recentIds) {
        const OlerProblem p = find(id);
        if (p.isValid()) {
            out.append(p);
            if (out.size() >= cap)
                break;
        }
    }
    return out;
}

bool OlerProblems::save(QString *errorOut) {
    const QFileInfo fi(m_path);
    if (!fi.dir().exists() && !QDir().mkpath(fi.absolutePath())) {
        if (errorOut) *errorOut = QStringLiteral("cannot create %1").arg(fi.absolutePath());
        return false;
    }
    QJsonArray arr;
    for (const OlerProblem &p : m_problems)
        arr.append(problemToJson(p));
    QJsonArray recents;
    for (const QString &id : m_recentIds) recents.append(id);
    QJsonObject root;
    root.insert(QStringLiteral("problems"), arr);
    root.insert(QStringLiteral("recent"), recents);

    QFile f(m_path);
    if (!f.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
        if (errorOut) *errorOut = f.errorString();
        return false;
    }
    const auto payload = QJsonDocument(root).toJson(QJsonDocument::Indented);
    if (f.write(payload) != payload.size()) {
        if (errorOut) *errorOut = f.errorString();
        return false;
    }
    return true;
}
