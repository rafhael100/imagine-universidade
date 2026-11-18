#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Execute the entire real student script and registered handlers. Only its
// startup, DOM and HTTP boundaries are synthetic; no server or browser runs.
const view=readFileSync(new URL("../resources/views/university/student.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
assert.ok(start>=0&&end>start);const original=view.slice(start,end);
assert.match(original,/\nloadLibrary\(\);\s*$/);
const source=original.replace(/\nloadLibrary\(\);\s*$/,"")+"\nglobalThis.student={state,"+
  "validatedProgressHistory,progressHistoryTimestamp,renderProgressHistory,invalidateProgressHistory,loadProgressHistory,"+
  "loadLibrary,selectCourse,selectLesson,renderCourses,lockAccess,sanitizedProgressExport};";
const clone=value=>JSON.parse(JSON.stringify(value));
const ok=payload=>({status:200,payload});
const row=(completion_id=100,changes={})=>({completion_id,course_slug:"curso-"+completion_id,course_version:1,
  lesson_slug:"aula-"+completion_id,completed_at:"2026-11-17T12:34:56Z",availability:"unavailable",...changes});
const envelope=(completions=[row()],next_before_id=null)=>({schema_version:1,scope:"current_authenticated_student",completions,next_before_id});
const course=id=>({id,slug:"curso-"+id,title:"Título atual privado "+id,summary:"Resumo atual",category:id===1?"metodologia":"negocios",
  lessons_total:1,lessons_completed:0});
const lesson=id=>({id,course_id:Math.floor(id/10),course_version:id===11?2:1,slug:"aula-"+Math.floor(id/10),title:"Aula atual "+id,
  sort_order:0,body:"Conteúdo autorizado atual da aula "+id+"."});
function deferred(){let release;const promise=new Promise(resolve=>{release=resolve;});return {promise,release};}
class Node{
  constructor(tag="div"){
    this.tag=tag;this.id="";this.className="";this.ownText="";this.children=[];this.events=new Map();this.dataset={};
    this.attributes={};this.value="";this.disabled=false;this.hidden=false;this.checked=false;this.open=false;this.parent=null;
  }
  set textContent(value){this.ownText=String(value);this.children=[];}
  get textContent(){return this.ownText+this.children.map(child=>child.textContent).join("");}
  append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
  replaceChildren(...children){this.ownText="";this.children=[];this.append(...children);}
  addEventListener(type,handler){const handlers=this.events.get(type)||[];handlers.push(handler);this.events.set(type,handlers);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  removeAttribute(name){delete this.attributes[name];}
  focus(){}
  scrollIntoView(){}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
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
async function harness({boot=true,select=true}={}){
  const nodes=new Map(),calls=[],storageCalls=[];
  for(const match of view.slice(0,start).matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
    const node=new Node(match[1]);node.id=match[2];node.hidden=/\bhidden\b/.test(match[0]);node.disabled=/\bdisabled\b/.test(match[0]);nodes.set(node.id,node);
  }
  const content=nodes.get("lesson-content");
  const get=id=>{const child=content.querySelector("#"+id);if(child)return child;
    if(!nodes.has(id)){const node=new Node();node.id=id;nodes.set(id,node);}return nodes.get(id);};
  const filters=["todos","metodologia","negocios","sistemas"].map(category=>{const node=new Node("button");node.dataset.filter=category;return node;});
  const sim=["sim-visits","sim-leads-rate","sim-clients-rate"].map(get);sim.forEach((node,index)=>{node.value=["1000","5","10"][index];});
  const server={courses:[course(1),course(2)],completed:new Set([21]),rows:[
    row(100,{course_slug:"curso-1",course_version:1,lesson_slug:"aula-1"}),
    row(80,{course_slug:"curso-2",lesson_slug:"aula-2",availability:"available"})]};
  const control={history:null,complete:null,progress:null,courses:null};
  const storage=Object.fromEntries(["getItem","setItem","removeItem","clear"].map(method=>[method,()=>{
    storageCalls.push(method);throw new Error("Unexpected persistent history");
  }]));
  const context=createContext({Blob,URL,TextEncoder,localStorage:storage,sessionStorage:storage,setTimeout,clearTimeout,
    document:{body:new Node("body"),getElementById:get,createElement:tag=>new Node(tag),
      querySelector:selector=>selector.startsWith("meta")?{content:"synthetic-csrf"}:null,
      querySelectorAll:selector=>selector==="[data-filter]"?filters:selector===".sim-inputs input"?sim:[]},
    fetch:async(url,options)=>{
      const parsed=new URL(url,"http://127.0.0.1"),path=parsed.pathname.replace("/universidade/private","");
      const entry={path,query:parsed.search,...options};calls.push(entry);
      const resolve=async value=>typeof value==="function"?await value(entry):value;let result;
      if(path==="/initialize")result=ok({ready:true});
      else if(path==="/courses")result=(await resolve(control.courses))??ok({courses:server.courses.map(row=>({
        ...row,lessons_completed:server.completed.has(row.id*10+1)?1:0}))});
      else if(path==="/favorites")result=ok({course_ids:[1]});
      else if(path==="/reading-position")result=ok({schema_version:1,scope:"current_authenticated_student",status:"none",revision:"synthetic-position",position:null});
      else if(path==="/progress/history"){
        result=await resolve(control.history);
        if(result==null){const before=parsed.searchParams.has("before_id")?Number(parsed.searchParams.get("before_id")):Infinity;
          const rows=server.rows.filter(row=>row.completion_id<before).sort((a,b)=>b.completion_id-a.completion_id).slice(0,51);
          result=ok(envelope(rows.slice(0,50),rows.length>50?rows[49].completion_id:null));}
      }else if(/^\/courses\/\d+\/lessons$/.test(path)){
        const id=Number(path.split("/")[2])*10+1,item=lesson(id);
        result=ok({lessons:[{id,slug:item.slug,title:item.title,sort_order:0,completed:server.completed.has(id)?1:0}]});
      }else if(/^\/lessons\/\d+$/.test(path))result=ok({lesson:lesson(Number(path.split("/")[2]))});
      else if(path.endsWith("/progress"))result=(await resolve(control.progress))??ok({completed:server.completed.has(Number(path.split("/")[2]))});
      else if(path.endsWith("/complete")&&entry.method==="POST"){
        result=await resolve(control.complete);
        if(result==null){const id=Number(path.split("/")[2]),item=lesson(id);server.completed.add(id);
          server.rows.push(row(200,{course_slug:"curso-"+item.course_id,course_version:item.course_version,lesson_slug:item.slug,availability:"available"}));
          result=ok({completed:true});}
      }else throw new Error("Unexpected history fixture request: "+entry.method+" "+path);
      return {status:result.status,ok:result.status>=200&&result.status<300,json:async()=>result.json?await result.json():clone(result.payload)};
    }});
  new Script(source,{filename:"actual-student-progress-history"}).runInContext(context);
  const student=context.student;
  async function emit(node,type){
    for(let current=node;current;current=current.parent)for(const handler of current.events.get(type)||[])await handler({target:node,preventDefault(){}});
    await setImmediate();
  }
  if(boot){await student.loadLibrary();await setImmediate();if(select)await student.selectCourse(1);}
  return {student,state:student.state,server,control,calls,get,content,storageCalls,
    click:node=>emit(typeof node==="string"?get(node):node,"click"),
    rows:()=>get("progress-history-list").querySelectorAll("[data-completion-id]"),
    text:()=>get("progress-history-status").textContent,
    reads:()=>calls.filter(call=>call.path==="/progress/history"),
    writes:()=>calls.filter(call=>call.method!=="GET"&&call.path!=="/initialize"),
    complete:()=>emit(content.querySelector(".primary"),"click")};
}
let scenarios=0;
async function scenario(label,run){try{await run();}catch(error){error.message=label+": "+error.message;throw error;}scenarios++;}
const parser=(await harness({boot:false})).student;

await scenario("allowlist retains only own reference fields and the exact schema",()=>{
  const input={...envelope([row()]),identity:"private",title:"private",body:"private"};
  Object.assign(input.completions[0],{course_id:4,lesson_id:7,subject_key:"private",title:"private",body:"private"});
  assert.deepEqual(clone(parser.validatedProgressHistory(input)),{completions:[row()],next_before_id:null});
});
await scenario("a valid empty page and maximum safe identifiers are accepted",()=>{
  assert.deepEqual(clone(parser.validatedProgressHistory(envelope([]))),{completions:[],next_before_id:null});
  assert.equal(parser.validatedProgressHistory(envelope([row(Number.MAX_SAFE_INTEGER,{course_version:Number.MAX_SAFE_INTEGER,
    course_slug:"a".repeat(120),lesson_slug:"b".repeat(120)})])).completions.length,1);
});
await scenario("the same slugs in different versions remain separate historical references",()=>{
  const first=row(100,{course_slug:"curso",lesson_slug:"aula",course_version:1});
  const second={...first,completion_id:90,course_version:2};
  assert.equal(parser.validatedProgressHistory(envelope([first,second])).completions.length,2);
});
await scenario("pagination has no invented 5000-record total cap",()=>{
  const previous=Array.from({length:5001},(_,index)=>row(10000-index));
  const page=Array.from({length:50},(_,index)=>row(4999-index));
  assert.equal(parser.validatedProgressHistory(envelope(page,4950),5000,previous).completions.length,50);
});
for(const [label,values] of [
  ["envelope",[null,[],{}, {...envelope(),schema_version:"1"},{...envelope(),schema_version:2},
    {...envelope(),scope:"other_student"},{...envelope(),completions:null},{...envelope(),next_before_id:undefined}]],
  ["identifier",[0,-1,1.5,"100",Number.MAX_SAFE_INTEGER+1].map(completion_id=>envelope([row(100,{completion_id})]))],
  ["version",[0,-1,1.5,"1",Number.MAX_SAFE_INTEGER+1].map(course_version=>envelope([row(100,{course_version})]))],
  ["slug",["","Curso","-curso","curso--a","outro/curso","cursó","a".repeat(121),123].map(course_slug=>envelope([row(100,{course_slug})]))],
  ["UTC timestamp",[null,"2026-11-17","2026-11-17 12:34:56","2026-11-17T12:34:56+00:00",
    "2026-02-30T12:34:56Z","2026-13-01T12:34:56Z","2026-11-17T25:00:00Z","2026-11-17T12:34:56.000Z"].map(completed_at=>envelope([row(100,{completed_at})]))],
  ["availability",[false,"false","withdrawn",null,undefined].map(availability=>envelope([row(100,{availability})]))],
])await scenario("invalid "+label+" rejects the complete response",()=>{for(const input of values)assert.equal(parser.validatedProgressHistory(input),null);});
await scenario("missing row fields and invalid lesson slugs never become partial references",()=>{
  for(const key of Object.keys(row())){const item=row();delete item[key];assert.equal(parser.validatedProgressHistory(envelope([item])),null);}
  for(const lesson_slug of ["","other/lesson","a".repeat(121),null])assert.equal(parser.validatedProgressHistory(envelope([row(100,{lesson_slug})])),null);
});
await scenario("duplicate IDs and duplicate reference tuples are both rejected",()=>{
  assert.equal(parser.validatedProgressHistory(envelope([row(100),row(100,{lesson_slug:"other"})])),null);
  assert.equal(parser.validatedProgressHistory(envelope([row(100),{...row(100),completion_id:90}])),null);
  assert.equal(parser.validatedProgressHistory(envelope([{...row(100),completion_id:80}]),90,[row(100)]),null);
});
await scenario("descending order and the exclusive cursor hold across pages",()=>{
  assert.equal(parser.validatedProgressHistory(envelope([row(90),row(100)])),null);
  assert.equal(parser.validatedProgressHistory(envelope([row(90)]),90),null);
  assert.equal(parser.validatedProgressHistory(envelope([row(100)]),90),null);
  assert.equal(parser.validatedProgressHistory(envelope([row(80)]),90,[row(100)]).completions[0].completion_id,80);
});
await scenario("the next cursor requires exactly fifty ordered rows and equals the final ID",()=>{
  const page=Array.from({length:50},(_,index)=>row(100-index));
  assert.equal(parser.validatedProgressHistory(envelope(page,51)).next_before_id,51);
  assert.equal(parser.validatedProgressHistory(envelope(page)).next_before_id,null);
  for(const next of [50,52,0,"51",false,undefined])assert.equal(parser.validatedProgressHistory({...envelope(page),next_before_id:next}),null);
  assert.equal(parser.validatedProgressHistory(envelope(page.slice(0,49),52)),null);
  assert.equal(parser.validatedProgressHistory(envelope([...page,row(50)])),null);
});
await scenario("the global panel stays manual and collapsed after startup or opening details",async()=>{
  const h=await harness();assert.equal(h.get("progress-history-panel").tag,"details");
  assert.equal(h.get("progress-history-panel").hidden,false);assert.equal(h.get("progress-history-panel").open,false);
  assert.equal(h.reads().length,0);await h.click("progress-history-panel");assert.equal(h.reads().length,0);
  await h.click("reload-progress-history");assert.equal(h.reads().length,1);assert.equal(h.rows().length,2);
  assert.equal(h.writes().length,0);assert.equal(h.storageCalls.length,0);
});
await scenario("a query preserves current study filters preferences and the v1 export format",async()=>{
  const h=await harness();h.state.query="gestão";h.state.filter="metodologia";h.state.favoritesOnly=true;
  const snapshot=clone({courses:h.state.courses,courseId:h.state.courseId,lessonId:h.state.lessonId,query:h.state.query,
    filter:h.state.filter,favoritesOnly:h.state.favoritesOnly,favoriteIds:h.state.favoriteIds,reading:h.state.readingSnapshot});
  const content=h.content.textContent;await h.student.loadProgressHistory();
  assert.deepEqual(clone({courses:h.state.courses,courseId:h.state.courseId,lessonId:h.state.lessonId,query:h.state.query,
    filter:h.state.filter,favoritesOnly:h.state.favoritesOnly,favoriteIds:h.state.favoriteIds,reading:h.state.readingSnapshot}),snapshot);
  assert.equal(h.content.textContent,content);assert.equal(h.reads()[0].method,"GET");assert.equal(h.reads()[0].cache,"no-store");
  assert.equal(h.reads()[0].credentials,"same-origin");assert.equal(h.reads()[0].body,undefined);
  const exported={schema_version:1,scope:"current_authenticated_student",completions:[{
    course_slug:"curso-1",lesson_slug:"aula-1",course_version:1,completed_at:"2026-11-17 12:34:56"}]};
  assert.deepEqual(clone(h.student.sanitizedProgressExport(exported)),exported);
});
await scenario("rows show only references UTC dates and authoritative availability, with no navigation or deletion",async()=>{
  const h=await harness();h.control.history=ok(envelope([row(100,{course_slug:"curso-1",lesson_slug:"aula-1",
    title:"PRIVATE_TITLE",body:"PRIVATE_BODY",subject_key:"PRIVATE_PERSON"})]));await h.student.loadProgressHistory();
  const list=h.get("progress-history-list");assert.match(list.textContent,/Curso: curso-1/);assert.match(list.textContent,/Versão da aula: 1/);
  assert.match(list.textContent,/indisponível/);assert.doesNotMatch(list.textContent,/Título atual|PRIVATE_|Conteúdo autorizado/);
  assert.equal(list.querySelectorAll("a").length,0);assert.equal(list.querySelectorAll("button").length,0);
  assert.equal(list.querySelector("time").attributes.datetime,"2026-11-17T12:34:56Z");assert.match(list.textContent,/\(UTC\)/);
});
await scenario("a pending read blocks duplicate queries without blocking study",async()=>{
  const h=await harness(),held=deferred();h.control.history=()=>held.promise;
  const pending=h.student.loadProgressHistory();assert.equal(h.get("reload-progress-history").disabled,true);
  await h.click("reload-progress-history");await h.student.loadProgressHistory(true);assert.equal(h.reads().length,1);
  await h.student.selectCourse(2);assert.equal(h.state.lessonId,21);
  held.release(ok(envelope([row(75)])));await pending;
  assert.equal(h.rows().length,1);assert.equal(h.state.courseId,2);assert.equal(h.state.lessonId,21);assert.equal(h.writes().length,0);
});
await scenario("pagination continues after the cursor reference disappears and never fetches automatically",async()=>{
  const h=await harness();h.server.rows=Array.from({length:51},(_,index)=>row(200-index));
  await h.click("reload-progress-history");assert.equal(h.rows().length,50);assert.equal(h.reads().length,1);
  assert.equal(h.state.progressHistory.nextBefore,151);h.server.rows=h.server.rows.filter(row=>row.completion_id!==151);
  await h.click("more-progress-history");assert.equal(h.reads()[1].query,"?before_id=151");assert.equal(h.rows().length,51);
  assert.equal(h.state.progressHistory.rows.at(-1).completion_id,150);assert.equal(h.get("more-progress-history").hidden,true);
});
await scenario("newer records appear only after an explicit refresh, without claiming a frozen total",async()=>{
  const h=await harness();h.server.rows=Array.from({length:51},(_,index)=>row(200-index));await h.student.loadProgressHistory();
  h.server.rows.unshift(row(201));await h.student.loadProgressHistory(true);
  assert.equal(h.state.progressHistory.rows.some(row=>row.completion_id===201),false);assert.match(h.text(),/Atualize o histórico/);
  await h.click("reload-progress-history");assert.equal(h.state.progressHistory.rows[0].completion_id,201);
  assert.equal(h.state.progressHistory.rows.length,50);assert.equal(h.reads().length,3);
});
await scenario("a valid empty catalog can still show retained completion references",async()=>{
  const h=await harness({boot:false});h.server.courses=[];h.server.rows.forEach(row=>{row.availability="unavailable";});
  await h.student.loadLibrary();await setImmediate();
  await h.student.loadProgressHistory();assert.equal(h.get("progress-history-panel").hidden,false);assert.equal(h.rows().length,2);
  assert.equal(h.state.courseId,null);assert.equal(h.writes().length,0);
});
for(const failure of [{status:503,payload:{}},ok({}),ok(envelope([row(100),row(100)]))]){
  await scenario("failure stays unavailable and manual retry can accept an empty history",async()=>{
    const h=await harness();h.control.history=failure;await h.click("reload-progress-history");
    assert.equal(h.rows().length,0);assert.equal(h.state.progressHistory.ready,false);assert.match(h.text(),/Não foi possível/);
    assert.doesNotMatch(h.text(),/Nenhuma conclusão/);assert.equal(h.get("reload-progress-history").disabled,false);
    h.control.history=ok(envelope([]));await h.click("reload-progress-history");assert.equal(h.state.progressHistory.ready,true);
    assert.match(h.text(),/Nenhuma conclusão encontrada nesta consulta/);assert.equal(h.reads().length,2);assert.equal(h.writes().length,0);
  });
}
await scenario("an invalid later page rejects the snapshot rather than silently omitting broken rows",async()=>{
  const h=await harness();h.server.rows=Array.from({length:51},(_,index)=>row(200-index));await h.student.loadProgressHistory();
  h.control.history=ok(envelope([row(200)]));await h.student.loadProgressHistory(true);
  assert.equal(h.rows().length,0);assert.equal(h.state.progressHistory.nextBefore,null);assert.equal(h.state.progressHistory.ready,false);
});
await scenario("history reads do not reconcile uncertain favorites or a reading position",async()=>{
  const h=await harness();h.state.favoriteOutcomeUnknown=true;h.state.retained.needsRefresh=true;h.state.readingUncertain=true;
  await h.student.loadProgressHistory();assert.equal(h.state.favoriteOutcomeUnknown,true);
  assert.equal(h.state.retained.needsRefresh,true);assert.equal(h.state.readingUncertain,true);assert.equal(h.writes().length,0);
});
await scenario("library invalidation and an old finally cannot restore rows or release a new query",async()=>{
  const h=await harness(),first=deferred(),second=deferred();let count=0;
  h.control.history=()=>++count===1?{status:200,json:()=>first.promise}:second.promise;
  const old=h.student.loadProgressHistory();await setImmediate();await h.student.loadLibrary();await setImmediate();
  assert.equal(h.rows().length,0);const current=h.student.loadProgressHistory();assert.equal(h.state.progressHistory.loading,true);
  first.release(envelope([row(10)]));await old;assert.equal(h.state.progressHistory.loading,true);assert.equal(h.rows().length,0);
  second.release(ok(envelope([row(20)])));await current;assert.equal(h.state.progressHistory.rows[0].completion_id,20);
});
await scenario("starting a completion invalidates an earlier read before its payload arrives",async()=>{
  const h=await harness(),read=deferred(),write=deferred();h.control.history=()=>read.promise;h.control.complete=()=>write.promise;
  const old=h.student.loadProgressHistory(),pending=h.complete();assert.equal(h.state.progressHistory.loading,false);assert.equal(h.rows().length,0);
  read.release(ok(envelope([row(10)])));await old;assert.equal(h.state.progressHistory.ready,false);
  write.release(ok({completed:true}));await pending;assert.equal(h.reads().length,1);assert.equal(h.writes().length,1);
  assert.equal(h.rows().length,0);assert.match(h.text(),/Consulte novamente/);
});
await scenario("completion settlement invalidates a read started during the POST without another automatic query",async()=>{
  const h=await harness(),write=deferred();h.control.complete=()=>write.promise;
  const pending=h.complete();await h.student.loadProgressHistory();assert.equal(h.rows().length,2);
  write.release(ok({completed:true}));await pending;assert.equal(h.state.progressHistory.ready,false);assert.equal(h.rows().length,0);
  assert.equal(h.reads().length,1);assert.equal(h.writes().length,1);assert.equal(h.content.querySelector(".primary").disabled,true);
});
await scenario("a read still pending at completion settlement cannot restore the old history",async()=>{
  const h=await harness(),write=deferred(),read=deferred();h.control.complete=()=>write.promise;h.control.history=()=>read.promise;
  const pending=h.complete(),lookup=h.student.loadProgressHistory();assert.equal(h.state.progressHistory.loading,true);
  write.release(ok({completed:true}));await pending;assert.equal(h.state.progressHistory.loading,false);
  read.release(ok(envelope([row(10)])));await lookup;assert.equal(h.rows().length,0);assert.equal(h.state.progressHistory.ready,false);
  assert.equal(h.reads().length,1);assert.equal(h.writes().length,1);
});
for(const receipt of [ok({completed:true}),{status:503,payload:{}}])await scenario("a late completion result invalidates global history while preserving a newly selected lesson: "+receipt.status,async()=>{
  const h=await harness(),write=deferred();h.control.complete=()=>write.promise;
  const pending=h.complete();await h.student.selectCourse(2);await h.student.loadProgressHistory();const content=h.content.textContent;
  write.release(receipt);await pending;
  assert.equal(h.state.courseId,2);assert.equal(h.state.lessonId,21);assert.equal(h.content.textContent,content);
  assert.equal(h.rows().length,0);assert.equal(h.state.progressHistory.ready,false);assert.equal(h.writes().length,1);
});
await scenario("uncertain completion still requires its existing reconciliation and history absence proves nothing",async()=>{
  const h=await harness();await h.student.loadProgressHistory();h.control.complete={status:503,payload:{}};
  h.control.progress={status:503,payload:{}};await h.complete();assert.equal(h.rows().length,0);
  assert.equal(h.content.querySelector(".primary").disabled,true);const message=h.get("status").textContent;
  assert.match(message,/Não foi possível confirmar/);h.control.history=ok(envelope([]));await h.student.loadProgressHistory();
  assert.equal(h.content.querySelector(".primary").disabled,true);assert.equal(h.get("status").textContent,message);
  assert.equal(h.writes().length,1);assert.equal(h.calls.filter(call=>call.path==="/lessons/11/progress").length,2);
});
await scenario("a confirmed completion appears only through a subsequent manual authoritative query",async()=>{
  const h=await harness();await h.student.loadProgressHistory();await h.complete();
  assert.equal(h.reads().length,1);assert.equal(h.rows().length,0);assert.equal(h.state.progressHistory.ready,false);
  await h.click("reload-progress-history");assert.equal(h.state.progressHistory.rows[0].completion_id,200);
  assert.equal(h.state.progressHistory.rows[0].course_version,2);assert.equal(h.writes().length,1);
});
for(const status of [403,419]){
  await scenario("authorization denial purges and closes history and prevents further requests: "+status,async()=>{
    const h=await harness();await h.student.loadProgressHistory();h.get("progress-history-panel").open=true;
    h.control.history={status,payload:{}};await h.student.loadProgressHistory();assert.equal(h.state.accessDenied,true);
    assert.equal(h.rows().length,0);assert.equal(h.get("progress-history-panel").hidden,true);
    assert.equal(h.get("progress-history-panel").open,false);assert.equal(h.text(),"");
    assert.equal(h.get("reload-progress-history").disabled,true);assert.equal(h.get("more-progress-history").disabled,true);
    const count=h.calls.length;await h.click("reload-progress-history");await h.click("more-progress-history");assert.equal(h.calls.length,count);
  });
}
await scenario("the completion finally does not repopulate history messages after revocation",async()=>{
  const h=await harness();await h.student.loadProgressHistory();h.control.complete={status:403,payload:{}};await h.complete();
  assert.equal(h.state.accessDenied,true);assert.equal(h.state.progressHistory.message,"");assert.equal(h.text(),"");assert.equal(h.rows().length,0);
});
await scenario("late JSON cannot restore historical references after access is revoked",async()=>{
  const h=await harness(),held=deferred();h.control.history={status:200,json:()=>held.promise};
  const pending=h.student.loadProgressHistory();await setImmediate();h.student.lockAccess("Acesso encerrado");
  held.release(envelope([row()]));await pending;assert.equal(h.rows().length,0);assert.equal(h.state.progressHistory.rows.length,0);
  assert.equal(h.text(),"");assert.equal(h.get("progress-history-panel").hidden,true);
});
console.log("PASS private progress history: "+scenarios+" actual-script scenarios; allowlisted references, manual pages, exact versions, independent study, completion invalidation and revocation");
