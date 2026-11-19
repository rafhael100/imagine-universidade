#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Complete real view and handlers; only startup and DOM/HTTP are synthetic.
// No browser/server/database is started and no filtering logic is copied.
const view=readFileSync(new URL("../resources/views/university/student.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
assert.ok(start>=0&&end>start);const original=view.slice(start,end);
assert.match(original,/\nloadLibrary\(\);\s*$/);
const source=original.replace(/\nloadLibrary\(\);\s*$/,"")+"\nglobalThis.student={state,reconcileCatalogSelection,"+
  "loadLibrary,selectCourse,selectLesson,renderCourses,loadProgressHistory,loadReadingPosition,loadFavorites,lockAccess,renderLessonFilter,nextPendingLessonId,markLessonStatus,navigationFocus};";
const clone=value=>JSON.parse(JSON.stringify(value));
const ok=payload=>({status:200,payload});
const timestamp="2026-11-17T10:00:00Z";
function deferred(){let release;const promise=new Promise(resolve=>{release=resolve;});return {promise,release};}
function serverState(){
  return {courses:[1,2].map(id=>({id,slug:"curso-"+id,title:"Curso "+id,summary:"Resumo",category:id===1?"metodologia":"negocios"})),
    lessons:[11,12,13,14,21].map(id=>({id,slug:({11:"inicio",12:"rotina-comercial",13:"acao-responsavel",14:"contato",21:"aula-sistemas"})[id],title:({11:"Introdução à comunicação 😀",12:"Revisão de atendimento",13:"Prática opcional",14:"<b>AÇÃO & confiança</b> 😀",21:"Aula de sistemas"})[id],sort_order:id%10,course_id:id===21?2:1,course_version:2,
      body:"SomenteNoCorpo autorizado "+id+".\n\nEXEMPLO FICTÍCIO\nExemplo literal.\n\nOutro parágrafo.\n\nAPLICAÇÃO OPCIONAL\nPrática opcional."})),
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
  focus(){if(!this.isConnected||this.disabled||this.hidden)return;this.env.document.activeElement=this;this.env.focuses.push(this);this.env.observe("focusin",this);}
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
    throw new Error("Unexpected lesson-filter request "+method+" "+path);
  };
  const storage=Object.fromEntries(["getItem","setItem","removeItem","clear"].map(method=>[method,()=>{
    storageCalls.push(method);throw new Error("No local lesson query may persist data");
  }]));
  const context=createContext({document,window:{addEventListener(){}},Blob,URL,TextEncoder,setTimeout,clearTimeout,
    localStorage:storage,sessionStorage:storage,
    fetch:async(url,options)=>{
      const path=new URL(url,"http://127.0.0.1").pathname.replace("/universidade/private","");
      const entry={path,...options};calls.push(entry);const override=control.overrides.get(path);
      const response=(typeof override==="function"?await override(entry):override)??fallback(entry);
      return {status:response.status,ok:response.status>=200&&response.status<300,json:async()=>response.json?await response.json():clone(response.payload)};
    }});
  new Script(source,{filename:"actual-student-lesson-filter"}).runInContext(context);
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

const rows=h=>h.lessonsBox.querySelectorAll("[data-lesson-id]");
const ids=nodes=>nodes.map(node=>Number(node.dataset.lessonId));
const visible=h=>ids(rows(h).filter(node=>!node.hidden));
const row=(h,id)=>rows(h).find(node=>Number(node.dataset.lessonId)===id);
const query=h=>h.get("course-lesson-query");
const message=h=>h.get("course-lesson-filter-status").textContent;
const snapshot=h=>clone({courseId:h.state.courseId,lessonId:h.state.lessonId,courseRequest:h.state.courseRequest,
  lessonRequest:h.state.lessonRequest,filter:h.state.filter,query:h.state.query,favoritesOnly:h.state.favoritesOnly,
  favoriteIds:h.state.favoriteIds,readingSnapshot:h.state.readingSnapshot,progressHistory:h.state.progressHistory,
  contextualCoursesVisible:h.state.contextualCoursesVisible});
async function filter(h,value){query(h).value=value;await h.emit(query(h),"input");}
async function delegated(h,node){for(const handler of h.lessonsBox.events.get("click")||[])await handler({target:node});await setImmediate();}
function reset(h){
  assert.equal(h.state.lessonFilter.ready,false);assert.equal(h.state.lessonFilter.courseId,null);
  assert.equal(h.state.lessonFilter.request,0);assert.equal(h.state.lessonFilter.query,"");
  assert.equal(query(h).value,"");assert.equal(query(h).disabled,true);
  assert.equal(h.get("clear-course-lesson-query").disabled,true);assert.equal(h.get("course-lesson-filter").hidden,true);
  assert.equal(message(h),"");
}
let scenarios=0;
async function scenario(label,run){try{await run();}catch(error){error.message=label+": "+error.message;throw error;}scenarios++;}

await scenario("no local filter is available before a course list is authorized",async()=>{
  const h=await harness({select:false}),before=h.calls.length;reset(h);
  await filter(h,"revisao");await h.click("clear-course-lesson-query");
  assert.equal(h.state.lessonFilter.query,"");assert.equal(h.calls.length,before);assert.equal(h.state.lessonId,null);
});
await scenario("validated list owns its course generation and keeps every authorized row",async()=>{
  const h=await harness();assert.deepEqual(ids(rows(h)),[11,12,13,14]);assert.deepEqual(visible(h),[11,12,13,14]);
  assert.equal(h.state.lessonFilter.ready,true);assert.equal(h.state.lessonFilter.courseId,1);
  assert.equal(h.state.lessonFilter.request,h.state.courseRequest);assert.equal(query(h).disabled,false);
  assert.equal(h.get("course-lesson-filter").hidden,false);assert.equal(message(h),"Resultados: 4 de 4 aulas.");
  assert.equal(row(h,14).querySelector("strong").textContent,"<b>AÇÃO & confiança</b> 😀");
  assert.equal(h.lessonsBox.querySelector("b"),null);
  assert.match(view,/\.lesson-btn\[hidden\]\{display:none\}/);
});
for(const [term,matched] of [["ReViSaO",[12]],["rotina-comercial",[12]],["AÇÃO",[11,13,14]],
  ["  COMUNICACAO  ",[11]],["😀",[11,14]],["<b>",[14]],["ac\u0327a\u0303o",[11,13,14]]]){
  await scenario("local title/slug match: "+term,async()=>{
    const h=await harness(),before=h.calls.length,buttons=rows(h),state=snapshot(h);
    await filter(h,term);assert.deepEqual(visible(h),ids(buttons.filter(node=>matched.includes(Number(node.dataset.lessonId))||node.dataset.lessonId==="11")));
    assert.ok(message(h).startsWith("Resultados: "+matched.length+" de 4 aulas."));
    assert.equal(message(h).includes("fora dos resultados"),!matched.includes(11));
    assert.deepEqual(rows(h),buttons);assert.deepEqual(snapshot(h),state);assert.equal(h.calls.length,before);assert.equal(h.storageCalls.length,0);
  });
}
for(const term of ["SomenteNoCorpo","Pendente","Concluída"]){
  await scenario("body and progress state never become local search fields: "+term,async()=>{
    const h=await harness();await filter(h,term);assert.deepEqual(visible(h),[11]);
    assert.equal(message(h),"Resultados: 0 de 4 aulas. A aula aberta continua visível fora dos resultados.");
  });
}
await scenario("clear changes only local presentation and deliberately returns focus to the input",async()=>{
  const h=await harness();h.get("lesson-help-question").value="Pergunta não enviada";
  const before=snapshot(h),privateBefore=h.privateState(),body=h.content.querySelector(".lesson-text"),help=h.content.querySelector("[data-lesson-help]");
  const buttons=rows(h),calls=h.calls.length;await filter(h,"inexistente");await h.click("clear-course-lesson-query");
  assert.equal(h.state.lessonFilter.query,"");assert.equal(query(h).value,"");assert.equal(h.get("clear-course-lesson-query").disabled,true);
  assert.deepEqual(visible(h),[11,12,13,14]);assert.deepEqual(rows(h),buttons);assert.deepEqual(snapshot(h),before);
  assert.equal(h.content.querySelector(".lesson-text"),body);assert.equal(h.content.querySelector("[data-lesson-help]"),help);
  assert.equal(h.get("lesson-help-question").value,"Pergunta não enviada");assert.deepEqual(h.privateState(),privateBefore);
  assert.equal(h.document.activeElement,query(h));assert.equal(h.calls.length,calls);assert.equal(h.storageCalls.length,0);
});
await scenario("the complete hidden sequence and hidden progress markers remain authoritative",async()=>{
  const h=await harness();await filter(h,"contato");assert.deepEqual(visible(h),[11,14]);assert.equal(h.student.nextPendingLessonId(11),12);
  h.student.markLessonStatus(12,true);assert.equal(row(h,12).hidden,true);assert.equal(row(h,12).dataset.completed,"1");
  assert.equal(row(h,12).querySelector("[data-lesson-status]").textContent,"✓ Concluída");
  assert.equal(h.student.nextPendingLessonId(11),13);assert.equal(message(h),"Resultados: 1 de 4 aulas. A aula aberta continua visível fora dos resultados.");
});
await scenario("completion and next open the exact hidden pending lesson without replay or changing the query",async()=>{
  const h=await harness();await filter(h,"contato");await h.complete();
  const calls=h.calls.length;await h.click(h.content.querySelector("[data-next-lesson]"));
  assert.equal(h.state.lessonId,12);assert.deepEqual(visible(h),[12,14]);assert.equal(row(h,11).hidden,true);
  assert.equal(h.state.lessonFilter.query,"contato");assert.equal(h.content.querySelector("h3").textContent,"Revisão de atendimento");
  assert.deepEqual(h.calls.slice(calls).map(call=>[call.method,call.path]),[["GET","/lessons/12"],["GET","/lessons/12/progress"]]);
  assert.deepEqual([...h.server.completed],[11]);assert.equal(h.writes().length,1);assert.equal(h.writes()[0].path,"/lessons/11/complete");
});
await scenario("visible row uses its exact ID and a single original C127 focus intent",async()=>{
  const h=await harness();await filter(h,"revisao");const calls=h.calls.length;await h.click(row(h,12));
  assert.equal(h.state.lessonId,12);assert.deepEqual(visible(h),[12]);assert.equal(message(h),"Resultados: 1 de 4 aulas.");
  assert.equal(h.document.activeElement,h.content.querySelector("h3"));
  assert.deepEqual(h.calls.slice(calls).map(call=>call.path),["/lessons/12","/lessons/12/progress"]);assert.equal(h.writes().length,0);
});
await scenario("hidden, disconnected and foreign rows cannot capture focus intent or navigate",async()=>{
  const h=await harness();await filter(h,"contato");const hidden=row(h,12),detached=row(h,14);
  detached.remove();const foreign=h.document.createElement("button");foreign.dataset.lessonId="13";h.document.body.append(foreign);
  const calls=h.calls.length,sequence=h.student.navigationFocus.sequence;
  for(const node of [hidden,detached,foreign])await delegated(h,node);
  assert.equal(h.calls.length,calls);assert.equal(h.student.navigationFocus.sequence,sequence);assert.equal(h.state.lessonId,11);
});
await scenario("generation mismatch rejects input, clear and a still-connected lesson button",async()=>{
  const h=await harness();await filter(h,"inicio");const calls=h.calls.length,sequence=h.student.navigationFocus.sequence;
  h.state.lessonFilter.request--;await filter(h,"contato");await h.click("clear-course-lesson-query");await delegated(h,row(h,11));
  assert.equal(h.state.lessonFilter.query,"inicio");assert.equal(h.calls.length,calls);assert.equal(h.student.navigationFocus.sequence,sequence);
});
await scenario("a new course clears the query before awaiting its list and rejects old row controls",async()=>{
  const h=await harness();await filter(h,"revisao");const old=row(h,12),held=h.hold("/courses/2/lessons");
  const operation=h.student.selectCourse(2);await held.seen();reset(h);assert.equal(rows(h).length,0);
  const calls=h.calls.length;await delegated(h,old);assert.equal(h.calls.length,calls);
  held.release();await operation;assert.equal(h.state.lessonFilter.courseId,2);assert.equal(h.state.lessonFilter.query,"");
  assert.deepEqual(visible(h),[21]);assert.equal(message(h),"Resultados: 1 de 1 aulas.");
});
await scenario("same-course transient failure preserves query for explicit retry without old list data",async()=>{
  const h=await harness();await filter(h,"revisao");h.control.overrides.set("/courses/1/lessons",{status:503,payload:{}});
  await h.student.selectCourse(1);assert.equal(h.state.lessonFilter.ready,false);assert.equal(h.state.lessonFilter.query,"revisao");
  assert.equal(query(h).disabled,true);assert.equal(message(h),"");assert.equal(rows(h).length,0);
  h.control.overrides.delete("/courses/1/lessons");await h.click(h.content.querySelector(".lesson-retry"));
  assert.equal(h.state.lessonFilter.ready,true);assert.equal(query(h).value,"revisao");assert.deepEqual(visible(h),[11,12]);
});
await scenario("a valid empty list remains distinct from an unavailable list",async()=>{
  const h=await harness();h.server.lessons=h.server.lessons.filter(lesson=>lesson.course_id!==1);
  await h.student.selectCourse(1);assert.equal(h.state.lessonFilter.ready,true);assert.equal(h.state.lessonId,null);
  assert.equal(h.get("course-lesson-filter").hidden,false);assert.equal(message(h),"Resultados: 0 de 0 aulas.");
  assert.match(h.content.textContent,/Ainda não existem aulas publicadas/);const calls=h.calls.length;await filter(h,"texto");
  assert.equal(message(h),"Resultados: 0 de 0 aulas.");assert.equal(h.calls.length,calls);
});
await scenario("a malformed list purges local metadata and recovers only from another validated response",async()=>{
  const h=await harness();await filter(h,"revisao");h.control.overrides.set("/courses/1/lessons",ok({lessons:[{id:11,slug:"inicio",completed:0,sort_order:1}]}));
  await h.student.selectCourse(1);assert.equal(h.state.lessonFilter.ready,false);assert.equal(rows(h).length,0);assert.equal(message(h),"");
  assert.match(h.content.textContent,/não puderam ser carregadas/);h.control.overrides.delete("/courses/1/lessons");
  await h.click(h.content.querySelector(".lesson-retry"));assert.equal(h.state.lessonFilter.ready,true);assert.deepEqual(visible(h),[11,12]);
});
await scenario("missing exact preferred target keeps honest results with no invented selected lesson",async()=>{
  const h=await harness();await filter(h,"ausente");const calls=h.calls.length;
  await h.student.selectCourse(1,999);assert.equal(h.state.lessonId,null);assert.equal(h.state.lessonFilter.ready,true);
  assert.deepEqual(visible(h),[]);assert.equal(message(h),"Resultados: 0 de 4 aulas.");
  assert.match(h.content.textContent,/não está mais disponível/);assert.deepEqual(h.calls.slice(calls).map(call=>call.path),["/courses/1/lessons"]);
});
for(const kind of ["category","catalog query","favorite filter"]){
  await scenario("discarding the course through "+kind+" also resets its local query",async()=>{
    const h=await harness();await filter(h,"contato");const calls=h.calls.length;
    if(kind==="category")await h.click(h.filters[2]);
    else if(kind==="catalog query"){h.get("course-search").value="Curso 2";await h.emit(h.get("course-search"),"input");}
    else{h.get("favorites-only").checked=true;await h.emit(h.get("favorites-only"),"change");}
    reset(h);assert.equal(rows(h).length,0);assert.equal(h.state.courseId,null);assert.equal(h.calls.length,calls);
  });
}
await scenario("catalog refresh disables local actions then preserves present course DOM, query and generations",async()=>{
  const h=await harness();await filter(h,"contato");const body=h.content.querySelector(".lesson-text"),buttons=rows(h),before=snapshot(h);
  const held=h.hold("/courses"),operation=h.student.loadLibrary();await held.seen();
  assert.equal(query(h).disabled,true);assert.equal(h.state.lessonFilter.query,"contato");assert.match(message(h),/Verificando/);
  await filter(h,"indevido");await delegated(h,row(h,14));assert.equal(h.state.lessonFilter.query,"contato");assert.equal(h.state.lessonId,11);
  held.release();await operation;await setImmediate();assert.equal(query(h).disabled,false);assert.equal(query(h).value,"contato");
  assert.deepEqual(rows(h),buttons);assert.equal(h.content.querySelector(".lesson-text"),body);
  assert.equal(h.state.courseRequest,before.courseRequest);assert.equal(h.state.lessonRequest,before.lessonRequest);assert.deepEqual(visible(h),[11,14]);
});
await scenario("global catalog failure purges the local query rather than describing zero matches",async()=>{
  const h=await harness();await filter(h,"contato");h.control.overrides.set("/courses",ok({}));await h.student.loadLibrary();reset(h);
  assert.equal(rows(h).length,0);assert.equal(h.state.libraryReady,false);assert.match(h.get("overall-progress").textContent,/indisponível/);
  h.control.overrides.delete("/courses");await h.student.loadLibrary();await setImmediate();reset(h);assert.equal(h.state.libraryReady,true);
});
await scenario("C130 omission clears the filter while preserving personal preferences and authority",async()=>{
  const h=await harness();await filter(h,"contato");const privateBefore=h.privateState();h.removeCourse(1);
  await h.student.loadLibrary();await setImmediate();reset(h);assert.equal(rows(h).length,0);
  assert.equal(h.state.accessDenied,false);assert.equal(h.state.libraryReady,true);assert.deepEqual(h.privateState(),privateBefore);
  assert.match(h.content.textContent,/curso deixou de constar no catálogo/);assert.equal(h.state.readingSnapshot.status,"unavailable");
});
await scenario("confirmed completion plus C130 removal clears local results without retracting the receipt",async()=>{
  const h=await harness();await filter(h,"contato");h.removeCourse(1);await h.complete();reset(h);
  assert.equal(h.server.completed.has(11),true);assert.equal(h.writes().length,1);assert.match(h.get("status").textContent,/Seu progresso foi registrado/);
});
for(const status of [403,419]){
  await scenario("revocation "+status+" clears query and ownership before any later local action",async()=>{
    const h=await harness();await filter(h,"contato");const old=row(h,14);
    h.control.overrides.set("/lessons/12",{status,payload:{error:"denied"}});await h.student.selectLesson(12);reset(h);
    assert.equal(h.state.accessDenied,true);assert.equal(rows(h).length,0);const calls=h.calls.length;
    await delegated(h,old);await filter(h,"contato");await h.click("clear-course-lesson-query");assert.equal(h.calls.length,calls);
  });
}
await scenario("an older course response cannot replace the newer list owner or restore its query",async()=>{
  const h=await harness();await filter(h,"contato");const held=h.hold("/courses/1/lessons"),old=h.student.selectCourse(1);await held.seen();
  await h.student.selectCourse(2);const current=clone(h.state.lessonFilter),buttons=rows(h);held.release();await old;
  assert.deepEqual(clone(h.state.lessonFilter),current);assert.deepEqual(rows(h),buttons);assert.deepEqual(visible(h),[21]);assert.equal(query(h).value,"");
});
await scenario("typing while a lesson body is pending updates the pin without a late C127 focus theft",async()=>{
  const h=await harness(),held=h.hold("/lessons/12");await h.click(row(h,12));await held.seen();
  query(h).focus();await filter(h,"contato");assert.equal(h.state.lessonId,12);assert.deepEqual(visible(h),[12,14]);
  held.release();await setImmediate();assert.equal(h.content.querySelector("h3").textContent,"Revisão de atendimento");
  assert.equal(h.document.activeElement,query(h));assert.equal(query(h).value,"contato");assert.equal(h.writes().length,0);
});
await scenario("passive course/progress/favorite renders do not reconstruct or reset local results",async()=>{
  const h=await harness();await filter(h,"contato");const buttons=rows(h),before=clone(h.state.lessonFilter),calls=h.calls.length;
  h.state.favoriteIds=[2];h.student.renderCourses();h.student.markLessonStatus(13,true);h.student.renderCourses();
  assert.deepEqual(clone(h.state.lessonFilter),before);assert.deepEqual(rows(h),buttons);assert.deepEqual(visible(h),[11,14]);
  assert.equal(h.calls.length,calls);assert.equal(h.storageCalls.length,0);assert.equal(h.writes().length,0);
});
console.log("Student local lesson filter: "+scenarios+" actual-script scenarios passed.");
