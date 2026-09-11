const fs = require('fs');
let lines = fs.readFileSync('frontend/src/stores/useAppStore.ts', 'utf8').split('\n');
lines.splice(391, 15);
fs.writeFileSync('frontend/src/stores/useAppStore.ts', lines.join('\n'), 'utf8');
