#!/usr/bin/env node
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {lstat,mkdtemp,readFile,readdir,rm,symlink,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

const repoRoot=fileURLToPath(new URL("../",import.meta.url));
const sourcePath=fileURLToPath(new URL("../content/mvp-cursos-v1.json",import.meta.url));
const source=await readFile(sourcePath,"utf8");
const sourceHash=createHash("sha256").update(source).digest("hex");
const manifest=JSON.parse(source);
const tmp=await mkdtemp(join(tmpdir(),"uni-editorial-draft-review-"));
try{
  const exec=spawnSync(process.execPath,[
    fileURLToPath(new URL("./build-editorial-review-pack.mjs",import.meta.url)),
    "--out",tmp
  ],{encoding:"utf8",cwd:repoRoot,env:{...process.env,NODE_ENV:"test"}});
  assert.equal(exec.status,0,exec.stderr||exec.stdout);
  const produced=JSON.parse(await readFile(join(tmp,"manifesto-revisao.json"),"utf8"));
  assert.equal(produced.schema_version,1);
  assert.equal(produced.source_sha256,sourceHash);
  assert.equal(produced.status,"PENDING_HUMAN_REVIEW");
  assert.equal(produced.publishable,false);
  assert.equal(produced.course_count,10);
  assert.equal(produced.lesson_count,35);
  assert.equal(produced.lessons.length,35);
  assert.equal(produced.courses.length,10);
  const index=await readFile(join(tmp,"LEIA-PRIMEIRO.md"),"utf8");
  assert.match(index,/NÃO É APROVAÇÃO NEM PUBLICAÇÃO/);
  assert.match(index,/HOLD_NO_GO/);
  assert.ok(index.includes(sourceHash),"index must identify the complete source revision");
  const files=await readdir(join(tmp,"cursos"));
  assert.equal(files.length,10);
  const expected=new Map(manifest.courses.map(c=>[c.slug,c]));
  const found=new Set();
  const IDs=new Set();
  for(const record of produced.lessons){
    assert.equal(record.review_status,"PENDING_HUMAN_REVIEW");
    assert.equal(record.reviewed_by,null);
    assert.equal(record.review_evidence,null);
    const course=expected.get(record.course_slug);
    assert.ok(course,"unknown course in review manifest");
    const lesson=course.lessons.find(l=>l.slug===record.lesson_slug);
    assert.ok(lesson,"unknown lesson in review manifest");
    const key=record.course_slug+"/"+record.lesson_slug;
    assert.ok(!IDs.has(key),"duplicate identity in review manifest");
    IDs.add(key);
    const digest=createHash("sha256").update(JSON.stringify({
      course_slug:course.slug,course_title:course.title,category:course.category,
      lesson_slug:lesson.slug,lesson_title:lesson.title,body:lesson.body,
    })).digest("hex");
    assert.equal(record.content_sha256,digest,"human sign-off must be tied to exact content");
  }
  for(const record of produced.courses){
    assert.ok(!found.has(record.course_slug));
    found.add(record.course_slug);
    assert.ok(files.includes(record.file.split("/").at(-1)));
    const file=await readFile(join(tmp,record.file),"utf8");
    const course=expected.get(record.course_slug);
    assert.equal(record.lessons,course.lessons.length);
    for(const lesson of course.lessons){
      assert.ok(file.includes(lesson.body.trim()),"full original lesson body must be present");
      assert.ok(file.includes(lesson.title),"lesson title must be present");
      const entry=produced.lessons.find(x=>x.course_slug===course.slug&&x.lesson_slug===lesson.slug);
      assert.ok(file.includes(entry.content_sha256),"reviewer must see exact lesson hash");
    }
    assert.match(file,/Aprovação humana registrada fora deste arquivo/);
  }
  const csv=await readFile(join(tmp,"revisao.csv"),"utf8");
  assert.equal(csv.trim().split("\n").length,36,"exactly one row per lesson plus header");
  assert.equal((csv.match(/PENDING_HUMAN_REVIEW/g)||[]).length,35);
  assert.ok(!(csv.includes("VERIFIED")||csv.includes("APPROVED")),"package cannot grant an approval");
  assert.equal(createHash("sha256").update(await readFile(sourcePath,"utf8")).digest("hex"),
    sourceHash,"generator may never modify original editorial fixture");
  // C181: reopening the same output path must refuse to overwrite actual
  // human work instead of resetting every status to PENDING.
  const editedCsv=csv.replace('"PENDING_HUMAN_REVIEW"','"NEEDS_CHANGES"');
  assert.notEqual(editedCsv,csv,"The human-draft sentinel must change the CSV");
  await writeFile(join(tmp,"revisao.csv"),editedCsv,"utf8");
  const accidentalRebuild=spawnSync(process.execPath,[
    fileURLToPath(new URL("./build-editorial-review-pack.mjs",import.meta.url)),
    "--out",tmp
  ],{encoding:"utf8",cwd:repoRoot,env:{...process.env,NODE_ENV:"test"}});
  assert.notEqual(accidentalRebuild.status,0,"An existing review package must never be overwritten");
  assert.match(accidentalRebuild.stderr,/destination must be empty/u);
  assert.equal(await readFile(join(tmp,"revisao.csv"),"utf8"),editedCsv,
    "Accidental rebuild must preserve the human CSV byte-for-byte");
  assert.equal(await readFile(join(tmp,"LEIA-PRIMEIRO.md"),"utf8"),index,
    "Refused rebuild must preserve the existing handoff document");
  // C187: a symlink in an ancestor of a not-yet-created output path is
  // just as dangerous as a symlink at the final output path itself.
  const alias=join(tmp,"atalho-para-cursos");
  await symlink(join(tmp,"cursos"),alias,"dir");
  const fakeDest=join(alias,"pacote-inesperado");
  const linkedBuild=spawnSync(process.execPath,[
    fileURLToPath(new URL("./build-editorial-review-pack.mjs",import.meta.url)),
    "--out",fakeDest
  ],{encoding:"utf8",cwd:repoRoot,env:{...process.env,NODE_ENV:"test"}});
  assert.notEqual(linkedBuild.status,0,"Symlink parent must fail before mkdir");
  assert.match(linkedBuild.stderr,/symlink ancestor/u);
  await assert.rejects(lstat(join(tmp,"cursos","pacote-inesperado")),
    {code:"ENOENT"},"No output folder may be created through the symlink");
  console.log("PASS editorial review pack QA: 10 files, all 35 complete bodies, immutable hashes, no self-approval or accidental overwrite.");
}finally{
  await rm(tmp,{recursive:true,force:true});
}
