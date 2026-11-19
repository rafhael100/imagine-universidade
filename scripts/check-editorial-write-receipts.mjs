#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Execute the complete editor and its real submit/click/recovery handlers.
// Only DOM, dialogs and HTTP fixtures are supplied here. No receipt validator
// or write/recovery decision is reimplemented in this test.
const view=readFileSync(new URL("../resources/views/university/admin.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
const boot='loadAdminCatalog();\n(async()=>{try{await refreshAudit();}catch(error){say(error.message);}})();';
assert.ok(start>=0&&end>start&&view.slice(start,end).includes(boot));
const source=view.slice(start,end).replace(boot,"")+"\nglobalThis.editor={state,refreshCourses,refreshLessons,loadAdminCatalog,refreshAudit,lockAccess};";
const clone=value=>JSON.parse(JSON.stringify(value));
const courseFields=["course-title","course-slug","course-category","course-summary","course-sort",
  "course-audience","course-suggested-knowledge"];
const lessonFields=["lesson-title","lesson-slug","lesson-body","lesson-sort"];
const fields=[...courseFields,...lessonFields];
const courseButtons=["course-save","check-publication","publish","unpublish","delete-course"];
const lessonButtons=["lesson-save","clear-lesson","preview-lesson","delete-lesson"];
const ok=payload=>({status:200,payload});
const hash="a".repeat(64);
function deferred(){let release;const promise=new Promise(resolve=>{release=resolve;});return {promise,release};}
async function bounded(promise){let timer;try{
  return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("Receipt test did not reach its HTTP boundary")),1000);})]);
}finally{clearTimeout(timer);}}
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
  focus(){}
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
async function harness({published=false,nextCourseId=3,nextLessonId=30}={}){
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
  const server={courses:[1,2].map(id=>({id,slug:"curso-"+id,title:"Curso salvo "+id,category:"metodologia",
    summary:"Resumo salvo "+id,sort_order:0,is_published:published})),
    lessons:new Map([[1,[11,12].map((id,index)=>({id,slug:"aula-"+id,title:"Aula salva "+id,
      body:"Conteúdo original e literal da aula "+id+".\n\nSegundo parágrafo.",sort_order:index,
      status:published?"published":"draft",is_published:published}))],[2,[]]])};
  const control={hook:null,accept:true};
  function commit(entry){
    if(entry.path==="/courses"&&entry.method==="POST"){
      server.courses.push({id:nextCourseId,...entry.body,is_published:false});server.lessons.set(nextCourseId,[]);
      return {status:201,payload:{id:nextCourseId,status:"draft"}};
    }
    const course=entry.path.match(/^\/courses\/(\d+)$/),lesson=entry.path.match(/^\/lessons\/(\d+)$/);
    if(course&&entry.method==="PATCH"){
      Object.assign(server.courses.find(row=>row.id===Number(course[1])),entry.body);return ok({saved:true});
    }
    if(course&&entry.method==="DELETE"){
      server.courses=server.courses.filter(row=>row.id!==Number(course[1]));server.lessons.delete(Number(course[1]));return ok({deleted:true});
    }
    if(lesson&&entry.method==="DELETE"){
      server.lessons.set(1,server.lessons.get(1).filter(row=>row.id!==Number(lesson[1])));return ok({deleted:true});
    }
    if(lesson&&entry.method==="PATCH"){
      const row=[...server.lessons.values()].flat().find(item=>item.id===Number(lesson[1]));
      assert.ok(row,"The confirmed lesson PATCH has a persisted target");
      Object.assign(row,entry.body);return ok({saved:true});
    }
    const create=entry.path.match(/^\/courses\/(\d+)\/lessons$/);
    if(create&&entry.method==="POST"){
      server.lessons.get(Number(create[1])).push({id:nextLessonId,...entry.body,status:"draft",is_published:false});
      return {status:201,payload:{id:nextLessonId,status:"draft"}};
    }
    const publication=entry.path.match(/^\/courses\/(\d+)\/(publish|unpublish)$/);
    if(publication&&entry.method==="POST"){
      const value=publication[2]==="publish",id=Number(publication[1]);
      server.courses.find(row=>row.id===id).is_published=value;
      for(const row of server.lessons.get(id)){row.is_published=value;row.status=value?"published":"draft";}
      return ok({published:value});
    }
    throw new Error("Unexpected fixture write: "+entry.method+" "+entry.path);
  }
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
        if(entry.method!=="GET")result=commit(entry);
        else if(path==="/courses")result=ok({courses:server.courses});
        else if(/^\/courses\/\d+\/lessons$/.test(path))result=ok({lessons:server.lessons.get(Number(path.split("/")[2]))||[]});
        else if(path==="/courses/1/publication-check")result=ok({course_id:1,version:1,lesson_count:2,
          ready:true,issues:[],warnings:[],content_hash:hash,advisory_only:true});
        else if(path==="/audit")result=ok({events:[],next_before_id:null});
        else throw new Error("Unexpected fixture read: "+path);
      }
      return {status:result.status,ok:result.status>=200&&result.status<300,
        json:async()=>result.json?await result.json():clone(result.payload)};
    }});
  new Script(source,{filename:"actual-admin-write-receipts"}).runInContext(context);
  const editor=context.editor;
  async function emit(node,type){
    assert.ok(node,"Actual control exists");const path=[];
    for(let current=node;current;current=current.parent)path.push(current);
    for(const current of path)for(const handler of current.events.get(type)||[])
      await handler({target:node,preventDefault(){}});
    await setImmediate();
  }
  await editor.refreshCourses(1);editor.state.overviewAttempted=true;
  await emit(get("lesson-items").querySelectorAll("[data-lesson]").find(node=>node.dataset.lesson==="11"),"click");
  requests.length=0;
  return {editor,state:editor.state,get,server,control,requests,dialogs,commit,
    invoke:id=>emit(get(id),id.endsWith("-form")?"submit":"click"),
    search:async query=>{get("editorial-lesson-search").value=query;await emit(get("editorial-lesson-search"),"input");},
    fields:()=>fields.map(id=>get(id).value),writes:()=>requests.filter(entry=>entry.method!=="GET")};
}
const cases=[
  {kind:"course-create",control:"course-form",method:"POST",path:"/courses",invalid:{},success:"Rascunho salvo."},
  {kind:"course-update",control:"course-form",method:"PATCH",path:"/courses/1",invalid:{saved:false},success:"Rascunho salvo."},
  {kind:"lesson-create",control:"lesson-form",method:"POST",path:"/courses/1/lessons",invalid:{id:30,status:"published"},success:"Aula salva em rascunho."},
  {kind:"lesson-delete",control:"delete-lesson",method:"DELETE",path:"/lessons/11",invalid:{deleted:false},success:"Aula em rascunho excluída."},
  {kind:"course-delete",control:"delete-course",method:"DELETE",path:"/courses/1",invalid:{deleted:false},success:"Rascunho nunca publicado excluído"},
  {kind:"publish",control:"publish",method:"POST",path:"/courses/1/publish",invalid:{published:false},success:"Versão do curso publicada"},
  {kind:"unpublish",control:"unpublish",method:"POST",path:"/courses/1/unpublish",invalid:{published:true},success:"Versão anterior arquivada"},
];
async function prepared(test,options={}){
  const h=await harness({published:test.kind==="unpublish",...options});
  if(test.kind==="course-create")await h.invoke("new-course");
  if(test.kind==="lesson-create")await h.invoke("clear-lesson");
  if(test.kind.startsWith("course-")&&!test.kind.endsWith("delete")){
    h.get("course-title").value="  Curso revisado 😀  ";h.get("course-summary").value="  Resumo literal ainda em edição.  ";
    if(test.kind==="course-create")h.get("course-slug").value="curso-novo";
  }
  if(test.kind==="lesson-create"){
    h.get("lesson-title").value="  Aula nova 😀  ";h.get("lesson-slug").value="aula-nova";
    h.get("lesson-body").value="  Texto literal da nova aula, com espaços.  ";
    h.get("course-summary").value="  Rascunho irmão preservado.  ";
  }
  if(test.kind==="lesson-update"){
    h.get("lesson-title").value="  Aula revisada 😀  ";
    h.get("lesson-body").value="  Texto revisado da aula selecionada, ainda visível.  ";
    h.get("course-summary").value="  Rascunho independente do curso.  ";
  }
  if(test.kind.endsWith("delete")){
    h.get("course-summary").value="  Rascunho de curso antes da exclusão.  ";
    h.get("lesson-body").value="  Rascunho de aula antes da exclusão.  ";
  }
  if(test.kind!=="course-create")await h.search("salva");
  h.requests.length=0;return h;
}

