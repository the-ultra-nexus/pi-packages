# multi-code-review — 三方并行代码审查

对同一个审查目标（workspace / commit / 分支改动），**三个相互独立的正交通道并行审查**，再由内置 oracle 去重消歧、跨通道重新定级，合并成**一份**带最终裁决的报告。

| 通道 | 问的问题 | 判定维度 |
|---|---|---|
| **OCR**（open-code-review 风格） | 这段代码本身对不对、安不安全？ | 正确性 bug、安全漏洞、回归、明显性能缺陷、边界条件 |
| **Standards** | 这段改动遵守仓库的文档化编码规范吗？ | AGENTS.md / CONTEXT.md / README 明示约定 / 语言惯例 |
| **Spec** | 这段改动满足它应当满足的需求吗？ | 缺实现、过度实现、契约破坏、行为与需求不符 |

纯 Pi `workflowScript` + `runs.all` 编排，**不需要 Orca**。执行体是本包自带的 subagent `multi-code-review.review-runner`（随包自动发现）；oracle 用 pi-subagents 内置 `oracle`（只读、不联网）。

## 安装

```bash
# 全局
pi install npm:pi-multi-code-review

# 项目级（写入 .pi/settings.json）
pi install -l npm:pi-multi-code-review

# 本地开发（在 pi-packages 仓库内）
pi install ./skills/multi-code-review

# 卸载
pi remove npm:pi-multi-code-review
```

**前置依赖**：`pi-subagents`（提供 `runs.all` 运行时与内置 `oracle`）：

```bash
pi install npm:pi-subagents
```

**可选依赖**：`ocr` CLI（open-code-review，`npm install -g @alibaba-group/open-code-review`）。存在时 OCR 通道走 delegate 模式（CLI 做文件选择与规则解析）；缺失或失败自动降级为 fallback，不影响其余通道与安装。

## 使用

在目标仓库内触发：

```bash
# 审查当前 workspace 改动
用 multi-code-review 审查这次改动

# 审查某个 commit / 某段分支
用 multi-code-review 审查 --commit <sha>
用 multi-code-review 审查 --branch main..feature

# 带需求上下文（喂给 Spec 通道）
用 multi-code-review 审查 --branch main..feature -b "为登录接口加限流"
```

输出目录默认 `${TMPDIR:-/tmp}/multi-code-review/<时间戳>-<topic>/`（可用 `--out` 覆盖），最终报告是其中的 `00-adjudication.md`。审查期间**目标仓库零改动**：工件全部写在仓库之外，`git status` / 哈希保持不变。

## 自动发现

`package.json` 声明 `"pi-subagents": { "agents": ["./agents"] }`，安装后 `review-runner` 自动注册为 `multi-code-review.review-runner`，无需手工复制文件：

```bash
subagent({ action: "list", capabilities: true })   # 应能看到 multi-code-review.review-runner
```

## 报告

- 每个通道产出 `<channel>.json`（结构化 findings）+ `<channel>.md`（人读报告），结构与严重度/判定规则见 `references/schema.md`；
- 裁决：`BLOCK`（含 P0）/ `OK with notes`（仅 P1/P2）/ `OK`；
- oracle 按「去重 → 消歧 → 重新定级」合并进 `00-adjudication.md`，缺失通道显式标注。

## 安全说明

本包是可执行代码审查工具：会读取目标仓库、运行 `git` 与 `ocr` 的只读命令，并把审查产物写到 TMPDIR 或 `--out` 指定的目录。三通道与 oracle 均为只读角色，`write` 仅用于审查产物。请在信任的仓库上使用；安装第三方包前自行审查源码（pi 官方安全提示同样适用）。

## 目录结构

```text
skills/multi-code-review/
├── package.json            # pi-multi-code-review：pi.skills + pi-subagents.agents
├── SKILL.md                # 技能主文档（触发、前置、四阶段流程）
├── README.md
├── agents/
│   └── review-runner.md    # 三通道统一执行体（package: multi-code-review）
└── references/
    ├── schema.md               # 统一输出契约（findings/severity/verdict/合并规则）
    ├── ocr-flow.md             # OCR 通道：delegate 模式 / 可选完整模式 / fallback
    ├── standards-template.md   # Standards 通道任务模板
    ├── spec-template.md        # Spec 通道任务模板
    ├── fallback-template.md    # 无 ocr CLI 时的 OCR 通道任务模板
    └── adjudicator-prompt.md   # oracle 合并裁决任务模板
```

源码与版本管理在 GitHub monorepo（[the-ultra-nexus/pi-packages](https://github.com/the-ultra-nexus/pi-packages)），npm 是稳定分发渠道，各资源独立版本。