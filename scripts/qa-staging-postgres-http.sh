#!/usr/bin/env bash
set -euo pipefail
# Disposable 3-service staging topology: internal-only PHP, Nginx, PG18.
# No real Portal, active contracts, secrets, VPS, bind mounts, or host ports.
stagingPgStage=guards
fail(){ echo "HOLD synthetic 3-container staging: stage=$stagingPgStage; $1" >&2;exit 2; }
stageFailure(){
  local failureCode=$?
  trap - ERR
  # Fixed stage and exit code only: no command, container log or credentials.
  echo "HOLD synthetic 3-container staging: stage=$stagingPgStage; exit=$failureCode" >&2
  exit "$failureCode"
}
trap stageFailure ERR
[[ "${CI:-}" == "true" && "${GITHUB_ACTIONS:-}" == "true" ]] || fail "CI only"
if [[ "${GITHUB_EVENT_NAME:-}" == "push" ]]; then
  [[ "${GITHUB_REPOSITORY:-}" == "rafhael100/imagine-universidade" &&
     ( "${GITHUB_REF:-}" == "refs/heads/fix/uni-c108-private-flow-2026-11-17" ||
       "${GITHUB_REF:-}" == "refs/heads/review/uni-p0-private-health-runtime-2026-11-20" ||
       "${GITHUB_REF:-}" == "refs/heads/review/uni-p0-db-outage-failclosed-2026-11-20" ||
       "${GITHUB_REF:-}" == "refs/heads/review/uni-p0-db-aware-health-2026-11-20" ||
       "${GITHUB_REF:-}" == "refs/heads/review/uni-p0-synthetic-image-rollback-2026-11-20" ||
       "${GITHUB_REF:-}" == "refs/heads/review/uni-p0-readiness-git-config-root-fence-2026-11-22" ) ]] ||
    fail "push QA only on authorized review branch"
elif [[ "${GITHUB_EVENT_NAME:-}" == "pull_request" ]]; then
  [[ "${GITHUB_REPOSITORY:-}" == "rafhael100/imagine-universidade" ]] ||
    fail "PR QA only on original repository"
else
  fail "CI event not authorized"
fi
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
test ! -e .env && test ! -e ops/staging/.env.staging || fail "environment files prohibited"
[[ "$#" == 2 && "$1" == uni-qa-stage-* && "$2" == uni-qa-stage-* ]] ||
  fail "two locally built staging tags required"
command -v timeout >/dev/null || fail "bounded readiness timer unavailable"
phpImage="$1"; nginxImage="$2"
suffix="${GITHUB_RUN_ID:?}-${GITHUB_RUN_ATTEMPT:?}"
network="uni-ci-pg-http-net-$suffix"
volume="uni-ci-pg-data-$suffix"
db="uni-ci-pg-http-db-$suffix"
app="uni-ci-pg-http-app-$suffix"
web="uni-ci-pg-http-web-$suffix"
# Refuse occupied CI-only resource names *before* installing the cleanup trap:
# a failed network create must not delete someone else's existing network.
assertDisposableNameFree() {
  local found
  if ! found="$("$@" 2>/dev/null)"; then
    fail "cannot inspect disposable Docker resource ownership"
  fi
  [[ -z "$found" ]] || fail "disposable Docker resource name already exists"
}
for resource in "$web" "$app" "$db"; do
  assertDisposableNameFree docker ps -aq --filter "name=^/$resource$"
done
assertDisposableNameFree docker network ls -q --filter "name=^$network$"
assertDisposableNameFree docker volume ls -q --filter "name=^$volume$"

