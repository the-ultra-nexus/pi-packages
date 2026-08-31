/**
 * pi-iterm2
 *
 * iTerm2 集成扩展。标题与动画逻辑参照 Orca 的 titlebar-spinner，
 * 通知逻辑参照 Orca 的 agent_settled 时机，但发送端为 iTerm2 原生。
 *
 * 标题: agent 运行中用旋转动画（盲文帧），回答结束还原为基础标题：
 *       π · <会话名> · <目录名>
 *
 * 通知: agent_settled（所有消息已落盘，回答真正完成）时，用 iTerm2 原生 OSC
 *       触发系统通知；PI_ITERM2_NOTIFY=0 可关闭（默认开启）。
 */

import { exec } from "node:child_process";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const BRAILLE_FRAMES = [
	"\u280b",
	"\u2819",
	"\u2839",
	"\u2838",
	"\u283c",
	"\u2834",
	"\u2826",
	"\u2827",
	"\u2807",
	"\u280f",
];

const notifyEnabled = process.env.PI_ITERM2_NOTIFY !== "0";
const NOTIFY_MSG = "pi 已完成回答";

function cwdName(): string {
	return path.basename(process.cwd()) || process.cwd();
}

function baseTitle(pi: ExtensionAPI): string {
	const session = pi.getSessionName();
	return session ? `π · ${session} · ${cwdName()}` : `π · ${cwdName()}`;
}

/**
 * 回答完成时触发 iTerm2 原生系统通知（无需第三方工具）：
 *   - OSC 9 : 弹系统通知，发送者即 iTerm2
 *   - OSC 1337 ; RequestAttention=once : dock 图标弹跳一次 + 系统提示音
 * 直接写入当前终端；非 iTerm2 终端或写入失败时回退 osascript（显式加提示音）。
 */
function notifyCompletion() {
	if (!notifyEnabled || process.platform !== "darwin") return;
	try {
		process.stdout.write(`\x1b]9;${NOTIFY_MSG}\x07`);
		process.stdout.write("\x1b]1337;RequestAttention=once\x07");
		return;
	} catch {
		// 终端不支持该 OSC 时回退到 osascript（来源会显示为“脚本编辑器”）
	}
	const script = `display notification "${NOTIFY_MSG}" with title "pi" sound name "Glass"`;
	exec(`osascript -e '${script}'`, () => {});
}

interface UITitle {
	setTitle(t: string): void;
}
interface HandlersCtx {
	ui: UITitle;
}

export default function (pi: ExtensionAPI) {
	let timer: ReturnType<typeof setInterval> | null = null;
	let frameIndex = 0;

	function stopAnimation(ctx: HandlersCtx) {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
		frameIndex = 0;
		ctx.ui.setTitle(baseTitle(pi));
	}

	function startAnimation(ctx: HandlersCtx) {
		stopAnimation(ctx); // 复位旧 timer 并先写一次基础标题
		timer = setInterval(() => {
			const frame = BRAILLE_FRAMES[frameIndex % BRAILLE_FRAMES.length];
			const session = pi.getSessionName();
			ctx.ui.setTitle(
				session ? `${frame} π · ${session} · ${cwdName()}` : `${frame} π · ${cwdName()}`,
			);
			frameIndex++;
		}, 80);
	}

	// 每次请求开始 → 启动标题动画
	pi.on("agent_start", async (_event, ctx) => {
		startAnimation(ctx);
	});

	// 每次回答结束 → 停止动画，还原基础标题
	pi.on("agent_end", async (_event, ctx) => {
		stopAnimation(ctx);
	});

	// 回答完成（消息已落盘）→ 发 iTerm2 通知
	pi.on("agent_settled", async (_event, _ctx) => {
		notifyCompletion();
	});

	// 会话退出 → 还原基础标题
	pi.on("session_shutdown", async (_event, ctx) => {
		stopAnimation(ctx);
	});
}
