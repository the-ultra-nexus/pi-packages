/**
 * pi-iterm2
 *
 * iTerm2 集成扩展：
 *   1. 在终端（tab）标题显示「本会话最早一次 pi 提问」并恒定（会话树内持久：跨 reload/resume/fork 一致）。
 *   2. 回答完成时通过 macOS 系统通知（通知中心）给出提示，可开关。
 *
 * 标题格式: π · <最早提问> · <当前目录名>   (请求超长自动截断)
 *
 * 通知开关: 环境变量 PI_ITERM2_NOTIFY=0 可关闭回答完成通知（默认开启）。
 *
 * 事件说明:
 *   - session_start:       会话启动/加载/resume/reload 时，从会话读“最早 user 消息”设置标题。
 *   - before_agent_start:  每次提交请求，从会话读“最早 user 消息”刷新标题（幂等；新会话首条用 event.prompt 补位）。
 *   - agent_settled:       回答完成（不会再自动继续）时触发，用于发系统通知。
 *   - session_shutdown:    会话退出时把标题还原为基础标题。
 *
 * “最早提问”= 会话里 role 为 user 的第一条真实消息，随会话文件存储，天然跨
 * reload / resume / fork 保持不变，无需额外写盘。
 *
 * 安装方式（作为 pi 包）:
 *   pi install git:github.com/<user>/pi-iterm2
 *   或本地: pi install /path/to/pi-iterm2
 */

import { exec } from "node:child_process";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const MAX_LEN = 60;
const notifyEnabled = process.env.PI_ITERM2_NOTIFY !== "0";

const NOTIFY_MSG = "pi 已完成回答";

function oneLine(s: string): string {
	return s.replace(/\s+/g, " ").trim();
}

function clipped(s: string): string {
	return s.length > MAX_LEN ? s.slice(0, MAX_LEN) + "…" : s;
}

function cwdName(): string {
	return path.basename(process.cwd()) || process.cwd();
}

function baseTitle(pi: ExtensionAPI): string {
	const session = pi.getSessionName();
	return session ? `π · ${session} · ${cwdName()}` : `π · ${cwdName()}`;
}

/**
 * 回答完成时触发 iTerm2 原生系统通知（无需第三方工具）：
 *   - OSC 9 : 弹系统通知，发送者即 iTerm2（不是“脚本编辑器”）
 *   - OSC 1337 ; RequestAttention=once : dock 图标弹跳一次 + 播放系统提示音
 * 这两个序列直接写入当前终端；文件同时保留一个 osascript（带提示音）回退，
 * 以兼容非 iTerm2 终端或写入失败的情况。
 */
function notifyCompletion() {
	if (!notifyEnabled || process.platform !== "darwin") return;
	try {
		process.stdout.write(`\x1b]9;${NOTIFY_MSG}\x07`);
		process.stdout.write("\x1b]1337;RequestAttention=once\x07");
		return;
	} catch {
		// 终端不支持该 OSC 时回退到 osascript（显式加提示音）；来源会显示为“脚本编辑器”
	}
	const script = `display notification "${NOTIFY_MSG}" with title "pi" sound name "Glass"`;
	exec(`osascript -e '${script}'`, () => {});
}

/** 从一条 message 的 content 中提取纯文本（content 可以是字符串或文本块数组）。 */
function extractPrompt(content: unknown): string {
	if (typeof content === "string") return oneLine(content);
	if (Array.isArray(content)) {
		return oneLine(
			content
				.filter(
					(c): c is { type: "text"; text: string } =>
						typeof c === "object" &&
						c !== null &&
						(c as { type?: string }).type === "text" &&
						typeof (c as { text?: unknown }).text === "string",
				)
				.map((c) => c.text)
				.join(" "),
		);
	}
	return "";
}

/** 取出会话里“最早”的一条真实用户提问；返回已截断的标题片段。 */
function earliestUserPrompt(
	sm: { getEntries(): Array<{ type: string; message?: { role?: string; content?: unknown } }> },
): string {
	for (const entry of sm.getEntries()) {
		if (entry.type === "message" && entry.message?.role === "user") {
			const prompt = extractPrompt(entry.message.content);
			if (prompt) return clipped(prompt);
		}
	}
	return "";
}

/** 计算并写入标题：优先用会话里最早的 user 提问，否则用 fallback（新会话首条）。 */
function applyTitle(
	pi: ExtensionAPI,
	ctx: { ui: { setTitle(t: string): void } },
	sm: { getEntries(): Array<{ type: string; message?: { role?: string; content?: unknown } }> },
	fallback: string,
): void {
	const earliest = earliestUserPrompt(sm);
	const prompt = earliest || (fallback ? clipped(oneLine(fallback)) : "");
	ctx.ui.setTitle(prompt ? `π · ${prompt} · ${cwdName()}` : baseTitle(pi));
}

export default function (pi: ExtensionAPI) {
	// 方案 A：在“会话/会话树”内持久记住最早一次提问。
	// 不使用内存变量记“第一次”，而是每次从会话里读取「最早的 user 消息」作为首次提问，
	// 因此天然跨 reload / resume / fork 一致，且不会因重载重置。

	// 会话启动/加载/恢复时：若已有历史，直接显示其中最早提问
	pi.on("session_start", async (_event, ctx) => {
		applyTitle(pi, ctx, ctx.sessionManager, "");
	});

	// 每次提交请求时刷新标题（幂等：最早不变则标题不变）。
	// 新会话首条时 session 尚无 user 消息，用 event.prompt 补位。
	pi.on("before_agent_start", async (event, ctx) => {
		applyTitle(pi, ctx, ctx.sessionManager, event.prompt ?? "");
	});

	// 回答完成：给出系统通知（标题本身不在此改动）
	pi.on("agent_settled", async (_event, _ctx) => {
		notifyCompletion();
	});

	// 会话退出时把标题还原为基础标题
	pi.on("session_shutdown", async (_event, ctx) => {
		ctx.ui.setTitle(baseTitle(pi));
	});
}
