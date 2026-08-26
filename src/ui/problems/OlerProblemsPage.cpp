#include "OlerProblemsPage.h"
#include "core/ingest/OlerIngest.h"
#include "core/mistakes/OlerMistakes.h"
#include "core/settings/OlerSettings.h"
#include "core/solves/OlerSolves.h"
#include "core/theme/CThemeManager.h"
#include "ui/common/OlerIcons.h"
#include "ui/common/OlerTheme.h"
#include <QDate>
#include <QDesktopServices>
#include <QFileDialog>
#include <QGridLayout>
#include <QHBoxLayout>
#include <QInputDialog>
#include <QLabel>
#include <QLineEdit>
#include <QMenu>
#include <QMessageBox>
#include <QMouseEvent>
#include <QPushButton>
#include <QScrollArea>
#include <QUrl>
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
    return QStringLiteral("color:%1;background:%2;border-radius:4px;padding:1px 6px;font-weight:500;font-size:11px;")
        .arg(fg.name(), rgbaStr(fg, 38));
}

QString diffColor(const QString &d) {
    if (d == QLatin1String("入门")) return QStringLiteral("#34c759");
    if (d.contains(QLatin1String("普及"))) return QStringLiteral("#ff9f0a");
    if (d.contains(QLatin1String("提高"))) return QStringLiteral("#ff6b22");
    if (d.contains(QLatin1String("省选"))) return QStringLiteral("#af52de");
    if (d.contains(QLatin1String("NOI")))  return QStringLiteral("#ff453a");
    return QStringLiteral("#34c759");
}

QString elide(const QString &s, int n) {
    return s.size() <= n ? s : s.left(n - 1) + QStringLiteral("…");
}

QWidget *sectionHeader(const QString &title, const QString &action,
                       QWidget *parent) {
    auto *w = new QWidget(parent);
    auto *lay = new QHBoxLayout(w);
    lay->setContentsMargins(0, 0, 0, 8);
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

// Clickable card surface with left/right click signals
class ClickableFrame : public QFrame {
    Q_OBJECT
public:
    explicit ClickableFrame(QWidget *parent = nullptr) : QFrame(parent) {
        setCursor(Qt::PointingHandCursor);
    }
signals:
    void clicked();
    void rightClicked(const QPoint &globalPos);
protected:
    void mouseReleaseEvent(QMouseEvent *e) override {
        if (e->button() == Qt::LeftButton)
            emit clicked();
        else if (e->button() == Qt::RightButton)
            emit rightClicked(e->globalPosition().toPoint());
        QFrame::mouseReleaseEvent(e);
    }
};

} // namespace

#include "OlerProblemsPage.moc"

