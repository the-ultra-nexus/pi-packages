# pi-packages

[pi](https://github.com/earendil-works/pi-coding-agent) 编码代理的包与资源合集。所有可分发、可安装的 pi 资源都按类型归档在这里，方便查找、复用与统一维护。

## 目录结构

| 路径              | 类型                       | 说明                                   |
| ----------------- | -------------------------- | -------------------------------------- |
| `skills/`         | 技能（skills）             | 可复用的代理技能，每个技能一个子目录   |
| `extensions/`     | 扩展（extensions）         | pi 扩展与自定义工具，每个扩展一个子目录 |
| `extensions/pi-attention` | 扩展：pi-attention | iTerm2/Orca 注意力集成：标题显示提问、完成通知、等待提醒 |
| `skills/grill-all` | 技能：grill-all            | 以一轮轮提问不断拷问、压力测试思考     |
| `skills/multi-research` | 技能：multi-research | 多模型对照调研：并行不同模型调研同一问题，oracle 交叉检验后合并分析 |

## 快速开始

- 使用某个技能：把对应的技能目录（如 `skills/grill-all/`）放到 pi 的技能搜索路径下，或在代理配置里引用，详见各子目录的 README。
- 安装某个扩展：`pi install git:github.com/the-ultra-nexus/pi-attention`（各扩展从镜像仓库分发，详见各子目录的 README）
- 添加新资源：在对应类型目录下新建子文件夹，目录内必须有 `README.md` 说明这是什么、怎么用。

## 约定

- 本项目是 **pi 资源合集**，不是某个单一技能的仓库；每个子项目保持独立、可单独分发。
- 每个文件夹（无论类型还是具体资源）都带自己的 `README.md`，介绍用途、结构与用法。
- 资源内部使用相对路径互相引用，移动整个子目录不影响其可用性。