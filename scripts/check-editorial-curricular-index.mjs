#!/usr/bin/env node
/** ERD-R153: 35 deep links by course, byte-locked against false signoff. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildEditorialReviewPriority} from "./build-editorial-review-priority.mjs";
import {renderEditorialFulltextHtml,escapeReviewText} from "./render-editorial-fulltext-html.mjs";
import {verifyEditorialFulltextHtml} from "./verify-editorial-fulltext-html.mjs";

const source=JSON.parse(readFileSync(
  new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const priority=buildEditorialReviewPriority(source);
const doc=renderEditorialFulltextHtml(source);
const nav=doc.match(/<nav aria-label="Índice curricular de aulas">([\s\S]*?)<\/nav>/u);
assert.ok(nav,"Curricular navigation landmark must exist");
assert.ok(nav[1].includes("Nenhuma aula foi aprovada."));
const sections=[...nav[1].matchAll(
  /<section aria-labelledby="curriculo-curso-(\d+)"><h3 id="curriculo-curso-\d+">([^<]+)<\/h3><ol>([\s\S]*?)<\/ol><\/section>/gu)];
assert.equal(sections.length,10,"Ten course sections required");
const seen=new Set();
let validated=0;
for(const [courseIndex,course] of source.courses.entries()){
  const block=sections[courseIndex];
  assert.equal(Number(block[1]),courseIndex+1);
  assert.equal(block[2],escapeReviewText(course.title));
  const links=[...block[3].matchAll(
    /<li><a href="#aula-(\d+)">Aula (\d+) de (\d+): ([^<]*) · fila (\d+) de 35<\/a><\/li>/gu)];
  assert.equal(links.length,course.lessons.length);
  for(const [lessonIndex,lesson] of course.lessons.entries()){
    const link=links[lessonIndex];
    const identity=course.slug+"/"+lesson.slug;
    const queueIndex=priority.items.findIndex(row=>row.id===identity);
    assert.ok(queueIndex>=0);
    const row=priority.items[queueIndex];
    assert.equal(Number(link[1]),row.original_position);
    assert.equal(Number(link[2]),lessonIndex+1);
    assert.equal(Number(link[3]),course.lessons.length);
    assert.equal(link[4],escapeReviewText(lesson.title));
    assert.equal(Number(link[5]),queueIndex+1);
    assert.ok(!seen.has(link[1]),"Duplicate target in curricular index");
    seen.add(link[1]);
    assert.ok(doc.includes('<article id="aula-'+link[1]+'" tabindex="-1"'),
      "Curriculum destination must be keyboard focusable");
    validated++;
  }
}
assert.equal(validated,35);
assert.equal(seen.size,35);
assert.equal((doc.match(/<article id="aula-\d+"/gu)||[]).length,35);
assert.equal((doc.match(/<section aria-label="Texto integral da aula em rascunho">/gu)||[]).length,35);
assert.ok(doc.includes("HOLD_NO_GO")&&doc.includes("13/13 NOT_VERIFIED"));
assert.ok(!/<script\b/iu.test(doc));
assert.equal(verifyEditorialFulltextHtml(Buffer.from(doc),source).signoff_authenticated,false);
let negatives=0;
for(const mutation of [
  doc.replace('<nav aria-label="Índice curricular de aulas">','<nav aria-label="Aulas aprovadas">'),
  doc.replace('Nenhuma aula foi aprovada.','Todas as aulas foram aprovadas.'),
  doc.replace(sections[0][0],sections[0][0].replace(/#aula-\d+/u,"#aula-99")),
  doc.replace(sections[9][0],""),
  doc.replace("HOLD_NO_GO","GO"),
  doc+"<script>alert(1)</script>"
]){
  assert.throws(()=>verifyEditorialFulltextHtml(Buffer.from(mutation),source));
  negatives++;
}
assert.equal(negatives,6);
console.log("PASS ERD-R151-R153: 35 curricular deep links, 10 groups, "+negatives+
  " negative mutations, all draft-only and HOLD_NO_GO.");
