/**
 * pi-attention · waiting-notify
 *
 * 监听 pi 的「等待用户输入」生命周期事件（ui_prompt_start / ui_prompt_end）。
 * 这些事件在所有阻塞式用户界面提示弹出时发出：
 *   - gotgenes/pi-permission-system 的权限「允许/拒绝」弹窗（ctx.ui.custom）
 *   - narumitw/pi-plan-mode 的计划菜单 / plan_mode_question（ctx.ui.custom / select）
 *   - 任何 ctx.ui.select / confirm / input / editor / custom 阻塞等用户的操作
 *
 * 行为（按宿主环境分流）：
 *   - Orca pane（ORCA_PANE_KEY / ORCA_AGENT_HOOK_ENDPOINT）：上报 notification
 *     事件（title/body/message/notification_type），Orca 走原生系统通知——来源为
 *     Orca 应用，且只在 Orca 不在前台时弹出（前台静默，人离开窗口才提醒）。
 *     ui_prompt_* 事件 Orca 不消费（白名单只有 ask_user_question /
 *     request_user_input 的 tool_call），不再上报。
 *   - iTerm2（TERM_PROGRAM === "iTerm.app" 且非 pi-web）：弹出系统通知（OSC 9，
 *     发送者即 iTerm2）+ dock 弹跳一次（OSC 1337 RequestAttention=once），并把终端
 *     标题切换为「⏸ 等待选择…」，选择完成后恢复基础标题。
 *   - 其它环境（pi-web / 非 iTerm2 终端）：静默，不做通知（标题仍可设置）。
 *
 * 为什么放在这里维护：Orca 会定期覆盖它自己分发的扩展
 * （orca-agent-status.ts、orca-titlebar-spinner.ts 等，文件头标
 * `@orca-managed-pi-extension`），在那些文件上补丁会被冲掉。本扩展随
 * pi-attention 包分发，由自己的仓库统一维护。
 */

import { exec } from "node:child_process";
import fs from "node:fs";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

// ⏸ 开关：PI_ATTENTION_NOTIFY_WAITING=0 关闭「等待用户输入」的系统通知（默认开）
const waitingNotify = process.env.PI_ATTENTION_NOTIFY_WAITING !== "0";

// 标题最长显示宽度（macOS 通知标题过长会被截断）
const SUBJECT_MAX = 60;

function oneLine(s: string): string {
	return s.replace(/\s+/g, " ").trim();
}

function clipped(s: string): string {
	return s.length > SUBJECT_MAX ? s.slice(0, SUBJECT_MAX) + "…" : s;
}

function baseTitle(pi: ExtensionAPI): string {
	const session = pi.getSessionName();
	const cwd = process.cwd().split(/[\\/]/).filter(Boolean).at(-1) || process.cwd();
	return session ? `π · ${session} · ${cwd}` : `π · ${cwd}`;
}

/** 是否运行在 Orca 托管的 pane 里（其状态走 agent-hook 上报而非终端 OSC）。 */
function isOrcaPane(): boolean {
	return !!(process.env.ORCA_PANE_KEY || process.env.ORCA_AGENT_HOOK_ENDPOINT);
}

/** 是否运行在 iTerm2 终端里（OSC 9 / OSC 1337 只有 iTerm2 原生支持）。 */
function isITerm2(): boolean {
	return process.env.TERM_PROGRAM === "iTerm.app";
}

// ── iTerm2 / 常规终端：通知 + 标题 ──────────────────────────────────────

/**
 * 「等待用户操作」时触发 iTerm2 原生系统通知 + dock 弹跳。
 *
 * 环境判定（与 request-title.ts 同款原则）：
 *  - TERM_PROGRAM === "iTerm.app"：只在真 iTerm2 里发 OSC（其它终端 OSC 无效）；
 *  - PI_WEB_HOSTNAME：排除 pi-web（pi-web 在 iTerm2 里跑时 TERM_PROGRAM 仍是
 *    iTerm.app，单查 TERM_PROGRAM 防不住它，参考 request-title.ts 的 b11c57d 提交）；
 *  - Orca pane 不在这里处理：事件入口处按 isOrcaPane() 分流到 notifyViaSystem
 *    （osascript 系统通知——Orca 终端不支持 OSC 9 / OSC 1337，实测会原样回显）。
 */
