---
name: anime-collection-book
license: MIT
compatibility: Requires Node.js >=20 with npm, Python 3 + fonttools/brotli (font subsetting), Playwright Chromium (or system Edge), curl and the Tavily CLI (tvly; Windows needs PYTHONIOENCODING=utf-8 for --json), and internet access for anime research (novel mode is offline).
metadata:
  author: 123ccw
  version: "1.4.5"
description: Use when 用户想把番剧/动画做成"收藏册/图鉴/纪念册/简介 PDF"——可只给片名清单（清单也可来自对话上文或文件，无需本地视频文件），也可基于本机视频收藏库；TV/剧场版/OVA 及 Galgame 视觉小说的同类整理均适用。也用于把网文/小说的设定资料整理成"设定集/角色档案册/伏笔追踪手册/读者向无剧透图鉴 PDF"（数据来自用户本地稿件或笔记，离线完成）。产出杂志风 PDF：海报墙封面封底、无剧透简介（剧透独立成表）、结构化要点表、每部主题色章节、数说统计页、可点击目录与书签页脚，另可导出竖版分享卡 PNG。不用于：追番进度管理（这不是 tracker）、视频文件整理/重命名/媒体库刮削（Jellyfin/Emby/Plex 场景）、对已有 PDF 的格式转换、小说正文本身的写作或排版。
---

# 番剧收藏册 PDF

## 高频坑位（开工前先读，都是实测踩出来的）

- **国内网络直连 zh.wikipedia.org 拿不到数据**（curl 返回空）——一切经 tvly 抓取。**Windows 上 tvly 输出 JSON 会撞控制台 GBK 编码**（`UnicodeEncodeError: 'gbk' codec can't encode...`）：先 `$env:PYTHONIOENCODING='utf-8'`（或 `chcp 65001`）再调用，中文当参数直传也可（实测可行）；个别 shell 下参数传递出问题时改走 stdin：`type q.txt | tvly search - --json`（POSIX：`printf '查询词' | tvly search - --json`）
- **维基条目的曲名/人名常挂在标题行的下一行**（`片尾曲` ⏎ `: "曲名"`）——过滤时连取后 1-2 行，否则数据截断
- **`unit_synopses[].name` 必须与 `units[].name` 逐字一致**——不一致该单元渲染为空白（构建时会打印 ⚠ 警告，看到就回查名字）
- **封面要选角色正脸海报**——AniList 本篇条目封面常是舞台远景/背影，翻 `relations` 里的 MOVIE 条目找干净竖图；**完整选图审美标准见 `references/image-selection.md`（有戏 > 清晰）**
- **每改文案必须重跑字体子集**——漏跑会出现方块字（`npm run pipeline` 已内置这一步）
- **调研子代理并发 ≤2**（超发被杀）；代理挂掉先查它的产出文件落盘没有（常见"汇报时挂、稿子已写完"）
- **airdate 缺失会让总览时间轴静默丢列**——用 units 最早日期兜底（脚本已内置；自备数据时留意）

> 完整 13 条坑位与解法在 `references/pipeline.md`，遇到具体报错时读。

## 两种领域（config.json 的 domain 字段）

- **anime**（默认）：番剧收藏册——本文件主体讲的就是它
- **novel**：小说设定集——每"部"=一个角色/势力，伏笔表用 franchise 字段承载，界面标签自动切换（卷/章/伏笔回收…），**全程离线**（数据来自本地稿件，不联网调研）。字段映射与工作流见 `references/domain-novel.md`

## 两种模式

- **模式 A · 报菜名**（零本地依赖，推荐）：用户只给番剧名字清单 `names.txt`，全部内容在线调研。
- **模式 B · 整理本机收藏**（进阶·可选）：用户有结构化视频库（每部一个文件夹，每集带封面/元数据），册子可利用本地素材。**前置条件：视频库需符合上述结构；扫描脚本未随包提供**（各人目录结构不同）——让 agent 按下方 `anime_base.json` 结构说明写一个即可。

