/**
 * pi-attention
 *
 * iTerm2 集成扩展。
 *
 * 标题: 恒定显示「本会话最开始的一次提问」（会话里第一条 user 消息），
 *       跨 reload / resume 稳定指向同一句；退出时还原为基础标题。
 *
 * 通知: agent_settled（所有消息已落盘，回答真正完成）时，用 iTerm2 原生 OSC
 *       触发系统通知，通知标题为 assistant 回复摘要；
 *       PI_ATTENTION_NOTIFY=0 可关闭（默认开启）。
 */

import { exec } from "node:child_process";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const notifyEnabled = process.env.PI_ATTENTION_NOTIFY !== "0";
const NOTIFY_DONE = "pi 已完成回答";

function oneLine(s: string): string {
	return s.replace(/\s+/g, " ").trim();
}

function clipped(s: string): string {
	const MAX = 60;
	return s.length > MAX ? s.slice(0, MAX) + "…" : s;
}

function cwdName(): string {
	return path.basename(process.cwd()) || process.cwd();
}

function baseTitle(pi: ExtensionAPI): string {
	const session = pi.getSessionName();
	return session ? `π · ${session} · ${cwdName()}` : `π · ${cwdName()}`;
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

type SM = {
	getEntries(): Array<{ type: string; message?: { role?: string; content?: unknown } }>;
};

/** 会话里“最开始”的一条 user 提问（第一条）。 */
function earliestUserPrompt(sm: SM): string {
	for (const entry of sm.getEntries()) {
		if (entry.type === "message" && entry.message?.role === "user") {
			const p = extractPrompt(entry.message.content);
			if (p) return clipped(p);
		}
	}
	return "";
}

/** 会话里“最新”的一条 user 提问（最后一条，即当前这次提问）。 */
function latestUserPrompt(sm: SM): string {
	let latest = "";
	for (const entry of sm.getEntries()) {
		if (entry.type === "message" && entry.message?.role === "user") {
			const p = extractPrompt(entry.message.content);
			if (p) latest = clipped(p);
		}
	}
	return latest;
}

/** 会话里最后一条 assistant 回复的文本摘要。 */
function latestAssistantText(sm: SM): string {
	let latest = "";
	for (const entry of sm.getEntries()) {
		if (entry.type === "message" && entry.message?.role === "assistant") {
			const p = extractPrompt(entry.message.content);
			if (p) latest = clipped(p);
		}
	}
	return latest;
}

function applyTitle(pi: ExtensionAPI, ctx: { ui: { setTitle(t: string): void } }, sm: SM): void {
	const earliest = earliestUserPrompt(sm);
	ctx.ui.setTitle(earliest ? `π · ${earliest} · ${cwdName()}` : baseTitle(pi));
}

/**
 * 回答完成时触发 iTerm2 原生系统通知（无需第三方工具）。
 * 以「assistant 回复摘要」作为通知标题。
 *   - OSC 9 : 弹系统通知，发送者即 iTerm2
 *   - OSC 1337 ; RequestAttention=once : dock 图标弹跳一次 + 系统提示音
 * 非 iTerm2 终端或写入失败时回退 osascript（显式加提示音）。
 */
function notifyCompletion(replyText: string) {
	if (!notifyEnabled || process.platform !== "darwin" || process.env.PI_WEB_HOSTNAME) return;
	const subject = replyText ? clipped(oneLine(replyText)) : "pi";
	try {
		process.stdout.write(`\x1b]9;${subject}\x07`);
		process.stdout.write("\x1b]1337;RequestAttention=once\x07");
		return;
	} catch {
		// 终端不支持该 OSC 时回退到 osascript（来源会显示为“脚本编辑器”）
	}
	const safeSubject = subject.replace(/"/g, '\\"');
	const script = `display notification "${NOTIFY_DONE}" with title "${safeSubject}" sound name "Glass"`;
	exec(`osascript -e '${script}'`, () => {});
}

export default function (pi: ExtensionAPI) {
	// 标题恒定显示「本会话最开始提问」（会话第一条 user 消息），跨 reload/resume 稳定。

	// 会话启动/加载/恢复时：显示最开始提问（若有历史）
	pi.on("session_start", async (_event, ctx) => {
		applyTitle(pi, ctx, ctx.sessionManager);
	});

	// 回答完成（消息已落盘）：
	//   1) 通知，标题 = assistant 回复摘要
	//   2) 校正标题为「最开始提问」
	pi.on("agent_settled", async (_event, ctx) => {
		notifyCompletion(latestAssistantText(ctx.sessionManager));
		applyTitle(pi, ctx, ctx.sessionManager);
	});

	// 会话退出时把标题还原为基础标题
	pi.on("session_shutdown", async (_event, ctx) => {
		ctx.ui.setTitle(baseTitle(pi));
	});
}
