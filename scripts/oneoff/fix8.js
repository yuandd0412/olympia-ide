const fs = require('fs');
let c = fs.readFileSync('frontend/src/stores/useAppStore.ts', 'utf8');
c = c.replace(/\} else if \(res.overallVerdict !== 'CE'\) \{/, '}');
fs.writeFileSync('frontend/src/stores/useAppStore.ts', c, 'utf8');
