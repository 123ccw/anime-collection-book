// 候选图抓取与对比（safebooru official_art → 评分 → 3:4 瓦片预览 + 编号）
// 用法：
//   node fetch_candidates.js <tag>                抓该角色的候选 → anime_build/_candidates/sheet.png + manifest.json
//   node fetch_candidates.js --pick <编号>         取选中的原图入库 → anime_research/covers/picked.jpg
//   可选 --keep-top 0.79                          只保上部（裁掉底部宣传字区）
// 产物用固定文件名（避免命令行输入进入文件路径）；入库后自行改名或在 research JSON 里引用 picked.jpg
// 标签用 safebooru 写法（下划线，如 yanami_anna）；选图标准见 references/image-selection.md
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CFG = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')); } catch (e) { return {}; }
})();
const ROOT = CFG.root || 'C:\\anime-book';
const OUT = path.join(ROOT, 'anime_build', '_candidates');
const SHEET = path.join(OUT, 'sheet.png');
const MANIFEST = path.join(OUT, 'manifest.json');
const TMP = path.join(OUT, 'download.tmp');
const PICKED = path.join(ROOT, 'anime_research', 'covers', 'picked.jpg');
const UA = 'Mozilla/5.0 (compatible; anime-collection-book)';
const LIMIT = 12, CELL_W = 300, CELL_H = 410, COLS = 4;   // 3:4.1 ≈ 封面瓦片比例
const MIN_SIDE = 500;

function curl(args) { return execFileSync('curl', args, { maxBuffer: 40 * 1024 * 1024 }); }
function curlText(args) { return execFileSync('curl', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }); }
function dl(url, dest, timeout) { curl(['-sL', '--connect-timeout', '12', '--max-time', timeout || '120', '-H', `User-Agent: ${UA}`, '-o', dest, url]); }

function fetchList(tag) {
  const url = `https://safebooru.org/index.php?page=dapi&s=post&q=index&tags=${encodeURIComponent(tag)}+official_art&limit=40`;
  const xml = curlText(['-s', '--connect-timeout', '12', '--max-time', '60', '-H', `User-Agent: ${UA}`, url]);
  return [...xml.matchAll(/<post [^>]*>/g)].map(m => m[0]).map(s => ({
    file: (s.match(/file_url="([^"]+)"/) || [])[1],
    w: +(s.match(/width="(\d+)"/) || [])[1] || 0,
    h: +(s.match(/height="(\d+)"/) || [])[1] || 0,
  })).filter(p => p.file && p.w >= MIN_SIDE && p.h >= MIN_SIDE)
    .sort((a, b) => b.w * b.h - a.w * a.h);
}

// 入库：只接收已解析的编号（两位数字串）与裁切比例——不接收命令行/路径；文件路径全为常量
async function pick(idx, keepTop) {
  if (!/^[0-9]{2}$/.test(idx)) { console.error('编号非法：' + idx); process.exit(1); }
  if (!Number.isFinite(keepTop) || keepTop <= 0 || keepTop > 1) { console.error('keep-top 应为 (0,1]'); process.exit(1); }
  const man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const hit = man.find(x => x.idx === idx);
  if (!hit) { console.error('清单里没有编号 ' + idx + '（先跑一次抓取）'); process.exit(1); }
  dl(hit.url, TMP);
  const { createCanvas, loadImage } = require('@napi-rs/canvas');
  const im = await loadImage(TMP);
  const srcH = Math.max(1, Math.floor(im.height * keepTop));
  const RATIO = 3 / 4.1;
  let w = Math.min(im.width, Math.floor(srcH * RATIO));
  let h = Math.floor(w / RATIO);
  if (h > srcH) { h = srcH; w = Math.floor(h * RATIO); }
  const c = createCanvas(w, h);
  c.getContext('2d').drawImage(im, -Math.floor((im.width - w) / 2), -Math.floor((srcH - h) / 2));
  fs.mkdirSync(path.dirname(PICKED), { recursive: true });
  fs.writeFileSync(PICKED, c.toBuffer('image/jpeg', 92));
  console.log(`已入库 ${PICKED}（${w}x${h}，取上部 ${(keepTop * 100).toFixed(0)}%，JPEG q92）`);
  console.log('下一步：改名到 anime_research/covers/<角色名>.jpg，并在 research JSON 的 cover/portrait 里引用');
}

