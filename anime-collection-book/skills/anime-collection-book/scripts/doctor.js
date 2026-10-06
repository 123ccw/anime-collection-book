// 环境自检：一次把"跑不起来"的原因说清（node / python / 字体 / 浏览器 / 网络 / 配置）
// 用法: node doctor.js [--net]        --net 才做联网探测（默认跳过，离线也能跑）
// 只读检查 + 一次写权限试探；不改任何产物
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const NET = process.argv.includes('--net');
let bad = 0, warn = 0;
const ok = (m) => console.log('  ✓ ' + m);
const no = (m, how) => { bad++; console.log('  ✗ ' + m + (how ? '\n      → ' + how : '')); };
const meh = (m, how) => { warn++; console.log('  ! ' + m + (how ? '\n      → ' + how : '')); };
const head = (t) => console.log('\n' + t);
const isWin = process.platform === 'win32';

function run(cmd, args, timeout) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: timeout || 5000 }).trim();
  } catch (e) { return null; }
}

// ---- 配置（单文件唯一事实源：_config.js；支持 ANIME_BOOK_* 环境变量覆盖）----
// doctor 特殊：配置坏了也要继续把其它项查完，所以用 soft 模式（只提示、不退出）
const cfgmod = require('./_config').load({ soft: false });
const CFG = cfgmod.CFG;
const CONFIG_FILE = cfgmod.configPath;
head('配置');
if (cfgmod.configError) {
  no('读不到 ' + CONFIG_FILE + '（' + (cfgmod.configError.code || cfgmod.configError.message) + '）',
    '复制 config.example.json 为 config.json，并把 root 改成你的项目根');
} else {
  ok('config.json 可解析');
}
if (process.env.ANIME_BOOK_ROOT) ok('已用环境变量 ANIME_BOOK_ROOT 覆盖 root（CI / 自测模式）');
const ROOT = CFG.root || '';
if (!ROOT) {
  no('config.json 里没有 root', '填上项目根目录的绝对路径');
} else if (!fs.existsSync(ROOT)) {
  no('root 指向的目录不存在：' + ROOT, '改 config.json 的 root');
} else {
  ok('项目根存在：' + ROOT);
  try {
    const probe = path.join(ROOT, '.dsh-doctor-write-test');
    fs.writeFileSync(probe, 'ok');
    fs.rmSync(probe, { force: true });
    ok('项目根可写');
  } catch (e) {
    no('项目根不可写：' + e.message, '检查目录权限，或别把项目根放在受保护目录（Program Files / 系统盘根）');
  }
  // 输入与产物
  const base = path.join(ROOT, 'anime_base.json');
  const names = path.join(ROOT, 'names.txt');
  if (fs.existsSync(base)) ok('anime_base.json 已生成');
  else if (fs.existsSync(names)) meh('有 names.txt 但还没有 anime_base.json', '跑 `npm run base`（问卷式合成）');
  else meh('项目根既没有 names.txt 也没有 anime_base.json', '模式 A：写 names.txt（一行一部）；模式 B：自备扫描脚本生成 anime_base.json');
  if (fs.existsSync(path.join(ROOT, 'anime_build', cfgmod.BOOK + '.pdf'))) ok('已有成品 PDF（可反复重跑）');
}

// ---- Node ----
head('Node 与脚本依赖');
const major = Number(process.versions.node.split('.')[0]);
if (major >= 20) ok('Node ' + process.versions.node);
else no('Node ' + process.versions.node + ' 太旧', '脚本用了 Node >=20 的 API（pdfjs 的 ESM 动态 import 等），请升级');

// ---- 字体 ----
head('字体（霞鹜文楷，自行下载后放进 <项目根>/fonts/）');
if (ROOT && fs.existsSync(ROOT)) {
  const custom = CFG.fonts;
  if (custom && (custom.regular || custom.medium)) {
    // CI / 自测：用 config.json 的 fonts 指向测试字体，不要求霞鹜文楷
    const cp = [custom.regular, custom.medium].filter(Boolean);
    const gone = cp.filter((f) => !fs.existsSync(f));
    if (!gone.length) meh('使用 config.json 的 fonts 覆盖（' + cp.length + ' 个自备字体）—— 仅用于 CI / 自测，成品请用霞鹜文楷或其它可商用中文字体');
    else no('config.json 的 fonts 指向的文件不存在：' + gone.join('、'), '删掉 fonts 字段回到霞鹜文楷，或修正路径');
  } else {
    const need = ['LXGWWenKai-Regular.ttf', 'LXGWWenKai-Medium.ttf'];
    const miss = need.filter((f) => !fs.existsSync(path.join(ROOT, 'fonts', f)));
    if (!miss.length) ok('两个 TTF 都在');
    else no('缺少 ' + miss.join('、'), 'GitHub Releases 下载 LXGW WenKai 的 Regular/Medium TTF 放进 ' + path.join(ROOT, 'fonts'));
  }
  const subs = ['wk-sub-regular.woff2', 'wk-sub-medium.woff2'].filter((f) => fs.existsSync(path.join(ROOT, 'fonts', f)));
  if (subs.length === 2) ok('字体子集已生成（改文案后记得 `npm run pipeline` 重跑）');
  else meh('字体子集还没生成', '跑 `npm run pipeline` 里的第一步（collect_fonts）会自动生成');
}

