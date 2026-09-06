# pi-packages

[pi](https://github.com/earendil-works/pi-coding-agent) 编码代理资源的 GitHub monorepo。仓库集中维护源码与文档，但每个 skill / extension 都是**独立 npm 包**，可单独安装、升级和卸载。

## 目录结构

| 路径 | 类型 | npm 包 | 说明 |
|---|---|---|---|
| `skills/grill-all/` | skill | `pi-grill-all` | 以一轮轮提问不断拷问、压力测试思考 |
| `skills/multi-research/` | skill | `pi-multi-research` | 多模型并行调研同一问题，由 oracle 交叉检验并合并分析 |
| `skills/multi-code-review/` | skill + subagent | `pi-multi-code-review` | OCR / Standards / Spec 三通道并行代码审查与 oracle 裁决 |
| `extensions/pi-attention/` | extension | `pi-attention` | iTerm2 / Orca 注意力集成、完成通知和等待提醒 |

## 安装

默认按需安装**单个资源**，不要把 GitHub monorepo 当作合集安装入口：

```bash
# 全局安装
pi install npm:pi-grill-all
pi install npm:pi-multi-research
pi install npm:pi-multi-code-review
pi install npm:pi-attention

# 项目级安装（写入当前项目的 .pi/settings.json）
pi install -l npm:pi-grill-all

# 卸载时使用对应的 npm source
pi remove npm:pi-grill-all
```

本地开发或测试仓库中的未发布版本：

```bash
pi install ./skills/grill-all
pi install ./skills/multi-research
pi install ./skills/multi-code-review
pi install ./extensions/pi-attention
```

GitHub monorepo 仅作为源码、文档、issue 和版本管理中心。需要贡献代码时 clone 仓库后，从对应子目录以本地路径安装；稳定使用时从 npm 安装目标独立包。

## 约定

- 根 `package.json` 保持 `private: true`，并以 npm workspaces 管理四个独立子包；根 pi manifest 不注册任何资源，避免误装整套资源。
- 每个可分发子目录拥有自己的 `package.json`、版本号、README 和 pi manifest；包名与资源一一对应。
- skill 包通过 `pi.skills: ["./"]` 注册自身根目录的 `SKILL.md`；extension 包只注册自身的 `./extensions`。
- `pi-multi-code-review` 通过 `pi-subagents.agents: ["./agents"]` 自动发现其 `review-runner`，无需手工复制 agent 文件。
- 资源内部使用相对路径互相引用，移动整个子目录不会破坏引用。
- 发布前在对应子目录运行 `npm pack --dry-run`，确认 tarball 只包含运行所需资源；实际 `npm publish` 属于发布流程，不在本仓库实施步骤中执行。
