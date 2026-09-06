# 发布记录（Release Log）

记录 pi-packages 各独立 npm 包的发布历史。每个子包独立版本，发布命令与结果在此留档。

## 2026-09-06 — 首次发布

四个子包拆分后首次发布到官方 npm registry。

### 发布内容

| npm 包 | 版本 | 类型 | 说明 |
|---|---|---|---|
| `pi-grill-all` | 1.0.0 | skill | 以一轮轮提问不断拷问、压力测试思考 |
| `pi-multi-research` | 1.0.0 | skill | 多模型并行调研同一问题，oracle 交叉检验后合并分析 |
| `pi-multi-code-review` | 1.0.0 | skill + subagent | OCR / Standards / Spec 三通道并行审查与 oracle 裁决 |
| `pi-attention` | 0.3.0 | extension | iTerm2 / Orca 注意力集成、完成通知和等待提醒 |

### 发布命令

```bash
# 先将 npm registry 改回官方（此前 ~/.npmrc 配了淘宝镜像）
npm config set registry https://registry.npmjs.org

# 登录（需 2FA；发布 token 需带 bypass 2FA 权限，或交互式输入 OTP）
npm login --registry https://registry.npmjs.org

# 一次性发布四个 workspace 子包
npm publish -w pi-grill-all -w pi-multi-research -w pi-multi-code-review -w pi-attention
```

### 验证

发布前已逐个执行 `npm pack --dry-run`，确认 tarball 内容与各包 `files` 白名单完全一致（内容精确匹配，无多余文件）。

发布后验证：

```bash
npm view pi-grill-all version          # 1.0.0
npm view pi-multi-research version     # 1.0.0
npm view pi-multi-code-review version  # 1.0.0
npm view pi-attention version          # 0.3.0
```

### 注意点（本次踩坑）

- 本机 `~/.npmrc` 原 registry 为 `registry.npmmirror.com`（淘宝镜像），直接 `npm publish` 会失败；发布前已改回 `https://registry.npmjs.org`。
- npm 已强制 2FA 发布：必须使用带 "Allow 2FA bypass" 权限的 granular access token，或在 TTY 交互式输入 OTP，否则报 `E403 ... Two-factor authentication ... is required`。

## 后续更新约定

- 改版本号：在对应子包的 `package.json` 修改 `version`（遵循 semver），提交并打 Git tag（`git tag <包名>@<版本>`）。
- 发布：`npm publish -w <包名>`（从仓库根目录）。
- 版本号与 Git tag 对齐。

## 一键发布脚本

`scripts/release.sh`：自动完成「提升版本 → 校验 tarball → 发布官方 registry → 提交+打 tag → 更新本地 pi 包 → 推送」：

```bash
./scripts/release.sh                 # 四个包全部 patch 提升并发布
./scripts/release.sh minor           # 四个包全部 minor 提升并发布
./scripts/release.sh pi-grill-all    # 只发布 pi-grill-all（patch）
./scripts/release.sh pi-grill-all pi-attention major
```

前置：已登录 npm（`npm login --registry https://registry.npmjs.org`）且工作区干净。发布过程会交互输入 2FA OTP。示例用法（在仓库根目录执行）：

```bash
./scripts/release.sh
```
