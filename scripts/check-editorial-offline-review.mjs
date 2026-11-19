#!/usr/bin/env node
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {readFileSync,mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

const dir=mkdtempSync(join(tmpdir(),"uni-editorial-qa-"));
let checks=0;
function pass(condition,description){assert.ok(condition,description);checks++;}
try{
  const build=fileURLToPath(new URL("./build-editorial-review-pack.mjs",import.meta.url));
  const result=spawnSync(process.execPath,[build,"--out",dir],{encoding:"utf8",timeout:20000});
  pass(result.status===0,"Generate review pack: "+(result.stderr||result.stdout));
  const html=readFileSync(join(dir,"revisao-navegavel.html"),"utf8");
  const csv=readFileSync(join(dir,"revisao.csv"),"utf8");
  pass(html.includes('lang="pt-BR"')&&html.includes("NÃO É APROVAÇÃO"),"review labels");
  pass(html.includes("Visitas → Leads → Clientes")&&html.includes("35 aulas"),"full source");
  pass(html.includes("CLAIMED_HUMAN_APPROVED"),"claim is not authenticated");
  pass(html.includes("id='review-search'")&&html.includes("id='review-filter'"),
    "offline editor offers literal search and status filters");

  pass(html.includes("id='import'")&&html.includes("Importação recusada"),
    "safe CSV reimport offered and errors reported");
  pass(!html.includes("<script src=")&&!html.includes("localStorage")&&
    !html.includes("XMLHttpRequest"),"no external scripts or persistence");
  pass(html.includes("connect-src 'none'")&&html.includes("default-src 'none'"),
    "no external network via CSP");
  const script=html.match(/<script>([\s\S]*?)<\/script>/);
  const style=html.match(/<style>([\s\S]*?)<\/style>/);
  pass(Boolean(script&&style),"local JS and CSS embedded");
  for(const value of [script[1],style[1]]){
    const hash=createHash("sha256").update(value,"utf8").digest("base64");
    pass(html.includes("'sha256-"+hash+"'"),"CSP hash exact");
  }
  pass(csv.split(/\r?\n/).filter(line=>line.includes("PENDING_HUMAN_REVIEW")).length===35,
    "all 35 original review rows are pending");
  pass(Buffer.byteLength(html,"utf8")<250000,"review page is portable");
  console.log("PASS offline review QA: "+checks+" checks, 35 draft lessons, restrictive CSP");
} finally {rmSync(dir,{recursive:true,force:true});}
