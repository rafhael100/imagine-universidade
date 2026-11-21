#!/usr/bin/env bash
set -euo pipefail
# P0 synthetic-only candidate Compose DB-health check. No VPS, migrations or grants.
fail(){ echo "HOLD synthetic DB SQL readiness: $1" >&2; exit 2; }
[[ "${CI:-}" == true && "${GITHUB_ACTIONS:-}" == true ]] || fail "disposable CI only"
[[ "${GITHUB_REPOSITORY:-}" == "rafhael100/imagine-universidade" &&
   "${GITHUB_EVENT_NAME:-}" == push &&
   "${GITHUB_REF_NAME:-}" == "review/uni-p0-pg-sql-health-contract-2026-11-20" ]] ||
  fail "isolated review branch only"
[[ -z "${DOCKER_HOST:-}" && -z "${DOCKER_CONTEXT:-}" ]] || fail "remote Docker forbidden"
[[ "$(docker context show)" == default ]] || fail "default Docker context only"
test ! -e .env && test ! -e .env.production && test ! -e .env.local &&
test ! -e ops/staging/.env.staging || fail "environment files forbidden"
command -v timeout >/dev/null || fail "bounded probe required"
docker compose version >/dev/null
umask 077
tempdir="$(mktemp -d)"
fake="$tempdir/fake.env"
project="uni-p0-pghealth-${GITHUB_RUN_ID:?}-${GITHUB_RUN_ATTEMPT:?}"
cleanup(){
  docker compose -p "$project" --env-file "$fake" -f ops/staging/compose.yaml \
    down --volumes --remove-orphans -t 2 >/dev/null 2>&1 || true
  rm -rf "$tempdir"
}
trap cleanup EXIT
cat > "$fake" <<'SYNTHETIC_ONLY'
APP_NAME="Imagine Universidade CI DB health"
APP_KEY=FAKE_NOT_A_REAL_APP_KEY
APP_URL=https://unavailable.invalid
UNI_STAGING_LOOPBACK_PORT=18123
UNI_STAGING_DB=uni_stage_ci_fake
UNI_STAGING_DB_OWNER=uni_ci_owner_fake
UNI_STAGING_DB_OWNER_PASSWORD=CI_FAKE_NOT_SECRET
UNI_STAGING_APP_DB_USER=uni_ci_runtime_fake
UNI_STAGING_APP_DB_PASSWORD=CI_FAKE_OTHER_NOT_SECRET
SYNTHETIC_ONLY
dc(){ docker compose -p "$project" --env-file "$fake" -f ops/staging/compose.yaml "$@"; }
# Start ONLY PostgreSQL. No application, migrations, real services or ports.
dc config --quiet
dc up -d --no-build db >/dev/null
cid="$(dc ps -q db)"
[[ -n "$cid" ]] || fail "no disposable PostgreSQL container"
wait_health(){
  local expect="$1" limit="$2" observed="" start=$SECONDS
  while (( SECONDS-start < limit )); do
    observed="$(timeout 4s docker inspect -f '{{.State.Health.Status}}' "$cid")" ||
      fail "Docker health status unavailable"
    [[ "$observed" == "$expect" ]] && return 0
    sleep 2
  done
  fail "health did not become $expect"
}
query(){
  local password="$1" sql="$2"
  timeout 6s docker exec --env "PGPASSWORD=$password" --env PGCONNECT_TIMEOUT=2 \
    "$cid" psql -X -w -h db -p 5432 -U uni_ci_owner_fake \
    -d uni_stage_ci_fake -v ON_ERROR_STOP=1 -tA -c "$sql"
}
wait_health healthy 80
[[ "$(query CI_FAKE_NOT_SECRET 'SELECT 1')" == 1 ]] ||
  fail "positive authenticated TCP SQL query failed"
# Reproduce socket-readiness false positive: PostgreSQL still runs, but the
# credential retained by the candidate DB healthcheck becomes invalid. Use
# -h db (service-network IP), not loopback, which can accept local trust.
query CI_FAKE_NOT_SECRET \
  "ALTER ROLE uni_ci_owner_fake PASSWORD 'CI_FAKE_ROTATED_ONLY'" >/dev/null
if query CI_FAKE_NOT_SECRET 'SELECT 1' >/dev/null 2>&1; then
  fail "old synthetic credential still authenticated"
fi
wait_health unhealthy 110
# Restore original fake credential using the changed one (no DB restart).
query CI_FAKE_ROTATED_ONLY \
  "ALTER ROLE uni_ci_owner_fake PASSWORD 'CI_FAKE_NOT_SECRET'" >/dev/null
wait_health healthy 40
[[ "$(query CI_FAKE_NOT_SECRET 'SELECT 1')" == 1 ]] ||
  fail "health recovered but authenticated SQL did not"
echo "PASS: disposable PG18 Compose DB health healthy -> unhealthy (revoked fake password) -> healthy (recovered)."
echo "No migrations, Portal sessions/grants, private VPS or operational backup exercised. HOLD_NO_GO."
