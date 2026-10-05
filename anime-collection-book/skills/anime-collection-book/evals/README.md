# evals —— 怎么验证这套管线是好的

## 一键验收（日常）

跑完 `npm run pipeline` 后执行：

```bash
npm run check
```

断言产物完整性：base 可解析、每部有调研稿、HTML/PDF 已生成、**无乱码方块字**、页码映射全命中、**目录页码与最终书签一致**。任何一条失败都会给出排查方向。

## 从零复现（完整自测）

`fixture/` 是一份**可复现的最小数据集**（2 部虚构作品：一部全字段、一部仅必填），用来验证"从零开始能不能跑通"。其中 `anime_research/covers/` 的两张封面是**程序生成的占位图**（`docs/preview-*.png` 即由这份数据渲染）——仓库不含任何第三方作品素材。

`fixture-novel/` 是 **novel 领域包**的对应数据集（2 个虚构角色：一部全字段含伏笔表、一部仅必填）——验证标签切换与伏笔渲染。

```bash
# 1. 建临时项目根，放入 fixture 与字体
mkdir /tmp/anime-eval && cp -r fixture/* /tmp/anime-eval/
mkdir /tmp/anime-eval/fonts && cp <霞鹜文楷 Regular/Medium TTF> /tmp/anime-eval/fonts/

# 2. 把 scripts/config.json 的 root 临时指向 /tmp/anime-eval，然后：
npm run base && npm run pipeline && npm run check

# 3. 预期：pipeline 两轮页码一致；check 全绿；成品 PDF 共 3-4 页
# 4. 把 config.json 的 root 改回你的正式项目根
```

> novel 自测：同样步骤换 `fixture-novel/`，且 config.json 需加 `"domain": "novel"` 与 `"title"`。预期：全部标签为角色/篇/章/伏笔回收；「连载中」状态徽章为绿色；沈观澜章末出现「伏笔回收 2/2 ——已全部回收 ✓」。

## 期望结果（fixture）

| 检查项 | 期望 |
|---|---|
| `npm run pipeline` | 两轮页码一致，无 ⚠ 警告（两部作品的 unit_synopses name 均与 units 对齐） |
| `npm run check` | 全部通过 |
| 成品页数 | 6-8 页（封面 1 页 + 总览 1 页 + 数说收藏 1 页 + 每部 1-2 页 + 封底 1 页） |
| 特殊路径覆盖 | 「测试小作品」验证无海报/无剧透表/无台词的降级三列表；「星海旅人」验证完整板块（含台词卡）；封面页在无海报时降级为纯排印封面 |
