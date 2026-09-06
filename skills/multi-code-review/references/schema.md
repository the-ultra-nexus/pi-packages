# 统一输出 Schema（三通道 + oracle 共用）

本文件定义 multi-code-review 的**统一工件契约**。三个通道（OCR / Standards / Spec）与 oracle 都按这里的结构产出，父会话才能做确定性的去重、消歧、重新定级与落盘。

## 输出目录

父会话在**目标仓库之外**创建审查输出目录（默认 `${TMPDIR:-/tmp}/multi-code-review/<YYYYMMDD-HHMMSS>-<topic>/`，可用 `--out` 覆盖）。目标仓库在工作区/索引层面的任何内容都不得被改动；所有审查工件都在该目录内。

## 工件清单

| 文件 | 写入者 | 说明 |
|---|---|---|
| `meta.json` | 父会话 | 审查范围元数据（见下） |
| `base.txt` / `head.txt` | 父会话 | base / head 的 SHA 或描述 |
| `files.txt` | 父会话 | reviewable files 清单（每行一个相对路径） |
| `diff.patch` | 父会话 | 统一 diff scope（`git diff --unified=3`） |
| `<channel>.json` | 通道 | 结构化 findings（见下） |
| `<channel>.md` | 通道 | 人读报告：覆盖声明 + verdict + findings 列表 |
| `00-adjudication.md` | 父会话 | oracle 合并后的最终报告，写入完整裁决 |

`<channel>` ∈ `ocr` | `standards` | `spec`（可裁剪）。

## meta.json

```jsonc

## Finding（结构化 JSON 项）

```json
{
  "id": "ocr-01",
  "channel": "ocr",
  "severity": "P0 | P1 | P2",
  "category": "correctness | security | performance | standards | spec | maintainability",
  "file": "path/to/a.ts",
  "line": 42,
  "title": "一行以内的标题",
  "evidence": "带行号的证据引用（代码片段或 diff hunk，必须真实存在于 diff/output 中）",
  "impact": "影响：用户可见后果、回归面、范围",
  "recommendation": "建议修法；若涉及多方案给选项",
  "status": "open"
}
```

- `id`：`<channel>-NN`，由通道自己编号。
- `evidence` 必须可在 diff / 源码中直接找到。**没有证据的条目不得出现**——宁可写进「待确认项」也不伪造。
- `line` 用 diff 中可见的行（无精确行号时给文件级范围，如 `"line": null` + `"scope": "file"`）。

## 严重度

| 级别 | 定义 | 通道判定 |
|---|---|---|
| `P0` | 合并前必须修复：安全漏洞、明确正确性 bug、破坏构建/测试、违反 spec 核心契约、数据损坏 | 该通道 → `BLOCK` |
| `P1` | 应该修复：明显缺陷、明显偏离规范/需求，但不阻塞合并 | 计入 `OK with notes` |
| `P2` | 建议改进：风格、可读性、非阻塞优化 | 计入 `OK with notes` |

## 通道 verdict

- `BLOCK` —— 存在 ≥1 个 P0；
- `OK with notes` —— 无 P0，但有 P1/P2；
- `OK` —— 零 findings。

每个 channels 输出末尾必须给出 verdict，且**必须覆盖全部 reviewable files**：`files.txt` 里每个文件要么在 findings 中被点评，要么出现在「已审查、无问题」列表中；跳过某个文件必须写原因（生成文件、二进制、无关文件等）。

## Markdown 报告结构（`<channel>.md`）

```markdown
# <通道名> 审查报告

- 通道: ocr | standards | spec
- Verdict: BLOCK | OK with notes | OK
- 覆盖: N/M 个 reviewable files 已覆盖（跳过项及原因见附录）

## Findings
### P0
### P1
### P2

## 覆盖声明
（每个文件一行：已审查 / 跳过 + 原因）

## 待确认项（可选）
（证据不足但值得跟进的事项，不计入 verdict）
```

JSON 与 Markdown 必须一致：Markdown 是给人读的渲染，JSON 是给 oracle 的结构化输入，二者 findings 集合相同。

## oracle 合并规则（00-adjudication.md）

oracle 读取三个 `<channel>.json` + `<channel>.md`，只做证据拼接与定级，不改动原子事实：

1. **去重**：同一文件 + 同一位置 + 同一实质问题的多条 findings 合并为一条，标注来源通道（`sources: ["ocr","standards"]`）；多通道共识 = 更高置信，可升级严重度的权重依据之一。
2. **消歧**：两个通道对同一改动给出相反意见时，逐条裁决：谁有证据谁赢；双方都没有强证据 → 列为开放问题，不武断压制。
3. **重新定级**：跨通道按严重度定义重新收口 P0/P1/P2；合并且重新定级后给出整体 verdict（规则同上）。
4. **缺失通道**：某通道失败/降级为 fallback 时，在报告中显式标注「该通道未完整运行（原因）」，不补空、不编造。

输出 `00-adjudication.md`：
- 最终 verdict（`BLOCK` / `OK with notes` / `OK`）
- 合并去重后的 findings 列表（按 P0 → P1 → P2）
- 各通道 verdict 与共识矩阵
- 缺失通道备注
- P0 项必须列出「阻止合并」的具体理由

## 校验

- `<channel>.json` 必须能被 `JSON.parse` 解析；父会话落盘前对三个 json 做一次解析校验，解析失败即记为通道失败而非继续使用。
- 三个 `<channel>.md` 的 verdict 与对应 json 的 severity 分布一致。