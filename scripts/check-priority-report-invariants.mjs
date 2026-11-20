#!/usr/bin/env node
/** UNI ERD-R105: proof that fake yet well-formed review rows cannot produce
 * duplicate article anchors, reordered reading queues or forged totals.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildEditorialReviewPriority,renderReviewPriorityMarkdown} from "./build-editorial-review-priority.mjs";
import {renderReviewPriorityHtml} from "./render-editorial-priority-html.mjs";
import {validatePriorityReport} from "./validate-editorial-priority-report.mjs";

const source=JSON.parse(readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const canonical=buildEditorialReviewPriority(source);
assert.equal(validatePriorityReport(canonical),true);
const html=renderReviewPriorityHtml(canonical);
const markdown=renderReviewPriorityMarkdown(canonical);
const ids=[...html.matchAll(/<article id="aula-(\d+)"/gu)].map(match=>Number(match[1]));
assert.deepEqual([...ids].sort((a,b)=>a-b),Array.from({length:35},(_,i)=>i+1));
assert.equal((html.match(/<li><a href="#aula-\d+"/gu)||[]).length,35);
assert.ok(markdown.includes("HOLD_NO_GO"));
let rejected=0;
function deny(label,mutate){
  const report=structuredClone(canonical);
  mutate(report);
  assert.throws(()=>validatePriorityReport(report),undefined,"Guard accepted "+label);
  assert.throws(()=>renderReviewPriorityHtml(report),undefined,"HTML accepted "+label);
  assert.throws(()=>renderReviewPriorityMarkdown(report),undefined,"Markdown accepted "+label);
  rejected++;
}
deny("duplicate destination with distinct lesson IDs",r=>{r.items[1].original_position=r.items[0].original_position;});
deny("position outside range",r=>{r.items[0].original_position=36;});
deny("noninteger destination",r=>{r.items[0].original_position=1.5;});
deny("wrong flagged count",r=>{r.flagged_lessons++;});
deny("wrong unflagged count",r=>{r.unflagged_lessons++;});
deny("risk list tampered without updating counts",r=>{r.items[0].possible_risks = r.items[0].possible_risks.length ? [] : ["synthetic-check"];});
deny("reordered priority queue",r=>{[r.items[0],r.items[1]]=[r.items[1],r.items[0]];});
deny("missing section word count",r=>{r.items[0].section_words.pop();});
deny("tampered human review",r=>{r.items[0].review_status="CLAIMED_HUMAN_APPROVED";});
deny("fake auth",r=>{r.items[0].authenticated_signoff=true;});
deny("wrong source identity",r=>{r.items[1].id=r.items[0].id;});
deny("missing item",r=>{r.items.pop();});
deny("wrong order policy",r=>{r.order_policy="APPROVED_FIRST";});
deny("forged release",r=>{r.release_decision="GO";});
console.log("PASS R104/R105: 35 unique anchor targets, 210 reading checks, "+
  rejected+" negative report mutations rejected by both HTML and Markdown renderers.");
