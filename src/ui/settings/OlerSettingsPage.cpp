#include "OlerSettingsPage.h"
#include "core/settings/OlerSettings.h"
#include "core/theme/CThemeManager.h"
#include <QComboBox>
#include <QFile>
#include <QFormLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QSpinBox>
#include <QVBoxLayout>

namespace {

QSpinBox *makeSpin(int lo, int hi, int step, const QString &suffix) {
    auto *s = new QSpinBox;
    s->setRange(lo, hi);
    s->setSingleStep(step);
    if (!suffix.isEmpty())
        s->setSuffix(suffix);
    return s;
}

QWidget *group(const QString &title, QFormLayout *form) {
    auto *box = new QWidget;
    auto *layout = new QVBoxLayout(box);
    layout->setContentsMargins(0, 0, 0, 0);
    auto *header = new QLabel(title);
    header->setObjectName("settingsGroupHeader");
    layout->addWidget(header);
    layout->addLayout(form);
    return box;
}

} // namespace

OlerSettingsPage::OlerSettingsPage(QWidget *parent) : QWidget(parent) {
    OlerSettings *st = OlerSettings::instance();

    auto *root = new QVBoxLayout(this);
    root->setContentsMargins(16, 16, 16, 16);
    root->setSpacing(12);

    // --- Appearance ---
    auto *appearanceForm = new QFormLayout;
    m_theme = new QComboBox;
    m_theme->addItems(CThemeManager::instance()->availableThemes());
    m_theme->setCurrentText(st->value("theme").toString());
    connect(m_theme, &QComboBox::currentTextChanged,
            this, &OlerSettingsPage::onThemeChanged);
    appearanceForm->addRow(tr("Theme"), m_theme);

    m_fontSize = makeSpin(9, 28, 1, QStringLiteral(" px"));
    m_fontSize->setValue(st->value("editor/fontSize").toInt());
    connect(m_fontSize, &QSpinBox::valueChanged, this, [st](int v) {
        st->setValue("editor/fontSize", v);
        st->save();
    });
    appearanceForm->addRow(tr("Editor font size"), m_fontSize);
    root->addWidget(group(tr("Appearance"), appearanceForm));

    // --- Compiler ---
    auto *compilerForm = new QFormLayout;
    auto *pathRow = new QHBoxLayout;
    m_gxxPath = new QLineEdit(st->value("compiler/gxxPath").toString());
    connect(m_gxxPath, &QLineEdit::editingFinished, this, [this, st] {
        st->setValue("compiler/gxxPath", m_gxxPath->text());
        st->save();
    });
    auto *detectBtn = new QPushButton(tr("Detect"), this);
    connect(detectBtn, &QPushButton::clicked, this,
            &OlerSettingsPage::detectCompiler);
    pathRow->addWidget(m_gxxPath, /*stretch*/ 1);
    pathRow->addWidget(detectBtn);
    compilerForm->addRow(tr("g++ path"), pathRow);

    m_optLevel = new QComboBox;
    m_optLevel->addItems({"-O0", "-O1", "-O2", "-O3"});
    m_optLevel->setCurrentText(st->value("compiler/optLevel").toString());
    connect(m_optLevel, &QComboBox::currentTextChanged, this, [st](const QString &v) {
        st->setValue("compiler/optLevel", v);
        st->save();
    });
    compilerForm->addRow(tr("Optimization"), m_optLevel);

    m_stdFlag = new QComboBox;
    m_stdFlag->addItems({"-std=c++14", "-std=c++17", "-std=c++20"});
    m_stdFlag->setCurrentText(st->value("compiler/stdFlag").toString());
    connect(m_stdFlag, &QComboBox::currentTextChanged, this, [st](const QString &v) {
        st->setValue("compiler/stdFlag", v);
        st->save();
    });
    compilerForm->addRow(tr("Standard"), m_stdFlag);
    root->addWidget(group(tr("Compiler"), compilerForm));

    // --- Limits ---
    auto *limitsForm = new QFormLayout;
    m_timeMs = makeSpin(100, 30000, 100, QStringLiteral(" ms"));
    m_timeMs->setValue(st->value("limits/timeMs").toInt());
    connect(m_timeMs, &QSpinBox::valueChanged, this, [st](int v) {
        st->setValue("limits/timeMs", v);
        st->save();
    });
    limitsForm->addRow(tr("Time limit"), m_timeMs);

    m_memoryMb = makeSpin(8, 4096, 8, QStringLiteral(" MB"));
    m_memoryMb->setValue(st->value("limits/memoryMb").toInt());
    connect(m_memoryMb, &QSpinBox::valueChanged, this, [st](int v) {
        st->setValue("limits/memoryMb", v);
        st->save();
    });
    limitsForm->addRow(tr("Memory limit"), m_memoryMb);
    root->addWidget(group(tr("Test budgets"), limitsForm));

    // --- Training ---
    auto *trainingForm = new QFormLayout;
    m_dailyGoal = makeSpin(1, 50, 1, QString());
    m_dailyGoal->setValue(st->value("training/dailyGoal").toInt());
    connect(m_dailyGoal, &QSpinBox::valueChanged, this, [st](int v) {
        st->setValue("training/dailyGoal", v);
        st->save();
    });
    trainingForm->addRow(tr("Daily goal (problems)"), m_dailyGoal);
    root->addWidget(group(tr("Training"), trainingForm));

    // --- Shortcuts reference (read-only card, docs settings.md #5) ---
    auto *keysLabel = new QLabel(
        tr("Ctrl+O Open · Ctrl+S Save · Ctrl+R Run"));
    keysLabel->setObjectName("shortcutRef");
    root->addWidget(keysLabel);
    root->addStretch();
}

void OlerSettingsPage::onThemeChanged(const QString &theme) {
    OlerSettings *st = OlerSettings::instance();
    CThemeManager::instance()->applyTheme(theme);
    st->setValue("theme", theme);
    st->save();
}

void OlerSettingsPage::detectCompiler() {
    // Probe the configured path first, then common toolchain locations.
    QStringList candidates = {m_gxxPath->text(),
                              QStringLiteral("C:/Qt/Tools/mingw1310_64/bin/g++.exe"),
                              QStringLiteral("C:/MinGW/bin/g++.exe"),
                              QStringLiteral("C:/TDM-GCC-64/bin/g++.exe")};
    for (const QString &c : candidates) {
        if (!c.isEmpty() && QFile::exists(c)) {
            m_gxxPath->setText(c);
            OlerSettings *st = OlerSettings::instance();
            st->setValue("compiler/gxxPath", c);
            st->save();
            return;
        }
    }
    m_gxxPath->setText(m_gxxPath->text()); // keep; user must fix manually
}
