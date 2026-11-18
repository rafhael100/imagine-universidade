#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Run the entire real editor and its actual course submit and recovery handlers.
// Only DOM, HTTP and dialogs are synthetic. Literal payload assertions verify the client contract; database locking belongs to Feature/PG CI.
const view=readFileSync(new URL("../resources/views/university/admin.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
const boot='loadAdminCatalog();\n(async()=>{try{await refreshAudit();}catch(error){say(error.message);}})();';
assert.ok(start>=0&&end>start&&view.slice(start,end).includes(boot));
const exposed=["state","refreshCourses","refreshLessons","loadAdminCatalog","lockAccess"];
const source=view.slice(start,end).replace(boot,"")+"\nglobalThis.editor={"+exposed.join(",")+"};";
const clone=value=>JSON.parse(JSON.stringify(value));
const before=[{id:11,sort_order:0},{id:12,sort_order:1},{id:13,sort_order:2}];
const courseFields=["course-title","course-slug","course-category","course-summary","course-sort"];
const lessonFields=["lesson-title","lesson-slug","lesson-body","lesson-sort"];
const courseButtons=["course-save","check-publication","publish","unpublish","delete-course"];
const lessonButtons=["lesson-save","clear-lesson","preview-lesson","delete-lesson"];
const allFields=[...courseFields,...lessonFields];
const ok=payload=>({status:200,payload});
function deferred(){let release;const promise=new Promise(resolve=>{release=resolve;});return {promise,release};}
async function bounded(promise){
  let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new Error("Course order patch test did not reach its HTTP boundary")),1000);
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
async function harness({load=true,select=11,published=false,sharedServer=null}={}){
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
  const server=sharedServer??{courses:[1,2].map(id=>({id,slug:"curso-"+id,title:"Curso salvo "+id,category:"metodologia",
    summary:"Resumo salvo "+id,sort_order:0,is_published:published})),
    lessons:new Map([[1,before.map((pair,index)=>({...pair,slug:["inicio-editorial","planejamento-vendas","gestao-canais"][index],
      title:["Ação e método","Planejamento de vendas","Conexões de canais"][index],
      body:"Conteúdo exclusivo-corpo da aula "+pair.id+".\n\nSegundo parágrafo preservado.",status:published?"published":"draft",is_published:published}))],
      [2,[{id:21,sort_order:0,slug:"aula-21",title:"Aula salva 21",body:"Texto autorizado do outro curso.",status:"draft",is_published:false}]]])};
  const patch=entry=>{
    const id=Number(entry.path.split("/")[2]),course=server.courses.find(row=>row.id===id);
    if(!course)return {status:404,payload:{error:"not_found"}};
    if(Object.hasOwn(entry.body,"expected_sort_order")&&entry.body.expected_sort_order!==course.sort_order)
      return {status:409,payload:{error:"draft_order_changed"}};
    for(const key of ["title","category","summary","sort_order"])if(Object.hasOwn(entry.body,key))course[key]=entry.body[key];
    return ok({saved:true});
  };
  const control={hook:null,accept:true};
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
        if(/^\/courses\/\d+$/.test(path)&&entry.method==="PATCH")result=patch(entry);
        else if(path==="/courses"&&entry.method==="POST"){
          const id=server.nextCourseId??3;server.nextCourseId=id+1;
          server.courses.push({id,...entry.body,is_published:false});server.lessons.set(id,[]);
          result={status:201,payload:{id,status:"draft"}};
        }
        else if(path==="/courses"&&entry.method==="GET")result=ok({courses:server.courses});
        else if(/^\/courses\/\d+\/lessons$/.test(path)&&entry.method==="GET")
          result=ok({lessons:server.lessons.get(Number(path.split("/")[2]))||[]});
        else if(path==="/overview")result=ok({schema_version:1,scope:"current_editorial_catalog",
          totals:{courses:2,published_courses:0,draft_courses:2,current_lessons:4,courses_without_lessons:0,courses_without_summary:0},
          categories:[{category:"metodologia",courses:2,published_courses:0,draft_courses:2,current_lessons:4},
            ...["negocios","sistemas"].map(category=>({category,courses:0,published_courses:0,draft_courses:0,current_lessons:0}))]});
        else if(path==="/audit")result=ok({events:[],next_before_id:null});
        else throw new Error("Unexpected synthetic request: "+entry.method+" "+path);
      }
      return {status:result.status,ok:result.status>=200&&result.status<300,
        json:async()=>result.json?await result.json():clone(result.payload)};
    }});
  new Script(source,{filename:"actual-admin-course-order-patch"}).runInContext(context);
  const editor=context.editor;
  async function emit(node,type,extra={}){
    assert.ok(node,"Actual editor control exists");const path=[];
    for(let current=node;current;current=current.parent)path.push(current);
    for(const current of path)for(const handler of current.events.get(type)||[])
      await handler({target:node,preventDefault(){},...extra});
    await setImmediate();
  }
  const choose=id=>emit(get("lesson-items").querySelectorAll("[data-lesson]").find(button=>Number(button.dataset.lesson)===id),"click");
  if(load){
    await editor.loadAdminCatalog();
    await emit(get("course-items").querySelectorAll("[data-course]").find(button=>Number(button.dataset.course)===1),"click");
    if(select!==null)await choose(select);
  }
  const click=async value=>{
    const node=typeof value==="string"?get(value):value;
    if(node.disabled||!node.isConnected)return;
    for(let current=node;current;current=current.parent)if(current.inert)return;
    await emit(node,"click");
  };
  return {editor,state:editor.state,get,layout,server,control,requests,dialogs,choose,click,patch,submit:()=>emit(get("course-form"),"submit"),
    emit,flush:()=>setImmediate(),
    fields:()=>allFields.map(id=>get(id).value),
    writes:()=>requests.filter(entry=>entry.method!=="GET"),
    search:async query=>{get("editorial-lesson-search").value=query;await emit(get("editorial-lesson-search"),"input");},
    generations:()=>[editor.state.courseRequest,editor.state.lessonRequest,editor.state.preflightRequest]};
}

