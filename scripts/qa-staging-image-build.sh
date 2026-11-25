#!/usr/bin/env bash
set -euo pipefail
# Disposable GitHub Actions only. Never touch real secrets, VPS or any listener.
fail(){ printf 'HOLD image build: %s\n' "$1" >&2; exit 2; }
[[ "${CI:-}" == "true" && "${GITHUB_ACTIONS:-}" == "true" ]] || fail "CI only"
if [[ "${GITHUB_EVENT_NAME:-}" == "push" ]]; then
  [[ "${GITHUB_REPOSITORY:-}" == "rafhael100/imagine-universidade" &&
     ( "${GITHUB_REF:-}" == "refs/heads/fix/uni-c108-private-flow-2026-11-17" ||
       "${GITHUB_REF:-}" == "refs/heads/review/uni-p0-readiness-git-config-root-fence-2026-11-22" ) ]] ||
    fail "push QA only on authorized review branch"
elif [[ "${GITHUB_EVENT_NAME:-}" == "pull_request" ]]; then
  [[ "${GITHUB_REPOSITORY:-}" == "rafhael100/imagine-universidade" ]] ||
    fail "PR QA only on original repository"
else
  fail "CI event not authorized"
fi
# A context called "default" may still point to remote SSH/TCP or an
# alternate Unix socket. Check the effective endpoint before build/run/cleanup.
# Do not echo endpoint values, paths or any environment contents.
for docker_override in DOCKER_HOST DOCKER_CONTEXT DOCKER_TLS_VERIFY DOCKER_CERT_PATH; do
  [[ -z "$(printenv "$docker_override" || true)" ]] ||
    fail "Docker client endpoint override forbidden"
done
if ! docker_context_name="$(docker context show)" || [[ "$docker_context_name" != "default" ]]; then
  fail "default local Docker context required"
fi
if ! docker_endpoint="$(docker context inspect default --format '{{ (index .Endpoints "docker").Host }}')" ||
   [[ "$docker_endpoint" != "unix:///var/run/docker.sock" ]]; then
  fail "exact local Docker Unix socket required"
fi
test ! -e .env && test ! -e .env.production &&
  test ! -e ops/staging/.env.staging || fail "environment secrets in checkout"
test -f composer.lock || fail "locked dependencies required"
# Before any local Docker build, bind this run to the exact checkout and
# reject a mutable registry tag in the reviewed staging Dockerfiles/Compose.
[[ "${GITHUB_SHA:-}" =~ ^[a-f0-9]{40}$ &&
   "$(git rev-parse HEAD 2>/dev/null)" == "$GITHUB_SHA" ]] ||
  fail "Docker build source does not match exact review commit"
node ops/staging/check-image-digest-evidence.mjs --test >/dev/null ||
  fail "immutable upstream registry inputs not pinned to reviewed manifests"

tag="uni-qa-stage-${GITHUB_RUN_ID:?}-${GITHUB_RUN_ATTEMPT:?}"
docker build --file ops/staging/Dockerfile.php --tag "${tag}-php" .
docker build --file ops/staging/Dockerfile.nginx --tag "${tag}-nginx" .
# Keep immutable local image identities, not mutable QA tags, for evidence.
# These are disposable Docker image IDs, NOT registry digests or release images.
phpBuiltId="$(docker image inspect --format '{{.Id}}' "${tag}-php")" || fail "PHP build identity cannot be inspected"
nginxBuiltId="$(docker image inspect --format '{{.Id}}' "${tag}-nginx")" || fail "Nginx build identity cannot be inspected"
[[ "$phpBuiltId" =~ ^sha256:[a-f0-9]{64}$ &&
   "$nginxBuiltId" =~ ^sha256:[a-f0-9]{64}$ &&
   "$phpBuiltId" != "$nginxBuiltId" ]] || fail "invalid or ambiguous local image identities"

# No open ports, no network or access to real data.
docker run --rm --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --tmpfs /tmp \
  --tmpfs /var/www/html/storage:mode=1777 --tmpfs /var/www/html/bootstrap/cache:mode=1777 \
  --env APP_ENV=testing --env APP_DEBUG=false \
  --env APP_KEY='base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' \
  --env SESSION_DRIVER=array --env CACHE_STORE=array \
  "${tag}-php" sh -ec '
  test ! -f .env
  mkdir -p storage/logs storage/framework/sessions storage/framework/views storage/framework/cache/data
  php -r '\''foreach (["sodium","pdo_pgsql"] as $ext) {
    if (!extension_loaded($ext)) {fwrite(STDERR,"FAIL missing runtime extension: ".$ext.PHP_EOL);exit(2);}
  }'\''
  if [ ! -f vendor/autoload.php ]; then echo "FAIL no locked composer autoloader" >&2;exit 2;fi
  php artisan route:list --path=universidade/private --except-vendor > /tmp/uni-routes.txt ||
    { echo "FAIL Laravel route:list returned an error; diagnostic output:" >&2;cat /tmp/uni-routes.txt >&2;exit 2; }
  grep -Fq universidade/private /tmp/uni-routes.txt ||
    { echo "FAIL Laravel has no private route definitions" >&2;cat /tmp/uni-routes.txt >&2;exit 2; }
  echo "PASS staging PHP Laravel private route startup, no live authority"
  '
