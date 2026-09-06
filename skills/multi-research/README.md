# multi-research

多模型对照调研：派 **多个采用不同模型**的内置 `researcher` **并行调研同一个问题**，再由 `oracle` 交叉检验、合并成一份带对照、冲突标注、来源裁决与模型质量观察的中文分析报告。

## 它解决什么问题

单个模型调研有盲区与偏差。让多个不同厂商的模型独立回答同一问题，再交第三方评审合并，能得到：

- 事实交叉验证（多模型一致的结论更可信）
- 冲突显性化（分歧点及其双方依据一目了然）
- 来源权威裁决（冲突时按来源可信度下结论）
- 模型质量对比（顺带观察哪个模型调研更可靠）

## 设计要点

**零自定义 agent**：模型通过调度时的 `model:` 参数传给内置 `researcher`（pi-subagents 自带）。唯一的配置点是 SKILL.md 里的**模型名单**——换/加模型只改那一处，没有 agents 文件、没有安装同步问题。

## 安装

本技能依赖 `pi-subagents`（提供内置 `researcher` / `oracle` 和 `workflowScript` 并行调度）：

```bash
# 前置依赖
pi install npm:pi-subagents

# 安装本技能
pi install npm:pi-multi-research

# 项目级安装
pi install -l npm:pi-multi-research

# 本地开发：在 pi-packages 仓库根目录执行
pi install ./skills/multi-research
```

不再推荐从 GitHub 根仓库安装合集或复制目录；GitHub monorepo 仅用于源码和文档维护。本地路径安装适合开发和测试未发布版本。

## 使用

对任意 agent 说一句即可，例如：

> 用 multi-research 调研：武汉今日天气

指定部分模型（简称或完整 ID）：

> 用 glm、qwen 调研：<问题>

指定主题标签与落盘位置：

> 用 multi-research 调研「<问题>」，主题标签 xxx，落盘到 docs/research/

产出：`docs/research/YYYY-MM-DD-<topic>/` 下每个模型一份简报 + 1 份 oracle 合并分析（`00-analysis.md`）。

## 目录结构

```text
multi-research/
├── package.json    # pi-multi-research：独立 npm 包 manifest
├── SKILL.md        # 主流程：解析模型名单 → 并行调研 → oracle 评审 → 合并落盘
└── README.md       # 本文件
```

## 换模型 / 加模型

改 SKILL.md 顶部的「模型名单」（或简写映射）列表即可，流程与安装都不动。模型必须存在于 pi 的模型注册表。

## 前提与成本

- 默认名单走 B.AI / opencode 免费通道；`oracle` 使用当前 pi-subagents 配置的模型，具体费用取决于本地配置。
- GLM 模型只接受 low/high/max 思考级别，名单里必须写 `bai/glm-5.3-flash:high`（medium 会 400）。
