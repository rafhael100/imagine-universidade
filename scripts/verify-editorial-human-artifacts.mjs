#!/usr/bin/env node
/**
 * UNI ERD-R79: verify both review handoff artifacts against the original
 * versioned synthetic curriculum, not against user-supplied hashes.
 *
 * This verifier is read-only. Passing it never authenticates an editor,
 * publishes a lesson, issues a grant or advances any release gate.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {buildHumanEditorialChecklist} from "./build-editorial-human-checklist.mjs";
import {renderHumanReviewMarkdown} from "./render-editorial-human-checklist.mjs";

const jsonLimit=1024*1024;
const markdownLimit=1024*1024;

export function verifyHumanHandoffArtifacts(jsonText,markdownText,originalSource){
  assert.equal(typeof jsonText,"string","Review JSON must be text");
  assert.equal(typeof markdownText,"string","Review Markdown must be text");
  assert.ok(Buffer.byteLength(jsonText,"utf8")<=jsonLimit,"JSON artifact exceeds 1 MiB");
  assert.ok(Buffer.byteLength(markdownText,"utf8")<=markdownLimit,"Markdown artifact exceeds 1 MiB");
  // Byte-for-byte canonical comparison also rejects duplicate keys, BOM,
  // alternate encodings, unknown fields, invented approvals and changed hashes.
  const canonical=buildHumanEditorialChecklist(originalSource);
  assert.equal(jsonText,JSON.stringify(canonical,null,2)+"\n",
    "JSON handoff differs from the 35 original draft lessons");
  assert.equal(markdownText,renderHumanReviewMarkdown(canonical),
    "Markdown handoff differs from the source-bound canonical checklist");
  assert.equal(canonical.release_decision,"HOLD_NO_GO");
  assert.equal(canonical.editorial_signoff_verified,false);
  assert.equal(canonical.approval_authority,"NONE");
  return {lessons:35,checks:35*canonical.rubric.length,
    verified:"SYNTHETIC_SOURCE_BOUND_ONLY",editorial_signoff:false,
    grants_issued:0,release_decision:"HOLD_NO_GO"};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  assert.equal(process.argv.length,4,
    "Expected only two local synthetic artifact paths: JSON then Markdown");
  const source=JSON.parse(readFileSync(
    new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
  const report=verifyHumanHandoffArtifacts(
    readFileSync(process.argv[2],"utf8"),
    readFileSync(process.argv[3],"utf8"),
    source
  );
  console.log("PASS R79: "+report.lessons+" source-bound drafts / "+report.checks+
    " reading prompts; no authenticated signoff, grants or release.");
}
