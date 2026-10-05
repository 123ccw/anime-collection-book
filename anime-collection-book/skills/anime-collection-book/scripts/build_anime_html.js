// 番剧收藏册构建：anime_base.json + anime_research/*.json → 排版 HTML（每部主题色杂志风）
// ★ 首次使用：改同目录 config.json 的 root（项目根 = 放 anime_base.json / anime_research / fonts 的文件夹）
// 用法: node build_anime_html.js
// 输入: ROOT/anime_base.json + ROOT/anime_research/*.json + ROOT/fonts/wk-sub-*.woff2（由 collect_fonts.js 生成）
// 输出: ROOT/anime_build/番剧收藏简介.html（含 covers/ 封面副本）
const fs = require('fs');
const path = require('path');

// ---- 统一配置（同目录 config.json；缺失时回退默认值）----
const CFG = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')); } catch (e) { return {}; }
})();
const ROOT = CFG.root || 'C:\\anime-book';   // 项目根
const VROOT = CFG.vroot || '';               // 模式 B（本机视频库）才填；模式 A 留空
const BASE_FILE = path.join(ROOT, 'anime_base.json');
if (!fs.existsSync(BASE_FILE)) {
  console.error('未找到 ' + BASE_FILE + ' ——模式 A 请先跑 npm run base；或检查 config.json 的 root 是否指向项目根'); process.exit(1);
}
const base = JSON.parse(fs.readFileSync(BASE_FILE, 'utf8'));

// 数据归一化：调研 JSON 是 LLM 产出的不可信输入，eps/airdate 可能是字符串——
// 字符串 eps 会让求和变拼接（"012"），字符串时间戳会让 new Date 解析成 Invalid Date 直接抛错
const toMs = v => { if (v == null || v === '') return null; const n = Number(v); if (Number.isFinite(n) && n > 0) return n; const p = Date.parse(v); return Number.isFinite(p) ? p : null; };
for (const s of Object.values(base)) {
  s.airdate = toMs(s.airdate);
  s.units = (s.units || []).map(u => ({ ...u, eps: Number(u.eps) || 0, airdate: toMs(u.airdate) }));
}

// 目录页码：_pagemap.json 由 anime_pagemap.js 从上一轮渲染的 PDF 书签导出；两轮构建布局一致
let PAGE_MAP = {};
const pagemapFile = path.join(ROOT, 'anime_build', '_pagemap.json');
if (fs.existsSync(pagemapFile)) {
  try { PAGE_MAP = JSON.parse(fs.readFileSync(pagemapFile, 'utf8')); } catch (e) { console.error('bad pagemap:', e.message); }
}
const pgOf = t => (PAGE_MAP[t] != null ? String(PAGE_MAP[t]).padStart(3, '0') : '·');

// 调研成果合并
const research = {};
const rdir = path.join(ROOT, 'anime_research');
if (fs.existsSync(rdir)) {
  for (const f of fs.readdirSync(rdir).filter(f => f.endsWith('.json'))) {
    try {
      const r = JSON.parse(fs.readFileSync(path.join(rdir, f), 'utf8'));
      research[r.folder] = r;
    } catch (e) { console.error('bad research json:', f, e.message); }
  }
}

// ---- 每部主题色（示例条目，改成你自己的作品名→色值；建议从该作官方主视觉里取色，和封面同调；不在表里的作品用 DEFAULT_ACCENT） ----
const ACCENTS = {
  '葬送的芙莉莲': '#6d28d9',
  '孤独摇滚！': '#e0407e',
  '夏日重现': '#0e7490',
  '一拳超人': '#eab308',
};
const DEFAULT_ACCENT = '#4f46e5';

// ---- 文楷子集 data URI（collect_fonts.js 生成） ----
const FONT_R = path.join(ROOT, 'fonts', 'wk-sub-regular.woff2');
if (!fs.existsSync(FONT_R)) {
  console.error('未找到 ' + FONT_R + ' ——请先跑字体子集（npm run pipeline，或单独 node collect_fonts.js）'); process.exit(1);
}
const WK_REG = fs.readFileSync(FONT_R).toString('base64');
const WK_MED = fs.readFileSync(path.join(ROOT, 'fonts', 'wk-sub-medium.woff2')).toString('base64');

