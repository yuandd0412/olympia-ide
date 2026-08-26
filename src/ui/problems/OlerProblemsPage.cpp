#include "OlerProblemsPage.h"
#include "core/ingest/OlerIngest.h"
#include "core/mistakes/OlerMistakes.h"
#include "core/settings/OlerSettings.h"
#include "core/solves/OlerSolves.h"
#include "core/theme/CThemeManager.h"
#include "ui/common/OlerIcons.h"
#include "ui/common/OlerIcons.h"
#include "ui/common/OlerTheme.h"
#include <QDate>
#include <QDesktopServices>
#include <QEasingCurve>
#include <QEnterEvent>
#include <QFileDialog>
#include <QGridLayout>
#include <QHBoxLayout>
#include <QInputDialog>
#include <QLabel>
#include <QLineEdit>
#include <QMenu>
#include <QMessageBox>
#include <QMouseEvent>
#include <QPainter>
#include <QPainterPath>
#include <QPushButton>
#include <QScrollArea>
#include <QUrl>
#include <QVariantAnimation>
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

// Custom-painted problem card with Squircle path, hairline micro-border, and smooth hover animation
class ProblemCardWidget : public QWidget {
    Q_OBJECT
public:
    explicit ProblemCardWidget(const OlerProblem &p, QWidget *parent = nullptr)
        : QWidget(parent), m_problem(p), m_hoverProgress(0.0) {
        setFixedHeight(116);
        setCursor(Qt::PointingHandCursor);
        setAttribute(Qt::WA_Hover, true);

        m_anim = new QVariantAnimation(this);
        m_anim->setDuration(120);
        m_anim->setEasingCurve(QEasingCurve::OutCubic);
        connect(m_anim, &QVariantAnimation::valueChanged, this, [this](const QVariant &val) {
            m_hoverProgress = val.toReal();
            update();
        });
    }

    const OlerProblem &problem() const { return m_problem; }

signals:
    void clicked();
    void rightClicked(const QPoint &globalPos);

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

    void mouseReleaseEvent(QMouseEvent *e) override {
        if (e->button() == Qt::LeftButton && rect().contains(e->pos()))
            emit clicked();
        else if (e->button() == Qt::RightButton && rect().contains(e->pos()))
            emit rightClicked(e->globalPosition().toPoint());
        QWidget::mouseReleaseEvent(e);
    }

