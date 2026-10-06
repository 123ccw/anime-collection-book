# evals —— 怎么验证这套管线是好的

## 一键验收（日常）

跑完 `npm run pipeline` 后执行：

```bash
npm run check
```

断言产物完整性：base 可解析、每部有调研稿、HTML/PDF 已生成、**无乱码方块字**、封面逐部真实落盘、页码映射全命中、**目录页码与最终书签一致**、**两轮页码一致（已收敛）**。任何一条失败都会给出排查方向。

> 「两轮页码一致」比的是 `_pagemap.prev.json`（上一轮）与 `_pagemap.json`（本轮）——只比"目录 vs 本轮映射"是自证的（两者同轮），查不出漂移。这个断言要求用 `npm run pipeline` 跑满两轮，单轮产物会直接报缺失。

## 数据完备度审计（建议性，不阻断交付）

```bash
npm run audit
```

`check` 只管"产物在不在、页码对不对"，**不管内容残不残**：一部作品少了 `music` / `platforms` / `unit_synopses`，或者八个字段全写着"未核实"，`check` 照样全绿——你拿到的是"技术上合格、内容上残缺"的册子。

`audit` 逐个作品列出：**缺必填**（synopsis / source / genres / production / cover）· **还是占位或未核实** · **建议补**（music / platforms / status / watch_order / unit_synopses / rating）· 封面与肖像文件是否真实存在 · `unit_synopses` 与 `units` 名字是否逐字对齐 · 简介字数是否落在 300-500 字 · `production` 是否会被降级成整段文本。最后给"建议先补这几部"。

**渲染前跑一次最划算**——改 JSON 比重渲整本便宜得多。它退出码非 0 只表示"有硬问题"（缺调研稿 / 坏 JSON / 缺必填 / 剧透表不对齐），不代表交付失败。

## 验收收据（check / audit 每次运行都会写）

两个脚本都会把结构化收据写进 `anime_build/`：

| 收据 | 内容 |
| --- | --- |
| `_check.json` | 13 条断言逐条结果、`exitCode`、被检查产物的 sha256 前 16 位 |
| `_audit.json` | 每部状态汇总（`complete` / `soft` / `hard` / `missing` / `broken`）、`needFix` |
| `receipts/<作品名>.json` | **每部一份**：状态 + 调研稿哈希 + 缺哪些字段 + 问题清单 |

它们的用途有两个：

1. **`npm run pack` 会读前两份**，在交付说明里生成「核验状态」表（见 `references/build.md`）。收据缺失、或成品比收据新（改完重渲没重跑 `check`）时，表上标 `⚠ 过期/无收据`——这是防"check 全绿"被当成"全书已核验"的机制。
2. **做多部作品时，`receipts/` 就是可续跑清单**：中断后只挑 `hard` 与 `missing` 重做，不用重新扫全书。派子代理的契约见 `references/research-contract.md`。

## CI 跑的是**真流程**（不只是语法检查）

`.github/workflows/ci.yml` 的 fixture job 会：程序生成两枚极小测试字体（`make_smoke_font.py`，无需下载霞鹜文楷）→ 跑满两轮 `pipeline` → `check` → 三条负向测试（封面缺失必须报 `[C7]`、页码漂移必须报 `[C12]`、交付说明必须如实标注未核验）。

为什么值得单独建一条流水线：1.4.4 修掉的那批真 bug（`COVERS` 未定义、封面断言恒真、pagemap 掐断 `&&` 链）`node --check` 一条都抓不到。

## 从零复现（完整自测）

`fixture/` 是一份**可复现的最小数据集**（2 部虚构作品：一部全字段、一部仅必填），用来验证"从零开始能不能跑通"。其中 `anime_research/covers/` 的两张封面是**程序生成的占位图**（`docs/preview-*.png` 即由这份数据渲染）——仓库不含任何第三方作品素材。

`fixture-novel/` 是 **novel 领域包**的对应数据集（2 个虚构角色：**沈观澜** 含 franchise 伏笔表与 watch_order，**白鹭洲** 只给到 status/quote/accent/rating 一类常规可选字段）——验证标签切换与伏笔渲染。

```bash
# 1. 建一个临时项目根（路径任意），把 fixture 内容拷进去，再把字体放进该根的 fonts/
#    （fixture 不含字体，这步不能省）
#    Windows: robocopy fixture "%TEMP%\anime-eval" /E
#    POSIX  : mkdir -p /tmp/anime-eval && cp -r fixture/* /tmp/anime-eval/
#
#    A. 有霞鹜文楷：把 LXGWWenKai-Regular.ttf / -Medium.ttf 放进 <根>/fonts/
#    B. 没有（CI / 离线自测）：用程序生成测试字体，然后用环境变量指过去——
#       python evals/make_smoke_font.py /tmp/anime-eval/fonts
#       export ANIME_BOOK_FONT_REGULAR=/tmp/anime-eval/fonts/Smoke-Regular.ttf
#       export ANIME_BOOK_FONT_MEDIUM=/tmp/anime-eval/fonts/Smoke-Medium.ttf

# 2. 用环境变量把 root 指到该目录（不必改 config.json），然后：
export ANIME_BOOK_ROOT=/tmp/anime-eval
npm run base && npm run pipeline && npm run check

# 3. 预期：pipeline 两轮页码一致；check 全绿（13 条）；成品 PDF 共 7 页（实测）
#    注意：测试字体的字形是方块占位、字宽与真字体不同，页数可能与正式字体不一致；
#    check 关心的是"两轮是否收敛、封面是否落盘"，与字体无关。
```

