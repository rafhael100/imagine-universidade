#!/usr/bin/env node
/**
 * ERD-R24: deterministic, offline editorial triage for the 35 draft lessons.
 * Does not approve content, verify reviewers, write files or contact services.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {auditEditorialLessonStructure} from "./audit-editorial-lesson-structure.mjs";

const digest=(v)=>createHash("sha256").update(v).digest("hex");
const safeCell=(v)=>String(v).replaceAll("|","\\|").replaceAll("\n"," ");

export function buildEditorialReviewQueue(source,sourceBytes){
  const audit=auditEditorialLessonStructure(source);
  assert.equal(audit.lessons,35);
  assert.equal(audit.courses,10);
  const style=new Set(audit.style_findings);
  const queue=[];
  for(const course of source.courses){
    for(const lesson of course.lessons){
      const id=course.slug+"/"+lesson.slug;
      // Same per-lesson binding used in the review package/CSV.
      const content_sha256=digest(JSON.stringify({
        course_slug:course.slug,course_title:course.title,category:course.category,
        lesson_slug:lesson.slug,lesson_title:lesson.title,body:lesson.body
      }));
      queue.push({
        id,course_title:course.title,lesson_title:lesson.title,content_sha256,
        style_flag:style.has(id),review_status:"PENDING_HUMAN_REVIEW"
      });
    }
  }
  assert.equal(new Set(queue.map(x=>x.id)).size,35);
  const source_sha256=digest(sourceBytes);
  const flagged=queue.filter(x=>x.style_flag);
  const ordered=[...flagged,...queue.filter(x=>!x.style_flag)];
  const lines=[
    "# Universidade Imagine — fila de revisão das 35 aulas",
    "",
    "**HOLD_NO_GO — não é aceite editorial humano, homologação ou publicação.**",
    "",
    "Origem: \`content/mvp-cursos-v1.json\` · SHA-256 dos bytes: \`"+source_sha256+"\`.",
    "Total: 10 cursos, 35 aulas; possíveis redundâncias estilísticas: "+flagged.length+".",
    "Todas as revisões abaixo permanecem PENDING_HUMAN_REVIEW, sem identidade autenticada.",
    "",
    "## Prioridade 1 — possível repetição de aplicação no texto introdutório",
    "",
    "Verificar se a abertura repete a seção APLICAÇÃO OPCIONAL. É somente uma pista de revisão, não uma falha pedagógica comprovada.",
    "",
  ];
  function addLine(item){
    lines.push("- [ ] "+safeCell(item.course_title)+" / "+safeCell(item.lesson_title),
      "  - ID: \`"+item.id+"\` · SHA-256 da aula: \`"+item.content_sha256+"\`",
      "  - Conferir precisão, exemplo fictício, aplicação opcional, cuidado, linguagem, acessibilidade e privacidade.",
      "  - Registrar comentários no CSV vinculado ao hash; aprovação externa só com evidência verificável.");
  }
  for(const item of flagged)addLine(item);
  lines.push("", "## Prioridade 2 — demais rascunhos", "");
  for(const item of ordered.filter(x=>!x.style_flag))addLine(item);
  lines.push("","---","","**Pendente:** aceite humano de todas as 35 aulas; 13 gates NOT_VERIFIED e Portal #886 bloqueiam acesso real.");
  return {queue,source_sha256,flagged_count:flagged.length,markdown:lines.join("\n")+"\n",
    release_decision:"HOLD_NO_GO",human_review_authenticated:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  assert.equal(process.argv.length,2,"No external/customer input accepted");
  const bytes=readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url));
  assert.ok(!(bytes[0]===0xef&&bytes[1]===0xbb&&bytes[2]===0xbf),"BOM not allowed");
  const source=JSON.parse(new TextDecoder("utf-8",{fatal:true,ignoreBOM:true}).decode(bytes));
  process.stdout.write(buildEditorialReviewQueue(source,bytes).markdown);
}
