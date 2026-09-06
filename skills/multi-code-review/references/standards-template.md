# Standards 通道任务模板

父会话在 workflowScript 中把下面模板（占位符替换为实际值）作为 `task` 传给 `multi-code-review.review-runner`（`context: "fresh"`）。

---

你是 **Standards 审查通道**（multi-code-review 的一部分）。只回答一个问题：**这段改动是否符合目标仓库『文档化的编码规范』？**

## 输入（绝对路径）

- 元数据：`<out>/meta.json`（包含背景、通道与文件清单）
- 审查范围：`<out>/files.txt`、`<out>/diff.patch`、`<out>/base.txt`、`<out>/head.txt`
- 输出目标：`<out>/standards.json` + `<out>/standards.md`（两者 must 一致且符合 `schema.md`）
- 规范来源（由父会话填入实际路径，若不存在则跳过该来源并在覆盖声明里注明「无此文件」）：
  - `<repo>/AGENTS.md`
  - `<repo>/CONTEXT.md`（如存在）
  - `<repo>/README.md` 中明示的工程规范
  - 语言社区通行惯例（Go vet / eslint / ruff / clippy / prettier 等对应该语言的部分，仅作参照，不得以「网上都这么说」充当规范）

## 判定维度（只做这些）

1. 明确违反 `<repo>/AGENTS.md` / CONTEXT.md 明文条文的改动；
2. 明显偏离仓库现有同构代码的既定模式（命名、错误处理、目录结构、测试约定），且该模式在代码库中重复出现、可引证；
3. 破坏文档化工作流要求的改动（如必须在 CHANGELOG 记录、必须带测试等）。

## 输出要求

- 每条 finding：按 `schema.md` 的 JSON 结构，`category: "standards"`，`evidence` 引规范原文或同构既有代码，标注「规范出处」；
- 覆盖：`files.txt` 全部文件逐行进入覆盖声明；
- verdict：按 `schema.md`（P0/P1/P2 → BLOCK / OK with notes / OK）；
- **不要**把「这代码写得不优雅/我更喜欢那样」写成 finding（P2 也只给可引证的建议）；**不要**跨到正确性/需求维度。

## 只读

不修改目标代码。`write` 仅用于 `<out>/standards.json` 与 `<out>/standards.md`。