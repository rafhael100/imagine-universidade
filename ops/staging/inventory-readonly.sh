#!/usr/bin/env bash
set -euo pipefail

# READ-ONLY host inventory. Do not run on a remote Docker context.
# Never starts containers, reserves ports, opens firewall or reads .env.
fail() { printf 'HOLD: %s\n' "$1" >&2; exit 2; }
if [[ "$#" -ne 1 || ! "$1" =~ ^[0-9]{4,5}$ ]]; then
  fail "Supply exactly one numeric candidate loopback port (18000..60000)."
fi
PORT="$1"
if (( 10#$PORT < 18000 || 10#$PORT > 60000 )); then
  fail "Candidate port is outside the allowed private staging inventory range."
fi
if [[ "$PORT" == "18081" ]]; then
  fail "Port 18081 is reserved/conflicted with other Imagine service proposals."
fi
[[ "$(uname -s)" == "Linux" ]] || fail "This inventory runs on Linux only."
for command in docker ss awk df; do
  command -v "$command" >/dev/null 2>&1 || fail "Missing required local inventory tool."
done
[[ -z "${DOCKER_HOST:-}" && -z "${DOCKER_CONTEXT:-}" ]] ||
  fail "Remote/overridden Docker daemon is not authorized."
[[ "$(docker context show 2>/dev/null)" == "default" ]] ||
  fail "Docker context must be the local default."
docker ps --format '{{.Names}}' >/dev/null 2>&1 ||
  fail "Docker local read-only inventory is unavailable."

# A stopped or newly created service may reserve this port later.
# A successful preflight is NOT a reservation or deployment permission.
SOCKETS="$(ss -H -ltn 2>/dev/null)" || fail "Socket inventory is unavailable."
if printf '%s\n' "$SOCKETS" | awk -v port="$PORT" '{
    n=split($4,fields,":");
    if (fields[n]==port) found=1;
  } END { exit(found?0:1); }'; then
  fail "Candidate port has an existing listening socket."
fi

# Never print container environments, labels, Docker inspect or secrets.
NAMES="$(docker ps -a --format '{{.Names}}' 2>/dev/null)" ||
  fail "Unable to inventory existing local container names."
if printf '%s\n' "$NAMES" | grep -Eq '(^|[-_])(imagine-uni-stage|university-stage)([-_]|$)'; then
  fail "An existing University staging container must be inspected separately."
fi

AVAILABLE_KB="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
DISK_KB="$(df -Pk . | awk 'NR==2 {print $4}')"
[[ "$AVAILABLE_KB" =~ ^[0-9]+$ && "$DISK_KB" =~ ^[0-9]+$ ]] ||
  fail "Could not obtain trusted local memory/disk inventory."
(( AVAILABLE_KB >= 2097152 )) ||
  fail "Available memory below preliminary 2 GiB safety floor."
(( DISK_KB >= 10485760 )) ||
  fail "Available disk below preliminary 10 GiB safety floor."

printf 'PASS READ-ONLY: loopback port %s appears free at this instant.\n' "$PORT"
printf 'PASS READ-ONLY: local default Docker context and provisional free resource floors.\n'
printf 'HOLD: no socket was reserved, no service was launched, no TLS/SSO/DB/backup gate was approved.\n'
