# 贡献指南

欢迎 issue 与 PR。这是个个人维护的 agent skill，没有重流程，但有几条约定：

## 提 issue

- **报 bug**：附上「做了什么 → 期望 → 实际」，贴上 `npm run check` 的完整输出（它就是为此设计的）
- **提功能**：先说使用场景再说方案——本 skill 的取舍标准是「垂直深度优先」，与番剧收藏无关的泛化建议大概率不会被采纳

## 提 PR

1. 改脚本后必须：`node --check <脚本>` 全过 + 在一个测试项目根跑通 `npm run pipeline && npm run check`（13 条断言全绿）
2. 涉及 UI 文案变动的：跑一遍 `npm run sheet`，联络表目检无方块字/溢出（字体子集会自动并入 build 脚本文案，但请确认）
3. 版本号改动需同步 5 处：`SKILL.md` frontmatter 的 `metadata.version`、`marketplace.json`、两个 `plugin.json`、`scripts/package.json`（`package-lock.json` 的根 `version` 跑 `npm i --package-lock-only` 交给 npm），并更新 `CHANGELOG.md`；CI 会自动校验这 5 处是否一致
4. 提交信息用 Conventional Commits 风格（`feat:` / `fix:` / `docs:` / `chore:`）
5. 不要提交 `node_modules/`、测试项目产物（`anime_build/`）与个人信息（片单、路径里的用户名等）

## 发布

维护者发版流程：CHANGELOG 加条目 → 5 处版本号同步 → commit（`feat:`/`fix:`）→ 打 `vX.Y.Z` tag → GitHub Release。
