---
name: multi-research
description: 多模型对照调研——派多个采用不同模型的内置 researcher 并行调研同一问题，再由 oracle 交叉检验、合并成一份带对照与裁决的中文分析报告
---

对用户给出的同一个问题，并行派出若干**不同模型**的 `researcher`（pi-subagents 内置）独立调研，最后由 `oracle`（内置）交叉检验并合并产出**一份**分析报告：逐字段对照、冲突标注、来源裁决、模型质量观察。

本 skill **不依赖任何自定义 agent**：模型通过调度时的 `model:` 参数传入。唯一的"配置点"是下面的默认模型名单——**增删改模型只动这一个列表**。

## 模型名单（唯一的配置点）

默认（一次并行调研 = 派一个 researcher × 每个模型）：

- `bai/glm-5.3-flash:high` —— 智谱 GLM（注意必须带 `:high`：该模型只接受 low/high/max 思考级别，拒绝默认的 medium）
- `bai/qwen3.8-flash` —— 阿里 Qwen
- `opencode-zen-free/mimo-v2.5-free` —— 小米 MiMo

简写映射（触发消息里说简称用）：

| 简写 | 完整模型 ID |
|---|---|
| `glm` | `bai/glm-5.3-flash:high` |
| `qwen` | `bai/qwen3.8-flash` |
| `mimo` | `opencode-zen-free/mimo-v2.5-free` |

## 触发解析

用户消息两种形式：

- **不指名模型**："用 multi-research 调研 <问题>" → 默认名单全部
- **指名模型**："用 glm、qwen 调研 <问题>" → 只派简写映射对应的模型（未匹配的简写 → 提示用户，仍跑其余）

可选参数（原样沿用）：`主题标签 <topic>`（目录命名，缺省用问题前几个词做 slug）、落盘根（缺省 `docs/research/`）。

## 前置

`researcher` 与 `oracle` 均为 pi-subagents 内置 agent，**无需安装任何自定义 agent 文件**。若想加失败兜底，在 `settings.json` 的 `subagents.agentOverrides.researcher.fallbackModels` 配置即可。

## 执行步骤

### 1. 准备输出目录

日期取当天 UTC+8：`docs/research/YYYY-MM-DD-<topic-slug>/`，创建目录。

### 2. 并行调研（每模型一个 researcher，workflowScript 一次跑完）

```js
subagent({ workflowScript: `
  const topic = "<topic-slug>";
  const q = "<问题>";
  const dir = "docs/research/YYYY-MM-DD-${topic}";
  const models = ["<模型ID1>", "<模型ID2>", ...]; // 来自模型名单/用户指名
  const arms = models.map((m, i) => ({
    key: "arm" + i,
    agent: "researcher",
    model: m,
    task: "问题：" + q + "\\n输出：用 write 把中文调研简报到 " + dir + "/arm" + i + ".md（若 write 失败，直接在回复中返回完整简报文本）",
    output: dir + "/arm" + i + ".md"
  }));
  const results = await runs.all(arms);
  return results;
`})
```

产出文件建议原名：`glm.md` / `qwen.md` / `mimo.md`（按实际模型名，便于阅读）。

要点：
- `model:` 用「完整 provider/id」，可带思考后缀（如 `bai/glm-5.3-flash:high`），后缀优先于 agent 默认 thinking。
- 每个 child 的 `output` 用绝对路径或项目根相对路径，互不覆盖。
- 任一支失败：记录原因，其余支照常；最终分析标注缺失支。

### 3. oracle 交叉检验 + 合并分析

3 份简报齐后派 `oracle`（内置，`thinking: high`，无 web 工具，只读文件——保证它不重新检索）：

```js
subagent({ agent: "oracle", context: "fresh", output: false,
  task: `读取并交叉检验以下关于"<问题>"的中文调研简报：
  - <abs>/glm.md
  - <abs>/qwen.md
  - <abs>/mimo.md
  只基于文件内容（不要联网），产出一份中文分析，包含：
  1. 逐字段对照表（同一事实维度下各方的数值/说法/来源并排）
  2. 一致性结论：一致的点；冲突的点（各自依据与来源）
  3. 来源可信度裁决：对冲突点按来源权威性给出结论与理由
  4. 合并后的最终回答（Summary 级直接结论）
  5. 模型质量观察：哪份简报更全面/更准确/引用更可靠，各一句话
  6. 缺失支的影响（若有）` })
```

oracle 的 tools 不含 `write`，分析在其返回文本里；由父会话把返回内容落盘为 `<dir>/00-analysis.md`（`output: false` 避免它写别处）。

### 4. 汇报

向用户给出：最终合并回答（几句话说清结论）→ 关键分歧点一句话总结 → 报告路径。

## 输出约定

```
docs/research/YYYY-MM-DD-<topic-slug>/
├── <模型1>.md        # 各模型独立简报（带来源与检索时间）
├── <模型2>.md
├── ...
└── 00-analysis.md    # oracle 交叉检验 + 合并分析
```

全部中文；简报必须带来源 URL 与检索时间。

## 灵活性

- **换模型/加模型**：改「模型名单」列表（或简写映射）一处即可，无需改流程、无需装 agents。
- **临时指定**：触发消息里点名模型简称或完整 ID。
- **失败兜底**：`settings.json` → `agentOverrides.researcher.fallbackModels`。