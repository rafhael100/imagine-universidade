#!/usr/bin/env node
// Reused from isolated digest inventory branch a2d577c7348658fb8161e3d44084023954f44e5e.\n// P0 private-release dependency inventory. NEVER grants access or approves deployment.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {readFileSync, writeFileSync} from "node:fs";

const root = path => readFileSync(new URL("../../" + path, import.meta.url));
const digestOf = bytes => createHash("sha256").update(bytes).digest("hex");
const expected = [
  {source: "php:8.4-fpm-bookworm", repository: "php"},
  {source: "composer:2", repository: "composer"},
  {source: "nginx:stable-alpine", repository: "nginx"},
  {source: "postgres:18", repository: "postgres"},
];
const evidenceFiles = [
  "ops/staging/Dockerfile.php",
  "ops/staging/Dockerfile.nginx",
  "ops/staging/compose.yaml",
];
const shaPattern = /^[a-f0-9]{64}$/u;
const digestPattern = /^sha256:[a-f0-9]{64}$/u;

// Deliberately tied to the actual staging candidate (including multistage COPY).
// If a source is changed, the inventory must be reviewed and reissued.
function checkSources() {
  const php = root("ops/staging/Dockerfile.php").toString("utf8");
  const nginx = root("ops/staging/Dockerfile.nginx").toString("utf8");
  const compose = root("ops/staging/compose.yaml").toString("utf8");
  assert.match(php, /^FROM php:8\.4-fpm-bookworm$/mu);
  assert.match(php, /^COPY --from=composer:2 /mu);
  assert.match(nginx, /^FROM nginx:stable-alpine$/mu);
  assert.match(compose, /^    image: postgres:18$/mu);
  assert.equal((php.match(/^FROM /gmu) || []).length, 1);
  assert.equal((nginx.match(/^FROM /gmu) || []).length, 1);
  assert.equal((php.match(/^COPY --from=/gmu) || []).length, 1);
  assert.equal((compose.match(/^\s+image:/gmu) || []).length, 1);
}