cleanup() {
  local originalExit=$? leftovers=0 found
  trap - EXIT ERR
  # Deletion errors alone cannot prove the resources are gone.
  docker rm -f "$web" "$app" "$db" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  docker volume rm "$volume" >/dev/null 2>&1 || true
  for resource in "$web" "$app" "$db"; do
    if ! found="$(docker ps -aq --filter "name=^/$resource$" 2>/dev/null)" || [[ -n "$found" ]]; then
      leftovers=1
    fi
  done
  if ! found="$(docker network ls -q --filter "name=^$network$" 2>/dev/null)" || [[ -n "$found" ]]; then
    leftovers=1
  fi
  if ! found="$(docker volume ls -q --filter "name=^$volume$" 2>/dev/null)" || [[ -n "$found" ]]; then
    leftovers=1
  fi
  if (( leftovers != 0 )); then
    echo "HOLD synthetic 3-container staging: verified teardown failed" >&2
    exit 2
  fi
  if (( originalExit == 0 )); then
    echo "PASS synthetic 3-service staging PG18: owner migrations, separate runtime role, private HTTP and session storage query; verified disposal of QA resources. No host ports."
  fi
  exit "$originalExit"
}
trap cleanup EXIT
stagingPgStage=network
docker network create --internal --driver bridge "$network" >/dev/null
stagingPgStage=volume
docker volume create "$volume" >/dev/null
stagingPgStage=postgres_start
pgPinnedRef="postgres@sha256:eb63372c1e05c755f55fa30cbd07aecc443676fc6c0fa90b9002d01537841e1a"
docker run -d --name "$db" --network "$network" --network-alias db \
  --env POSTGRES_DB=uni_staging_ci_only \
  --env POSTGRES_USER=uni_ci_migration_owner \
  --env POSTGRES_PASSWORD=FAKE_OWNER_CI_ONLY \
  --volume "$volume":/var/lib/postgresql \
  "$pgPinnedRef" >/dev/null
# Bind the actually started DB container to the exact upstream digest and local
# image ID before SQL, then reconfirm after all runtime and rollback probes.
pgRuntimeId="$(docker inspect --format '{{.Image}}' "$db")"
[[ "$pgRuntimeId" =~ ^sha256:[a-f0-9]{64}$ &&
   "$(docker inspect --format '{{.Config.Image}}' "$db")" == "$pgPinnedRef" &&
   "$(docker image inspect --format '{{.Id}}' "$pgPinnedRef")" == "$pgRuntimeId" ]] ||
  fail "PostgreSQL runtime image does not match pinned input"
stagingPgStage=postgres_ready
# The official entrypoint starts a temporary socket-only server during initdb.
# pg_isready without a host can accept that server before the final TCP server
# exists. Require a real login/query through the same internal alias as PHP.
# https://github.com/docker-library/postgres/blob/master/docker-entrypoint.sh
ready=0
postgresReadyDeadline=$((SECONDS+60))
while ((SECONDS < postgresReadyDeadline)); do
  if postgresProbe="$(timeout --signal=TERM --kill-after=1s 3s \
      docker exec --env PGPASSWORD=FAKE_OWNER_CI_ONLY \
        --env PGCONNECT_TIMEOUT=2 --env PGOPTIONS='-c statement_timeout=2000' \
        "$db" psql -X -w -h db -p 5432 -U uni_ci_migration_owner \
        -d uni_staging_ci_only -v ON_ERROR_STOP=1 -tA -c 'SELECT 1' 2>/dev/null)" \
      && [[ "$postgresProbe" == 1 ]]; then
    ready=1;break
  fi
  sleep 0.5
done
unset postgresProbe
[[ "$ready" == 1 ]] || fail "authenticated PostgreSQL TCP query did not become ready"

# DDL is run once by the SEPARATE migration owner, never runtime.
# Always inspect the Laravel-resolved connection AND authenticated SQL on
# the disposable network BEFORE the first migration or any SQL DDL.
stagingPgStage=laravel_sql_preflight
docker run --rm -i --network "$network" --read-only --cap-drop ALL \
  --security-opt no-new-privileges \
  --tmpfs /tmp:mode=1777 \
  --tmpfs /var/www/html/storage:mode=1777 \
  --tmpfs /var/www/html/bootstrap/cache:mode=1777 \
  --env APP_ENV=testing --env APP_DEBUG=false \
  --env APP_KEY='base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' \
  --env DB_CONNECTION=pgsql --env DB_HOST=db --env DB_PORT=5432 \
  --env DB_DATABASE=uni_staging_ci_only \
  --env DB_USERNAME=uni_ci_migration_owner \
  --env DB_PASSWORD=FAKE_OWNER_CI_ONLY \
  --env SESSION_DRIVER=array --env CACHE_STORE=array \
  "$phpImage" sh -ec \
  'mkdir -p storage/logs storage/framework/views storage/framework/cache/data storage/framework/sessions;exec php' \
  < scripts/qa-staging-pg-pre-migrate.php

