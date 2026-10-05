# 安全策略

## 报告安全问题

发现安全问题时**请不要开公开 issue**：用仓库 **Security** 标签页的 *Report a vulnerability*（GitHub Private vulnerability reporting），或用 GitHub 上公开的联系方式直接找维护者。

这是个个人维护的项目，我会尽量在 7 天内回应；修好后在 CHANGELOG 里记一条，必要时发 Release。

## 本项目的实际威胁面（帮你判断什么值得报）

这是一个**本地运行的排版工具**：Node 脚本 + 本地浏览器（Playwright/Edge）渲染，**没有服务端、没有遥测、不上传任何用户数据**。所以值得关注的只有这几处：

- **外部输入进产物**：`anime_research/*.json` 的字段会被拼进 HTML/PDF（文本已转义）；`cover` / `portrait` 是相对路径（已做 `..` 拦截，但**不做 URL 抓取**）
- **联网行为（仅此三处）**：
  - `tvly`（Tavily CLI）——搜索查询词会发到 Tavily 服务端
  - AniList GraphQL（`curl`）——作品名查询
  - `fetch_candidates.js`（`curl`）——访问 safebooru 拉候选图
  - **没有任何回传用户数据/统计的通道**
- **隐私边界**：交付的 HTML/PDF 已实测**不含**本机路径与用户名；但项目工作目录里的 `scripts/config.json`（含绝对路径）、`names.txt`（片单）、`anime_research/`（调研稿与下载图片）是敏感内容，**外发前请删除**——见 README「隐私：外发前请清理」
- **依赖**：`playwright` / `pdfjs-dist`（Apache-2.0）、`@napi-rs/canvas`（MIT），经 npm 安装，不随仓库分发

## 不属于安全问题

成品 PDF 里素材的版权、字体授权（OFL）、以及"生成的册子能不能公开发布"一类问题，请走普通 issue —— 见 README「关于素材版权」。
