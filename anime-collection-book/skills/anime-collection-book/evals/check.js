// 产物断言器（验收流程第 ④ 步）：在 npm run pipeline 之后执行
// 用法: npm run check（或 node evals/check.js）
// 纯 fs 实现，无第三方依赖、不启动子进程
const fs = require('fs');
const path = require('path');

const CFG = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scripts', 'config.json'), 'utf8')); } catch (e) { return {}; }
})();
const ROOT = CFG.root || 'C:\\anime-book';
const P = (...a) => path.join(ROOT, ...a);

let pass = 0, fail = 0;
function t(name, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (detail ? ' —— ' + detail : '')); }
}

console.log('产物检查：项目根 = ' + ROOT + '\n');

// ① base.json
let base = null;
try { base = JSON.parse(fs.readFileSync(P('anime_base.json'), 'utf8')); t('anime_base.json 可解析', true); }
catch (e) { t('anime_base.json 可解析', false, e.message); }
const n = base ? Object.keys(base).length : 0;
t('收录至少 1 部', n >= 1, '当前 ' + n + ' 部');

// ② 每部都有 research JSON
if (base) {
  const miss = Object.values(base).filter(r => !fs.existsSync(P('anime_research', r.folder + '.json'))).map(r => r.folder);
  t('每部都有 research JSON', miss.length === 0, miss.join('、'));
}

// ③ HTML
const htmlPath = P('anime_build', '番剧收藏简介.html');
let html = '';
try { html = fs.readFileSync(htmlPath, 'utf8'); t('HTML 已生成', true); }
catch (e) { t('HTML 已生成', false, e.message); }
t('HTML 无乱码替换符（U+FFFD）', html.indexOf('\uFFFD') < 0, '存在方块字，检查字体子集是否漏跑');
t('HTML 含章节结构', html.includes('class="show"'));

// ③.5 封面渲染（声明了封面且文件存在的部，HTML 里必须有对应 <img>——防"漏写 cover 字段/路径错/复制失败"）
if (base) {
  let covDeclared = 0;
  const missCov = [];
  for (const rec of Object.values(base)) {
    let r = null;
    try { r = JSON.parse(fs.readFileSync(P('anime_research', rec.folder + '.json'), 'utf8')); } catch (e) { continue; }
    if (!r.cover) { missCov.push(rec.folder + '(未声明)'); continue; }
    if (!fs.existsSync(P('anime_research', r.cover))) { missCov.push(rec.folder + '(文件不存在)'); continue; }
    covDeclared++;
  }
  const imgCount = (html.match(/<img /g) || []).length;
  t('封面图已渲染（img 数 ≥ 有效声明数）', imgCount >= covDeclared, 'img=' + imgCount + ' 有效声明=' + covDeclared + (missCov.length ? '；异常：' + missCov.join('、') : ''));
}

// ③.6 统计数字：不应出现首尾相同的年份区间（如 "2015-2015"）
const dupSpan = html.match(/\b(\d{4})-\1\b/);
t('无首尾相同的年份区间（如 2015-2015）', !dupSpan, dupSpan ? '命中：' + dupSpan[0] : '');

// ④ PDF
const pdfPath = P('anime_build', '番剧收藏简介.pdf');
let pdfSize = 0;
try { pdfSize = fs.statSync(pdfPath).size; } catch (e) { /* 不存在 */ }
t('PDF 已生成且大于 50KB', pdfSize > 51200, pdfSize ? pdfSize + 'B' : '不存在');

// ⑤ 页码映射全命中
try {
  const map = JSON.parse(fs.readFileSync(P('anime_build', '_pagemap.json'), 'utf8'));
  t('页码映射条目数 = 收录部数', Object.keys(map).length === n, Object.keys(map).length + ' / ' + n);
} catch (e) { t('页码映射存在且可解析', false, e.message); }

// ⑥ 目录页码 = 最终书签页码（两轮渲染稳定性的机器断言；目录印的是第 1 轮的页码，_pagemap.json 是第 2 轮实测）
try {
  const map = JSON.parse(fs.readFileSync(P('anime_build', '_pagemap.json'), 'utf8'));
  const unesc = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const rows = [...html.matchAll(/<a href="#show\d+">([^<]+)<\/a>[\s\S]*?<span class="pg">([^<]*)<\/span><\/li>/g)];
  const bad = [];
  for (const [, tHtml, pg] of rows) {
    const key = unesc(tHtml);
    const want = map[key] != null ? String(map[key]).padStart(3, '0') : '·';
    if (pg !== want) bad.push(key + '：目录 ' + pg + ' vs 实际 ' + want);
  }
  t('目录页码与最终书签一致', rows.length > 0 && bad.length === 0,
    rows.length === 0 ? '未从 HTML 解析到目录行（HTML 结构变了？）' : bad.slice(0, 3).join('；'));
} catch (e) { /* pagemap 缺失时 ⑤ 已报错，不重复计失败 */ }

console.log('\n结果：' + pass + ' 通过，' + fail + ' 失败' + (fail ? '（回到 SKILL.md 的坑位清单排查）' : ''));
process.exit(fail ? 1 : 0);
