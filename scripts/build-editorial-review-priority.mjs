#!/usr/bin/env node
/**
 * UNI ERD-R82: deterministic *human* review priority across 35 draft lessons.
 * Flags are heuristic reading prompts, not findings, approvals or permissions.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {buildHumanEditorialChecklist} from "./build-editorial-human-checklist.mjs";

export function buildEditorialReviewPriority(source){
  const base=buildHumanEditorialChecklist(source);
  const rows=base.lessons.map((lesson,index)=>({
    original_position:index+1,
    id:lesson.id,
    course_title:lesson.course_title,
    lesson_title:lesson.lesson_title,
    content_sha256:lesson.content_sha256,
    possible_risks:[...lesson.possible_risks],
    section_words:[...lesson.section_words],
    review_status:"PENDING_HUMAN_REVIEW",
    authenticated_signoff:false
  }));
  const flagged=rows.filter(row=>row.possible_risks.length>0).length;
  const sorted=rows.sort((a,b)=>
    Number(b.possible_risks.length>0)-Number(a.possible_risks.length>0) ||
    a.original_position-b.original_position
  );
  assert.equal(sorted.length,35);
  assert.equal(new Set(sorted.map(row=>row.id)).size,35);
  return {
    schema_version:1,
    review_scope:"10 courses / 35 lessons",
    order_policy:"FLAGGED_FIRST_THEN_CURRICULUM_ORDER",
    flags_are:"HEURISTIC_READING_HINTS_NOT_PROVEN_VIOLATIONS",
    total_lessons:35,
    flagged_lessons:flagged,
    unflagged_lessons:35-flagged,
    human_rubric_checks:210,
    human_review_authenticated:false,
    approval_authority:"NONE",
    grants_issued:0,
    release_decision:"HOLD_NO_GO",
    items:sorted
  };
}

const escapeCell=value=>String(value)
  .replace(/[\r\n\u2028\u2029]/gu," ")
  .replace(/\\/gu,"\\\\")
  .replace(/\|/gu,"\\|")
  .replace(/</gu,"&lt;").replace(/>/gu,"&gt;")
  .replace(/\*/gu,"\\*").replace(/\[/gu,"\\[")
  .replace(/\]/gu,"\\]").replace(/\x60/gu,"\\`");

export function renderReviewPriorityMarkdown(report){
  assert.equal(report?.release_decision,"HOLD_NO_GO");
  assert.equal(report?.approval_authority,"NONE");
  assert.equal(report?.human_review_authenticated,false);
  assert.equal(report?.grants_issued,0);
  assert.equal(report?.items?.length,35);
  assert.equal(report?.human_rubric_checks,210);
  const lines=[
    "# Universidade Imagine — fila de leitura editorial (rascunhos)",
    "",
    "**TRIAGEM, NÃO APROVAÇÃO. 35 aulas exigem revisão humana. HOLD_NO_GO.**",
    "",
    "Avisos heurísticos são hipóteses para leitura contextual, nunca violações comprovadas.",
    "A ordem prioriza aulas com algum sinal e preserva a ordem curricular nos empates.",
    "Nem a ausência de sinais nem um checkbox preenchido confirmam qualidade ou aceite.",
    "",
    "| Ordem | Aula original | ID | Curso / aula | Sinais de leitura |",
    "| ---: | ---: | --- | --- | --- |"
  ];
  for(const [index,row] of report.items.entries()){
    assert.match(row.id,/^[a-z0-9-]+\/[a-z0-9-]+$/u);
    assert.match(row.content_sha256,/^[0-9a-f]{64}$/u);
    assert.equal(row.authenticated_signoff,false);
    assert.equal(row.review_status,"PENDING_HUMAN_REVIEW");
    lines.push("| "+(index+1)+" | "+row.original_position+
      " | `"+row.id+"` | "+escapeCell(row.course_title)+" / "+escapeCell(row.lesson_title)+
      " | "+(row.possible_risks.length?row.possible_risks.map(escapeCell).join(", "):"sem sinal heurístico")+" |");
  }
  lines.push("","## Conferência antes de qualquer decisão", "",
    "- [ ] Ler conteúdo integral das 35 aulas e validar as seis perguntas por aula (210 pontos).",
    "- [ ] Registrar correções e evidências no fluxo editorial humano autenticado, ainda indisponível.",
    "- [ ] Não tratar esta fila nem artefatos locais como autorização de publicação.",
    "- [ ] Reavaliar Portal #886, revogação, SSO, direitos e 13 gates independentes.",
    "",
    "**HOLD_NO_GO · 13/13 gates NOT_VERIFIED · 0 grants · 0 aceite humano autenticado**",
    "");
  return lines.join("\n");
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  assert.equal(process.argv.length,3,"Only --json or --markdown is accepted");
  assert.ok(["--json","--markdown"].includes(process.argv[2]),"Invalid output format");
  const source=JSON.parse(readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
  const report=buildEditorialReviewPriority(source);
  process.stdout.write(process.argv[2]==="--json"?
    JSON.stringify(report,null,2)+"\n":renderReviewPriorityMarkdown(report));
}
