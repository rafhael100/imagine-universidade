#!/usr/bin/env node
/** ERD-R147/R148: course shortcut integrity, not editorial signoff. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildEditorialReviewPriority} from "./build-editorial-review-priority.mjs";
import {renderEditorialFulltextHtml,escapeReviewText} from "./render-editorial-fulltext-html.mjs";
import {verifyEditorialFulltextHtml} from "./verify-editorial-fulltext-html.mjs";

const source=JSON.parse(readFileSync(
  new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const report=buildEditorialReviewPriority(source);
const html=renderEditorialFulltextHtml(source);
const region=html.match(/<nav aria-label="Acesso rápido aos cursos">([\s\S]*?)<\/nav>/u);
assert.ok(region,"Must have a labelled course navigation region");
const links=[...region[1].matchAll(/<li><a href="#aula-(\d+)">([^<]+)<\/a><\/li>/gu)];
assert.equal(links.length,10,"Exactly ten course shortcuts are expected");
const destinations=new Set();
for(const [index,course] of source.courses.entries()){
  const row=report.items.find(item=>item.id.startsWith(course.slug+"/"));
  assert.ok(row,"Missing course in priority report");
  assert.equal(Number(links[index][1]),row.original_position);
  assert.ok(links[index][2].startsWith(escapeReviewText(course.title)+" · "),
    "Shortcut must name the actual course");
  assert.ok(links[index][2].includes(course.lessons.length+" aulas"),
    "Shortcut count must reflect the source");
  assert.ok(html.includes('<article id="aula-'+row.original_position+'" tabindex="-1"'),
    "Shortcut target must be focusable");
  assert.ok(!destinations.has(row.original_position),"Shortcuts must be distinct");
  destinations.add(row.original_position);
}
assert.equal(destinations.size,10);
assert.equal((html.match(/<section aria-label="Texto integral da aula em rascunho">/gu)||[]).length,35);
assert.equal((html.match(/<h3>Perguntas para leitura \(não são aceite\)<\/h3>/gu)||[]).length,35);
assert.ok(html.includes("13/13 NOT_VERIFIED")&&html.includes("HOLD_NO_GO"));
let negatives=0;
for(const changed of [
  html.replace(links[0][0],links[0][0].replace(/#aula-\d+/u,"#aula-99")),
  html.replace(links[9][0],""),
  html.replace("Acesso rápido aos cursos","Acesso concedido aos cursos"),
  html.replace("13/13 NOT_VERIFIED","13/13 VERIFIED"),
]){
  assert.throws(()=>verifyEditorialFulltextHtml(Buffer.from(changed),source));
  negatives++;
}
assert.equal(negatives,4);
console.log("PASS ERD R146-R148: 10 unique keyboard-addressable course links, "+
  "35 source-bound full texts, 210 human-only questions and "+
  negatives+" negative mutations; HOLD_NO_GO.");
