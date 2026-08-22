#pragma once
#include <QWidget>

class QTextBrowser;
class QPlainTextEdit;
class QPushButton;
class QComboBox;

// AI Coach tab (docs/03-shell-pages/ai.md): chat surface with message
// bubbles + prompt chips. Mocked assistant until Phase 7+ (dots.ai).
class OlerAiPage : public QWidget {
    Q_OBJECT
public:
    explicit OlerAiPage(QWidget *parent = nullptr);

private slots:
    void send();

private:
    void appendBubble(bool user, const QString &text);

    QTextBrowser *m_log = nullptr;
    QPlainTextEdit *m_input = nullptr;
    QPushButton *m_send = nullptr;
    QComboBox *m_model = nullptr;
};
