#!/usr/bin/env node
/** UNI ERD-R120/R121: synthetic 35-lesson review bundle, never editorial signoff. */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync, lstatSync, openSync, closeSync, fstatSync, constants} from "node:fs";
import {resolve,join} from "node:path";
import {pathToFileURL} from "node:url";
import {TextDecoder} from "node:util";
import {buildEditorialReviewPriority,renderReviewPriorityMarkdown}
  from "./build-editorial-review-priority.mjs";
import {renderReviewPriorityHtml} from "./render-editorial-priority-html.mjs";
import {verifyReviewHandoffArtifact} from "./verify-editorial-review-handoff.mjs";

const formats=Object.freeze(["json","markdown","html"]);
export const fileNames=Object.freeze({json:"report.json",markdown:"report.md",html:"report.html"});
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
const versionedSource=()=>readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url));

export function buildReviewBundle(sourceBytes){
  assert.ok(Buffer.isBuffer(sourceBytes)&&sourceBytes.length>0&&sourceBytes.length<=2*1024*1024,
    "Fixture source must be 1..2MiB of bytes");
  const source=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(sourceBytes));
  const report=buildEditorialReviewPriority(source);
  const artifacts={
    json:Buffer.from(JSON.stringify(report,null,2)+"\n","utf8"),
    markdown:Buffer.from(renderReviewPriorityMarkdown(report),"utf8"),
    html:Buffer.from(renderReviewPriorityHtml(report),"utf8")
  };
  for(const format of formats)verifyReviewHandoffArtifact(artifacts[format],source,format);
  const manifest={
    schema_version:1,scope:"SYNTHETIC_35_DRAFT_LESSONS",
    source_path:"content/mvp-cursos-v1.json",source_bytes:sourceBytes.length,
    source_sha256:sha256(sourceBytes),total_lessons:35,human_rubric_checks:210,
    human_signoff_authenticated:false,grants_issued:0,release_decision:"HOLD_NO_GO",
    artifacts:formats.map(format=>({
      format,file:fileNames[format],bytes:artifacts[format].length,
      sha256:sha256(artifacts[format])
    }))
  };
  return {manifest,artifacts,manifestBytes:Buffer.from(JSON.stringify(manifest,null,2)+"\n")};
}

export function verifyReviewBundle(sourceBytes,manifestBytes,artifacts){
  assert.ok(Buffer.isBuffer(manifestBytes)&&manifestBytes.length>0&&
    manifestBytes.length<=16*1024,"Missing or oversized manifest");
  assert.ok(artifacts&&typeof artifacts==="object"&&!Array.isArray(artifacts));
  assert.deepEqual(Object.keys(artifacts).sort(),[...formats].sort(),
    "Bundle must have precisely JSON, Markdown and HTML");
  const canonical=buildReviewBundle(sourceBytes);
  assert.ok(manifestBytes.equals(canonical.manifestBytes),
    "Manifest differs from canonical synthetic source");
  for(const format of formats){
    const actual=artifacts[format];
    assert.ok(Buffer.isBuffer(actual)&&actual.length>0&&actual.length<=1024*1024);
    assert.ok(actual.equals(canonical.artifacts[format]),"Stale or altered "+format+" report");
  }
  return {provenance:"SYNTHETIC_SOURCE_BOUND_ONLY",lessons:35,
    formats:3,human_rubric_checks:210,human_signoff_authenticated:false,
    grants_issued:0,release_decision:"HOLD_NO_GO",
    source_sha256:canonical.manifest.source_sha256};
}

function readBoundedFile(directory,name,maxBytes){
  const path=join(directory,name);
  const stat=lstatSync(path);
  assert.ok(stat.isFile()&&!stat.isSymbolicLink(),"Bundle entries must be regular files: "+name);
  const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
    const realStat=fstatSync(fd);
    assert.ok(realStat.isFile()&&realStat.size>0&&realStat.size<=maxBytes,
      "Invalid file size/type: "+name);
    const data=readFileSync(fd);
    assert.equal(data.length,realStat.size,"File changed during read: "+name);
    return data;
  }finally{closeSync(fd);}
}

export function verifyBundleDirectory(directory){
  assert.equal(typeof directory,"string");
  const path=resolve(directory);
  const stat=lstatSync(path);
  assert.ok(stat.isDirectory()&&!stat.isSymbolicLink(),"Bundle directory must not be symlink");
  const manifest=readBoundedFile(path,"manifest.json",16*1024);
  const artifacts=Object.fromEntries(
    Object.entries(fileNames).map(([format,name])=>[format,readBoundedFile(path,name,1024*1024)]));
  return verifyReviewBundle(versionedSource(),manifest,artifacts);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  assert.ok(process.argv.length===2||process.argv.length===3,
    "Usage: node scripts/editorial-review-bundle.mjs [BUNDLE_DIRECTORY]");
  if(process.argv.length===2)process.stdout.write(buildReviewBundle(versionedSource()).manifestBytes);
  else process.stdout.write(JSON.stringify(verifyBundleDirectory(process.argv[2]))+"\n");
}
