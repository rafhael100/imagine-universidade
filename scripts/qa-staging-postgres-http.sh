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
       "${GITHUB_REF:-}" == "refs/heads/review/uni-p0-private-health-runtime-2026-11-20" ) ]] ||
    fail "push QA only on authorized review branch"
elif [[ "${GITHUB_EVENT_NAME:-}" == "pull_request" ]]; then
  [[ "${GITHUB_REPOSITORY:-}" == "rafhael100/imagine-universidade" ]] ||
    fail "PR QA only on original repository"
else
  fail "CI event not authorized"
fi
[[ -z "${DOCKER_HOST:-}" && -z "${DOCKER_CONTEXT:-}" ]] || fail "local Docker only"
[[ "$(docker context show)" == "default" ]] || fail "default Docker context required"
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
cleanup(){
  docker rm -f "$web" "$app" "$db" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  docker volume rm "$volume" >/dev/null 2>&1 || true
}
trap cleanup EXIT
stagingPgStage=network
docker network create --internal --driver bridge "$network" >/dev/null
stagingPgStage=volume
docker volume create "$volume" >/dev/null
stagingPgStage=postgres_start
docker run -d --name "$db" --network "$network" --network-alias db \
  --env POSTGRES_DB=uni_staging_ci_only \
  --env POSTGRES_USER=uni_ci_migration_owner \
  --env POSTGRES_PASSWORD=FAKE_OWNER_CI_ONLY \
  --volume "$volume":/var/lib/postgresql \
  postgres:18-alpine >/dev/null
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

echo "PASS synthetic 3-service staging PG18: owner migrations, separate runtime role, private HTTP and session storage query. No host ports."
