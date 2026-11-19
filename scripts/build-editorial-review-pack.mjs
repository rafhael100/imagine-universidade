#!/usr/bin/env node
/**
 * Produces a human-review work package from the CURRENT University lesson
 * source. It NEVER publishes, imports, changes SQL, signs off or grants access.
 *
 * node scripts/build-editorial-review-pack.mjs --out /temporary/path
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {lstat,mkdir,readFile,readdir,writeFile} from "node:fs/promises";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {renderOfflineReviewPage} from "./editorial-review-html.mjs";
import {safeBody, safeLine} from "./editorial-text-safety.mjs";
import {auditEditorialLessonStructure} from "./audit-editorial-lesson-structure.mjs";
import {buildEditorialReviewQueue} from "./build-editorial-review-queue.mjs";
import {sealEditorialPackage} from "./editorial-package-integrity.mjs";
import {renderEditorialCourseMarkdown,renderEditorialReadme} from "./editorial-source-review-render.mjs";

const sha256 = data => createHash("sha256").update(data).digest("hex");
const sourceFile = fileURLToPath(new URL("../content/mvp-cursos-v1.json",import.meta.url));
const args=process.argv.slice(2);
assert.equal(args.length,2,"Usage: --out <explicit temporary directory>");
assert.equal(args[0],"--out","Missing --out");
assert.ok(typeof args[1]==="string"&&args[1].trim()!=="","Missing output path");
const dest=resolve(args[1]);
// C187: reject a linked ancestor BEFORE mkdir(). Checking only the final
// destination is insufficient: /tmp/link-to-other-directory/new-package
// otherwise writes outside the path an operator believes they selected.
async function assertNoLinkedAncestors(path){
  for(let cursor=path;;cursor=dirname(cursor)){
    try{
      const stat=await lstat(cursor);
      assert.ok(!stat.isSymbolicLink(),
        "Review package destination path has a symlink ancestor");
      assert.ok(stat.isDirectory(),
        "Review package destination path has a non-directory ancestor");
    }catch(error){
      if(error?.code!=="ENOENT")throw error;
    }
    if(cursor===dirname(cursor))break;
  }
}
await assertNoLinkedAncestors(dest);
// A second run must never destroy an editor's CSV, observations or evidence.
// Accept a fresh destination or an existing EMPTY, non-symlink directory.
await mkdir(dest,{recursive:true});
const destinationStat=await lstat(dest);
assert.ok(destinationStat.isDirectory()&&!destinationStat.isSymbolicLink(),
  "Review package destination must be a real directory, not a symlink");
assert.deepEqual(await readdir(dest),[],
  "Review package destination must be empty to preserve existing reviews");
// ERD-R16: fs.readFile(..., "utf8") silently replaces damaged UTF-8 with
// U+FFFD. Never publish a human-review package from silently corrupted bytes.
// Decode strictly before hashing or parsing the versioned curriculum source.
// The source SHA in the manifest promises identity with the exact bytes on
// disk. TextDecoder normally strips UTF-8 BOM, which would produce a different
// digest while still permitting the package to be built from altered bytes.
// Refuse BOM instead of silently normalizing the source before hashing.
const sourceBytes=await readFile(sourceFile);
assert.ok(!(sourceBytes[0]===0xEF && sourceBytes[1]===0xBB && sourceBytes[2]===0xBF),
  "Review source must not contain UTF-8 BOM");
const source=new TextDecoder("utf-8",{fatal:true,ignoreBOM:true}).decode(sourceBytes);
const payload=JSON.parse(source);
assert.equal(payload.schema_version,1);
assert.equal(payload.status,"editorial_draft");
assert.equal(payload.audience,"authorized_imagine_clients_only");
assert.equal(payload.courses.length,10);

function safeSlug(v){
  assert.ok(typeof v==="string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) && v.length<=120,
    "Unsafe course or lesson slug");
  return v;
}
// ERD-R14: validate the ENTIRE late-source lesson list before creating any
// course file. A malicious or broken last lesson must not leave a misleading
// partial package with earlier courses rendered successfully.
function preflightReviewSource(courses){
  const courseIds=new Set(), lessonIds=new Set();
  let total=0;
  for(const course of courses){
    const courseSlug=safeSlug(course.slug);
    assert.ok(!courseIds.has(courseSlug),"Duplicate course slug");
    courseIds.add(courseSlug);
    safeLine(course.title);
    assert.ok(["metodologia","negocios","sistemas"].includes(course.category));
    assert.ok(Array.isArray(course.lessons)&&course.lessons.length>=1&&course.lessons.length<=15,
      "Invalid lesson count");
    for(const lesson of course.lessons){
      const id=courseSlug+"/"+safeSlug(lesson.slug);
      assert.ok(!lessonIds.has(id),"Duplicate course+lesson identity");
      lessonIds.add(id);
      safeLine(lesson.title);
      safeBody(lesson.body);
      total++;
    }
  }
  assert.equal(total,35,"Expected exactly 35 existing drafts");
}
// ERD-R22: run the complete curriculum audit in the generator itself.
 // Previously a direct invocation could produce a review package despite a
 // one-word final section (the total lesson still exceeded 95 words).
 // Check every lesson before emitting any output file.
 const structuralAudit=auditEditorialLessonStructure(payload);
 assert.equal(structuralAudit.structured_sections,140);
 assert.equal(structuralAudit.release_decision,"HOLD_NO_GO");
 preflightReviewSource(payload.courses);

const indexes=[],reviewRows=[],hashes=[],seenCourse=new Set(),seenLesson=new Set();
const lessonsDir=resolve(dest,"cursos");
await mkdir(lessonsDir,{recursive:true});
let lessonCount=0;
for(const [courseIndex,course] of payload.courses.entries()){
  const courseSlug=safeSlug(course.slug);
  assert.ok(!seenCourse.has(courseSlug),"Duplicate course slug");
  seenCourse.add(courseSlug);
  const rendered=renderEditorialCourseMarkdown(course,courseIndex);
  for(const entry of rendered.hashes){
    const fullId=entry.course_slug+"/"+entry.lesson_slug;
    assert.ok(!seenLesson.has(fullId),"Duplicate course+lesson identity");
    seenLesson.add(fullId);
    hashes.push(entry);
  }
  reviewRows.push(...rendered.reviewRows);
  lessonCount+=rendered.hashes.length;
  const filename=String(courseIndex+1).padStart(2,"0")+"-"+courseSlug+".md";
  await writeFile(resolve(lessonsDir,filename),rendered.markdown,"utf8");
  indexes.push({course_slug:courseSlug,title:course.title,category:course.category,
    lessons:course.lessons.length,file:"cursos/"+filename});
}
assert.equal(lessonCount,35,"Expected exactly 35 existing drafts");
const sourceHash=sha256(sourceBytes);
// ERD-R25: deliver the prioritised, non-authorising review checklist in the
// same human handoff as the CSV and offline HTML. No network or customer data.
const reviewQueue=buildEditorialReviewQueue(payload,sourceBytes);
assert.equal(reviewQueue.source_sha256,sourceHash);
assert.equal(reviewQueue.queue.length,35);
assert.equal(reviewQueue.release_decision,"HOLD_NO_GO");
const doc=renderEditorialReadme(indexes,sourceHash);
await writeFile(resolve(dest,"LEIA-PRIMEIRO.md"),doc,"utf8");
await writeFile(resolve(dest,"FILA-REVISAO-35.md"),reviewQueue.markdown,"utf8");
function csvField(v){
  return '"'+String(v).replaceAll('"','""')+'"';
}
const csv=[
  ["course_slug","lesson_slug","content_sha256","review_status","reviewer","evidence_ref","notes"],
  ...reviewRows
].map(row=>row.map(csvField).join(",")).join("\n")+"\n";
await writeFile(resolve(dest,"revisao.csv"),csv,"utf8");
await writeFile(resolve(dest,"revisao-navegavel.html"),renderOfflineReviewPage(payload,hashes),"utf8");
const machine={schema_version:1,source_path:"content/mvp-cursos-v1.json",
  source_sha256:sourceHash,status:"PENDING_HUMAN_REVIEW",publishable:false,
  course_count:indexes.length,lesson_count:lessonCount,courses:indexes,lessons:hashes};
await writeFile(resolve(dest,"manifesto-revisao.json"),JSON.stringify(machine,null,2)+"\n","utf8");
// ERD-R26: record byte-level checksums of the complete UNSIGNED offline handoff.
// A checksum is corruption detection, NOT an authenticated human approval.
await sealEditorialPackage(dest);
console.log("PASS editorial handoff: 10 courses/35 full-text lessons; per-lesson content hashes, pending human review, no publication.");
