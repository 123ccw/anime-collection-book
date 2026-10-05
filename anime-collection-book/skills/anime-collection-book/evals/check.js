// 产物断言器（验收流程第 ④ 步）：在 npm run pipeline 之后执行
// 用法: npm run check（或 node evals/check.js）
// 纯 fs 实现，无第三方依赖、不启动子进程
const fs = require('fs');
const path = require('path');

const CFG = (() => {
  const f = path.join(__dirname, '..', 'scripts', 'config.json');
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) {
    console.warn('⚠ 读不到 ' + f + '（' + (e.code || e.message) + '）——请复制 config.example.json 为 config.json 并改 root；本次回退默认值');
    return {};
  }
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

// ③.5 封面（声明了封面且文件存在的部，构建必须把它复制成 anime_build/covers/showNN.jpg 并渲染进 HTML）
if (base) {
  let covDeclared = 0;
  const bad = [];   // 会导致成品缺封面的问题，无条件报出来（不再只在断言失败时才可见）
  const recs = Object.values(base);
  for (const [i, rec] of recs.entries()) {
    const slug = 'show' + String(i + 1).padStart(2, '0');   // 与 build_anime_html.js 的 slug 规则一致
    let r = null;
    try { r = JSON.parse(fs.readFileSync(P('anime_research', rec.folder + '.json'), 'utf8')); }
    catch (e) { bad.push(rec.folder + '(research JSON 解析失败：' + e.message + ')'); continue; }
    if (!r.cover) { bad.push(rec.folder + '(未声明 cover)'); continue; }
    if (!fs.existsSync(P('anime_research', r.cover))) { bad.push(rec.folder + '(cover 文件不存在：' + r.cover + ')'); continue; }
    covDeclared++;
    // 构建端复制后的目标文件名固定为 .jpg（与源扩展名无关）
    if (!fs.existsSync(P('anime_build', 'covers', slug + '.jpg'))) bad.push(rec.folder + '(未复制到 anime_build/covers/' + slug + '.jpg)');
  }
  if (bad.length) console.log('    · 封面异常：' + bad.join('、'));
  const imgCount = (html.match(/<img /g) || []).length;
  t('封面图已渲染（无缺失 + img 数 ≥ 有效声明数）', bad.length === 0 && imgCount >= covDeclared,
    'img=' + imgCount + ' 有效声明=' + covDeclared + (bad.length ? '；' + bad.join('、') : ''));
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

// ⑦ 两轮页码一致（收敛性）：目录页码与 _pagemap.json 都来自第二轮，只比这两个是自证的——必须比上一轮
try {
  const cur = JSON.parse(fs.readFileSync(P('anime_build', '_pagemap.json'), 'utf8'));
  const prev = JSON.parse(fs.readFileSync(P('anime_build', '_pagemap.prev.json'), 'utf8'));
  const keys = [...new Set([...Object.keys(prev), ...Object.keys(cur)])].sort();
  const drift = keys.filter(k => prev[k] !== cur[k]).map(k => k + '：上轮 ' + prev[k] + ' → 本轮 ' + cur[k]);
  t('两轮页码一致（已收敛）', drift.length === 0, drift.slice(0, 3).join('；'));
} catch (e) {
  t('两轮页码一致（已收敛）', false, '缺少 _pagemap.prev.json —— 请用 `npm run pipeline` 跑满两轮再验收（单轮产物无法判断是否收敛）');
}

// ⑧ 封面封底页已生成
t('封面封底页已生成', html.includes('cover-pg') && html.includes('back-pg'));

console.log('\n结果：' + pass + ' 通过，' + fail + ' 失败' + (fail ? '（回到 SKILL.md 的坑位清单排查）' : ''));
process.exit(fail ? 1 : 0);
