#include "OlerSettingsPage.h"
#include "core/settings/OlerSettings.h"
#include "core/theme/CThemeManager.h"
#include "ui/common/OlerIcons.h"
#include "ui/common/OlerTheme.h"
#include <QButtonGroup>
#include <QComboBox>
#include <QFile>
#include <QFont>
#include <QFrame>
#include <functional>
#include <QHBoxLayout>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QScrollArea>
#include <QSpinBox>
#include <QVBoxLayout>

namespace {

constexpr int kContentWidth = 660;

QSpinBox *makeSpin(int lo, int hi, int step) {
    auto *s = new QSpinBox;
    s->setRange(lo, hi);
    s->setSingleStep(step);
    s->setFixedWidth(140);
    s->setAlignment(Qt::AlignLeft);
    return s;
}

QWidget *inputWithSuffix(QLineEdit **out, const QString &value,
                         const QString &suffix, int maxW = 260) {
    auto *wrap = new QWidget;
    auto *lay = new QHBoxLayout(wrap);
    lay->setContentsMargins(0, 0, 0, 0);
    lay->setSpacing(8);
    auto *edit = new QLineEdit(value);
    edit->setFixedWidth(maxW);
    edit->setFont(QFont(QStringLiteral("Consolas"), 10));
    auto *suf = new QLabel(suffix);
    suf->setObjectName(QStringLiteral("fSuffix"));
    lay->addWidget(edit);
    lay->addWidget(suf);
    lay->addStretch();
    *out = edit;
    return wrap;
}

} // namespace

OlerSettingsPage::OlerSettingsPage(QWidget *parent) : QWidget(parent) {
    auto *rootLayout = new QVBoxLayout(this);
    rootLayout->setContentsMargins(0, 0, 0, 0);

    auto *scroll = new QScrollArea(this);
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);
    scroll->setWidget(buildPage());
    rootLayout->addWidget(scroll);
}

