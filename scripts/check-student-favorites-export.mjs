#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Execute the view's functions and click handler; only HTTP, browser download
// primitives and DOM are synthetic. No browser, Portal or server is started.
const view=readFileSync(new URL("../resources/views/university/student.blade.php",import.meta.url),"utf8");
function actual(name){
  const found=view.match(new RegExp("(?:async )?function "+name+"\\([^\\n]*\\)\\{[\\s\\S]*?\\n\\}"))?.[0];
  assert.ok(found,"Actual student function missing: "+name);return found;
}
const stateSource=view.match(/const state=(\{[\s\S]*?\});/)?.[1];
assert.ok(stateSource,"The real student state must exist");
const handler=view.match(/document\.getElementById\("export-favorites"\)\.addEventListener\("click",exportFavorites\);/)?.[0];
assert.ok(handler,"Export must be an explicit click action");
const source=["studentRecord","studentText","studentSlug","validatedStudentCourses","validatedStudentFavorites",
  "el","say","lockAccess","api","renderFavoriteControls","loadFavorites","loadLibrary",
  "sanitizedProgressExport","sanitizedFavoritesExport","exportFavorites"].map(actual).join("\n")+"\n"+handler;
const row={course_slug:"curso-retirado",saved_at:"2026-11-17 12:34:56"};
const payload=()=>({schema_version:1,scope:"current_authenticated_student",favorites:[{...row}]});
const course={id:1,slug:"curso-atual",title:"Curso atual 😀",summary:null,category:"metodologia",lessons_total:1,lessons_completed:0};
class Node {
  constructor(tag="div"){
    this.tag=tag;this.ownText="";this.children=[];this.events=new Map();this.attributes={};
    this.disabled=false;this.hidden=false;this.checked=false;this.value="";this.parent=null;
  }
  set textContent(value){this.ownText=String(value);this.children=[];}
  get textContent(){return this.ownText+this.children.map(child=>child.textContent).join("");}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  replaceChildren(...nodes){this.ownText="";this.children=[];this.append(...nodes);}
  addEventListener(event,handler){this.events.set(event,handler);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  removeAttribute(name){delete this.attributes[name];}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);}
}
function harness(){
  const nodes=new Map(),calls=[],downloads=[],objects=new Map(),revoked=[],timers=[];
  const get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
  const body=new Node("body");
  const control={export:{status:200,payload:payload()},favorites:{status:200,payload:{course_ids:[]}},
    initialize:{status:200,payload:{ready:true}},courses:{status:200,payload:{courses:[course]}},onCreate:null,clickError:false};
  let sequence=0,context;
  context=createContext({
    root:"/universidade/private",csrf:"synthetic-csrf",status:get("status"),overall:get("overall-progress"),
    list:get("course-list"),lessonsBox:get("lesson-items"),content:get("lesson-content"),
    Blob,renderSimulator:()=>{},renderCourses:()=>context.renderFavoriteControls(),
    document:{body,getElementById:get,querySelectorAll:()=>[],createElement:tag=>{
      const node=new Node(tag);
      if(tag==="a")node.click=()=>{
        if(control.clickError)throw new Error("synthetic browser download failure");
        downloads.push({filename:node.download,blob:objects.get(node.href)});
      };
      return node;
    }},
    URL:{createObjectURL:blob=>{
      const url="blob:synthetic-"+(++sequence);objects.set(url,blob);control.onCreate?.();return url;
    },revokeObjectURL:url=>revoked.push(url)},
    setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},
    fetch:async(url,options)=>{
      const path=url.replace("/universidade/private","");calls.push({path,...options});
      const key={"/favorites/export":"export","/favorites":"favorites","/initialize":"initialize","/courses":"courses"}[path];
      assert.ok(key,"Unexpected API request: "+path);
      const response=typeof control[key]==="function"?await control[key]():control[key];
      return {status:response.status,ok:response.status>=200&&response.status<300,
        json:async()=>typeof response.json==="function"?await response.json():response.payload};
    },
  });
  new Script("globalThis.state="+stateSource+";\n"+source,{filename:"actual-student-favorites-export"}).runInContext(context);
  const state=context.state;state.libraryReady=true;state.courses=[{...course}];state.courseId=1;state.lessonId=11;
  get("lesson-content").textContent="Authorized current lesson";get("favorites-export-status").hidden=true;
  context.renderFavoriteControls();
  return {context,state,control,get,body,calls,downloads,objects,revoked,timers,
    click:()=>get("export-favorites").events.get("click")(),
    exports:()=>calls.filter(call=>call.path==="/favorites/export"),
    output:async(index=0)=>JSON.parse(await downloads[index].blob.text())};
}
let scenarios=0;
async function scenario(label,run){
  try{await run();}catch(error){error.message=label+": "+error.message;throw error;}
  scenarios++;
}
const sanitize=input=>harness().context.sanitizedFavoritesExport(input);