OlerProblemsPage::OlerProblemsPage(QWidget *parent)
    : QWidget(parent), m_store(OlerProblems::instance()), m_ingest(new OlerIngest(this)) {
    auto *scrollArea = new QScrollArea(this);
    scrollArea->setWidgetResizable(true);
    scrollArea->setFrameShape(QFrame::NoFrame);

    auto *content = new QWidget(scrollArea);
    auto *layout = new QVBoxLayout(content);
    layout->setContentsMargins(24, 20, 24, 20);
    layout->setSpacing(16);

    // Search bar: 36px elevated field with magnifier + Ctrl K chips
    auto *searchWrap = new QWidget(content);
    searchWrap->setObjectName(QStringLiteral("searchWrap"));
    auto *sw = new QHBoxLayout(searchWrap);
    sw->setContentsMargins(12, 0, 10, 0);
    sw->setSpacing(8);

    auto *mag = new QLabel(searchWrap);
    mag->setPixmap(OlerIcons::make(OlerIcons::Name::Search,
                                   QColor("#6e6d68"), 14).pixmap(14, 14));
    mag->setFixedSize(14, 14);
    sw->addWidget(mag);

    m_search = new QLineEdit(searchWrap);
    m_search->setObjectName(QStringLiteral("searchInput"));
    m_search->setPlaceholderText(tr("搜索题目 ID、标题、OJ、标签..."));
    m_search->setFixedHeight(36);
    m_search->setFrame(false);
    m_search->setClearButtonEnabled(true);
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

    // Quick actions & Difficulty Filters
    auto *qa = new QHBoxLayout;
    qa->setSpacing(8);

    auto *pull = new QPushButton(tr("拉取题目"), content);
    pull->setProperty("psPrimary", true);
    pull->setToolTip(tr("从洛谷等在线 OJ 拉取题目元数据与官方样例"));
    connect(pull, &QPushButton::clicked, this, &OlerProblemsPage::pullProblem);
    qa->addWidget(pull);

    auto *addBtn = new QPushButton(tr("新建题目"), content);
    addBtn->setProperty("psSecondary", true);
    connect(addBtn, &QPushButton::clicked, this, &OlerProblemsPage::addProblem);
    qa->addWidget(addBtn);

    auto *importBtn = new QPushButton(tr("导入题单"), content);
    importBtn->setProperty("psSecondary", true);
    importBtn->setToolTip(tr("从 JSON 或 Markdown 导入题单"));
    connect(importBtn, &QPushButton::clicked, this, &OlerProblemsPage::importSheet);
    qa->addWidget(importBtn);

    qa->addSpacing(16);
    // Difficulty filters
    const QStringList diffs = {
        tr("全部"), tr("入门"), tr("普及"), tr("提高"), tr("NOI")
    };
    for (const QString &d : diffs) {
        auto *fbtn = new QPushButton(d, content);
        fbtn->setProperty("chipBtn", true);
        fbtn->setCheckable(true);
        fbtn->setCursor(Qt::PointingHandCursor);
        if (d == tr("全部")) fbtn->setChecked(true);
        connect(fbtn, &QPushButton::clicked, this, [this, d, fbtn, qa] {
            // Uncheck other filter buttons
            for (int i = 0; i < qa->count(); ++i) {
                if (auto *b = qobject_cast<QPushButton *>(qa->itemAt(i)->widget())) {
                    if (b->property("chipBtn").toBool() && b != fbtn)
                        b->setChecked(false);
                }
            }
            fbtn->setChecked(true);
            m_difficultyFilter = (d == tr("全部")) ? QString() : d;
            rebuild();
        });
        qa->addWidget(fbtn);
    }
    qa->addStretch();
    layout->addLayout(qa);

    // Ingest signals
    connect(m_ingest, &OlerIngest::problemFetched, this, [this](const OlerProblemDetail &detail) {
        QString mainCpp, error;
        if (!OlerIngest::createWorkspace(detail, &mainCpp, &error)) {
            QMessageBox::warning(this, tr("拉取题目"), tr("创建工作区失败：%1").arg(error));
            return;
        }
        rebuild();
        emit openRequested(detail.meta);
        QMessageBox::information(this, tr("拉取题目"),
                                 tr("已成功拉取题目 %1 并生成 %2 组官方样例测例！")
                                     .arg(detail.meta.id)
                                     .arg(detail.samples.size()));
    });
    connect(m_ingest, &OlerIngest::fetchFailed, this, [this](const QString &pid, const QString &err) {
        QMessageBox::warning(this, tr("拉取题目失败"), tr("无法拉取题目 %1：\n%2").arg(pid, err));
    });

    // Recent strip (horizontal).
    layout->addWidget(sectionHeader(tr("最近练习"), tr("查看全部"), content));
    auto *recentScroll = new QScrollArea(content);
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
    layout->addWidget(sectionHeader(tr("全部题目"), tr("右键卡片快捷操作"), content));
    m_gridHost = new QWidget(content);
    m_grid = new QGridLayout(m_gridHost);
    m_grid->setContentsMargins(0, 0, 0, 0);
    m_grid->setSpacing(12);
    layout->addWidget(m_gridHost);

    // Stats strip.
    layout->addWidget(buildStatsStrip());
    layout->addStretch();

    scrollArea->setWidget(content);
    auto *root = new QVBoxLayout(this);
    root->setContentsMargins(0, 0, 0, 0);
    root->addWidget(scrollArea);

    connect(m_search, &QLineEdit::textChanged, this, &OlerProblemsPage::rebuild);
    connect(m_store, &OlerProblems::changed, this, &OlerProblemsPage::rebuild);
    connect(OlerSolves::instance(), &OlerSolves::changed, this, &OlerProblemsPage::refreshStats);
    connect(CThemeManager::instance(), &CThemeManager::themeChanged, this, &OlerProblemsPage::rebuild);
    rebuild();
}

void OlerProblemsPage::pullProblem() {
    bool ok = false;
    const QString pid = QInputDialog::getText(
        this, tr("拉取题目"),
        tr("请输入题号（如洛谷 P1001, B2002, CF4A 等）："),
        QLineEdit::Normal, QStringLiteral("P1001"), &ok).trimmed();
    if (!ok || pid.isEmpty())
        return;
    m_ingest->fetchProblem(pid);
}

