# AGENTS.md — pi-packages

## 项目形态

GitHub 源码/文档中心：根目录是 **private monorepo**（4 个 npm workspace 子包），根 `pi` manifest 为空数组。使用者通过 `pi install npm:<包名>` 安装各独立包；**不要用 `pi install ./` 安装根目录**（只注册空 manifest）。

## 包与目录

| 包 | 目录 | 形态 |
|---|---|---|
| `pi-grill-all` | `skills/grill-all` | skill |
| `pi-multi-research` | `skills/multi-research` | skill |
| `pi-multi-code-review` | `skills/multi-code-review` | skill + subagent（`multi-code-review.review-runner`，manifest 分发键 `pi-subagents.agents`） |
| `pi-attention` | `extensions/pi-attention` | extension |

发布边界 = 各包 `package.json` 的 `files` 白名单（含 README/SKILL/agents/references 约定项）；发布前用 `npm pack --dry-run` 对照白名单核对 tarball。

## 交流

与用户交流使用简体中文。

## 关键操作指针

- **发布循环**：先读 `workflows/publish-loop.md` 再执行（校验门 → 单个发布 checkpoint → 发布 → 追加 RELEASE.md）。实现载体 `scripts/release.sh`：提升版本、dry-run 核对、`npm publish --registry https://registry.npmjs.org`、打 tag、自动追加 RELEASE.md、`pi update`。
- **发布记录**：`RELEASE.md`（含历史踩坑：镜像 registry、2FA 发布、bash 3.2 限制）。
- **提交**：message 遵循 `feat|fix|docs|chore|refactor(<scope>): <动词短语>`；发布提交沿用脚本的 `release(<pkg>): v<version>`。
- **审查**：需要代码审查时走 `multi-code-review`（三通道 + oracle；审查产物在目标仓库外，审查前后目标仓库 git 状态零改动）。

## 硬规则

- **registry**：发布只走官方 `https://registry.npmjs.org`；本机 npm 可能配置镜像，发布命令显式带 `--registry`。
- **隔离验证**：安装/包 agent 发现类验证使用临时 `HOME`（`mktemp -d`，结束清理），全程不触碰真实用户配置。
- **提交前自查**：对 staged diff 运行敏感扫描（用户主目录绝对路径、认证串/密钥类模式）；仓库文本只写相对路径与占位符（`<repo>`、`<pkg>`）。
- **版本对齐**：semver；每次发布打 `git tag <包名>@<版本>`，与 `package.json` 版本一致。
- **文档同步**：改动包能力/结构时同步更新该包 README 与根 `README.md` 的安装说明；新踩坑记入 `RELEASE.md`。