stagingPgStage=migrations
docker run --rm --network "$network" --read-only --cap-drop ALL \
  --security-opt no-new-privileges \
  --tmpfs /tmp:mode=1777 \
  --tmpfs /var/www/html/storage:mode=1777 \
  --tmpfs /var/www/html/bootstrap/cache:mode=1777 \
  --env APP_ENV=testing --env APP_DEBUG=false \
  --env APP_KEY='base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' \
  --env DB_CONNECTION=pgsql --env DB_HOST=db --env DB_PORT=5432 \
  --env DB_DATABASE=uni_staging_ci_only \
  --env DB_USERNAME=uni_ci_migration_owner \
  --env DB_PASSWORD=FAKE_OWNER_CI_ONLY \
  --env SESSION_DRIVER=array --env CACHE_STORE=array \
  "$phpImage" sh -ec \
  'mkdir -p storage/logs storage/framework/views storage/framework/cache/data storage/framework/sessions;php artisan migrate --force --no-interaction >/dev/null'
stagingPgStage=runtime_role
docker exec "$db" psql -U uni_ci_migration_owner -d uni_staging_ci_only \
  -v ON_ERROR_STOP=1 -c \
  "CREATE ROLE uni_ci_runtime_only LOGIN PASSWORD 'FAKE_RUNTIME_CI_ONLY'" >/dev/null
stagingPgStage=runtime_grants
sed -e 's/uni_stage_runtime/uni_ci_runtime_only/g' \
    -e 's/imagine_uni_stage/uni_staging_ci_only/g' \
    ops/staging/role-grants-candidate.sql |
  docker exec -i "$db" psql -U uni_ci_migration_owner \
    -d uni_staging_ci_only -v ON_ERROR_STOP=1 >/dev/null

# Actual app must run with runtime SQL role, NOT migration owner.
stagingPgStage=app_start
start_app() {
  docker run -d --name "$app" --network "$network" --network-alias app \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --tmpfs /tmp:mode=1777 --tmpfs /usr/local/var/run:mode=1777 \
  --tmpfs /var/www/html/storage:mode=1777 \
  --tmpfs /var/www/html/bootstrap/cache:mode=1777 \
  --env APP_ENV=testing --env APP_DEBUG=false \
  --env APP_KEY='base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' \
  --env DB_CONNECTION=pgsql --env DB_HOST=db --env DB_PORT=5432 \
  --env DB_DATABASE=uni_staging_ci_only \
  --env DB_USERNAME=uni_ci_runtime_only \
  --env DB_PASSWORD=FAKE_RUNTIME_CI_ONLY \
  --env LOG_CHANNEL=stderr --env SESSION_DRIVER=database \
  --env SESSION_ENCRYPT=true --env SESSION_SECURE_COOKIE=true \
  --env CACHE_STORE=array --env QUEUE_CONNECTION=sync \
  "$phpImage" sh -ec \
  'mkdir -p storage/logs storage/framework/views storage/framework/cache/data storage/framework/sessions;exec php-fpm -F' >/dev/null
}
start_app
stagingPgStage=web_start
docker run -d --name "$web" --network "$network" --network-alias web \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --tmpfs /var/cache/nginx:mode=1777 --tmpfs /var/run:mode=1777 \
  --tmpfs /tmp:mode=1777 \
  --health-cmd 'wget -q -T 3 -O /dev/null http://127.0.0.1:8080/up' \
  --health-interval 2s --health-timeout 5s --health-retries 2 \
  --health-start-period 0s \
  "$nginxImage" nginx -g 'daemon off;' >/dev/null

# Full HTTP path through nginx -> PHP -> real PG18 sessions, with NO Portal
# grants enabled. Probe only 403/health, never synthetic grants or payments.
stagingPgStage=private_http
docker run --rm -i --network "$network" --read-only --cap-drop ALL \
  --security-opt no-new-privileges --tmpfs /tmp:mode=1777 \
  "$phpImage" php < scripts/qa-staging-private-http-probe.php

stagingPgStage=session_storage
sessionCount="$(docker exec "$db" psql -U uni_ci_migration_owner \
  -d uni_staging_ci_only -tA -c 'SELECT COUNT(*) FROM public.sessions')"
