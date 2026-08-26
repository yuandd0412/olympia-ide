#include "OlerMistakesPage.h"
#include "core/theme/CThemeManager.h"
#include "ui/common/OlerTheme.h"
#include <QDate>
#include <QEasingCurve>
#include <QEnterEvent>
#include <QFrame>
#include <QHBoxLayout>
#include <QLabel>
#include <QMouseEvent>
#include <QPainter>
#include <QPainterPath>
#include <QPushButton>
#include <QScrollArea>
#include <QVariantAnimation>
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
    return s.size() <= n ? s : s.left(n - 1) + QStringLiteral("…");
}

// 7x4 frequency heatmap of the last 28 days with day indicators.
class Heatmap : public QWidget {
public:
    explicit Heatmap(OlerMistakes *store, QWidget *parent = nullptr)
        : QWidget(parent), m_store(store) {
        setFixedSize(7 * 22 + 4, 4 * 22 + 4);
        connect(CThemeManager::instance(), &CThemeManager::themeChanged,
                this, QOverload<>::of(&QWidget::update));
        connect(m_store, &OlerMistakes::changed,
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
        constexpr int kCell = 18, kGap = 4;
        for (int i = 0; i < 28; ++i) {
            const int r = i / 7, c = i % 7;
            const int level = counts[i] == 0 ? 0 : 1 + counts[i] * 3 / maxV;
            QColor cell = OlerTheme::token(OlerTheme::Token::BgElevated);
            if (level > 0) {
                cell = accent;
                cell.setAlpha(level == 4 ? 255 : 55 * level + 40);
            }
            p.setPen(Qt::NoPen);
            p.setBrush(cell);
            p.drawRoundedRect(QRectF(c * (kCell + kGap), r * (kCell + kGap), kCell, kCell), 3, 3);
        }
    }
private:
    OlerMistakes *m_store;
};

class MistakeCardWidget : public QWidget {
    Q_OBJECT
public:
    explicit MistakeCardWidget(const OlerMistake &m, QWidget *parent = nullptr)
        : QWidget(parent), m_mistake(m), m_hoverProgress(0.0) {
        setFixedHeight(52);
        setCursor(Qt::PointingHandCursor);
        setAttribute(Qt::WA_Hover, true);

        m_anim = new QVariantAnimation(this);
        m_anim->setDuration(120);
        m_anim->setEasingCurve(QEasingCurve::OutCubic);
        connect(m_anim, &QVariantAnimation::valueChanged, this, [this](const QVariant &val) {
            m_hoverProgress = val.toReal();
            update();
        });

        auto *lay = new QHBoxLayout(this);
        lay->setContentsMargins(18, 0, 16, 0);
        lay->setSpacing(12);

        auto *id = new QLabel(m.problemId, this);
        id->setObjectName(QStringLiteral("cardId"));
        lay->addWidget(id);

        auto *t = new QLabel(elide(m.title, 36), this);
        t->setStyleSheet(QStringLiteral("color:%1;font-size:13px;font-weight:600;")
                             .arg(OlerTheme::token(OlerTheme::Token::TextPrimary).name()));
        lay->addWidget(t, /*stretch*/ 1);

        const QColor vc = verdictColor(m.verdict);
        auto *badge = new QLabel(m.verdict, this);
        badge->setAlignment(Qt::AlignCenter);
        badge->setStyleSheet(QStringLiteral(
            "background:%1;color:%2;border-radius:4px;"
            "font-family:'Cascadia Mono','Consolas',monospace;font-size:10px;font-weight:700;"
            "padding:2px 8px;").arg(rgbaStr(vc, 38), vc.name()));
        lay->addWidget(badge);

        auto *time = new QLabel(m.when.toLocalTime().toString("yyyy-MM-dd hh:mm"), this);
        time->setStyleSheet(
            QStringLiteral("font-family:'Cascadia Mono','Consolas',monospace;font-size:11px;color:%1;")
                .arg(OlerTheme::token(OlerTheme::Token::TextTertiary).name()));
        lay->addWidget(time);

        auto *redo = new QPushButton(tr("重做"), this);
        redo->setObjectName(QStringLiteral("redoBtn"));
        redo->setCursor(Qt::PointingHandCursor);
        connect(redo, &QPushButton::clicked, this, [this] {
            emit redoClicked();
        });
        lay->addWidget(redo);

        if (!m.reviewed) {
            auto *done = new QPushButton(tr("标记掌握"), this);
            done->setObjectName(QStringLiteral("redoBtn"));
            done->setCursor(Qt::PointingHandCursor);
            connect(done, &QPushButton::clicked, this, [this] {
                emit markReviewedClicked();
            });
            lay->addWidget(done);
        } else {
            auto *tag = new QLabel(tr("✓ 已掌握"), this);
            tag->setStyleSheet(QStringLiteral("color:#34c759;font-size:11px;font-weight:600;"));
            lay->addWidget(tag);
        }
    }

signals:
    void redoClicked();
    void markReviewedClicked();

protected:
    void enterEvent(QEnterEvent *) override {
        m_anim->stop();
        m_anim->setStartValue(m_hoverProgress);
        m_anim->setEndValue(1.0);
        m_anim->start();
    }