const paths=h=>h.requests.map(entry=>entry.method+" "+entry.path);
function assertOneWrite(h,test){
  assert.equal(h.writes().length,1);
  assert.equal(h.writes()[0].method,test.method);assert.equal(h.writes()[0].path,test.path);
}
function assertUncertain(h,test,buffers,query,selected){
  assert.equal(h.state.writeOutcomeUnknown,true);assert.equal(h.state.writePending,false);
  assert.equal(h.state.confirmedSaveNeedsRead,false);assert.equal(h.state.confirmedSaveReadTarget,null);
  assert.equal(h.state.catalogReady,false);assert.equal(h.state.lessonsReady,false);
  assert.deepEqual(h.fields(),buffers);assert.equal(h.state.lessonQuery,query);
  assert.deepEqual([h.state.course?.id??null,h.state.lesson?.id??null],selected);
  assert.equal(h.get("course-save").disabled,true);assert.equal(h.get("lesson-save").disabled,true);
  assert.equal(h.get("catalog-recovery").hidden,false);assert.equal(h.get("retry-catalog").disabled,false);
  assert.match(h.get("status").textContent,/Não repita a operação/);
  assert.equal(h.get("status").textContent.includes(test.success),false);
  assertOneWrite(h,test);
  const firstWrite=h.requests.findIndex(entry=>entry.method!=="GET");
  assert.deepEqual(h.requests.slice(firstWrite+1),[],"An unconfirmed receipt must not start a refresh");
}
function snapshot(h){return {buffers:h.fields(),query:h.state.lessonQuery,selected:[h.state.course?.id??null,h.state.lesson?.id??null]};}
function invalidReceipts(test){
  const common=[null,false,true,0,1,"ok",[],{},test.invalid];
  if(test.kind.endsWith("create"))return [...common,{id:3},
    ...[0,-1,1.5,"3",true,null,Number.MAX_SAFE_INTEGER+1].map(id=>({id,status:"draft"})),
    ...[null,false,1,"published","archived","DRAFT","draft ",{}].map(status=>({id:3,status}))];
  const key=test.kind.endsWith("delete")?"deleted":test.kind==="course-update"?"saved":"published";
  const expected=test.kind!=="unpublish";
  return [...common,...[!expected,null,1,0,String(expected),[],{}].map(value=>({[key]:value})),{removed:true}];
}
let scenarios=0;
async function scenario(label,run){try{await run();}catch(error){throw new Error(label,{cause:error});}scenarios++;}

