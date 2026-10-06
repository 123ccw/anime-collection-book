// 一键交付：把成品与说明归拢到 <项目根>/_deliver/，方便直接发出去
// 产出：PDF + HTML 源 + 分享卡 PNG + 高清整页图 + 来源台账 + 自动生成的交付说明
//
// 原子交付（借高星 skill 的做法）：先全部写进 _deliver.tmp/，校验通过才替换 _deliver/。
// 中途失败时上一版好产物原样保留（last-good），不会留下半成品。
//
// 用法: node pack.js [--out <目录>] [--no-gallery] [--force]
//   --no-gallery  不带高清整页图（体积大，发群/网盘时才需要）
//   --force       目标目录已存在且不是打包产物时，允许覆盖（默认拒绝，防误删）
//
// 失败码：P1 无成品 · P2 目标目录非本工具产物 · P3 残留目录归属不明 ·
//        P4/P5 PDF 缺失或体积不符 · P6 交付说明未生成 · P7 打包标记坏了 · P8 替换失败
const fs = require('fs');
const path = require('path');

// ---- 统一配置（同目录 config.json；缺失时回退默认值）----
const CFG = (() => {
  const f = path.join(__dirname, 'config.json');   // 静默回退会让人读到陌生的 root，这里必须出声
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) {
    console.warn('⚠ 读不到 ' + f + '（' + (e.code || e.message) + '）——请复制 config.example.json 为 config.json 并改 root；本次回退默认值');
    return {};
  }
})();
const ROOT = CFG.root || 'C:\\anime-book';
const BOOK = CFG.title && String(CFG.title).trim() ? String(CFG.title).trim() : '番剧收藏简介';

const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf('--' + name); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null; };
const NO_GALLERY = argv.includes('--no-gallery');
const FORCE = argv.includes('--force');

const BLD = path.join(ROOT, 'anime_build');
const OUT = opt('out') ? path.resolve(opt('out')) : path.join(ROOT, '_deliver');
const TMP = OUT + '.tmp';
const OLD = OUT + '.old';
const MARKER = '.pack-manifest.json';

const PDF = path.join(BLD, BOOK + '.pdf');
const HTML = path.join(BLD, BOOK + '.html');
const kb = (n) => (n / 1024).toFixed(0) + ' KB';

if (!fs.existsSync(PDF)) {
  console.error('[P1] 未找到成品 ' + PDF + ' ——先跑 `npm run pipeline`（或至少 build → render）');
  process.exit(1);
}

// ---- 目标目录安全策略：只覆盖"上一次 pack 留下的目录"，其他一律拒绝 ----
if (fs.existsSync(OUT) && !fs.existsSync(path.join(OUT, MARKER)) && !FORCE) {
  console.error('[P2] 目标目录已存在且不是本工具的产物：' + OUT);
  console.error('  → 换个 --out，或确认可以覆盖后加 --force');
  process.exit(1);
}

// ---- 清理上次崩溃留下的临时目录（只清带标记的，否则要 --force）----
for (const d of [TMP, OLD]) {
  if (!fs.existsSync(d)) continue;
  if (fs.existsSync(path.join(d, MARKER)) || FORCE) fs.rmSync(d, { recursive: true, force: true });
  else { console.error('[P3] 发现疑似残留目录且无法确认归属：' + d + '（确认可删后加 --force）'); process.exit(1); }
}

// ---- 全部写进临时目录 ----
fs.mkdirSync(TMP, { recursive: true });
const copied = [];
function copyInto(src, rel, note) {
  if (!fs.existsSync(src)) return false;
  const dst = path.join(TMP, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  copied.push({ file: rel, size: fs.statSync(dst).size, note: note || '' });
  return true;
}
function copyDirInto(srcDir, relDir, note) {
  if (!fs.existsSync(srcDir)) return 0;
  const files = fs.readdirSync(srcDir).filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f)).sort();
  for (const f of files) copyInto(path.join(srcDir, f), path.join(relDir, f), note);
  return files.length;
}

copyInto(PDF, BOOK + '.pdf', '成品 PDF');
copyInto(HTML, BOOK + '.html', 'HTML 源（可自行微调重渲）');
const nCards = copyDirInto(path.join(BLD, '_cards'), '分享卡', '竖版分享卡（社交发图）');
const nGallery = NO_GALLERY ? 0 : copyDirInto(path.join(BLD, '_gallery'), '整页高清图', '高清整页图');
const hasSources = copyInto(path.join(BLD, '_sources.md'), '素材来源台账.md', '每张图的渠道与出处');
const pdfSize = fs.statSync(PDF).size;

