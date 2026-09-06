# extensions

本目录存放 pi 的扩展与自定义工具。每个扩展都是一个**独立 npm 包**，自包含源代码、配置、文档和安装声明，可单独分发。

## 已收录

| 路径 | npm 包 | 说明 |
|---|---|---|
| `pi-attention/` | `pi-attention` | iTerm2 / Orca 注意力集成：标题、完成通知和等待提醒 |

## 安装

从 npm 按需安装目标扩展：

```bash
pi install npm:pi-attention
```

开发仓库中的未发布版本：

```bash
pi install ./extensions/pi-attention
```

项目级安装使用 `pi install -l`；卸载时使用安装时的对应 source。GitHub monorepo 仅作为源码与文档中心，不再推荐通过根目录一次性安装全部扩展。

## 新增扩展约定

- 每个扩展一个独立子目录，并保留自己的 `package.json`、README 和版本号。
- `package.json` 的 `pi.extensions` 只注册本扩展自身的资源（通常为 `./extensions`），不引用仓库根目录。
- 使用 `files` 白名单明确 npm tarball 内容；运行时依赖按 npm 规范声明。
- README 必须说明 npm 安装、本地开发安装、配置和卸载方式。
- 发布前在扩展目录运行 `npm pack --dry-run` 检查 tarball；不要依赖根包的聚合 manifest。
