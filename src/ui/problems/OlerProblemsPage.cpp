#include "OlerProblemsPage.h"
#include "core/solves/OlerSolves.h"
#include "core/theme/CThemeManager.h"
#include "ui/common/OlerIcons.h"
#include "ui/common/OlerTheme.h"
#include <QGridLayout>
#include <QHBoxLayout>
#include <QInputDialog>
#include <QLabel>
#include <QLineEdit>
#include <QMouseEvent>
#include <QPushButton>
#include <QScrollArea>
#include <QVBoxLayout>

namespace {

QColor accent() {
    return OlerTheme::accentForTheme(
        CThemeManager::instance()->currentTheme());
}

QString rgbaStr(const QColor &c, int alpha255) {
    return QStringLiteral("rgba(%1,%2,%3,%4)")
        .arg(c.red()).arg(c.green()).arg(c.blue())
        .arg(alpha255 / 255.0, 0, 'f', 3);
}

QString ojPillStyle(const QString &oj) {
    QColor fg("#a0a0a3");
    if (oj == QLatin1String("Luogu"))      fg = QColor("#73ba4b");
    else if (oj == QLatin1String("Codeforces")) fg = QColor("#7daed4");
    else if (oj == QLatin1String("AtCoder"))    fg = QColor("#b57850");
    else if (oj == QLatin1String("LOJ"))   fg = QColor("#c29e5a");
    else if (oj == QLatin1String("UOJ"))   fg = QColor("#a078c8");
    return QStringLiteral(
               "color:%1;background:%2;")
        .arg(fg.name(), rgbaStr(fg, 38));
}

QString diffColor(const QString &d) {
    if (d == QLatin1String("入门")) return QStringLiteral("#34c759");
    if (d.startsWith(QLatin1String("普及"))) return QStringLiteral("#ff9f0a");
    return QStringLiteral("#ff453a");
}

QString elide(const QString &s, int n) {
    return s.size() <= n ? s : s.left(n - 1) + QStringLiteral("\u2026");
}

QWidget *sectionHeader(const QString &title, const QString &action,
                       QWidget *parent) {
    auto *w = new QWidget(parent);
    auto *lay = new QHBoxLayout(w);
    lay->setContentsMargins(0, 0, 0, 12);
    auto *t = new QLabel(title, w);
    t->setObjectName(QStringLiteral("sectionTitle"));
    lay->addWidget(t);
    lay->addStretch();
    if (!action.isEmpty()) {
        auto *a = new QLabel(action, w);
        a->setObjectName(QStringLiteral("sectionAction"));
        lay->addWidget(a);
    }
    return w;
}

// Minimal clickable card surface.
class ClickableFrame : public QFrame {
    Q_OBJECT
public:
    explicit ClickableFrame(QWidget *parent = nullptr) : QFrame(parent) {
        setCursor(Qt::PointingHandCursor);
    }
signals:
    void clicked();
protected:
    void mouseReleaseEvent(QMouseEvent *e) override {
        if (e->button() == Qt::LeftButton)
            emit clicked();
        QFrame::mouseReleaseEvent(e);
    }
};

} // namespace

#include "OlerProblemsPage.moc"

