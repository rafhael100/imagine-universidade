#!/usr/bin/env node
/**
 * UNI ERD-R112: byte-for-byte provenance verification for the three OFFLINE
 * draft review handoffs. No approvals, Portal entitlement or customer data.
 */
import assert from "node:assert/strict";
import {readFileSync,readSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {buildEditorialReviewPriority,renderReviewPriorityMarkdown}
  from "./build-editorial-review-priority.mjs";
import {renderReviewPriorityHtml} from "./render-editorial-priority-html.mjs";
import {verifyPriorityHtmlArtifact} from "./verify-editorial-priority-html.mjs";

const maxBytes=1024*1024;
const allowedFormats=new Set(["json","markdown","html"]);

export function verifyReviewHandoffArtifact(bytes,source,format){
  assert.ok(allowedFormats.has(format),"Only json, markdown or html handoffs are supported");
  assert.ok(Buffer.isBuffer(bytes),"Expected an artifact Buffer");
  assert.ok(bytes.length>0&&bytes.length<=maxBytes,
    "Review artifact is empty or exceeds 1 MiB");
  const report=buildEditorialReviewPriority(source);
  const expected=format==="json" ? JSON.stringify(report,null,2)+"\n" :
    format==="markdown" ? renderReviewPriorityMarkdown(report) :
    renderReviewPriorityHtml(report);
  // A byte match rejects altered UTF-8, BOM, extra fields, normalization,
  // different lesson order, edited warnings and even innocuous extra spaces.
  assert.ok(bytes.equals(Buffer.from(expected,"utf8")),
    "Artifact bytes do not match canonical 35-lesson versioned source");
  if(format==="html") verifyPriorityHtmlArtifact(bytes,source);
  return {
    format,lessons:35,rubric_checks:210,
    provenance:"SYNTHETIC_SOURCE_BOUND_ONLY",
    human_signoff_authenticated:false,grants_issued:0,
    release_decision:"HOLD_NO_GO"
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  assert.equal(process.argv.length,3,"Usage: node verifier.mjs --json|--markdown|--html < handoff");
  const format=process.argv[2].replace(/^--/u,"");
  assert.ok(allowedFormats.has(format),"Unsupported artifact format");
  // Read only stdin, with a hard upper bound *during* reading. In particular,
  // no local path argument, symlink traversal, network access or output writes.
  const chunks=[];let length=0;
  while(true){
    const chunk=Buffer.alloc(65536);
    const count=readSync(0,chunk,0,chunk.length,null);
    if(count===0)break;
    length+=count;
    assert.ok(length<=maxBytes,"Input exceeded 1 MiB before verification");
    chunks.push(chunk.subarray(0,count));
  }
  const source=JSON.parse(readFileSync(
    new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
  const receipt=verifyReviewHandoffArtifact(Buffer.concat(chunks),source,format);
  process.stdout.write(JSON.stringify(receipt)+"\n");
}
