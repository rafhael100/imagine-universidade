#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Real view functions/handlers; the harness supplies only DOM and HTTP.
// No Portal session, real learner, model, storage or operational service.
const view=readFileSync(new URL("../resources/views/university/student.blade.php",import.meta.url),"utf8");
function actual(name){
  const found=view.match(new RegExp("(?:async )?function "+name+"\\([^\\n]*\\)\\{[\\s\\S]*?\\n\\}"))?.[0];
  assert.ok(found,"Actual student function missing: "+name);return found;
}
const start=view.indexOf('document.getElementById("reload-favorites").addEventListener(');
const end=view.indexOf("// Recovery is manual",start);
assert.ok(start>=0&&end>start,"Actual favorites/filter handlers must exist");
const source=["studentRecord","studentText","studentSlug","validatedStudentCourses","validatedStudentLessons",
  "validatedStudentFavorites","validatedFavoriteReceipt","el","say","lockAccess","discardErrorBody","api","progressLabel",
  "normalizeSearchText","filterCourses","coursesFiltered","nextPendingCourseId","renderFavoriteControls",
  "invalidateRetainedFavorites","renderRetainedFavorites",
  "contextualCourses","renderContextualCourses",
  "invalidateProgressHistory","renderProgressHistory",
  "renderCourses","loadFavorites","toggleCourseFavorite","selectCourse","openCourseWithAllFilters","loadLibrary"]
  .map(actual).join("\n")+"\n"+view.slice(start,end);
const courses=[
  {id:1,slug:"curso-um",title:"Curso um",category:"metodologia",summary:"Revisão voluntária",lessons_total:1,lessons_completed:0},
  {id:2,slug:"curso-dois",title:"Negócios com responsabilidade",category:"negocios",summary:null,lessons_total:0,lessons_completed:0},
];
class Node {
  constructor(tag="div",text="",className=""){
    this.tag=tag;this.ownText=text;this.className=className;this.children=[];this.events=new Map();
    this.dataset={};this.attributes={};this.disabled=false;this.hidden=false;this.checked=false;this.value="";
  }
  set textContent(text){this.ownText=String(text);this.children=[];}
  get textContent(){return this.ownText+this.children.map(child=>child.textContent).join("");}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.ownText="";this.children=children;}
  addEventListener(event,handler){this.events.set(event,handler);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  removeAttribute(name){delete this.attributes[name];}
  all(){return this.children.flatMap(child=>[child,...child.all()]);}
  querySelectorAll(selector){
    return this.all().filter(node=>{
      if(selector.startsWith("[data-")){
        const key=selector.slice(6,-1).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
        return Object.hasOwn(node.dataset,key);
      }
      if(selector.startsWith("."))return node.className.split(" ").includes(selector.slice(1));
      return node.tag===selector;
    });
  }
}
function harness(initial=[]){
  const nodes=new Map(),calls=[];
  const get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
  const filters=["todos","metodologia","negocios"].map(filter=>{const node=new Node("button");node.dataset.filter=filter;return node;});
  const list=get("course-list"),content=get("lesson-content"),lessonsBox=get("lesson-items");
  content.append(new Node("p","Current authorized lesson"));
  const state={courses:structuredClone(courses),filter:"todos",query:"",courseId:1,lessonId:11,courseRequest:1,lessonRequest:1,
    accessDenied:false,accessMessage:"",libraryReady:true,libraryLoading:false,exportLoading:false,searchRequest:0,
    favoriteIds:[],favoritesReady:false,favoritesLoading:false,favoritesRequest:0,favoriteWriting:false,
    favoriteOutcomeUnknown:false,favoritesOnly:false,favoritesMessage:"",favoriteWriteRequest:0,
    contextualCoursesVisible:true,contextualRequest:0,
    progressHistory:{rows:[],nextBefore:null,ready:false,loading:false,request:0,message:""},
    retained:{rows:[],nextAfter:null,ready:false,loading:false,request:0,needsRefresh:false,unconfirmed:false,removingId:null,message:""}};
  const control={authoritative:new Set(initial),read:null,write:null};
  const context=createContext({state,list,content,lessonsBox,status:get("status"),overall:get("overall-progress"),
    root:"/universidade/private",csrf:"synthetic-csrf",labels:{metodologia:"Metodologia",negocios:"Negócios",sistemas:"Sistemas"},
    renderPillars:()=>{},renderSimulator:()=>{},selectLesson:async()=>{},renderReadingPosition:()=>{},loadReadingPosition:async()=>null,
    document:{createElement:tag=>new Node(tag),getElementById:get,querySelectorAll:selector=>selector==="[data-filter]"?filters:[]},
    fetch:async(url,options)=>{
      const path=url.replace("/universidade/private","");
      calls.push({path,method:options.method,body:options.body});
      let result;
      if(path==="/favorites"){
        result=typeof control.read==="function"?await control.read():control.read;
        result??={status:200,payload:{course_ids:Array.from(control.authoritative)}};
      }else if(/\/courses\/\d+\/favorite$/.test(path)){
        const id=Number(path.split("/")[2]),favorite=options.method==="PUT";
        if(control.write)result=typeof control.write==="function"?await control.write({id,favorite,method:options.method}):control.write;
        else{
          if(favorite)control.authoritative.add(id);else control.authoritative.delete(id);
          result={status:200,payload:{course_id:id,favorite}};
        }
      }else if(path==="/initialize")result={status:200,payload:{ready:true}};
      else if(path==="/courses")result={status:200,payload:{courses:structuredClone(courses)}};
      else if(path.endsWith("/lessons"))result={status:200,payload:{lessons:[]}};
      else throw new Error("Unexpected fixture request: "+path);
      return {status:result.status,ok:result.status>=200&&result.status<300,json:async()=>result.payload};
    },
  });
  new Script(source,{filename:"actual-student-favorites-view"}).runInContext(context);
  const writes=()=>calls.filter(call=>call.method==="PUT"||call.method==="DELETE");
  const favoriteFilter=checked=>{const node=get("favorites-only");node.checked=checked;node.events.get("change")({target:node});};
  return {context,state,control,list,content,lessonsBox,filters,get,calls,writes,favoriteFilter,
    read:()=>context.loadFavorites(),toggle:()=>context.toggleCourseFavorite()};
}
let scenarios=0;
async function scenario(label,run){
  try{await run();}catch(error){error.message=label+": "+error.message;throw error;}
  scenarios++;
}

