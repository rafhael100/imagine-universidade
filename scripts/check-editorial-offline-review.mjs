#!/usr/bin/env node
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {readFileSync,mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {renderOfflineReviewPage} from "./editorial-review-html.mjs";

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
  pass(html.includes("class='skip-link' href='#title'")&&
    html.includes("id='title' tabindex='-1'")&&
    html.includes(".skip-link:focus-visible"),
    "ERD-R45 keyboard skip link reaches the focusable lesson heading");
  pass(html.includes("CLAIMED_HUMAN_APPROVED"),"claim is not authenticated");
  pass(html.includes("id='next-adjustment-course'")&&
    html.includes("function hasAnotherAdjustmentInCourse()")&&
    html.includes("function jumpToNextAdjustmentInCourse()")&&
    html.includes('"NEEDS_CHANGES"'),
    "R59 adjusted-lesson navigation is course-scoped and never grants access");
  pass(html.includes('const focusedResult=holder.contains(document.activeElement)')&&
    html.includes('const focusedLessonIndex=focusedResult?.dataset.lessonIndex;')&&
    html.includes('(survivor||$("review-search")).focus();')&&
    html.includes('if(focusedResult)$("review-search").focus();'),
    "R60 changing or clearing filtered results restores keyboard focus");

  pass(html.includes("id='audit-draft'")&&
    html.includes("id='audit-first-error'")&&
    html.includes("id='audit-result' role='status' aria-live='polite'")&&
    html.includes("function auditDraft()")&&
    html.includes("function invalidateAudit()")&&
    html.includes("35 registros válidos para exportação CSV")&&
    html.includes("lastAuditErrorIndex=errors[0].index"),
    "R62 local 35-row audit, accessible summary and first-invalid navigation without signoff");
  pass(html.includes("id='audit-errors'")&&
    html.includes("className=\"audit-error\"")&&
    html.includes('button.textContent=String(error.index+1)')&&
    html.includes('list.append(button)')&&
    html.includes('list.hidden=true;'),
    "R65 all invalid records listed as keyboard buttons using only textContent");
  pass(html.includes("function focusAuditError(error)")&&
    html.includes('$(field).setAttribute("aria-invalid","true")')&&
    html.includes('auditFindings.includes(error)')&&
    html.includes('function clearAuditFieldHints()')&&
    html.includes('button.addEventListener("click",()=>focusAuditError(error))'),
    "R68 invalid field focus is tied to current audit, with stale state cleared");
  pass(html.includes('$("audit-errors").addEventListener("keydown"')&&
    html.includes('event.key==="ArrowUp"||event.key==="ArrowDown"')&&
    html.includes('event.key==="Home"||event.key==="End"')&&
    html.includes('event.key==="Escape"'),
    "R69 keyboard movement for all audit findings supports arrows, edges and Escape");
  pass(html.includes("value='merge'")&&html.includes("value='replace'"),
    "safe merge is the default and replacement is explicit");
  pass(html.includes("id='confirm-export'")&&html.includes("Confirmei que revisao.csv foi salvo"),
    "download acknowledgment requires explicit human confirmation");
  pass(html.includes("id='export-summary'") && html.includes("resumo-revisao.txt"),
    "local human handoff report does not depend on any server");

  pass(html.includes("id='review-search'")&&html.includes("id='review-filter'"),
    "offline editor offers literal search and status filters");
  pass(html.includes("lessonPickerLabel(lesson)")&&
    html.includes("option.textContent!==label")&&
    html.includes("Próxima pendente deste curso")&&
    html.includes("function jumpToNextPendingInCourse()")&&
    html.includes('id=\'next-pending-course\''),
    "R56-R57 lesson state labels and course-local pending navigation are available");
  pass(html.includes("function courseReviewCounts(slug)")&&
    html.includes("function firstActionableLesson(slug)")&&
    html.includes("declarações não verificadas")&&
    html.includes("choose(firstActionableLesson(slug))"),
    "ERD-R55 source exposes course review triage and actionable navigation");
  pass(html.includes("Situação: ")&&html.includes("Requer ajustes")&&
    html.includes("Aceite declarado (não autenticado)")&&
    html.includes("if(button.textContent!==nextLabel)button.textContent=nextLabel"),
    "ERD-R50 search results expose live non-authenticated review status without replacing focused buttons");

  pass(html.includes("id='import'")&&html.includes("Importação recusada"),
    "safe CSV reimport offered and errors reported");
  pass(html.includes("id='message' role='status' aria-live='polite' aria-atomic='true'"),
    "ERD-R48 status updates are atomic and polite by default");
  pass(html.includes('role=error?"alert":"status"')&&
    html.includes('live=error?"assertive":"polite"')&&
    html.includes('target.setAttribute("role",role)')&&
    html.includes('target.setAttribute("aria-live",live)'),
    "ERD-R48 failed CSV exports/imports are assertive without altering success messages");
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
  // C182: 35 total records cannot conceal a duplicate identity and a
  // silently missing lesson in the generated Map / reviewer draft.
  const sourcePayload=JSON.parse(readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
  const manifestHashes=JSON.parse(readFileSync(join(dir,"manifesto-revisao.json"),"utf8")).lessons;
  const duplicateSource=JSON.parse(JSON.stringify(sourcePayload));
  duplicateSource.courses[0].lessons[1]={...duplicateSource.courses[0].lessons[0]};
  assert.throws(()=>renderOfflineReviewPage(duplicateSource,manifestHashes),
    /Duplicate lesson identity in review source/u);
  checks++;
  assert.throws(()=>renderOfflineReviewPage(sourcePayload,[...manifestHashes,manifestHashes[0]]),
    /Expected exactly 35 immutable manifest records/u);
  checks++;
  pass(csv.split(/\r?\n/).filter(line=>line.includes("PENDING_HUMAN_REVIEW")).length===35,
    "all 35 original review rows are pending");
  pass(Buffer.byteLength(html,"utf8")<250000,"review page is portable");
  console.log("PASS offline review QA: "+checks+" checks, 35 draft lessons, restrictive CSP");
} finally {rmSync(dir,{recursive:true,force:true});}
