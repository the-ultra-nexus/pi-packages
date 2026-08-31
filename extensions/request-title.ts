/**
 * pi-iterm2
 *
 * iTerm2 集成扩展：
 *   1. 在终端（tab）标题显示「最新一次 pi 提问」，每次请求实时更新。
 *   2. 回答完成时通过 macOS 系统通知（通知中心）给出提示，可开关。
 *
 * 标题格式: π · <最新提问> · <当前目录名>   (请求超长自动截断)
 *
 * 通知开关: 环境变量 PI_ITERM2_NOTIFY=0 可关闭回答完成通知（默认开启）。
 *
 * 事件说明:
 *   - session_start:       会话启动/加载/resume/reload 时，从会话读“最新 user 消息”设置标题。
 *   - before_agent_start:  每次提交请求，把标题更新为本次提问（最新）。
 *   - agent_settled:       回答完成（不会再自动继续）时触发，用于发系统通知。
 *   - session_shutdown:    会话退出时把标题还原为基础标题。
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

/** 取出会话里“最新”的一条真实用户提问；返回已截断的标题片段。 */
function latestUserPrompt(
	sm: { getEntries(): Array<{ type: string; message?: { role?: string; content?: unknown } }> },
): string {
	let latest = "";
	for (const entry of sm.getEntries()) {
		if (entry.type === "message" && entry.message?.role === "user") {
			const prompt = extractPrompt(entry.message.content);
			if (prompt) latest = clipped(prompt);
		}
	}
	return latest;
}

export default function (pi: ExtensionAPI) {
	// 标题显示“最新一次提问”：每次请求实时更新为本次提问；回答完成后标题保持该提问。

	// 会话启动/加载/恢复时：若已有历史，显示其中“最新”的一条 user 提问
	pi.on("session_start", async (_event, ctx) => {
		const latest = latestUserPrompt(ctx.sessionManager);
		ctx.ui.setTitle(latest ? `π · ${latest} · ${cwdName()}` : baseTitle(pi));
	});

	// 每次提交请求：直接用本次提问作为最新标题（不依赖 session 写入时序）
	pi.on("before_agent_start", async (event, ctx) => {
		const prompt = event.prompt ? clipped(oneLine(event.prompt)) : "";
		ctx.ui.setTitle(prompt ? `π · ${prompt} · ${cwdName()}` : baseTitle(pi));
	});

	// 回答完成：给出系统通知（标题保持最新提问）
	pi.on("agent_settled", async (_event, _ctx) => {
		notifyCompletion();
	});

	// 会话退出时把标题还原为基础标题
	pi.on("session_shutdown", async (_event, ctx) => {
		ctx.ui.setTitle(baseTitle(pi));
	});
}
