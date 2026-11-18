#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Run the complete real student script and its registered handlers. Only DOM,
// HTTP and browser primitives are synthetic; no server or browser is started.
const view=readFileSync(new URL("../resources/views/university/student.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
assert.ok(start>=0&&end>start);
const original=view.slice(start,end);assert.match(original,/\nloadLibrary\(\);\s*$/);
const exposed=["state","validatedRetainedFavorites","retainedTimestamp","loadRetainedFavorites","removeRetainedFavorite",
  "renderRetainedFavorites","loadFavorites","toggleCourseFavorite","loadLibrary","selectCourse","selectLesson","lockAccess"];
const source=original.replace(/\nloadLibrary\(\);\s*$/,"")+"\nglobalThis.student={"+exposed.join(",")+"};";
const clone=value=>JSON.parse(JSON.stringify(value));
const row=(course_id=1,availability="available")=>({
  course_id,course_slug:"curso-"+course_id,saved_at:"2026-11-17T12:34:56Z",availability});
const envelope=(favorites=[row(),row(3,"unavailable"),row(70,"unavailable")],next=null)=>({
  schema_version:1,scope:"current_authenticated_student",favorites,next_after_course_id:next});
const ok=payload=>({status:200,payload});
function deferred(){
  let release;const promise=new Promise(resolve=>{release=resolve;});return {promise,release};
}
class Node{
  constructor(tag="div"){
    this.tag=tag;this.id="";this.className="";this.ownText="";this.children=[];this.events=new Map();
    this.attributes={};this.dataset={};this.value="";this.disabled=false;this.hidden=false;this.checked=false;
    this.open=false;this.parent=null;
  }
  set textContent(value){this.ownText=String(value);this.children=[];}
  get textContent(){return this.ownText+this.children.map(child=>child.textContent).join("");}
  append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
  replaceChildren(...children){this.ownText="";this.children=[];this.append(...children);}
  addEventListener(event,handler){const list=this.events.get(event)||[];list.push(handler);this.events.set(event,list);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  removeAttribute(name){delete this.attributes[name];}
  focus(){}
  scrollIntoView(){}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);}
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
async function harness({boot=true}={}){
  const nodes=new Map(),calls=[];
  for(const match of view.slice(0,start).matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
    const node=new Node(match[1]);node.id=match[2];node.disabled=/\bdisabled\b/.test(match[0]);
    node.hidden=/\bhidden\b/.test(match[0]);nodes.set(node.id,node);
  }
  const content=nodes.get("lesson-content");
  const get=id=>{
    const child=content.querySelector("#"+id);if(child)return child;
    if(!nodes.has(id)){const node=new Node();node.id=id;nodes.set(id,node);}return nodes.get(id);
  };
  const filters=["todos","metodologia","negocios","sistemas"].map(filter=>{
    const node=new Node("button");node.dataset.filter=filter;return node;
  });
  const sim=["sim-visits","sim-leads-rate","sim-clients-rate"].map(get);
  sim.forEach((node,index)=>{node.value=["1000","5","10"][index];});
  const server={courses:[1,2,3].map(id=>({id,slug:"curso-"+id,title:"Título atual "+id,summary:"Resumo atual",
    category:"metodologia",lessons_total:1,lessons_completed:0})),rows:envelope().favorites};
  const control={retained:null,favorites:null,write:null,fetch:null};
  const context=createContext({Blob,TextEncoder,URL,
    document:{body:new Node("body"),getElementById:get,createElement:tag=>new Node(tag),
      querySelector:selector=>selector.startsWith("meta")?{content:"synthetic-csrf"}:null,
      querySelectorAll:selector=>selector==="[data-filter]"?filters:selector===".sim-inputs input"?sim:[]},
    setTimeout:()=>1,clearTimeout:()=>{},
    fetch:async(url,options)=>{
      const parsed=new URL(url,"http://127.0.0.1"),path=parsed.pathname.replace("/universidade/private","");
      const request={path,query:parsed.search,...options,body:options.body===undefined?null:JSON.parse(options.body)};
      calls.push(request);
      const resolve=async value=>typeof value==="function"?await value(request):value;
      let result=await resolve(control.fetch);
      if(result==null){
        if(path==="/initialize")result=ok({ready:true});
        else if(path==="/courses")result=ok({courses:server.courses});
        else if(path==="/favorites"){
          result=(await resolve(control.favorites))??ok({course_ids:server.rows.filter(row=>row.availability==="available").map(row=>row.course_id)});
        }else if(path==="/favorites/retained"){
          result=await resolve(control.retained);
          if(result==null){
            const after=Number(parsed.searchParams.get("after_course_id")||0);
            const rows=server.rows.filter(row=>row.course_id>after).sort((a,b)=>a.course_id-b.course_id).slice(0,51);
            result=ok(envelope(rows.slice(0,50),rows.length>50?rows[49].course_id:null));
          }
        }else if(/^\/courses\/\d+\/favorite$/.test(path)){
          result=await resolve(control.write);
          if(result==null){
            const id=Number(path.split("/")[2]),favorite=request.method==="PUT";
            server.rows=server.rows.filter(row=>row.course_id!==id);
            if(favorite)server.rows.push(row(id));
            result=ok({course_id:id,favorite});
          }
        }else if(path==="/reading-position")result=ok({schema_version:1,scope:"current_authenticated_student",
          status:"none",revision:"synthetic-absence",position:null});
        else if(/^\/courses\/\d+\/lessons$/.test(path)){
          const id=Number(path.split("/")[2])*10+1;
          result=ok({lessons:[{id,slug:"aula-"+id,title:"Aula "+id,sort_order:0,completed:0}]});
        }else if(/^\/lessons\/\d+$/.test(path)){
          const id=Number(path.split("/")[2]);
          result=ok({lesson:{id,slug:"aula-"+id,title:"Aula "+id,sort_order:0,course_id:Math.floor(id/10),
            course_version:1,body:"Conteúdo sintético autorizado da aula."}});
        }else if(path.endsWith("/progress"))result=ok({completed:false});
        else throw new Error("Unexpected synthetic request: "+request.method+" "+path);
      }
      return {status:result.status,ok:result.status>=200&&result.status<300,
        json:async()=>result.json?await result.json():clone(result.payload)};
    }
  });
  new Script(source,{filename:"actual-student-retained-favorites"}).runInContext(context);
  const student=context.student;
  async function emit(node,event,extra={}){
    for(let current=node;current;current=current.parent){
      for(const handler of current.events.get(event)||[])await handler({target:node,preventDefault(){},...extra});
    }
    await setImmediate();
  }
  if(boot){await student.loadLibrary();await setImmediate();await student.selectCourse(1);}
  const rows=()=>get("retained-favorites-list").querySelectorAll("[data-retained-course-id]");
  const removeButton=id=>get("retained-favorites-list").querySelectorAll("[data-remove-retained-favorite]")
    .find(node=>Number(node.dataset.removeRetainedFavorite)===id);
  return {student,state:student.state,get,calls,control,server,content,rows,removeButton,
    click:id=>emit(typeof id==="string"?get(id):id,"click"),
    reads:()=>calls.filter(call=>call.path==="/favorites/retained"),
    visibleReads:()=>calls.filter(call=>call.path==="/favorites"),
    writes:()=>calls.filter(call=>["PUT","DELETE","PATCH"].includes(call.method)),
    text:()=>get("retained-favorites-status").textContent};
}
let scenarios=0;
async function scenario(label,run){
  try{await run();}catch(error){error.message=label+": "+error.message;throw error;}scenarios++;
}
const parser=(await harness({boot:false})).student;
await scenario("allowlist contains no private identity, title, lesson body or outer metadata",()=>{
  const input={...envelope(),organization_id:80,title:"private",
    favorites:envelope().favorites.map(item=>({...item,title:"private",body:"private",person:"private"}))};
  assert.deepEqual(clone(parser.validatedRetainedFavorites(input)),{
    favorites:envelope().favorites,next_after_course_id:null});
});
await scenario("empty and exact 50-item pages are valid without a global truncation limit",()=>{
  assert.ok(parser.validatedRetainedFavorites(envelope([])));
  const rows=Array.from({length:50},(_,i)=>row(i+1));
  assert.ok(parser.validatedRetainedFavorites(envelope(rows,50)));
  assert.ok(parser.validatedRetainedFavorites(envelope(rows)));
  assert.ok(parser.validatedRetainedFavorites(envelope([row(Number.MAX_SAFE_INTEGER)])));
});
for(const input of [null,[],{}, {...envelope(),schema_version:"1"},{...envelope(),schema_version:2},
  {...envelope(),scope:"other"},{...envelope(),favorites:null},{...envelope(),favorites:{}},
  {...envelope(),next_after_course_id:undefined},{...envelope(),next_after_course_id:0},
  {...envelope(),next_after_course_id:"70"},{...envelope(),next_after_course_id:70},
  envelope(Array.from({length:51},(_,i)=>row(i+1))),envelope([row(2),row(1)]),
  envelope([row(),row()]),envelope([row(),{...row(2),course_slug:"curso-1"}])]){
  await scenario("invalid envelope, order, duplicates or page cursor is rejected",()=>{
    assert.equal(parser.validatedRetainedFavorites(input),null);
  });
}
for(const input of [null,[],{}, {...row(),course_id:0},{...row(),course_id:-1},{...row(),course_id:"1"},
  {...row(),course_id:1.5},{...row(),course_id:Number.MAX_SAFE_INTEGER+1},
  {...row(),course_slug:""},{...row(),course_slug:"Curso"},{...row(),course_slug:"a".repeat(121)},
  {...row(),course_slug:"curso/outro"},{...row(),course_slug:"curso--um"},{...row(),course_slug:"cursó"},
  {...row(),saved_at:"2026-11-17 12:34:56"},{...row(),saved_at:"2026-11-17T12:34:56+00:00"},
  {...row(),saved_at:"2026-11-17T12:34:56.000Z"},{...row(),saved_at:"2026-02-30T12:34:56Z"},
  {...row(),saved_at:"2026-11-17T24:00:00Z"},{...row(),saved_at:null},
  {...row(),availability:true},{...row(),availability:"withdrawn"}]){
  await scenario("invalid retained reference cannot become a rendered row",()=>{
    assert.equal(parser.validatedRetainedFavorites(envelope([input])),null);
  });
}
await scenario("cursor is an unanchored bound and cross-page duplicate IDs or slugs are rejected",()=>{
  assert.ok(parser.validatedRetainedFavorites(envelope([row(51)]),50,[row(1)]));
  assert.equal(parser.validatedRetainedFavorites(envelope([row(50)]),50,[]),null);
  assert.equal(parser.validatedRetainedFavorites(envelope([row(51)]),50,[row(51)]),null);
  assert.equal(parser.validatedRetainedFavorites(envelope([{...row(51),course_slug:"curso-1"}]),50,[row(1)]),null);
  const rows=Array.from({length:50},(_,i)=>row(i+1));
  assert.equal(parser.validatedRetainedFavorites(envelope(rows,49)),null);
});
await scenario("the manager requires an explicit query and never records learning or a favorite",async()=>{
  const h=await harness();assert.equal(h.reads().length,0);
  h.get("retained-favorites-panel").open=true;await setImmediate();
  assert.equal(h.reads().length,0);assert.equal(h.writes().length,0);
  await h.click("reload-retained-favorites");assert.equal(h.reads().length,1);assert.equal(h.rows().length,3);
  const request=h.reads()[0];assert.equal(request.method,"GET");assert.equal(request.cache,"no-store");
  assert.equal(request.credentials,"same-origin");assert.equal(request.headers["X-CSRF-TOKEN"],"synthetic-csrf");
  assert.equal(h.writes().length,0);
});
await scenario("API availability controls title privacy even when the catalog still contains the withdrawn course",async()=>{
  const h=await harness();await h.student.loadRetainedFavorites();
  const rows=h.rows();assert.ok(rows[0].textContent.includes("Título no catálogo atual: Título atual 1"));
  assert.ok(rows[1].textContent.includes("Curso indisponível"));assert.ok(!rows[1].textContent.includes("Título atual 3"));
  assert.ok(rows[2].textContent.includes("curso-70"));assert.ok(!rows[2].textContent.includes("Título"));
  assert.equal(h.get("retained-favorites-list").querySelectorAll("a").length,0);
  assert.equal(rows[0].querySelector("time").attributes.datetime,"2026-11-17T12:34:56Z");
  assert.deepEqual(clone(h.state.favoriteIds),[1]);
});
await scenario("a mismatched current slug never supplies a title or changes availability",async()=>{
  const h=await harness();h.server.rows=[{...row(),course_slug:"referencia-antiga"}];
  await h.student.loadRetainedFavorites();assert.ok(!h.rows()[0].textContent.includes("Título atual"));
  assert.ok(h.rows()[0].textContent.includes("Disponível no catálogo"));
});
await scenario("pending retained lookup is independent from lesson, filters and visible favorites",async()=>{
  const h=await harness(),held=deferred();h.control.retained=()=>held.promise;
  h.state.query="curso";h.state.filter="metodologia";const lesson=h.content.textContent;
  const pending=h.student.loadRetainedFavorites();
  assert.equal(h.state.retained.loading,true);assert.equal(h.get("course-favorite-toggle").disabled,false);
  assert.equal(h.content.textContent,lesson);assert.equal(h.state.courseId,1);assert.equal(h.state.lessonId,11);
  held.release(ok(envelope()));await pending;
  assert.equal(h.state.query,"curso");assert.equal(h.state.filter,"metodologia");
  assert.deepEqual(clone(h.state.favoriteIds),[1]);assert.equal(h.state.favoritesReady,true);
});
await scenario("empty retained page is a valid consultation without replacing the visible favorite list",async()=>{
  const h=await harness();h.control.retained=ok(envelope([]));await h.student.loadRetainedFavorites();
  assert.equal(h.state.retained.ready,true);assert.equal(h.rows().length,0);assert.match(h.text(),/Nenhuma referência/);
  assert.deepEqual(clone(h.state.favoriteIds),[1]);assert.equal(h.state.favoritesReady,true);
});
for(const response of [{status:503,payload:{}},ok({}),ok(envelope([{...row(),availability:"true"}]))]){
  await scenario("failed or malformed consultation clears the panel and allows manual retry without claiming empty",async()=>{
    const h=await harness();await h.student.loadRetainedFavorites();h.control.retained=response;
    await h.student.loadRetainedFavorites();assert.equal(h.state.retained.ready,false);assert.equal(h.rows().length,0);
    assert.match(h.text(),/Não foi possível/);assert.doesNotMatch(h.text(),/Nenhuma referência/);
    assert.equal(h.get("reload-retained-favorites").disabled,false);assert.equal(h.state.libraryReady,true);
    h.control.retained=null;await h.click("reload-retained-favorites");assert.equal(h.rows().length,3);
  });
}
await scenario("manual pagination survives deleting the original cursor row without skipping later items",async()=>{
  const h=await harness();h.server.rows=Array.from({length:51},(_,i)=>row(i+1,"unavailable"));
  await h.click("reload-retained-favorites");assert.equal(h.rows().length,50);assert.equal(h.reads().length,1);
  await h.click(h.removeButton(50));assert.equal(h.rows().length,49);assert.equal(h.state.retained.nextAfter,50);
  assert.equal(h.writes().length,1);assert.equal(h.writes()[0].path,"/courses/50/favorite");
  await h.click("more-retained-favorites");assert.equal(h.reads().length,2);
  assert.equal(h.reads()[1].query,"?after_course_id=50");assert.equal(h.rows().length,50);
  assert.ok(h.removeButton(51));assert.equal(h.get("more-retained-favorites").hidden,true);
});
await scenario("a duplicated later page rejects the full snapshot instead of silently merging it",async()=>{
  const h=await harness();h.server.rows=Array.from({length:51},(_,i)=>row(i+1));
  await h.student.loadRetainedFavorites();h.control.retained=ok(envelope([row(1)]));
  await h.student.loadRetainedFavorites(true);assert.equal(h.state.retained.ready,false);assert.equal(h.rows().length,0);
  assert.match(h.text(),/Não foi possível/);
});
await scenario("pending deletion keeps the row and favorites intact, prevents duplicate writes and preserves study",async()=>{
  const h=await harness();await h.student.loadRetainedFavorites();const held=deferred();h.control.write=()=>held.promise;
  h.state.favoritesOnly=true;h.state.query="Título";h.state.filter="metodologia";const lesson=h.content.textContent;
  const pending=h.student.removeRetainedFavorite(1);
  assert.equal(h.rows().length,3);assert.deepEqual(clone(h.state.favoriteIds),[1]);assert.equal(h.state.favoriteWriting,true);
  await h.student.removeRetainedFavorite(3);await h.student.toggleCourseFavorite();await h.student.loadRetainedFavorites();
  assert.equal(h.writes().length,1);assert.equal(h.reads().length,1);assert.equal(h.get("course-favorite-toggle").disabled,true);
  held.release(ok({course_id:1,favorite:false}));await pending;
  assert.equal(h.rows().length,2);assert.deepEqual(clone(h.state.favoriteIds),[]);
  assert.equal(h.state.favoritesReady,true);assert.equal(h.state.favoriteWriting,false);assert.match(h.text(),/Remoção desta referência confirmada/);
  assert.equal(h.content.textContent,lesson);assert.equal(h.state.courseId,1);assert.equal(h.state.lessonId,11);
  assert.equal(h.state.query,"Título");assert.equal(h.state.filter,"metodologia");assert.equal(h.state.favoritesOnly,true);
});
await scenario("an exact row receipt removes only its known ID and never promotes a partial page into a complete favorite list",async()=>{
  const h=await harness();h.state.favoriteIds=[1,2];await h.student.loadRetainedFavorites();
  await h.student.removeRetainedFavorite(1);assert.deepEqual(clone(h.state.favoriteIds),[2]);assert.equal(h.state.favoritesReady,true);
  h.state.favoritesReady=false;await h.student.removeRetainedFavorite(70);
  assert.equal(h.state.favoritesReady,false);assert.deepEqual(clone(h.state.favoriteIds),[2]);
});
for(const response of [{status:503,payload:{}},ok({}),ok({course_id:3,favorite:false}),
  ok({course_id:1,favorite:true}),ok({course_id:"1",favorite:false}),ok({course_id:1,favorite:"false"})]){
  await scenario("ambiguous removal clears rows and requires a manual query, with no automatic GET or replay",async()=>{
    const h=await harness();await h.student.loadRetainedFavorites();h.control.write=response;
    const visibleReads=h.visibleReads().length;await h.student.removeRetainedFavorite(1);
    assert.equal(h.writes().length,1);assert.equal(h.reads().length,1);assert.equal(h.visibleReads().length,visibleReads);
    assert.equal(h.rows().length,0);assert.equal(h.state.retained.needsRefresh,true);assert.equal(h.state.retained.unconfirmed,true);
    assert.match(h.text(),/resultado da remoção anterior não foi confirmado/);
    await h.student.removeRetainedFavorite(1);await h.student.toggleCourseFavorite();assert.equal(h.writes().length,1);
  });
}
await scenario("a catalog-only read cannot clear retained uncertainty or unlock writes",async()=>{
  const h=await harness();await h.student.loadRetainedFavorites();h.control.write={status:503,payload:{}};
  await h.student.removeRetainedFavorite(70);h.control.favorites=ok({course_ids:[1]});await h.student.loadFavorites();
  assert.equal(h.state.favoritesReady,true);assert.equal(h.state.favoriteOutcomeUnknown,false);
  assert.equal(h.state.retained.needsRefresh,true);assert.equal(h.get("course-favorite-toggle").disabled,true);
  await h.student.toggleCourseFavorite();assert.equal(h.writes().length,1);assert.match(h.text(),/não foi confirmado/);
});
await scenario("a fresh empty page permits consultation but never claims that the uncertain deletion happened",async()=>{
  const h=await harness();await h.student.loadRetainedFavorites();h.control.write={status:503,payload:{}};
  await h.student.removeRetainedFavorite(70);h.control.retained=ok(envelope([]));await h.student.loadRetainedFavorites();
  assert.equal(h.state.retained.ready,true);assert.equal(h.state.retained.needsRefresh,false);assert.equal(h.state.retained.unconfirmed,true);
  assert.match(h.text(),/resultado da remoção anterior não foi confirmado/);assert.match(h.text(),/Nenhuma referência encontrada/);
  assert.doesNotMatch(h.text(),/Remoção desta referência confirmada/);assert.equal(h.writes().length,1);
});
await scenario("a new validated existing row permits a new explicit deletion while retaining the old uncertainty warning",async()=>{
  const h=await harness();await h.student.loadRetainedFavorites();h.control.write={status:503,payload:{}};
  await h.student.removeRetainedFavorite(70);h.control.write=null;await h.click("reload-retained-favorites");
  assert.ok(h.removeButton(70));assert.equal(h.removeButton(70).disabled,false);
  await h.click(h.removeButton(70));assert.equal(h.writes().length,2);assert.equal(h.writes()[1].path,"/courses/70/favorite");
  assert.match(h.text(),/resultado da remoção anterior não foi confirmado/);assert.match(h.text(),/Remoção desta referência confirmada/);
});
await scenario("course and lesson navigation remains compatible with a global retained removal",async()=>{
  const h=await harness();await h.student.loadRetainedFavorites();const held=deferred();h.control.write=()=>held.promise;
  const pending=h.student.removeRetainedFavorite(70);await h.student.selectCourse(2);
  held.release(ok({course_id:70,favorite:false}));await pending;
  assert.equal(h.state.courseId,2);assert.equal(h.state.lessonId,21);assert.ok(!h.removeButton(70));
  assert.equal(h.state.retained.unconfirmed,false);assert.match(h.text(),/confirmada/);
});
await scenario("a favorite toggle invalidates an older retained GET before it can restore rows",async()=>{
  const h=await harness(),held=deferred();h.control.retained=()=>held.promise;
  const pending=h.student.loadRetainedFavorites();await h.student.toggleCourseFavorite();
  held.release(ok(envelope()));await pending;
  assert.equal(h.rows().length,0);assert.equal(h.state.retained.ready,false);assert.equal(h.state.retained.loading,false);
  assert.equal(h.writes().length,1);
});
await scenario("library refresh invalidates late retained JSON without allowing its finally to release a new lookup",async()=>{
  const h=await harness(),first=deferred(),second=deferred();let seen=0;
  h.control.retained=()=>++seen===1?{status:200,json:()=>first.promise}:second.promise;
  const old=h.student.loadRetainedFavorites();await setImmediate();await h.student.loadLibrary();await setImmediate();
  const current=h.student.loadRetainedFavorites();assert.equal(h.state.retained.loading,true);
  first.release(envelope([row(80,"unavailable")]));await old;
  assert.equal(h.state.retained.loading,true);assert.equal(h.rows().length,0);
  second.release(ok(envelope([row(90,"unavailable")])));await current;
  assert.deepEqual(clone(h.state.retained.rows.map(row=>row.course_id)),[90]);
});
await scenario("library refresh during removal does not accept a stale receipt or start another write",async()=>{
  const h=await harness();await h.student.loadRetainedFavorites();const held=deferred();h.control.write=()=>held.promise;
  const pending=h.student.removeRetainedFavorite(70);await h.student.loadLibrary();await setImmediate();
  await h.student.removeRetainedFavorite(1);assert.equal(h.writes().length,1);assert.equal(h.state.favoriteWriting,true);
  held.release(ok({course_id:70,favorite:false}));await pending;
  assert.equal(h.state.retained.needsRefresh,true);assert.equal(h.rows().length,0);assert.match(h.text(),/não foi confirmado/);
});
await scenario("toggle reconciliation prevents a retained DELETE until its catalog-only GET completes",async()=>{
  const h=await harness(),held=deferred();h.control.write={status:503,payload:{}};h.control.favorites=()=>held.promise;
  const toggle=h.student.toggleCourseFavorite();await setImmediate();
  assert.equal(h.state.favoritesLoading,true);assert.equal(h.state.favoriteWriting,false);
  await h.student.loadRetainedFavorites();assert.equal(h.removeButton(70).disabled,true);
  await h.student.removeRetainedFavorite(70);assert.equal(h.writes().length,1);
  held.release(ok({course_ids:[1]}));await toggle;assert.equal(h.removeButton(70).disabled,false);
});
await scenario("an old toggle finally cannot release a new retained write after library refresh",async()=>{
  const h=await harness(),oldRead=deferred(),newWrite=deferred();
  h.control.write={status:503,payload:{}};h.control.favorites=()=>oldRead.promise;
  const old=h.student.toggleCourseFavorite();await setImmediate();assert.equal(h.state.favoritesLoading,true);
  h.control.favorites=null;await h.student.loadLibrary();await setImmediate();await h.student.loadRetainedFavorites();
  h.control.write=()=>newWrite.promise;const current=h.student.removeRetainedFavorite(70);
  assert.equal(h.state.favoriteWriting,true);oldRead.release(ok({course_ids:[1]}));await old;
  assert.equal(h.state.favoriteWriting,true);assert.equal(h.removeButton(70).disabled,true);
  await h.student.removeRetainedFavorite(1);assert.equal(h.writes().length,2);
  newWrite.release(ok({course_id:70,favorite:false}));await current;assert.equal(h.state.favoriteWriting,false);
});
for(const status of [403,419])for(const operation of ["read","remove"]){
  await scenario("authorization denial purges and closes retained references on "+operation+" "+status,async()=>{
    const h=await harness();await h.student.loadRetainedFavorites();h.get("retained-favorites-panel").open=true;
    if(operation==="read"){h.control.retained={status,payload:{}};await h.student.loadRetainedFavorites();}
    else{h.control.write={status,payload:{}};await h.student.removeRetainedFavorite(70);}
    assert.equal(h.state.accessDenied,true);assert.equal(h.rows().length,0);assert.equal(h.state.retained.rows.length,0);
    assert.equal(h.get("retained-favorites-panel").hidden,true);assert.equal(h.get("retained-favorites-panel").open,false);
    assert.equal(h.get("reload-retained-favorites").disabled,true);assert.equal(h.get("more-retained-favorites").disabled,true);
    assert.equal(h.text(),"");const count=h.calls.length;await h.student.loadRetainedFavorites();await h.student.removeRetainedFavorite(70);
    assert.equal(h.calls.length,count);
  });
}
await scenario("revocation during JSON decoding cannot restore retained references or an unconfirmed outcome",async()=>{
  const h=await harness(),held=deferred();h.control.retained={status:200,json:()=>held.promise};
  const pending=h.student.loadRetainedFavorites();await setImmediate();h.student.lockAccess("Sessão encerrada");
  held.release(envelope());await pending;assert.equal(h.rows().length,0);assert.equal(h.text(),"");
  assert.equal(h.get("retained-favorites-panel").hidden,true);assert.equal(h.state.retained.unconfirmed,false);
});
console.log("PASS retained favorites: "+scenarios+" actual-script scenarios; private references, explicit pages, exact removal, shared write tokens, no uncertain replay and revocation");
