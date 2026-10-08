// EPUB 导出包装：定位 Python 后跑 export_epub.py
// 用法: npm run epub [-- --no-font] [-- --out <文件>]
// 与 collect_fonts.js 共用同一套跨平台 python 探测（macOS/Linux 多为 python3，Windows 多为 python）
'use strict';
const { execFileSync, spawnSync } = require('child_process');
const path = require('path');

function pickPython() {
  for (const cmd of ['python3', 'python']) {
    try { execFileSync(cmd, ['-c', 'import sys'], { stdio: 'ignore' }); return cmd; } catch (e) { /* 试下一个 */ }
  }
  return '';
}

const PY = pickPython();
if (!PY) {
  console.error('未找到 python3/python —— EPUB 导出需要 Python 3（字体子集另需 fonttools：pip install fonttools brotli）');
  console.error('也可先用 -- --no-font 跳过字体内嵌，但 Python 仍是必需的。');
  process.exit(1);
}

const args = [path.join(__dirname, 'export_epub.py')].concat(process.argv.slice(2));
const r = spawnSync(PY, args, { stdio: 'inherit' });
process.exit(r.status === null ? 1 : r.status);
