const fs = require('fs');
let c = fs.readFileSync('frontend/src/services/tauriApi.ts', 'utf8');
c = c.replace(/Promise<\{ success: boolean; stderr: string \}>/, 'Promise<any[]>');
fs.writeFileSync('frontend/src/services/tauriApi.ts', c, 'utf8');
