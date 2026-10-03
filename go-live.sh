#!/usr/bin/env bash
# Publish this site to Vercel production and print the customer-facing URL.
set -euo pipefail
cd "$(dirname "$0")"
umask 002

: "${VERCEL_TOKEN:?set VERCEL_TOKEN (collect it from the owner first)}"
PROJECT_NAME="${VERCEL_PROJECT_NAME:-$(basename "$(pwd)")}"
VERCEL="bunx vercel@latest"

if [ -z "${VERCEL_SCOPE:-}" ] || [ -z "${VERCEL_TEAM_ID:-}" ]; then
  RESOLVED="$(VERCEL_TOKEN="$VERCEL_TOKEN" bun -e '
    const h = { headers: { Authorization: "Bearer " + process.env.VERCEL_TOKEN } };
    const [u, tj] = await Promise.all([
      fetch("https://api.vercel.com/v2/user", h).then((r) => r.json()).catch(() => ({})),
      fetch("https://api.vercel.com/v2/teams?limit=50", h).then((r) => r.json()).catch(() => ({})),
    ]);
    const teams = tj.teams || [];
    const def = (u.user || u || {}).defaultTeamId;
    const t = teams.find((x) => x.id === def) || teams[0];
    if (t) process.stdout.write(t.id + " " + t.slug);
  ' 2>/dev/null || true)"
  VERCEL_TEAM_ID="${VERCEL_TEAM_ID:-${RESOLVED%% *}}"
  [ "$RESOLVED" != "${RESOLVED#* }" ] && VERCEL_SCOPE="${VERCEL_SCOPE:-${RESOLVED##* }}"
fi

echo "==> building Vercel production bundle"
bash ./build-vercel.sh

SCOPE_ARGS=()
if [ -n "${VERCEL_SCOPE:-}" ]; then SCOPE_ARGS=(--scope "$VERCEL_SCOPE"); fi
ENV_ARGS=()
if [ -n "${DATABASE_URL:-}" ]; then ENV_ARGS=(-e "DATABASE_URL=$DATABASE_URL"); fi

echo "==> deploying to production${VERCEL_SCOPE:+ (scope: $VERCEL_SCOPE)}"
DEPLOY_OUT="$($VERCEL deploy --prebuilt --prod --yes --token "$VERCEL_TOKEN" \
  --name "$PROJECT_NAME" "${SCOPE_ARGS[@]}" "${ENV_ARGS[@]}" 2>&1)" || {
  printf '%s\n' "$DEPLOY_OUT" >&2
  exit 1
}
printf '%s\n' "$DEPLOY_OUT"
LIVE_URL="$(printf '%s\n' "$DEPLOY_OUT" | grep -oE 'https://[a-zA-Z0-9._-]+\.vercel\.app' | tail -1)"

if [ -z "$LIVE_URL" ]; then
  echo "deploy finished but no Vercel URL was parsed" >&2
  exit 1
fi

TEAM_QS=""
if [ -n "${VERCEL_TEAM_ID:-}" ]; then TEAM_QS="?teamId=$VERCEL_TEAM_ID"; fi

echo "==> ensuring project is public"
curl -sf -X PATCH "https://api.vercel.com/v9/projects/${PROJECT_NAME}${TEAM_QS}" \
  -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
  -d '{"ssoProtection":null}' >/dev/null ||
  echo "warning: could not disable SSO protection" >&2

CUSTOM_DOMAIN="$(VERCEL_TOKEN="$VERCEL_TOKEN" PROJECT_NAME="$PROJECT_NAME" VERCEL_TEAM_ID="${VERCEL_TEAM_ID:-}" bun -e '
  const token = process.env.VERCEL_TOKEN;
  const name = process.env.PROJECT_NAME;
  const team = process.env.VERCEL_TEAM_ID;
  const qs = team ? `?teamId=${encodeURIComponent(team)}` : "";
  const r = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(name)}/domains${qs}`, { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json().catch(() => ({}));
  const domains = (j.domains || []).filter((d) => d.verified !== false).map((d) => d.name);
  const preferred = domains.find((d) => d === "www.prismbayai.com") || domains.find((d) => d.endsWith("prismbayai.com")) || domains[0] || "";
  process.stdout.write(preferred);
' 2>/dev/null || true)"

if [ -n "$CUSTOM_DOMAIN" ]; then
  echo "LIVE: https://$CUSTOM_DOMAIN"
  echo "CLEAN: https://$CUSTOM_DOMAIN/clean"
else
  echo "LIVE: $LIVE_URL"
  echo "CLEAN: $LIVE_URL/clean"
fi
