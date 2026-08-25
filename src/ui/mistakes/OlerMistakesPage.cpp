#include "OlerMistakesPage.h"
#include "core/theme/CThemeManager.h"
#include "ui/common/OlerTheme.h"
#include <QDate>
#include <QFrame>
#include <QHBoxLayout>
#include <QLabel>
#include <QMouseEvent>
#include <QPainter>
#include <QPushButton>
#include <QScrollArea>
#include <QVBoxLayout>

namespace {

// Verdict tokens — constant across all themes (style guide §1.1).
QColor verdictColor(const QString &v) {
    if (v == QLatin1String("AC"))  return QColor(0x34, 0xc7, 0x59);
    if (v == QLatin1String("WA"))  return QColor(0xff, 0x45, 0x3a);
    if (v == QLatin1String("TLE")) return QColor(0xff, 0x9f, 0x0a);
    if (v == QLatin1String("RE"))  return QColor(0xc4, 0x5c, 0x4a);
    if (v == QLatin1String("CE"))  return QColor(0xc4, 0x9a, 0x3c);
    return QColor(0xa0, 0xa0, 0xa3);
}

QString rgbaStr(const QColor &c, int a255) {
    return QStringLiteral("rgba(%1,%2,%3,%4)")
        .arg(c.red()).arg(c.green()).arg(c.blue())
        .arg(a255 / 255.0, 0, 'f', 3);
}

QString elide(const QString &s, int n) {
    return s.size() <= n ? s : s.left(n - 1) + QStringLiteral("\u2026");
}

// 7x4 frequency heatmap of the last 28 days (non-interactive hint).
class Heatmap : public QWidget {
public:
    explicit Heatmap(OlerMistakes *store, QWidget *parent = nullptr)
        : QWidget(parent), m_store(store) {
        setFixedSize(7 * 21 + 3, 4 * 21 + 3);
        connect(CThemeManager::instance(), &CThemeManager::themeChanged,
                this, QOverload<>::of(&QWidget::update));
    }
protected:
    void paintEvent(QPaintEvent *) override {
        QPainter p(this);
        p.setRenderHint(QPainter::Antialiasing);
        const QDate today = QDate::currentDate();
        QVector<int> counts(28, 0);
        for (const OlerMistake &m : m_store->entries(true)) {
            const int daysAgo = static_cast<int>(m.when.date().daysTo(today));
            if (daysAgo >= 0 && daysAgo < 28)
                ++counts[27 - daysAgo];
        }
        int maxV = 1;
        for (int c : counts) maxV = qMax(maxV, c);

        const QColor accent = OlerTheme::accentForTheme(
            CThemeManager::instance()->currentTheme());
        constexpr int kCell = 18, kGap = 3;
        for (int i = 0; i < 28; ++i) {
            const int r = i / 7, c = i % 7;
            const int level = counts[i] == 0 ? 0 : 1 + counts[i] * 3 / maxV;
            QColor cell(255, 255, 255, 12);
            if (level > 0) {
                cell = accent;
                cell.setAlpha(level == 4 ? 255 : 60 * level);
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
    auto *layout = new QHBoxLayout(this);
    layout->setContentsMargins(24, 20, 24, 20);
    layout->setSpacing(20);

    auto *mainCol = new QVBoxLayout;
    mainCol->setSpacing(16);

    // Verdict filter chips (prototype: mono 11/600, sel = filled verdict).
    auto *chips = new QHBoxLayout;
    chips->setSpacing(8);
    const QList<QPair<QString, QColor>> defs = {
        {QString(), QColor(0xa0, 0xa0, 0xa3)},
        {QStringLiteral("WA"),  QColor(0xff, 0x45, 0x3a)},
        {QStringLiteral("TLE"), QColor(0xff, 0x9f, 0x0a)},
        {QStringLiteral("RE"),  QColor(0xc4, 0x5c, 0x4a)},
        {QStringLiteral("CE"),  QColor(0xc4, 0x9a, 0x3c)},
    };
    for (const auto &d : defs) {
        auto *btn = new QPushButton(d.first.isEmpty() ? tr("全部") : d.first,
                                    this);
        btn->setProperty("mchipBtn", true);
        btn->setCheckable(true);
        btn->setCursor(Qt::PointingHandCursor);
        const QColor vc = d.second;
        const QString selText =
            vc == QColor(0xff, 0x9f, 0x0a) ? QStringLiteral("#131311")
                                           : QStringLiteral("#ffffff");
        btn->setStyleSheet(QStringLiteral(
            "QPushButton[mchipBtn=\"true\"] { color:%1; }"
            "QPushButton[mchipBtn=\"true\"]:checked { background:%2;"
            " color:%3; border-color:%2; }")
            .arg(vc.name(), vc.name(), selText));
        const QString v = d.first;
        connect(btn, &QPushButton::clicked, this, [this, v] {
            m_verdictFilter = v;
            rebuild();
        });
        chips->addWidget(btn);
    }
    chips->addStretch();
    auto *archive = new QLabel(tr("显示已归档"), this);
    archive->setObjectName(QStringLiteral("sectionAction"));
    chips->addWidget(archive);
    mainCol->addLayout(chips);

    // Card list.
    m_listHost = new QWidget;
    m_listLayout = new QVBoxLayout(m_listHost);
    m_listLayout->setContentsMargins(0, 0, 0, 0);
    m_listLayout->setSpacing(6);
    mainCol->addWidget(m_listHost);
    mainCol->addStretch();

    auto *scroll = new QScrollArea(this);
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);
    scroll->setWidget(m_listHost);
    mainCol->addWidget(scroll, /*stretch*/ 1);

    layout->addLayout(mainCol, /*stretch*/ 1);

    // Heatmap rail.
    auto *rail = new QVBoxLayout;
    auto *cap = new QLabel(tr("近 28 天"), this);
    cap->setObjectName(QStringLiteral("sectionAction"));
    rail->addWidget(cap);
    rail->addWidget(new Heatmap(m_store, this));
    auto *hint = new QLabel(tr("错题密度 · 深 = 多"), this);
    hint->setObjectName(QStringLiteral("sectionAction"));
    rail->addWidget(hint);
    rail->addStretch();
    layout->addLayout(rail);

    connect(m_store, &OlerMistakes::changed, this, &OlerMistakesPage::rebuild);
    rebuild();
}

QWidget *OlerMistakesPage::buildRow(const OlerMistake &m) {
    const QColor vc = verdictColor(m.verdict);
    auto *row = new QFrame(m_listHost);
    row->setProperty("mistakeCard", true);
    row->setStyleSheet(QStringLiteral(
        "QWidget[mistakeCard=\"true\"] { border-left: 3px solid %1; }")
        .arg(vc.name()));
    row->setCursor(Qt::PointingHandCursor);

    auto *lay = new QHBoxLayout(row);
    lay->setContentsMargins(14, 12, 14, 12);
    lay->setSpacing(12);

    auto *id = new QLabel(m.problemId, row);
    id->setObjectName(QStringLiteral("cardId"));
    lay->addWidget(id);

    auto *t = new QLabel(elide(m.title, 42), row);
    t->setObjectName(QStringLiteral("favTitle"));
    lay->addWidget(t, /*stretch*/ 1);

    auto *badge = new QLabel(m.verdict, row);
    badge->setAlignment(Qt::AlignCenter);
    badge->setStyleSheet(QStringLiteral(
        "background:%1;color:%2;border-radius:9999px;"
        "font-family:'Consolas';font-size:10px;font-weight:600;"
        "padding:2px 8px;").arg(rgbaStr(vc, 38), vc.name()));
    lay->addWidget(badge);

    auto *time = new QLabel(m.when.toLocalTime().toString("MM-dd hh:mm"), row);
    time->setStyleSheet(
        QStringLiteral("font-family:'Consolas';font-size:11px;color:#6e6d68;"));
    lay->addWidget(time);

    auto *redo = new QPushButton(tr("重做"), row);
    redo->setObjectName(QStringLiteral("redoBtn"));
    redo->setCursor(Qt::PointingHandCursor);
    connect(redo, &QPushButton::clicked, row, [this, m] {
        emit redoRequested(m.problemId);
    });
    lay->addWidget(redo);

    auto *done = new QPushButton(tr("掌握"), row);
    done->setObjectName(QStringLiteral("redoBtn"));
    done->setCursor(Qt::PointingHandCursor);
    connect(done, &QPushButton::clicked, row, [this, m] {
        if (m_store->markReviewed(m.id))
            m_store->save();
    });
    lay->addWidget(done);
    return row;
}

void OlerMistakesPage::rebuild() {
    // Clear rows.
    const auto olds = m_listHost->findChildren<QWidget *>();
    for (QWidget *w : olds)
        if (w != m_listHost) w->deleteLater();
    // Remove leftover layout items (spacers added below).
    while (m_listLayout->count() > 0) {
        QLayoutItem *it = m_listLayout->takeAt(0);
        delete it;
    }

    const auto items = m_store->entries(false);
    int shown = 0;
    for (const OlerMistake &m : items) {
        if (!m_verdictFilter.isEmpty() && m.verdict != m_verdictFilter)
            continue;
        m_listLayout->addWidget(buildRow(m));
        ++shown;
    }
    if (shown == 0) {
        auto *empty = new QLabel(
            m_verdictFilter.isEmpty()
                ? tr("还没有错题记录 —— Ctrl+R 跑一次测试试试")
                : tr("该判定下暂无错题"),
            m_listHost);
        empty->setObjectName(QStringLiteral("sectionAction"));
        empty->setAlignment(Qt::AlignCenter);
        m_listLayout->addWidget(empty);
    }
}
