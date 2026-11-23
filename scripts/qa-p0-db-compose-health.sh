#!/usr/bin/env bash
set -euo pipefail
# P0 synthetic-only candidate Compose DB-health check. No VPS, migrations or grants.
fail(){ echo "HOLD synthetic DB SQL readiness: $1" >&2; exit 2; }
[[ "${CI:-}" == true && "${GITHUB_ACTIONS:-}" == true ]] || fail "disposable CI only"
# The current DRAFT successor is explicitly allowed for this disposable-only
# positive SQL health drill; all other branches, including main, remain denied.
[[ "${GITHUB_REPOSITORY:-}" == "rafhael100/imagine-universidade" &&
   "${GITHUB_EVENT_NAME:-}" == push &&
   ( "${GITHUB_REF_NAME:-}" == "review/uni-p0-pg-sql-health-contract-2026-11-20" ||
     "${GITHUB_REF_NAME:-}" == "review/uni-p0-readiness-git-config-root-fence-2026-11-22" ) ]] ||
  fail "isolated review branch only"
# A context called "default" may still point to remote SSH/TCP or an
# alternate Unix socket. Check the effective endpoint before build/run/cleanup.
# Do not echo endpoint values, paths or any environment contents.
for docker_override in DOCKER_HOST DOCKER_CONTEXT DOCKER_TLS_VERIFY DOCKER_CERT_PATH; do
  [[ -z "$(printenv "$docker_override" || true)" ]] ||
    fail "Docker client endpoint override forbidden"
done
if ! docker_context_name="$(docker context show)" || [[ "$docker_context_name" != "default" ]]; then
  fail "default local Docker context required"
fi
if ! docker_endpoint="$(docker context inspect default --format '{{ (index .Endpoints "docker").Host }}')" ||
   [[ "$docker_endpoint" != "unix:///var/run/docker.sock" ]]; then
  fail "exact local Docker Unix socket required"
fi
test ! -e .env && test ! -e .env.production && test ! -e .env.local &&
test ! -e ops/staging/.env.staging || fail "environment files forbidden"
command -v timeout >/dev/null || fail "bounded probe required"
docker compose version >/dev/null
umask 077
# A reused run ID cannot authorize teardown of an existing Compose project.
# Query all three Compose resource classes BEFORE installing the EXIT trap.
project="uni-p0-pghealth-${GITHUB_RUN_ID:?}-${GITHUB_RUN_ATTEMPT:?}"
for resource_kind in containers volumes networks; do
  case "$resource_kind" in
    containers) inspect_args=(ps -aq) ;;
    volumes) inspect_args=(volume ls -q) ;;
    networks) inspect_args=(network ls -q) ;;
  esac
  if ! existing="$(docker "${inspect_args[@]}" --filter "label=com.docker.compose.project=$project")"; then
    fail "cannot verify unused disposable Compose project"
  fi
  [[ -z "$existing" ]] || fail "disposable Compose project already owns resources"
done
tempdir="$(mktemp -d)"
fake="$tempdir/fake.env"
cleanup(){
  local originalExit=$? teardownFailed=0 leftovers=0 existing
  trap - EXIT
  docker compose -p "$project" --env-file "$fake" -f ops/staging/compose.yaml \
    down --volumes --remove-orphans -t 2 >/dev/null 2>&1 || teardownFailed=1
  for resource_kind in containers volumes networks; do
    case "$resource_kind" in
      containers) inspect_args=(ps -aq) ;;
      volumes) inspect_args=(volume ls -q) ;;
      networks) inspect_args=(network ls -q) ;;
    esac
    if ! existing="$(docker "${inspect_args[@]}" --filter "label=com.docker.compose.project=$project" 2>/dev/null)" ||
       [[ -n "$existing" ]]; then
      leftovers=1
    fi
  done
  rm -rf "$tempdir"
  if (( teardownFailed != 0 || leftovers != 0 )); then
    echo "HOLD synthetic DB SQL readiness: verified Compose teardown failed" >&2
    exit 2
  fi
  if (( originalExit == 0 )); then
    echo "PASS: disposable PG18 Compose DB health healthy -> unhealthy (revoked fake password) -> healthy (recovered), verified cleanup."
    echo "No migrations, Portal sessions/grants, private VPS or operational backup exercised. HOLD_NO_GO."
  fi
  exit "$originalExit"
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
# Report PASS only from the EXIT trap, after verified disposal.
