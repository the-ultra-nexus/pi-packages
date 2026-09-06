---
name: multi-code-review
description: 三方并行代码审查——OCR（正确性/安全）、Standards（仓库规范）、Spec（需求满足）三个通道并行审查同一 diff，内置 oracle 去重消歧、跨通道重新定级，合并为一份带裁决的报告（00-adjudication.md）。纯 Pi workflowScript 编排，不需要 Orca。触发：用 multi-code-review 审查 <workspace/commit/分支>。
---

对用户给出的审查目标，用 **三个相互独立的通道并行审查同一份 diff**，最后让 **oracle** 交叉检验、去重消歧、重新定级，合并成**一份**带最终裁决的审查报告。

- **OCR 通道**（open-code-review 风格）：不看规范、不看需求，只从 diff 找代码本身的正确性与安全问题。
- **Standards 通道**：改动是否符合仓库**文档化编码规范**（AGENTS.md / CONTEXT.md / README 明示约定 / 语言惯例）。
- **Spec 通道**：改动是否满足它**应当满足的需求/规格**（用户说明、issue/PR 描述、commit message 声称、既有公开契约）。

三个通道使用同一个执行体 `multi-code-review.review-runner`（本包的 subagent，随包自动发现），由父会话用一次 `workflowScript` 的 `runs.all` 并行发起；oracle 用 pi-subagents **内置** `oracle`（无 web 工具、只读文件），保证它不重新检索、只做证据拼接与定级。

## 触发解析

- **不指名范围**："用 multi-code-review 审查 <topic>" → 审查**当前 workspace**（staged + unstaged + untracked 相对 HEAD 的改动）。
- **指名范围**：
  - `--commit <sha>` → 审查该 commit 相对其父提交的改动；
  - `--branch <base>..<head>`（或 `--from <base> --to <head>`）→ 审查 `<base>..<head>`（merge-base 之后）的改动。
- **可选参数**（原样沿用）：
  - `-b, --background <需求/业务说明>` 或 `--background-file <path>` → 需求上下文，喂给 Spec 通道与 oracle；
  - `--out <绝对路径>` → 输出目录覆盖（缺省 `${TMPDIR:-/tmp}/multi-code-review/<YYYYMMDD-HHMMSS>-<topic>/`）；
  - `--channels ocr,standards,spec` → 裁剪通道（默认三者全开）；
  - `-b`/`--background-file` 之外，允许用户提供 issue/PR 文本文件路径 → 父会话把内容落盘为 `<out>/requirements.md`。

## 前置

1. 需要 pi-subagents（内置 agent `oracle` 与 `runs.all` 运行时）。若用户环境没有，先 `pi install npm:pi-subagents`。
2. `multi-code-review.review-runner` 由本包 `pi-subagents.agents: ["./agents"]` 自动发现，**无需手工复制 agent 文件**。启动前可 `subagent({ action: "list", capabilities: true })` 确认它可执行（期望名 `multi-code-review.review-runner`）。
3. **OCR CLI（open-code-review）是可选依赖**：PATH 里存在 `ocr`（`command -v ocr`）时，OCR 通道走 delegate 模式（CLI 做文件选择与规则解析，审查由 review-runner 承担）；缺失或失败自动降级为 fallback，不影响其余通道与 skill 安装。

## 执行步骤

### 1. 准备审查工件（父会话，全部在目标仓库之外）

```bash
OUT="${TMPDIR:-/tmp}/multi-code-review/$(date +%Y%m%d-%H%M%S)-<topic-slug>"
mkdir -p "$OUT"
# workspace：HEAD 相对的已暂存 + 未暂存 tracked 改动
: > "$OUT/diff.patch"
git -C <repo> diff --unified=3 HEAD > "$OUT/diff.patch"
git -C <repo> diff --name-only HEAD > "$OUT/files.txt"
# untracked 文件不在 git diff HEAD 中，补成 /dev/null → 新文件的 no-index diff
while IFS= read -r file; do
  printf '%s\n' "$file" >> "$OUT/files.txt"
  if git -C <repo> diff --no-index --unified=3 -- /dev/null "<repo>/$file" >> "$OUT/diff.patch"; then
    status=0
  else
    status=$?
  fi
  [ "$status" -le 1 ] || exit "$status"  # 1 = 有 diff；>1 = 命令失败
done < <(git -C <repo> ls-files --others --exclude-standard)
# commit 模式：git diff --unified=3 <sha>^ <sha>；branch 模式：先取 merge-base，再 diff
# BASE=$(git -C <repo> merge-base <base> <head>)
# git -C <repo> diff --unified=3 "$BASE" <head> > "$OUT/diff.patch"
# git -C <repo> diff --name-only "$BASE" <head> > "$OUT/files.txt"
echo "<base>" > "$OUT/base.txt"; echo "<head>" > "$OUT/head.txt"
```

