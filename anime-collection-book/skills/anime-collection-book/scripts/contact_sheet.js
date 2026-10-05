// 整本 PDF → 小图 → 4×5 联络表（全页目检用）
// 依赖：本目录先执行 `npm i @napi-rs/canvas pdfjs-dist`
// 用法: node contact_sheet.js   （读 ROOT/anime_build/番剧收藏简介.pdf，输出 ROOT/anime_build/_sheets/）
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

// ---- 统一配置（同目录 config.json；缺失时回退默认值）----
const CFG = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')); } catch (e) { return {}; }
})();
const ROOT = CFG.root || 'C:\\anime-book';   // 项目根（★在 config.json 里改）
const PDF = path.join(ROOT, 'anime_build', '番剧收藏简介.pdf');
const TMP = path.join(ROOT, 'anime_build', '_allpages');
const OUT = path.join(ROOT, 'anime_build', '_sheets');

(async () => {
  // pdfjs-dist 的 .mjs 是 ESM；用动态 import 加载，兼容 Node >=20（require(ESM) 需 20.19+/22.12+）
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });

  const data = new Uint8Array(fs.readFileSync(PDF));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 0.6 });
    const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
    fs.writeFileSync(path.join(TMP, `p${String(i).padStart(2, '0')}.png`), canvas.toBuffer('image/png'));
  }
  console.log('pages:', doc.numPages);

  const files = fs.readdirSync(TMP).filter(f => f.endsWith('.png')).sort();
  const imgs = await Promise.all(files.map(f => loadImage(path.join(TMP, f))));
  const w = imgs[0].width, h = imgs[0].height;
  const COLS = 4, ROWS = 5;
  let idx = 0, sheet = 0;
  fs.mkdirSync(OUT, { recursive: true });
  while (idx < imgs.length) {
    const canvas = createCanvas(COLS * w + (COLS + 1) * 8, ROWS * h + (ROWS + 1) * 8);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#333'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (idx >= imgs.length) break;
      const x = 8 + c * (w + 8), y = 8 + r * (h + 8);
      ctx.drawImage(imgs[idx], x, y);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif';
      ctx.fillText(String(idx + 1), x + 6, y + 24);
      idx++;
    }
    fs.writeFileSync(path.join(OUT, `sheet_${String(++sheet).padStart(2, '0')}.png`), canvas.toBuffer('image/png'));
  }
  console.log('sheets:', sheet, '->', OUT);
})();
