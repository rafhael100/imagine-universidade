#!/usr/bin/env node
/**
 * UNI ERD-R141/R142: readable, non-interactive full-text companion to the
 * priority handoff. 35 synthetic draft bodies, no authorization or signoff.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {buildEditorialReviewPriority} from "./build-editorial-review-priority.mjs";
import {renderReviewPriorityHtml} from "./render-editorial-priority-html.mjs";

const sha256=value=>createHash("sha256").update(value,"utf8").digest("hex");
export const escapeReviewText=value=>String(value)
  .replace(/&/gu,"&amp;").replace(/</gu,"&lt;")
  .replace(/>/gu,"&gt;").replace(/"/gu,"&quot;")
  .replace(/'/gu,"&#39;");

export function renderEditorialFulltextHtml(source){
  assert.equal(source?.status,"editorial_draft");
  assert.equal(source?.audience,"authorized_imagine_clients_only");
  assert.equal(source?.courses?.length,10);
  const priority=buildEditorialReviewPriority(source);
  const fullSource=new Map();
  for(const course of source.courses){
    for(const lesson of course.lessons){
      const id=course.slug+"/"+lesson.slug;
      assert.ok(!fullSource.has(id),"Duplicate full-text lesson identity");
      assert.ok(typeof lesson.body==="string"&&lesson.body.trim().length>0,
        "A source lesson body must be nonempty");
      fullSource.set(id,lesson.body);
    }
  }
  assert.equal(fullSource.size,35);
  const marker="<h3>Perguntas para leitura (não são aceite)</h3>";
  let position=0;
  const bodyHtml=renderReviewPriorityHtml(priority).replaceAll(marker,()=>{
    const row=priority.items[position++];
    assert.ok(row&&fullSource.has(row.id),"Full-text identity missing");
    const body=fullSource.get(row.id);
    assert.equal(sha256(body),row.content_sha256,
      "Full-text body diverges from its source-bound SHA-256");
    const paragraphs=body.replace(/\r\n/gu,"\n").split(/\n\n+/u);
    assert.ok(paragraphs.length>=4,"All four pedagogical sections must be readable");
    const text=paragraphs.map(paragraph=>{
      assert.ok(paragraph.trim().length>0,"No empty section in the source");
      return "<p>"+escapeReviewText(paragraph).replace(/\n/gu,"<br>")+"</p>";
    }).join("\n");
    return '<section aria-label="Texto integral da aula em rascunho">'+
      "<h3>Texto integral para revisão (rascunho não aprovado)</h3>\n"+
      text+"\n</section>\n"+marker;
  });
  assert.equal(position,35,"Every priority article must receive exactly one source body");

  // R146: direct native keyboard entry into the *first priority article*
  // for each course. The queue ordering is not the curriculum ordering.
  const courseNames=new Set();
  const courseLinks=source.courses.map(course=>{
    assert.ok(!courseNames.has(course.slug),"Duplicate course shortcut identity");
    courseNames.add(course.slug);
    const target=priority.items.find(row=>row.id.startsWith(course.slug+"/"));
    assert.ok(target,"Every course needs one reachable lesson");
    return '<li><a href="#aula-'+target.original_position+'">'+
      escapeReviewText(course.title)+" · "+course.lessons.length+
      " aulas · iniciar leitura na fila deste curso</a></li>";
  }).join("\n");
  assert.equal(courseNames.size,10,"10 unique course shortcuts required");
  const courseMarker="<p>Ordem: aulas com sinais de atenção primeiro; empates seguem o currículo. Total: 35 aulas, 210 perguntas para revisão humana, 13 gates bloqueados.</p>";
  assert.ok(bodyHtml.includes(courseMarker),"Canonical warning order changed unexpectedly");
  // R151–R152: expose all 35 lesson destinations by course in *curricular*
  // order. The document bodies remain in the separate attention-first queue.
  const byLessonId=new Map(priority.items.map((row,index)=>[
    row.id,{row,queuePosition:index+1}
  ]));
  assert.equal(byLessonId.size,35,"Curricular links need 35 unique identities");
  const referenced=new Set();
  const curriculumSections=source.courses.map((course,courseIndex)=>{
    const lessons=course.lessons.map((lesson,lessonIndex)=>{
      const identity=course.slug+"/"+lesson.slug;
      const found=byLessonId.get(identity);
      assert.ok(found,"Missing curriculum destination");
      assert.ok(!referenced.has(identity),"Repeated curriculum destination");
      referenced.add(identity);
      return '<li><a href="#aula-'+found.row.original_position+'">Aula '+
        (lessonIndex+1)+' de '+course.lessons.length+': '+
        escapeReviewText(lesson.title)+' · fila '+found.queuePosition+
        ' de 35</a></li>';
    }).join("\n");
    const id="curriculo-curso-"+(courseIndex+1);
    return '<section aria-labelledby="'+id+'"><h3 id="'+id+'">'+
      escapeReviewText(course.title)+'</h3><ol>'+lessons+'</ol></section>';
  }).join("\n");
  assert.equal(referenced.size,35,"Every lesson must be reachable by course");
  const html=bodyHtml.replace(courseMarker,courseMarker+"\n"+
    '<nav aria-label="Acesso rápido aos cursos"><h2>Ir diretamente a um curso</h2>'+
    '<ol class="grid">'+courseLinks+"</ol></nav>\n"+
    '<nav aria-label="Índice curricular de aulas">'+
    '<h2>35 aulas organizadas por curso</h2>'+
    '<p>Esta ordem é curricular; a leitura continua na fila de revisão. Nenhuma aula foi aprovada.</p>'+
    '<div class="grid">'+curriculumSections+'</div></nav>');

  assert.ok(html.includes("HOLD_NO_GO")&&html.includes("13/13 NOT_VERIFIED"),
    "Full-text rendering must preserve release guards");
  assert.ok(!/<script\b/iu.test(html),"The review handoff is deliberately script-free");
  assert.ok(Buffer.byteLength(html,"utf8")<=1024*1024,"Bounded offline HTML required");
  return html;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  assert.equal(process.argv.length,2,"Only the versioned synthetic curriculum is allowed");
  const source=JSON.parse(readFileSync(
    new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
  process.stdout.write(renderEditorialFulltextHtml(source));
}
