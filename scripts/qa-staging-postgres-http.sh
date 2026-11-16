#!/usr/bin/env bash
set -euo pipefail
# Disposable 3-service staging topology: internal-only PHP, Nginx, PG18.
# No real Portal, active contracts, secrets, VPS, bind mounts, or host ports.
fail(){ echo "HOLD synthetic 3-container staging: $1" >&2;exit 2; }
[[ "${CI:-}" == "true" && "${GITHUB_ACTIONS:-}" == "true" &&
   "${GITHUB_EVENT_NAME:-}" == "pull_request" ]] || fail "CI PR only"
[[ -z "${DOCKER_HOST:-}" && -z "${DOCKER_CONTEXT:-}" ]] || fail "local Docker only"
[[ "$(docker context show)" == "default" ]] || fail "default Docker context required"
test ! -e .env && test ! -e ops/staging/.env.staging || fail "environment files prohibited"
[[ "$#" == 2 && "$1" == uni-qa-stage-* && "$2" == uni-qa-stage-* ]] ||
  fail "two locally built staging tags required"
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
docker network create --internal --driver bridge "$network" >/dev/null
docker volume create "$volume" >/dev/null
docker run -d --name "$db" --network "$network" --network-alias db \
  --env POSTGRES_DB=uni_staging_ci_only \
  --env POSTGRES_USER=uni_ci_migration_owner \
  --env POSTGRES_PASSWORD=FAKE_OWNER_CI_ONLY \
  --volume "$volume":/var/lib/postgresql \
  postgres:18-alpine >/dev/null
ready=0
for attempt in $(seq 1 60); do
  if docker exec "$db" pg_isready -U uni_ci_migration_owner \
      -d uni_staging_ci_only >/dev/null 2>&1; then
    ready=1;break
  fi
  sleep 0.5
done
[[ "$ready" == 1 ]] || fail "synthetic PostgreSQL not ready"

# DDL is run once by the SEPARATE migration owner, never runtime.
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
docker exec "$db" psql -U uni_ci_migration_owner -d uni_staging_ci_only \
  -v ON_ERROR_STOP=1 -c \
  "CREATE ROLE uni_ci_runtime_only LOGIN PASSWORD 'FAKE_RUNTIME_CI_ONLY'" >/dev/null
sed -e 's/uni_stage_runtime/uni_ci_runtime_only/g' \
    -e 's/imagine_uni_stage/uni_staging_ci_only/g' \
    ops/staging/role-grants-candidate.sql |
  docker exec -i "$db" psql -U uni_ci_migration_owner \
    -d uni_staging_ci_only -v ON_ERROR_STOP=1 >/dev/null

# Actual app must run with runtime SQL role, NOT migration owner.
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
docker run -d --name "$web" --network "$network" --network-alias web \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --tmpfs /var/cache/nginx:mode=1777 --tmpfs /var/run:mode=1777 \
  --tmpfs /tmp:mode=1777 "$nginxImage" nginx -g 'daemon off;' >/dev/null

# Full HTTP path through nginx -> PHP -> real PG18 sessions, with NO Portal
# grants enabled. Probe only 403/health, never synthetic grants or payments.
docker run --rm -i --network "$network" --read-only --cap-drop ALL \
  --security-opt no-new-privileges --tmpfs /tmp:mode=1777 \
  "$phpImage" php < scripts/qa-staging-private-http-probe.php

sessionCount="$(docker exec "$db" psql -U uni_ci_migration_owner \
  -d uni_staging_ci_only -tA -c 'SELECT COUNT(*) FROM public.sessions')"
[[ "$sessionCount" =~ ^[0-9]+$ ]] || fail "session count unavailable"
echo "PASS synthetic 3-service staging PG18: owner migrations, separate runtime role, private HTTP and session storage query. No host ports."