function notifyWaiting(kind: string, title: string | undefined): void {
	if (
		!waitingNotify ||
		process.platform !== "darwin" ||
		process.env.PI_WEB_HOSTNAME ||
		!isITerm2()
	) return;
	// 标题 = 具体请求内容（与 request-title 的完成通知对称：那头是回复摘要）；
	// 无具体标题时用默认句。正文 = 固定引导句。
	const subject = clipped(
		oneLine(title ? title : "pi 正在等待你的输入"),
	);
	const body = "在 pi 窗口里完成操作";
	try {
		process.stdout.write(`\x1b]9;${subject}\x07`);
		process.stdout.write("\x1b]1337;RequestAttention=once\x07");
		return;
	} catch {
		// 终端不支持该 OSC 时回退到 osascript（来源会显示为“脚本编辑器”）
	}
	const safeSubject = subject.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"');
	const script = `osascript -e 'display notification "${body}" with title "${safeSubject}" sound name "Glass"'`;
	exec(script, () => {});
}

/**
 * Orca pane 环境下的等待提醒：上报 `notification` 事件给 Orca。
 *
 * 实测（2026-09，Orca app）：Orca 主进程对 hook 的 notification 事件（含
 * title/body/message/notification_type）走 dispatchPlugin → Electron 原生系统
 * 通知，**仅在 Orca 不在前台时弹出**（前台静默，符合「人离开窗口才提醒」的
 * 预期）；来源为 Orca 应用本体，标题自动带 `${pluginId}: ` 前缀。
 * `ui_prompt_*` 事件 Orca 不消费（白名单只有 ask_user_question /
 * request_user_input 的 tool_call），所以这里不再上报它们，只报 notification。
 */
function notifyOrcaWaiting(ctx: ExtensionContext, title: string | undefined): void {
	post(
		"notification",
		{
			message: "Pi 正在等待你的操作",
			title: clipped(oneLine(title ? title : "pi 正在等待你的输入")),
			body: "在 pi 窗口里完成操作",
			notification_type: "permission_prompt",
			level: "info",
		},
		sessionMeta(ctx),
	);
}

// ── Orca pane：agent-hook 上报 ──────────────────────────────────────────

// Why: Pi 会 await 扩展处理器。状态上报保持脱离关键路径，且「只保留最新
// 一条待发」的槽位避免 Orca 接收端在挂起时堆积过期快照。镜像 orca-agent-status。
const HOOK_POST_TIMEOUT_MS = 1000;
let activePost = false;
let pendingPost: { name: string; extra: Record<string, unknown>; meta: Record<string, unknown> } | null = null;

// Why: 每次事件都重读 endpoint 文件很便宜（小文件、很少变化），但 stat+mtime
// 缓存可避免工具流式执行期间每个事件都重复解析。
let cachedEndpointKey = "";
let cachedEndpointValues: Record<string, string> | null = null;

function readEndpointFile(): Record<string, string> | null {
	const path = process.env.ORCA_AGENT_HOOK_ENDPOINT;
	if (!path) return null;
	try {
		const stat = fs.statSync(path);
		const cacheKey = stat.mtimeMs + ":" + stat.size + ":" + stat.ino;
		if (cacheKey === cachedEndpointKey && cachedEndpointValues) return cachedEndpointValues;
		const contents: string = fs.readFileSync(path, "utf8");
		const out: Record<string, string> = {};
		for (const line of contents.split(/\r?\n/)) {
			const m = line.match(/^(?:set\s+)?([A-Z0-9_]+)=(.*)$/);
			if (m) out[m[1]] = m[2].replace(/\r$/, "");
		}
		cachedEndpointKey = cacheKey;
		cachedEndpointValues = out;
		return out;
	} catch {
		cachedEndpointKey = "";
		cachedEndpointValues = null;
		return null;
	}
}

function resolveHookCoords(): Record<string, string | undefined> {
	const fileEnv = readEndpointFile() || {};
	return {
		port: fileEnv.ORCA_AGENT_HOOK_PORT || process.env.ORCA_AGENT_HOOK_PORT,
		token: fileEnv.ORCA_AGENT_HOOK_TOKEN || process.env.ORCA_AGENT_HOOK_TOKEN,
		env: fileEnv.ORCA_AGENT_HOOK_ENV || process.env.ORCA_AGENT_HOOK_ENV || "",
		version: fileEnv.ORCA_AGENT_HOOK_VERSION || process.env.ORCA_AGENT_HOOK_VERSION || "",
	};
}

function processName(value: unknown): string {
	return String(value || "").split(/[\\/]/).pop()?.toLowerCase() || "";
}

const CONFIGURED_HOOK_PATH = "/hook/pi";
let cachedOmpRuntime: boolean | null = null;

