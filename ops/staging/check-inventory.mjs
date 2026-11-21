#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const script=readFileSync(new URL("./inventory-readonly.sh",import.meta.url),"utf8");
assert.match(script,/^#!\/usr\/bin\/env bash/m);
assert.match(script,/set -euo pipefail/);
assert.match(script,/DOCKER_HOST/);
assert.match(script,/docker context show/);
assert.match(script,/docker context inspect default --format/);
assert.ok(script.includes("unix:///var/run/docker.sock"));
assert.match(script,/docker ps --format/);
assert.match(script,/ss -H -ltn/);
assert.match(script,/MemAvailable/);
assert.match(script,/df -Pk/);
assert.match(script,/18081/);
assert.match(script,/no socket was reserved/);
// List operations are necessary to detect orphaned networks/volumes. Keep
// every Docker invocation on an exact read-only allowlist, not a broad
// exception that could accidentally admit network/volume mutation commands.
const dockerLines=script.split("\n").map(line=>line.trim())
  .filter(line=>!line.startsWith("#")&&/\bdocker\s/.test(line));
assert.deepEqual(dockerLines,[
  "for required_command in docker ss awk df; do",
  '[[ "$(docker context show 2>/dev/null)" == "default" ]] ||',
  'docker_endpoint="$(docker context inspect default --format \'{{ (index .Endpoints "docker").Host }}\' 2>/dev/null)" ||',
  "docker ps --format '{{.Names}}' >/dev/null 2>&1 ||",
  "container_names=\"$(docker ps -a --format '{{.Names}}' 2>/dev/null)\" ||",
  "owned_containers=\"$(docker ps -a --filter \"$staging_label\" --format '{{.ID}}' 2>/dev/null)\" ||",
  "network_names=\"$(docker network ls --format '{{.Name}}' 2>/dev/null)\" ||",
  "owned_networks=\"$(docker network ls --filter \"$staging_label\" --format '{{.ID}}' 2>/dev/null)\" ||",
  "volume_names=\"$(docker volume ls --format '{{.Name}}' 2>/dev/null)\" ||",
  "owned_volumes=\"$(docker volume ls --filter \"$staging_label\" --format '{{.Name}}' 2>/dev/null)\" ||",
],"inventory may only use the audited Docker list/context commands");
assert.doesNotMatch(script,/\b(?:ssh|scp|rsync|curl|wget|docker inspect)\b/);
assert.doesNotMatch(script,/\b(?:source\s+\.env|cat\s+\.env|printenv|env\s*\|)\b/);
await import("../../scripts/check-staging-inventory.mjs");
console.log("PASS staging inventory is read-only and checks local Docker resources and the candidate loopback port");
