#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Execute the complete view, its real navigation functions and registered
// handlers. Only DOM/events, visibility and HTTP are synthetic. The focus
// policy and its propagation are never copied into the harness.
const view=readFileSync(new URL("../resources/views/university/student.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
assert.ok(start>=0&&end>start);
const original=view.slice(start,end);assert.match(original,/\nloadLibrary\(\);\s*$/);
const exposed=["state","navigationFocus","beginNavigationFocus","finishNavigationFocus","loadLibrary","loadFavorites",
  "loadRetainedFavorites","loadReadingPosition","renderReadingPosition","renderCourses","selectCourse","selectLesson",
  "openCourseWithAllFilters","resumeReadingPosition","lockAccess"];
const source=original.replace(/\nloadLibrary\(\);\s*$/,"")+"\nglobalThis.student={"+exposed.join(",")+"};";
const clone=value=>JSON.parse(JSON.stringify(value));
const ok=payload=>({status:200,payload});
const none=()=>({schema_version:1,scope:"current_authenticated_student",status:"none",revision:"initial-ticket",position:null});
const saved=(lesson_id=12,course_id=1,course_version=1)=>({...none(),status:"available",revision:"saved-revision",
  position:{course_id,course_version,lesson_id,saved_at:"2026-11-17T10:00:00Z"}});
function deferred(){let release;const promise=new Promise(resolve=>{release=resolve;});return {promise,release};}
async function bounded(promise,label){
  let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new Error("Navigation focus harness timeout: "+label)),1000);
  })]);}finally{clearTimeout(timer);}
}
function serverState(){
  const courses=[{id:1,category:"metodologia"},{id:2,category:"metodologia"},
    {id:3,category:"negocios"},{id:4,category:"sistemas"}]
    .map(row=>({...row,slug:"curso-"+row.id,title:"Curso "+row.id,summary:"Resumo autorizado "+row.id}));
  courses.find(course=>course.id===3).slug="trilha-clientes-conquiste-acompanhe";
  const lessons=[11,12,21,31].map(id=>({id,slug:"aula-"+id,title:"Aula "+id,
    body:"Texto autorizado e sintético da aula "+id+".",sort_order:id%10,course_id:Math.floor(id/10),course_version:1}));
  return {courses,lessons,completed:new Set(),favoriteIds:[2],snapshot:none()};
}
class Node{
  constructor(env,tag="div"){
    this.env=env;this.tag=tag;this.id="";this.className="";this.ownText="";this.children=[];this.parent=null;
    this.events=new Map();this.attributes={};this.dataset={};this.disabled=false;this.hidden=false;this.checked=false;
    this.value="";this.open=false;this.tabIndex=-1;
  }
  get isConnected(){for(let node=this;node;node=node.parent)if(node===this.env.document.body)return true;return false;}
  contains(other){for(let node=other;node;node=node.parent)if(node===this)return true;return false;}
  set textContent(value){this.replaceChildren();this.ownText=String(value);}
  get textContent(){return this.ownText+this.children.map(child=>child.textContent).join("");}
  append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
  replaceChildren(...children){
    if(this.children.some(child=>child.contains(this.env.document.activeElement)))this.env.document.activeElement=this.env.document.body;
    for(const child of this.children)child.parent=null;
    this.ownText="";this.children=[];this.append(...children);
  }
  remove(){
    if(this.contains(this.env.document.activeElement))this.env.document.activeElement=this.env.document.body;
    if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);
    this.parent=null;
  }
  addEventListener(event,handler){const list=this.events.get(event)||[];list.push(handler);this.events.set(event,list);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  removeAttribute(name){delete this.attributes[name];}
  focus(){
    if(!this.isConnected||this.disabled||this.hidden)return;
    if(this.env.document.activeElement===this)return;
    this.env.document.activeElement=this;this.env.focuses.push(this);
    this.env.observe("focusin",this);
  }
  scrollIntoView(){}
  all(){return this.children.flatMap(child=>[child,...child.all()]);}
  matches(selector){
    if(selector.startsWith("#"))return this.id===selector.slice(1);
    if(selector.startsWith("."))return this.className.split(" ").includes(selector.slice(1));
    if(selector.startsWith("[data-")){
      const key=selector.slice(6,-1).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
      return Object.hasOwn(this.dataset,key);
    }
    return this.tag===selector;
  }
  closest(selector){for(let node=this;node;node=node.parent)if(node.matches(selector))return node;return null;}
  querySelectorAll(selector){return this.all().filter(node=>node.matches(selector));}
  querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
}
async function harness({boot=true,server=serverState()}={}){
  const documentEvents=new Map(),windowEvents=new Map(),calls=[],storageCalls=[],overrides=new Map();
  const env={document:null,focuses:[],prevented:0,stopped:0,focused:true};
  const add=(map,type,handler,options)=>{const list=map.get(type)||[];list.push({handler,options});map.set(type,list);};
  env.observe=(type,target,extra={})=>{
    const event={target,preventDefault(){env.prevented++;},stopPropagation(){env.stopped++;},...extra};
    for(const {handler} of documentEvents.get(type)||[])handler(event);
    return event;
  };
  const document={visibilityState:"visible",activeElement:null,hasFocus:()=>env.focused,
    addEventListener:(type,handler,options)=>add(documentEvents,type,handler,options)};
  env.document=document;document.body=new Node(env,"body");document.activeElement=document.body;
  const nodes=new Map();
  for(const match of view.slice(0,start).matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
    const node=new Node(env,match[1]);node.id=match[2];node.disabled=/\bdisabled\b/.test(match[0]);
    node.hidden=/\bhidden\b/.test(match[0]);document.body.append(node);nodes.set(node.id,node);
  }
  const get=id=>document.body.querySelector("#"+id)??nodes.get(id)??null;
  const filters=["todos","metodologia","negocios","sistemas"].map(filter=>{
    const node=new Node(env,"button");node.dataset.filter=filter;document.body.append(node);return node;
  });
  const sim=["sim-visits","sim-leads-rate","sim-clients-rate"].map(get);
  sim.forEach((node,index)=>{node.value=["1000","5","10"][index];});
  Object.assign(document,{getElementById:get,createElement:tag=>new Node(env,tag),
    querySelector:selector=>selector.startsWith("meta")?{content:"synthetic-csrf"}:document.body.querySelector(selector),
    querySelectorAll:selector=>selector==="[data-filter]"?filters:selector===".sim-inputs input"?sim:document.body.querySelectorAll(selector)});
  const catalog=()=>server.courses.map(course=>({...course,
    lessons_total:server.lessons.filter(lesson=>lesson.course_id===course.id).length,
    lessons_completed:server.lessons.filter(lesson=>lesson.course_id===course.id&&server.completed.has(lesson.id)).length}));
  const fallback=request=>{
    const {path,method}=request;
    if(path==="/initialize")return ok({ready:true});
    if(path==="/courses")return ok({courses:catalog()});
    if(path==="/favorites")return ok({course_ids:server.favoriteIds});
    if(path==="/favorites/retained")return ok({schema_version:1,scope:"current_authenticated_student",favorites:[],next_after_course_id:null});
    if(path==="/reading-position"&&method==="GET")return ok(server.snapshot);
    if(path==="/search")return ok({results:[{course_id:1,lesson_id:12,course_title:"Curso 1",lesson_title:"Aula 12",snippet:"Texto sintético."}]});
    if(/^\/courses\/\d+\/favorite$/.test(path)){
      const id=Number(path.split("/")[2]),favorite=method==="PUT";
      server.favoriteIds=server.favoriteIds.filter(value=>value!==id);if(favorite)server.favoriteIds.push(id);
      return ok({course_id:id,favorite});
    }
    if(/^\/courses\/\d+\/lessons$/.test(path)){
      const id=Number(path.split("/")[2]);
      return ok({lessons:server.lessons.filter(lesson=>lesson.course_id===id).map(lesson=>({
        id:lesson.id,slug:lesson.slug,title:lesson.title,sort_order:lesson.sort_order,completed:server.completed.has(lesson.id)?1:0}))});
    }
    if(/^\/lessons\/\d+$/.test(path)){
      const lesson=server.lessons.find(row=>row.id===Number(path.split("/")[2]));
      return lesson?ok({lesson}):{status:404,payload:{error:"not_found"}};
    }
    if(path.endsWith("/progress"))return ok({completed:server.completed.has(Number(path.split("/")[2]))});
    if(path.endsWith("/complete")){server.completed.add(Number(path.split("/")[2]));return ok({completed:true});}
    if(path.endsWith("/tutor"))return {status:404,payload:{error:"not_found"}};
    throw new Error("Unexpected synthetic request: "+method+" "+path);
  };
  const storage=Object.fromEntries(["getItem","setItem","removeItem","clear"].map(method=>[method,()=>{
    storageCalls.push(method);throw new Error("Navigation focus must not persist a preference");
  }]));
  const context=createContext({document,window:{addEventListener:(type,handler,options)=>add(windowEvents,type,handler,options)},
    Blob,URL,TextEncoder,setTimeout:()=>1,clearTimeout:()=>{},localStorage:storage,sessionStorage:storage,
    fetch:async(url,options)=>{
      const path=new URL(url,"http://127.0.0.1").pathname.replace("/universidade/private","");
      const request={path,...options,body:options.body===undefined?null:JSON.parse(options.body)};calls.push(request);
      const override=overrides.get(path);
      const result=(typeof override==="function"?await override(request):override)??fallback(request);
      return {status:result.status,ok:result.status>=200&&result.status<300,
        json:async()=>result.json?await result.json():clone(result.payload)};
    }});
  new Script(source,{filename:"actual-student-navigation-focus"}).runInContext(context);
  const student=context.student;
  async function emit(node,type,extra={}){
    assert.ok(node,"The actual control must exist");
    const event=env.observe(type,node,extra),path=[];
    for(let current=node;current;current=current.parent)path.push(current);
    for(const current of path)for(const handler of current.events.get(type)||[])await handler(event);
    await setImmediate();
  }
  const resolveNode=node=>typeof node==="string"?get(node):node;
  async function click(value,{keyboard=false}={}){
    const node=resolveNode(value);assert.ok(node,"Clickable control exists");
    if(node.disabled||node.hidden||!node.isConnected)return;
    if(!keyboard)env.observe("pointerdown",node);
    node.focus();if(keyboard)env.observe("keydown",node,{key:"Enter"});
    await emit(node,"click");
  }
  const hold=(path,{json=false,result}={})=>{
    const seen=deferred(),gate=deferred();
    overrides.set(path,async request=>{
      const response=result??fallback(request);
      if(json)return {...response,json:async()=>{seen.release();await gate.promise;return clone(response.payload);}};
      seen.release();await gate.promise;return response;
    });
    return {seen:()=>bounded(seen.promise,path),release:()=>{overrides.delete(path);gate.release();}};
  };
  if(boot){await student.loadLibrary();await setImmediate();}
  return {student,state:student.state,document,env,server,calls,storageCalls,overrides,get,filters,click,emit,hold,
    content:get("lesson-content"),flush:()=>setImmediate(),
    course:id=>get("course-list").querySelectorAll("[data-course-id]").find(node=>Number(node.dataset.courseId)===id),
    lesson:id=>get("lesson-items").querySelectorAll("[data-lesson-id]").find(node=>Number(node.dataset.lessonId)===id),
    focuses:()=>env.focuses.filter(node=>node.id==="lesson-navigation-target"||node.id==="reading-position-status"),
    focus:value=>resolveNode(value).focus(),
    observe:(type,target=get("course-search"))=>env.observe(type,target),
    hidden:hidden=>{document.visibilityState=hidden?"hidden":"visible";env.observe("visibilitychange",document);},
    blur:()=>{env.focused=false;for(const {handler} of windowEvents.get("blur")||[])handler();},
    front:()=>{env.focused=true;},
    personal:()=>clone({favorites:server.favoriteIds,position:server.snapshot,completed:Array.from(server.completed)}),
    search:async()=>{get("lesson-search-query").value="texto";await emit(get("lesson-search-form"),"submit");},
    writes:()=>calls.filter(request=>request.method!=="GET"&&!["/initialize","/search"].includes(request.path))};
}
let scenarios=0;
async function scenario(label,run){try{await run();}catch(error){error.message=label+": "+error.message;throw error;}scenarios++;}
function assertTarget(h,text){
  const target=h.get("lesson-navigation-target");assert.ok(target?.isConnected);assert.equal(target.tabIndex,-1);
  assert.equal(h.document.activeElement,target);assert.match(target.textContent,text);
}

