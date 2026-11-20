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