    void paintEvent(QPaintEvent *) override {
        QPainter p(this);
        p.setRenderHints(QPainter::Antialiasing | QPainter::TextAntialiasing | QPainter::SmoothPixmapTransform);

        const QColor curAccent = accent();
        const QColor bgSurface = OlerTheme::token(OlerTheme::Token::BgSurface);
        const QColor bgElevated = OlerTheme::token(OlerTheme::Token::BgElevated);
        const QColor border = OlerTheme::token(OlerTheme::Token::Border);
        const QColor borderActive = OlerTheme::token(OlerTheme::Token::BorderActive);
        const QColor textPrim = OlerTheme::token(OlerTheme::Token::TextPrimary);
        const QColor textTert = OlerTheme::token(OlerTheme::Token::TextTertiary);

        // Interpolate background on hover
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

        // Border: 1px hairline with subtle active border on hover
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

        const qreal padX = 14.0;
        const qreal padY = 12.0;

        // Top row: ID badge (left) + Difficulty Dot & Label (right)
        QFont fMono(QStringLiteral("Consolas"));
        fMono.setPixelSize(11);
        fMono.setWeight(QFont::DemiBold);
        p.setFont(fMono);

        // ID Pill Container
        const QString pid = m_problem.id;
        const QFontMetrics fm(fMono);
        const int idWidth = fm.horizontalAdvance(pid) + 12;
        const QRectF idPillRect(padX, padY, idWidth, 20);
        QPainterPath idPath;
        idPath.addRoundedRect(idPillRect, 4.0, 4.0);
        p.fillPath(idPath, QColor(curAccent.red(), curAccent.green(), curAccent.blue(), 25));
        p.setPen(curAccent);
        p.drawText(idPillRect, Qt::AlignCenter, pid);

        // Difficulty on top-right
        const QString diff = m_problem.difficulty.isEmpty() ? QStringLiteral("入门") : m_problem.difficulty;
        const QColor dCol(diffColor(diff));
        const qreal diffRight = width() - padX;

        QFont fUi = font();
        fUi.setPixelSize(11);
        fUi.setWeight(QFont::Medium);
        p.setFont(fUi);
        const QFontMetrics fmUi(fUi);
        const int diffTextWidth = fmUi.horizontalAdvance(diff);

        // Difficulty Text
        p.setPen(textTert);
        p.drawText(QRectF(diffRight - diffTextWidth, padY, diffTextWidth, 20), Qt::AlignRight | Qt::AlignVCenter, diff);

        // Glowing Diff Dot
        const qreal dotX = diffRight - diffTextWidth - 12;
        const qreal dotY = padY + 7;
        p.setPen(Qt::NoPen);
        p.setBrush(QColor(dCol.red(), dCol.green(), dCol.blue(), 60));
        p.drawEllipse(QPointF(dotX + 3.0, dotY + 3.0), 4.5, 4.5);
        p.setBrush(dCol);
        p.drawEllipse(QPointF(dotX + 3.0, dotY + 3.0), 3.0, 3.0);

        // Center row: 2-line title
        fUi.setPixelSize(13);
        fUi.setWeight(QFont::DemiBold);
        p.setFont(fUi);
        p.setPen(textPrim);

        const QString title = m_problem.title.isEmpty() ? m_problem.id : m_problem.title;
        const QRectF titleRect(padX, padY + 26, width() - padX * 2, 38);
        p.drawText(titleRect, Qt::AlignLeft | Qt::AlignTop | Qt::TextWordWrap,
                   fmUi.elidedText(title, Qt::ElideRight, int(titleRect.width() * 1.9)));

        // Bottom row: OJ Pill (left) + Action Arrow (right)
        const qreal bottomY = height() - padY - 18;
        const QString oj = m_problem.oj.isEmpty() ? QStringLiteral("Luogu") : m_problem.oj;
        QColor ojColor("#73ba4b");
        if (oj == QLatin1String("Codeforces")) ojColor = QColor("#7daed4");
        else if (oj == QLatin1String("AtCoder")) ojColor = QColor("#b57850");
        else if (oj == QLatin1String("LOJ")) ojColor = QColor("#c29e5a");
        else if (oj == QLatin1String("UOJ")) ojColor = QColor("#a078c8");

        QFont fOj = font();
        fOj.setPixelSize(10);
        fOj.setWeight(QFont::Bold);
        p.setFont(fOj);
        const QFontMetrics fmOj(fOj);
        const int ojTextWidth = fmOj.horizontalAdvance(oj);
        const QRectF ojPillRect(padX, bottomY, ojTextWidth + 12, 18);
        QPainterPath ojPath;
        ojPath.addRoundedRect(ojPillRect, 3.5, 3.5);
        p.fillPath(ojPath, QColor(ojColor.red(), ojColor.green(), ojColor.blue(), 35));
        p.setPen(ojColor);
        p.drawText(ojPillRect, Qt::AlignCenter, oj);

        // Hover action arrow on bottom-right
        if (m_hoverProgress > 0.05) {
            p.setOpacity(m_hoverProgress);
            fUi.setPixelSize(12);
            fUi.setWeight(QFont::Medium);
            p.setFont(fUi);
            p.setPen(curAccent);
            const qreal arrowX = width() - padX - 16 + (1.0 - m_hoverProgress) * 4.0;
            p.drawText(QRectF(arrowX, bottomY, 16, 18), Qt::AlignCenter, QStringLiteral("→"));
            p.setOpacity(1.0);
        }
    }

private:
    OlerProblem m_problem;
    qreal m_hoverProgress;
    QVariantAnimation *m_anim;
};

