#!/usr/bin/env node
/** UNI ERD-R86: static accessible document and negative release tests. */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {buildEditorialReviewPriority} from "./build-editorial-review-priority.mjs";
import {renderReviewPriorityHtml} from "./render-editorial-priority-html.mjs";

const source=JSON.parse(readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const report=buildEditorialReviewPriority(source);
const html=renderReviewPriorityHtml(report);
assert.match(html,/<!doctype html>/iu);
assert.ok(html.includes('<html lang="pt-BR">'));
assert.ok(html.includes('href="#conteudo"'));
assert.ok(html.includes('id="conteudo" tabindex="-1"'));
assert.ok(html.includes('aria-label="Índice de aulas"'));
assert.ok(html.includes('<section aria-label="Conferência integral das aulas">'));
assert.equal((html.match(/<article id="aula-\d+"/gu)||[]).length,35);
assert.equal((html.match(/<h2 id="titulo-\d+"/gu)||[]).length,35);
assert.equal((html.match(/<h3>Perguntas para leitura/gu)||[]).length,35);
assert.equal((html.match(/<dt>SHA-256 fonte<\/dt>/gu)||[]).length,35);
assert.equal((html.match(/<dt>Estado<\/dt>/gu)||[]).length,35);
assert.equal((html.match(/<li>Precisão factual: /gu)||[]).length,35);
assert.equal((html.match(/<li>Produto Imagine: /gu)||[]).length,35);
assert.ok(!html.includes("<script"));
assert.ok(!html.includes('src="http'));
assert.ok(!html.includes("localStorage"));
assert.ok(html.includes("default-src &#39;none&#39;"));
assert.ok(html.includes("connect-src &#39;none&#39;"));
const style=html.match(/<style>([\s\S]*?)<\/style>/u);
assert.ok(style);
const expectedHash=createHash("sha256").update(style[1],"utf8").digest("base64");
assert.ok(html.includes("sha256-"+expectedHash),"The CSP must hash the exact style bytes");
const indexes=[...html.matchAll(/<article id="aula-(\d+)"/gu)].map(m=>Number(m[1]));
assert.equal(new Set(indexes).size,35);
assert.deepEqual([...indexes].sort((a,b)=>a-b),Array.from({length:35},(_,i)=>i+1));
for(const idx of indexes){
  assert.ok(html.includes('href="#aula-'+idx+'"'));
  assert.ok(html.includes('id="titulo-'+idx+'"'));
}
let rejected=0;
function deny(label,change){
  const fake=structuredClone(report);
  change(fake);
  assert.throws(()=>renderReviewPriorityHtml(fake),undefined,label);
  rejected++;
}
deny("fake GO",r=>{r.release_decision="GO";});
deny("fake signoff",r=>{r.human_review_authenticated=true;});
deny("fake Portal authority",r=>{r.approval_authority="real";});
deny("fake grant",r=>{r.grants_issued=1;});
deny("missing course",r=>{r.items.pop();});
deny("duplicated lesson",r=>{r.items[1].id=r.items[0].id;});
deny("fake human approval",r=>{r.items[0].authenticated_signoff=true;});
deny("fake accepted state",r=>{r.items[0].review_status="APPROVED";});
deny("invalid SHA",r=>{r.items[0].content_sha256="deadbeef";});
const injected=structuredClone(source);
injected.courses[0].lessons[0].title='Aula <svg onload="alert(1)"> & "título"';
const escapedHtml=renderReviewPriorityHtml(buildEditorialReviewPriority(injected));
assert.ok(!escapedHtml.includes("<svg onload"));
assert.ok(escapedHtml.includes("&lt;svg onload=&quot;alert(1)&quot;&gt;"));
assert.ok(escapedHtml.includes("&amp; &quot;título&quot;"));
console.log("PASS R86: 35 accessible lesson sections, 210 reading prompts, "+
  rejected+" denied fraudulent-signoff scenarios, escaped titles and CSP hash.");
