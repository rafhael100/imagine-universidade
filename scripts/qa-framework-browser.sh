#!/usr/bin/env bash
# C-117: real Laravel/browser journey in disposable GitHub Actions only.
set -euo pipefail
umask 077

hold() { printf 'HOLD framework-browser: %s\n' "$1" >&2; exit 2; }

[[ "${CI:-}" == true && "${GITHUB_ACTIONS:-}" == true \
  && "${GITHUB_REPOSITORY:-}" == rafhael100/imagine-universidade \
  && "${UNI_FRAMEWORK_BROWSER_LAB:-}" == synthetic ]] \
  || hold 'explicit synthetic GitHub Actions repository context required.'
if [[ "${GITHUB_EVENT_NAME:-}" == push ]]; then
  [[ "${GITHUB_REF:-}" == refs/heads/fix/uni-c108-private-flow-2026-11-17 ]] \
    || hold 'only the isolated QA branch is allowed.'
elif [[ "${GITHUB_EVENT_NAME:-}" != pull_request ]]; then
  hold 'unsupported CI event.'
fi

for command_name in php node realpath mktemp timeout; do
  command -v "$command_name" >/dev/null || hold 'a required locked CI runtime is missing.'
done
framework_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd -- "$framework_root"
for operational_file in .env .env.production .env.synthetic-framework-browser ops/staging/.env.staging; do
  [[ ! -e "$operational_file" && ! -L "$operational_file" ]] \
    || hold 'operational environment files are prohibited.'
done
[[ -f composer.lock && -f vendor/autoload.php \
  && -f tests/Browser/router.php && -f tests/Browser/bootstrap.php \
  && -f scripts/qa-framework-browser.cjs ]] \
  || hold 'locked framework installation and laboratory files required.'
[[ -n "${RUNNER_TEMP:-}" && -d "$RUNNER_TEMP" ]] \
  || hold 'an existing RUNNER_TEMP directory is required.'
framework_runner="$(realpath -e -- "$RUNNER_TEMP")"
framework_evidence="$framework_runner/uni-framework-browser-evidence"
[[ "${UNI_FRAMEWORK_BROWSER_EVIDENCE:-}" == "$framework_evidence" \
  && ! -L "$framework_evidence" ]] \
  || hold 'evidence must use its separate canonical RUNNER_TEMP directory.'
mkdir -p -- "$framework_evidence"
[[ -d "$framework_evidence" && "$(realpath -e -- "$framework_evidence")" == "$framework_evidence" ]] \
  || hold 'the evidence directory must not resolve elsewhere.'
shopt -s nullglob dotglob
framework_previous_evidence=("$framework_evidence"/*)
shopt -u nullglob dotglob
[[ ${#framework_previous_evidence[@]} == 0 ]] \
  || hold 'evidence destination must be empty to avoid reusing a prior result.'

framework_directory=''
framework_server_pid=''
cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if [[ -n "$framework_server_pid" ]]; then
    kill "$framework_server_pid" 2>/dev/null || true
    wait "$framework_server_pid" 2>/dev/null || true
  fi
  # Only the exact directory created below belongs to this invocation.
  if [[ -n "$framework_directory" && -d "$framework_directory" \
    && ! -L "$framework_directory" && "${framework_directory%/*}" == "$framework_runner" \
    && "${framework_directory##*/}" =~ ^uni-framework-browser\.[A-Za-z0-9]{6,16}$ ]]; then
    rm -rf -- "$framework_directory"
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

framework_directory="$(mktemp -d "$framework_runner/uni-framework-browser.XXXXXX")"
export UNI_FRAMEWORK_BROWSER_DIR="$framework_directory"
export UNI_FRAMEWORK_BROWSER_EVIDENCE="$framework_evidence"
export UNI_FRAMEWORK_BROWSER_CONTROL="$framework_directory/authority.json"
export DB_DATABASE="$framework_directory/database.sqlite"
: > "$DB_DATABASE"
printf '%s\n' '{"schema_version":1,"editor":true,"student-a":true,"student-b":true}' \
  > "$UNI_FRAMEWORK_BROWSER_CONTROL"
mkdir -p -- "$framework_directory/cache" "$framework_directory/storage/framework/views" \
  "$framework_directory/storage/framework/sessions" "$framework_directory/storage/framework/cache/data" \
  "$framework_directory/storage/logs"