# Execute a genuine Laravel HTTP kernel with forged client headers and no
# Portal-approved server session. The smoke file stays OUTSIDE the image.
docker run --rm -i --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --tmpfs /tmp \
  --tmpfs /var/www/html/storage:mode=1777 --tmpfs /var/www/html/bootstrap/cache:mode=1777 \
  --env APP_ENV=testing --env APP_DEBUG=false \
  --env APP_KEY='base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' \
  --env SESSION_DRIVER=array --env CACHE_STORE=array \
  "${tag}-php" sh -c 'mkdir -p storage/logs storage/framework/sessions storage/framework/views storage/framework/cache/data && exec php' < scripts/qa-staging-runtime-deny.php
# Only to allow a syntax check without starting/connecting to the app.
# The fake mapping never opens a socket; Docker's network remains none.
docker run --rm --network none --add-host app:127.0.0.1 --read-only --cap-drop ALL \
  --security-opt no-new-privileges \
  --tmpfs /var/cache/nginx:mode=1777 --tmpfs /var/run:mode=1777 --tmpfs /tmp:mode=1777 \
  "${tag}-nginx" nginx -t
bash scripts/qa-staging-private-http.sh "${tag}-php" "${tag}-nginx"
bash scripts/qa-staging-postgres-http.sh "${tag}-php" "${tag}-nginx"
# Confirm the tags still identify the *same* locally built images after the
# real private HTTP, SQL and rollback probes. No registry push or tag promotion.
[[ "$(docker image inspect --format '{{.Id}}' "${tag}-php")" == "$phpBuiltId" &&
   "$(docker image inspect --format '{{.Id}}' "${tag}-nginx")" == "$nginxBuiltId" ]] ||
  fail "final disposable image tag identity changed during QA"
