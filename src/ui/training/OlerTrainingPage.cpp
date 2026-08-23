#include "OlerTrainingPage.h"
#include "core/solves/OlerSolves.h"
#include "core/settings/OlerSettings.h"
#include "core/theme/CThemeManager.h"
#include "ui/common/OlerTheme.h"
#include <QDate>
#include <QFrame>
#include <QLabel>
#include <QPainter>
#include <QVBoxLayout>

namespace {

// 30-day bar chart: --oler-primary bars, tertiary ticks, no gridlines.
class Chart : public QWidget {
public:
    explicit Chart(QWidget *parent = nullptr) : QWidget(parent) {
        setFixedHeight(200);
        // Re-render with the new accent when the theme changes.
        connect(CThemeManager::instance(), &CThemeManager::themeChanged,
                this, QOverload<>::of(&QWidget::update));
    }
protected:
    void paintEvent(QPaintEvent *) override {
        QPainter p(this);
        p.setRenderHint(QPainter::Antialiasing);
        constexpr int kDays = 30;
        const QDate today = QDate::currentDate();
        const qreal bw = width() / static_cast<qreal>(kDays) - 2.0;
        int maxV = 1;
        QVector<int> vals(kDays);
        for (int i = 0; i < kDays; ++i) {
            vals[i] = OlerSolves::instance()->countOn(
                today.addDays(i - (kDays - 1)));
            maxV = qMax(maxV, vals[i]);
        }
        const QColor bar =
            OlerTheme::accentForTheme(CThemeManager::instance()->currentTheme());
        const QColor barToday = bar.lighter(115);
        for (int i = 0; i < kDays; ++i) {
            const qreal h = vals[i] == 0 ? 1.0
                                         : (height() - 24.0) * vals[i] / maxV;
            p.fillRect(QRectF(i * (bw + 2.0), height() - 24.0 - h, bw, h),
                       i == kDays - 1 ? barToday : bar);
        }
        p.setPen(QColor("#6e6d68"));
        p.drawText(rect().adjusted(0, height() - 18, 0, 0), Qt::AlignLeft,
                   today.addDays(-(kDays - 1)).toString("MM-dd"));
        p.drawText(rect().adjusted(0, height() - 18, 0, 0), Qt::AlignRight,
                   tr("今日 %1").arg(vals.last()));
    }
};

QWidget *kpiCard(QLabel **valueLabel, const QString &caption,
                 const QString &objectName, QWidget *parent) {
    auto *card = new QFrame(parent);
    card->setObjectName(QStringLiteral("kpiCard"));
    card->setFixedSize(180, 92);
    auto *layout = new QVBoxLayout(card);
    layout->setContentsMargins(14, 10, 14, 10);
    auto *value = new QLabel(QStringLiteral("0"), card);
    value->setObjectName(objectName);
    auto *cap = new QLabel(caption, card);
    cap->setObjectName(QStringLiteral("sectionCaption"));
    layout->addWidget(value);
    layout->addWidget(cap);
    *valueLabel = value;
    return card;
}

} // namespace

OlerTrainingPage::OlerTrainingPage(QWidget *parent) : QWidget(parent) {
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(16, 16, 16, 16);
    layout->setSpacing(16);

    // KPI row (00-design-spec section 4.2).
    auto *kpiRow = new QHBoxLayout;
    kpiRow->addWidget(kpiCard(&m_streakValue, tr("连续打卡（天）"),
                              QStringLiteral("streakHero"), this));
    kpiRow->addWidget(kpiCard(&m_todayValue, tr("今日已解决"),
                              QStringLiteral("kpiValue"), this));
    kpiRow->addWidget(kpiCard(&m_totalValue, tr("累计解决"),
                              QStringLiteral("kpiValue"), this));
    kpiRow->addStretch();
    layout->addLayout(kpiRow);

    // Daily goal progress strip.
    m_goalBar = new QWidget(this);
    m_goalBar->setObjectName(QStringLiteral("goalBar"));
    m_goalBar->setFixedHeight(4);
    layout->addWidget(m_goalBar);

    // Planned sessions: empty state until a session model lands.
    auto *sessions = new QLabel(tr("Planned sessions - coming soon "
                                   "(use Problems to pick your next task)"),
                                this);
    sessions->setObjectName(QStringLiteral("recentEmpty"));
    layout->addWidget(sessions);

    layout->addWidget(new Chart(this));
    layout->addStretch();

    connect(OlerSolves::instance(), &OlerSolves::changed,
            this, &OlerTrainingPage::rebuild);
    connect(OlerSettings::instance(), &OlerSettings::settingChanged,
            this, [this](const QString &k) {
                if (k == QLatin1String("training/dailyGoal"))
                    rebuild();
            });
    rebuild();
}

void OlerTrainingPage::rebuild() {
    OlerSolves *solves = OlerSolves::instance();
    const QDate today = QDate::currentDate();
    const int streak = solves->streak();
    const int goal =
        OlerSettings::instance()->value(QStringLiteral("training/dailyGoal")).toInt();
    const int done = solves->countOn(today);
    const int total = solves->totalCount();

    // Streak green when active, tertiary grey at 0 (spec section 4.2).
    const QString streakColor = streak > 0 ? QStringLiteral("#34c759")
                                           : QStringLiteral("#6e6d68");
    m_streakValue->setText(
        QStringLiteral("<span style='color:%1;font-size:28px;font-weight:bold;"
                       "font-family:Consolas,monospace'>%2</span>")
            .arg(streakColor).arg(streak));
    m_todayValue->setText(
        QStringLiteral("<span style='color:#f1f1ef;font-size:28px;font-weight:bold;"
                       "font-family:Consolas,monospace'>%1 / %2</span>")
            .arg(done).arg(goal));
    m_totalValue->setText(
        QStringLiteral("<span style='color:#f1f1ef;font-size:28px;font-weight:bold;"
                       "font-family:Consolas,monospace'>%1</span>").arg(total));

    // Fill: accent; >=100% switches to success green (token spec).
    const QString fill = done >= goal
        ? QStringLiteral("#34c759")
        : OlerTheme::accentForTheme(
              CThemeManager::instance()->currentTheme()).name();
    const int pct = goal > 0 ? qBound(0, done * 100 / goal, 100) : 0;
    m_goalBar->setStyleSheet(
        QStringLiteral("border-radius:2px; min-width:240px; max-width:360px;"
                       " background-color:#252524;"
                       " background: qlineargradient(x1:0,y1:0,x2:1,y2:0,"
                       " stop:0 %1, stop:%2 %1, stop:%3 #252524,"
                       " stop:1 #252524);")
            .arg(fill)
            .arg(pct / 100.0 - 0.001)
            .arg(pct / 100.0));
}