await scenario("passive authorized initialization never focuses content or prefetches lessons",async()=>{
  const h=await harness();assert.equal(h.focuses().length,0);assert.equal(h.document.activeElement,h.document.body);
  assert.ok(h.calls.every(request=>!request.path.includes("/lessons")));assert.equal(h.storageCalls.length,0);
});
for(const keyboard of [false,true])await scenario("explicit course activation focuses the loaded heading: "+keyboard,async()=>{
  const h=await harness(),before=h.personal(),source=h.course(1);await h.click(source,{keyboard});
  assertTarget(h,/^Aula 11$/);assert.equal(source.isConnected,false);assert.equal(h.focuses().length,1);
  assert.deepEqual(h.personal(),before);assert.equal(h.writes().length,0);
  assert.deepEqual(h.calls.slice(-3).map(row=>row.path).sort(),["/courses/1/lessons","/lessons/11","/lessons/11/progress"].sort());
});
await scenario("direct lesson activation has a heading destination without a saved-version parameter",async()=>{
  const h=await harness();await h.click(h.course(1));await h.click(h.lesson(12));assertTarget(h,/^Aula 12$/);
  assert.equal(h.state.lessonId,12);assert.equal(h.focuses().length,2);
});
await scenario("next lesson replaces the old button and focuses the new authorized heading",async()=>{
  const h=await harness();h.server.completed.add(11);await h.click(h.course(1));await h.click(h.lesson(11));
  const advance=h.content.querySelector("[data-next-lesson]");await h.click(advance,{keyboard:true});
  assert.equal(advance.isConnected,false);assertTarget(h,/^Aula 12$/);assert.equal(h.writes().length,0);
});
await scenario("next course uses the same focus intent while preserving personal records",async()=>{
  const h=await harness();h.server.completed.add(11);h.server.completed.add(12);await h.click(h.course(1));
  const before=h.personal();await h.click(h.content.querySelector("[data-next-course]"));
  assertTarget(h,/^Aula 21$/);assert.equal(h.state.courseId,2);assert.deepEqual(h.personal(),before);
});
for(const nextCourse of [false,true])await scenario("a sequence button from an older request cannot create a fresh intent: "+nextCourse,async()=>{
  const h=await harness();h.server.completed.add(11);if(nextCourse)h.server.completed.add(12);
  await h.click(h.course(1));if(!nextCourse)await h.click(h.lesson(11));
  const old=h.content.querySelector(nextCourse?"[data-next-course]":"[data-next-lesson]");assert.ok(old);
  await h.click(h.course(1));if(!nextCourse)await h.click(h.lesson(11));
  const requests=h.calls.length,count=h.focuses().length,intent=h.student.navigationFocus.sequence;
  for(const handler of old.events.get("click"))await handler();await h.flush();
  assert.equal(h.calls.length,requests);assert.equal(h.focuses().length,count);
  assert.equal(h.student.navigationFocus.sequence,intent);assert.equal(h.state.courseId,1);
});
await scenario("the pending-course action captures an explicit navigation intent",async()=>{
  const h=await harness();await h.click("resume-course");assertTarget(h,/^Aula 11$/);
});
await scenario("pillar navigation focuses its current authorized course",async()=>{
  const h=await harness();await h.click(h.get("pillar-cards").querySelectorAll("[data-pillar-course]")
    .find(node=>Number(node.dataset.pillarCourse)===3));assertTarget(h,/^Aula 31$/);
});
await scenario("suggestions focus the target after fresh reads and leave personal data unchanged",async()=>{
  const h=await harness();await h.click(h.course(1));const before=h.personal();
  await h.click(h.get("contextual-courses-list").querySelector("[data-contextual-course-id]"));
  assertTarget(h,/^Aula 21$/);assert.deepEqual(h.personal(),before);assert.equal(h.writes().length,0);
});
await scenario("search results preserve their exact lesson and focus after explicit activation",async()=>{
  const h=await harness();h.focus("lesson-search-query");await h.search();
  assert.equal(h.focuses().length,0);assert.equal(h.document.activeElement,h.get("lesson-search-query"));
  await h.click(h.get("lesson-search-results").querySelector("[data-search-lesson]"));assertTarget(h,/^Aula 12$/);
  assert.equal(h.state.lessonId,12);assert.equal(h.writes().length,0);
});
await scenario("a result replaced by a new search cannot supersede the current navigation",async()=>{
  const h=await harness();await h.search();const old=h.get("lesson-search-results").querySelector("[data-search-lesson]");
  await h.search();await h.click(h.course(2));const requests=h.calls.length,count=h.focuses().length;
  for(const handler of old.events.get("click"))await handler();await h.flush();
  assert.equal(h.calls.length,requests);assert.equal(h.focuses().length,count);assertTarget(h,/^Aula 21$/);
});
await scenario("an invalid query removes the former result without leaving its old handler active",async()=>{
  const h=await harness();await h.search();const old=h.get("lesson-search-results").querySelector("[data-search-lesson]");
  const request=h.state.searchRequest;h.get("lesson-search-query").value="x";
  await h.emit(h.get("lesson-search-form"),"submit");assert.equal(h.state.searchRequest,request);assert.equal(old.isConnected,false);
  await h.click(h.course(2));const requests=h.calls.length,count=h.focuses().length;
  for(const handler of old.events.get("click"))await handler();await h.flush();
  assert.equal(h.calls.length,requests);assert.equal(h.focuses().length,count);assertTarget(h,/^Aula 21$/);
});
await scenario("a removed suggested course cannot create focus or navigate through its old button",async()=>{
  const h=await harness();await h.click(h.course(1));const old=h.get("contextual-courses-list").querySelector("[data-contextual-course-id]");
  h.server.courses=h.server.courses.filter(course=>course.id!==2);await h.student.loadLibrary();await h.flush();
  const requests=h.calls.length,count=h.focuses().length;
  for(const handler of old.events.get("click"))await handler();await h.flush();
  assert.equal(h.calls.length,requests);assert.equal(h.focuses().length,count);assert.equal(h.state.courseId,1);
});
await scenario("a valid empty course focuses its honest empty message",async()=>{
  const h=await harness();await h.click(h.course(4));assertTarget(h,/Ainda não existem aulas publicadas/);
  assert.equal(h.state.lessonId,null);assert.equal(h.calls.filter(row=>/^\/lessons\//.test(row.path)).length,0);
});
await scenario("a removed search target focuses unavailable without substituting another lesson",async()=>{
  const h=await harness();await h.search();h.server.lessons=h.server.lessons.filter(row=>row.id!==12);
  await h.click(h.get("lesson-search-results").querySelector("[data-search-lesson]"));
  assertTarget(h,/Esta aula não está mais disponível/);assert.equal(h.state.lessonId,null);
  assert.equal(h.calls.filter(row=>/^\/lessons\//.test(row.path)).length,0);
});
for(const [path,result,message] of [
  ["/courses/1/lessons",{status:503,payload:{}},/As aulas não puderam ser carregadas/],
  ["/courses/1/lessons",ok({lessons:null}),/As aulas não puderam ser carregadas/],
  ["/lessons/11",{status:404,payload:{}},/A aula está temporariamente indisponível/],
  ["/lessons/11/progress",ok({completed:"false"}),/A aula está temporariamente indisponível/],
])await scenario("authorized empty/error destination rejects partial content: "+path+" "+result.status,async()=>{
  const h=await harness();h.overrides.set(path,result);await h.click(h.course(1));assertTarget(h,message);
  assert.equal(h.content.querySelector("h3"),null);assert.equal(h.writes().length,0);
});
for(const path of ["/courses/1/lessons","/lessons/12"]){
  await scenario("manual retry creates a new intent and preserves the exact search target: "+path,async()=>{
    const h=await harness();await h.search();h.overrides.set(path,{status:503,payload:{}});
    await h.click(h.get("lesson-search-results").querySelector("[data-search-lesson]"));
    const retry=h.content.querySelector(path.includes("courses")?".lesson-retry":".lesson-detail-retry");
    const before=h.calls.length;h.overrides.delete(path);await h.click(retry);
    assertTarget(h,/^Aula 12$/);assert.equal(h.state.lessonId,12);assert.equal(h.writes().length,0);
    assert.equal(h.calls.slice(before).filter(row=>row.path===path).length,1);
  });
}
for(const path of ["/courses/1/lessons","/lessons/11"]){
  await scenario("a detached retry from an older request cannot navigate or focus: "+path,async()=>{
    const h=await harness();h.overrides.set(path,{status:503,payload:{}});await h.click(h.course(1));
    const retry=h.content.querySelector(path.includes("courses")?".lesson-retry":".lesson-detail-retry");
    h.overrides.delete(path);await h.click(h.course(1));const count=h.calls.length,focuses=h.focuses().length;
    // Invoke the old real closure directly, beyond ordinary DOM detachment.
    for(const handler of retry.events.get("click"))await handler();await h.flush();
    assert.equal(h.calls.length,count);assert.equal(h.focuses().length,focuses);assertTarget(h,/^Aula 11$/);
  });
}
for(const path of ["/courses/1/lessons","/lessons/11","/lessons/11/progress"]){
  await scenario("focus moved to another control cancels delivery across every read stage: "+path,async()=>{
    const h=await harness(),held=h.hold(path,{json:true});await h.click(h.course(1));await held.seen();
    h.focus("lesson-search-query");held.release();await h.flush();
    assert.equal(h.document.activeElement,h.get("lesson-search-query"));assert.equal(h.focuses().length,0);
    assert.equal(h.get("lesson-navigation-target").textContent,"Aula 11");assert.equal(h.writes().length,0);
  });
}
await scenario("a late error is rendered without taking focus from another control",async()=>{
  const h=await harness(),held=h.hold("/lessons/11",{result:{status:503,payload:{}}});
  await h.click(h.course(1));await held.seen();h.focus("lesson-search-query");held.release();await h.flush();
  assert.equal(h.document.activeElement,h.get("lesson-search-query"));assert.equal(h.focuses().length,0);
  assert.match(h.get("lesson-navigation-target").textContent,/temporariamente indisponível/);
});
await scenario("a retry carries its click intent across its own course read without recapture",async()=>{
  const h=await harness();h.overrides.set("/courses/1/lessons",{status:503,payload:{}});await h.click(h.course(1));
  const held=h.hold("/courses/1/lessons");await h.click(h.content.querySelector(".lesson-retry"));await held.seen();
  const count=h.focuses().length;h.focus("lesson-search-query");held.release();await h.flush();
  assert.equal(h.document.activeElement,h.get("lesson-search-query"));assert.equal(h.focuses().length,count);
  assert.equal(h.get("lesson-navigation-target").textContent,"Aula 11");
});
for(const type of ["pointerdown","keydown","click","input","change","wheel"]){
  await scenario("a later interaction cancels pending focus without blocking the control: "+type,async()=>{
    const h=await harness(),held=h.hold("/lessons/11");await h.click(h.course(1));await held.seen();
    h.observe(type);held.release();await h.flush();
    assert.equal(h.focuses().length,0);assert.equal(h.env.prevented,0);assert.equal(h.env.stopped,0);
    assert.equal(h.get("lesson-navigation-target").textContent,"Aula 11");
  });
}
await scenario("leaving and returning to the tab does not revive a pending focus intent",async()=>{
  const h=await harness(),held=h.hold("/lessons/11");await h.click(h.course(1));await held.seen();
  h.hidden(true);h.hidden(false);held.release();await h.flush();assert.equal(h.focuses().length,0);
});
await scenario("window blur cancels delivery even when the document remains visible and later returns",async()=>{
  const h=await harness(),held=h.hold("/lessons/11");await h.click(h.course(1));await held.seen();
  h.blur();h.front();held.release();await h.flush();assert.equal(h.focuses().length,0);
});
await scenario("a document without focus cannot receive a pending navigation focus",async()=>{
  const h=await harness(),held=h.hold("/lessons/11");await h.click(h.course(1));await held.seen();
  h.env.focused=false;held.release();await h.flush();assert.equal(h.focuses().length,0);
});
await scenario("an older course response cannot replace or focus after a newer explicit choice",async()=>{
  const h=await harness(),held=h.hold("/courses/1/lessons");await h.click(h.course(1));await held.seen();
  await h.click(h.course(2));assertTarget(h,/^Aula 21$/);const count=h.focuses().length;
  held.release();await h.flush();assertTarget(h,/^Aula 21$/);assert.equal(h.focuses().length,count);
});
await scenario("an older lesson response cannot focus or replace the latest lesson",async()=>{
  const h=await harness();await h.click(h.course(1));const held=h.hold("/lessons/11");
  await h.click(h.lesson(11));await held.seen();await h.click(h.lesson(12));const count=h.focuses().length;
  held.release();await h.flush();assertTarget(h,/^Aula 12$/);assert.equal(h.focuses().length,count);
});
await scenario("saved-position return focuses the exact version only after its original click",async()=>{
  const h=await harness();h.server.snapshot=saved();await h.student.loadReadingPosition();
  const before=h.personal();await h.click("resume-reading-position");assertTarget(h,/^Aula 12$/);
  assert.deepEqual(h.personal(),before);assert.equal(h.writes().length,0);
});
for(const path of ["/reading-position","/courses/1/lessons","/lessons/12"]){
  await scenario("saved-position focus is not recaptured after an awaited stage: "+path,async()=>{
    const h=await harness();h.server.snapshot=saved();await h.student.loadReadingPosition();
    const held=h.hold(path,{json:true});await h.click("resume-reading-position");await held.seen();
    h.focus("lesson-search-query");held.release();await h.flush();
    assert.equal(h.state.lessonId,12);assert.equal(h.document.activeElement,h.get("lesson-search-query"));
    assert.equal(h.focuses().length,0);assert.equal(h.writes().length,0);
  });
}
for(const [label,response,expected] of [
  ["changed",ok({...saved(),revision:"new-revision"}),/Sua posição foi atualizada/],
  ["missing",ok(none()),/Sua posição foi atualizada/],
  ["unavailable",ok({...none(),status:"unavailable",revision:"new-revision"}),/Sua posição foi atualizada/],
  ["failure",{status:503,payload:{}},/Não foi possível consultar/],
])await scenario("a saved-position return that cannot proceed focuses its current message: "+label,async()=>{
  const h=await harness();h.server.snapshot=saved();await h.student.loadReadingPosition();
  h.overrides.set("/reading-position",response);await h.click("resume-reading-position");
  assert.equal(h.document.activeElement,h.get("reading-position-status"));
  assert.match(h.get("reading-position-status").textContent,expected);assert.equal(h.state.courseId,null);
  assert.equal(h.calls.filter(row=>row.path.includes("/lessons")).length,0);
});
await scenario("a saved reference outside the current catalog has an honest focus destination",async()=>{
  const h=await harness();h.server.snapshot=saved(991,99);await h.student.loadReadingPosition();
  await h.click("resume-reading-position");assert.equal(h.document.activeElement,h.get("reading-position-status"));
  assert.match(h.get("reading-position-status").textContent,/não está no catálogo carregado/);assert.equal(h.state.courseId,null);
});
await scenario("exact saved version remains exact through retry and never silently falls back",async()=>{
  const h=await harness();h.server.snapshot=saved(12,1,2);await h.student.loadReadingPosition();
  await h.click("resume-reading-position");assertTarget(h,/A aula está temporariamente indisponível/);
  const retry=h.content.querySelector(".lesson-detail-retry");await h.click(retry);
  assertTarget(h,/A aula está temporariamente indisponível/);assert.equal(h.content.querySelector("h3"),null);
  h.server.lessons.find(row=>row.id===12).course_version=2;
  await h.click(h.content.querySelector(".lesson-detail-retry"));assertTarget(h,/^Aula 12$/);
});
await scenario("a newer navigation during position consultation owns the final focus",async()=>{
  const h=await harness();h.server.snapshot=saved();await h.student.loadReadingPosition();
  const held=h.hold("/reading-position");await h.click("resume-reading-position");await held.seen();
  await h.click(h.course(2));const count=h.focuses().length;held.release();await h.flush();
  assertTarget(h,/^Aula 21$/);assert.equal(h.focuses().length,count);assert.equal(h.state.courseId,2);
});
await scenario("passive course and exact-version reads do not invent a focus intent",async()=>{
  const h=await harness();h.focus("lesson-search-query");await h.student.selectCourse(1,12,1);
  assert.equal(h.document.activeElement,h.get("lesson-search-query"));assert.equal(h.focuses().length,0);
});
await scenario("library refresh invalidates pending focus without recapturing it after success",async()=>{
  const h=await harness(),held=h.hold("/lessons/11");await h.click(h.course(1));await held.seen();
  await h.student.loadLibrary();await h.flush();held.release();await h.flush();assert.equal(h.focuses().length,0);
});
await scenario("passive favorites, retained references and position reads leave focus on its chosen control",async()=>{
  const h=await harness();await h.click(h.course(1));h.focus("lesson-search-query");const count=h.focuses().length;
  await h.student.loadFavorites();await h.student.loadRetainedFavorites();await h.student.loadReadingPosition();
  h.student.renderCourses();assert.equal(h.document.activeElement,h.get("lesson-search-query"));assert.equal(h.focuses().length,count);
});
await scenario("confirmed completion and its catalog refresh never move focus to the lesson heading",async()=>{
  const h=await harness();await h.click(h.course(1));const count=h.focuses().length;
  await h.click(h.content.querySelector(".primary"));assert.equal(h.focuses().length,count);
  assert.equal(h.server.completed.has(11),true);assert.equal(h.writes().length,1);
});
await scenario("favorite writes do not move focus to the lesson heading",async()=>{
  const h=await harness();await h.click(h.course(1));const count=h.focuses().length;
  await h.click("course-favorite-toggle");assert.equal(h.focuses().length,count);
  assert.equal(h.server.favoriteIds.includes(1),true);assert.equal(h.state.lessonId,11);
});
await scenario("help recovery is also an explicit navigation with the current exact lesson",async()=>{
  const h=await harness();await h.click(h.course(1));h.get("lesson-help-question").value="Como revisar este texto";
  await h.emit(h.content.querySelector("form"),"submit");const before=h.focuses().length;
  await h.click(h.content.querySelector("[data-help-reload]"));assertTarget(h,/^Aula 11$/);
  assert.equal(h.focuses().length,before+1);assert.equal(h.state.courseId,1);
});
for(const code of [403,419]){
  await scenario("revocation during navigation purges without focusing private or stale content: "+code,async()=>{
    const h=await harness();h.overrides.set("/lessons/11",{status:code,payload:{}});
    await h.click(h.course(1));assert.equal(h.state.accessDenied,true);assert.equal(h.focuses().length,0);
    assert.equal(h.get("lesson-navigation-target"),null);assert.equal(h.state.courses.length,0);
  });
  await scenario("a delayed authorized body cannot focus or restore after another request revokes access: "+code,async()=>{
    const h=await harness(),held=h.hold("/lessons/11",{json:true});await h.click(h.course(1));await held.seen();
    h.overrides.set("/favorites",{status:code,payload:{}});await h.student.loadFavorites();
    held.release();await h.flush();assert.equal(h.state.accessDenied,true);assert.equal(h.focuses().length,0);
    assert.equal(h.get("lesson-navigation-target"),null);assert.equal(h.content.querySelector("h3"),null);
  });
}
await scenario("a detached destination cannot receive focus even with a current intent",async()=>{
  const h=await harness(),target=h.document.createElement("h3"),intent=h.student.beginNavigationFocus();
  h.student.finishNavigationFocus(target,intent);assert.equal(h.document.activeElement,h.document.body);
});
await scenario("a delivered intent cannot focus again and observations do not change business state",async()=>{
  const h=await harness(),target=h.document.createElement("h3");h.document.body.append(target);
  const intent=h.student.beginNavigationFocus();h.student.finishNavigationFocus(target,intent);
  h.focus("lesson-search-query");h.student.finishNavigationFocus(target,intent);
  assert.equal(h.document.activeElement,h.get("lesson-search-query"));
  const before=clone(h.state),requests=h.calls.length;
  for(const type of ["pointerdown","keydown","focusin","click","input","change","wheel"])h.observe(type);
  assert.deepEqual(clone(h.state),before);assert.equal(h.calls.length,requests);
  assert.equal(h.env.prevented,0);assert.equal(h.env.stopped,0);assert.equal(h.storageCalls.length,0);
});
console.log("PASS student navigation focus: "+scenarios+" actual-script scenarios; explicit destinations, original intent, concurrent interaction, tabs, exact retries, passive reads and revoked/stale responses");
