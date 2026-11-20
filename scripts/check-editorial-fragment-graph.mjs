#!/usr/bin/env node
/**
 * ERD R185–R186: independent referential-integrity audit of the full 35-lesson
 * offline reader. Every native fragment link must have exactly one focusable
 * target. Not an approval, authentication or active-service oracle.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {renderEditorialFulltextHtml} from "./render-editorial-fulltext-html.mjs";
import {verifyEditorialFulltextHtml} from "./verify-editorial-fulltext-html.mjs";

const source=JSON.parse(readFileSync(
  new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const html=renderEditorialFulltextHtml(source);

function auditFragmentGraph(candidate){
  const targets=new Map();
  const links=[];
  for(const found of candidate.matchAll(/<([a-z][a-z0-9]*)\b([^<>]*?)>/giu)){
    const tag=found[1].toLowerCase(),attrs=found[2];
    const id=attrs.match(/\sid="([^"]+)"/u);
    const href=attrs.match(/\shref="([^"]+)"/u);
    if(id){
      const value=id[1];
      assert.match(value,/^[a-z0-9-]+$/u,"Unsafe or undecodable id");
      assert.ok(!targets.has(value),"Repeated HTML id: "+value);
      targets.set(value,{tag,attrs});
    }
    if(href){
      assert.match(href[1],/^#[a-z0-9-]+$/u,"Only local fragments are allowed");
      links.push(href[1].slice(1));
    }
  }
  assert.ok(targets.size>=290,"Expected all 35 lesson and rubric targets");
  assert.ok(links.length>=550,"Expected complete navigation graph");
  for(const id of links){
    const found=targets.get(id);
    assert.ok(found,"Missing navigation destination: "+id);
    assert.ok(["main","article","h3","h4","p"].includes(found.tag),
      "Unexpected navigation destination semantics: "+found.tag);
    assert.ok(/\stabindex="-1"/u.test(found.attrs),
      "Native fragment destination must be focusable: "+id);
  }
  assert.ok(candidate.includes("<strong>HOLD_NO_GO · SEM ACEITE.</strong>"));
  assert.ok(candidate.includes("HOLD_NO_GO · 13/13 NOT_VERIFIED"));
  assert.ok(!/<script\b/iu.test(candidate));
  return Object.freeze({targets:targets.size,links:links.length,
    unique_link_destinations:new Set(links).size});
}
const counts=auditFragmentGraph(html);
const v=verifyEditorialFulltextHtml(Buffer.from(html,"utf8"),source);
assert.equal(v.source_bound_lessons,35);
assert.equal(v.human_rubric_checks,210);
assert.equal(v.signoff_authenticated,false);
assert.equal(v.grants_issued,0);
assert.equal(v.release_decision,"HOLD_NO_GO");
let denied=0;
for(const [label,changed] of [
  ["dangling rubric jump",html.replace('href="#rubrica-aula-1"','href="#missing-999"')],
  ["duplicate ID",html.replace('id="rubrica-aula-1"','id="rubrica-aula-2"')],
  ["unfocusable target",html.replace('id="rubrica-aula-1" tabindex="-1"','id="rubrica-aula-1"')],
  ["remote navigation",html.replace('href="#rubrica-aula-1"','href="https://example.test"')],
  ["unsafe ID",html.replace('id="rubrica-aula-1"','id="invalid/id"')],
  ["empty fragment",html.replace('href="#rubrica-aula-1"','href="#"')],
  ["link to unfocusable heading",html.replace('href="#rubrica-aula-1"','href="#titulo-1"')],
  ["false GO",html.replace("HOLD_NO_GO","GO")]
]){
  assert.notEqual(changed,html,"Ineffective negative case: "+label);
  assert.throws(()=>auditFragmentGraph(changed),undefined,label);
  assert.throws(()=>verifyEditorialFulltextHtml(Buffer.from(changed),source));
  denied++;
}
assert.equal(denied,8);
console.log("PASS ERD R185-R186: "+counts.links+" offline fragment links / "+
  counts.targets+" unique IDs / "+counts.unique_link_destinations+
  " focusable destinations; "+denied+" negative cases; HOLD_NO_GO.");
