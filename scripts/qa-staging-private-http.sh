#!/usr/bin/env bash
set -euo pipefail
# C-67: CI-only, two real containers, internal network, zero host ports.
fail(){ echo "HOLD synthetic HTTP pipeline: $1" >&2; exit 2; }
[[ "${CI:-}" == "true" && "${GITHUB_ACTIONS:-}" == "true" ]] || fail "CI only"
if [[ "${GITHUB_EVENT_NAME:-}" == "push" ]]; then
  [[ "${GITHUB_REPOSITORY:-}" == "rafhael100/imagine-universidade" &&
     "${GITHUB_REF:-}" == "refs/heads/fix/uni-c108-private-flow-2026-11-17" ]] ||
    fail "push QA only on authorized review branch"
elif [[ "${GITHUB_EVENT_NAME:-}" == "pull_request" ]]; then
  [[ "${GITHUB_REPOSITORY:-}" == "rafhael100/imagine-universidade" ]] ||
    fail "PR QA only on original repository"
else
  fail "CI event not authorized"
fi
[[ -z "${DOCKER_HOST:-}" && -z "${DOCKER_CONTEXT:-}" ]] || fail "local Docker only"
[[ "$(docker context show)" == "default" ]] || fail "default Docker context required"
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
cleanup(){
  docker rm -f "$web" "$app" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
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
  "$phpImage" php < scripts/qa-staging-private-http-probe.php
echo "PASS: private Docker network HTTP integration, automatic cleanup, no host ports."
