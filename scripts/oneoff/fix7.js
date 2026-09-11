const fs = require('fs');
let c = fs.readFileSync('frontend/src/App.tsx', 'utf8');
c = c.replace(/import \{ PanelGroup, Panel, PanelResizeHandle \} from 'react-resizable-panels';/, "import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';");
fs.writeFileSync('frontend/src/App.tsx', c, 'utf8');
