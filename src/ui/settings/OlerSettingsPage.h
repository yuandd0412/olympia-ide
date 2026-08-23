#pragma once
#include <QWidget>
#include <functional>

class QComboBox;
class QSpinBox;
class QLineEdit;
class QLabel;

// Settings page — single-column (max 660px) stacked sections, per the
// v0 HTML prototype: form rows = [140px right-aligned label][control][hint],
// radio pills for enum choices, kbd chips for shortcuts. Every control
// binds to an OlerSettings key and persists immediately.
class OlerSettingsPage : public QWidget {
    Q_OBJECT
public:
    explicit OlerSettingsPage(QWidget *parent = nullptr);

private slots:
    void detectCompiler();

private:
    QWidget *buildPage();
    QWidget *section(const QString &titleText, const QList<QWidget *> &rows);
    QWidget *formRow(const QString &label, QWidget *control,
                     const QString &hint = {});
    QWidget *pillGroup(const QStringList &items, const QString &checked,
                       const std::function<void(const QString &)> &onPick);

    QLineEdit *m_gxxPath = nullptr;
};
