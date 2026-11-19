#!/usr/bin/env node
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

const root=fileURLToPath(new URL("../",import.meta.url));
const source=JSON.parse(await readFile(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const temp=await mkdtemp(join(tmpdir(),"uni-editorial-preflight-"));
const scripts=["build-editorial-review-pack.mjs","editorial-review-html.mjs",
  "editorial-review-app.js","editorial-text-safety.mjs"];
let scenarios=0;
try{
  await mkdir(join(temp,"scripts"));
  await mkdir(join(temp,"content"));
  for(const file of scripts)
    await copyFile(join(root,"scripts",file),join(temp,"scripts",file));
  const lastCourse=(d)=>d.courses.at(-1);
  const lastLesson=(d)=>lastCourse(d).lessons.at(-1);
  const probes=[
    ["last lesson bidi body",d=>{
      const l=lastLesson(d);l.body=l.body.slice(0,30)+String.fromCodePoint(0x202e)+l.body.slice(30);
    }],
    ["last course C1 title",d=>{
      lastCourse(d).title+=" "+String.fromCodePoint(0x85)+"falso";
    }],
    ["last lesson malformed title",d=>{
      lastLesson(d).title+="\nCabeçalho forjado";
    }],
    ["last lesson short body",d=>{
      lastLesson(d).body="Texto de aula incompleto.";
    }],
    ["last course repeats first identity",d=>{
      lastCourse(d).slug=d.courses[0].slug;
    }]
  ];
  for(const [name,poison] of probes){
    const invalid=structuredClone(source);poison(invalid);
    await writeFile(join(temp,"content","mvp-cursos-v1.json"),JSON.stringify(invalid),"utf8");
    const dest=join(temp,"output-"+scenarios);
    const run=spawnSync(process.execPath,[
      join(temp,"scripts","build-editorial-review-pack.mjs"),"--out",dest
    ],{encoding:"utf8",timeout:20000});
    assert.notEqual(run.status,0,name+" must fail closed");
    assert.deepEqual(await readdir(dest),[],
      name+" must leave no partial course files or CSV behind");
    scenarios++;
  }
  // ERD-R17: damaged UTF-8 was previously decoded with U+FFFD by fs.readFile
  // before the source hash. Inject an invalid continuation byte into the last
  // lesson and prove the generator refuses it without writing partial output.
  const damaged=structuredClone(source);
  damaged.courses.at(-1).lessons.at(-1).body+=" FIM-UTF8-EXCLUSIVO";
  const damagedBytes=Buffer.from(JSON.stringify(damaged),"utf8");
  const tail=Buffer.from("FIM-UTF8-EXCLUSIVO","utf8");
  const offset=damagedBytes.lastIndexOf(tail);
  assert.ok(offset>=0,"Expected unique marker in the last lesson");
  damagedBytes[offset]=0xC3; // The next ASCII byte is not a UTF-8 continuation.
  await writeFile(join(temp,"content","mvp-cursos-v1.json"),damagedBytes);
  const corruptDest=join(temp,"output-utf8-invalid");
  const corrupt=spawnSync(process.execPath,[
    join(temp,"scripts","build-editorial-review-pack.mjs"),"--out",corruptDest
  ],{encoding:"utf8",timeout:20000});
  assert.notEqual(corrupt.status,0,"invalid UTF-8 source bytes must be rejected");
  assert.deepEqual(await readdir(corruptDest),[],
    "invalid UTF-8 source bytes must not create a partial package");
  scenarios++;
  assert.equal(scenarios,6);
  console.log("PASS ERD-R14/R15: "+scenarios+
    " late-source negative scenarios leave zero partial output files; no publish or signoff.");
}finally{
  await rm(temp,{recursive:true,force:true});
}
