#!/usr/bin/env node
// Reused from isolated digest inventory branch a2d577c7348658fb8161e3d44084023954f44e5e.\n// P0 private-release dependency inventory. NEVER grants access or approves deployment.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {readFileSync, writeFileSync} from "node:fs";

const root = path => readFileSync(new URL("../../" + path, import.meta.url));
const digestOf = bytes => createHash("sha256").update(bytes).digest("hex");
const expected = [
  {source: "php:8.4.28-fpm-trixie", repository: "php", digest: "sha256:495ab94788034640ddd6fb313476e75570261622c42704e5ae02047b8d934ea0"},
  {source: "composer:2", repository: "composer", digest: "sha256:50ea4d33fdcde1adb0f045547295faa1548b33872e5f789dae5b02ce2fb5de93"},
  {source: "nginx:stable-alpine", repository: "nginx", digest: "sha256:caf4e1e032a20f9c3c5e28fc7f25ffd768ad8677b4975c54193075997b3a97e3"},
  {source: "postgres:18", repository: "postgres", digest: "sha256:eb63372c1e05c755f55fa30cbd07aecc443676fc6c0fa90b9002d01537841e1a"},
  // QA-only PHP 8.3, distinct from the staging PHP 8.4 base.
  {source: "php:8.3-cli-bookworm", repository: "php", digest: "sha256:cdb77e306d6bb99db40e513fbe036ecc6c53b575cbcb7e581387845fef26d755"},
];
const evidenceFiles = [
  "ops/staging/Dockerfile.php",
  "ops/staging/Dockerfile.nginx",
  "ops/staging/compose.yaml",
  "compose.qa.yml",
  "scripts/qa-staging-postgres-http.sh",
  "ops/qa/Dockerfile",
  ".github/workflows/uni-p0-restore-compose-teardown.yml",
];
const shaPattern = /^[a-f0-9]{40}$/u; // Git commit SHA-1, distinct from 64-char image SHA-256
const digestPattern = /^sha256:[a-f0-9]{64}$/u;

// Deliberately tied to the actual staging candidate (including multistage COPY).
// If a source is changed, the inventory must be reviewed and reissued.

function checkQaPgImagePins(qaCompose, qaScript) {
  const pinned = expected[3].repository + "@" + expected[3].digest;
  // Both executable PG18 QA paths must use the SAME reviewed image as staging.
  // No mutable tag may silently change SQL, volume or recovery behavior.
  const composeImages = [...qaCompose.matchAll(/^\s+image:\s*(\S+)\s*$/gmu)].map(m => m[1]);
  // Require the reviewed immutable literal and its quoted use by docker run.
  // readonly prevents the runtime identity checks from drifting from this pin.
  const assignments = [...qaScript.matchAll(/^readonly pgPinnedRef="([^"\r\n]+)"$/gmu)].map(m => m[1]);
  assert.deepEqual(composeImages, [pinned], "Compose QA PostgreSQL image must be digest pinned");
  assert.deepEqual(assignments, [pinned], "HTTP/rollback PostgreSQL image must be digest pinned");
  const dbLaunches = [...qaScript.matchAll(/^docker run -d --name "\$db"[^\n]*\\\n(?:[^\n]*\\\n)*[^\n]+$/gmu)].map(m => m[0]);
  assert.equal(dbLaunches.length, 1, "one HTTP/rollback PostgreSQL launch required");
  assert.match(dbLaunches[0], /\n[ \t]+"\$pgPinnedRef" >\/dev\/null$/u, "HTTP/rollback PostgreSQL launch must use reviewed pin");
}

