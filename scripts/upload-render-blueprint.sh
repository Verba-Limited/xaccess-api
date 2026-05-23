#!/usr/bin/env bash
# Upload render.yaml to GitHub main via API (no git push credentials needed on CLI).
# Usage:
#   GITHUB_TOKEN=ghp_xxxx ./scripts/upload-render-blueprint.sh
#
# Create a token at https://github.com/settings/tokens with "repo" scope for
# Verba-Limited/xaccess-api write access.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REPO="${GITHUB_REPO:-Verba-Limited/xaccess-api}"
BRANCH="${GITHUB_BRANCH:-main}"
FILE="render.yaml"
TOKEN="${GITHUB_TOKEN:?Set GITHUB_TOKEN (repo scope)}"

if [[ ! -f "$FILE" ]]; then
  echo "ERROR: $FILE not found in $ROOT"
  exit 1
fi

CONTENT_B64=$(base64 < "$FILE" | tr -d '\n')
MESSAGE="chore: add Render blueprint (render.yaml)"

SHA=""
EXISTING=$(curl -sf \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${REPO}/contents/${FILE}?ref=${BRANCH}" || true)

if [[ -n "$EXISTING" ]]; then
  SHA=$(python3 -c "import json,sys; print(json.load(sys.stdin).get('sha',''))" <<< "$EXISTING")
fi

PAYLOAD=$(CONTENT_B64="$CONTENT_B64" MESSAGE="$MESSAGE" BRANCH="$BRANCH" SHA="$SHA" python3 <<'PY'
import json, os
payload = {
    "message": os.environ["MESSAGE"],
    "content": os.environ["CONTENT_B64"],
    "branch": os.environ["BRANCH"],
}
sha = os.environ.get("SHA", "")
if sha:
    payload["sha"] = sha
print(json.dumps(payload))
PY
)

echo "Uploading ${FILE} to ${REPO}@${BRANCH}..."
HTTP=$(curl -sS -w "%{http_code}" -o /tmp/render-upload.json \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${REPO}/contents/${FILE}" \
  -d "$PAYLOAD")

if [[ "$HTTP" != "200" && "$HTTP" != "201" ]]; then
  echo "ERROR: GitHub API returned HTTP $HTTP"
  cat /tmp/render-upload.json
  exit 1
fi

echo "OK - ${FILE} is on ${BRANCH}."
echo "Verify: https://github.com/${REPO}/blob/${BRANCH}/${FILE}"
echo "Next: Render Dashboard -> Blueprint -> Sync / Deploy"
