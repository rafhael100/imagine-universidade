#!/usr/bin/env node
/** ERD-R202: source-bound and adversarial tests for text-only lesson reading. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {renderEditorialReadingTranscript} from "./render-editorial-reading-transcript.mjs";
import {verifyEditorialReadingTranscript} from "./verify-editorial-reading-transcript.mjs";
import {buildEditorialNavigationManifest} from "./build-editorial-navigation-manifest.mjs";

const source=JSON.parse(readFileSync(
  new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const manifest=buildEditorialNavigationManifest(source);
const txt=renderEditorialReadingTranscript(source);
const original=Buffer.from(txt,"utf8");
assert.deepEqual(verifyEditorialReadingTranscript(original,source),{
  courses:10,lessons:35,review_questions:210,
  human_signoff_authenticated:false,grants_issued:0,
  release_decision:"HOLD_NO_GO"
});
assert.equal((txt.match(/^CURSO \d+\/10 — /gmu)||[]).length,10);
assert.equal((txt.match(/^AULA \d+\/35 — /gmu)||[]).length,35);
assert.equal((txt.match(/^PERGUNTA [1-6]\/6: /gmu)||[]).length,210);
assert.equal((txt.match(/^Estado: PENDING_HUMAN_REVIEW \| aceite autenticado: NÃO$/gmu)||[]).length,35);
assert.equal((txt.match(/^Conclusão desta aula: PENDING_HUMAN_REVIEW; nunca inferir aprovação\.$/gmu)||[]).length,35);
assert.equal((txt.match(/^SHA-256 do texto: [0-9a-f]{64}$/gmu)||[]).length,35);
for(const course of manifest.courses)for(const lesson of course.lessons){
  assert.ok(txt.includes("Identificador: "+lesson.id+"\n"));
  assert.ok(txt.includes("SHA-256 do texto: "+lesson.content_sha256+"\n"));
  assert.ok(txt.includes("posição na fila: "+lesson.queue_position+"/35"));
}
assert.ok(!/<script\b/iu.test(txt));
assert.ok(!/\x1b\[/u.test(txt));
assert.ok(txt.includes("HOLD_NO_GO | 13/13 NOT_VERIFIED | 0 grants"));
let rejected=0;
function deny(label,bytes,from=source){
  assert.throws(()=>verifyEditorialReadingTranscript(bytes,from),undefined,label);
  rejected++;
}
function corrupt(before,after){
  assert.ok(txt.includes(before),"Mutation target absent");
  const mutated=txt.replace(before,after);
  assert.notEqual(mutated,txt,"Mutation must change the transcript");
  return Buffer.from(mutated,"utf8");
}
deny("fake release",corrupt("HOLD_NO_GO","GO"));
deny("fake signoff",corrupt("aceite autenticado: NÃO","aceite autenticado: SIM"));
deny("invented grants",corrupt("0 grants","1 grant"));
deny("changed question",corrupt("PERGUNTA 1/6:","PERGUNTA 1/6: pergunta adulterada"));
deny("changed source hash",corrupt("SHA-256 do texto:","SHA-256 alterado:"));
deny("lost last byte",original.subarray(0,original.length-1));
deny("extra newline",Buffer.concat([original,Buffer.from("\n")]));
deny("UTF-8 BOM",Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),original]));
deny("bad UTF-8",Buffer.concat([original,Buffer.from([0xff])]));
deny("oversize",Buffer.alloc(1024*1024+1,0x20));
const changed=structuredClone(source);
changed.courses[0].lessons[0].body+=" Revisão editorial sintética ainda não aprovada.";
deny("source changed since export",original,changed);
const renamed=structuredClone(source);
renamed.courses[0].lessons[0].title+=" (rascunho alterado)";
deny("source title changed",original,renamed);
assert.throws(()=>renderEditorialReadingTranscript({...source,status:"published"}));
assert.throws(()=>renderEditorialReadingTranscript({...source,audience:"public"}));
const bidi=structuredClone(source);
bidi.courses[0].lessons[0].title+="\u202e";
assert.throws(()=>renderEditorialReadingTranscript(bidi),/bidirectional override/u);
assert.throws(()=>verifyEditorialReadingTranscript(txt,source),/local bytes/u);
assert.equal(rejected,12);
console.log("PASS ERD R199-R202: 10 courses, 35 full texts, 210 reading questions, "+
  rejected+" rejected artifact/source mutations, fail-closed release.");
