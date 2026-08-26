#include "OlerTrainingPage.h"
#include "core/solves/OlerSolves.h"
#include "core/settings/OlerSettings.h"
#include "core/theme/CThemeManager.h"
#include "ui/common/OlerTheme.h"
#include <QDate>
#include <QFrame>
#include <QHBoxLayout>
#include <QInputDialog>
#include <QLabel>
#include <QLineEdit>
#include <QPainter>
#include <QPushButton>
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
        connect(OlerSolves::instance(), &OlerSolves::changed,
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

    auto *sessionHeader = new QHBoxLayout;
    auto *sessionTitle = new QLabel(tr("训练计划"), this);
    sessionTitle->setObjectName(QStringLiteral("sectionTitle"));
    sessionHeader->addWidget(sessionTitle);
    sessionHeader->addStretch();
    auto *addSession = new QPushButton(tr("新建计划"), this);
    addSession->setProperty("psSecondary", true);
    sessionHeader->addWidget(addSession);
    layout->addLayout(sessionHeader);

    m_sessionsHost = new QWidget(this);
    m_sessionsLayout = new QVBoxLayout(m_sessionsHost);
    m_sessionsLayout->setContentsMargins(0, 0, 0, 0);
    m_sessionsLayout->setSpacing(6);
    layout->addWidget(m_sessionsHost);

    connect(addSession, &QPushButton::clicked, this, [this] {
        bool ok = false;
        const QString title = QInputDialog::getText(
            this, tr("新建训练计划"), tr("计划名称："), QLineEdit::Normal,
            tr("今日训练"), &ok).trimmed();
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

    layout->addWidget(new Chart(this));
    layout->addStretch();

    connect(OlerSolves::instance(), &OlerSolves::changed,
            this, &OlerTrainingPage::rebuild);
    connect(CThemeManager::instance(), &CThemeManager::themeChanged,
            this, &OlerTrainingPage::rebuild);
    connect(OlerSettings::instance(), &OlerSettings::settingChanged,
            this, [this](const QString &k) {
                 if (k == QLatin1String("training/dailyGoal"))
                    rebuild();
                 if (k == QLatin1String("training/sessions"))
                    rebuildSessions();
             });
    rebuild();
    rebuildSessions();
}

void OlerTrainingPage::rebuildSessions() {
    if (!m_sessionsLayout)
        return;
    while (m_sessionsLayout->count() > 0) {
        QLayoutItem *item = m_sessionsLayout->takeAt(0);
        if (QWidget *widget = item->widget())
            widget->deleteLater();
        delete item;
    }

    const QStringList sessions = OlerSettings::instance()
                                     ->value(QStringLiteral("training/sessions"))
                                     .toStringList();
    if (sessions.isEmpty()) {
        auto *empty = new QLabel(tr("还没有计划，先安排一次训练吧。"), m_sessionsHost);
        empty->setObjectName(QStringLiteral("recentEmpty"));
        m_sessionsLayout->addWidget(empty);
        return;
    }

    for (const QString &entry : sessions) {
        const QStringList parts = entry.split(QStringLiteral("\t"));
        const QString date = parts.value(0);
        const QString title = parts.value(1, tr("未命名训练"));
        auto *row = new QFrame(m_sessionsHost);
        row->setObjectName(QStringLiteral("sessionRow"));
        auto *rowLayout = new QHBoxLayout(row);
        rowLayout->setContentsMargins(12, 8, 12, 8);
        auto *label = new QLabel(
            QStringLiteral("<b>%1</b><br><span style='color:#6e6d68'>%2</span>")
                .arg(title.toHtmlEscaped(), date.toHtmlEscaped()), row);
        label->setTextFormat(Qt::RichText);
        rowLayout->addWidget(label, 1);
        auto *done = new QPushButton(tr("完成"), row);
        done->setProperty("psSecondary", true);
        auto *remove = new QPushButton(tr("删除"), row);
        remove->setProperty("psSecondary", true);
        rowLayout->addWidget(done);
        rowLayout->addWidget(remove);

        connect(done, &QPushButton::clicked, this, [this, entry] {
            QStringList values = OlerSettings::instance()
                                      ->value(QStringLiteral("training/sessions"))
                                      .toStringList();
            values.removeOne(entry);
            OlerSettings::instance()->setValue(QStringLiteral("training/sessions"), values);
            OlerSettings::instance()->save();
            rebuildSessions();
        });
        connect(remove, &QPushButton::clicked, this, [this, entry] {
            QStringList values = OlerSettings::instance()
                                      ->value(QStringLiteral("training/sessions"))
                                      .toStringList();
            values.removeOne(entry);
            OlerSettings::instance()->setValue(QStringLiteral("training/sessions"), values);
            OlerSettings::instance()->save();
            rebuildSessions();
        });
        m_sessionsLayout->addWidget(row);
    }
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
    const QString textPrimary =
        OlerTheme::token(OlerTheme::Token::TextPrimary).name(QColor::HexRgb);
    m_streakValue->setText(
        QStringLiteral("<span style='color:%1;font-size:28px;font-weight:600;"
                       "font-family:Consolas,monospace'>%2</span>")
            .arg(streakColor).arg(streak));
    m_todayValue->setText(
        QStringLiteral("<span style='color:%1;font-size:28px;font-weight:600;"
                       "font-family:Consolas,monospace'>%2 / %3</span>")
            .arg(textPrimary).arg(done).arg(goal));
    m_totalValue->setText(
        QStringLiteral("<span style='color:%1;font-size:28px;font-weight:600;"
                       "font-family:Consolas,monospace'>%2</span>")
            .arg(textPrimary).arg(total));

    // Fill: accent; >=100% switches to success green (token spec).
    const QString fill = done >= goal
        ? QStringLiteral("#34c759")
        : OlerTheme::accentForTheme(
              CThemeManager::instance()->currentTheme()).name();
    const int pct = goal > 0 ? qBound(0, done * 100 / goal, 100) : 0;
    // Goal-bar track uses the active theme's elevated surface so the unfilled
    // portion of the bar reads correctly on light themes too.
    const QString track =
        OlerTheme::token(OlerTheme::Token::BgElevated).name(QColor::HexRgb);
    m_goalBar->setStyleSheet(
        QStringLiteral("border-radius:2px; min-width:240px; max-width:360px;"
                       " background-color:%1;"
                       " background: qlineargradient(x1:0,y1:0,x2:1,y2:0,"
                       " stop:0 %2, stop:%3 %2, stop:%4 %1,"
                       " stop:1 %1);")
            .arg(track, fill)
            .arg(pct / 100.0 - 0.001)
            .arg(pct / 100.0));
}
