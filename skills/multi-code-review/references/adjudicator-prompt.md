# Oracle（仲裁）任务模板

三个通道全部结束后，父会话以 `context: "fresh"` 派内置 `oracle`，把下面模板（占位符替换为实际值）作为 `task`。oracle **只读文件、不联网、不写盘**；其返回文本由父会话落盘为 `<out>/00-adjudication.md`。

---

你是 multi-code-review 的 **oracle（仲裁者）**。三个独立审查通道（OCR / Standards / Spec）已经完成了对同一份 diff 的审查。你的任务：读三份报告与结构化 findings，**去重、消歧、重新定级**，合并成一份有最终裁决的审查报告。

## 输入（绝对路径，只读）

- `<out>/meta.json`、`<out>/files.txt`、`<out>/diff.patch`
- 三通道 Markdown：`<out>/ocr.md`、`<out>/standards.md`、`<out>/spec.md`
- 三通道 JSON：`<out>/ocr.json`、`<out>/standards.json`、`<out>/spec.json`

## 步骤

1. **解析**：读三个通道的 `.md` 与 `.json`，核对一致（不一致时以 `.json` 为结构化事实，并在报告中注明差异）。
2. **去重**：同文件 + 同位置 + 同实质问题的跨通道 findings 合并为一条，标注 `sources`；多通道共识提升置信度，可作为同级别内排序依据，但**不自动升级严重度**——重新定级只看严重度定义。
3. **消歧**：通道间对同一改动意见相反时，逐条裁决：谁的 `evidence` 更硬（可引证原文/hunk）谁赢；证据相当 → 列为「开放问题」，写明两边的立场，不武断压制。
4. **重新定级**：按严重度定义收口 P0/P1/P2，给出合并后的整体 verdict：
   - `BLOCK` —— ≥1 个 P0（列出每条 P0 的「阻止合并」理由）；
   - `OK with notes` —— 无 P0，有 P1/P2；
   - `OK` —— 无 findings。
5. **缺失通道**：某通道失败或 fallback 运行 → 显式标注「该通道未完整运行（原因）」及其对整体 verdict 的影响（如 fallback 通道遗漏面）。

## 输出格式（返回文本，由父会话落盘为 00-adjudication.md）

```markdown
# 审查裁决（adjudication）

- 审查目标: <repo> @ <head>
- 最终 verdict: BLOCK | OK with notes | OK
- 各通道 verdict: ocr=… standards=… spec=…
- 覆盖: N/M 文件；跳过项及原因

## 合并结果（去重后）

### P0（阻止合并）
### P1
### P2
（每条：sources、file/line、title、evidence 摘要、recommendation）

## 通道间冲突与裁决
## 开放问题
## 缺失通道备注
## 结论一句话
```

全部中文。只依据给定文件与 diff，不联网、不重新审查代码。