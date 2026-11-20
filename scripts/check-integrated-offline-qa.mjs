#!/usr/bin/env node
/**
 * UNI ERD-R209-R211: a single source-bound cross-feature regression suite.
 * Synthetic/offline only. No composer, DB, browser, network, grant or deploy.
 */
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
export const groups=Object.freeze([
  Object.freeze({name:"editorial-source-and-review",scripts:Object.freeze([
    "scripts/check-editorial-human-checklist.mjs",
    "scripts/check-editorial-review-priority.mjs",
    "scripts/check-editorial-priority-html.mjs",
    "scripts/check-editorial-priority-queue-links.mjs",
    "scripts/check-editorial-fulltext-html.mjs",
    "scripts/check-editorial-navigation-manifest.mjs",
    "scripts/check-editorial-reading-transcript.mjs",
    "scripts/check-editorial-reading-map.mjs"
  ])}),
  Object.freeze({name:"accessible-navigation",scripts:Object.freeze([
    "scripts/check-editorial-fragment-graph.mjs",
    "scripts/check-editorial-curricular-index.mjs",
    "scripts/check-editorial-course-sequence.mjs",
    "scripts/check-editorial-course-return-focus.mjs",
    "scripts/check-editorial-section-returns.mjs",
    "scripts/check-editorial-rubric-jumps.mjs",
    "scripts/check-editorial-rubric-returns.mjs"
  ])}),
  Object.freeze({name:"portal-fail-closed",scripts:Object.freeze([
    "scripts/check-portal-default-deny.php",
    "scripts/check-portal-authority-negative.php",
    "scripts/check-portal-deny-reason-hygiene.php",
    "scripts/check-portal-revocation-transitions.php"
  ])}),
  Object.freeze({name:"release-gates",scripts:Object.freeze([
    "scripts/check-release-gate-policy.mjs",
    "ops/staging/check-release-gates.mjs"
  ])})
]);

export function verifyOfflineSuitePlan(plan){
  assert.ok(Array.isArray(plan)&&plan.length===4,"Four independent QA groups required");
  const names=new Set(),files=new Set();
  let count=0;
  for(const group of plan){
    assert.match(group.name,/^[a-z0-9-]+$/u);
    assert.ok(!names.has(group.name),"Duplicated test group");
    names.add(group.name);
    assert.ok(Array.isArray(group.scripts)&&group.scripts.length>0);
    for(const file of group.scripts){
      assert.match(file,/^(?:scripts\/check-[a-z0-9-]+\.(?:mjs|php)|ops\/staging\/check-release-gates\.mjs)$/u);
      assert.ok(!files.has(file),"Duplicated test execution");
      files.add(file);
      count++;
    }
  }
  assert.deepEqual([...names],[
    "editorial-source-and-review","accessible-navigation",
    "portal-fail-closed","release-gates"
  ]);
  assert.ok(count>=21,"Full editorial, Portal and gate coverage required");
  assert.equal(plan[2].scripts.length,4,"All four Portal boundaries must run");
  assert.equal(plan[3].scripts.length,2,"Both independent gate checks must run");
  assert.ok(files.has("scripts/check-editorial-reading-transcript.mjs"));
  assert.ok(files.has("scripts/check-editorial-reading-map.mjs"));
  assert.ok(files.has("scripts/check-portal-revocation-transitions.php"));
  assert.ok(files.has("ops/staging/check-release-gates.mjs"));
  return count;
}
export function verifyNoGoState(gates){
  assert.equal(gates?.schema_version,1);
  assert.equal(gates?.release_decision,"HOLD_NO_GO");
  assert.equal(gates?.source_issue,"https://github.com/rafhael100/imagine-portal/issues/886");
  const statuses=Object.values(gates.blocking_evidence??{});
  assert.equal(statuses.length,13,"Exactly 13 independent release gates required");
  assert.ok(statuses.every(g=>g?.status==="NOT_VERIFIED"&&g?.evidence_ref===null),
    "All release gates must remain NOT_VERIFIED without evidence");
  return statuses.length;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.equal(process.argv.length,2,"No overrides, URLs, credentials or environment endpoints");
  const checks=verifyOfflineSuitePlan(groups);
  const gates=JSON.parse(readFileSync(resolve(root,"ops/release-gates.json"),"utf8"));
  verifyNoGoState(gates);
  let completed=0;
  for(const group of groups){
    for(const script of group.scripts){
      const command=script.endsWith(".php")?"php":process.execPath;
      const result=spawnSync(command,[script],{
        cwd:root,encoding:"utf8",timeout:30000,maxBuffer:4*1024*1024,
        shell:false
      });
      if(result.error || result.status!==0){
        process.stderr.write("FAIL "+group.name+" / "+script+"\n");
        process.stderr.write((result.stdout??"").slice(-2000));
        process.stderr.write((result.stderr??"").slice(-2000));
        throw result.error??new Error("QA step exit="+result.status);
      }
      completed++;
      console.log("PASS "+group.name+" / "+script);
    }
  }
  assert.equal(completed,checks);
  console.log("PASS UNI R209-R211: "+completed+
    " independent synthetic checks, 4 Portal tests, 13/13 NOT_VERIFIED; HOLD_NO_GO.");
}
