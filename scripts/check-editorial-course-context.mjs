#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Execute the complete editor and its registered handlers. Only DOM, dialogs
// and HTTP fixtures are supplied here; no UI validator or dirty check is copied.
const view=readFileSync(new URL("../resources/views/university/admin.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
const boot='loadAdminCatalog();\n(async()=>{try{await refreshAudit();}catch(error){say(error.message);}})();';
assert.ok(start>=0&&end>start&&view.slice(start,end).includes(boot));
const exposed=["state","validatedAdminCourses","refreshCourses","refreshLessons","loadAdminCatalog","lockAccess",
  "publicationCheck","courseHasUnsavedEdits","editorialHasUnsavedChanges","mustConfirmBrowserExit",
  "lessonReorderFormSnapshot","lessonReorderDirtyForms","reorderLesson"];
const source=view.slice(start,end).replace(boot,"")+"\nglobalThis.editor={"+exposed.join(",")+"};";
const clone=value=>JSON.parse(JSON.stringify(value));
const guidanceFields=["course-audience","course-suggested-knowledge"];
const courseFields=["course-title","course-slug","course-category","course-summary","course-sort",...guidanceFields];
const lessonFields=["lesson-title","lesson-slug","lesson-body","lesson-sort"];
const fields=[...courseFields,...lessonFields];
const courseButtons=["course-save","check-publication","publish","unpublish","delete-course"];
const lessonButtons=["lesson-save","clear-lesson","preview-lesson","delete-lesson"];
const ok=payload=>({status:200,payload});
function deferred(){let release;const promise=new Promise(resolve=>{release=resolve;});return {promise,release};}
async function bounded(promise){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{
  timer=setTimeout(()=>reject(new Error("Course context fixture did not reach its HTTP boundary")),1000);
})]);}finally{clearTimeout(timer);}}

