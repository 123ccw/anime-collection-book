// 素材来源台账（内部模块）：记录每张图的渠道与出处，供 sources.js 与 fetch_candidates.js 共用
// 台账文件：<项目根>/anime_build/_sources.json
const fs = require('fs');
const path = require('path');

// 渠道白名单 → 中文标签（顺序即推荐优先级：官方优先，图库兜底）
const CHANNELS = {
  official: '官方渠道',
  anilist: 'AniList',
  bangumi: 'Bangumi',
  wiki: '维基百科',
  safebooru: '图库 safebooru',
  other: '其它',
};

function ledgerPath(root) { return path.join(root, 'anime_build', '_sources.json'); }

function load(root) {
  try { return JSON.parse(fs.readFileSync(ledgerPath(root), 'utf8')); }
  catch (e) { return { version: 1, entries: [] }; }
}

function save(root, data) {
  const f = ledgerPath(root);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(data, null, 1));
  return f;
}

/** 追加一条来源记录；同 work+kind 只保留最新一条（重新取图就覆盖旧记录） */
function add(root, entry) {
  const data = load(root);
  data.entries = (data.entries || []).filter(
    (e) => !(e.work === entry.work && e.kind === entry.kind)
  );
  data.entries.push({ at: new Date().toISOString().slice(0, 10), ...entry });
  return save(root, data);
}

module.exports = { CHANNELS, ledgerPath, load, save, add };
