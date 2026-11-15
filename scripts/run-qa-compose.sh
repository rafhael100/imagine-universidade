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
echo "PASS: disposable QA run finished. Removing services and data."