OlerProblemsPage::OlerProblemsPage(QWidget *parent)
    : QWidget(parent), m_store(OlerProblems::instance()) {
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(24, 20, 24, 20);
    layout->setSpacing(16);

    // Search: 36px elevated field with magnifier + Ctrl K chips.
    auto *searchWrap = new QWidget(this);
    searchWrap->setObjectName(QStringLiteral("searchWrap"));
    auto *sw = new QHBoxLayout(searchWrap);
    sw->setContentsMargins(12, 0, 10, 0);
    sw->setSpacing(6);
    auto *mag = new QLabel(searchWrap);
    mag->setPixmap(OlerIcons::make(OlerIcons::Name::Search,
                                   QColor("#6e6d68"), 14).pixmap(14, 14));
    mag->setFixedSize(14, 14);
    sw->addWidget(mag);
    m_search = new QLineEdit(searchWrap);
    m_search->setObjectName(QStringLiteral("searchInput"));
    m_search->setPlaceholderText(tr("搜索题目、OJ、标签..."));
    m_search->setFixedHeight(36);
    m_search->setFrame(false);
    sw->addWidget(m_search, /*stretch*/ 1);
    auto *kbdRow = new QHBoxLayout;
    kbdRow->setSpacing(4);
    for (const QString &k : {QStringLiteral("Ctrl"), QStringLiteral("K")}) {
        auto *chip = new QLabel(k, searchWrap);
        chip->setObjectName(QStringLiteral("kbdKey"));
        kbdRow->addWidget(chip);
    }
    sw->addLayout(kbdRow);
    layout->addWidget(searchWrap);

    // Quick actions.
    auto *qa = new QHBoxLayout;
    qa->setSpacing(8);
    auto *pull = new QPushButton(tr("拉取题目"), this);
    pull->setProperty("psPrimary", true);
    pull->setEnabled(false); // OJ ingest lands in Phase 6
    pull->setToolTip(tr("OJ 拉取将在 Phase 6 提供"));
    qa->addWidget(pull);
    auto *addBtn = new QPushButton(tr("新建题目"), this);
    addBtn->setProperty("psSecondary", true);
    connect(addBtn, &QPushButton::clicked, this,
            &OlerProblemsPage::addProblem);
    qa->addWidget(addBtn);
    auto *importBtn = new QPushButton(tr("导入"), this);
    importBtn->setProperty("psSecondary", true);
    importBtn->setEnabled(false);
    importBtn->setToolTip(tr("批量导入将在 Phase 6 提供"));
    qa->addWidget(importBtn);
    qa->addStretch();
    layout->addLayout(qa);

    // Recent strip (horizontal).
    layout->addWidget(sectionHeader(tr("最近题目"), tr("查看全部"), this));
    auto *recentScroll = new QScrollArea(this);
    recentScroll->setWidgetResizable(true);
    recentScroll->setFixedHeight(72);
    recentScroll->setFrameShape(QFrame::NoFrame);
    recentScroll->setVerticalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    m_recentRowHost = new QWidget;
    m_recentRowHost->setObjectName(QStringLiteral("favrow"));
    auto *rl = new QHBoxLayout(m_recentRowHost);
    rl->setContentsMargins(0, 0, 4, 4);
    rl->setSpacing(10);
    rl->addStretch();
    recentScroll->setWidget(m_recentRowHost);
    layout->addWidget(recentScroll);

    // Grid.
    layout->addWidget(sectionHeader(tr("全部题目"), tr("筛选"), this));
    m_gridHost = new QWidget;
    m_grid = new QGridLayout(m_gridHost);
    m_grid->setContentsMargins(0, 0, 0, 0);
    m_grid->setSpacing(10);
    layout->addWidget(m_gridHost);

    // Stats strip.
    layout->addWidget(buildStatsStrip());
    layout->addStretch();

    connect(m_search, &QLineEdit::textChanged, this,
            &OlerProblemsPage::rebuild);
    connect(m_store, &OlerProblems::changed, this, &OlerProblemsPage::rebuild);
    rebuild();
}

