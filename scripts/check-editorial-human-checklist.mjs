#!/usr/bin/env node
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {buildHumanEditorialChecklist,humanRubric} from "./build-editorial-human-checklist.mjs";

const source=JSON.parse(readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const report=buildHumanEditorialChecklist(source);
const digest=value=>createHash("sha256").update(value,"utf8").digest("hex");
assert.equal(report.total_courses,10);
assert.equal(report.total_lessons,35);
assert.equal(report.rubric.length,6);
assert.equal(humanRubric.length,6);
assert.equal(report.source_status,"editorial_draft");
assert.equal(report.release_decision,"HOLD_NO_GO");
assert.equal(report.approval_authority,"NONE");
assert.equal(report.editorial_signoff_verified,false);
assert.equal(report.automated_assessment,"TRIAGE_ONLY");
assert.ok(Number.isInteger(report.potential_risk_flags));
const ids=new Set();
let checked=0;
for(const course of source.courses)for(const lesson of course.lessons){
  const entry=report.lessons.find(row=>row.id===course.slug+"/"+lesson.slug);
  assert.ok(entry);
  assert.equal(entry.content_sha256,digest(lesson.body));
  assert.equal(entry.human_review,"PENDING_HUMAN_REVIEW");
  assert.equal(entry.human_evidence,null);
  assert.equal(entry.authenticated_signoff,false);
  assert.equal(entry.section_words.length,4);
  assert.ok(entry.section_words.every(n=>Number.isInteger(n)&&n>0));
  assert.ok(Array.isArray(entry.possible_risks));
  assert.ok(!ids.has(entry.id),"Duplicate reviewed lesson");
  ids.add(entry.id);
  checked++;
}
assert.equal(checked,35);
assert.equal(ids.size,35);
function mutated(fn){
  const copy=JSON.parse(JSON.stringify(source));
  fn(copy.courses[0].lessons[0]);
  return buildHumanEditorialChecklist(copy);
}
const addToIntro=phrase=>l=>{
  l.body=l.body.replace("\n\nEXEMPLO FICTÍCIO\n", " "+phrase+"\n\nEXEMPLO FICTÍCIO\n");
};
const evidence=[
  ["promessa-de-resultado",addToIntro("Garantimos vendas para todos os negócios.")],
  ["pedido-de-dados-reais",addToIntro("Insira dados reais de clientes no exercício.")],
  ["disponibilidade-nao-comprovada",addToIntro("O acesso já está em produção para todos.")],
  ["introducao-extensa",addToIntro("exemplo ".repeat(230))]
];
for(const [code,change] of evidence){
  const result=mutated(change);
  assert.ok(result.lessons[0].possible_risks.includes(code),"Missing risk flag: "+code);
  assert.equal(result.editorial_signoff_verified,false,"Risk flag must never authenticate a reviewer");
  assert.equal(result.release_decision,"HOLD_NO_GO");
}
const unsafe=JSON.parse(JSON.stringify(source));
unsafe.status="published";
assert.throws(()=>buildHumanEditorialChecklist(unsafe),/Only unapproved curriculum/u);
const incomplete=JSON.parse(JSON.stringify(source));
incomplete.courses[0].lessons.pop();
assert.throws(()=>buildHumanEditorialChecklist(incomplete),/Exactly 35 unique draft lessons required/u);
console.log("PASS R74: 35 lesson SHA-256 records, 140 sections, six human rubric criteria, "+
  evidence.length+" contextual risk negatives, deny-by-default release and metadata.");
