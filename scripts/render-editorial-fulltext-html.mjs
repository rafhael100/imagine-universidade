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
  const curriculumById=new Map();
  for(const [courseIndex,course] of source.courses.entries()){
    for(const [lessonIndex,lesson] of course.lessons.entries()){
      const id=course.slug+"/"+lesson.slug;
      assert.ok(!fullSource.has(id),"Duplicate full-text lesson identity");
      assert.ok(typeof lesson.body==="string"&&lesson.body.trim().length>0,
        "A source lesson body must be nonempty");
      fullSource.set(id,lesson.body);
      curriculumById.set(id,{courseIndex,lessonIndex,course});
    }
  }
  assert.equal(fullSource.size,35);
  const marker="<h3>Perguntas para leitura (não são aceite)</h3>";
  let position=0;
  const bodyHtml=renderReviewPriorityHtml(priority).replaceAll(marker,()=>{
    const row=priority.items[position++];
    assert.ok(row&&fullSource.has(row.id),"Full-text identity missing");
    const body=fullSource.get(row.id);
    const rubricId="rubrica-aula-"+row.original_position;
    assert.equal(sha256(body),row.content_sha256,
      "Full-text body diverges from its source-bound SHA-256");
    const paragraphs=body.replace(/\r\n/gu,"\n").split(/\n\n+/u);
    // R165: all 35 source drafts have four distinct pedagogical sections.
    // Keep the literal source labels and make 140 headings/link targets accessible.
    const sectionNames=["Contexto da aula","EXEMPLO FICTÍCIO",
      "APLICAÇÃO OPCIONAL","CUIDADO IMPORTANTE"];
    assert.equal(paragraphs.length,4,"Expected four pedagogical sections");
    const sectionIds=sectionNames.map((_,index)=>
      "aula-secao-"+row.original_position+"-"+(index+1));
    const sectionNav=sectionNames.map((name,index)=>
      '<li><a href="#'+sectionIds[index]+'">'+escapeReviewText(name)+'</a></li>'
    ).join("");
    const text=paragraphs.map((paragraph,index)=>{
      assert.ok(paragraph.trim().length>0,"No empty section in the source");
      let content=paragraph;
      if(index>0){
        const prefix=sectionNames[index]+"\n";
        assert.ok(paragraph.startsWith(prefix),
          "Pedagogical section label missing or out of order");
        content=paragraph.slice(prefix.length);
        assert.ok(content.trim().length>0,"Empty pedagogical section");
      }
      return '<section aria-labelledby="'+sectionIds[index]+'">'+
        '<h4 id="'+sectionIds[index]+'" tabindex="-1">'+
        escapeReviewText(sectionNames[index])+'</h4><p>'+
        escapeReviewText(content).replace(/\n/gu,"<br>")+'</p>'+
        '<p class="queue-nav"><a href="#secoes-aula-'+row.original_position+
        '">Voltar às seções desta aula</a></p></section>';
    }).join("\n");
    // R156–R157: native, source-bound within-course sequence. Never use
    // attention-priority neighbors as if they were curricular neighbors.
    const located=curriculumById.get(row.id);
    assert.ok(located,"Missing source-bound curriculum position");
    const courseLessons=located.course.lessons;
    const previous=located.lessonIndex>0?courseLessons[located.lessonIndex-1]:null;
    const next=located.lessonIndex+1<courseLessons.length?
      courseLessons[located.lessonIndex+1]:null;
    const findTarget=lesson=>{
      const identity=located.course.slug+"/"+lesson.slug;
      const found=priority.items.find(item=>item.id===identity);
      assert.ok(found,"Missing course neighbor in fulltext report");
      return found.original_position;
    };
    const lessonLinks=[
      previous?'<a href="#aula-'+findTarget(previous)+'">Anterior neste curso: '+
        escapeReviewText(previous.title)+'</a>':null,
      next?'<a href="#aula-'+findTarget(next)+'">Próxima neste curso: '+
        escapeReviewText(next.title)+'</a>':null,
      '<a href="#curriculo-curso-'+(located.courseIndex+1)+
        '">Voltar ao índice deste curso</a>'
    ].filter(Boolean).join(" ");
    return '<section aria-label="Texto integral da aula em rascunho">'+
      '<h3 id="secoes-aula-'+row.original_position+'" tabindex="-1">'+
      'Texto integral para revisão (rascunho não aprovado)</h3>\n'+
      '<p class="queue-nav"><a href="#'+rubricId+'">'+
      'Ir às seis perguntas de revisão desta aula</a></p>\n'+
      '<nav aria-label="Seções desta aula: '+escapeReviewText(row.lesson_title)+'">'+
      '<ol class="queue-nav">'+sectionNav+'</ol></nav>\n'+
      text+"\n</section>\n"+
      '<p class="queue-nav"><strong>Navegação por curso:</strong> '+
      lessonLinks+'</p>\n'+
      '<p id="'+rubricId+'" tabindex="-1" class="warning">'+
      'Seis perguntas para leitura humana: não constituem aceite autenticado.</p>\n'+
      marker;
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
    // R161: heading must accept native fragment focus on keyboard return.
    // tabindex=-1 does not add ten extra stops to the normal Tab sequence.
    return '<section aria-labelledby="'+id+'"><h3 id="'+id+'" tabindex="-1">'+
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
