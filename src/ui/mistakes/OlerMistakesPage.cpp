#include "OlerMistakesPage.h"
#include <QHBoxLayout>
#include <QHeaderView>
#include <QLabel>
#include <QPushButton>
#include <QStringList>
#include <QTableWidget>
#include <QVBoxLayout>

namespace {

QString colorFor(const QString &v) {
    if (v == QLatin1String("AC"))  return QStringLiteral("#34c759");
    if (v == QLatin1String("WA"))  return QStringLiteral("#ff453a");
    if (v == QLatin1String("TLE")) return QStringLiteral("#ff9f0a");
    if (v == QLatin1String("RE"))  return QStringLiteral("#c45c4a");
    if (v == QLatin1String("CE"))  return QStringLiteral("#c49a3c");
    return QStringLiteral("#a0a0a3");
}

} // namespace

OlerMistakesPage::OlerMistakesPage(QWidget *parent)
    : QWidget(parent), m_store(OlerMistakes::instance()) {
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(12, 12, 12, 12);
    layout->setSpacing(8);

    // Verdict filter rail with live counts.
    auto *rail = new QHBoxLayout;
    m_countsLabel = new QLabel(this);
    rail->addWidget(m_countsLabel);
    rail->addStretch();
    const QStringList verdicts = {QString(), QStringLiteral("WA"),
                                  QStringLiteral("TLE"), QStringLiteral("RE"),
                                  QStringLiteral("CE")};
    for (const QString &v : verdicts) {
        auto *btn = new QPushButton(v.isEmpty() ? tr("All") : v, this);
        if (!v.isEmpty())
            btn->setStyleSheet(
                QStringLiteral("color: %1;").arg(colorFor(v)));
        btn->setCheckable(true);
        btn->setChecked(m_verdictFilter == v);
        connect(btn, &QPushButton::clicked, this, [this, v] {
            m_verdictFilter = v;
            rebuild();
        });
        rail->addWidget(btn);
    }
    layout->addLayout(rail);

    m_table = new QTableWidget(this);
    m_table->setColumnCount(5);
    m_table->setHorizontalHeaderLabels({tr("Problem"), tr("Title"), tr("OJ"),
                                        tr("Verdict"), tr("Time")});
    m_table->horizontalHeader()->setStretchLastSection(true);
    m_table->horizontalHeader()->setSectionResizeMode(1, QHeaderView::Stretch);
    m_table->verticalHeader()->setVisible(false);
    m_table->setSelectionBehavior(QAbstractItemView::SelectRows);
    m_table->setSelectionMode(QAbstractItemView::SingleSelection);
    m_table->setEditTriggers(QAbstractItemView::NoEditTriggers);
    layout->addWidget(m_table, /*stretch*/ 1);

    auto *actions = new QHBoxLayout;
    auto *reviewedBtn = new QPushButton(tr("Mark reviewed"), this);
    auto *removeBtn = new QPushButton(tr("Delete"), this);
    actions->addWidget(reviewedBtn);
    actions->addWidget(removeBtn);
    actions->addStretch();
    layout->addLayout(actions);

    connect(reviewedBtn, &QPushButton::clicked, this,
            &OlerMistakesPage::markReviewed);
    connect(removeBtn, &QPushButton::clicked, this,
            &OlerMistakesPage::removeSelected);

    connect(m_store, &OlerMistakes::changed, this, &OlerMistakesPage::rebuild);
    rebuild();
}

void OlerMistakesPage::rebuild() {
    auto counts = m_store->counts();
    QStringList parts;
    for (const QString &v : {QStringLiteral("WA"), QStringLiteral("TLE"),
                             QStringLiteral("RE"), QStringLiteral("CE")}) {
        parts << QStringLiteral("<span style='color:%1'>%2 %3</span>")
                     .arg(colorFor(v), v).arg(counts.value(v));
    }
    m_countsLabel->setText(parts.join(QStringLiteral(" &nbsp; ")));

    QVector<OlerMistake> items;
    for (const OlerMistake &m : m_store->entries(false)) {
        if (m_verdictFilter.isEmpty() || m.verdict == m_verdictFilter)
            items.append(m);
    }

    m_table->setRowCount(items.size());
    for (int i = 0; i < items.size(); ++i) {
        const OlerMistake &m = items.at(i);
        auto *idItem = new QTableWidgetItem(m.problemId);
        idItem->setData(Qt::UserRole, m.id);
        m_table->setItem(i, 0, idItem);
        m_table->setItem(i, 1, new QTableWidgetItem(m.title));
        m_table->setItem(i, 2, new QTableWidgetItem(m.oj));
        auto *verdict = new QTableWidgetItem(m.verdict);
        verdict->setForeground(QColor(colorFor(m.verdict)));
        m_table->setItem(i, 3, verdict);
        m_table->setItem(i, 4, new QTableWidgetItem(
                                   m.when.toLocalTime().toString("MM-dd hh:mm")));
    }
}

void OlerMistakesPage::markReviewed() {
    const int row = m_table->currentRow();
    if (row < 0)
        return;
    const int id = m_table->item(row, 0)->data(Qt::UserRole).toInt();
    if (m_store->markReviewed(id))
        m_store->save();
}

void OlerMistakesPage::removeSelected() {
    const int row = m_table->currentRow();
    if (row < 0)
        return;
    const int id = m_table->item(row, 0)->data(Qt::UserRole).toInt();
    if (m_store->remove(id))
        m_store->save();
}
