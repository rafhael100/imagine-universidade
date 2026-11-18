#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Run the entire real editor with its registered search, selection and reorder handlers.
// Only DOM, HTTP and dialogs are synthetic; expected matches/orders are literal fixtures.
const view=readFileSync(new URL("../resources/views/university/admin.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
const boot='loadAdminCatalog();\n(async()=>{try{await refreshAudit();}catch(error){say(error.message);}})();';
assert.ok(start>=0&&end>start&&view.slice(start,end).includes(boot));
const exposed=["state","validatedLessonOrder","lessonReorderTarget","validatedLessonReorderReceipt","draftLessonOrder",
  "lessonReorderFormSnapshot","lessonReorderDirtyForms","renderLessonReorderControls","reorderLesson","renderLessons",
  "refreshCourses","refreshLessons","loadAdminCatalog","beginWrite","finishWrite","publicationCheck","lockAccess",
  "editorialLessonFiltersAllowed","filteredEditorialLessons","renderEditorialLessonFilters","updateEditorialLessonFilter",
  "freezeUncertainEditorialWrite","loadEditorialArchiveVersions","loadEditorialArchiveLessons","loadEditorialArchiveBody","refreshAudit"];
const source=view.slice(start,end).replace(boot,"")+"\nglobalThis.editor={"+exposed.join(",")+"};";
const clone=value=>JSON.parse(JSON.stringify(value));
const before=[{id:11,sort_order:5},{id:12,sort_order:5},{id:13,sort_order:9}];
const movedUp=[{id:12,sort_order:0},{id:11,sort_order:1},{id:13,sort_order:2}];
const movedDown=[{id:11,sort_order:0},{id:13,sort_order:1},{id:12,sort_order:2}];
const receipt=(order=movedUp,extra={})=>({schema_version:1,scope:"current_editorial_draft",course_id:1,
  course_version:7,status:"draft",lesson_id:12,direction:"up",changed:true,order:clone(order),...extra});
const courseFields=["course-title","course-slug","course-category","course-summary","course-sort"];
const lessonFields=["lesson-title","lesson-slug","lesson-body","lesson-sort"];
const courseButtons=["course-save","check-publication","publish","unpublish","delete-course"];
const lessonButtons=["lesson-save","clear-lesson","preview-lesson","delete-lesson"];
const allFields=[...courseFields,...lessonFields];
const ok=payload=>({status:200,payload});
function deferred(){let release;const promise=new Promise(resolve=>{release=resolve;});return {promise,release};}
async function bounded(promise){
  let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new Error("Lesson search test did not reach its HTTP boundary")),1000);
  })]);}finally{clearTimeout(timer);}
}
class Node{
  constructor(tagName="DIV",id=""){
    this.tagName=tagName;this.id=id;this.ownText="";this.children=[];this.parent=null;this.events=new Map();
    this.dataset={};this.attributes={};this.value="";this.disabled=false;this.hidden=false;this.inert=false;this.className="";
  }
  get isConnected(){for(let node=this;node;node=node.parent)if(node.tagName==="BODY")return true;return false;}
  contains(other){for(let node=other;node;node=node.parent)if(node===this)return true;return false;}
  get textContent(){return this.ownText+this.children.map(child=>child.textContent).join("");}
  set textContent(value){this.replaceChildren();this.ownText=String(value);}
  append(...children){for(const child of children){child.remove();child.parent=this;this.children.push(child);}}
  replaceChildren(...children){for(const child of this.children)child.parent=null;this.ownText="";this.children=[];this.append(...children);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);this.parent=null;}
  setAttribute(name,value){this.attributes[name]=String(value);}
  addEventListener(type,handler){const list=this.events.get(type)||[];list.push(handler);this.events.set(type,list);}
  focus(){this.focused=true;}
  scrollIntoView(){}
  all(){return this.children.flatMap(child=>[child,...child.all()]);}
  matches(selector){
    if(selector.startsWith("#"))return this.id===selector.slice(1);
    if(selector.startsWith("."))return this.className.split(" ").includes(selector.slice(1));
    if(selector.startsWith("[data-"))return Object.hasOwn(this.dataset,selector.slice(6,-1).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase()));
    return this.tagName===selector.toUpperCase();
  }
  closest(selector){for(let node=this;node;node=node.parent)if(node.matches(selector))return node;return null;}
  querySelectorAll(selector){return this.all().filter(node=>selector.split(",").some(part=>node.matches(part.trim())));}
  querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
}
async function harness({load=true,select=12,published=false}={}){
  const nodes=new Map(),body=new Node("BODY"),requests=[],dialogs=[];
  for(const match of view.slice(0,start).matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
    const node=new Node(match[1].toUpperCase(),match[2]);node.hidden=/\bhidden\b/.test(match[0]);
    node.disabled=/\bdisabled\b/.test(match[0]);nodes.set(node.id,node);body.append(node);
  }
  const get=id=>nodes.get(id)??body.querySelector("#"+id)??null;
  const layout=new Node("DIV","layout");layout.className="layout";body.append(layout);
  for(const id of ["course-form","lesson-form","course-items","lesson-items","lesson-order-status","catalog-recovery",
    "new-course","retry-catalog","editorial-course-search","editorial-category-filter","editorial-state-filter","clear-editorial-filters",
    "editorial-lesson-search","clear-editorial-lesson-filter","editorial-lesson-filter-status"])
    layout.append(get(id));
  get("course-form").append(...[...courseFields,...courseButtons].map(get));
  get("lesson-form").append(...[...lessonFields,...lessonButtons].map(get));
  for(const id of allFields)get(id).value=id.endsWith("sort")?"0":"";
  get("course-category").value="metodologia";
  get("lesson-form").reset=()=>{for(const id of lessonFields)get(id).value=id.endsWith("sort")?"0":"";};
  const server={courses:[1,2].map(id=>({id,slug:"curso-"+id,title:"Curso salvo "+id,category:"metodologia",
    summary:"Resumo salvo "+id,sort_order:0,is_published:published})),
    lessons:new Map([[1,before.map((pair,index)=>({...pair,slug:["inicio-editorial","planejamento-vendas","gestao-canais"][index],
      title:["Ação e método","Planejamento de vendas","Conexões de canais"][index],
      body:"Conteúdo exclusivo-corpo da aula "+pair.id+".\n\nSegundo parágrafo preservado.",status:published?"published":"draft",is_published:published}))],
      [2,[{id:21,sort_order:0,slug:"aula-21",title:"Aula salva 21",body:"Texto autorizado do outro curso.",status:"draft",is_published:false}]]])};
  const control={hook:null,reorder:ok(receipt()),commitOrder:clone(movedUp),accept:true};
  const document={body,getElementById:get,createElement:tag=>new Node(tag.toUpperCase()),
    querySelector:selector=>selector.startsWith("meta")?{content:"synthetic-csrf"}:selector===".layout"?layout:body.querySelector(selector),
    querySelectorAll:selector=>selector.includes(".layout")
      ?[...layout.querySelectorAll("button,input,select,textarea"),get("refresh-audit"),get("load-more-audit")]
      :body.querySelectorAll(selector)};
  const context=createContext({document,window:{addEventListener(){}},setTimeout:()=>1,clearTimeout:()=>{},
    confirm:message=>{dialogs.push(message);return control.accept;},
    fetch:async(url,options)=>{
      const path=new URL(url,"http://127.0.0.1").pathname.replace("/universidade/private/admin","");
      const entry={path,...options,body:options.body===undefined?null:JSON.parse(options.body)};requests.push(entry);
      let result=control.hook?await control.hook(entry):undefined;
      if(result===undefined){
        if(path==="/courses"&&entry.method==="GET")result=ok({courses:server.courses});
        else if(/^\/courses\/\d+\/lessons$/.test(path)&&entry.method==="GET")
          result=ok({lessons:server.lessons.get(Number(path.split("/")[2]))||[]});
        else if(path==="/courses/1/lessons/reorder"&&entry.method==="POST"){
          if(control.commitOrder){
            const existing=new Map(server.lessons.get(1).map(lesson=>[lesson.id,lesson]));
            server.lessons.set(1,control.commitOrder.map(pair=>({...existing.get(pair.id),sort_order:pair.sort_order})));
          }
          result=typeof control.reorder==="function"?await control.reorder(entry):control.reorder;
        }else if(path==="/courses/1/publication-check")result=ok({course_id:1,version:7,lesson_count:3,
          ready:true,issues:[],warnings:[],content_hash:"a".repeat(64),advisory_only:true});
        else if(path==="/overview")result=ok({schema_version:1,scope:"current_editorial_catalog",
          totals:{courses:2,published_courses:0,draft_courses:2,current_lessons:4,courses_without_lessons:0,courses_without_summary:0},
          categories:[{category:"metodologia",courses:2,published_courses:0,draft_courses:2,current_lessons:4},
            ...["negocios","sistemas"].map(category=>({category,courses:0,published_courses:0,draft_courses:0,current_lessons:0}))]});
        else if(path==="/courses/1/versions")result=ok({schema_version:1,scope:"editorial_archived_content",course_id:1,
          versions:[{version:1,status:"archived",lesson_count:1}],next_before_version:null});
        else if(path==="/courses/1/versions/1/lessons")result=ok({schema_version:1,scope:"editorial_archived_content",course_id:1,
          course_version:1,status:"archived",lessons:[{id:91,slug:"aula-arquivada",title:"Aula histórica",sort_order:0}],next_after:null});
        else if(path==="/courses/1/versions/1/lessons/91")result=ok({schema_version:1,scope:"editorial_archived_content",course_id:1,
          course_version:1,status:"archived",lesson:{id:91,slug:"aula-arquivada",title:"Aula histórica",sort_order:0,body:"Corpo arquivado literal."}});
        else if(path==="/audit")result=ok({events:[],next_before_id:null});
        else throw new Error("Unexpected synthetic request: "+entry.method+" "+path);
      }
      return {status:result.status,ok:result.status>=200&&result.status<300,
        json:async()=>result.json?await result.json():clone(result.payload)};
    }});
  new Script(source,{filename:"actual-admin-lesson-search"}).runInContext(context);
  const editor=context.editor;
  async function emit(node,type,extra={}){
    assert.ok(node,"Actual editor control exists");const path=[];
    for(let current=node;current;current=current.parent)path.push(current);
    for(const current of path)for(const handler of current.events.get(type)||[])
      await handler({target:node,preventDefault(){},...extra});
    await setImmediate();
  }
  const move=(id=12,direction="up")=>get("lesson-items").querySelectorAll("[data-move-lesson]")
    .find(button=>Number(button.dataset.moveLesson)===id&&button.dataset.direction===direction);
  const choose=id=>emit(get("lesson-items").querySelectorAll("[data-lesson]").find(button=>Number(button.dataset.lesson)===id),"click");
  if(load){await editor.refreshCourses(1);if(select!==null)await choose(select);}
  const click=async value=>{
    const node=typeof value==="string"?get(value):value;
    if(node.disabled||!node.isConnected)return;
    for(let current=node;current;current=current.parent)if(current.inert)return;
    await emit(node,"click");
  };
  return {editor,state:editor.state,get,layout,server,control,requests,dialogs,move,choose,click,
    emit,flush:()=>setImmediate(),invoke:node=>emit(node,"click"),
    fields:()=>allFields.map(id=>get(id).value),
    order:()=>clone(editor.state.lessons.map(({id,sort_order})=>({id,sort_order}))),
    displayed:()=>get("lesson-items").querySelectorAll("[data-lesson-row]").map(row=>Number(row.dataset.lessonRow)),
    writes:()=>requests.filter(entry=>entry.method!=="GET"),
    search:async query=>{get("editorial-lesson-search").value=query;await emit(get("editorial-lesson-search"),"input");},
    matches:()=>clone(editor.filteredEditorialLessons().matches.map(lesson=>lesson.id)),
    generations:()=>[editor.state.courseRequest,editor.state.lessonRequest,editor.state.preflightRequest],
    archive:async()=>{await editor.loadEditorialArchiveVersions();await editor.loadEditorialArchiveLessons(1);await editor.loadEditorialArchiveBody(91);}};
}
let scenarios=0;
async function scenario(label,run){try{await run();}catch(error){throw new Error(label,{cause:error});}scenarios++;}
const status=h=>h.get("editorial-lesson-filter-status").textContent;
const selection=h=>[h.state.course?.id??null,h.state.lesson?.id??null];
const row=(h,id)=>h.get("lesson-items").querySelectorAll("[data-lesson-row]").find(node=>Number(node.dataset.lessonRow)===id);
await scenario("a labelled local search starts disabled before any authoritative list",async()=>{
  const h=await harness({load:false});h.editor.renderLessons();
  assert.match(view,/for="editorial-lesson-search">Buscar aula neste curso/);
  assert.match(view,/id="editorial-lesson-search"[^>]*maxlength="120"/);
  assert.equal(h.get("editorial-lesson-search").disabled,true);assert.equal(h.get("clear-editorial-lesson-filter").disabled,true);
  assert.match(status(h),/Selecione um curso/);assert.ok(!status(h).includes("0 de 0"));assert.equal(h.requests.length,0);
});
await scenario("the real input searches saved title and slug with case and accent normalization only",async()=>{
  const h=await harness({select:null}),reads=h.requests.length,lessons=h.state.lessons,original=clone(lessons);
  for(const [query,expected] of [["ACAO",[11]],["AC\u0327A\u0303O",[11]],["  MÉTODO  ",[11]],
    ["GESTAO-CANAIS",[13]],["VENDAS",[12]],["exclusivo-corpo",[]],["",[11,12,13]]]){
    await h.search(query);assert.deepEqual(h.matches(),expected);assert.deepEqual(h.displayed(),expected);
  }
  assert.equal(h.state.lessons,lessons);assert.deepEqual(clone(h.state.lessons),original);
  assert.equal(h.requests.length,reads);assert.equal(h.dialogs.length,0);
});
await scenario("a selected lesson outside results stays pinned without inflating matches or its full-list position",async()=>{
  const h=await harness(),selected=h.state.lesson,generations=h.generations(),reads=h.requests.length;
  await h.search("acao");assert.deepEqual(h.matches(),[11]);assert.deepEqual(h.displayed(),[12,11]);
  assert.equal(row(h,12).dataset.outsideFilter,"true");assert.match(row(h,12).textContent,/Em edição · fora da busca/);
  assert.match(row(h,12).textContent,/Posição 2/);assert.match(row(h,11).textContent,/Posição 1/);
  assert.match(status(h),/^Resultados: 1 de 3 aulas\./);assert.match(status(h),/Subir e Descer consideram todas as aulas do curso/);
  assert.equal(h.state.lesson,selected);assert.deepEqual(h.generations(),generations);assert.equal(h.requests.length,reads);
});
await scenario("zero matches remains different from an empty or unavailable lesson catalog",async()=>{
  const h=await harness();await h.search("nenhuma correspondencia");
  assert.deepEqual(h.displayed(),[12]);assert.match(status(h),/^Resultados: 0 de 3 aulas/);
  assert.match(h.get("lesson-items").textContent,/Nenhuma aula corresponde à busca/);
  h.server.lessons.set(1,[]);await h.editor.refreshLessons();
  assert.deepEqual(h.displayed(),[]);assert.match(status(h),/^Resultados: 0 de 0 aulas/);
  assert.match(h.get("lesson-items").textContent,/Nenhuma aula cadastrada/);
  h.control.hook=request=>request.path==="/courses/1/lessons"?{status:503,payload:{error:"temporarily_unavailable"}}:undefined;
  await assert.rejects(h.editor.refreshLessons());assert.equal(h.state.lessonsReady,false);
  assert.match(status(h),/Consulte as aulas/);assert.ok(!status(h).includes("0 de 0"));
});
await scenario("query length is bounded and whitespace is a clearable local query",async()=>{
  const h=await harness({select:null}),reads=h.requests.length;
  await h.search("a".repeat(121));assert.equal(h.state.lessonQuery.length,120);assert.equal(h.get("editorial-lesson-search").value.length,120);
  await h.search("   ");assert.deepEqual(h.displayed(),[11,12,13]);assert.equal(h.get("clear-editorial-lesson-filter").disabled,false);
  await h.click("clear-editorial-lesson-filter");assert.equal(h.state.lessonQuery,"");assert.equal(h.get("editorial-lesson-search").focused,true);
  assert.equal(h.get("clear-editorial-lesson-filter").disabled,true);assert.equal(h.requests.length,reads);
});
await scenario("filter and clear preserve live preflight, preview, archive and every request generation",async()=>{
  const h=await harness();await h.editor.publicationCheck();await h.archive();await h.click("preview-lesson");
  const before={fields:h.fields(),selected:selection(h),generations:h.generations(),requests:h.requests.length,
    preflight:h.get("publication-readiness").children.slice(),preview:h.get("preview-body").children.slice(),
    archive:clone(h.state.archive),archiveNodes:h.get("editorial-version-content").children.slice()};
  await h.search("acao");await h.click("clear-editorial-lesson-filter");
  assert.deepEqual(h.fields(),before.fields);assert.deepEqual(selection(h),before.selected);assert.deepEqual(h.generations(),before.generations);
  assert.equal(h.requests.length,before.requests);assert.equal(h.get("publication-readiness").hidden,false);
  assert.deepEqual(h.get("publication-readiness").children,before.preflight);assert.equal(h.get("lesson-preview").hidden,false);
  assert.deepEqual(h.get("preview-body").children,before.preview);assert.deepEqual(clone(h.state.archive),before.archive);
  assert.deepEqual(h.get("editorial-version-content").children,before.archiveNodes);
});
await scenario("all nine literal fields survive search and clear and unsaved titles do not enter matches",async()=>{
  const h=await harness();for(const id of allFields)h.get(id).value=id==="course-category"?"negocios":id.endsWith("sort")?"8":"  Texto local não salvo  ";
  const fields=h.fields(),reads=h.requests.length,selected=selection(h),generations=h.generations();
  await h.search("texto local nao salvo");assert.deepEqual(h.matches(),[]);assert.deepEqual(h.displayed(),[12]);
  assert.equal(h.move().disabled,true);await h.click("clear-editorial-lesson-filter");
  assert.deepEqual(h.fields(),fields);assert.deepEqual(selection(h),selected);assert.deepEqual(h.generations(),generations);
  assert.equal(h.requests.length,reads);assert.equal(h.dialogs.length,0);
});
await scenario("an unsaved new lesson also survives search without becoming a pinned saved record",async()=>{
  const h=await harness({select:null});h.get("lesson-title").value="Nova aula local";h.get("lesson-body").value="Conteúdo ainda não salvo.";
  const fields=h.fields(),reads=h.requests.length;await h.search("acao");
  assert.deepEqual(h.displayed(),[11]);assert.equal(h.editor.filteredEditorialLessons().pinned,null);
  assert.deepEqual(h.fields(),fields);assert.equal(h.state.lesson,null);assert.equal(h.requests.length,reads);
});
await scenario("the real lesson click keeps its native discard dialog and never refills the course form",async()=>{
  const h=await harness();h.get("lesson-body").value="  Corpo local em edição  ";h.get("course-summary").value="  Resumo local preservado  ";
  await h.search("acao");const fields=h.fields(),reads=h.requests.length;h.control.accept=false;await h.choose(11);
  assert.deepEqual(h.fields(),fields);assert.deepEqual(selection(h),[1,12]);assert.equal(h.state.lessonQuery,"acao");
  assert.equal(h.dialogs.length,1);assert.match(h.dialogs[0],/Descartá-las/);
  h.control.accept=true;await h.choose(11);assert.deepEqual(selection(h),[1,11]);assert.equal(h.state.lessonQuery,"acao");
  assert.equal(h.get("course-summary").value,fields[3]);assert.equal(h.get("lesson-body").value,h.state.lesson.body);
  assert.equal(h.requests.length,reads);assert.equal(h.writes().length,0);
});
await scenario("clicking the already selected pin does not prompt or discard a local draft",async()=>{
  const h=await harness();h.get("lesson-body").value="Texto local ainda não salvo.";await h.search("acao");
  const fields=h.fields(),reads=h.requests.length;await h.choose(12);
  assert.deepEqual(h.fields(),fields);assert.deepEqual(selection(h),[1,12]);assert.equal(h.dialogs.length,0);assert.equal(h.requests.length,reads);
});
await scenario("canceling a course change preserves query while a confirmed change resets its course-local scope",async()=>{
  const h=await harness();await h.search("acao");h.get("lesson-body").value="Texto local com alteração.";
  const next=h.get("course-items").querySelectorAll("[data-course]").find(node=>node.dataset.course==="2"),fields=h.fields(),reads=h.requests.length;
  h.control.accept=false;await h.click(next);assert.equal(h.state.lessonQuery,"acao");assert.deepEqual(h.fields(),fields);assert.equal(h.requests.length,reads);
  h.control.accept=true;await h.click(next);assert.equal(h.state.course.id,2);assert.equal(h.state.lessonQuery,"");
  assert.equal(h.state.lessonQueryCourseId,2);assert.deepEqual(h.displayed(),[21]);assert.equal(h.requests.length,reads+1);
});
await scenario("starting a new course clears the lesson query only after the existing discard guard accepts",async()=>{
  const h=await harness();await h.search("acao");h.get("lesson-body").value="Texto local com alteração.";
  h.control.accept=false;await h.click("new-course");assert.equal(h.state.lessonQuery,"acao");
  h.control.accept=true;await h.click("new-course");assert.equal(h.state.course,null);assert.equal(h.state.lessonQuery,"");
  assert.equal(h.get("editorial-lesson-search").disabled,true);assert.match(status(h),/Selecione um curso/);assert.equal(h.writes().length,0);
});
await scenario("same-course reload preserves query and refuses input while the replacement list is pending",async()=>{
  const h=await harness(),seen=deferred(),gate=deferred();await h.search("acao");
  h.control.hook=async request=>{if(request.path!=="/courses/1/lessons")return undefined;seen.release();await gate.promise;return ok({lessons:h.server.lessons.get(1)});};
  const pending=h.editor.refreshLessons();await bounded(seen.promise);
  assert.equal(h.get("editorial-lesson-search").disabled,true);assert.match(status(h),/Consulte as aulas/);
  await h.search("forged during read");await h.click("clear-editorial-lesson-filter");
  assert.equal(h.state.lessonQuery,"acao");assert.equal(h.get("editorial-lesson-search").value,"acao");
  gate.release();await pending;assert.deepEqual(h.displayed(),[12,11]);assert.equal(h.get("editorial-lesson-search").disabled,false);
  h.control.hook=null;await h.editor.loadAdminCatalog();assert.equal(h.state.lessonQuery,"acao");assert.deepEqual(h.displayed(),[12,11]);
});
await scenario("a malformed successful reload cannot become an empty catalog or enable local controls",async()=>{
  const h=await harness();await h.search("acao");h.server.lessons.set(1,[{id:11,title:"Incomplete"}]);
  await assert.rejects(h.editor.refreshLessons());assert.equal(h.state.lessonsReady,false);assert.deepEqual(h.displayed(),[]);
  assert.equal(h.state.lessonQuery,"acao");assert.equal(h.get("editorial-lesson-search").disabled,true);
  assert.ok(!status(h).includes("0 de 0"));assert.match(status(h),/Consulte as aulas/);
});
await scenario("a failed full catalog reload clears its absent course and never reports an empty lesson success",async()=>{
  const h=await harness();await h.search("acao");h.control.hook=request=>request.path==="/courses"?{status:503,payload:{}}:undefined;
  await h.editor.loadAdminCatalog();assert.equal(h.state.catalogReady,false);assert.equal(h.state.course,null);assert.equal(h.state.lessonQuery,"");
  assert.equal(h.get("editorial-lesson-search").disabled,true);assert.ok(!status(h).includes("0 de 0"));assert.equal(h.writes().length,0);
});
await scenario("an old lesson response cannot restore the prior course's filter or rows",async()=>{
  const h=await harness(),seen=deferred(),gate=deferred();await h.search("acao");
  h.control.hook=async request=>{if(request.path!=="/courses/1/lessons")return undefined;seen.release();await gate.promise;return ok({lessons:h.server.lessons.get(1)});};
  const old=h.editor.refreshLessons();await bounded(seen.promise);
  const next=h.get("course-items").querySelectorAll("[data-course]").find(node=>node.dataset.course==="2");
  await h.click(next);await h.search("21");gate.release();await old;
  assert.equal(h.state.course.id,2);assert.equal(h.state.lessonQuery,"21");assert.equal(h.state.lessonQueryCourseId,2);assert.deepEqual(h.displayed(),[21]);
});
await scenario("reordering uses the hidden neighbor and full canonical snapshot, retaining the active query",async()=>{
  const h=await harness({select:11});await h.search("gestao-canais");assert.deepEqual(h.displayed(),[11,13]);
  assert.match(row(h,13).textContent,/Posição 3/);assert.equal(h.move(13,"up").disabled,false);
  h.control.commitOrder=clone(movedDown);h.control.reorder=ok(receipt(movedDown,{lesson_id:13}));
  const reads=h.requests.length,fields=h.fields();await h.click(h.move(13,"up"));
  assert.deepEqual(h.writes()[0].body,{lesson_id:13,direction:"up",expected_order:before});
  assert.deepEqual(h.order(),movedDown);assert.deepEqual(h.displayed(),[11,13]);assert.deepEqual(h.matches(),[13]);
  assert.match(row(h,13).textContent,/Posição 2/);assert.equal(h.state.lessonQuery,"gestao-canais");
  assert.deepEqual(h.fields().slice(0,8),fields.slice(0,8));assert.equal(h.get("lesson-sort").value,"0");
  assert.equal(h.requests.length,reads+1);assert.equal(h.writes().length,1);
});
await scenario("a matching lesson keeps non-boundary moves even when it is the only visible row",async()=>{
  const h=await harness({select:null});await h.search("vendas");assert.deepEqual(h.displayed(),[12]);
  assert.equal(h.move(12,"up").disabled,false);assert.equal(h.move(12,"down").disabled,false);
  assert.match(row(h,12).textContent,/Posição 2/);assert.deepEqual(h.order(),before);assert.equal(h.writes().length,0);
});
await scenario("filtering detaches obsolete selection and movement controls without changing request generations",async()=>{
  const h=await harness(),oldChoice=h.get("lesson-items").querySelectorAll("[data-lesson]").find(node=>node.dataset.lesson==="13"),oldMove=h.move(13,"up"),generations=h.generations();
  await h.search("acao");assert.equal(oldChoice.isConnected,false);assert.equal(oldMove.isConnected,false);
  await h.invoke(oldChoice);await h.invoke(oldMove);
  await h.emit(h.get("lesson-items"),"click",{target:oldChoice});
  assert.deepEqual(selection(h),[1,12]);assert.deepEqual(h.generations(),generations);assert.equal(h.writes().length,0);assert.equal(h.dialogs.length,0);
});
await scenario("a forged or hidden selection control cannot replace the selected lesson",async()=>{
  const h=await harness(),button=h.get("lesson-items").querySelectorAll("[data-lesson]").find(node=>node.dataset.lesson==="13");
  button.dataset.lesson="999";await h.invoke(button);assert.equal(h.state.lesson.id,12);
  button.dataset.lesson="13";button.hidden=true;await h.invoke(button);assert.equal(h.state.lesson.id,12);assert.equal(h.dialogs.length,0);
});
await scenario("pending reorder blocks programmatic query and clear events without disturbing its complete snapshot",async()=>{
  const h=await harness(),seen=deferred(),gate=deferred();await h.search("vendas");
  h.control.reorder=async()=>{seen.release();await gate.promise;return ok(receipt());};
  await h.click(h.move());await bounded(seen.promise);assert.equal(h.get("editorial-lesson-search").disabled,true);
  const generations=h.generations();await h.search("forged pending");await h.invoke(h.get("clear-editorial-lesson-filter"));
  assert.equal(h.state.lessonQuery,"vendas");assert.equal(h.get("editorial-lesson-search").value,"vendas");assert.deepEqual(h.generations(),generations);
  assert.deepEqual(h.order(),before);gate.release();await h.flush();
  assert.deepEqual(h.order(),movedUp);assert.equal(h.state.lessonQuery,"vendas");assert.equal(h.get("editorial-lesson-search").disabled,false);assert.equal(h.writes().length,1);
});
for(const outcome of ["conflict","lost"]){
  await scenario("manual recovery retains the same-course query without replay after "+outcome,async()=>{
    const h=await harness();await h.search("vendas");
    if(outcome==="conflict"){h.control.commitOrder=null;h.control.reorder={status:409,payload:{error:"draft_order_changed"}};}
    else h.control.reorder=async()=>{throw new Error("synthetic lost reply");};
    await h.click(h.move());assert.equal(h.state.writeOutcomeUnknown,true);assert.equal(h.get("editorial-lesson-search").disabled,true);
    const fields=h.fields(),reads=h.requests.length;await h.search("forged uncertain");await h.invoke(h.get("clear-editorial-lesson-filter"));
    assert.equal(h.state.lessonQuery,"vendas");h.control.accept=false;await h.click("retry-catalog");
    assert.equal(h.requests.length,reads);assert.deepEqual(h.fields(),fields);assert.equal(h.state.lessonQuery,"vendas");
    h.control.accept=true;await h.click("retry-catalog");assert.equal(h.state.writeOutcomeUnknown,false);
    assert.equal(h.state.lessonQuery,"vendas");assert.deepEqual(h.order(),outcome==="lost"?movedUp:before);
    assert.deepEqual(h.displayed(),[12]);assert.equal(h.get("editorial-lesson-search").disabled,false);assert.equal(h.writes().length,1);
  });
}
await scenario("published courses remain locally searchable without enabling reorder or draft writes",async()=>{
  const h=await harness({published:true});await h.search("acao");assert.deepEqual(h.displayed(),[12,11]);
  assert.equal(h.get("editorial-lesson-search").disabled,false);assert.equal(h.get("lesson-save").disabled,true);
  for(const button of h.get("lesson-items").querySelectorAll("[data-move-lesson]"))assert.equal(button.disabled,true);
  await h.choose(11);assert.equal(h.state.lesson.id,11);assert.equal(h.writes().length,0);
});
await scenario("the existing 5000-row limit is preserved and a 5001-row response is rejected whole",async()=>{
  const h=await harness({select:null}),template=h.server.lessons.get(1)[0];
  const lessons=Array.from({length:5000},(_,index)=>({...template,id:index+1,slug:"aula-"+(index+1),title:"Aula "+(index+1),sort_order:index}));
  h.server.lessons.set(1,lessons);await h.editor.refreshLessons();await h.search("aula-5000");
  assert.deepEqual(h.displayed(),[5000]);assert.match(status(h),/^Resultados: 1 de 5000 aulas/);assert.match(row(h,5000).textContent,/Posição 5000/);
  assert.equal(h.state.lessons.length,5000);assert.equal(h.editor.draftLessonOrder().length,5000);
  h.server.lessons.set(1,[...lessons,{...template,id:5001,slug:"aula-5001",sort_order:5000}]);
  await assert.rejects(h.editor.refreshLessons());assert.equal(h.state.lessonsReady,false);assert.deepEqual(h.displayed(),[]);
  assert.equal(h.get("editorial-lesson-search").disabled,true);assert.ok(!status(h).includes("0 de 0"));assert.equal(h.writes().length,0);
});
for(const code of [403,419])await scenario("HTTP denial clears the private query and a late reorder cannot restore it: "+code,async()=>{
  const h=await harness(),seen=deferred(),gate=deferred();await h.search("vendas");
  h.control.reorder=async()=>{seen.release();await gate.promise;return ok(receipt());};
  await h.click(h.move());await bounded(seen.promise);
  h.control.hook=request=>request.path==="/audit"?{status:code,payload:{error:"access_denied"}}:undefined;
  await assert.doesNotReject(h.editor.refreshAudit());assert.equal(h.state.accessDenied,true);gate.release();await h.flush();
  assert.equal(h.state.lessonQuery,"");assert.equal(h.state.lessonQueryCourseId,null);assert.equal(h.get("editorial-lesson-search").value,"");
  assert.equal(h.get("editorial-lesson-search").disabled,true);assert.equal(status(h),"");assert.equal(h.get("editorial-lesson-filter-status").hidden,true);
  assert.deepEqual(h.displayed(),[]);await h.search("forged after denial");assert.equal(h.state.lessonQuery,"");assert.equal(h.get("editorial-lesson-search").value,"");
  assert.equal(h.writes().length,1);
});
console.log("PASS editorial lesson search: "+scenarios+" actual-script scenarios; local title/slug projection, full order, pinned selection, preserved drafts and manual recovery");
