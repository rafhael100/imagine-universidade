#!/usr/bin/env node
/**
 * UNI R76: human-readable handoff for the same 35 source-bound lessons.
 * This is a checklist of questions, NOT an approval, credential or grant.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {buildHumanEditorialChecklist} from "./build-editorial-human-checklist.mjs";

const escaped=new Set([String.fromCharCode(92),String.fromCharCode(96),
  "*","_","{","}","[","]","(",")","#","+","-",".","!","|","<",">"]);
const safeText=value=>[...String(value)].map(ch=>
  escaped.has(ch)?String.fromCharCode(92)+ch:ch).join("");

export function renderHumanReviewMarkdown(report){
  assert.equal(report?.release_decision,"HOLD_NO_GO");
  assert.equal(report?.approval_authority,"NONE");
  assert.equal(report?.editorial_signoff_verified,false);
  assert.equal(report?.lessons?.length,35);
  assert.equal(report.rubric.length,6);
  assert.ok(report.lessons.every(row=>row.human_review==="PENDING_HUMAN_REVIEW"
    && row.human_evidence===null && row.authenticated_signoff===false));
  const lines=[
    "# Universidade Imagine — roteiro de leitura humana das 35 aulas",
    "",
    "**RASCUNHO / SEM ACEITE / HOLD_NO_GO**. Este documento NÃO aprova aulas.",
    "Nenhum campo preenchido aqui gera acesso, publicação ou signoff autenticado.",
    "",
    "## Seis perguntas para cada aula",
    ...report.rubric.map((v,i)=>String(i+1)+". "+safeText(v)),
    "",
    "## Roteiro das 35 aulas",
    ""
  ];
  for(const [i,lesson] of report.lessons.entries()){
    assert.match(lesson.id,/^[a-z0-9-]+\/[a-z0-9-]+$/u);
    assert.match(lesson.content_sha256,/^[0-9a-f]{64}$/u);
    lines.push(
      "### Aula "+String(i+1).padStart(2,"0")+"/35 — "+
        safeText(lesson.course_title)+" / "+safeText(lesson.lesson_title),
      "",
      "- ID de origem: "+lesson.id,
      "- SHA-256 do texto da aula: "+lesson.content_sha256,
      "- Seções (palavras): "+lesson.section_words.join(" / "),
      "- Sinais para revisão contextual: "+
        (lesson.possible_risks.length?lesson.possible_risks.map(safeText).join(", "):"nenhum sinal heurístico"),
      "- Estado editorial: PENDING_HUMAN_REVIEW (não autenticado)",
      ""
    );
    for(const question of report.rubric)lines.push("- [ ] Conferir: "+safeText(question));
    lines.push("","**Registro de evidência humana:** somente em processo editorial autenticado, fora deste relatório.","");
  }
  lines.push(
    "---",
    "Fim de 35 aulas. Próximos passos: revisão humana independente e Portal #886.",
    "13/13 gates NOT_VERIFIED; nenhuma autorização de produção foi concedida.",
    ""
  );
  return lines.join("\n");
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  assert.equal(process.argv.length,2,"Only the repository's original synthetic curriculum is accepted");
  const source=JSON.parse(readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
  process.stdout.write(renderHumanReviewMarkdown(buildHumanEditorialChecklist(source)));
}
