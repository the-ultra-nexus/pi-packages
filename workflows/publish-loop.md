# publish-loop：从开发到发布

> 目标：把「改包 → 校验 → 提交 → 发布 → 更新本地」这一个循环做成可委托的工作流。
> 一次运行 = 一次发布（可多包）。人类只在 **release checkpoint** 出现一次。

## 1. 触发（Trigger）

**事件触发**：开发者决定发布时手动运行。参数：

- `pkgs`：目标包集合（`pi-grill-all` / `pi-multi-research` / `pi-multi-code-review` / `pi-attention`，缺省全部）
- `bump`：`patch` | `minor` | `major`（缺省 `patch`）
- 开发改动已存在于工作区（未提交或已提交均可，工作流统一归拢）

## 2. 预条件（失败即停，告知用户）

1. npm 已登录官方 registry：`npm whoami --registry https://registry.npmjs.org` 通过。
2. 仓库根可执行 `git`、`npm`、`node`。
3. 若改动涉及 skill/agent 注册，需能创建临时 `HOME`（`mktemp -d`）。

## 3. 开发与完成标准（开发者主导，工作流给清单）

开发者改动包文件（skill 正文、extension、文档、manifest）。本工作流在**校验门**处判定"开发完成"，清单：

- 改动的包 README 同步更新（新能力/安装说明变化时）。
- `package.json` 无未声明的字段漂移（`name/version/files/pi(pi-subagents)` 结构与本仓库约定一致）。
- 无 `.env`、密钥、证书、tarball、日志等文件被意外加入（对照 `.gitignore` 规则）。

## 4. 校验门（全自动，逐项通过才继续）

从仓库根（`<repo>`）执行。任何一项失败 → 停下、报告失败项与修复建议，不进入提交。

1. **manifest 合法**：逐包 `node -e "JSON.parse(require('fs').readFileSync('<pkgdir>/package.json'))"`；根 manifest 的 `workspaces` 与 `pi` 空清单抽查。
2. **diff 卫生**：`git diff --check`（暂存前对工作区，暂存后对 `--cached`）。
3. **敏感扫描**：对暂存 diff 与全仓库新增文件运行模式扫描——用户主目录绝对路径前缀、认证令牌/密码/密钥类字符串（token、secret、password、认证串等）；命中即停。
4. **tarball 白名单核对**：`npm pack --dry-run --json`（逐包）→ 取 `files[].path` 集合，必须**精确等于**该包 `files` 字段展开的文件集（含 `package.json`/`README.md`/`SKILL.md` 等约定项）；多/漏一个都停。
5. **注册/发现验证**（仅当改动涉及该包的 skill、agent、extension 注册或 manifest 时触发）：
   - 临时 `HOME`（`mktemp -d`，trap 清理）写入 `settings.json` 的 `packages` 指向本包目录；
   - `pi install <pkgdir>` + `pi list` 能看到该包；
   - 若包含 agent（如 `multi-code-review`）：按 pi-subagents 源码路径验证 `multi-code-review.review-runner` 以 `package` 源被发现（用隔离 `HOME`，不触碰真实配置）。
6. **审查**（可选，四选一规则判定）：改动 > 3 个文件、或触及 `SKILL.md` 的编排/workflowScript、`agents/*.md`、`references/schema.md` 时，**强制**跑 `multi-code-review`（三通道 + oracle，产物在仓库外 `<TMPDIR>/multi-code-review/<ts>-<topic>`，仓库零改动）；改动小且纯文档时跳过。

## 5. 提交（无 checkpoint）

- `git add` 改动文件（包目录 + 相关文档；绝不 `add` 被 `.gitignore` 覆盖的项）。
- `git commit`（message 遵循仓库惯例：`feat|fix|docs|chore|refactor(<scope>): <动词短语>`）。
- `git push origin main`。
- **Push right**：不在此处询问人类；人类在 checkpoint 才介入。

## 6. Release checkpoint（唯一的人类介入点）

呈现 **brief**（看 brief 而非原始输出）：

```text
待发布: <pkgs>（bump: <bump>）
改动规模: +N/-M 行，<K> 个文件：<文件列表摘录>
校验门: 全部通过（manifest/diff/敏感/tarball/发现/审查 各绿/跳过）
建议原因: <一句话：为什么这次发布、为何该 bump>
发布动作: 将执行 npm version → dry-run → npm publish(需 OTP) → tag → RELEASE.md 追加 → pi update
```

人类回复 = 批准（可改 bump）/ 拒绝。**OTP 输入在发布阶段终端交互完成**（无需在 brief 阶段预输入）。

## 7. 发布（半自动，可复用 `scripts/release.sh`）

审批通过后，逐包执行（`release.sh` 已覆盖主体，若无 `release.sh` 则执行等价命令）：

1. `npm version <bump> --no-git-tag-version -w <pkg>`（更新该包 `package.json`）。
2. `npm pack --dry-run` 复核（防 version 改动引入差异）。
3. `npm publish --registry https://registry.npmjs.org`（官方 registry；TTY 交互输入 2FA OTP；`~/.npmrc` 的 registry 若为镜像，用 `--registry` 覆盖）。
4. `git tag <pkg>@<version>`（与版本号对齐）。
5. **RELEASE.md 追加**：`scripts/release.sh` 已自动追加（变更摘要 = 上一 tag 以来的提交记录）；若未走脚本，则按同格式手动追加——`## <date> — 发布` 小节，每包一行 `| 包 | 版本 | bump | 变更 |`。
6. `pi update npm:<pkg>`（若本地按 npm 安装过）；本地为路径安装则跳过并注明。
7. `git add` 包 `package.json` + `RELEASE.md` → `git commit -m "release(<pkg>): v<version>"`（每包一个，或合并）→ `git push origin main --tags`。

## 8. 汇报（brief）

```text
发布完成: <pkg>@<version>（<timestamp>）
npm view <pkg> version = <version>   # 已核对
本地: pi update npm:<pkg> 已做过/跳过（原因）
tag: <pkg>@<version>（已推送）
安装: pi install npm:<pkg>（新用户）/ 无需重装（已有旧版本则 pi update）
```

## 失败路径

| 阶段 | 失败 | 处理 |
|---|---|---|
| 校验门 | 任一红 | 停、报告修复建议；修复后重跑本工作流（幂等） |
| 提交 | push 冲突 | 拉取最新 `git pull --rebase` 后重试；不覆盖他人提交 |
| 发布 | publish 403/OTP 错误 | 检查登录态/token 的 2FA 权限，`npm login` 后重试第 7 步；已 publish 未 tag 时补 tag，不重复 publish |
| 发布 | version 已报占用 | registry 版本已存在：要么改 bump，要么放弃（semver 不可覆盖） |

## 参考资产

- 发布脚本：`scripts/release.sh`（第 7 步主体，含 RELEASE.md 自动追加）
- 发布记录：`RELEASE.md`（含首次发布与踩坑）
- 安装说明：根 `README.md`
- 审查：`skills/multi-code-review/SKILL.md`（第 4 步第 6 项）
- 忽略规则：`.gitignore`（第 3 步扫描依据）
- 包位置：`skills/grill-all`、`skills/multi-research`、`skills/multi-code-review`、`extensions/pi-attention`