#!/usr/bin/env node
/** ERD R197: positive contract and adversarial source/fragment cases. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  auditManifestAnchors,buildEditorialNavigationManifest,
  renderEditorialNavigationManifest
} from "./build-editorial-navigation-manifest.mjs";
import {verifyEditorialNavigationManifest}
  from "./verify-editorial-navigation-manifest.mjs";
import {renderEditorialFulltextHtml} from "./render-editorial-fulltext-html.mjs";

const source=JSON.parse(readFileSync(
  new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const manifest=buildEditorialNavigationManifest(source);
const html=renderEditorialFulltextHtml(source);
const canonical=Buffer.from(renderEditorialNavigationManifest(source),"utf8");
const expected=verifyEditorialNavigationManifest(canonical,source);
assert.deepEqual(expected,{
  courses:10,lessons:35,rubric_checks:210,anchors:245,
  human_signoff_authenticated:false,grants_issued:0,
  release_decision:"HOLD_NO_GO"
});
assert.deepEqual(auditManifestAnchors(manifest,html),{
  lessons:35,checks:210,anchors:245
});
assert.equal(manifest.courses.reduce((n,c)=>n+c.lessons.length,0),35);
assert.equal(manifest.total_rubric_checks,210);
assert.equal(manifest.total_lessons,35);
assert.equal(manifest.grants_issued,0);
let rejected=0;
const deny=(label,bytes,curriculum=source)=>{
  assert.throws(()=>verifyEditorialNavigationManifest(bytes,curriculum),
    undefined,label);
  rejected++;
};
function modify(action){
  const copy=structuredClone(manifest);
  action(copy,copy.courses[0].lessons[0]);
  return Buffer.from(JSON.stringify(copy,null,2)+"\n","utf8");
}
deny("falsified signoff",modify(m=>m.human_signoff_authenticated=true));
deny("falsified release",modify(m=>m.release_decision="GO"));
deny("invented grant",modify(m=>m.grants_issued=1));
deny("changed source hash",modify((m,l)=>l.content_sha256="0".repeat(64)));
deny("foreign fragment",modify((m,l)=>l.anchors.lesson="https://example.test"));
deny("wrong queue order",modify((m,l)=>l.queue_position=999));
deny("missing lesson",modify(m=>m.courses[0].lessons.pop()));
deny("extra metadata",modify(m=>m.approved=true));
deny("extra newline",Buffer.concat([canonical,Buffer.from("\n")]));
deny("truncation",canonical.subarray(0,canonical.length-1));
deny("BOM",Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),canonical]));
deny("invalid UTF-8",Buffer.concat([canonical,Buffer.from([0xff])]));
deny("oversize",Buffer.alloc(1024*1024+1,0x20));
const changedSource=structuredClone(source);
changedSource.courses[0].lessons[0].title+=" — revisão ainda não publicada";
deny("source version changed",canonical,changedSource);
assert.throws(()=>verifyEditorialNavigationManifest("text",source));
assert.throws(()=>renderEditorialNavigationManifest({...source,status:"published"}));
assert.throws(()=>renderEditorialNavigationManifest({...source,audience:"public"}));
assert.equal(rejected,14);

let htmlDenied=0;
for(const [label,bad] of [
  ["missing article",html.replace('id="aula-1"','id="missing-article"')],
  ["missing text focus",html.replace('id="secoes-aula-1"','id="missing-text"')],
  ["wrong rubric target",html.replace('id="rubrica-aula-1"','id="rubrica-aula-999"')],
  ["duplicate section",html.replace('id="aula-secao-1-1"','id="aula-secao-1-2"')],
  ["missing rubric link",html.replace('href="#rubrica-aula-1"','href="#missing-rubric"')],
  ["injected script",html.replace("</body></html>","<script></script></body></html>")],
  ["fake release",html.replace("HOLD_NO_GO · 13/13 NOT_VERIFIED","GO")]
]){
  assert.notEqual(bad,html,"Ineffective mutation: "+label);
  assert.throws(()=>auditManifestAnchors(manifest,bad),undefined,label);
  htmlDenied++;
}
assert.equal(htmlDenied,7);
console.log("PASS ERD R194–R197: 35 lessons, 10 courses, 210 rubrics, 245 anchors, "+
  rejected+" bad manifests and "+htmlDenied+" bad HTML states rejected; HOLD_NO_GO.");