const stored=h=>h.server.courses.find(course=>course.id===1);
const patchWrites=h=>h.writes().filter(request=>request.method==="PATCH");
const text={title:"Curso revisado 😀",category:"negocios",summary:"Resumo revisado com Unicode 😀."};
function textDraft(h){
  h.get("course-title").value="  "+text.title+"  ";h.get("course-category").value=text.category;
  h.get("course-summary").value="  "+text.summary+"  ";
}
const paths=h=>h.requests.map(request=>request.method+" "+request.path);
function frozen(h,fields,query){
  assert.equal(h.state.writeOutcomeUnknown,true);assert.equal(h.state.writePending,false);
  assert.equal(h.state.catalogReady,false);assert.equal(h.state.lessonsReady,false);
  assert.deepEqual(h.fields(),fields);assert.equal(h.state.lessonQuery,query);
  assert.equal(h.get("editorial-lesson-search").disabled,true);assert.equal(h.get("course-save").disabled,true);
  assert.equal(h.get("catalog-recovery").hidden,false);assert.equal(h.get("retry-catalog").disabled,false);
  assert.match(h.get("status").textContent,/Não repita a operação/);
}
let scenarios=0;
async function scenario(label,run){try{await run();}catch(error){throw new Error(label,{cause:error});}scenarios++;}

