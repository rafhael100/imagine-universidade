#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {auditEditorialLessonStructure} from "./audit-editorial-lesson-structure.mjs";
const source=JSON.parse(readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const summary=auditEditorialLessonStructure(source);
assert.equal(summary.courses,10);
assert.equal(summary.lessons,35);
assert.equal(summary.structured_sections,140);
assert.equal(summary.human_review_authenticated,false);
assert.equal(summary.publishable,false);
assert.equal(summary.release_decision,"HOLD_NO_GO");
assert.equal(summary.structural_integrity,"CHECKED_ONLY");
let negative=0;
function rejects(label,mutator){
  const changed=JSON.parse(JSON.stringify(source));
  mutator(changed);
  assert.throws(()=>auditEditorialLessonStructure(changed),undefined,label);
  negative++;
}
rejects("published source",s=>{s.status="published";});
rejects("wrong audience",s=>{s.audience="public";});
rejects("missing course",s=>{s.courses.pop();});
rejects("missing lesson",s=>{s.courses[0].lessons.pop();});
rejects("duplicate course",s=>{s.courses[1].slug=s.courses[0].slug;});
rejects("duplicate lesson identity",s=>{s.courses[0].lessons[1].slug=s.courses[0].lessons[0].slug;});
rejects("missing fictional example",s=>{
  const l=s.courses[0].lessons[0];
  l.body=l.body.replace("\n\nEXEMPLO FICTÍCIO\n","\n\n");
});
rejects("reordered sections",s=>{
  const l=s.courses[0].lessons[0];
  l.body=l.body.replace("EXEMPLO FICTÍCIO","PLACEHOLDER").replace("APLICAÇÃO OPCIONAL","EXEMPLO FICTÍCIO").replace("PLACEHOLDER","APLICAÇÃO OPCIONAL");
});
rejects("exercise replaced by placeholder",s=>{
  const l=s.courses[0].lessons[0];
  l.body=l.body.replace(/APLICAÇÃO OPCIONAL\n[\s\S]*?\n\nCUIDADO IMPORTANTE/u,"APLICAÇÃO OPCIONAL\nx\n\nCUIDADO IMPORTANTE");
});
rejects("blank title",s=>{s.courses[0].lessons[0].title="";});
rejects("duplicated complete lesson",s=>{
  s.courses[0].lessons[1].body=s.courses[0].lessons[0].body;
});
rejects("duplicated lesson with whitespace changes",s=>{
  s.courses[0].lessons[1].body=s.courses[0].lessons[0].body.replaceAll("\n\n","\n\n\n");
});
rejects("bidi control in course name",s=>{s.courses[0].title+="\u202e";});
rejects("zero width character in pedagogy",s=>{s.courses[0].lessons[0].body+="\u200b";});
rejects("bidi isolate in lesson title",s=>{s.courses[0].lessons[0].title+="\u2066";});
console.log("PASS 35-lesson structural audit; 140 pedagogical sections; "+negative+
  " negative regressions; "+summary.style_findings.length+
  " nonblocking style flags. HUMAN APPROVAL NOT VERIFIED.");
