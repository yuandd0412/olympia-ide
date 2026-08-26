#pragma once
#include <QObject>
#include <QVariant>
#include <QJsonObject>

class OlerSettings : public QObject {
    Q_OBJECT
public:
    static OlerSettings *instance();

    explicit OlerSettings(const QString &filePath, QObject *parent = nullptr);
    ~OlerSettings() override;

    QString filePath() const;

    QVariant value(const QString &key, const QVariant &defaultValue = {}) const;
    void setValue(const QString &key, const QVariant &val);

    bool contains(const QString &key) const;
    void remove(const QString &key);

    bool save(QString *errorOut = nullptr);
    bool exportTo(const QString &path, QString *errorOut = nullptr) const;
    bool importFrom(const QString &path, QString *errorOut = nullptr);

signals:
    void settingChanged(const QString &key, const QVariant &value);

private:
    void load();
    void applyDefaults();

    QString m_path;
    QJsonObject m_data;
};