QWidget *OlerProblemsPage::makeRecentCard(const OlerProblem &p) {
    auto *card = new ClickableFrame(m_recentRowHost);
    card->setObjectName(QStringLiteral("favCard"));
    card->setFixedSize(220, 62);
    auto *lay = new QHBoxLayout(card);
    lay->setContentsMargins(12, 12, 12, 12);
    lay->setSpacing(10);
    auto *icon = new QLabel(card);
    icon->setPixmap(OlerIcons::make(OlerIcons::Name::Zap,
                                    accent(), 16).pixmap(16, 16));
    icon->setFixedSize(36, 36);
    icon->setAlignment(Qt::AlignCenter);
    icon->setStyleSheet(
        QStringLiteral("border-radius:6px;background:%1;")
            .arg(rgbaStr(accent(), 38)));
    lay->addWidget(icon);
    auto *infoCol = new QVBoxLayout;
    infoCol->setSpacing(1);
    auto *fid = new QLabel(p.id, card);
    fid->setObjectName(QStringLiteral("favId"));
    auto *ftitle = new QLabel(elide(p.title, 14), card);
    ftitle->setObjectName(QStringLiteral("favTitle"));
    infoCol->addWidget(fid);
    infoCol->addWidget(ftitle);
    lay->addLayout(infoCol);

    const QString id = p.id;
    connect(card, &ClickableFrame::clicked, this, [this, id] {
        OlerProblem pr = m_store->find(id);
        if (pr.isValid()) {
            m_store->touchRecent(id);
            emit openRequested(pr);
        }
    });
    return card;
}

QWidget *OlerProblemsPage::makeCard(const OlerProblem &p) {
    auto *card = new ClickableFrame(m_gridHost);
    card->setObjectName(QStringLiteral("problemCard"));
    card->setFixedHeight(118);
    auto *lay = new QVBoxLayout(card);
    lay->setContentsMargins(14, 14, 14, 14);
    lay->setSpacing(8);

    auto *top = new QHBoxLayout;
    top->setSpacing(8);
    auto *pid = new QLabel(p.id, card);
    pid->setObjectName(QStringLiteral("cardId"));
    top->addWidget(pid);
    top->addStretch();
    lay->addLayout(top);

    auto *title = new QLabel(elide(p.title.isEmpty() ? p.id : p.title, 26),
                             card);
    title->setObjectName(QStringLiteral("cardTitle"));
    title->setWordWrap(true);
    title->setMinimumHeight(35);
    title->setAlignment(Qt::AlignTop | Qt::AlignLeft);
    lay->addWidget(title);

    auto *meta = new QHBoxLayout;
    meta->setSpacing(6);
    auto *oj = new QLabel(elide(p.oj, 12), card);
    oj->setObjectName(QStringLiteral("ojPill"));
    oj->setStyleSheet(ojPillStyle(p.oj));
    meta->addWidget(oj);
    QFrame *dot = new QFrame(card);
    dot->setFixedSize(8, 8);
    dot->setStyleSheet(QStringLiteral(
                           "border-radius:4px;background:%1;")
                           .arg(diffColor(p.difficulty)));
    meta->addWidget(dot);
    auto *dlabel = new QLabel(elide(p.difficulty, 10), card);
    dlabel->setObjectName(QStringLiteral("diffLabel"));
    meta->addWidget(dlabel);
    meta->addStretch();
    lay->addLayout(meta);

    const QString id = p.id;
    connect(card, &ClickableFrame::clicked, this, [this, id] {
        OlerProblem pr = m_store->find(id);
        if (pr.isValid()) {
            m_store->touchRecent(id);
            emit openRequested(pr);
        }
    });
    return card;
}

void OlerProblemsPage::rebuildRecent() {
    // Drop old mini-cards.
    const auto olds = m_recentRowHost->findChildren<QWidget *>();
    for (QWidget *w : olds)
        if (w != m_recentRowHost) w->deleteLater();

    const auto recents = m_store->recent();
    auto *rl =
        qobject_cast<QHBoxLayout *>(m_recentRowHost->layout());
    if (recents.isEmpty()) {
        rl->insertWidget(0, new QLabel(tr("从题库选一道题，开始今天的训练"),
                                       m_recentRowHost), 0, Qt::AlignVCenter);
        return;
    }
    int idx = 0;
    for (const OlerProblem &p : recents) {
        QWidget *c = makeRecentCard(p);
        c->setParent(m_recentRowHost);
        rl->insertWidget(idx++, c);
    }
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

    // Clear the grid (cards parented to gridHost).
    const auto olds = m_gridHost->findChildren<QWidget *>();
    for (QWidget *w : olds)
        if (w != m_gridHost) w->deleteLater();
    delete m_grid;
    m_grid = new QGridLayout(m_gridHost);
    m_grid->setContentsMargins(0, 0, 0, 0);
    m_grid->setSpacing(10);

    constexpr int kCols = 4;
    int col = 0, row = 0;
    for (const OlerProblem &p : items) {
        m_grid->addWidget(makeCard(p), row, col);
        if (++col >= kCols) { col = 0; ++row; }
    }
    m_grid->setRowStretch(row + 1, 1);
    m_grid->setColumnStretch(kCols, 1);
}

