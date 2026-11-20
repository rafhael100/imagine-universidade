#!/usr/bin/env node
/** UNI ERD-R85: passive, keyboard-accessible handoff for 35 draft lessons. */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {buildEditorialReviewPriority} from "./build-editorial-review-priority.mjs";
import {humanRubric} from "./build-editorial-human-checklist.mjs";
import {validatePriorityReport} from "./validate-editorial-priority-report.mjs";

const css=[
  "body{font:1rem/1.6 system-ui,Arial,sans-serif;color:#171b19;background:#fafafa;margin:0}",
  "header{background:#171b19;color:white;padding:1.2rem max(1rem,calc((100% - 68rem)/2));border-bottom:4px solid #f9941d}",
  "header p{color:#f5e4ce}",
  "main{max-width:68rem;margin:auto;padding:1rem}",
  ".skip{position:absolute;left:1rem;top:-10rem;background:#fff;color:#171b19;padding:.6rem}",
  ".skip:focus{top:1rem;z-index:2}",
  "a{color:#17446d;text-decoration:underline}",
  "a:focus-visible,summary:focus-visible{outline:3px solid #171b19;outline-offset:3px}",
  ".warning{border-left:5px solid #f9941d;background:#fff6e9;padding:1rem}",
  ".grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));gap:1rem}",
  "article{background:white;border:1px solid #c0c0c0;padding:1rem;border-radius:.5rem;margin:1rem 0;overflow-wrap:anywhere}",
  "article h2{font-size:1.2rem}",
  "article:focus-visible{outline:3px solid #17446d;outline-offset:3px}",
  "article h3:focus-visible,article h4:focus-visible{outline:3px solid #17446d;outline-offset:3px}",
  ".queue-nav{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1rem}",
  ".queue-nav a{display:inline-block;padding:.3rem .4rem}",
  "dl{display:grid;grid-template-columns:minmax(7rem,auto) 1fr;gap:.35rem}",
  "dt{font-weight:700}",
  "dd{margin:0}",
  "code{word-break:break-all}",
  "footer{max-width:68rem;margin:auto;padding:1rem}",
  "@media print{a{color:#171b19}.skip,nav{display:none}article{break-inside:avoid}}"
].join("\n");
const escaped=s=>String(s).replace(/[\r\n\u2028\u2029]/gu," ")
  .replace(/&/gu,"&amp;").replace(/</gu,"&lt;").replace(/>/gu,"&gt;")
  .replace(/"/gu,"&quot;").replace(/'/gu,"&#39;");

export function renderReviewPriorityHtml(report){
  validatePriorityReport(report);
  assert.equal(report?.release_decision,"HOLD_NO_GO");
  assert.equal(report?.human_review_authenticated,false);
  assert.equal(report?.approval_authority,"NONE");
  assert.equal(report?.grants_issued,0);
  assert.equal(report?.items?.length,35);
  assert.equal(report?.human_rubric_checks,210);
  assert.equal(report?.flagged_lessons+report?.unflagged_lessons,35);
  const hash=createHash("sha256").update(css,"utf8").digest("base64");
  const lines=[
    "<!doctype html>",
    '<html lang="pt-BR"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;sha256-'+hash+'&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;; connect-src &#39;none&#39;; img-src &#39;none&#39;">',
    "<title>Imagine Universidade — fila de revisão humana (não autenticada)</title>",
    "<style>"+css+"</style></head><body>",
    '<a class="skip" href="#conteudo">Pular para o conteúdo</a>',
    '<header><strong>Imagine Universidade · Revisão pedagógica</strong>',
    '<p>35 aulas em rascunho, sem publicação ou autorização</p></header>',
    '<main id="conteudo" tabindex="-1"><h1>Fila de leitura das 35 aulas</h1>',
    '<p class="warning"><strong>HOLD_NO_GO · SEM ACEITE.</strong> Sinais heurísticos não provam erro nem qualidade. A revisão das 35 aulas é obrigatória e deve ser autenticada em processo separado.</p>',
    '<p>Ordem: aulas com sinais de atenção primeiro; empates seguem o currículo. Total: 35 aulas, 210 perguntas para revisão humana, 13 gates bloqueados.</p>',
    '<nav aria-label="Índice de aulas"><h2>Escolha uma aula para leitura</h2><ol class="grid">'
  ];
  const allIds=new Set();
  for(const [i,row] of report.items.entries()){
    assert.equal(row.authenticated_signoff,false);
    assert.equal(row.review_status,"PENDING_HUMAN_REVIEW");
    assert.ok(Number.isInteger(row.original_position)&&row.original_position>=1&&row.original_position<=35);
    assert.match(row.id,/^[a-z0-9-]+\/[a-z0-9-]+$/u);
    assert.match(row.content_sha256,/^[a-f0-9]{64}$/u);
    assert.ok(!allIds.has(row.id),"Repeated review identity");
    allIds.add(row.id);
    // The queue is NOT the curriculum: both positions must be spoken by
    // screen readers and visibly shown so reviewers do not confuse order.
    lines.push('<li><a href="#aula-'+row.original_position+'">Fila '+(i+1)+
      ' de 35 · aula '+row.original_position+' de 35 no currículo · '+
      escaped(row.course_title)+" — "+escaped(row.lesson_title)+"</a></li>");
  }
  lines.push("</ol></nav>",'<section aria-label="Conferência integral das aulas">');
  for(const [i,row] of report.items.entries()){
    // Priority order differs from curricular order. Native same-page links
    // allow sequential keyboard review without JS, storage or external calls.
    const previous=i>0?report.items[i-1]:null;
    const next=i+1<report.items.length?report.items[i+1]:null;
    const queueLinks=[
      previous?'<a href="#aula-'+previous.original_position+'">Aula anterior na fila: '+
        'fila '+i+' de 35, aula '+previous.original_position+' no currículo</a>':null,
      next?'<a href="#aula-'+next.original_position+'">Próxima aula na fila: '+
        'fila '+(i+2)+' de 35, aula '+next.original_position+' no currículo</a>':null,
      '<a href="#conteudo">Voltar ao índice</a>'
    ].filter(Boolean).join(" ");
    lines.push(
      '<article id="aula-'+row.original_position+'" tabindex="-1" aria-labelledby="titulo-'+row.original_position+'">',
      '<h2 id="titulo-'+row.original_position+'">Fila '+(i+1)+
        ' de 35 · aula '+row.original_position+' no currículo — '+
        escaped(row.lesson_title)+"</h2>",
      "<p>Posição no currículo: "+row.original_position+" de 35 · posição na fila: "+(i+1)+" de 35</p>",
      "<dl>",
      "<dt>Curso</dt><dd>"+escaped(row.course_title)+"</dd>",
      "<dt>Identificador</dt><dd><code>"+escaped(row.id)+"</code></dd>",
      "<dt>SHA-256 fonte</dt><dd><code>"+row.content_sha256+"</code></dd>",
      "<dt>Estado</dt><dd>Pendente de revisão humana (não autenticada)</dd>",
      "<dt>Palavras nas quatro seções</dt><dd>"+row.section_words.map(escaped).join(" / ")+"</dd>",
      "<dt>Sinais heurísticos</dt><dd>"+(row.possible_risks.length?
        row.possible_risks.map(escaped).join(", "):"Nenhum sinal automático — ler mesmo assim")+"</dd>",
      "</dl>",
      "<h3>Perguntas para leitura (não são aceite)</h3><ol>",
      ...humanRubric.map(question=>"<li>"+escaped(question)+"</li>"),
      "</ol>",
      '<p class="queue-nav">'+queueLinks+'</p>',
      "</article>"
    );
  }
  lines.push("</section></main>",
    "<footer><p>Fim da fila de 35 aulas. Não concede grants, não cria assinatura humana nem abre os 13 gates.</p>",
    '<p>Dependência P0: Portal #886. HOLD_NO_GO · 13/13 NOT_VERIFIED.</p></footer>',
    "</body></html>","");
  return lines.join("\n");
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  assert.equal(process.argv.length,2,"Only versioned synthetic curriculum is supported");
  const source=JSON.parse(readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
  process.stdout.write(renderReviewPriorityHtml(buildEditorialReviewPriority(source)));
}
