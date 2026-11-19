#!/usr/bin/env bash
set -euo pipefail

# READ-ONLY host inventory. Do not run on a remote Docker context.
# Never starts containers, reserves ports, opens firewall or reads .env.
fail() { printf 'HOLD: %s\n' "$1" >&2; exit 2; }
if [[ "$#" -ne 1 || ! "$1" =~ ^[0-9]{4,5}$ ]]; then
  fail "Supply exactly one numeric candidate loopback port (18000..60000)."
fi
candidate_port="$1"
if (( 10#$candidate_port < 18000 || 10#$candidate_port > 60000 )); then
  fail "Candidate port is outside the allowed private staging inventory range."
fi
if [[ "$candidate_port" == "18081" ]]; then
  fail "Port 18081 is reserved/conflicted with other Imagine service proposals."
fi
[[ "$(uname -s)" == "Linux" ]] || fail "This inventory runs on Linux only."
for required_command in docker ss awk df; do
  command -v "$required_command" >/dev/null 2>&1 || fail "Missing required local inventory tool."
done
[[ -z "${DOCKER_HOST:-}" && -z "${DOCKER_CONTEXT:-}" ]] ||
  fail "Remote/overridden Docker daemon is not authorized."
[[ "$(docker context show 2>/dev/null)" == "default" ]] ||
  fail "Docker context must be the local default."
docker ps --format '{{.Names}}' >/dev/null 2>&1 ||
  fail "Docker local read-only inventory is unavailable."

# A stopped or newly created service may reserve this port later.
# A successful preflight is NOT a reservation or deployment permission.
socket_inventory="$(ss -H -ltn 2>/dev/null)" || fail "Socket inventory is unavailable."
if printf '%s\n' "$socket_inventory" | awk -v port="$candidate_port" '{
    n=split($4,fields,":");
    if (fields[n]==port) found=1;
  } END { exit(found?0:1); }' 2>/dev/null; then
  fail "Candidate port has an existing listening socket."
else
  socket_check_status="$?"
  [[ "$socket_check_status" == 1 ]] || fail "Socket inventory could not be checked."
fi

# Match the literal project in compose.yaml; the regression verifies parity.
# Labels also find renamed resources. Names also find orphaned/unlabelled
# resources, including historical aliases and both Compose separators.
# These checks only read names/IDs; none are printed or inspected further.
staging_project='imagine-universidade-staging'
staging_label="label=com.docker.compose.project=$staging_project"
has_staging_name() {
  local resource_name
  while IFS= read -r resource_name; do
    case "$resource_name" in
      "$staging_project"|"$staging_project"-*|"$staging_project"_*|\
      imagine-uni-stage|imagine-uni-stage-*|imagine-uni-stage_*|\
      university-stage|university-stage-*|university-stage_*) return 0 ;;
    esac
  done <<< "$1"
  return 1
}

container_names="$(docker ps -a --format '{{.Names}}' 2>/dev/null)" ||
  fail "Unable to inventory existing local container names."
if has_staging_name "$container_names"; then
  fail "An existing University staging container must be inspected separately."
fi
owned_containers="$(docker ps -a --filter "$staging_label" --format '{{.ID}}' 2>/dev/null)" ||
  fail "Unable to inventory local container ownership."
[[ -z "$owned_containers" ]] ||
  fail "An existing University staging container must be inspected separately."

network_names="$(docker network ls --format '{{.Name}}' 2>/dev/null)" ||
  fail "Unable to inventory existing local network names."
if has_staging_name "$network_names"; then
  fail "An existing University staging network must be inspected separately."
fi
owned_networks="$(docker network ls --filter "$staging_label" --format '{{.ID}}' 2>/dev/null)" ||
  fail "Unable to inventory local network ownership."
[[ -z "$owned_networks" ]] ||
  fail "An existing University staging network must be inspected separately."

volume_names="$(docker volume ls --format '{{.Name}}' 2>/dev/null)" ||
  fail "Unable to inventory existing local volume names."
if has_staging_name "$volume_names"; then
  fail "An existing University staging volume must be inspected separately."
fi
owned_volumes="$(docker volume ls --filter "$staging_label" --format '{{.Name}}' 2>/dev/null)" ||
  fail "Unable to inventory local volume ownership."
[[ -z "$owned_volumes" ]] ||
  fail "An existing University staging volume must be inspected separately."

available_kb="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo 2>/dev/null)" ||
  fail "Memory inventory is unavailable."
disk_kb="$(df -Pk . 2>/dev/null | awk 'NR==2 {print $4}' 2>/dev/null)" ||
  fail "Disk inventory is unavailable."
[[ "$available_kb" =~ ^[0-9]+$ && "$disk_kb" =~ ^[0-9]+$ ]] ||
  fail "Could not obtain trusted local memory/disk inventory."
(( available_kb >= 2097152 )) ||
  fail "Available memory below preliminary 2 GiB safety floor."
(( disk_kb >= 10485760 )) ||
  fail "Available disk below preliminary 10 GiB safety floor."

printf 'PASS READ-ONLY: loopback port %s appears free at this instant.\n' "$candidate_port"
printf 'PASS READ-ONLY: no University staging container, network or volume collision found.\n'
printf 'PASS READ-ONLY: local default Docker context and provisional free resource floors.\n'
printf 'HOLD: no socket was reserved, no service was launched, no TLS/SSO/DB/backup gate was approved.\n'
