#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,writeFileSync,appendFileSync,unlinkSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
import {buildReadinessPack,requireCleanReleaseCheckout} from "./build-university-readiness-pack.mjs";

const manifest=JSON.parse(readFileSync(new URL("../ops/release-gates.json",import.meta.url),"utf8"));
const sha="a".repeat(40);
let cases=0;
const check=(label,fn)=>{fn();cases++;};
check("current manifest holds all 13 gates",()=>{
  const report=buildReadinessPack(manifest,sha);
  assert.equal(report.snapshot.gates_total,13);
  assert.equal(report.snapshot.gates_unverified,13);
  assert.equal(report.snapshot.gates_verified,0);
  assert.equal(report.snapshot.release_decision,"HOLD_NO_GO");
  assert.equal(report.snapshot.qa_status,"NOT_EVALUATED_BY_THIS_REPORT");
  assert.equal(report.snapshot.source_sha,sha);
  assert.equal(report.csv.split("\n").filter(line=>line.includes('"NOT_VERIFIED"')).length,13);
  assert.ok(report.markdown.includes("NÃO É APROVAÇÃO"));
  assert.equal(report.snapshot.gates.filter(g=>g.next_evidence.length>45).length,13);
  assert.ok(report.markdown.includes("Homologar autoridade de contrato vigente"));
  assert.ok(report.csv.startsWith("gate,titulo,area_sugerida,proxima_evidencia,status,evidencia"));
});
check("partial evidence never creates release approval",()=>{
  const input=structuredClone(manifest);
  input.blocking_evidence.dba_independent_review={
    status:"VERIFIED",evidence_ref:"https://github.com/rafhael100/imagine-universidade/issues/1"
  };
  const r=buildReadinessPack(input,sha).snapshot;
  assert.equal(r.gates_verified,1);
  assert.equal(r.gates_unverified,12);
  assert.equal(r.release_decision,"HOLD_NO_GO");
});
check("cannot mark official active contracts as verified",()=>{
  const input=structuredClone(manifest);
  input.blocking_evidence.portal_official_active_services={
    status:"VERIFIED",evidence_ref:"https://github.com/rafhael100/imagine-portal/issues/886"
  };
  assert.throws(()=>buildReadinessPack(input,sha));
});
check("cannot declare release GO",()=>{
  const input=structuredClone(manifest);
  input.release_decision="GO";
  assert.throws(()=>buildReadinessPack(input,sha));
});
check("cannot omit a gate",()=>{
  const input=structuredClone(manifest);
  delete input.blocking_evidence.production_deployment_approval;
  assert.throws(()=>buildReadinessPack(input,sha));
});
check("cannot forge source SHA",()=>{
  assert.throws(()=>buildReadinessPack(manifest,"truncated"));
});
check("clean Git source accepted, untracked and modified build inputs rejected",()=>{
  const root=mkdtempSync(join(tmpdir(),"uni-readiness-synthetic-"));
  const git=(...args)=>execFileSync("git",["-C",root,...args],{
    stdio:["ignore","pipe","pipe"],timeout:5000
  });
  try{
    git("init","-q");
    writeFileSync(join(root,"tracked.php"),"<?php // synthetic\\n");
    git("add","tracked.php");
    git("-c","user.name=Synthetic QA","-c","user.email=qa@example.invalid",
      "commit","-qm","synthetic baseline");
    assert.doesNotThrow(()=>requireCleanReleaseCheckout(root));
    const original=git("rev-parse","HEAD").toString("utf8").trim();
    writeFileSync(join(root,"untracked.php"),"<?php // unexpected synthetic input\\n");
    assert.equal(git("rev-parse","HEAD").toString("utf8").trim(),original,
      "An untracked build file does not change HEAD");
    assert.throws(()=>requireCleanReleaseCheckout(root),/tracked or untracked source drift/u);
    unlinkSync(join(root,"untracked.php"));
    appendFileSync(join(root,"tracked.php"),"// changed synthetic input\\n");
    assert.throws(()=>requireCleanReleaseCheckout(root),/tracked or untracked source drift/u);
  }finally{
    rmSync(root,{recursive:true,force:true});
  }
});
console.log("PASS readonly readiness pack: "+cases+" positive/negative scenarios; 13 operational gates remain unchanged.");
