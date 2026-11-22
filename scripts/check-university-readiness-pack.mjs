#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,appendFileSync,unlinkSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
import {buildReadinessPack,requireCleanReleaseCheckout,reviewedSourceFiles,readPinnedGitSourceBytes} from "./build-university-readiness-pack.mjs";

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
    assert.throws(()=>requireCleanReleaseCheckout(root),error=>
      error.message==="Refusing readiness package: tracked or untracked source drift"&&
      !error.message.includes("untracked.php"));
    unlinkSync(join(root,"untracked.php"));
    appendFileSync(join(root,"tracked.php"),"// changed synthetic input\\n");
    assert.throws(()=>requireCleanReleaseCheckout(root),error=>
      error.message==="Refusing readiness package: tracked or untracked source drift"&&
      !error.message.includes("tracked.php"));
  }finally{
    rmSync(root,{recursive:true,force:true});
  }
});
check("ignored Laravel PHP bootstrap cache cannot enter release provenance",()=>{
  // Synthetic Git repository exercises a Git-ignored executable build input.
  // The unchanged HEAD and clean --porcelain status previously missed it.
  const root=mkdtempSync(join(tmpdir(),"uni-readiness-ignored-cache-"));
  const git=(...args)=>execFileSync("git",["-C",root,...args],{
    stdio:["ignore","pipe","pipe"],timeout:5000,encoding:"utf8"
  });
  try{
    git("init","-q");
    mkdirSync(join(root,"bootstrap","cache"),{recursive:true});
    writeFileSync(join(root,".gitignore"),"/bootstrap/cache/*.php\n");
    writeFileSync(join(root,"bootstrap","cache",".gitkeep"),"");
    git("add",".gitignore","bootstrap/cache/.gitkeep");
    git("-c","user.name=Synthetic QA","-c","user.email=qa@example.invalid",
      "commit","-qm","synthetic baseline");
    assert.doesNotThrow(()=>requireCleanReleaseCheckout(root));
    const head=git("rev-parse","HEAD").trim();
    const cache=join(root,"bootstrap","cache","config.php");
    writeFileSync(cache,"<?php // synthetic ignored cache\n");
    assert.equal(git("rev-parse","HEAD").trim(),head);
    assert.equal(git("status","--porcelain=v1","--untracked-files=all"),"");
    assert.throws(()=>requireCleanReleaseCheckout(root),error=>
      error.message==="Refusing readiness package: ignored build-context cache files"&&
      !error.message.includes("config.php"));
    unlinkSync(cache);
    assert.doesNotThrow(()=>requireCleanReleaseCheckout(root));
  }finally{
    rmSync(root,{recursive:true,force:true});
  }
});
check("Git index hidden flags cannot mask tracked release inputs",()=>{
  const root=mkdtempSync(join(tmpdir(),"uni-readiness-hidden-index-"));
  const git=(...args)=>execFileSync("git",["-C",root,...args],{
    stdio:["ignore","pipe","pipe"],timeout:5000,encoding:"utf8"
  });
  try{
    git("init","-q");
    writeFileSync(join(root,"app.php"),"<?php // harmless synthetic source\n");
    git("add","app.php");
    git("-c","user.name=Synthetic QA","-c","user.email=qa@example.invalid",
      "commit","-qm","synthetic baseline");
    const head=git("rev-parse","HEAD").trim();
    assert.doesNotThrow(()=>requireCleanReleaseCheckout(root));
    for(const [setFlag,unsetFlag] of [
      ["--assume-unchanged","--no-assume-unchanged"],
      ["--skip-worktree","--no-skip-worktree"]
    ]){
      git("update-index",setFlag,"app.php");
      appendFileSync(join(root,"app.php"),"// hidden synthetic change\n");
      assert.equal(git("rev-parse","HEAD").trim(),head);
      assert.equal(git("status","--porcelain=v1","--untracked-files=all"),"",
        "Git status must reproduce hidden changes");
      assert.throws(()=>requireCleanReleaseCheckout(root),error=>
        error.message==="Refusing readiness package: hidden Git index flags"&&
        !error.message.includes("app.php"));
      git("update-index",unsetFlag,"app.php");
      git("checkout","--","app.php");
      assert.doesNotThrow(()=>requireCleanReleaseCheckout(root));
    }
  }finally{
    rmSync(root,{recursive:true,force:true});
  }
});
check("Git-ignored PHP inside Docker COPY source is denied",()=>{
  // Unlike bootstrap/cache, this file is hidden only by local Git excludes.
  // It remains an eligible Docker COPY app/ input, while HEAD/status are clean.
  const root=mkdtempSync(join(tmpdir(),"uni-readiness-ignored-app-"));
  const git=(...args)=>execFileSync("git",["-C",root,...args],{
    stdio:["ignore","pipe","pipe"],timeout:5000,encoding:"utf8"
  });
  try{
    git("init","-q");
    mkdirSync(join(root,"app"),{recursive:true});
    writeFileSync(join(root,"app","Tracked.php"),"<?php // tracked synthetic source\n");
    git("add","app/Tracked.php");
    git("-c","user.name=Synthetic QA","-c","user.email=qa@example.invalid",
      "commit","-qm","synthetic baseline");
    assert.doesNotThrow(()=>requireCleanReleaseCheckout(root));
    const sha=git("rev-parse","HEAD").trim();
    const hidden=join(root,"app","Hidden.php");
    writeFileSync(join(root,".git","info","exclude"),"app/Hidden.php\n");
    writeFileSync(hidden,"<?php // ignored synthetic build input\n");
    assert.equal(git("rev-parse","HEAD").trim(),sha);
    assert.equal(git("status","--porcelain=v1","--untracked-files=all"),"");
    assert.equal(git("ls-files","--others","--ignored","--exclude-standard",
      "--","app").trim(),"app/Hidden.php");
    assert.throws(()=>requireCleanReleaseCheckout(root),error=>
      error.message==="Refusing readiness package: Git-ignored build source"&&
      !error.message.includes("Hidden.php"));
    unlinkSync(hidden);
    assert.doesNotThrow(()=>requireCleanReleaseCheckout(root));
  }finally{
    rmSync(root,{recursive:true,force:true});
  }
});
check("GIT_WORK_TREE cannot redirect provenance inspection to a clean directory",()=>{
  const root=mkdtempSync(join(tmpdir(),"uni-readiness-git-route-"));
  const other=mkdtempSync(join(tmpdir(),"uni-readiness-clean-alternate-"));
  const git=(...args)=>execFileSync("git",["-C",root,...args],{
    stdio:["ignore","pipe","pipe"],timeout:5000,encoding:"utf8"
  });
  const original=process.env.GIT_WORK_TREE;
  try{
    git("init","-q");
    writeFileSync(join(root,"tracked.php"),"<?php // synthetic source\\n");
    git("add","tracked.php");
    git("-c","user.name=Synthetic QA","-c","user.email=qa@example.invalid",
      "commit","-qm","synthetic baseline");
    writeFileSync(join(other,"tracked.php"),"<?php // synthetic source\\n");
    writeFileSync(join(root,"injected.php"),"<?php // untracked build input\\n");
    const head=git("rev-parse","HEAD").trim();
    assert.ok(git("status","--porcelain=v1","--untracked-files=all").includes("injected.php"),
      "Normal Git inspection must notice the untracked build input");
    process.env.GIT_WORK_TREE=other;
    assert.equal(git("rev-parse","HEAD").trim(),head,
      "Git HEAD remains the same under a redirected worktree");
    assert.equal(git("status","--porcelain=v1","--untracked-files=all"),"",
      "Reproduce old bug: a redirected worktree reports clean");
    assert.throws(()=>requireCleanReleaseCheckout(root),error=>
      error.message==="Refusing readiness package: untrusted Git routing environment"&&
      !error.message.includes("injected.php")&&!error.message.includes(other));
  }finally{
    if(original===undefined)delete process.env.GIT_WORK_TREE;
    else process.env.GIT_WORK_TREE=original;
    rmSync(root,{recursive:true,force:true});
    rmSync(other,{recursive:true,force:true});
  }
});
check("Git configuration/index overrides are rejected without disclosing values",()=>{
  const root=mkdtempSync(join(tmpdir(),"uni-readiness-env-overrides-"));
  const git=(...args)=>execFileSync("git",["-C",root,...args],{
    stdio:["ignore","pipe","pipe"],timeout:5000
  });
  try{
    git("init","-q");
    writeFileSync(join(root,"tracked.php"),"<?php // baseline\\n");
    git("add","tracked.php");
    git("-c","user.name=Synthetic QA","-c","user.email=qa@example.invalid",
      "commit","-qm","synthetic baseline");
    assert.doesNotThrow(()=>requireCleanReleaseCheckout(root));
    for(const [key,value] of [
      ["GIT_INDEX_FILE",join(root,"hidden-index")],
      ["GIT_DIR",join(root,".git")],
      ["GIT_CONFIG_COUNT","0"],
      ["GIT_CONFIG_KEY_0","core.worktree"],
      ["GIT_CONFIG_VALUE_0","untrusted-synthetic-path"],
      ["GIT_CONFIG_GLOBAL",join(root,"synthetic-gitconfig")]
    ]){
      const previous=process.env[key];
      try{
        process.env[key]=value;
        assert.throws(()=>requireCleanReleaseCheckout(root),error=>
          error.message==="Refusing readiness package: untrusted Git routing environment"&&
          !error.message.includes(value));
      }finally{
        if(previous===undefined)delete process.env[key];
        else process.env[key]=previous;
      }
    }
    assert.doesNotThrow(()=>requireCleanReleaseCheckout(root));
  }finally{
    rmSync(root,{recursive:true,force:true});
  }
});
check("source provenance includes reviewed Docker context and executable image inputs",()=>{
  assert.deepEqual([...reviewedSourceFiles],[
    ".dockerignore","composer.json","composer.lock","ops/release-gates.json",
    "ops/staging/compose.yaml","ops/staging/Dockerfile.php",
    "ops/staging/Dockerfile.nginx","ops/staging/nginx.conf","ops/qa/Dockerfile"
  ]);
  assert.equal(new Set(reviewedSourceFiles).size,reviewedSourceFiles.length,
    "No duplicate source hash keys");
  for(const name of reviewedSourceFiles){
    const local=readFileSync(new URL("../"+name,import.meta.url));
    assert.ok(local.length>0,"Reviewed source must exist and be non-empty: "+name);
  }
});
check("pinned blob check detects local Docker context changes even at the same HEAD",()=>{
  const root=mkdtempSync(join(tmpdir(),"uni-readiness-pinned-git-source-"));
  const git=(...args)=>execFileSync("git",["-C",root,...args],{
    stdio:["ignore","pipe","pipe"],timeout:5000,encoding:"utf8"
  });
  try{
    git("init","-q");
    writeFileSync(join(root,".dockerignore"),"**\n!composer.json\n");
    writeFileSync(join(root,"composer.json"),'{"name":"qa/synthetic"}\n');
    git("add",".dockerignore","composer.json");
    git("-c","user.name=Synthetic QA","-c","user.email=qa@example.invalid",
      "commit","-qm","synthetic inputs");
    const head=git("rev-parse","HEAD").trim();
    const names=[".dockerignore","composer.json"];
    const pinned=readPinnedGitSourceBytes(root,head,names);
    assert.equal(pinned.size,2);
    assert.ok(pinned.get(".dockerignore").equals(readFileSync(join(root,".dockerignore"))));
    writeFileSync(join(root,".dockerignore"),"**\n!composer.json\n!**/.env\n");
    assert.equal(git("rev-parse","HEAD").trim(),head,
      "A changed Docker context filter cannot change HEAD");
    assert.throws(()=>readPinnedGitSourceBytes(root,head,names),
      /Source file differs from exact checked-out Git commit: .dockerignore/u);
    git("checkout","--",".dockerignore");
    assert.doesNotThrow(()=>readPinnedGitSourceBytes(root,head,names));
  }finally{
    rmSync(root,{recursive:true,force:true});
  }
});
check("Docker context excludes ignored bootstrap PHP cache",()=>{
  const ignore=readFileSync(new URL("../.dockerignore",import.meta.url),"utf8");
  assert.equal(ignore.trimEnd().split("\n").at(-1),"bootstrap/cache/*.php");
});
console.log("PASS readonly readiness pack: "+cases+" positive/negative scenarios; 13 operational gates remain unchanged.");
