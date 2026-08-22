#include "OlerSolves.h"
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QJsonDocument>
#include <QJsonObject>

OlerSolves *OlerSolves::instance() {
    static OlerSolves inst(
        QDir::homePath() + QStringLiteral("/.oleride/solves.json"));
    return &inst;
}

OlerSolves::OlerSolves(const QString &filePath, QObject *parent)
    : QObject(parent), m_path(filePath) {
    load();
}

void OlerSolves::load() {
    QFile f(m_path);
    if (!f.open(QIODevice::ReadOnly))
        return;
    const auto doc = QJsonDocument::fromJson(f.readAll());
    if (!doc.isObject())
        return;
    const QJsonObject root = doc.object();
    for (auto it = root.begin(); it != root.end(); ++it) {
        const QDate d = QDate::fromString(it.key(), QStringLiteral("yyyy-MM-dd"));
        if (d.isValid())
            m_counts.insert(d, it.value().toInt());
    }
}

void OlerSolves::addSolve(const QDate &date) {
    m_counts[date]++;
    emit changed();
}

int OlerSolves::countOn(const QDate &date) const {
    return m_counts.value(date, 0);
}

int OlerSolves::totalCount() const {
    int total = 0;
    for (auto it = m_counts.constBegin(); it != m_counts.constEnd(); ++it)
        total += it.value();
    return total;
}

int OlerSolves::streak() const {
    const QDate today = QDate::currentDate();
    QDate cursor = countOn(today) > 0 ? today : today.addDays(-1);
    int streak = 0;
    while (countOn(cursor) > 0) {
        ++streak;
        cursor = cursor.addDays(-1);
    }
    return streak;
}

bool OlerSolves::save(QString *errorOut) {
    const QFileInfo fi(m_path);
    if (!fi.dir().exists() && !QDir().mkpath(fi.absolutePath())) {
        if (errorOut) *errorOut = QStringLiteral("cannot create %1").arg(fi.absolutePath());
        return false;
    }
    QJsonObject root;
    for (auto it = m_counts.constBegin(); it != m_counts.constEnd(); ++it)
        root.insert(it.key().toString(QStringLiteral("yyyy-MM-dd")), it.value());
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
