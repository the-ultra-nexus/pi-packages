#!/usr/bin/env bash
# 一键发布 + 更新本地：scripts/release.sh [包名...] [patch|minor|major]
#
# 用法示例：
#   ./scripts/release.sh                 # 四个包全部 patch 提升并发布
#   ./scripts/release.sh minor           # 四个包全部 minor 提升并发布
#   ./scripts/release.sh pi-grill-all    # 只发布 pi-grill-all（patch）
#   ./scripts/release.sh pi-grill-all pi-attention major
#
# 每步动作：
#   1) npm version <bump> -w <pkg> 提升版本（不自动打 tag/commit）
#   2) npm pack --dry-run 校验 tarball
#   3) npm publish 到官方 registry（会交互提示输入 2FA OTP）
#   4) git commit + git tag <pkg>@<version>
#   5) 若本地按 npm 安装了该包，则 pi update npm:<pkg> 更新本地
#   6) 推送 main 与所有新 tag
#
# 前置：npm 已登录（npm login --registry https://registry.npmjs.org），且工作区干净。

set -euo pipefail

REGISTRY="https://registry.npmjs.org"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# 包名 -> 相对目录（bash 3.2 无关联数组，用函数映射）
pkg_dir() {
  case "$1" in
    pi-grill-all) echo skills/grill-all ;;
    pi-multi-research) echo skills/multi-research ;;
    pi-multi-code-review) echo skills/multi-code-review ;;
    pi-attention) echo extensions/pi-attention ;;
    *) echo "" ;;
  esac
}

# --- 解析参数：patch/minor/major 为版本提升，其余为包名 ---
bump="patch"
packages=()
for arg in "$@"; do
  case "$arg" in
    patch|minor|major) bump="$arg" ;;
    all) : ;;
    *) packages+=("$arg") ;;
  esac
done
# 缺省 = 全部四个包
if [[ "${#packages[@]}" -eq 0 ]]; then
  packages=(pi-grill-all pi-multi-research pi-multi-code-review pi-attention)
fi
# 校验包名
for p in "${packages[@]}"; do
  if [[ -z "$(pkg_dir "$p")" ]]; then
    echo "未知包：${p}（可用：pi-grill-all / pi-multi-research / pi-multi-code-review / pi-attention）" >&2
    exit 1
  fi
done

echo "==> 准备发布：${packages[*]}（bump: ${bump}）"

# --- 前置检查 ---
if [[ -n "$(git status --porcelain)" ]]; then
  echo "工作区不干净，请先提交或还原未提交改动。" >&2
  exit 1
fi
if ! npm whoami --registry "$REGISTRY" >/dev/null 2>&1; then
  echo "未登录 npm，请先执行：npm login --registry $REGISTRY" >&2
  exit 1
fi

new_tags=()
release_pkgs=()
release_vers=()
release_chgs=()
for p in "${packages[@]}"; do
  dir="$(pkg_dir "$p")"
  echo ""
  # 变更摘要：自上一 tag 以来该包的提交（用于 RELEASE.md）
  prev_tag="$(git tag --list "${p}@*" --sort=-version:refname | head -1)"
  if [[ -n "$prev_tag" ]]; then
    changes="$(git log --oneline "$prev_tag..HEAD" -- "$dir" | sed 's/^/- /; s/|/\\|/g' | paste -sd'; ' -)"
  else
    changes="首次发布"
  fi
  [[ -n "$changes" ]] || changes="（无独立提交记录）"

  echo "==> [${p}] 提升版本（${bump}）"
  npm version "$bump" --no-git-tag-version -w "$p" >/dev/null
  version="$(node -p "require('./$dir/package.json').version")"
  echo "    新版本：$version"

  echo "==> [$p] 校验 tarball"
  (cd "$dir" && npm pack --dry-run >/dev/null)

  echo "==> [${p}] 发布到 ${REGISTRY}（如需 2FA，请在终端输入 OTP）"
  (cd "$dir" && npm publish --registry "$REGISTRY")

  echo "==> [$p] 提交 + 打 tag"
  git add "$dir/package.json"
  git commit -m "release($p): v$version" >/dev/null
  git tag "$p@$version"
  new_tags+=("$p@$version")
  release_pkgs+=("$p"); release_vers+=("$version"); release_chgs+=("$changes")

  echo "==> [$p] 更新本地 pi 包"
  if pi update "npm:$p" >/dev/null 2>&1; then
    echo "    已更新 npm:$p"
  else
    echo "    提示：本地未按 npm 安装 ${p}，或更新失败；需要时手动执行 pi update npm:${p}"
  fi
done

# --- 追加 RELEASE.md 发布记录 ---
if [[ "${#release_pkgs[@]}" -gt 0 ]]; then
  echo ""
  echo "==> 追加 RELEASE.md"
  {
    printf '\n## %s — 发布\n\n| 包 | 版本 | bump | 变更 |\n|---|---|---|---|\n' "$(date +%Y-%m-%d)"
    for i in "${!release_pkgs[@]}"; do
      printf '| %s | %s | %s | %s |\n' "${release_pkgs[$i]}" "${release_vers[$i]}" "$bump" "${release_chgs[$i]}"
    done
  } >> RELEASE.md
  git add RELEASE.md
  git commit -m "docs: update RELEASE.md" >/dev/null
fi

echo ""
echo "==> 推送 main 与新 tag"
git push origin main --tags
echo ""
echo "==> 完成：${new_tags[*]}"
