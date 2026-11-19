#!/usr/bin/env node
/** Structural-only editorial review of the 10-course/35-lesson draft.
 * Does not validate content quality, reviewer identity, release authority or
 * approval. No writes, network, grant, deployment or external dependencies.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";

const headings=["EXEMPLO FICTÍCIO","APLICAÇÃO OPCIONAL","CUIDADO IMPORTANTE"];
const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const sectionSeparators=/\n\n(EXEMPLO FICTÍCIO|APLICAÇÃO OPCIONAL|CUIDADO IMPORTANTE)\n/gu;
// Reject format/bidi and C0/C1 controls in titles and pedagogy. LF remains valid.
const unsafeControls=/[\p{Cf}\u034f\u180e\u2028\u2029\ufe00-\ufe0f\u{e0100}-\u{e01ef}\x00-\x08\x0b\x0c\x0d\x0e-\x1f\x7f-\x9f]/u;
const fingerprint=body=>body.normalize("NFKC").replace(/\s+/gu," ").trim().toLocaleLowerCase("pt-BR");
function checkReadable(value,label){
  assert.ok(!unsafeControls.test(value),"Invisible/control character in "+label);
}
export function auditEditorialLessonStructure(source){
  assert.equal(source?.schema_version,1,"Unrecognized curriculum schema");
  assert.equal(source?.status,"editorial_draft","Only unapproved curriculum is audited");
  assert.equal(source?.audience,"authorized_imagine_clients_only","Audience policy changed");
  assert.ok(Array.isArray(source.courses)&&source.courses.length===10,"Exactly ten draft courses required");
  const courseIds=new Set(),lessonIds=new Set(),bodyFingerprints=new Map(),styleFlags=[];
  for(const course of source.courses){
    assert.ok(typeof course.slug==="string"&&slugPattern.test(course.slug),"Invalid course slug");
    assert.ok(!courseIds.has(course.slug),"Duplicate course slug: "+course.slug);
    courseIds.add(course.slug);
    assert.ok(typeof course.title==="string"&&course.title.trim().length>4,"Missing course title");
    checkReadable(course.title,"course "+course.slug);
    assert.ok(Array.isArray(course.lessons)&&course.lessons.length>0,"Course has no lessons");
    for(const lesson of course.lessons){
      assert.ok(typeof lesson.slug==="string"&&slugPattern.test(lesson.slug),"Invalid lesson slug");
      const id=course.slug+"/"+lesson.slug;
      assert.ok(!lessonIds.has(id),"Duplicate lesson identity: "+id);
      lessonIds.add(id);
      assert.ok(typeof lesson.title==="string"&&lesson.title.trim().length>4,"Missing lesson title: "+id);
      assert.ok(typeof lesson.body==="string","Missing lesson body: "+id);
      checkReadable(lesson.title,"lesson title "+id);
      checkReadable(lesson.body,"lesson body "+id);
      const bodyKey=fingerprint(lesson.body);
      assert.ok(!bodyFingerprints.has(bodyKey),
        "Duplicated lesson body: "+bodyFingerprints.get(bodyKey)+" / "+id);
      bodyFingerprints.set(bodyKey,id);
      const matches=[...lesson.body.matchAll(sectionSeparators)].map(match=>match[1]);
      assert.deepEqual(matches,headings,"Missing or reordered pedagogical section: "+id);
      const parts=lesson.body.split(sectionSeparators).filter((_,index)=>index%2===0);
      assert.equal(parts.length,4,"Incomplete lesson sections: "+id);
      for(let index=0;index<4;index++){
        assert.ok(parts[index].trim().length>=[100,70,50,40][index],
          "Insufficient text in section "+String(index+1)+": "+id);
      }
      // Style-only finding: intros repeat the dedicated application heading.
      // This is NOT a publication blocker or a substitute for human signoff.
      if(/aplica[cç][aã]o opcional\s*:/iu.test(parts[0]))styleFlags.push(id);
    }
  }
  assert.equal(lessonIds.size,35,"Exactly 35 unique draft lessons required");
  return {schema_version:1,courses:courseIds.size,lessons:lessonIds.size,
    structured_sections:lessonIds.size*4,style_findings:styleFlags,
    structural_integrity:"CHECKED_ONLY",human_review_authenticated:false,
    publishable:false,release_decision:"HOLD_NO_GO"};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  assert.equal(process.argv.length,2,"Structural audit does not accept customer files");
  const source=JSON.parse(readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
  console.log(JSON.stringify(auditEditorialLessonStructure(source),null,2));
}
