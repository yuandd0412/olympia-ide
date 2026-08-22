#include "OlerTrainingPage.h"
#include "core/solves/OlerSolves.h"
#include "core/settings/OlerSettings.h"
#include <QDate>
#include <QLabel>
#include <QPainter>
#include <QVBoxLayout>

namespace {

// 30-day bar chart, --oler-primary bars, no gridlines (token spec).
class Chart : public QWidget {
public:
    explicit Chart(QWidget *parent = nullptr) : QWidget(parent) {
        setFixedHeight(200);
    }
protected:
    void paintEvent(QPaintEvent *) override {
        QPainter p(this);
        p.setRenderHint(QPainter::Antialiasing);
        const int n = 30;
        const QDate today = QDate::currentDate();
        const qreal bw = width() / static_cast<qreal>(n) - 2.0;
        int maxV = 1;
        QVector<int> vals(n);
        for (int i = 0; i < n; ++i) {
            vals[i] = OlerSolves::instance()->countOn(today.addDays(i - (n - 1)));
            maxV = qMax(maxV, vals[i]);
        }
        for (int i = 0; i < n; ++i) {
            const qreal h = vals[i] == 0
                                ? 1.0
                                : (height() - 20.0) * vals[i] / maxV;
            // today gets the hover color; past days get primary
            p.fillRect(QRectF(i * (bw + 2.0), height() - 20.0 - h, bw, h),
                       i == n - 1 ? QColor("#e08a6c") : QColor("#d97757"));
        }
        p.setPen(QColor("#6e6d68"));
        p.drawText(rect().adjusted(0, height() - 18, 0, 0), Qt::AlignLeft,
                   today.addDays(-(n - 1)).toString("MM-dd"));
        p.drawText(rect().adjusted(0, height() - 18, 0, 0), Qt::AlignRight,
                   QStringLiteral("today: %1").arg(vals.last()));
    }
};

} // namespace

OlerTrainingPage::OlerTrainingPage(QWidget *parent) : QWidget(parent) {
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(16, 16, 16, 16);
    layout->setSpacing(16);

    auto *topRow = new QHBoxLayout;
    m_streakLabel = new QLabel(this);
    m_streakLabel->setObjectName("streakHero");
    topRow->addWidget(m_streakLabel);
    topRow->addStretch();

    auto *goalBox = new QVBoxLayout;
    m_goalLabel = new QLabel(this);
    m_goalBar = new QWidget(this);
    m_goalBar->setObjectName("goalBar");
    m_goalBar->setFixedHeight(4);
    goalBox->addWidget(m_goalLabel);
    goalBox->addWidget(m_goalBar);
    topRow->addLayout(goalBox);
    layout->addLayout(topRow);

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
    const int streak = solves->streak();
    m_streakLabel->setText(QStringLiteral("<span style='color:#ff9f0a'>*</span> "
                                          "<b style='font-size:36px'>%1</b> "
                                          "<span style='color:#a0a0a3'>days streak</span>")
                               .arg(streak));

    const int goal = OlerSettings::instance()->value("training/dailyGoal").toInt();
    const int today = solves->countOn(QDate::currentDate());
    m_goalLabel->setText(QStringLiteral("%1 / %2 solved today").arg(today).arg(goal));
    // Fill: primary; >=100% switches to success green (token spec).
    const QString fill = today >= goal ? QStringLiteral("#34c759")
                                       : QStringLiteral("#d97757");
    const int pct = goal > 0 ? qBound(0, today * 100 / goal, 100) : 0;
    // Fill via gradient stop so no child widget is needed.
    m_goalBar->setStyleSheet(
        QStringLiteral(
            "border-radius:2px; min-width:240px; max-width:360px;"
            " background-color:#252524;"
            " background: qlineargradient(x1:0,y1:0,x2:1,y2:0,"
            "  stop:0 %1, stop:%2 %1, stop:%3 #252524, stop:1 #252524);")
            .arg(fill)
            .arg(pct / 100.0 - 0.001)
            .arg(pct / 100.0));
}