# Existing release workflow can retain an exact-run source-to-built-ID mapping.
# It must NEVER be mistaken for a deployable/published image digest.
if [[ "${GITHUB_EVENT_NAME:-}" == "push" &&
      "${GITHUB_REF:-}" == "refs/heads/review/uni-p0-readiness-git-config-root-fence-2026-11-22" ]]; then
  [[ "${GITHUB_SHA:-}" =~ ^[a-f0-9]{40}$ &&
     "$(git rev-parse HEAD 2>/dev/null)" == "$GITHUB_SHA" ]] ||
    fail "checked-out source SHA does not match the exact CI push"
  [[ -n "${RUNNER_TEMP:-}" && -d "$RUNNER_TEMP" ]] ||
    fail "runner-owned temporary evidence directory missing"
  # Package inventory is read from the exact built image IDs, never from
  # mutable tags. This is not a vulnerability scan, signed SBOM or release.
  umask 077
  phpPackages="$RUNNER_TEMP/uni-p0-php-os-packages.tsv"
  nginxPackages="$RUNNER_TEMP/uni-p0-nginx-os-packages.txt"
  [[ ! -e "$phpPackages" && ! -L "$phpPackages" &&
     ! -e "$nginxPackages" && ! -L "$nginxPackages" ]] ||
    fail "package inventory evidence path already exists"
  docker run --rm --pull never --network none --read-only --cap-drop ALL \
    --security-opt no-new-privileges --entrypoint dpkg-query \
    "$phpBuiltId" -W '-f=${Package}\t${Version}\t${Architecture}\n' > "$phpPackages" ||
    fail "PHP OS package inventory could not be read from built image"
  docker run --rm --pull never --network none --read-only --cap-drop ALL \
    --security-opt no-new-privileges --entrypoint apk \
    "$nginxBuiltId" info -v > "$nginxPackages" ||
    fail "Nginx OS package inventory could not be read from built image"
  [[ -s "$phpPackages" && -s "$nginxPackages" ]] ||
    fail "empty package inventory from a built image"
  # The package-name/version lists alone cannot be matched to distribution
  # advisories. Capture /etc/os-release from the exact same image IDs,
  # offline and read-only, for an AppSec reviewer to select Debian/Alpine feeds.
  phpOsRelease="$RUNNER_TEMP/uni-p0-php-os-release.txt"
  nginxOsRelease="$RUNNER_TEMP/uni-p0-nginx-os-release.txt"
  [[ ! -e "$phpOsRelease" && ! -L "$phpOsRelease" &&
     ! -e "$nginxOsRelease" && ! -L "$nginxOsRelease" ]] ||
    fail "OS release evidence path already exists"
  docker run --rm --pull never --network none --read-only --cap-drop ALL \
    --security-opt no-new-privileges --entrypoint cat \
    "$phpBuiltId" /etc/os-release > "$phpOsRelease" ||
    fail "PHP distribution identity could not be read from built image"
  docker run --rm --pull never --network none --read-only --cap-drop ALL \
    --security-opt no-new-privileges --entrypoint cat \
    "$nginxBuiltId" /etc/os-release > "$nginxOsRelease" ||
    fail "Nginx distribution identity could not be read from built image"
  [[ -s "$phpOsRelease" && -s "$nginxOsRelease" ]] ||
    fail "empty OS distribution identity"
  UNI_QA_PHP_ID="$phpBuiltId" UNI_QA_NGINX_ID="$nginxBuiltId" node --input-type=module -e '
    import assert from "node:assert/strict";
    import {readFileSync,writeFileSync} from "node:fs";
    import {createHash} from "node:crypto";
    import {isAbsolute,join} from "node:path";
    const env=process.env;
    assert.ok(isAbsolute(env.RUNNER_TEMP));
    assert.match(env.GITHUB_RUN_ID,/^[0-9]+$/u);
    assert.match(env.GITHUB_RUN_ATTEMPT,/^[0-9]+$/u);
    assert.match(env.GITHUB_SHA,/^[a-f0-9]{40}$/u);
    const id=/^sha256:[a-f0-9]{64}$/u;
    assert.match(env.UNI_QA_PHP_ID,id);
    assert.match(env.UNI_QA_NGINX_ID,id);
    assert.notEqual(env.UNI_QA_PHP_ID,env.UNI_QA_NGINX_ID);
    const readInventory=(name,format)=>{
      const bytes=readFileSync(join(env.RUNNER_TEMP,name));
      const value=bytes.toString("utf8");
      assert.ok(value.endsWith("\n") && !value.includes("\r"));
      const lines=value.trimEnd().split("\n");
      assert.ok(lines.length >= 10, "unexpectedly small OS package inventory");
      assert.equal(new Set(lines).size,lines.length,"duplicate OS package rows");
      const syntax=format==="dpkg-query" ? /^[^\s\t]+\t[^\s\t]+\t[^\s\t]+$/u : /^[^\s]+$/u;
      for(const line of lines) assert.match(line,syntax);
      return {format,rows:lines.length,sha256:createHash("sha256").update(bytes).digest("hex")};
    };
    const inventories={
      php:readInventory("uni-p0-php-os-packages.tsv","dpkg-query"),
      nginx:readInventory("uni-p0-nginx-os-packages.txt","apk-info"),
    };
    const readDistribution=(filename,expectedId)=>{
      const bytes=readFileSync(join(env.RUNNER_TEMP,filename));
      assert.ok(bytes.length > 16 && bytes.length < 4096);
      const value=bytes.toString("utf8");
      assert.ok(value.endsWith("\n") && !value.includes("\r"));
      const fields=new Map();
      for(const line of value.trimEnd().split("\n")){
        if(line.startsWith("#") || line==="") continue;
        const match=line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/u);
        assert.ok(match,"invalid OS release entry");
        assert.ok(!fields.has(match[1]),"duplicate OS release entry");
        fields.set(match[1],match[2].replace(/^"|"$/gu,""));
      }
      assert.equal(fields.get("ID"),expectedId);
      const version=fields.get("VERSION_ID");
      assert.match(version,/^[0-9][0-9A-Za-z._-]*$/u);
      return {id:expectedId,version_id:version,
        sha256:createHash("sha256").update(bytes).digest("hex")};
    };
    const distributions={
      php:readDistribution("uni-p0-php-os-release.txt","debian"),
      nginx:readDistribution("uni-p0-nginx-os-release.txt","alpine"),
    };
    const evidence={schema:2,repository:env.GITHUB_REPOSITORY,
      commit:env.GITHUB_SHA,workflow_run_id:env.GITHUB_RUN_ID,
      workflow_attempt:env.GITHUB_RUN_ATTEMPT,
      scope:"ephemeral_local_build_identity_only",
      php_image_id:env.UNI_QA_PHP_ID,nginx_image_id:env.UNI_QA_NGINX_ID,
      registry_published:false,release_image_digests_pinned:false,
      os_package_inventory:inventories,os_distribution:distributions,complete_sbom:false,
      vulnerability_assessment_completed:false,
      release_decision:"HOLD_NO_GO"};
    writeFileSync(join(env.RUNNER_TEMP,"uni-p0-local-built-image-identities.json"),
      JSON.stringify(evidence,null,2)+"\n",{flag:"wx",mode:0o600});
  ' || fail "local built-image evidence could not be recorded safely"
  echo "PASS exact-run image IDs, OS package lists and distribution versions recorded; no vulnerability scan or registry release."
fi
echo "PASS candidate staging PHP/Nginx images build locally without deploy."
