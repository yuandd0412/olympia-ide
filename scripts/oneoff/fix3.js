const fs = require('fs');
let c = fs.readFileSync('frontend/src/services/tauriApi.ts', 'utf8');
c = c.replace(/async runTerminalCommand/, 'async writeTempCode(code: string, extension: string): Promise<{ srcPath: string, exePath: string }> {\n    return await invoke(\'write_temp_code\', { code, extension });\n  },\n\n  async checkSyntax(code: string, compilerPath: string, compilerFlags: string[]): Promise<{ success: boolean; stderr: string }> {\n    return await invoke(\'check_syntax\', { code, compilerPath, compilerFlags });\n  },\n\n  async runTerminalCommand');
fs.writeFileSync('frontend/src/services/tauriApi.ts', c, 'utf8');
