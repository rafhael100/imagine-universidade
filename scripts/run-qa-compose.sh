#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "FAIL: Docker Compose is not installed. No test containers were started." >&2
  exit 2
fi
docker compose version >/dev/null

DOCKER_HOST_VALUE="$(printenv DOCKER_HOST || true)"
if [[ -n "$DOCKER_HOST_VALUE" || "$(docker context show)" != "default" ]]; then
  echo "FAIL: refusing to run QA against a remote/non-default Docker daemon." >&2
  exit 2
fi
if [[ -e .env || -e .env.production || -e .env.local ]]; then
  echo "FAIL: use a clean QA-only checkout, without environment secrets." >&2
  exit 2
fi
if [[ ! -f compose.qa.yml || ! -f ops/qa/Dockerfile ]]; then
  echo "FAIL: QA-only Compose files are missing." >&2
  exit 2
fi

PROJECT="imagine-uni-qa-$BASHPID"
cleanup() {
  local status=$?
  if [[ "$status" -ne 0 ]]; then
    # Only synthetic PostgreSQL logs from this uniquely named project.
    # Do not print private app environment variables or secret files.
    echo "QA Docker failed. Last 70 lines of disposable PostgreSQL diagnostics:" >&2
    docker compose -p "$PROJECT" -f compose.qa.yml --profile manual-qa \
      logs --no-color --tail 70 db >&2 || true
  fi
  docker compose -p "$PROJECT" -f compose.qa.yml --profile manual-qa down \
    --volumes --remove-orphans || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

echo "QA isolation: project $PROJECT; NO public ports, binds, deploy or real credentials."
echo "This run downloads disposable images/dependencies and uses local CPU/network."
echo "Running QA does not approve deployment or production access."
docker compose -p "$PROJECT" -f compose.qa.yml --profile manual-qa build qa
docker compose -p "$PROJECT" -f compose.qa.yml --profile manual-qa run --rm qa
# Negative transport check: injected libpq routing must fail BEFORE psql
# receives any query, rather than attempting an external host connection.
set +e
injection_log="$(docker compose -p "$PROJECT" -f compose.qa.yml --profile manual-qa \
  exec -T -e PGHOST=synthetic-unreachable.invalid db sh -s \
  < scripts/qa-pg-backup-restore.sh 2>&1)"
injection_status=$?
set -e
if [[ "$injection_status" -eq 0 ]] ||
   ! grep -Fq 'FAIL: forbidden libpq override PGHOST' <<< "$injection_log"; then
  echo "FAIL: a client PGHOST override was not rejected before a DB query." >&2
  exit 2
fi
echo "PASS: backup/restore QA rejects external PGHOST override before connection."
echo "QA synthetic PostgreSQL backup and restore in disposable db container."
docker compose -p "$PROJECT" -f compose.qa.yml --profile manual-qa exec -T db sh -s \
  < scripts/qa-pg-backup-restore.sh
echo "PASS: disposable QA and restore finished. Removing services and data."
