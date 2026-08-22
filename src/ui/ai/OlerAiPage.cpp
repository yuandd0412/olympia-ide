#include "OlerAiPage.h"
#include <QPlainTextEdit>
#include <QPushButton>
#include <QTextBrowser>
#include <QVBoxLayout>

namespace {
const char *kWelcome =
    "hi, what are we working on?\n\n"
    "(dots.ai mock - the real model lands in Phase 7+. For now I echo "
    "helpful hints about your local judge.)";
} // namespace

OlerAiPage::OlerAiPage(QWidget *parent) : QWidget(parent) {
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(16, 16, 16, 16);
    layout->setSpacing(8);

    m_log = new QTextBrowser(this);
    m_log->setOpenExternalLinks(false);
    layout->addWidget(m_log, /*stretch*/ 1);

    // Suggested prompt chips.
    auto *chips = new QHBoxLayout;
    for (const QString &chip :
         {tr("Why is my last run WA?"), tr("How do I debug TLE?"),
          tr("What is Oler workspace layout?")}) {
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
    m_input->setPlaceholderText(tr("type a message..."));
    m_send = new QPushButton(tr("Send"), this);
    composer->addWidget(m_input, /*stretch*/ 1);
    composer->addWidget(m_send);
    layout->addLayout(composer);

    connect(m_send, &QPushButton::clicked, this, &OlerAiPage::send);
    connect(m_input, &QPlainTextEdit::blockCountChanged, this,
            [this](int) { if (m_input->toPlainText().endsWith('\n')) send(); });

    appendBubble(false, tr(kWelcome));
}

void OlerAiPage::appendBubble(bool user, const QString &text) {
    // User bubble: elevated surface; assistant: transparent + border.
    const QString style = user
        ? QStringLiteral("background-color:#252524;color:#f1f1ef;"
                         "margin-left:120px;padding:6px;border-radius:6px;")
        : QStringLiteral("border:1px solid #252524;color:#f1f1ef;"
                         "margin-right:120px;padding:6px;border-radius:6px;");
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
        reply = tr("For WA: check overflow (use long long), edge cases n=0/1, "
                   "and compare your output against tests/caseN.out byte by "
                   "byte with Ctrl+R.");
    } else if (msg.contains(QLatin1String("TLE"), Qt::CaseInsensitive)) {
        reply = tr("For TLE: profile complexity first. If your algorithm is "
                   "already optimal, try faster IO (scanf / sync_with_stdio) "
                   "and constant-factor tuning.");
    } else if (msg.contains(QLatin1String("workspace"), Qt::CaseInsensitive)) {
        reply = tr("~/.oleride/workspace/<problem-id>/ holds main.cpp and your "
                   "test cases. tests/*.in/.out pairs are picked up "
                   "automatically by Ctrl+R.");
    } else {
        reply = tr("Got it. Local judging works now; real dots.ai answers "
                   "arrive in Phase 7+.");
    }
    appendBubble(false, reply);
}
