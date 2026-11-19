#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Complete real view and handlers; only startup and DOM/HTTP are synthetic.
// No browser/server/database is started; guidance and lifecycle logic are real.
const view=readFileSync(new URL("../resources/views/university/student.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
assert.ok(start>=0&&end>start);const original=view.slice(start,end);
assert.match(original,/\nloadLibrary\(\);\s*$/);
const source=original.replace(/\nloadLibrary\(\);\s*$/,"")+"\nglobalThis.student={state,reconcileCatalogSelection,"+
  "loadLibrary,selectCourse,selectLesson,renderCourses,renderCourseGuidance,validatedStudentCourses,loadProgressHistory,loadReadingPosition,loadFavorites,lockAccess};";
const clone=value=>JSON.parse(JSON.stringify(value));
const ok=payload=>({status:200,payload});
const timestamp="2026-11-17T10:00:00Z";
function deferred(){let release;const promise=new Promise(resolve=>{release=resolve;});return {promise,release};}
function serverState(){
  return {courses:[1,2].map(id=>({id,slug:"curso-"+id,title:"Curso "+id,summary:"Resumo",category:id===1?"metodologia":"negocios"})),
    lessons:[11,12,21].map(id=>({id,slug:"aula-"+id,title:"Aula "+id,sort_order:id%10,course_id:id===21?2:1,course_version:2,
      body:"Introdução autorizada "+id+".\n\nEXEMPLO FICTÍCIO\nExemplo literal.\n\nOutro parágrafo.\n\nAPLICAÇÃO OPCIONAL\nPrática opcional."})),
    completed:new Set(),favorites:[1,2],position:{course_id:1,course_version:2,lesson_id:12,saved_at:timestamp},
    history:[{completion_id:100,course_slug:"curso-1",course_version:1,lesson_slug:"aula-antiga",completed_at:timestamp,availability:"unavailable"}]};
}
class Node{
  constructor(env,tag="div",text=""){
    this.env=env;this.tag=tag;this.ownText=text;this.id="";this.className="";this.children=[];this.parent=null;
    this.events=new Map();this.attributes={};this.dataset={};this.disabled=false;this.hidden=false;this.checked=false;
    this.value="";this.open=false;this.tabIndex=-1;
  }
  set innerHTML(value){throw new Error("Text must not be interpreted as HTML");}
  get isConnected(){return this===this.env.document.body||Boolean(this.parent?.isConnected);}
  contains(other){return other===this||this.children.some(child=>child.contains(other));}
  set textContent(value){this.replaceChildren();this.ownText=String(value);}
  get textContent(){return this.ownText+this.children.map(child=>child.textContent).join("");}
  append(...children){for(const child of children){child.remove();child.parent=this;this.children.push(child);}}
  replaceChildren(...children){
    if(this.children.some(child=>child.contains(this.env.document.activeElement)))this.env.document.activeElement=this.env.document.body;
    for(const child of this.children)child.parent=null;this.children=[];this.ownText="";this.append(...children);
  }
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);this.parent=null;}
  addEventListener(type,handler){const handlers=this.events.get(type)||[];handlers.push(handler);this.events.set(type,handlers);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  removeAttribute(name){delete this.attributes[name];}
  focus(){if(!this.isConnected||this.disabled)return;this.env.document.activeElement=this;this.env.focuses.push(this);this.env.observe("focusin",this);}
  scrollIntoView(){}
  all(){return this.children.flatMap(child=>[child,...child.all()]);}
  matches(selector){
    if(selector.startsWith("#"))return this.id===selector.slice(1);
    if(selector.startsWith("."))return this.className.split(" ").includes(selector.slice(1));
    if(selector.startsWith("[data-"))return Object.hasOwn(this.dataset,selector.slice(6,-1).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase()));
    return this.tag===selector;
  }
  closest(selector){for(let node=this;node;node=node.parent)if(node.matches(selector))return node;return null;}
  querySelectorAll(selector){return this.all().filter(node=>node.matches(selector));}
  querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
}
async function harness({select=true,server=serverState()}={}){
  const events=new Map(),calls=[],storageCalls=[],nodes=new Map(),env={document:null,focuses:[]};
  env.observe=(type,target)=>{for(const handler of events.get(type)||[])handler({target});};
  const document={visibilityState:"visible",hasFocus:()=>true,activeElement:null,
    addEventListener:(type,handler)=>{const handlers=events.get(type)||[];handlers.push(handler);events.set(type,handlers);}};
  env.document=document;document.body=new Node(env,"body");document.activeElement=document.body;
  for(const match of view.slice(0,start).matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
    const node=new Node(env,match[1]);node.id=match[2];node.hidden=/\bhidden\b/.test(match[0]);node.disabled=/\bdisabled\b/.test(match[0]);
    nodes.set(node.id,node);document.body.append(node);
  }
  const get=id=>document.body.querySelector("#"+id)||nodes.get(id)||null;
  const content=get("lesson-content"),lessonsBox=get("lesson-items");
  const filters=["todos","metodologia","negocios","sistemas"].map(category=>{
    const node=new Node(env,"button");node.dataset.filter=category;document.body.append(node);return node;
  });
  const sim=["sim-visits","sim-leads-rate","sim-clients-rate"].map(get);sim.forEach((node,index)=>{node.value=["1000","5","10"][index];});
  Object.assign(document,{getElementById:get,createElement:tag=>new Node(env,tag),createTextNode:text=>new Node(env,"#text",text),
    querySelector:selector=>selector.startsWith("meta")?{content:"synthetic-csrf"}:document.body.querySelector(selector),
    querySelectorAll:selector=>selector==="[data-filter]"?filters:selector===".sim-inputs input"?sim:document.body.querySelectorAll(selector)});
  const control={overrides:new Map()},catalog=()=>server.courses.map(course=>({...course,
    lessons_total:server.lessons.filter(lesson=>lesson.course_id===course.id).length,
    lessons_completed:server.lessons.filter(lesson=>lesson.course_id===course.id&&server.completed.has(lesson.id)).length}));
  const privateState=()=>clone({favorites:server.favorites,position:server.position,history:server.history,completed:[...server.completed]});
  const fallback=entry=>{
    const {path,method}=entry;
    if(path==="/initialize")return ok({ready:true});
    if(path==="/courses")return ok({courses:catalog()});
    if(path==="/favorites")return ok({course_ids:server.favorites.filter(id=>server.courses.some(course=>course.id===id))});
    if(path==="/reading-position")return ok({schema_version:1,scope:"current_authenticated_student",revision:"saved-private-revision",
      status:server.position?(server.courses.some(course=>course.id===server.position.course_id)?"available":"unavailable"):"none",
      position:server.position&&server.courses.some(course=>course.id===server.position.course_id)?server.position:null});
    if(path==="/progress/history")return ok({schema_version:1,scope:"current_authenticated_student",
      completions:server.history.map(row=>({...row,availability:row.course_version===2&&server.courses.some(course=>course.slug===row.course_slug)?"available":"unavailable"})),next_before_id:null});
    if(/^\/courses\/\d+\/lessons$/.test(path))return ok({lessons:server.lessons.filter(lesson=>lesson.course_id===Number(path.split("/")[2]))
      .map(lesson=>({id:lesson.id,slug:lesson.slug,title:lesson.title,sort_order:lesson.sort_order,completed:server.completed.has(lesson.id)?1:0}))});
    if(/^\/lessons\/\d+$/.test(path))return ok({lesson:server.lessons.find(lesson=>lesson.id===Number(path.split("/")[2]))});
    if(path.endsWith("/progress"))return ok({completed:server.completed.has(Number(path.split("/")[2]))});
    if(path.endsWith("/complete")&&method==="POST"){
      const id=Number(path.split("/")[2]),lesson=server.lessons.find(row=>row.id===id);server.completed.add(id);
      if(!server.history.some(row=>row.lesson_slug===lesson.slug&&row.course_version===lesson.course_version))server.history.unshift({completion_id:200,
        course_slug:"curso-"+lesson.course_id,course_version:lesson.course_version,lesson_slug:lesson.slug,completed_at:timestamp,availability:"available"});
      return ok({completed:true});
    }
    if(path.endsWith("/tutor"))return {status:503,payload:{}};
    throw new Error("Unexpected course guidance request "+method+" "+path);
  };
  const storage=Object.fromEntries(["getItem","setItem","removeItem","clear"].map(method=>[method,()=>{
    storageCalls.push(method);throw new Error("Course guidance must not persist data");
  }]));
  const context=createContext({document,window:{addEventListener(){}},Blob,URL,TextEncoder,setTimeout,clearTimeout,
    localStorage:storage,sessionStorage:storage,
    fetch:async(url,options)=>{
      const path=new URL(url,"http://127.0.0.1").pathname.replace("/universidade/private","");
      const entry={path,...options};calls.push(entry);const override=control.overrides.get(path);
      const response=(typeof override==="function"?await override(entry):override)??fallback(entry);
      return {status:response.status,ok:response.status>=200&&response.status<300,json:async()=>response.json?await response.json():clone(response.payload)};
    }});
  new Script(source,{filename:"actual-student-course-guidance"}).runInContext(context);
  const student=context.student;
  async function emit(node,type="click"){
    assert.ok(node,"Actual control exists");env.observe(type,node);
    const path=[];for(let current=node;current;current=current.parent)path.push(current);
    for(const current of path)for(const handler of current.events.get(type)||[])await handler({target:node,preventDefault(){}});
    await setImmediate();
  }
  await student.loadLibrary();await setImmediate();if(select)await student.selectCourse(1);
  return {student,state:student.state,server,control,catalog,privateState,content,lessonsBox,get,filters,calls,document,env,storageCalls,
    emit,click:node=>emit(typeof node==="string"?get(node):node),complete:()=>emit(content.querySelector(".primary")),
    writes:()=>calls.filter(call=>call.method!=="GET"&&call.path!=="/initialize"),
    removeCourse:id=>{server.courses=server.courses.filter(course=>course.id!==id);},
    hold:(path,result)=>{const gate=deferred(),seen=deferred();control.overrides.set(path,async entry=>{
      seen.release();await gate.promise;return result??fallback(entry);});
      return {seen:()=>seen.promise,release:()=>{control.overrides.delete(path);gate.release();}};}};
}
const fields=[["audience","audience"],["suggested_knowledge","knowledge"]];
const guided=()=>{
  const server=serverState();Object.assign(server.courses[0],{
    audience:"Pessoas que desejam revisar o tema.\nParticipação voluntária.",
    suggested_knowledge:"Experiências do dia a dia.\n\nVocê pode consultar as aulas quando desejar."});
  return server;
};
const selection=state=>({courseId:state.courseId,lessonId:state.lessonId,courseRequest:state.courseRequest,lessonRequest:state.lessonRequest});
const displayed=(h,name)=>h.get("course-guidance-"+name).textContent;
function cleared(h){
  assert.equal(h.get("course-guidance").hidden,true);
  for(const [,name] of fields){
    assert.equal(displayed(h,name),"");assert.equal(h.get("course-guidance-"+name+"-group").hidden,true);
  }
}
function shown(h,course=h.server.courses.find(item=>item.id===h.state.courseId)){
  assert.equal(h.get("course-guidance").hidden,false);
  for(const [field,name] of fields){
    const text=course[field]??"",visible=text.trim().length>0;
    assert.equal(displayed(h,name),visible?text:"");
    assert.equal(h.get("course-guidance-"+name+"-group").hidden,!visible);
  }
}
let scenarios=0;
async function scenario(label,run){try{await run();}catch(error){error.message=label+": "+error.message;throw error;}scenarios++;}
await scenario("legacy catalog fields may be absent without blocking study",async()=>{
  const h=await harness();cleared(h);
  assert.deepEqual(clone(h.state.courses.map(course=>[course.audience,course.suggested_knowledge])),[["",""],["",""]]);
  assert.equal(h.content.querySelector("h3").textContent,"Aula 11");assert.equal(h.content.querySelector(".primary").disabled,false);
  assert.equal(h.writes().length,0);
});
await scenario("null and whitespace remain optional and never create empty guidance labels",async()=>{
  const server=serverState();Object.assign(server.courses[0],{audience:null,suggested_knowledge:" \n\t "});
  const h=await harness({server});cleared(h);assert.equal(h.state.courses[0].audience,"");
  assert.equal(h.state.courses[0].suggested_knowledge," \n\t ");
});
for(const [field,name] of fields)await scenario(field+" can appear alone",async()=>{
  const server=serverState();server.courses[0][field]="Orientação opcional";
  const h=await harness({server});shown(h);assert.equal(displayed(h,name),"Orientação opcional");
  assert.equal(h.content.querySelector(".primary").disabled,false);
});
await scenario("literal HTML Markdown whitespace and line breaks are not interpreted",async()=>{
  const server=guided();server.courses[0].audience="  <img src=x onerror=alert(1)>\n**Texto literal**\r\n😀  ";
  server.courses[0].suggested_knowledge="<script>conteúdo literal</script>\n\n# Sem interpretação";
  const h=await harness({server});shown(h);
  for(const [,name] of fields)assert.equal(h.get("course-guidance-"+name).children.length,0);
  assert.equal(h.document.body.querySelector("img"),null);assert.equal(h.storageCalls.length,0);
});
await scenario("both optional fields accept exactly 500 Unicode code points",async()=>{
  const server=guided();for(const [field] of fields)server.courses[0][field]="😀".repeat(500);
  const h=await harness({server});shown(h);
  for(const [,name] of fields){assert.equal(Array.from(displayed(h,name)).length,500);assert.equal(displayed(h,name).length,1000);}
});
for(const [field] of fields)await scenario(field+" rejects overlong or non-string JSON values",async()=>{
  const h=await harness({select:false}),course=h.catalog()[0];
  for(const value of ["😀".repeat(501),"a".repeat(501),false,true,0,500,[],{}]){
    const payload=JSON.parse(JSON.stringify({courses:[{...course,[field]:value}]}));
    assert.equal(h.student.validatedStudentCourses(payload),null,"Reject "+JSON.stringify(value).slice(0,50));
  }
  for(const value of [null,""]){
    const parsed=h.student.validatedStudentCourses(JSON.parse(JSON.stringify({courses:[{...course,[field]:value}]})));
    assert.equal(parsed[0][field],"");
  }
});
await scenario("allowlist adds only guidance and keeps existing catalog integrity",async()=>{
  const h=await harness({select:false}),course={...h.catalog()[0],audience:"Público",suggested_knowledge:"Conhecimentos",
    body:"Not a catalog field",subject_key:"private",company_id:8,version_id:9};
  const normalized=h.student.validatedStudentCourses({courses:[course]})[0];
  assert.deepEqual(Object.keys(normalized).sort(),["id","slug","title","category","summary","audience","suggested_knowledge","lessons_total","lessons_completed"].sort());
  for(const invalid of [{...course,summary:false},{...course,lessons_completed:3},{...course,id:"1"}])
    assert.equal(h.student.validatedStudentCourses({courses:[invalid]}),null);
});
await scenario("catalog guidance stays hidden until a course is explicitly selected",async()=>{
  const h=await harness({select:false,server:guided()});cleared(h);assert.equal(h.state.courseId,null);
  assert.equal(h.calls.some(call=>call.path.includes("/lessons")),false);
  await h.student.selectCourse(1);shown(h);assert.equal(h.writes().length,0);
});
await scenario("a legitimately empty course can show its current optional guidance",async()=>{
  const server=guided();server.lessons=server.lessons.filter(lesson=>lesson.course_id!==1);
  const h=await harness({server});shown(h);assert.equal(h.state.lessonId,null);
  assert.match(h.content.textContent,/Ainda não existem aulas/);assert.equal(h.writes().length,0);
});
await scenario("course change clears former guidance while the new list is pending",async()=>{
  const server=guided();Object.assign(server.courses[1],{audience:"Público do segundo curso",suggested_knowledge:"Outra orientação"});
  const h=await harness({server}),hold=h.hold("/courses/2/lessons");const opening=h.student.selectCourse(2);
  try{await hold.seen();cleared(h);assert.equal(h.state.courseId,2);}finally{hold.release();}
  await opening;shown(h);assert.equal(h.content.querySelector("h3").textContent,"Aula 21");
});
await scenario("switching to legacy metadata leaves no previous guidance visible",async()=>{
  const h=await harness({server:guided()});shown(h);await h.student.selectCourse(2);cleared(h);
  assert.equal(h.content.querySelector("h3").textContent,"Aula 21");assert.equal(h.writes().length,0);
});
await scenario("an old course list cannot restore guidance after another course opens",async()=>{
  const server=guided();server.courses[1].audience="Público do segundo curso";
  const h=await harness({server}),hold=h.hold("/courses/1/lessons");const old=h.student.selectCourse(1);
  try{await hold.seen();await h.student.selectCourse(2);shown(h);}finally{hold.release();}
  await old;shown(h);assert.equal(h.state.courseId,2);assert.equal(h.state.lessonId,21);
});
await scenario("failed lesson list hides guidance and a manual retry restores the same course",async()=>{
  const h=await harness({server:guided()});h.control.overrides.set("/courses/1/lessons",{status:503,payload:{}});
  const before=h.calls.length;await h.student.selectCourse(1);cleared(h);
  assert.equal(h.calls.length,before+1);const retry=h.content.querySelector(".lesson-retry");assert.ok(retry);
  h.control.overrides.delete("/courses/1/lessons");await h.click(retry);shown(h);
  assert.equal(h.state.lessonId,11);assert.equal(h.writes().length,0);
});
await scenario("library refresh replaces only current guidance while preserving the exact reader focus and preferences",async()=>{
  const h=await harness({server:guided()}),before=selection(h.state),privateBefore=h.privateState();
  const body=h.content.querySelector(".lesson-text"),help=h.content.querySelector("[data-lesson-help]"),heading=h.content.querySelector("h3");
  h.get("lesson-help-question").value="Dúvida ainda não enviada";h.get("lesson-help-question").focus();
  h.state.contextualCoursesVisible=false;h.get("course-lesson-query").value="consulta local";await h.emit(h.get("course-lesson-query"),"input");
  const focus=h.document.activeElement,focuses=h.env.focuses.length;
  Object.assign(h.server.courses[0],{audience:"Público revisado no cadastro atual",suggested_knowledge:"Orientação atualizada"});
  const hold=h.hold("/courses"),refresh=h.student.loadLibrary();
  try{await hold.seen();cleared(h);assert.equal(h.content.querySelector(".lesson-text"),body);assert.equal(h.document.activeElement,focus);}finally{hold.release();}
  await refresh;await setImmediate();shown(h);
  assert.deepEqual(selection(h.state),before);assert.equal(h.content.querySelector(".lesson-text"),body);
  assert.equal(h.content.querySelector("[data-lesson-help]"),help);assert.equal(h.content.querySelector("h3"),heading);
  assert.equal(h.get("lesson-help-question").value,"Dúvida ainda não enviada");assert.equal(h.document.activeElement,focus);
  assert.equal(h.env.focuses.length,focuses);assert.equal(h.state.lessonFilter.query,"consulta local");
  assert.equal(h.state.contextualCoursesVisible,false);assert.deepEqual(h.privateState(),privateBefore);
  assert.equal(h.state.readingSnapshot.position.lesson_id,12);assert.equal(h.writes().length,0);
});
await scenario("metadata removal on a valid refresh hides guidance without discarding study",async()=>{
  const h=await harness({server:guided()}),body=h.content.querySelector(".lesson-text"),before=selection(h.state);
  delete h.server.courses[0].audience;h.server.courses[0].suggested_knowledge=null;
  await h.student.loadLibrary();await setImmediate();cleared(h);
  assert.equal(h.content.querySelector(".lesson-text"),body);assert.deepEqual(selection(h.state),before);
});
await scenario("catalog omission removes selected guidance without ending global authority",async()=>{
  const h=await harness({server:guided()}),privateBefore=h.privateState();h.removeCourse(1);
  await h.student.loadLibrary();await setImmediate();cleared(h);
  assert.equal(h.state.courseId,null);assert.equal(h.state.accessDenied,false);assert.equal(h.state.libraryReady,true);
  assert.deepEqual(h.privateState(),privateBefore);assert.equal(h.state.readingSnapshot.status,"unavailable");
});
await scenario("a legitimately empty catalog is not a malformed-guidance error",async()=>{
  const h=await harness({server:guided()});h.server.courses=[];await h.student.loadLibrary();await setImmediate();cleared(h);
  assert.equal(h.state.libraryReady,true);assert.equal(h.get("library-recovery").hidden,true);
  assert.match(h.get("overall-progress").textContent,/Nenhuma aula publicada/);
});
for(const response of [{status:503,payload:{}},ok({courses:[{...guided().courses[0],lessons_total:2,lessons_completed:0,audience:false}]})])
await scenario("library failure or malformed guidance clears old data and recovers manually",async()=>{
  const h=await harness({server:guided()});h.control.overrides.set("/courses",response);
  await h.student.loadLibrary();cleared(h);assert.equal(h.state.libraryReady,false);
  assert.equal(h.get("library-recovery").hidden,false);assert.equal(h.state.courseId,null);
  h.control.overrides.delete("/courses");await h.click("retry-library");await setImmediate();cleared(h);
  assert.equal(h.state.libraryReady,true);await h.student.selectCourse(1);shown(h);assert.equal(h.writes().length,0);
});
await scenario("individual lesson navigation keeps guidance and uses only existing lesson GETs",async()=>{
  const h=await harness({server:guided()}),before=h.calls.length,privateBefore=h.privateState();
  await h.student.selectLesson(12);shown(h);
  assert.deepEqual(h.calls.slice(before).map(call=>call.method+" "+call.path).sort(),["GET /lessons/12","GET /lessons/12/progress"]);
  assert.deepEqual(h.privateState(),privateBefore);assert.equal(h.writes().length,0);
});
await scenario("local lesson filtering never searches guidance or changes its visibility",async()=>{
  const h=await harness({server:guided()}),before=h.calls.length,body=h.content.querySelector(".lesson-text");
  h.get("course-lesson-query").value="Participação voluntária";await h.emit(h.get("course-lesson-query"),"input");shown(h);
  assert.match(h.get("course-lesson-filter-status").textContent,/Resultados: 0 de 2 aulas/);
  assert.equal(h.content.querySelector(".lesson-text"),body);assert.equal(h.calls.length,before);
});
for(const mode of ["category","catalog query","favorites filter"])await scenario(mode+" clears guidance with the existing selection reset",async()=>{
  const h=await harness({server:guided()}),before=h.calls.length;
  if(mode==="category")await h.click(h.filters.find(button=>button.dataset.filter==="negocios"));
  else if(mode==="catalog query"){h.get("course-search").value="Curso 2";await h.emit(h.get("course-search"),"input");}
  else{h.get("favorites-only").checked=true;await h.emit(h.get("favorites-only"),"change");}
  cleared(h);assert.equal(h.state.courseId,null);assert.equal(h.calls.length,before);
});
await scenario("confirmed completion updates guidance without replacing the reader or changing the write",async()=>{
  const h=await harness({server:guided()}),body=h.content.querySelector(".lesson-text"),position=clone(h.state.readingSnapshot);
  h.server.courses[0].audience="Orientação atual após consulta do catálogo";await h.complete();shown(h);
  assert.equal(h.content.querySelector(".lesson-text"),body);assert.equal(h.content.querySelector(".primary").disabled,true);
  assert.equal(h.writes().length,1);assert.equal(h.writes()[0].path,"/lessons/11/complete");
  assert.deepEqual(clone(h.state.readingSnapshot),position);assert.equal(h.server.completed.has(11),true);
});
await scenario("completion remains confirmed when the follow-up catalog withdraws the course",async()=>{
  const h=await harness({server:guided()});h.removeCourse(1);await h.complete();cleared(h);
  assert.equal(h.server.completed.has(11),true);assert.match(h.get("status").textContent,/Seu progresso foi registrado/);
  assert.equal(h.state.accessDenied,false);assert.equal(h.writes().length,1);
});
for(const code of [403,419])await scenario(code+" immediately purges guidance with the existing access lock",async()=>{
  const h=await harness({server:guided()});h.control.overrides.set("/favorites",{status:code,payload:{}});
  await h.student.loadFavorites();cleared(h);assert.equal(h.state.accessDenied,true);
  const requests=h.calls.length;h.student.renderCourseGuidance();await h.student.selectCourse(1);cleared(h);
  assert.equal(h.calls.length,requests);assert.equal(h.storageCalls.length,0);
});
await scenario("a pending catalog response cannot restore guidance after revocation",async()=>{
  const h=await harness({server:guided()}),hold=h.hold("/courses"),refresh=h.student.loadLibrary();
  try{await hold.seen();h.student.lockAccess("Acesso encerrado");cleared(h);}finally{hold.release();}
  await refresh;cleared(h);assert.equal(h.state.accessDenied,true);assert.equal(h.state.courses.length,0);
});
await scenario("presentational rerenders leave requests focus reader and private state untouched",async()=>{
  const h=await harness({server:guided()}),before=selection(h.state),privateBefore=h.privateState(),requests=h.calls.length;
  const body=h.content.querySelector(".lesson-text");h.get("lesson-help-question").focus();const focus=h.document.activeElement,focuses=h.env.focuses.length;
  h.student.renderCourseGuidance();h.student.renderCourses();h.student.renderCourseGuidance();shown(h);
  assert.deepEqual(selection(h.state),before);assert.equal(h.content.querySelector(".lesson-text"),body);
  assert.equal(h.document.activeElement,focus);assert.equal(h.env.focuses.length,focuses);
  assert.deepEqual(h.privateState(),privateBefore);assert.equal(h.calls.length,requests);assert.equal(h.storageCalls.length,0);
});
console.log("C144 student course guidance: "+scenarios+" actual-script scenarios passed.");
