#include "OlerMistakes.h"
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QHash>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>

namespace {

QJsonObject mistakeToJson(const OlerMistake &m) {
    QJsonObject o;
    o.insert(QStringLiteral("id"), m.id);
    o.insert(QStringLiteral("problemId"), m.problemId);
    o.insert(QStringLiteral("title"), m.title);
    o.insert(QStringLiteral("oj"), m.oj);
    o.insert(QStringLiteral("verdict"), m.verdict);
    o.insert(QStringLiteral("when"), m.when.toMSecsSinceEpoch());
    o.insert(QStringLiteral("reviewed"), m.reviewed);
    return o;
}

OlerMistake mistakeFromJson(const QJsonObject &o) {
    OlerMistake m;
    m.id = o.value(QLatin1String("id")).toInt();
    m.problemId = o.value(QLatin1String("problemId")).toString();
    m.title = o.value(QLatin1String("title")).toString();
    m.oj = o.value(QLatin1String("oj")).toString();
    m.verdict = o.value(QLatin1String("verdict")).toString();
    m.when = QDateTime::fromMSecsSinceEpoch(
        o.value(QLatin1String("when")).toVariant().toLongLong());
    m.reviewed = o.value(QLatin1String("reviewed")).toBool();
    return m;
}

} // namespace

OlerMistakes *OlerMistakes::instance() {
    static OlerMistakes inst(
        QDir::homePath() + QStringLiteral("/.oleride/mistakes.json"));
    return &inst;
}

OlerMistakes::OlerMistakes(const QString &filePath, QObject *parent)
    : QObject(parent), m_path(filePath) {
    load();
}

void OlerMistakes::load() {
    QFile f(m_path);
    if (!f.open(QIODevice::ReadOnly))
        return;
    const auto doc = QJsonDocument::fromJson(f.readAll());
    if (!doc.isObject())
        return;
    const QJsonObject root = doc.object();
    m_nextId = root.value(QLatin1String("nextId")).toInt(1);
    for (const auto &v : root.value(QLatin1String("entries")).toArray())
        m_entries.append(mistakeFromJson(v.toObject()));
}

int OlerMistakes::indexOf(int id) const {
    for (int i = 0; i < m_entries.size(); ++i)
        if (m_entries.at(i).id == id)
            return i;
    return -1;
}

QVector<OlerMistake> OlerMistakes::entries(bool includeReviewed) const {
    if (includeReviewed)
        return m_entries;
    QVector<OlerMistake> out;
    for (const OlerMistake &m : m_entries)
        if (!m.reviewed)
            out.append(m);
    return out;
}

int OlerMistakes::add(const OlerMistake &m) {
    OlerMistake fresh = m;
    fresh.id = m_nextId++;
    if (!fresh.when.isValid())
        fresh.when = QDateTime::currentDateTimeUtc();
    m_entries.prepend(fresh); // newest first, matches journal sort
    emit changed();
    emit mistakeAdded(fresh.id);
    return fresh.id;
}

bool OlerMistakes::markReviewed(int id) {
    const int i = indexOf(id);
    if (i < 0 || m_entries[i].reviewed)
        return false;
    m_entries[i].reviewed = true;
    emit changed();
    return true;
}

bool OlerMistakes::remove(int id) {
    const int i = indexOf(id);
    if (i < 0)
        return false;
    m_entries.removeAt(i);
    emit changed();
    return true;
}

QHash<QString, int> OlerMistakes::counts() const {
    QHash<QString, int> out;
    for (const OlerMistake &m : entries(false))
        out[m.verdict]++;
    return out;
}

bool OlerMistakes::save(QString *errorOut) {
    const QFileInfo fi(m_path);
    if (!fi.dir().exists() && !QDir().mkpath(fi.absolutePath())) {
        if (errorOut) *errorOut = QStringLiteral("cannot create %1").arg(fi.absolutePath());
        return false;
    }
    QJsonArray arr;
    for (const OlerMistake &m : m_entries)
        arr.append(mistakeToJson(m));
    QJsonObject root;
    root.insert(QStringLiteral("nextId"), m_nextId);
    root.insert(QStringLiteral("entries"), arr);

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
