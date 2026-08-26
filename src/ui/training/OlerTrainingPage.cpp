#include "OlerTrainingPage.h"
#include "core/solves/OlerSolves.h"
#include "core/settings/OlerSettings.h"
#include "core/theme/CThemeManager.h"
#include "ui/common/OlerIcons.h"
#include "ui/common/OlerTheme.h"
#include <QDate>
#include <QFrame>
#include <QHBoxLayout>
#include <QInputDialog>
#include <QLabel>
#include <QLineEdit>
#include <QPainter>
#include <QPainterPath>
#include <QPushButton>
#include <QScrollArea>
#include <QVBoxLayout>

namespace {

// 30-day interactive bar chart with smooth rounded tops and gridlines.
class Chart : public QWidget {
public:
    explicit Chart(QWidget *parent = nullptr) : QWidget(parent) {
        setFixedHeight(210);
        connect(CThemeManager::instance(), &CThemeManager::themeChanged,
                this, QOverload<>::of(&QWidget::update));
        connect(OlerSolves::instance(), &OlerSolves::changed,
                this, QOverload<>::of(&QWidget::update));
    }
protected:
    void paintEvent(QPaintEvent *) override {
        QPainter p(this);
        p.setRenderHint(QPainter::Antialiasing);

        const QColor accent = OlerTheme::accentForTheme(CThemeManager::instance()->currentTheme());
        const QColor textSec = OlerTheme::token(OlerTheme::Token::TextSecondary);
        const QColor textTert = OlerTheme::token(OlerTheme::Token::TextTertiary);
        const QColor border = OlerTheme::token(OlerTheme::Token::Border);
        const QColor bgSurface = OlerTheme::token(OlerTheme::Token::BgSurface);

        // Background container
        p.setPen(border);
        p.setBrush(bgSurface);
        p.drawRoundedRect(rect().adjusted(0, 0, -1, -1), 8, 8);

        constexpr int kDays = 30;
        const QDate today = QDate::currentDate();
        const qreal chartLeft = 24.0;
        const qreal chartRight = width() - 24.0;
        const qreal chartTop = 40.0;
        const qreal chartBottom = height() - 32.0;
        const qreal chartHeight = chartBottom - chartTop;
        const qreal chartWidth = chartRight - chartLeft;

        int maxV = 1;
        QVector<int> vals(kDays);
        for (int i = 0; i < kDays; ++i) {
            vals[i] = OlerSolves::instance()->countOn(today.addDays(i - (kDays - 1)));
            maxV = qMax(maxV, vals[i]);
        }

        // Title & Header
        p.setPen(OlerTheme::token(OlerTheme::Token::TextPrimary));
        QFont fTitle = font();
        fTitle.setPixelSize(13);
        fTitle.setWeight(QFont::DemiBold);
        p.setFont(fTitle);
        p.drawText(QRectF(24, 12, 200, 20), Qt::AlignLeft | Qt::AlignVCenter, tr("近 30 天做题趋势"));

        QFont fMono(QStringLiteral("Consolas"));
        fMono.setPixelSize(11);
        p.setFont(fMono);
        p.setPen(textSec);
        p.drawText(QRectF(chartRight - 150, 12, 150, 20), Qt::AlignRight | Qt::AlignVCenter,
                   tr("今日做题: %1").arg(vals.last()));

        // Baseline
        p.setPen(border);
        p.drawLine(QPointF(chartLeft, chartBottom), QPointF(chartRight, chartBottom));

        // Bars
        const qreal slotWidth = chartWidth / static_cast<qreal>(kDays);
        const qreal barWidth = qMax(4.0, slotWidth - 4.0);

        for (int i = 0; i < kDays; ++i) {
            const qreal x = chartLeft + i * slotWidth + (slotWidth - barWidth) / 2.0;
            const qreal h = (vals[i] == 0) ? 2.0 : (chartHeight * vals[i] / maxV);
            const qreal y = chartBottom - h;

            const bool isToday = (i == kDays - 1);
            QColor bColor = isToday ? accent : QColor(accent.red(), accent.green(), accent.blue(), 140);
            if (vals[i] == 0)
                bColor = QColor(border.red(), border.green(), border.blue(), 100);

            QPainterPath path;
            path.addRoundedRect(QRectF(x, y, barWidth, h), 2, 2);
            p.fillPath(path, bColor);
        }

        // X-Axis dates
        p.setFont(fMono);
        p.setPen(textTert);
        p.drawText(QRectF(chartLeft, chartBottom + 6, 80, 18), Qt::AlignLeft,
                   today.addDays(-(kDays - 1)).toString(QStringLiteral("MM-dd")));
        p.drawText(QRectF(chartLeft + chartWidth / 2 - 40, chartBottom + 6, 80, 18), Qt::AlignHCenter,
                   today.addDays(-(kDays / 2)).toString(QStringLiteral("MM-dd")));
        p.drawText(QRectF(chartRight - 80, chartBottom + 6, 80, 18), Qt::AlignRight,
                   today.toString(QStringLiteral("MM-dd")));
    }
};

// Daily Goal Progress bar with percentage and smooth gradient
class GoalProgressBar : public QWidget {
public:
    explicit GoalProgressBar(QWidget *parent = nullptr) : QWidget(parent) {
        setFixedHeight(44);
        connect(CThemeManager::instance(), &CThemeManager::themeChanged,
                this, QOverload<>::of(&QWidget::update));
        connect(OlerSolves::instance(), &OlerSolves::changed,
                this, QOverload<>::of(&QWidget::update));
    }

protected:
    void paintEvent(QPaintEvent *) override {
        QPainter p(this);
        p.setRenderHint(QPainter::Antialiasing);

        const int solvedToday = OlerSolves::instance()->countOn(QDate::currentDate());
        const int goal = qMax(1, OlerSettings::instance()->value(QStringLiteral("training/dailyGoal"), 5).toInt());
        const qreal pct = qBound(0.0, static_cast<qreal>(solvedToday) / goal, 1.0);

        const QColor accent = OlerTheme::accentForTheme(CThemeManager::instance()->currentTheme());
        const QColor bgElevated = OlerTheme::token(OlerTheme::Token::BgElevated);
        const QColor textPrimary = OlerTheme::token(OlerTheme::Token::TextPrimary);
        const QColor textSecondary = OlerTheme::token(OlerTheme::Token::TextSecondary);

        // Header text: Goal title + Solved count
        QFont f = font();
        f.setPixelSize(12);
        f.setWeight(QFont::DemiBold);
        p.setFont(f);
        p.setPen(textPrimary);
        p.drawText(QRect(0, 0, 200, 18), Qt::AlignLeft | Qt::AlignVCenter, tr("今日做题目标进度"));

        QFont fMono(QStringLiteral("Consolas"));
        fMono.setPixelSize(11);
        p.setFont(fMono);
        p.setPen(textSecondary);
        p.drawText(QRect(width() - 200, 0, 200, 18), Qt::AlignRight | Qt::AlignVCenter,
                   tr("%1 / %2 题 (%3%)").arg(solvedToday).arg(goal).arg(static_cast<int>(pct * 100)));

        // Progress Track
        const QRectF trackRect(0, 26, width(), 8);
        p.setPen(Qt::NoPen);
        p.setBrush(bgElevated);
        p.drawRoundedRect(trackRect, 4, 4);

        // Progress Fill
        if (pct > 0.001) {
            const QRectF fillRect(0, 26, qMax(8.0, width() * pct), 8);
            p.setBrush(accent);
            p.drawRoundedRect(fillRect, 4, 4);
        }
    }
};

QWidget *makeKpiCard(QLabel **valueLabel, QLabel **subLabel,
                     const QString &title, OlerIcons::Name iconName,
                     QWidget *parent) {
    auto *card = new QFrame(parent);
    card->setObjectName(QStringLiteral("kpiCard"));
    card->setFixedHeight(88);
    auto *layout = new QVBoxLayout(card);
    layout->setContentsMargins(16, 12, 16, 12);
    layout->setSpacing(4);

    auto *topRow = new QHBoxLayout;
    topRow->setSpacing(8);
    auto *icon = new QLabel(card);
    const QColor accent = OlerTheme::accentForTheme(CThemeManager::instance()->currentTheme());
    icon->setPixmap(OlerIcons::make(iconName, accent, 14).pixmap(14, 14));
    icon->setFixedSize(14, 14);
    topRow->addWidget(icon);

    auto *titleLbl = new QLabel(title, card);
    titleLbl->setObjectName(QStringLiteral("sectionCaption"));
    topRow->addWidget(titleLbl);
    topRow->addStretch();
    layout->addLayout(topRow);

    auto *val = new QLabel(QStringLiteral("0"), card);
    val->setObjectName(QStringLiteral("kpiValue"));
    layout->addWidget(val);

    if (subLabel) {
        auto *sub = new QLabel(QString(), card);
        sub->setObjectName(QStringLiteral("sectionCaption"));
        layout->addWidget(sub);
        *subLabel = sub;
    }
    layout->addStretch();
    *valueLabel = val;
    return card;
}

} // namespace