再写 `<out>/meta.json`（结构见 `references/schema.md`：repo、target、base/head、channels、reviewableFiles、diffPath、background）。若有 requirements 文件，复制到 `<out>/requirements.md`。**工件放在目标仓库之外**（TMPDIR / --out），保证审查前后目标仓库 `git status` 与哈希完全不变。

### 2. 三通道并行 + oracle（一次 workflowScript 跑完）

三通道和 oracle 放在**同一个**异步 workflowScript 中：先用 `runs.all` 并行运行三个 channel，全部返回后再运行 oracle。这样不会在父会话中再开第二个顶层 subagent workflow。

```js
subagent({ async: true, workflowScript: `
  const arms = [
    { key: "ocr", agent: "multi-code-review.review-runner", context: "fresh",
      task: "<OCR 通道任务：references/ocr-flow.md（有 ocr CLI）或 fallback-template.md（无 ocr）>\\n输出绝对路径 <out>/ocr.json + <out>/ocr.md，结构见 references/schema.md" },
    { key: "standards", agent: "multi-code-review.review-runner", context: "fresh",
      task: "<Standards 通道任务：references/standards-template.md 填好占位符>\\n输出绝对路径 <out>/standards.json + <out>/standards.md" },
    { key: "spec", agent: "multi-code-review.review-runner", context: "fresh",
      task: "<Spec 通道任务：references/spec-template.md 填好占位符>\\n输出绝对路径 <out>/spec.json + <out>/spec.md" }
  ];
  const channels = await runs.all(arms);
  const adjudication = await runs.run("oracle", {
    agent: "oracle",
    context: "fresh",
    output: false,
    task: "<references/adjudicator-prompt.md 填好占位符；读取 <out> 中已有的通道工件，缺失通道要注明>"
  });
  return { channels, adjudication };
`})
```

要点：
- 任务文本由父会话按对应 `references/*template*.md` / `ocr-flow.md` 组装，**占位符填实际值**（`<out>`、`<repo>`、规范来源路径、需求文本）。
- 三个 channel 使用 `agent: "multi-code-review.review-runner"`（包作用域名）和 `context: "fresh"`；oracle 也使用 `context: "fresh"`。
- `runs.all` 返回后才启动 oracle，保证 oracle 读取到已完成的通道产物；任一通道失败时，oracle 按「缺失通道」标注，流程不中断。
- 父会话拿到 workflow 返回值后，对已有的三个 `<channel>.json` 做 `JSON.parse` 校验；解析失败即视为该通道失败，并把原因交给 oracle/最终报告。

### 3. oracle 裁决与落盘

oracle 是 pi-subagents **内置** agent，不提供 web 工具，且 `output: false`；它只读 `<out>` 中的 meta、diff 和通道报告，返回裁决文本。workflowScript 将该返回值交回父会话，父会话把它落盘为 **`<out>/00-adjudication.md`**。oracle 的具体提示词见 `references/adjudicator-prompt.md`。

### 4. 汇报

向用户给出：最终 verdict（`BLOCK` / `OK with notes` / `OK`）→ 三通道 verdict 一行 → P0 列表（若有）→ 报告路径。提示目标仓库未被改动、审查产物在 `<out>`。若用户要求，可把 `<out>/00-adjudication.md` 摘要复制进仓库（复制动作由用户决定与执行，保持审查期间仓库零改动）。

## 输出约定

```text
${TMPDIR:-/tmp}/multi-code-review/YYYYMMDD-HHMMSS-<topic>/
├── meta.json        # 审查范围元数据
├── files.txt        # reviewable files
├── diff.patch       # 统一 diff scope
├── base.txt / head.txt
├── ocr.json + ocr.md          # OCR 通道（有/无 ocr CLI 都在此）
├── standards.json + standards.md
├── spec.json + spec.md
└── 00-adjudication.md          # oracle 合并裁决
```

全部中文；findings 必须带可引证的 `evidence`（schema.md）。

## 依赖与降级

- **pi-subagents**：必需（oracle + runs.all + 包 agent 发现）。缺失 → 提示用户 `pi install npm:pi-subagents` 后重试。
- **ocr CLI（open-code-review）**：可选。检测/运行失败 → OCR 通道按 `fallback-template.md` 降级运行并在报告顶部注明；其余通道不受影响。
- **内置 reviewer**：仅作设计参考（证据制、P0/P1/P2、三态判定），不作为默认第四个并行通道；用户显式要求时可由父会话单独加一条旁证通道。

## 安全边界

- 三通道与 oracle 全部只读；`review-runner` 的 `write` 仅限 `<out>` 审查产物。
- 目标仓库的代码、工作区、git 状态在审查期间零改动；审查产物一律写在目标仓库之外。
- 本 skill 会指示执行体运行 `ocr` CLI 与 `git` 只读命令；仅在用户明确许可的仓库上使用。