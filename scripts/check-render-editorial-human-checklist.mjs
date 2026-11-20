#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildHumanEditorialChecklist} from "./build-editorial-human-checklist.mjs";
import {renderHumanReviewMarkdown} from "./render-editorial-human-checklist.mjs";

const source=JSON.parse(readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const report=buildHumanEditorialChecklist(source);
const markdown=renderHumanReviewMarkdown(report);
assert.equal((markdown.match(/^### Aula \d{2}\/35 — /gmu)||[]).length,35);
assert.equal((markdown.match(/^- \[ \] Conferir: /gmu)||[]).length,210);
assert.equal((markdown.match(/^- Estado editorial: PENDING_HUMAN_REVIEW/gmu)||[]).length,35);
assert.equal((markdown.match(/^- SHA-256 do texto da aula: [0-9a-f]{64}$/gmu)||[]).length,35);
assert.ok(markdown.includes("SEM ACEITE / HOLD_NO_GO"));
assert.ok(markdown.includes("13/13 gates NOT_VERIFIED"));
assert.ok(!markdown.includes("CLAIMED_HUMAN_APPROVED"));
assert.ok(!markdown.includes("HUMAN_SIGNOFF_VERIFIED"));
assert.ok(markdown.endsWith("\n"));
const injected=structuredClone(report);
injected.lessons[0].lesson_title="<script>alert(1)</script> *aprovado*";
const escaped=renderHumanReviewMarkdown(injected);
assert.ok(!escaped.includes("<script>"));
assert.ok(escaped.includes(String.fromCharCode(92)+"<script"+String.fromCharCode(92)+">"));
const fraud=structuredClone(report);
fraud.lessons[0].authenticated_signoff=true;
assert.throws(()=>renderHumanReviewMarkdown(fraud));
const released=structuredClone(report);
released.release_decision="GO";
assert.throws(()=>renderHumanReviewMarkdown(released));
console.log("PASS R77: 35 markdown source identities, 210 manual checks, 35 hashes, "+
  "escaped untrusted titles and explicit signoff/release denial.");