for(const sortText of ["0","000","0.0"]){
  await scenario("a numerically unchanged course order is omitted from a text PATCH: "+sortText,async()=>{
    const h=await harness();textDraft(h);h.get("course-sort").value=sortText;await h.search("metodo");
    const sibling=h.fields().slice(5),reads=h.requests.length;await h.submit();
    assert.deepEqual(patchWrites(h)[0].body,text);
    assert.deepEqual(paths(h).slice(reads),["PATCH /courses/1","GET /courses","GET /courses/1/lessons"]);
    assert.equal(h.state.course.id,1);assert.equal(h.state.course.sort_order,0);assert.equal(h.state.lesson.id,11);
    assert.equal(h.state.lessonQuery,"metodo");assert.deepEqual(h.fields().slice(5),sibling);
    assert.equal(h.writes().length,1);assert.equal(h.state.writeOutcomeUnknown,false);
  });
}
await scenario("two real editor instances preserve the peer course order when the older session saves only its summary",async()=>{
  const old=await harness(),peer=await harness({sharedServer:old.server});
  await old.search("metodo");old.get("course-summary").value="  Resumo editado na sessão antiga.  ";
  peer.get("course-sort").value="5";await peer.submit();
  assert.deepEqual(patchWrites(peer)[0].body,{title:"Curso salvo 1",category:"metodologia",summary:"Resumo salvo 1",
    sort_order:5,expected_sort_order:0});
  assert.equal(peer.state.course.sort_order,5);assert.equal(old.state.course.sort_order,0);
  const sibling=old.fields().slice(5),requests=old.requests.length;await old.submit();
  assert.deepEqual(patchWrites(old)[0].body,{title:"Curso salvo 1",category:"metodologia",summary:"Resumo editado na sessão antiga."});
  assert.equal(stored(old).sort_order,5);assert.equal(stored(old).summary,"Resumo editado na sessão antiga.");
  assert.equal(old.state.course.sort_order,5);assert.equal(old.get("course-sort").value,"5");
  assert.equal(old.state.lessonQuery,"metodo");assert.deepEqual(old.fields().slice(5),sibling);
  assert.deepEqual(paths(old).slice(requests),["PATCH /courses/1","GET /courses","GET /courses/1/lessons"]);
  assert.equal(old.writes().length,1);
});
await scenario("an omitted order also preserves the remotely changed upper boundary",async()=>{
  const h=await harness();stored(h).sort_order=9999;textDraft(h);await h.submit();
  assert.deepEqual(patchWrites(h)[0].body,text);assert.equal(stored(h).sort_order,9999);
  assert.equal(h.state.course.sort_order,9999);assert.equal(h.get("course-sort").value,"9999");
});
for(const [baseline,destination] of [[0,7],[7,0],[9999,1],[0,9999]]){
  await scenario("an explicit course order carries its exact integer baseline: "+baseline+" to "+destination,async()=>{
    const h=await harness();stored(h).sort_order=baseline;await h.editor.refreshCourses(1);textDraft(h);
    h.get("course-sort").value=String(destination);await h.search("metodo");
    const sibling=h.fields().slice(5),requests=h.requests.length;await h.submit();
    assert.deepEqual(patchWrites(h)[0].body,{...text,sort_order:destination,expected_sort_order:baseline});
    assert.equal(typeof patchWrites(h)[0].body.expected_sort_order,"number");assert.equal(stored(h).sort_order,destination);
    assert.equal(h.state.course.sort_order,destination);assert.equal(h.state.lessonQuery,"metodo");
    assert.deepEqual(h.fields().slice(5),sibling);
    assert.deepEqual(paths(h).slice(requests),["PATCH /courses/1","GET /courses","GET /courses/1/lessons"]);
  });
}
await scenario("a stale explicit order freezes both buffers and C131 query after one conflict and no extra GET",async()=>{
  const h=await harness(),peer=await harness({sharedServer:h.server});
  textDraft(h);h.get("course-sort").value="7";await h.search("metodo");const fields=h.fields();
  peer.get("course-sort").value="5";await peer.submit();
  const before=clone(stored(h)),requests=h.requests.length;await h.submit();
  frozen(h,fields,"metodo");assert.deepEqual(stored(h),before);
  assert.deepEqual(patchWrites(h)[0].body,{...text,sort_order:7,expected_sort_order:0});
  assert.deepEqual(paths(h).slice(requests),["PATCH /courses/1"]);
  await h.submit();assert.equal(h.writes().length,1);assert.equal(h.requests.length,requests+1);
});
await scenario("an already-applied destination still conflicts with an old baseline",async()=>{
  const h=await harness();stored(h).sort_order=7;textDraft(h);h.get("course-sort").value="7";
  const fields=h.fields(),before=clone(stored(h));await h.submit();
  frozen(h,fields,"");assert.deepEqual(stored(h),before);assert.equal(patchWrites(h)[0].body.expected_sort_order,0);
});
await scenario("manual recovery requires confirmation and only a new submit uses the fresh order",async()=>{
  const h=await harness();stored(h).sort_order=5;textDraft(h);h.get("course-sort").value="7";await h.search("metodo");
  const fields=h.fields();await h.submit();const requests=h.requests.length;
  h.control.accept=false;await h.click("retry-catalog");frozen(h,fields,"metodo");
  assert.equal(h.requests.length,requests);assert.equal(h.writes().length,1);
  h.control.accept=true;await h.click("retry-catalog");
  assert.deepEqual(paths(h).slice(requests),["GET /courses","GET /courses/1/lessons"]);
  assert.equal(h.state.course.sort_order,5);assert.equal(h.get("course-sort").value,"5");
  assert.equal(h.state.writeOutcomeUnknown,false);assert.equal(h.state.lessonQuery,"metodo");assert.equal(h.writes().length,1);
  textDraft(h);h.get("course-sort").value="7";await h.submit();
  assert.deepEqual(patchWrites(h)[1].body,{...text,sort_order:7,expected_sort_order:5});
  assert.equal(stored(h).sort_order,7);assert.equal(h.writes().length,2);
});
for(const explicitOrder of [false,true]){
  await scenario("a lost "+(explicitOrder?"explicit-order":"text-only")+" response never replays its PATCH",async()=>{
    const h=await harness();textDraft(h);if(explicitOrder)h.get("course-sort").value="7";await h.search("metodo");
    h.control.hook=entry=>{
      if(entry.path==="/courses/1"&&entry.method==="PATCH"){h.patch(entry);throw new Error("Synthetic response lost after commit");}
    };
    const fields=h.fields(),requests=h.requests.length;await h.submit();frozen(h,fields,"metodo");
    assert.deepEqual(paths(h).slice(requests),["PATCH /courses/1"]);assert.equal(stored(h).summary,text.summary);
    assert.equal(stored(h).sort_order,explicitOrder?7:0);
    await h.submit();assert.equal(h.writes().length,1);
    h.control.hook=null;await h.click("retry-catalog");
    assert.equal(h.writes().length,1);assert.equal(h.state.writeOutcomeUnknown,false);
    assert.equal(h.state.course.sort_order,explicitOrder?7:0);assert.equal(h.state.lessonQuery,"metodo");
  });
}
for(const receipt of [null,[],{},true,{saved:false},{saved:"true"},{saved:1}]){
  await scenario("C136 invalid save receipt preserves the course buffer and blocks the refresh: "+JSON.stringify(receipt),async()=>{
    const h=await harness();textDraft(h);h.get("course-sort").value="7";await h.search("metodo");
    h.control.hook=entry=>entry.path==="/courses/1"&&entry.method==="PATCH"?ok(receipt):undefined;
    const fields=h.fields(),requests=h.requests.length;await h.submit();frozen(h,fields,"metodo");
    assert.deepEqual(paths(h).slice(requests),["PATCH /courses/1"]);assert.equal(h.writes().length,1);
  });
}
await scenario("a true receipt cannot replace the authoritative course with extra fields",async()=>{
  const h=await harness();textDraft(h);h.get("course-sort").value="7";
  h.control.hook=entry=>{
    if(entry.path==="/courses/1"&&entry.method==="PATCH"){
      h.patch(entry);return ok({saved:true,id:2,sort_order:9999,title:"Untrusted receipt title"});
    }
  };
  await h.submit();assert.equal(h.state.course.id,1);assert.equal(h.state.course.title,text.title);
  assert.equal(h.state.course.sort_order,7);assert.equal(h.writes().length,1);
});
await scenario("course creation keeps its original POST payload and the C136 draft receipt",async()=>{
  const h=await harness();await h.click("new-course");textDraft(h);
  h.get("course-slug").value="  novo-curso  ";h.get("course-sort").value="4";const requests=h.requests.length;
  await h.submit();
  assert.deepEqual(clone(h.writes()[0]),{path:"/courses",method:"POST",credentials:"same-origin",cache:"no-store",headers:{
    "Accept":"application/json","X-Requested-With":"XMLHttpRequest","Content-Type":"application/json","X-CSRF-TOKEN":"synthetic-csrf"},
    body:{title:text.title,slug:"novo-curso",category:text.category,summary:text.summary,sort_order:4}});
  assert.deepEqual(paths(h).slice(requests),["POST /courses","GET /courses","GET /courses/3/lessons"]);
  assert.equal(h.state.course.id,3);assert.equal(h.state.course.sort_order,4);assert.equal(h.state.writeOutcomeUnknown,false);
});
await scenario("C136 malformed creation receipt does not refresh or acquire an uncertain course",async()=>{
  const h=await harness();await h.click("new-course");textDraft(h);h.get("course-slug").value="novo-curso";
  h.control.hook=entry=>entry.path==="/courses"&&entry.method==="POST"?ok({id:3,status:"published"}):undefined;
  const fields=h.fields(),requests=h.requests.length;await h.submit();frozen(h,fields,"");
  assert.deepEqual(paths(h).slice(requests),["POST /courses"]);assert.equal(h.state.course,null);
});
await scenario("the unsaved-lesson guard keeps both drafts and generations without starting a course write",async()=>{
  const h=await harness();textDraft(h);h.get("course-sort").value="7";h.get("lesson-body").value="  Rascunho irmão ainda não salvo.  ";
  await h.search("metodo");const fields=h.fields(),generations=h.generations(),requests=h.requests.length;
  await h.submit();assert.deepEqual(h.fields(),fields);assert.deepEqual(h.generations(),generations);
  assert.equal(h.requests.length,requests);assert.equal(h.state.writeOutcomeUnknown,false);assert.equal(h.state.writePending,false);
  assert.equal(h.state.lessonQuery,"metodo");assert.match(h.get("status").textContent,/Salve a aula em edição antes/);
});
await scenario("only one course write can be in flight",async()=>{
  const h=await harness();textDraft(h);h.get("course-sort").value="7";
  const gate=deferred(),entered=deferred();
  h.control.hook=async entry=>{
    if(entry.path==="/courses/1"&&entry.method==="PATCH"){entered.release();await gate.promise;return h.patch(entry);}
  };
  const pending=h.submit();await bounded(entered.promise);await h.submit();
  assert.equal(h.writes().length,1);assert.equal(h.state.writePending,true);
  gate.release();await bounded(pending);assert.equal(h.state.course.sort_order,7);assert.equal(h.writes().length,1);
});
for(const status of [403,419]){
  await scenario("HTTP "+status+" purges private buffers and the query instead of freezing a reusable draft",async()=>{
    const h=await harness();textDraft(h);h.get("course-sort").value="7";await h.search("metodo");
    h.control.hook=entry=>entry.path==="/courses/1"&&entry.method==="PATCH"?{status,payload:{error:"access_denied"}}:undefined;
    const requests=h.requests.length;await h.submit();
    assert.equal(h.state.accessDenied,true);assert.equal(h.state.course,null);assert.equal(h.state.lesson,null);
    assert.equal(h.state.lessonQuery,"");assert.equal(h.get("course-title").value,"");assert.equal(h.get("lesson-body").value,"");
    assert.equal(h.get("retry-catalog").disabled,true);assert.equal(h.layout.inert,true);
    assert.deepEqual(paths(h).slice(requests),["PATCH /courses/1"]);await h.submit();assert.equal(h.writes().length,1);
  });
}
await scenario("a late successful receipt after revocation cannot reload or restore the course",async()=>{
  const h=await harness();textDraft(h);const gate=deferred(),entered=deferred();
  h.control.hook=async entry=>{
    if(entry.path==="/courses/1"&&entry.method==="PATCH"){
      h.patch(entry);entered.release();await gate.promise;return ok({saved:true});
    }
  };
  const requests=h.requests.length,pending=h.submit();await bounded(entered.promise);h.editor.lockAccess("Acesso encerrado.");
  gate.release();await bounded(pending);
  assert.equal(h.state.accessDenied,true);assert.equal(h.state.course,null);assert.equal(h.state.lesson,null);
  assert.equal(h.get("course-summary").value,"");assert.equal(h.get("lesson-body").value,"");
  assert.deepEqual(paths(h).slice(requests),["PATCH /courses/1"]);assert.equal(h.state.writePending,false);
});
await scenario("published, unavailable and revoked states still cannot start course edits",async()=>{
  for(const mode of ["published","catalog","lessons","revoked"]){
    const h=await harness({published:mode==="published"});textDraft(h);h.get("course-sort").value="7";
    if(mode==="catalog")h.state.catalogReady=false;
    if(mode==="lessons")h.state.lessonsReady=false;
    if(mode==="revoked")h.editor.lockAccess("Acesso encerrado.");
    const requests=h.requests.length;await h.submit();assert.equal(h.requests.length,requests);assert.equal(h.writes().length,0);
  }
});
console.log("PASS C137 course order patch: "+scenarios+" actual-script scenarios");
