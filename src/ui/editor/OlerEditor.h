#pragma once
#include <QPlainTextEdit>
#include <QVector>
#include <memory>

namespace KSyntaxHighlighting {
class Repository;
class SyntaxHighlighter;
}

class CThemeManager;

class OlerEditor : public QPlainTextEdit {
    Q_OBJECT
public:
    explicit OlerEditor(QWidget *parent = nullptr);
    ~OlerEditor() override;

    void setLanguage(const QString &lang);  // e.g. "C++", "Python"
    void applyThemeFromManager();
    void applyFontSize();

    QString filePath() const;
    bool loadFile(const QString &path);
    bool saveFile(const QString &path);

    // Line-number gutter (docs/04-editor: 56px, right-aligned, muted).
    void lineNumberAreaPaintEvent(QPaintEvent *ev);
    int lineNumberAreaWidth() const;

protected:
    void resizeEvent(QResizeEvent *ev) override;

signals:
    void fileChanged(const QString &path);
    // Live structure analysis: how many braces / parens are still open.
    // 0/0 means the code written so far is structurally balanced.
    void structureChanged(int unclosedBraces, int unclosedParens);

private slots:
    void onTextChanged();
    void onCursorPositionChanged();
    void updateLineNumberArea();
    void highlightCurrentLine();

private:
    struct ScanResult {
        QVector<int> partner;       // char pos -> matched pos, -1 if none
        int unclosedCurly = 0;
        int unclosedRound = 0;      // ( and [ combined
    };
    ScanResult scanStructure() const;
    void rescanStructure();
    void updateBracketMatch();

private:
    std::unique_ptr<KSyntaxHighlighting::Repository> m_repo;
    KSyntaxHighlighting::SyntaxHighlighter *m_highlighter = nullptr;
    QString m_language;
    QString m_filePath;
    QTimer *m_scanTimer = nullptr;
    ScanResult m_scan;
    QWidget *m_lineNumberArea = nullptr;
};

// Gutter host widget (standard Qt CodeEditor pattern).
class OlerLineNumberArea : public QWidget {
public:
    explicit OlerLineNumberArea(OlerEditor *editor)
        : QWidget(editor), m_editor(editor) {}
    QSize sizeHint() const override {
        return {m_editor->lineNumberAreaWidth(), 0};
    }
protected:
    void paintEvent(QPaintEvent *ev) override {
        m_editor->lineNumberAreaPaintEvent(ev);
    }
private:
    OlerEditor *m_editor;
};
