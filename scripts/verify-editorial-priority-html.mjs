#!/usr/bin/env node
/**
 * UNI ERD-R91/R92: byte-exact, synthetic-source-bound HTML verification.
 * This does not authenticate a human editor or grant access.
 */
import assert from "node:assert/strict";
import {readFileSync,lstatSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {buildEditorialReviewPriority} from "./build-editorial-review-priority.mjs";
import {renderReviewPriorityHtml} from "./render-editorial-priority-html.mjs";

const maxBytes=1024*1024;

export function verifyPriorityHtmlArtifact(bytes,originalSource){
  assert.ok(Buffer.isBuffer(bytes),"Expected an HTML file Buffer");
  assert.ok(bytes.length>0&&bytes.length<=maxBytes,
    "HTML artifact is empty or exceeds the 1 MiB verification bound");
  const actual=new TextDecoder("utf-8",{fatal:true,ignoreBOM:true}).decode(bytes);
  const canonical=renderReviewPriorityHtml(buildEditorialReviewPriority(originalSource));
  assert.ok(actual===canonical,
    "HTML handoff diverges from the versioned synthetic curriculum or renderer");
  assert.equal(Buffer.byteLength(canonical,"utf8"),bytes.length,
    "HTML artifact must match canonical UTF-8 bytes");
  return {
    lessons:35,rubric_checks:210,verified:"SYNTHETIC_SOURCE_BOUND_ONLY",
    human_signoff_authenticated:false,grants_issued:0,release_decision:"HOLD_NO_GO"
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  assert.equal(process.argv.length,3,
    "Provide only a local generated HTML artifact, never a remote URL");
  const stat=lstatSync(process.argv[2]);
  assert.ok(stat.isFile()&&!stat.isSymbolicLink()&&stat.size>0&&stat.size<=maxBytes,
    "Review artifact must be a regular, bounded local file");
  const source=JSON.parse(readFileSync(
    new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
  const result=verifyPriorityHtmlArtifact(readFileSync(process.argv[2]),source);
  console.log("PASS R91/R92: "+result.lessons+" source-bound draft lessons / "+
    result.rubric_checks+" manual prompts; no human signoff, grants or release.");
}