`anime_base.json` 最小结构（模式 B 自备扫描脚本的输出目标；模式 A 由 names_to_base.js 自动生成，无需关心）：

```json
{
  "<作品名>": {
    "title": "作品名", "folder": "作品名",
    "airdate": 1700000000000,
    "genres": ["类型标签"],
    "units": [{ "name": "本篇", "eps": 12, "airdate": 1700000000000 }],
    "cover": "cover.jpeg"
  }
}
```
> `cover` 为相对作品文件夹的封面路径（模式 B 靠 `config.json` 的 `vroot` 指向视频库根；脚本内是 `const VROOT = CFG.vroot`，**不要改脚本**）；`airdate` 为毫秒时间戳。

## 项目结构（在用户选定的项目根目录下）

```
<项目根>/
├─ names.txt                 模式 A：一行一部番剧名
├─ anime_base.json           构建输入（模式 B 扫描生成 / 模式 A 由 names_to_base.js 合成）
├─ anime_research/
│  ├─ <作品名>.json          每部一份调研成果（字段见下）
│  └─ covers/<作品名>.jpg    官方海报（AniList 等，下载后必须目视核对）
├─ fonts/                    LXGWWenKai-Regular.ttf / -Medium.ttf（OFL，自行下载）
└─ anime_build/              中间产物（HTML/PDF/_pagemap.json，脚本自动建）
```

## 调研 JSON 字段（anime_research/<作品名>.json）

```json
{
  "folder": "与收藏文件夹名一致",
  "title_zh": "中文名", "title_jp": "日文原名",
  "synopsis": "无剧透简介 300-500 字",
  "source": "原作情报（作者/连载平台/卷数/完结与否）",
  "update": "动画更新动态（标注'截至 YYYY-MM'）",
  "genres": ["类型标签 4-6 个"],
  "production": "动画制作：X；导演：Y；系列构成：Z；主要声优：角色·CV、角色·CV（结构化渲染自动解析）",
  "watch_order": "补番顺序（多季/剧场版/OVA 的先后与必看可跳过）",
  "music": "OP「曲名」（演唱）／ED「曲名」（演唱）（第1期）；OP「曲名」／ED「曲名」（第2期）",
  "platforms": "中国大陆：B站、爱奇艺；国际：Crunchyroll（只在有据可查时写）",
  "status": "第 3 期放送中；或 已完结 / 第 2 期制作决定（档期待定） / 剧场版 2026-10-16 上映在即",
  "quote": {"text": "代表作品气质的一句台词（避开关键剧透；不需要可省略）", "speaker": "说话角色"},
  "accent": "#e0407e",
  "franchise": [{"name": "剧场版 总集篇 前篇", "kind": "MOVIE", "year": "2015", "collected": true}],
  "units": [{"name": "第一季", "eps": 12, "airdate": 1700000000000}],
  "unit_synopses": [{"name": "第一季", "text": "100-250 字剧透简介：主线→转折→结局落点"}],
  "rating": [{"site": "bangumi", "score": 7.9}],
  "portrait": "covers/<作品名>-肖像.jpg",
  "cover": "covers/<作品名>.jpg"
}
```
- `units`：**模式 A 必填**（逐季/剧场版查证集数与首播，airdate 为毫秒时间戳）；模式 B 由扫描生成，research 里不用写
- `rating`：可选，有就渲染成评分行（Bangumi/TMDB 等）
- `unit_synopses[].name` 必须与 `units[].name` 逐字一致
- `music` / `platforms` / `status`：可选，缺失自动隐藏对应板块；**status 决定标题区徽章颜色**（含"已完结"=灰、"放送中"=绿、其它=琥珀）
- `quote`：可选，有就渲染成章节台词卡（大字居中记忆点）；直接给字符串或 `{text, speaker}` 结构均可
- `portrait`：可选，**章节页肖像**用的干净立绘（背景干净、正脸、安静）——与 `cover` 分开：封面要"有戏"（有环境/动态），章节肖像要"干净"。缺省回退用 `cover`
- `accent`：可选，6 位 hex，手动指定主题色；**缺省自动从该部封面提取主色**（全书明度统一），仅取色不满意时覆盖
- `franchise`：可选，该系列**全部条目**盘点（TV/剧场版/OVA/SP；`collected` 标是否已在收藏）——渲染「系列收录 M/N」与章末待补清单，数说页汇总待补数。条目名用官方译名，`kind` 取 TV/MOVIE/OVA/SP
- `production` 请尽量按"键：值；键：值……主要声优：角色·CV、…"格式写——渲染端会自动拆成结构化表格（格式不符则降级为整段文本，不会出错）
- 完整填写示例（含各字段的真实文风）见 `assets/research.template.json`——**写第一部作品的 JSON 前先读它**

