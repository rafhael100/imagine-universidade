#!/usr/bin/env node
// Standalone negative tests: no PostgreSQL, container, network or migrations.
import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdtempSync,existsSync,rmSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {resolve,join,delimiter} from "node:path";
import {tmpdir} from "node:os";

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
assert.doesNotMatch(source,/\b(?:psql|pg_dump|createdb|pg_restore|dropdb) (?:-X|-U|--if-exists)\b/u);
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


// Regression for a destructive race: preflight observed no clone, yet
// another process may create it before our createdb. Failed createdb must
// NOT let cleanup drop an unowned database. PATH stubs avoid real SQL.
const fakeDir=mkdtempSync(join(tmpdir(),"uni-restore-ownership-"));
try{
  const fakeTools={
    psql:`#!/bin/sh
# Synthetic successful path: a mutation must change ONLY the restored copy.
case "\${UNI_QA_FAIL_AT:-}" in
  dropdb|dropdb_false_success|success)
    case "$*" in
      *"UPDATE educational_lessons SET body"*) : > "$UNI_QA_TAMPER_MARKER"; exit 0 ;;
      *"CREATE TEMP TABLE qa_pg_table_hashes"*)
        case "$*" in
          *"-d uni_ci_restore"*)
            if [ -f "$UNI_QA_TAMPER_MARKER" ]; then echo data-tampered; exit 0; fi
            ;;
        esac
        ;;
    esac
    ;;
esac
case "$*" in
  *"SHOW server_version_num"*) echo 180003 ;;
  *"inet_server_addr() IS NULL"*) echo 1 ;;
  *"FROM pg_database WHERE datname"*) if [ -f "$UNI_QA_CLONE_REMAINS_MARKER" ]; then echo 1; else echo 0; fi ;;
  *"WITH parts(kind, name, def)"*) echo schema-hash ;;
  *"CREATE TEMP TABLE qa_pg_table_hashes"*) echo data-hash ;;
  *"SELECT (SELECT COUNT(*) FROM educational_courses)"*) echo '10,35,0,0' ;;
  *"SELECT md5(string_agg(slug"*) echo 0123456789abcdef0123456789abcdef ;;
  *) echo "unexpected synthetic command" >&2; exit 99 ;;
esac
`,
    pg_dump:`#!/bin/sh
out=""
while [ "$#" -gt 0 ]; do
  case "$1" in -f) shift; out="$1";; esac
  shift
done
test -n "$out" || exit 88
printf 'FAKE_NO_DATABASE' > "$out"
`,
    createdb:`#!/bin/sh
if [ "$UNI_QA_FAIL_AT" = "createdb" ]; then exit 41; fi
exit 0
`,
    pg_restore:`#!/bin/sh
if [ "$UNI_QA_FAIL_AT" = "pg_restore" ]; then exit 42; fi
exit 0
`,
    dropdb:`#!/bin/sh
printf 'DROP_WAS_CALLED' > "$UNI_QA_DROP_MARKER"
if [ "$UNI_QA_FAIL_AT" = "dropdb_false_success" ]; then
  : > "$UNI_QA_CLONE_REMAINS_MARKER"
  exit 0
fi
if [ "\${UNI_QA_FAIL_AT:-}" = "dropdb" ]; then exit 43; fi
`,
  };
  for(const [cmd,content] of Object.entries(fakeTools)){
    writeFileSync(join(fakeDir,cmd),content,{mode:0o700});
  }
  function failAt(phase,exitCode,expectDrop){
    const marker=join(fakeDir,"drop-"+phase);
    const tamper=join(fakeDir,"tamper-"+phase);
    const result=spawnSync("sh",[target],{
      cwd:root,
      env:{...safeEnv,PATH:fakeDir+delimiter+safeEnv.PATH,
        UNI_QA_FAIL_AT:phase,UNI_QA_DROP_MARKER:marker,UNI_QA_TAMPER_MARKER:tamper,
        UNI_QA_CLONE_REMAINS_MARKER:join(fakeDir,"remains-"+phase)},
      encoding:"utf8",timeout:5000,
    });
    assert.equal(result.status,exitCode,
      "fake "+phase+" should fail at expected step: "+result.stderr);
    assert.equal(existsSync(marker),expectDrop,
      "cleanup must drop ONLY the clone created by this run");
    assert.doesNotMatch(result.stderr,/FAKE_NO_DATABASE|synthetic_ci_only/u);
    if(exitCode!==0)assert.doesNotMatch(result.stdout,/PASS:/u,
      "a failed restore or cleanup must never claim success");
    if(phase==="dropdb")assert.match(result.stderr,/clone cleanup not confirmed/u);
    if(phase==="dropdb_false_success")assert.match(result.stderr,/clone still exists after cleanup/u);
    if(phase==="success")assert.match(result.stdout,/PASS: PostgreSQL18 snapshot restored/u);
  }
  failAt("createdb",41,false);
  failAt("pg_restore",42,true);
  failAt("dropdb",2,true);
  failAt("dropdb_false_success",2,true);
  failAt("success",0,true);
  console.log("PASS synthetic restore cleanup: unowned clone retained; failed restore cleaned; failed drop and false-success drop with live clone rejected; PASS only after confirmed absence. No DB connected.");
} finally{
  rmSync(fakeDir,{recursive:true,force:true});
}
