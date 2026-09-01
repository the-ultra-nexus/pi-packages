---
name: multi-research
description: 多模型对照调研——派多个采用不同模型的 researcher 并行调研同一问题，再由 oracle 交叉检验、合并成一份带对照与裁决的分析报告
---

对用户给出的同一个问题，并行派出若干**不同模型**的研究 agent 独立调研，最后由 oracle 交叉检验并合并产出**一份**分析报告：逐字段对照、冲突标注、来源裁决、模型质量观察。模型配置全部在 agent 定义里（`agents/*.md`），本 skill **不写死任何模型**，只引用角色名。

## 前置：角色自检

先确认 3 个研究角色已注册（`subagent` 工具 `action: "list"` 应能看到 `researcher-glm`、`researcher-qwen`、`researcher-mimo`）：

- 若缺失：从本 skill 所在目录的 `agents/` 把缺失的 `*.md` 复制到 `~/.pi/agent/agents/`，提示用户再次触发（或直接继续，若缺的角色可现场按 `agents/` 内模板补齐）。
- 评审角色 `oracle` 是 pi-subagents 内置的，无需检查。

## 输入解析

- **问题**：用户给的调研问题（必填）。
- **主题标签**（可选）：`<topic>` 用于目录命名，缺省用问题前几个词做 slug。
- **落盘根**（可选）：缺省为当前项目 `docs/research/`。

## 执行步骤

### 1. 准备输出目录

日期取当天 UTC+8：`docs/research/YYYY-MM-DD-<topic-slug>/`，创建目录（三份简报 + 一份分析报告都放这里）。

### 2. 并行调研（三个不同模型，谁先回谁先落盘）

用一次 `workflowScript` 的 `runs.all` 同时派 3 个角色，同一个任务文本（问题相同），各自写到独立文件：

```js
subagent({ workflowScript: `
  const topic = "<topic-slug>";
  const q = "<问题>";
  const dir = "docs/research/YYYY-MM-DD-${topic}";
  const results = await runs.all([
    { key: "glm",  agent: "researcher-glm",  task: "问题：" + q + "\\n输出：用 write 写中文简报到 " + dir + "/glm.md",
      output: dir + "/glm.md" },
    { key: "qwen", agent: "researcher-qwen", task: "问题：" + q + "\\n输出：用 write 写中文简报到 " + dir + "/qwen.md",
      output: dir + "/qwen.md" },
    { key: "mimo", agent: "researcher-mimo", task: "问题：" + q + "\\n输出：用 write 写中文简报到 " + dir + "/mimo.md",
      output: dir + "/mimo.md" }
  ]);
  return results;
`})
```

要点：
- 每个 child 的 `output` 用**绝对路径或相对于当前项目根**的相对路径（workflow cwd 即项目根），保证 3 个文件互不覆盖。
- 任一支失败：记录失败原因，其余支照常；最终分析要标注缺失的那支。

### 3. oracle 交叉检验 + 合并分析

3 份简报齐了之后，派 `oracle`（内置，`thinking: high`，无 web 工具，只读文件——保证它不重新检索、只看三份简报本身）：

```js
subagent({ agent: "oracle", output: false,
  task: `读取并交叉检验以下三份关于"<问题>"的中文调研简报：
  - ${abs(dir)}/glm.md
  - ${abs(dir)}/qwen.md
  - ${abs(dir)}/mimo.md
  只基于文件内容（不要联网），产出一份中文分析，包含：
  1. 逐字段对照表（同一事实维度下三方的数值/说法/来源并排）
  2. 一致性结论：三方一致的点；有冲突的点（冲突双方各自的依据与来源）
  3. 来源可信度裁决：对冲突点，按来源权威性给出结论与理由
  4. 合并后的最终回答（Summary 级别的直接结论）
  5. 模型质量观察：哪份简报更全面/更准确/引用更可靠，各一句话
  若有文件缺失，明确说明。` })
```

注意：`oracle` 的 tools 不含 `write`，它的分析在返回文本里；由父会话把返回内容落盘为 `<dir>/00-analysis.md`（`output: false` 避免它写别处）。

### 4. 汇报

向用户给出：
- 最终合并回答（几句话说清楚结论）
- 3 个角色的关键分歧点一句话总结
- 报告路径：三份简报 + `00-analysis.md`

## 输出约定

```
docs/research/YYYY-MM-DD-<topic-slug>/
├── glm.md      # researcher-glm（GLM）简报
├── qwen.md     # researcher-qwen（Qwen）简报
├── mimo.md     # researcher-mimo（MiMo）简报
└── 00-analysis.md  # oracle 交叉检验 + 合并分析
```

全部中文。简报必须带来源与检索时间。

## 灵活性

- 想换某个研究模型的模型：改 `agents/researcher-*.md` 的 `model:` 一行，skill 无需改动。
- 想临时加一支：复制任一 `agents/researcher-*.md` 改名换模型，并在步骤 2 的 `runs.all` 里加一个条目即可。
- 失败线程沿用各 agent 的 `fallbackModels`（可在 `settings.json` 的 `agentOverrides` 配置）。