[[ "$sessionCount" =~ ^[0-9]+$ ]] || fail "session count unavailable"
# P0 runtime proof: the real Nginx health command must transition
# healthy -> unhealthy when PHP-FPM is stopped -> healthy after recovery.
# This is an isolated synthetic runner only, NEVER a staging VPS operation.
stagingPgStage=health_positive
wait_web_health() {
  local expected="$1" observed=""
  local deadline=$((SECONDS+40))
  while ((SECONDS < deadline)); do
    observed="$(timeout 3s docker inspect --format '{{.State.Health.Status}}' "$web" 2>/dev/null)" || return 1
    [[ "$observed" == "$expected" ]] && return 0
    sleep 1
  done
  return 1
}
wait_web_health healthy || fail "real Nginx/FPM/Laravel probe failed to become healthy"
stagingPgStage=health_negative
docker stop -t 2 "$app" >/dev/null
# The probe must fail: static 200 on /up would be a dangerous false positive.
if timeout 5s docker exec "$web" wget -q -T 3 -O /dev/null \
  http://127.0.0.1:8080/up >/dev/null 2>&1; then
  fail "health returned success while PHP-FPM was stopped"
fi
wait_web_health unhealthy || fail "health remained positive after PHP-FPM stopped"
stagingPgStage=health_recovery
docker start "$app" >/dev/null
wait_web_health healthy || fail "real Nginx/FPM/Laravel probe did not recover"
# After recovery, forged Portal headers must still be denied by actual HTTP.
stagingPgStage=post_recovery_deny_all
docker run --rm -i --network "$network" --read-only --cap-drop ALL \
  --security-opt no-new-privileges --tmpfs /tmp:mode=1777 \
  "$phpImage" php < scripts/qa-staging-private-http-probe.php
echo "PASS synthetic health healthy -> unhealthy -> healthy; private routes remain 403 without Portal authority."

# P0 independent failure domain: a stopped PostgreSQL must never become an
# authorization bypass or disclose SQL exceptions. Use only the disposable
# Docker volume and already verified synthetic data; this is NOT a backup or
# release rollback rehearsal.
stagingPgStage=postgres_outage_baseline
# Snapshot the post-HTTP value immediately before stopping PostgreSQL:
# normal denied web requests may still create ephemeral database sessions,
# so a count captured BEFORE those requests is not a recovery baseline.
preOutageSessionCount="$(docker exec "$db" psql -X -U uni_ci_migration_owner \
  -d uni_staging_ci_only -v ON_ERROR_STOP=1 -tA \
  -c 'SELECT COUNT(*) FROM public.sessions')"
[[ "$preOutageSessionCount" =~ ^[0-9]+$ ]] || fail "pre-outage SQL session baseline invalid"
stagingPgStage=postgres_outage
docker stop -t 2 "$db" >/dev/null
# A reachable /up while PostgreSQL-backed sessions are unavailable is NOT
# readiness. The existing FPM-only healthcheck currently misses this outage.
stagingPgStage=postgres_outage_health_negative
wait_web_health unhealthy || fail "Nginx health falsely stayed healthy with PostgreSQL stopped"
# The failing /up must not reveal SQL, environment or backtraces, even though
# it is only a private Docker readiness endpoint.
stagingPgStage=postgres_outage_health_response
docker run --rm -i --network "$network" --read-only --cap-drop ALL \
  --security-opt no-new-privileges --tmpfs /tmp:mode=1777 \
  "$phpImage" php < scripts/qa-p0-db-health-probe.php
stagingPgStage=postgres_outage_private_deny
docker run --rm -i --network "$network" --read-only --cap-drop ALL \
  --security-opt no-new-privileges --tmpfs /tmp:mode=1777 \
  "$phpImage" php < scripts/qa-p0-db-outage-probe.php
stagingPgStage=postgres_recovery
docker start "$db" >/dev/null
recovered=0
recoverDeadline=$((SECONDS+75))
while ((SECONDS < recoverDeadline)); do
  if recoveredSql="$(timeout --signal=TERM --kill-after=1s 3s \
      docker exec --env PGPASSWORD=FAKE_OWNER_CI_ONLY \
        --env PGCONNECT_TIMEOUT=2 --env PGOPTIONS='-c statement_timeout=2000' \
        "$db" psql -X -w -h db -p 5432 -U uni_ci_migration_owner \
        -d uni_staging_ci_only -v ON_ERROR_STOP=1 -tA \
        -c 'SELECT COUNT(*) FROM public.sessions' 2>/dev/null)" \
     && [[ "$recoveredSql" == "$preOutageSessionCount" ]]; then
    recovered=1; break
  fi
  sleep 1
