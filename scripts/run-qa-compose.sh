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
  trap - EXIT INT TERM
  if [[ "$status" -ne 0 ]]; then
    # Only synthetic PostgreSQL logs from this uniquely named project.
    # Do not print private app environment variables or secret files.
    echo "QA Docker failed. Last 70 lines of disposable PostgreSQL diagnostics:" >&2
    docker compose -p "$PROJECT" -f compose.qa.yml --profile manual-qa \
      logs --no-color --tail 70 db >&2 || true
  fi
  # A green test is not a green laboratory if the PostgreSQL volume survives.
  # Never hide a failed teardown with '|| true'.
  if ! docker compose -p "$PROJECT" -f compose.qa.yml --profile manual-qa down \
      --volumes --remove-orphans; then
    echo "FAIL: disposable QA Docker teardown failed; inspect runner resources." >&2
    status=2
  fi
  # Verify by the unique Compose project label, without querying other stacks.
  local leftovers
  if ! leftovers="$(docker ps -aq --filter "label=com.docker.compose.project=$PROJECT")"; then
    echo "FAIL: unable to verify disposable QA containers." >&2
    status=2
  elif [[ -n "$leftovers" ]]; then
    echo "FAIL: disposable QA containers remain after teardown." >&2
    status=2
  fi
  if ! leftovers="$(docker volume ls -q --filter "label=com.docker.compose.project=$PROJECT")"; then
    echo "FAIL: unable to verify disposable QA database volumes." >&2
    status=2
  elif [[ -n "$leftovers" ]]; then
    echo "FAIL: disposable QA database volumes remain after teardown." >&2
    status=2
  fi
  if ! leftovers="$(docker network ls -q --filter "label=com.docker.compose.project=$PROJECT")"; then
    echo "FAIL: unable to verify disposable QA networks." >&2
    status=2
  elif [[ -n "$leftovers" ]]; then
    echo "FAIL: disposable QA network remains after teardown." >&2
    status=2
  fi
  if [[ "$status" -eq 0 ]]; then
    echo "PASS: synthetic PostgreSQL restore and verified disposal of QA containers, database volume and network."
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

echo "QA isolation: project $PROJECT; NO public ports, binds, deploy or real credentials."
echo "This run downloads disposable images/dependencies and uses local CPU/network."
echo "Running QA does not approve deployment or production access."
docker compose -p "$PROJECT" -f compose.qa.yml --profile manual-qa build qa
docker compose -p "$PROJECT" -f compose.qa.yml --profile manual-qa run --rm qa
echo "QA synthetic PostgreSQL backup and restore in disposable db container."
docker compose -p "$PROJECT" -f compose.qa.yml --profile manual-qa exec -T db sh -s \
  < scripts/qa-pg-backup-restore.sh
echo "QA restore command finished; waiting for verified teardown before PASS."
