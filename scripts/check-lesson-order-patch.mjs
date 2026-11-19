#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Run the entire real editor and its actual submit, reorder and recovery handlers.
// Only DOM, HTTP and dialogs are synthetic. Literal payload assertions verify the client contract; database locking belongs to Feature/PG CI.
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
const before=[{id:11,sort_order:0},{id:12,sort_order:1},{id:13,sort_order:2}];
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
    timer=setTimeout(()=>reject(new Error("Lesson order patch test did not reach its HTTP boundary")),1000);
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
    const id=Number(entry.path.split("/")[2]),lesson=Array.from(server.lessons.values()).flat().find(row=>row.id===id);
    if(!lesson)return {status:404,payload:{error:"not_found"}};
    if(Object.hasOwn(entry.body,"expected_sort_order")&&entry.body.expected_sort_order!==lesson.sort_order)
      return {status:409,payload:{error:"draft_order_changed"}};
    for(const key of ["title","body","sort_order"])if(Object.hasOwn(entry.body,key))lesson[key]=entry.body[key];
    return ok({saved:true});
  };
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
        if(/^\/lessons\/\d+$/.test(path)&&entry.method==="PATCH")result=patch(entry);
        else if(/^\/courses\/\d+\/lessons$/.test(path)&&entry.method==="POST"){
          const id=server.nextLessonId??30;server.nextLessonId=id+1;
          server.lessons.get(Number(path.split("/")[2])).push({id,...entry.body,status:"draft",is_published:false});
          result={status:201,payload:{id,status:"draft"}};
        }
        else if(path==="/courses"&&entry.method==="GET")result=ok({courses:server.courses});
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
  new Script(source,{filename:"actual-admin-lesson-order-patch"}).runInContext(context);
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
  return {editor,state:editor.state,get,layout,server,control,requests,dialogs,move,choose,click,patch,submit:()=>emit(get("lesson-form"),"submit"),
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

const stored=(h,id=11)=>h.server.lessons.get(1).find(lesson=>lesson.id===id);
const patchWrites=h=>h.writes().filter(request=>request.method==="PATCH");
const textDraft=h=>{h.get("lesson-title").value="  Aula revisada 😀  ";h.get("lesson-body").value="  Conteúdo revisado com espaços e Unicode 😀.  ";};
const courseDraft=h=>{h.get("course-summary").value="  Resumo irmão que ainda não foi salvo.  ";return h.fields().slice(0,5);};
const paths=h=>h.requests.map(request=>request.method+" "+request.path);
function frozen(h,fields,query){
  assert.equal(h.state.writeOutcomeUnknown,true);assert.equal(h.state.writePending,false);
  assert.equal(h.state.catalogReady,false);assert.equal(h.state.lessonsReady,false);
  assert.deepEqual(h.fields(),fields);assert.equal(h.state.lessonQuery,query);
  assert.equal(h.get("editorial-lesson-search").disabled,true);assert.equal(h.get("lesson-save").disabled,true);
  assert.equal(h.get("catalog-recovery").hidden,false);assert.equal(h.get("retry-catalog").disabled,false);
  assert.match(h.get("status").textContent,/Não repita a operação/);
}
let scenarios=0;
async function scenario(label,run){try{await run();}catch(error){throw new Error(label,{cause:error});}scenarios++;}

for(const sortText of ["0","000","0.0"]){
  await scenario("numerically unchanged order is omitted from a text PATCH: "+sortText,async()=>{
    const h=await harness();textDraft(h);h.get("lesson-sort").value=sortText;await h.search("metodo");
    const sibling=courseDraft(h),reads=h.requests.length;await h.submit();
    assert.deepEqual(patchWrites(h)[0].body,{title:"Aula revisada 😀",body:"Conteúdo revisado com espaços e Unicode 😀."});
    assert.deepEqual(paths(h).slice(reads),["PATCH /lessons/11","GET /courses/1/lessons"]);
    assert.equal(h.state.lesson.sort_order,0);assert.equal(h.state.lesson.id,11);assert.equal(h.state.lessonQuery,"metodo");
    assert.deepEqual(h.fields().slice(0,5),sibling);assert.equal(h.writes().length,1);assert.equal(h.state.writeOutcomeUnknown,false);
  });
}
await scenario("two real editor instances keep the confirmed remote C129 order when the old editor saves only text",async()=>{
  const old=await harness(),peer=await harness({sharedServer:old.server,select:12});
  await old.search("metodo");textDraft(old);const sibling=courseDraft(old);
  await peer.click(peer.move(12,"up"));assert.deepEqual(peer.order(),movedUp);assert.equal(old.state.lesson.sort_order,0);
  assert.deepEqual(peer.writes()[0].body,{lesson_id:12,direction:"up",expected_order:before});
  const requests=old.requests.length;await old.submit();
  assert.deepEqual(patchWrites(old)[0].body,{title:"Aula revisada 😀",body:"Conteúdo revisado com espaços e Unicode 😀."});
  assert.equal(stored(old).sort_order,1);assert.equal(stored(old).body,"Conteúdo revisado com espaços e Unicode 😀.");
  assert.deepEqual(old.order(),movedUp);assert.equal(old.get("lesson-sort").value,"1");assert.equal(old.state.lesson.id,11);
  assert.equal(old.state.lessonQuery,"metodo");assert.deepEqual(old.fields().slice(0,5),sibling);
  assert.deepEqual(paths(old).slice(requests),["PATCH /lessons/11","GET /courses/1/lessons"]);assert.equal(old.writes().length,1);
});
await scenario("text-only omission also preserves a changed numeric order at the upper bound",async()=>{
  const h=await harness();stored(h).sort_order=9999;textDraft(h);await h.submit();
  assert.equal(Object.hasOwn(patchWrites(h)[0].body,"sort_order"),false);
  assert.equal(Object.hasOwn(patchWrites(h)[0].body,"expected_sort_order"),false);
  assert.equal(stored(h).sort_order,9999);assert.equal(h.state.lesson.sort_order,9999);assert.equal(h.get("lesson-sort").value,"9999");
});
for(const [baseline,destination] of [[0,7],[7,0],[9999,1],[0,9999]]){
  await scenario("explicit numeric change sends the exact integer baseline: "+baseline+" to "+destination,async()=>{
    const h=await harness();stored(h).sort_order=baseline;await h.editor.refreshLessons(11);textDraft(h);
    h.get("lesson-sort").value=String(destination);const sibling=courseDraft(h),requests=h.requests.length;
    await h.search("metodo");await h.submit();
    assert.deepEqual(patchWrites(h)[0].body,{title:"Aula revisada 😀",body:"Conteúdo revisado com espaços e Unicode 😀.",
      sort_order:destination,expected_sort_order:baseline});
    assert.equal(typeof patchWrites(h)[0].body.expected_sort_order,"number");assert.equal(stored(h).sort_order,destination);
    assert.deepEqual(h.fields().slice(0,5),sibling);assert.equal(h.state.lessonQuery,"metodo");
    assert.deepEqual(paths(h).slice(requests),["PATCH /lessons/11","GET /courses/1/lessons"]);
  });
}
await scenario("a stale explicit order freezes both literal buffers and C131 query after one conflict, without a preventive GET",async()=>{
  const h=await harness(),peer=await harness({sharedServer:h.server,select:12});
  textDraft(h);h.get("lesson-sort").value="7";courseDraft(h);await h.search("metodo");const fields=h.fields();
  await peer.click(peer.move(12,"up"));const serverBefore=clone(h.server.lessons.get(1)),requests=h.requests.length;
  await h.submit();frozen(h,fields,"metodo");assert.deepEqual(h.server.lessons.get(1),serverBefore);
  assert.deepEqual(paths(h).slice(requests),["PATCH /lessons/11"]);
  assert.deepEqual(patchWrites(h)[0].body,{title:"Aula revisada 😀",body:"Conteúdo revisado com espaços e Unicode 😀.",sort_order:7,expected_sort_order:0});
  await h.submit();assert.equal(patchWrites(h).length,1);assert.equal(h.requests.length,requests+1);
});
await scenario("an already-applied destination does not turn a stale baseline into success or automatic retry",async()=>{
  const h=await harness();stored(h).sort_order=7;textDraft(h);h.get("lesson-sort").value="7";
  const fields=h.fields(),serverBefore=clone(stored(h));await h.submit();frozen(h,fields,"");
  assert.deepEqual(stored(h),serverBefore);assert.equal(patchWrites(h)[0].body.expected_sort_order,0);
  assert.equal(h.writes().length,1);assert.equal(h.get("status").textContent.includes("Aula salva"),false);
});
await scenario("conflict recovery requires confirmation and a new click using the freshly read baseline",async()=>{
  const h=await harness();stored(h).sort_order=1;textDraft(h);h.get("lesson-sort").value="7";courseDraft(h);await h.search("metodo");
  const fields=h.fields();await h.submit();frozen(h,fields,"metodo");const requests=h.requests.length;
  h.control.accept=false;await h.click("retry-catalog");assert.deepEqual(h.fields(),fields);assert.equal(h.requests.length,requests);
  h.control.accept=true;await h.click("retry-catalog");assert.equal(h.state.writeOutcomeUnknown,false);assert.equal(h.state.lesson.sort_order,1);
  assert.equal(h.state.lessonQuery,"metodo");assert.equal(patchWrites(h).length,1);
  assert.deepEqual(paths(h).slice(requests),["GET /courses","GET /courses/1/lessons","GET /overview"]);
  textDraft(h);h.get("lesson-sort").value="7";await h.submit();assert.equal(patchWrites(h).length,2);
  assert.equal(patchWrites(h)[1].body.expected_sort_order,1);assert.equal(patchWrites(h)[1].body.sort_order,7);assert.equal(stored(h).sort_order,7);
});
for(const explicit of [false,true]){
  await scenario("a committed PATCH with a lost response stays frozen with no automatic reconciliation or replay: "+explicit,async()=>{
    const h=await harness();textDraft(h);if(explicit)h.get("lesson-sort").value="7";courseDraft(h);await h.search("metodo");
    const fields=h.fields(),requests=h.requests.length;
    h.control.hook=entry=>{if(entry.method!=="PATCH")return undefined;h.patch(entry);throw new Error("synthetic lost response");};
    await h.submit();frozen(h,fields,"metodo");assert.equal(stored(h).body,"Conteúdo revisado com espaços e Unicode 😀.");
    assert.equal(stored(h).sort_order,explicit?7:0);assert.deepEqual(paths(h).slice(requests),["PATCH /lessons/11"]);
    await h.submit();assert.equal(patchWrites(h).length,1);
    h.control.hook=null;await h.click("retry-catalog");assert.equal(h.state.writeOutcomeUnknown,false);
    assert.equal(h.state.lesson.sort_order,explicit?7:0);assert.equal(h.state.lessonQuery,"metodo");assert.equal(patchWrites(h).length,1);
  });
}
for(const payload of [null,{},[],{saved:false},{saved:"true"},{saved:1},{id:11}]){
  await scenario("malformed 200 PATCH receipt is ambiguous and preserves buffers: "+JSON.stringify(payload),async()=>{
    const h=await harness();textDraft(h);h.get("lesson-sort").value="7";courseDraft(h);await h.search("metodo");
    const fields=h.fields(),requests=h.requests.length;
    h.control.hook=entry=>entry.method==="PATCH"?ok(payload):undefined;await h.submit();frozen(h,fields,"metodo");
    assert.deepEqual(paths(h).slice(requests),["PATCH /lessons/11"]);assert.equal(stored(h).sort_order,0);
    await h.submit();assert.equal(patchWrites(h).length,1);
  });
}
await scenario("the exact successful PATCH flag permits the existing refresh without using extra response fields",async()=>{
  const h=await harness();textDraft(h);h.get("lesson-sort").value="7";
  h.control.hook=entry=>{if(entry.method!=="PATCH")return undefined;h.patch(entry);return ok({saved:true,sort_order:9999,title:"Untrusted receipt title"});};
  await h.submit();assert.equal(h.state.writeOutcomeUnknown,false);assert.equal(h.state.lesson.sort_order,7);
  assert.equal(h.get("lesson-title").value,"Aula revisada 😀");assert.equal(h.writes().length,1);
});
await scenario("new lesson POST preserves its original creation fields and never sends an expected order",async()=>{
  const h=await harness();await h.click("clear-lesson");h.get("lesson-title").value="  Nova aula 😀  ";h.get("lesson-slug").value="nova-aula";
  h.get("lesson-body").value="  Conteúdo da nova aula, criado explicitamente.  ";h.get("lesson-sort").value="7";
  const sibling=courseDraft(h),requests=h.requests.length;await h.search("nova");await h.submit();
  assert.deepEqual(clone(h.writes()[0]),{path:"/courses/1/lessons",method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Accept":"application/json","X-Requested-With":"XMLHttpRequest","Content-Type":"application/json","X-CSRF-TOKEN":"synthetic-csrf"},
    body:{title:"Nova aula 😀",slug:"nova-aula",body:"Conteúdo da nova aula, criado explicitamente.",sort_order:7}});
  assert.equal(Object.hasOwn(h.writes()[0].body,"expected_sort_order"),false);assert.equal(h.state.lesson.id,30);
  assert.equal(h.state.lesson.sort_order,7);assert.equal(h.state.lessonQuery,"nova");assert.deepEqual(h.fields().slice(0,5),sibling);
  assert.deepEqual(paths(h).slice(requests),["POST /courses/1/lessons","GET /courses/1/lessons"]);
});
await scenario("an outstanding PATCH remains single-flight even if the submit handler is called again",async()=>{
  const h=await harness(),seen=deferred(),gate=deferred();textDraft(h);h.get("lesson-sort").value="7";
  h.control.hook=async entry=>{if(entry.method!=="PATCH")return undefined;seen.release();await gate.promise;return h.patch(entry);};
  const pending=h.submit();await bounded(seen.promise);assert.equal(h.state.writePending,true);
  await h.submit();assert.equal(patchWrites(h).length,1);gate.release();await pending;
  assert.equal(h.state.writePending,false);assert.equal(h.state.writeOutcomeUnknown,false);assert.equal(stored(h).sort_order,7);
});
for(const status of [403,419]){
  await scenario("PATCH denial "+status+" purges all private buffers and query instead of exposing a retry",async()=>{
    const h=await harness();textDraft(h);h.get("lesson-sort").value="7";courseDraft(h);await h.search("metodo");
    const requests=h.requests.length;h.control.hook=entry=>entry.method==="PATCH"?{status,payload:{error:"access_denied"}}:undefined;
    await h.submit();assert.equal(h.state.accessDenied,true);assert.equal(h.state.lesson,null);assert.equal(h.state.course,null);
    assert.equal(h.state.lessonQuery,"");assert.equal(h.get("lesson-body").value,"");assert.equal(h.get("course-summary").value,"");
    assert.equal(h.get("lesson-save").disabled,true);assert.equal(h.get("catalog-recovery").hidden,true);
    assert.deepEqual(paths(h).slice(requests),["PATCH /lessons/11"]);await h.submit();assert.equal(patchWrites(h).length,1);
  });
}
await scenario("a success arriving after separate revocation cannot refresh or restore private data",async()=>{
  const h=await harness(),seen=deferred(),gate=deferred();textDraft(h);h.get("lesson-sort").value="7";await h.search("metodo");
  h.control.hook=async entry=>{if(entry.method!=="PATCH")return undefined;seen.release();await gate.promise;return ok({saved:true});};
  const pending=h.submit();await bounded(seen.promise);h.editor.lockAccess("Acesso encerrado.");const requests=h.requests.length;
  gate.release();await pending;assert.equal(h.state.accessDenied,true);assert.equal(h.state.lessonQuery,"");
  assert.equal(h.get("lesson-body").value,"");assert.equal(h.requests.length,requests);assert.equal(h.writes().length,1);
});
await scenario("published and revoked editors cannot start the new PATCH contract",async()=>{
  for(const published of [true,false]){
    const h=await harness({published});if(!published)h.editor.lockAccess("Acesso encerrado.");const requests=h.requests.length;
    await h.submit();assert.equal(h.requests.length,requests);assert.equal(h.writes().length,0);
  }
});
console.log("PASS lesson order PATCH: "+scenarios+" actual-script scenarios; omitted unchanged order, explicit baseline, strict receipt, preserved buffers and no replay");