for(const test of cases){
  await scenario(test.kind+" rejects incomplete, mistyped or contradictory receipts without replacing drafts",async()=>{
    for(const payload of invalidReceipts(test)){
      const h=await prepared(test),before=snapshot(h);
      h.control.hook=entry=>entry.method!=="GET"?ok(payload):undefined;
      await h.invoke(test.control);
      assertUncertain(h,test,before.buffers,before.query,before.selected);
      const button=test.control==="course-form"?"course-save":test.control==="lesson-form"?"lesson-save":test.control;
      assert.equal(h.get(button).disabled,true,"The native action stays disabled until manual recovery");
    }
  });
}
for(const test of cases){
  await scenario(test.kind+" accepts only its actual receipt and retains the existing refresh sequence",async()=>{
    const h=await prepared(test);
    h.control.hook=entry=>{
      if(entry.method==="GET")return undefined;
      const result=h.commit(entry);
      return {...result,payload:{...result.payload,title:"Untrusted receipt title",body:"Untrusted receipt body",sort_order:9999}};
    };
    await h.invoke(test.control);assertOneWrite(h,test);
    assert.equal(h.state.writeOutcomeUnknown,false);assert.equal(h.state.writePending,false);
    assert.ok(h.get("status").textContent.includes(test.success));
    assert.equal(h.fields().some(value=>String(value).includes("Untrusted receipt")),false);
    const expected={
      "course-create":["POST /courses","GET /courses","GET /courses/3/lessons"],
      "course-update":["PATCH /courses/1","GET /courses","GET /courses/1/lessons"],
      "lesson-create":["POST /courses/1/lessons","GET /courses/1/lessons"],
      "lesson-delete":["DELETE /lessons/11","GET /courses/1/lessons"],
      "course-delete":["DELETE /courses/1","GET /courses"],
      "publish":["GET /courses/1/publication-check","POST /courses/1/publish","GET /courses","GET /courses/1/lessons"],
      "unpublish":["POST /courses/1/unpublish","GET /courses","GET /courses/1/lessons"],
    }[test.kind];
    assert.deepEqual(paths(h),expected);
    if(test.kind==="course-create")assert.equal(h.state.course.id,3);
    if(test.kind==="lesson-create"){
      assert.equal(h.state.lesson.id,30);assert.equal(h.get("course-summary").value,"  Rascunho irmão preservado.  ");
    }
    if(test.kind==="lesson-delete")assert.equal(h.state.lesson,null);
    if(test.kind==="course-delete")assert.equal(h.state.course,null);
    if(test.kind==="publish"){
      assert.deepEqual(h.writes()[0].body,{expected_content_hash:hash});assert.equal(h.state.course.is_published,true);
    }
    if(test.kind==="unpublish"){
      assert.equal(h.writes()[0].body,null);assert.equal(h.state.course.is_published,false);
    }
  });
}
for(const test of cases.filter(test=>test.kind.endsWith("create"))){
  await scenario(test.kind+" accepts the highest positive safe ID and selects only its authorized returned row",async()=>{
    const h=await prepared(test,{nextCourseId:Number.MAX_SAFE_INTEGER,nextLessonId:Number.MAX_SAFE_INTEGER});
    await h.invoke(test.control);assertOneWrite(h,test);assert.equal(h.state.writeOutcomeUnknown,false);
    assert.equal(test.kind==="course-create"?h.state.course.id:h.state.lesson.id,Number.MAX_SAFE_INTEGER);
  });
}
for(const test of cases){
  await scenario(test.kind+" preserves buffers after a committed write loses its response and recovers only manually",async()=>{
    const h=await prepared(test),before=snapshot(h);
    h.control.hook=entry=>{if(entry.method==="GET")return undefined;h.commit(entry);throw new Error("Synthetic lost receipt");};
    await h.invoke(test.control);assertUncertain(h,test,before.buffers,before.query,before.selected);
    const requests=h.requests.length;h.control.accept=false;await h.invoke("retry-catalog");
    assert.equal(h.requests.length,requests);assert.deepEqual(h.fields(),before.buffers);
    h.control.accept=true;h.control.hook=null;await h.invoke("retry-catalog");
    assert.equal(h.state.writeOutcomeUnknown,false);assert.equal(h.state.catalogReady,true);assertOneWrite(h,test);
    assert.equal(h.requests.slice(requests).every(entry=>entry.method==="GET"),true);
    assert.equal(h.get("status").textContent,"");
  });
}
await scenario("a malformed JSON body follows the same fence instead of confirming or refreshing",async()=>{
  const test=cases[1],h=await prepared(test),before=snapshot(h);
  h.control.hook=entry=>entry.method!=="GET"?{status:200,json:async()=>{throw new SyntaxError("Synthetic invalid JSON");}}:undefined;
  await h.invoke(test.control);assertUncertain(h,test,before.buffers,before.query,before.selected);
});
for(const status of [403,419]){
  await scenario("HTTP "+status+" purges every affected write instead of preserving private drafts for recovery",async()=>{
    for(const test of cases){
      const h=await prepared(test);
      h.control.hook=entry=>entry.method!=="GET"?{status,payload:{error:"access_denied"}}:undefined;
      await h.invoke(test.control);assertOneWrite(h,test);assert.equal(h.state.accessDenied,true);
      assert.equal(h.state.course,null);assert.equal(h.state.lesson,null);assert.equal(h.state.lessonQuery,"");
      for(const id of fields.filter(id=>id!=="course-category"))assert.equal(h.get(id).value,"");
      assert.equal(h.get("catalog-recovery").hidden,true);assert.equal(h.get("lesson-save").disabled,true);
      const requests=h.requests.length;await h.invoke(test.control);assert.equal(h.requests.length,requests);
    }
  });
}
await scenario("all affected handlers remain single-flight while their receipt is pending",async()=>{
  for(const test of cases){
    const h=await prepared(test),seen=deferred(),gate=deferred();
    h.control.hook=async entry=>{if(entry.method==="GET")return undefined;seen.release();await gate.promise;return h.commit(entry);};
    const pending=h.invoke(test.control);
    try{
      await bounded(seen.promise);assert.equal(h.state.writePending,true);
      await h.invoke(test.control);assertOneWrite(h,test);
    }finally{gate.release();}
    await bounded(pending);assert.equal(h.state.writePending,false);assert.equal(h.state.writeOutcomeUnknown,false);
    assertOneWrite(h,test);
  }
});
await scenario("late valid JSON after another real API response revoked access cannot refresh or restore drafts",async()=>{
  for(const test of cases){
    const h=await prepared(test),seen=deferred(),gate=deferred();
    h.control.hook=entry=>{
      if(entry.path==="/audit")return {status:403,payload:{error:"access_denied"}};
      if(entry.method==="GET")return undefined;
      const result=h.commit(entry);return {...result,json:async()=>{seen.release();await gate.promise;return clone(result.payload);}};
    };
    const pending=h.invoke(test.control);let requests;
    try{
      await bounded(seen.promise);await assert.doesNotReject(h.editor.refreshAudit());assert.equal(h.state.accessDenied,true);
      requests=h.requests.length;
    }finally{gate.release();}
    await bounded(pending);assert.equal(h.requests.length,requests);assertOneWrite(h,test);
    assert.equal(h.state.course,null);assert.equal(h.state.lesson,null);assert.equal(h.get("lesson-body").value,"");
    assert.equal(h.get("course-summary").value,"");assert.equal(h.get("catalog-recovery").hidden,true);
  }
});
await scenario("destructive and publication confirmation dialogs still cancel before their write",async()=>{
  for(const test of cases.filter(test=>test.kind.endsWith("delete")||["publish","unpublish"].includes(test.kind))){
    const h=await prepared(test),before=snapshot(h);h.control.accept=false;
    await h.invoke(test.control);assert.equal(h.writes().length,0);assert.deepEqual(h.fields(),before.buffers);
    assert.equal(h.state.writeOutcomeUnknown,false);assert.equal(h.state.writePending,false);
  }
});
for(const path of ["/courses","/courses/1/lessons"]){
  for(const [label,response] of [
    ["503",()=>({status:503,payload:{error:"temporarily_unavailable"}})],
    ["invalid 200",()=>ok({untrusted:"incomplete_catalog"})],
    ["invalid JSON",()=>({status:200,json:async()=>{throw new SyntaxError("Synthetic invalid JSON");}})],
    ["network failure",()=>{throw new Error("Synthetic interrupted recovery");}],
  ]){
    await scenario("C149 "+path+" "+label+" preserves all eleven drafts through repeated failed recovery",async()=>{
      const test=cases[2],h=await prepared(test);
      h.get("course-audience").value="  Público ainda não salvo 😀\nSegunda linha.  ";
      h.get("course-suggested-knowledge").value="  Conhecimentos úteis em edição.  ";
      h.get("course-sort").value="29";h.get("lesson-sort").value="17";
      const before=snapshot(h);
      h.control.hook=entry=>entry.method!=="GET"?ok({}):undefined;
      await h.invoke(test.control);assertUncertain(h,test,before.buffers,before.query,before.selected);
      h.server.courses[0].title="Novo título salvo por outra pessoa";
      h.control.hook=entry=>entry.path===path?response():undefined;
      for(let attempt=0;attempt<2;attempt++){
        const count=h.requests.length;await h.invoke("retry-catalog");
        assert.deepEqual(h.fields(),before.buffers);
        assert.deepEqual([h.state.course?.id??null,h.state.lesson?.id??null],before.selected);
        assert.equal(h.state.lessonQuery,before.query);assertOneWrite(h,test);
        assert.equal(h.state.writeOutcomeUnknown,true);
        assert.equal(h.state.catalogReady,false);assert.equal(h.state.lessonsReady,false);
        assert.equal(h.state.catalogLoading,false);assert.equal(h.state.courses.length,0);assert.equal(h.state.lessons.length,0);
        for(const id of [...fields,...courseButtons,...lessonButtons])assert.equal(h.get(id).disabled,true,id+" stays disabled");
        assert.equal(h.get("catalog-recovery").hidden,false);assert.equal(h.get("retry-catalog").disabled,false);
        assert.match(h.get("status").textContent,/campos não salvos foram mantidos/);
        assert.deepEqual(paths(h).slice(count),path==="/courses"?["GET /courses"]:["GET /courses","GET /courses/1/lessons"]);
      }
      h.control.accept=false;const count=h.requests.length;await h.invoke("retry-catalog");
      assert.equal(h.requests.length,count);assert.deepEqual(h.fields(),before.buffers);
      h.control.accept=true;h.control.hook=null;await h.invoke("retry-catalog");
      assert.equal(h.state.writeOutcomeUnknown,false);assert.equal(h.state.catalogReady,true);assert.equal(h.state.lessonsReady,true);
      assert.equal(h.get("course-title").value,"Novo título salvo por outra pessoa");
      assert.equal(h.get("lesson-body").value,"");assertOneWrite(h,test);
    });
  }
}
await scenario("C149 retains a new-course draft after a failed recovery and honors a valid empty catalog",async()=>{
  const test=cases[0],h=await prepared(test);
  h.get("course-audience").value="  Novo público literal 😀  ";
  h.get("course-suggested-knowledge").value="  Sem conhecimento prévio obrigatório.  ";
  const before=snapshot(h);
  h.control.hook=entry=>entry.method!=="GET"?ok({}):undefined;
  await h.invoke(test.control);
  h.control.hook=entry=>entry.path==="/courses"?{status:503,payload:{}}:undefined;
  await h.invoke("retry-catalog");assert.deepEqual(h.fields(),before.buffers);
  assert.equal(h.state.course,null);assert.equal(h.get("course-slug").disabled,true);assertOneWrite(h,test);
  h.server.courses=[];h.control.hook=null;await h.invoke("retry-catalog");
  assert.equal(h.state.writeOutcomeUnknown,false);assert.equal(h.state.catalogReady,true);assert.equal(h.state.course,null);
  assert.equal(h.get("course-title").value,"");assert.equal(h.get("new-course").disabled,false);assertOneWrite(h,test);
});
await scenario("C149 preserves an existing selected lesson and its independent course draft across either failed recovery read",async()=>{
  for(const path of ["/courses","/courses/1/lessons"]){
    const h=await harness(),test={method:"PATCH",path:"/lessons/11"};
    h.get("course-title").value="  Curso independente em edição 😀  ";
    h.get("course-audience").value="  Público independente em edição.  ";
    h.get("course-suggested-knowledge").value="  Orientação independente.  ";
    h.get("lesson-body").value="  Corpo literal da aula existente ainda não confirmado.  ";
    const before=snapshot(h);
    h.control.hook=entry=>entry.method==="PATCH"?{status:503,payload:{}}:undefined;
    await h.invoke("lesson-form");
    h.server.courses[0].is_published=true;h.server.courses[0].title="Versão concorrente publicada";
    h.control.hook=entry=>entry.path===path?{status:503,payload:{}}:undefined;
    await h.invoke("retry-catalog");
    assert.deepEqual(h.fields(),before.buffers);assert.deepEqual([h.state.course?.id,h.state.lesson?.id],[1,11]);
    assert.equal(h.get("lesson-title-heading").textContent,"Editar aula");
    assert.equal(h.state.catalogReady,false);assert.equal(h.state.lessonsReady,false);assert.equal(h.state.writeOutcomeUnknown,true);
    for(const id of [...fields,...courseButtons,...lessonButtons])assert.equal(h.get(id).disabled,true);
    assertOneWrite(h,test);
  }
});
for(const status of [403,419]){
  await scenario("C149 "+status+" during either recovery read purges every private draft instead of restoring it",async()=>{
    for(const path of ["/courses","/courses/1/lessons"]){
      const test=cases[2],h=await prepared(test);
      h.get("course-audience").value="PRIVADO-AUDIENCE";h.get("course-suggested-knowledge").value="PRIVADO-KNOWLEDGE";
      h.control.hook=entry=>entry.method!=="GET"?ok({}):undefined;await h.invoke(test.control);
      h.control.hook=entry=>entry.path===path?{status,payload:{error:"access_denied"}}:undefined;
      await h.invoke("retry-catalog");assert.equal(h.state.accessDenied,true);
      for(const id of fields.filter(id=>id!=="course-category"))assert.equal(h.get(id).value,"");
      assert.equal(h.state.course,null);assert.equal(h.state.lesson,null);assert.equal(h.state.lessonQuery,"");
      assert.equal(h.get("catalog-recovery").hidden,true);assert.equal(h.get("retry-catalog").disabled,true);
      assertOneWrite(h,test);
    }
  });
}
await scenario("C149 a recovery JSON arriving after revocation cannot restore captured drafts",async()=>{
  const test=cases[2],h=await prepared(test),seen=deferred(),gate=deferred();
  h.get("course-audience").value="PRIVATE-LATE-DRAFT";
  h.control.hook=entry=>entry.method!=="GET"?ok({}):undefined;await h.invoke(test.control);
  h.control.hook=entry=>{
    if(entry.path==="/audit")return {status:419,payload:{}};
    if(entry.path==="/courses")return {status:200,json:async()=>{seen.release();await gate.promise;return clone({courses:h.server.courses});}};
  };
  const pending=h.invoke("retry-catalog");
  try{await bounded(seen.promise);await h.editor.refreshAudit();assert.equal(h.state.accessDenied,true);}
  finally{gate.release();}
  await bounded(pending);
  for(const id of fields.filter(id=>id!=="course-category"))assert.equal(h.get(id).value,"");
  assert.equal(h.state.course,null);assert.equal(h.state.lesson,null);assertOneWrite(h,test);
  assert.equal(h.get("catalog-recovery").hidden,true);
});