QWidget *OlerSettingsPage::buildPage() {
    OlerSettings *st = OlerSettings::instance();

    auto *host = new QWidget;
    auto *outer = new QVBoxLayout(host);
    outer->setContentsMargins(24, 20, 24, 20);
    outer->setSpacing(0);

    // Centered-left single column (max 660px), per prototype.
    auto *colHost = new QWidget;
    colHost->setMaximumWidth(kContentWidth);
    auto *col = new QVBoxLayout(colHost);
    col->setContentsMargins(0, 0, 0, 0);
    col->setSpacing(0);

    auto *headerTitle =
        new QLabel(QStringLiteral("<h1>设置</h1>"), colHost);
    headerTitle->setObjectName(QStringLiteral("settingsH1"));
    auto *headerSub = new QLabel(
        tr("配置编译器、运行参数、快捷键等选项"), colHost);
    headerSub->setObjectName(QStringLiteral("settingsSub"));
    col->addWidget(headerTitle);
    col->addWidget(headerSub);
    col->addSpacing(16);

    // ---- 外观 ----
    auto *themeRow = pillGroup(CThemeManager::instance()->availableThemes(),
                               st->value(QStringLiteral("theme")).toString(),
                               [](const QString &t) {
                                   CThemeManager::instance()->applyTheme(t);
                                   OlerSettings *s = OlerSettings::instance();
                                   s->setValue(QStringLiteral("theme"), t);
                                   s->save();
                               });
    auto *fontSpin = makeSpin(9, 28, 1);
    fontSpin->setValue(st->value(QStringLiteral("editor/fontSize")).toInt());
    connect(fontSpin, &QSpinBox::valueChanged, this, [st](int v) {
        st->setValue(QStringLiteral("editor/fontSize"), v);
        st->save();
    });
    col->addWidget(section(tr("外观"),
                           {formRow(tr("主题"), themeRow,
                                    tr("切换立即生效，四套主题均已适配")),
                            formRow(tr("编辑器字号"), fontSpin)}));

    // ---- 编译器 ----
    m_gxxPath = new QLineEdit(
        st->value(QStringLiteral("compiler/gxxPath")).toString());
    m_gxxPath->setFont(QFont(QStringLiteral("Consolas"), 10));
    connect(m_gxxPath, &QLineEdit::editingFinished, this, [this] {
        OlerSettings *s = OlerSettings::instance();
        s->setValue(QStringLiteral("compiler/gxxPath"), m_gxxPath->text());
        s->save();
    });
    auto *pathRow = new QWidget;
    auto *pathLay = new QHBoxLayout(pathRow);
    pathLay->setContentsMargins(0, 0, 0, 0);
    pathLay->setSpacing(8);
    pathLay->addWidget(m_gxxPath, /*stretch*/ 1);
    auto *detectBtn = new QPushButton(tr("检测编译器"));
    detectBtn->setProperty("psPrimary", true);
    connect(detectBtn, &QPushButton::clicked,
            this, &OlerSettingsPage::detectCompiler);
    pathLay->addWidget(detectBtn);

    auto *stdSel = new QComboBox;
    stdSel->addItems({QStringLiteral("C++14"), QStringLiteral("C++17"),
                      QStringLiteral("C++20")});
    stdSel->setCurrentText(
        st->value(QStringLiteral("compiler/stdFlag")).toString()
            .mid(5)); // strip "-std="
    stdSel->setFixedWidth(160);
    connect(stdSel, &QComboBox::currentTextChanged, this, [](const QString &v) {
        OlerSettings *s = OlerSettings::instance();
        s->setValue(QStringLiteral("compiler/stdFlag"),
                    QStringLiteral("-std=") + v);
        s->save();
    });

    const QStringList opts = {QStringLiteral("-O0"), QStringLiteral("-O2"),
                              QStringLiteral("-O3")};
    auto *optPills = pillGroup(
        opts, st->value(QStringLiteral("compiler/optLevel")).toString(),
        [](const QString &v) {
            OlerSettings *s = OlerSettings::instance();
            s->setValue(QStringLiteral("compiler/optLevel"), v);
            s->save();
        });

    col->addWidget(section(tr("编译器"),
                           {formRow(tr("编译器路径"), pathRow,
                                    tr("C++ 编译器可执行文件路径")),
                            formRow(tr("C++ 标准"), stdSel),
                            formRow(tr("优化等级"), optPills)}));

    // ---- 运行预算 ----
    auto *timeMs = makeSpin(100, 30000, 100);
    timeMs->setValue(st->value(QStringLiteral("limits/timeMs")).toInt());
    connect(timeMs, &QSpinBox::valueChanged, this, [st](int v) {
        st->setValue(QStringLiteral("limits/timeMs"), v);
        st->save();
    });
    auto *memMb = makeSpin(8, 4096, 8);
    memMb->setValue(st->value(QStringLiteral("limits/memoryMb")).toInt());
    connect(memMb, &QSpinBox::valueChanged, this, [st](int v) {
        st->setValue(QStringLiteral("limits/memoryMb"), v);
        st->save();
    });
    col->addWidget(section(tr("运行预算"),
                           {formRow(tr("时间限制"), timeMs,
                                    tr("单个测试点的最长运行时间（毫秒）")),
                            formRow(tr("内存限制"), memMb,
                                    tr("单个测试点的内存上限（MB）"))}));

    // ---- 训练 ----
    auto *goal = makeSpin(1, 50, 1);
    goal->setValue(st->value(QStringLiteral("training/dailyGoal")).toInt());
    connect(goal, &QSpinBox::valueChanged, this, [st](int v) {
        st->setValue(QStringLiteral("training/dailyGoal"), v);
        st->save();
    });
    col->addWidget(section(tr("训练"),
                           {formRow(tr("每日目标（题）"), goal)}));

    // ---- 快捷键 ----
    auto makeKbd = [](const QString &desc, const QStringList &keys) {
        auto *row = new QWidget;
        auto *lay = new QHBoxLayout(row);
        lay->setContentsMargins(0, 0, 0, 0);
        auto *d = new QLabel(desc, row);
        d->setObjectName(QStringLiteral("fHint"));
        lay->addWidget(d);
        lay->addStretch();
        for (int i = 0; i < keys.size(); ++i) {
            if (i > 0) {
                auto *plus = new QLabel(QStringLiteral("+"), row);
                plus->setObjectName(QStringLiteral("fHint"));
                lay->addWidget(plus);
            }
            auto *k = new QLabel(keys.at(i), row);
            k->setObjectName(QStringLiteral("kbdKey"));
            lay->addWidget(k);
        }
        return row;
    };
    col->addWidget(section(
        tr("快捷键"),
        {makeKbd(tr("打开搜索"), {QStringLiteral("Ctrl"), QStringLiteral("K")}),
         makeKbd(tr("保存文件"), {QStringLiteral("Ctrl"), QStringLiteral("S")}),
         makeKbd(tr("编译运行"), {QStringLiteral("Ctrl"), QStringLiteral("R")}),
         makeKbd(tr("切换页面"),
                 {QStringLiteral("Ctrl"), QStringLiteral("1 ~ 6")})}));

    // ---- 关于 ----
    auto *aboutBody = new QWidget;
    auto *aboutLay = new QHBoxLayout(aboutBody);
    aboutLay->setContentsMargins(0, 4, 0, 4);
    aboutLay->setSpacing(18);
    auto *mark = new QLabel(aboutBody);
    mark->setPixmap(OlerIcons::make(
        OlerIcons::Name::Logo,
        OlerTheme::accentForTheme(CThemeManager::instance()->currentTheme()),
        56).pixmap(56, 56));
    mark->setFixedSize(56, 56);
    aboutLay->addWidget(mark, /*stretch*/ 0, Qt::AlignTop);

    auto *info = new QLabel(
        QStringLiteral(
            "<div style='font-size:16px;font-weight:600;'>Aether</div>"
            "<div style='color:#6e6d68;font-style:italic;margin:2px 0 10px;'>"
            "Code in the void. Light in the Aether.</div>"
            "<div style='line-height:1.7'>"
            "源自古希腊语 Αἰθήρ —— 地、水、火、风之外的第五元素，"
            "承载星光穿越黑暗的介质。它不是工具，而是代码运行的通路："
            "承载你的思路从模糊意象，精确抵达评测机的 verdict。"
            "</div><br>"
            "<span style='color:#6e6d68'>版本</span> "
            "<b>v0.1.0</b>&nbsp;&nbsp;"
            "<span style='color:#6e6d68'>基于</span> Qt 6.8 · "
            "KSyntaxHighlighting&nbsp;&nbsp;"
            "<span style='color:#6e6d68'>许可</span> MIT"),
        aboutBody);
    info->setTextFormat(Qt::RichText);
    info->setWordWrap(true);
    aboutLay->addWidget(info, /*stretch*/ 1);
    col->addWidget(section(tr("关于"), {aboutBody}));

    col->addStretch();
    outer->addWidget(colHost);
    return host;
}

