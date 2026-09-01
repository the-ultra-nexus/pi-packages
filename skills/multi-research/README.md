# multi-research

多模型对照调研：派 **3 个采用不同模型**的研究 agent（GLM / Qwen / MiMo）**并行调研同一个问题**，再由 oracle（GPT-5.6 Sol）交叉检验、合并成一份带对照、冲突标注、来源裁决与模型质量观察的分析报告。

## 它解决什么问题

单个模型调研有盲区与偏差。让多个不同厂商的模型独立回答同一问题，再交第三方评审合并，能得到：
- 事实交叉验证（三方一致的结论更可信）
- 冲突显性化（分歧点及其双方依据一目了然）
- 来源权威裁决（冲突时按来源可信度下结论）
- 模型质量对比（顺带观察哪个模型调研更可靠）

## 目录结构

```
multi-research/
├── SKILL.md              # 主流程：角色自检 → 并行调研 → oracle 评审 → 合并落盘
├── README.md             # 本文件
└── agents/               # 研究角色定义（模型钉在这里，不进 SKILL.md）
    ├── researcher-glm.md    # model: bai/glm-5.3-flash（智谱 GLM）
    ├── researcher-qwen.md   # model: bai/qwen3.8-flash（阿里 Qwen）
    └── researcher-mimo.md   # model: opencode-zen-free/mimo-v2.5-free（小米 MiMo）
```

设计原则：**模型与流程解耦**。SKILL.md 只引用角色名，不写死任何模型；换模型 = 改 `agents/` 里的一行 `model:`。

## 安装

1. 本技能依赖 pi-subagents（内置 `oracle`、并行调度 `workflowScript`）。

2. 分两部分安装：

```bash
# ① 技能本体 → 全局技能目录
mkdir -p ~/.pi/agent/skills
cp -r multi-research ~/.pi/agent/skills/

# ② 研究角色 → pi-subagents 用户级 agents 目录
mkdir -p ~/.pi/agent/agents
cp multi-research/agents/*.md ~/.pi/agent/agents/
```

3. 将来若通过 `npx skills` 安装：CLI 只负责 `SKILL.md` 本体（`npx skills add <owner>/pi-packages` 后选择 multi-research），**agents 仍需手动同步**（上述②三步）。本 skill 首次运行会自动做角色自检并提示缺失。

## 使用

对任意 agent 说一句，例如：

> 用 multi-research 调研：武汉今日天气

或指定主题标签与落盘位置：

> 用 multi-research 调研「<问题>」，主题标签 xxx，落盘到 docs/research/

产出：`docs/research/YYYY-MM-DD-<topic>/` 下 3 份模型简报 + 1 份 oracle 合并分析（`00-analysis.md`）。

## 前提

- 三个研究模型走 B.AI / opencode 免费通道，oracle 走本地配置的 GPT relay（付费）；预算敏感时可在 `settings.json` 的 `agentOverrides` 里把研究角色换成其他免费模型。
- 变更模型推荐通过 `settings.json` 的 `subagents.agentOverrides` 或直接编辑 `agents/*.md` 的 `model:`，不要改动 SKILL.md。