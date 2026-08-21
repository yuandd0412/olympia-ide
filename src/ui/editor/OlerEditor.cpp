#include "OlerEditor.h"
#include <KSyntaxHighlighting/Repository>
#include <KSyntaxHighlighting/SyntaxHighlighter>
#include <KSyntaxHighlighting/Theme>
#include <QHash>
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
    // Map Oler theme names to KSyntax theme names.
    // KSyntax ships themes like breeze-dark, atom-one-dark, etc. (not "AmberDark").
    static const QHash<QString, QString> kThemeMap = {
        {QStringLiteral("AmberDark"),  QStringLiteral("breeze-dark")},
        {QStringLiteral("AmberLight"), QStringLiteral("breeze-light")},
        {QStringLiteral("OneDarkPro"), QStringLiteral("atom-one-dark")},
        {QStringLiteral("OneLight"),   QStringLiteral("atom-one-light")},
    };
    const QString olerTheme = CThemeManager::instance()->currentTheme();
    const QString kSyntaxName = kThemeMap.value(olerTheme, QStringLiteral("breeze-dark"));
    auto theme = m_repo->theme(kSyntaxName);
    if (!theme.isValid()) theme = m_repo->defaultTheme();
    m_highlighter->setTheme(theme);
}
