#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {safeLine, safeBody} from "./editorial-text-safety.mjs";

// Exercise the CURRENT 35 lessons, not a simplified fixture.
const source=JSON.parse(readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
assert.equal(source.status,"editorial_draft");
assert.equal(source.courses.length,10);
let positive=0,negative=0,lessons=0;
for(const course of source.courses){
  assert.equal(typeof safeLine(course.title),"string");positive++;
  for(const lesson of course.lessons){
    lessons++;
    assert.equal(typeof safeLine(lesson.title),"string");
    assert.equal(typeof safeBody(lesson.body),"string");
    positive+=2;
  }
}
assert.equal(lessons,35);
assert.equal(positive,80);

// Original pack generator accepted these invisible/bidi/C1 fragments even in
// a title. They can visually spoof the reviewed Markdown/HTML handoff.
const body=source.courses[0].lessons[0].body;
const unsafe=[
  0x00,0x07,0x09,0x0d,0x7f,0x85,0x9b,0xad,0x061c,
  0x200b,0x202e,0x2067,0x034f,0xfe0f,0xe0100,0x2028,0x2029
];
for(const code of unsafe){
  const marker=String.fromCodePoint(code);
  assert.throws(()=>safeLine("Aula "+marker+"falsa"),undefined,"title U+"+code.toString(16));
  // Inject into an otherwise complete, current, pedagogical lesson body.
  assert.throws(()=>safeBody(body.slice(0,12)+marker+body.slice(12)),
    undefined,"body U+"+code.toString(16));
  negative+=2;
}
for(const lone of ["\uD800","\uDC00"]){
  assert.throws(()=>safeLine("Aula "+lone),undefined,"unpaired surrogate in title");
  assert.throws(()=>safeBody(body+lone),undefined,"unpaired surrogate in body");
  negative+=2;
}
assert.equal(safeLine("Aula sobre inclusão | prática"),"Aula sobre inclusão \\| prática");
assert.equal(safeBody(body),body.trim());
assert.throws(()=>safeLine("Aula\nCabeçalho"),/Title must fit/);
assert.throws(()=>safeBody("Texto breve"),/substantive editorial draft/);
positive+=2;negative+=2;
assert.equal(negative,40);
console.log("PASS ERD-R12/R13: "+lessons+
  " actual lessons, "+positive+" positive and "+negative+
  " negative checks; all editorial statuses remain unauthenticated.");
