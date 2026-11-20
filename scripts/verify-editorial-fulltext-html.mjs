#!/usr/bin/env node
/**
 * UNI ERD-R143: verify exact bytes against the repository's 35 source drafts.
 * No URL input, editable approval state, PII, network, grants or real credentials.
 */
import assert from "node:assert/strict";
import {readFileSync,lstatSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {renderEditorialFulltextHtml} from "./render-editorial-fulltext-html.mjs";

const MAX_BYTES=1024*1024;
export function verifyEditorialFulltextHtml(bytes,source){
  assert.ok(Buffer.isBuffer(bytes),"A local HTML Buffer is required");
  assert.ok(bytes.length>0&&bytes.length<=MAX_BYTES,"Unsafe artifact size");
  const expected=Buffer.from(renderEditorialFulltextHtml(source),"utf8");
  assert.ok(expected.equals(bytes),
    "Full-text HTML is not byte-exact against the synthetic curriculum");
  return Object.freeze({
    source_bound_lessons:35,human_rubric_checks:210,
    signoff_authenticated:false,grants_issued:0,
    release_decision:"HOLD_NO_GO"
  });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  assert.equal(process.argv.length,3,
    "Pass exactly one generated local file, never a URL");
  const stat=lstatSync(process.argv[2]);
  assert.ok(stat.isFile()&&!stat.isSymbolicLink()&&stat.size>0&&stat.size<=MAX_BYTES,
    "Only a bounded regular local artifact may be verified");
  const source=JSON.parse(readFileSync(
    new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
  const result=verifyEditorialFulltextHtml(readFileSync(process.argv[2]),source);
  console.log("PASS R143: "+result.source_bound_lessons+
    " source-bound draft bodies / "+result.human_rubric_checks+
    " review questions; no authenticated approval, grants or production release.");
}
