#!/usr/bin/env node
/** R181-R182: semantic and byte-bound QA for 35 rubric quick jumps. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildEditorialReviewPriority} from "./build-editorial-review-priority.mjs";
import {renderEditorialFulltextHtml} from "./render-editorial-fulltext-html.mjs";
import {verifyEditorialFulltextHtml} from "./verify-editorial-fulltext-html.mjs";

const source=JSON.parse(readFileSync(
  new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const report=buildEditorialReviewPriority(source);
const html=renderEditorialFulltextHtml(source);
const warning="Seis perguntas para leitura humana: não constituem aceite autenticado.";
const label="Ir às seis perguntas de revisão desta aula";
function audit(candidate){
  const articles=[...candidate.matchAll(
    /<article id="aula-(\d+)" tabindex="-1" aria-labelledby="titulo-\d+">([\s\S]*?)<\/article>/gu
  )];
  assert.equal(articles.length,35);
  const all=new Set();
  for(const [,number,article] of articles){
    assert.ok(report.items.some(item=>String(item.original_position)===number));
    const id="rubrica-aula-"+number;
    assert.ok(!all.has(id),"Duplicated rubric target");
    all.add(id);
    const jump='<a href="#'+id+'">'+label+'</a>';
    const target='<p id="'+id+'" tabindex="-1" class="warning">'+warning+'</p>';
    assert.equal(article.split(jump).length,2,"One matching link per lesson");
    assert.equal(article.split(target).length,2,"One focusable target per lesson");
    assert.ok(article.indexOf(jump)<article.indexOf(target),"Jump must precede rubric");
    assert.ok(article.indexOf(target)<article.indexOf(
      '<h3>Perguntas para leitura (não são aceite)</h3>'));
    assert.ok(article.indexOf('Texto integral para revisão')<article.indexOf(target));
    assert.equal((article.match(/<li>Precisão factual:/gu)||[]).length,1);
  }
  assert.equal(all.size,35);
  assert.equal((candidate.match(/id="rubrica-aula-\d+"/gu)||[]).length,35);
  assert.equal((candidate.match(/href="#rubrica-aula-\d+"/gu)||[]).length,35);
  assert.ok(candidate.includes("<strong>HOLD_NO_GO · SEM ACEITE.</strong>"),
    "Release banner must remain an explicit denial");
  assert.ok(candidate.includes("HOLD_NO_GO · 13/13 NOT_VERIFIED"));
  assert.ok(!/<script\b/iu.test(candidate));
  return all.size;
}
assert.equal(audit(html),35);
const v=verifyEditorialFulltextHtml(Buffer.from(html,"utf8"),source);
assert.equal(v.source_bound_lessons,35);
assert.equal(v.human_rubric_checks,210);
assert.equal(v.signoff_authenticated,false);
assert.equal(v.grants_issued,0);
assert.equal(v.release_decision,"HOLD_NO_GO");
let rejected=0;
for(const [name,changed] of [
  ["broken fragment",html.replace('href="#rubrica-aula-1"','href="#rubrica-aula-99"')],
  ["duplicate target",html.replace('id="rubrica-aula-1"','id="rubrica-aula-2"')],
  ["missing focus",html.replace('id="rubrica-aula-1" tabindex="-1"','id="rubrica-aula-1"')],
  ["forged approval",html.replace(warning,"As aulas estão aprovadas.")],
  ["false GO",html.replace("HOLD_NO_GO","GO")],
  ["missing content",html.replace("Texto integral para revisão","Texto indisponível")]
]){
  assert.notEqual(changed,html,"Mutation ineffective: "+name);
  assert.throws(()=>verifyEditorialFulltextHtml(Buffer.from(changed),source));
  assert.throws(()=>audit(changed));
  rejected++;
}
assert.equal(rejected,6);
console.log("PASS R180-R182: 35 rubric jumps, 210 questions, "+
  rejected+" rejected mutations, HOLD_NO_GO and 0 grants.");
