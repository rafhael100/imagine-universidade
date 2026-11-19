#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Execute the complete real view and its handlers. Only startup is removed;
// the DOM and HTTP boundaries below are synthetic, with no browser/server.
const view=readFileSync(new URL("../resources/views/university/student.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
assert.ok(start>=0&&end>start);const original=view.slice(start,end);
assert.match(original,/\nloadLibrary\(\);\s*$/);
const source=original.replace(/\nloadLibrary\(\);\s*$/,"")+
  "\nglobalThis.student={state,splitLessonSections,lessonTextFragment,loadLibrary,selectCourse,selectLesson,lockAccess};";
const copy=value=>JSON.parse(JSON.stringify(value));
const ok=payload=>({status:200,payload});
const studyState=state=>copy({courses:state.courses,courseId:state.courseId,lessonId:state.lessonId,
  courseRequest:state.courseRequest,lessonRequest:state.lessonRequest,filter:state.filter,query:state.query,
  favoriteIds:state.favoriteIds,favoritesOnly:state.favoritesOnly,readingSnapshot:state.readingSnapshot});
const sample="Introdução literal 😀.\nA quebra simples permanece.\n\nSegundo parágrafo introdutório.\n\n"+
  "EXEMPLO FICTÍCIO\nUm exemplo literal.\nOutra linha.\n \t\nMais um parágrafo.\n\n"+
  "APLICAÇÃO OPCIONAL\nPasso opcional sem promessa.\n\nCUIDADO IMPORTANTE\nMantenha o cuidado publicado.";
function deferred(){let release;const promise=new Promise(resolve=>{release=resolve;});return {promise,release};}
class Node{
  constructor(tag="div",text=""){
    this.tag=tag;this.id="";this.className="";this.ownText=text;this.children=[];this.parent=null;
    this.events=new Map();this.attributes={};this.dataset={};this.value="";this.disabled=false;this.hidden=false;
    this.checked=false;this.open=false;this.tabIndex=0;this.ownerDocument=null;
  }
  set textContent(value){this.replaceChildren();this.ownText=String(value);}
  get textContent(){return this.ownText+this.children.map(child=>child.textContent).join("");}
  set innerHTML(_value){throw new Error("HTML interpretation is forbidden");}
  get isConnected(){return this.tag==="body"||Boolean(this.parent?.isConnected);}
  append(...children){for(const child of children){child.remove();child.parent=this;this.children.push(child);}}
  replaceChildren(...children){for(const child of this.children)child.parent=null;this.ownText="";this.children=[];this.append(...children);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);this.parent=null;}
  contains(node){return node===this||this.children.some(child=>child.contains(node));}
  addEventListener(name,handler){const handlers=this.events.get(name)||[];handlers.push(handler);this.events.set(name,handlers);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  removeAttribute(name){delete this.attributes[name];}
  focus(options){
    this.ownerDocument.focuses.push({node:this,options});this.ownerDocument.activeElement=this;
    for(const handler of this.events.get("focus")||[])handler({target:this});
  }
  scrollIntoView(options){this.ownerDocument.scrolls.push({node:this,options});}
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
async function harness({body=sample,boot=true}={}){
  const nodes=new Map(),calls=[],storageCalls=[],document={activeElement:null,focuses:[],scrolls:[]};
  const create=(tag,text="")=>{const node=new Node(tag,text);node.ownerDocument=document;return node;};
  document.body=create("body");document.activeElement=document.body;
  for(const match of view.slice(0,start).matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
    const node=create(match[1]);node.id=match[2];node.disabled=/\bdisabled\b/.test(match[0]);
    node.hidden=/\bhidden\b/.test(match[0]);nodes.set(node.id,node);document.body.append(node);
  }
  const content=nodes.get("lesson-content");
  const get=id=>document.body.querySelector("#"+id)||nodes.get(id)||null;
  const filters=["todos","metodologia","negocios","sistemas"].map(filter=>{
    const node=create("button");node.dataset.filter=filter;document.body.append(node);return node;
  });
  const sim=["sim-visits","sim-leads-rate","sim-clients-rate"].map(get);
  sim.forEach((node,index)=>{node.value=["1000","5","10"][index];});
  Object.assign(document,{getElementById:get,createElement:tag=>create(tag),createTextNode:text=>create("#text",text),
    addEventListener(){},visibilityState:"visible",hasFocus:()=>true,
    querySelector:selector=>selector.startsWith("meta")?{content:"synthetic-csrf"}:document.body.querySelector(selector),
    querySelectorAll:selector=>selector==="[data-filter]"?filters:selector===".sim-inputs input"?sim:document.body.querySelectorAll(selector)});
  const server={courses:[
    {id:1,slug:"curso-um",title:"Curso um",summary:"Resumo",category:"metodologia",lessons_total:2,lessons_completed:0},
    {id:2,slug:"curso-dois",title:"Curso dois",summary:null,category:"negocios",lessons_total:1,lessons_completed:0}],
    lessons:[11,12,21].map(id=>({id,slug:"aula-"+id,title:"Aula "+id,sort_order:id%10,
      course_id:id===21?2:1,course_version:1,body:id===12?"Uma aula breve e literal, sem seções adicionais.":body}))};
  const control={fetch:null};
  const storage=Object.fromEntries(["getItem","setItem","removeItem","clear"].map(name=>[name,()=>{
    storageCalls.push(name);throw new Error("No reading activity may be persisted");
  }]));
  const location=new URL("https://local.invalid/student?keep=1#unchanged");
  const context=createContext({document,window:{addEventListener(){}},URL,Blob,TextEncoder,location,localStorage:storage,sessionStorage:storage,
    history:{pushState(){throw new Error("Unexpected URL write");},replaceState(){throw new Error("Unexpected URL write");}},
    setTimeout:()=>1,clearTimeout:()=>{},
    fetch:async(url,options)=>{
      const entry={path:url.replace("/universidade/private",""),...options};calls.push(entry);
      let result=control.fetch?await control.fetch(entry):null;
      if(result==null){
        if(entry.path==="/initialize")result=ok({ready:true});
        else if(entry.path==="/courses")result=ok({courses:server.courses});
        else if(entry.path==="/favorites")result=ok({course_ids:[]});
        else if(entry.path==="/reading-position")result=ok({schema_version:1,scope:"current_authenticated_student",status:"none",revision:"synthetic-ticket",position:null});
        else if(/^\/courses\/\d+\/lessons$/.test(entry.path)){
          const id=Number(entry.path.split("/")[2]);result=ok({lessons:server.lessons.filter(row=>row.course_id===id)
            .map(row=>({id:row.id,slug:row.slug,title:row.title,sort_order:row.sort_order,completed:0}))});
        }else if(/^\/lessons\/\d+$/.test(entry.path)){
          const lesson=server.lessons.find(row=>row.id===Number(entry.path.split("/")[2]));result=lesson?ok({lesson}):{status:404,payload:{}};
        }else if(entry.path.endsWith("/progress"))result=ok({completed:false});
        else throw new Error("Unexpected request "+entry.method+" "+entry.path);
      }
      return {status:result.status,ok:result.status>=200&&result.status<300,json:async()=>result.json?await result.json():copy(result.payload)};
    }});
  new Script(source,{filename:"actual-student-lesson-sections"}).runInContext(context);
  const student=context.student;
  async function emit(node,name="click",extra={}){
    for(let current=node;current;current=current.parent){
      for(const handler of current.events.get(name)||[])await handler({target:node,preventDefault(){},...extra});
    }
    await setImmediate();
  }
  if(boot){await student.loadLibrary();await setImmediate();await student.selectCourse(1);}
  return {student,state:student.state,server,control,document,content,get,filters,calls,storageCalls,location,create,
    click:node=>emit(node),emit,wrapper:()=>content.querySelector(".lesson-text"),
    buttons:()=>content.querySelectorAll("[data-lesson-section-id]"),headings:()=>content.querySelectorAll("[data-lesson-section]"),
    writes:()=>calls.filter(call=>call.method!=="GET"&&call.path!=="/initialize")};
}
function renderedSections(wrapper){
  const sections=[];let current={heading:null,text:""};
  for(const child of wrapper.children){
    if(child.tag==="nav")continue;
    if(child.tag==="h4"){
      if(current.heading!==null||current.text!=="")sections.push(current);
      current={heading:child.textContent,text:""};
    }else current.text+=child.textContent;
  }
  if(current.heading!==null||current.text!=="")sections.push(current);return sections;
}
let scenarios=0;
async function scenario(label,run){try{await run();}catch(error){error.message=label+": "+error.message;throw error;}scenarios++;}
for(const [label,body,headings] of [
  ["plain body","Texto simples.\n\nOutro parágrafo.",0],
  ["one recognized heading","Introdução.\n\nEXEMPLO FICTÍCIO\nExemplo literal.",1],
  ["unrecognized markdown","# Título livre\n\n## Outro título\nTexto que continua literal.",0],
  ["label at the start follows the existing parser","EXEMPLO FICTÍCIO\nTexto inicial.\n\nAPLICAÇÃO OPCIONAL\nPasso literal.",1],
])await scenario(label+" does not invent a useful index",async()=>{
  const h=await harness({body});assert.equal(h.buttons().length,0);assert.equal(h.headings().length,headings);
  assert.deepEqual(renderedSections(h.wrapper()),copy(h.student.splitLessonSections(body)));
});
await scenario("recognized headings retain exact labels, occurrence order and native button semantics",async()=>{
  const h=await harness(),expected=["EXEMPLO FICTÍCIO","APLICAÇÃO OPCIONAL","CUIDADO IMPORTANTE"];
  assert.deepEqual(h.buttons().map(node=>node.textContent),expected);assert.deepEqual(h.headings().map(node=>node.textContent),expected);
  assert.equal(h.wrapper().children[0].tag,"nav");assert.equal(h.wrapper().children[0].attributes["aria-label"],"Índice das seções desta aula");
  for(const [index,button] of h.buttons().entries()){
    assert.equal(button.type,"button");assert.equal(button.attributes["aria-controls"],h.headings()[index].id);
    assert.equal(button.dataset.lessonSectionId,h.headings()[index].id);assert.equal(button.events.has("keydown"),false);
    assert.equal(h.headings()[index].tabIndex,-1);assert.equal(h.headings()[index].hidden,false);
  }
});
await scenario("all text remains visible with semantic paragraphs and literal blank-line separators",async()=>{
  const h=await harness();assert.deepEqual(renderedSections(h.wrapper()),copy(h.student.splitLessonSections(sample)));
  const paragraphs=h.wrapper().querySelectorAll(".lesson-paragraph");
  assert.equal(paragraphs.length,6);assert.ok(paragraphs.every(node=>node.tag==="p"&&!node.hidden));
  assert.equal(paragraphs[0].textContent,"Introdução literal 😀.\nA quebra simples permanece.");
  assert.ok(h.wrapper().children.some(node=>node.tag==="#text"&&node.textContent==="\n \t\n"));
});
await scenario("CRLF, repeated blank lines, indentation and astral characters are not rewritten",async()=>{
  const body="A😀\r\nB́\r\n \t\r\n\r\n  C\t\r\nD\n\n\nE\nF";
  const h=await harness({body});assert.deepEqual(renderedSections(h.wrapper()),[{heading:null,text:body}]);
  assert.deepEqual(h.wrapper().querySelectorAll(".lesson-paragraph").map(node=>node.textContent),["A😀\r\nB́","  C\t\r\nD","E\nF"]);
});
await scenario("HTML and Markdown stay literal with no active markup",async()=>{
  const body="<script>window.secret=true</script>\n\nEXEMPLO FICTÍCIO\n<img src=x onerror=evil()>\n\nAPLICAÇÃO OPCIONAL\n**literal** [url](https://invalid.example)";
  const h=await harness({body});assert.deepEqual(renderedSections(h.wrapper()),copy(h.student.splitLessonSections(body)));
  for(const tag of ["script","img","a","iframe","details"])assert.equal(h.wrapper().querySelectorAll(tag).length,0);
});
await scenario("a valid 30000-codepoint lesson is complete, including the final astral character",async()=>{
  const prefix="Introdução.\n\nEXEMPLO FICTÍCIO\nExemplo.\n\nAPLICAÇÃO OPCIONAL\n";
  const body=prefix+"😀".repeat(30000-Array.from(prefix).length);const h=await harness({body});
  assert.deepEqual(renderedSections(h.wrapper()),copy(h.student.splitLessonSections(body)));
  assert.equal(h.wrapper().querySelectorAll(".lesson-paragraph").at(-1).textContent,"😀".repeat(30000-Array.from(prefix).length));
  assert.equal(h.buttons().length,2);assert.equal(h.writes().length,0);
});
await scenario("repeated heading labels have unique safe IDs without deduplication or truncation",async()=>{
  const body="Introdução."+"\n\nEXEMPLO FICTÍCIO\nUm exemplo.".repeat(80);const h=await harness({body});
  assert.equal(h.buttons().length,80);assert.equal(h.headings().length,80);
  assert.equal(new Set(h.headings().map(node=>node.id)).size,80);
  assert.ok(h.headings().every(node=>/^lesson-section-\d+-\d+-\d+-\d+$/.test(node.id)));
  assert.deepEqual(renderedSections(h.wrapper()),copy(h.student.splitLessonSections(body)));
});
await scenario("a current section action focuses its exact heading then scrolls locally",async()=>{
  const h=await harness(),before=studyState(h.state),calls=h.calls.length,url=h.location.href;
  const heading=h.headings()[1];await h.click(h.buttons()[1]);
  assert.equal(h.document.activeElement,heading);assert.equal(h.document.focuses.length,1);
  assert.deepEqual(copy(h.document.focuses[0].options),{preventScroll:true});
  assert.equal(h.document.scrolls.length,1);assert.equal(h.document.scrolls[0].node,heading);
  assert.deepEqual(copy(h.document.scrolls[0].options),{block:"start",behavior:"auto"});
  assert.deepEqual(studyState(h.state),before);assert.equal(h.calls.length,calls);assert.equal(h.location.href,url);
  assert.equal(h.storageCalls.length,0);assert.equal(h.writes().length,0);
});
for(const [label,mutate] of [
  ["course changes",h=>{h.state.courseId=2;}],
  ["lesson changes",h=>{h.state.lessonId=12;}],
  ["course generation changes",h=>{h.state.courseRequest++;}],
  ["lesson generation changes",h=>{h.state.lessonRequest++;}],
  ["course leaves the authorized catalog",h=>{h.state.courses=h.state.courses.filter(course=>course.id!==1);}],
  ["library loses authority",h=>{h.state.libraryReady=false;}],
  ["access is denied",h=>{h.state.accessDenied=true;}],
  ["wrapper is detached",h=>{h.wrapper().remove();}],
  ["heading is detached",h=>{h.headings()[0].remove();}],
  ["button is detached",h=>{h.buttons()[0].remove();}],
  ["wrapper is connected elsewhere",h=>{h.document.body.append(h.wrapper());}],
  ["heading is moved outside its wrapper",h=>{h.document.body.append(h.headings()[0]);}],
  ["button is moved outside its wrapper",h=>{h.document.body.append(h.buttons()[0]);}],
])await scenario("an obsolete action cannot focus or scroll when "+label,async()=>{
  const h=await harness(),button=h.buttons()[0],calls=h.calls.length;mutate(h);await h.click(button);
  assert.equal(h.document.focuses.length,0);assert.equal(h.document.scrolls.length,0);assert.equal(h.calls.length,calls);
});
await scenario("navigation triggered synchronously by focus prevents scrolling the old target",async()=>{
  const h=await harness(),heading=h.headings()[0];heading.addEventListener("focus",()=>{h.state.lessonRequest++;});
  await h.click(h.buttons()[0]);assert.equal(h.document.focuses.length,1);assert.equal(h.document.scrolls.length,0);
});
await scenario("reopening the same lesson creates a new generation and old controls stay inert",async()=>{
  const h=await harness(),old=h.buttons()[0],oldId=h.headings()[0].id;await h.student.selectLesson(11);
  assert.notEqual(h.headings()[0].id,oldId);await h.click(old);assert.equal(h.document.focuses.length,0);
  await h.click(h.buttons()[0]);assert.equal(h.document.activeElement,h.headings()[0]);
});
await scenario("a pending lesson request immediately disconnects the previous index",async()=>{
  const h=await harness(),old=h.buttons()[0],pending=deferred();
  h.control.fetch=entry=>entry.path==="/lessons/12"?pending.promise:null;
  const operation=h.student.selectLesson(12);await setImmediate();await h.click(old);
  assert.equal(h.buttons().length,0);assert.equal(h.document.focuses.length,0);assert.equal(h.document.scrolls.length,0);
  pending.release(ok({lesson:h.server.lessons.find(row=>row.id===12)}));await operation;
  assert.equal(h.state.lessonId,12);assert.equal(h.buttons().length,0);assert.equal(h.writes().length,0);
});
for(const action of ["category","search","favorites"]){
  await scenario("the existing "+action+" filter invalidates old section controls",async()=>{
    const h=await harness(),old=h.buttons()[0];
    if(action==="category")await h.click(h.filters.find(node=>node.dataset.filter==="negocios"));
    else if(action==="search"){h.get("course-search").value="curso dois";await h.emit(h.get("course-search"),"input");}
    else{h.get("favorites-only").checked=true;await h.emit(h.get("favorites-only"),"change");}
    const calls=h.calls.length;await h.click(old);assert.equal(h.document.focuses.length,0);assert.equal(h.document.scrolls.length,0);
    assert.equal(h.calls.length,calls);assert.equal(h.writes().length,0);
  });
}
await scenario("library reauthorization blocks local jumps while pending and preserves the still-current authorized lesson",async()=>{
  const h=await harness(),button=h.buttons()[0],pending=deferred();
  h.control.fetch=entry=>entry.path==="/initialize"?pending.promise:null;
  const operation=h.student.loadLibrary();await h.click(button);
  assert.equal(h.document.focuses.length,0);assert.equal(h.document.scrolls.length,0);
  pending.release(ok({ready:true}));await operation;await setImmediate();
  const calls=h.calls.length;await h.click(button);assert.equal(h.document.activeElement,h.headings()[0]);
  assert.equal(h.calls.length,calls);assert.equal(h.writes().length,0);assert.equal(h.storageCalls.length,0);
});
for(const status of [403,419])await scenario(status+" purges the index and permanently denies old section controls",async()=>{
  const h=await harness(),old=h.buttons()[0];h.control.fetch=entry=>entry.path==="/lessons/12"?{status,payload:{}}:null;
  await h.student.selectLesson(12);assert.equal(h.state.accessDenied,true);assert.equal(h.buttons().length,0);assert.equal(h.headings().length,0);
  const calls=h.calls.length;await h.click(old);assert.equal(h.document.focuses.length,0);assert.equal(h.document.scrolls.length,0);assert.equal(h.calls.length,calls);
});
await scenario("late lesson JSON cannot restore an index after revocation",async()=>{
  const h=await harness(),pending=deferred();h.control.fetch=entry=>entry.path==="/lessons/11"?{status:200,json:()=>pending.promise}:null;
  const operation=h.student.selectLesson(11);await setImmediate();h.student.lockAccess("Acesso encerrado.");
  pending.release({lesson:h.server.lessons[0]});await operation;
  assert.equal(h.buttons().length,0);assert.equal(h.headings().length,0);assert.equal(h.document.focuses.length,0);assert.equal(h.document.scrolls.length,0);
});
console.log("PASS lesson sections: "+scenarios+" actual-script scenarios; literal paragraphs, safe local index, exact focus targets, stale-action guards and no reading writes");
