#!/usr/bin/env node
/** R158: keep in-course links distinct from heuristic queue links. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {renderEditorialFulltextHtml,escapeReviewText} from "./render-editorial-fulltext-html.mjs";
import {buildEditorialReviewPriority} from "./build-editorial-review-priority.mjs";
import {verifyEditorialFulltextHtml} from "./verify-editorial-fulltext-html.mjs";
const source=JSON.parse(readFileSync(
  new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const report=buildEditorialReviewPriority(source);
const html=renderEditorialFulltextHtml(source);
const nav=[...html.matchAll(
  /<p class="queue-nav"><strong>Navegação por curso:<\/strong> ([\s\S]*?)<\/p>/gu)];
assert.equal(nav.length,35,"Each lesson must provide curricular navigation");
let previousCount=0,nextCount=0,returnCount=0;
for(const [queueIndex,item] of report.items.entries()){
  const [slug,lessonSlug]=item.id.split("/");
  const courseIndex=source.courses.findIndex(course=>course.slug===slug);
  assert.ok(courseIndex>=0);
  const course=source.courses[courseIndex];
  const index=course.lessons.findIndex(lesson=>lesson.slug===lessonSlug);
  assert.ok(index>=0);
  const previous=index>0?course.lessons[index-1]:null;
  const next=index+1<course.lessons.length?course.lessons[index+1]:null;
  const block=nav[queueIndex][1];
  const linkFor=(lesson,direction)=>{
    const row=report.items.find(candidate=>candidate.id===slug+"/"+lesson.slug);
    assert.ok(row);
    return '<a href="#aula-'+row.original_position+'">'+direction+': '+
      escapeReviewText(lesson.title)+'</a>';
  };
  if(previous){
    assert.ok(block.includes(linkFor(previous,"Anterior neste curso")));
    previousCount++;
  }else assert.ok(!block.includes("Anterior neste curso"));
  if(next){
    assert.ok(block.includes(linkFor(next,"Próxima neste curso")));
    nextCount++;
  }else assert.ok(!block.includes("Próxima neste curso"));
  assert.ok(block.includes('<a href="#curriculo-curso-'+(courseIndex+1)+
    '">Voltar ao índice deste curso</a>'));
  returnCount++;
  assert.ok(!block.includes("aprovada")&&!block.includes("concluída"));
}
assert.equal(previousCount,25);
assert.equal(nextCount,25);
assert.equal(returnCount,35);
assert.equal((html.match(/<article id="aula-\d+"/gu)||[]).length,35);
assert.equal((html.match(/<h3>Perguntas para leitura \(não são aceite\)<\/h3>/gu)||[]).length,35);
assert.equal(verifyEditorialFulltextHtml(Buffer.from(html),source).release_decision,"HOLD_NO_GO");
let mutations=0;
for(const changed of [
  html.replace("Anterior neste curso:","Aula aprovada:"),
  html.replace("Próxima neste curso:","Curso concluído:"),
  html.replace('Voltar ao índice deste curso</a>', 'Ir para serviço ativo</a>'),
  html.replace(/href="#curriculo-curso-\d+"/u,'href="#curriculo-curso-99"'),
  html.replace("HOLD_NO_GO","GO"),
  html+"\n"
]){
  assert.throws(()=>verifyEditorialFulltextHtml(Buffer.from(changed),source));
  mutations++;
}
assert.equal(mutations,6);
console.log("PASS R156-R158: 25 previous + 25 next + 35 return routes; 6 negatives; HOLD_NO_GO.");
