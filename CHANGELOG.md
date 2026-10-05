# Changelog

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
