const fs = require('fs');

let c = fs.readFileSync('frontend/src/components/runner/RunnerPanel.tsx', 'utf8');
let lines = c.split('\n');
lines[307] = "              {runResult?.compilerOutput || '暂无编译日志。点击上方「运行」开始编译。'}";
fs.writeFileSync('frontend/src/components/runner/RunnerPanel.tsx', lines.join('\n'), 'utf8');

let c2 = fs.readFileSync('frontend/src/components/stress/StressTesterPage.tsx', 'utf8');
let lines2 = c2.split('\n');
lines2[98] = "                <span>开始对拍</span>";
lines2[156] = "              {activeCodeTab === 'sol' && '优化解法 / 待验证代码'}";
lines2[237] = "                    <span>编译错误: 对拍前编译失败</span>";
lines2[242] = "                    <span>对拍全部通过！已完成 {stressResult.totalRounds} / {stressResult.totalRounds} 组随机数据比对，未发现反例</span>";
fs.writeFileSync('frontend/src/components/stress/StressTesterPage.tsx', lines2.join('\n'), 'utf8');
