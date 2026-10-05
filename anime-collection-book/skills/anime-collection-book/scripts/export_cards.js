// 分享物料导出：收藏卡 PNG + 高清整页图（社交发图用）
// 依赖：playwright（渲染）、pdfjs-dist + @napi-rs/canvas（整页高清图）
// 用法: node export_cards.js   （先跑过 npm run pipeline）
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

// ---- 统一配置（同目录 config.json；缺失时回退默认值）----
const CFG = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')); } catch (e) { return {}; }
})();
const ROOT = CFG.root || 'C:\\anime-book';
const BLD = path.join(ROOT, 'anime_build');
const OUT_CARDS = path.join(BLD, '_cards');
const OUT_GALLERY = path.join(BLD, '_gallery');

(async () => {
  const { chromium } = require('playwright');
  let browser;
  try { browser = await chromium.launch({ headless: true }); }
  catch (e) { browser = await chromium.launch({ channel: 'msedge', headless: true }); }

  // ① 收藏卡 → PNG（deviceScaleFactor 2 保证清晰度）
  const cardsFile = path.join(BLD, 'share_cards.html');
  if (fs.existsSync(cardsFile)) {
    fs.mkdirSync(OUT_CARDS, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 820, height: 1120 }, deviceScaleFactor: 2 });
    await page.goto(pathToFileURL(cardsFile).href, { waitUntil: 'load', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const cards = await page.$$('.scard');
    for (let i = 0; i < cards.length; i++) {
      await cards[i].screenshot({ path: path.join(OUT_CARDS, `card-${String(i + 1).padStart(2, '0')}.png`) });
    }
    console.log('cards:', cards.length, '->', OUT_CARDS);
    await page.close();
  } else {
    console.log('未找到 share_cards.html ——请先跑构建（npm run pipeline）');
  }

  // ② 高清整页图（scale 2，联络表的低清图管目检，这批管发图）
  const pdfPath = path.join(BLD, '番剧收藏简介.pdf');
  if (fs.existsSync(pdfPath)) {
    fs.mkdirSync(OUT_GALLERY, { recursive: true });
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const { createCanvas } = require('@napi-rs/canvas');
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
    for (let i = 1; i <= doc.numPages; i++) {
      const pg = await doc.getPage(i);
      const vp = pg.getViewport({ scale: 2 });
      const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      await pg.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
      fs.writeFileSync(path.join(OUT_GALLERY, `page-${String(i).padStart(2, '0')}.png`), canvas.toBuffer('image/png'));
    }
    console.log('gallery:', doc.numPages, '页 ->', OUT_GALLERY);
  } else {
    console.log('未找到 PDF ——请先跑渲染（npm run pipeline）');
  }

  await browser.close();
})().catch(e => { console.error('导出失败：', e.message); process.exit(1); });
