#!/usr/bin/env bash
# Push all local commits on main to GitHub using a personal access token.
# Usage:
#   GITHUB_TOKEN=ghp_xxxx ./scripts/push-main.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TOKEN="${GITHUB_TOKEN:?Set GITHUB_TOKEN (repo scope)}"
REMOTE="${GITHUB_REMOTE:-Verba-Limited/xaccess-api}"

AHEAD=$(git rev-list --count "origin/main..HEAD" 2>/dev/null || echo "?")
echo "Pushing main to ${REMOTE} (${AHEAD} commit(s) ahead of origin/main)..."

git push "https://x-access-token:${TOKEN}@github.com/${REMOTE}.git" main

echo "Verifying render.yaml on GitHub..."
curl -sf "https://api.github.com/repos/${REMOTE}/contents/render.yaml?ref=main" >/dev/null
echo "OK - render.yaml is on main."
