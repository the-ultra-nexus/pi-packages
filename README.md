# pi-iterm2 🍎

Pi 的 iTerm2 集成扩展：把 iTerm2 的标签页标题显示为**会话第一次 pi 提问**，并在**回答完成时弹 macOS 系统通知**（使用 iTerm2 原生转义序列，无需第三方工具）。

- **仓库**: https://github.com/the-ultra-nexus/pi-iterm2

## 功能

1. **标题恒定显示提问** — 标题显示本会话最开始的一次提问，跨 reload / resume 稳定，退出时还原。
2. **回答完成系统通知** — 每次回答完成后，在 macOS 通知中心弹出通知，标题显示 assistant 回复摘要。

## 安装

作为 pi 包安装：

```bash
# 从 GitHub 安装（推荐）
pi install git:github.com/the-ultra-nexus/pi-iterm2

# 仅临时试用，不写入配置
pi -e git:github.com/the-ultra-nexus/pi-iterm2

# 本地路径安装（开发调试）
pi install ***REMOVED***pi-iterm2
```

安装后**重启 pi，或在 pi 内执行 `/reload`** 即可生效。

查看/卸载：

```bash
pi list                                            # 查看已安装的包
pi remove git:github.com/the-ultra-nexus/pi-iterm2   # 卸载（用你安装时的 source）
```

## 配置

| 环境变量 | 默认 | 说明 |
|----------|------|------|
| `PI_ITERM2_NOTIFY` | 开 | 设为 `0` 关闭「回答完成通知」 |

### 通知机制（iTerm2 原生，无需第三方工具）

回答完成时，扩展直接向 iTerm2 发送两条**原生转义序列**来触发通知，发送者即 iTerm2：

- `OSC 9 ; <消息>` → 弹系统通知
- `OSC 1337 ; RequestAttention=once` → dock 图标弹跳一次 + 系统提示音

无需安装 terminal-notifier 或 osascript。仅当不在 iTerm2 终端（如 tmux）时，才回退到 osascript 方式（并用显式提示音）。

## 标题行为

- 标题**恒定显示本会话最开始的一次提问**（会话里第一条 user 消息），跨 reload / resume 稳定
- 退出 pi → 标题还原为基础标题 `π · <会话名> · <目录名>`

## 通知

- 回答完成（`agent_settled`，消息已落盘）时触发 iTerm2 原生通知
- **通知标题显示 assistant 回复摘要**（最后一条回复的前 60 字）
- 发送者为 iTerm2（OSC 9）+ dock 弹跳 + 系统提示音（`RequestAttention=once`）

## 事件/原理

- `session_start` — 会话启动/加载/恢复时，设定标题为最开始提问
- `agent_settled` — 回答完成（消息已落盘）时触发，发系统通知 + 校正标题
- `session_shutdown` — 会话退出时还原标题

## License

MIT
