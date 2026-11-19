#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Complete real view and handlers; only startup and DOM/HTTP are synthetic.
// No browser/server/database is started and no reconciliation logic is copied.
const view=readFileSync(new URL("../resources/views/university/student.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
assert.ok(start>=0&&end>start);const original=view.slice(start,end);
assert.match(original,/\nloadLibrary\(\);\s*$/);
const source=original.replace(/\nloadLibrary\(\);\s*$/,"")+"\nglobalThis.student={state,reconcileCatalogSelection,"+
  "loadLibrary,selectCourse,selectLesson,renderCourses,loadProgressHistory,loadReadingPosition,loadFavorites,lockAccess};";
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
    throw new Error("Unexpected reconciliation request "+method+" "+path);
  };
  const storage=Object.fromEntries(["getItem","setItem","removeItem","clear"].map(method=>[method,()=>{
    storageCalls.push(method);throw new Error("No catalog reconciliation may persist data");
  }]));
  const context=createContext({document,window:{addEventListener(){}},Blob,URL,TextEncoder,setTimeout,clearTimeout,
    localStorage:storage,sessionStorage:storage,
    fetch:async(url,options)=>{
      const path=new URL(url,"http://127.0.0.1").pathname.replace("/universidade/private","");
      const entry={path,...options};calls.push(entry);const override=control.overrides.get(path);
      const response=(typeof override==="function"?await override(entry):override)??fallback(entry);
      return {status:response.status,ok:response.status>=200&&response.status<300,json:async()=>response.json?await response.json():clone(response.payload)};
    }});
  new Script(source,{filename:"actual-student-catalog-reconciliation"}).runInContext(context);
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
const selection=state=>({courseId:state.courseId,lessonId:state.lessonId,courseRequest:state.courseRequest,lessonRequest:state.lessonRequest});
function cleared(h){
  assert.equal(h.state.courseId,null);assert.equal(h.state.lessonId,null);assert.equal(h.lessonsBox.children.length,0);
  assert.equal(h.content.querySelector("h3"),null);assert.equal(h.content.querySelector(".lesson-text"),null);
  assert.equal(h.content.querySelector("[data-lesson-help]"),null);assert.equal(h.content.querySelector(".primary"),null);
  assert.equal(h.content.querySelector("[data-next-lesson]"),null);assert.equal(h.content.querySelector("[data-next-course]"),null);
  assert.ok(h.content.querySelector("[data-course-unavailable]"));assert.match(h.content.textContent,/curso deixou de constar no catálogo/);
  assert.equal(h.state.accessDenied,false);assert.equal(h.state.libraryReady,true);
  assert.equal(h.get("course-favorite-panel").hidden,true);assert.equal(h.get("contextual-courses-panel").hidden,true);
  assert.equal(h.get("export-progress").disabled,false);assert.equal(h.get("export-favorites").disabled,false);
}
let scenarios=0;
async function scenario(label,run){try{await run();}catch(error){error.message=label+": "+error.message;throw error;}scenarios++;}
await scenario("validated library refresh removes an absent selected course and all reader content",async()=>{
  const h=await harness(),before=selection(h.state);h.removeCourse(1);await h.student.loadLibrary();await setImmediate();cleared(h);
  assert.equal(h.state.courseRequest,before.courseRequest+1);assert.equal(h.state.lessonRequest,before.lessonRequest+1);
  assert.deepEqual(clone(h.state.courses.map(course=>course.id)),[2]);assert.equal(h.writes().length,0);
});
await scenario("confirmed completion followed by course absence clears the reader but keeps confirmation and history",async()=>{
  const h=await harness(),before=selection(h.state);h.removeCourse(1);await h.complete();cleared(h);
  assert.equal(h.state.lessonRequest,before.lessonRequest+1);assert.equal(h.state.courseRequest,before.courseRequest+1);
  assert.match(h.get("status").textContent,/Seu progresso foi registrado/);assert.equal(h.server.completed.has(11),true);
  assert.equal(h.writes().length,1);assert.equal(h.writes()[0].path,"/lessons/11/complete");
  assert.equal(h.calls.filter(call=>call.path==="/progress/history").length,0);
  await h.student.loadProgressHistory();assert.equal(h.state.progressHistory.rows.length,2);
  assert.equal(h.state.progressHistory.rows[0].lesson_slug,"aula-11");assert.equal(h.state.progressHistory.rows[0].availability,"unavailable");
});
await scenario("an empty valid catalog leaves personal capabilities authorized without inventing another course",async()=>{
  const h=await harness(),before=h.privateState();h.server.courses=[];await h.student.loadLibrary();await setImmediate();cleared(h);
  assert.match(h.get("overall-progress").textContent,/Nenhuma aula publicada/);assert.equal(h.get("resume-course").disabled,true);
  assert.deepEqual(h.privateState(),before);assert.equal(h.state.readingSnapshot.status,"unavailable");
  assert.equal(h.get("export-reading-position").disabled,false);assert.equal(h.get("progress-history-panel").hidden,false);
  assert.equal(h.writes().length,0);assert.equal(h.storageCalls.length,0);
});
await scenario("presence preserves the exact reader DOM and generations through a validated refresh",async()=>{
  const h=await harness(),before=selection(h.state),body=h.content.querySelector(".lesson-text"),help=h.content.querySelector("[data-lesson-help]");
  const fields=h.lessonsBox.children.slice();h.get("lesson-help-question").value="Pergunta ainda não enviada";
  await h.student.loadLibrary();await setImmediate();assert.deepEqual(selection(h.state),before);
  assert.equal(h.content.querySelector(".lesson-text"),body);assert.equal(h.content.querySelector("[data-lesson-help]"),help);
  assert.deepEqual(h.lessonsBox.children,fields);assert.equal(h.get("lesson-help-question").value,"Pergunta ainda não enviada");
  assert.equal(h.content.querySelector("[data-course-unavailable]"),null);
});
await scenario("presence after confirmed progress preserves the current lesson and does not invalidate its generation",async()=>{
  const h=await harness(),before=selection(h.state),body=h.content.querySelector(".lesson-text");await h.complete();
  assert.deepEqual(selection(h.state),before);assert.equal(h.content.querySelector(".lesson-text"),body);
  assert.equal(h.content.querySelector(".primary").disabled,true);assert.equal(h.writes().length,1);
  assert.equal(h.state.courses.find(course=>course.id===1).lessons_completed,1);
});
await scenario("a present course with new metadata or zero aggregate lessons does not imply version withdrawal",async()=>{
  const h=await harness(),before=selection(h.state),body=h.content.querySelector(".lesson-text");
  h.control.overrides.set("/courses",ok({courses:h.catalog().map(course=>course.id===1?{...course,title:"Título novo",lessons_total:0,lessons_completed:0}:course)}));
  await h.student.loadLibrary();await setImmediate();assert.deepEqual(selection(h.state),before);assert.equal(h.content.querySelector(".lesson-text"),body);
  assert.equal(h.content.querySelector("h3").textContent,"Aula 11");
});
await scenario("rendering filtered catalog subsets never reconciles or clears a present selection",async()=>{
  const h=await harness(),before=selection(h.state),body=h.content.querySelector(".lesson-text");
  h.state.query="sem correspondência";h.state.filter="negocios";h.state.favoritesOnly=true;h.student.renderCourses();
  assert.deepEqual(selection(h.state),before);assert.equal(h.content.querySelector(".lesson-text"),body);
  assert.equal(h.get("course-list").querySelectorAll("[data-course-id]").length,0);
});
await scenario("no initial selection leaves generations and the existing invitation intact",async()=>{
  const h=await harness({select:false}),before=selection(h.state),content=h.content.textContent;h.server.courses=[];
  await h.student.loadLibrary();await setImmediate();assert.deepEqual(selection(h.state),before);assert.equal(h.content.textContent,content);
  assert.equal(h.content.querySelector("[data-course-unavailable]"),null);
});
await scenario("reconciliation itself preserves global preferences private snapshots and authority",async()=>{
  const h=await harness();await h.student.loadProgressHistory();h.state.query="gestão";h.state.filter="negocios";
  h.state.favoritesOnly=true;h.state.contextualCoursesVisible=false;
  const keys=["query","filter","favoritesOnly","contextualCoursesVisible","favoriteIds","favoritesReady","readingSnapshot","readingRequest","progressHistory","retained","accessDenied","libraryReady"];
  const before=clone(Object.fromEntries(keys.map(key=>[key,h.state[key]])));h.state.courses=h.state.courses.filter(course=>course.id!==1);
  const calls=h.calls.length;assert.equal(h.student.reconcileCatalogSelection(),true);
  assert.deepEqual(clone(Object.fromEntries(keys.map(key=>[key,h.state[key]]))),before);assert.equal(h.calls.length,calls);
  const after=selection(h.state);assert.equal(h.student.reconcileCatalogSelection(),false);assert.deepEqual(selection(h.state),after);
});
await scenario("withdrawal preserves retained favorites and position without creating personal writes",async()=>{
  const h=await harness(),position=clone(h.state.readingSnapshot);h.state.favoritesOnly=true;h.state.query="termo";h.state.filter="metodologia";
  h.state.contextualCoursesVisible=false;h.removeCourse(1);await h.complete();cleared(h);
  assert.deepEqual(clone(h.state.readingSnapshot),position);assert.deepEqual(h.server.favorites,[1,2]);
  assert.deepEqual(clone(h.state.favoriteIds),[2]);assert.equal(h.state.query,"termo");assert.equal(h.state.filter,"metodologia");
  assert.equal(h.state.favoritesOnly,true);assert.equal(h.state.contextualCoursesVisible,false);assert.equal(h.writes().length,1);
});
for(const path of ["/lessons/11","/courses/1/lessons"]){
  await scenario("a pending old read cannot restore content after validated removal: "+path,async()=>{
    const h=await harness(),held=h.hold(path),operation=path.includes("courses")?h.student.selectCourse(1):h.student.selectLesson(11);
    await held.seen();h.removeCourse(1);await h.student.loadLibrary();await setImmediate();cleared(h);
    held.release();await operation;cleared(h);assert.equal(h.writes().length,0);
  });
}
await scenario("a late tutor response and old material control cannot restore the removed lesson",async()=>{
  const h=await harness(),answer=h.get("lesson-help-answer"),material=h.content.querySelector("[data-help-static]");
  const held=h.hold("/lessons/11/tutor",ok({reply:"Resposta antiga",source:{lesson_slug:"aula-11",course_version:2}}));
  h.get("lesson-help-question").value="Como revisar este exemplo?";const operation=h.emit(h.content.querySelector("form"),"submit");
  await held.seen();const pendingText=answer.textContent;h.removeCourse(1);await h.student.loadLibrary();await setImmediate();cleared(h);
  held.release();await operation;await h.click(material);cleared(h);assert.equal(answer.textContent,pendingText);assert.equal(answer.isConnected,false);
});
for(const status of [200,503])await scenario("a pending completion settling after removal cannot rebuild the old lesson: "+status,async()=>{
  const h=await harness(),held=h.hold("/lessons/11/complete",{status,payload:status===200?{completed:true}:{}}),operation=h.complete();
  await held.seen();h.removeCourse(1);await h.student.loadLibrary();await setImmediate();cleared(h);
  const reads=h.calls.length;held.release();await operation;cleared(h);assert.equal(h.calls.length,reads);assert.equal(h.writes().length,1);
});
for(const sameCourse of [false,true])await scenario("an old completion catalog cannot rewrite a newer selection: "+sameCourse,async()=>{
  const h=await harness(),held=h.hold("/courses",ok({courses:[]})),operation=h.complete();await held.seen();
  if(sameCourse)await h.student.selectLesson(12);else await h.student.selectCourse(2);
  const before=selection(h.state),body=h.content.querySelector(".lesson-text"),catalog=clone(h.state.courses);
  held.release();await operation;assert.deepEqual(selection(h.state),before);assert.equal(h.content.querySelector(".lesson-text"),body);
  assert.deepEqual(clone(h.state.courses),catalog);assert.equal(h.content.querySelector("[data-course-unavailable]"),null);assert.equal(h.writes().length,1);
});
for(const response of [{status:503,payload:{}},ok({courses:[{id:2}]})])await scenario("failed or malformed completion catalog cannot masquerade as course absence: "+response.status,async()=>{
  const h=await harness(),before=selection(h.state),body=h.content.querySelector(".lesson-text");h.control.overrides.set("/courses",response);await h.complete();
  assert.deepEqual(selection(h.state),before);assert.equal(h.content.querySelector(".lesson-text"),body);assert.equal(h.content.querySelector(".primary").disabled,true);
  assert.equal(h.content.querySelector("[data-course-unavailable]"),null);assert.match(h.get("status").textContent,/Aula concluída.*resumo/);assert.equal(h.writes().length,1);
});
await scenario("a malformed library response keeps the existing unavailable recovery instead of false removal",async()=>{
  const h=await harness();h.control.overrides.set("/courses",ok({courses:[{id:2}]}));await h.student.loadLibrary();
  assert.equal(h.state.libraryReady,false);assert.equal(h.get("library-recovery").hidden,false);
  assert.equal(h.content.querySelector("[data-course-unavailable]"),null);assert.equal(h.content.querySelector(".lesson-text"),null);assert.equal(h.state.accessDenied,false);
});
for(const status of [403,419])for(const operation of ["refresh","completion"]){
  await scenario(status+" still locks all access during "+operation,async()=>{
    const h=await harness();h.control.overrides.set("/courses",{status,payload:{}});
    if(operation==="refresh")await h.student.loadLibrary();else await h.complete();
    assert.equal(h.state.accessDenied,true);assert.equal(h.state.libraryReady,false);assert.equal(h.state.readingSnapshot,null);
    assert.equal(h.content.querySelector("[data-course-unavailable]"),null);assert.equal(h.content.querySelector(".lesson-text"),null);
    assert.equal(h.state.progressHistory.rows.length,0);assert.equal(h.get("export-progress").disabled,true);
  });
}
await scenario("uncertain POST confirmed by progress GET still reconciles course absence without replay",async()=>{
  const h=await harness();h.removeCourse(1);h.control.overrides.set("/lessons/11/complete",()=>{h.server.completed.add(11);return {status:503,payload:{}};});
  await h.complete();cleared(h);assert.match(h.get("status").textContent,/Conclusão confirmada após consulta/);assert.equal(h.writes().length,1);
});
await scenario("an unconfirmed completion does not infer catalog absence without a fresh catalog response",async()=>{
  const h=await harness(),before=selection(h.state),body=h.content.querySelector(".lesson-text"),reads=h.calls.filter(call=>call.path==="/courses").length;
  h.removeCourse(1);h.control.overrides.set("/lessons/11/complete",{status:503,payload:{}});await h.complete();
  assert.deepEqual(selection(h.state),before);assert.equal(h.content.querySelector(".lesson-text"),body);assert.equal(h.content.querySelector(".primary").disabled,false);
  assert.equal(h.calls.filter(call=>call.path==="/courses").length,reads);assert.equal(h.writes().length,1);
});
await scenario("a republished course never automatically restores a cleared reader or old lesson",async()=>{
  const h=await harness(),original=h.server.courses[0];h.removeCourse(1);await h.student.loadLibrary();await setImmediate();cleared(h);
  const reads=h.calls.filter(call=>call.path.includes("/lessons")).length;h.server.courses.unshift(original);
  h.server.lessons=h.server.lessons.filter(lesson=>lesson.course_id!==1);
  h.server.lessons.push({id:13,slug:"aula-republicada",title:"Aula republicada",course_id:1,course_version:3,sort_order:0,body:"Material autorizado da nova versão."});
  await h.student.loadLibrary();await setImmediate();assert.equal(h.state.courseId,null);assert.equal(h.state.lessonId,null);
  assert.equal(h.calls.filter(call=>call.path.includes("/lessons")).length,reads);assert.equal(h.content.querySelector(".lesson-text"),null);
  await h.student.selectCourse(1);assert.equal(h.state.lessonId,13);assert.equal(h.content.querySelector("h3").textContent,"Aula republicada");assert.equal(h.writes().length,0);
});
await scenario("clearing one reader leaves deliberate navigation to another published course available",async()=>{
  const h=await harness();h.removeCourse(1);await h.student.loadLibrary();await setImmediate();cleared(h);
  await h.student.selectCourse(2);assert.equal(h.state.courseId,2);assert.equal(h.state.lessonId,21);assert.equal(h.content.querySelector("h3").textContent,"Aula 21");
  assert.equal(h.writes().length,0);assert.equal(h.state.libraryReady,true);
});
console.log("PASS student catalog reconciliation: "+scenarios+" actual-script scenarios; validated absence, exact current selection, confirmed progress, private references and late-response fences");