QWidget *OlerSettingsPage::section(const QString &titleText,
                                   const QList<QWidget *> &rows) {
    auto *box = new QWidget;
    auto *lay = new QVBoxLayout(box);
    lay->setContentsMargins(0, 18, 0, 18);
    lay->setSpacing(14);

    auto *title = new QLabel(titleText, box);
    title->setObjectName(QStringLiteral("sectionTitleLabel"));
    lay->addWidget(title);

    for (QWidget *r : rows)
        if (r) lay->addWidget(r);

    auto *divider = new QFrame(box);
    divider->setFrameShape(QFrame::HLine);
    divider->setObjectName(QStringLiteral("divider"));
    lay->addWidget(divider);
    return box;
}

QWidget *OlerSettingsPage::formRow(const QString &label, QWidget *control,
                                   const QString &hint) {
    auto *row = new QWidget;
    auto *lay = new QHBoxLayout(row);
    lay->setContentsMargins(0, 0, 0, 0);
    lay->setSpacing(16);

    auto *l = new QLabel(label, row);
    l->setObjectName(QStringLiteral("fLabel"));
    l->setFixedWidth(140);
    l->setAlignment(Qt::AlignRight | Qt::AlignVCenter);
    lay->addWidget(l);

    auto *right = new QWidget(row);
    auto *rl = new QVBoxLayout(right);
    rl->setContentsMargins(0, 0, 0, 0);
    rl->setSpacing(4);
    rl->addWidget(control);
    if (!hint.isEmpty()) {
        auto *h = new QLabel(hint, right);
        h->setObjectName(QStringLiteral("fHint"));
        rl->addWidget(h);
    }
    lay->addWidget(right, /*stretch*/ 1);
    return row;
}

QWidget *OlerSettingsPage::pillGroup(
    const QStringList &items, const QString &checked,
    const std::function<void(const QString &)> &onPick) {
    auto *wrap = new QWidget;
    auto *lay = new QHBoxLayout(wrap);
    lay->setContentsMargins(0, 0, 0, 0);
    lay->setSpacing(8);
    auto *group = new QButtonGroup(wrap);
    group->setExclusive(true);
    for (const QString &it : items) {
        auto *b = new QPushButton(it, wrap);
        b->setProperty("pill", true);
        b->setCheckable(true);
        b->setChecked(it == checked);
        group->addButton(b);
        connect(b, &QPushButton::clicked, wrap,
                [onPick, it] { onPick(it); });
        lay->addWidget(b);
    }
    lay->addStretch();
    return wrap;
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
            OlerSettings *st = OlerSettings::instance();
            st->setValue(QStringLiteral("compiler/gxxPath"), c);
            st->save();
            return;
        }
    }
}
