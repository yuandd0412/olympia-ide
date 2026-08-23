#include "OlerIcons.h"
#include <QPixmap>
#include <QSvgRenderer>
#include <QPainter>

namespace OlerIcons {
namespace {

QString body(Name name) {
    switch (name) {
    case Name::Code:
        return QStringLiteral(
            "<polyline points='16 18 22 12 16 6'/>"
            "<polyline points='8 6 2 12 8 18'/>");
    case Name::CheckSquare:
        return QStringLiteral(
            "<path d='M9 11l3 3L22 4'/>"
            "<path d='M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'/>");
    case Name::Target:
        return QStringLiteral(
            "<circle cx='12' cy='12' r='10'/>"
            "<circle cx='12' cy='12' r='6'/>"
            "<circle cx='12' cy='12' r='2'/>");
    case Name::Book:
        return QStringLiteral(
            "<path d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20'/>"
            "<path d='M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'/>");
    case Name::Message:
        return QStringLiteral(
            "<path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/>");
    case Name::Settings:
        return QStringLiteral(
            "<circle cx='12' cy='12' r='3'/>"
            "<path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83"
            "l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0"
            "v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1"
            "-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 "
            "0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 "
            "0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 "
            "0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 "
            "0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 "
            "0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'/>");
    case Name::Search:
        return QStringLiteral(
            "<circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>");
    case Name::Plus:
        return QStringLiteral(
            "<line x1='12' y1='5' x2='12' y2='19'/>"
            "<line x1='5' y1='12' x2='19' y2='12'/>");
    case Name::Download:
        return QStringLiteral(
            "<path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/>"
            "<polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/>");
    case Name::Upload:
        return QStringLiteral(
            "<path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/>"
            "<polyline points='17 8 12 3 7 8'/><line x1='12' y1='3' x2='12' y2='15'/>");
    case Name::Refresh:
        return QStringLiteral(
            "<polyline points='23 4 23 10 17 10'/>"
            "<path d='M20.49 15a9 9 0 1 1-2.12-9.36L23 10'/>");
    case Name::Play:
        return QStringLiteral("<polygon points='5 3 19 12 5 21 5 3'/>");
    case Name::Keyboard:
        return QStringLiteral(
            "<rect x='2' y='4' width='20' height='16' rx='2' ry='2'/>"
            "<line x1='6' y1='8' x2='6.01' y2='8'/><line x1='10' y1='8' x2='10.01' y2='8'/>"
            "<line x1='14' y1='8' x2='14.01' y2='8'/><line x1='18' y1='8' x2='18.01' y2='8'/>"
            "<line x1='6' y1='12' x2='6.01' y2='12'/><line x1='10' y1='12' x2='10.01' y2='12'/>"
            "<line x1='14' y1='12' x2='14.01' y2='12'/><line x1='18' y1='12' x2='18.01' y2='12'/>"
            "<line x1='8' y1='16' x2='16' y2='16'/>");
    case Name::Info:
        return QStringLiteral(
            "<circle cx='12' cy='12' r='10'/>"
            "<line x1='12' y1='16' x2='12' y2='12'/>"
            "<line x1='12' y1='8' x2='12.01' y2='8'/>");
    case Name::Folder:
        return QStringLiteral(
            "<path d='M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9"
            "a2 2 0 0 1 2 2z'/>");
    case Name::Chevron:
        return QStringLiteral("<polyline points='9 18 15 12 9 6'/>");
    case Name::Zap:
        return QStringLiteral(
            "<path d='M13 2L3 14h9l-1 8 10-12h-9l1-8z'/>");
    case Name::Minimize:
        return QStringLiteral("<line x1='5' y1='12' x2='19' y2='12'/>");
    case Name::Maximize:
        return QStringLiteral(
            "<rect x='5' y='5' width='14' height='14' rx='2'/>");
    case Name::Restore:
        return QStringLiteral(
            "<rect x='8' y='8' width='11' height='11' rx='2'/>"
            "<path d='M5 15V6a2 2 0 0 1 2-2h9'/>");
    case Name::Close:
        return QStringLiteral(
            "<line x1='6' y1='6' x2='18' y2='18'/>"
            "<line x1='18' y1='6' x2='6' y2='18'/>");
    }
    return {};
}

} // namespace

QIcon make(Name name, const QColor &stroke, int size) {
    QString svg;
    if (name == Name::Logo) {
        // Brand mark v1: halo ring + filled star core + four flares
        // (00-design-spec: "被光环包裹的暗星").
        svg = QStringLiteral(
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>"
            "<g fill='none' stroke='%1' stroke-width='1.5'"
            " stroke-linecap='round'>"
            "<circle cx='12' cy='12' r='8.5'/>"
            "<line x1='12' y1='1.2' x2='12' y2='3.8'/>"
            "<line x1='12' y1='20.2' x2='12' y2='22.8'/>"
            "<line x1='1.2' y1='12' x2='3.8' y2='12'/>"
            "<line x1='20.2' y1='12' x2='22.8' y2='12'/>"
            "</g>"
            "<circle cx='12' cy='12' r='3.4' fill='%1'/></svg>")
                  .arg(stroke.name(QColor::HexRgb));
    } else {
        svg = QStringLiteral(
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'"
            " stroke='%1' stroke-width='1.8' stroke-linecap='round'"
            " stroke-linejoin='round'>%2</svg>")
                .arg(stroke.name(QColor::HexRgb), body(name));
    }

    QPixmap pm(size * 2, size * 2); // 2x for crisp display
    pm.fill(Qt::transparent);
    QSvgRenderer renderer(svg.toUtf8());
    QPainter p(&pm);
    p.setRenderHint(QPainter::Antialiasing);
    renderer.render(&p);
    p.end();
    pm.setDevicePixelRatio(2.0);
    return QIcon(pm);
}

} // namespace OlerIcons
