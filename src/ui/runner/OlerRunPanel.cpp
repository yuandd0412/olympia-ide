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
    const QString textColor = (v == QLatin1String("TLE")) ? QStringLiteral("#131311") : QStringLiteral("#ffffff");
    return QStringLiteral(
               "<span style='background-color:%1;color:%2;border-radius:4px;"
               "font-family:Consolas,monospace;font-size:11px;font-weight:600;padding:2px 8px;'>%3</span>")
        .arg(c, textColor, v);
}

QString codeCard(const QString &label, const QString &text, const QString &tintColor,
                 const QString &bgSurface, const QString &textColor) {
    if (text.isEmpty()) return {};
    QString clipped = text;
    constexpr int kMaxChars = 12000;
    if (clipped.size() > kMaxChars)
        clipped = clipped.left(kMaxChars) + QStringLiteral("\n… [output truncated]");

    return QStringLiteral(
               "<div style='margin-top:6px;'>"
               "<div style='color:%1;font-size:11px;font-weight:600;margin-bottom:3px;'>%2</div>"
               "<pre style='color:%3;background:%4;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:8px;margin:0;font-family:Consolas,monospace;font-size:12px;line-height:1.4;'>%5</pre>"
               "</div>")
        .arg(tintColor, label, textColor, bgSurface, clipped.toHtmlEscaped());
}

} // namespace

OlerRunPanel::OlerRunPanel(QWidget *parent) : QTextBrowser(parent) {
    setOpenExternalLinks(false);
    setReadOnly(true);
    document()->setDefaultStyleSheet(
        QStringLiteral("body { font-family:'Segoe UI',system-ui,sans-serif; margin:12px; }"));
}

void OlerRunPanel::showMessage(const QString &html) {
    setHtml(html);
}

void OlerRunPanel::showResult(const OlerRunResult &result, const QString &sourcePath) {
    const QString primaryText = OlerTheme::token(OlerTheme::Token::TextPrimary).name(QColor::HexRgb);
    const QString secondaryText = OlerTheme::token(OlerTheme::Token::TextSecondary).name(QColor::HexRgb);
    const QString tertiaryText = OlerTheme::token(OlerTheme::Token::TextTertiary).name(QColor::HexRgb);
    const QString bgSurface = OlerTheme::token(OlerTheme::Token::BgSurface).name(QColor::HexRgb);
    const QString bgElevated = OlerTheme::token(OlerTheme::Token::BgElevated).name(QColor::HexRgb);
    const QString border = OlerTheme::token(OlerTheme::Token::Border).name(QColor::HexRgb);
    const QString accent = OlerTheme::accentForTheme(CThemeManager::instance()->currentTheme()).name(QColor::HexRgb);

    const QString fileName = QFileInfo(sourcePath).fileName();

    QString html;
    html += QStringLiteral(
        "<div style='display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px;'>"
        "<span style='color:%1;font-size:14px;font-weight:600;'>%2</span>"
        "</div>")
        .arg(primaryText, fileName.toHtmlEscaped());

    if (!result.compileOk) {
        html += QStringLiteral(
            "<div style='background:%1;border:1px solid rgba(255,69,58,0.3);border-radius:8px;padding:12px;margin-bottom:12px;'>"
            "<div style='margin-bottom:8px;'>%2 <span style='color:#ff453a;font-weight:600;margin-left:6px;'>编译失败 (Compile Error)</span></div>"
            "<pre style='color:#ff453a;background:%3;border-radius:6px;padding:10px;font-family:Consolas,monospace;font-size:12px;line-height:1.4;margin:0;'>%4</pre>"
            "</div>")
            .arg(bgElevated, badge(QStringLiteral("CE")), bgSurface, result.compileOutput.toHtmlEscaped());
        setHtml(html);
        return;
    }

    int ac = 0;
    const int total = result.cases.size();
    for (const OlerCaseResult &r : result.cases) {
        if (r.verdict == QLatin1String("AC")) ++ac;
    }

    // Summary banner
    const bool allAc = (total > 0 && ac == total);
    const QString bannerColor = allAc ? QStringLiteral("#34c759") : (ac > 0 ? QStringLiteral("#ff9f0a") : QStringLiteral("#ff453a"));
    const QString bannerTitle = allAc ? QStringLiteral("Accepted · 全部测试点通过") : QStringLiteral("Unaccepted · 部分测试点未通过");

    html += QStringLiteral(
        "<div style='background:%1;border:1px solid %2;border-radius:8px;padding:12px 16px;margin-bottom:14px;'>"
        "<div style='display:flex;align-items:center;'>"
        "<span style='color:%3;font-size:14px;font-weight:600;'>%4</span>"
        "<span style='color:%5;font-size:12px;margin-left:12px;font-family:Consolas,monospace;'>通过率 %6 / %7</span>"
        "</div>"
        "</div>")
        .arg(bgElevated, bannerColor, bannerColor, bannerTitle, secondaryText, QString::number(ac), QString::number(total));

    // Case cards
    for (const OlerCaseResult &r : result.cases) {
        const QString vColor = colorFor(r.verdict);
        html += QStringLiteral(
            "<div style='background:%1;border:1px solid rgba(255,255,255,0.06);border-left:4px solid %2;border-radius:6px;padding:10px 14px;margin-bottom:10px;'>"
            "<div style='margin-bottom:4px;'>"
            "<span style='color:%3;font-weight:600;font-size:13px;'>测试点 #%4</span> &nbsp; %5 &nbsp; "
            "<span style='color:%6;font-family:Consolas,monospace;font-size:11px;'>耗时: %7 ms</span>")
            .arg(bgSurface, vColor, primaryText, QString::number(r.index + 1), badge(r.verdict), secondaryText, QString::number(r.timeMs));

        if (r.memoryKb >= 0) {
            html += QStringLiteral(" &nbsp; <span style='color:%1;font-family:Consolas,monospace;font-size:11px;'>内存: %2 MB</span>")
                        .arg(secondaryText, QString::number(r.memoryKb / 1024.0, 'f', 1));
        }
        html += QStringLiteral("</div>");

        if (r.verdict != QLatin1String("AC")) {
            html += codeCard(QStringLiteral("期望输出 (Expected)"), r.expectedOutput,
                             QStringLiteral("#34c759"), bgElevated, primaryText);
            html += codeCard(QStringLiteral("实际输出 (Actual)"), r.actualOutput,
                             QStringLiteral("#ff453a"), bgElevated, primaryText);
        }
        if (!r.stderrOutput.isEmpty()) {
            html += codeCard(QStringLiteral("标准错误 (stderr)"), r.stderrOutput,
                             QStringLiteral("#ff9f0a"), bgElevated, primaryText);
        }
        html += QStringLiteral("</div>");
    }

    if (!result.compileOutput.trimmed().isEmpty()) {
        html += QStringLiteral(
            "<div style='margin-top:12px;'>"
            "<span style='color:%1;font-size:11px;font-weight:600;'>编译器输出 (Compiler Warnings):</span>"
            "<pre style='color:#ff9f0a;background:%2;border-radius:6px;padding:8px;font-family:Consolas,monospace;font-size:11px;'>%3</pre>"
            "</div>")
            .arg(secondaryText, bgSurface, result.compileOutput.toHtmlEscaped());
    }

    setHtml(html);
}
