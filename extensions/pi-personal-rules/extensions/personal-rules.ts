/**
 * Personal Rules Extension
 *
 * 把 ~/.pi/agent/PERSONAL.md 的内容逐行注入 <rules> 段末尾，
 * 排在 pi 内置规则之后、收尾的 be concise / show paths 之前。
 *
 * 常态显示：footer 显示 PR:ON(n) / PR:OFF
 * 开关：/personal-rules 命令、Ctrl+Shift+R 快捷键、--no-personal-rules 启动参数
 * 状态按会话持久化在自定义 session entry 里，重开会话保持。
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Key } from "@earendil-works/pi-tui";
import { getAgentDir, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";

const FILE_NAME = "PERSONAL.md";
const STATE_TYPE = "personal-rules-state";
const STATUS_KEY = "personal-rules";

/** pi 内置的收尾两条规则，始终留在 <rules> 最后。 */
const TAIL_RULES = ["Be concise in your responses", "Show file paths clearly when working with files"];

function readLines(file: string): string[] {
	if (!existsSync(file)) return [];
	try {
		return readFileSync(file, "utf-8")
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0);
	} catch {
		return [];
	}
}

/** 个人规则放到内置规则之后、收尾两条之前。 */
function mergeRules(builtin: readonly string[], personal: readonly string[]): string[] {
	const tail = TAIL_RULES.filter((rule) => builtin.includes(rule));
	const middle = builtin.filter((rule) => !tail.includes(rule));
	return [...middle, ...personal, ...tail];
}

export default function personalRules(pi: ExtensionAPI) {
	const file = join(getAgentDir(), FILE_NAME);

	let enabled = true;

	const personal = () => (enabled ? readLines(file) : []);

	const refreshStatus = (ctx: ExtensionContext) => {
		if (!ctx.hasUI) return;
		const t = ctx.ui.theme;
		ctx.ui.setStatus(
			STATUS_KEY,
			enabled
				? t.bold(t.bg("toolSuccessBg", t.fg("success", " PR:ON ")))
				: t.bold(t.bg("toolErrorBg", t.fg("error", " PR:OFF "))),
		);
	};

	const toggle = (ctx: ExtensionContext) => {
		enabled = !enabled;
		pi.appendEntry(STATE_TYPE, { enabled });
		refreshStatus(ctx);
		ctx.ui.notify(
			enabled
				? `Personal rules ON — ${personal().length} 行注入 <rules> 末尾`
				: "Personal rules OFF — 个人 prompt 不再注入",
			"info",
		);
	};

	pi.registerFlag("no-personal-rules", {
		description: "Disable personal rules injection for this run",
		type: "boolean",
		default: false,
	});

	pi.registerCommand("personal-rules", {
		description: "Toggle personal rules injection at the tail of <rules>",
		handler: async (_args, ctx) => toggle(ctx),
	});

	pi.registerShortcut(Key.ctrlShift("r"), {
		description: "Toggle personal rules injection",
		handler: (ctx) => toggle(ctx),
	});

	// 会话开始 / 重载：读持久化状态与 CLI flag，刷新 footer
	pi.on("session_start", (_event, ctx) => {
		const persisted = ctx.sessionManager
			.getEntries()
			.filter((e: { type: string; customType?: string }) => e.type === "custom" && e.customType === STATE_TYPE)
			.pop() as { data?: { enabled?: boolean } } | undefined;

		enabled = persisted?.data?.enabled ?? true;
		if (pi.getFlag("no-personal-rules") === true) enabled = false;

		refreshStatus(ctx);
	});

	pi.on("session_shutdown", (_event, ctx) => {
		ctx.ui.setStatus(STATUS_KEY, undefined);
	});

	// 核心：个人规则置于 <rules> 末尾（收尾两条之前）
	pi.on("before_agent_start", (event) => {
		const options = event.systemPromptOptions;
		const lines = personal();

		if (lines.length === 0) {
			delete options.sections.rules;
			return;
		}

		// 从当前渲染结果取内置 <rules> 原文（此时本扩展尚未改写）
		const match = /<rules>\n?([\s\S]*?)\n?<\/rules>/.exec(event.systemPrompt);
		const builtin = match
			? match[1]
					.split("\n")
					.map((line) => line.replace(/^- /, "").trim())
					.filter((line) => line.length > 0)
			: [...options.promptGuidelines];

		options.sections.rules = mergeRules(builtin, lines)
			.map((rule) => `- ${rule}`)
			.join("\n");
	});
}
