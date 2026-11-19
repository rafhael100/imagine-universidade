#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// The complete real editor, its normalizers and click handlers run here.
// DOM/HTTP are synthetic. Expected moves and receipts are literal fixtures,
// never a second implementation of the view's reorder algorithm.
const view=readFileSync(new URL("../resources/views/university/admin.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
const boot='loadAdminCatalog();\n(async()=>{try{await refreshAudit();}catch(error){say(error.message);}})();';
assert.ok(start>=0&&end>start&&view.slice(start,end).includes(boot));
const exposed=["state","validatedLessonOrder","lessonReorderTarget","validatedLessonReorderReceipt","draftLessonOrder",
  "lessonReorderFormSnapshot","lessonReorderDirtyForms","renderLessonReorderControls","reorderLesson","renderLessons",
  "refreshCourses","refreshLessons","loadAdminCatalog","beginWrite","finishWrite","publicationCheck","lockAccess"];
const source=view.slice(start,end).replace(boot,"")+"\nglobalThis.editor={"+exposed.join(",")+"};";
const clone=value=>JSON.parse(JSON.stringify(value));
const before=[{id:11,sort_order:5},{id:12,sort_order:5},{id:13,sort_order:9}];
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
    timer=setTimeout(()=>reject(new Error("Reorder test did not reach its HTTP boundary")),1000);
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
async function harness({load=true,select=12,published=false}={}){
  const nodes=new Map(),body=new Node("BODY"),requests=[],dialogs=[];
  for(const match of view.slice(0,start).matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
    const node=new Node(match[1].toUpperCase(),match[2]);node.hidden=/\bhidden\b/.test(match[0]);
    node.disabled=/\bdisabled\b/.test(match[0]);nodes.set(node.id,node);body.append(node);
  }
  const get=id=>body.querySelector("#"+id)??nodes.get(id)??null;
  const layout=new Node("DIV","layout");layout.className="layout";body.append(layout);
  for(const id of ["course-form","lesson-form","course-items","lesson-items","lesson-order-status","catalog-recovery",
    "new-course","retry-catalog","editorial-course-search","editorial-category-filter","editorial-state-filter","clear-editorial-filters"])
    layout.append(get(id));
  get("course-form").append(...[...courseFields,...courseButtons].map(get));
  get("lesson-form").append(...[...lessonFields,...lessonButtons].map(get));
  for(const id of allFields)get(id).value=id.endsWith("sort")?"0":"";
  get("course-category").value="metodologia";
  get("lesson-form").reset=()=>{for(const id of lessonFields)get(id).value=id.endsWith("sort")?"0":"";};
  const server={courses:[1,2].map(id=>({id,slug:"curso-"+id,title:"Curso salvo "+id,category:"metodologia",
    summary:"Resumo salvo "+id,sort_order:0,is_published:published})),
    lessons:new Map([[1,before.map(pair=>({...pair,slug:"aula-"+pair.id,title:"Aula salva "+pair.id,
      body:"Texto original autorizado da aula "+pair.id+".\n\nSegundo parágrafo preservado.",status:published?"published":"draft",is_published:published}))],
      [2,[{id:21,sort_order:0,slug:"aula-21",title:"Aula salva 21",body:"Texto autorizado do outro curso.",status:"draft",is_published:false}]]])};
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
        if(path==="/courses"&&entry.method==="GET")result=ok({courses:server.courses});
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
        else if(path==="/audit")result=ok({events:[],next_before_id:null});
        else throw new Error("Unexpected synthetic request: "+entry.method+" "+path);
      }
      return {status:result.status,ok:result.status>=200&&result.status<300,
        json:async()=>result.json?await result.json():clone(result.payload)};
    }});
  new Script(source,{filename:"actual-admin-lesson-reorder"}).runInContext(context);
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
  return {editor,state:editor.state,get,layout,server,control,requests,dialogs,move,choose,click,
    emit,flush:()=>setImmediate(),invoke:node=>emit(node,"click"),
    fields:()=>allFields.map(id=>get(id).value),
    order:()=>clone(editor.state.lessons.map(({id,sort_order})=>({id,sort_order}))),
    displayed:()=>get("lesson-items").querySelectorAll("[data-lesson-row]").map(row=>Number(row.dataset.lessonRow)),
    writes:()=>requests.filter(entry=>entry.method!=="GET")};
}
let scenarios=0;
async function scenario(label,run){try{await run();}catch(error){throw new Error(label,{cause:error});}scenarios++;}
const parser=(await harness({load:false})).editor;
await scenario("ties move one neighboring lesson and renumber the complete destination",()=>{
  assert.deepEqual(clone(parser.lessonReorderTarget(before,12,"up")),{order:movedUp,boundary:false});
  assert.deepEqual(clone(parser.lessonReorderTarget(before,12,"down")),{order:movedDown,boundary:false});
  assert.deepEqual(clone(parser.lessonReorderTarget(before,11,"up")),{order:before,boundary:true});
  assert.deepEqual(clone(parser.lessonReorderTarget(before,13,"down")),{order:before,boundary:true});
});
await scenario("receipt strips extras and accepts the server's positive version without inventing a local one",()=>{
  const value=receipt();value.operator="excluded";value.order[0].body="excluded";
  assert.deepEqual(clone(parser.validatedLessonReorderReceipt(value,1,12,"up",before)),receipt());
  assert.equal(parser.validatedLessonReorderReceipt(receipt(movedUp,{course_version:Number.MAX_SAFE_INTEGER}),1,12,"up",before).course_version,Number.MAX_SAFE_INTEGER);
});
await scenario("idempotent target confirmation and boundary no-op retain their exact orders",()=>{
  assert.ok(parser.validatedLessonReorderReceipt(receipt(movedUp,{changed:false}),1,12,"up",before));
  assert.ok(parser.validatedLessonReorderReceipt(receipt(before,{lesson_id:11,changed:false}),1,11,"up",before));
  assert.equal(parser.validatedLessonReorderReceipt(receipt(before,{lesson_id:11,changed:true}),1,11,"up",before),null);
});
for(const change of [
  value=>{value.schema_version="1";},value=>{value.scope="editorial_archived_content";},value=>{value.course_id=2;},
  value=>{value.course_id="1";},value=>{value.course_version=0;},value=>{value.course_version="7";},
  value=>{value.course_version=1.5;},value=>{value.course_version=Number.MAX_SAFE_INTEGER+1;},
  value=>{value.status="published";},value=>{value.lesson_id=11;},value=>{value.lesson_id="12";},
  value=>{value.direction="down";},value=>{value.changed="true";},value=>{delete value.changed;},
  value=>{value.order=[];},value=>{value.order=null;},value=>{value.order.reverse();},
  value=>{value.order[0].id=99;},value=>{value.order[0].id="12";},value=>{value.order[0].sort_order="0";},
  value=>{value.order[0].sort_order=5;},value=>{value.order[1]={...value.order[0]};},
  value=>{value.order.push({id:99,sort_order:3});},
])await scenario("wrong, malformed or partial receipt cannot confirm an editorial move",()=>{
  const value=receipt();change(value);assert.equal(parser.validatedLessonReorderReceipt(value,1,12,"up",before),null);
});
for(const value of [null,{},[{id:1,sort_order:"0"}],[{id:0,sort_order:0}],[{id:1,sort_order:-1}],
  [{id:1,sort_order:10000}],[{id:1,sort_order:0},{id:1,sort_order:1}],
  [{id:2,sort_order:0},{id:1,sort_order:0}],[{id:1,sort_order:2},{id:2,sort_order:1}]]){
  await scenario("invalid or noncanonical expected order is rejected",()=>assert.equal(parser.validatedLessonOrder(value),null));
}
await scenario("the existing 5000-row UI limit remains exact",()=>{
  const rows=Array.from({length:5000},(_,index)=>({id:index+1,sort_order:index}));
  assert.equal(parser.validatedLessonOrder(rows).length,5000);
  assert.equal(parser.validatedLessonOrder([...rows,{id:5001,sort_order:5000}]),null);
});
await scenario("controls expose sequence positions, accessible directions and disabled boundaries",async()=>{
  const h=await harness();assert.deepEqual(h.displayed(),[11,12,13]);
  assert.equal(h.move(11,"up").disabled,true);assert.equal(h.move(13,"down").disabled,true);
  assert.equal(h.move().disabled,false);assert.match(h.move().attributes["aria-label"],/Subir aula: Aula salva 12/);
  assert.match(h.get("lesson-items").textContent,/Posição 1/);assert.equal(h.writes().length,0);
});
await scenario("moving a tied lesson preserves selection, text, course fields and canonical payload",async()=>{
  const h=await harness(),fields=h.fields(),reads=h.requests.length;
  await h.click(h.move());assert.deepEqual(h.order(),movedUp);assert.deepEqual(h.displayed(),[12,11,13]);
  assert.equal(h.state.lesson.id,12);assert.equal(h.get("lesson-sort").value,"0");
  assert.deepEqual(h.fields().filter((_,index)=>index!==8),fields.filter((_,index)=>index!==8));
  assert.deepEqual(clone(h.editor.lessonReorderDirtyForms()),{course:false,lesson:false});
  assert.equal(h.requests.length,reads+1);assert.equal(h.dialogs.length,0);
  assert.deepEqual(h.writes()[0].body,{lesson_id:12,direction:"up",expected_order:before});
  assert.equal(h.writes()[0].credentials,"same-origin");assert.equal(h.writes()[0].cache,"no-store");
  assert.equal(h.writes()[0].headers["X-CSRF-TOKEN"],"synthetic-csrf");
  assert.match(h.get("status").textContent,/Ordem das aulas atualizada/);
});
await scenario("moving down uses the exact neighboring target and never resubmits forms",async()=>{
  const h=await harness();h.control.reorder=ok(receipt(movedDown,{direction:"down"}));h.control.commitOrder=clone(movedDown);
  await h.click(h.move(12,"down"));assert.deepEqual(h.order(),movedDown);
  assert.equal(h.state.lesson.id,12);assert.equal(h.get("lesson-sort").value,"2");
  assert.equal(h.writes().length,1);assert.equal(h.writes()[0].path,"/courses/1/lessons/reorder");
});
await scenario("the selected neighboring lesson also receives its confirmed order baseline",async()=>{
  const h=await harness({select:11}),body=h.get("lesson-body").value;
  await h.click(h.move());assert.equal(h.state.lesson.id,11);assert.equal(h.get("lesson-sort").value,"1");
  assert.equal(h.get("lesson-body").value,body);assert.equal(h.editor.lessonReorderDirtyForms().lesson,false);
});
await scenario("a blank new-lesson form remains blank and unselected after a move",async()=>{
  const h=await harness({select:null}),fields=h.fields();await h.click(h.move());
  assert.equal(h.state.lesson,null);assert.deepEqual(h.fields(),fields);assert.equal(h.get("lesson-sort").value,"0");
});
await scenario("idempotent receipt confirms the exact target without claiming another mutation",async()=>{
  const h=await harness();h.control.reorder=ok(receipt(movedUp,{changed:false}));await h.click(h.move());
  assert.deepEqual(h.order(),movedUp);assert.equal(h.writes().length,1);
  assert.match(h.get("status").textContent,/Nenhuma nova alteração foi necessária/);
});
for(const id of allFields){
  await scenario("any unsaved form field blocks reorder and preserves the buffer: "+id,async()=>{
    const h=await harness(),button=h.move();h.get(id).value=id==="course-category"?"negocios":id.endsWith("sort")?"8":"  Alteração não salva  ";
    await h.emit(h.get(id),"input");const fields=h.fields();assert.equal(h.move().disabled,true);
    await h.invoke(button);assert.equal(h.writes().length,0);assert.deepEqual(h.fields(),fields);
    assert.match(h.get("status").textContent,/antes de mudar a ordem/);assert.equal(h.dialogs.length,0);
  });
}
await scenario("dirty siblings explain saving the lesson before the course without discarding either",async()=>{
  const h=await harness(),button=h.move();h.get("course-summary").value="Resumo em edição";h.get("lesson-body").value="Corpo em edição, preservado.";
  const fields=h.fields();await h.invoke(button);assert.equal(h.writes().length,0);assert.deepEqual(h.fields(),fields);
  assert.match(h.get("status").textContent,/primeiro a aula e depois o curso/);
});
for(const code of [403,419])await scenario("revocation purges fields and cannot restore them from a delayed receipt: "+code,async()=>{
  const h=await harness(),seen=deferred(),gate=deferred();
  h.control.reorder=async()=>{seen.release();await gate.promise;return ok(receipt());};
  await h.click(h.move());await bounded(seen.promise);h.editor.lockAccess("Acesso encerrado durante a escrita "+code);
  gate.release();await h.flush();assert.equal(h.state.accessDenied,true);assert.equal(h.state.lesson,null);
  assert.equal(h.get("lesson-order-status").textContent,"");assert.equal(h.get("lesson-items").querySelectorAll("[data-move-lesson]").length,0);
  for(const id of allFields){if(id!=="course-category")assert.equal(h.get(id).value,"");assert.equal(h.get(id).disabled,true);}
  assert.equal(h.layout.inert,true);assert.equal(h.writes().length,1);
});
for(const id of allFields){
  await scenario("a programmatic edit during the pending write is preserved and requires manual reconciliation: "+id,async()=>{
    const h=await harness(),seen=deferred(),gate=deferred();
    h.control.reorder=async()=>{seen.release();await gate.promise;return ok(receipt());};
    await h.click(h.move());await bounded(seen.promise);assert.equal(h.layout.inert,true);assert.deepEqual(h.order(),before);
    h.get(id).value=id==="course-category"?"negocios":id.endsWith("sort")?" 8 ":"  Texto alterado durante a espera  ";
    const fields=h.fields();gate.release();await h.flush();
    assert.equal(h.state.writeOutcomeUnknown,true);assert.equal(h.state.catalogReady,false);assert.equal(h.state.lessonsReady,false);
    assert.deepEqual(h.fields(),fields);assert.deepEqual(h.order(),before);assert.equal(h.writes().length,1);
    assert.match(h.get("status").textContent,/campos atuais foram preservados/);assert.equal(h.get("retry-catalog").disabled,false);
  });
}
await scenario("an in-flight programmatic selection change is not overwritten by the reorder result",async()=>{
  const h=await harness(),seen=deferred(),gate=deferred();
  h.control.reorder=async()=>{seen.release();await gate.promise;return ok(receipt());};
  await h.click(h.move());await bounded(seen.promise);h.state.lesson=h.state.lessons[0];const fields=h.fields();
  gate.release();await h.flush();assert.equal(h.state.lesson.id,11);assert.deepEqual(h.fields(),fields);
  assert.equal(h.state.writeOutcomeUnknown,true);assert.deepEqual(h.order(),before);
});
await scenario("single-flight prevents a second mutation and no order is applied optimistically",async()=>{
  const h=await harness(),seen=deferred(),gate=deferred(),button=h.move(),fields=h.fields();
  h.control.reorder=async()=>{seen.release();await gate.promise;return ok(receipt());};
  await h.click(button);await bounded(seen.promise);await h.invoke(button);await h.editor.reorderLesson(13,"up");
  assert.equal(h.writes().length,1);assert.deepEqual(h.order(),before);assert.deepEqual(h.fields(),fields);
  gate.release();await h.flush();assert.deepEqual(h.order(),movedUp);assert.equal(h.state.writePending,false);assert.equal(h.layout.inert,false);
});
await scenario("a detached button from a local rerender with the same course and request cannot write",async()=>{
  const h=await harness(),button=h.move(),request=h.state.lessonRequest;h.editor.renderLessons();
  assert.equal(button.isConnected,false);assert.equal(h.state.lessonRequest,request);
  await h.invoke(button);assert.equal(h.writes().length,0);assert.deepEqual(h.order(),before);
});
await scenario("local lesson selection invalidates removed movement buttons without changing the request",async()=>{
  const h=await harness(),button=h.move(),request=h.state.lessonRequest;await h.choose(11);
  assert.equal(h.state.lessonRequest,request);await h.invoke(button);
  assert.equal(h.writes().length,0);assert.equal(h.state.lesson.id,11);
});
for(const code of [404,409,422,503])await scenario("rejected or unavailable reorder freezes writes without replay: "+code,async()=>{
  const h=await harness(),fields=h.fields();h.control.commitOrder=null;h.control.reorder={status:code,payload:{error:"private-details-not-rendered"}};
  await h.click(h.move());assert.equal(h.state.writeOutcomeUnknown,true);assert.deepEqual(h.order(),before);assert.deepEqual(h.fields(),fields);
  await h.editor.reorderLesson(12,"up");assert.equal(h.writes().length,1);
  assert.ok(!h.get("status").textContent.includes("private-details"));assert.match(h.get("status").textContent,/Não repita o movimento/);
});
for(const code of [403,419])await scenario("HTTP denial during the mutation uses the real purge path: "+code,async()=>{
  const h=await harness();h.control.commitOrder=null;h.control.reorder={status:code,payload:{}};
  await h.click(h.move());assert.equal(h.state.accessDenied,true);assert.equal(h.state.courses.length,0);
  assert.equal(h.get("lesson-order-status").textContent,"");assert.equal(h.layout.inert,true);assert.equal(h.writes().length,1);
});
await scenario("a malformed successful receipt never replaces order or form baselines",async()=>{
  const h=await harness(),fields=h.fields();h.control.reorder=ok(receipt(before));
  await h.click(h.move());assert.equal(h.state.writeOutcomeUnknown,true);assert.deepEqual(h.order(),before);
  assert.deepEqual(h.fields(),fields);assert.deepEqual(h.displayed(),[11,12,13]);assert.equal(h.writes().length,1);
});
await scenario("a lost committed response preserves buffers and manual reconciliation does not repeat POST",async()=>{
  const h=await harness(),fields=h.fields();h.control.reorder=async()=>{throw new Error("synthetic lost response");};
  await h.click(h.move());assert.equal(h.state.writeOutcomeUnknown,true);assert.deepEqual(h.fields(),fields);
  const requests=h.requests.length;h.control.accept=false;await h.click("retry-catalog");
  assert.equal(h.requests.length,requests);assert.deepEqual(h.fields(),fields);assert.equal(h.state.writeOutcomeUnknown,true);
  h.control.accept=true;await h.click("retry-catalog");
  assert.deepEqual(h.order(),movedUp);assert.equal(h.state.lesson.id,12);assert.equal(h.get("lesson-sort").value,"0");
  assert.equal(h.state.writeOutcomeUnknown,false);assert.equal(h.writes().length,1);assert.equal(h.dialogs.length,2);
  assert.equal(h.move(12,"down").disabled,false,"successful manual reconciliation must restore movement controls");
});
await scenario("editing during a successful response also preserves the new buffer if manual refresh is canceled",async()=>{
  const h=await harness(),seen=deferred(),gate=deferred();h.control.reorder=async()=>{seen.release();await gate.promise;return ok(receipt());};
  await h.click(h.move());await bounded(seen.promise);h.get("lesson-body").value="Novo texto local durante a espera.";
  const fields=h.fields();gate.release();await h.flush();h.control.accept=false;const requests=h.requests.length;
  await h.click("retry-catalog");assert.deepEqual(h.fields(),fields);assert.equal(h.requests.length,requests);assert.equal(h.writes().length,1);
});
await scenario("reorder invalidates preflight and a late diagnostic cannot restore readiness",async()=>{
  const h=await harness(),seen=deferred(),gate=deferred();
  h.control.hook=async request=>{
    if(request.path!=="/courses/1/publication-check")return undefined;
    seen.release();await gate.promise;return ok({course_id:1,version:7,lesson_count:3,ready:true,issues:[],warnings:[],content_hash:"a".repeat(64),advisory_only:true});
  };
  const pending=h.editor.publicationCheck();await bounded(seen.promise);await h.click(h.move());gate.release();await pending;
  assert.equal(h.get("publication-readiness").hidden,true);assert.equal(h.get("publication-readiness").children.length,0);
  assert.equal(h.state.overviewSnapshot,null);assert.equal(h.state.archive.versionsLoaded,false);assert.equal(h.writes().length,1);
});
for(const change of [
  h=>{h.state.catalogReady=false;},h=>{h.state.lessonsReady=false;},h=>{h.state.course.is_published=true;},
  h=>{h.state.lessons[0].status="published";},h=>{h.state.lessons[0].is_published=true;},
  h=>{h.state.writeOutcomeUnknown=true;},h=>{h.state.catalogLoading=true;},
])await scenario("unavailable, non-draft or unconfirmed snapshots cannot reorder",async()=>{
  const h=await harness(),button=h.move();change(h);h.editor.renderLessonReorderControls();
  assert.equal(h.move().disabled,true);await h.invoke(button);assert.equal(h.writes().length,0);
});
await scenario("known boundaries remain no-op even if the registered handler is invoked",async()=>{
  const h=await harness();await h.invoke(h.move(11,"up"));await h.invoke(h.move(13,"down"));
  assert.equal(h.writes().length,0);assert.deepEqual(h.order(),before);assert.equal(h.dialogs.length,0);
});
console.log("PASS lesson reorder UI: "+scenarios+" actual-script scenarios; canonical ties, exact receipts, no optimism/replay, sibling buffers, stale controls, manual recovery and revocation");
