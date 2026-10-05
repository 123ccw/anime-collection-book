// 模式 A：names.txt（一行一部番剧名）+ anime_research/*.json → 合成 anime_base.json
// 前提：调研 agent 已为每部写好 research JSON，其中含 "units":[{"name","eps","airdate"}]（单元清单）与 "cover"
// 用法: node names_to_base.js
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
const ROOT = CFG.root || 'C:\\anime-book';   // 项目根（★在 config.json 里改）
const RDIR = path.resolve(ROOT, 'anime_research');
if (!fs.existsSync(path.join(ROOT, 'names.txt'))) {
  console.error('未找到 ' + path.join(ROOT, 'names.txt') + ' ——请先写一行一项的名单（番剧名，或 novel 模式下的角色名，见 SKILL.md）'); process.exit(1);
}
if (!fs.existsSync(RDIR)) {
  console.error('未找到 ' + RDIR + ' 目录——请先调研（见 SKILL.md），把每部的 <作品名>.json 放进去'); process.exit(1);
}
const names = fs.readFileSync(path.join(ROOT, 'names.txt'), 'utf8')
  .split(/\r?\n/).map(s => s.trim()).filter(Boolean);

const base = {};
const missing = [];
for (const name of names) {
  const p = path.resolve(RDIR, name + '.json');
  // 边界校验：目标必须落在 anime_research 目录内（拒绝名单里夹带路径）
  if (p !== RDIR && !p.startsWith(RDIR + path.sep)) { console.log('[跳过-越界名]', name); continue; }
  // 兜底：文件名与名单写法对不上时，按 folder/title 模糊匹配
  let hit = fs.existsSync(p) ? p : '';
  if (!hit) {
    for (const f of fs.readdirSync(RDIR).filter(f => f.endsWith('.json'))) {
      try {
        const j = JSON.parse(fs.readFileSync(path.join(RDIR, f), 'utf8'));
        if (j.folder === name || j.title_zh === name) { hit = path.join(RDIR, f); break; }
      } catch (e) { /* skip bad json */ }
    }
  }
  if (!hit) { missing.push(name); continue; }
  const r = JSON.parse(fs.readFileSync(hit, 'utf8'));
  // 归一化：LLM 调研 JSON 的 eps/airdate 可能是字符串（"12" 会让构建端求和变拼接）
  const toMs = v => { if (v == null || v === '') return null; const n = Number(v); if (Number.isFinite(n) && n > 0) return n; const p = Date.parse(v); return Number.isFinite(p) ? p : null; };
  const units = (r.units || []).map(u => ({ ...u, eps: Number(u.eps) || 0, airdate: toMs(u.airdate) }));
  base[r.folder || name] = {
    title: r.title_zh || name,
    folder: r.folder || name,
    airdate: units.map(u => u.airdate).find(Boolean) || null,
    titles: r.title_jp ? [r.title_jp] : [],
    genres: r.genres || [],
    overview: r.synopsis || '',
    rating: r.rating || [],
    cover: 'cover.jpeg', // 占位：模式 A 无视频库，实际封面走 research.cover 覆盖
    units,
  };
}
fs.writeFileSync(path.join(ROOT, 'anime_base.json'), JSON.stringify(base, null, 2), 'utf8');
console.log('base.json:', Object.keys(base).length, '部');
if (missing.length) { console.log('缺 research（先调研再跑）:', missing.join('、')); process.exitCode = 3; }