void OlerProblemsPage::importSheet() {
    const QString path = QFileDialog::getOpenFileName(
        this, tr("导入题单"), QDir::homePath(),
        tr("题单文件 (*.json *.md *.markdown);;JSON 题单 (*.json);;Markdown 题单 (*.md *.markdown);;所有文件 (*)"));
    if (path.isEmpty())
        return;
    QFile f(path);
    if (!f.open(QIODevice::ReadOnly | QIODevice::Text)) {
        QMessageBox::warning(this, tr("导入题单"), tr("无法打开文件：%1").arg(path));
        return;
    }
    const QByteArray content = f.readAll();
    f.close();

    QVector<OlerProblemDetail> list;
    if (path.endsWith(QStringLiteral(".json"), Qt::CaseInsensitive)) {
        QString err;
        list = OlerIngest::parseProblemSheetJson(content, &err);
    } else {
        list = OlerIngest::parseMarkdownSheet(QString::fromUtf8(content));
    }

    if (list.isEmpty()) {
        QMessageBox::warning(this, tr("导入题单"), tr("未能从文件中解析出有效题目。"));
        return;
    }

    int count = 0;
    for (const auto &d : list) {
        if (OlerIngest::createWorkspace(d))
            ++count;
    }
    rebuild();
    QMessageBox::information(this, tr("导入题单"), tr("成功导入 %1 道题目并生成工作区！").arg(count));
}

void OlerProblemsPage::showCardContextMenu(const OlerProblem &p, const QPoint &globalPos) {
    QMenu menu(this);
    auto *openAct = menu.addAction(tr("在编辑器中打开"));
    auto *browserAct = menu.addAction(tr("在浏览器中查看"));
    auto *trainingAct = menu.addAction(tr("加入今日训练计划"));
    auto *mistakeAct = menu.addAction(tr("加入错题本"));
    menu.addSeparator();
    auto *deleteAct = menu.addAction(tr("从题库删除"));

    connect(openAct, &QAction::triggered, this, [this, p] {
        m_store->touchRecent(p.id);
        emit openRequested(p);
    });
    connect(browserAct, &QAction::triggered, this, [p] {
        const QString url = p.url.isEmpty()
            ? QStringLiteral("https://www.luogu.com.cn/problem/") + p.id
            : p.url;
        QDesktopServices::openUrl(QUrl(url));
    });
    connect(trainingAct, &QAction::triggered, this, [p, this] {
        QStringList sessions = OlerSettings::instance()
                                   ->value(QStringLiteral("training/sessions"))
                                   .toStringList();
        sessions.append(QDate::currentDate().toString(QStringLiteral("yyyy-MM-dd")) +
                        QStringLiteral("\t") + p.id + QStringLiteral(" ") + p.title);
        OlerSettings::instance()->setValue(QStringLiteral("training/sessions"), sessions);
        OlerSettings::instance()->save();
        QMessageBox::information(this, tr("训练计划"), tr("已将 %1 加入今日训练计划。").arg(p.id));
    });
    connect(mistakeAct, &QAction::triggered, this, [p, this] {
        OlerMistake m;
        m.problemId = p.id;
        m.oj = p.oj;
        m.title = p.title;
        m.verdict = QStringLiteral("WA");
        OlerMistakes::instance()->add(m);
        OlerMistakes::instance()->save();
        QMessageBox::information(this, tr("错题本"), tr("已将 %1 加入错题本。").arg(p.id));
    });
    connect(deleteAct, &QAction::triggered, this, [this, p] {
        if (QMessageBox::question(this, tr("删除题目"),
                                  tr("确定要从题库中删除题目 %1 吗？").arg(p.id),
                                  QMessageBox::Yes | QMessageBox::No) == QMessageBox::Yes) {
            m_store->remove(p.id);
            m_store->save();
            rebuild();
        }
    });
    menu.exec(globalPos);
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
    connect(card, &ClickableFrame::rightClicked, this, [this, p](const QPoint &pos) {
        showCardContextMenu(p, pos);
    });
    return card;
}