QWidget *OlerProblemsPage::buildStatsStrip() {
    auto *strip = new QWidget(this);
    strip->setObjectName(QStringLiteral("statsStrip"));
    auto *lay = new QHBoxLayout(strip);
    lay->setContentsMargins(18, 14, 18, 14);
    lay->setSpacing(24);

    auto addItem = [&](OlerIcons::Name icon, const QColor &tint,
                       const QString &label, const QString &value) {
        auto *ico = new QLabel(strip);
        ico->setPixmap(OlerIcons::make(icon, tint, 14).pixmap(14, 14));
        ico->setFixedSize(28, 28);
        ico->setAlignment(Qt::AlignCenter);
        ico->setStyleSheet(QStringLiteral(
            "border-radius:6px;background:%1;").arg(rgbaStr(tint, 38)));
        lay->addWidget(ico);
        auto *col = new QVBoxLayout;
        col->setSpacing(0);
        col->addWidget(new QLabel(label, strip));
        auto *v = new QLabel(value, strip);
        v->setObjectName(QStringLiteral("statValue"));
        col->addWidget(v);
        lay->addLayout(col);
    };

    const int total = m_store->all().size();
    const int solvedTotal = OlerSolves::instance()->totalCount();
    addItem(OlerIcons::Name::CheckSquare, QColor("#7daed4"), tr("总题数"),
            QString::number(total));
    auto *div = new QFrame(strip);
    div->setFrameShape(QFrame::VLine);
    div->setObjectName(QStringLiteral("statsDiv"));
    lay->addWidget(div);
    addItem(OlerIcons::Name::CheckSquare, QColor("#34c759"), tr("累计解决"),
            QString::number(solvedTotal));
    auto *div2 = new QFrame(strip);
    div2->setFrameShape(QFrame::VLine);
    div2->setObjectName(QStringLiteral("statsDiv"));
    lay->addWidget(div2);
    addItem(OlerIcons::Name::TrendUp, accent(), tr("连续打卡"),
            QString::number(OlerSolves::instance()->streak()));
    lay->addStretch();
    auto *link = new QLabel(tr("详细统计 →"), strip);
    link->setObjectName(QStringLiteral("sectionAction"));
    lay->addWidget(link);
    return strip;
}

void OlerProblemsPage::addProblem() {
    const QString id = QInputDialog::getText(this, tr("添加题目"),
                                             tr("题号（如 P1001）："));
    if (id.trimmed().isEmpty())
        return;
    OlerProblem p;
    p.id = id.trimmed();
    p.title = QInputDialog::getText(this, tr("添加题目"), tr("标题："));
    static const QStringList ojs = {QStringLiteral("Luogu"),
                                    QStringLiteral("Codeforces"),
                                    QStringLiteral("AtCoder")};
    bool ok = false;
    p.oj = QInputDialog::getItem(this, tr("添加题目"), tr("OJ 来源："),
                                 ojs, 0, false, &ok);
    if (!ok) return;
    static const QStringList diffs = {QStringLiteral("入门"),
                                      QStringLiteral("普及"),
                                      QStringLiteral("提高"),
                                      QStringLiteral("NOI")};
    p.difficulty = QInputDialog::getItem(this, tr("添加题目"), tr("难度："),
                                         diffs, 0, false, &ok);
    if (!ok) return;
    m_store->upsert(p);
    m_store->save();
}
// __PART3__