await scenario("allowlist strips identities, IDs, titles, contents and unexpected outer data",()=>{
  const input={...payload(),subject_key:"private",organization_id:44,email:"private@example.invalid",
    favorites:[{...row,course_id:4,title:"Hidden title",body:"Hidden lesson",subject_key:"private"}]};
  assert.equal(JSON.stringify(sanitize(input)),JSON.stringify(payload()));
});
for(const input of [null,[],{}, {...payload(),schema_version:"1"},{...payload(),schema_version:2},
  {...payload(),scope:"another_student"},{...payload(),favorites:null},{...payload(),favorites:{}}]){
  await scenario("invalid envelope cannot be downloaded",()=>assert.equal(sanitize(input),null));
}
for(const entry of [null,[],{}, {...row,course_slug:1},{...row,course_slug:""},{...row,course_slug:"Curso"},
  {...row,course_slug:"-curso"},{...row,course_slug:"curso-"},{...row,course_slug:"curso--a"},
  {...row,course_slug:"tenant/other"},{...row,course_slug:"cursó"},{...row,course_slug:"a".repeat(121)},
  {...row,saved_at:null},{...row,saved_at:123},{...row,saved_at:"yesterday"},
  {...row,saved_at:"2026-11-17T12:34:56.1234567Z"},{...row,saved_at:"1".repeat(41)}]){
  await scenario("invalid favorite reference cannot be downloaded",()=>assert.equal(sanitize({...payload(),favorites:[entry]}),null));
}
await scenario("duplicate slugs reject the entire export even with different dates",()=>{
  assert.equal(sanitize({...payload(),favorites:[row,{...row,saved_at:"2026-11-18"}]}),null);
});
await scenario("empty export is valid and max 5000 is exact",()=>{
  assert.equal(JSON.stringify(sanitize({...payload(),favorites:[]})),JSON.stringify({...payload(),favorites:[]}));
  const favorites=Array.from({length:5000},(_,i)=>({...row,course_slug:"curso-"+i}));
  assert.equal(sanitize({...payload(),favorites}).favorites.length,5000);
  assert.equal(sanitize({...payload(),favorites:[...favorites,{...row,course_slug:"curso-5000"}]}),null);
});
await scenario("slug and database timestamp boundaries match the progress export",()=>{
  for(const saved_at of ["2026-11-17","2026-11-17 12:34:56","2026-11-17T12:34:56Z",
    "2026-11-17 12:34:56.123456+00:00","2026-11-17T12:34:56-03:00"]){
    const course_slug="a".repeat(120),h=harness();
    assert.ok(h.context.sanitizedFavoritesExport({...payload(),favorites:[{course_slug,saved_at}]}));
    assert.ok(h.context.sanitizedProgressExport({schema_version:1,scope:"current_authenticated_student",
      completions:[{course_slug,course_version:1,lesson_slug:"aula",completed_at:saved_at}]}));
  }
});
await scenario("download uses the explicit click, a private GET, fixed filename and sanitized JSON",async()=>{
  const h=harness();assert.equal(h.calls.length,0);
  h.control.export={status:200,payload:{...payload(),identity:"private",favorites:[{...row,title:"private"}]}};
  await h.click();assert.equal(h.exports().length,1);assert.equal(h.downloads.length,1);
  const request=h.exports()[0];assert.equal(request.method,"GET");assert.equal(request.body,undefined);
  assert.equal(request.credentials,"same-origin");assert.equal(request.cache,"no-store");
  assert.equal(h.downloads[0].filename,"imagine-universidade-favoritos.json");
  assert.equal(h.downloads[0].blob.type,"application/json");assert.deepEqual(await h.output(),payload());
  assert.equal(h.body.children.length,0);assert.equal(h.get("export-favorites").disabled,false);
  assert.equal(h.timers.length,1);assert.equal(h.timers[0].ms,1000);assert.equal(h.revoked.length,0);
  h.timers[0].fn();assert.equal(h.revoked.length,1);
});
await scenario("empty favorites export downloads a valid personal file",async()=>{
  const h=harness();h.control.export={status:200,payload:{...payload(),favorites:[]}};
  await h.click();assert.deepEqual(await h.output(),{...payload(),favorites:[]});
});
await scenario("catalogue authorization is required before an export",async()=>{
  const h=harness();h.state.libraryReady=false;h.context.renderFavoriteControls();
  await h.click();assert.equal(h.get("export-favorites").disabled,true);assert.equal(h.exports().length,0);
});
await scenario("authorized empty catalogue still permits retained references",async()=>{
  const h=harness();h.state.courses=[];h.state.favoritesReady=true;h.context.renderFavoriteControls();
  await h.click();assert.deepEqual(await h.output(),payload());assert.equal(h.get("course-favorite-panel").hidden,true);
});
for(const response of [{status:503,payload:{}},{status:200,payload:{}},{status:200,payload:{course_ids:[]}}]){
  await scenario("favorite list failure or emptiness does not block an independent export",async()=>{
    const h=harness();h.control.favorites=response;await h.context.loadFavorites();
    const message=h.get("favorites-status").textContent;
    assert.equal(h.get("export-favorites").disabled,false);await h.click();
    assert.deepEqual(await h.output(),payload());assert.equal(h.get("favorites-status").textContent,message);
  });
}
await scenario("pending favorite GET is independent from export availability",async()=>{
  const h=harness();let release;h.control.favorites=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.context.loadFavorites();await h.click();assert.equal(h.downloads.length,1);
  release({status:200,payload:{course_ids:[]}});await pending;
});
await scenario("single-flight survives repeated clicks and control renders",async()=>{
  const h=harness();let release;h.control.export=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.click();await h.click();h.context.renderFavoriteControls();await h.click();
  assert.equal(h.exports().length,1);assert.equal(h.get("export-favorites").disabled,true);
  assert.equal(h.downloads.length,0);release({status:200,payload:payload()});await pending;
  assert.equal(h.downloads.length,1);assert.equal(h.state.favoriteExportLoading,false);
});
for(const response of [{status:503,payload:{}},{status:200,payload:{...payload(),schema_version:2}},
  {status:200,payload:{...payload(),favorites:[row,row]}}]){
  await scenario("failure creates no stale file and permits only a manual retry",async()=>{
    const h=harness();h.control.export=response;await h.click();
    assert.equal(h.downloads.length,0);assert.equal(h.objects.size,0);assert.equal(h.exports().length,1);
    assert.equal(h.get("export-favorites").disabled,false);assert.equal(h.state.libraryReady,true);
    assert.equal(h.get("lesson-content").textContent,"Authorized current lesson");
    h.control.export={status:200,payload:payload()};await h.click();
    assert.equal(h.exports().length,2);assert.equal(h.downloads.length,1);
  });
}
for(const failure of [()=>{throw new Error("private-network-detail");},
  ()=>({status:200,json:async()=>{throw new SyntaxError("private-json-detail");}})]){
  await scenario("network and JSON failures expose only a fixed status message",async()=>{
    const h=harness();h.control.export=failure;await h.click();
    assert.equal(h.downloads.length,0);assert.equal(h.get("export-favorites").disabled,false);
    assert.ok(!h.get("favorites-export-status").textContent.includes("private-"));
    assert.equal(h.exports().length,1);
  });
}
for(const status of [403,419]){
  await scenario(status+" export response purges the private UI and forbids a later download",async()=>{
    const h=harness();h.state.favoriteIds=[1];h.control.export={status,payload:payload()};await h.click();
    assert.equal(h.state.accessDenied,true);assert.equal(h.state.libraryReady,false);
    assert.equal(h.state.favoriteIds.length,0);assert.equal(h.state.courses.length,0);
    assert.equal(h.get("course-favorite-panel").hidden,true);assert.equal(h.get("export-favorites").disabled,true);
    assert.equal(h.get("favorites-export-status").textContent,"");assert.equal(h.get("favorites-export-status").hidden,true);
    assert.ok(!h.get("lesson-content").textContent.includes("Authorized"));
    await h.click();assert.equal(h.exports().length,1);assert.equal(h.downloads.length,0);
  });
}
await scenario("a pending successful response is discarded after revocation elsewhere",async()=>{
  const h=harness();let release;h.control.export=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.click();h.context.lockAccess("Revoked");release({status:200,payload:payload()});await pending;
  assert.equal(h.downloads.length,0);assert.equal(h.objects.size,0);assert.equal(h.get("favorites-export-status").textContent,"");
});
await scenario("revocation during JSON parsing prevents the file and status from returning",async()=>{
  const h=harness();let release,received;const seen=new Promise(resolve=>{received=resolve;});
  h.control.export={status:200,json:()=>{received();return new Promise(resolve=>{release=resolve;});}};
  const pending=h.click();await seen;h.context.lockAccess("Revoked");release(payload());await pending;
  assert.equal(h.downloads.length,0);assert.equal(h.objects.size,0);assert.equal(h.get("export-favorites").disabled,true);
});
await scenario("last download guard still revokes an allocated object URL",async()=>{
  const h=harness();h.control.onCreate=()=>h.context.lockAccess("Revoked");await h.click();
  assert.equal(h.downloads.length,0);assert.equal(h.timers.length,1);h.timers[0].fn();assert.equal(h.revoked.length,1);
});
await scenario("library reauthorization invalidates the old export without overlapping reads",async()=>{
  const h=harness();let release;h.control.export=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.click();await h.context.loadLibrary();await setImmediate();
  assert.equal(h.state.libraryReady,true);assert.equal(h.get("export-favorites").disabled,true);
  assert.equal(h.get("favorites-export-status").hidden,true);await h.click();assert.equal(h.exports().length,1);
  release({status:200,payload:payload()});await pending;
  assert.equal(h.downloads.length,0);assert.equal(h.get("export-favorites").disabled,false);
  h.control.export={status:200,payload:payload()};await h.click();assert.equal(h.downloads.length,1);
});
await scenario("failed library reauthorization leaves export blocked after the old request settles",async()=>{
  const h=harness();let release;h.control.export=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.click();h.control.initialize={status:503,payload:{}};await h.context.loadLibrary();
  release({status:200,payload:payload()});await pending;await h.click();
  assert.equal(h.downloads.length,0);assert.equal(h.exports().length,1);assert.equal(h.get("export-favorites").disabled,true);
});
await scenario("global personal export remains valid when only course, lesson or filters change",async()=>{
  const h=harness();let release;h.control.export=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.click();h.state.courseId=null;h.state.lessonId=null;h.state.filter="negocios";
  h.state.query="sem resultados";++h.state.courseRequest;++h.state.lessonRequest;h.context.renderFavoriteControls();
  release({status:200,payload:payload()});await pending;assert.deepEqual(await h.output(),payload());
});
await scenario("download failure removes its anchor and revokes its URL without exposing raw errors",async()=>{
  const h=harness();h.control.clickError=true;await h.click();
  assert.equal(h.downloads.length,0);assert.equal(h.body.children.length,0);assert.equal(h.timers.length,1);
  h.timers[0].fn();assert.equal(h.revoked.length,1);assert.equal(h.get("export-favorites").disabled,false);
  assert.ok(!h.get("favorites-export-status").textContent.includes("synthetic"));
});
await scenario("favorite export never writes preferences, completion or local identity",async()=>{
  const h=harness();await h.click();assert.equal(h.calls.length,1);assert.equal(h.calls[0].method,"GET");
  assert.doesNotMatch(actual("exportFavorites"),/localStorage|sessionStorage|indexedDB|innerHTML|\/complete|method:/);
  assert.match(view,/<div class="favorite-tools">[\s\S]*?id="export-favorites"[\s\S]*?<\/div>/);
  assert.match(view,/id="favorites-export-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(view,/link\.download="imagine-universidade-progresso\.json"/);
});

console.log("PASS student favorites export: "+scenarios+" actual-function scenarios; private allowlist, retained references, single-flight, manual retry, authorization generation and revoked downloads");
