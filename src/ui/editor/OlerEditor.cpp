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
    // KSyntax data path: data/syntax/*.xml + data/index.katesyntax.
    // Root CMakeLists.txt has QRC_SYNTAX=OFF, so the qrc syntax data is NOT
    // bundled. We must point Repository at the on-disk location so it can
    // either load the pre-generated build/index.katesyntax or auto-build the
    // index from the syntax/ XMLs on first use. Without this,
    // definitionForName("C++") returns invalid and visual highlighting is a no-op.
    // TODO: derive from a CMake-passed define once the project root path is
    // parameterized (v2 acceptable to hard-code).
    m_repo->addCustomSearchPath(QStringLiteral("D:/oler-ide-v2/third_party/syntax-highlighting/data"));
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
    // KSyntax's Repository::theme() expects Title Case display names
    // ("Breeze Dark", "Atom One Dark"), NOT kebab-case ("breeze-dark").
    // Passing the wrong case returns an invalid theme, which would silently
    // fall back to the default and ignore the user's chosen theme.
    static const QHash<QString, QString> kThemeMap = {
        {QStringLiteral("AmberDark"),  QStringLiteral("Breeze Dark")},
        {QStringLiteral("AmberLight"), QStringLiteral("Breeze Light")},
        {QStringLiteral("OneDarkPro"), QStringLiteral("Atom One Dark")},
        {QStringLiteral("OneLight"),   QStringLiteral("Atom One Light")},
    };
    const QString olerTheme = CThemeManager::instance()->currentTheme();
    const QString kSyntaxName = kThemeMap.value(olerTheme, QStringLiteral("Breeze Dark"));
    auto theme = m_repo->theme(kSyntaxName);
    if (!theme.isValid()) theme = m_repo->defaultTheme();
    m_highlighter->setTheme(theme);
}
