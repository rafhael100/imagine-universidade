#!/usr/bin/env node
// ERD-R27: positive and negative checks for the byte-identical UNSIGNED pack.
// Uses only synthetic curriculum fixtures and disposable temporary directories.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {cp,mkdtemp,readFile,rm,symlink,unlink,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {INTEGRITY_FILE,verifyEditorialPackage,verifyEditorialSourceBinding} from "./editorial-package-integrity.mjs";

const root=fileURLToPath(new URL("../",import.meta.url));
const executable=fileURLToPath(new URL("./build-editorial-review-pack.mjs",import.meta.url));
const temp=await mkdtemp(join(tmpdir(),"uni-integrity-r27-"));
let negatives=0;
const original=join(temp,"original");
async function clonedCase(name,change){
  const folder=join(temp,"mutated-"+name);
  await cp(original,folder,{recursive:true});
  await change(folder);
  await assert.rejects(verifyEditorialPackage(folder),undefined,
    "Integrity must reject mutation "+name);
  negatives++;
}
try{
  const run=spawnSync(process.execPath,[executable,"--out",original],{
    encoding:"utf8",cwd:root,timeout:30000,env:{...process.env,NODE_ENV:"test"}
  });
  assert.equal(run.status,0,run.stderr||run.stdout);
  const baseline=await verifyEditorialPackage(original);
  assert.equal(baseline.files.length,15,"10 course files + 5 package files");
  assert.equal(baseline.publishable,false);
  assert.equal(baseline.release_decision,"HOLD_NO_GO");
  assert.equal(baseline.purpose,"UNSIGNED_OFFLINE_EDITORIAL_HANDOFF");
  assert.equal(new Set(baseline.files.map(x=>x.path)).size,15);
  // ERD-R28: protect against a stale/altered source revision even when the
  // exported handoff itself still matches its own unsigned checksums.
  const originalSource=join(root,"content","mvp-cursos-v1.json");
  await verifyEditorialSourceBinding(original,originalSource);
  const changedSource=join(temp,"changed-source.json");
  const sourceBytes=await readFile(originalSource);
  await writeFile(changedSource,Buffer.concat([sourceBytes,Buffer.from("\n")]));
  await assert.rejects(verifyEditorialSourceBinding(original,changedSource),
    /Original curriculum bytes differ/u);
  negatives++;
  const sourceAlias=join(temp,"linked-source.json");
  await symlink(originalSource,sourceAlias);
  await assert.rejects(verifyEditorialSourceBinding(original,sourceAlias),
    /non-symlink/u);
  negatives++;
  for(const name of ["revisao.csv","revisao-navegavel.html","FILA-REVISAO-35.md"]){
    await clonedCase(name.replace(/\W/gu,"-"),async folder=>{
      const target=join(folder,name);
      await writeFile(target,Buffer.concat([await readFile(target),Buffer.from("\nMUTACAO-TESTE")]));
    });
  }
  await clonedCase("course",async folder=>{
    const name=baseline.files.find(x=>x.path.startsWith("cursos/")).path;
    await writeFile(join(folder,name),"Texto corrompido","utf8");
  });
  await clonedCase("manifest-source",async folder=>{
    const file=join(folder,"manifesto-revisao.json");
    const manifest=JSON.parse(await readFile(file,"utf8"));
    manifest.source_sha256="0".repeat(64);
    await writeFile(file,JSON.stringify(manifest),"utf8");
  });
  await clonedCase("missing-csv",async folder=>unlink(join(folder,"revisao.csv")));
  await clonedCase("extra-file",async folder=>writeFile(join(folder,"INSTRUCOES-FALSAS.txt"),"forjado"));
  await clonedCase("tampered-checksum",async folder=>{
    const file=join(folder,INTEGRITY_FILE);
    const manifest=JSON.parse(await readFile(file,"utf8"));
    manifest.files[0].sha256="f".repeat(64);
    await writeFile(file,JSON.stringify(manifest),"utf8");
  });
  await clonedCase("traversal",async folder=>{
    const file=join(folder,"manifesto-revisao.json");
    const manifest=JSON.parse(await readFile(file,"utf8"));
    manifest.courses[0].file="cursos/../../fora.md";
    await writeFile(file,JSON.stringify(manifest),"utf8");
  });
  await clonedCase("symlink-course",async folder=>{
    const name=baseline.files.find(x=>x.path.startsWith("cursos/")).path;
    await unlink(join(folder,name));
    await symlink(join(folder,"LEIA-PRIMEIRO.md"),join(folder,name));
  });
  await clonedCase("symlink-manifest",async folder=>{
    const path=join(folder,INTEGRITY_FILE);
    await unlink(path);
    await symlink(join(folder,"manifesto-revisao.json"),path);
  });
  await clonedCase("duplicated-file-path",async folder=>{
    const file=join(folder,"manifesto-revisao.json");
    const manifest=JSON.parse(await readFile(file,"utf8"));
    manifest.courses[1].file=manifest.courses[0].file;
    await writeFile(file,JSON.stringify(manifest),"utf8");
  });
  // A linked ancestor is unsafe even if the final directory is real.
  const linked=join(temp,"link");
  await symlink(original,linked,"dir");
  await assert.rejects(verifyEditorialPackage(linked));
  negatives++;
  assert.equal(negatives,15);
  console.log("PASS ERD-R27: original 15-file package verified; "+negatives+
    " tamper/path/symlink negatives; UNSIGNED/HOLD_NO_GO, no human approval.");
}finally{
  await rm(temp,{recursive:true,force:true});
}
