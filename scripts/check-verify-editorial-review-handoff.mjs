#!/usr/bin/env node
/** UNI ERD-R113: adversarial byte provenance and fake approval checks. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildEditorialReviewPriority,renderReviewPriorityMarkdown}
  from "./build-editorial-review-priority.mjs";
import {renderReviewPriorityHtml} from "./render-editorial-priority-html.mjs";
import {verifyReviewHandoffArtifact} from "./verify-editorial-review-handoff.mjs";

const source=JSON.parse(readFileSync(
  new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const report=buildEditorialReviewPriority(source);
const originals={
  json:JSON.stringify(report,null,2)+"\n",
  markdown:renderReviewPriorityMarkdown(report),
  html:renderReviewPriorityHtml(report)
};
let accepted=0,rejected=0;
for(const [format,canonical] of Object.entries(originals)){
  const originalBytes=Buffer.from(canonical,"utf8");
  const receipt=verifyReviewHandoffArtifact(originalBytes,source,format);
  assert.deepEqual(receipt,{
    format,lessons:35,rubric_checks:210,
    provenance:"SYNTHETIC_SOURCE_BOUND_ONLY",
    human_signoff_authenticated:false,grants_issued:0,
    release_decision:"HOLD_NO_GO"
  });
  accepted++;
  function deny(label,buffer,curriculum=source){
    assert.throws(()=>verifyReviewHandoffArtifact(buffer,curriculum,format),
      undefined,format+": "+label);
    rejected++;
  }
  deny("extra final whitespace",Buffer.from(canonical+" "));
  deny("CRLF instead of LF",Buffer.from(canonical.replaceAll("\n","\r\n")));
  deny("UTF-8 BOM",Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),originalBytes]));
  deny("truncated artifact",originalBytes.subarray(0,originalBytes.length-1));
  deny("invalid UTF-8 appended",Buffer.concat([originalBytes,Buffer.from([0xff])]));
  deny("empty payload",Buffer.alloc(0));
  deny("oversized payload",Buffer.alloc(1024*1024+1,0x20));
  const differentCurriculum=structuredClone(source);
  differentCurriculum.courses[0].lessons[0].title+=" (alterada)";
  deny("different versioned lesson title",originalBytes,differentCurriculum);
  const fakeRelease=canonical.replace("HOLD_NO_GO","GO");
  assert.notEqual(fakeRelease,canonical,"Expected release warning present");
  deny("falsified release warning",Buffer.from(fakeRelease));
}
assert.throws(()=>verifyReviewHandoffArtifact(Buffer.from("{}"),source,"yaml"));
assert.throws(()=>verifyReviewHandoffArtifact("not a Buffer",source,"json"));
assert.equal(accepted,3);
assert.equal(rejected,27);
assert.ok(originals.json.includes('"human_review_authenticated": false'));
assert.ok(originals.markdown.includes("13/13 gates NOT_VERIFIED"));
assert.ok(originals.html.includes("13/13 NOT_VERIFIED"));
console.log("PASS R112/R113: "+accepted+" canonical draft artifact types and "+
  rejected+" negative provenance cases; no authentic signoff, grants or GO.");