## 执行流程

进度总览（每步完成后勾选，勿跳步）：

- [ ] ① 调研：`names.txt` → 每部一份 research JSON（含官方海报；并发 ≤2，一次 3-4 部省 token）
- [ ] ② 合成：`npm run base`（模式 A）
- [ ] ③ 构建：`npm run pipeline`（字体子集 + 两轮构建渲染 + 页码核对）
- [ ] ④ 验收：`npm run check`（自动断言）→ 全页目检（见下）→ 封面逐张目视核对
- [ ] ⑤ 交付：成品 PDF 覆盖到交付路径（只保留唯一一份）；**HTML 源一并保留**（`anime_build/番剧收藏简介.html`，用户可自行微调重渲）。**若用户只要成品 PDF**：可把 PDF 复制到项目根并清理 `anime_build/`、`anime_base.json`、`fonts/wk_*` 中间产物——但 `anime_research/`（调研成果+已核验图片，重做成本最高）与 `fonts/*.ttf`（重建必需，除非可从别处再取）必须保留

④ 全页目检的两种做法（按环境能力选择）：
- **默认做法（必做）**：`npm run sheet` 出联络表 → agent 亲自逐页读 `_sheets/`（或 `_allpages/`）的 PNG 核对：空白页 / 溢出 / 封面张冠李戴 / 乱码。逐页读图是硬要求，不能用脚本断言代替
- **可选增强**：若你的运行环境恰好另有视觉验收子代理（把页面 PNG 交给它返回逐页 pass/fail），可以接上做结构化验收——**它不是本 skill 的依赖**，没有就按上一条做，不影响交付

### 模式 A
1. 读 `names.txt`，派调研 agent（**并发 ≤2**）逐部产出 research JSON（文件名 = 作品名.json）+ 下载官方海报
2. `npm run base`（或 `node names_to_base.js`）合成 anime_base.json（脚本自动兜底：文件名与作品名对不上时按 folder/title 匹配）
3. 走下方「构建」

### 模式 B
1. 扫描视频库生成 anime_base.json（每部：folder/title/units[{name,eps,airdate}]/cover 指向 `_其他文件` 内封面）
2. 调研 agent 补 research JSON（production/watch_order/unit_synopses/cover 覆盖）
3. 走「构建」

### 构建（在 skill 的 `scripts/` 目录执行；首次先 `npm i`，再把 `config.example.json` 复制为 `config.json` 并把 `root` 改为你的项目根）

> `config.json` 是**本机配置，不入库**（含你的路径/书名，见 .gitignore）；仓库只提供 `config.example.json` 模板——**把文件夹拷给别人或上传前记得删掉它**（详见「素材与合规」末条）。可用字段：`root`（项目根）、`vroot`（模式 B 视频库根）、`domain`（anime/novel）、`title`（自定义书名，默认《番剧收藏简介》，影响封面/总览/封底显示，输出文件名不变）、`credits`（封底"资料来源"行，留空则用内置默认：公开资料整理 + 不指向具体站点的兜底表述）；改完照常 `npm run pipeline`（字体子集会自动收录新书名字符）

**一键（推荐）**：

