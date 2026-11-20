#!/usr/bin/env node
/** UNI ERD-R144: real Node assertions and negative source/HTML mutations. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildEditorialReviewPriority} from "./build-editorial-review-priority.mjs";
import {escapeReviewText,renderEditorialFulltextHtml} from "./render-editorial-fulltext-html.mjs";
import {verifyEditorialFulltextHtml} from "./verify-editorial-fulltext-html.mjs";

const source=JSON.parse(readFileSync(
  new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const report=buildEditorialReviewPriority(source);
const html=renderEditorialFulltextHtml(source);
const result=verifyEditorialFulltextHtml(Buffer.from(html,"utf8"),source);
assert.equal(result.source_bound_lessons,35);
assert.equal(result.human_rubric_checks,210);
assert.equal(result.signoff_authenticated,false);
assert.equal(result.grants_issued,0);
assert.equal(result.release_decision,"HOLD_NO_GO");
assert.equal((html.match(/<article id="aula-\d+"/gu)||[]).length,35);
assert.equal((html.match(/<section aria-label="Texto integral da aula em rascunho">/gu)||[]).length,35);
assert.equal((html.match(/<h3>Perguntas para leitura \(não são aceite\)<\/h3>/gu)||[]).length,35);
assert.equal((html.match(/<li>Precisão factual:/gu)||[]).length,35);
assert.ok(html.includes("13/13 NOT_VERIFIED"));
assert.ok(!/<script\b/iu.test(html));
assert.ok(html.includes('Content-Security-Policy'));
assert.equal(new Set(report.items.map(row=>row.id)).size,35);

let rejected=0;
const deny=(label,bytes,expectedSource=source)=>{
  assert.throws(()=>verifyEditorialFulltextHtml(bytes,expectedSource),undefined,label);
  rejected++;
};
deny("extra approval claim",Buffer.from(html.replace("HOLD_NO_GO","GO")));
// Source-bound mutation: do not rely on a phrase from a particular lesson revision.
const firstLessonExcerpt=escapeReviewText(source.courses[0].lessons[0].body.split("\n")[0].slice(0,45));
assert.ok(firstLessonExcerpt.length>=20&&html.includes(firstLessonExcerpt),
  "First lesson excerpt must appear in the HTML before corruption test");
deny("one corrupted lesson",Buffer.from(html.replace(firstLessonExcerpt,firstLessonExcerpt+" [adulterado]")));
deny("injected remote link",Buffer.from(html.replace("</body></html>",
  '<a href="https://example.org">externo</a></body></html>')));
deny("missing source section",Buffer.from(html.replace(
  /<h3 id="secoes-aula-\d+" tabindex="-1">Texto integral para revisão \(rascunho não aprovado\)<\/h3>/u,'')));
deny("trailing bytes",Buffer.concat([Buffer.from(html),Buffer.from("X")]));
deny("UTF-8 BOM",Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),Buffer.from(html)]));
const changed=structuredClone(source);
changed.courses[0].lessons[0].body+=" Atualização sintética ainda não versionada.";
deny("obsolete source after text revision",Buffer.from(html),changed);
assert.throws(()=>renderEditorialFulltextHtml({...source,status:"published"}));
assert.throws(()=>renderEditorialFulltextHtml({...source,audience:"public"}));
const payload='</section><script>alert("x")</script>&"';
assert.equal(escapeReviewText(payload),
  "&lt;/section&gt;&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&quot;");
assert.equal(rejected,7);
console.log("PASS ERD R141-R144: 35 full draft texts, 210 questions, "+
  rejected+" source-bound negative HTML cases, UTF-8/HTML escaping, HOLD_NO_GO.");
