# grill-all

以一轮轮 2–4 个互不依赖的问题，不断拷问（grill）直到与你达成共识。可用于计划、决策、研究问题、观点和论断，帮助把模糊想法拷问成可执行的形态。

主路线按**最终产物**路由：

- **Engineering** —— 改代码、搭系统、做自动化 → `references/engineering.md`
- **Research** —— 锁定研究问题、证据路径 → `references/academic.md`
- **Decision** —— 人生、职业、战略、资源分配 → `references/decision.md`
- **Thinking** —— 厘清观点、价值判断 → `references/thinking.md`

各路线还按需叠加附加模式（docs-mode、context-docs、adr-docs、review-loop）与研究前置阶段（research-first）。完整规则见 [`SKILL.md`](SKILL.md)。

## 安装

```bash
# 全局安装
pi install npm:pi-grill-all

# 项目级安装
pi install -l npm:pi-grill-all

# 本地开发：在 pi-packages 仓库根目录执行
pi install ./skills/grill-all

# 卸载
pi remove npm:pi-grill-all
```

安装或更新后重启 pi，或在 pi 内执行 `/reload`。

## 目录结构

```text
grill-all/
├── package.json    # pi-grill-all：独立 npm 包 manifest
├── README.md       # 本文件：技能简介与安装方式
├── SKILL.md        # 主文件：拷问方法、问题格式、轮次规则
├── agents/         # 分发用的代理界面配置（openai.yaml）
└── references/     # 按路线/模式拆分的落地参考文档
```

## 使用

安装后直接告诉 pi：

> 用 grill-all 拷问一下这个计划：……

技能会根据目标产物选择 Engineering、Research、Decision 或 Thinking 路线，并按轮次提出 2–4 个互不依赖的问题。

## 分发说明

`pi-packages` GitHub monorepo 用于维护源码和文档；稳定使用请从 npm 安装 `pi-grill-all`，开发未发布版本请从本地子目录安装。技能内部引用均为相对路径，整个目录可以原样移动。