OlerTrainingPage::OlerTrainingPage(QWidget *parent) : QWidget(parent) {
    auto *scrollArea = new QScrollArea(this);
    scrollArea->setWidgetResizable(true);
    scrollArea->setFrameShape(QFrame::NoFrame);

    auto *content = new QWidget(scrollArea);
    auto *layout = new QVBoxLayout(content);
    layout->setContentsMargins(24, 20, 24, 20);
    layout->setSpacing(20);

    // KPI row: 3 primary metric cards
    auto *kpiRow = new QHBoxLayout;
    kpiRow->setSpacing(14);
    kpiRow->addWidget(makeKpiCard(&m_streakValue, nullptr, tr("连续打卡天数"),
                                  OlerIcons::Name::TrendUp, content));
    kpiRow->addWidget(makeKpiCard(&m_todayValue, nullptr, tr("今日已解决"),
                                  OlerIcons::Name::CheckSquare, content));
    kpiRow->addWidget(makeKpiCard(&m_totalValue, nullptr, tr("历史累计解决"),
                                  OlerIcons::Name::Code, content));
    layout->addLayout(kpiRow);

    // Goal Progress Bar
    layout->addWidget(new GoalProgressBar(content));

    // 30-Day Trend Chart
    layout->addWidget(new Chart(content));

    // Training Sessions Section
    auto *sessionHeader = new QHBoxLayout;
    auto *sessionTitle = new QLabel(tr("训练计划清单"), content);
    sessionTitle->setObjectName(QStringLiteral("sectionTitle"));
    sessionHeader->addWidget(sessionTitle);
    sessionHeader->addStretch();

    auto *addSession = new QPushButton(tr("+ 新建计划"), content);
    addSession->setProperty("psSecondary", true);
    sessionHeader->addWidget(addSession);
    layout->addLayout(sessionHeader);

    m_sessionsHost = new QWidget(content);
    m_sessionsLayout = new QVBoxLayout(m_sessionsHost);
    m_sessionsLayout->setContentsMargins(0, 0, 0, 0);
    m_sessionsLayout->setSpacing(8);
    layout->addWidget(m_sessionsHost);
    layout->addStretch();

    scrollArea->setWidget(content);
    auto *rootLayout = new QVBoxLayout(this);
    rootLayout->setContentsMargins(0, 0, 0, 0);
    rootLayout->addWidget(scrollArea);

    connect(addSession, &QPushButton::clicked, this, [this] {
        bool ok = false;
        const QString title = QInputDialog::getText(
            this, tr("新建训练计划"), tr("计划名称 / 目标："), QLineEdit::Normal,
            tr("今日训练专题"), &ok).trimmed();
        if (!ok || title.isEmpty())
            return;
        QStringList sessions = OlerSettings::instance()
                                   ->value(QStringLiteral("training/sessions"))
                                   .toStringList();
        sessions.append(QDate::currentDate().toString(QStringLiteral("yyyy-MM-dd")) +
                        QStringLiteral("\t") + title);
        OlerSettings::instance()->setValue(QStringLiteral("training/sessions"), sessions);
        OlerSettings::instance()->save();
        rebuildSessions();
    });

    connect(OlerSolves::instance(), &OlerSolves::changed, this, &OlerTrainingPage::rebuild);
    connect(CThemeManager::instance(), &CThemeManager::themeChanged, this, &OlerTrainingPage::rebuild);
    connect(OlerSettings::instance(), &OlerSettings::settingChanged, this, [this](const QString &k) {
        if (k == QLatin1String("training/dailyGoal"))
            rebuild();
        if (k == QLatin1String("training/sessions"))
            rebuildSessions();
    });

    rebuild();
    rebuildSessions();
}