function validate(data, commit, hashes) {
  assert.equal(data.schema, 1);
  assert.equal(data.repository, "rafhael100/imagine-universidade");
  assert.match(commit, shaPattern);
  assert.equal(data.commit, commit, "evidence belongs to a different checkout SHA");
  assert.equal(data.scope, "disposable_inventory_only");
  assert.equal(data.release_approval, false);
  assert.equal(data.gate, "HOLD_NO_GO");
  assert.deepEqual(data.file_sha256, hashes);
  assert.deepEqual(Object.keys(data.file_sha256).sort(), evidenceFiles.slice().sort());
  assert.ok(Array.isArray(data.images));
  assert.equal(data.images.length, expected.length);
  for (let i = 0; i < expected.length; i++) {
    const image = data.images[i], spec = expected[i];
    assert.equal(image.source, spec.source);
    assert.match(image.digest, digestPattern);
    assert.equal(image.pinned, spec.repository + "@" + image.digest);
    assert.doesNotMatch(image.pinned, /:[a-zA-Z]|@.*@/u);
  }
  return true;
}
const currentHashes = () => Object.fromEntries([
  ...evidenceFiles,
  "composer.lock",
].map(path => [path, digestOf(root(path))]));
function test() {
  checkSources();
  const hashes = currentHashes();
  const commit = "a".repeat(40);
  const sample = {
    schema: 1,
    repository: "rafhael100/imagine-universidade",
    commit,
    scope: "disposable_inventory_only",
    release_approval: false,
    gate: "HOLD_NO_GO",
    file_sha256: hashes,
    images: expected.map((s, i) => {
      const digest = "sha256:" + String(i + 1).repeat(64);
      return {source: s.source, digest, pinned: s.repository + "@" + digest};
    }),
  };
  assert.equal(validate(sample, commit, hashes), true);
  const mutation = edit => {
    const modified = structuredClone(sample);
    edit(modified);
    assert.throws(() => validate(modified, commit, hashes));
  };
  mutation(x => { x.commit = "b".repeat(40); });
  mutation(x => { x.gate = "GO"; });
  mutation(x => { x.release_approval = true; });
  mutation(x => { x.file_sha256["composer.lock"] = "0".repeat(64); });
  mutation(x => { x.images[0].digest = "sha256:placeholder"; });
  mutation(x => { x.images[1].pinned = "composer:2"; });
  mutation(x => { x.images[0].pinned = "nginx@" + x.images[0].digest; });
  mutation(x => { x.images.reverse(); });
  mutation(x => { x.images.pop(); });
  mutation(x => { x.images.push(structuredClone(x.images[0])); });
  console.log("PASS: release inventory validator + 10 negative mutations; HOLD_NO_GO.");
}
function assertEnvironment() {
  assert.equal(process.env.CI, "true");
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  assert.equal(process.env.GITHUB_REPOSITORY, "rafhael100/imagine-universidade");
  assert.equal(process.env.GITHUB_EVENT_NAME, "push");
  assert.equal(process.env.GITHUB_REF_TYPE, "branch");
  assert.ok(new Set([
    "refs/heads/review/uni-p0-release-base-digests-2026-11-20",
    "refs/heads/review/uni-p0-readiness-git-config-root-fence-2026-11-22",
  ]).has(process.env.GITHUB_REF), "isolated P0 review branch only");
  assert.equal(execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000
  }).trim(), process.env.GITHUB_SHA, "exact GitHub event checkout required");
  assert.match(process.env.GITHUB_SHA || "", /^[a-f0-9]{40}$/u);
  assert.equal(process.env.DOCKER_HOST || "", "");
  assert.equal(process.env.DOCKER_CONTEXT || "", "");
}
function capture(outFile) {
  assertEnvironment();
  checkSources();
  assert.ok(outFile && outFile.startsWith(process.env.RUNNER_TEMP + "/"),
    "only runner temp output is authorized");
  const images = expected.map(spec => {
    const raw = execFileSync("docker",
      ["buildx", "imagetools", "inspect", "--raw", spec.source],
      {maxBuffer: 16 * 1024 * 1024, timeout: 120000});
    const digest = "sha256:" + digestOf(raw);
    const pinned = spec.repository + "@" + digest;
    // The registry must accept the *exact* immutable manifest digest again.
    execFileSync("docker", ["buildx", "imagetools", "inspect", pinned],
      {stdio: ["ignore", "pipe", "pipe"], timeout: 120000});
    return {source: spec.source, digest, pinned};
  });
  const data = {
    schema: 1, repository: "rafhael100/imagine-universidade",
    commit: process.env.GITHUB_SHA, scope: "disposable_inventory_only",
    release_approval: false, gate: "HOLD_NO_GO",
    file_sha256: currentHashes(), images,
  };
  validate(data, process.env.GITHUB_SHA, currentHashes());
  writeFileSync(outFile, JSON.stringify(data, null, 2) + "\n", {flag: "wx", mode: 0o600});
  console.log("PASS: registry-resolved immutable base-image digests captured; release remains NO-GO.");
  console.log("Evidence SHA256: " + digestOf(readFileSync(outFile)));
}
function verify(path) {
  assertEnvironment();
  checkSources();
  assert.ok(path && path.startsWith(process.env.RUNNER_TEMP + "/"));
  const data = JSON.parse(readFileSync(path, "utf8"));
  validate(data, process.env.GITHUB_SHA, currentHashes());
  console.log("PASS: exact commit/lock/Dockerfiles/Compose/4 registry digests; NO-GO.");
}
const [mode, arg] = process.argv.slice(2);
try {
  if (mode === "--test") test();
  else if (mode === "--capture") capture(arg);
  else if (mode === "--verify") verify(arg);
  else throw new Error("Usage: --test | --capture RUNNER_TEMP/file | --verify RUNNER_TEMP/file");
} catch (error) {
  console.error("HOLD: immutable release inventory check failed: " + error.message);
  process.exitCode = 2;
}
