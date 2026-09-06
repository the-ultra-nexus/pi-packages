# OCR 通道（open-code-review 风格审查）

OCR 通道的目的是独立于「标准」与「需求」之外，纯粹从 diff 找**代码正确性/安全问题**：bug、回归、崩溃、竞态、资源泄漏、安全漏洞、边界条件、明显的性能缺陷。与 Standards（是否遵守仓库规范）、Spec（是否满足需求）正交。

## 前置探测（在通道任务内由 review-runner 执行）

```bash
command -v ocr   # 命中 → 本机有 OpenCodeReview CLI；未命中 → 走 fallback
```

本机安装来源：`npm install -g @alibaba-group/open-code-review`（或项目内 `npx ocr`）。**它是可选依赖**：缺失不阻止本 skill 的安装与其余两个通道运行。

## 有 CLI：delegate 模式（默认）

open-code-review 的 delegate 命令做**确定性工程**（文件选择与规则解析），LLM 审查部分由 review-runner 自己承担——这正是 open-code-review-delegate 的接力方式，不需要为 OCR 配置 LLM 服务。

```bash
ocr delegate preview                              # 预览哪批文件会被审（带 mode/ref 元数据）
ocr delegate rule <files...>                      # 输出解析后的审查规则（按内容分组）
```

流程：

1. `ocr delegate preview` → 得到 OCR 端的文件集合，与本通道拿到的 `files.txt` 求并/对齐（OCR 端选择是参考，最终覆盖清单以父会话的 `files.txt` 为准，但 OCR 的取舍可以指出父会话漏掉的候选）。
2. `ocr delegate rule` → 得到解析后的规则集（命名、安全、错误处理等）。为避免文件名含空格时 shell 分词，逐行读取 `files.txt` 后以数组参数安全传给命令：

   ```bash
   files=()
   while IFS= read -r file; do files+=("$file"); done < <(cat <out>/files.txt)
   ocr delegate rule "${files[@]}"
   ```

   把这些规则作为 review-runner 判定的**规则原料之一**，交叉引用时注明规则来源文件的路径。
3. review-runner 依据 `diff.patch` + 规则集 + meta.json 的 `background` 自行审查，产出符合 `schema.md` 的 `<out>/ocr.json` 与 `<out>/ocr.md`。

## 可选加强：让 OCR 自己出报告（仅当用户已配置 OCR 的 LLM provider）

如果用户的 OCR 已配置可用 provider，可以额外跑一次完整 review 作为旁证：

```bash
ocr review --from "$(cat <out>/base.txt)" --to "$(cat <out>/head.txt)" --format json \
  --audience agent [--background-file <背景文件>]
```

- **不伪造 JSON**：`--format json` 的 stdout 必须是合法 JSON 才能并入；若输出为空、报错、或含非 JSON 内容，则把本次失败记为「OCR 完整模式不可用，仅用 delegate 模式」，**不得**手工把文本包装成 JSON 当作 `ocr.json`。
- 该旁证的 findings 与 review-runner 自己的结论合并进 `ocr.md`，来源注明 `ocr-cli` / `review-runner`。

## 无 CLI / CLI 失败 → fallback

- 未检测到 `ocr`：按 `fallback-template.md` 执行纯 Pi 版本（review-runner 仍然做完整审查，只是少了 OCR 规则集与文件选择旁证）。
- 检测到但 `delegate preview/rule` 报错（例如仓库不是 git、超出支持范围）：同样走 fallback，并在 `<out>/ocr.md` 顶部注明「OCR CLI 不可用：<具体错误>，本通道以 fallback 方式运行」。

## 本通道绝不做的

- 修改目标代码（只读；`write` 仅用于 `<out>/ocr.*` 审查产物）。
- 凭空臆造规则来源、伪造 CLI 输出、把 ChatGPT 式猜测写成 evidence。
- 把「标准不符合」或「需求不满足」写成 OCR 通道的 finding——那是 standards / spec 通道的职责，发现这类问题并入「待确认项」提示跨通道对账。