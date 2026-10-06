# Changelog

## 1.4.9

按高星 skill（[anthropics/skills](https://github.com/anthropics/skills)、[mattpocock/Skills](https://github.com/mattpocock/Skills)、[tt-a1i/archify](https://github.com/tt-a1i/archify)）的共性做法做的五处改进：

- **README 新增「为什么做它（四个踩过的坑）」**：把功能清单换成失败模式——① 目录页码手工排一定会错 → 两轮渲染 + 页码反查 + 收敛断言；② 中文字体直嵌会缺字/体积失控 → 字体子集内嵌 + OFL 署名；③ 海报极易张冠李戴 → 官方渠道优先 + 逐张目检 + 来源台账；④ 版权与隐私翻车都在看不见的地方 → 封底默认声明 + 外发清理清单。**"没有它会怎样"比功能列表有说服力**
- **README 安装矩阵补 DSH 一行**：`~/.dsh/skills/` **或** `~/.agents/skills/`（DSH 两个都读），并写明警告——同一个 skill 两处都放会重复加载、互相抢触发（实测结论）
- **README 新增「适用范围与边界」**：显式的"故意不做"清单（tracker / 媒体库刮削 / 格式转换 / 正文写作 / 替用户判断授权 / 在线托管），并给出规模提示（5-20 部体验最好）
- **`pack.js` 改为原子交付**：先全部写进 `_deliver.tmp/` → 交付前校验（PDF 存在且体积一致、交付说明与打包标记可解析）→ 通过才 `rename` 替换 `_deliver/`，失败**保留上一版**并回滚；同时引入稳定失败码 `[P1]`–`[P8]`。此前是直接往 `_deliver/` 写，中途失败会留下半成品
- **`check` / `audit` 输出稳定错误码**：`[C1]`–`[C13]`（产物断言）与 `[A1]`–`[A10]`（数据完备度），并在 `evals/README.md` 附**错误码表**（含每个码的修法）。编号只增不改，便于在 issue 与对话里直接指认
- 新增 **`template/SKILL.md`**：可复制的最小 skill 骨架（仿官方 template），附四条写 skill 的经验（入口 ≤10 KB、description 是触发词、同一份内容只放一处、把"每次都会错"的环节变成断言）
- 修复：`evals/README.md` 的断言条数漏改为 13（1.4.6 那批只改了描述行）

> 借鉴清单与出处见 README；未采纳的部分：badges / 多语言 README / skills.sh 分发属于推广面，与实现无关。

## 1.4.8

- 结构（重要）：**`SKILL.md` 从 20.4 KB / 194 行瘦到 9.7 KB / 112 行**（−53%）。入口只留**执行流程 + 质检铁律 + 最硬的坑位 + 路由表**，细节拆成按需读的 reference —— 此前每次触发都要把 20 KB 全量吃进上下文（约 6-7k token），而多数场景用不到字段表和构建细节。这正是本仓库另一个 skill（`my-pc`：1.8 KB 入口 + 4 份 reference）已经在用的形态
- 新增 `references/fields.md`（调研 JSON 字段表与逐字段说明）· `references/build.md`（config 字段、全部命令、验收与交付规矩）· `references/compliance.md`（版权与隐私、来源台账用法、外发清理清单）
- 主文件新增「**先读哪份文档**」路由表：按当前要做的事指到对应 reference，减少无效读取
- 新增 `npm run pack`（`scripts/pack.js`）—— **一键交付**：把成品 PDF、HTML 源、分享卡、高清整页图、来源台账，连同一份**自动生成的交付说明**（作品数/页数/文件清单/收录作品/台账摘要/版权提醒）归拢到 `<项目根>/_deliver/`。此前这套动作散在 SKILL.md 第⑤步里靠人工搬
  - 安全策略：只清理"上一次 pack 留下的目录"（靠 `.pack-manifest.json` 识别），别的目录一律拒绝覆盖，除非显式 `--force`
  - `--no-gallery` 可不带体积较大的高清整页图；结束时会提醒"别把 `config.json`/`names.txt`/`anime_research/` 一起带出去"
- README 增加「文档分级」一节，说明每份 reference 什么时候读；脚本表补 `pack.js`

## 1.4.7

- 新增 `npm run doctor` —— **环境自检**：node 版本 / config 与项目根可写 / 两个 TTF / 字体子集 / Python+fontTools+brotli / Playwright Chromium 或系统 Edge / curl / tvly（Windows 上还会提醒 `PYTHONIOENCODING`）/ `--net` 顺带探 AniList、safebooru、维基连通性。此前环境问题都要"跑到第几步才炸"，用户第一次用往往就死在这里
- 新增 `npm run audit` —— **数据完备度审计**（`evals/audit.js`）：逐个作品列出缺必填 / 还是"未核实" / 建议补哪些字段 / 封面与肖像文件是否存在 / `unit_synopses` 与 `units` 是否逐字对齐 / 简介字数 / `production` 是否会被降级成整段文本。`check` 只看"产物在不在、页码对不对"，**看不了"内容残不残"**——这是此前最大的验收盲区
- 新增 `npm run sources` —— **素材来源台账**：`sources.js` + `_ledger.js` 记录每张图的「渠道 + 出处 URL + 取得日期」，交付时导出 `anime_build/_sources.md`。`--pick` 会自动记一条图库来源，官方渠道取的图用 `sources add` 手工记。**把合规从"文档里写一句仅个人收藏"变成流水线自动产出的自证材料**——公开分享或被人质疑时能拿出处
- `fetch_candidates.js --pick` 增加 `--as <作品名>`，让取图来源能归属到具体作品
- 文档：SKILL.md 执行流程加 ⓪ 自检步骤、验收步骤改为 `audit → check → 目检`；一键命令块补三条；README 快速开始与脚本表同步；`evals/README` 增加「数据完备度审计」一节；`image-selection.md` 工作流补"记来源"步骤

## 1.4.6

- 技术债（速度）：`fetch_candidates.js` 的候选图**改为并发下载**（上限 4），`--pick` 收尾时删掉中间文件 `download.tmp`。原实现是 12 张逐张 `execFileSync` 同步下载、单张最长 90s，最坏要十几分钟且全程阻塞；顺带把"0 结果"的提示从「无候选（标签拼写？）」改成同时提示标签拼写**与网络可达性**（curl 的连接错误会被 `-s` 吞掉，容易把网络问题误诊成标签写错）
- 技术债（脏状态）：`collect_fonts.js` 的字体子集**改为先写 `.tmp` 再原子替换**——此前中途中断会留半截 `wk-sub-*.woff2`，而构建会照样把它 base64 内嵌进 HTML，`check` 只查 U+FFFD 也发现不了"字体静默回退"。另：源 TTF 缺失时先给中文提示（此前是 fontTools 抛一堆看不懂的错）
- 技术债（验收，重要）：`evals/check.js` 新增第 ⑦ 条断言「**两轮页码一致（已收敛）**」。原先只比"目录页码 vs 本轮 `_pagemap.json`"，而两者都是**同一轮**产物 → 页码漂移时会**错得一致而静默通过**。现在 `anime_pagemap.js` 每轮把上一轮映射存成 `_pagemap.prev.json`，断言两轮逐部相同；单轮产物会明确报缺失。**断言总数 12 → 13**，README / CONTRIBUTING / PR 模板 / evals/README 同步
- 修复：`build_anime_html.js` 的 `NOW` 从 UTC 改为**本地时区**——跨月跑两轮时 UTC 会让刊头月份不同，给"两轮一致"白添漂移源
- 验证：fixture 跑满两轮 + `npm run check` **13/13**；负向测试（人为篡改 `_pagemap.prev.json` 的一页 → 第 ⑦ 条必须失败）；`npm run candidates` 实跑（12 张并发下载）

## 1.4.5

- 合规（重要）：成品封底现在**默认自带两行声明**——「资料来源：公开资料整理（AniList / Bangumi / 维基百科等），文字为重新撰写」+「**非官方粉丝作品 · 仅供个人收藏** · 海报/立绘版权归原作者与制作委员会所有 · 请勿售卖或公开传播」。此前 `credits` 是纯可选项、默认留空，等于分发出去的册子**零署名**；现由 `DEFAULT_CREDITS` 兜底，填了 `credits` 仍可覆盖
- 合规：`npm run candidates` 的 safebooru 查询新增 **`-rating:explicit -rating:questionable`** 硬过滤（实测结果集不缩水）。涉未成年角色的性化素材在多国属刑事问题，风险远重于版权，不能只靠口头约定
- 文档：`SKILL.md` 新增「**素材与合规（交付前必读）**」小节——只做个人收藏 / 文字不得逐句搬运百科原文（表述受 CC BY-SA 约束）/ 只用全年龄素材 / 不用同人图与真人素材 / 不伪装官方 / 保留字体署名 / **外发前删 `config.json`、`names.txt`、`anime_research/`**。此前的合规声明只在 README 里，而实际执行的是读 SKILL.md 的 agent
- 文档：README 补「隐私：外发前请清理」表格（说明这三样不在版本库里，但手动拷文件夹会一起带走），并如实标注：**实测成品 HTML 与 PDF 正文及元数据均不含本机路径或用户名**；`references/image-selection.md` 增加「法律红线」一节
- 合规：`assets/names.txt` 示例名单改用虚构作品（此前仍是真实在播作品名，1.4.3 的素材合规扫尾漏网）
- 配置：`config.example.json` 补 `credits` 字段（留空即用内置默认）
- 文档：取图渠道明确**官方渠道优先**（动画官网/官方 X/发行方/原作出版社 → AniList、Bangumi 条目图 → safebooru 仅作候选对比兜底）；`references/image-selection.md` 的「来源优先级」拆成"先定渠道、再定素材"两段，工作流注明前提（官方找不到才走候选流）与"选中后回溯官方原图"
- 修复（取数，实测）：文档原先承诺"维基动画条目一页同含「主題歌」与「网络播放」两节，过滤关键词即可"——**不成立**。实测《葬送的芙莉莲》条目里这两个词根本不存在，音乐/平台信息在 `## 电视动画` 小节内、用「片头曲/片尾曲/放送」等词；且**同一条查询两次返回的正文长度差 3 倍**（28,328 vs 87,436 字符），偏短时完全没覆盖到目标小节。现改为"**先验证目标信息在场再解析；没命中就换更具体的查询或拆两次抓；不许静默跳过字段**"，并把 Windows 下 tvly 的写法（`PYTHONIOENCODING=utf-8` + 中文可直传）同步到 `pipeline.md`（此前只在 SKILL.md 修过）
- 文档：`SKILL.md` 模式 B 里的 `` `_其他文件` `` 明确为**示例约定**（你的视频库叫什么就填什么，`cover` 只需是相对作品文件夹的路径），此前全书未定义，等于让人猜
- 仓库：新增 `.gitattributes`（统一 LF，消除 Windows 检出后的 CRLF 噪音）与 `SECURITY.md`（报告渠道 + 本项目实在的威胁面与隐私边界：无服务端、无遥测，联网仅 tvly / AniList / safebooru 三处）

## 1.4.4

- 修复：`fetch_candidates.js` 的 `--pick` 入库入口引用**未定义变量 `COVERS`**，取图必崩（SKILL.md 与 1.4.0 都把它当用法宣传，实际最后一跳是断的）
- 修复：`evals/check.js` 的封面断言形同虚设——缺失封面只写进 `detail`，而 `detail` 只在断言失败时打印，缺封面的部又不计入分母，于是恒真；`catch { continue }` 还会把解析失败的 research 当成"没这部"。现改为**逐部断言 `anime_build/covers/showNN.jpg` 真实存在**、异常清单无条件打印、解析失败计入失败
- 修复：`anime_pagemap.js` 未命中书签时设 `exitCode = 3`，会掐断 `npm run pipeline` 的 `&&` 链——第二轮 build/render 不执行、目录页码永远停在占位符 `·`。现改为**告警后继续跑完两轮**，由 `npm run check` 把缺失报成失败（与 pipeline.md「两轮一致」的设计对齐）
- 修复：`build_anime_html.js` 对 `rating` / `unit_synopses` / `units` / `genres` 直接 `.filter/.find`，调研 JSON 写出非数组（如 `"rating": 8.5`）即抛 `TypeError` 中断整本构建；统一加数组兜底。同时让评分支持 **research 的 `rating`**（此前只读 base，模式 B 自备扫描脚本时评分会静默消失）
- 修复：`render_pw.js` 的 `browser.newPage()` 在 try/finally 之外（失败漏关浏览器）、msedge 兜底再失败时抛未处理 rejection 绕过友好报错；`contact_sheet.js` 缺 PDF 时抛原始 ENOENT 堆栈（其余脚本都有中文提示）；`export_cards.js` 异常路径不收尾浏览器
- 修复：`config.json` 缺失或解析失败时 9 个脚本静默回退到 `C:\anime-book`，报错指向错误方向（"未找到 anime_base.json"）；现统一提示「请复制 `config.example.json` 为 `config.json` 并改 root」
- 文档：`pipeline.md` 的 AniList 查询字段 `seasons` **在 AniList 不存在**（照抄必 HTTP 400，实测应为 `season seasonYear`）；pdf-lib 一节标注「未随包，需自行 `npm i pdf-lib`」并说明默认页脚由 Chromium `footerTemplate` 产出；删掉 pipeline.md 里并不存在的「调研 agent prompt 模板」承诺；`VROOT` 改为说明读 `config.json` 的 `vroot`（不要改脚本）；`pdf:visual-judge` 从「优先路径」降级为「可选增强」；tvly 的 Windows GBK 编码坑与 `PYTHONIOENCODING=utf-8` 写法补入（实测 `--json` 在 GBK 控制台必失败），并在「环境依赖」补上 tvly / curl
- 文档：`evals/README.md` 修正成品页数（实测 7 页，原文一处写 3-4 页与表格自相矛盾）、fixture 描述（最小样例没有 `unit_synopses`；novel 第二个样例并非"仅必填"）、复现步骤补 Windows 写法
- 修复：`package-lock.json` 根 `version` 停在 `1.0.0`；CI 新增**版本号 5 处一致**校验，防止 frontmatter 再次漏更
- 合规：`assets/research.template.json`（"写第一部前先读"的模板）此前整份使用**真实在播作品**的剧情与声优表，与 1.4.3「仓库内零第三方作品素材」不一致；现改用虚构演示作品
- 仓库：`.gitignore` 修正层级错误（`/_allpages/`、`/_sheets/` 实际在 `anime_build/` 下）并忽略字体子集中间产物 `fonts/wk_*`

## 1.4.3

- 展示素材合规化：预览图与截图全部改用**虚构演示作品**（evals/fixture + 程序生成的占位封面）重渲，仓库内零第三方作品素材
- 新增：README「关于素材版权」节——说明海报需使用者自备、成品仅供个人收藏、公开传播需自行评估授权
- 新增：fixture 补两张程序生成的占位封面（预览图可复现，同时覆盖封面渲染路径）
- 修复：`SKILL.md` frontmatter 的 `metadata.version` 自 1.4.0 起**漏更**（一直停在 1.3.0），现与 `marketplace.json` / `plugin.json` / `scripts/package.json` 四处对齐为 1.4.3

## 1.4.2

- 修复（合规）：成品内嵌霞鹜文楷子集，但此前**没有任何字体版权署名**——OFL 1.1 要求版权声明随字体软件分发。现封底**自动附完整署名**（© LXGW ｜ © The Klee Project Authors，基于 FONTWORKS「Klee One」衍生）
- 修复：README 许可节原写「版权归其作者」，**漏了上游 Klee Project Authors**（霞鹜文楷是二创字体）；同时补充「不得单独售卖 / 保留名」等 OFL 注意事项
- 文档：SKILL.md 与 collect_fonts 的字体说明同步补全版权链，并注明封底署名不要删

## 1.4.1

- 新增：**`extra` 补记卡**（可选 `{title, text}`）——装载彩蛋/考证/补注一类补充内容，渲染为章内卡片
- 新增：**`config.json` 的 `credits` 字段**——封底显示资料来源/版权署名（使用第三方资料时注明出处）
- 修复：无 `units` 的条目不再渲染只有表头的空「出场详情」表
- 实战首用：小说模式角色档案从 4 人扩到 10 人（含逐条补记卡）——书从 12 页增到 18 页

## 1.4.0

- 新增：**选图审美标准文档** `references/image-selection.md`——核心「有戏 > 清晰」：封面要氛围（有环境/动态/构图完整），章节肖像要干净（正脸/安静/清晰）；含要什么/避什么/来源优先级/禁止项
- 新增：**`portrait` 字段**（可选）——章节页肖像与封面图分离：封面用氛围图、章节用干净立绘；缺省回退 `cover`
- 新增：**候选图工作流固化** `npm run candidates -- <tag>`——自动抓 safebooru official_art 候选、按"非白底比例"打分排序、出 3:4 瓦片对比图；`--pick <编号>` 取图入库（真 JPEG q92，可选 `--keep-top` 裁宣传区）
- 文档：SKILL.md 质检铁律 #1/#2 重写为选图审美标准；执行流程与字段表同步

## 1.3.5

- 新增：封面瓦片**主题色渲染**——每格按其角色主题色做 multiply 叠加，白底立绘被"洗"成淡彩面板（附底部渐深层次），整版不再是白块；同时保留底色下划线
- 重构：**`config.json` 移出版本管理**（属于使用者本机配置）——仓库只提供 `config.example.json` 模板，`.gitignore` 已加规则；新装用户按 SKILL.md 复制模板即可
- 文档：SKILL.md 初始化说明改为「复制 config.example.json 为 config.json」

## 1.3.4

- 修复：collect_fonts 脚本缺 anime_base.json 时给出中文下一步指引（此前裸抛 ENOENT 堆栈——novel 实战清理中间产物后重跑时踩到）

## 1.3.3

- 修复：封面网格列数按封面数量自适应——4 张封面改为 2×2 大图布局（原 3 列会留 2 个空位），1 张居中放大，2 张双列，其余 3 列；双列网格限宽防溢出到第二页
- 修复：仓库内 config.json 恢复为默认值

## 1.3.2

- 修复：分享卡金句过长时压进底栏/裁掉说话人——卡片改 flex 流式布局（正文区自动裁剪、底栏归位），金句限两行
- 实测来源：小说模式 4 角色档案册实战首跑

## 1.3.1

- 修复（novel）：状态徽章只识别「放送中」，导致 novel 模式的「连载中」永远染琥珀、数说页「完结/连载中」恒为 0——现「连载中」正确显示绿色并计入统计
- 打磨：novel 统计卡标签「篇 篇章」→「篇章」；`names_to_base.js` 缺名单报错文案领域中立（提示番剧名或角色名）
- 更新：marketplace 与 plugin 清单描述升级为双领域（收藏册 + 设定集）
- 新增：`evals/fixture-novel/`——novel 领域的可复现数据集（2 个虚构角色，含全回收伏笔表），并补自测说明
- 补测：此前未实测的两条路径现已过真实渲染——>8 年时间轴紧凑模式（10 角色 × 10 年份）与伏笔「全回收 ✓」路径（章末卡 + 数说页）

## 1.3.0

- 新增：**领域包结构**——`config.json` 新增 `"domain"` 字段（`anime` 默认 / `novel`），同一引擎服务两个场景，界面标签整体查表切换（部/集/首播/系列收录 ↔ 位/章/初登场/伏笔回收），数据字段结构完全不变
- novel 领域包：每"部"=一个角色/势力；`units`=登场卷篇（eps=章数）、`franchise`=伏笔表（collected=已回收）、`production`=设定要点、`quote`=角色金句；**全程离线**（无联网调研环节）
- 新文档：`references/domain-novel.md`（字段映射、工作流、读者版脱敏技巧）
- SKILL.md description 升级为双场景触发；README 增加领域包说明
- 兼容性说明：不配置 `domain` 时行为与 1.2.0 完全一致

## 1.2.0

- 新增：**系列完整度审计**——research JSON 可选 `franchise` 字段（该系列全部条目盘点 + collected 标记），渲染刊头「系列收录 M/N」、章末待补清单（或「已收全 ✓」），数说页汇总「待补条目」
- 新增：**收藏卡导出**——构建产出独立 `share_cards.html`，`npm run cards` 对每张 750×1000 竖版卡截图成 PNG（deviceScaleFactor 2），同时导出高清整页图 `_gallery/`
- 加固：时间轴年份多时逐级收紧（>8 年缩字号，>14 年只留年份点），不再随收藏规模挤爆版面
- 加固：收藏详情表「单元」列宽按最长名字自适应（26–48mm，ASCII 半宽折算），长单元名不再硬折；表格单元格补 `overflow-wrap`
- 新脚本 `export_cards.js`；`npm run cards`；文档与 fixture 同步

## 1.1.0

- 新增：**封面页**——海报拼贴墙（最多 9 张，每张衬该作主题色底边）+ 大字书名 + 跨度/部数/集数 + 版本行
- 新增：**封底页**——淡色大「完」字收尾 + 书名/统计/生成署名（杂志版权页风格）
- 新增：`config.json` 可选 `title` 字段——自定义书名（默认《番剧收藏简介》），影响封面/总览/封底显示；字体子集自动收录新书名字符（防方块字）
- 重构：「书名硬编码 4 处」收口为 `BOOK_TITLE` 一处定义；输出文件名保持不变
- 新增：`npm run check` 第 12 条断言「封面封底页已生成」

## 1.0.3

- 新增：**封面自动取色**——构建时从每部封面提取主导色相自动生成该章主题色（饱和度加权、去黑白灰、全书明度统一）；`ACCENTS` 硬编码色表移除，`research.accent` 字段可手动覆盖
- 新增：**台词卡**——research JSON 可选 `quote` 字段（字符串或 `{text, speaker}`），章节刊头下方渲染大字居中台词（主题色引号）
- 新增：**数说收藏页**——总览之后的 Wrapped 式大数字统计页：收藏总量 / 收录跨度 / 最长系列（用该作主题色）/ 最高频类型 / 年代分布条形 / 完结与放送中盘点
- 变更：`build_anime_html.js` 组装段改 async（取色需解码图片），对命令行用法无影响
- 文档：SKILL.md 字段表与质检铁律 #3、README、fixture（星海旅人含台词）同步更新

## 1.0.2

- 修复（重要）：**数据类型漂移防御**——调研 JSON 的 `eps`/`airdate` 若为字符串（LLM 产出常见），原版统计会变字符串拼接（实测产出「共 012161212 集」）、字符串时间戳会让构建直接崩溃。现在 `names_to_base.js` 合成时归一化 + `build_anime_html.js` 读入后再兜底（数值/ISO 日期字符串均兼容）
- 修复：`build_anime_html.js` / `anime_pagemap.js` 缺 base.json/字体子集/PDF 时给出中文下一步指引（原先裸抛 ENOENT 堆栈）
- 新增：`npm run check` 第 11 条断言「目录页码与最终书签一致」——把「两轮渲染稳定」从人工比对变成机器断言
- 加固：`esc()` 补双引号转义（字段将来挪进 HTML 属性也不会破）
- 清理：移除未使用的 `--ac-rule` CSS 变量
- 规范：SKILL.md frontmatter 按 [Agent Skills 规范](https://agentskills.io/specification)补齐可选字段 `license` / `compatibility` / `metadata`（author+version）；`skills-ref validate` 零错误

## 1.0.1

- 修复：章节刊头年份原为硬编码 `2026`，改为动态 `${NOW}`（总览页与各章一致，跨年不再显示旧年份）
- 修复：`rating` 条目漏写 `site` 字段时不再抛错（原 `x.site.toUpperCase()` 会中断整个构建）
- 修复：状态徽章「未完结」不再被误判为已完结（`stClass` 加负向后顾，仅「已完结/完结/完结篇」染灰）
- 修复：年份计算统一为 UTC 口径（`getUTCFullYear`），消除与 `fmtDate` 的时区口径不一致
- 修复：`anime_pagemap.js` / `contact_sheet.js` 改用动态 `import()` 加载 pdfjs-dist 的 `.mjs`，兼容全部 Node ≥20（原 `require(ESM)` 需 20.19+/22.12+）
- 修复：`render_pw.js` 改用 `url.pathToFileURL()` 生成 `file://` 地址，避免 macOS/Linux 下多一个斜杠
- 修复：封面复制失败时打印告警（原先静默返回空）
- 修复：README 中 `references/pipeline.md` 链接指向修正（原相对路径从仓库根解析会 404）
- 元数据：`marketplace.json` 的 `owner.name` 与两个 `plugin.json` 的 `author.name` 改为 `123ccw`；LICENSE 补版权人署名

## 1.0.0

- 首个公开版：模式 A（报菜名：名单 → 全自动调研 → 杂志风 PDF）与模式 B（本机收藏库，进阶）
- 排版：总览统计卡 + 年份时间轴 + 带页码可点击目录；每部主题色章节（官方海报 / 无剧透简介 / 结构化制作表 / 主题歌与观看平台 / 补番顺序 / 逐季剧透表 / 状态徽章）
- 工程：中文字体子集防缺字（含 build 脚本文案兜底）、两轮渲染定页码（`npm run pipeline` 一键跑完）、config.json 统一配置、缺文件中文提示
