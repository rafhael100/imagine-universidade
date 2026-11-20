#!/usr/bin/env node
/** R162: ten focusable course headings, 35 return anchors, no false signoff. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {renderEditorialFulltextHtml} from "./render-editorial-fulltext-html.mjs";
import {verifyEditorialFulltextHtml} from "./verify-editorial-fulltext-html.mjs";
const source=JSON.parse(readFileSync(
  new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const html=renderEditorialFulltextHtml(source);
const headings=[...html.matchAll(/<h3 id="curriculo-curso-(\d+)" tabindex="-1">([^<]+)<\/h3>/gu)];
assert.equal(headings.length,10);
assert.deepEqual(headings.map(h=>Number(h[1])),[1,2,3,4,5,6,7,8,9,10]);
for(const [i,course] of source.courses.entries()){
  const count=(html.match(new RegExp('href="#curriculo-curso-'+(i+1)+'"','gu'))||[]).length;
  assert.equal(count,course.lessons.length,"Every course return is source-bound");
}
assert.equal((html.match(/Voltar ao índice deste curso<\/a>/gu)||[]).length,35);
assert.ok(html.includes("HOLD_NO_GO")&&html.includes("13/13 NOT_VERIFIED"));
assert.ok(!/<script\b/iu.test(html));
assert.equal(verifyEditorialFulltextHtml(Buffer.from(html),source).signoff_authenticated,false);
for(const altered of [
  html.replace('id="curriculo-curso-1" tabindex="-1"','id="curriculo-curso-1"'),
  html.replace('href="#curriculo-curso-1"','href="#curriculo-curso-99"'),
  html.replace("HOLD_NO_GO","GO"),
  html.replace('tabindex="-1"','tabindex="0"')
]){
  assert.throws(()=>verifyEditorialFulltextHtml(Buffer.from(altered),source));
}
console.log("PASS R161-R162: 10 fragment focus targets and 35 course returns; 4 denials.");
