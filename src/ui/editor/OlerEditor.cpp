#include "OlerEditor.h"
#include <KSyntaxHighlighting/Repository>
#include <KSyntaxHighlighting/SyntaxHighlighter>
#include <KSyntaxHighlighting/Theme>
#include <QFile>
#include <QFileInfo>
#include <QFont>
#include <QHash>
#include <QPainter>
#include <QTimer>
#include "core/theme/CThemeManager.h"
#include "core/settings/OlerSettings.h"

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

    // Editor font follows the settings key editor/fontSize.
    applyFontSize();
    connect(OlerSettings::instance(), &OlerSettings::settingChanged, this,
            [this](const QString &key) {
                if (key == QLatin1String("editor/fontSize"))
                    applyFontSize();
            });

    applyThemeFromManager();
    connect(CThemeManager::instance(), &CThemeManager::themeChanged,
            this, &OlerEditor::applyThemeFromManager);

    // Live structure analysis (bracket matching + unclosed detection).
    m_scanTimer = new QTimer(this);
    m_scanTimer->setSingleShot(true);
    m_scanTimer->setInterval(150);
    connect(m_scanTimer, &QTimer::timeout, this, [this] {
        rescanStructure();
        updateBracketMatch();
    });
    connect(this, &QPlainTextEdit::textChanged,
            this, &OlerEditor::onTextChanged);
    connect(this, &QPlainTextEdit::cursorPositionChanged,
            this, &OlerEditor::onCursorPositionChanged);

    // Line-number gutter (56px per docs/04-editor/subpages.md).
    m_lineNumberArea = new OlerLineNumberArea(this);
    connect(this, &QPlainTextEdit::blockCountChanged,
            this, [this](int) { updateLineNumberArea(); });
    connect(this, &QPlainTextEdit::updateRequest,
            this, [this](const QRect &, int dy) {
                if (dy != 0)
                    m_lineNumberArea->scroll(0, dy);
                else
                    m_lineNumberArea->update();
            });
    connect(this, &QPlainTextEdit::cursorPositionChanged,
            this, &OlerEditor::highlightCurrentLine);
    updateLineNumberArea();
    highlightCurrentLine();
    onTextChanged();
}

// ---- line-number gutter -------------------------------------------------

void OlerEditor::resizeEvent(QResizeEvent *ev) {
    QPlainTextEdit::resizeEvent(ev);
    const QRect cr = contentsRect();
    m_lineNumberArea->setGeometry(
        QRect(cr.left(), cr.top(), lineNumberAreaWidth(), cr.height()));
}

int OlerEditor::lineNumberAreaWidth() const {
    int digits = 1;
    for (int max = qMax(1, blockCount()); max >= 10; max /= 10)
        ++digits;
    return 24 + fontMetrics().horizontalAdvance(QLatin1Char('9')) *
                    qMax(digits, 3);
}

void OlerEditor::updateLineNumberArea() {
    setViewportMargins(lineNumberAreaWidth(), 0, 0, 0);
}

void OlerEditor::highlightCurrentLine() {
    // Merged into updateBracketMatch's extra selections.
    updateBracketMatch();
}

void OlerEditor::lineNumberAreaPaintEvent(QPaintEvent *ev) {
    QPainter p(m_lineNumberArea);
    p.fillRect(ev->rect(), QColor(0x1a, 0x19, 0x15));
    p.setPen(QColor(0x46, 0x44, 0x3b));
    p.setFont(font());

    QTextBlock block = firstVisibleBlock();
    int blockNumber = block.blockNumber();
    int top = qRound(blockBoundingGeometry(block).translated(contentOffset()).top());
    int bottom = top + qRound(blockBoundingRect(block).height());

    const QColor currentFg(0xf1, 0xf1, 0xef);
    while (block.isValid() && top <= ev->rect().bottom()) {
        if (block.isVisible() && bottom >= ev->rect().top()) {
            const bool isCurrent = blockNumber == textCursor().blockNumber();
            p.setPen(isCurrent ? currentFg : QColor(0x46, 0x44, 0x3b));
            p.drawText(0, top, m_lineNumberArea->width() - 16,
                       fontMetrics().height(), Qt::AlignRight,
                       QString::number(blockNumber + 1));
        }
        block = block.next();
        top = bottom;
        bottom = top + qRound(blockBoundingRect(block).height());
        ++blockNumber;
    }
}