```bash
npm run pipeline   # 字体子集 → 两轮「构建→渲染→页码反查」，一条命令跑完
npm run check      # 自动断言（产物完整性 / 页码全命中 / 无乱码字符）
npm run sheet      # 生成全页联络表（目检用）
npm run cards      # 导出收藏卡 PNG + 高清整页图（社交发图用，anime_build/_cards 与 _gallery）
npm run candidates -- <safebooru_tag>   # 候选图对比（**兜底渠道**：官方渠道找不到或需横向比较时才用；--pick <编号> 取图入库，渠道优先级见 references/image-selection.md）
```

**手动分步**（调试或理解原理时用，脚本都在同一目录）：

```bash
node collect_fonts.js      # ① 字体子集（大量新文案后必须重跑，防缺字；需 python -m fontTools.subset）
node build_anime_html.js   # ② 构建 HTML（第一轮；目录页码为占位符）
node render_pw.js          # ③ 渲染 PDF（写入书签）
node anime_pagemap.js      # ④ 从书签反查每部起始页 → _pagemap.json
# 回到 ② 再跑一轮（把真实页码印进目录）→ ③ → ④；两轮 pagemap 输出一致即稳定
```

## 数据核实方法（实测最顺的链路）

- **搜索优先走 tvly（Tavily CLI）**：Windows 先 `$env:PYTHONIOENCODING='utf-8'`（否则 `--json` 撞 GBK 编码直接失败），再 `tvly search "查询词" --json`；参数传递出问题时改走 stdin（`type q.txt | tvly search - --json`）。无需 API key 也能用（有速率上限，`tvly login` 解除）
- **一次拿全 OP/ED + 平台的姿势**：`tvly search "site:zh.wikipedia.org <作品名>" --max-results 1 --include-raw-content --json`——维基动画条目一页同含「主題歌」与「网络播放」两节，本地过滤关键词行即可。两个坑：① 本机直连 zh.wikipedia.org 常不通（curl 返回空），**必须走 tvly 服务端抓取**；② 曲名常挂在标题行的下一行（`片尾曲` ⏎ `: "曲名"`），过滤正则命中后要把「该行 + 后 1-2 行」一起取
- **AniList GraphQL**（封面/季集数）：curl 直接调，但搜索必须用罗马字/英文名并核对返回 title；**关联条目（尤其 relations 里的 MOVIE）的封面常比本篇条目更适合做册子封面**（本篇封面常是舞台远景/截图）
- 本机连不上的源（维基、bgm.tv 部分接口）：一律经 tvly 抓，别用 curl 硬顶

## 质检铁律（不可省略）

1. **封面必须亲眼看**：下载的每张图用多模态读图确认"确实是这部/这个角色、构图像样、不是截图充数"。名字搜索必串味（Hades→Hades II、按 id 猜更糟），必须核对返回的 title 字段
2. **选图审美：有戏 > 清晰**（用户实测教训）：封面要**有环境、有动态、构图完整**的氛围图；章节肖像（`portrait`）要**背景干净的正脸立绘**——两者审美相反，有条件的作品分开给。完整标准（要什么/避什么/来源优先级/候选工作流）见 `references/image-selection.md`
3. **主题色自动取自封面**：构建脚本从每部封面提取主导色相自动生成主题色（明度全书统一，与海报天然同调）；取色不满意时用 research 的 `accent` 字段手动覆盖（如粉调海报取色发灰时指定 #e0407e）——交付前目检一眼各章刊头条与封面是否「色调打架」
4. **全页联络表目检**：整本 PDF 渲小图拼 4×5 网格逐张看（scripts/contact_sheet.js），抓空白页/溢出/乱码
5. **不编造**：声优、集数、成就、日期查不到就写"未核实/以官网为准"
6. 数值断言能复算就复算（agent 报的统计数字要抽验）
7. **发册前做时效复核**：用 tvly 把每部的最新动态（续作官宣/定档/上映日/放送进度）过一遍——"截至 YYYY-MM"写旧的册子一眼就显得没维护；在播作品的 status 徽章尤其容易过期
8. 改版/删内容前备份成品

## 素材与合规（交付前必读）

