#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Execute the complete view and its real search, navigation and library
// handlers. Only DOM/events and HTTP are synthetic. No browser or server
// starts; cursor cryptography and database ordering belong to backend CI.
const view=readFileSync(new URL("../resources/views/university/student.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
assert.ok(start>=0&&end>start);
const original=view.slice(start,end);assert.match(original,/\nloadLibrary\(\);\s*$/);
const exposed=["state","navigationFocus","beginNavigationFocus","finishNavigationFocus","loadLibrary","loadFavorites",
  "loadRetainedFavorites","loadReadingPosition","renderReadingPosition","renderCourses","selectCourse","selectLesson",
  "openCourseWithAllFilters","resumeReadingPosition","lockAccess","validLessonSearchResults","validLessonSearchCursor",
  "invalidateLessonSearch","renderLessonSearchControls","searchLessonPage"];
const source=original.replace(/\nloadLibrary\(\);\s*$/,"")+"\nglobalThis.student={"+exposed.join(",")+"};";
const clone=value=>JSON.parse(JSON.stringify(value));
const ok=payload=>({status:200,payload});
const none=()=>({schema_version:1,scope:"current_authenticated_student",status:"none",revision:"initial-ticket",position:null});
const saved=(lesson_id=12,course_id=1,course_version=1)=>({...none(),status:"available",revision:"saved-revision",
  position:{course_id,course_version,lesson_id,saved_at:"2026-11-17T10:00:00Z"}});
function deferred(){let release;const promise=new Promise(resolve=>{release=resolve;});return {promise,release};}
async function bounded(promise,label){
  let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new Error("Private search pages harness timeout: "+label)),1000);
  })]);}finally{clearTimeout(timer);}
}
const pagePayload=(results,next_cursor=null)=>({schema_version:1,scope:"current_published_editorial_lessons",results:clone(results),next_cursor});
function serverState(){
  const courses=[{id:1,category:"metodologia"},{id:2,category:"metodologia"},
    {id:3,category:"negocios"},{id:4,category:"sistemas"}]
    .map(row=>({...row,slug:"curso-"+row.id,title:"Curso "+row.id,summary:"Resumo autorizado "+row.id}));
  courses.find(course=>course.id===3).slug="trilha-clientes-conquiste-acompanhe";
  const lessons=[11,12,21,31].map(id=>({id,slug:"aula-"+id,title:"Aula "+id,
    body:"Texto autorizado e sintético da aula "+id+".",sort_order:id%10,course_id:Math.floor(id/10),course_version:1}));
  for(let id=13;id<=19;id++)lessons.push({id,slug:"aula-"+id,title:"Aula "+id,
    body:"Texto autorizado e sintético da aula "+id+".",sort_order:id%10,course_id:1,course_version:1});
  const searchRows=lessons.filter(lesson=>lesson.course_id===1).map(lesson=>({course_id:1,lesson_id:lesson.id,
    course_title:"Curso 1",lesson_title:lesson.title,snippet:"Texto sintético da aula "+lesson.id+"."}));
  return {courses,lessons,searchRows,completed:new Set(),favoriteIds:[2],snapshot:none()};
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
    if(path==="/search"){
      assert.equal(request.body.paginated,true,"The real UI must opt into pagination");
      const token=request.body.cursor;
      if(token!==undefined&&!/^synthetic-page-[1-9][0-9]*$/.test(token))
        return {status:422,payload:{error:"invalid_cursor"}};
      const offset=token===undefined?0:Number(token.slice("synthetic-page-".length));
      const results=server.searchRows.slice(offset,offset+8),next=offset+8<server.searchRows.length?"synthetic-page-"+(offset+8):null;
      return ok(pagePayload(results,next));
    }
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
    storageCalls.push(method);throw new Error("Private search must not store a query");
  }]));
  const context=createContext({document,window:{addEventListener:(type,handler,options)=>add(windowEvents,type,handler,options)},
    Blob,URL,TextEncoder,setTimeout:()=>1,clearTimeout:()=>{},localStorage:storage,sessionStorage:storage,
    fetch:async(url,options)=>{
      const path=new URL(url,"http://127.0.0.1").pathname.replace("/universidade/private","");
      const request={path,url,...options,body:options.body===undefined?null:JSON.parse(options.body)};calls.push(request);
      const override=overrides.get(path);
      const result=(typeof override==="function"?await override(request):override)??fallback(request);
      return {status:result.status,ok:result.status>=200&&result.status<300,
        json:async()=>result.json?await result.json():clone(result.payload)};
    }});
  new Script(source,{filename:"actual-private-search-pages"}).runInContext(context);
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
    typeSearch:async phrase=>{get("lesson-search-query").value=phrase;await emit(get("lesson-search-query"),"input");},
    search:async(phrase="texto")=>{get("lesson-search-query").value=phrase;await emit(get("lesson-search-query"),"input");await emit(get("lesson-search-form"),"submit");},
    next:()=>click("lesson-search-next"),restart:()=>click("lesson-search-restart"),
    hits:()=>get("lesson-search-results").querySelectorAll("[data-search-lesson]"),
    searches:()=>calls.filter(request=>request.path==="/search"),
    writes:()=>calls.filter(request=>request.method!=="GET"&&!["/initialize","/search"].includes(request.path))};
}

