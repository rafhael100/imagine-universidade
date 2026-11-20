#!/usr/bin/env node
/** UNI ERD-R80: synthetic, source-bound and fail-closed regression matrix. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildHumanEditorialChecklist} from "./build-editorial-human-checklist.mjs";
import {renderHumanReviewMarkdown} from "./render-editorial-human-checklist.mjs";
import {verifyHumanHandoffArtifacts} from "./verify-editorial-human-artifacts.mjs";

const source=JSON.parse(readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const report=buildHumanEditorialChecklist(source);
const json=JSON.stringify(report,null,2)+"\n";
const markdown=renderHumanReviewMarkdown(report);
const result=verifyHumanHandoffArtifacts(json,markdown,source);
assert.deepEqual(result,{lessons:35,checks:210,
  verified:"SYNTHETIC_SOURCE_BOUND_ONLY",editorial_signoff:false,
  grants_issued:0,release_decision:"HOLD_NO_GO"});
let rejected=0;
function deny(label,changedJson=json,changedMarkdown=markdown,changedSource=source){
  assert.throws(
    ()=>verifyHumanHandoffArtifacts(changedJson,changedMarkdown,changedSource),
    undefined,label);
  rejected++;
}
function edited(change){
  const candidate=structuredClone(report);
  change(candidate);
  return JSON.stringify(candidate,null,2)+"\n";
}
deny("invented signoff",edited(r=>{r.lessons[0].authenticated_signoff=true;}));
deny("declared approval",edited(r=>{r.lessons[0].human_review="CLAIMED_HUMAN_APPROVED";}));
deny("fabricated reviewer evidence",edited(r=>{r.lessons[0].human_evidence="signed";}));
deny("release GO",edited(r=>{r.release_decision="GO";}));
deny("extra approval field",edited(r=>{r.approved_by="synthetic-runner";}));
deny("lesson body hash changed",edited(r=>{r.lessons[0].content_sha256="0".repeat(64);}));
deny("reordered lessons",edited(r=>{[r.lessons[0],r.lessons[1]]=[r.lessons[1],r.lessons[0]];}));
deny("omitted lesson",edited(r=>{r.lessons.pop();}));
deny("extra lesson",edited(r=>{r.lessons.push({...r.lessons[0],id:"fake/fake"});}));
deny("rubric rewritten",edited(r=>{r.rubric[0]="Everything is approved";}));
deny("risk flag hidden",edited(r=>{r.lessons[0].possible_risks.push("fabricated");}));
deny("section word count changed",edited(r=>{r.lessons[0].section_words[0]++;}));
deny("fake extra key with same value",
  json.replace('"release_decision": "HOLD_NO_GO",',
    '"release_decision": "HOLD_NO_GO",\n  "release_decision": "HOLD_NO_GO",'));
deny("BOM",String.fromCharCode(0xfeff)+json);
deny("noncanonical whitespace",json.replace('"schema_version": 1','"schema_version" : 1'));
deny("missing canonical newline",json.trimEnd());
deny("markdown approval inserted",json,markdown.replace(
  "SEM ACEITE / HOLD_NO_GO","REVISADO E APROVADO"));
deny("markdown extra checkbox",json,markdown+"- [x] Aprovado\n");
deny("markdown lesson title forged",json,markdown.replace(
  /^### Aula 01\/35 — .*$/mu,"### Aula 01/35 — Título alterado"));
deny("markdown content hash forged",json,markdown.replace(
  /(?<=^- SHA-256 do texto da aula: )[a-f0-9]{64}/mu,"f".repeat(64)));
deny("markdown omitted lesson",json,markdown.replace(
  /^### Aula 35\/35 — .*$/mu,""));
deny("source altered while reusing artifacts",json,markdown,(()=>{
  const altered=structuredClone(source);
  altered.courses[0].lessons[0].body+=" Alteração sintética.";
  return altered;
})());
deny("JSON exceeds limit","x".repeat(1024*1024+1));
deny("Markdown exceeds limit",json,"x".repeat(1024*1024+1));
assert.equal(rejected,24);
console.log("PASS R80: canonical JSON+Markdown, 35 source identities, 210 prompts; "+
  rejected+" synthetic tamper/forgery cases denied; no grants or release.");
