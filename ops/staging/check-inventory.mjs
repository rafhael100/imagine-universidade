#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const script=readFileSync(new URL("./inventory-readonly.sh",import.meta.url),"utf8");
assert.match(script,/^#!\/usr\/bin\/env bash/m);
assert.match(script,/set -euo pipefail/);
assert.match(script,/DOCKER_HOST/);
assert.match(script,/docker context show/);
assert.match(script,/docker ps --format/);
assert.match(script,/ss -H -ltn/);
assert.match(script,/MemAvailable/);
assert.match(script,/df -Pk/);
assert.match(script,/18081/);
assert.match(script,/no socket was reserved/);
assert.doesNotMatch(script,/\bdocker\s+(?:compose\s+)?(?:up|down|run|exec|build|pull|push|restart|stop|start|rm|volume|network)\b/);
assert.doesNotMatch(script,/\b(?:ssh|scp|rsync|curl|wget|docker inspect)\b/);
assert.doesNotMatch(script,/\b(?:source\s+\.env|cat\s+\.env|printenv|env\s*\|)\b/);
console.log("PASS staging inventory is read-only and requires local Docker and an unused candidate loopback port");
