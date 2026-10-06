# 第三方组件与素材声明（THIRD PARTY NOTICES）

本仓库的**代码**为 MIT（见 [LICENSE](LICENSE)）。skill 信封内另有一份 `LICENSE.txt` 与本文的副本 —— **只把技能目录拷进工具的技能目录时，许可与声明不会丢**。

下面按义务性质分三类。注意只有第三类会随你的**成品**一起分发出去。

## 一、随包依赖（不在本仓库内，安装时由使用者自行获取）

| 组件 | 用途 | 许可 |
| --- | --- | --- |
| [playwright](https://github.com/microsoft/playwright) | 渲染 PDF | Apache-2.0 |
| [pdfjs-dist](https://github.com/mozilla/pdf.js) | 读 PDF 书签反查页码、数页数 | Apache-2.0 |
| [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) | 生成全页联络表与分享卡位图 | MIT |
| Python [fonttools](https://github.com/fonttools/fonttools) | 字体子集化 | MIT |
| Python [brotli](https://github.com/google/brotli) | woff2 压缩 | MIT |
| [Tavily CLI](https://github.com/tavily-ai/tavily-cli)（`tvly`） | 联网调研（需 API key） | 见上游 |
| [霞鹜文楷 LXGW WenKai](https://github.com/lxgw/LxgwWenKai) | 缺省中文字体（**不随仓库分发**） | SIL OFL 1.1 |

这些依赖由使用者 `npm i` / `pip install` / 自行下载字体获得，本仓库不分发、不修改它们。
`THIRD_PARTY_NOTICES` 只做告知；各自的完整许可文本见上游仓库。

## 二、字体：成品会内嵌，所以字体许可约束成品

管线把你的中文字体**子集化后 base64 内嵌**进成品 PDF/HTML——成品的分发同时构成字体软件的分发。

- **缺省**：霞鹜文楷（LXGW WenKai），SIL OFL 1.1 —— © LXGW ｜ © The Klee Project Authors（基于 FONTWORKS「Klee One」衍生）。
  OFL 要求版权声明随字体软件分发，因此**成品封底的字体署名为脚本自动写入，请勿删除**。
- **字体不入库**：仓库不含任何 TTF。使用者从上游 Releases 下载到 `<项目根>/fonts/`。
- **可替换**：`config.json` 的 `fonts.regular` / `fonts.medium` 可指向任意 TTF（CI 用 `evals/make_smoke_font.py`
  现场生成的测试字体走的就是这条路）。**替换前请确认目标字体的许可允许嵌入与再分发**——很多商业字体不允许。
  换字体后封底的署名文案仍是霞鹜文楷的，**记得同步改 `config.json` 的 `credits`**。

## 三、成品里的第三方素材（海报 / 立绘 / 截图）

**本仓库不附带任何第三方作品素材**：`evals/fixture/` 的两张封面与 `assets/` 的示例名单均为程序生成或虚构作品，
README 的效果图由这份虚构数据渲染。

使用者自行取用的官方海报、版权绘、动画截图的版权属于各制作委员会 / 原作者 / 出版社。本工具只做排版与
**来源记录**（`npm run sources` → `anime_build/_sources.md`），不判断授权，也不自动抓取版权图。
成品封底默认输出「非官方粉丝作品 · 仅供个人收藏」声明。**公开发布（发群、上传平台、印制售卖）前请自行评估授权——
注明来源不等于获得授权。** 详见 `references/compliance.md` 与 `references/image-selection.md`（含"只用全年龄素材"
这条法律红线：涉未成年角色的性化素材在多国属刑事问题，风险远重于版权）。
