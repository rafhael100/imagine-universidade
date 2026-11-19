import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {lstat,readFile,readdir,writeFile} from "node:fs/promises";
import {dirname,join,resolve} from "node:path";

// ERD-R26: detect accidental corruption of an offline, UNSIGNED review handoff.
// Checksums are NOT signatures, reviewer identity or release authorization.
export const INTEGRITY_FILE="INTEGRIDADE-PACOTE.json";
const baseFiles=[
  "FILA-REVISAO-35.md","LEIA-PRIMEIRO.md","manifesto-revisao.json",
  "revisao-navegavel.html","revisao.csv"
];
const hash=value=>createHash("sha256").update(value).digest("hex");

async function requireRealDirectory(path){
  // Avoid resolving paths via a symlink in any ancestor, even if the final
  // directory itself is a real directory.
  for(let cursor=resolve(path);;cursor=dirname(cursor)){
    const stat=await lstat(cursor);
    assert.ok(stat.isDirectory()&&!stat.isSymbolicLink(),
      "Integrity path must contain only real directories");
    if(cursor===dirname(cursor))break;
  }
}
const ordered=items=>[...items].sort();

export async function calculateEditorialPackageIntegrity(directory,{sealed=false}={}){
  const root=resolve(directory);
  await requireRealDirectory(root);
  await requireRealDirectory(join(root,"cursos"));
  const top=await readdir(root);
  const expectedTop=ordered([...baseFiles,"cursos",...(sealed?[INTEGRITY_FILE]:[])]);
  assert.deepEqual(ordered(top),expectedTop,"Unexpected or missing package item");
  const manifestPath=join(root,"manifesto-revisao.json");
  // ERD-R29: never follow a substituted manifest symlink BEFORE validating it.
  // The later per-file lstat would be too late to prevent the first read.
  const manifestStat=await lstat(manifestPath);
  assert.ok(manifestStat.isFile()&&!manifestStat.isSymbolicLink(),
    "Source review manifest must be a regular non-symlink file");
  const sourceManifest=JSON.parse(await readFile(manifestPath,"utf8"));
  assert.equal(sourceManifest.schema_version,1);
  assert.equal(sourceManifest.source_path,"content/mvp-cursos-v1.json",
    "Review source path must be the pinned versioned curriculum");
  assert.equal(sourceManifest.status,"PENDING_HUMAN_REVIEW");
  assert.equal(sourceManifest.publishable,false);
  assert.equal(sourceManifest.course_count,10);
  assert.equal(sourceManifest.lesson_count,35);
  assert.match(sourceManifest.source_sha256,/^[a-f0-9]{64}$/u);
  assert.ok(Array.isArray(sourceManifest.courses)&&sourceManifest.courses.length===10);
  assert.ok(Array.isArray(sourceManifest.lessons)&&sourceManifest.lessons.length===35);
  // ERD-R30: a rehashed but internally contradictory review manifest must
  // never be accepted as a complete/pending handoff. An unsigned checksum
  // proves neither authorisation nor provenance; these are schema invariants.
  const coursePaths=[],courseSlugs=new Set(),lessonCounts=new Map();
  for(const [index,course] of sourceManifest.courses.entries()){
    assert.ok(typeof course.course_slug==="string"&&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(course.course_slug)&&course.course_slug.length<=120,
      "Invalid course identity in review manifest");
    assert.ok(!courseSlugs.has(course.course_slug),
      "Duplicate course identity in review manifest");
    courseSlugs.add(course.course_slug);
    lessonCounts.set(course.course_slug,0);
    assert.ok(typeof course.title==="string"&&course.title.trim().length>0,
      "Missing course title in review manifest");
    assert.ok(["metodologia","negocios","sistemas"].includes(course.category),
      "Unexpected course category in review manifest");
    assert.ok(Number.isInteger(course.lessons)&&course.lessons>=1&&course.lessons<=15,
      "Invalid course lesson count in review manifest");
    const relative=course.file;
    assert.ok(typeof relative==="string"&&
      /^cursos\/(?:0[1-9]|10)-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/u.test(relative),
      "Unsafe or unexpected course review path");
    assert.equal(relative,
      `cursos/${String(index+1).padStart(2,"0")}-${course.course_slug}.md`,
      "Course filename and numbered course identity disagree");
    coursePaths.push(relative);
  }
  assert.equal(new Set(coursePaths).size,10,"Duplicate course review file");
  const lessonIds=new Set();
  for(const lesson of sourceManifest.lessons){
    assert.ok(courseSlugs.has(lesson.course_slug),
      "Lesson references an unknown course");
    assert.ok(typeof lesson.lesson_slug==="string"&&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(lesson.lesson_slug)&&lesson.lesson_slug.length<=120,
      "Invalid lesson identity in review manifest");
    const id=lesson.course_slug+"/"+lesson.lesson_slug;
    assert.ok(!lessonIds.has(id),"Duplicate lesson identity in review manifest");
    lessonIds.add(id);
    assert.ok(typeof lesson.content_sha256==="string"&&
      /^[a-f0-9]{64}$/u.test(lesson.content_sha256),
      "Invalid immutable lesson checksum");
    assert.equal(lesson.review_status,"PENDING_HUMAN_REVIEW",
      "Lesson must await human review");
    assert.equal(lesson.reviewed_by,null,
      "Offline package must not claim a reviewer identity");
    assert.equal(lesson.review_evidence,null,
      "Offline package must not claim human approval evidence");
    lessonCounts.set(lesson.course_slug,lessonCounts.get(lesson.course_slug)+1);
  }
  for(const course of sourceManifest.courses){
    assert.equal(lessonCounts.get(course.course_slug),course.lessons,
      "Lesson counts disagree between course and lesson manifest");
  }
  const courseNames=await readdir(join(root,"cursos"));
  assert.deepEqual(ordered(courseNames),ordered(coursePaths.map(x=>x.slice("cursos/".length))),
    "Missing or unexpected course review file");
  const files=[];
  for(const relative of ordered([...baseFiles,...coursePaths])){
    const path=join(root,relative);
    const stat=await lstat(path);
    assert.ok(stat.isFile()&&!stat.isSymbolicLink(),
      "Review package file must be a regular, non-symlink file");
    const bytes=await readFile(path);
    files.push({path:relative,bytes:bytes.length,sha256:hash(bytes)});
  }
  if(sealed){
    const seal=await lstat(join(root,INTEGRITY_FILE));
    assert.ok(seal.isFile()&&!seal.isSymbolicLink(),
      "Integrity manifest must be a regular non-symlink file");
  }
  return {
    schema_version:1,
    purpose:"UNSIGNED_OFFLINE_EDITORIAL_HANDOFF",
    source_sha256:sourceManifest.source_sha256,
    publishable:false,
    release_decision:"HOLD_NO_GO",
    files
  };
}
export async function sealEditorialPackage(directory){
  const result=await calculateEditorialPackageIntegrity(directory);
  await writeFile(join(resolve(directory),INTEGRITY_FILE),
    JSON.stringify(result,null,2)+"\n",{encoding:"utf8",flag:"wx"});
  return result;
}
export async function verifyEditorialPackage(directory){
  const expected=await calculateEditorialPackageIntegrity(directory,{sealed:true});
  const stored=JSON.parse(await readFile(join(resolve(directory),INTEGRITY_FILE),"utf8"));
  assert.deepEqual(stored,expected,
    "Offline package differs from recorded checksums; preserve it and investigate");
  return expected;
}

