#include "OlerMistakesPage.h"
#include <QDate>
#include <QHBoxLayout>
#include <QHeaderView>
#include <QLabel>
#include <QPainter>
#include <QPushButton>
#include <QStringList>
#include <QTableWidget>
#include <QVBoxLayout>

namespace {

// Verdict tokens (00-design-spec section 1.5).
QString colorFor(const QString &v) {
    if (v == QLatin1String("AC"))  return QStringLiteral("#34c759");
    if (v == QLatin1String("WA"))  return QStringLiteral("#ff453a");
    if (v == QLatin1String("TLE")) return QStringLiteral("#ff9f0a");
    if (v == QLatin1String("RE"))  return QStringLiteral("#c45c4a");
    if (v == QLatin1String("CE"))  return QStringLiteral("#c49a3c");
    return QStringLiteral("#a0a0a3");
}

// 7x4 frequency heatmap of the last 28 days (visual hint, non-interactive
// in v1 per docs/03-shell-pages/mistakes.md).
class Heatmap : public QWidget {
public:
    explicit Heatmap(OlerMistakes *store, QWidget *parent = nullptr)
        : QWidget(parent), m_store(store) {
        setFixedSize(154, 92);
    }
protected:
    void paintEvent(QPaintEvent *) override {
        QPainter p(this);
        p.setRenderHint(QPainter::Antialiasing);
        const QDate today = QDate::currentDate();
        QVector<int> counts(28, 0);
        for (const OlerMistake &m : m_store->entries(true)) {
            const int daysAgo =
                static_cast<int>(m.when.date().daysTo(today));
            if (daysAgo >= 0 && daysAgo < 28)
                ++counts[27 - daysAgo];
        }
        int maxV = 1;
        for (int c : counts) maxV = qMax(maxV, c);

        constexpr int kCell = 18, kGap = 3;
        for (int i = 0; i < 28; ++i) {
            const int r = i / 7, c = i % 7;
            const int level = counts[i] == 0 ? 0
                              : 1 + counts[i] * 3 / maxV; // 0..4
            QColor cell(Qt::GlobalColor::white);
            switch (level) { // primary #d97757 with rising alpha
            case 0: cell = QColor(255, 255, 255, 12); break;
            case 1: cell = QColor(217, 119, 87, 60); break;
            case 2: cell = QColor(217, 119, 87, 120); break;
            case 3: cell = QColor(217, 119, 87, 180); break;
            default: cell = QColor(217, 119, 87); break;
            }
            p.fillRect(c * (kCell + kGap), r * (kCell + kGap),
                       kCell, kCell, cell);
        }
    }
private:
    OlerMistakes *m_store;
};

} // namespace

OlerMistakesPage::OlerMistakesPage(QWidget *parent)
    : QWidget(parent), m_store(OlerMistakes::instance()) {
    auto *rootLayout = new QHBoxLayout(this);
    rootLayout->setContentsMargins(12, 12, 12, 12);
    rootLayout->setSpacing(16);

    auto *mainCol = new QVBoxLayout;
    mainCol->setSpacing(8);

    // Verdict filter chips with live counts.
    auto *rail = new QHBoxLayout;
    m_countsLabel = new QLabel(this);
    rail->addWidget(m_countsLabel);
    rail->addStretch();
    const QStringList verdicts = {QString(), QStringLiteral("WA"),
                                  QStringLiteral("TLE"), QStringLiteral("RE"),
                                  QStringLiteral("CE")};
    for (const QString &v : verdicts) {
        auto *btn = new QPushButton(v.isEmpty() ? tr("All") : v, this);
        btn->setProperty("verdictChip", true);
        btn->setCheckable(true);
        btn->setChecked(m_verdictFilter == v);
        connect(btn, &QPushButton::clicked, this, [this, v] {
            m_verdictFilter = v;
            rebuild();
        });
        rail->addWidget(btn);
    }
    mainCol->addLayout(rail);

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
    mainCol->addWidget(m_table, /*stretch*/ 1);

    auto *actions = new QHBoxLayout;
    auto *reviewedBtn = new QPushButton(tr("Mark reviewed"), this);
    auto *removeBtn = new QPushButton(tr("Delete"), this);
    actions->addWidget(reviewedBtn);
    actions->addWidget(removeBtn);
    actions->addStretch();
    mainCol->addLayout(actions);
    rootLayout->addLayout(mainCol, /*stretch*/ 1);

    // Right rail: heatmap hint card.
    auto *railCard = new QVBoxLayout;
    auto *heatCaption = new QLabel(tr("Last 28 days"), this);
    heatCaption->setObjectName(QStringLiteral("sectionCaption"));
    railCard->addWidget(heatCaption);
    railCard->addWidget(new Heatmap(m_store, this));
    railCard->addStretch();
    rootLayout->addLayout(railCard);

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
