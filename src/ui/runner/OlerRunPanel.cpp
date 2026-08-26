#include "OlerRunPanel.h"
#include "core/theme/CThemeManager.h"
#include "ui/common/OlerTheme.h"
#include <QDir>
#include <QFileInfo>

namespace {

// Judgement tokens (docs/02-design-system/tokens.md).
QString colorFor(const QString &v) {
    if (v == QLatin1String("AC"))  return QStringLiteral("#34c759");
    if (v == QLatin1String("WA"))  return QStringLiteral("#ff453a");
    if (v == QLatin1String("TLE")) return QStringLiteral("#ff9f0a");
    if (v == QLatin1String("RE"))  return QStringLiteral("#c45c4a");
    if (v == QLatin1String("CE"))  return QStringLiteral("#c49a3c");
    return QStringLiteral("#a0a0a3");
}

QString badge(const QString &v) {
    const QString c = colorFor(v);
    // 15% alpha tint background + verdict-colored foreground, per token spec.
    QString tint = c;
    tint.insert(1, QStringLiteral("4D")); // #RRGGBB -> #RRGGBB4D (alpha)
    return QStringLiteral(
               "<span style='background-color:%1;color:%2;border-radius:2px;"
               "font-weight:600'>&nbsp;%3&nbsp;</span>")
        .arg(tint, c, v);
}

QString outputBlock(const QString &label, const QString &text,
                    const QString &color) {
    if (text.isEmpty())
        return {};
    QString clipped = text;
    constexpr int kMaxChars = 12000;
    if (clipped.size() > kMaxChars)
        clipped = clipped.left(kMaxChars) + QStringLiteral("\n… [output truncated]");
    // Style guide §0 forbids 700+ weights: 600 is the heaviest allowed.
    // Body text + code panel use the active theme's primary text and surface
    // (so the result panel stays readable when the user switches themes).
    const QString primaryText =
        OlerTheme::token(OlerTheme::Token::TextPrimary).name(QColor::HexRgb);
    const QString surface =
        OlerTheme::token(OlerTheme::Token::BgSurface).name(QColor::HexRgb);
    return QStringLiteral(
               "<div style='color:%1;font-weight:600;margin-top:4px'>%2</div>"
               "<pre style='color:%3;background:%4;padding:6px'>%5</pre>")
        .arg(color, label, primaryText, surface, clipped.toHtmlEscaped());
}

} // namespace

OlerRunPanel::OlerRunPanel(QWidget *parent) : QTextBrowser(parent) {
    setOpenExternalLinks(false);
    setReadOnly(true);
}

void OlerRunPanel::showMessage(const QString &html) {
    setHtml(html);
}

void OlerRunPanel::showResult(const OlerRunResult &result,
                              const QString &sourcePath) {
    QString html = QStringLiteral("<div style='color:#6e6d68'>%1</div><br>")
                       .arg(QFileInfo(sourcePath).fileName().toHtmlEscaped());

    if (!result.compileOk) {
        html += badge(QStringLiteral("CE"));
        html += QStringLiteral("<br><pre style='color:#ff453a'>%1</pre>")
                    .arg(result.compileOutput.toHtmlEscaped());
        setHtml(html);
        return;
    }

    int ac = 0;
    for (const OlerCaseResult &r : result.cases) {
        html += QStringLiteral("Case %1 &nbsp; %2 &nbsp; %3 ms")
                    .arg(r.index + 1)
                    .arg(badge(r.verdict))
                    .arg(r.timeMs);
        if (r.memoryKb >= 0)
            html += QStringLiteral(" &nbsp; %1 MB").arg(r.memoryKb / 1024.0, 0, 'f', 1);
        html += QStringLiteral("<br>");
        if (r.verdict != QLatin1String("AC")) {
            html += outputBlock(QStringLiteral("Expected output"),
                                r.expectedOutput, QStringLiteral("#34c759"));
            html += outputBlock(QStringLiteral("Actual output"),
                                r.actualOutput, QStringLiteral("#ff453a"));
        }
        html += outputBlock(QStringLiteral("stderr"), r.stderrOutput,
                            QStringLiteral("#ff9f0a"));
        if (r.verdict == QLatin1String("AC"))
            ++ac;
    }

    const int total = result.cases.size();
    // Success green / brand primary come from the active theme so a light-mode
    // user still sees a green Pass marker (judgement color tokens are theme-
    // stable per docs/02-design-system/tokens.md).
    const QString rateColor = (total > 0 && ac == total)
                                  ? OlerTheme::token(OlerTheme::Token::Success).name(QColor::HexRgb)
                                  : OlerTheme::accentForTheme(
                                        CThemeManager::instance()->currentTheme())
                                        .name(QColor::HexRgb);
    html += QStringLiteral("<br><span style='color:%1;font-weight:600'>"
                           "Pass %2 / %3</span>")
                .arg(rateColor).arg(ac).arg(total);

    if (!result.compileOutput.trimmed().isEmpty()) {
        html += QStringLiteral("<br><span style='color:#ff9f0a'>compiler:</span>"
                               "<pre>%1</pre>")
                    .arg(result.compileOutput.toHtmlEscaped());
    }
    setHtml(html);
}
