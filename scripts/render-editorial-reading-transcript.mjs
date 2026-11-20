#!/usr/bin/env node
/**
 * UNI ERD-R199/R200: print/screen-reader-friendly transcript of the ORIGINAL
 * synthetic 35-lesson editorial draft. This is neither approval nor a grant.
 * Plain text deliberately has no links, scripts, cookies or network calls.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {humanRubric} from "./build-editorial-human-checklist.mjs";
import {buildEditorialNavigationManifest} from "./build-editorial-navigation-manifest.mjs";

const sha256=value=>createHash("sha256").update(value,"utf8").digest("hex");
// Reject terminal controls and bidi overrides in a human-facing text handoff.
const unsafeText=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
function safeLine(value){
  assert.equal(typeof value,"string","Text fields must be strings");
  assert.ok(!unsafeText.test(value),"Control or bidirectional override in editorial text");
  const oneLine=value.replace(/\s+/gu," ").trim();
  assert.ok(oneLine.length>0,"Empty editorial label");
  return oneLine;
}
function safeBody(value){
  assert.equal(typeof value,"string","Full lesson text must be a string");
  assert.ok(!unsafeText.test(value),"Control or bidirectional override in lesson body");
  assert.ok(value.trim().length>0,"Empty lesson body");
  return value;
}

export function renderEditorialReadingTranscript(source){
  const manifest=buildEditorialNavigationManifest(source);
  assert.equal(source.status,"editorial_draft");
  assert.equal(source.audience,"authorized_imagine_clients_only");
  assert.equal(manifest.release_decision,"HOLD_NO_GO");
  assert.equal(manifest.human_signoff_authenticated,false);
  assert.equal(manifest.grants_issued,0);
  assert.equal(manifest.total_courses,10);
  assert.equal(manifest.total_lessons,35);
  assert.equal(manifest.total_rubric_checks,210);
  assert.equal(humanRubric.length,6);
  const lines=[
    "IMAGINE UNIVERSIDADE — TRANSCRIÇÃO INTEGRAL PARA REVISÃO HUMANA",
    "HOLD_NO_GO | 13/13 NOT_VERIFIED | 0 grants | 0 aceites humanos autenticados",
    "RASCUNHO SINTÉTICO, SEM PUBLICAÇÃO. Não é certificado, avaliação nem autorização.",
    "A sequência é CURRICULAR. A fila heurística de atenção tem ordem diferente.",
    "35 aulas / 10 cursos / 210 perguntas de leitura humana. Portal #886 continua bloqueado.",
    ""
  ];
  const seen=new Set();
  let lessonNumber=0,questions=0;
  for(const [courseIndex,course] of source.courses.entries()){
    const recorded=manifest.courses[courseIndex];
    assert.equal(recorded.slug,course.slug,"Course identity changed");
    assert.equal(recorded.lessons.length,course.lessons.length);
    lines.push("============================================================",
      "CURSO "+(courseIndex+1)+"/10 — "+safeLine(course.title),
      "============================================================","");
    for(const [lessonIndex,lesson] of course.lessons.entries()){
      lessonNumber++;
      const row=recorded.lessons[lessonIndex];
      const id=course.slug+"/"+lesson.slug;
      assert.equal(row.id,id,"Lesson identity changed");
      assert.equal(row.curriculum_position,lessonNumber);
      assert.ok(!seen.has(id),"Duplicated lesson identity");
      seen.add(id);
      const body=safeBody(lesson.body);
      const bodySha=sha256(body);
      assert.equal(row.content_sha256,bodySha,"Transcript source hash mismatch");
      assert.ok(Number.isInteger(row.queue_position)&&row.queue_position>=1&&row.queue_position<=35);
      lines.push("------------------------------------------------------------",
        "AULA "+lessonNumber+"/35 — "+safeLine(lesson.title),
        "Identificador: "+id,
        "Posição curricular: "+lessonNumber+"/35 | posição na fila: "+row.queue_position+"/35",
        "SHA-256 do texto: "+bodySha,
        "Estado: PENDING_HUMAN_REVIEW | aceite autenticado: NÃO",
        "",
        "TEXTO INTEGRAL (rascunho, sem validação pedagógica)",
        body,
        "",
        "PERGUNTAS PARA LEITURA (não são aceite nem respostas)");
      for(const [questionIndex,question] of humanRubric.entries()){
        lines.push("PERGUNTA "+(questionIndex+1)+"/6: "+safeLine(question));
        questions++;
      }
      lines.push("Conclusão desta aula: PENDING_HUMAN_REVIEW; nunca inferir aprovação.","");
    }
  }
  assert.equal(lessonNumber,35);
  assert.equal(questions,210);
  assert.equal(seen.size,35);
  lines.push("FIM — HOLD_NO_GO | 13/13 NOT_VERIFIED | 0 grants | 0 aceites humanos autenticados",
    "A evidência humana deve ser obtida em fluxo separado e autenticado. Este TXT não registra aceite.",
    "");
  const text=lines.join("\n");
  assert.ok(Buffer.byteLength(text,"utf8")>0&&Buffer.byteLength(text,"utf8")<=1024*1024,
    "Transcript must be a bounded local plain-text artifact");
  return text;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  assert.equal(process.argv.length,2,"Only checked-in synthetic curriculum is supported");
  const source=JSON.parse(readFileSync(
    new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
  process.stdout.write(renderEditorialReadingTranscript(source));
}