(async () => {
  let pages = null;
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(fs.readFileSync(PDF));
    const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
    pages = doc.numPages;
  } catch (e) { /* 数不出来就不写页数 */ }

  let works = [];
  try {
    const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'anime_base.json'), 'utf8'));
    works = Object.values(base).map((r) => {
      let t = r.title || r.folder;
      try {
        const rj = JSON.parse(fs.readFileSync(path.join(ROOT, 'anime_research', r.folder + '.json'), 'utf8'));
        t = rj.title_zh || t;
      } catch (e) { /* 用 base 里的名字 */ }
      return t;
    });
  } catch (e) { /* 没有 base 就不列清单 */ }

  let srcLine = '未生成 —— 跑 `npm run sources` 后可把台账一并打包';
  if (hasSources) {
    try {
      const led = JSON.parse(fs.readFileSync(path.join(BLD, '_sources.json'), 'utf8'));
      const es = led.entries || [];
      const official = es.filter((e) => e.channel === 'official').length;
      const booru = es.filter((e) => e.channel === 'safebooru').length;
      srcLine = `共 ${es.length} 条（官方渠道 ${official} · 图库 ${booru}）—— 详见「素材来源台账.md」`;
    } catch (e) { srcLine = '已打包（台账文件见同目录）'; }
  }

  const lines = [];
  lines.push('# ' + BOOK + ' · 交付说明');
  lines.push('');
  lines.push('生成时间：' + new Date().toLocaleString('zh-CN'));
  lines.push('');
  lines.push('| | |');
  lines.push('| --- | --- |');
  lines.push('| 作品数 | ' + (works.length || '—') + ' 部 |');
  lines.push('| 成品页数 | ' + (pages || '—') + ' 页 |');
  lines.push('| PDF 体积 | ' + kb(pdfSize) + ' |');
  lines.push('| 分享卡 | ' + (nCards || 0) + ' 张 |');
  lines.push('| 高清整页图 | ' + (nGallery ? nGallery + ' 张' : '未包含' + (NO_GALLERY ? '（--no-gallery）' : '（未跑 npm run cards）')) + ' |');
  lines.push('| 来源台账 | ' + srcLine + ' |');
  lines.push('');
  if (works.length) {
    lines.push('## 收录作品');
    lines.push('');
    works.forEach((t, i) => lines.push((i + 1) + '. ' + t));
    lines.push('');
  }
  lines.push('## 文件');
  lines.push('');
  lines.push('| 文件 | 大小 | 说明 |');
  lines.push('| --- | --- | --- |');
  for (const c of copied) lines.push('| ' + c.file + ' | ' + kb(c.size) + ' | ' + (c.note || '') + ' |');
  lines.push('');
  lines.push('## 使用与版权');
  lines.push('');
  lines.push('- 本册为**非官方粉丝作品**，仅供个人收藏；海报/立绘版权归原作者与各制作委员会所有');
  lines.push('- 公开发布（发群、上传平台、印制售卖）前请自行评估授权 —— **注明来源不等于获得授权**');
  lines.push('- 中文字体为霞鹜文楷子集（SIL OFL 1.1，© LXGW ｜ © The Klee Project Authors），封底署名请勿删除');
  lines.push('- 想微调重渲：改 `' + BOOK + '.html` 后用浏览器打印为 PDF，或回到项目里重跑 `npm run pipeline`');
  lines.push('');
  fs.writeFileSync(path.join(TMP, '交付说明.md'), lines.join('\n'), 'utf8');
  fs.writeFileSync(path.join(TMP, MARKER), JSON.stringify({
    tool: 'anime-collection-book/pack',
    packedAt: new Date().toISOString(),
    book: BOOK,
    pages,
    works: works.length,
    files: copied.map((c) => c.file),
  }, null, 1));

  // ---- 交付前校验（不通过就绝不替换，上一版原样保留）----
  const problems = [];
  if (!fs.existsSync(path.join(TMP, BOOK + '.pdf'))) problems.push('[P4] 临时目录里没有 PDF');
  else if (fs.statSync(path.join(TMP, BOOK + '.pdf')).size !== pdfSize) problems.push('[P5] 复制的 PDF 与源文件体积不一致');
  if (!fs.existsSync(path.join(TMP, '交付说明.md'))) problems.push('[P6] 交付说明未生成');
  try { JSON.parse(fs.readFileSync(path.join(TMP, MARKER), 'utf8')); }
  catch (e) { problems.push('[P7] 打包标记不可解析：' + e.message); }
  if (problems.length) {
    console.error('打包校验未通过，已放弃替换（上一版 _deliver 原样保留）：');
    problems.forEach((p) => console.error('  ' + p));
    fs.rmSync(TMP, { recursive: true, force: true });
    process.exit(1);
  }

  // ---- 原子替换：旧 → .old，新 → 正式名，成功后再删旧的；失败回滚 ----
  let displaced = false;
  try {
    if (fs.existsSync(OUT)) { fs.renameSync(OUT, OLD); displaced = true; }
    fs.renameSync(TMP, OUT);
  } catch (e) {
    console.error('[P8] 替换失败：' + e.message);
    if (displaced && !fs.existsSync(OUT)) { try { fs.renameSync(OLD, OUT); console.error('  已回滚到上一版'); } catch (_) {} }
    fs.rmSync(TMP, { recursive: true, force: true });
    process.exit(1);
  }
  if (displaced) fs.rmSync(OLD, { recursive: true, force: true });

  console.log('已打包 → ' + OUT);
  console.log('  ' + BOOK + '.pdf（' + kb(pdfSize) + (pages ? '，' + pages + ' 页' : '') + '）');
  console.log('  ' + BOOK + '.html（可自行微调重渲）');
  if (nCards) console.log('  分享卡 ' + nCards + ' 张');
  if (nGallery) console.log('  高清整页图 ' + nGallery + ' 张');
  console.log('  交付说明.md' + (hasSources ? ' + 素材来源台账.md' : '（未含来源台账：先跑 npm run sources）'));
  console.log('');
  console.log('发出去之前记得：' + (hasSources ? '确认台账里的图库来源已尽量回溯官方原图；' : '') + '别把 scripts/config.json、names.txt、anime_research/ 一起带上（含你的路径与片单）。');
})();
