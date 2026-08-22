#include "OlerRunPanel.h"
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
               "font-weight:bold'>&nbsp;%3&nbsp;</span>")
        .arg(tint, c, v);
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
        if (r.verdict == QLatin1String("AC"))
            ++ac;
    }

    const int total = result.cases.size();
    const QString rateColor = (total > 0 && ac == total)
                                  ? QStringLiteral("#34c759")
                                  : QStringLiteral("#d97757");
    html += QStringLiteral("<br><span style='color:%1;font-weight:bold'>"
                           "Pass %2 / %3</span>")
                .arg(rateColor).arg(ac).arg(total);

    if (!result.compileOutput.trimmed().isEmpty()) {
        html += QStringLiteral("<br><span style='color:#ff9f0a'>compiler:</span>"
                               "<pre>%1</pre>")
                    .arg(result.compileOutput.toHtmlEscaped());
    }
    setHtml(html);
}
