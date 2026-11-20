#!/usr/bin/env node
/** UNI ERD-R83: 35-item coverage, stable priority and spoofed approval denial. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildHumanEditorialChecklist} from "./build-editorial-human-checklist.mjs";
import {buildEditorialReviewPriority,renderReviewPriorityMarkdown} from "./build-editorial-review-priority.mjs";

const source=JSON.parse(readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const original=buildHumanEditorialChecklist(source);
const report=buildEditorialReviewPriority(source);
const markdown=renderReviewPriorityMarkdown(report);
assert.equal(report.total_lessons,35);
assert.equal(report.human_rubric_checks,210);
assert.equal(report.release_decision,"HOLD_NO_GO");
assert.equal(report.human_review_authenticated,false);
assert.equal(report.grants_issued,0);
assert.equal(report.flagged_lessons+report.unflagged_lessons,35);
assert.equal(report.flagged_lessons,report.items.filter(x=>x.possible_risks.length>0).length);
assert.equal(new Set(report.items.map(x=>x.id)).size,35);
assert.deepEqual(new Set(report.items.map(x=>x.id)),new Set(original.lessons.map(x=>x.id)));
assert.deepEqual(report.items.map(x=>x.original_position).sort((a,b)=>a-b),
  Array.from({length:35},(_,i)=>i+1));
for(const item of report.items){
  const bound=original.lessons.find(x=>x.id===item.id);
  assert.equal(item.content_sha256,bound.content_sha256);
  assert.deepEqual(item.possible_risks,bound.possible_risks);
  assert.deepEqual(item.section_words,bound.section_words);
  assert.equal(item.review_status,"PENDING_HUMAN_REVIEW");
  assert.equal(item.authenticated_signoff,false);
}
let unflaggedEncountered=false;
let lastOriginalFlagged=0,lastOriginalUnflagged=0;
for(const item of report.items){
  if(item.possible_risks.length>0){
    assert.equal(unflaggedEncountered,false,"A flagged lesson appears after an unflagged lesson");
    assert.ok(item.original_position>lastOriginalFlagged);
    lastOriginalFlagged=item.original_position;
  }else{
    unflaggedEncountered=true;
    assert.ok(item.original_position>lastOriginalUnflagged);
    lastOriginalUnflagged=item.original_position;
  }
}
assert.equal((markdown.match(/^\| \d+ \|/gmu)||[]).length,35);
assert.ok(markdown.includes("13/13 gates NOT_VERIFIED"));
assert.ok(markdown.includes("0 aceite humano autenticado"));
assert.ok(!markdown.includes("HUMAN_SIGNOFF_VERIFIED"));
assert.ok(!markdown.includes("Acesso liberado"));
let negatives=0;
function deny(label,change){
  const modified=structuredClone(report);
  change(modified);
  assert.throws(()=>renderReviewPriorityMarkdown(modified),undefined,label);
  negatives++;
}
deny("release GO",r=>{r.release_decision="GO";});
deny("faked signoff",r=>{r.human_review_authenticated=true;});
deny("faked authority",r=>{r.approval_authority="EDITOR";});
deny("fabricated grant",r=>{r.grants_issued=1;});
deny("missing lesson",r=>{r.items.pop();});
deny("shortened rubric",r=>{r.human_rubric_checks=0;});
deny("faked per-lesson approval",r=>{r.items[0].authenticated_signoff=true;});
deny("faked review status",r=>{r.items[0].review_status="APPROVED";});
deny("fake SHA",r=>{r.items[0].content_sha256="bad";});
const poisoned=structuredClone(source);
poisoned.courses[0].lessons[0].title="Aula <img src=x> | \n *título*";
const safe=renderReviewPriorityMarkdown(buildEditorialReviewPriority(poisoned));
assert.ok(!safe.includes("<img"));
assert.ok(safe.includes("&lt;img"));
assert.ok(safe.includes("\\|"));
assert.ok(!safe.includes("\n *título*"));
const alerted=structuredClone(source);
alerted.courses[9].lessons.at(-1).body=alerted.courses[9].lessons.at(-1).body.replace(
  "\n\nEXEMPLO FICTÍCIO\n",
  " Garantimos vendas para todos os negócios.\n\nEXEMPLO FICTÍCIO\n");
const flagged=buildEditorialReviewPriority(alerted);
assert.ok(flagged.items.find(x=>x.original_position===35).possible_risks.includes("promessa-de-resultado"));
assert.ok(flagged.items.findIndex(x=>x.original_position===35)<flagged.flagged_lessons,
  "Newly flagged lesson is not at the front of triage");
assert.equal(flagged.human_review_authenticated,false);
console.log("PASS R83: 35 lessons, 210 prompts, stable flagged-first order, "+
  negatives+" negative release/signoff cases, escaped table titles, no grants.");
