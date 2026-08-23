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
         {tr("外观"), tr("编译器"), tr("运行预算"), tr("训练"),
          tr("快捷键"), tr("关于")})
        m_sections->addItem(s);

    m_panes = new QStackedWidget(this);
    m_panes->addWidget(buildAppearancePane());
    m_panes->addWidget(buildCompilerPane());
    m_panes->addWidget(buildBudgetsPane());
    m_panes->addWidget(buildTrainingPane());

    auto *shortcutsPane = new QLabel(
        tr("<b>键盘</b><br>"
           "Ctrl+O&nbsp;&nbsp;&nbsp;打开<br>"
           "Ctrl+S&nbsp;&nbsp;&nbsp;保存<br>"
           "Ctrl+R&nbsp;&nbsp;&nbsp;编译运行"));
    shortcutsPane->setObjectName("shortcutRef");
    shortcutsPane->setAlignment(Qt::AlignTop | Qt::AlignLeft);
    m_panes->addWidget(shortcutsPane);

    auto *aboutPane = new QLabel(
        QStringLiteral(
            "<div style='font-size:20px;font-weight:600;'>Aether"
            "</div>"
            "<div style='color:#6e6d68;font-style:italic;margin:4px 0 12px;'>"
            "Code in the void. Light in the Aether.</div>"
            "<p style='line-height:1.7'>"
            "Aether（/ˈiːθər/）源自古希腊语 Αἰθήρ —— "
            "地、水、火、风之外的第五元素，承载星光穿越黑暗的介质。"
            "</p>"
            "<p style='line-height:1.7'>"
            "它不是你手中的工具，而是代码运行的通路 —— "
            "像以太承载星光一样，承载你的思路从模糊意象精确抵达评测机的 verdict。"
            "在 Aether 中，你面对的只有问题、算法和你自己。"
            "</p>"
            "<hr style='border:none;border-top:1px solid rgba(255,255,255,0.06);"
            "margin:10px 0'>"
            "<b>版本</b> v0.1.0<br>"
            "<b>基于</b> Qt 6.8 · KSyntaxHighlighting 6.8<br>"
            "<b>许可</b> MIT License"),
        this);
    aboutPane->setObjectName("aboutPane");
    aboutPane->setAlignment(Qt::AlignTop | Qt::AlignLeft);
    m_panes->addWidget(aboutPane);

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

    form->addRow(tr("主题（点击应用）"), grid);
    form->addRow(tr("编辑器字号"), m_fontSize);
    return group(tr("外观"), form);
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
    auto *detectBtn = new QPushButton(tr("检测"), this);
    connect(detectBtn, &QPushButton::clicked,
            this, &OlerSettingsPage::detectCompiler);
    pathRow->addWidget(m_gxxPath, /*stretch*/ 1);
    pathRow->addWidget(detectBtn);
    form->addRow(tr("g++ 路径"), pathRow);

    m_optLevel = new QComboBox;
    m_optLevel->addItems({"-O0", "-O1", "-O2", "-O3"});
    m_optLevel->setCurrentText(OlerSettings::instance()->value(
                                   QStringLiteral("compiler/optLevel")).toString());
    connect(m_optLevel, &QComboBox::currentTextChanged, this, [](const QString &v) {
        auto *st = OlerSettings::instance();
        st->setValue(QStringLiteral("compiler/optLevel"), v);
        st->save();
    });
    form->addRow(tr("优化等级"), m_optLevel);

    m_stdFlag = new QComboBox;
    m_stdFlag->addItems({"-std=c++14", "-std=c++17", "-std=c++20"});
    m_stdFlag->setCurrentText(OlerSettings::instance()->value(
                                  QStringLiteral("compiler/stdFlag")).toString());
    connect(m_stdFlag, &QComboBox::currentTextChanged, this, [](const QString &v) {
        auto *st = OlerSettings::instance();
        st->setValue(QStringLiteral("compiler/stdFlag"), v);
        st->save();
    });
    form->addRow(tr("语言标准"), m_stdFlag);
    return group(tr("编译器"), form);
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
    form->addRow(tr("时间限制"), m_timeMs);

    m_memoryMb = makeSpin(8, 4096, 8, QStringLiteral(" MB"));
    m_memoryMb->setValue(OlerSettings::instance()->value(
                             QStringLiteral("limits/memoryMb")).toInt());
    connect(m_memoryMb, &QSpinBox::valueChanged, this, [](int v) {
        auto *st = OlerSettings::instance();
        st->setValue(QStringLiteral("limits/memoryMb"), v);
        st->save();
    });
    form->addRow(tr("内存限制"), m_memoryMb);
    return group(tr("运行预算"), form);
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
    form->addRow(tr("每日目标（题）"), m_dailyGoal);
    return group(tr("训练"), form);
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