> `ANIME_BOOK_ROOT` / `ANIME_BOOK_FONT_REGULAR` / `ANIME_BOOK_FONT_MEDIUM` / `ANIME_BOOK_DOMAIN` / `ANIME_BOOK_TITLE`
> 都由 `scripts/_config.js` 统一读取，优先级高于 `config.json`——CI 与临时自测靠它避免改坏本机配置。
>
> **测试字体只能用于自测**：字形是程序生成的占位轮廓，不能拿来做成品。

> novel 自测：同样步骤换 `fixture-novel/`，且 config.json 需加 `"domain": "novel"` 与 `"title"`。预期：全部标签为角色/篇/章/伏笔回收；「连载中」状态徽章为绿色；沈观澜章末出现「伏笔回收 2/2 ——已全部回收 ✓」。

## 期望结果（fixture）

| 检查项 | 期望 |
|---|---|
| `npm run pipeline` | 两轮页码一致，无 ⚠ 警告（「星海旅人」的 unit_synopses name 与 units 逐字对齐；「测试小作品」未给 unit_synopses，故不触发缺文案告警） |
| `npm run check` | 全部通过（13 条断言） |
| 成品页数 | 7 页（实测：封面 1 + 总览 1 + 数说收藏 1 + 星海旅人 2 + 测试小作品 1 + 封底 1） |
| 特殊路径覆盖 | 「测试小作品」只给必填 + 封面 → 验证缺省降级（无剧透表 / 无台词卡 / 状态徽章缺省）；「星海旅人」验证完整板块（两季剧透表 + 台词卡 + 系列待补清单）；封面页在完全无海报时降级为纯排印封面 |

## 错误码表（稳定编号，可直接引用）

断言与问题都带稳定编号，便于在 issue / 对话里直接指认（`[C7] 又出现了` 比贴一段日志快）。**编号只增不改**——含义变了就换新号。

| 码 | 含义 | 修法 |
| --- | --- | --- |
| `[C1]` | `anime_base.json` 解析失败 | 看报错行；`npm run base` 可重建（模式 A） |
| `[C2]` | 一部都没收录 | 检查 `names.txt` / 扫描脚本输出 |
| `[C3]` | 某部缺 `anime_research/<作品名>.json` | 补调研稿，或删掉 base 里多余条目 |
| `[C4]` | HTML 未生成 | 跑 `build_anime_html.js`，看它打印的第一个错误 |
| `[C5]` | HTML 里有 U+FFFD 方块字 | 漏跑字体子集：`npm run pipeline`（或单独 `collect_fonts.js`） |
| `[C6]` | HTML 里没有 `class="show"` 章节结构 | HTML 结构被改坏了，回看 `git diff` |
| `[C7]` | 封面缺失或未渲染 | 该部的 `cover` 没写 / 文件不存在 / 没复制到 `anime_build/covers/` |
| `[C8]` | 出现「2015-2015」这类年份区间 | 某部只有一年数据；补 units 的 airdate |
| `[C9]` | PDF 未生成或过小 | 跑 `render_pw.js`；浏览器没装会回退 Edge |
| `[C10]` | 页码映射条目数与收录部数不符 | 有部的标题没在书签里命中：查书名与书签标题是否逐字一致 |
| `[C11]` | 目录页码 ≠ 最终书签页码 | 通常意味着两轮没跑完（用 `npm run pipeline`） |
| `[C12]` | 两轮页码不一致（未收敛） | 加一部/改标题后分页漂移；再跑一轮，仍不一致则查该部标题长度 |
| `[C13]` | 缺封面页或封底页 | HTML 被改坏，或在写自定义模板时漏了 `cover-pg`/`back-pg` |
| `[A1]` | 某部没有调研稿 | 同上 C3 |
| `[A2]` | 调研稿 JSON 解析失败 | 按报错行修（常见是尾随逗号、中文引号） |
| `[A3]` | 缺必填字段 | `synopsis`/`source`/`genres`/`production`/`cover` 优先级最高 |
| `[A4]` | 字段还是「未核实」占位 | 查证后替换；确实查不到就保留并写清 |
| `[A5]` | 建议补的可选字段缺失 | 缺了对应板块会整块消失（不致命） |
| `[A6]` | `cover`/`portrait` 文件不存在或路径含 `..` | 把图放进 `anime_research/covers/` 并改成相对路径 |
| `[A7]` | `unit_synopses` 与 `units` 名字不对齐 | **逐字**对齐，否则该单元渲染成空白 |
| `[A8]` | `synopsis` 字数不在 300-500 | 太短撑不起版面，太长挤版 |
| `[A9]` | `production` 未按「键：值；键：值」写 | 会被降级成整段文本（不致命） |
| `[A10]` | `accent` 不是 6 位 hex | 形如 `#e0407e` |
| `[P1]`–`[P8]` | `pack.js` 的交付失败码 | 见 `scripts/pack.js` 头部注释：P2 目标目录非本工具产物（加 `--force` 或换 `--out`）、P4/P5 PDF 缺失或复制不完整、P8 替换失败（已自动回滚） |
| `[V1]` | 交付说明里「产物断言」一行显示 **无收据** 或 **过期** | 跑 `npm run check`（过期＝改完重渲后没重跑验收，成品比收据新） |
| `[V2]` | 交付说明里「全页目检 / 封面逐张目检」显示 **未声明** | 这两件事机器验不了：真的逐页看过再用 `npm run pack -- --pages-reviewed --covers-reviewed` 签署；没看就让它写着「未声明」 |

> `[V]` 系列不阻断交付，它挡的是**"交付了"被读成"全书已核验"**。想让这两行变绿，只有一条路：真的去做那件事。