// The scan and review index must describe the same PG image as both QA paths.
// Bind all three executable workflow literals, not merely the Compose reference.
function checkPgScanWorkflowPins(workflow) {
  const pinned = expected[3].repository + "@" + expected[3].digest;
  const rows = workflow.split("\n").map(line => line.trim()).filter(line =>
    /^(?:pg_ref=|assert\.equal\(env\.PG_PINNED_REF,|assert\.equal\(p\.upstream_ref,)/u.test(line));
  assert.deepEqual(rows, [
    "pg_ref='" + pinned + "'",
    'assert.equal(env.PG_PINNED_REF,"' + pinned + '");',
    'assert.equal(p.upstream_ref,"' + pinned + '");',
  ], "PG scan and review index must use the reviewed immutable pin exactly once");
}

function checkQaDockerfile(qa) {
  const base = expected[4].repository + "@" + expected[4].digest;
  const composer = expected[1].repository + "@" + expected[1].digest;
  // Both QA build inputs must be reviewed immutable references.
  assert.equal(qa.match(/^FROM \S+$/mu)?.[0], "FROM " + base);
  assert.equal(qa.match(/^COPY --from=\S+ /mu)?.[0], "COPY --from=" + composer + " ");
  assert.equal((qa.match(/^FROM /gmu) || []).length, 1);
  assert.equal((qa.match(/^COPY --from=/gmu) || []).length, 1);
}

function checkSources() {
  const php = root("ops/staging/Dockerfile.php").toString("utf8");
  const nginx = root("ops/staging/Dockerfile.nginx").toString("utf8");
  const compose = root("ops/staging/compose.yaml").toString("utf8");
  assert.equal(php.match(/^FROM .*$/mu)?.[0], "FROM " + expected[0].repository + "@" + expected[0].digest);
  assert.equal(php.match(/^COPY --from=\S+ /mu)?.[0], "COPY --from=" + expected[1].repository + "@" + expected[1].digest + " ");
  assert.equal(nginx.match(/^FROM .*$/mu)?.[0], "FROM " + expected[2].repository + "@" + expected[2].digest);
  assert.equal(compose.match(/^    image: .*$/mu)?.[0], "    image: " + expected[3].repository + "@" + expected[3].digest);
  assert.equal((php.match(/^FROM /gmu) || []).length, 1);
  assert.equal((nginx.match(/^FROM /gmu) || []).length, 1);
  assert.equal((php.match(/^COPY --from=/gmu) || []).length, 1);
  assert.equal((compose.match(/^\s+image:/gmu) || []).length, 1);
  checkQaPgImagePins(root("compose.qa.yml").toString("utf8"),
    root("scripts/qa-staging-postgres-http.sh").toString("utf8"));
  checkPgScanWorkflowPins(root(".github/workflows/uni-p0-restore-compose-teardown.yml").toString("utf8"));
  checkQaDockerfile(root("ops/qa/Dockerfile").toString("utf8"));
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
  assert.deepEqual(Object.keys(data.file_sha256).sort(), [...evidenceFiles, "composer.lock"].sort());
  assert.ok(Array.isArray(data.images));
  assert.equal(data.images.length, expected.length);
  for (let i = 0; i < expected.length; i++) {
    const image = data.images[i], spec = expected[i];
    assert.equal(image.source, spec.source);
    assert.match(image.digest, digestPattern);
    assert.equal(image.digest, spec.digest, "image digest must equal the reviewed immutable source");
    assert.equal(image.pinned, spec.repository + "@" + spec.digest);
    assert.doesNotMatch(image.pinned, /@.*@/u, "only one digest separator"); // sha256: HEX is valid
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
    images: expected.map(s => ({source: s.source, digest: s.digest,
      pinned: s.repository + "@" + s.digest})),
  };
  assert.equal(validate(sample, commit, hashes), true);
  const mutation = edit => {
    const modified = structuredClone(sample);
    edit(modified);
    assert.throws(() => validate(modified, commit, hashes));
  };
  mutation(x => { x.commit = "b".repeat(40); });
  mutation(x => { x.commit = "c".repeat(64); }); // image digest must not pass as Git SHA
  mutation(x => { x.gate = "GO"; });
  mutation(x => { x.release_approval = true; });
  mutation(x => { x.file_sha256["composer.lock"] = "0".repeat(64); });
  mutation(x => { delete x.file_sha256["composer.lock"]; });
  mutation(x => { x.images[0].source = "php:8.4-fpm-bookworm"; });
  mutation(x => { x.images[0].digest = "sha256:e4b1eec29a5be22428aa93fb43da75a0e39006e403da0c3e93631dde92f067df"; x.images[0].pinned = "php@" + x.images[0].digest; });
  mutation(x => { x.images[0].digest = "sha256:placeholder"; });
  mutation(x => { x.images[0].digest = "sha256:" + "f".repeat(64); });
  mutation(x => { x.images[3].pinned = "postgres:18"; });
  mutation(x => { x.images[1].pinned = "composer:2"; });
  mutation(x => { x.images[1].pinned += "@sha256:" + "f".repeat(64); });
  mutation(x => { x.images[0].pinned = "nginx@" + x.images[0].digest; });
  mutation(x => { x.images.reverse(); });
  mutation(x => { x.images.pop(); });
  mutation(x => { x.images.push(structuredClone(x.images[0])); });

  const qaCompose = root("compose.qa.yml").toString("utf8");
  const qaScript = root("scripts/qa-staging-postgres-http.sh").toString("utf8");
  const pinnedPg = expected[3].repository + "@" + expected[3].digest;
  assert.throws(() => checkQaPgImagePins(qaCompose.replace(pinnedPg, "postgres:18-alpine"), qaScript));
  assert.throws(() => checkQaPgImagePins(qaCompose, qaScript.replace(pinnedPg, "postgres:18-alpine")));
  assert.throws(() => checkQaPgImagePins(qaCompose.replace(pinnedPg, "postgres@" + "sha256:" + "0".repeat(64)), qaScript));
  assert.throws(() => checkQaPgImagePins(qaCompose, qaScript.replace(pinnedPg, "postgres@" + "sha256:" + "f".repeat(64))));
  assert.throws(() => checkQaPgImagePins(qaCompose, qaScript.replace("readonly pgPinnedRef=", "pgPinnedRef=")));
  assert.throws(() => checkQaPgImagePins(qaCompose, qaScript.replace('  "$pgPinnedRef" >/dev/null', "  postgres:18 >/dev/null")));
  assert.throws(() => checkQaPgImagePins(qaCompose, qaScript.replace('  "$pgPinnedRef" >/dev/null', '  "$otherImage" >/dev/null')));
  assert.throws(() => checkQaPgImagePins(qaCompose, qaScript + '\nreadonly pgPinnedRef="' + pinnedPg + '"\n'));
  const dbLaunch = qaScript.match(/^docker run -d --name "\$db"[^\n]*\\\n(?:[^\n]*\\\n)*[^\n]+$/mu)[0];
  assert.throws(() => checkQaPgImagePins(qaCompose, qaScript + "\n" + dbLaunch + "\n"));
  const pgWorkflow = root(".github/workflows/uni-p0-restore-compose-teardown.yml").toString("utf8");
  const scanRef = "pg_ref='" + pinnedPg + "'";
  const envRef = 'assert.equal(env.PG_PINNED_REF,"' + pinnedPg + '");';
  const indexRef = 'assert.equal(p.upstream_ref,"' + pinnedPg + '");';
  assert.throws(() => checkPgScanWorkflowPins(pgWorkflow.replace(scanRef, "pg_ref='postgres:18'")));
  assert.throws(() => checkPgScanWorkflowPins(pgWorkflow.replace(envRef, envRef.replace(pinnedPg, "postgres@sha256:" + "0".repeat(64)))));
  assert.throws(() => checkPgScanWorkflowPins(pgWorkflow.replace(indexRef, indexRef.replace(pinnedPg, "postgres:18"))));
  assert.throws(() => checkPgScanWorkflowPins(pgWorkflow.replace(scanRef, 'pg_ref="$OTHER_IMAGE"')));
  assert.throws(() => checkPgScanWorkflowPins(pgWorkflow.replace(indexRef, "")));
  assert.throws(() => checkPgScanWorkflowPins(pgWorkflow + "\n" + scanRef + "\n"));
  mutation(x => { delete x.file_sha256[".github/workflows/uni-p0-restore-compose-teardown.yml"]; });
  mutation(x => { x.file_sha256[".github/workflows/uni-p0-restore-compose-teardown.yml"] = "0".repeat(64); });

  const qaDockerfile = root("ops/qa/Dockerfile").toString("utf8");
  const qaBase = expected[4].repository + "@" + expected[4].digest;
  const qaComposer = expected[1].repository + "@" + expected[1].digest;
  assert.throws(() => checkQaDockerfile(qaDockerfile.replace(qaBase, "php:8.3-cli-bookworm")));
  assert.throws(() => checkQaDockerfile(qaDockerfile.replace(qaBase, "php@" + "sha256:" + "0".repeat(64))));
  assert.throws(() => checkQaDockerfile(qaDockerfile.replace(qaComposer, "composer:2")));
  assert.throws(() => checkQaDockerfile(qaDockerfile.replace(qaComposer, "composer@" + "sha256:" + "f".repeat(64))));
  mutation(x => { x.file_sha256["ops/qa/Dockerfile"] = "0".repeat(64); });
  mutation(x => { x.images[4].pinned = "php:8.3-cli-bookworm"; });
  console.log("PASS: 40 negative mutations, five immutable registry digests, both PG18 QA paths, scan/index pins and QA PHP/Composer pinned; HOLD_NO_GO.");
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
    const pinned = spec.repository + "@" + spec.digest;
    // Read only the reviewed immutable manifest. Do NOT resolve a floating tag.
    const raw = execFileSync("docker",
      ["buildx", "imagetools", "inspect", "--raw", pinned],
      {maxBuffer: 16 * 1024 * 1024, timeout: 120000});
    const digest = "sha256:" + digestOf(raw);
    assert.equal(digest, spec.digest, "registry immutable manifest differs from reviewed digest");
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
  console.log("PASS: exact commit/lock/Dockerfiles/Compose/5 registry digests; NO-GO.");
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
