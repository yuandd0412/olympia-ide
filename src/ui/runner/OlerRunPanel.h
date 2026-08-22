#pragma once
#include <QTextBrowser>
#include "core/runner/OlerRunner.h"

// Bottom panel of the editor page: compile log + per-case verdict grid.
// Renders HTML using the judgement colors from docs/02-design-system/tokens.md.
class OlerRunPanel : public QTextBrowser {
    Q_OBJECT
public:
    explicit OlerRunPanel(QWidget *parent = nullptr);

    void showMessage(const QString &html);
    void showResult(const OlerRunResult &result, const QString &sourcePath);

private:
    static QString verdictColor(const QString &verdict);
};
