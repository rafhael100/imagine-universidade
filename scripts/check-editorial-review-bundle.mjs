#!/usr/bin/env node
/** UNI ERD-R122: source-bound review bundle regression + adversarial fixtures. */
import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,rmSync,writeFileSync,symlinkSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {buildReviewBundle,verifyReviewBundle,verifyBundleDirectory,fileNames}
  from "./editorial-review-bundle.mjs";

const source=readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url));
const original=buildReviewBundle(source);
assert.equal(original.manifest.total_lessons,35);
assert.equal(original.manifest.human_rubric_checks,210);
assert.equal(original.manifest.human_signoff_authenticated,false);
assert.equal(original.manifest.grants_issued,0);
assert.equal(original.manifest.release_decision,"HOLD_NO_GO");
assert.equal(new Set(original.manifest.artifacts.map(row=>row.sha256)).size,3);
const pristine=()=>Object.fromEntries(
  Object.entries(original.artifacts).map(([name,bytes])=>[name,Buffer.from(bytes)]));
const check=(manifest=original.manifestBytes,artifacts=pristine(),fixture=source)=>
  verifyReviewBundle(fixture,manifest,artifacts);
assert.equal(check().release_decision,"HOLD_NO_GO");

let rejected=0;
function deny(label,fn){
  assert.throws(fn,undefined,"Fail-closed guard accepted "+label);
  rejected++;
}
deny("fake release",()=>check(Buffer.from(
  original.manifestBytes.toString("utf8").replace("HOLD_NO_GO","GO"))));
deny("fake signoff",()=>check(Buffer.from(
  original.manifestBytes.toString("utf8").replace(
    '"human_signoff_authenticated": false','"human_signoff_authenticated": true'))));
deny("fake grant",()=>check(Buffer.from(
  original.manifestBytes.toString("utf8").replace('"grants_issued": 0','"grants_issued": 1'))));
deny("BOM",()=>check(Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),original.manifestBytes])));
deny("manifest truncation",()=>check(original.manifestBytes.subarray(0,-1)));
deny("manifest exceeds 16KiB",()=>check(Buffer.alloc(16*1024+1)));
deny("manifest non-Buffer",()=>check("fake"));
deny("extra format",()=>check(original.manifestBytes,{...pristine(),pdf:Buffer.from("fake")}));
deny("missing format",()=>{
  const rows=pristine();delete rows.markdown;check(original.manifestBytes,rows);
});
for(const format of Object.keys(fileNames)){
  deny(format+" changed",()=>{
    const rows=pristine();
    rows[format]=Buffer.concat([rows[format],Buffer.from(" ")]);
    check(original.manifestBytes,rows);
  });
  deny(format+" truncated",()=>{
    const rows=pristine();rows[format]=rows[format].subarray(0,-1);
    check(original.manifestBytes,rows);
  });
  deny(format+" oversized",()=>{
    const rows=pristine();rows[format]=Buffer.alloc(1024*1024+1,0x20);
    check(original.manifestBytes,rows);
  });
}
const changed=JSON.parse(source.toString("utf8"));
changed.courses[0].lessons[0].title+=" — changed fixture";
deny("stale source",()=>check(original.manifestBytes,pristine(),Buffer.from(JSON.stringify(changed))));
deny("invalid UTF-8 source",()=>check(original.manifestBytes,pristine(),Buffer.from([0xff])));
deny("noncanonical manifest layout",()=>check(Buffer.from(JSON.stringify(original.manifest))));

const dir=mkdtempSync(join(tmpdir(),"uni-offline-review-"));
try{
  writeFileSync(join(dir,"manifest.json"),original.manifestBytes);
  for(const [format,name] of Object.entries(fileNames))
    writeFileSync(join(dir,name),original.artifacts[format]);
  assert.equal(verifyBundleDirectory(dir).lessons,35);
  writeFileSync(join(dir,"APPROVED.txt"),"Synthetic approval claim: not authentic");
  deny("fabricated signoff companion file",()=>verifyBundleDirectory(dir));
  rmSync(join(dir,"APPROVED.txt"));
  writeFileSync(join(dir,".env"),"SYNTHETIC_EXAMPLE=not_a_secret");
  deny("unexpected hidden file",()=>verifyBundleDirectory(dir));
  rmSync(join(dir,".env"));
  symlinkSync(join(dir,"report.json"),join(dir,"extra-review.json"));
  deny("unexpected symlink alias",()=>verifyBundleDirectory(dir));
  rmSync(join(dir,"extra-review.json"));
  assert.equal(verifyBundleDirectory(dir).formats,3);
  rmSync(join(dir,"report.md"));
  symlinkSync(join(dir,"report.json"),join(dir,"report.md"));
  deny("symlink to report",()=>verifyBundleDirectory(dir));
  rmSync(join(dir,"report.md"));
  writeFileSync(join(dir,"report.md"),original.artifacts.markdown);
  writeFileSync(join(dir,"manifest.json"),Buffer.from("{}"));
  deny("manually replaced manifest",()=>verifyBundleDirectory(dir));
}finally{rmSync(dir,{recursive:true,force:true});}
console.log("PASS R120-R122: manifest and three source-bound artifacts, "+
  rejected+" denied mutations; 35 lessons, 210 checks, HOLD_NO_GO.");
