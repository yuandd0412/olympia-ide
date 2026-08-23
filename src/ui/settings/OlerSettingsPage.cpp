#include "OlerSettingsPage.h"
#include "core/settings/OlerSettings.h"
#include "core/theme/CThemeManager.h"
#include <QComboBox>
#include <QFile>
#include <QFormLayout>
#include <QFrame>
#include <QGridLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QLineEdit>
#include <QListWidget>
#include <QPushButton>
#include <QSpinBox>
#include <QStackedWidget>
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

// Theme -> (base bg, accent) for the 2x2 picker swatches.
struct ThemeSwatch {
    const char *name;
    const char *base;
    const char *accent;
};
const ThemeSwatch kThemes[] = {
    {"MistBlue",   "#131311", "#7daed4"},
    {"AmberDark",  "#131311", "#d97757"},
    {"OneDarkPro", "#282c34", "#61afef"},
    {"AmberLight", "#fafaf7", "#d97757"},
    {"OneLight",   "#fafafa", "#4078f2"},
};

} // namespace

OlerSettingsPage::OlerSettingsPage(QWidget *parent) : QWidget(parent) {
    auto *rootLayout = new QHBoxLayout(this);
    rootLayout->setContentsMargins(12, 12, 12, 12);
    rootLayout->setSpacing(16);

    m_sections = new QListWidget(this);
    m_sections->setFixedWidth(150);
    for (const QString &s :
         {tr("Appearance"), tr("Compiler"), tr("Budgets"), tr("Training"),
          tr("Shortcuts")})
        m_sections->addItem(s);

    m_panes = new QStackedWidget(this);
    m_panes->addWidget(buildAppearancePane());
    m_panes->addWidget(buildCompilerPane());
    m_panes->addWidget(buildBudgetsPane());
    m_panes->addWidget(buildTrainingPane());

    auto *shortcutsPane = new QLabel(
        tr("<b>Keyboard</b><br>"
           "Ctrl+O&nbsp;&nbsp;&nbsp;Open<br>"
           "Ctrl+S&nbsp;&nbsp;&nbsp;Save<br>"
           "Ctrl+R&nbsp;&nbsp;&nbsp;Run"));
    shortcutsPane->setObjectName("shortcutRef");
    shortcutsPane->setAlignment(Qt::AlignTop | Qt::AlignLeft);
    m_panes->addWidget(shortcutsPane);

    rootLayout->addWidget(m_sections);
    rootLayout->addWidget(m_panes, /*stretch*/ 1);

    connect(m_sections, &QListWidget::currentRowChanged,
            m_panes, &QStackedWidget::setCurrentIndex);
}

QWidget *OlerSettingsPage::group(const QString &title, QFormLayout *form) {
    auto *box = new QWidget;
    auto *layout = new QVBoxLayout(box);
    layout->setContentsMargins(0, 0, 0, 0);
    auto *header = new QLabel(title);
    header->setObjectName("settingsGroupHeader");
    layout->addWidget(header);
    layout->addLayout(form);
    layout->addStretch();
    return box;
}

QWidget *OlerSettingsPage::buildAppearancePane() {
    auto *form = new QFormLayout;

    // Theme picker: 2x2 swatches (00-design-spec section 4.5).
    auto *grid = new QGridLayout;
    grid->setSpacing(8);
    OlerSettings *st = OlerSettings::instance();
    const QString currentTheme = st->value(QStringLiteral("theme")).toString();
    int idx = 0;
    for (const auto &t : kThemes) {
        auto *btn = new QPushButton(QString::fromLatin1(t.name));
        btn->setFixedSize(140, 56);
        btn->setStyleSheet(
            QStringLiteral(
                "QPushButton { background-color: %1; color: %2;"
                " border: 1px solid rgba(128,128,128,0.4); border-radius: 6px;"
                " font-weight: bold; }")
                .arg(QString::fromLatin1(t.base),
                     QString::fromLatin1(t.name == currentTheme
                                             ? "#ffffff"
                                             : t.accent)));
        btn->setProperty("themeName", QString::fromLatin1(t.name));
        connect(btn, &QPushButton::clicked, this, [this](bool) {
            onThemeChanged(static_cast<QPushButton *>(sender())
                               ->property("themeName").toString());
        });
        grid->addWidget(btn, idx / 2, idx % 2);
        ++idx;
    }

    // Keep the swatch buttons self-contained; theme applies on click.
    m_fontSize = makeSpin(9, 28, 1, QStringLiteral(" px"));
    m_fontSize->setValue(st->value(QStringLiteral("editor/fontSize")).toInt());
    connect(m_fontSize, &QSpinBox::valueChanged, this,
            [st](int v) { st->setValue(QStringLiteral("editor/fontSize"), v); st->save(); });

    form->addRow(tr("Theme (click to apply)"), grid);
    form->addRow(tr("Editor font size"), m_fontSize);
    return group(tr("Appearance"), form);
}

