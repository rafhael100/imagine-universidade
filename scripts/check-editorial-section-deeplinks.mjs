#!/usr/bin/env node
/** UNI ERD-R166: 140 source-bound section anchors, negative mutations, HOLD_NO_GO. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildEditorialReviewPriority} from "./build-editorial-review-priority.mjs";
import {escapeReviewText,renderEditorialFulltextHtml} from "./render-editorial-fulltext-html.mjs";
import {verifyEditorialFulltextHtml} from "./verify-editorial-fulltext-html.mjs";

const source=JSON.parse(readFileSync(
  new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const priority=buildEditorialReviewPriority(source);
const html=renderEditorialFulltextHtml(source);
const expectedNames=["Contexto da aula","EXEMPLO FICTÍCIO",
  "APLICAÇÃO OPCIONAL","CUIDADO IMPORTANTE"];
const ids=new Set();
let checked=0;
for(const row of priority.items){
  const [courseSlug,lessonSlug]=row.id.split("/");
  const lesson=source.courses.find(c=>c.slug===courseSlug)
    ?.lessons.find(l=>l.slug===lessonSlug);
  assert.ok(lesson,"Source lesson must exist");
  const paragraphs=lesson.body.replace(/\r\n/gu,"\n").split(/\n\n+/u);
  assert.equal(paragraphs.length,4);
  const navLabel='aria-label="Seções desta aula: '+escapeReviewText(lesson.title)+'"';
  assert.ok(html.includes(navLabel),"Every lesson needs a named section index");
  for(let i=0;i<4;i++){
    const id="aula-secao-"+row.original_position+"-"+(i+1);
    assert.ok(!ids.has(id),"Section target repeated");
    ids.add(id);
    const anchor='<a href="#'+id+'">'+escapeReviewText(expectedNames[i])+'</a>';
    const heading='<h4 id="'+id+'" tabindex="-1">'+
      escapeReviewText(expectedNames[i])+'</h4>';
    assert.equal(html.split(anchor).length,2,"Exactly one index link per section");
    assert.equal(html.split(heading).length,2,"Exactly one focusable heading per section");
    const paragraph=i===0?paragraphs[i]:
      paragraphs[i].slice((expectedNames[i]+"\n").length);
    assert.ok(html.includes('<p>'+escapeReviewText(paragraph)
      .replace(/\n/gu,"<br>")+'</p>'),"Body text must remain complete");
    checked++;
  }
}
assert.equal(checked,140);
assert.equal(ids.size,140);
assert.equal((html.match(/<nav aria-label="Seções desta aula: /gu)||[]).length,35);
assert.equal((html.match(/<h4 id="aula-secao-/gu)||[]).length,140);
assert.equal((html.match(/<section aria-labelledby="aula-secao-/gu)||[]).length,140);
assert.equal(verifyEditorialFulltextHtml(Buffer.from(html),source).signoff_authenticated,false);
assert.ok(html.includes("HOLD_NO_GO")&&html.includes("13/13 NOT_VERIFIED"));
assert.ok(!/<script\b/iu.test(html));
let negative=0;
for(const altered of [
  html.replace('href="#aula-secao-1-1"','href="#aula-secao-99-1"'),
  html.replace('id="aula-secao-1-1"','id="aula-secao-1-2"'),
  html.replace('tabindex="-1">Contexto da aula','tabindex="0">Contexto da aula'),
  html.replace('Seções desta aula: ','Aulas aprovadas: '),
  html.replace("HOLD_NO_GO","GO"),
  html+"<script>alert(1)</script>"
]){
  assert.throws(()=>verifyEditorialFulltextHtml(Buffer.from(altered),source));
  negative++;
}
for(const label of ["EXEMPLO FICTÍCIO","APLICAÇÃO OPCIONAL","CUIDADO IMPORTANTE"]){
  const broken=structuredClone(source);
  broken.courses[0].lessons[0].body=
    broken.courses[0].lessons[0].body.replace(label,label+" alterado");
  assert.throws(()=>renderEditorialFulltextHtml(broken),
    undefined,"Unexpected pedagogical source heading must be refused");
  negative++;
}
assert.equal(negative,9);
console.log("PASS R165-R166: "+checked+" source-bound section headings and deep links, "+
  negative+" negative mutations; no authenticated signoff or grants.");
