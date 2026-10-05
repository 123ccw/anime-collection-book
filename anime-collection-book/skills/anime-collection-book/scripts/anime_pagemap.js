// 从上一轮渲染的 PDF 书签反查每部起始页 → ROOT/anime_build/_pagemap.json
// 依赖：本目录先执行 `npm i pdfjs-dist`
// 用法: node anime_pagemap.js
const fs = require('fs');
const path = require('path');

// ---- 统一配置（同目录 config.json；缺失时回退默认值）----
const CFG = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')); } catch (e) { return {}; }
})();
const ROOT = CFG.root || 'C:\\anime-book';   // 项目根（★在 config.json 里改）
const PDF = path.join(ROOT, 'anime_build', '番剧收藏简介.pdf');

(async () => {
  // pdfjs-dist 的 .mjs 是 ESM；用动态 import 加载，兼容 Node >=20（require(ESM) 需 20.19+/22.12+）
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(PDF));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const outline = await doc.getOutline();
  if (!outline) { console.error('no outline'); process.exit(2); }

  // Chromium 生成的书签标题会吞掉部分空格 → 去空格比对
  const norm = s => String(s).replace(/\s+/g, '');
  // 标题来源 = base.json 的收录范围（册子里实际有的作品）；research 里多出的未收录稿子不算
  const RDIR = path.resolve(ROOT, 'anime_research');
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'anime_base.json'), 'utf8'));
  const titles = Object.values(base).map(rec => {
    const rp = path.resolve(RDIR, rec.folder + '.json');
    // 边界校验：目标必须落在 anime_research 目录内
    if (rp === RDIR || !rp.startsWith(RDIR + path.sep)) return rec.title || rec.folder;
    if (fs.existsSync(rp)) {
      try { const r = JSON.parse(fs.readFileSync(rp, 'utf8')); return r.title_zh || rec.title || rec.folder; } catch (e) { /* fallthrough */ }
    }
    return rec.title || rec.folder;
  }).filter(Boolean);

  async function pageOf(dest) {
    let d = dest;
    if (typeof d === 'object' && d !== null && !Array.isArray(d)) d = d.dest || d.url;
    if (!d) return null;
    const ref = Array.isArray(d) ? d[0] : null;
    if (ref && typeof ref === 'object' && ref.num != null) return (await doc.getPageIndex(ref)) + 1;
    if (typeof d === 'string') {
      const exp = await doc.getDestination(d);
      if (exp) return (await doc.getPageIndex(exp[0])) + 1;
    }
    return null;
  }

  const map = {};
  for (const item of outline) {
    const t = norm(item.title);
    const hit = titles.find(x => t.includes(norm(x)) || norm(x).includes(t));
    if (!hit) continue;
    const p = await pageOf(item.dest);
    if (p && (map[hit] == null || p < map[hit])) map[hit] = p;
  }
  const out = path.join(ROOT, 'anime_build', '_pagemap.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(map, null, 1));
  console.log('pagemap:', JSON.stringify(map));
  const missing = titles.filter(t => map[t] == null);
  if (missing.length) { console.log('未命中:', missing); process.exitCode = 3; }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