// ERD-R28: optional cross-check against the versioned original source when
// its file is available (e.g. in CI/repo review). This is still NOT a signature.
export async function verifyEditorialSourceBinding(directory,sourceFile){
  const verified=await verifyEditorialPackage(directory);
  const absolute=resolve(sourceFile);
  await requireRealDirectory(dirname(absolute));
  const stat=await lstat(absolute);
  assert.ok(stat.isFile()&&!stat.isSymbolicLink(),
    "Original curriculum source must be a regular non-symlink file");
  const sourceBytes=await readFile(absolute);
  assert.equal(hash(sourceBytes),verified.source_sha256,
    "Original curriculum bytes differ from the package source SHA-256");
  // ERD-R32: hash equality alone does not prove that a review manifest's
  // individual lesson identities or hashes were derived from that source.
  // An unsigned pack can be rehashed after editing just its metadata.
  // With --source, recompute each course and lesson identity from the pinned
  // original bytes, including source order and the exact pedagogical body.
  assert.ok(!(sourceBytes[0]===0xEF&&sourceBytes[1]===0xBB&&sourceBytes[2]===0xBF),
    "Original curriculum source must not contain UTF-8 BOM");
  const source=JSON.parse(new TextDecoder("utf-8",{fatal:true,ignoreBOM:true})
    .decode(sourceBytes));
  assert.ok(Array.isArray(source.courses),"Original curriculum must list courses");
  const expectedCourses=source.courses.map((course,index)=>({
    course_slug:course.slug,
    title:course.title,
    category:course.category,
    lessons:course.lessons.length,
    file:`cursos/${String(index+1).padStart(2,"0")}-${course.slug}.md`
  }));
  const expectedLessons=source.courses.flatMap(course=>course.lessons.map(lesson=>({
    course_slug:course.slug,
    lesson_slug:lesson.slug,
    content_sha256:hash(JSON.stringify({
      course_slug:course.slug,course_title:course.title,category:course.category,
      lesson_slug:lesson.slug,lesson_title:lesson.title,body:lesson.body
    })),
    review_status:"PENDING_HUMAN_REVIEW",
    reviewed_by:null,
    review_evidence:null
  })));
  const manifestPath=join(resolve(directory),"manifesto-revisao.json");
  const manifestStat=await lstat(manifestPath);
  assert.ok(manifestStat.isFile()&&!manifestStat.isSymbolicLink(),
    "Source review manifest must remain a regular non-symlink file");
  const reviewManifest=JSON.parse(await readFile(manifestPath,"utf8"));
  assert.deepEqual(reviewManifest.courses,expectedCourses,
    "Review course metadata differs from versioned curriculum");
  assert.deepEqual(reviewManifest.lessons,expectedLessons,
    "Review lesson identities/checksums diverge from versioned curriculum");
  // ERD-R34: an internally rehashed CSV could masquerade as a reviewer
  // decision even while the JSON manifest still matches the source. The
  // original, *unedited* handoff must have one pending row per source lesson.
  const csvPath=join(resolve(directory),"revisao.csv");
  const csvStat=await lstat(csvPath);
  assert.ok(csvStat.isFile()&&!csvStat.isSymbolicLink(),
    "Review CSV must remain a regular non-symlink file");
  const csvField=value=>'"'+String(value).replaceAll('"','""')+'"';
  const expectedCsv=[
    ["course_slug","lesson_slug","content_sha256","review_status","reviewer","evidence_ref","notes"],
    ...expectedLessons.map(lesson=>[
      lesson.course_slug,lesson.lesson_slug,lesson.content_sha256,
      "PENDING_HUMAN_REVIEW","","",""
    ])
  ].map(row=>row.map(csvField).join(",")).join("\n")+"\n";
  assert.equal(await readFile(csvPath,"utf8"),expectedCsv,
    "Review CSV differs from original pending-only handoff");
  return verified;
}