# Clear only connection/runtime overrides; all mutable Laravel paths below
# belong to this unique private directory, never a checkout or staging DB.
unset DB_URL DATABASE_URL SESSION_CONNECTION SESSION_STORE SESSION_DOMAIN
unset PHP_CLI_SERVER_WORKERS APP_RUNNING_IN_CONSOLE
export APP_ENV=synthetic-framework-browser APP_DEBUG=false
export DB_CONNECTION=sqlite DB_FOREIGN_KEYS=true
export SESSION_DRIVER=database SESSION_TABLE=sessions SESSION_ENCRYPT=true
export SESSION_SECURE_COOKIE=false SESSION_HTTP_ONLY=true SESSION_SAME_SITE=lax
export SESSION_COOKIE=uni_framework_browser_session
export CACHE_STORE=array QUEUE_CONNECTION=sync LOG_CHANNEL=stderr
export VIEW_COMPILED_PATH="$framework_directory/storage/framework/views"
export APP_CONFIG_CACHE="$framework_directory/cache/config.php"
export APP_SERVICES_CACHE="$framework_directory/cache/services.php"
export APP_PACKAGES_CACHE="$framework_directory/cache/packages.php"
export APP_ROUTES_CACHE="$framework_directory/cache/routes.php"
export APP_EVENTS_CACHE="$framework_directory/cache/events.php"
export APP_KEY="base64:$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64"))')"
export UNI_FRAMEWORK_BROWSER_TOKEN="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))')"
framework_port="$(node <<'NODE'
const net = require('node:net');
const server = net.createServer();
server.on('error', () => { process.exitCode = 2; });
server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  server.close(() => process.stdout.write(String(port)));
});
NODE
)"
[[ "$framework_port" =~ ^[1-9][0-9]{3,4}$ \
  && "$framework_port" -ge 1024 && "$framework_port" -le 65535 ]] \
  || hold 'could not select a local ephemeral HTTP port.'
export UNI_FRAMEWORK_BROWSER_BASE_URL="http://127.0.0.1:$framework_port"
export APP_URL="$UNI_FRAMEWORK_BROWSER_BASE_URL"

safe_bootstrap_diagnostic() {
  # Export only a final exact-shape JSON diagnostic, never raw PHP output.
  node - "$1" <<'NODE'
const fs = require('node:fs');
const stages = new Set(['guard', 'input', 'autoloader', 'application', 'framework_bootstrap',
  'configuration', 'lab_provider', 'http_request', 'http_termination', 'migrations',
  'editorial_setup', 'persistence_verify', 'persistence_report', 'unknown_stage']);
let diagnostic;
try {
  const fd = fs.openSync(process.argv[2], 'r');
  try {
    const size = fs.fstatSync(fd).size, length = Math.min(size, 16384);
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, size - length);
    for (const line of buffer.toString('utf8').trim().split(/\r?\n/).reverse()) {
      let candidate;
      try { candidate = JSON.parse(line); } catch { continue; }
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)
        && JSON.stringify(Object.keys(candidate).sort()) === '["error","stage","type"]'
        && candidate.error === 'lab_bootstrap_failed' && stages.has(candidate.stage)
        && typeof candidate.type === 'string' && candidate.type.length <= 150
        && /^[A-Za-z_\\][A-Za-z0-9_\\]*$/.test(candidate.type)) {
        diagnostic = candidate;
        break;
      }
    }
  } finally { fs.closeSync(fd); }
} catch { /* A missing diagnostic must never expose the underlying log. */ }
console.error(diagnostic
  ? `HOLD framework-browser diagnostic: stage=${diagnostic.stage} type=${diagnostic.type}`
  : 'HOLD framework-browser diagnostic: unavailable');
NODE
}

php -r 'exit(PHP_VERSION_ID >= 80300 && PHP_VERSION_ID < 80400 ? 0 : 2);' \
  || hold 'the laboratory requires the workflow-pinned PHP 8.3 runtime.'
printf '%s\n' 'RUN framework-browser: isolated Laravel setup.'
if ! timeout --signal=TERM --kill-after=5s 60s php tests/Browser/bootstrap.php setup > "$framework_directory/setup.log" 2>&1; then
  safe_bootstrap_diagnostic "$framework_directory/setup.log" || true
  hold 'isolated Laravel migrations/setup failed; private runtime logs are not exported.'
fi
printf '%s\n' 'PASS framework-browser setup: real migrations, isolated SQLite and editorial organization only.'

php -S "127.0.0.1:$framework_port" -t public tests/Browser/router.php \
  > "$framework_directory/php-server.log" 2>&1 &
framework_server_pid=$!
# The Node runner waits for health and checks SHA256 of the ephemeral token,
# so a port collision cannot silently select a different HTTP process.
printf '%s\n' 'RUN framework-browser: real HTTP journey.'
timeout --signal=TERM --kill-after=5s 180s node scripts/qa-framework-browser.cjs
kill -0 "$framework_server_pid" 2>/dev/null \
  || hold 'the owned PHP server stopped before final persistence verification.'
printf '%s\n' 'RUN framework-browser: persistence verification.'
if ! timeout --signal=TERM --kill-after=5s 30s php tests/Browser/bootstrap.php verify > "$framework_directory/verify.log" 2>&1; then
  safe_bootstrap_diagnostic "$framework_directory/verify.log" || true
  hold 'real SQLite/session verification failed; private runtime logs are not exported.'
fi
printf '%s\n' 'PASS framework-browser persistence: database sessions and learning records verified; runtime stays deny-all.'
printf '%s\n' 'PASS C-117: synthetic identities only, real framework journey; operational release remains HOLD_NO_GO.'
