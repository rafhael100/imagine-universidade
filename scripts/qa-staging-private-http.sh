#!/usr/bin/env bash
set -euo pipefail
# C-67: CI-only, two real containers, internal network, zero host ports.
fail(){ echo "HOLD synthetic HTTP pipeline: $1" >&2; exit 2; }
[[ "${CI:-}" == "true" && "${GITHUB_ACTIONS:-}" == "true" ]] || fail "CI only"
if [[ "${GITHUB_EVENT_NAME:-}" == "push" ]]; then
  [[ "${GITHUB_REPOSITORY:-}" == "rafhael100/imagine-universidade" &&
     ( "${GITHUB_REF:-}" == "refs/heads/fix/uni-c108-private-flow-2026-11-17" ||
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
test ! -f .env && test ! -f ops/staging/.env.staging || fail "no environment files"
[[ "$#" == 2 ]] || fail "two locally-built image tags required"
phpImage="$1"
nginxImage="$2"
[[ "$phpImage" == uni-qa-stage-* && "$nginxImage" == uni-qa-stage-* ]] ||
  fail "only disposable staging QA tags allowed"

suffix="${GITHUB_RUN_ID:?}-${GITHUB_RUN_ATTEMPT:?}"
network="uni-ci-private-net-$suffix"
app="uni-ci-private-app-$suffix"
web="uni-ci-private-web-$suffix"
# Before installing the trap, refuse names that already belong to another run.
# Never remove another CI resource when a name collides or inspection fails.
assertDisposableNameFree() {
  local found
  if ! found="$("$@" 2>/dev/null)"; then
    fail "cannot inspect disposable Docker resource ownership"
  fi
  [[ -z "$found" ]] || fail "disposable Docker resource name already exists"
}
for resource in "$web" "$app"; do
  assertDisposableNameFree docker ps -aq --filter "name=^/$resource$"
done
assertDisposableNameFree docker network ls -q --filter "name=^$network$"

# A successful HTTP probe does not prove cleanup. Verify that all names are
# actually gone before producing PASS; preserve the original test exit code.
cleanup(){
  local originalExit=$? leftovers=0 found
  trap - EXIT
  docker rm -f "$web" "$app" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  for resource in "$web" "$app"; do
    if ! found="$(docker ps -aq --filter "name=^/$resource$" 2>/dev/null)" ||
       [[ -n "$found" ]]; then
      leftovers=1
    fi
  done
  if ! found="$(docker network ls -q --filter "name=^$network$" 2>/dev/null)" ||
     [[ -n "$found" ]]; then
    leftovers=1
  fi
  if (( leftovers != 0 )); then
    echo "HOLD synthetic HTTP pipeline: verified teardown failed" >&2
    exit 2
  fi
  if (( originalExit == 0 )); then
    echo "PASS: private Docker network HTTP integration, verified cleanup, no host ports."
  fi
  exit "$originalExit"
}
trap cleanup EXIT
docker network create --internal --driver bridge "$network" >/dev/null
docker run -d --name "$app" --network "$network" --network-alias app \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --tmpfs /tmp:mode=1777 --tmpfs /usr/local/var/run:mode=1777 \
  --tmpfs /var/www/html/storage:mode=1777 \
  --tmpfs /var/www/html/bootstrap/cache:mode=1777 \
  --env APP_ENV=testing --env APP_DEBUG=false \
  --env APP_KEY='base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' \
  --env LOG_CHANNEL=stderr --env SESSION_DRIVER=array --env CACHE_STORE=array \
  --env QUEUE_CONNECTION=sync "$phpImage" \
  sh -ec 'mkdir -p storage/logs storage/framework/views storage/framework/cache/data storage/framework/sessions;exec php-fpm -F' >/dev/null
docker run -d --name "$web" --network "$network" --network-alias web \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --tmpfs /var/cache/nginx:mode=1777 --tmpfs /var/run:mode=1777 \
  --tmpfs /tmp:mode=1777 "$nginxImage" nginx -g 'daemon off;' >/dev/null

# Use a short-lived third container purely as an HTTP client.
# No bind of ports/volumes/docker.sock, no internet egress.
docker run --rm -i --network "$network" --read-only --cap-drop ALL \
  --security-opt no-new-privileges --tmpfs /tmp:mode=1777 \
  --env UNI_QA_EXPECT_DB_HEALTH_DOWN=1 \
  "$phpImage" php < scripts/qa-staging-private-http-probe.php
