#include "OlerSettings.h"
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonParseError>
#include <QSet>

namespace {

// Defaults are the single source of truth for first-run behavior.
// Keys use "group/name" so the Settings UI can group them without
// re-mapping. Values must stay JSON-serializable.
const QJsonObject kDefaults = {
    {QStringLiteral("theme"),                QStringLiteral("MistBlue")},
    {QStringLiteral("editor/fontSize"),      13},
    {QStringLiteral("compiler/gxxPath"),     QStringLiteral("C:/Qt/Tools/mingw1310_64/bin/g++.exe")},
    {QStringLiteral("compiler/optLevel"),    QStringLiteral("-O2")},
    {QStringLiteral("compiler/stdFlag"),     QStringLiteral("-std=c++17")},
    {QStringLiteral("compiler/extraFlags"),  QStringLiteral("")},
    {QStringLiteral("limits/timeMs"),        1000},
    {QStringLiteral("limits/memoryMb"),      64},
    {QStringLiteral("training/dailyGoal"),   5},
};

QVariant jsonToVariant(const QJsonValue &v) {
    if (v.isBool()) return v.toBool();
    if (v.isDouble()) return v.toDouble();
    if (v.isString()) return v.toString();
    if (v.isArray()) {
        QVariantList values;
        for (const QJsonValue &item : v.toArray())
            values.append(jsonToVariant(item));
        return values;
    }
    return {};
}

QJsonValue variantToJson(const QVariant &v) {
    switch (v.typeId()) {
    case QMetaType::Bool: return v.toBool();
    case QMetaType::Int:
    case QMetaType::LongLong:
    case QMetaType::Double: return v.toDouble();
    case QMetaType::QStringList: {
        QJsonArray values;
        for (const QString &item : v.toStringList())
            values.append(item);
        return values;
    }
    case QMetaType::QVariantList: {
        QJsonArray values;
        for (const QVariant &item : v.toList())
            values.append(variantToJson(item));
        return values;
    }
    default: return v.toString();
    }
}

} // namespace

OlerSettings *OlerSettings::instance() {
    static OlerSettings inst(
        QDir::homePath() + QStringLiteral("/.oleride/settings.json"));
    return &inst;
}

OlerSettings::OlerSettings(const QString &filePath, QObject *parent)
    : QObject(parent), m_path(filePath) {
    load();
    applyDefaults();
}

OlerSettings::~OlerSettings() = default;

QString OlerSettings::filePath() const {
    return m_path;
}

void OlerSettings::load() {
    QFile f(m_path);
    if (!f.open(QIODevice::ReadOnly))
        return;
    QJsonParseError err;
    const auto doc = QJsonDocument::fromJson(f.readAll(), &err);
    if (err.error != QJsonParseError::NoError || !doc.isObject())
        return;
    m_data = doc.object();
}

void OlerSettings::applyDefaults() {
    for (auto it = kDefaults.begin(); it != kDefaults.end(); ++it)
        if (!m_data.contains(it.key()))
            m_data.insert(it.key(), it.value());
}

QVariant OlerSettings::value(const QString &key, const QVariant &defaultValue) const {
    const auto it = m_data.constFind(key);
    if (it == m_data.constEnd())
        return defaultValue;
    return jsonToVariant(*it);
}

void OlerSettings::setValue(const QString &key, const QVariant &val) {
    const QJsonValue fresh = variantToJson(val);
    const auto it = m_data.constFind(key);
    if (it != m_data.constEnd() && *it == fresh)
        return;
    m_data.insert(key, fresh);
    emit settingChanged(key, val);
}

bool OlerSettings::contains(const QString &key) const {
    return m_data.contains(key);
}

void OlerSettings::remove(const QString &key) {
    if (!m_data.contains(key))
        return;
    m_data.remove(key);
    emit settingChanged(key, {});
}

bool OlerSettings::save(QString *errorOut) {
    const QFileInfo fi(m_path);
    if (!fi.dir().exists() && !QDir().mkpath(fi.absolutePath())) {
        if (errorOut) *errorOut = QStringLiteral("cannot create %1").arg(fi.absolutePath());
        return false;
    }
    QFile f(m_path);
    if (!f.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
        if (errorOut) *errorOut = f.errorString();
        return false;
    }
    const auto payload = QJsonDocument(m_data).toJson(QJsonDocument::Indented);
    if (f.write(payload) != payload.size()) {
        if (errorOut) *errorOut = f.errorString();
        return false;
    }
    return true;
}

bool OlerSettings::exportTo(const QString &path, QString *errorOut) const {
    const QFileInfo fi(path);
    if (!fi.dir().exists() && !QDir().mkpath(fi.absolutePath())) {
        if (errorOut) *errorOut = QStringLiteral("cannot create %1").arg(fi.absolutePath());
        return false;
    }
    QFile f(path);
    if (!f.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
        if (errorOut) *errorOut = f.errorString();
        return false;
    }
    const QByteArray payload = QJsonDocument(m_data).toJson(QJsonDocument::Indented);
    if (f.write(payload) != payload.size()) {
        if (errorOut) *errorOut = f.errorString();
        return false;
    }
    return true;
}

bool OlerSettings::importFrom(const QString &path, QString *errorOut) {
    QFile f(path);
    if (!f.open(QIODevice::ReadOnly)) {
        if (errorOut) *errorOut = f.errorString();
        return false;
    }
    QJsonParseError parseError;
    const QJsonDocument doc = QJsonDocument::fromJson(f.readAll(), &parseError);
    if (parseError.error != QJsonParseError::NoError || !doc.isObject()) {
        if (errorOut) *errorOut = parseError.errorString();
        return false;
    }

    const QJsonObject previous = m_data;
    m_data = doc.object();
    applyDefaults();
    if (!save(errorOut)) {
        m_data = previous;
        return false;
    }

    QSet<QString> keys;
    for (auto it = previous.constBegin(); it != previous.constEnd(); ++it)
        keys.insert(it.key());
    for (auto it = m_data.constBegin(); it != m_data.constEnd(); ++it)
        keys.insert(it.key());
    for (const QString &key : keys) {
        if (previous.value(key) != m_data.value(key))
            emit settingChanged(key, jsonToVariant(m_data.value(key)));
    }
    return true;
}
