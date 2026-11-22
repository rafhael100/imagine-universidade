#!/usr/bin/env node
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

const base={
  ...process.env, APP_ENV:"testing", APP_DEBUG:"false",
  DB_CONNECTION:"pgsql", DB_HOST:"127.0.0.1", DB_PORT:"5432",
  DB_DATABASE:"uni_ci", DB_USERNAME:"uni_ci", DB_PASSWORD:"synthetic_ci_only",
};
for (const override of ["PGHOST","PGHOSTADDR","PGPORT","PGDATABASE","PGUSER",
 "PGSERVICE","PGSERVICEFILE","PGPASSFILE","PGOPTIONS","PGSSLMODE",
 "DATABASE_URL","DB_URL","DB_SOCKET","APP_CONFIG_CACHE","DB_READ_HOST","DB_WRITE_HOST"]) {
  delete base[override];
}
const cases=[
  ["production environment",{APP_ENV:"production"}],
  ["debug enabled",{APP_DEBUG:"true"}],
  ["remote database host",{DB_HOST:"example.invalid"}],
  ["unapproved database name",{DB_DATABASE:"production"}],
  ["unapproved database role",{DB_USERNAME:"root"}],
  ["other database port",{DB_PORT:"6543"}],
  ["other database driver",{DB_CONNECTION:"sqlite"}],
  ["secret mismatch",{DB_PASSWORD:"OTHER_SECRET_DO_NOT_PRINT"}],
  ["libpq remote override",{PGHOST:"remote.invalid"}],
  ["libpq hostaddr override",{PGHOSTADDR:"203.0.113.1"}],
  ["libpq service injection",{PGSERVICE:"untrusted"}],
  ["Laravel alternate URL",{DB_URL:"postgres://external.invalid/test"}],
  ["cached config override",{APP_CONFIG_CACHE:"/tmp/config.php"}],
  ["separate read target",{DB_READ_HOST:"remote.invalid"}],
];
for (const [label,delta] of cases) {
  const output=spawnSync("php",["scripts/qa-pg-pre-migrate.php"],{
    cwd:new URL("../",import.meta.url),encoding:"utf8",env:{...base,...delta},timeout:5000
  });
  assert.ifError(output.error);
  assert.equal(output.status,2,label+": must fail before database connection");
  assert.match(output.stderr,/^HOLD QA PostgreSQL pre-migrate: /u,label);
  assert.doesNotMatch(output.stdout+output.stderr,/OTHER_SECRET_DO_NOT_PRINT|postgres:\/\/external|remote\.invalid/u,label);
}
console.log("PASS P0 pre-migrate guard: "+cases.length+" fail-closed negative scenarios; no SQL or migrations in mutation tests.");


// P0: the separate 3-container staging preflight must reject alternate
// Laravel/libpq routing BEFORE it can load Composer or run a SQL migration.
// Execute the real PHP script from STDIN, as the disposable Docker QA does.
// This is negative-only QA: it opens no connections and changes no database.
const {readFileSync} = await import("node:fs");
const stagingSource=readFileSync(new URL("./qa-staging-pg-pre-migrate.php",import.meta.url),"utf8");
const stagingBase={...base,DB_HOST:"db",DB_DATABASE:"uni_staging_ci_only",
  DB_USERNAME:"uni_ci_migration_owner",DB_PASSWORD:"FAKE_OWNER_CI_ONLY"};
const stagingOverrides=[
  ["libpq redirect",{PGHOST:"external.invalid"}],
  ["hostaddr redirect",{PGHOSTADDR:"203.0.113.99"}],
  ["Laravel database URL",{DB_URL:"postgres://external.invalid/bogus"}],
  ["database env URL",{DATABASE_URL:"postgres://external.invalid/bogus"}],
  ["Laravel cache redirect",{APP_CONFIG_CACHE:"/tmp/external-config.php"}],
  ["read replica redirect",{DB_READ_HOST:"external.invalid"}],
  ["session options",{PGOPTIONS:"-c application_name=unexpected"}],
];
for(const [label,change] of stagingOverrides){
  const output=spawnSync("php",[],{
    input:stagingSource,encoding:"utf8",env:{...stagingBase,...change},timeout:5000
  });
  assert.ifError(output.error);
  assert.equal(output.status,2,label+": preflight must fail before Laravel/SQL");
  assert.match(output.stderr,
    /HOLD synthetic PostgreSQL Laravel preflight: Untrusted PostgreSQL or Laravel connection override/u,
    label);
  assert.doesNotMatch(output.stdout+output.stderr,
    /external\.invalid|postgres:\/\/|FAKE_OWNER_CI_ONLY/u,
    label+": no DSN or credential disclosure");
}
assert.match(stagingSource,/server_version_num/u);
assert.match(stagingSource,/pg_is_in_recovery\(\)/u);
assert.match(stagingSource,/inet_server_addr\(\)/u);
assert.match(stagingSource,/\$connection\['url'\]/u);
assert.match(stagingSource,/Disposable Docker boundary not attested/u);
console.log("PASS staging PG18 pre-migration boundary: "+
  stagingOverrides.length+" negative Laravel/libpq routing cases; no SQL, Docker or migrations executed.");
