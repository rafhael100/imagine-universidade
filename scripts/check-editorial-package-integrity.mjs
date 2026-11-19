#!/usr/bin/env node
// ERD-R27: positive and negative checks for the byte-identical UNSIGNED pack.
// Uses only synthetic curriculum fixtures and disposable temporary directories.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
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
// ERD-R31: prove malformed editorial metadata is refused EVEN when an
// operator/attacker updates the UNSIGNED checksum record consistently.
// This is schema validation, not proof of the package's trusted origin.
async function clonedRehashedCase(name,modify,expectedError,{sourceBound=false,raw=false}={}){
  const folder=join(temp,"rehashed-"+name);
  await cp(original,folder,{recursive:true});
  const path=join(folder,"manifesto-revisao.json");
  const inputText=await readFile(path,"utf8");
  const manifest=JSON.parse(inputText);
  // ERD-R43: raw mutation can insert duplicate JSON keys or invalid BOM;
  // rehashing proves this is a schema refusal, not a checksum mismatch.
  const changedText=raw?modify(inputText):(modify(manifest),JSON.stringify(manifest,null,2)+"\n");
  const bytes=Buffer.from(changedText,"utf8");
  await writeFile(path,bytes);
  const integrityPath=join(folder,INTEGRITY_FILE);
  const integrity=JSON.parse(await readFile(integrityPath,"utf8"));
  const item=integrity.files.find(x=>x.path==="manifesto-revisao.json");
  assert.ok(item,"Integrity fixture must bind the review manifest");
  item.bytes=bytes.length;
  item.sha256=createHash("sha256").update(bytes).digest("hex");
  await writeFile(integrityPath,JSON.stringify(integrity,null,2)+"\n","utf8");
  if(sourceBound){
    // Integrity is self-consistent and well formed, but lesson metadata must
    // still match the exact versioned curriculum when --source is provided.
    const selfConsistent=await verifyEditorialPackage(folder);
    assert.equal(selfConsistent.files.length,15);
    await assert.rejects(
      verifyEditorialSourceBinding(folder,join(root,"content","mvp-cursos-v1.json")),
      expectedError,"Source binding must reject a rehashed fork: "+name);
  }else{
    await assert.rejects(verifyEditorialPackage(folder),expectedError,
      "A rehashed but contradictory manifest must be rejected: "+name);
  }
  negatives++;
}
// ERD-R44: the seal itself is unsigned, but must remain unambiguous.
async function clonedSealCase(name,mutate,expectedError){
  const folder=join(temp,"seal-"+name);
  await cp(original,folder,{recursive:true});
  const sealPath=join(folder,INTEGRITY_FILE);
  const originalText=await readFile(sealPath,"utf8");
  const changedText=mutate(originalText);
  assert.notEqual(changedText,originalText,"Seal mutation must change bytes");
  await writeFile(sealPath,changedText,"utf8");
  await assert.rejects(verifyEditorialPackage(folder),expectedError,
    "A rehashed or ambiguous integrity seal must be rejected: "+name);
  negatives++;
}
// ERD-R35/R38: amend an exported file, then update its UNSIGNED checksum.
// --dir detects no corruption, but --source must catch deviations from the
// current versioned curriculum and deterministic offline review UI.
async function clonedRehashedFileCase(name,relative,mutate,expectedError){
  const folder=join(temp,"rehashed-file-"+name);
  await cp(original,folder,{recursive:true});
  const target=join(folder,relative);
  const before=await readFile(target,"utf8");
  const after=mutate(before);
  assert.notEqual(after,before,"Test mutation must change file "+name);
  const bytes=Buffer.from(after,"utf8");
  await writeFile(target,bytes);
  const integrityPath=join(folder,INTEGRITY_FILE);
  const integrity=JSON.parse(await readFile(integrityPath,"utf8"));
  const row=integrity.files.find(x=>x.path===relative);
  assert.ok(row,"Checksum manifest must include "+relative);
  row.bytes=bytes.length;
  row.sha256=createHash("sha256").update(bytes).digest("hex");
  await writeFile(integrityPath,JSON.stringify(integrity,null,2)+"\n","utf8");
  assert.equal((await verifyEditorialPackage(folder)).files.length,15);
  await assert.rejects(
    verifyEditorialSourceBinding(folder,join(root,"content","mvp-cursos-v1.json")),
    expectedError,"Source binding must reject altered "+relative);
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
  // ERD-R29: the input manifest must be checked BEFORE reading its bytes.
  await clonedCase("symlink-source-manifest",async folder=>{
    const path=join(folder,"manifesto-revisao.json");
    await unlink(path);
    await symlink(join(folder,"LEIA-PRIMEIRO.md"),path);
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
  await clonedRehashedCase("source-path",m=>{m.source_path="content/other.json";},
    /Review source path/u);
  await clonedRehashedCase("duplicated-course-identity",m=>{
    m.courses[1].course_slug=m.courses[0].course_slug;
  },/Duplicate course identity/u);
  await clonedRehashedCase("course-filename-mismatch",m=>{
    m.courses[0].course_slug="plano-inventado";
  },/Course filename and numbered course identity disagree/u);
  await clonedRehashedCase("invalid-course-category",m=>{
    m.courses[0].category="university_approved";
  },/Unexpected course category/u);
  await clonedRehashedCase("course-lesson-count",m=>{
    m.courses[0].lessons++;
  },/Lesson counts disagree/u);
  await clonedRehashedCase("duplicated-lesson-identity",m=>{
    m.lessons[1].course_slug=m.lessons[0].course_slug;
    m.lessons[1].lesson_slug=m.lessons[0].lesson_slug;
  },/Duplicate lesson identity/u);
  await clonedRehashedCase("unknown-lesson-course",m=>{
    m.lessons[0].course_slug="inexistente";
  },/Lesson references an unknown course/u);
  await clonedRehashedCase("fake-human-approval",m=>{
    m.lessons[0].review_status="APPROVED";
  },/Lesson must await human review/u);
  await clonedRehashedCase("fake-reviewer-identity",m=>{
    m.lessons[0].reviewed_by="editor@example.invalid";
  },/must not claim a reviewer identity/u);
  await clonedRehashedCase("fake-approval-evidence",m=>{
    m.lessons[0].review_evidence="fake-signoff";
  },/must not claim human approval evidence/u);
  // ERD-R33: these are valid-looking rehashed manifests. They pass --dir,
  // but must fail the stronger --source comparison against canonical bytes.
  await clonedRehashedCase("source-course-title",m=>{
    m.courses[0].title="Título fictício adulterado";
  },/Review course metadata differs/u,{sourceBound:true});
  await clonedRehashedCase("source-lesson-hash",m=>{
    m.lessons[0].content_sha256="f".repeat(64);
  },/Review lesson identities\/checksums diverge/u,{sourceBound:true});
  await clonedRehashedCase("source-lesson-identity",m=>{
    m.lessons[0].lesson_slug="identidade-ficticia";
  },/Review lesson identities\/checksums diverge/u,{sourceBound:true});
  await clonedRehashedCase("source-lesson-order",m=>{
    [m.lessons[0],m.lessons[1]]=[m.lessons[1],m.lessons[0]];
  },/Review lesson identities\/checksums diverge/u,{sourceBound:true});
  await clonedRehashedFileCase("fake-approval","revisao.csv",csv=>
    csv.replace('"PENDING_HUMAN_REVIEW"','"APPROVED"'),/Review CSV differs from original pending-only handoff/u);
  await clonedRehashedFileCase("fake-reviewer","revisao.csv",csv=>
    csv.replace('"PENDING_HUMAN_REVIEW","","",""',
      '"PENDING_HUMAN_REVIEW","fake-reviewer","",""'),/Review CSV differs from original pending-only handoff/u);
  await clonedRehashedFileCase("fake-hash","revisao.csv",csv=>
    csv.replace(/"[a-f0-9]{64}"/u,'"'+("f".repeat(64))+'"'),/Review CSV differs from original pending-only handoff/u);
  await clonedRehashedFileCase("additional-row","revisao.csv",csv=>
    csv+'"unexpected","row","0","APPROVED","fake","",""\n',/Review CSV differs from original pending-only handoff/u);
  await clonedRehashedFileCase("offline-active-script","revisao-navegavel.html",html=>
    html.replace("</body>","<script>alert('fake-approval')</script></body>"),
    /Offline review HTML differs from versioned source and UI/u);
  await clonedRehashedFileCase("offline-misleading-title","revisao-navegavel.html",html=>
    html.replace("Revisão editorial offline","Revisão editorial aprovada"),
    /Offline review HTML differs from versioned source and UI/u);
  await clonedRehashedFileCase("queue-no-go", "FILA-REVISAO-35.md",md=>
    md.replace("HOLD_NO_GO","LIBERADO"),
    /Offline editorial queue differs from versioned source/u);
  await clonedRehashedFileCase("queue-fake-status", "FILA-REVISAO-35.md",md=>
    md.replace("PENDING_HUMAN_REVIEW","APPROVED"),
    /Offline editorial queue differs from versioned source/u);
  // ERD-R41: a root-level 'release decision' can be forged while the
  // checksums and nested course/lesson metadata remain otherwise correct.
  // ERD-R42: these three spoofed approval keys used to pass --dir, only
  // failing the optional --source. Fail closed at the basic schema boundary.
  await clonedRehashedCase("source-fake-go",m=>{
    m.release_decision="GO";
  },/Unexpected review manifest fields/u);
  await clonedRehashedCase("source-fake-approval",m=>{
    m.editorial_signoff="approved-by-example";
  },/Unexpected review manifest fields/u);
  await clonedRehashedCase("source-unknown-root-key",m=>{
    m.release_authorized_at="2026-11-19";
  },/Unexpected review manifest fields/u);
  await clonedRehashedCase("extra-course-published-flag",m=>{
    m.courses[0].publishable=true;
  },/Unexpected course review manifest fields/u);
  await clonedRehashedCase("extra-lesson-approval",m=>{
    m.lessons[0].approved=true;
  },/Unexpected lesson review manifest fields/u);
  // ERD-R43: JSON.parse alone keeps the last duplicate key; a second parser
  // could show the earlier 'APPROVED' or 'publishable: true' value.
  await clonedRehashedCase("duplicate-publishable-key",rawText=>
    rawText.replace('"publishable": false,',
      '"publishable": true,\n  "publishable": false,'),
    /Review manifest must be canonical JSON without duplicate keys/u,{raw:true});
  await clonedRehashedCase("duplicate-lesson-review-key",rawText=>
    rawText.replace('"review_status": "PENDING_HUMAN_REVIEW",',
      '"review_status": "APPROVED",\n      "review_status": "PENDING_HUMAN_REVIEW",'),
    /Review manifest must be canonical JSON without duplicate keys/u,{raw:true});
  await clonedRehashedCase("extra-trailing-newline",rawText=>rawText+"\n",
    /Review manifest must be canonical JSON without duplicate keys/u,{raw:true});
  await clonedRehashedCase("source-manifest-bom",rawText=>"\uFEFF"+rawText,
    /Review manifest must not contain UTF-8 BOM/u,{raw:true});
  // ERD-R44: a seal with two 'release_decision' members cannot pass --dir.
  await clonedSealCase("duplicate-release-decision",rawText=>
    rawText.replace('"release_decision": "HOLD_NO_GO",',
      '"release_decision": "GO",\n  "release_decision": "HOLD_NO_GO",'),
    /Integrity manifest must be canonical JSON without duplicate keys/u);
  await clonedSealCase("noncanonical-seal-whitespace",rawText=>rawText+"\n",
    /Integrity manifest must be canonical JSON without duplicate keys/u);
  await clonedSealCase("seal-with-bom",rawText=>"\uFEFF"+rawText,
    /Integrity manifest must not contain UTF-8 BOM/u);
  // ERD-R39/R40: every rehashed human-facing document must still match
  // the exact versioned curriculum and renderer when --source is provided.
  await clonedRehashedFileCase("course-fake-approval",baseline.files.find(x=>x.path.startsWith("cursos/")).path,md=>
    md.replace("status PENDENTE","status APROVADO"),
    /Course review Markdown differs from versioned source/u);
  await clonedRehashedFileCase("course-added-passage",baseline.files.find(x=>x.path.startsWith("cursos/")).path,md=>
    md+"\n## Conteúdo fictício não revisado\n",
    /Course review Markdown differs from versioned source/u);
  await clonedRehashedFileCase("readme-fake-release","LEIA-PRIMEIRO.md",md=>
    md.replace("NÃO É APROVAÇÃO NEM PUBLICAÇÃO","APROVADO PARA PUBLICAÇÃO"),
    /Review instructions differ from versioned source/u);
  await clonedRehashedFileCase("readme-fake-source","LEIA-PRIMEIRO.md",md=>
    md.replace(baseline.source_sha256,"f".repeat(64)),
    /Review instructions differ from versioned source/u);
  assert.equal(negatives,54);
  console.log("PASS ERD-R42-R44: original 15-file package verified; "+negatives+
    " tamper/path/symlink negatives; UNSIGNED/HOLD_NO_GO, no human approval.");
}finally{
  await rm(temp,{recursive:true,force:true});
}