// ---- structure analysis -------------------------------------------------
//
// A lightweight lexer that understands // and block comments, string and
// char literals, so brackets inside "..." or /* */ do not confuse the
// depth counting. This lets us answer "is the code written so far
// structurally balanced?" — the core of the incomplete-code heuristic.

OlerEditor::ScanResult OlerEditor::scanStructure() const {
    ScanResult r;
    const QString text = toPlainText();
    const int n = text.size();
    r.partner.assign(n, -1);

    enum State { Code, LineComment, BlockComment, Str, Char } st = Code;
    QVector<int> curly, round; // stacks of opener positions
    QVector<QPair<int, int>> stackAll; // pos + kind ('{','(','[')
    QVector<char> kinds;

    for (int i = 0; i < n; ++i) {
        const QChar ch = text.at(i);
        const QChar next = i + 1 < n ? text.at(i + 1) : QChar();
        switch (st) {
        case Code:
            if (ch == '/' && next == '/') { st = LineComment; ++i; }
            else if (ch == '/' && next == '*') { st = BlockComment; ++i; }
            else if (ch == '"') st = Str;
            else if (ch == '\'') st = Char;
            else if (ch == '{' || ch == '(' || ch == '[') {
                stackAll.append({i, ch.toLatin1()});
                kinds.append(ch.toLatin1());
            } else if (ch == '}' || ch == ')' || ch == ']') {
                const char want =
                    ch == '}' ? '{' : ch == ')' ? '(' : '[';
                if (!kinds.isEmpty() && kinds.last() == want) {
                    const int openPos = stackAll.last().first;
                    r.partner[openPos] = i;
                    r.partner[i] = openPos;
                    stackAll.removeLast();
                    kinds.removeLast();
                    if (want == '{') { curly.removeLast(); }
                    else { round.removeLast(); }
                }
                // Mismatched closer: ignore (treated as incomplete code).
            }
            break;
        case LineComment: if (ch == '\n') st = Code; break;
        case BlockComment: if (ch == '*' && next == '/') { st = Code; ++i; } break;
        case Str: if (ch == '\\') ++i; else if (ch == '"') st = Code; break;
        case Char: if (ch == '\\') ++i; else if (ch == '\'') st = Code; break;
        }
        if (st == Code) {
            if (ch == '{') curly.append(i);
            else if (ch == '(' || ch == '[') round.append(i);
        }
    }

    r.unclosedCurly = curly.size();
    r.unclosedRound = round.size();
    return r;
}

void OlerEditor::rescanStructure() {
    m_scan = scanStructure();
    emit structureChanged(m_scan.unclosedCurly, m_scan.unclosedRound);
}

void OlerEditor::onTextChanged() {
    emit structureChanged(-1, -1); // analyzing...
    m_scanTimer->start();
}

