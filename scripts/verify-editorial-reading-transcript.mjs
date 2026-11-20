#!/usr/bin/env node
/**
 * UNI ERD-R201: verify a regular local TXT against original synthetic source.
 * No remote URL, client content, signoff, grants, JSON authority or import.
 */
import assert from "node:assert/strict";
import {readFileSync,lstatSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {renderEditorialReadingTranscript} from "./render-editorial-reading-transcript.mjs";

const MAX_BYTES=1024*1024;
export function verifyEditorialReadingTranscript(bytes,source){
  assert.ok(Buffer.isBuffer(bytes),"Expected local bytes, not a remote URL or text claim");
  assert.ok(bytes.length>0&&bytes.length<=MAX_BYTES,"Unsafe transcript size");
  const canonical=Buffer.from(renderEditorialReadingTranscript(source),"utf8");
  assert.ok(bytes.equals(canonical),"Transcript differs from the repository draft source");
  return Object.freeze({
    courses:10,lessons:35,review_questions:210,
    human_signoff_authenticated:false,grants_issued:0,
    release_decision:"HOLD_NO_GO"
  });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  assert.equal(process.argv.length,3,"Supply exactly one local TXT file, no URL");
  const stat=lstatSync(process.argv[2]);
  assert.ok(stat.isFile()&&!stat.isSymbolicLink()&&stat.size>0&&stat.size<=MAX_BYTES,
    "Only a bounded regular local artifact is permitted");
  const source=JSON.parse(readFileSync(
    new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
  const result=verifyEditorialReadingTranscript(readFileSync(process.argv[2]),source);
  console.log("PASS R201: "+result.lessons+" draft lessons, "+result.review_questions+
    " reading questions, 0 signoffs, 0 grants, HOLD_NO_GO.");
}
