# skills

本目录存放可复用的 pi skills。每个 skill 都是一个**独立 npm 包**，自包含主文件与引用文档，可单独安装、升级和卸载。

## 现有技能

| 路径 | npm 包 | 一句话说明 |
|---|---|---|
| `grill-all/` | `pi-grill-all` | 以一轮轮提问不断拷问、压力测试你的思考与计划 |
| `multi-research/` | `pi-multi-research` | 多模型并行调研同一问题，oracle 交叉检验后合并分析 |
| `multi-code-review/` | `pi-multi-code-review` | OCR / Standards / Spec 三通道并行审查同一 diff，再由 oracle 裁决 |

## 安装方式

从 npm 按需安装：

```bash
pi install npm:pi-grill-all
pi install npm:pi-multi-research
pi install npm:pi-multi-code-review
```

项目级安装加 `-l`。开发未发布版本时，在仓库根目录执行对应的本地路径安装，例如：

```bash
pi install ./skills/grill-all
pi install ./skills/multi-research
pi install ./skills/multi-code-review
```

## 新增技能

1. 在 `skills/` 下新建 kebab-case 子目录。
2. 添加 `package.json`：唯一 npm 包名、独立版本、`files` 白名单和 `pi.skills: ["./"]`。
3. 放入根目录 `SKILL.md`；frontmatter 必须含 `name` 与 `description`。
4. 添加 `README.md`，说明用途、npm 安装、本地开发安装、目录结构和依赖。
5. 内部引用使用相对路径，保证子目录可以整体移动和打包。
6. 发布或提交前运行 `npm pack --dry-run`，检查 tarball 内容与 `files` 字段一致。

根仓库只是源码/文档中心，不再通过根 `package.json` 注册并加载全部 skills。