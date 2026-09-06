# Orca 原生通知机制（调研记录）

> 主题：pi 跑在 Orca pane 里时，「等待用户操作」如何获得类似 Orca 原生的提示。
> 结论先行：Orca 对 hook 事件有三类处理——**状态指示、blocked 等待卡、系统通知（plugin 通知）**；
> `ui_prompt_*` 不在 Orca 协议内，需要走下面「可行通道」之一。
> 本文档的代码位置均来自 Orca.app（2026-09 版，macOS 13.7.8）。

---

## 1. Orca 对 hook 上报的总入口

本地 hook 端点：`http://127.0.0.1:<ORCA_AGENT_HOOK_PORT>/hook/<source>`（source 见 `app.asar.unpacked/out/shared/agent-hook-relay.js` 的 `AGENT_HOOK_SOURCES`，含 claude/pi 等）。
请求头 `X-Orca-Agent-Hook-Token`。pi 侧上报参考实现：`~/.pi/agent/extensions/orca-agent-status.ts`（用户级、`@orca-managed-pi-extension`，会被 Orca 定期覆盖）。

## 2. 三类原生提示

### 2.1 状态指示（agent 生命周期事件）
- 消费端：`app.asar.unpacked/out/shared/agent-hook-listener/providers/pi-family-events.js`（`normalizePiCompatibleEvent`）
- pi 的 `agent_start / tool_call / tool_execution_start / tool_execution_end / message_end / agent_end / before_agent_start` → state ∈ {working, done} → Orca 界面内 spinner/完成状态/标题变化
- **→ 用户实测的「回答完有提示」就是这条**：Orca 原生消费 `agent_end`，无需任何扩展。

### 2.2 blocked（等待用户）状态
- 判定（pi-family-events.js + agent-question-answered-intent.js）：
  ```js
  isPiCompatibleAsk = agentType==='pi' && isAskUserQuestionTool(toolName) &&
                      (eventName==='tool_call' || eventName==='tool_execution_start')
  ```
- `isAskUserQuestionTool`：归一化（去非字母数字、小写）后 === `askuserquestion` || === `requestuserinput`
  - pi 若用工具名 `ask_user_question`（归一化后 = askuserquestion）会被识别
  - **`plan_mode_question` / `plan_mode_complete` / 自定义 UI 不在白名单** → Orca 视为普通 working，不显示等待
- grok 的做法（grok-events.js）：hook `notification` 事件 + `message` 字段含 permission/approval/confirm/needs your/requires your/feedback/clarify/question 等 → state=waiting

### 2.3 plugin 通知（系统通知，来源 = 发送 app）
- 主进程（app.asar 打包代码）：
  ```js
  async dispatchPlugin(e) {
    let t = `${e.pluginId}: ${e.title}`, n = e.body ?? '', r = !1;
    try { r = V2().showNotification({ title: t, body: n }) } catch {}
    return this.dispatch({ type: 'notification', source: 'plugin', title: t, body: n }), { delivered: r }
  }
  ```
  - `showNotification` = Electron `new Notification({title, body}).show()`（打包 `notification:` 段，GNr 函数带 sound/silent 处理）
- 事件识别：payload 含 `notification_type` / `notificationType` 字段（或 hook 名映射 `notification` → `Notification`，见打包的 hook 事件名映射）
- **这条通道弹的是真正的 macOS 系统通知，来源是 Orca 应用（或 pluginId 前缀的 app）**——是「像 Orca 原生一样」的提示

## 3. pi 的现状与缺口

| 场景 | Orca 原生表现 | pi-attention 现在的兜底 |
|------|--------------|------------------------|
| 回答完成（agent_end） | ✅ Orca 界面状态提示（2.1） | request-title（仅 iTerm2 OSC 生效；Orca 下无动作） |
| 等待用户（plan/权限弹窗） | ❌ 无（ui_prompt 不在协议内；plan_mode_question 不在白名单） | osascript 系统通知（来源「脚本编辑器」） |

## 4. 让等待获得 Orca 原生提示的可行通道（已定）

**已采用（实验验证通过）——上报 `notification` 事件**：`ui_prompt_start` 时 hook 上报

```json
{ "hook_event_name": "notification", "message": "Pi 正在等待你的操作", "title": "…", "body": "在 pi 窗口里完成操作", "notification_type": "permission_prompt", "level": "info" }
```

- ✅ Orca 主进程消费（dispatchPlugin → Electron `new Notification`），弹**原生系统通知**，来源为 Orca 应用；
- ✅ **仅在 Orca 不在前台时弹出**（前台静默）——正符合「人离开窗口才提醒」的诉求；
- ✅ 不产生状态快照（provider 层无映射），不污染 last-status.json；
- ⚠️ `ui_prompt_*` 事件 Orca 不消费（白名单只有 `ask_user_question` / `request_user_input` 的 tool_call），不再上报。

被否 / 备选通道：

1. **伪造 `ask_user_question` 的 tool_call**（副作用大，不推荐）：上报 `tool_call` + `tool_name: "ask_user_question"` → Orca blocked 等待卡；风险：Orca 端可能等用户 submit 才清卡、界面出现伪工具记录。
2. **osascript 系统通知**（Orca pane 下的旧方案）：来源「脚本编辑器」，前台也弹，已由 notification 事件替换。

## 5. 实验记录（2026-09-06 完成）

- [x] 模拟 POST `notification` 事件（/tmp/sim_notif.py，变体 A：`hook_event_name:'notification'` + message/title/body/notification_type/level）→ **HTTP 204，Orca 弹出原生系统通知**
- [x] 变体 A 复测：**Orca 在前台时不弹，切走后弹**（前台静默行为确认）
- [x] 变体 B/C/D（无 message/level、普通工具事件+notification_type、仅 title/body）未再逐一验证——变体 A 已达成目标
- [x] 未采用 osascript 方案
- [ ] 变体 B/C/D 的差异行为（如需了解 Orca 通知字段的边界）可后续补充
- 顺带发现：Orca 的 macOS 通知权限记录（ncprefs flags bit0=0）看似禁止，但 notification 事件的 Electron 通知仍能弹出——以实测为准

## 6. 关键参考文件

- `app.asar.unpacked/out/shared/agent-hook-listener/providers/pi-family-events.js`
- `app.asar.unpacked/out/shared/agent-question-answered-intent.js`
- `app.asar.unpacked/out/shared/agent-hook-listener/providers/grok-events.js`、`grok-tool-fields.js`
- `app.asar.unpacked/out/shared/agent-hook-relay.js`（AGENT_HOOK_SOURCES、转发协议）
- `~/.pi/agent/extensions/orca-agent-status.ts`（pi 侧上报参考）