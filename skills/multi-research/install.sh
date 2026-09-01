#!/usr/bin/env bash
# install.sh — 一键安装 multi-research 技能 + 3 个研究角色（pi-subagents）
# 用法：bash install.sh
# 幂等：可重复执行；覆盖已存在的技能目录与同名 agent 文件。
set -euo pipefail

# 脚本所在目录 = 技能包根目录（允许从任意路径调用）
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_NAME="$(basename "$SKILL_DIR")"

# 可通过环境变量覆盖 pi 配置目录（默认 ~/.pi/agent）
PI_AGENT_DIR="${PI_AGENT_DIR:-$HOME/.pi/agent}"

[ -d "$SKILL_DIR/agents" ] || { echo "错误：$SKILL_DIR/agents 不存在，请确认在技能包目录内运行" >&2; exit 1; }

echo "==> ① 技能本体 → $PI_AGENT_DIR/skills/$SKILL_NAME"
mkdir -p "$PI_AGENT_DIR/skills"
cp -R "$SKILL_DIR" "$PI_AGENT_DIR/skills/$SKILL_NAME"

echo "==> ② 研究角色 → $PI_AGENT_DIR/agents/（pi-subagents 注册位置）"
mkdir -p "$PI_AGENT_DIR/agents"
cp "$SKILL_DIR"/agents/*.md "$PI_AGENT_DIR/agents/"

echo "==> 完成。subagent 列表应能看到："
for f in "$SKILL_DIR"/agents/*.md; do
  echo "    - $(basename "$f" .md)"
done
echo "==> 未看到请检查 PI_AGENT_DIR 是否正确；重启 pi 后再试。"