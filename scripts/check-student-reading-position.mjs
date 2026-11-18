#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Complete real student script and registered handlers, with only its startup
// call removed. DOM/HTTP/download primitives are synthetic; no server starts.
const view=readFileSync(new URL("../resources/views/university/student.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
assert.ok(start>=0&&end>start);
const original=view.slice(start,end);assert.match(original,/\nloadLibrary\(\);\s*$/);
const exposed=["state","validatedReadingPosition","validatedReadingReceipt","sanitizedReadingPositionExport",
  "loadReadingPosition","writeReadingPosition","resumeReadingPosition","exportReadingPosition","renderReadingPosition",
  "loadLibrary","selectCourse","selectLesson","openCourseWithAllFilters","lockAccess"];
const source=original.replace(/\nloadLibrary\(\);\s*$/,"")+"\nglobalThis.student={"+exposed.join(",")+"};";
const copy=value=>JSON.parse(JSON.stringify(value));
const none=revision=>({schema_version:1,scope:"current_authenticated_student",status:"none",revision,position:null});
const target=(lesson_id=11,course_id=1,course_version=1)=>({course_id,course_version,lesson_id});
const available=(lesson_id=11,revision="opaque-slot-1",course_id=1,course_version=1)=>({
  ...none(revision),status:"available",position:{...target(lesson_id,course_id,course_version),saved_at:"2026-11-17T10:00:00Z"}});
const unavailable=(revision="opaque-slot-1")=>({...none(revision),status:"unavailable"});
function serverState(){
  const courses=[{id:1,slug:"curso-um",title:"Curso um 😀",summary:"Resumo",category:"metodologia",lessons_total:2,lessons_completed:0},
    {id:2,slug:"curso-dois",title:"Curso dois",summary:null,category:"negocios",lessons_total:1,lessons_completed:0}];
  const lessons=[11,12,21].map(id=>({id,slug:"aula-"+id,title:"Aula "+id,body:"Material sintético autorizado da aula "+id+".",
    sort_order:id%10,course_id:id===21?2:1,course_version:1}));
  return {courses,lessons,completed:new Set(),snapshot:none("opaque-initial-ticket"),retained:null,revision:0};
}
class Node {
  constructor(tag="div"){
    this.tag=tag;this.id="";this.className="";this.ownText="";this.children=[];this.events=new Map();this.attributes={};
    this.dataset={};this.value="";this.disabled=false;this.hidden=false;this.checked=false;this.open=false;this.parent=null;
  }
  set textContent(value){this.ownText=String(value);this.children=[];}
  get textContent(){return this.ownText+this.children.map(child=>child.textContent).join("");}
  append(...children){for(const node of children){node.parent=this;this.children.push(node);}}
  replaceChildren(...children){this.ownText="";this.children=[];this.append(...children);}
  addEventListener(event,handler){const handlers=this.events.get(event)||[];handlers.push(handler);this.events.set(event,handlers);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  removeAttribute(name){delete this.attributes[name];}
  focus(){this.focused=true;}
  scrollIntoView(){}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(item=>item!==this);}
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
  querySelectorAll(selector){return this.all().filter(node=>node.matches(selector));}
  querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
}
async function harness({server=serverState(),boot=true}={}){
  const nodes=new Map(),calls=[],downloads=[],objects=new Map(),timers=[],revoked=[];
  for(const match of view.slice(0,start).matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
    const node=new Node(match[1]);node.id=match[2];node.disabled=/\bdisabled\b/.test(match[0]);
    node.hidden=/\bhidden\b/.test(match[0]);nodes.set(node.id,node);
  }
  const content=nodes.get("lesson-content"),body=new Node("body");
  const get=id=>{
    const child=content.querySelector("#"+id);if(child)return child;
    if(!nodes.has(id)){const node=new Node();node.id=id;nodes.set(id,node);}return nodes.get(id);
  };
  const filters=["todos","metodologia","negocios","sistemas"].map(filter=>{const node=new Node("button");node.dataset.filter=filter;return node;});
  const sim=["sim-visits","sim-leads-rate","sim-clients-rate"].map(get);sim.forEach((node,i)=>{node.value=["1000","5","10"][i];});
  const control={read:null,write:null,export:null,fetch:null,onCreate:null};let urlId=0;
  const snapshot=()=>copy(server.snapshot);
  const context=createContext({TextEncoder,Blob,
    document:{body,getElementById:get,querySelector:selector=>selector.startsWith("meta")?{content:"synthetic-csrf"}:null,
      querySelectorAll:selector=>selector==="[data-filter]"?filters:selector===".sim-inputs input"?sim:[],
      createElement:tag=>{
        const node=new Node(tag);if(tag==="a")node.click=()=>downloads.push({filename:node.download,blob:objects.get(node.href)});return node;
      }},
    URL:{createObjectURL:blob=>{const url="blob:reading-"+(++urlId);objects.set(url,blob);control.onCreate?.();return url;},
      revokeObjectURL:url=>revoked.push(url)},
    setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimeout:()=>{},
    fetch:async(url,options)=>{
      const path=url.replace("/universidade/private","");
      const request={path,...options,body:options.body===undefined?null:JSON.parse(options.body)};calls.push(request);
      let result=control.fetch?await control.fetch(request):undefined;
      const resolve=async value=>typeof value==="function"?await value(request):value;
      if(result===undefined){
        if(path==="/initialize")result={status:200,payload:{ready:true}};
        else if(path==="/courses")result={status:200,payload:{courses:server.courses}};
        else if(path==="/favorites")result={status:200,payload:{course_ids:[]}};
        else if(path==="/reading-position"&&request.method==="GET")result=(await resolve(control.read))??{status:200,payload:snapshot()};
        else if(path==="/reading-position"&&["PUT","DELETE"].includes(request.method)){
          result=await resolve(control.write);
          if(!result){
            if(request.body.expected_revision!==server.snapshot.revision||
              (request.method==="DELETE"&&server.snapshot.status==="none"))result={status:409,payload:{error:"reading_position_changed"}};
            else{
              const revision="opaque-slot-"+(++server.revision);
              if(request.method==="DELETE"){server.snapshot=none(revision);server.retained=null;}
              else{
                const {course_id,course_version,lesson_id}=request.body;
                server.snapshot=available(lesson_id,revision,course_id,course_version);
                server.retained={course_slug:server.courses.find(row=>row.id===course_id).slug,course_version,
                  lesson_slug:"aula-"+lesson_id,saved_at:server.snapshot.position.saved_at};
              }
              result={status:200,payload:snapshot()};
            }
          }
        }else if(path==="/reading-position/export")result=(await resolve(control.export))??{status:200,payload:{
          schema_version:1,scope:"current_authenticated_student",reading_position:server.retained}};
        else if(/^\/courses\/\d+\/lessons$/.test(path)){
          const id=Number(path.split("/")[2]);result={status:200,payload:{lessons:server.lessons.filter(row=>row.course_id===id)
            .map(row=>({id:row.id,slug:row.slug,title:row.title,sort_order:row.sort_order,completed:server.completed.has(row.id)?1:0}))}};
        }else if(/^\/lessons\/\d+$/.test(path)){
          const lesson=server.lessons.find(row=>row.id===Number(path.split("/")[2]));result={status:lesson?200:404,payload:{lesson}};
        }else if(path.endsWith("/progress"))result={status:200,payload:{completed:server.completed.has(Number(path.split("/")[2]))}};
        else if(path.endsWith("/complete")){server.completed.add(Number(path.split("/")[2]));result={status:200,payload:{completed:true}};}
        else throw new Error("Unexpected test request: "+request.method+" "+path);
      }
      return {status:result.status,ok:result.status>=200&&result.status<300,json:async()=>result.json?await result.json():copy(result.payload)};
    },
  });
  new Script(source,{filename:"actual-student-reading-position"}).runInContext(context);
  const student=context.student;
  async function emit(node,event,extra={}){
    for(const handler of node.events.get(event)||[])await handler({preventDefault(){},target:node,...extra});await setImmediate();
  }
  if(boot){await student.loadLibrary();await setImmediate();await student.selectCourse(1);}
  return {student,state:student.state,server,control,get,content,filters,calls,downloads,objects,timers,revoked,
    click:id=>emit(typeof id==="string"?get(id):id,"click"),
    filter:category=>emit(filters.find(node=>node.dataset.filter===category),"click"),
    query:async value=>{get("course-search").value=value;await emit(get("course-search"),"input");},
    writes:()=>calls.filter(call=>call.path==="/reading-position"&&call.method!=="GET"),
    reads:()=>calls.filter(call=>call.path==="/reading-position"&&call.method==="GET"),
    output:async(index=0)=>JSON.parse(await downloads[index].blob.text())};
}
let scenarios=0;
async function scenario(label,run){try{await run();}catch(error){error.message=label+": "+error.message;throw error;}scenarios++;}
const parser=(await harness({boot:false})).student;

await scenario("reading snapshots retain only exact documented fields and an opaque revision",()=>{
  const payload=available();payload.person="private";payload.position.title="private-title";
  assert.equal(JSON.stringify(parser.validatedReadingPosition(payload)),JSON.stringify(available()));
  assert.equal(JSON.stringify(parser.validatedReadingPosition(none("opaque token 😀"))),JSON.stringify(none("opaque token 😀")));
  assert.ok(parser.validatedReadingPosition(none("a".repeat(2048))));
});
for(const input of [null,[],{}, {...none("x"),schema_version:"1"},{...none("x"),scope:"other"},
  {...none("x"),status:"false"},{...none("x"),revision:""},{...none("x"),revision:"a".repeat(2049)},
  {...none("x"),position:{}},{...unavailable(),position:available().position},
  {...available(),position:null},{...available(),position:{...available().position,course_id:"1"}},
  {...available(),position:{...available().position,lesson_id:0}},
  {...available(),position:{...available().position,course_version:Number.MAX_SAFE_INTEGER+1}},
  {...available(),position:{...available().position,saved_at:"yesterday"}}]){
  await scenario("malformed reading snapshot cannot authorize a write or navigation",()=>assert.equal(parser.validatedReadingPosition(input),null));
}
await scenario("receipts require a new opaque revision and the exact requested target or removal",()=>{
  assert.ok(parser.validatedReadingReceipt(available(11,"new"),target(),"old"));
  for(const input of [available(12,"new"),available(11,"old"),available(11,"new",2),available(11,"new",1,2),none("new"),unavailable("new")])
    assert.equal(parser.validatedReadingReceipt(input,target(),"old"),null);
  assert.ok(parser.validatedReadingReceipt(none("new"),null,"old"));
  assert.equal(parser.validatedReadingReceipt(unavailable("new"),null,"old"),null);
});
await scenario("initial read is independent and navigation never records a position",async()=>{
  const h=await harness();assert.equal(h.reads().length,1);assert.equal(h.writes().length,0);
  await h.student.selectLesson(12);await h.query("curso");await h.filter("negocios");
  assert.equal(h.reads().length,1);assert.equal(h.writes().length,0);
  assert.equal(h.get("reading-position-panel").hidden,false);
});
await scenario("explicit save is separate from completion and preserves filters",async()=>{
  const h=await harness();h.state.filter="metodologia";h.state.query="curso";
  await h.click("save-reading-position");
  assert.equal(h.writes().length,1);assert.equal(h.writes()[0].method,"PUT");
  assert.deepEqual(h.writes()[0].body,{...target(),expected_revision:"opaque-initial-ticket"});
  assert.equal(h.state.readingSnapshot.position.lesson_id,11);assert.equal(h.get("save-reading-position").disabled,true);
  assert.equal(h.state.filter,"metodologia");assert.equal(h.state.query,"curso");
  assert.equal(h.server.completed.size,0);assert.equal(h.content.querySelectorAll(".primary").length,1);
  await h.click(h.content.querySelector(".primary"));
  assert.equal(h.server.completed.has(11),true);assert.equal(h.writes().length,1);
  assert.equal(h.state.readingSnapshot.position.lesson_id,11);
});
await scenario("same saved lesson requires no new write and another lesson replaces it explicitly",async()=>{
  const h=await harness();await h.click("save-reading-position");await h.click("save-reading-position");
  assert.equal(h.writes().length,1);await h.student.selectLesson(12);
  assert.ok(h.get("reading-position-replace-hint").textContent.includes("substitui"));
  await h.click("save-reading-position");assert.equal(h.writes().length,2);
  assert.equal(h.state.readingSnapshot.position.lesson_id,12);
});
await scenario("empty initial position cannot be removed",async()=>{
  const h=await harness();await h.click("remove-reading-position");assert.equal(h.writes().length,0);
  assert.equal(h.get("remove-reading-position").hidden,true);
});
await scenario("an unavailable reference can be removed without opening an unavailable lesson",async()=>{
  const server=serverState();server.snapshot=unavailable();const h=await harness({server});
  assert.equal(h.get("resume-reading-position").hidden,true);await h.click("remove-reading-position");
  assert.equal(h.writes().length,1);assert.equal(h.writes()[0].method,"DELETE");
  assert.deepEqual(h.writes()[0].body,{expected_revision:"opaque-slot-1"});assert.equal(h.state.readingSnapshot.status,"none");
  assert.equal(h.content.querySelector("h3").textContent,"Aula 11");
});
await scenario("single-flight save is never optimistic",async()=>{
  const h=await harness();let release;h.control.write=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.student.writeReadingPosition(target(),h.state.lessonRequest);
  await h.click("save-reading-position");await h.click("remove-reading-position");await h.click("reload-reading-position");
  assert.equal(h.writes().length,1);assert.equal(h.reads().length,1);assert.equal(h.state.readingSnapshot,null);
  release({status:200,payload:available(11,"receipt")});await pending;
  assert.equal(h.state.readingSnapshot.position.lesson_id,11);
});
for(const status of [409,404,422])await scenario(status+" never renews a ticket or replays a write automatically",async()=>{
  const h=await harness();h.control.write={status,payload:{}};await h.click("save-reading-position");
  assert.equal(h.writes().length,1);assert.equal(h.reads().length,1);assert.equal(h.state.readingSnapshot,null);
  assert.equal(h.get("reload-reading-position").hidden,false);await h.click("save-reading-position");assert.equal(h.writes().length,1);
  h.control.write=null;await h.click("reload-reading-position");assert.equal(h.reads().length,2);assert.equal(h.writes().length,1);
  await h.click("save-reading-position");assert.equal(h.writes().length,2);
});
await scenario("two tabs reconcile a changed opaque token with a deliberate new action",async()=>{
  const server=serverState(),a=await harness({server}),b=await harness({server});await b.student.selectLesson(12);
  await a.click("save-reading-position");await b.click("save-reading-position");
  assert.equal(server.snapshot.position.lesson_id,11);assert.equal(b.reads().length,1);assert.equal(b.get("reload-reading-position").hidden,false);
  await b.click("reload-reading-position");await b.click("save-reading-position");
  assert.equal(server.snapshot.position.lesson_id,12);assert.equal(b.writes().length,2);
  await a.click("remove-reading-position");assert.equal(server.snapshot.position.lesson_id,12);assert.equal(a.reads().length,1);
});
for(const result of [{status:503,payload:{}},{status:200,payload:available(12,"wrong-receipt")}]){
  await scenario("lost or invalid receipt uses one authoritative GET without replay",async()=>{
    const h=await harness();h.control.write=()=>{h.server.snapshot=available(11,"committed");return result;};
    await h.click("save-reading-position");assert.equal(h.writes().length,1);assert.equal(h.reads().length,2);
    assert.equal(h.state.readingSnapshot.position.lesson_id,11);
    assert.ok(h.get("reading-position-status").textContent.includes("confirmada após consulta"));
  });
}
await scenario("uncertain write with failed reconciliation blocks changes until a manual query",async()=>{
  const h=await harness();h.control.write={status:503,payload:{}};h.control.read={status:503,payload:{}};
  await h.click("save-reading-position");await h.click("save-reading-position");
  assert.equal(h.writes().length,1);assert.equal(h.reads().length,2);assert.equal(h.state.readingUncertain,true);
  h.control.read=null;await h.click("reload-reading-position");assert.equal(h.state.readingUncertain,false);
});
await scenario("unavailable reconciliation does not claim that the intended lesson was saved",async()=>{
  const h=await harness();h.control.write={status:503,payload:{}};h.control.read={status:200,payload:unavailable("other")};
  await h.click("save-reading-position");assert.equal(h.state.readingSnapshot.status,"unavailable");
  assert.ok(h.get("reading-position-status").textContent.includes("anterior não pôde ser confirmada"));
});
await scenario("a pending read cannot delay lesson loading or completion",async()=>{
  const h=await harness({boot:false});let release;h.control.read=()=>new Promise(resolve=>{release=resolve;});
  await h.student.loadLibrary();await h.student.selectCourse(1);
  assert.equal(h.content.querySelector("h3").textContent,"Aula 11");assert.equal(h.content.querySelector(".primary").disabled,false);
  assert.equal(h.get("save-reading-position").disabled,true);release({status:200,payload:none("fresh")});await setImmediate();
  assert.equal(h.get("save-reading-position").disabled,false);
});
for(const read of [{status:503,payload:{}},{status:200,payload:{}}])await scenario("unavailable position state never blocks study or becomes empty success",async()=>{
  const h=await harness();h.control.read=read;await h.student.loadReadingPosition();
  assert.equal(h.state.readingSnapshot,null);assert.equal(h.get("save-reading-position").disabled,true);
  assert.equal(h.content.querySelector(".primary").disabled,false);assert.equal(h.get("export-reading-position").disabled,false);
  h.control.read=null;await h.click("reload-reading-position");assert.equal(h.state.readingSnapshot.status,"none");
});
await scenario("resume clears filters only after confirming the same exact reference",async()=>{
  const server=serverState();server.snapshot=available(12);const h=await harness({server});await h.query("absent");h.state.favoritesOnly=true;
  await h.click("resume-reading-position");await setImmediate();
  assert.equal(h.state.courseId,1);assert.equal(h.state.lessonId,12);assert.equal(h.state.query,"");assert.equal(h.state.favoritesOnly,false);
  assert.equal(h.content.querySelector("h3").textContent,"Aula 12");assert.equal(h.content.querySelector("h3").focused,true);
  assert.equal(h.writes().length,0);
});
await scenario("a changed or unavailable saved reference requires another click instead of redirecting",async()=>{
  const server=serverState();server.snapshot=available(12);const h=await harness({server});
  h.server.snapshot=available(21,"another",2);await h.click("resume-reading-position");
  assert.equal(h.state.lessonId,11);assert.equal(h.state.readingSnapshot.position.lesson_id,21);
  h.server.snapshot=unavailable("withdrawn");await h.click("resume-reading-position");
  assert.equal(h.state.lessonId,11);assert.equal(h.get("resume-reading-position").hidden,true);
});
await scenario("changing filters while resume GET is pending cancels its navigation",async()=>{
  const server=serverState();server.snapshot=available(12);const h=await harness({server});let release;
  h.control.read=()=>new Promise(resolve=>{release=resolve;});const pending=h.student.resumeReadingPosition();await h.filter("negocios");
  release({status:200,payload:available(12)});await pending;
  assert.equal(h.state.filter,"negocios");assert.equal(h.state.lessonId,null);assert.equal(h.state.readingSnapshot.position.lesson_id,12);
});
await scenario("a vanished lesson or a mismatched version never resumes a different lesson",async()=>{
  const h=await harness();await h.student.selectCourse(1,99,1);
  assert.equal(h.content.querySelector("h3"),null);assert.ok(h.content.textContent.includes("não está mais disponível"));
  await h.student.selectCourse(1,11,2);
  assert.equal(h.content.querySelector("h3"),null);assert.equal(h.content.querySelector(".primary"),null);
  assert.ok(h.get("status").textContent.includes("versão guardada"));
});
await scenario("lesson-list retry preserves both the exact ID and saved version",async()=>{
  const h=await harness();let fail=true;
  h.control.fetch=request=>request.path==="/courses/1/lessons"&&fail?{status:503,payload:{}}:undefined;
  await h.student.selectCourse(1,12,2);fail=false;await h.click(h.content.querySelector(".lesson-retry"));
  assert.equal(h.state.lessonId,12);assert.equal(h.content.querySelector("h3"),null);
  assert.ok(h.get("status").textContent.includes("versão guardada"));
});
await scenario("lesson-detail retry never discards its saved version constraint",async()=>{
  const h=await harness();let fail=true;
  h.control.fetch=request=>request.path==="/lessons/11"&&fail?{status:503,payload:{}}:undefined;
  await h.student.selectLesson(11,2);fail=false;await h.click(h.content.querySelector(".lesson-detail-retry"));
  assert.equal(h.content.querySelector("h3"),null);assert.equal(h.content.querySelector(".primary"),null);
  assert.ok(h.get("status").textContent.includes("versão guardada"));
});
await scenario("a late save receipt cannot mark the newly selected lesson as saved",async()=>{
  const h=await harness();let release;h.control.write=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.student.writeReadingPosition(target(),h.state.lessonRequest);await h.student.selectLesson(12);
  release({status:200,payload:available(11,"new")});await pending;
  assert.equal(h.state.lessonId,12);assert.equal(h.state.readingSnapshot,null);assert.equal(h.get("save-reading-position").disabled,true);
  assert.equal(h.get("reload-reading-position").hidden,false);
});
for(const status of [403,419])for(const operation of ["read","write","export"]){
  await scenario(status+" on "+operation+" clears the position and all private lesson state",async()=>{
    const h=await harness();h.control[operation]={status,payload:{}};
    if(operation==="read")await h.student.loadReadingPosition();
    else if(operation==="write")await h.click("save-reading-position");else await h.student.exportReadingPosition();
    assert.equal(h.state.accessDenied,true);assert.equal(h.state.readingSnapshot,null);assert.equal(h.get("reading-position-panel").hidden,true);
    assert.equal(h.get("reading-position-status").textContent,"");assert.equal(h.get("reading-position-export-status").textContent,"");
    assert.equal(h.content.querySelector("h3"),null);assert.equal(h.downloads.length,0);
  });
}
await scenario("a late position read cannot restore state after revocation",async()=>{
  const h=await harness();let release;h.control.read=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.student.loadReadingPosition();h.student.lockAccess("Revoked");release({status:200,payload:available()});await pending;
  assert.equal(h.state.readingSnapshot,null);assert.equal(h.get("reading-position-status").textContent,"");
});
await scenario("reauthorization keeps an invalidated GET single-flight until it settles, then offers manual recovery",async()=>{
  const h=await harness();let release;h.control.read=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.student.loadReadingPosition(),before=h.reads().length;
  await h.student.loadLibrary();await h.student.loadReadingPosition();assert.equal(h.reads().length,before);assert.equal(h.state.readingLoading,true);
  release({status:200,payload:available()});await pending;
  assert.equal(h.state.readingSnapshot,null);assert.equal(h.state.readingLoading,false);assert.equal(h.get("reload-reading-position").hidden,false);
  h.control.read=null;await h.click("reload-reading-position");assert.equal(h.reads().length,before+1);assert.ok(h.state.readingSnapshot);
});
await scenario("export allows an empty position and strips all extra fields from retained references",async()=>{
  const h=await harness();await h.student.exportReadingPosition();assert.deepEqual(await h.output(),{
    schema_version:1,scope:"current_authenticated_student",reading_position:null});
  const reference={course_slug:"curso-retirado",course_version:1,lesson_slug:"aula-antiga",saved_at:"2026-11-17T10:00:00Z"};
  h.control.export={status:200,payload:{schema_version:1,scope:"current_authenticated_student",revision:"secret-token",
    reading_position:{...reference,person:"private",lesson_id:99,title:"Hidden lesson"}}};
  await h.student.exportReadingPosition();assert.deepEqual(await h.output(1),{
    schema_version:1,scope:"current_authenticated_student",reading_position:reference});
  assert.equal(h.downloads[1].filename,"imagine-universidade-posicao-leitura.json");assert.equal(h.writes().length,0);
});
for(const reference of [undefined,[],{course_slug:"other/person",course_version:1,lesson_slug:"aula",saved_at:"2026-11-17"},
  {course_slug:"curso",course_version:"1",lesson_slug:"aula",saved_at:"2026-11-17"},
  {course_slug:"curso",course_version:1,lesson_slug:"aula",saved_at:"yesterday"}]){
  await scenario("invalid export reference never becomes a file",async()=>{
    const h=await harness();h.control.export={status:200,payload:{schema_version:1,scope:"current_authenticated_student",reading_position:reference}};
    await h.student.exportReadingPosition();assert.equal(h.downloads.length,0);assert.equal(h.get("export-reading-position").disabled,false);
  });
}
await scenario("invalidated export cannot overlap a new request or download after reauthorization",async()=>{
  const h=await harness();let release;h.control.export=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.student.exportReadingPosition();await h.student.loadLibrary();await h.student.exportReadingPosition();
  assert.equal(h.calls.filter(row=>row.path==="/reading-position/export").length,1);assert.equal(h.state.readingExportLoading,true);
  release({status:200,payload:{schema_version:1,scope:"current_authenticated_student",reading_position:null}});await pending;
  assert.equal(h.downloads.length,0);assert.equal(h.get("export-reading-position").disabled,false);
  h.control.export=null;await h.student.exportReadingPosition();assert.equal(h.downloads.length,1);
});
await scenario("a write invalidates an older export without replaying or overlapping it",async()=>{
  const h=await harness();let release;h.control.export=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.student.exportReadingPosition();await h.click("save-reading-position");
  release({status:200,payload:{schema_version:1,scope:"current_authenticated_student",reading_position:null}});await pending;
  assert.equal(h.downloads.length,0);assert.equal(h.writes().length,1);assert.equal(h.get("export-reading-position").disabled,false);
});
await scenario("late export after revocation creates no file and never restores status",async()=>{
  const h=await harness();let release;h.control.export=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.student.exportReadingPosition();h.student.lockAccess("Revoked");
  release({status:200,payload:{schema_version:1,scope:"current_authenticated_student",reading_position:null}});await pending;
  assert.equal(h.downloads.length,0);assert.equal(h.get("reading-position-export-status").textContent,"");
});
await scenario("opaque revisions and IDs never appear in status text or persistent browser storage",async()=>{
  const h=await harness();await h.click("save-reading-position");
  assert.ok(!h.get("reading-position-status").textContent.includes(h.state.readingSnapshot.revision));
  assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB/);
  assert.match(view,/id="resume-course"[^>]*>Continuar aulas pendentes/);
  assert.match(view,/id="reading-position-status"[^>]*role="status"[^>]*aria-live="polite"/);
});

console.log("PASS explicit reading position: "+scenarios+" actual-script scenarios; private opaque revisions, manual conflicts, exact version retries, reconciliation, independent study and guarded exports");