const confirmedSaveCases=[
  {...cases[0],readPaths:["/courses","/courses/3/lessons"]},
  {...cases[1],readPaths:["/courses","/courses/1/lessons"]},
  {...cases[2],readPaths:["/courses/1/lessons"]},
  {kind:"lesson-update",control:"lesson-form",method:"PATCH",path:"/lessons/11",
    readPaths:["/courses/1/lessons"]},
];
function assertConfirmedStored(h,test){
  const write=h.writes()[0];assert.ok(write);
  const course=test.kind.startsWith("course-");
  const row=course?h.server.courses.find(item=>item.id===(test.kind==="course-create"?3:1)):
    h.server.lessons.get(1).find(item=>item.id===(test.kind==="lesson-create"?30:11));
  assert.ok(row,"The genuine successful receipt corresponds to a stored fixture row");
  assert.equal(row.title,write.body.title);assert.equal(row[course?"summary":"body"],write.body[course?"summary":"body"]);
}
for(const test of confirmedSaveCases){
  for(const path of test.readPaths){
    for(const [label,failure] of [
      ["503",()=>({status:503,payload:{error:"temporarily_unavailable"}})],
      ["invalid 200",()=>ok({untrusted:"incomplete"})],
      ["invalid JSON",()=>({status:200,json:async()=>{throw new SyntaxError("Synthetic invalid refresh JSON");}})],
      ["network failure",()=>{throw new Error("Synthetic failed post-save read");}],
    ]){
      await scenario("C150 "+test.kind+" "+path+" "+label+" keeps saved visible buffers without replay or authority",async()=>{
        const h=await prepared(test);
        h.get("course-audience").value="  Público literal 😀\nSegunda linha.  ";
        h.get("course-suggested-knowledge").value="  Orientação ainda no formulário.  ";
        const before=snapshot(h);
        h.control.hook=entry=>entry.method==="GET"&&entry.path===path?failure():undefined;
        await h.invoke(test.control);
        assertConfirmedStored(h,test);assertOneWrite(h,test);
        assert.deepEqual(h.fields(),before.buffers);assert.equal(h.state.lessonQuery,before.query);
        assert.deepEqual([h.state.course?.id??null,h.state.lesson?.id??null],before.selected);
        assert.equal(h.state.confirmedSaveNeedsRead,true);assert.equal(h.state.writeOutcomeUnknown,true);
        assert.equal(h.state.catalogReady,false);assert.equal(h.state.lessonsReady,false);assert.equal(h.state.writePending,false);
        assert.equal(h.state.courses.length,0);assert.equal(h.state.lessons.length,0);
        for(const id of [...fields,...courseButtons,...lessonButtons])assert.equal(h.get(id).disabled,true,id);
        assert.match(h.get("status").textContent,/salvamento foi confirmado/);
        assert.match(h.get("status").textContent,/Não repita a operação/);
        const writes=h.writes().length,requests=h.requests.length;
        await h.invoke("course-form");await h.invoke("lesson-form");
        assert.equal(h.writes().length,writes);assert.equal(h.requests.length,requests);
        h.control.accept=false;await h.invoke("retry-catalog");
        assert.equal(h.requests.length,requests);assert.deepEqual(h.fields(),before.buffers);
        assert.match(h.dialogs.at(-1),/salvamento foi confirmado/);
        h.control.accept=true;
        await h.invoke("retry-catalog");assert.deepEqual(h.fields(),before.buffers);
        assert.equal(h.state.confirmedSaveNeedsRead,true);assertOneWrite(h,test);
        assert.match(h.get("status").textContent,/salvamento foi confirmado/);
        h.control.hook=null;await h.invoke("retry-catalog");
        assert.equal(h.state.writeOutcomeUnknown,false);assert.equal(h.state.confirmedSaveNeedsRead,false);
        assert.equal(h.state.confirmedSaveReadTarget,null);
        assert.equal(h.state.catalogReady,true);assertOneWrite(h,test);assertConfirmedStored(h,test);
        assert.equal(h.state.lessonsReady,true);
        if(test.kind==="lesson-update")assert.equal(h.state.lesson.id,11);
        if(test.kind==="course-create")assert.equal(h.state.course.id,3);
        if(test.kind==="lesson-create")assert.equal(h.state.lesson.id,30);
      });
    }
  }
}
for(const status of [403,419]){
  await scenario("C150 "+status+" after a confirmed save purges buffers in either read stage",async()=>{
    for(const test of confirmedSaveCases){
      for(const path of test.readPaths){
        const h=await prepared(test);
        h.control.hook=entry=>entry.method==="GET"&&entry.path===path?{status,payload:{}}:undefined;
        await h.invoke(test.control);assertConfirmedStored(h,test);assertOneWrite(h,test);
        assert.equal(h.state.accessDenied,true);assert.equal(h.state.confirmedSaveNeedsRead,false);
        assert.equal(h.state.confirmedSaveReadTarget,null);
        assert.equal(h.state.course,null);assert.equal(h.state.lesson,null);
        for(const id of fields.filter(id=>id!=="course-category"))assert.equal(h.get(id).value,"");
        assert.equal(h.get("catalog-recovery").hidden,true);
      }
    }
  });
}
for(const path of ["/courses","/courses/1/lessons"]){
  await scenario("C150 late post-save JSON cannot restore captured drafts after revocation: "+path,async()=>{
    const test=confirmedSaveCases[1],h=await prepared(test),seen=deferred(),gate=deferred();
    h.control.hook=entry=>{
      if(entry.path==="/audit")return {status:419,payload:{}};
      if(entry.method==="GET"&&entry.path===path)return {status:200,json:async()=>{
        seen.release();await gate.promise;
        return path==="/courses"?{courses:h.server.courses}:{lessons:h.server.lessons.get(1)};
      }};
    };
    const pending=h.invoke(test.control);
    try{await bounded(seen.promise);await h.editor.refreshAudit();}finally{gate.release();}
    await bounded(pending);assertConfirmedStored(h,test);assertOneWrite(h,test);
    assert.equal(h.state.accessDenied,true);assert.equal(h.state.confirmedSaveNeedsRead,false);
    assert.equal(h.state.confirmedSaveReadTarget,null);
    assert.equal(h.state.course,null);assert.equal(h.state.lesson,null);
    for(const id of fields.filter(id=>id!=="course-category"))assert.equal(h.get(id).value,"");
  });
}
await scenario("C150 a valid catalogue omission or removed lesson never restores the former selection",async()=>{
  for(const removed of ["course","lesson"]){
    const test=confirmedSaveCases[removed==="course"?1:3],h=await prepared(test);
    h.control.hook=entry=>{
      if(entry.method==="GET"&&entry.path===(removed==="course"?"/courses":"/courses/1/lessons")){
        if(removed==="course")h.server.courses=h.server.courses.filter(row=>row.id!==1);
        else h.server.lessons.set(1,h.server.lessons.get(1).filter(row=>row.id!==11));
      }
    };
    await h.invoke(test.control);assertOneWrite(h,test);
    assert.equal(h.state.writeOutcomeUnknown,false);assert.equal(h.state.confirmedSaveNeedsRead,false);
    assert.equal(h.state.lesson,null);assert.equal(h.get("lesson-body").value,"");
    if(removed==="course"){assert.equal(h.state.course,null);assert.equal(h.get("course-title").value,"");}
  }
});
await scenario("C150 a course removed before manual recovery cannot revive its retained lesson",async()=>{
  const test=confirmedSaveCases[3],h=await prepared(test);
  h.control.hook=entry=>entry.method==="GET"?{status:503,payload:{}}:undefined;
  await h.invoke(test.control);assertConfirmedStored(h,test);
  assert.equal(h.state.lesson.id,11);assert.equal(h.state.confirmedSaveNeedsRead,true);
  h.server.courses=h.server.courses.filter(row=>row.id!==1);h.control.hook=null;
  await h.invoke("retry-catalog");assertOneWrite(h,test);
  assert.equal(h.state.course,null);assert.equal(h.state.lesson,null);
  assert.equal(h.get("course-title").value,"");assert.equal(h.get("lesson-body").value,"");
  assert.equal(h.state.writeOutcomeUnknown,false);assert.equal(h.state.confirmedSaveNeedsRead,false);
});
await scenario("C150 confirmed creation IDs never fabricate objects absent from the recovered lists",async()=>{
  for(const test of [confirmedSaveCases[0],confirmedSaveCases[2]]){
    const h=await prepared(test);
    h.control.hook=entry=>entry.method==="GET"?{status:503,payload:{}}:undefined;
    await h.invoke(test.control);assertConfirmedStored(h,test);
    assert.equal(h.state.confirmedSaveNeedsRead,true);
    if(test.kind==="course-create")h.server.courses=h.server.courses.filter(row=>row.id!==3);
    else h.server.lessons.set(1,h.server.lessons.get(1).filter(row=>row.id!==30));
    h.control.hook=null;await h.invoke("retry-catalog");assertOneWrite(h,test);
    if(test.kind==="course-create")assert.equal(h.state.course,null);
    else assert.equal(h.state.course.id,1);
    assert.equal(h.state.lesson,null);assert.equal(h.get("lesson-body").value,"");
    assert.equal(h.state.confirmedSaveReadTarget,null);assert.equal(h.state.confirmedSaveNeedsRead,false);
    assert.equal(h.state.writeOutcomeUnknown,false);
  }
});
await scenario("C150 confirmed deletion and ordinary read failures retain their previous cleanup",async()=>{
  const deletion=cases[3],h=await prepared(deletion);
  h.control.hook=entry=>entry.method==="GET"&&entry.path==="/courses/1/lessons"?{status:503,payload:{}}:undefined;
  await h.invoke(deletion.control);assert.equal(h.state.lesson,null);assert.equal(h.get("lesson-body").value,"");
  assert.equal(h.state.confirmedSaveNeedsRead,false);assertOneWrite(h,deletion);
  assert.equal(h.server.lessons.get(1).some(row=>row.id===11),false);
  const read=await harness();read.get("lesson-body").value="Texto local sem qualquer salvamento.";
  read.control.hook=entry=>entry.path==="/courses/1/lessons"?{status:503,payload:{}}:undefined;
  await assert.rejects(read.editor.refreshLessons(11,true));
  assert.equal(read.state.lesson,null);assert.equal(read.get("lesson-body").value,"");
  assert.equal(read.state.confirmedSaveNeedsRead,false);assert.equal(read.writes().length,0);
});
console.log("PASS editorial write receipts: "+scenarios+" actual-script scenarios; editorial handlers, strict receipts, preserved drafts and manual recovery without replay");
