#include "OlerAiPage.h"
#include "core/theme/CThemeManager.h"
#include "ui/common/OlerIcons.h"
#include "ui/common/OlerTheme.h"
#include <QClipboard>
#include <QComboBox>
#include <QEvent>
#include <QFrame>
#include <QGuiApplication>
#include <QHBoxLayout>
#include <QKeyEvent>
#include <QLabel>
#include <QPlainTextEdit>
#include <QPushButton>
#include <QRegularExpression>
#include <QScrollArea>
#include <QSet>
#include <QVBoxLayout>

namespace {

const char *kWelcome =
    "\u4f60\u597d\uff01\u6211\u4eec\u4eca\u5929\u505a\u54ea\u9053\u9898\uff1f\n\n"
    "\uff08\u5f53\u524d\u4e3a\u672c\u5730 mock \u2014\u2014\u771f\u5b9e\u6a21\u578b\u5c06\u4e8e Phase 7+ \u63a5\u5165\uff0c"
    "\u73b0\u5728\u4f1a\u9488\u5bf9\u672c\u5730\u8bc4\u6d4b\u7ed9\u51fa\u63d0\u793a\u3002\uff09";

// Avatar: 28x28 circle. User = neutral (BgOverlay + TextSecondary);
// assistant = accent-tinted (theme accent at ~15% alpha + accent text).
// All colors come from OlerTheme so it tracks the active palette.
QWidget *avatar(bool user, QWidget *parent) {
    const auto *tm = CThemeManager::instance();
    QString bg, fg;
    if (user) {
        bg = OlerTheme::token(OlerTheme::Token::BgOverlay).name(QColor::HexRgb);
        fg = OlerTheme::token(OlerTheme::Token::TextSecondary).name(QColor::HexRgb);
    } else {
        const QColor accent = OlerTheme::accentForTheme(tm->currentTheme());
        QColor tint = accent;
        tint.setAlpha(38); // ~15%
        bg = QStringLiteral("rgba(%1,%2,%3,%4)")
                 .arg(tint.red()).arg(tint.green()).arg(tint.blue())
                 .arg(tint.alpha());
        fg = accent.name(QColor::HexRgb);
    }
    auto *a = new QLabel(user ? QStringLiteral("\u6211") : QStringLiteral("AI"),
                         parent);
    a->setObjectName(QStringLiteral("aiAvatar"));
    a->setFixedSize(28, 28);
    a->setAlignment(Qt::AlignCenter);
    a->setStyleSheet(QStringLiteral("background:%1;color:%2;border-radius:14px;")
                         .arg(bg, fg));
    return a;
}

// C++ keywords for the lightweight in-bubble syntax highlight.
const QSet<QString> &cppKeywords() {
    static const QSet<QString> s = {
        "alignas", "alignof", "auto", "bool", "break", "case", "catch",
        "char", "class", "const", "constexpr", "continue", "decltype",
        "default", "delete", "do", "double", "else", "enum", "explicit",
        "export", "extern", "false", "float", "for", "friend", "goto",
        "if", "inline", "int", "long", "mutable", "namespace", "new",
        "noexcept", "nullptr", "operator", "private", "protected", "public",
        "register", "return", "short", "signed", "sizeof", "static",
        "struct", "switch", "template", "this", "throw", "true", "try",
        "typedef", "typeid", "typename", "union", "unsigned", "using",
        "virtual", "void", "volatile", "while",
    };
    return s;
}

// Simple C++ tokenizer -> styled HTML. Walks the raw source so we never
// double-replace (the common pitfall when applying regex passes to text
// that already contains <span> tags). For non-cpp languages, returns the
// escaped source with no coloring.
QString highlightCode(const QString &lang, const QString &rawCode) {
    const QString cmt = OlerTheme::token(OlerTheme::Token::TextTertiary).name(QColor::HexRgb);
    const QString str = OlerTheme::token(OlerTheme::Token::Success).name(QColor::HexRgb);
    const QString num = OlerTheme::token(OlerTheme::Token::Warning).name(QColor::HexRgb);
    const QString kw  = OlerTheme::token(OlerTheme::Token::Info).name(QColor::HexRgb);

    auto span = [](const QString &color, const QString &text) {
        return QStringLiteral("<span style=\"color:%1\">%2</span>").arg(color, text);
    };

    const bool isCpp = (lang == QLatin1String("cpp") ||
                        lang == QLatin1String("c++") ||
                        lang == QLatin1String("c")  ||
                        lang.isEmpty());
    const auto &kws = isCpp ? cppKeywords() : QSet<QString>{};

    QString out;
    int i = 0;
    const int n = rawCode.length();
    while (i < n) {
        const QChar c = rawCode[i];
        // Block comment
        if (isCpp && c == QLatin1Char('/') && i + 1 < n &&
            rawCode[i + 1] == QLatin1Char('*')) {
            int j = rawCode.indexOf(QStringLiteral("*/"), i + 2);
            if (j < 0) j = n; else j += 2;
            out += span(cmt, rawCode.mid(i, j - i).toHtmlEscaped());
            i = j; continue;
        }
        // Line comment
        if (isCpp && c == QLatin1Char('/') && i + 1 < n &&
            rawCode[i + 1] == QLatin1Char('/')) {
            int j = rawCode.indexOf(QLatin1Char('\n'), i);
            if (j < 0) j = n;
            out += span(cmt, rawCode.mid(i, j - i).toHtmlEscaped());
            i = j; continue;
        }
        // String literal
        if (c == QLatin1Char('"') || c == QLatin1Char('\'')) {
            const QChar quote = c;
            int j = i + 1;
            while (j < n) {
                if (rawCode[j] == QLatin1Char('\\') && j + 1 < n) { j += 2; continue; }
                if (rawCode[j] == quote) { j++; break; }
                j++;
            }
            out += span(str, rawCode.mid(i, j - i).toHtmlEscaped());
            i = j; continue;
        }
        // Number
        if (isCpp && c.isDigit()) {
            int j = i;
            while (j < n && (rawCode[j].isDigit() ||
                             rawCode[j] == QLatin1Char('.'))) j++;
            out += span(num, rawCode.mid(i, j - i).toHtmlEscaped());
            i = j; continue;
        }
        // Identifier / keyword
        if (c.isLetter() || c == QLatin1Char('_')) {
            int j = i;
            while (j < n && (rawCode[j].isLetterOrNumber() ||
                             rawCode[j] == QLatin1Char('_'))) j++;
            const QString word = rawCode.mid(i, j - i);
            if (kws.contains(word))
                out += span(kw, word.toHtmlEscaped());
            else
                out += word.toHtmlEscaped();
            i = j; continue;
        }
        // Anything else: escape to be HTML-safe.
        out += QString(c).toHtmlEscaped();
        i++;
    }
    return out;
}

class CodeBlockWidget : public QWidget {
public:
    CodeBlockWidget(const QString &lang, const QString &code, QWidget *parent)
        : QWidget(parent) {
        setObjectName(QStringLiteral("aiCodeBlock"));
        auto *v = new QVBoxLayout(this);
        v->setContentsMargins(0, 0, 0, 0);
        v->setSpacing(0);

        // Header: language badge (left) + spacer + Copy button (right).
        auto *header = new QWidget(this);
        header->setObjectName(QStringLiteral("aiCodeHeader"));
        auto *hl = new QHBoxLayout(header);
        hl->setContentsMargins(10, 4, 4, 4);
        hl->setSpacing(4);
        auto *langLbl = new QLabel(
            lang.isEmpty() ? QStringLiteral("code") : lang, header);
        langLbl->setObjectName(QStringLiteral("aiCodeLang"));
        hl->addWidget(langLbl);
        hl->addStretch();
        auto *copyBtn = new QPushButton(QStringLiteral("Copy"), header);
        copyBtn->setObjectName(QStringLiteral("aiCopyBtn"));
        copyBtn->setCursor(Qt::PointingHandCursor);
        connect(copyBtn, &QPushButton::clicked, this, [code] {
            QGuiApplication::clipboard()->setText(code);
        });
        hl->addWidget(copyBtn);
        v->addWidget(header);

        // Body: highlighted code as selectable rich text.
        auto *body = new QLabel(this);
        body->setObjectName(QStringLiteral("aiCodeBody"));
        body->setTextFormat(Qt::RichText);
        body->setText(QStringLiteral("<pre>%1</pre>").arg(highlightCode(lang, code)));
        body->setTextInteractionFlags(Qt::TextSelectableByMouse);
        body->setWordWrap(false);
        body->setAlignment(Qt::AlignLeft | Qt::AlignTop);
        body->setMaximumWidth(560);
        v->addWidget(body);
    }
};

} // namespace

