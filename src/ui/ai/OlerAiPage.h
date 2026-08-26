#pragma once
#include <QWidget>

class QVBoxLayout;
class QPlainTextEdit;
class QPushButton;
class QComboBox;
class QLabel;

// AI Coach tab \u2014 pixel port of pages/shell-ai.html: centered 720px chat
// flow with avatars, asymmetric bubbles, prompt chips, circular send,
// adaptive composer (44-120px), code-block rendering with simple C++
// syntax highlight + Copy, and a Clear-conversation button.
//
// Mocked assistant until Phase 7+ (dots.ai).
class OlerAiPage : public QWidget {
    Q_OBJECT
public:
    explicit OlerAiPage(QWidget *parent = nullptr);

protected:
    bool eventFilter(QObject *obj, QEvent *ev) override;

private slots:
    void send();
    void clearConversation();

private:
    // Build a bubble row (avatar + content column) and insert into the
    // chat flow. Splits `text` on ```lang\n...\n``` fences so each code
    // block becomes its own styled widget with Copy + language badge.
    void appendBubble(bool user, const QString &text);

    // Append one piece of free-form (non-code-block) content into a bubble.
    void addTextSegment(QWidget *host, QVBoxLayout *lay,
                        const QString &text, bool user);

    // Append one code-block widget into a bubble.
    void addCodeSegment(QWidget *host, QVBoxLayout *lay,
                        const QString &lang, const QString &code);

    // Bind send button enabled state to whether the composer has content.
    void updateSendEnabled();

    // Resize the composer between 44px (single line) and 120px (multi-line).
    void adjustComposerHeight();

    QWidget *m_chatHost = nullptr;
    QVBoxLayout *m_chatLayout = nullptr;
    QPlainTextEdit *m_input = nullptr;
    QPushButton *m_send = nullptr;
    QPushButton *m_clearBtn = nullptr;
    QComboBox *m_model = nullptr;
    int m_bubbleCount = 0;
};