function isOmpRuntime(): boolean {
	if (cachedOmpRuntime !== null) return cachedOmpRuntime;
	if (CONFIGURED_HOOK_PATH === "/hook/omp") {
		cachedOmpRuntime = true;
		return true;
	}
	const names = [process.title, process.env._, process.argv[1], process.argv[0]].map(processName);
	cachedOmpRuntime = names.some((n) =>
		["omp", "omp.js", "omp.sh", "omp.cmd", "omp.exe", "omp.bat"].includes(n),
	);
	return cachedOmpRuntime;
}

function resolveHookPath(ompRuntime: boolean): string {
	return ompRuntime ? "/hook/omp" : CONFIGURED_HOOK_PATH;
}

function post(name: string, extra: Record<string, unknown>, meta: Record<string, unknown>): void {
	pendingPost = { name, extra, meta };
	drainPosts();
}

function drainPosts(): void {
	if (activePost || !pendingPost) return;
	const next = pendingPost;
	pendingPost = null;
	activePost = true;
	void postOnce(next.name, next.extra, next.meta).catch(() => {}).finally(() => {
		activePost = false;
		drainPosts();
	});
}

async function postOnce(
	name: string,
	extra: Record<string, unknown>,
	meta: Record<string, unknown>,
): Promise<void> {
	const coords = resolveHookCoords();
	const paneKey = process.env.ORCA_PANE_KEY;
	if (!coords.port || !coords.token || !paneKey) return;
	const ompRuntime = isOmpRuntime();
	const url = `http://127.0.0.1:${coords.port}${resolveHookPath(ompRuntime)}`;
	const body = JSON.stringify({
		paneKey,
		launchToken: process.env.ORCA_AGENT_LAUNCH_TOKEN || "",
		tabId: process.env.ORCA_TAB_ID || "",
		worktreeId: process.env.ORCA_WORKTREE_ID || "",
		env: coords.env,
		version: coords.version,
		payload: { hook_event_name: name, ...meta, ...extra },
	});
	const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
	let timeout: ReturnType<typeof setTimeout> | undefined;
	const timeoutPromise = new Promise<never>((_resolve, reject) => {
		timeout = setTimeout(() => {
			controller?.abort();
			reject(new Error("Orca hook delivery timed out"));
		}, HOOK_POST_TIMEOUT_MS);
		if (typeof timeout.unref === "function") timeout.unref();
	});
	try {
		await Promise.race([
			fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Orca-Agent-Hook-Token": coords.token,
				},
				body,
				...(controller ? { signal: controller.signal } : {}),
			}),
			timeoutPromise,
		]);
	} catch {
		// Why: 上报失败绝不能反过来弄挂 pi 运行（Orca 重启/下线都属正常）。
	} finally {
		if (timeout) clearTimeout(timeout);
	}
}

/** 当前会话的 session_id / session_file，与 orca-agent-status 同构。 */
function sessionMeta(ctx: ExtensionContext): Record<string, unknown> {
	const sm = ctx?.sessionManager;
	const id = sm?.getSessionId?.();
	const file = sm?.getSessionFile?.();
	return {
		...(typeof id === "string" && id ? { session_id: id } : {}),
		...(typeof file === "string" && file ? { session_file: file } : {}),
	};
}

// ── 注册 ────────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI): void {
	// Why: 子 agent 进程会继承 lead 的 pane env；只允许第一个（最外层）进程
	// 处理等待提醒，避免子进程重复通知/重复上报。与 orca-agent-status 同款 PID 门禁。
	const ownerPid = process.env.ORCA_PI_STATUS_OWNED;
	const selfPid = String(process.pid);
	if (ownerPid && ownerPid !== selfPid) return;
	process.env.ORCA_PI_STATUS_OWNED = selfPid;

	// 等待用户输入开始：Orca 走系统通知兜底 + hook 上报；iTerm2 走 OSC 通知。
	pi.on("ui_prompt_start", (event, ctx) => {
		const title = event.title;
		if (isOrcaPane()) {
			// Orca 原生：notification 事件 → 系统通知（后台才弹，前台静默）
			notifyOrcaWaiting(ctx, title);
		} else {
			notifyWaiting(event.kind, title);
		}
		ctx.ui?.setTitle(`⏸ 等待选择… · ${baseTitle(pi)}`);
	});

	// 等待结束：恢复基础标题
	// （request-title.ts 会在 agent_settled / session_start 再校正为「最早提问」）。
	pi.on("ui_prompt_end", (event, ctx) => {
		ctx.ui?.setTitle(baseTitle(pi));
	});
}