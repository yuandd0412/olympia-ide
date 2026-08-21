#include "OlerEditor.h"
#include <KSyntaxHighlighting/Repository>
#include <KSyntaxHighlighting/SyntaxHighlighter>
#include <KSyntaxHighlighting/Theme>
#include "core/theme/CThemeManager.h"

OlerEditor::OlerEditor(QWidget *parent)
    : QPlainTextEdit(parent)
    , m_repo(new KSyntaxHighlighting::Repository())
    , m_highlighter(new KSyntaxHighlighting::SyntaxHighlighter(document()))
{
    m_highlighter->setDefinition(m_repo->definitionForName(QStringLiteral("C++")));
    applyThemeFromManager();
    connect(CThemeManager::instance(), &CThemeManager::themeChanged,
            this, &OlerEditor::applyThemeFromManager);
}

OlerEditor::~OlerEditor() = default;

void OlerEditor::setLanguage(const QString &lang) {
    m_language = lang;
    auto def = m_repo->definitionForName(lang);
    if (def.isValid()) m_highlighter->setDefinition(def);
}

void OlerEditor::applyThemeFromManager() {
    auto theme = m_repo->theme(CThemeManager::instance()->currentTheme());
    if (!theme.isValid()) theme = m_repo->defaultTheme();
    m_highlighter->setTheme(theme);
}