void OlerEditor::updateBracketMatch() {
    QList<QTextEdit::ExtraSelection> sels;

    // Current line: full-width wash, no border (docs/04-editor).
    QTextEdit::ExtraSelection lineSel;
    lineSel.format.setBackground(QColor(217, 119, 87, 15));
    lineSel.format.setProperty(QTextFormat::FullWidthSelection, true);
    lineSel.cursor = textCursor();
    lineSel.cursor.clearSelection();
    sels.append(lineSel);

    // Highlight the pair around the caret when it sits next to a bracket.
    const int pos = textCursor().position();
    const QString t = toPlainText();
    auto isBracket = [](QChar c) {
        return c == '{' || c == '}' || c == '(' || c == ')' ||
               c == '[' || c == ']';
    };
    int anchor = -1;
    if (pos < t.size() && isBracket(t.at(pos))) anchor = pos;
    else if (pos - 1 >= 0 && isBracket(t.at(pos - 1))) anchor = pos - 1;

    if (anchor >= 0 && anchor < m_scan.partner.size() &&
        m_scan.partner[anchor] >= 0) {
        QTextEdit::ExtraSelection s1, s2;
        const QColor c =
            palette().highlight().color();
        s1.format.setBackground(c);
        s2.format.setBackground(c.lighter(160));
        QTextCursor c1(document()), c2(document());
        c1.setPosition(anchor); c1.movePosition(QTextCursor::NextCharacter,
                                               QTextCursor::KeepAnchor);
        c2.setPosition(m_scan.partner[anchor]);
        c2.movePosition(QTextCursor::NextCharacter, QTextCursor::KeepAnchor);
        s1.cursor = c1; s2.cursor = c2;
        sels << s1 << s2;
    }
    setExtraSelections(sels);
}

void OlerEditor::onCursorPositionChanged() { updateBracketMatch(); }

void OlerEditor::applyFontSize() {
    QFont f(QStringLiteral("Consolas"));
    f.setPointSize(OlerSettings::instance()->value("editor/fontSize").toInt());
    setFont(f);
}

OlerEditor::~OlerEditor() = default;

void OlerEditor::setLanguage(const QString &lang) {
    m_language = lang;
    auto def = m_repo->definitionForName(lang);
    if (def.isValid()) m_highlighter->setDefinition(def);
}

QString OlerEditor::filePath() const {
    return m_filePath;
}

bool OlerEditor::loadFile(const QString &path) {
    QFile f(path);
    if (!f.open(QFile::ReadOnly | QFile::Text))
        return false;
    setPlainText(QString::fromUtf8(f.readAll()));
    m_filePath = path;

    // Pick the highlighting mode from the extension.
    static const QHash<QString, QString> kLangByExt = {
        {QStringLiteral("cpp"), QStringLiteral("C++")},
        {QStringLiteral("cc"),  QStringLiteral("C++")},
        {QStringLiteral("cxx"), QStringLiteral("C++")},
        {QStringLiteral("c"),   QStringLiteral("C")},
        {QStringLiteral("h"),   QStringLiteral("C++")},
        {QStringLiteral("hpp"), QStringLiteral("C++")},
        {QStringLiteral("py"),  QStringLiteral("Python")},
        {QStringLiteral("java"), QStringLiteral("Java")},
    };
    const QString ext = QFileInfo(path).suffix().toLower();
    setLanguage(kLangByExt.value(ext, QStringLiteral("C++")));

    document()->setModified(false);
    emit fileChanged(path);
    return true;
}

bool OlerEditor::saveFile(const QString &path) {
    QFile f(path);
    if (!f.open(QFile::WriteOnly | QFile::Truncate | QFile::Text))
        return false;
    if (f.write(toPlainText().toUtf8()) < 0)
        return false;
    m_filePath = path;
    document()->setModified(false);
    emit fileChanged(path);
    return true;
}

void OlerEditor::applyThemeFromManager() {
    // Map Oler theme names to KSyntax theme names.
    // KSyntax's Repository::theme() expects Title Case display names
    // ("Breeze Dark", "Atom One Dark"), NOT kebab-case ("breeze-dark").
    // Passing the wrong case returns an invalid theme, which would silently
    // fall back to the default and ignore the user's chosen theme.
    static const QHash<QString, QString> kThemeMap = {
        {QStringLiteral("AmberDark"),  QStringLiteral("Breeze Dark")},
        {QStringLiteral("MistBlue"),   QStringLiteral("Atom One Dark")},
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
