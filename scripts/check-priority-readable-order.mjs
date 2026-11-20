#!/usr/bin/env node
/** UNI ERD-R117: one-to-one keyboard label and original curriculum identities. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildEditorialReviewPriority} from "./build-editorial-review-priority.mjs";
import {renderReviewPriorityHtml} from "./render-editorial-priority-html.mjs";
import {verifyReviewHandoffArtifact} from "./verify-editorial-review-handoff.mjs";

const source=JSON.parse(readFileSync(
  new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const report=buildEditorialReviewPriority(source);
const html=renderReviewPriorityHtml(report);
assert.equal(report.items.length,35);
const links=[...html.matchAll(/<li><a href="#aula-(\d+)">([^<]+)<\/a><\/li>/gu)];
const headings=[...html.matchAll(/<h2 id="titulo-(\d+)">([^<]+)<\/h2>/gu)];
assert.equal(links.length,35,"Every item has a visible, accessible index name");
assert.equal(headings.length,35,"Every item has a unique, descriptive heading");
let mismatched=0;
for(const [i,row] of report.items.entries()){
  const number=row.original_position;
  assert.equal(Number(links[i][1]),number,"Index must target original lesson");
  assert.equal(Number(headings[i][1]),number,"Heading ID must identify same lesson");
  assert.ok(links[i][2].startsWith("Fila "+(i+1)+" de 35 · aula "+
    number+" de 35 no currículo · "),"Index must state BOTH order positions");
  assert.ok(headings[i][2].startsWith("Fila "+(i+1)+" de 35 · aula "+
    number+" no currículo — "),"Screen reader heading must state both positions");
  assert.ok(html.includes('<article id="aula-'+number+
    '" tabindex="-1" aria-labelledby="titulo-'+number+'">'));
  if(number!==i+1)mismatched++;
}
assert.equal(new Set(links.map(link=>link[1])).size,35);
assert.ok(html.includes('href="#conteudo"'),"Skip/back links remain");
assert.ok(html.includes("HOLD_NO_GO")&&html.includes("13/13 NOT_VERIFIED"));
assert.equal(verifyReviewHandoffArtifact(Buffer.from(html),source,"html").lessons,35);
const poisoned=structuredClone(source);
poisoned.courses[0].lessons[0].title='Título <svg onload="alert(1)">';
const safe=renderReviewPriorityHtml(buildEditorialReviewPriority(poisoned));
assert.ok(!safe.includes("<svg onload"),"User-facing link and heading must escape tags");
assert.ok(safe.includes("&lt;svg onload=&quot;alert(1)&quot;&gt;"));
console.log("PASS R116/R117: 35 unique links/headings with separate reading and original positions; "+
  mismatched+" nonsequential priority positions observed, HTML escaped, HOLD preserved.");
