// HTML → PDF（Playwright/Chromium；自带 PDF 书签 + 页脚页码）
// 依赖：本目录先执行 `npm i playwright` 然后 `npx playwright install chromium`（失败回退系统 Edge）
// 用法: node render_pw.js
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

// ---- 统一配置（单文件唯一事实源：scripts/_config.js；支持 ANIME_BOOK_* 环境变量覆盖）----
const { ROOT, BOOK } = require('./_config');
const SRC = path.join(ROOT, 'anime_build');
const DST = path.join(ROOT, 'anime_build');
const NAME = BOOK + '.html'; // 只渲染这一个文件
const OUT_PDF = path.join(DST, NAME.replace(/\.html$/, '.pdf'));
if (!fs.existsSync(path.join(SRC, NAME))) {
  console.error('未找到 ' + path.join(SRC, NAME) + ' ——请先跑 build_anime_html.js'); process.exit(1);
}
fs.mkdirSync(DST, { recursive: true });

// CI / 容器里 Chromium 的沙箱常常起不来；--no-sandbox 只用于自测环境
const NO_SANDBOX = process.argv.includes('--no-sandbox');
const ARGS = ['--allow-file-access-from-files'].concat(NO_SANDBOX ? ['--no-sandbox', '--disable-dev-shm-usage'] : []);

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

(async () => {
  let browser, page;
  try { browser = await chromium.launch({ headless: true, args: ARGS }); }
  catch (e) {
    try { browser = await chromium.launch({ channel: 'msedge', headless: true, args: ARGS }); }
    catch (e2) { browser = await chromium.launch({ headless: true, args: ARGS.concat(['--no-sandbox', '--disable-dev-shm-usage']) }); }
  }

  const htmlPath = path.join(SRC, NAME);
  try {
    page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready); // 等 @font-face 就绪，避免字体未加载就出 PDF
    await page.waitForTimeout(300);
    await page.pdf({
      path: OUT_PDF,
      format: 'A4',
      printBackground: true,
      outline: true,
      tagged: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `<div style="width:100%;text-align:center;font-size:8px;color:#71717a;font-family:'Microsoft YaHei','PingFang SC','Hiragino Sans GB','Noto Sans CJK SC',sans-serif;">`
        + `<span class="title">${esc(NAME.replace(/\.html$/, ''))}</span>&nbsp;&nbsp;·&nbsp;&nbsp;`
        + `<span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
      margin: { top: '0', bottom: '15mm', left: '0', right: '0' },
      timeout: 120000,
    });
    console.log('rendered ->', OUT_PDF, Math.round(fs.statSync(OUT_PDF).size / 1024) + 'KB');
  } catch (e) {
    console.error('FAILED:', e.message.split('\n')[0]);
    process.exitCode = 2;
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
})().catch(e => {   // 启动/兜底都失败时也要给中文提示与确定的退出码，不要抛未处理 rejection
  console.error('FAILED:', String(e && e.message || e).split('\n')[0]);
  process.exit(2);
});
