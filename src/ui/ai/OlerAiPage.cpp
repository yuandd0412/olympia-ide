#include "OlerAiPage.h"
#include <QComboBox>
#include <QLabel>
#include <QPlainTextEdit>
#include <QPushButton>
#include <QTextBrowser>
#include <QVBoxLayout>

namespace {
const char *kWelcome =
    "你好！我们今天做哪道题？\n\n"
    "（当前为本地 mock —— 真实模型将于 Phase 7+ 接入，"
    "现在会针对本地评测给出提示。）";
} // namespace

OlerAiPage::OlerAiPage(QWidget *parent) : QWidget(parent) {
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(16, 16, 16, 16);
    layout->setSpacing(8);

    // Header: brand + model selector (spec section 4.4).
    auto *header = new QHBoxLayout;
    auto *brand = new QLabel(QStringLiteral("<b>dots.ai</b>"), this);
    brand->setObjectName(QStringLiteral("settingsGroupHeader"));
    m_model = new QComboBox(this);
    m_model->addItems({QStringLiteral("dots3-note-prev"),
                       QStringLiteral("dots3-mini")});
    m_model->setEnabled(false); // real models land in Phase 7+
    m_model->setToolTip(tr("dots.ai 模型管理将在 Phase 7+ 提供"));
    header->addWidget(brand);
    header->addStretch();
    header->addWidget(new QLabel(tr("Model"), this));
    header->addWidget(m_model);
    layout->addLayout(header);

    m_log = new QTextBrowser(this);
    m_log->setOpenExternalLinks(false);
    layout->addWidget(m_log, /*stretch*/ 1);

    // Suggested prompt chips.
    auto *chips = new QHBoxLayout;
    for (const QString &chip :
         {tr("解释我的 WA"), tr("如何排查 TLE？"),
          tr("工作区是怎么组织的？")}) {
        auto *b = new QPushButton(chip, this);
        connect(b, &QPushButton::clicked, this, [this, chip] {
            m_input->setPlainText(chip);
            m_input->setFocus();
        });
        chips->addWidget(b);
    }
    chips->addStretch();
    layout->addLayout(chips);

    auto *composer = new QHBoxLayout;
    m_input = new QPlainTextEdit(this);
    m_input->setFixedHeight(56);
    m_input->setPlaceholderText(tr("输入消息…"));
    m_send = new QPushButton(tr("发送"), this);
    composer->addWidget(m_input, /*stretch*/ 1);
    composer->addWidget(m_send);
    layout->addLayout(composer);

    connect(m_send, &QPushButton::clicked, this, &OlerAiPage::send);
    connect(m_input, &QPlainTextEdit::blockCountChanged, this,
            [this](int) { if (m_input->toPlainText().endsWith('\n')) send(); });

    appendBubble(false, tr(kWelcome));
}

void OlerAiPage::appendBubble(bool user, const QString &text) {
    // User bubble: elevated surface; assistant: surface + border (spec 4.4).
    const QString style = user
        ? QStringLiteral("background-color:#2c2c2b;color:#f1f1ef;"
                         "margin-left:120px;padding:6px;border-radius:8px;")
        : QStringLiteral("border:1px solid rgba(255,255,255,0.06);"
                         "background-color:rgba(255,255,255,0.02);"
                         "color:#f1f1ef;margin-right:120px;padding:6px;"
                         "border-radius:8px;");
    m_log->append(QStringLiteral("<div style='%1'>%2</div>")
                      .arg(style, text.toHtmlEscaped()));
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
                   
    } else if (msg.contains(QLatin1String("workspace"), Qt::CaseInsensitive)) {
        reply = tr("~/.oleride/workspace/<题号>/ 目录存放 main.cpp 与测试点；"
                   "tests/*.in/.out 成对文件会被 Ctrl+R 自动发现。");
                   
    } else {
        reply = tr("收到。本地评测已经可用；dots.ai 的真实回答将从 Phase 7+ 接入。");
                   
    }
    appendBubble(false, reply);
}