// ---- 颜色工具 ----
function hexRgb(h) { const s = h.replace('#', ''); return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; }
function rgba(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
function shade(h, f) { const [r, g, b] = hexRgb(h); return `#${[r, g, b].map(v => Math.round(v * f).toString(16).padStart(2, '0')).join('')}`; }
function varsFor(ac) {
  return `--ac:${ac};--ac-dark:${shade(ac, .72)};--ac-ink:${shade(ac, .5)};--ac-tint:${rgba(ac, .07)};` +
    `--ac-tint2:${rgba(ac, .13)};--ac-faint:${rgba(ac, .22)};`;
}
// 转义覆盖元素内容与双引号属性位（title 等字段将来挪进属性也不会破）
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// production 文本 → { staff:[[键,值]], cast:[[角色,CV]] }（失败时返回 null，调用处降级原文本渲染）
function splitProduction(s) {
  let t = String(s).replace(/[（(]来源[:：][^)）]*[)）]/g, '').trim();
  let castPart = '';
  const m = t.match(/[。；;]?\s*(?:主要|主役)?声优[:：]([\s\S]+)$/);
  if (m) { castPart = m[1].trim(); t = t.slice(0, m.index); }
  const staff = t.split(/[；;]/).map(x => x.trim().replace(/[。.]$/, '')).filter(Boolean).map(seg => {
    const i = seg.search(/[:：]/);
    if (i < 0) return ['', seg];
    const v = seg.slice(i + 1).trim();
    if (!v) return ['', seg];
    return [seg.slice(0, i).trim(), v];
  });
  const cast = castPart.split(/[、,]/).map(x => x.trim()).filter(Boolean).map(x => {
    let mm = x.match(/^(.+?)[·・](.+)$/);
    if (mm) return [mm[1].trim(), mm[2].trim()];
    mm = x.match(/^(.+?)[（(](.+?)[)）]$/);
    if (mm) return [mm[1].trim(), mm[2].trim()];
    return ['', x];
  });
  if (!staff.length && !cast.length) return null;
  return { staff, cast };
}
function stClass(s) {
  // 「已完结 / 完结 / 完结篇」= 灰；但「未完结」不算（负向后顾排除）
  if (/(?<!未)完结/.test(s)) return 'std-done';
  if (/放送中/.test(s)) return 'std-air';
  return 'std-soon';
}

const fmtDate = ts => ts ? new Date(ts).toISOString().slice(0, 10).replace(/-/g, '.') : '';
const totalEps = r => (r.units || []).reduce((s, u) => s + (u.eps || 0), 0);
const unitCount = r => (r.units || []).filter(u => (u.eps || 0) > 0).length;
// 当前年月（UTC 口径，与 fmtDate 一致）——总览刊头 + 各章刊头共用，避免年份写死
const NOW = (() => { const d = new Date(); return d.getUTCFullYear() + '.' + String(d.getUTCMonth() + 1).padStart(2, '0'); })();

// ---- 封面副本：research.cover（官方海报覆盖）优先，否则取视频库内封面（模式 B） ----
const OUT = path.join(ROOT, 'anime_build');
fs.mkdirSync(OUT, { recursive: true });
const coverDir = path.join(OUT, 'covers');
fs.mkdirSync(coverDir, { recursive: true });
function localCoverSrc(rec, slug) {
  if (!VROOT || !rec.cover) return '';
  const src = path.join(VROOT, rec.folder, rec.cover);
  const dst = path.join(coverDir, slug + '.jpg');
  try { fs.copyFileSync(src, dst); return 'covers/' + slug + '.jpg'; }
  catch (e) { console.error('cover copy fail:', rec.folder, e.message); return ''; }
}

