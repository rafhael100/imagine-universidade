#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Exercise the complete actual admin script and its registered handlers.
// Only DOM primitives, confirmations and HTTP are synthetic; no browser,
// Portal, framework server or database starts in this check.
const view=readFileSync(new URL("../resources/views/university/admin.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
assert.ok(start>=0&&end>start,"Actual admin script must exist");
const boot='loadAdminCatalog();\n(async()=>{try{await refreshAudit();}catch(error){say(error.message);}})();';
assert.ok(view.slice(start,end).includes(boot),"Only explicit startup calls may be removed from the harness");
const source=view.slice(start,end).replace(boot,"")+"\nglobalThis.editor={state,validatedEditorialOverview,renderEditorialOverview,refreshEditorialOverview,invalidateEditorialOverview,refreshCourses,refreshLessons,loadAdminCatalog,beginWrite,finishWrite,lockAccess};";
const clone=value=>JSON.parse(JSON.stringify(value));
const names=["metodologia","negocios","sistemas"];
const counts=["courses","published_courses","draft_courses","current_lessons"];
const courseFields=["course-title","course-slug","course-category","course-summary","course-sort"];
const lessonFields=["lesson-title","lesson-slug","lesson-body","lesson-sort"];
const buttons=["new-course","course-save","lesson-save","delete-course","delete-lesson","publish","unpublish",
  "check-publication","clear-lesson","preview-lesson","retry-catalog","refresh-audit","load-more-audit"];
const fixtureCourse=()=>({id:1,slug:"curso-ficticio",title:"Curso editorial fictício",summary:"Resumo salvo.",
  category:"metodologia",sort_order:0,is_published:false});
const fixtureLesson=()=>({id:11,slug:"aula-ficticia",title:"Aula editorial fictícia",body:"Conteúdo salvo da aula fictícia.",
  sort_order:0,status:"draft",is_published:false});
const empty=()=>({schema_version:1,scope:"current_editorial_catalog",
  totals:{courses:0,published_courses:0,draft_courses:0,current_lessons:0,courses_without_lessons:0,courses_without_summary:0},
  categories:names.map(category=>({category,courses:0,published_courses:0,draft_courses:0,current_lessons:0}))});
const snapshot=()=>({schema_version:1,scope:"current_editorial_catalog",
  totals:{courses:6,published_courses:2,draft_courses:4,current_lessons:9,courses_without_lessons:2,courses_without_summary:3},
  categories:[{category:"metodologia",courses:3,published_courses:1,draft_courses:2,current_lessons:5},
    {category:"negocios",courses:2,published_courses:1,draft_courses:1,current_lessons:4},
    {category:"sistemas",courses:1,published_courses:0,draft_courses:1,current_lessons:0}]});
const response=(status,payload)=>({status,ok:status>=200&&status<300,json:async()=>clone(payload)});

async function harness({load=true,published=false}={}){
  const nodes=new Map(),requests=[],dialogs=[];
  const control={accept:true,overview:{status:200,payload:snapshot()},fetchHook:null};
  const server={courses:[fixtureCourse()],lessons:[fixtureLesson()],nextId:20};
  if(published){server.courses[0].is_published=true;server.lessons[0].is_published=true;server.lessons[0].status="published";}
  function element(tagName="DIV",id=null){
    return {tagName,id,value:"",ownText:"",disabled:false,hidden:false,inert:false,dataset:{},children:[],attributes:{},events:new Map(),
      get textContent(){return this.ownText+this.children.map(child=>child.textContent).join("");},
      set textContent(value){this.ownText=String(value);this.children=[];},
      append(...items){this.children.push(...items);},
      replaceChildren(...items){this.ownText="";this.children=items;},
      setAttribute(name,value){this.attributes[name]=String(value);},
      addEventListener(event,fn){const listeners=this.events.get(event)||[];listeners.push(fn);this.events.set(event,listeners);},
      querySelectorAll(){return id==="lesson-form"?[...lessonFields,"lesson-save","clear-lesson","preview-lesson","delete-lesson"].map(node):[];},
      reset(){for(const field of lessonFields)node(field).value=field==="lesson-sort"?"0":"";},
      focus(){},scrollIntoView(){},
    };
  }
  function node(id){
    if(!nodes.has(id)){
      const tagName=id==="course-category"?"SELECT":[...courseFields,...lessonFields].includes(id)?"INPUT":
        buttons.includes(id)||id==="refresh-overview"?"BUTTON":"DIV";
      nodes.set(id,element(tagName,id));
    }
    return nodes.get(id);
  }
  node("course-category").value="metodologia";node("course-sort").value="0";node("lesson-sort").value="0";
  const document={getElementById:node,createElement:tag=>element(tag.toUpperCase()),
    querySelector:selector=>selector.startsWith("meta")?{content:"synthetic-csrf"}:node("layout"),
    querySelectorAll:()=>[...courseFields,...lessonFields,...buttons].map(node)};
  async function fetch(url,options){
    const path=url.replace("/universidade/private/admin","");
    const request={path,...options,body:options.body===undefined?null:JSON.parse(options.body)};requests.push(request);
    if(control.fetchHook){const result=await control.fetchHook(request);if(result!==undefined)return result;}
    if(path==="/overview"){
      const result=typeof control.overview==="function"?await control.overview():control.overview;
      return result.json?result:response(result.status,result.payload);
    }
    if(path==="/courses"&&request.method==="GET")return response(200,{courses:server.courses});
    if(path==="/courses"&&request.method==="POST"){
      const id=server.nextId++;server.courses.push({id,...request.body,is_published:false});return response(201,{id});
    }
    const list=path.match(/^\/courses\/(\d+)\/lessons$/);
    if(list&&request.method==="GET")return response(200,{lessons:Number(list[1])===1?server.lessons:[]});
    if(list&&request.method==="POST"){
      const id=server.nextId++;server.lessons.push({id,...request.body,is_published:false,status:"draft"});return response(201,{id});
    }
    if(path==="/courses/1/publication-check")return response(200,{course_id:1,version:1,lesson_count:server.lessons.length,
      ready:true,issues:[],warnings:[],content_hash:"a".repeat(64),advisory_only:true});
    if(path==="/courses/1/publish"||path==="/courses/1/unpublish"){
      const published=path.endsWith("/publish");server.courses[0].is_published=published;
      for(const lesson of server.lessons){lesson.is_published=published;lesson.status=published?"published":"draft";}
      return response(200,{published});
    }
    if(path==="/courses/1"&&request.method==="PATCH"){
      Object.assign(server.courses[0],request.body);return response(200,{saved:true});
    }
    if(path==="/courses/1"&&request.method==="DELETE"){
      server.courses=[];server.lessons=[];return response(200,{deleted:true});
    }
    if(path==="/lessons/11"&&request.method==="PATCH"){
      Object.assign(server.lessons[0],request.body);return response(200,{saved:true});
    }
    if(path==="/lessons/11"&&request.method==="DELETE"){
      server.lessons=server.lessons.filter(row=>row.id!==11);return response(200,{deleted:true});
    }
    throw new Error("Unexpected synthetic request: "+request.method+" "+path);
  }
  const context=createContext({document,fetch,window:{addEventListener(){}},
    confirm:message=>{dialogs.push(message);return control.accept;}});
  new Script(source,{filename:"actual-admin-editorial-overview"}).runInContext(context);
  const editor=context.editor;
  async function emit(id,event,extra={}){
    for(const handler of node(id).events.get(event)||[])await handler({preventDefault(){},...extra});
  }
  const click=(id,selected=null)=>emit(id,"click",selected===null?{}:{target:{closest:()=>({dataset:
    id==="course-items"?{course:String(selected)}:{lesson:String(selected)}})}});
  editor.renderEditorialOverview();
  if(load){await editor.refreshCourses(1);await click("lesson-items",11);}
  requests.length=0;
  return {editor,node,control,server,requests,dialogs,click,submit:id=>emit(id+"-form","submit"),
    fields:()=>[...courseFields,...lessonFields].map(id=>node(id).value),
    reads:()=>requests.filter(row=>row.path==="/overview"),writes:()=>requests.filter(row=>row.method!=="GET")};
}
const parser=(await harness({load:false})).editor.validatedEditorialOverview;
let scenarios=0;
async function scenario(label,run){try{await run();}catch(error){error.message=label+": "+error.message;throw error;}scenarios++;}

await scenario("strict allowlist retains only documented aggregate data",()=>{
  const input=snapshot();input.subject_key="private-person";input.totals.learners=200;
  input.categories[0].title="<img src=x onerror=evil()>";
  assert.equal(JSON.stringify(parser(input)),JSON.stringify(snapshot()));
});
await scenario("zero collection includes all three zero categories",()=>assert.equal(JSON.stringify(parser(empty())),JSON.stringify(empty())));
for(const input of [null,[],{}, {...snapshot(),schema_version:"1"},{...snapshot(),schema_version:2},
  {...snapshot(),scope:"student_learning"},{...snapshot(),totals:null},{...snapshot(),categories:[]},
  {...snapshot(),categories:snapshot().categories.slice(0,2)},{...snapshot(),categories:snapshot().categories.reverse()}]){
  await scenario("malformed envelope is unavailable instead of empty",()=>assert.equal(parser(input),null));
}
for(const value of [-1,1.5,"1",null,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){
  await scenario("unsafe or untyped counters are rejected throughout the response",()=>{
    for(const key of [...counts,"courses_without_lessons","courses_without_summary"]){
      const input=snapshot();input.totals[key]=value;assert.equal(parser(input),null);
    }
    for(const key of counts){const input=snapshot();input.categories[0][key]=value;assert.equal(parser(input),null);}
  });
}
for(const mutate of [data=>{delete data.totals.courses;},data=>{delete data.categories[0].current_lessons;},
  data=>{data.categories[1].category="metodologia";},data=>{data.categories[1].category="private-category";},
  data=>{data.totals.draft_courses++;},data=>{data.categories[0].draft_courses++;},
  data=>{data.totals.current_lessons++;},data=>{data.totals.courses_without_lessons=7;},
  data=>{data.totals.courses_without_summary=7;},data=>{data.totals.courses_without_lessons=6;},
  data=>{data.totals.current_lessons=1;data.categories[0].current_lessons=1;data.categories[1].current_lessons=0;}]){
  await scenario("incomplete or inconsistent aggregate cannot render partial counts",()=>{
    const input=snapshot();mutate(input);assert.equal(parser(input),null);
  });
}
await scenario("safe large counts are preserved without an artificial catalogue cap",async()=>{
  const input=empty();input.totals.courses=6000;input.totals.draft_courses=6000;
  input.totals.current_lessons=Number.MAX_SAFE_INTEGER;
  Object.assign(input.categories[0],{courses:6000,draft_courses:6000,current_lessons:Number.MAX_SAFE_INTEGER});
  const h=await harness();h.control.overview={status:200,payload:input};await h.click("refresh-overview");
  assert.equal(h.editor.state.overviewSnapshot.totals.current_lessons,Number.MAX_SAFE_INTEGER);
  assert.ok(h.node("overview-cards").textContent.includes(String(Number.MAX_SAFE_INTEGER)));
});
await scenario("valid read updates cards categories and warnings through the registered click handler",async()=>{
  const h=await harness(),before=h.fields();await h.click("refresh-overview");
  assert.equal(h.reads().length,1);assert.equal(h.writes().length,0);
  const request=h.reads()[0];assert.equal(request.method,"GET");assert.equal(request.body,null);
  assert.equal(request.credentials,"same-origin");assert.equal(request.cache,"no-store");
  assert.equal(h.node("overview-content").hidden,false);assert.equal(h.node("overview-cards").children.length,4);
  assert.deepEqual(h.node("overview-categories").children.map(row=>row.dataset.overviewCategory),names);
  assert.ok(h.node("overview-warnings").textContent.includes("2 curso(s) sem aulas"));
  assert.ok(h.node("overview-warnings").textContent.includes("3 curso(s) sem descrição"));
  assert.deepEqual(h.fields(),before);assert.equal(h.dialogs.length,0);
});
await scenario("a real zero is displayed clearly instead of an unavailable state",async()=>{
  const h=await harness();h.control.overview={status:200,payload:empty()};await h.click("refresh-overview");
  assert.equal(h.node("overview-content").hidden,false);
  assert.ok(h.node("overview-status").textContent.includes("totais do acervo estão zerados"));
  assert.ok(h.node("overview-cards").children.every(card=>card.children[0].textContent==="0"));
});
for(const key of ["accessDenied","catalogLoading","writePending","writeOutcomeUnknown","catalogReady"]){
  await scenario("overview respects existing editorial availability: "+key,async()=>{
    const h=await harness();h.editor.state[key]=key!=="catalogReady";h.editor.renderEditorialOverview();
    await h.click("refresh-overview");assert.equal(h.reads().length,0);assert.equal(h.node("refresh-overview").disabled,true);
  });
}
await scenario("initial overview starts only after a fully validated catalogue",async()=>{
  const h=await harness({load:false});let release;
  h.control.fetchHook=request=>request.path==="/courses"?new Promise(resolve=>{release=resolve;}):undefined;
  const initial=h.editor.loadAdminCatalog();await setImmediate();assert.equal(h.reads().length,0);
  release(response(200,{courses:h.server.courses}));await initial;await setImmediate();
  assert.equal(h.reads().length,1);assert.ok(h.editor.state.overviewSnapshot);
  h.control.fetchHook=null;await h.editor.loadAdminCatalog();await setImmediate();
  assert.equal(h.reads().length,1,"catalogue reload must not silently repeat overview GET");
  assert.equal(h.editor.state.overviewSnapshot,null);
});
await scenario("invalid catalogue never triggers overview before deliberate valid recovery",async()=>{
  const h=await harness({load:false});h.control.fetchHook=request=>request.path==="/courses"?response(200,{}):undefined;
  await h.editor.loadAdminCatalog();assert.equal(h.reads().length,0);assert.equal(h.node("refresh-overview").disabled,true);
  h.control.fetchHook=null;await h.editor.loadAdminCatalog();await setImmediate();assert.equal(h.reads().length,1);
});
for(const result of [{status:503,payload:{}},{status:200,payload:{}},{status:200,payload:{...snapshot(),scope:"other"}}]){
  await scenario("failed independent overview clears counts and preserves both dirty drafts",async()=>{
    const h=await harness();await h.click("refresh-overview");
    h.node("course-title").value="Curso ainda não salvo";h.node("course-summary").value="  Resumo local  ";
    h.node("lesson-body").value="Conteúdo ainda não salvo, preservado.";
    const before=h.fields(),selection=h.editor.state.lesson.id,preflight=h.editor.state.preflightRequest;
    h.node("status").textContent="Aviso do editor independente";h.control.overview=result;
    await h.click("refresh-overview");
    assert.equal(h.editor.state.overviewSnapshot,null);assert.equal(h.node("overview-content").hidden,true);
    assert.equal(h.node("overview-cards").children.length,0);assert.equal(h.node("refresh-overview").disabled,false);
    assert.deepEqual(h.fields(),before);assert.equal(h.editor.state.lesson.id,selection);
    assert.equal(h.editor.state.preflightRequest,preflight);assert.equal(h.node("status").textContent,"Aviso do editor independente");
    assert.equal(h.editor.state.catalogReady,true);assert.equal(h.editor.state.writeOutcomeUnknown,false);
    assert.equal(h.reads().length,2);h.control.overview={status:200,payload:snapshot()};await h.click("refresh-overview");
    assert.ok(h.editor.state.overviewSnapshot);assert.equal(h.reads().length,3);assert.deepEqual(h.fields(),before);
  });
}
await scenario("raw transport errors never enter the overview status",async()=>{
  const h=await harness();h.control.overview=()=>{throw new Error("private-database-credential");};
  await h.click("refresh-overview");assert.ok(!h.node("overview-status").textContent.includes("private-"));
  assert.equal(h.node("refresh-overview").disabled,false);assert.equal(h.writes().length,0);
});
await scenario("pending overview is single-flight and does not lock the editor",async()=>{
  const h=await harness();let release;h.control.overview=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.click("refresh-overview");await h.click("refresh-overview");
  assert.equal(h.reads().length,1);assert.equal(h.node("refresh-overview").disabled,true);
  assert.equal(h.node("course-save").disabled,false);assert.equal(h.node("lesson-save").disabled,false);
  release({status:200,payload:snapshot()});await pending;assert.ok(h.editor.state.overviewSnapshot);
});
const mutations=[
  ["course update",false,async h=>{h.node("course-title").value="Título salvo de novo";await h.submit("course");},"PATCH","/courses/1"],
  ["course creation",false,async h=>{await h.click("new-course");h.node("course-title").value="Novo curso fictício";
    h.node("course-slug").value="novo-curso-ficticio";await h.submit("course");},"POST","/courses"],
  ["course deletion",false,h=>h.click("delete-course"),"DELETE","/courses/1"],
  ["lesson update",false,async h=>{h.node("lesson-body").value="Novo conteúdo salvo da aula.";await h.submit("lesson");},"PATCH","/lessons/11"],
  ["lesson creation",false,async h=>{await h.click("clear-lesson");h.node("lesson-title").value="Nova aula fictícia";
    h.node("lesson-slug").value="nova-aula";h.node("lesson-body").value="Conteúdo completo da nova aula.";await h.submit("lesson");},"POST","/courses/1/lessons"],
  ["lesson deletion",false,h=>h.click("delete-lesson"),"DELETE","/lessons/11"],
  ["publication",false,h=>h.click("publish"),"POST","/courses/1/publish"],
  ["withdrawal",true,h=>h.click("unpublish"),"POST","/courses/1/unpublish"],
];
for(const [label,published,write,method,path] of mutations){
  await scenario(label+" invalidates the snapshot and ignores an older pending GET",async()=>{
    const h=await harness({published});await h.click("refresh-overview");let release;
    h.control.overview=()=>new Promise(resolve=>{release=resolve;});const pending=h.click("refresh-overview");
    await write(h);assert.equal(h.writes().length,1);assert.equal(h.writes()[0].method,method);assert.equal(h.writes()[0].path,path);
    assert.equal(h.editor.state.overviewSnapshot,null);assert.equal(h.node("overview-content").hidden,true);
    release({status:200,payload:snapshot()});await pending;
    assert.equal(h.editor.state.overviewSnapshot,null);assert.equal(h.node("overview-categories").children.length,0);
    assert.equal(h.reads().length,2,"writes must not trigger a replacement overview GET");
    assert.equal(h.node("refresh-overview").disabled,false);
    h.control.overview={status:200,payload:empty()};await h.click("refresh-overview");
    assert.equal(h.reads().length,3);assert.equal(h.editor.state.overviewSnapshot.totals.courses,0);
  });
}
await scenario("cancelling a deletion keeps the valid snapshot and sends no mutation",async()=>{
  const h=await harness();await h.click("refresh-overview");h.control.accept=false;
  await h.click("delete-lesson");await h.click("delete-course");
  assert.equal(h.writes().length,0);assert.equal(h.reads().length,1);assert.ok(h.editor.state.overviewSnapshot);
});
await scenario("dirty sibling guard leaves the overview and both forms intact",async()=>{
  const h=await harness();await h.click("refresh-overview");h.node("course-title").value="Curso local";
  h.node("lesson-body").value="Texto local da aula, ainda não salvo.";const before=h.fields();await h.submit("course");
  assert.equal(h.writes().length,0);assert.ok(h.editor.state.overviewSnapshot);assert.deepEqual(h.fields(),before);
});
await scenario("catalogue revalidation invalidates a pending overview even if it succeeds",async()=>{
  const h=await harness();let release;h.control.overview=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.click("refresh-overview");await h.editor.refreshCourses(1);
  release({status:200,payload:snapshot()});await pending;assert.equal(h.editor.state.overviewSnapshot,null);
  assert.equal(h.node("refresh-overview").disabled,false);assert.equal(h.reads().length,1);
});
await scenario("ambiguous write preserves drafts and blocks overview until existing reconciliation",async()=>{
  const h=await harness();await h.click("refresh-overview");h.node("course-title").value="Curso preservado";
  h.node("lesson-body").value="Aula preservada depois de resposta perdida.";const before=h.fields();
  h.control.fetchHook=request=>request.method==="PATCH"?response(503,{}):undefined;
  await h.submit("lesson");await h.click("refresh-overview");
  assert.equal(h.editor.state.writeOutcomeUnknown,true);assert.deepEqual(h.fields(),before);
  assert.equal(h.node("refresh-overview").disabled,true);assert.equal(h.editor.state.overviewSnapshot,null);assert.equal(h.reads().length,1);
  h.control.fetchHook=null;await h.editor.loadAdminCatalog();await setImmediate();
  assert.equal(h.editor.state.writeOutcomeUnknown,false);assert.equal(h.reads().length,1);
  assert.equal(h.node("refresh-overview").disabled,false);assert.equal(h.writes().length,1);
});
for(const status of [403,419]){
  await scenario(status+" overview purges editorial fields and prevents another GET",async()=>{
    const h=await harness();await h.click("refresh-overview");h.control.overview={status,payload:snapshot()};
    await h.click("refresh-overview");assert.equal(h.editor.state.accessDenied,true);
    assert.equal(h.editor.state.overviewSnapshot,null);assert.equal(h.node("overview-content").hidden,true);
    assert.equal(h.node("overview-status").textContent,"");assert.equal(h.node("refresh-overview").disabled,true);
    for(const id of [...courseFields,...lessonFields])if(id!=="course-category")assert.equal(h.node(id).value,"");
    await h.click("refresh-overview");assert.equal(h.reads().length,2);assert.equal(h.editor.beginWrite(),false);
  });
}
await scenario("a successful old overview cannot restore data after revocation elsewhere",async()=>{
  const h=await harness();let release;h.control.overview=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.click("refresh-overview");h.editor.lockAccess("Revoked");release({status:200,payload:snapshot()});await pending;
  assert.equal(h.editor.state.overviewSnapshot,null);assert.equal(h.node("overview-cards").children.length,0);
  assert.equal(h.node("overview-status").textContent,"");assert.equal(h.node("refresh-overview").disabled,true);
});
await scenario("JSON parsing that completes after mutation cannot render stale counts",async()=>{
  const h=await harness();let release,received;const seen=new Promise(resolve=>{received=resolve;});
  h.control.overview={status:200,ok:true,json:()=>{received();return new Promise(resolve=>{release=resolve;});}};
  const pending=h.click("refresh-overview");await seen;h.node("lesson-body").value="Novo conteúdo já salvo.";
  await h.submit("lesson");release(snapshot());await pending;
  assert.equal(h.editor.state.overviewSnapshot,null);assert.equal(h.writes().length,1);assert.equal(h.reads().length,1);
});

console.log("PASS editorial overview: "+scenarios+" actual-function scenarios; strict aggregates, independent reads, all editorial mutations, preserved drafts and revoked/stale snapshots");