done
unset recoveredSql
[[ "$recovered" == 1 ]] || fail "authenticated PG18 recovery or persisted session count failed"
stagingPgStage=postgres_recovery_health_positive
wait_web_health healthy || fail "Nginx health did not recover with PostgreSQL restored"
stagingPgStage=postgres_recovery_private_deny
docker run --rm -i --network "$network" --read-only --cap-drop ALL \
  --security-opt no-new-privileges --tmpfs /tmp:mode=1777 \
  "$phpImage" php < scripts/qa-staging-private-http-probe.php
echo "PASS synthetic PG outage -> recover: SQL session store intact; private HTTP remains denied."

# P0 release safety: simulate replacing the trusted PHP app with the WRONG,
# non-PHP image, then replace it with the exact previous image ID. This is a
# rollback of a disposable container image, not a database/schema rollback or
# private VPS rehearsal. Nginx is restarted to re-resolve the app alias.
stagingPgStage=release_rollback_baseline
approvedImageId="$(docker inspect --format '{{.Image}}' "$app")"
[[ "$approvedImageId" == sha256:* &&
   "$approvedImageId" == "$(docker image inspect --format '{{.Id}}' "$phpImage")" ]] ||
  fail "approved PHP image identity is not verifiable"
beforeRollbackSessions="$(docker exec "$db" psql -X -U uni_ci_migration_owner \
  -d uni_staging_ci_only -v ON_ERROR_STOP=1 -tA \
  -c 'SELECT COUNT(*) FROM public.sessions')"
[[ "$beforeRollbackSessions" =~ ^[0-9]+$ ]] ||
  fail "cannot verify session persistence before synthetic image replacement"

stagingPgStage=release_wrong_image
docker rm -f "$app" >/dev/null
# nginxImage is intentionally not a PHP-FPM image: no executable on port 9000.
# A running but WRONG candidate must fail readiness (not falsely return 200).
docker run -d --name "$app" --network "$network" --network-alias app \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  "$nginxImage" sleep 120 >/dev/null
[[ "$(docker inspect --format '{{.State.Running}}' "$app")" == true ]] ||
  fail "invalid candidate did not stay running for the negative test"
[[ "$(docker inspect --format '{{.Image}}' "$app")" != "$approvedImageId" ]] ||
  fail "negative candidate unexpectedly used the approved application image"
docker restart -t 2 "$web" >/dev/null
wait_web_health unhealthy ||
  fail "wrong runtime image was not detected by private readiness"
if timeout 5s docker exec "$web" wget -q -T 3 -O /dev/null \
  http://127.0.0.1:8080/up >/dev/null 2>&1; then
  fail "wrong image returned a successful readiness response"
fi

stagingPgStage=release_restore_image
docker rm -f "$app" >/dev/null
start_app
[[ "$(docker inspect --format '{{.Image}}' "$app")" == "$approvedImageId" ]] ||
  fail "rollback did not restore the exact previously approved image ID"
docker restart -t 2 "$web" >/dev/null
wait_web_health healthy ||
  fail "rollback to approved image failed to restore health"
afterRollbackSessions="$(docker exec "$db" psql -X -U uni_ci_migration_owner \
  -d uni_staging_ci_only -v ON_ERROR_STOP=1 -tA \
  -c 'SELECT COUNT(*) FROM public.sessions')"
[[ "$afterRollbackSessions" == "$beforeRollbackSessions" ]] ||
  fail "rollback modified or lost the PostgreSQL session baseline"
stagingPgStage=release_rollback_deny_all
docker run --rm -i --network "$network" --read-only --cap-drop ALL \
  --security-opt no-new-privileges --tmpfs /tmp:mode=1777 \
  "$phpImage" php < scripts/qa-staging-private-http-probe.php
echo "PASS synthetic wrong-image detection and exact-image rollback; PG sessions retained and Cliente/Admin remain 403."



# Emit one allowlisted marker after SQL, outage/recovery and app rollback.
# The workflow consumes the marker only if the verified cleanup also passes.
[[ "$(docker inspect --format '{{.Image}}' "$db")" == "$pgRuntimeId" &&
   "$(docker inspect --format '{{.Config.Image}}' "$db")" == "$pgPinnedRef" &&
   "$(docker image inspect --format '{{.Id}}' "$pgPinnedRef")" == "$pgRuntimeId" ]] ||
  fail "PostgreSQL runtime image changed during synthetic QA"
printf 'PASS exact PG18 runtime image %s\n' "$pgRuntimeId"
# Final PASS is emitted only by the EXIT trap after verified teardown.
