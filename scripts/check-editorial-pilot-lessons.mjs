#!/usr/bin/env node
/**
 * UNI ERD-R217: targeted regression for editorial pilot (lessons 4, 9, 32).
 * Reuses the existing six-point human rubric; does NOT certify human approval.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildHumanEditorialChecklist,humanRubric} from "./build-editorial-human-checklist.mjs";

const source=JSON.parse(readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const lessons=source.courses.flatMap(course=>course.lessons.map(lesson=>({course:course.slug,...lesson})));
const spec=[
  {n:4,slug:"identifique-gargalos",required:[
    /defina o que conta como visita, lead/u,
    /um cliente pode contratar semanas depois/u,
    /5% e 2%; de contratos por lead, 20% e 62,5%/u,
    /somente se os grupos e o período forem comparáveis/u,
    /APLICAÇÃO OPCIONAL\n/u,
    /Não inclua dados pessoais reais/u
  ]},
  {n:9,slug:"portal-do-cliente-visao-geral",required:[
    /ambiente planejado/u,
    /serviço elegível efetivamente ativo, permissões e liberação oficial/u,
    /prévia navegável não confirma contratação, acesso ou recurso disponível/u,
    /APLICAÇÃO OPCIONAL\n/u,
    /Não tente acessar a demonstração com credenciais verdadeiras/u,
    /Nunca compartilhe senhas, tokens, códigos de autenticação/u
  ]},
  {n:32,slug:"ia-apoia-nao-garante",required:[
    /O tutor de IA da Universidade não está habilitado nesta etapa/u,
    /atividade não depende dele nem de qualquer serviço externo/u,
    /120 visitas, 12 leads e três clientes/u,
    /12 de 120 são 10% e três de 12 são 25%/u,
    /APLICAÇÃO OPCIONAL\nSem tutor, sem nota e sem dados reais/u,
    /escreva em papel/u,
    /O exercício é opcional e não precisa ser enviado/u
  ]}
];
assert.equal(lessons.length,35);
assert.equal(humanRubric.length,6);
const checklist=buildHumanEditorialChecklist(source);
assert.equal(checklist.automated_assessment,"TRIAGE_ONLY");
assert.equal(checklist.editorial_signoff_verified,false);
assert.equal(checklist.release_decision,"HOLD_NO_GO");
assert.equal(checklist.lessons.length,35);
function validate(row,lesson){
  assert.equal(lesson.slug,row.slug,"Curriculum ordinal moved: "+row.n);
  const sections=lesson.body.split(/\n\n(?=EXEMPLO FICTÍCIO\n|APLICAÇÃO OPCIONAL\n|CUIDADO IMPORTANTE\n)/u);
  assert.equal(sections.length,4);
  assert.ok(sections[1].startsWith("EXEMPLO FICTÍCIO\n"));
  assert.ok(sections[2].startsWith("APLICAÇÃO OPCIONAL\n"));
  assert.ok(sections[3].startsWith("CUIDADO IMPORTANTE\n"));
  for(const regex of row.required)assert.match(lesson.body,regex,"Pilot missing: "+row.n+" "+regex);
  const entry=checklist.lessons[row.n-1];
  assert.equal(entry.id,lesson.course+"/"+lesson.slug);
  assert.equal(entry.human_review,"PENDING_HUMAN_REVIEW");
  assert.equal(entry.authenticated_signoff,false);
  assert.equal(entry.human_evidence,null);
}
for(const row of spec)validate(row,lessons[row.n-1]);
// Negative controls focus on newly edited claims, rather than repeating structural QA.
let negatives=0;
for(const row of spec){
  const original=lessons[row.n-1];
  for(const required of [row.required[0],row.required[row.required.length-1]]){
    const match=original.body.match(required);
    assert.ok(match);
    const mutated={...original,body:original.body.replace(match[0],"[trecho removido]")};
    assert.throws(()=>validate(row,mutated),undefined,"Must reject removed pilot requirement");
    negatives++;
  }
}
assert.equal(negatives,6);
console.log("PASS UNI R217: 3 exact lesson pilots, six-point rubric, optional exercise without tutor, "+negatives+" targeted negative controls; 35 PENDING_HUMAN_REVIEW.");