QWidget *OlerProblemsPage::makeCard(const OlerProblem &p) {
    auto *card = new ClickableFrame(m_gridHost);
    card->setObjectName(QStringLiteral("problemCard"));
    card->setFixedHeight(120);
    auto *lay = new QVBoxLayout(card);
    lay->setContentsMargins(14, 12, 14, 12);
    lay->setSpacing(8);

    auto *top = new QHBoxLayout;
    top->setSpacing(8);
    auto *pid = new QLabel(p.id, card);
    pid->setObjectName(QStringLiteral("cardId"));
    top->addWidget(pid);
    top->addStretch();

    // Difficulty chip on top right
    QFrame *dot = new QFrame(card);
    dot->setFixedSize(7, 7);
    dot->setStyleSheet(QStringLiteral("border-radius:3.5px;background:%1;")
                           .arg(diffColor(p.difficulty)));
    top->addWidget(dot);
    auto *dlabel = new QLabel(p.difficulty, card);
    dlabel->setObjectName(QStringLiteral("diffLabel"));
    top->addWidget(dlabel);
    lay->addLayout(top);

    auto *title = new QLabel(elide(p.title.isEmpty() ? p.id : p.title, 32), card);
    title->setObjectName(QStringLiteral("cardTitle"));
    title->setWordWrap(true);
    title->setMinimumHeight(36);
    title->setAlignment(Qt::AlignTop | Qt::AlignLeft);
    lay->addWidget(title);

    auto *meta = new QHBoxLayout;
    meta->setSpacing(6);
    auto *oj = new QLabel(p.oj, card);
    oj->setStyleSheet(ojPillStyle(p.oj));
    meta->addWidget(oj);
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
    connect(card, &ClickableFrame::rightClicked, this, [this, p](const QPoint &pos) {
        showCardContextMenu(p, pos);
    });
    return card;
}

void OlerProblemsPage::rebuildRecent() {
    auto *rl = qobject_cast<QHBoxLayout *>(m_recentRowHost->layout());
    while (rl->count() > 0) {
        QLayoutItem *item = rl->takeAt(0);
        if (QWidget *widget = item->widget())
            widget->deleteLater();
        delete item;
    }

    const auto recents = m_store->recent();
    if (recents.isEmpty()) {
        rl->insertWidget(0, new QLabel(tr("从题库中挑选一道题目开始今天的训练"),
                                       m_recentRowHost), 0, Qt::AlignVCenter);
        return;
    }
    int idx = 0;
    for (const OlerProblem &p : recents) {
        QWidget *c = makeRecentCard(p);
        c->setParent(m_recentRowHost);
        rl->insertWidget(idx++, c);
    }
    rl->addStretch();
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
        if (!m_difficultyFilter.isEmpty() && !p.difficulty.contains(m_difficultyFilter))
            continue;
        items.append(p);
    }
    rebuildRecent();

    while (m_grid->count() > 0) {
        QLayoutItem *item = m_grid->takeAt(0);
        if (QWidget *widget = item->widget())
            widget->deleteLater();
        delete item;
    }

    constexpr int kCols = 4;
    int col = 0, row = 0;
    for (const OlerProblem &p : items) {
        m_grid->addWidget(makeCard(p), row, col);
        if (++col >= kCols) { col = 0; ++row; }
    }
    m_grid->setRowStretch(row + 1, 1);
    for (int i = 0; i < kCols; ++i)
        m_grid->setColumnStretch(i, 1);
    refreshStats();
}

void OlerProblemsPage::focusSearch() {
    if (m_search) {
        m_search->setFocus();
        m_search->selectAll();
    }
}

void OlerProblemsPage::refreshStats() {
    if (m_totalValue)
        m_totalValue->setText(QString::number(m_store->all().size()));
    if (m_solvedValue)
        m_solvedValue->setText(
            QString::number(OlerSolves::instance()->totalCount()));
    if (m_streakValue)
        m_streakValue->setText(
            QString::number(OlerSolves::instance()->streak()));
}

QWidget *OlerProblemsPage::buildStatsStrip() {
    auto *strip = new QWidget(this);
    strip->setObjectName(QStringLiteral("statsStrip"));
    auto *lay = new QHBoxLayout(strip);
    lay->setContentsMargins(18, 14, 18, 14);
    lay->setSpacing(24);

    auto addItem = [&](OlerIcons::Name icon, const QColor &tint,
                       const QString &label, const QString &value,
                       QLabel **valueOut) {
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
        if (valueOut)
            *valueOut = v;
        lay->addLayout(col);
    };

    const int total = m_store->all().size();
    const int solvedTotal = OlerSolves::instance()->totalCount();
    addItem(OlerIcons::Name::CheckSquare, QColor("#7daed4"), tr("题库总数"),
            QString::number(total), &m_totalValue);
    auto *div = new QFrame(strip);
    div->setFrameShape(QFrame::VLine);
    div->setObjectName(QStringLiteral("statsDiv"));
    lay->addWidget(div);
    addItem(OlerIcons::Name::CheckSquare, QColor("#34c759"), tr("累计解决"),
            QString::number(solvedTotal), &m_solvedValue);
    auto *div2 = new QFrame(strip);
    div2->setFrameShape(QFrame::VLine);
    div2->setObjectName(QStringLiteral("statsDiv"));
    lay->addWidget(div2);
    addItem(OlerIcons::Name::TrendUp, accent(), tr("连续打卡"),
            QString::number(OlerSolves::instance()->streak()), &m_streakValue);
    lay->addStretch();
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