不是"建议"，是交付门槛。**封底自动输出的两行声明（资料来源 / 非官方粉丝作品 · 仅供个人收藏）不要删**，由 build 脚本写入，不依赖使用者是否填 `credits`。

- **只做个人收藏**：海报、立绘、截图的版权属原作者与各制作委员会。个人自用通常可以；**公开发布（发群、上传平台、印制售卖）必须自行取得授权**——注明来源不能替代授权
- **文字必须重写**：`synopsis` / `unit_synopses` / `watch_order` 一律自己组织语言，**不得逐句搬运**维基百科、萌娘百科、官网原文（事实不受保护，但表述受 CC BY-SA 一类许可约束）。写完抽一句回搜，命中原文就改
- **只用全年龄素材**：命中 R-18 / 擦边 / 性化未成年角色的素材**一律弃用换源**（`npm run candidates` 已在查询里排除 explicit/questionable，但那只是兜底，最终以目视为准）。这类内容的法律后果是刑事级的，远重于版权
- **不用同人图**（授权链条不清、质量不可控）、**不收录真人素材**（声优照片等涉及肖像权）
- **不伪装官方**：封面不用官方 logo，不写"官方/正版"，封底的「非官方粉丝作品」声明保留
- **字体署名保留**：霞鹜文楷 SIL OFL 1.1 要求版权声明随字体分发，封底那行不是可选装饰
- **取图走官方渠道优先**：动画官网/官方 X/发行方/原作出版社 → AniList / Bangumi 条目图 → safebooru **仅作候选对比兜底**（选中后尽量回溯官方原图）。顺序与理由见 `references/image-selection.md`
- **外发前清理（隐私）**：把项目文件夹拷给别人或上传网盘前，删掉 `scripts/config.json`（含你的本机绝对路径）、`names.txt`（你的片单＝观看偏好）、`anime_research/`（调研稿与已下载图片）。仓库不含这些（见 `.gitignore`），但**手动拷贝文件夹时会一起带走**

## 环境依赖

- **操作系统**：脚本按 **Windows** 优先编写（cmd/字符编码处理）；macOS/Linux 下核心流程可用（python 已自动探测 python3），但类模式 B 的 Windows 专属步骤（文件图标/桌面集成）需自行适配
- Node.js ≥20；npm 包：playwright（+`npx playwright install chromium`，失败回退 `channel:'msedge'`）、pdfjs-dist（legacy）、@napi-rs/canvas —— 在 `scripts/` 目录执行 `npm i`
- Python 3 + `pip install fonttools brotli`（字体子集；脚本自动探测 python3/python）
- **联网工具**：`tvly`（Tavily CLI；Windows 必须 `PYTHONIOENCODING=utf-8` 才用得了 `--json`，无需 API key 也可跑但有限速，`tvly login` 解除）与 `curl`（`fetch_candidates.js` 抓候选图、AniList GraphQL 都用它）——两者都不随本包提供，也没内置失败兜底，取数失败先确认它们可用
- 字体：霞鹜文楷 LXGW WenKai（SIL OFL 1.1，© LXGW ｜ © The Klee Project Authors，基于 FONTWORKS「Klee One」衍生；GitHub Releases 下 Regular/Medium TTF 放 `<项目根>/fonts/`）。**成品会内嵌字体子集，封底自动附版权署名——不要删**（OFL 要求版权声明随字体软件分发）
- **agent 能力要求**：文件读写 + Shell 执行 + 联网搜索 + **多模态读图**（封面目检必需）；任何满足这四点的 agent（Claude Code / ZCode / Cursor agent 等）均可运行，无厂商绑定
- 模式 B 另需 ffmpeg（视频抽帧补封面）；Windows 下 ffmpeg 中文路径要用 ASCII 临时目录中转

## 详细版

完整踩坑清单（13 条）、Tavily/AniList/VNDB/Steam 数据源用法、pdf-lib 页脚盖章（进阶·需自行 `npm i pdf-lib`，默认页脚页码由 Chromium 的 `footerTemplate` 出）、模式 B 的文件整理约定，见 `references/pipeline.md`。
