#pragma once
#include <QColor>
#include <QIcon>
#include <QString>

// Feather-style inline SVG icons rendered to QIcon via QSvgRenderer.
// All paths are lifted verbatim from the v0 HTML prototypes.
namespace OlerIcons {

enum class Name {
    Code,        // editor
    CheckSquare, // problems
    Target,      // training
    Book,        // mistakes
    Message,     // ai coach
    Settings,    // settings gear
    Search,
    Plus,
    Download,
    Upload,
    Refresh,
    Play,
    Keyboard,
    Info,
    Folder,
    Chevron,
    Zap,         // brand bolt
    Logo,        // Aether mark: halo ring + star + flares (brand v1)
    Minimize,
    Maximize,
    Restore,
    Close,
};

// Renders the named icon in the given stroke color at size px (2x DPR).
QIcon make(Name name, const QColor &stroke, int size = 20);

} // namespace OlerIcons
