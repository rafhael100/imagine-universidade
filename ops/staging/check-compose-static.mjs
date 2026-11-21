#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {checkEnvironmentRegressionCases} from "./check-compose-environment.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const compose=read("ops/staging/compose.yaml");
const php=read("ops/staging/Dockerfile.php");
const nginx=read("ops/staging/nginx.conf");
const env=read("ops/staging/.env.staging.example");
const ignore=read(".dockerignore");
const provider=read("app/Providers/AppServiceProvider.php");
assert.match(compose,/^name: imagine-universidade-staging/m);
assert.match(compose,/127\.0\.0\.1:\$\{UNI_STAGING_LOOPBACK_PORT:\?/);
assert.doesNotMatch(compose,/\b0\.0\.0\.0:|\bports:\s*\n\s*-\s*['"]?5432/i);
assert.match(compose,/university_database:\s*\n\s*internal: true/);
assert.match(compose,/DB_USERNAME: '\$\{UNI_STAGING_APP_DB_USER:\?/);
assert.match(compose,/POSTGRES_USER: '\$\{UNI_STAGING_DB_OWNER:\?/);
assert.doesNotMatch(compose,/^\s*env_file\s*:/m,"Never inject the complete interpolation file into a service");
assert.match(compose,/APP_KEY: '\$\{APP_KEY:\?/);
assert.match(compose,/APP_URL: '\$\{APP_URL:\?/);
assert.match(compose,/SESSION_COOKIE: imagine_universidade_staging_session/);
assert.match(compose,/MAIL_MAILER: array/);
assert.match(compose,/SESSION_DRIVER: database/);
assert.match(compose,/SESSION_ENCRYPT: 'true'/);
assert.match(compose,/SESSION_SECURE_COOKIE: 'true'/);
assert.match(compose,/restart: 'no'/);
assert.match(php,/USER www-data/);
assert.match(php,/composer install --no-dev/);
assert.match(php,/--no-plugins --no-autoloader/);
assert.match(nginx,/listen 8080 default_server/);
assert.match(read("ops/staging/Dockerfile.nginx"),/USER nginx\nEXPOSE 8080/);
assert.match(compose,/127\.0\.0\.1:\$\{UNI_STAGING_LOOPBACK_PORT:\?[^\n]+\}:8080/);
assert.match(compose,/web:\s*\n[\s\S]*?cap_drop: \['ALL'\]/);
assert.match(nginx,/location = \/index\.php/);
assert.ok(nginx.includes("location ~ "+String.fromCharCode(92)+".php$ { return 404; }"),"reject arbitrary PHP execution");
assert.match(nginx,/X-Robots-Tag "noindex, nofollow"/);
assert.match(env,/REPLACE_WITH_PRIVATE_LARAVEL_KEY/);
assert.match(ignore,/!ops\/staging\/Dockerfile\.php/);
assert.match(ignore,/\*\*\/\.env\.\*/);
assert.match(provider,/UnavailablePortalAuthority::class/);
assert.match(provider,/DisabledTutorGateway::class/);

const bootstrap=read("bootstrap/app.php");
// A health signal must traverse the existing Nginx -> PHP-FPM -> Laravel path,
// never a static fake 200, public port, protected learning route or external host.
function verifyPrivateHealth(composeText,nginxText,bootstrapText){
  const webBlock=composeText.match(/^  web:\n([\s\S]*?)(?=^  db:\n)/m)?.[1];
  assert.ok(webBlock,"Missing private web service");
  assert.match(webBlock,/^    healthcheck:\n      test: \['CMD-SHELL', 'wget -q -T 3 -O \/dev\/null http:\/\/127\.0\.0\.1:8080\/up'\]\n      interval: 15s\n      timeout: 5s\n      retries: 3\n      start_period: 30s$/m,
    "Staging health must probe fixed local /up with bounded time/retries");
  assert.match(webBlock,/^    ports:\n      - '127\.0\.0\.1:\$\{UNI_STAGING_LOOPBACK_PORT:[^\n]+\}:8080'$/m,
    "Staging web port must remain loopback-only");
  assert.match(bootstrapText,/health: '\/up'/,"Existing Laravel health route must remain enabled");
  assert.match(nginxText,/location = \/index\.php \{[\s\S]*?fastcgi_pass app:9000;/,
    "Health needs real PHP-FPM upstream");
  assert.doesNotMatch(nginxText,/^\s*location\s+(?:= |\^~ )?\/up\s*\{/m,
    "Never return a synthetic static response for /up");
}
verifyPrivateHealth(compose,nginx,bootstrap);

// Bound PostgreSQL health uses a real local TCP authentication + SELECT 1
// rather than pg_isready, which can report the temporary socket during initdb.
const dollar=String.fromCharCode(36), escapedDollar=dollar+dollar;
const expectedDatabaseHealth='PGPASSWORD="'+escapedDollar+'POSTGRES_PASSWORD" PGCONNECT_TIMEOUT=2 PGOPTIONS="-c statement_timeout=2000" psql -X -w -h db -p 5432 -U "'+escapedDollar+'POSTGRES_USER" -d "'+escapedDollar+'POSTGRES_DB" -v ON_ERROR_STOP=1 -tA -c "SELECT 1" 2>/dev/null | grep -qx 1';
function verifyDatabaseSqlHealth(composeText){
  const start=composeText.indexOf("\n  db:\n");
  const end=composeText.indexOf("\nnetworks:\n",start);
  assert.ok(start>=0&&end>start,"Missing private PostgreSQL service");
  const dbLines=composeText.slice(start,end).split("\n");
  const healthLines=dbLines.filter(line=>line.trimStart().startsWith("test: "));
  assert.deepEqual(healthLines,["      test: ['CMD-SHELL', '"+expectedDatabaseHealth+"']"],
    "Database must use exactly one authenticated bounded TCP SQL health command");
  for(const setting of ["      interval: 5s","      timeout: 3s","      retries: 15"]){
    assert.ok(dbLines.includes(setting),"Required bounded database health setting missing");
  }
}
verifyDatabaseSqlHealth(compose);
const badSqlHealth=[
  expectedDatabaseHealth.replace("-h db","-h example.invalid"),
  expectedDatabaseHealth.replace('-c "SELECT 1"','-c "SELECT 0"'),
  expectedDatabaseHealth.replace(escapedDollar+"POSTGRES_PASSWORD",escapedDollar+"WRONG_PASSWORD"),
  expectedDatabaseHealth.replace("PGCONNECT_TIMEOUT=2 ",""),
  expectedDatabaseHealth.replace('PGOPTIONS="-c statement_timeout=2000" ',''),
  expectedDatabaseHealth.replace('-U "'+escapedDollar+'POSTGRES_USER"','-U postgres'),
  expectedDatabaseHealth.replace("| grep -qx 1",""),
  'pg_isready -U "'+escapedDollar+'POSTGRES_USER" -d "'+escapedDollar+'POSTGRES_DB"',
];
for(const wrong of badSqlHealth){
  assert.notEqual(wrong,expectedDatabaseHealth,"Mutation must change health contract");
  assert.throws(()=>verifyDatabaseSqlHealth(compose.replace(expectedDatabaseHealth,wrong)),
    "Unsafe PostgreSQL health mutation must fail closed");
}
console.log("PASS authenticated PostgreSQL TCP readiness: eight negative mutations; no container started");

const healthMutations=[
  [compose.replace("http://127.0.0.1:8080/up","http://127.0.0.1:8080/universidade/private/app"),nginx,bootstrap],
  [compose.replace("http://127.0.0.1:8080/up","http://example.invalid:8080/up"),nginx,bootstrap],
  [compose.replace("      start_period: 30s","      start_period: 0s"),nginx,bootstrap],
  [compose.replace("    healthcheck:\n","    removed-healthcheck:\n"),nginx,bootstrap],
  [compose.replace("127.0.0.1:${UNI_STAGING_LOOPBACK_PORT","0.0.0.0:${UNI_STAGING_LOOPBACK_PORT"),nginx,bootstrap],
  [compose,nginx,bootstrap.replace("health: '/up'","health: null")],
  [compose,nginx.replace("fastcgi_pass app:9000;","fastcgi_pass app:9090;"),bootstrap],
  [compose,nginx.replace("    location / {","    location = /up { return 200; }\n    location / {"),bootstrap],
];
for(const [mutatedCompose,mutatedNginx,mutatedBootstrap] of healthMutations){
  assert.throws(()=>verifyPrivateHealth(mutatedCompose,mutatedNginx,mutatedBootstrap),
    "Unsafe health mutation must fail closed");
}
console.log("PASS private staging health: loopback Nginx/FPM/Laravel path; 8 negative mutations; no container started");

checkEnvironmentRegressionCases();
console.log("PASS staging candidate: isolated loopback-only compose, private roles, no real authority/deploy");