// ---- Python（字体子集）----
head('Python（字体子集用）');
let PY = '';
for (const cmd of ['python3', 'python']) {
  // 注意：要让它打印点什么——import 成功时 stdout 是空的，空串会被判成失败
  if (run(cmd, ['-c', 'import fontTools, brotli; print("ok")'])) { PY = cmd; break; }
}
if (PY) ok('找到 ' + PY + '，且 fontTools + brotli 可用');
else {
  const anyPy = run('python', ['--version']) || run('python3', ['--version']);
  if (anyPy) no('有 Python（' + anyPy + '）但缺 fontTools/brotli', 'pip install fonttools brotli');
  else no('没找到 Python', '装 Python 3 后执行 pip install fonttools brotli');
}

// ---- 浏览器（渲染 PDF）----
head('浏览器（渲染 PDF）');
let pwOk = false;
try {
  require.resolve('playwright', { paths: [__dirname] });
  const { chromium } = require('playwright');
  let exe = '';
  try { exe = chromium.executablePath(); } catch (e) { /* 未下载 */ }
  if (exe && fs.existsSync(exe)) { ok('Playwright Chromium 已就绪'); pwOk = true; }
  else meh('Playwright 已安装，但 Chromium 没下载', '在 scripts/ 目录执行 npx playwright install chromium（也可以直接靠系统 Edge 兜底）');
} catch (e) {
  meh('未安装 playwright', '在 scripts/ 目录执行 npm i');
}
const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
].find((f) => fs.existsSync(f));
if (EDGE) ok('系统 Edge 可用（playwright 装不上时脚本会自动回退到它）');
else if (!pwOk) no('既没有 Playwright Chromium 也没有系统 Edge', 'npx playwright install chromium，或装 Edge/Chrome');

// ---- 取数工具 ----
head('取数工具');
if (run('curl', ['--version'])) ok('curl 可用');
else no('没有 curl', 'Windows 10+ 自带；缺失时装 curl 并确保在 PATH');
if (run('tvly', ['--version'])) {
  ok('tvly（Tavily CLI）可用');
  if (isWin && !process.env.PYTHONIOENCODING) {
    meh('Windows 上没设 PYTHONIOENCODING，tvly --json 会撞 GBK 编码报 UnicodeEncodeError',
      "用之前先执行 $env:PYTHONIOENCODING='utf-8'（或 chcp 65001）");
  }
} else {
  meh('没找到 tvly（Tavily CLI）', '调研主要靠它：pip install tavily-cli（或官方安装方式）；没它就得自己找别的取数途径');
}

// ---- 联网（可选）----
if (NET) {
  head('联网（--net）');
  for (const [name, url] of [['AniList', 'https://graphql.anilist.co'], ['safebooru', 'https://safebooru.org'], ['zh.wikipedia.org（直连）', 'https://zh.wikipedia.org']]) {
    const r = run('curl', ['-s', '-o', isWin ? 'NUL' : '/dev/null', '-w', '%{http_code}', '--max-time', '6', url]);
    if (r && r !== '000') ok(name + ' 可达（HTTP ' + r + '）');
    else if (name.startsWith('zh.wikipedia')) meh(name + ' 不可达（国内常见）', '维基内容一律经 tvly 服务端抓，不要用 curl 硬顶');
    else no(name + ' 不可达', '检查网络/代理；取数会失败');
  }
} else {
  console.log('\n提示：加 --net 可顺带探测 AniList / safebooru / 维基的连通性');
}

// ---- 结论 ----
head('结论');
if (bad) console.log('  ' + bad + ' 项阻塞、' + warn + ' 项提醒 —— 先把上面标 ✗ 的修掉再跑 pipeline');
else if (warn) console.log('  没有阻塞项，' + warn + ' 项提醒（多数不影响出书）');
else console.log('  环境齐全，可以直接 `npm run pipeline`');
process.exit(bad ? 1 : 0);
