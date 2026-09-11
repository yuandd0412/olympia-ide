const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/terminal/TerminalPanel.tsx', 'utf8');
c = c.replace(/tauriApi\.writeTempCode\(activeTab\.code\)\.then\(\(\[srcPath, exePath\]\) => \{/, 'tauriApi.writeTempCode(activeTab.code, \"cpp\").then(({ srcPath, exePath }) => {');
fs.writeFileSync('frontend/src/components/terminal/TerminalPanel.tsx', c, 'utf8');