// Custom-painted recent problem card
class RecentProblemCardWidget : public QWidget {
    Q_OBJECT
public:
    explicit RecentProblemCardWidget(const OlerProblem &p, QWidget *parent = nullptr)
        : QWidget(parent), m_problem(p), m_hoverProgress(0.0) {
        setFixedSize(220, 62);
        setCursor(Qt::PointingHandCursor);
        setAttribute(Qt::WA_Hover, true);

        m_anim = new QVariantAnimation(this);
        m_anim->setDuration(120);
        m_anim->setEasingCurve(QEasingCurve::OutCubic);
        connect(m_anim, &QVariantAnimation::valueChanged, this, [this](const QVariant &val) {
            m_hoverProgress = val.toReal();
            update();
        });
    }

signals:
    void clicked();
    void rightClicked(const QPoint &globalPos);

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

    void mouseReleaseEvent(QMouseEvent *e) override {
        if (e->button() == Qt::LeftButton && rect().contains(e->pos()))
            emit clicked();
        else if (e->button() == Qt::RightButton && rect().contains(e->pos()))
            emit rightClicked(e->globalPosition().toPoint());
        QWidget::mouseReleaseEvent(e);
    }

    void paintEvent(QPaintEvent *) override {
        QPainter p(this);
        p.setRenderHints(QPainter::Antialiasing | QPainter::TextAntialiasing);

        const QColor curAccent = accent();
        const QColor bgSurface = OlerTheme::token(OlerTheme::Token::BgSurface);
        const QColor bgElevated = OlerTheme::token(OlerTheme::Token::BgElevated);
        const QColor border = OlerTheme::token(OlerTheme::Token::Border);
        const QColor borderActive = OlerTheme::token(OlerTheme::Token::BorderActive);
        const QColor textPrim = OlerTheme::token(OlerTheme::Token::TextPrimary);

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

        // Icon box on left
        const QRectF iconBox(12, 13, 36, 36);
        QPainterPath iconPath;
        iconPath.addRoundedRect(iconBox, 6.0, 6.0);
        p.fillPath(iconPath, QColor(curAccent.red(), curAccent.green(), curAccent.blue(), 35));

        QPixmap iconPx = OlerIcons::make(OlerIcons::Name::Zap, curAccent, 16).pixmap(16, 16);
        p.drawPixmap(QPointF(iconBox.x() + 10, iconBox.y() + 10), iconPx);

        // ID + Title
        QFont fMono(QStringLiteral("Consolas"));
        fMono.setPixelSize(11);
        fMono.setWeight(QFont::DemiBold);
        p.setFont(fMono);
        p.setPen(curAccent);
        p.drawText(QRectF(56, 14, 150, 16), Qt::AlignLeft | Qt::AlignVCenter, m_problem.id);

        QFont fUi = font();
        fUi.setPixelSize(12);
        fUi.setWeight(QFont::Normal);
        p.setFont(fUi);
        p.setPen(textPrim);
        const QFontMetrics fmUi(fUi);
        p.drawText(QRectF(56, 32, 150, 16), Qt::AlignLeft | Qt::AlignVCenter,
                   fmUi.elidedText(m_problem.title, Qt::ElideRight, 145));
    }

private:
    OlerProblem m_problem;
    qreal m_hoverProgress;
    QVariantAnimation *m_anim;
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
    auto *card = new RecentProblemCardWidget(p, m_recentRowHost);
    const QString id = p.id;
    connect(card, &RecentProblemCardWidget::clicked, this, [this, id] {
        OlerProblem pr = m_store->find(id);
        if (pr.isValid()) {
            m_store->touchRecent(id);
            emit openRequested(pr);
        }
    });
    connect(card, &RecentProblemCardWidget::rightClicked, this, [this, p](const QPoint &pos) {
        showCardContextMenu(p, pos);
    });
    return card;
}

QWidget *OlerProblemsPage::makeCard(const OlerProblem &p) {
    auto *card = new ProblemCardWidget(p, m_gridHost);
    const QString id = p.id;
    connect(card, &ProblemCardWidget::clicked, this, [this, id] {
        OlerProblem pr = m_store->find(id);
        if (pr.isValid()) {
            m_store->touchRecent(id);
            emit openRequested(pr);
        }
    });
    connect(card, &ProblemCardWidget::rightClicked, this, [this, p](const QPoint &pos) {
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