void OlerTrainingPage::rebuildSessions() {
    if (!m_sessionsLayout) return;
    while (m_sessionsLayout->count() > 0) {
        QLayoutItem *item = m_sessionsLayout->takeAt(0);
        if (QWidget *widget = item->widget())
            widget->deleteLater();
        delete item;
    }

    const QStringList sessions =
        OlerSettings::instance()->value(QStringLiteral("training/sessions")).toStringList();

    if (sessions.isEmpty()) {
        auto *empty = new QLabel(tr("暂无训练计划 · 点击右上角新建或在题库中加入题目"), m_sessionsHost);
        empty->setObjectName(QStringLiteral("sectionAction"));
        empty->setAlignment(Qt::AlignCenter);
        empty->setMinimumHeight(60);
        m_sessionsLayout->addWidget(empty);
        return;
    }

    for (int i = 0; i < sessions.size(); ++i) {
        const QString s = sessions.at(i);
        const QStringList parts = s.split(QLatin1Char('\t'));
        const QString dateStr = parts.value(0);
        const QString titleStr = parts.size() > 1 ? parts.value(1) : s;

        auto *card = new QFrame(m_sessionsHost);
        card->setObjectName(QStringLiteral("problemCard"));
        auto *hl = new QHBoxLayout(card);
        hl->setContentsMargins(14, 10, 14, 10);
        hl->setSpacing(12);

        auto *dateTag = new QLabel(dateStr, card);
        dateTag->setStyleSheet(QStringLiteral("color:%1;font-family:Consolas,monospace;font-size:11px;")
                                   .arg(OlerTheme::token(OlerTheme::Token::TextTertiary).name()));
        hl->addWidget(dateTag);

        auto *titleLbl = new QLabel(titleStr, card);
        titleLbl->setStyleSheet(QStringLiteral("color:%1;font-size:13px;font-weight:500;")
                                    .arg(OlerTheme::token(OlerTheme::Token::TextPrimary).name()));
        hl->addWidget(titleLbl, /*stretch*/ 1);

        auto *delBtn = new QPushButton(tr("移除"), card);
        delBtn->setObjectName(QStringLiteral("redoBtn"));
        delBtn->setCursor(Qt::PointingHandCursor);
        connect(delBtn, &QPushButton::clicked, card, [this, i] {
            QStringList cur = OlerSettings::instance()
                                  ->value(QStringLiteral("training/sessions"))
                                  .toStringList();
            if (i >= 0 && i < cur.size()) {
                cur.removeAt(i);
                OlerSettings::instance()->setValue(QStringLiteral("training/sessions"), cur);
                OlerSettings::instance()->save();
                rebuildSessions();
            }
        });
        hl->addWidget(delBtn);
        m_sessionsLayout->addWidget(card);
    }
}

void OlerTrainingPage::rebuild() {
    const int streak = OlerSolves::instance()->streak();
    const int today = OlerSolves::instance()->countOn(QDate::currentDate());
    const int total = OlerSolves::instance()->totalCount();

    if (m_streakValue)
        m_streakValue->setText(QString::number(streak));
    if (m_todayValue)
        m_todayValue->setText(QString::number(today));
    if (m_totalValue)
        m_totalValue->setText(QString::number(total));
}