// ---- CSS ----
const CSS = `
  @font-face { font-family: "LXGW WenKai"; src: url(data:font/woff2;base64,${WK_REG}) format('woff2'); font-weight: 400; }
  @font-face { font-family: "LXGW WenKai"; src: url(data:font/woff2;base64,${WK_MED}) format('woff2'); font-weight: 500 900; }
  @page { size: A4; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
  body { font-family: "LXGW WenKai", "Noto Sans SC", "Microsoft YaHei", sans-serif; color: #26262b;
         font-size: 11pt; line-height: 1.78; line-break: strict; word-break: normal; overflow-wrap: break-word; }
  .page { width: 210mm; padding: 14mm 15mm 16mm; }

  /* ===== 首页总览 ===== */
  .thd .kick { font-size: 9pt; font-weight: 500; letter-spacing: .32em; color: #4f46e5; margin-bottom: 3mm; }
  .thd h1 { font-family: "LXGW WenKai"; font-weight: 700; font-size: 31pt; margin: 0 0 3.5mm; color: #141419; }
  .thd .sub { color: #6b6b76; font-size: 10.5pt; }
  .thd { border-bottom: 1.6px solid #4f46e5; padding-bottom: 6mm; margin-bottom: 8mm; }
  .stats { display: flex; gap: 5mm; margin: 0 0 8mm; }
  .stats .st { flex: 1; background: #f4f4f8; border-radius: 2.5mm; padding: 3.5mm 5mm; text-align: center; }
  .stats .st b { display: block; font-family: "LXGW WenKai"; font-weight: 700; font-size: 17pt; color: #4f46e5; }
  .stats .st span { font-size: 8.5pt; color: #6b6b76; letter-spacing: .08em; }
  .toc h2 { font-family: "LXGW WenKai"; font-weight: 700; font-size: 15pt; color: #141419; margin: 6mm 0 2.5mm;
            display: flex; align-items: baseline; gap: 3mm; }
  .toc h2 .cnt { margin-left: auto; font-size: 8.5pt; color: #6b6b76; background: #f1f1f4;
                 padding: .6mm 3mm; border-radius: 3mm; letter-spacing: .05em; }
  .toc ol { margin: 0; padding-left: 8mm; column-count: 2; column-gap: 10mm; }
  .toc li { margin: 1.5mm 0; break-inside: avoid; }
  .toc li::marker { color: #4f46e5; }
  .toc li .n-ep { color: #8b8b96; font-size: 9pt; }
  .toc li a { color: inherit; text-decoration: none; }
  .toc li .pg { display: inline-block; min-width: 9mm; text-align: right; color: #4f46e5;
                font-variant-numeric: tabular-nums; font-size: 9.5pt; }

  /* ===== 每部一章 ===== */
  .show { break-before: page; }
  /* 刊头条不能用负边距出血：Chromium 分页会把它画到上一页页尾（实测 bug），改页内圆角横幅 */
  .mast { background: var(--ac-dark); color: #fff; padding: 3.6mm 7mm; border-radius: 0 0 3mm 3mm;
          display: flex; justify-content: space-between; align-items: center; }
  .mast .m1 { font-size: 10pt; font-weight: 500; letter-spacing: .2em; }
  .mast .m2 { font-size: 8pt; opacity: .82; letter-spacing: .18em; }
  .heroline { display: flex; gap: 7mm; margin-top: 7mm; position: relative; }
  .heroline::before { content: ''; position: absolute; left: -4mm; top: -6mm; width: 34mm; height: 34mm;
      border-radius: 50%; background: radial-gradient(closest-side, var(--ac-tint2), rgba(255,255,255,0) 74%);
      z-index: 0; }
  .art { flex: 0 0 60mm; position: relative; text-align: center; }
  .art img { max-width: 60mm; max-height: 86mm; border-radius: 3mm;
             box-shadow: 0 10px 26px rgba(24,24,32,.22); display: inline-block; }
  .head { flex: 1; padding-top: 2mm; position: relative; }
  .head .t1 { font-family: "LXGW WenKai"; font-weight: 700; font-size: 19.5pt; color: #141419;
              line-height: 1.35; margin: 0; }
  .head .t2 { font-size: 10.5pt; color: var(--ac-ink); margin-top: 1.8mm; }
  .chips { margin-top: 3.5mm; }
  .chips span { display: inline-block; font-size: 8.5pt; color: var(--ac-dark); background: var(--ac-tint);
                border: 1px solid var(--ac-faint); border-radius: 3mm; padding: .5mm 3mm; margin: 0 1.5mm 1.5mm 0; }
  .score { margin-top: 2.5mm; font-size: 9.5pt; color: #55555f; }
  .score b { color: var(--ac-dark); font-weight: 500; }
  h2 { font-family: "LXGW WenKai"; font-weight: 700; font-size: 13.5pt; color: #141419; margin: 5.5mm 0 2.5mm;
       padding: 0 0 1.8mm 3.5mm; border-left: 1.6mm solid var(--ac); border-bottom: 1px solid var(--ac-faint);
       break-after: avoid; break-inside: avoid; }
  p { margin: 2mm 0; text-align: justify; orphans: 3; widows: 3; }
  .syn { text-align: justify; }
  .card { background: var(--ac-tint); border-left: 1.1mm solid var(--ac); border-radius: 0 2.5mm 2.5mm 0;
          padding: 2.4mm 4.5mm; margin: 2mm 0; }
  .card p { margin: 1.2mm 0; }
  table { width: 100%; border-collapse: collapse; margin: 2mm auto 3mm; font-size: 9pt;
          table-layout: fixed; font-variant-numeric: tabular-nums; break-inside: avoid; }
  thead { display: table-header-group; }
  th { background: var(--ac-dark); color: #fff; padding: 1.8mm 2.4mm; text-align: left; font-weight: 500;
       border: none; letter-spacing: .04em; }
  th + th { border-left: 1px solid rgba(255,255,255,.22); }
  td { border: none; border-bottom: 1px solid var(--ac-faint); padding: 1.5mm 2.4mm; vertical-align: top;
       text-align: justify; line-break: strict; }
  td + td { border-left: 1px solid var(--ac-tint2); }
  tbody tr:nth-child(even) td { background: var(--ac-tint); }
  td.sop { font-size: 8.8pt; line-height: 1.7; color: #3c3c46; text-align: justify; }
  tr { break-inside: avoid; }
  .sp { font-size: 8pt; font-weight: 400; color: #b45309; background: rgba(180,83,9,.08);
        border: 1px solid rgba(180,83,9,.25); border-radius: 2.5mm; padding: .3mm 2.5mm;
        margin-left: 3mm; vertical-align: 2px; letter-spacing: .08em; }

  /* ===== 状态徽章 ===== */
  .std { display: inline-block; font-size: 8pt; padding: .5mm 3mm; border-radius: 3mm;
         background: #f1f1f4; color: #55555f; border: 1px solid #e3e3ea; letter-spacing: .03em; }
  .std-done { background: #f4f4f6; color: #6b7280; border-color: #e2e2e8; }
  .std-air { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
  .std-soon { background: #fffbeb; color: #b45309; border-color: #fde68a; }

  /* ===== 制作与声优（结构化） ===== */
  .pcard { background: var(--ac-tint); border-left: 1.1mm solid var(--ac); border-radius: 0 2.5mm 2.5mm 0;
           padding: 2.6mm 4.5mm; margin: 2mm 0; }
  table.staff { margin: 0; font-size: 9.2pt; width: 100%; }
  table.staff td { border: none; padding: .7mm 0; vertical-align: top; }
  table.staff td.k { width: 24mm; color: var(--ac-dark); font-weight: 600; }
  .cast { border-top: 1px solid var(--ac-tint2); margin-top: 1.5mm; padding-top: 1.5mm;
          display: flex; flex-wrap: wrap; gap: 1.2mm 5mm; font-size: 9.2pt; }
  .cast span i { font-style: normal; color: #55555f; }
  .cast span b { font-weight: 500; color: var(--ac-dark); margin-left: 1.2mm; }
  .mline { display: flex; gap: 3mm; font-size: 9.2pt; margin: 1mm 0; }
  .mline .mk { flex: 0 0 16mm; color: var(--ac-dark); font-weight: 600; }
  .mline + .mline { border-top: 1px solid var(--ac-tint2); padding-top: 1.3mm; margin-top: 1.3mm; }

  /* ===== 总览页时间轴 ===== */
  .tl { display: flex; justify-content: space-between; margin: 0 0 9mm; position: relative; padding: 1mm 0 0; }
  .tl::before { content: ''; position: absolute; left: 0; right: 0; top: 5.2mm; height: 0.5px; background: #d9d9e3; }
  .ycol { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; position: relative; }
  .yname { font-size: 8pt; color: #6b6b76; letter-spacing: .04em; margin-bottom: 1.6mm; background: #fff; padding: 0 1mm; }
  .yitem { writing-mode: vertical-rl; font-size: 7.6pt; color: #3c3c46; line-height: 1.15; margin: 1mm 0 0; padding: 0; }
  .yitem::before { content: ''; display: block; width: 1.6mm; height: 1.6mm; border-radius: 50%;
                   background: #4f46e5; margin: 0 auto 1mm; }
`;