OlerAiPage::OlerAiPage(QWidget *parent) : QWidget(parent) {
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(16, 16, 16, 16);
    layout->setSpacing(8);

    // ----- Header row: brand | spacer | context note | model chip | clear -----
    auto *header = new QHBoxLayout;
    auto *brand = new QLabel(QStringLiteral("dots.ai"), this);
    brand->setObjectName(QStringLiteral("aiBrand"));
    header->addWidget(brand);
    auto *note = new QLabel(tr("\u6559\u7ec3\u5df2\u8bfb\u53d6\u5f53\u524d\u9898\u76ee\u4e0e\u4e0a\u6b21\u63d0\u4ea4"),
                            this);
    note->setObjectName(QStringLiteral("sectionAction"));
    header->addSpacing(12);
    header->addWidget(note);
    header->addStretch();
    auto *modelLbl = new QLabel(tr("\u6a21\u578b"), this);
    modelLbl->setObjectName(QStringLiteral("sectionAction"));
    header->addWidget(modelLbl);
    m_model = new QComboBox(this);
    m_model->setObjectName(QStringLiteral("aiModelChip"));
    m_model->addItems({QStringLiteral("dots3-note-prev"),
                       QStringLiteral("dots3-mini")});
    m_model->setEnabled(false); // real models land in Phase 7+
    m_model->setToolTip(tr("dots.ai \u6a21\u578b\u7ba1\u7406\u5c06\u5728 Phase 7+ \u63d0\u4f9b"));
    m_model->setFixedHeight(28);
    header->addWidget(m_model);
    m_clearBtn = new QPushButton(tr("\u6e05\u7a7a"), this);
    m_clearBtn->setObjectName(QStringLiteral("aiClearBtn"));
    m_clearBtn->setCursor(Qt::PointingHandCursor);
    m_clearBtn->setVisible(false);
    connect(m_clearBtn, &QPushButton::clicked,
            this, &OlerAiPage::clearConversation);
    header->addWidget(m_clearBtn);
    layout->addLayout(header);

    // ----- Centered chat flow (scrollable, max 720px wide) -----
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

    // ----- Suggested prompt chips (centered) -----
    auto *chipsOuter = new QHBoxLayout;
    chipsOuter->addStretch();
    for (const QString &chip : {
            tr("💡 分析时间复杂度"),
            tr("🔍 找出边界情况 Corner Case"),
            tr("🐞 诊断为什么会 WA/TLE"),
            tr("🚀 提供优化思路（不直接给代码）")}) {
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

    // ----- Composer: centered rounded wrap with input + circular send -----
    auto *composerWrap = new QWidget(this);
    composerWrap->setObjectName(QStringLiteral("aiComposerWrap"));
    composerWrap->setFixedWidth(680);
    composerWrap->setStyleSheet(
        QStringLiteral("#aiComposerWrap { background-color:%1; border:1px solid %2; border-radius:10px; }")
            .arg(OlerTheme::token(OlerTheme::Token::BgElevated).name(),
                 OlerTheme::token(OlerTheme::Token::Border).name()));
    auto *composer = new QHBoxLayout(composerWrap);
    composer->setContentsMargins(12, 6, 8, 6);
    composer->setSpacing(8);

    m_input = new QPlainTextEdit(composerWrap);
    m_input->setObjectName(QStringLiteral("aiComposer"));
    m_input->setFixedHeight(44);
    m_input->setPlaceholderText(tr("向 AI 竞赛教练提问（Enter 发送，Shift+Enter 换行）…"));
    m_input->installEventFilter(this);
    m_input->setFrameShape(QFrame::NoFrame);
    composer->addWidget(m_input, /*stretch*/ 1);

    m_send = new QPushButton(composerWrap);
    m_send->setObjectName(QStringLiteral("aiSend"));
    m_send->setFixedSize(36, 36);
    m_send->setIcon(OlerIcons::make(OlerIcons::Name::Send,
                                    QColor("#ffffff"), 16));
    m_send->setCursor(Qt::PointingHandCursor);
    connect(m_send, &QPushButton::clicked, this, &OlerAiPage::send);
    composer->addWidget(m_send, 0, Qt::AlignBottom);

    auto *outerRow = new QHBoxLayout;
    outerRow->addStretch();
    outerRow->addWidget(composerWrap);
    outerRow->addStretch();
    layout->addLayout(outerRow);

    // ----- Composer state wiring -----
    connect(m_input, &QPlainTextEdit::textChanged, this, [this] {
        updateSendEnabled();
        adjustComposerHeight();
        // Qt's built-in placeholder does not always repaint on textChanged;
        // nudging it makes the hint disappear as soon as the user types.
        m_input->viewport()->update();
    });
    updateSendEnabled(); // initial state (disabled, empty composer)

    appendBubble(false, tr(kWelcome));
}

// Enter sends (Shift+Enter inserts a newline).
bool OlerAiPage::eventFilter(QObject *obj, QEvent *ev) {
    if (obj == m_input && ev->type() == QEvent::KeyPress) {
        auto *keyEv = static_cast<QKeyEvent *>(ev);
        const bool isEnter = (keyEv->key() == Qt::Key_Return ||
                              keyEv->key() == Qt::Key_Enter);
        if (isEnter && !(keyEv->modifiers() & Qt::ShiftModifier)) {
            send();
            return true;
        }
    }
    return QWidget::eventFilter(obj, ev);
}

void OlerAiPage::updateSendEnabled() {
    const bool hasText = !m_input->toPlainText().trimmed().isEmpty();
    m_send->setEnabled(hasText);
}

void OlerAiPage::adjustComposerHeight() {
    const int lineHeight = m_input->fontMetrics().lineSpacing();
    const int lines = qMax(1, m_input->blockCount());
    constexpr int kMin = 44, kMax = 120, kPadding = 16;
    const int target = qBound(kMin, lines * lineHeight + kPadding, kMax);
    m_input->setFixedHeight(target);
}

void OlerAiPage::addTextSegment(QWidget *host, QVBoxLayout *lay,
                                const QString &text, bool user) {
    auto *lbl = new QLabel(host);
    lbl->setTextFormat(Qt::RichText);
    lbl->setWordWrap(true);
    lbl->setText(text);
    lbl->setMaximumWidth(520);
    lbl->setObjectName(user ? QStringLiteral("aiBubbleUser")
                             : QStringLiteral("aiBubbleAi"));
    lay->addWidget(lbl);
}

void OlerAiPage::addCodeSegment(QWidget *host, QVBoxLayout *lay,
                                const QString &lang, const QString &code) {
    auto *codeW = new CodeBlockWidget(lang, code, host);
    lay->addWidget(codeW);
}

void OlerAiPage::appendBubble(bool user, const QString &text) {
    auto *row = new QWidget(m_chatHost);
    auto *rowLay = new QHBoxLayout(row);
    rowLay->setContentsMargins(0, 0, 0, 0);
    rowLay->setSpacing(10);

    // Build the bubble's content column (may mix text + code blocks).
    auto *bubble = new QWidget(row);
    auto *bubbleLay = new QVBoxLayout(bubble);
    bubbleLay->setContentsMargins(0, 0, 0, 0);
    bubbleLay->setSpacing(8);

    static const QRegularExpression fenceRe(
        QStringLiteral("```([A-Za-z0-9_+-]*)\\n([\\s\\S]*?)```"));
    int lastEnd = 0;
    auto it = fenceRe.globalMatch(text);
    while (it.hasNext()) {
        const auto m = it.next();
        if (m.capturedStart() > lastEnd)
            addTextSegment(bubble, bubbleLay,
                           text.mid(lastEnd, m.capturedStart() - lastEnd), user);
        addCodeSegment(bubble, bubbleLay,
                       m.captured(1), m.captured(2));
        lastEnd = m.capturedEnd();
    }
    if (lastEnd < text.length())
        addTextSegment(bubble, bubbleLay, text.mid(lastEnd), user);

    if (user) {
        rowLay->addStretch();
        rowLay->addWidget(bubble);
        rowLay->addWidget(avatar(true, row));
    } else {
        rowLay->addWidget(avatar(false, row));
        rowLay->addWidget(bubble);
        rowLay->addStretch();
    }

    // Insert before the trailing stretch.
    const int at = m_chatLayout->count() - 1;
    m_chatLayout->insertWidget(at, row);

    ++m_bubbleCount;
    if (m_bubbleCount > 1)
        m_clearBtn->setVisible(true);
}

void OlerAiPage::send() {
    const QString msg = m_input->toPlainText().trimmed();
    if (msg.isEmpty())
        return;
    appendBubble(true, msg);
    m_input->clear();

    QString reply;
    if (msg.contains(QLatin1String("WA"), Qt::CaseInsensitive)) {
        reply = tr("WA \u6392\u67e5\uff1a\u68c0\u67e5\u6ea2\u51fa\uff08\u6539\u7528 long long\uff09\u3001n=0/1 \u8fb9\u754c\uff0c"
                   "\u5e76\u7528 Ctrl+R \u5c06\u8f93\u51fa\u4e0e tests/caseN.out \u9010\u5b57\u8282\u6bd4\u5bf9\u3002\n\n"
                   "\u53c2\u8003\u793a\u4f8b\uff1a\n"
                   "```cpp\n"
                   "long long a, b;\n"
                   "std::cin >> a >> b;\n"
                   "std::cout << a + b << \"\\n\";\n"
                   "```");
    } else if (msg.contains(QLatin1String("TLE"), Qt::CaseInsensitive)) {
        reply = tr("TLE \u6392\u67e5\uff1a\u5148\u786e\u8ba4\u7b97\u6cd5\u590d\u6742\u5ea6\u3002\u82e5\u5df2\u662f\u6700\u4f18\uff0c\u5c1d\u8bd5\u66f4\u5feb\u7684 IO"
                   "\uff08scanf / \u5173\u95ed\u6d41\u540c\u6b65\uff09\u4e0e\u5e38\u6570\u4f18\u5316\u3002");
    } else if (msg.contains(QLatin1String("\u5de5\u4f5c\u533a")) ||
               msg.contains(QLatin1String("workspace"), Qt::CaseInsensitive)) {
        reply = tr("~/.oleride/workspace/<\u9898\u53f7>/ \u76ee\u5f55\u5b58\u653e main.cpp \u4e0e\u6d4b\u8bd5\u70b9\uff1b"
                   "tests/*.in/.out \u6210\u5bf9\u6587\u4ef6\u4f1a\u88ab Ctrl+R \u81ea\u52a8\u53d1\u73b0\u3002");
    } else {
        reply = tr("\u6536\u5230\u3002\u672c\u5730\u8bc4\u6d4b\u5df2\u7ecf\u53ef\u7528\uff1bdots.ai \u7684\u771f\u5b9e\u56de\u7b54\u5c06\u4ece Phase 7+ \u63a5\u5165\u3002");
    }
    appendBubble(false, reply);
}

void OlerAiPage::clearConversation() {
    // Remove every bubble row (skip the trailing stretch at the end).
    while (m_chatLayout->count() > 1) {
        QLayoutItem *item = m_chatLayout->takeAt(0);
        if (item->widget())
            item->widget()->deleteLater();
        delete item;
    }
    m_bubbleCount = 0;
    m_clearBtn->setVisible(false);
    appendBubble(false, tr(kWelcome));
}