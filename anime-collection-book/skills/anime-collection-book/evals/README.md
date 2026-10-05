# evals —— 怎么验证这套管线是好的

## 一键验收（日常）

跑完 `npm run pipeline` 后执行：

```bash
npm run check
```

断言产物完整性：base 可解析、每部有调研稿、HTML/PDF 已生成、**无乱码方块字**、页码映射全命中、**目录页码与最终书签一致**。任何一条失败都会给出排查方向。

## 从零复现（完整自测）

`fixture/` 是一份**可复现的最小数据集**（2 部虚构作品：一部全字段、一部仅必填），用来验证"从零开始能不能跑通"。

```bash
# 1. 建临时项目根，放入 fixture 与字体
mkdir /tmp/anime-eval && cp -r fixture/* /tmp/anime-eval/
mkdir /tmp/anime-eval/fonts && cp <霞鹜文楷 Regular/Medium TTF> /tmp/anime-eval/fonts/

# 2. 把 scripts/config.json 的 root 临时指向 /tmp/anime-eval，然后：
npm run base && npm run pipeline && npm run check

# 3. 预期：pipeline 两轮页码一致；check 全绿；成品 PDF 共 3-4 页
# 4. 把 config.json 的 root 改回你的正式项目根
```

## 期望结果（fixture）

| 检查项 | 期望 |
|---|---|
| `npm run pipeline` | 两轮页码一致，无 ⚠ 警告（两部作品的 unit_synopses name 均与 units 对齐） |
| `npm run check` | 全部通过 |
| 成品页数 | 6-7 页（封面 1 页 + 总览 1 页 + 数说收藏 1 页 + 每部 1-2 页 + 封底 1 页） |
| 特殊路径覆盖 | 「测试小作品」验证无海报/无剧透表/无台词的降级三列表；「星海旅人」验证完整板块（含台词卡）；封面页在无海报时降级为纯排印封面 |
