# evals —— 怎么验证这套管线是好的

## 一键验收（日常）

跑完 `npm run pipeline` 后执行：

```bash
npm run check
```

断言产物完整性：base 可解析、每部有调研稿、HTML/PDF 已生成、**无乱码方块字**、封面逐部真实落盘、页码映射全命中、**目录页码与最终书签一致**、**两轮页码一致（已收敛）**。任何一条失败都会给出排查方向。

> 「两轮页码一致」比的是 `_pagemap.prev.json`（上一轮）与 `_pagemap.json`（本轮）——只比"目录 vs 本轮映射"是自证的（两者同轮），查不出漂移。这个断言要求用 `npm run pipeline` 跑满两轮，单轮产物会直接报缺失。

## 从零复现（完整自测）

`fixture/` 是一份**可复现的最小数据集**（2 部虚构作品：一部全字段、一部仅必填），用来验证"从零开始能不能跑通"。其中 `anime_research/covers/` 的两张封面是**程序生成的占位图**（`docs/preview-*.png` 即由这份数据渲染）——仓库不含任何第三方作品素材。

`fixture-novel/` 是 **novel 领域包**的对应数据集（2 个虚构角色：**沈观澜** 含 franchise 伏笔表与 watch_order，**白鹭洲** 只给到 status/quote/accent/rating 一类常规可选字段）——验证标签切换与伏笔渲染。

```bash
# 1. 建一个临时项目根（路径任意），把 fixture 内容拷进去，再把霞鹜文楷 Regular/Medium 两个 TTF 放进该根的 fonts/
#    （fixture 不含字体，这步不能省）
#    Windows: robocopy fixture "%TEMP%\anime-eval" /E      然后手动把两个 TTF 放进 fonts\
#    POSIX  : mkdir -p /tmp/anime-eval/fonts && cp -r fixture/* /tmp/anime-eval/ && cp <两个 TTF> /tmp/anime-eval/fonts/

# 2. 把 scripts/config.json 的 root 临时指向该目录，然后：
npm run base && npm run pipeline && npm run check

# 3. 预期：pipeline 两轮页码一致；check 全绿；成品 PDF 共 7 页（实测）
# 4. 把 config.json 的 root 改回你的正式项目根
```

> novel 自测：同样步骤换 `fixture-novel/`，且 config.json 需加 `"domain": "novel"` 与 `"title"`。预期：全部标签为角色/篇/章/伏笔回收；「连载中」状态徽章为绿色；沈观澜章末出现「伏笔回收 2/2 ——已全部回收 ✓」。

## 期望结果（fixture）

| 检查项 | 期望 |
|---|---|
| `npm run pipeline` | 两轮页码一致，无 ⚠ 警告（「星海旅人」的 unit_synopses name 与 units 逐字对齐；「测试小作品」未给 unit_synopses，故不触发缺文案告警） |
| `npm run check` | 全部通过（12 条断言） |
| 成品页数 | 7 页（实测：封面 1 + 总览 1 + 数说收藏 1 + 星海旅人 2 + 测试小作品 1 + 封底 1） |
| 特殊路径覆盖 | 「测试小作品」只给必填 + 封面 → 验证缺省降级（无剧透表 / 无台词卡 / 状态徽章缺省）；「星海旅人」验证完整板块（两季剧透表 + 台词卡 + 系列待补清单）；封面页在完全无海报时降级为纯排印封面 |
