#!/usr/bin/env node
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {buildEditorialReviewQueue} from "./build-editorial-review-queue.mjs";

const bytes=readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url));
const source=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
const result=buildEditorialReviewQueue(source,bytes);
const expected=source.courses.flatMap(c=>c.lessons.map(l=>c.slug+"/"+l.slug));
assert.equal(expected.length,35);
assert.deepEqual(result.queue.map(x=>x.id),expected,"Course/lesson identity and order must remain unchanged");
assert.equal(result.queue.every(x=>x.review_status==="PENDING_HUMAN_REVIEW"),true);
assert.equal(result.source_sha256,createHash("sha256").update(bytes).digest("hex"));
assert.equal(result.flagged_count,24,"Tracked style-only findings changed; request human review");
assert.equal(result.markdown.match(/^- \[ \]/gmu)?.length,35,"Exactly 35 unchecked items");
assert.equal(result.markdown.match(/SHA-256 da aula: /gu)?.length,35,"Every lesson must include its content hash");
assert.equal(result.markdown.includes("## Prioridade 1"),true);
assert.equal(result.markdown.includes("## Prioridade 2"),true);
assert.equal(result.markdown.includes("HOLD_NO_GO"),true);
assert.equal(result.human_review_authenticated,false);
assert.equal(result.release_decision,"HOLD_NO_GO");
const ids=new Set();
for(const record of result.queue){
  assert.ok(!ids.has(record.id),"No duplicate lesson in human queue");
  ids.add(record.id);
  assert.match(record.content_sha256,/^[0-9a-f]{64}$/u);
  assert.ok(result.markdown.includes(record.id));
  assert.ok(result.markdown.includes(record.content_sha256));
}
// A changed lesson body must invalidate the underlying source and lesson hash.
const changed=structuredClone(source);
changed.courses.at(-1).lessons.at(-1).body+=" Alteração sintética para testar identidade.";
const shifted=buildEditorialReviewQueue(changed,Buffer.from(JSON.stringify(changed),"utf8"));
assert.notEqual(result.queue.at(-1).content_sha256,shifted.queue.at(-1).content_sha256);
assert.notEqual(result.source_sha256,shifted.source_sha256);
assert.equal(shifted.human_review_authenticated,false);
assert.equal(shifted.release_decision,"HOLD_NO_GO");
console.log("PASS ERD-R24: 35 pending human reviews, 24 style triage flags, exact lesson hashes and HOLD_NO_GO.");