class Node{
  constructor(tagName="DIV",id=""){
    this.tagName=tagName;this.id=id;this.value="";this.ownText="";this.children=[];this.parent=null;
    this.events=new Map();this.dataset={};this.attributes={};this.disabled=false;this.hidden=false;this.inert=false;this.className="";
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
async function harness({load=true,published=false,legacy=false}={}){
  const nodes=new Map(),body=new Node("BODY"),requests=[],dialogs=[];
  for(const match of view.slice(0,start).matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
    const node=new Node(match[1].toUpperCase(),match[2]);node.hidden=/\bhidden\b/.test(match[0]);
    node.disabled=/\bdisabled\b/.test(match[0]);nodes.set(node.id,node);body.append(node);
  }
  const get=id=>nodes.get(id)??body.querySelector("#"+id)??null;
  const layout=new Node("DIV","layout");layout.className="layout";body.append(layout);
  for(const id of ["course-form","lesson-form","course-items","lesson-items","lesson-order-status","catalog-recovery",
    "new-course","retry-catalog","editorial-course-search","editorial-category-filter","editorial-state-filter","clear-editorial-filters",
    "editorial-lesson-search","clear-editorial-lesson-filter","editorial-lesson-filter-status"])layout.append(get(id));
  get("course-form").append(...[...courseFields,...courseButtons].map(get));
  get("lesson-form").append(...[...lessonFields,...lessonButtons].map(get));
  for(const id of fields)get(id).value=id.endsWith("sort")?"0":"";
  get("course-category").value="metodologia";
  get("lesson-form").reset=()=>{for(const id of lessonFields)get(id).value=id.endsWith("sort")?"0":"";};
  const server={nextCourseId:3,hash:"a".repeat(64),courses:[1,2].map(id=>({id,slug:"curso-"+id,title:"Curso salvo "+id,
    category:"metodologia",summary:"Resumo salvo "+id,sort_order:0,is_published:published,
    ...(legacy?{}:{audience:"Pessoas que organizam o atendimento.",suggested_knowledge:"Conhecer a rotina pode ajudar."})})),
    lessons:new Map([[1,[11,12].map((id,index)=>({id,slug:"aula-"+id,title:"Aula salva "+id,
      body:"Conteúdo literal da aula "+id+".\n\nSegundo parágrafo.",sort_order:index,
      status:published?"published":"draft",is_published:published}))],
      [2,[{id:21,slug:"aula-21",title:"Aula salva 21",body:"Conteúdo do outro curso.",sort_order:0,status:"draft",is_published:false}]]])};
  const control={hook:null,accept:true};
  function commit(entry){
    if(entry.path==="/courses"&&entry.method==="POST"){
      const id=server.nextCourseId++;
      server.courses.push({id,...entry.body,audience:entry.body.audience??null,
        suggested_knowledge:entry.body.suggested_knowledge??null,is_published:false});server.lessons.set(id,[]);
      return {status:201,payload:{id,status:"draft"}};
    }
    const course=entry.path.match(/^\/courses\/(\d+)$/);
    if(course&&entry.method==="PATCH"){
      Object.assign(server.courses.find(row=>row.id===Number(course[1])),entry.body);server.hash="b".repeat(64);
      return ok({saved:true});
    }
    const lesson=entry.path.match(/^\/lessons\/(\d+)$/);
    if(lesson&&entry.method==="PATCH"){
      for(const rows of server.lessons.values()){
        const target=rows.find(row=>row.id===Number(lesson[1]));if(target)Object.assign(target,entry.body);
      }
      return ok({saved:true});
    }
    if(entry.path==="/courses/1/publish"&&entry.method==="POST")return ok({published:true});
    throw new Error("Unexpected fixture write: "+entry.method+" "+entry.path);
  }
  const document={body,getElementById:get,createElement:tag=>new Node(tag.toUpperCase()),
    querySelector:selector=>selector.startsWith("meta")?{content:"synthetic-csrf"}:selector===".layout"?layout:body.querySelector(selector),
    querySelectorAll:selector=>selector.includes(".layout")
      ?[...layout.querySelectorAll("button,input,select,textarea"),get("refresh-audit"),get("load-more-audit")]:body.querySelectorAll(selector)};
  const context=createContext({document,window:{addEventListener(){}},setTimeout,clearTimeout,
    confirm:message=>{dialogs.push(message);return control.accept;},
    fetch:async(url,options)=>{
      const entry={path:new URL(url,"http://127.0.0.1").pathname.replace("/universidade/private/admin",""),
        ...options,body:options.body===undefined?null:JSON.parse(options.body)};requests.push(entry);
      let result=control.hook?await control.hook(entry):undefined;
      if(result===undefined){
        if(entry.method!=="GET")result=commit(entry);
        else if(entry.path==="/courses")result=ok({courses:server.courses});
        else if(/^\/courses\/\d+\/lessons$/.test(entry.path))result=ok({lessons:server.lessons.get(Number(entry.path.split("/")[2]))||[]});
        else if(entry.path==="/courses/1/publication-check")result=ok({course_id:1,version:1,lesson_count:2,ready:true,
          issues:[],warnings:[],content_hash:server.hash,advisory_only:true});
        else if(entry.path==="/audit")result=ok({events:[],next_before_id:null});
        else throw new Error("Unexpected fixture read: "+entry.path);
      }
      return {status:result.status,ok:result.status>=200&&result.status<300,
        json:async()=>result.json?await result.json():clone(result.payload)};
    }});
  new Script(source,{filename:"actual-editorial-course-context"}).runInContext(context);
  const editor=context.editor;
  async function emit(node,type){
    assert.ok(node,"Actual control exists");
    for(let current=node;current;current=current.parent)for(const handler of current.events.get(type)||[])
      await handler({target:node,preventDefault(){}});
    await setImmediate();
  }
  const chooseCourse=id=>emit(get("course-items").querySelectorAll("[data-course]").find(node=>Number(node.dataset.course)===id),"click");
  if(load){await editor.refreshCourses(1);editor.state.overviewAttempted=true;
    await emit(get("lesson-items").querySelectorAll("[data-lesson]").find(node=>node.dataset.lesson==="11"),"click");}
  requests.length=0;
  return {editor,state:editor.state,get,server,control,requests,dialogs,commit,chooseCourse,
    invoke:id=>emit(get(id),id.endsWith("-form")?"submit":"click"),
    input:async(id,value)=>{get(id).value=value;await emit(get(id),"input");},
    values:()=>fields.map(id=>get(id).value),writes:()=>requests.filter(entry=>entry.method!=="GET")};
}
const paths=h=>h.requests.map(entry=>entry.method+" "+entry.path);
const stored=h=>h.server.courses[0];
let scenarios=0;
async function scenario(label,run){try{await run();}catch(error){error.message=label+": "+error.message;throw error;}scenarios++;}

await scenario("catalogue accepts optional legacy fields and 500 Unicode characters while keeping an allowlist",async()=>{
  const h=await harness({load:false}),parse=h.editor.validatedAdminCourses;
  for(const extra of [{},{audience:null,suggested_knowledge:null},{audience:"",suggested_knowledge:""},
    {audience:"🧭".repeat(500),suggested_knowledge:"Orientação <script>literal</script>.\nSegunda linha."}]){
    const source={...stored(h)};delete source.audience;delete source.suggested_knowledge;
    const result=parse({courses:[{...source,...extra,actor_key:"PRIVATE-OPERATOR"}]});
    assert.ok(result);assert.equal(result[0].audience,extra.audience??"");
    assert.equal(result[0].suggested_knowledge,extra.suggested_knowledge??"");assert.equal(Object.hasOwn(result[0],"actor_key"),false);
  }
  for(const field of ["audience","suggested_knowledge"])for(const invalid of [false,3,[],{},"x".repeat(501),"🧭".repeat(501)]){
    assert.equal(parse({courses:[stored(h),{...stored(h),id:3,[field]:invalid}]}),null);
  }
});
await scenario("optional controls have labels and no UTF-16 maxlength; published metadata remains read-only",async()=>{
  const h=await harness({published:true});
  for(const [id,text] of [["course-audience","Para quem"],["course-suggested-knowledge","Conhecimentos úteis"]]){
    assert.ok(view.includes('for="'+id+'">'+text));
    const tag=view.match(new RegExp('<textarea\\b[^>]*id="'+id+'"[^>]*>'))[0];
    assert.doesNotMatch(tag,/maxlength|required/);assert.match(tag,/aria-describedby="course-context-help"/);
    assert.equal(h.get(id).disabled,true);assert.ok(h.get(id).value.length>0);
  }
  await h.invoke("course-form");assert.equal(h.requests.length,0);
  const legacy=await harness({legacy:true});for(const id of guidanceFields)assert.equal(legacy.get(id).value,"");
});
await scenario("creation omits empty context independently and sends only explicitly filled text",async()=>{
  for(const filled of [false,true]){
    const h=await harness();await h.invoke("new-course");
    h.get("course-title").value="Novo curso";h.get("course-slug").value="novo-curso";
    h.get("course-audience").value=filled?"  Pessoas em atendimento.  ":"";
    h.get("course-suggested-knowledge").value="  ";
    await h.invoke("course-form");const write=h.writes()[0];
    assert.equal(h.writes().length,1);assert.equal(write.method,"POST");assert.equal(write.path,"/courses");
    assert.deepEqual(write.body,{title:"Novo curso",slug:"novo-curso",category:"metodologia",summary:"",sort_order:0,
      ...(filled?{audience:"Pessoas em atendimento."}:{})});
    assert.equal(h.get("course-audience").value,filled?"Pessoas em atendimento.":"");
    assert.equal(h.get("course-suggested-knowledge").value,"");assert.equal(h.state.course.id,3);
  }
});
await scenario("PATCH omits unchanged context and preserves a peer's newer guidance",async()=>{
  const h=await harness();stored(h).suggested_knowledge="Sugestão alterada em outra sessão.";
  await h.input("course-title","Título revisto");await h.invoke("course-form");
  assert.deepEqual(h.writes()[0].body,{title:"Título revisto",category:"metodologia",summary:"Resumo salvo 1"});
  assert.equal(stored(h).suggested_knowledge,"Sugestão alterada em outra sessão.");
  assert.equal(h.get("course-suggested-knowledge").value,stored(h).suggested_knowledge);
  assert.deepEqual(paths(h),["PATCH /courses/1","GET /courses","GET /courses/1/lessons"]);
});
await scenario("PATCH replaces or explicitly clears one context field without resetting the other or course order",async()=>{
  const h=await harness();await h.input("course-audience","  Público revisado 😀  ");await h.invoke("course-form");
  assert.deepEqual(h.writes()[0].body,{title:"Curso salvo 1",category:"metodologia",summary:"Resumo salvo 1",audience:"Público revisado 😀"});
  assert.equal(stored(h).suggested_knowledge,"Conhecer a rotina pode ajudar.");
  await h.input("course-suggested-knowledge","  ");await h.invoke("course-form");
  assert.deepEqual(h.writes()[1].body,{title:"Curso salvo 1",category:"metodologia",summary:"Resumo salvo 1",suggested_knowledge:null});
  assert.equal(stored(h).audience,"Público revisado 😀");assert.equal(stored(h).suggested_knowledge,null);
  assert.equal(h.get("course-suggested-knowledge").value,"");assert.equal(stored(h).sort_order,0);
});
await scenario("500 astral Unicode characters round-trip without truncation and 501 are rejected before any write",async()=>{
  for(const [field,id] of [["audience","course-audience"],["suggested_knowledge","course-suggested-knowledge"]]){
    const h=await harness();await h.input(id,"🧭".repeat(500));await h.invoke("course-form");
    assert.equal(h.writes()[0].body[field],"🧭".repeat(500));assert.equal(h.get(id).value,"🧭".repeat(500));
    for(const text of ["🧭".repeat(501),"x".repeat(501)]){
      await h.input(id,text);const before=h.requests.length,buffers=h.values();await h.invoke("course-form");
      assert.equal(h.requests.length,before);assert.deepEqual(h.values(),buffers);assert.equal(h.state.writeOutcomeUnknown,false);
      assert.equal(h.state.writePending,false);assert.equal(h.get(id).focused,true);assert.match(h.get("status").textContent,/500 caracteres/);
    }
  }
});
await scenario("context-only drafts participate in discard, browser-exit and reorder guards",async()=>{
  const h=await harness();await h.input("course-audience","Público local ainda não salvo.");
  assert.equal(h.editor.courseHasUnsavedEdits(),true);assert.equal(h.editor.mustConfirmBrowserExit(),true);
  const snapshot=h.editor.lessonReorderFormSnapshot();assert.equal(snapshot.course.length,7);
  assert.equal(snapshot.course[5],h.get("course-audience").value);assert.equal(snapshot.course[6],h.get("course-suggested-knowledge").value);
  assert.equal(h.editor.lessonReorderDirtyForms(snapshot).course,true);
  const buffers=h.values();h.control.accept=false;await h.chooseCourse(2);await h.invoke("new-course");
  assert.equal(h.state.course.id,1);assert.deepEqual(h.values(),buffers);assert.equal(h.dialogs.length,2);
  await h.editor.reorderLesson(12,"up");assert.equal(h.requests.length,0);assert.deepEqual(h.values(),buffers);
  h.control.accept=true;await h.chooseCourse(2);assert.equal(h.state.course.id,2);
  assert.equal(h.get("course-audience").value,stored(h).audience);
});
await scenario("guidance alone makes a new course dirty before any title is filled",async()=>{
  const h=await harness();await h.invoke("new-course");await h.input("course-suggested-knowledge","Orientação ainda em rascunho.");
  assert.equal(h.editor.courseHasUnsavedEdits(),true);assert.equal(h.editor.mustConfirmBrowserExit(),true);
  h.control.accept=false;await h.chooseCourse(1);assert.equal(h.state.course,null);
  assert.equal(h.get("course-suggested-knowledge").value,"Orientação ainda em rascunho.");assert.equal(h.requests.length,0);
});
await scenario("lesson-first saving preserves both literal course guidance buffers",async()=>{
  const h=await harness();await h.input("course-audience","  Público local 😀  ");
  await h.input("course-suggested-knowledge","  Sugestão local <b>literal</b>.  ");
  await h.input("lesson-body","  Texto local da aula ainda não salvo.  ");const buffers=h.values();
  await h.invoke("course-form");assert.equal(h.requests.length,0);assert.deepEqual(h.values(),buffers);
  await h.invoke("lesson-form");assert.deepEqual(h.values().slice(0,7),buffers.slice(0,7));
  assert.equal(h.writes().length,1);assert.equal(h.writes()[0].path,"/lessons/11");
  await h.invoke("course-form");assert.equal(h.writes().length,2);assert.equal(h.writes()[1].path,"/courses/1");
  assert.equal(h.writes()[1].body.audience,"Público local 😀");assert.equal(h.writes()[1].body.suggested_knowledge,"Sugestão local <b>literal</b>.");
});
await scenario("context edits invalidate preflight and block publication without computing a client hash",async()=>{
  const h=await harness();await h.editor.publicationCheck();assert.equal(h.get("publication-readiness").hidden,false);
  await h.input("course-audience","Orientação revisada.");const reads=h.requests.length;
  assert.equal(h.get("publication-readiness").hidden,true);assert.equal(h.editor.editorialHasUnsavedChanges(),true);
  await h.invoke("check-publication");await h.invoke("publish");assert.equal(h.requests.length,reads);assert.equal(h.writes().length,0);
  await h.invoke("course-form");await h.invoke("publish");
  const publication=h.writes().find(entry=>entry.path==="/courses/1/publish");
  assert.deepEqual(publication.body,{expected_content_hash:"b".repeat(64)});
});
await scenario("late preflight cannot restore readiness after a guidance input",async()=>{
  const h=await harness(),seen=deferred(),held=deferred();
  h.control.hook=entry=>{if(entry.path.endsWith("/publication-check")){seen.release();return held.promise;}};
  const pending=h.editor.publicationCheck();await bounded(seen.promise);
  await h.input("course-suggested-knowledge","Outra sugestão local.");const buffers=h.values();
  held.release(ok({course_id:1,version:1,lesson_count:2,ready:true,issues:[],warnings:[],content_hash:"a".repeat(64),advisory_only:true}));
  assert.equal(await pending,null);assert.equal(h.get("publication-readiness").hidden,true);
  assert.deepEqual(h.values(),buffers);assert.equal(h.writes().length,0);
});
await scenario("a changed guidance buffer during reorder is detected by the existing literal snapshot fence",async()=>{
  const h=await harness(),seen=deferred(),held=deferred();
  h.control.hook=entry=>{if(entry.path.endsWith("/lessons/reorder")){seen.release();return held.promise;}};
  const pending=h.editor.reorderLesson(12,"up");await bounded(seen.promise);
  h.get("course-audience").value="Buffer alterado externamente durante a escrita.";const buffers=h.values();
  held.release(ok({schema_version:1,scope:"current_editorial_draft",course_id:1,course_version:1,status:"draft",
    lesson_id:12,direction:"up",changed:true,order:[{id:12,sort_order:0},{id:11,sort_order:1}]}));
  await pending;assert.equal(h.state.writeOutcomeUnknown,true);assert.deepEqual(h.values(),buffers);
  for(const id of guidanceFields)assert.equal(h.get(id).disabled,true);
  assert.equal(h.requests.length,1);assert.equal(h.writes().length,1);
});
await scenario("uncertain save preserves both guidance fields and the lesson until explicit manual recovery",async()=>{
  const h=await harness();await h.input("course-audience","  Público salvo com resposta perdida.  ");
  await h.input("course-suggested-knowledge","  Conhecimento útil preservado.  ");const buffers=h.values();
  h.control.hook=entry=>{if(entry.method==="PATCH"){h.commit(entry);return {status:503,payload:{}};}};
  await h.invoke("course-form");assert.equal(h.state.writeOutcomeUnknown,true);assert.deepEqual(h.values(),buffers);
  for(const id of guidanceFields)assert.equal(h.get(id).disabled,true);
  assert.deepEqual(paths(h),["PATCH /courses/1"]);await h.invoke("course-form");assert.equal(h.requests.length,1);
  h.control.accept=false;await h.invoke("retry-catalog");assert.deepEqual(h.values(),buffers);assert.equal(h.requests.length,1);
  h.control.accept=true;h.control.hook=null;await h.invoke("retry-catalog");
  assert.equal(h.state.writeOutcomeUnknown,false);assert.equal(h.state.lesson.id,11);
  assert.equal(h.get("course-audience").value,"Público salvo com resposta perdida.");
  assert.equal(h.get("course-suggested-knowledge").value,"Conhecimento útil preservado.");
  assert.equal(h.writes().length,1);for(const id of guidanceFields)assert.equal(h.get(id).disabled,false);
});
await scenario("malformed context makes a catalog unavailable rather than enabling a partial or empty editor",async()=>{
  const h=await harness();h.control.hook=entry=>entry.path==="/courses"
    ?ok({courses:[stored(h),{...stored(h),id:8,audience:"🧭".repeat(501)}]}):undefined;
  await h.editor.loadAdminCatalog();assert.equal(h.state.catalogReady,false);assert.equal(h.state.course,null);
  assert.equal(h.get("new-course").disabled,true);for(const id of guidanceFields){assert.equal(h.get(id).value,"");assert.equal(h.get(id).disabled,true);}
  assert.equal(h.writes().length,0);
});
for(const status of [403,419])await scenario(status+" purges new context fields without recovery or another write",async()=>{
  const h=await harness();await h.input("course-audience","Orientação local privada.");
  h.control.hook=entry=>entry.method==="PATCH"?{status,payload:{}}:undefined;
  await h.invoke("course-form");assert.equal(h.state.accessDenied,true);assert.equal(h.state.course,null);
  for(const id of fields){if(id!=="course-category")assert.equal(h.get(id).value,"");assert.equal(h.get(id).disabled,true);}
  await h.invoke("course-form");assert.equal(h.requests.length,1);assert.equal(h.writes().length,1);
});
console.log("PASS editorial course context: "+scenarios+" actual-script scenarios; Unicode, omission, explicit clearing, sibling drafts, preflight and authority fences");
