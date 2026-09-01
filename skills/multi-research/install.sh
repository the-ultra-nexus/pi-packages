#!/usr/bin/env bash
# install.sh — 一键安装 multi-research 技能（无自定义 agents，只需复制技能目录）
# 用法：bash install.sh（幂等，可重复执行）
set -euo pipefail

# 脚本所在目录 = 技能包根目录（允许从任意路径调用）
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_NAME="$(basename "$SKILL_DIR")"

# 可通过环境变量覆盖 pi 配置目录（默认 ~/.pi/agent）
PI_AGENT_DIR="${PI_AGENT_DIR:-$HOME/.pi/agent}"

echo "==> 安装技能 → $PI_AGENT_DIR/skills/$SKILL_NAME"
mkdir -p "$PI_AGENT_DIR/skills"
cp -R "$SKILL_DIR" "$PI_AGENT_DIR/skills/$SKILL_NAME"

echo "==> 完成。本技能无需自定义 agents（使用内置 researcher + model 参数）。"