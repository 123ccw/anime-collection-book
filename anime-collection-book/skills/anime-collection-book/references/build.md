# 构建 · 渲染 · 验收 · 交付

> 主文件按需指到这里。所有命令都在 skill 的 `scripts/` 目录执行；首次先 `npm i`，再把 `config.example.json` 复制为 `config.json` 并把 `root` 改成你的项目根。

## config.json（本机配置，不入库）

`config.json` 含你的路径与书名，**已在 `.gitignore` 里**；仓库只提供 `config.example.json` 模板。**把文件夹拷给别人或上传前记得删掉它**（详见 `compliance.md` 末条）。

| 字段 | 作用 |
| --- | --- |
| `root` | 项目根（构建读写的都是它下面的目录） |
| `vroot` | 模式 B 的视频库根；脚本内是 `const VROOT = CFG.vroot`，**不要改脚本** |
| `domain` | `anime`（默认）/ `novel` |
| `title` | 自定义书名，默认《番剧收藏简介》；影响封面/总览/封底显示，**输出文件名不变** |
| `credits` | 封底"资料来源"行；留空则用内置默认（公开资料整理 + 不指向具体站点的兜底表述） |

改完照常 `npm run pipeline`——字体子集会自动收录新书名字符。

## 一键命令

```bash
npm run doctor     # 环境自检（node / python+fonttools / 字体 / 浏览器 / curl / tvly / config；加 --net 顺带探网络）
npm run pipeline   # 字体子集 → 两轮「构建→渲染→页码反查」，一条命令跑完
npm run check      # 产物断言（完整性 / 页码全命中 / 无乱码 / 两轮收敛，共 13 条）
npm run audit      # 数据完备度（哪部缺字段、哪些还写着"未核实"、剧透表对不对得上）
npm run sheet      # 生成全页联络表（目检用）
npm run cards      # 导出收藏卡 PNG + 高清整页图（anime_build/_cards 与 _gallery）
npm run sources    # 出素材来源台账（anime_build/_sources.md）——公开分享时的自证材料
npm run pack       # 一键交付：把成品与说明归拢到 <项目根>/_deliver/
npm run candidates -- <safebooru_tag>   # 候选图对比（兜底渠道；--pick <编号> 取图入库，见 image-selection.md）
```

## 手动分步（调试或理解原理时用）

```bash
node collect_fonts.js      # ① 字体子集（大量新文案后必须重跑，防缺字；需 python -m fontTools.subset）
node build_anime_html.js   # ② 构建 HTML（第一轮；目录页码为占位符）
node render_pw.js          # ③ 渲染 PDF（写入书签）
node anime_pagemap.js      # ④ 从书签反查每部起始页 → _pagemap.json
# 回到 ② 再跑一轮（把真实页码印进目录）→ ③ → ④；两轮 pagemap 输出一致即稳定
```

## 交付

推荐 `npm run pack`：产出 `<项目根>/_deliver/`，含 PDF、HTML 源、分享卡 PNG、来源台账与一份自动生成的交付说明。

手工交付的规矩：

- 成品 PDF **只保留唯一一份**（别留两份同名新旧文件）
- **HTML 源一并保留**（`anime_build/番剧收藏简介.html`），用户可自行微调重渲
- 若用户只要成品 PDF：可把 PDF 复制到项目根并清理 `anime_build/`、`anime_base.json`、`fonts/wk_*` 中间产物——但
  **`anime_research/`（调研成果 + 已核验图片，重做成本最高）与 `fonts/*.ttf`（重建必需）必须保留**
- 交付前确认封底那两行声明（资料来源 / 非官方粉丝作品）在，**不要删**
