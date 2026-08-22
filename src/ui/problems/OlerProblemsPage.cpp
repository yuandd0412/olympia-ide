#include "OlerProblemsPage.h"
#include <QGridLayout>
#include <QInputDialog>
#include <QLabel>
#include <QLineEdit>
#include <QMouseEvent>
#include <QPushButton>
#include <QScrollArea>
#include <QVBoxLayout>

namespace {

// Difficulty chip colors (00-design-spec section 4.1):
// 入门 grey / 普及 info blue / 提高 warning orange / NOI error red.
QString difficultyColor(const QString &d) {
    if (d == QLatin1String("入门")) return QStringLiteral("#6e6d68");
    if (d == QLatin1String("普及")) return QStringLiteral("#7daed4");
    if (d == QLatin1String("提高")) return QStringLiteral("#ff9f0a");
    if (d == QLatin1String("NOI"))  return QStringLiteral("#ff453a");
    return QStringLiteral("#a0a0a3");
}

QString elide(const QString &s, int n) {
    return s.size() <= n ? s : s.left(n - 1) + QStringLiteral("…");
}

// One problem card: id (mono, accent), title, OJ + difficulty chips.
class ProblemCard : public QFrame {
    Q_OBJECT
public:
    explicit ProblemCard(const OlerProblem &p, QWidget *parent = nullptr)
        : QFrame(parent), m_problem(p) {
        setObjectName(QStringLiteral("problemCard"));
        setFixedSize(190, 84);
        auto *layout = new QVBoxLayout(this);
        layout->setContentsMargins(10, 8, 10, 8);
        layout->setSpacing(2);

        auto *id = new QLabel(p.id, this);
        id->setObjectName(QStringLiteral("cardId"));
        layout->addWidget(id);

        auto *title = new QLabel(elide(p.title.isEmpty() ? p.id : p.title, 22), this);
        title->setObjectName(QStringLiteral("cardTitle"));
        layout->addWidget(title);

        auto *row = new QHBoxLayout;
        row->setSpacing(6);
        auto *oj = new QLabel(p.oj, this);
        oj->setObjectName(QStringLiteral("chipBadge"));
        oj->setProperty("chipKind", "oj");
        auto *diff = new QLabel(p.difficulty, this);
        diff->setObjectName(QStringLiteral("chipBadge"));
        diff->setStyleSheet(
            QStringLiteral("color: %1;").arg(difficultyColor(p.difficulty)));
        row->addWidget(oj);
        row->addWidget(diff);
        row->addStretch();
        layout->addLayout(row);
    }

signals:
    void clicked(const OlerProblem &problem);

protected:
    void mouseReleaseEvent(QMouseEvent *e) override {
        if (e->button() == Qt::LeftButton)
            emit clicked(m_problem);
        QFrame::mouseReleaseEvent(e);
    }

private:
    OlerProblem m_problem;
};

} // namespace

#include "OlerProblemsPage.moc"

OlerProblemsPage::OlerProblemsPage(QWidget *parent)
    : QWidget(parent), m_store(OlerProblems::instance()) {
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(12, 12, 12, 12);
    layout->setSpacing(10);

    auto *topRow = new QHBoxLayout;
    m_search = new QLineEdit(this);
    m_search->setPlaceholderText(tr("Search title / OJ / id ..."));
    m_search->setFixedHeight(28);
    auto *addBtn = new QPushButton(tr("+ Add problem"), this);
    topRow->addWidget(m_search, /*stretch*/ 1);
    topRow->addWidget(addBtn);
    layout->addLayout(topRow);

    // Recent strip (8 cards max, MRU order).
    auto *recentBlock = new QVBoxLayout;
    recentBlock->setSpacing(4);
    auto *recentHeader =
        new QLabel(tr("Recent problems"), this);
    recentHeader->setObjectName(QStringLiteral("sectionCaption"));
    recentBlock->addWidget(recentHeader);
    m_recentRow = new QWidget(this);
    m_recentLayout = new QVBoxLayout(m_recentRow);
    m_recentLayout->setContentsMargins(0, 0, 0, 0);
    recentBlock->addWidget(m_recentRow);
    layout->addLayout(recentBlock);

    // Card grid.
    auto *allHeader = new QLabel(tr("All problems"), this);
    allHeader->setObjectName(QStringLiteral("sectionCaption"));
    layout->addWidget(allHeader);

    m_scroll = new QScrollArea(this);
    m_scroll->setWidgetResizable(true);
    m_scroll->setFrameShape(QFrame::NoFrame);
    m_gridHost = new QWidget;
    m_grid = new QGridLayout(m_gridHost);
    m_grid->setContentsMargins(0, 0, 8, 0);
    m_grid->setSpacing(10);
    m_grid->setAlignment(Qt::AlignTop | Qt::AlignLeft);
    m_scroll->setWidget(m_gridHost);
    layout->addWidget(m_scroll, /*stretch*/ 1);

    connect(m_search, &QLineEdit::textChanged, this, &OlerProblemsPage::rebuild);
    connect(addBtn, &QPushButton::clicked, this, &OlerProblemsPage::addProblem);
    connect(m_store, &OlerProblems::changed, this, &OlerProblemsPage::rebuild);
    rebuild();
}

void OlerProblemsPage::rebuildRecent() {
    // Drop old mini-cards.
    while (QWidget *w = m_recentRow->findChild<QWidget *>())
        delete w;

    const auto recents = m_store->recent();
    if (recents.isEmpty()) {
        auto *empty = new QLabel(tr("Pick a problem to start"), m_recentRow);
        empty->setObjectName(QStringLiteral("recentEmpty"));
        m_recentLayout->addWidget(empty);
        return;
    }
    auto *row = new QHBoxLayout;
    row->setSpacing(8);
    for (const OlerProblem &p : recents) {
        auto *mini = new QPushButton(
            QStringLiteral("%1  %2").arg(p.id, elide(p.title, 12)), m_recentRow);
        mini->setObjectName(QStringLiteral("recentChip"));
        mini->setFixedHeight(26);
        const QString id = p.id;
        connect(mini, &QPushButton::clicked, this, [this, id] {
            emit openRequested(m_store->find(id));
        });
        row->addWidget(mini);
    }
    row->addStretch();
    m_recentLayout->addLayout(row);
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
    rebuildRecent();

    // Clear the grid.
    while (QWidget *w = m_gridHost->findChild<QWidget *>())
        delete w;
    delete m_grid;
    m_grid = new QGridLayout(m_gridHost);
    m_grid->setContentsMargins(0, 0, 8, 0);
    m_grid->setSpacing(10);
    m_grid->setAlignment(Qt::AlignTop | Qt::AlignLeft);

    constexpr int kCols = 5;
    int col = 0, row = 0;
    for (const OlerProblem &p : items) {
        auto *card = new ProblemCard(p, m_gridHost);
        connect(card, &ProblemCard::clicked, this, [this](const OlerProblem &pr) {
            m_store->touchRecent(pr.id);
            emit openRequested(pr);
        });
        m_grid->addWidget(card, row, col);
        if (++col >= kCols) { col = 0; ++row; }
    }
    if (items.isEmpty()) {
        m_grid->addWidget(new QLabel(tr("No problems yet - use "
                                        "\"+ Add problem\""), m_gridHost),
                          0, 0);
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
