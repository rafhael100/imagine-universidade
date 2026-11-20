#!/usr/bin/env node
/** UNI ERD-R93/R94: negative provenance and keyboard target contracts. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildEditorialReviewPriority} from "./build-editorial-review-priority.mjs";
import {renderReviewPriorityHtml} from "./render-editorial-priority-html.mjs";
import {verifyPriorityHtmlArtifact} from "./verify-editorial-priority-html.mjs";

const source=JSON.parse(readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const report=buildEditorialReviewPriority(source);
const canonical=renderReviewPriorityHtml(report);
const output=verifyPriorityHtmlArtifact(Buffer.from(canonical,"utf8"),source);
assert.deepEqual(output,{
  lessons:35,rubric_checks:210,verified:"SYNTHETIC_SOURCE_BOUND_ONLY",
  human_signoff_authenticated:false,grants_issued:0,release_decision:"HOLD_NO_GO"
});
assert.equal((canonical.match(/<article id="aula-\d+" tabindex="-1" aria-labelledby="titulo-\d+">/gu)||[]).length,35);
assert.ok(canonical.includes("article:focus-visible{outline:3px solid #17446d"));
assert.equal((canonical.match(/Posição no currículo: \d+ de 35 · posição na fila: \d+ de 35/gu)||[]).length,35);
for(const row of report.items){
  assert.ok(canonical.includes('id="aula-'+row.original_position+'" tabindex="-1"'));
  assert.ok(canonical.includes('href="#aula-'+row.original_position+'"'));
}
assert.equal((canonical.match(/<h3>Perguntas para leitura/gu)||[]).length,35);
assert.ok(canonical.includes("13/13 NOT_VERIFIED"));
assert.ok(canonical.includes("HOLD_NO_GO"));

let rejects=0;
function reject(label,changed){
  assert.notEqual(changed,canonical,"Mutation must change HTML: "+label);
  assert.throws(()=>verifyPriorityHtmlArtifact(Buffer.from(changed,"utf8"),source),
    undefined,"Unsafe artifact passed: "+label);
  rejects++;
}
reject("false release",canonical.replace("HOLD_NO_GO","GO"));
reject("fake reviewed title",canonical.replace("Fila de leitura das 35 aulas","Fila aprovada das 35 aulas"));
reject("changed lesson title",canonical.replace(" — Visitas:"," — Aprovada:"));
reject("changed SHA",canonical.replace(/([a-f0-9]{64})/u,"0".repeat(64)));
reject("edited CSS",canonical.replace("background:#fff6e9","background:#fff6f0"));
reject("CSP removed",canonical.replace("Content-Security-Policy","Non-Security-Policy"));
reject("index link hijack",canonical.replace('href="#aula-', 'href="#outra-aula-'));
reject("nonfocusable article",canonical.replace('tabindex="-1" aria-labelledby="titulo-', 'aria-labelledby="titulo-'));
reject("forged status",canonical.replace("Pendente de revisão humana (não autenticada)","Revisão humana aprovada"));
reject("injected script",canonical.replace("</body>","<script>alert(1)</script></body>"));
reject("CRLF alternative",canonical.replaceAll("\n","\r\n"));
reject("truncated document",canonical.slice(0,-20));
reject("extra noncanonical markup",canonical+"<!-- aprovado -->");
reject("hidden gate alteration",canonical.replace("13/13 NOT_VERIFIED","13/13 VERIFIED"));
const poisoned=structuredClone(source);
poisoned.courses[0].lessons[0].title="Título forjado";
reject("different curriculum",renderReviewPriorityHtml(buildEditorialReviewPriority(poisoned)));
assert.throws(()=>verifyPriorityHtmlArtifact(Buffer.from([0xff]),source));
assert.throws(()=>verifyPriorityHtmlArtifact(Buffer.alloc(1024*1024+1,0x20),source));
assert.throws(()=>verifyPriorityHtmlArtifact("not a Buffer",source));
assert.throws(()=>verifyPriorityHtmlArtifact(Buffer.alloc(0),source));
console.log("PASS R93/R94: source-bound HTML, "+rejects+
  " negative content alterations, UTF-8/size guards, 35 focus targets and 13 gates HOLD.");
