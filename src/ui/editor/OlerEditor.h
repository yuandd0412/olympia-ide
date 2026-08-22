#pragma once
#include <QPlainTextEdit>
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

signals:
    void fileChanged(const QString &path);

private:
    std::unique_ptr<KSyntaxHighlighting::Repository> m_repo;
    KSyntaxHighlighting::SyntaxHighlighter *m_highlighter = nullptr;
    QString m_language;
    QString m_filePath;
};
