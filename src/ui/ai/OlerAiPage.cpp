#include "OlerAiPage.h"
#include "ui/common/OlerIcons.h"
#include <QComboBox>
#include <QFrame>
#include <QLabel>
#include <QPlainTextEdit>
#include <QPushButton>
#include <QScrollArea>
#include <QVBoxLayout>

namespace {

const char *kWelcome =
    "你好！我们今天做哪道题？\n\n"
    "（当前为本地 mock —— 真实模型将于 Phase 7+ 接入，"
    "现在会针对本地评测给出提示。）";

QWidget *avatar(bool user, QWidget *parent) {
    auto *a = new QLabel(user ? QStringLiteral("我") : QStringLiteral("AI"),
                         parent);
    a->setObjectName(QStringLiteral("aiAvatar"));
    a->setFixedSize(28, 28);
    a->setAlignment(Qt::AlignCenter);
    a->setStyleSheet(user
        ? QStringLiteral("background:#2c2c2b;color:#a0a0a3;")
        : QStringLiteral("background:rgba(217,119,87,0.15);color:#d97757;"));
    return a;
}

QWidget *bubble(bool user, const QString &html, QWidget *parent) {
    auto *b = new QLabel(parent);
    b->setTextFormat(Qt::RichText);
    b->setWordWrap(true);
    b->setText(html);
    b->setMaximumWidth(520);
    b->setObjectName(user ? QStringLiteral("aiBubbleUser")
                          : QStringLiteral("aiBubbleAi"));
    return b;
}

} // namespace

OlerAiPage::OlerAiPage(QWidget *parent) : QWidget(parent) {
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(16, 16, 16, 16);
    layout->setSpacing(8);

    // Header: brand + context note + model selector (spec 4.4).
    auto *header = new QHBoxLayout;
    auto *brand = new QLabel(QStringLiteral("<b>dots.ai</b>"), this);
    brand->setObjectName(QStringLiteral("sectionTitle"));
    auto *note = new QLabel(tr("教练已读取当前题目与上次提交"), this);
    note->setObjectName(QStringLiteral("sectionAction"));
    header->addWidget(brand);
    header->addWidget(note);
    header->addStretch();
    header->addWidget(new QLabel(tr("模型"), this));
    m_model = new QComboBox(this);
    m_model->addItems({QStringLiteral("dots3-note-prev"),
                       QStringLiteral("dots3-mini")});
    m_model->setEnabled(false); // real models land in Phase 7+
    m_model->setFixedHeight(30);
    m_model->setToolTip(tr("dots.ai 模型管理将在 Phase 7+ 提供"));
    header->addWidget(m_model);
    layout->addLayout(header);

    // Centered chat flow (max 720px).
    auto *chatScroll = new QScrollArea(this);
    chatScroll->setWidgetResizable(true);
    chatScroll->setFrameShape(QFrame::NoFrame);
    m_chatHost = new QWidget;
    m_chatLayout = new QVBoxLayout(m_chatHost);
    m_chatLayout->setContentsMargins(20, 16, 20, 16);
    m_chatLayout->setSpacing(12);
    m_chatLayout->addStretch();
    chatScroll->setWidget(m_chatHost);
    layout->addWidget(chatScroll, /*stretch*/ 1);

    // Suggested prompt chips (centered).
    auto *chipsOuter = new QHBoxLayout;
    chipsOuter->addStretch();
    for (const QString &chip : {tr("解释我的 WA"), tr("如何排查 TLE？"),
                                tr("工作区是怎么组织的？")}) {
        auto *b = new QPushButton(chip, this);
        b->setProperty("chipBtn", true);
        b->setCursor(Qt::PointingHandCursor);
        connect(b, &QPushButton::clicked, this, [this, chip] {
            m_input->setPlainText(chip);
            m_input->setFocus();
        });
        chipsOuter->addWidget(b);
    }
    chipsOuter->addStretch();
    layout->addLayout(chipsOuter);

    // Composer: input + circular send button.
    auto *composer = new QHBoxLayout;
    composer->addStretch();
    m_input = new QPlainTextEdit(this);
    m_input->setObjectName(QStringLiteral("aiComposer"));
    m_input->setFixedHeight(44);
    m_input->setPlaceholderText(tr("输入消息…"));
    m_send = new QPushButton(this);
    m_send->setObjectName(QStringLiteral("aiSend"));
    m_send->setFixedSize(36, 36);
    m_send->setIcon(OlerIcons::make(OlerIcons::Name::Send,
                                    QColor("#ffffff"), 16));
    m_send->setCursor(Qt::PointingHandCursor);
    composer->addWidget(m_input);
    composer->addWidget(m_send);
    composer->addStretch();
    layout->addLayout(composer);

    connect(m_send, &QPushButton::clicked, this, &OlerAiPage::send);
    connect(m_input, &QPlainTextEdit::blockCountChanged, this,
            [this](int) { if (m_input->toPlainText().endsWith('\n')) send(); });

    appendBubble(false, tr(kWelcome));
}

void OlerAiPage::appendBubble(bool user, const QString &text) {
    auto *row = new QWidget(m_chatHost);
    auto *lay = new QHBoxLayout(row);
    lay->setContentsMargins(0, 0, 0, 0);
    lay->setSpacing(10);

    // Insert before the trailing stretch.
    const int at = m_chatLayout->count() - 1;
    if (user) {
        lay->addStretch();
        lay->addWidget(bubble(true, text.toHtmlEscaped(), row));
        lay->addWidget(avatar(true, row));
    } else {
        lay->addWidget(avatar(false, row));
        lay->addWidget(bubble(false, text.toHtmlEscaped(), row));
        lay->addStretch();
    }
    m_chatLayout->insertWidget(at, row);
}

void OlerAiPage::send() {
    const QString msg = m_input->toPlainText().trimmed();
    if (msg.isEmpty())
        return;
    appendBubble(true, msg);
    m_input->clear();

    QString reply;
    if (msg.contains(QLatin1String("WA"), Qt::CaseInsensitive)) {
        reply = tr("WA 排查：检查溢出（改用 long long）、n=0/1 边界，"
                   "并用 Ctrl+R 将输出与 tests/caseN.out 逐字节比对。");
    } else if (msg.contains(QLatin1String("TLE"), Qt::CaseInsensitive)) {
        reply = tr("TLE 排查：先确认算法复杂度。若已是最优，尝试更快的 IO"
                   "（scanf / 关闭流同步）与常数优化。");
    } else if (msg.contains(QLatin1String("工作区")) ||
               msg.contains(QLatin1String("workspace"), Qt::CaseInsensitive)) {
        reply = tr("~/.oleride/workspace/<题号>/ 目录存放 main.cpp 与测试点；"
                   "tests/*.in/.out 成对文件会被 Ctrl+R 自动发现。");
    } else {
        reply = tr("收到。本地评测已经可用；dots.ai 的真实回答将从 Phase 7+ 接入。");
    }
    appendBubble(false, reply);
}
