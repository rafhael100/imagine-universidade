#!/usr/bin/env bash
set -euo pipefail
# Syntax-only in disposable CI. No real credentials or service startup.
[[ "${CI:-}" == "true" && "${GITHUB_ACTIONS:-}" == "true" ]] || {
  echo "FAIL: Compose syntax check is CI-only." >&2; exit 2;
}
test ! -e ops/staging/.env.staging || { echo "FAIL: unexpected staging env file." >&2; exit 2; }
docker compose version >/dev/null
umask 077
model_file="$(mktemp)"
trap 'rm -f ops/staging/.env.staging "$model_file"' EXIT
cat > ops/staging/.env.staging <<'ONLY_FAKE_VALUES'
APP_NAME="Imagine Universidade CI Syntax Only"
APP_ENV=staging
APP_DEBUG=false
APP_URL=https://unavailable.invalid
APP_KEY=CI_FAKE_NOT_VALID_LARAVEL_KEY
UNI_STAGING_LOOPBACK_PORT=18123
UNI_STAGING_DB=uni_stage_ci_fake
UNI_STAGING_DB_OWNER=uni_ci_owner_fake
UNI_STAGING_DB_OWNER_PASSWORD=CI_FAKE_NOT_SECRET
UNI_STAGING_APP_DB_USER=uni_ci_runtime_fake
UNI_STAGING_APP_DB_PASSWORD=CI_FAKE_NOT_SECRET_EITHER
SESSION_DRIVER=database
SESSION_ENCRYPT=true
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
UNRELATED_SECRET=CI_FAKE_MUST_NOT_REACH_ANY_SERVICE
ONLY_FAKE_VALUES
docker compose --env-file ops/staging/.env.staging -f ops/staging/compose.yaml config --format json > "$model_file"
node ops/staging/check-compose-environment.mjs "$model_file"
echo "PASS: staging Compose YAML/interpolation and credential isolation checked with disposable placeholders; no service started."
