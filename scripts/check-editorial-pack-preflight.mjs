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
  "editorial-review-app.js","editorial-text-safety.mjs",
  "audit-editorial-lesson-structure.mjs"];
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
    ["last lesson headings swapped",d=>{
      const l=lastLesson(d);
      l.body=l.body.replace("\n\nEXEMPLO FICTÍCIO\n","\n\n__SECTION_SLOT__\n")
        .replace("\n\nAPLICAÇÃO OPCIONAL\n","\n\nEXEMPLO FICTÍCIO\n")
        .replace("\n\n__SECTION_SLOT__\n","\n\nAPLICAÇÃO OPCIONAL\n");
    }],
    ["last lesson repeated heading",d=>{
      lastLesson(d).body+="\n\nEXEMPLO FICTÍCIO\nCabeçalho duplicado.";
    }],
    ["last course repeats first identity",d=>{
      lastCourse(d).slug=d.courses[0].slug;
    }],
    // ERD-R22: this passed the previous total-word-count-only gate.
    // The final caution section is reduced to a single word.
    ["last lesson incomplete caution despite substantive total text",d=>{
      const l=lastLesson(d);
      l.body=l.body.replace(/(\n\nCUIDADO IMPORTANTE\n)[\s\S]*$/u,"$1Breve.");
    }],
    // ERD-R23: malicious markup in a legitimate-looking last lesson must not
    // produce any review files, even when all 35 identities still match.
    ["last lesson remote HTML image",d=>{
      lastLesson(d).body+='\n\n<img src="https://example.invalid/track">';
    }],
    ["last lesson Markdown remote image",d=>{
      lastLesson(d).body+='\n\n![Exemplo](https://example.invalid/pixel.png)';
    }],
    ["last lesson Markdown remote link",d=>{
      lastLesson(d).body+='\n\n[Guia](https://example.invalid/guia)';
    }],
    ["last lesson reference link target",d=>{
      lastLesson(d).body+='\n\n[guia]: https://example.invalid/guia';
    }],
    ["last lesson reference image",d=>{
      lastLesson(d).body+='\n\n![Figura][fonte]';
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
  // ERD-R18: JSON with UTF-8 BOM was silently accepted by TextDecoder while
  // the published "source file SHA-256" hashed BOM-stripped text, not bytes.
  // Keep a human-review manifest bound to the exact bytes from the repository.
  const bomSource=Buffer.concat([
    Buffer.from([0xEF,0xBB,0xBF]),Buffer.from(JSON.stringify(source),"utf8")
  ]);
  await writeFile(join(temp,"content","mvp-cursos-v1.json"),bomSource);
  const bomDest=join(temp,"output-utf8-bom");
  const bomRun=spawnSync(process.execPath,[
    join(temp,"scripts","build-editorial-review-pack.mjs"),"--out",bomDest
  ],{encoding:"utf8",timeout:20000});
  assert.notEqual(bomRun.status,0,"UTF-8 BOM must be rejected before generation");
  assert.match(bomRun.stderr,/must not contain UTF-8 BOM/u,
    "Failure must distinguish BOM from unrelated corruption");
  assert.deepEqual(await readdir(bomDest),[],
    "BOM source must not produce partial review output");
  scenarios++;
  assert.equal(scenarios,15);
  console.log("PASS ERD-R14/R18/R22/R23: "+scenarios+
    " late-source negative scenarios leave zero partial output files; no publish or signoff.");
}finally{
  await rm(temp,{recursive:true,force:true});
}
