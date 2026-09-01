# grill-all

以一轮轮 2–4 个互不依赖的问题，不断拷问（grill）直到与你达成共识。可用在计划、决策、研究问题、观点、论断上，帮助你把模糊的想法拷问成可执行的形态。

主路线按**最终产物**路由：

- **Engineering** —— 改代码、搭系统、做自动化 → `references/engineering.md`
- **Research** —— 锁定研究问题、证据路径 → `references/academic.md`
- **Decision** —— 人生、职业、战略、资源分配 → `references/decision.md`
- **Thinking** —— 厘清观点、价值判断 → `references/thinking.md`

各路线还按需叠加附加模式（docs-mode、context-docs、adr-docs、review-loop）与研究前置阶段（research-first）。完整规则见 [`SKILL.md`](SKILL.md)。

## 目录结构

```
grill-all/
├── README.md        本文件：技能简介
├── SKILL.md         主文件：完整的拷问方法、问题格式、轮次规则
├── agents/          分发用的代理界面配置（openai.yaml）
└── references/      按路线/模式拆分的落地参考文档，由主文件按需读取
```

## 使用方式

将本目录整体加入 pi 的技能搜索路径，或直接配置 `SKILL.md` 当前文件内容即可。技能内部均使用相对路径引用，整个目录可以原样移动。