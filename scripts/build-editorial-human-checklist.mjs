#!/usr/bin/env node
/**
 * UNI R72-R73: deterministic triage across the ORIGINAL 35 synthetic draft
 * lessons. Findings are prompts for a human reviewer, never editorial approval.
 * Read-only source; no network, customer data, session, grant or release writes.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {auditEditorialLessonStructure} from "./audit-editorial-lesson-structure.mjs";

export const humanRubric=Object.freeze([
  "Precisão factual: definições, exemplos e limites sem promessa de resultado",
  "Clareza: leitura compreensível para pequeno negócio e objetivos verificáveis",
  "Exemplo fictício: não confundir personagens ou números com clientes reais",
  "Aplicação opcional: exercício compreensível e seguro sem dados pessoais reais",
  "Cuidados: ressalvas de privacidade, segurança e métricas pertinentes",
  "Produto Imagine: não confundir recurso planejado com serviço disponível"
]);

// Flags deliberately indicate POSSIBLE editorial risk, not a proved violation.
// False positives are retained for a human's contextual assessment.
const signals=[
  {code:"promessa-de-resultado",pattern:/\b(?:resultado(?:s)? garantido(?:s)?|vendas garantidas|garantimos (?:vendas|clientes|lucro))\b/iu},
  {code:"pedido-de-dados-reais",pattern:/\b(?:insira dados reais|envie senhas|copie dados pessoais|compartilhe dados de clientes)\b/iu},
  {code:"disponibilidade-nao-comprovada",pattern:/\b(?:ja esta em producao|já está em produção|disponivel para todos os clientes|disponível para todos os clientes|acesso liberado para todos)\b/iu}
];
const sha256=value=>createHash("sha256").update(value,"utf8").digest("hex");

export function buildHumanEditorialChecklist(source){
  const structural=auditEditorialLessonStructure(source);
  const lessons=[];
  let flagsCount=0;
  for(const course of source.courses){
    for(const lesson of course.lessons){
      const id=course.slug+"/"+lesson.slug;
      const body=lesson.body;
      const sections=body.split(/\n\n(?:EXEMPLO FICTÍCIO|APLICAÇÃO OPCIONAL|CUIDADO IMPORTANTE)\n/u);
      assert.equal(sections.length,4,"Missing pedagogical sections in "+id);
      const flags=signals.filter(signal=>signal.pattern.test(body)).map(signal=>signal.code);
      // Long introductions are a review hint, never a structural failure.
      if(sections[0].trim().split(/\s+/u).length>210)flags.push("introducao-extensa");
      flagsCount+=flags.length;
      lessons.push({
        id,course_title:course.title,lesson_title:lesson.title,
        content_sha256:sha256(body),
        section_words:sections.map(section=>section.trim().split(/\s+/u).length),
        possible_risks:flags,
        human_review:"PENDING_HUMAN_REVIEW",
        human_evidence:null,
        authenticated_signoff:false
      });
    }
  }
  assert.equal(lessons.length,35,"Human checklist must cover exactly 35 lessons");
  assert.equal(new Set(lessons.map(lesson=>lesson.id)).size,35,"Repeated lesson in checklist");
  return {
    schema_version:1,
    source_status:source.status,
    scope:"10 courses / 35 editorial drafts / 140 sections",
    rubric:humanRubric,
    total_courses:structural.courses,
    total_lessons:lessons.length,
    potential_risk_flags:flagsCount,
    automated_assessment:"TRIAGE_ONLY",
    approval_authority:"NONE",
    editorial_signoff_verified:false,
    release_decision:"HOLD_NO_GO",
    lessons
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  assert.equal(process.argv.length,2,"Only the repository's synthetic curriculum is allowed");
  const source=JSON.parse(readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
  process.stdout.write(JSON.stringify(buildHumanEditorialChecklist(source),null,2)+"\n");
}
