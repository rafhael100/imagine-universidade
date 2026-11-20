#!/usr/bin/env node
/** R190: every rubric returns to the same draft text, never to a different lesson. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {renderEditorialFulltextHtml} from "./render-editorial-fulltext-html.mjs";
import {verifyEditorialFulltextHtml} from "./verify-editorial-fulltext-html.mjs";
import {buildEditorialReviewPriority} from "./build-editorial-review-priority.mjs";

const source=JSON.parse(readFileSync(
  new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const report=buildEditorialReviewPriority(source);
const html=renderEditorialFulltextHtml(source);
function audit(candidate){
  const articles=[...candidate.matchAll(
    /<article id="aula-(\d+)" tabindex="-1" aria-labelledby="titulo-\d+">([\s\S]*?)<\/article>/gu
  )];
  assert.equal(articles.length,35);
  for(const [,id,body] of articles){
    assert.ok(report.items.some(x=>String(x.original_position)===id));
    const back='<a href="#secoes-aula-'+id+'">Voltar ao texto desta aula</a>';
    const index='<h3 id="secoes-aula-'+id+'" tabindex="-1">'+
      'Texto integral para revisão (rascunho não aprovado)</h3>';
    assert.equal(body.split(back).length,2,"One return after this rubric");
    assert.equal(body.split(index).length,2,"One focusable source lesson index");
    assert.ok(body.indexOf(back)>body.indexOf(
      '<h3>Perguntas para leitura (não são aceite)</h3>'));
    assert.ok(body.indexOf(back)>body.indexOf(index));
  }
  assert.equal((candidate.match(/Voltar ao texto desta aula<\/a>/gu)||[]).length,35);
  assert.ok(candidate.includes("<strong>HOLD_NO_GO · SEM ACEITE.</strong>"));
  assert.ok(candidate.includes("HOLD_NO_GO · 13/13 NOT_VERIFIED"));
  return articles.length;
}
assert.equal(audit(html),35);
const result=verifyEditorialFulltextHtml(Buffer.from(html),source);
assert.equal(result.signoff_authenticated,false);
assert.equal(result.grants_issued,0);
assert.equal(result.human_rubric_checks,210);
let denied=0;
const back='<a href="#secoes-aula-1">Voltar ao texto desta aula</a>';
for(const [name,changed] of [
  ["wrong return",html.replace(back,'<a href="#secoes-aula-99">Voltar ao texto desta aula</a>')],
  ["missing return",html.replace(back,"")],
  ["extra return",html.replace(back,back+back)],
  ["no target focus",html.replace('id="secoes-aula-1" tabindex="-1"','id="secoes-aula-1"')],
  ["fake signoff",html.replace("HOLD_NO_GO","GO")]
]){
  assert.notEqual(changed,html,"Inactive mutation: "+name);
  assert.throws(()=>audit(changed),undefined,name);
  assert.throws(()=>verifyEditorialFulltextHtml(Buffer.from(changed),source));
  denied++;
}
assert.equal(denied,5);
console.log("PASS R189-R190: 35 rubric-to-text returns, 5 rejected mutations, 210 questions, no grants.");
