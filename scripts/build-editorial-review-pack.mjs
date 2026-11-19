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
const source=await readFile(sourceFile,"utf8");
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
preflightReviewSource(payload.courses);

const indexes=[],reviewRows=[],hashes=[],seenCourse=new Set(),seenLesson=new Set();
const lessonsDir=resolve(dest,"cursos");
await mkdir(lessonsDir,{recursive:true});
let lessonCount=0;
for(const [courseIndex,course] of payload.courses.entries()){
  const courseSlug=safeSlug(course.slug);
  assert.ok(!seenCourse.has(courseSlug),"Duplicate course slug");
  seenCourse.add(courseSlug);
  assert.ok(["metodologia","negocios","sistemas"].includes(course.category));
  const title=safeLine(course.title);
  assert.ok(Array.isArray(course.lessons) && course.lessons.length>=1 && course.lessons.length<=15,
    "Invalid lesson count");
  const lines=[
    "# "+title,
    "",
    "**Revisão humana obrigatória · curso "+String(courseIndex+1).padStart(2,"0")+" · status PENDENTE**",
    "",
    "Este arquivo contém um rascunho, não é publicação nem aceite.",
    "",
    "Checklist do curso: [ ] clareza pedagógica  [ ] adequação ao público  [ ] terminologia Imagine  [ ] acessibilidade  [ ] privacidade e segurança.",
    "",
  ];
  for(const [lessonIndex,lesson] of course.lessons.entries()){
    const lessonSlug=safeSlug(lesson.slug);
    const fullId=courseSlug+"/"+lessonSlug;
    assert.ok(!seenLesson.has(fullId),"Duplicate course+lesson identity");
    seenLesson.add(fullId);
    const lessonTitle=safeLine(lesson.title),body=safeBody(lesson.body);
    const checksum=sha256(JSON.stringify({course_slug:courseSlug,course_title:course.title,
      category:course.category,lesson_slug:lessonSlug,lesson_title:lesson.title,body:lesson.body}));
    hashes.push({course_slug:courseSlug,lesson_slug:lessonSlug,content_sha256:checksum,
      review_status:"PENDING_HUMAN_REVIEW",reviewed_by:null,review_evidence:null});
    reviewRows.push([courseSlug,lessonSlug,checksum,"PENDING_HUMAN_REVIEW","","",""]);
    lines.push("## "+String(lessonIndex+1)+". "+lessonTitle,"",
      "**ID:** "+fullId+" · **SHA-256:** \`"+checksum+"\` · **Status:** PENDENTE","","",
      body,"",
      "### Avaliação editorial (preencher somente por pessoa responsável)","",
      "- [ ] Exatidão e clareza verificadas",
      "- [ ] Exemplo realmente fictício, sem dados identificáveis",
      "- [ ] Atividade opcional coerente e sem promessas de resultado",
      "- [ ] Linguagem, limites e privacidade revisados",
      "- [ ] Aprovação humana registrada fora deste arquivo com vínculo ao hash",
      "","---","");
    lessonCount++;
  }
  const filename=String(courseIndex+1).padStart(2,"0")+"-"+courseSlug+".md";
  await writeFile(resolve(lessonsDir,filename),lines.join("\n"),"utf8");
  indexes.push({course_slug:courseSlug,title:course.title,category:course.category,
    lessons:course.lessons.length,file:"cursos/"+filename});
}
assert.equal(lessonCount,35,"Expected exactly 35 existing drafts");
const sourceHash=sha256(source);
const doc=[
  "# Universidade Imagine — pacote de revisão editorial",
  "",
  "**NÃO É APROVAÇÃO NEM PUBLICAÇÃO.** Acervo de 10 cursos e 35 aulas ainda sujeito ao aceite humano.",
  "",
  "Origem imutável da revisão: \`content/mvp-cursos-v1.json\`",
  "",
  "**SHA-256 do arquivo de origem:** \`"+sourceHash+"\`",
  "",
  "Uma alteração de texto ou título muda o hash da aula. Aprovações devem mencionar o hash",
  "exato e a revisão do repositório, e não valem automaticamente para revisões posteriores.",
  "",
  "| Curso | Categoria | Aulas | Revisar |",
  "| --- | --- | ---: | --- |",
  ...indexes.map(x=>"| "+safeLine(x.title)+" | "+x.category+" | "+x.lessons+
    " | ["+x.course_slug+"]("+x.file+") |"),
  "",
  "## Etapas para a equipe editorial",
  "",
  "Abra revisao-navegavel.html para navegar pelos 10 cursos e 35 aulas offline.",
  "Exporte o CSV; o registro nunca confirma identidade ou aprova publicação.",
  "",
  "1. Ler todos os textos em \`cursos/\` e registrar observações em \`revisao.csv\`.",
  "2. Confirmar qualidade, atualidade das orientações, revisão de exemplos e ausência de dados pessoais.",
  "3. Registrar aprovação humana em issue/PR identificável, incluindo SHA-256 da aula e responsável.",
  "4. Encaminhar o material à revisão independente de privacidade e segurança pertinente.",
  "5. **Não publicar**: os 13 gates do Portal/Universidade continuam \`HOLD_NO_GO\`.",
  "",
].join("\n");
await writeFile(resolve(dest,"LEIA-PRIMEIRO.md"),doc,"utf8");
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
console.log("PASS editorial handoff: 10 courses/35 full-text lessons; per-lesson content hashes, pending human review, no publication.");
