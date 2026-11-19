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
  const sourceManifest=JSON.parse(await readFile(manifestPath,"utf8"));
  assert.equal(sourceManifest.schema_version,1);
  assert.equal(sourceManifest.status,"PENDING_HUMAN_REVIEW");
  assert.equal(sourceManifest.publishable,false);
  assert.equal(sourceManifest.course_count,10);
  assert.equal(sourceManifest.lesson_count,35);
  assert.match(sourceManifest.source_sha256,/^[a-f0-9]{64}$/u);
  assert.ok(Array.isArray(sourceManifest.courses)&&sourceManifest.courses.length===10);
  assert.ok(Array.isArray(sourceManifest.lessons)&&sourceManifest.lessons.length===35);
  const coursePaths=[];
  for(const course of sourceManifest.courses){
    const relative=course.file;
    assert.ok(typeof relative==="string"&&
      /^cursos\/(?:0[1-9]|10)-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/u.test(relative),
      "Unsafe or unexpected course review path");
    coursePaths.push(relative);
  }
  assert.equal(new Set(coursePaths).size,10,"Duplicate course review file");
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
  assert.equal(hash(await readFile(absolute)),verified.source_sha256,
    "Original curriculum bytes differ from the package source SHA-256");
  return verified;
}