    void leaveEvent(QEvent *) override {
        m_anim->stop();
        m_anim->setStartValue(m_hoverProgress);
        m_anim->setEndValue(0.0);
        m_anim->start();
    }

    void paintEvent(QPaintEvent *) override {
        QPainter p(this);
        p.setRenderHints(QPainter::Antialiasing);

        const QColor bgSurface = OlerTheme::token(OlerTheme::Token::BgSurface);
        const QColor bgElevated = OlerTheme::token(OlerTheme::Token::BgElevated);
        const QColor border = OlerTheme::token(OlerTheme::Token::Border);
        const QColor borderActive = OlerTheme::token(OlerTheme::Token::BorderActive);
        const QColor vc = verdictColor(m_mistake.verdict);

        QColor bg = bgSurface;
        if (m_hoverProgress > 0.001) {
            int r = bgSurface.red() + int((bgElevated.red() - bgSurface.red()) * m_hoverProgress);
            int g = bgSurface.green() + int((bgElevated.green() - bgSurface.green()) * m_hoverProgress);
            int b = bgSurface.blue() + int((bgElevated.blue() - bgSurface.blue()) * m_hoverProgress);
            bg = QColor(r, g, b);
        }

        const QRectF cardRect = rect().adjusted(0.5, 0.5, -0.5, -0.5);
        QPainterPath path;
        path.addRoundedRect(cardRect, 8.0, 8.0);
        p.fillPath(path, bg);

        QColor curBorder = border;
        if (m_hoverProgress > 0.001) {
            int r = border.red() + int((borderActive.red() - border.red()) * m_hoverProgress);
            int g = border.green() + int((borderActive.green() - border.green()) * m_hoverProgress);
            int b = border.blue() + int((borderActive.blue() - border.blue()) * m_hoverProgress);
            int a = border.alpha() + int((borderActive.alpha() - border.alpha()) * m_hoverProgress);
            curBorder = QColor(r, g, b, a);
        }
        p.setPen(QPen(curBorder, 1.0));
        p.drawPath(path);

        // Left 4px status pill bar
        QPainterPath leftBar;
        leftBar.addRoundedRect(QRectF(0.5, 8.0, 3.5, height() - 16.0), 1.75, 1.75);
        p.fillPath(leftBar, vc);
    }

private:
    OlerMistake m_mistake;
    qreal m_hoverProgress;
    QVariantAnimation *m_anim;
};

} // namespace

#include "OlerMistakesPage.moc"

