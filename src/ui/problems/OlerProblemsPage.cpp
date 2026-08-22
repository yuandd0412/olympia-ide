#include "OlerProblemsPage.h"
#include <QFileDialog>
#include <QHBoxLayout>
#include <QHeaderView>
#include <QInputDialog>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QTableWidget>

namespace {

QString difficultyColor(const QString &d) {
    // docs/03-shell-pages/problems.md state colors:
    // 入门(灰) 普及(info蓝) 提高(warning橙) NOI(error红)
    if (d == QLatin1String("入门")) return QStringLiteral("#a0a0a3");
    if (d == QLatin1String("普及")) return QStringLiteral("#7daed4");
    if (d == QLatin1String("提高")) return QStringLiteral("#ff9f0a");
    if (d == QLatin1String("NOI"))  return QStringLiteral("#ff453a");
    return QStringLiteral("#a0a0a3");
}

} // namespace

OlerProblemsPage::OlerProblemsPage(QWidget *parent)
    : QWidget(parent), m_store(OlerProblems::instance()) {
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(12, 12, 12, 12);
    layout->setSpacing(8);

    auto *topRow = new QHBoxLayout;
    m_search = new QLineEdit(this);
    m_search->setPlaceholderText(tr("Search title / OJ / id ..."));
    auto *addBtn = new QPushButton(tr("+ Add problem"), this);
    topRow->addWidget(m_search, /*stretch*/ 1);
    topRow->addWidget(addBtn);
    layout->addLayout(topRow);

    m_recentLabel = new QLabel(this);
    m_recentLabel->setObjectName("recentStrip");
    layout->addWidget(m_recentLabel);

    m_table = new QTableWidget(this);
    m_table->setColumnCount(4);
    m_table->setHorizontalHeaderLabels({tr("ID"), tr("Title"), tr("OJ"), tr("Difficulty")});
    m_table->horizontalHeader()->setStretchLastSection(true);
    m_table->horizontalHeader()->setSectionResizeMode(1, QHeaderView::Stretch);
    m_table->verticalHeader()->setVisible(false);
    m_table->setSelectionBehavior(QAbstractItemView::SelectRows);
    m_table->setSelectionMode(QAbstractItemView::SingleSelection);
    m_table->setEditTriggers(QAbstractItemView::NoEditTriggers);
    layout->addWidget(m_table, /*stretch*/ 1);

    connect(m_search, &QLineEdit::textChanged, this, &OlerProblemsPage::rebuild);
    connect(addBtn, &QPushButton::clicked, this, &OlerProblemsPage::addProblem);
    connect(m_table, &QTableWidget::cellDoubleClicked,
            this, [this](int row, int) { openRow(row); });

    connect(m_store, &OlerProblems::changed, this, &OlerProblemsPage::rebuild);
    rebuild();
}

void OlerProblemsPage::rebuild() {
    const QString needle = m_search->text().trimmed();
    QVector<OlerProblem> items;
    for (const OlerProblem &p : m_store->all()) {
        if (!needle.isEmpty() &&
            !p.id.contains(needle, Qt::CaseInsensitive) &&
            !p.title.contains(needle, Qt::CaseInsensitive) &&
            !p.oj.contains(needle, Qt::CaseInsensitive))
            continue;
        items.append(p);
    }

    QString recents;
    for (const OlerProblem &p : m_store->recent())
        recents += p.id + QStringLiteral("  ");
    m_recentLabel->setText(recents.isEmpty()
                               ? tr("Recent: pick a problem to start")
                               : tr("Recent: %1").arg(recents.trimmed()));

    m_table->setRowCount(items.size());
    for (int i = 0; i < items.size(); ++i) {
        const OlerProblem &p = items.at(i);
        auto *idItem = new QTableWidgetItem(p.id);
        idItem->setData(Qt::UserRole, p.id); // row -> id mapping
        m_table->setItem(i, 0, idItem);
        m_table->setItem(i, 1, new QTableWidgetItem(p.title));
        m_table->setItem(i, 2, new QTableWidgetItem(p.oj));
        auto *diff = new QTableWidgetItem(p.difficulty);
        diff->setForeground(QColor(difficultyColor(p.difficulty)));
        m_table->setItem(i, 3, diff);
    }
}

void OlerProblemsPage::openRow(int row) {
    if (row < 0 || row >= m_table->rowCount())
        return;
    const QString id = m_table->item(row, 0)->data(Qt::UserRole).toString();
    const OlerProblem p = m_store->find(id);
    if (p.isValid()) {
        m_store->touchRecent(id);
        emit openRequested(p);
    }
}

void OlerProblemsPage::addProblem() {
    const QString id = QInputDialog::getText(this, tr("Add problem"),
                                             tr("Problem id (e.g. P1001):"));
    if (id.trimmed().isEmpty())
        return;
    OlerProblem p;
    p.id = id.trimmed();
    p.title = QInputDialog::getText(this, tr("Add problem"), tr("Title:"));
    static const QStringList ojs = {QStringLiteral("Luogu"), QStringLiteral("Codeforces"),
                                    QStringLiteral("AtCoder")};
    bool ok = false;
    p.oj = QInputDialog::getItem(this, tr("Add problem"), tr("OJ:"),
                                 ojs, 0, false, &ok);
    if (!ok) return;
    static const QStringList diffs = {QStringLiteral("入门"), QStringLiteral("普及"),
                                      QStringLiteral("提高"), QStringLiteral("NOI")};
    p.difficulty = QInputDialog::getItem(this, tr("Add problem"), tr("Difficulty:"),
                                         diffs, 0, false, &ok);
    if (!ok) return;
    m_store->upsert(p);
    m_store->save();
}
