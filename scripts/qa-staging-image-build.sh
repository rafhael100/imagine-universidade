#!/usr/bin/env bash
set -euo pipefail
# Disposable GitHub Actions only. Never touch real secrets, VPS or any listener.
fail(){ printf 'HOLD image build: %s\n' "$1" >&2; exit 2; }
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
test ! -e .env && test ! -e .env.production &&
  test ! -e ops/staging/.env.staging || fail "environment secrets in checkout"
test -f composer.lock || fail "locked dependencies required"

tag="uni-qa-stage-${GITHUB_RUN_ID:?}-${GITHUB_RUN_ATTEMPT:?}"
docker build --file ops/staging/Dockerfile.php --tag "${tag}-php" .
docker build --file ops/staging/Dockerfile.nginx --tag "${tag}-nginx" .

# No open ports, no network or access to real data.
docker run --rm --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --tmpfs /tmp \
  --tmpfs /var/www/html/storage:mode=1777 --tmpfs /var/www/html/bootstrap/cache:mode=1777 \
  --env APP_ENV=testing --env APP_DEBUG=false \
  --env APP_KEY='base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' \
  --env SESSION_DRIVER=array --env CACHE_STORE=array \
  "${tag}-php" sh -ec '
  test ! -f .env
  mkdir -p storage/logs storage/framework/sessions storage/framework/views storage/framework/cache/data
  php -r '\''foreach (["sodium","pdo_pgsql"] as $ext) {
    if (!extension_loaded($ext)) {fwrite(STDERR,"FAIL missing runtime extension: ".$ext.PHP_EOL);exit(2);}
  }'\''
  if [ ! -f vendor/autoload.php ]; then echo "FAIL no locked composer autoloader" >&2;exit 2;fi
  php artisan route:list --path=universidade/private --except-vendor > /tmp/uni-routes.txt ||
    { echo "FAIL Laravel route:list returned an error; diagnostic output:" >&2;cat /tmp/uni-routes.txt >&2;exit 2; }
  grep -Fq universidade/private /tmp/uni-routes.txt ||
    { echo "FAIL Laravel has no private route definitions" >&2;cat /tmp/uni-routes.txt >&2;exit 2; }
  echo "PASS staging PHP Laravel private route startup, no live authority"
  '
# Execute a genuine Laravel HTTP kernel with forged client headers and no
# Portal-approved server session. The smoke file stays OUTSIDE the image.
docker run --rm -i --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --tmpfs /tmp \
  --tmpfs /var/www/html/storage:mode=1777 --tmpfs /var/www/html/bootstrap/cache:mode=1777 \
  --env APP_ENV=testing --env APP_DEBUG=false \
  --env APP_KEY='base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' \
  --env SESSION_DRIVER=array --env CACHE_STORE=array \
  "${tag}-php" sh -c 'mkdir -p storage/logs storage/framework/sessions storage/framework/views storage/framework/cache/data && exec php' < scripts/qa-staging-runtime-deny.php
# Only to allow a syntax check without starting/connecting to the app.
# The fake mapping never opens a socket; Docker's network remains none.
docker run --rm --network none --add-host app:127.0.0.1 --read-only --cap-drop ALL \
  --security-opt no-new-privileges \
  --tmpfs /var/cache/nginx:mode=1777 --tmpfs /var/run:mode=1777 --tmpfs /tmp:mode=1777 \
  "${tag}-nginx" nginx -t
bash scripts/qa-staging-private-http.sh "${tag}-php" "${tag}-nginx"
bash scripts/qa-staging-postgres-http.sh "${tag}-php" "${tag}-nginx"
echo "PASS candidate staging PHP/Nginx images build locally without deploy."