(async () => {
  const argv = process.argv.slice(2);
  // 统一解析入口，只把已规范化的原始值传入业务函数
  const pickI = argv.indexOf('--pick');
  if (pickI >= 0) {
    const rawIdx = String(parseInt(argv[pickI + 1], 10)).padStart(2, '0');
    const ktI = argv.indexOf('--keep-top');
    const rawKeep = ktI > -1 ? Number(argv[ktI + 1]) : 1;
    return pick(rawIdx, rawKeep);
  }
  const tag = argv.filter(a => !a.startsWith('--'))[0];
  if (!tag) { console.error('用法: node fetch_candidates.js <safebooru_tag>'); process.exit(1); }
  if (!/^[a-z0-9_]+$/.test(tag)) { console.error('标签非法（只允许小写字母/数字/下划线）：' + tag); process.exit(1); }

  const { createCanvas, loadImage } = require('@napi-rs/canvas');
  fs.mkdirSync(OUT, { recursive: true });
  const posts = fetchList(tag);
  if (!posts.length) { console.error(tag + ': 无候选（标签拼写？）'); process.exit(2); }
  const picks = posts.slice(0, LIMIT);
  const tiles = [], manifest = [];
  for (let i = 0; i < picks.length; i++) {
    const f = path.join(OUT, 'cand-' + String(i).padStart(2, '0') + '.img');
    try {
      dl(picks[i].file, f, '90');
      const im = await loadImage(f);
      // 非白底比例（0=纯白/透明底；越高越"有环境"）
      const chk = createCanvas(64, 64); const cc = chk.getContext('2d');
      cc.drawImage(im, 0, 0, 64, 64);
      const d = cc.getImageData(0, 0, 64, 64).data;
      let nonWhite = 0;
      for (let p = 0; p < d.length; p += 4) {
        const lum = (d[p] + d[p + 1] + d[p + 2]) / 3;
        const sat = Math.max(d[p], d[p + 1], d[p + 2]) - Math.min(d[p], d[p + 1], d[p + 2]);
        if (!(lum > 240 && sat < 18)) nonWhite++;
      }
      const bg = nonWhite / 4096;
      // 3:4 瓦片预览（cover 裁切，所见即所得）
      const cell = createCanvas(CELL_W, CELL_H); const cx = cell.getContext('2d');
      const s = Math.max(CELL_W / im.width, CELL_H / im.height);
      cx.drawImage(im, (CELL_W - im.width * s) / 2, (CELL_H - im.height * s) / 2, im.width * s, im.height * s);
      tiles.push({ idx: String(i).padStart(2, '0'), cell, bg, w: im.width, h: im.height });
      manifest.push({ idx: String(i).padStart(2, '0'), url: picks[i].file, w: im.width, h: im.height, bg: +bg.toFixed(3) });
    } catch (e) { /* 单张失败跳过 */ }
  }
  if (!tiles.length) { console.error('候选下载全部失败'); process.exit(2); }
  tiles.sort((a, b) => (b.bg > 0.35) - (a.bg > 0.35) || b.w * b.h - a.w * a.h);   // 有背景的排前面
  const rows = Math.ceil(tiles.length / COLS);
  const canvas = createCanvas(COLS * (CELL_W + 8) + 8, rows * (CELL_H + 44) + 8);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a1a1f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  tiles.forEach((t, i) => {
    const x = 8 + (i % COLS) * (CELL_W + 8), y = 8 + Math.floor(i / COLS) * (CELL_H + 44);
    ctx.drawImage(t.cell, x, y);
    ctx.fillStyle = t.bg > 0.35 ? '#7ee787' : '#ffd75e'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`${t.idx}  ${t.w}x${t.h}  bg=${t.bg.toFixed(2)}`, x + 4, y + CELL_H + 28);
  });
  fs.writeFileSync(SHEET, canvas.toBuffer('image/png'));
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
  const good = tiles.filter(t => t.bg > 0.35).length;
  console.log(`${tag}: ${tiles.length} 张候选（有背景 ${good} 张，绿字）→ ${SHEET}`);
  console.log('接下来：看对比图挑编号 → node fetch_candidates.js --pick <编号>');
})().catch(e => { console.error('失败：', e.message); process.exit(1); });