// ---- 组装 ----
const shows = Object.values(base);
let tocRows = '';
const chapters = [];
shows.forEach((rec, i) => {
  const r = research[rec.folder] || {};
  const slug = 'show' + String(i + 1).padStart(2, '0');
  const ac = ACCENTS[rec.folder] || DEFAULT_ACCENT;
  const title = r.title_zh || rec.title || rec.folder;
  const titleJp = r.title_jp || (rec.titles && rec.titles[0]) || '';
  const synopsis = r.synopsis || rec.overview || '';
  const src = r.source || '';
  const upd = r.update || '';
  const genres = (r.genres || rec.genres || []).filter(g => g && !/^(动画|动漫)$/.test(g)).slice(0, 5);
  const ratings = (rec.rating || []).filter(x => x && x.score > 0).map(x => `${x.site === 'bangumi' ? 'Bangumi' : String(x.site || '').toUpperCase()} <b>${x.score}</b>`).join(' · ');
  const air0 = fmtDate(rec.airdate || (rec.units || []).map(u => u.airdate).filter(Boolean).sort()[0]);
  // 封面优先级：research.cover（官方海报覆盖，相对 anime_research/）> 视频库内封面（模式 B）
  const rcoverRel = r.cover ? String(r.cover).replace(/\//g, path.sep) : '';
  const rcoverAbs = rcoverRel && !rcoverRel.includes('..') ? path.join(rdir, rcoverRel) : '';
  const cover = (rcoverRel && fs.existsSync(rcoverAbs))
    ? (() => { const d = path.join(coverDir, slug + '.jpg'); try { fs.copyFileSync(rcoverAbs, d); return 'covers/' + slug + '.jpg'; } catch (e) { console.warn('⚠ 封面复制失败（' + rec.folder + '）:', e.message); return ''; } })()
    : localCoverSrc(rec, slug);

  const art = cover ? `<div class="art"><img src="${cover}" alt=""></div>` : `<div class="art"></div>`;
  // 制作与声优：结构化渲染（解析失败降级原文本）
  const prod = r.production ? splitProduction(r.production) : null;
  const prodHtml = r.production
    ? (prod
        ? `<div class="pcard">${prod.staff.length ? `<table class="staff"><tbody>${prod.staff.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`).join('')}</tbody></table>` : ''}${prod.cast.length ? `<div class="cast">${prod.cast.map(([role, cv]) => `<span>${role ? `<i>${esc(role)}</i>` : ''}<b>${esc(cv)}</b></span>`).join('')}</div>` : ''}</div>`
        : `<div class="card"><p>${esc(r.production)}</p></div>`)
    : '';
  const musicPlatHtml = (r.music || r.platforms)
    ? `<h2>主题歌与观看</h2><div class="pcard">${r.music ? `<div class="mline"><span class="mk">主题歌</span><span class="mv">${esc(r.music)}</span></div>` : ''}${r.platforms ? `<div class="mline"><span class="mk">观看平台</span><span class="mv">${esc(r.platforms)}</span></div>` : ''}</div>`
    : '';
  const unitSops = r.unit_synopses || [];
  const sopOf = (name) => { const hit = unitSops.find((u) => u.name === name); return hit ? hit.text : ''; };
  const unitRows = (rec.units || [])
    .filter(u => (u.eps || 0) > 0)
    .map(u => ({ ...u, air: u.airdate || (u.name === '本篇' ? rec.airdate : null) }))
    .sort((a, b) => (a.air || Infinity) - (b.air || Infinity))
    .map(u => {
      const sop = sopOf(u.name);
      if (unitSops.length && !sop) console.warn('⚠ 单元无剧透文案（name 须与 units 逐字一致）: ' + rec.folder + ' / ' + u.name);
      return `<tr><td>${esc(u.name)}</td><td>${u.eps} 集</td><td>${fmtDate(u.air) || '—'}</td>${
        unitSops.length ? `<td class="sop">${esc(sop)}</td>` : ''}</tr>`;
    })
    .join('');

  chapters.push(`
  <div class="show" id="show${String(i + 1).padStart(2, '0')}" style="${varsFor(ac)}">
    <div class="mast"><div class="m1">番剧收藏 · ${String(i + 1).padStart(2, '0')}</div><div class="m2">ANIME COLLECTION · ${NOW}</div></div>
    <div class="heroline">
      ${art}
      <div class="head">
        <h1 class="t1">${esc(title)}</h1>
        ${titleJp ? `<div class="t2">${esc(titleJp)}</div>` : ''}
        ${genres.length ? `<div class="chips">${genres.map(g => `<span>${esc(g)}</span>`).join('')}</div>` : ''}
        ${ratings ? `<div class="score">评分　${ratings}</div>` : ''}
        <div class="score">收藏　<b>${unitCount(rec)}</b> 个单元 · 共 <b>${totalEps(rec)}</b> 集${air0 ? ` · 首播 <b>${air0}</b>` : ''}</div>
        ${r.status ? `<div class="score"><span class="std ${stClass(r.status)}">${esc(r.status)}</span></div>` : ''}
      </div>
    </div>
    ${synopsis ? `<h2>剧情简介<span class="sp">剧透注意</span></h2><p class="syn">${esc(synopsis)}</p>` : ''}
    ${r.production ? `<h2>制作与声优</h2>${prodHtml}` : ''}
    ${musicPlatHtml}
    ${src ? `<h2>原作情报</h2><div class="card"><p>${esc(src)}</p></div>` : ''}
    ${r.watch_order ? `<h2>补番顺序</h2><div class="card"><p>${esc(r.watch_order)}</p></div>` : ''}
    ${upd ? `<h2>动画更新</h2><div class="card"><p>${esc(upd)}</p></div>` : ''}
    <h2>收藏详情</h2>
    <table><thead><tr>${unitSops.length
      ? '<th style="width:26mm">单元</th><th style="width:14mm">集数</th><th style="width:26mm">首播</th><th>剧情（含剧透）</th>'
      : '<th style="width:64mm">单元</th><th style="width:34mm">集数</th><th>首播</th>'}</tr></thead>
    <tbody>${unitRows}</tbody></table>
  </div>`);

  tocRows += `<li><a href="#show${String(i + 1).padStart(2, '0')}">${esc(title)}</a> <span class="n-ep">${totalEps(rec)} 集</span><span class="pg">${pgOf(title)}</span></li>`;
});

const grand = shows.reduce((s, r) => s + totalEps(r), 0);
const grandUnits = shows.reduce((s, r) => s + unitCount(r), 0);
const yearSpan = (() => {
  // 收录年份跨度 = 全册所有单元（含后续季/OVA）最早与最晚的年份；仅一年时显示单值，避免 "2015-2015"
  const ys = [];
  for (const s of shows) {
    for (const u of (s.units || [])) if (u.airdate) ys.push(new Date(u.airdate).getUTCFullYear());
    const y0 = s.airdate || ((s.units || []).map(u => u.airdate).filter(Boolean))[0];
    if (y0) ys.push(new Date(y0).getUTCFullYear());
  }
  ys.sort((a, b) => a - b);
  if (!ys.length) return '';
  return ys[0] === ys[ys.length - 1] ? String(ys[0]) : `${ys[0]}-${ys[ys.length - 1]}`;
})();
// 时间轴：按首播年份分列（竖排名）
const tlHtml = (() => {
  const byYear = {};
  shows.forEach(s => {
    const y0 = s.airdate || (s.units || []).map(u => u.airdate).filter(Boolean).sort()[0];
    const y = y0 ? new Date(y0).getUTCFullYear() : null;
    if (!y) return;
    const rj = research[s.folder] || {};
    const nm = rj.title_zh || s.title || s.folder;
    (byYear[y] = byYear[y] || []).push(nm);
  });
  return Object.keys(byYear).sort().map(y =>
    `<div class="ycol"><div class="yname">${y}</div>${byYear[y].map(n => `<div class="yitem">${esc(n.length > 9 ? n.slice(0, 9) + '…' : n)}</div>`).join('')}</div>`
  ).join('');
})();
const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="accent" content="#4f46e5">
<title>番剧收藏简介</title><style>${CSS}</style></head><body><div class="page">
  <div class="thd">
    <div class="kick">ANIME COLLECTION · ${NOW}</div>
    <h1>番剧收藏简介</h1>
    <div class="sub">共 ${shows.length} 部 · ${grandUnits} 个单元 · ${grand} 集 ｜ 剧情一览 · 原作情报 · 更新动态 · 收藏清单</div>
  </div>
  <div class="stats">
    <div class="st"><b>${shows.length}</b><span>部 作品</span></div>
    <div class="st"><b>${grandUnits}</b><span>个单元</span></div>
    <div class="st"><b>${grand}</b><span>集 收藏</span></div>
    <div class="st"><b>${yearSpan}</b><span>收录年份跨度</span></div>
  </div>
  <div class="tl">${tlHtml}</div>
  <div class="toc">
    <h2>目录<span class="cnt">${shows.length} 部</span></h2>
    <ol>${tocRows}</ol>
  </div>
</div>
<div class="page">
${chapters.join('\n')}
</div>
</body></html>`;

fs.writeFileSync(path.join(OUT, '番剧收藏简介.html'), html, 'utf8');
const missing = shows.filter(s => !research[s.folder]).map(s => s.folder);
console.log(`built ${shows.length} chapters -> anime_build/番剧收藏简介.html`);
if (missing.length) console.log('no research for:', missing.join('、'));
