#!/usr/bin/env node
/** UNI ERD-R176: 140 return links must be source-bound, unique and focusable. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildEditorialReviewPriority} from "./build-editorial-review-priority.mjs";
import {renderEditorialFulltextHtml} from "./render-editorial-fulltext-html.mjs";
import {verifyEditorialFulltextHtml} from "./verify-editorial-fulltext-html.mjs";

const source=JSON.parse(readFileSync(
  new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const priority=buildEditorialReviewPriority(source);
const html=renderEditorialFulltextHtml(source);
assert.equal(priority.items.length,35);
const headings=[...html.matchAll(
  /<h3 id="secoes-aula-(\d+)" tabindex="-1">Texto integral para revisão \(rascunho não aprovado\)<\/h3>/gu
)];
assert.equal(headings.length,35);
const seen=new Set();
let returns=0;
for(const row of priority.items){
  const id="secoes-aula-"+row.original_position;
  assert.ok(!seen.has(id),"Unique section-index heading required");
  seen.add(id);
  const h3='<h3 id="'+id+'" tabindex="-1">Texto integral para revisão (rascunho não aprovado)</h3>';
  assert.equal(html.split(h3).length,2,"Exactly one matching focusable index heading");
  const back='<a href="#'+id+'">Voltar às seções desta aula</a>';
  assert.equal(html.split(back).length,5,"Four returns inside each source lesson");
  returns+=4;
}
assert.equal(seen.size,35);
assert.equal(returns,140);
assert.equal((html.match(/Voltar às seções desta aula<\/a>/gu)||[]).length,140);
assert.equal((html.match(/<h4 id="aula-secao-/gu)||[]).length,140);
assert.equal(verifyEditorialFulltextHtml(Buffer.from(html),source).grants_issued,0);
assert.ok(html.includes("HOLD_NO_GO")&&html.includes("13/13 NOT_VERIFIED"));
let mutations=0;
for(const corrupted of [
  html.replace('href="#secoes-aula-1"','href="#secoes-aula-99"'),
  html.replace('id="secoes-aula-1"','id="secoes-aula-2"'),
  html.replace('id="secoes-aula-1" tabindex="-1"','id="secoes-aula-1"'),
  html.replace('Voltar às seções desta aula','Aula aprovada'),
  html.replace("HOLD_NO_GO","GO")
]){
  assert.throws(()=>verifyEditorialFulltextHtml(Buffer.from(corrupted),source));
  mutations++;
}
assert.equal(mutations,5);
console.log("PASS ERD R175–R176: 140 source-bound returns to 35 index headings, "+
  mutations+" denied mutations, no grants or authenticated signoff.");