OlerMistakesPage::OlerMistakesPage(QWidget *parent)
    : QWidget(parent), m_store(OlerMistakes::instance()) {
    auto *layout = new QHBoxLayout(this);
    layout->setContentsMargins(24, 20, 24, 20);
    layout->setSpacing(24);

    auto *mainCol = new QVBoxLayout;
    mainCol->setSpacing(16);

    // Verdict filter chips
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
        auto *btn = new QPushButton(d.first.isEmpty() ? tr("全部") : d.first, this);
        btn->setProperty("mchipBtn", true);
        btn->setCheckable(true);
        btn->setCursor(Qt::PointingHandCursor);
        const QColor vc = d.second;
        const QString selText = (vc == QColor(0xff, 0x9f, 0x0a)) ? QStringLiteral("#131311") : QStringLiteral("#ffffff");
        btn->setStyleSheet(QStringLiteral(
            "QPushButton[mchipBtn=\"true\"] { color:%1; font-weight:500; padding:4px 12px; }"
            "QPushButton[mchipBtn=\"true\"]:checked { background:%2; color:%3; border-color:%2; }")
            .arg(vc.name(), vc.name(), selText));
        const QString v = d.first;
        connect(btn, &QPushButton::clicked, this, [this, v] {
            m_verdictFilter = v;
            rebuild();
        });
        chips->addWidget(btn);
    }
    chips->addStretch();

    auto *archive = new QPushButton(tr("显示已掌握"), this);
    archive->setProperty("mchipBtn", true);
    archive->setCheckable(true);
    archive->setCursor(Qt::PointingHandCursor);
    connect(archive, &QPushButton::toggled, this, [this](bool checked) {
        m_showArchived = checked;
        rebuild();
    });
    chips->addWidget(archive);
    mainCol->addLayout(chips);

    // Card list.
    m_listHost = new QWidget;
    m_listLayout = new QVBoxLayout(m_listHost);
    m_listLayout->setContentsMargins(0, 0, 0, 0);
    m_listLayout->setSpacing(8);
    auto *scroll = new QScrollArea(this);
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);
    scroll->setWidget(m_listHost);
    mainCol->addWidget(scroll, /*stretch*/ 1);

    layout->addLayout(mainCol, /*stretch*/ 1);

    // Right Rail: Heatmap and Overview Stats
    auto *rail = new QVBoxLayout;
    rail->setSpacing(12);

    auto *cap = new QLabel(tr("错题热力图（近 28 天）"), this);
    cap->setObjectName(QStringLiteral("sectionTitle"));
    rail->addWidget(cap);
    rail->addWidget(new Heatmap(m_store, this));

    auto *hint = new QLabel(tr("色彩越深表示当日错题频次越高"), this);
    hint->setObjectName(QStringLiteral("sectionCaption"));
    rail->addWidget(hint);

    auto *div = new QFrame(this);
    div->setFrameShape(QFrame::HLine);
    div->setObjectName(QStringLiteral("statsDiv"));
    rail->addWidget(div);

    auto *statBox = new QFrame(this);
    statBox->setObjectName(QStringLiteral("kpiCard"));
    auto *sl = new QVBoxLayout(statBox);
    sl->setContentsMargins(14, 12, 14, 12);
    sl->setSpacing(6);
    auto *sTitle = new QLabel(tr("错题归档统计"), statBox);
    sTitle->setObjectName(QStringLiteral("sectionCaption"));
    sl->addWidget(sTitle);

    auto *s1 = new QLabel(QStringLiteral("未掌握错题: %1 题").arg(m_store->entries(false).size()), statBox);
    s1->setStyleSheet(QStringLiteral("font-family:Consolas;font-size:12px;color:%1;")
                          .arg(OlerTheme::token(OlerTheme::Token::TextPrimary).name()));
    sl->addWidget(s1);
    rail->addWidget(statBox);
    rail->addStretch();
    layout->addLayout(rail);

    connect(m_store, &OlerMistakes::changed, this, &OlerMistakesPage::rebuild);
    rebuild();
}

QWidget *OlerMistakesPage::buildRow(const OlerMistake &m) {
    auto *card = new MistakeCardWidget(m, m_listHost);
    connect(card, &MistakeCardWidget::redoClicked, this, [this, m] {
        emit redoRequested(m);
    });
    connect(card, &MistakeCardWidget::markReviewedClicked, this, [this, m] {
        if (m_store->markReviewed(m.id))
            m_store->save();
    });
    return card;
}

void OlerMistakesPage::rebuild() {
    while (m_listLayout->count() > 0) {
        QLayoutItem *it = m_listLayout->takeAt(0);
        if (QWidget *w = it->widget())
            w->deleteLater();
        delete it;
    }

    const auto items = m_store->entries(m_showArchived);
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
                ? tr("还没有错题记录 —— 在编辑器中按 Ctrl+R 跑一次测试试试")
                : tr("该判定下暂无错题记录"),
            m_listHost);
        empty->setObjectName(QStringLiteral("sectionAction"));
        empty->setAlignment(Qt::AlignCenter);
        empty->setMinimumHeight(100);
        m_listLayout->addWidget(empty);
    }
}
