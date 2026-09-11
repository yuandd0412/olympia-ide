const fs = require('fs');
let c = fs.readFileSync('frontend/src/stores/useAppStore.ts', 'utf8');
c = c.replace(/        \}\n    \} catch \(err: any\) \{/, '        }\n      }\n    } catch (err: any) {');
fs.writeFileSync('frontend/src/stores/useAppStore.ts', c, 'utf8');