for(const payload of [null,[],{},{course_ids:null},{course_ids:{}},{course_ids:[1,1]},
  {course_ids:["1"]},{course_ids:[0]},{course_ids:[-1]},{course_ids:[1.5]},
  {course_ids:[Number.MAX_SAFE_INTEGER+1]}]){
  await scenario("malformed favorite list is unavailable",()=>{
    const h=harness();assert.equal(h.context.validatedStudentFavorites(payload),null);
  });
}
await scenario("valid empty list and no invented record limit",()=>{
  const h=harness();assert.equal(JSON.stringify(h.context.validatedStudentFavorites({course_ids:[],identity:"ignored"})),"[]");
  assert.equal(h.context.validatedStudentFavorites({course_ids:Array.from({length:5001},(_,i)=>i+1)}).length,5001);
});
for(const payload of [{},[],{course_id:2,favorite:true},{course_id:"1",favorite:true},
  {course_id:1,favorite:false},{course_id:1,favorite:"true"},{course_id:1,favorite:1}]){
  await scenario("receipt requires the exact course and boolean intent",()=>{
    const h=harness();assert.equal(h.context.validatedFavoriteReceipt(payload,1,true),null);
  });
}
await scenario("receipt allowlist",()=>{
  const h=harness();assert.equal(JSON.stringify(h.context.validatedFavoriteReceipt({course_id:1,favorite:false,subject:"private"},1,false)),
    JSON.stringify({course_id:1,favorite:false}));
});
await scenario("library is usable while the independent favorite GET is pending",async()=>{
  const h=harness();let release;h.control.read=()=>new Promise(resolve=>{release=resolve;});
  await h.context.loadLibrary();
  assert.equal(h.state.libraryReady,true);assert.equal(h.state.libraryLoading,false);assert.equal(h.state.favoritesLoading,true);
  assert.equal(h.list.querySelectorAll("[data-course-id]").length,2);assert.equal(h.get("export-progress").disabled,false);
  release({status:503,payload:{}});await setImmediate();
  assert.equal(h.state.favoritesReady,false);assert.equal(h.get("reload-favorites").hidden,false);
  assert.equal(h.get("course-favorite-toggle").disabled,true);assert.equal(h.state.libraryReady,true);
});
await scenario("empty favorites are legitimate and the filter can be removed",async()=>{
  const h=harness();await h.read();h.favoriteFilter(true);
  assert.equal(h.state.favoritesReady,true);assert.equal(h.state.favoritesOnly,true);
  assert.equal(h.list.querySelectorAll("[data-course-id]").length,0);
  assert.ok(h.list.textContent.includes("Nenhum curso favorito"));
  h.favoriteFilter(false);assert.equal(h.list.querySelectorAll("[data-course-id]").length,2);
  assert.equal(h.get("export-progress").disabled,false);
});
await scenario("only current catalog IDs are presented as favorites",async()=>{
  const h=harness([1,999]);await h.read();assert.equal(JSON.stringify(h.state.favoriteIds),"[1]");
  h.favoriteFilter(true);assert.equal(h.list.querySelectorAll("[data-course-id]").length,1);
  assert.equal(h.list.querySelectorAll("[data-course-id]")[0].dataset.courseId,"1");
  assert.ok(!h.list.textContent.includes("999"));
});
for(const payload of [{},{course_ids:[1,1]}])await scenario("malformed read recovers manually without blocking learning",async()=>{
  const h=harness();h.control.read={status:200,payload};await h.read();
  assert.equal(h.state.favoritesReady,false);assert.equal(h.content.textContent,"Current authorized lesson");
  assert.equal(h.list.querySelectorAll("[data-course-id]").length,2);assert.equal(h.get("course-favorite-toggle").disabled,true);
  h.control.read={status:200,payload:{course_ids:[1]}};await h.read();
  assert.equal(h.get("course-favorite-toggle").textContent,"Remover curso dos favoritos");assert.equal(h.writes().length,0);
});
for(const response of [{status:503,payload:{}},{status:200,payload:{}}]){
  await scenario("failed refresh lets the student disable favorites-only",async()=>{
    const h=harness([1]);await h.read();h.favoriteFilter(true);h.control.read=response;await h.read();
    assert.equal(h.get("favorites-only").disabled,false);assert.ok(h.list.textContent.includes("Favoritos indisponíveis"));
    h.favoriteFilter(false);assert.equal(h.list.querySelectorAll("[data-course-id]").length,2);
    assert.equal(h.state.libraryReady,true);assert.equal(h.writes().length,0);
  });
}
await scenario("PUT is single flight and never optimistic; DELETE follows confirmed state",async()=>{
  const h=harness();await h.read();let release;
  h.control.write=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.toggle();await h.toggle();
  assert.equal(h.writes().length,1);assert.equal(h.state.favoriteIds.length,0);
  assert.equal(h.get("course-favorite-toggle").disabled,true);assert.ok(!h.list.textContent.includes("Salvo nos favoritos"));
  h.control.authoritative.add(1);release({status:200,payload:{course_id:1,favorite:true}});await pending;
  assert.equal(h.get("course-favorite-toggle").textContent,"Remover curso dos favoritos");
  assert.equal(h.get("course-favorite-toggle").attributes["aria-pressed"],"true");
  h.control.write=null;await h.toggle();
  assert.deepEqual(h.writes().map(call=>call.method),["PUT","DELETE"]);assert.equal(h.state.favoriteIds.length,0);
  assert.equal(h.get("course-favorite-toggle").textContent,"Salvar curso nos favoritos");
  assert.ok(h.writes().every(call=>call.body===undefined),"No person/tenant data is sent by the browser");
});
for(const receipt of [{course_id:2,favorite:true},{course_id:1,favorite:"true"},{}]){
  await scenario("invalid receipt reconciles with GET without replay",async()=>{
    const h=harness();await h.read();h.control.write=()=>{h.control.authoritative.add(1);return{status:200,payload:receipt};};
    await h.toggle();assert.equal(h.writes().length,1);
    assert.equal(h.calls.at(-1).path,"/favorites");assert.equal(h.state.favoritesReady,true);
    assert.equal(h.state.favoriteOutcomeUnknown,false);assert.equal(JSON.stringify(h.state.favoriteIds),"[1]");
    assert.ok(h.state.favoritesMessage.includes("confirmado após consulta"));
  });
}
for(const initial of [[],[1]])await scenario("committed mutation with lost response is reconciled read-only",async()=>{
  const h=harness(initial);await h.read();
  h.control.write=({id,favorite})=>{
    if(favorite)h.control.authoritative.add(id);else h.control.authoritative.delete(id);
    return{status:503,payload:{}};
  };
  await h.toggle();assert.equal(h.writes().length,1);assert.equal(h.state.favoriteOutcomeUnknown,false);
  assert.equal(h.state.favoriteIds.includes(1),initial.length===0);assert.equal(h.get("course-favorite-toggle").disabled,false);
});
await scenario("uncommitted preference can be retried only explicitly",async()=>{
  const h=harness();await h.read();h.control.write={status:503,payload:{}};await h.toggle();
  assert.equal(h.writes().length,1);assert.equal(h.state.favoriteIds.length,0);
  assert.ok(h.state.favoritesMessage.includes("não foi confirmada"));
  h.control.write=null;await h.toggle();assert.equal(h.writes().length,2);assert.equal(h.state.favoriteIds.includes(1),true);
});
await scenario("unknown result blocks all further writes until manual reconciliation",async()=>{
  const h=harness();await h.read();h.control.write={status:503,payload:{}};h.control.read={status:503,payload:{}};
  await h.toggle();assert.equal(h.state.favoriteOutcomeUnknown,true);assert.equal(h.get("course-favorite-toggle").disabled,true);
  assert.equal(h.get("reload-favorites").hidden,false);await h.toggle();assert.equal(h.writes().length,1);
  h.control.read={status:200,payload:{course_ids:[1]}};await h.read();
  assert.equal(h.state.favoriteOutcomeUnknown,false);assert.equal(h.get("course-favorite-toggle").disabled,false);
  assert.equal(h.get("course-favorite-toggle").textContent,"Remover curso dos favoritos");
});
for(const [name,navigate] of [
  ["course",async h=>{await h.context.selectCourse(2);}],
  ["same course reselected",async h=>{await h.context.selectCourse(1);}],
  ["category",async h=>{h.filters[2].events.get("click")();}],
  ["search",async h=>{h.get("course-search").events.get("input")({target:{value:"Negócios"}});}],
  ["favorites filter",async h=>{h.favoriteFilter(true);}],
])await scenario("late write receipt cannot apply after "+name+" change",async()=>{
  const h=harness();await h.read();let release;h.control.write=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.toggle();await navigate(h);h.control.authoritative.add(1);
  release({status:200,payload:{course_id:1,favorite:true}});await pending;
  assert.equal(h.state.favoritesReady,false);assert.equal(h.state.favoriteOutcomeUnknown,true);
  assert.equal(h.state.favoriteIds.length,0);assert.equal(h.writes().length,1);
  assert.equal(h.calls.filter(call=>call.path==="/favorites").length,1,"No automatic retry after incompatible navigation");
  await h.read();assert.equal(h.state.favoritesReady,true);assert.equal(h.writes().length,1);
  if(name==="course")assert.equal(h.get("course-favorite-toggle").textContent,"Salvar curso nos favoritos");
});
await scenario("lesson change within the same course remains compatible",async()=>{
  const h=harness();await h.read();let release;h.control.write=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.toggle();h.state.lessonId=12;++h.state.lessonRequest;
  release({status:200,payload:{course_id:1,favorite:true}});await pending;
  assert.equal(h.state.favoriteIds.includes(1),true);assert.equal(h.state.favoriteOutcomeUnknown,false);
});
await scenario("global list arriving after course navigation cannot mark the wrong course",async()=>{
  const h=harness();let release;h.control.read=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.read();await h.context.selectCourse(2);
  release({status:200,payload:{course_ids:[1,999]}});await pending;
  assert.equal(h.state.courseId,2);assert.equal(h.get("course-favorite-toggle").textContent,"Salvar curso nos favoritos");
  assert.equal(JSON.stringify(h.state.favoriteIds),"[1]");
});
for(const status of [403,419])await scenario(status+" on list purges all private favorite state",async()=>{
  const h=harness([1]);await h.read();h.favoriteFilter(true);h.control.read={status,payload:{}};await h.read();
  assert.equal(h.state.accessDenied,true);assert.equal(h.state.favoriteIds.length,0);assert.equal(h.state.favoritesOnly,false);
  assert.equal(h.get("favorites-only").disabled,true);assert.equal(h.get("course-favorite-panel").hidden,true);
  assert.equal(h.get("favorites-status").textContent,"");await h.toggle();assert.equal(h.writes().length,0);
});
for(const status of [403,419])await scenario(status+" on mutation never reconciles through a revoked session",async()=>{
  const h=harness();await h.read();h.control.write={status,payload:{}};await h.toggle();
  assert.equal(h.state.accessDenied,true);assert.equal(h.calls.filter(call=>call.path==="/favorites").length,1);
  assert.equal(h.get("course-favorite-toggle").disabled,true);assert.equal(h.get("reload-favorites").hidden,true);
});
await scenario("PUT 404 followed by revoked reconciliation GET purges the UI",async()=>{
  const h=harness();await h.read();h.control.write={status:404,payload:{}};h.control.read={status:403,payload:{}};
  await h.toggle();assert.equal(h.state.accessDenied,true);assert.equal(h.writes().length,1);
  assert.equal(h.state.favoriteIds.length,0);assert.equal(h.get("course-favorite-panel").hidden,true);
});
await scenario("late mutation cannot restore favorites after revocation",async()=>{
  const h=harness();await h.read();let release;h.control.write=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.toggle();h.context.lockAccess("Revoked");
  release({status:200,payload:{course_id:1,favorite:true}});await pending;
  assert.equal(h.state.favoriteIds.length,0);assert.equal(h.get("course-favorite-panel").hidden,true);
  assert.equal(h.get("reload-favorites").hidden,true);assert.equal(h.get("favorites-status").textContent,"");
});
await scenario("catalogue withdrawal prunes favorites and empty catalogue stays valid",async()=>{
  const h=harness([1,2]);await h.read();h.state.courses=[];h.context.renderCourses();
  assert.equal(h.state.favoriteIds.length,0);assert.equal(h.get("course-favorite-panel").hidden,true);
  assert.equal(h.state.libraryReady,true);assert.ok(h.get("overall-progress").textContent.includes("Nenhuma aula publicada"));
});
await scenario("favorite labels preserve Unicode and controls are not nested",async()=>{
  const h=harness([1]);h.state.courses[0].title="😀".repeat(200);await h.read();
  assert.ok(h.get("favorite-course-title").textContent.includes("😀".repeat(200)));
  for(const course of h.list.querySelectorAll("[data-course-id]"))assert.equal(course.querySelectorAll("button").length,0);
  assert.doesNotMatch([actual("loadFavorites"),actual("toggleCourseFavorite")].join("\n"),/localStorage|sessionStorage|indexedDB/);
});

console.log("PASS student favorites: "+scenarios+" actual-function scenarios; private IDs, nonblocking reads, exact receipts, no replay, reconciliation, navigation and revocation");
