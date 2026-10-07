# pi-personal-rules 📌

Pi 的 **个人规则注入扩展**：把 `~/.pi/agent/PERSONAL.md` 的内容逐行注入系统提示的 `<rules>` 段末尾，排在 pi 内置规则之后、收尾两条（be concise / show paths）之前。

- **源码仓库**: [pi-packages](https://github.com/the-ultra-nexus/pi-packages)（GitHub monorepo 负责源码与文档）
- **npm 包**: `pi-personal-rules`（独立安装、升级和卸载）

## 功能

1. **规则注入** — 读取 `PERSONAL.md`，非空行逐条以 `- ` 追加到 `<rules>` 末尾；`PERSONAL.md` 不存在或全为空行时，`<rules>` 段保持 pi 默认内容。
2. **顺序稳定** — pi 内置规则在前，个人规则居中，`Be concise in your responses` / `Show file paths clearly when working with files` 始终留在最后。
3. **随时开关** — `/personal-rules` 命令、`Ctrl+Shift+R` 快捷键、`--no-personal-rules` 启动参数。
4. **状态持久化** — 开关状态写入全局文件 `~/.pi/agent/extensions/personal-rules.json`，跨会话 / 跨项目 / 重启后保持。
5. **footer 指示** — 常态显示 `PR:ON` / `PR:OFF`。

## 安装

```bash
# 全局安装
pi install npm:pi-personal-rules

# 项目级安装
pi install -l npm:pi-personal-rules

# 本地开发：在 pi-packages 仓库根目录执行
pi install ./extensions/pi-personal-rules

# 卸载
pi remove npm:pi-personal-rules
```

安装后**重启 pi，或在 pi 内执行 `/reload`** 即可生效。

## 配置

| 位置 | 说明 |
|------|------|
| `~/.pi/agent/PERSONAL.md` | 个人规则来源；每行一条，空行忽略 |
| `~/.pi/agent/extensions/personal-rules.json` | 开关的全局持久状态（`{"enabled": true}`），自动读写 |
| `--no-personal-rules` | 本次运行禁用注入（只覆盖本次，不写状态文件） |
| `/personal-rules`、`Ctrl+Shift+R` | 运行时切换注入，并写回全局状态文件 |

`PERSONAL.md` 示例：

```markdown
默认用简体中文回复。
改代码前先读目标文件。
不要顺手重构任务范围外的代码。
```

## 事件/原理

- `before_agent_start` — 从当前渲染结果提取内置 `<rules>` 原文，与 `PERSONAL.md` 行合并后写回 `options.sections.rules`；无个人规则时删除该 section，交回 pi 默认渲染。
- `session_start` — 从 `~/.pi/agent/extensions/personal-rules.json` 恢复开关，再让 `--no-personal-rules` 覆盖本次运行；刷新 footer。
- 切换（命令 / 快捷键）— 翻转开关并原子写回全局状态文件（临时文件 + rename），写盘失败不阻塞交互。
- `session_shutdown` — 清除 footer 状态。

## License

MIT
