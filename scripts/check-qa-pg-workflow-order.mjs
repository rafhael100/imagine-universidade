#!/usr/bin/env node
// P0: prevent a QA workflow from running destructive migrations before the
// existing real-Laravel + authenticated-PG18 preflight. Static test only.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const paths=[
  ".github/workflows/uni-branch-qa-isolated.yml",
  ".github/workflows/university-manual-qa.yml",
];
const preflight=/^\s+php scripts\/qa-pg-pre-migrate\.php\s*$/mu;
const ddl=/^\s+php artisan migrate(?::fresh)?\b[^\n]*$/mu;
function verify(source,path){
  const steps=source.split(/\n(?=      - name: )/u);
  const migrations=steps.filter(step=>ddl.test(step));
  assert.equal(migrations.length,1,path+": exactly one migration step expected");
  const step=migrations[0];
  assert.match(step,/set -euo pipefail/u,path+": migration step must fail on error");
  const check=preflight.exec(step);
  const migrate=ddl.exec(step);
  assert.ok(check && migrate && check.index<migrate.index,
    path+": actual preflight must precede first DDL in same fail-fast step");
  assert.equal([...source.matchAll(new RegExp(preflight.source,"gmu"))].length,1,
    path+": exactly one active preflight expected");
  assert.doesNotMatch(source.slice(0,source.indexOf(step)),ddl,
    path+": no previous migration step may bypass preflight");
  // The preflight script enforces the actual Laravel config and authenticated
  // SQL; do not pretend this static ordering test executed a database query.
}
for(const path of paths){
  const source=readFileSync(new URL("../"+path,import.meta.url),"utf8");
  verify(source,path);
  assert.throws(()=>verify(source.replace(preflight,"          echo 'skipped preflight'"),path),
    /actual preflight/,path+": omission mutation must be rejected");
  const replaced=source.replace(
    /(^\s+php scripts\/qa-pg-pre-migrate\.php\s*\n)(\s+php artisan migrate(?::fresh)?[^\n]*)/mu,
    "$2\n$1");
  assert.notEqual(replaced,source,path+": swap fixture must change input");
  assert.throws(()=>verify(replaced,path),/actual preflight/,
    path+": reversed preflight/DDL order must be rejected");
}
const preflightSource=readFileSync(new URL("./qa-pg-pre-migrate.php",import.meta.url),"utf8");
assert.match(preflightSource,/effective Laravel database configuration differs from allowlist/u);
assert.match(preflightSource,/current_database\(\)/u);
assert.match(preflightSource,/current_user/u);
assert.match(preflightSource,/server_version_num/u);
assert.match(preflightSource,/external connection or configuration override is forbidden/u);
console.log("PASS two existing QA workflows: effective config and authenticated PG18 preflight before any migrations; missing/reversed guard fixtures rejected. Static only; no SQL or DDL executed.");
