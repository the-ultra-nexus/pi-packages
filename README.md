# pi-iterm2 🍎

Pi 的 iTerm2 集成扩展：把 iTerm2 的标签页标题显示为**会话第一次 pi 提问**，并在**回答完成时弹 macOS 系统通知**（使用 iTerm2 原生转义序列，无需第三方工具）。

- **仓库**: https://github.com/the-ultra-nexus/pi-iterm2

## 功能

1. **标题运行动画** — 请求运行时标题显示盲文旋转动画，回答结束还原为基础标题 `π · <会话名> · <目录名>`（逻辑参照 Orca 的 titlebar-spinner）。
2. **回答完成系统通知** — 每次回答完成后，在 macOS 通知中心弹出一条「pi 已完成回答」。

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
| `PI_ITERM2_NOTIFY` | 开 | 设为 `0` 关闭「回答完成系统通知」 |

### 通知机制（iTerm2 原生，无需第三方工具）

回答完成时，扩展直接向 iTerm2 发送两条**原生转义序列**来触发通知，发送者即 iTerm2：

- `OSC 9 ; <消息>` → 弹系统通知
- `OSC 1337 ; RequestAttention=once` → dock 图标弹跳一次 + 系统提示音

无需安装 terminal-notifier 或 osascript。仅当不在 iTerm2 终端（如 tmux）时，才回退到 osascript 方式（并用显式提示音）。

## 标题行为

- 请求**开始**（`agent_start`）→ 标题启动旋转动画（盲文帧，每 80ms 换一帧）
- 请求**结束**（`agent_end`）→ 停止动画，还原为基础标题 `π · <会话名> · <目录名>`
- 退出 pi → 同样还原为基础标题

完全沿用 Orca 的事件对（`agent_start` / `agent_end`），不做“记住最初/最新提问”的持久化，
因此干净、无 reload 闪现或标题漂移问题。

## 事件/原理

- `before_agent_start` — 每次用户提交请求触发，`event.prompt` 即请求原文
- `agent_settled` — 回答完成（不会自动继续）时触发，发系统通知
- `session_shutdown` — 会话退出时还原标题

## License

MIT
