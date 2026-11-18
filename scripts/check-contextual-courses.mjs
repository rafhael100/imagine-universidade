#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// The complete real view script and click handlers run with synthetic DOM
// and HTTP only. No ranking, recommendation logic or navigation is copied.
const view=readFileSync(new URL("../resources/views/university/student.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
assert.ok(start>=0&&end>start);const original=view.slice(start,end);
assert.match(original,/\nloadLibrary\(\);\s*$/);
const source=original.replace(/\nloadLibrary\(\);\s*$/,"")+
  "\nglobalThis.student={state,contextualCourses,renderContextualCourses,renderCourses,loadLibrary,selectCourse,selectLesson,lockAccess,nextPendingCourseId};";
const clone=value=>JSON.parse(JSON.stringify(value));
const ok=payload=>({status:200,payload});
const course=(id,category="metodologia",completed=0,total=1)=>({id,slug:"curso-"+id,title:"Curso "+id,
  category,summary:"Resumo do curso "+id,lessons_total:total,lessons_completed:completed});
const catalog=()=>[course(10),course(7,"negocios"),course(30,"metodologia",1),course(5,"sistemas"),
  course(2,"metodologia",0,0),course(90),course(6),course(4,"negocios")];
const lesson=id=>({id:id*10+1,course_id:id,course_version:1,slug:"aula-"+id,title:"Aula do curso "+id,
  body:"Conteúdo autorizado e sintético para o curso "+id+".",sort_order:0});
function deferred(){let release;const promise=new Promise(resolve=>{release=resolve;});return {promise,release};}
class Node{
  constructor(tag="div"){
    this.tag=tag;this.id="";this.className="";this.ownText="";this.children=[];this.events=new Map();this.dataset={};
    this.attributes={};this.value="";this.disabled=false;this.hidden=false;this.checked=false;this.parent=null;this.open=false;
  }
  set textContent(value){this.ownText=String(value);this.children=[];}
  get textContent(){return this.ownText+this.children.map(child=>child.textContent).join("");}
  append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
  replaceChildren(...children){this.ownText="";this.children=[];this.append(...children);}
  addEventListener(event,handler){const handlers=this.events.get(event)||[];handlers.push(handler);this.events.set(event,handlers);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  removeAttribute(name){delete this.attributes[name];}
  focus(){}
  scrollIntoView(){}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
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
async function harness({boot=true,select=true}={}){
  const nodes=new Map(),calls=[],storageCalls=[];
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
  const server={courses:catalog()},control={fetch:null,courses:null,lessons:null,favorites:null};
  const storage=Object.fromEntries(["getItem","setItem","removeItem","clear"].map(method=>[method,()=>{
    storageCalls.push(method);throw new Error("Unexpected persistent preference");
  }]));
  const context=createContext({Blob,URL,TextEncoder,localStorage:storage,sessionStorage:storage,
    document:{body:new Node("body"),getElementById:get,createElement:tag=>new Node(tag),
      querySelector:selector=>selector.startsWith("meta")?{content:"synthetic-csrf"}:null,
      querySelectorAll:selector=>selector==="[data-filter]"?filters:selector===".sim-inputs input"?sim:[]},
    setTimeout:()=>1,clearTimeout:()=>{},
    fetch:async(url,options)=>{
      const path=url.replace("/universidade/private",""),entry={path,...options};
      calls.push(entry);const resolve=async value=>typeof value==="function"?await value(entry):value;
      let result=await resolve(control.fetch);
      if(result==null){
        if(path==="/initialize")result=ok({ready:true});
        else if(path==="/courses")result=(await resolve(control.courses))??ok({courses:server.courses});
        else if(path==="/favorites")result=(await resolve(control.favorites))??ok({course_ids:[6]});
        else if(path==="/reading-position")result=ok({schema_version:1,scope:"current_authenticated_student",
          status:"none",revision:"synthetic-revision",position:null});
        else if(/^\/courses\/\d+\/lessons$/.test(path)){
          result=await resolve(control.lessons);
          if(result==null){
            const id=Number(path.split("/")[2]),current=server.courses.find(row=>row.id===id);
            const item=lesson(id);
            result=ok({lessons:current?.lessons_total?[{id:item.id,slug:item.slug,title:item.title,sort_order:0,
              completed:current.lessons_completed?1:0}]:[]});
          }
        }else if(/^\/lessons\/\d+$/.test(path))result=ok({lesson:lesson(Math.floor(Number(path.split("/")[2])/10))});
        else if(path.endsWith("/progress")){
          const id=Math.floor(Number(path.split("/")[2])/10);
          result=ok({completed:!!server.courses.find(row=>row.id===id)?.lessons_completed});
        }else throw new Error("Unexpected synthetic request: "+options.method+" "+path);
      }
      return {status:result.status,ok:result.status>=200&&result.status<300,
        json:async()=>result.json?await result.json():clone(result.payload)};
    }
  });
  new Script(source,{filename:"actual-student-contextual-courses"}).runInContext(context);
  const student=context.student;
  const buttons=()=>get("contextual-courses-list").querySelectorAll("[data-contextual-course-id]");
  async function emit(node,event,extra={}){
    for(let current=node;current;current=current.parent){
      for(const handler of current.events.get(event)||[])await handler({target:node,preventDefault(){},...extra});
    }
    await setImmediate();
  }
  if(boot){await student.loadLibrary();await setImmediate();if(select)await student.selectCourse(10);}
  return {student,state:student.state,server,control,get,calls,content,storageCalls,buttons,
    ids:()=>buttons().map(button=>Number(button.dataset.contextualCourseId)),
    click:id=>emit(typeof id==="string"?get(id):id,"click"),
    writes:()=>calls.filter(call=>call.method!=="GET"&&call.path!=="/initialize"),
    lessonReads:()=>calls.filter(call=>/^\/courses\/\d+\/lessons$/.test(call.path))};
}
let scenarios=0;
async function scenario(label,run){
  try{await run();}catch(error){error.message=label+": "+error.message;throw error;}scenarios++;
}
const parser=(await harness({boot:false})).student;
await scenario("same-category suggestions exclude the current course and preserve editorial order, not ID order",()=>{
  assert.deepEqual(clone(parser.contextualCourses(catalog(),10).map(row=>row.id)),[30,2,90]);
});
await scenario("the three-course limit does not read completion or personal preference data",()=>{
  const courses=catalog().map(row=>({...row,lessons_total:999,lessons_completed:999,favorite:true,visits:8000}));
  assert.deepEqual(clone(parser.contextualCourses(courses,10).map(row=>row.id)),[30,2,90]);
  assert.deepEqual(clone(parser.contextualCourses([...catalog()].reverse(),10).map(row=>row.id)),[6,90,2]);
});
for(const [id,expected] of [[10,[30,2,90]],[7,[4]],[5,[]]]){
  await scenario("each category is exact and a missing peer never falls back to another category: "+id,()=>{
    assert.deepEqual(clone(parser.contextualCourses(catalog(),id).map(row=>row.id)),expected);
  });
}
for(const [courses,id] of [[null,10],[{},10],[catalog(),null],[catalog(),"10"],[catalog(),0],[catalog(),999],[[course(10)],10]]){
  await scenario("no selected source or peer produces no invented course",()=>{
    assert.deepEqual(clone(parser.contextualCourses(courses,id)),[]);
  });
}
await scenario("authorized library without a course keeps the panel empty and disabled",async()=>{
  const h=await harness({select:false});
  assert.equal(h.get("contextual-courses-panel").hidden,true);assert.equal(h.buttons().length,0);
  assert.equal(h.get("contextual-courses-status").textContent,"");assert.equal(h.get("contextual-courses-toggle").disabled,true);
  assert.equal(h.lessonReads().length,0);assert.equal(h.writes().length,0);
});
await scenario("the panel follows lesson content and renders only category reasoning plus course titles",async()=>{
  assert.ok(view.indexOf('id="contextual-courses-panel"')>view.indexOf('id="lesson-content"'));
  const h=await harness();assert.deepEqual(h.ids(),[30,2,90]);assert.equal(h.get("contextual-courses-panel").hidden,false);
  assert.match(h.get("contextual-courses-status").textContent,/Metodologia, a mesma categoria/);
  assert.equal(h.get("contextual-courses-list").querySelectorAll("progress").length,0);
  assert.doesNotMatch(h.get("contextual-courses-list").textContent,/Conclu|favorit|ponto|nota|ranking/i);
});
await scenario("rendering and toggling never fetch content, mutate personal records or persist a preference",async()=>{
  const h=await harness(),before=h.calls.length;
  const snapshot=clone({favoriteIds:h.state.favoriteIds,readingSnapshot:h.state.readingSnapshot,
    courses:h.state.courses,courseId:h.state.courseId,lessonId:h.state.lessonId});
  h.student.renderContextualCourses();await h.click("contextual-courses-toggle");await h.click("contextual-courses-toggle");
  assert.equal(h.calls.length,before);assert.equal(h.writes().length,0);assert.equal(h.storageCalls.length,0);
  assert.deepEqual(clone({favoriteIds:h.state.favoriteIds,readingSnapshot:h.state.readingSnapshot,
    courses:h.state.courses,courseId:h.state.courseId,lessonId:h.state.lessonId}),snapshot);
});
await scenario("search, favorites and progress do not rank or narrow the category suggestions",async()=>{
  const h=await harness();h.state.query="only another subject";h.state.filter="negocios";h.state.favoritesOnly=true;
  h.state.favoriteIds=[6];h.state.readingSnapshot={status:"available",position:{course_id:6}};
  h.student.renderContextualCourses();assert.deepEqual(h.ids(),[30,2,90]);
});
await scenario("same-category empty state is explicit and still allows hiding",async()=>{
  const h=await harness();await h.student.selectCourse(5);
  assert.deepEqual(h.ids(),[]);assert.match(h.get("contextual-courses-status").textContent,/Não há outros cursos de Treinamentos Imagine/);
  assert.equal(h.get("contextual-courses-panel").hidden,false);assert.equal(h.get("contextual-courses-toggle").disabled,false);
  await h.click("contextual-courses-toggle");assert.match(h.get("contextual-courses-status").textContent,/ocultas nesta visita/);
});
await scenario("hide and show are explicit accessible actions without altering the current lesson",async()=>{
  const h=await harness(),before=h.content.textContent;await h.click("contextual-courses-toggle");
  assert.equal(h.state.contextualCoursesVisible,false);assert.deepEqual(h.ids(),[]);
  assert.equal(h.get("contextual-courses-list").hidden,true);
  assert.equal(h.get("contextual-courses-toggle").attributes["aria-expanded"],"false");
  assert.match(h.get("contextual-courses-toggle").textContent,/Mostrar sugestões nesta visita/);
  await h.click("contextual-courses-toggle");assert.deepEqual(h.ids(),[30,2,90]);
  assert.equal(h.get("contextual-courses-toggle").attributes["aria-expanded"],"true");
  assert.equal(h.content.textContent,before);
});
await scenario("hidden preference survives navigation and an authorized library refresh in this page",async()=>{
  const h=await harness();await h.click("contextual-courses-toggle");await h.student.selectCourse(7);
  assert.equal(h.state.contextualCoursesVisible,false);assert.deepEqual(h.ids(),[]);
  await h.student.loadLibrary();await setImmediate();
  assert.equal(h.state.contextualCoursesVisible,false);assert.deepEqual(h.ids(),[]);
  await h.click("contextual-courses-toggle");assert.deepEqual(h.ids(),[4]);assert.equal(h.storageCalls.length,0);
});
await scenario("a new page starts with the default preference rather than a persisted hide decision",async()=>{
  const first=await harness();await first.click("contextual-courses-toggle");
  const second=await harness();assert.equal(second.state.contextualCoursesVisible,true);
  assert.deepEqual(second.ids(),[30,2,90]);assert.equal(first.storageCalls.length+second.storageCalls.length,0);
});
await scenario("pending-course continuation keeps the same result when suggestions are hidden or shown",async()=>{
  const h=await harness();const expected=h.student.nextPendingCourseId(h.state.courses,h.state.courseId);
  const disabled=h.get("resume-course").disabled;await h.click("contextual-courses-toggle");
  assert.equal(h.student.nextPendingCourseId(h.state.courses,h.state.courseId),expected);
  assert.equal(h.get("resume-course").disabled,disabled);assert.equal(h.state.courseId,10);
});
await scenario("clicking a suggested course uses fresh authorized lesson and progress reads only",async()=>{
  const h=await harness();const count=h.calls.length;await h.click(h.buttons()[0]);
  assert.equal(h.state.courseId,30);assert.equal(h.state.lessonId,301);
  assert.equal(h.calls.slice(count).length,3);
  assert.deepEqual(h.calls.slice(count).map(call=>call.path).sort(),["/courses/30/lessons","/lessons/301","/lessons/301/progress"].sort());
  assert.ok(h.calls.slice(count).every(call=>call.method==="GET"&&call.cache==="no-store"&&call.credentials==="same-origin"));
  assert.equal(h.writes().length,0);assert.deepEqual(clone(h.state.favoriteIds),[6]);
  assert.equal(h.state.readingSnapshot.status,"none");
});
await scenario("a suggested zero-lesson course follows the honest existing empty lesson path",async()=>{
  const h=await harness();await h.click(h.buttons()[1]);assert.equal(h.state.courseId,2);assert.equal(h.state.lessonId,null);
  assert.match(h.content.textContent,/Ainda não existem aulas publicadas/);assert.equal(h.writes().length,0);
});
for(const [label,mutate] of [
  ["source selection changed",h=>{h.state.courseId=7;}],
  ["source category changed",h=>{h.state.courses.find(row=>row.id===10).category="negocios";}],
  ["target removed",h=>{h.state.courses=h.state.courses.filter(row=>row.id!==30);}],
  ["target category changed",h=>{h.state.courses.find(row=>row.id===30).category="sistemas";}],
  ["source removed",h=>{h.state.courses=h.state.courses.filter(row=>row.id!==10);}],
  ["source request changed",h=>{h.state.courseRequest++;}],
  ["library no longer valid",h=>{h.state.libraryReady=false;}],
]){
  await scenario("a stale button cannot navigate when "+label,async()=>{
    const h=await harness(),button=h.buttons()[0],count=h.calls.length;mutate(h);await h.click(button);
    assert.equal(h.calls.length,count);assert.equal(h.writes().length,0);
  });
}
await scenario("buttons removed by hide or rerender cannot retain navigation authority",async()=>{
  const h=await harness(),first=h.buttons()[0],count=h.calls.length;
  await h.click("contextual-courses-toggle");await h.click(first);assert.equal(h.calls.length,count);
  await h.click("contextual-courses-toggle");const second=h.buttons()[0];
  h.student.renderContextualCourses();await h.click(second);assert.equal(h.calls.length,count);
});
await scenario("authorized refresh removes stale targets and does not restore a detached button",async()=>{
  const h=await harness(),button=h.buttons()[0];h.server.courses=h.server.courses.filter(row=>row.id!==30);
  await h.student.loadLibrary();await setImmediate();const count=h.calls.length;
  assert.deepEqual(h.ids(),[2,90,6]);await h.click(button);assert.equal(h.calls.length,count);
});
await scenario("catalog refresh clears suggestions while pending and preserves an earlier hide decision",async()=>{
  const h=await harness(),held=deferred();await h.click("contextual-courses-toggle");
  h.control.courses=()=>held.promise;const pending=h.student.loadLibrary();await setImmediate();
  assert.equal(h.get("contextual-courses-panel").hidden,true);assert.equal(h.buttons().length,0);
  held.release(ok({courses:catalog()}));await pending;await setImmediate();
  assert.equal(h.state.contextualCoursesVisible,false);assert.deepEqual(h.ids(),[]);
});
await scenario("a malformed catalog never supplies suggestions and recovery remains manual",async()=>{
  const h=await harness();h.control.courses=ok({courses:[{id:10,title:"Invalid"}]});await h.student.loadLibrary();
  assert.equal(h.state.libraryReady,false);assert.equal(h.get("contextual-courses-panel").hidden,true);
  assert.equal(h.buttons().length,0);assert.equal(h.get("contextual-courses-toggle").disabled,true);
  assert.equal(h.get("library-recovery").hidden,false);assert.equal(h.writes().length,0);
});
await scenario("a failed suggested-course read preserves the existing explicit retry flow",async()=>{
  const h=await harness();h.control.lessons={status:503,payload:{}};const before=h.lessonReads().length;
  await h.click(h.buttons()[0]);assert.equal(h.state.courseId,30);assert.equal(h.state.lessonId,null);
  assert.equal(h.lessonReads().length,before+1);assert.equal(h.content.querySelectorAll(".lesson-retry").length,1);
  assert.equal(h.writes().length,0);h.control.lessons=null;await h.click(h.content.querySelector(".lesson-retry"));
  assert.equal(h.state.lessonId,301);assert.equal(h.lessonReads().length,before+2);
});
for(const status of [403,419]){
  await scenario("authorization denial while opening a suggestion purges the panel and rejects old buttons: "+status,async()=>{
    const h=await harness(),button=h.buttons()[0];h.control.lessons={status,payload:{}};
    await h.click(button);assert.equal(h.state.accessDenied,true);assert.equal(h.buttons().length,0);
    assert.equal(h.get("contextual-courses-panel").hidden,true);assert.equal(h.get("contextual-courses-status").textContent,"");
    assert.equal(h.get("contextual-courses-toggle").disabled,true);
    const count=h.calls.length;await h.click(button);await h.click("contextual-courses-toggle");assert.equal(h.calls.length,count);
  });
}
await scenario("late catalog JSON cannot restore suggestions after revocation",async()=>{
  const h=await harness(),held=deferred();h.control.courses={status:200,json:()=>held.promise};
  const pending=h.student.loadLibrary();await setImmediate();h.student.lockAccess("Acesso encerrado");
  held.release({courses:catalog()});await pending;
  assert.equal(h.state.accessDenied,true);assert.equal(h.buttons().length,0);assert.equal(h.get("contextual-courses-panel").hidden,true);
});
await scenario("current titles are rendered literally without markup execution",async()=>{
  const h=await harness();h.state.courses.find(row=>row.id===30).title="<script>private-title</script>";
  h.student.renderContextualCourses();assert.match(h.buttons()[0].textContent,/<script>private-title<\/script>/);
  assert.equal(h.get("contextual-courses-list").querySelectorAll("script").length,0);
});
console.log("PASS contextual courses: "+scenarios+" actual-script scenarios; exact category, editorial order, no personal ranking or persistence, explicit navigation, stale guards and revocation");