let scenarios=0;
async function scenario(label,run){try{await run();}catch(error){error.message=label+": "+error.message;throw error;}scenarios++;}
const ids=h=>h.hits().map(button=>Number(button.dataset.searchLesson));
const selection=h=>clone({courseId:h.state.courseId,lessonId:h.state.lessonId,courseRequest:h.state.courseRequest,
  lessonRequest:h.state.lessonRequest,filter:h.state.filter,query:h.state.query,favoritesOnly:h.state.favoritesOnly,
  lessonFilter:h.state.lessonFilter});
const clearSearch=h=>{
  assert.equal(h.state.searchBusy,false);assert.equal(h.state.searchQuery,"");assert.equal(h.state.searchNextCursor,null);
  assert.equal(h.state.searchPage,0);assert.equal(h.hits().length,0);
  assert.equal(h.get("lesson-search-navigation").hidden,true);
  assert.equal(h.get("lesson-search-next").disabled,true);assert.equal(h.get("lesson-search-restart").disabled,true);
};
const invoke=async(node,type="click")=>{for(const handler of node.events.get(type)||[])await handler({target:node,preventDefault(){}});};

await scenario("the opt-in parser allowlists the same five fields and opaque continuation",async()=>{
  const h=await harness(),rows=h.server.searchRows.slice(0,8),input={...pagePayload(rows,"opaque-token"),
    company_id:55,subject_key:"synthetic-private",results:rows.map(row=>({...row,body:"not for results",company_id:55}))};
  const before=JSON.stringify(input);
  assert.deepEqual(clone(h.student.validLessonSearchResults(JSON.parse(before))),{results:rows,next_cursor:"opaque-token"});
  assert.equal(JSON.stringify(input),before);
});
await scenario("empty, short terminal and exactly eight terminal results are valid",async()=>{
  const h=await harness();
  for(const count of [0,1,8]){
    const input=pagePayload(h.server.searchRows.slice(0,count));
    assert.deepEqual(clone(h.student.validLessonSearchResults(input)),{results:input.results,next_cursor:null});
  }
});
await scenario("only a complete page can carry a nonempty visible ASCII token up to 2048 characters",async()=>{
  const h=await harness(),rows=h.server.searchRows.slice(0,8);
  assert.equal(h.student.validLessonSearchResults(pagePayload(rows,"x".repeat(2048))).next_cursor.length,2048);
  for(const token of [""," ","x".repeat(2049),"token\n","token\t","ação","😀",0,false,{},[]]){
    assert.equal(h.student.validLessonSearchResults(pagePayload(rows,token)),null);
  }
  assert.equal(h.student.validLessonSearchResults(pagePayload(rows.slice(0,7),"opaque")),null);
  assert.equal(h.student.validLessonSearchResults(pagePayload([],"opaque")),null);
  assert.equal(h.student.validLessonSearchResults(pagePayload(rows,"same-token"),"same-token"),null);
});
await scenario("legacy or malformed envelopes cannot silently enable opt-in pagination",async()=>{
  const h=await harness(),good=pagePayload(h.server.searchRows.slice(0,8),"opaque");
  const missing={...good};delete missing.next_cursor;
  for(const input of [null,[],{}, {results:good.results},missing,{...good,schema_version:"1"},
    {...good,schema_version:2},{...good,scope:"another_scope"},{...good,results:null},
    {...good,results:h.server.searchRows}]){
    assert.equal(h.student.validLessonSearchResults(input),null);
  }
});
await scenario("unsafe identifiers, duplicate lessons and courses outside the authorized library reject the whole page",async()=>{
  const h=await harness(),row=h.server.searchRows[0];
  for(const invalid of [null,[],{}, {...row,course_id:"1"},{...row,course_id:999},
    {...row,lesson_id:0},{...row,lesson_id:"11"},{...row,lesson_id:9007199254740992},
    {...row,course_title:"x"},{...row,lesson_title:"x"},{...row,snippet:null}]){
    assert.equal(h.student.validLessonSearchResults(pagePayload([invalid])),null);
  }
  assert.equal(h.student.validLessonSearchResults(pagePayload([row,{...row,lesson_title:"Duplicada"}])),null);
});
await scenario("title and snippet limits count Unicode characters and preserve literal text",async()=>{
  const h=await harness(),row={...h.server.searchRows[0],course_title:"😀".repeat(200),lesson_title:"😀".repeat(200),
    snippet:"😀".repeat(180)};
  assert.deepEqual(clone(h.student.validLessonSearchResults(pagePayload([row]))),{results:[row],next_cursor:null});
  for(const key of ["course_title","lesson_title","snippet"])
    assert.equal(h.student.validLessonSearchResults(pagePayload([{...row,[key]:row[key]+"😀"}])),null);
});
await scenario("first-page submission is one private POST with canonical query and no automatic navigation",async()=>{
  const h=await harness();await h.click(h.course(2));const before=selection(h),personal=h.personal(),focuses=h.focuses().length;
  await h.search("  texto   educativo  ");
  assert.deepEqual(h.searches()[0].body,{query:"texto educativo",paginated:true});
  assert.equal(h.searches()[0].method,"POST");assert.equal(h.searches()[0].url,"/universidade/private/search");
  assert.equal(h.searches()[0].headers["X-CSRF-TOKEN"],"synthetic-csrf");
  assert.deepEqual(ids(h),[11,12,13,14,15,16,17,18]);assert.equal(h.state.searchPage,1);
  assert.equal(h.state.searchNextCursor,"synthetic-page-8");assert.equal(h.get("lesson-search-next").disabled,false);
  await h.flush();assert.equal(h.searches().length,1);assert.deepEqual(selection(h),before);
  assert.deepEqual(h.personal(),personal);assert.equal(h.focuses().length,focuses);assert.equal(h.storageCalls.length,0);
});
await scenario("manual next replaces eight results with the remaining page and retains only its state",async()=>{
  const h=await harness();await h.search();const previous=h.hits(),before=selection(h);
  await h.next();
  assert.deepEqual(h.searches()[1].body,{query:"texto",paginated:true,cursor:"synthetic-page-8"});
  assert.deepEqual(ids(h),[19]);assert.equal(previous.every(button=>!button.isConnected),true);
  assert.equal(h.state.searchPage,2);assert.equal(h.state.searchNextCursor,null);
  assert.equal(h.get("lesson-search-next").disabled,true);assert.equal(h.get("lesson-search-restart").disabled,false);
  assert.deepEqual(selection(h),before);assert.equal(h.searches().length,2);
});
await scenario("restart is explicit and omits the previous cursor",async()=>{
  const h=await harness();await h.search();await h.next();const requests=h.searches().length;
  await h.flush();assert.equal(h.searches().length,requests);await h.restart();
  assert.deepEqual(h.searches().at(-1).body,{query:"texto",paginated:true});
  assert.deepEqual(ids(h),[11,12,13,14,15,16,17,18]);assert.equal(h.state.searchPage,1);
  assert.equal(h.searches().length,requests+1);assert.equal(h.storageCalls.length,0);
});
await scenario("several manual pages keep at most eight DOM results without an accumulated limit or history",async()=>{
  const h=await harness();
  h.server.searchRows=Array.from({length:33},(_,index)=>({course_id:1,lesson_id:100+index,
    course_title:"Curso 1",lesson_title:"Aula "+(100+index),snippet:"Referência sintética."}));
  await h.search();
  for(let page=1;page<=5;page++){
    assert.equal(h.state.searchPage,page);assert.equal(h.hits().length,page===5?1:8);
    assert.equal(h.searches().length,page);assert.equal(h.storageCalls.length,0);
    if(page<5)await h.next();
  }
  assert.deepEqual(ids(h),[132]);assert.equal(h.state.searchNextCursor,null);
});
await scenario("valid empty first and continuation pages are distinct from unavailable search",async()=>{
  const first=await harness();first.server.searchRows=[];await first.search();
  assert.equal(first.hits().length,0);assert.match(first.get("lesson-search-results").textContent,/Nenhuma aula publicada/);
  assert.doesNotMatch(first.get("lesson-search-results").textContent,/indisponível/);
  const later=await harness();await later.search();later.server.searchRows=later.server.searchRows.slice(0,8);await later.next();
  assert.equal(later.hits().length,0);assert.equal(later.state.searchPage,2);assert.equal(later.state.searchNextCursor,null);
  assert.match(later.get("lesson-search-results").textContent,/Nenhuma outra aula publicada/);
});
await scenario("result text remains inert and no extra payload becomes DOM",async()=>{
  const h=await harness();h.server.searchRows=[{course_id:1,lesson_id:11,course_title:"<img onerror=x>",
    lesson_title:"<script>literal</script>",snippet:"<b>texto literal</b>",body:"private-extra"}];
  await h.search();assert.equal(h.hits().length,1);
  assert.match(h.hits()[0].textContent,/<script>literal<\/script>/);
  assert.equal(h.hits()[0].querySelector("script"),null);assert.equal(h.hits()[0].querySelector("img"),null);
  assert.doesNotMatch(h.get("lesson-search-results").textContent,/private-extra/);
});
await scenario("the last-page result opens its exact lesson with C127 focus and no educational write",async()=>{
  const h=await harness();await h.search();await h.next();const requests=h.calls.length,personal=h.personal();
  await h.click(h.hits()[0]);
  assert.equal(h.state.courseId,1);assert.equal(h.state.lessonId,19);
  assert.equal(h.document.activeElement,h.get("lesson-navigation-target"));
  assert.match(h.get("lesson-navigation-target").textContent,/Aula 19/);
  assert.deepEqual(h.calls.slice(requests).map(call=>call.method+" "+call.path).sort(),
    ["GET /courses/1/lessons","GET /lessons/19","GET /lessons/19/progress"].sort());
  assert.deepEqual(h.personal(),personal);assert.equal(h.writes().length,0);
});
await scenario("a removed paginated target never falls back to the first pending lesson",async()=>{
  const h=await harness();await h.search();await h.next();
  h.server.lessons=h.server.lessons.filter(lesson=>lesson.id!==19);await h.click(h.hits()[0]);
  assert.equal(h.state.lessonId,null);assert.match(h.content.textContent,/não está mais disponível/);
  assert.equal(h.calls.filter(call=>call.path==="/lessons/11"||call.path==="/lessons/19").length,0);
  assert.equal(h.writes().length,0);
});
await scenario("a retry after list failure preserves the exact paginated target",async()=>{
  const h=await harness();await h.search();await h.next();
  h.overrides.set("/courses/1/lessons",{status:503,payload:{error:"temporarily_unavailable"}});
  await h.click(h.hits()[0]);assert.equal(h.state.lessonId,null);
  const retry=h.content.querySelector(".lesson-retry");assert.ok(retry);
  h.overrides.delete("/courses/1/lessons");await h.click(retry);
  assert.equal(h.state.lessonId,19);assert.equal(h.writes().length,0);
});
await scenario("ordinary course navigation preserves the global search page and cursor",async()=>{
  const h=await harness();await h.search();const buttons=h.hits(),request=h.state.searchRequest,token=h.state.searchNextCursor;
  await h.click(h.course(2));assert.equal(h.state.searchRequest,request);assert.equal(h.state.searchNextCursor,token);
  assert.equal(buttons.every(button=>button.isConnected),true);assert.equal(h.state.lessonId,21);
  await h.next();assert.deepEqual(ids(h),[19]);assert.equal(h.state.lessonId,21);
});
await scenario("a page replaced by next or restart cannot execute its detached result handler",async()=>{
  const h=await harness();await h.search();const first=h.hits()[0];await h.next();const second=h.hits()[0];
  await h.restart();const requests=h.calls.length,focuses=h.focuses().length,before=selection(h);
  await invoke(first);await invoke(second);await h.flush();
  assert.equal(h.calls.length,requests);assert.equal(h.focuses().length,focuses);assert.deepEqual(selection(h),before);
});
await scenario("typing another query invalidates its page and cursor without any HTTP or storage",async()=>{
  const h=await harness();await h.search();const old=h.hits()[0],requests=h.calls.length;
  await h.typeSearch("outro assunto");clearSearch(h);assert.equal(h.get("lesson-search-query").value,"outro assunto");
  assert.equal(h.get("lesson-search-submit").disabled,false);await invoke(old);
  await invoke(h.get("lesson-search-next"));await invoke(h.get("lesson-search-restart"));
  assert.equal(h.calls.length,requests);assert.equal(h.storageCalls.length,0);
});
await scenario("a malformed submitted query detaches old controls even without an input event",async()=>{
  const h=await harness();await h.search();const old=h.hits()[0],request=h.state.searchRequest,requests=h.calls.length;
  h.get("lesson-search-query").value="texto!";await h.emit(h.get("lesson-search-form"),"submit");
  clearSearch(h);assert.equal(h.state.searchRequest,request);assert.match(h.get("lesson-search-results").textContent,/3 a 60/);
  await invoke(old);assert.equal(h.calls.length,requests);
});
await scenario("one page request is active until input or library invalidates that generation",async()=>{
  const h=await harness();const held=h.hold("/search"),pending=h.search();await held.seen();
  await h.emit(h.get("lesson-search-form"),"submit");await invoke(h.get("lesson-search-next"));await invoke(h.get("lesson-search-restart"));
  assert.equal(h.searches().length,1);assert.equal(h.state.searchBusy,true);
  held.release();await bounded(pending,"first search");assert.equal(h.hits().length,8);
});
await scenario("changing the input permits a new query and the old finally cannot clear its busy state",async()=>{
  const h=await harness(),old=h.hold("/search"),oldSearch=h.search();await old.seen();await h.typeSearch("outro");
  const fresh=h.hold("/search"),freshSearch=h.search("outro");await fresh.seen();
  old.release();await bounded(oldSearch,"old input search");
  assert.equal(h.state.searchBusy,true);assert.equal(h.state.searchQuery,"outro");assert.equal(h.hits().length,0);
  assert.equal(h.get("lesson-search-submit").disabled,true);
  fresh.release();await bounded(freshSearch,"new input search");
  assert.equal(h.state.searchBusy,false);assert.equal(h.hits().length,8);assert.match(h.get("lesson-search-results").textContent,/“outro”/);
});
await scenario("a pending search cannot render while library authorization is being refreshed",async()=>{
  const h=await harness(),search=h.hold("/search"),searching=h.search();await search.seen();
  const courses=h.hold("/courses"),loading=h.student.loadLibrary();await courses.seen();
  clearSearch(h);assert.equal(h.state.libraryLoading,true);assert.equal(h.get("lesson-search-query").disabled,true);
  search.release();await bounded(searching,"search during refresh");clearSearch(h);
  const before=h.searches().length;await h.search("bloqueada");assert.equal(h.searches().length,before);
  courses.release();await bounded(loading,"library refresh");await h.flush();
  assert.equal(h.state.libraryReady,true);assert.equal(h.get("lesson-search-submit").disabled,false);
  await h.search("recuperada");assert.equal(h.searches().length,before+1);assert.equal(h.hits().length,8);
});
await scenario("a failed library refresh cannot leave search busy after a later successful recovery",async()=>{
  const h=await harness(),search=h.hold("/search"),searching=h.search();await search.seen();
  h.overrides.set("/initialize",{status:503,payload:{error:"temporarily_unavailable"}});
  await h.student.loadLibrary();search.release();await bounded(searching,"search after refresh failure");clearSearch(h);
  assert.equal(h.state.libraryReady,false);h.overrides.delete("/initialize");await h.student.loadLibrary();await h.flush();
  assert.equal(h.state.libraryReady,true);assert.equal(h.state.searchBusy,false);
  const before=h.searches().length;await h.search("recuperada");
  assert.equal(h.searches().length,before+1);assert.equal(h.state.searchBusy,false);assert.equal(h.hits().length,8);
});
await scenario("an old error after library recovery cannot clear a newer pending search",async()=>{
  const h=await harness(),old=h.hold("/search",{result:{status:503,payload:{error:"temporarily_unavailable"}}}),oldSearch=h.search();
  await old.seen();await h.student.loadLibrary();await h.flush();
  const fresh=h.hold("/search"),freshSearch=h.search("nova busca");await fresh.seen();
  old.release();await bounded(oldSearch,"stale error");
  assert.equal(h.state.searchBusy,true);assert.equal(h.state.searchQuery,"nova busca");
  assert.match(h.get("lesson-search-results").textContent,/Procurando/);
  fresh.release();await bounded(freshSearch,"new search");assert.equal(h.state.searchBusy,false);assert.equal(h.hits().length,8);
});
await scenario("late JSON from an invalidated query cannot replace the current page",async()=>{
  const h=await harness(),old=h.hold("/search",{json:true}),oldSearch=h.search();await old.seen();
  await h.typeSearch("nova");h.overrides.delete("/search");await h.search("nova");const buttons=h.hits(),request=h.state.searchRequest;
  old.release();await bounded(oldSearch,"stale JSON");
  assert.equal(h.state.searchRequest,request);assert.equal(h.state.searchQuery,"nova");
  assert.equal(buttons.every((button,index)=>h.hits()[index]===button),true);assert.equal(h.state.searchBusy,false);
});
for(const status of [409,422,503]){
  await scenario("HTTP "+status+" during continuation offers only explicit restart, without replay",async()=>{
    const h=await harness();await h.search();
    h.overrides.set("/search",{status,payload:{error:status===409?"search_context_changed":status===422?"invalid_cursor":"temporarily_unavailable"}});
    await h.next();assert.equal(h.searches().length,2);assert.equal(h.hits().length,0);
    assert.equal(h.state.searchNextCursor,null);assert.equal(h.state.searchBusy,false);
    assert.equal(h.get("lesson-search-next").disabled,true);assert.equal(h.get("lesson-search-restart").disabled,false);
    assert.match(h.get("lesson-search-results").textContent,status===409?/conteúdo da busca mudou/:status===422?/validar a continuação/:/indisponível/);
    await h.flush();assert.equal(h.searches().length,2);
    h.overrides.delete("/search");await h.restart();assert.equal(h.searches().length,3);
    assert.deepEqual(h.searches()[2].body,{query:"texto",paginated:true});assert.equal(h.hits().length,8);
  });
}
await scenario("a malformed continuation clears the page rather than publishing a partial list or false empty",async()=>{
  const h=await harness();await h.search();
  h.overrides.set("/search",ok(pagePayload([{...h.server.searchRows[0],course_id:999}])));
  await h.next();assert.equal(h.hits().length,0);assert.equal(h.state.searchNextCursor,null);
  assert.match(h.get("lesson-search-results").textContent,/indisponível/);
  assert.doesNotMatch(h.get("lesson-search-results").textContent,/Nenhuma aula publicada/);
  assert.equal(h.searches().length,2);
});
await scenario("legacy response to an opt-in first page is not silently interpreted as a complete search",async()=>{
  const h=await harness();h.overrides.set("/search",ok({results:h.server.searchRows.slice(0,8)}));await h.search();
  assert.equal(h.hits().length,0);assert.match(h.get("lesson-search-results").textContent,/indisponível/);
  assert.equal(h.state.searchNextCursor,null);assert.equal(h.get("lesson-search-restart").disabled,false);
});
for(const status of [403,419]){
  await scenario("HTTP "+status+" purges the query, page, cursor and every search action",async()=>{
    const h=await harness();await h.search();const old=h.hits()[0];
    h.overrides.set("/search",{status,payload:{error:"access_denied"}});await h.next();
    clearSearch(h);assert.equal(h.state.accessDenied,true);assert.equal(h.get("lesson-search-query").value,"");
    assert.equal(h.get("lesson-search-query").disabled,true);assert.equal(h.get("lesson-search-submit").disabled,true);
    const requests=h.calls.length;await invoke(old);await invoke(h.get("lesson-search-restart"));
    await invoke(h.get("lesson-search-next"));await h.search("não pode");
    assert.equal(h.calls.length,requests);
  });
}
await scenario("revocation while a page body is pending prevents late restoration",async()=>{
  const h=await harness();await h.search();const held=h.hold("/search",{json:true}),pending=h.next();await held.seen();
  h.student.lockAccess("Acesso encerrado.");clearSearch(h);held.release();await bounded(pending,"revoked JSON");
  clearSearch(h);assert.equal(h.state.accessDenied,true);assert.equal(h.get("lesson-search-query").value,"");
});
await scenario("pagination leaves course, progress, favorites and reading position unchanged until a result is activated",async()=>{
  const h=await harness();await h.click(h.course(2));const before=selection(h),personal=h.personal();
  await h.search();await h.next();await h.restart();
  assert.deepEqual(selection(h),before);assert.deepEqual(h.personal(),personal);assert.equal(h.writes().length,0);
  assert.equal(h.storageCalls.length,0);assert.equal(h.state.lessonId,21);
});
console.log("PASS C140 private search pages: "+scenarios+" actual-script scenarios");
