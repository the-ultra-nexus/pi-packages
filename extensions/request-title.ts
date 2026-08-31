/**
 * pi-iterm2
 *
 * iTerm2 集成扩展：
 *   1. 把终端（tab）标题实时显示为「最近一次 pi 请求」，常驻保留直到下一条。
 *   2. 回答完成时通过 macOS 系统通知（通知中心）给出提示，可开关。
 *
 * 标题格式: π · <最近一次请求> · <当前目录名>   (请求超长自动截断)
 *
 * 通知开关: 环境变量 PI_ITERM2_NOTIFY=0 可关闭回答完成通知（默认开启）。
 *
 * 事件说明:
 *   - before_agent_start: 每次用户提交请求触发一次，event.prompt 即请求原文。
 *   - agent_settled:      回答完成（不会再自动继续）时触发，用于发系统通知。
 *   - session_shutdown:   会话退出时把标题还原为基础标题。
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

export default function (pi: ExtensionAPI) {
	// 每次用户提交请求：把标题更新为请求内容，并常驻保留
	pi.on("before_agent_start", async (event, ctx) => {
		const prompt = event.prompt ? oneLine(event.prompt) : "";
		ctx.ui.setTitle(prompt ? `π · ${clipped(prompt)} · ${cwdName()}` : baseTitle(pi));
	});

	// 回答完成：给出系统通知（标题本身保留最近一条请求，不还原）
	pi.on("agent_settled", async (_event, _ctx) => {
		notifyCompletion();
	});

	// 会话退出时把标题还原为基础标题
	pi.on("session_shutdown", async (_event, ctx) => {
		ctx.ui.setTitle(baseTitle(pi));
	});
}
