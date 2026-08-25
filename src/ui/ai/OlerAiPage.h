#pragma once
#include <QWidget>

class QVBoxLayout;
class QPlainTextEdit;
class QPushButton;
class QComboBox;
class QLabel;

// AI Coach tab — pixel port of pages/shell-ai.html: centered 720px chat
// flow with avatars, asymmetric bubbles, prompt chips, circular send.
// Mocked assistant until Phase 7+ (dots.ai).
class OlerAiPage : public QWidget {
    Q_OBJECT
public:
    explicit OlerAiPage(QWidget *parent = nullptr);

private slots:
    void send();

private:
    void appendBubble(bool user, const QString &text);

    QWidget *m_chatHost = nullptr;
    QVBoxLayout *m_chatLayout = nullptr;
    QPlainTextEdit *m_input = nullptr;
    QPushButton *m_send = nullptr;
    QComboBox *m_model = nullptr;
};
