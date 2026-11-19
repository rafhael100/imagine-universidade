// Shared, deterministic, non-authorizing offline editorial document renderer.
// Used both by the pack builder and by source-bound verification (ERD-R39/R40).
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {safeLine,safeBody} from "./editorial-text-safety.mjs";
const sha256=data=>createHash("sha256").update(data).digest("hex");
function safeSlug(v){
  assert.ok(typeof v==="string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) && v.length<=120,
    "Unsafe course or lesson slug");
  return v;
}
export function renderEditorialCourseMarkdown(course,courseIndex){
  const courseSlug=safeSlug(course.slug),title=safeLine(course.title);
  assert.ok(["metodologia","negocios","sistemas"].includes(course.category));
  assert.ok(Array.isArray(course.lessons)&&course.lessons.length>=1&&course.lessons.length<=15);
  const hashes=[],reviewRows=[];
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
  }
  return {markdown:lines.join("\n"),hashes,reviewRows};
}
export function renderEditorialReadme(indexes,sourceHash){
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
  "Abra FILA-REVISAO-35.md para priorizar 24 possíveis repetições estilísticas, sem autenticar aceite.",
  "Exporte o CSV; o registro nunca confirma identidade ou aprova publicação.",
  "",
  "1. Ler todos os textos em \`cursos/\` e registrar observações em \`revisao.csv\`.",
  "2. Confirmar qualidade, atualidade das orientações, revisão de exemplos e ausência de dados pessoais.",
  "3. Registrar aprovação humana em issue/PR identificável, incluindo SHA-256 da aula e responsável.",
  "4. Encaminhar o material à revisão independente de privacidade e segurança pertinente.",
  "5. **Não publicar**: os 13 gates do Portal/Universidade continuam \`HOLD_NO_GO\`.",
  "",
].join("\n");
  return doc;
}
