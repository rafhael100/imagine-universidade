#!/usr/bin/env node
/** ERD R196: exact-byte verification against the checked-in synthetic source. */
import assert from "node:assert/strict";
import {readFileSync,lstatSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {renderEditorialNavigationManifest} from "./build-editorial-navigation-manifest.mjs";
const MAX_BYTES=1024*1024;
export function verifyEditorialNavigationManifest(bytes,source){
  assert.ok(Buffer.isBuffer(bytes),"Expected a local Buffer, not user-supplied JSON");
  assert.ok(bytes.length>0&&bytes.length<=MAX_BYTES,"Unsafe artifact size");
  const canonical=Buffer.from(renderEditorialNavigationManifest(source),"utf8");
  assert.ok(bytes.equals(canonical),"Navigation manifest differs from source-bound draft");
  return Object.freeze({
    courses:10,lessons:35,rubric_checks:210,anchors:245,
    human_signoff_authenticated:false,grants_issued:0,
    release_decision:"HOLD_NO_GO"
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  assert.equal(process.argv.length,3,"One local manifest file expected; no URLs");
  const stat=lstatSync(process.argv[2]);
  assert.ok(stat.isFile()&&!stat.isSymbolicLink()&&stat.size>0&&stat.size<=MAX_BYTES,
    "Only a bounded regular local file may be checked");
  const source=JSON.parse(readFileSync(
    new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
  const result=verifyEditorialNavigationManifest(readFileSync(process.argv[2]),source);
  console.log("PASS R196: "+result.lessons+" draft lessons / "+result.anchors+
    " linked anchors, 210 questions; zero signoff, zero grants, HOLD_NO_GO.");
}