QWidget *OlerSettingsPage::buildCompilerPane() {
    auto *form = new QFormLayout;
    auto *pathRow = new QHBoxLayout;
    m_gxxPath = new QLineEdit(OlerSettings::instance()->value(
                                  QStringLiteral("compiler/gxxPath")).toString());
    connect(m_gxxPath, &QLineEdit::editingFinished, this, [this] {
        auto *st = OlerSettings::instance();
        st->setValue(QStringLiteral("compiler/gxxPath"), m_gxxPath->text());
        st->save();
    });
    auto *detectBtn = new QPushButton(tr("Detect"), this);
    connect(detectBtn, &QPushButton::clicked,
            this, &OlerSettingsPage::detectCompiler);
    pathRow->addWidget(m_gxxPath, /*stretch*/ 1);
    pathRow->addWidget(detectBtn);
    form->addRow(tr("g++ path"), pathRow);

    m_optLevel = new QComboBox;
    m_optLevel->addItems({"-O0", "-O1", "-O2", "-O3"});
    m_optLevel->setCurrentText(OlerSettings::instance()->value(
                                   QStringLiteral("compiler/optLevel")).toString());
    connect(m_optLevel, &QComboBox::currentTextChanged, this, [](const QString &v) {
        auto *st = OlerSettings::instance();
        st->setValue(QStringLiteral("compiler/optLevel"), v);
        st->save();
    });
    form->addRow(tr("Optimization"), m_optLevel);

    m_stdFlag = new QComboBox;
    m_stdFlag->addItems({"-std=c++14", "-std=c++17", "-std=c++20"});
    m_stdFlag->setCurrentText(OlerSettings::instance()->value(
                                  QStringLiteral("compiler/stdFlag")).toString());
    connect(m_stdFlag, &QComboBox::currentTextChanged, this, [](const QString &v) {
        auto *st = OlerSettings::instance();
        st->setValue(QStringLiteral("compiler/stdFlag"), v);
        st->save();
    });
    form->addRow(tr("Standard"), m_stdFlag);
    return group(tr("Compiler"), form);
}

QWidget *OlerSettingsPage::buildBudgetsPane() {
    auto *form = new QFormLayout;
    m_timeMs = makeSpin(100, 30000, 100, QStringLiteral(" ms"));
    m_timeMs->setValue(OlerSettings::instance()->value(
                           QStringLiteral("limits/timeMs")).toInt());
    connect(m_timeMs, &QSpinBox::valueChanged, this, [](int v) {
        auto *st = OlerSettings::instance();
        st->setValue(QStringLiteral("limits/timeMs"), v);
        st->save();
    });
    form->addRow(tr("Time limit"), m_timeMs);

    m_memoryMb = makeSpin(8, 4096, 8, QStringLiteral(" MB"));
    m_memoryMb->setValue(OlerSettings::instance()->value(
                             QStringLiteral("limits/memoryMb")).toInt());
    connect(m_memoryMb, &QSpinBox::valueChanged, this, [](int v) {
        auto *st = OlerSettings::instance();
        st->setValue(QStringLiteral("limits/memoryMb"), v);
        st->save();
    });
    form->addRow(tr("Memory limit"), m_memoryMb);
    return group(tr("Test budgets"), form);
}

QWidget *OlerSettingsPage::buildTrainingPane() {
    auto *form = new QFormLayout;
    m_dailyGoal = makeSpin(1, 50, 1, QString());
    m_dailyGoal->setValue(OlerSettings::instance()->value(
                              QStringLiteral("training/dailyGoal")).toInt());
    connect(m_dailyGoal, &QSpinBox::valueChanged, this, [](int v) {
        auto *st = OlerSettings::instance();
        st->setValue(QStringLiteral("training/dailyGoal"), v);
        st->save();
    });
    form->addRow(tr("Daily goal (problems)"), m_dailyGoal);
    return group(tr("Training"), form);
}

void OlerSettingsPage::onThemeChanged(const QString &theme) {
    OlerSettings *st = OlerSettings::instance();
    CThemeManager::instance()->applyTheme(theme);
    st->setValue(QStringLiteral("theme"), theme);
    st->save();
}

void OlerSettingsPage::detectCompiler() {
    QStringList candidates = {
        m_gxxPath->text(),
        QStringLiteral("C:/Qt/Tools/mingw1310_64/bin/g++.exe"),
        QStringLiteral("C:/MinGW/bin/g++.exe"),
        QStringLiteral("C:/TDM-GCC-64/bin/g++.exe"),
    };
    for (const QString &c : candidates) {
        if (!c.isEmpty() && QFile::exists(c)) {
            m_gxxPath->setText(c);
            auto *st = OlerSettings::instance();
            st->setValue(QStringLiteral("compiler/gxxPath"), c);
            st->save();
            return;
        }
    }
}
