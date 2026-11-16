#!/usr/bin/env node
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {inspectEditorialReview} from "./validate-editorial-review.mjs";

const root=fileURLToPath(new URL("../",import.meta.url));
const source=await readFile(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8");
const dir=await mkdtemp(join(tmpdir(),"uni-review-verification-"));
let scenarios=0;
function accepts(label,csv,check){
  const actual=inspectEditorialReview(csv,source);
  check(actual);scenarios++;
}
function rejects(label,csv){
  assert.throws(()=>inspectEditorialReview(csv,source),undefined,label);scenarios++;
}
function alter(csv,rowIndex,fieldIndex,newValue){
  const lines=csv.trimEnd().split("\n");
  assert.ok(rowIndex>0&&rowIndex<lines.length);
  const cells=lines[rowIndex].match(/"(?:[^"]|"")*"/g);
  assert.equal(cells.length,7);
  cells[fieldIndex]='"'+String(newValue).replaceAll('"','""')+'"';
  lines[rowIndex]=cells.join(",");
  return lines.join("\n")+"\n";
}
try{
  const command=spawnSync(process.execPath,[
    fileURLToPath(new URL("./build-editorial-review-pack.mjs",import.meta.url)),
    "--out",dir],{cwd:root,encoding:"utf8"});
  assert.equal(command.status,0,command.stderr||command.stdout);
  const csv=await readFile(join(dir,"revisao.csv"),"utf8");
  accepts("all 35 pending",csv,summary=>{
    assert.equal(summary.pending,35);
    assert.equal(summary.claimed_human_approved,0);
    assert.equal(summary.publishable,false);
    assert.equal(summary.release_decision,"HOLD_NO_GO");
    assert.equal(summary.review_evidence_authenticated,false);
  });
  const ref="https://github.com/rafhael100/imagine-universidade/issues/12";
  const changed=alter(alter(alter(csv,1,3,"CLAIMED_HUMAN_APPROVED"),1,4,"Revisora Editorial"),1,5,ref);
  accepts("one human review claim without operational authorization",changed,s=>{
    assert.equal(s.claimed_human_approved,1);
    assert.equal(s.pending,34);
    assert.equal(s.publishable,false);
    assert.equal(s.review_evidence_authenticated,false);
  });
  let all=csv;
  for(let i=1;i<=35;i++){
    all=alter(alter(alter(all,i,3,"CLAIMED_HUMAN_APPROVED"),i,4,"Revisor Humano"),i,5,ref);
  }
  accepts("even 35 claims do not permit production publish",all,s=>{
    assert.equal(s.claimed_human_approved,35);
    assert.equal(s.pending,0);
    assert.equal(s.publishable,false);
    assert.equal(s.release_decision,"HOLD_NO_GO");
  });
  const needs=alter(alter(alter(csv,3,3,"NEEDS_CHANGES"),3,4,"Revisora Editorial"),3,5,ref);
  accepts("needs changes is not approval",needs,s=>{
    assert.equal(s.needs_changes,1);
    assert.equal(s.claimed_human_approved,0);
  });
  const excel="\uFEFF"+csv.replaceAll('","','";"');
  accepts("Brazilian Excel CSV with semicolon and BOM",excel,s=>assert.equal(s.pending,35));
  rejects("stale content digest",alter(csv,1,2,"0".repeat(64)));
  rejects("fake unknown course",alter(csv,1,0,"fake-course"));
  rejects("duplicate lesson key",csv.replace(/^.*\n/m,"course_slug,lesson_slug,content_sha256,review_status,reviewer,evidence_ref,notes\n"));
  rejects("untrusted single-letter reviewer",alter(alter(alter(csv,1,3,"CLAIMED_HUMAN_APPROVED"),1,4,"X"),1,5,ref));
  rejects("reviewer evidence from outside repository",alter(alter(alter(csv,1,3,"CLAIMED_HUMAN_APPROVED"),1,4,"Revisora Editorial"),1,5,"https://github.com/external/repo/issues/1"));
  rejects("missing claimed reviewer",alter(alter(csv,1,3,"CLAIMED_HUMAN_APPROVED"),1,5,ref));
  rejects("unsupported signoff status",alter(csv,1,3,"APPROVED"));
  rejects("pending row with forged reviewer",alter(csv,1,4,"Some Person"));
  rejects("one missing lesson review",csv.trimEnd().split("\n").slice(0,-1).join("\n")+"\n");
  rejects("duplicated lesson review",csv+csv.trimEnd().split("\n")[1]+"\n");
  assert.equal(scenarios,15);
  console.log("PASS editorial signoff validation: "+scenarios+" scenarios, 35 hashes checked, NO_GO even if every row claims approval.");
}finally{
  await rm(dir,{recursive:true,force:true});
}
