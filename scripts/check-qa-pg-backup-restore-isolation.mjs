#!/usr/bin/env node
// Standalone negative tests: no PostgreSQL, container, network or migrations.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";

const root=resolve(fileURLToPath(new URL("..", import.meta.url)));
const target="scripts/qa-pg-backup-restore.sh";
const source=readFileSync(resolve(root,target),"utf8");
const safeEnv={
  PATH:process.env.PATH??"/usr/bin:/bin",
  POSTGRES_DB:"uni_ci",
  POSTGRES_USER:"uni_ci",
  POSTGRES_PASSWORD:"synthetic_ci_only",
};
const forbidden=[
  "PGHOST","PGHOSTADDR","PGPORT","PGDATABASE","PGUSER","PGSERVICE",
  "PGSERVICEFILE","PGPASSFILE","PGPASSWORD","PGOPTIONS","PGTARGETSESSIONATTRS",
];
for(const cmd of ["psql","pg_dump","createdb","pg_restore","dropdb"]){
  assert.ok(source.includes(cmd+' -h "$pg_socket" -p "$pg_port"'),
    cmd+" must pin the in-container PostgreSQL socket and port");
}
assert.ok(source.includes("pg_socket=/var/run/postgresql"));
assert.ok(source.includes("inet_server_addr() IS NULL"));
assert.doesNotMatch(source,/\\b(?:psql|pg_dump|createdb|pg_restore|dropdb) (?:-X|-U|--if-exists)\\b/u);
function reject(env,expected){
  const result=spawnSync("sh",[target],{
    cwd:root,env,encoding:"utf8",timeout:2500,
  });
  assert.equal(result.status,2,
    "must reject before any PostgreSQL command; "+(result.error?.message||result.stderr));
  assert.match(result.stderr,expected);
  assert.doesNotMatch(result.stderr,/QA_FORBIDDEN|password=|synthetic_ci_only/u);
  assert.ok(!result.stdout,"preflight must not print database information");
}
reject({...safeEnv,POSTGRES_DB:"not_uni_ci"},/not the approved disposable database context/u);
for(const key of forbidden){
  reject({...safeEnv,[key]:"QA_FORBIDDEN"},/libpq connection override forbidden/u);
}
console.log("PASS isolated restore guard: "+(forbidden.length+1)+
  " negative executions; five PostgreSQL tools pinned to local socket; no DB calls.");
