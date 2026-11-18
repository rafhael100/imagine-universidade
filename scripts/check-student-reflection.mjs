#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Complete real view and handlers; only startup and DOM/HTTP are synthetic.
// No browser/server/database is started and no reconciliation logic is copied.
const view=readFileSync(new URL("../resources/views/university/student.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
assert.ok(start>=0&&end>start);const original=view.slice(start,end);
assert.match(original,/\nloadLibrary\(\);\s*$/);
const source=original.replace(/\nloadLibrary\(\);\s*$/,"")+"\nglobalThis.student={state,reconcileCatalogSelection,"+
  "loadLibrary,selectCourse,selectLesson,renderCourses,loadProgressHistory,loadReadingPosition,loadFavorites,lockAccess,reflection:()=>activeReflection};";
const clone=value=>JSON.parse(JSON.stringify(value));
const ok=payload=>({status:200,payload});
const timestamp="2026-11-17T10:00:00Z";
function deferred(){let release;const promise=new Promise(resolve=>{release=resolve;});return {promise,release};}
function serverState(){
  return {courses:[1,2].map(id=>({id,slug:"curso-"+id,title:"Curso "+id,summary:"Resumo",category:id===1?"metodologia":"negocios"})),
    lessons:[11,12,21].map(id=>({id,slug:"aula-"+id,title:"Aula "+id,sort_order:id%10,course_id:id===21?2:1,course_version:2,
      body:"Introdução autorizada "+id+".\n\nEXEMPLO FICTÍCIO\nExemplo literal.\n\nOutro parágrafo.\n\nAPLICAÇÃO OPCIONAL\nPrática opcional."})),
    completed:new Set(),favorites:[1,2],position:{course_id:1,course_version:2,lesson_id:12,saved_at:timestamp},
    history:[{completion_id:100,course_slug:"curso-1",course_version:1,lesson_slug:"aula-antiga",completed_at:timestamp,availability:"unavailable"}]};
}
class Node{
  constructor(env,tag="div",text=""){
    this.env=env;this.tag=tag;this.ownText=text;this.id="";this.className="";this.children=[];this.parent=null;
    this.events=new Map();this.attributes={};this.dataset={};this.disabled=false;this.hidden=false;this.checked=false;
    this.value="";this.open=false;this.tabIndex=-1;
  }
  get isConnected(){return this===this.env.document.body||Boolean(this.parent?.isConnected);}
  contains(other){return other===this||this.children.some(child=>child.contains(other));}
  set textContent(value){this.replaceChildren();this.ownText=String(value);}
  get textContent(){return this.ownText+this.children.map(child=>child.textContent).join("");}
  append(...children){for(const child of children){child.remove();child.parent=this;this.children.push(child);}}
  replaceChildren(...children){
    if(this.children.some(child=>child.contains(this.env.document.activeElement)))this.env.document.activeElement=this.env.document.body;
    for(const child of this.children)child.parent=null;this.children=[];this.ownText="";this.append(...children);
  }
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);this.parent=null;}
  addEventListener(type,handler){const handlers=this.events.get(type)||[];handlers.push(handler);this.events.set(type,handlers);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  removeAttribute(name){delete this.attributes[name];}
  focus(){if(!this.isConnected||this.disabled)return;this.env.document.activeElement=this;this.env.focuses.push(this);this.env.observe("focusin",this);}
  scrollIntoView(){}
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
async function harness({select=true,server=serverState()}={}){
  const events=new Map(),windowEvents=new Map(),calls=[],storageCalls=[],nodes=new Map(),env={document:null,focuses:[]};
  env.observe=(type,target)=>{for(const handler of events.get(type)||[])handler({target});};
  const document={visibilityState:"visible",hasFocus:()=>true,activeElement:null,
    addEventListener:(type,handler)=>{const handlers=events.get(type)||[];handlers.push(handler);events.set(type,handlers);}};
  env.document=document;document.body=new Node(env,"body");document.activeElement=document.body;
  for(const match of view.slice(0,start).matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
    const node=new Node(env,match[1]);node.id=match[2];node.hidden=/\bhidden\b/.test(match[0]);node.disabled=/\bdisabled\b/.test(match[0]);
    nodes.set(node.id,node);document.body.append(node);
  }
  const get=id=>document.body.querySelector("#"+id)||nodes.get(id)||null;
  const content=get("lesson-content"),lessonsBox=get("lesson-items");
  const filters=["todos","metodologia","negocios","sistemas"].map(category=>{
    const node=new Node(env,"button");node.dataset.filter=category;document.body.append(node);return node;
  });
  const sim=["sim-visits","sim-leads-rate","sim-clients-rate"].map(get);sim.forEach((node,index)=>{node.value=["1000","5","10"][index];});
  Object.assign(document,{getElementById:get,createElement:tag=>new Node(env,tag),createTextNode:text=>new Node(env,"#text",text),
    querySelector:selector=>selector.startsWith("meta")?{content:"synthetic-csrf"}:document.body.querySelector(selector),
    querySelectorAll:selector=>selector==="[data-filter]"?filters:selector===".sim-inputs input"?sim:document.body.querySelectorAll(selector)});
  const control={overrides:new Map()},catalog=()=>server.courses.map(course=>({...course,
    lessons_total:server.lessons.filter(lesson=>lesson.course_id===course.id).length,
    lessons_completed:server.lessons.filter(lesson=>lesson.course_id===course.id&&server.completed.has(lesson.id)).length}));
  const privateState=()=>clone({favorites:server.favorites,position:server.position,history:server.history,completed:[...server.completed]});
  const fallback=entry=>{
    const {path,method}=entry;
    if(path==="/initialize")return ok({ready:true});
    if(path==="/courses")return ok({courses:catalog()});
    if(path==="/favorites")return ok({course_ids:server.favorites.filter(id=>server.courses.some(course=>course.id===id))});
    if(path==="/reading-position")return ok({schema_version:1,scope:"current_authenticated_student",revision:"saved-private-revision",
      status:server.position?(server.courses.some(course=>course.id===server.position.course_id)?"available":"unavailable"):"none",
      position:server.position&&server.courses.some(course=>course.id===server.position.course_id)?server.position:null});
    if(path==="/progress/history")return ok({schema_version:1,scope:"current_authenticated_student",
      completions:server.history.map(row=>({...row,availability:row.course_version===2&&server.courses.some(course=>course.slug===row.course_slug)?"available":"unavailable"})),next_before_id:null});
    if(/^\/courses\/\d+\/lessons$/.test(path))return ok({lessons:server.lessons.filter(lesson=>lesson.course_id===Number(path.split("/")[2]))
      .map(lesson=>({id:lesson.id,slug:lesson.slug,title:lesson.title,sort_order:lesson.sort_order,completed:server.completed.has(lesson.id)?1:0}))});
    if(/^\/lessons\/\d+$/.test(path))return ok({lesson:server.lessons.find(lesson=>lesson.id===Number(path.split("/")[2]))});
    if(path.endsWith("/progress"))return ok({completed:server.completed.has(Number(path.split("/")[2]))});
    if(path.endsWith("/complete")&&method==="POST"){
      const id=Number(path.split("/")[2]),lesson=server.lessons.find(row=>row.id===id);server.completed.add(id);
      if(!server.history.some(row=>row.lesson_slug===lesson.slug&&row.course_version===lesson.course_version))server.history.unshift({completion_id:200,
        course_slug:"curso-"+lesson.course_id,course_version:lesson.course_version,lesson_slug:lesson.slug,completed_at:timestamp,availability:"available"});
      return ok({completed:true});
    }
    if(path.endsWith("/tutor"))return {status:503,payload:{}};
    throw new Error("Unexpected reconciliation request "+method+" "+path);
  };
  const storage=Object.fromEntries(["getItem","setItem","removeItem","clear"].map(method=>[method,()=>{
    storageCalls.push(method);throw new Error("No reflection may persist data");
  }]));
  const context=createContext({document,window:{addEventListener:(type,handler)=>{const handlers=windowEvents.get(type)||[];handlers.push(handler);windowEvents.set(type,handlers);}},Blob,URL,TextEncoder,setTimeout,clearTimeout,
    localStorage:storage,sessionStorage:storage,
    fetch:async(url,options)=>{
      const path=new URL(url,"http://127.0.0.1").pathname.replace("/universidade/private","");
      const entry={path,...options};calls.push(entry);const override=control.overrides.get(path);
      const response=(typeof override==="function"?await override(entry):override)??fallback(entry);
      return {status:response.status,ok:response.status>=200&&response.status<300,json:async()=>response.json?await response.json():clone(response.payload)};
    }});
  new Script(source,{filename:"actual-student-reflection"}).runInContext(context);
  const student=context.student;
  async function emit(node,type="click"){
    assert.ok(node,"Actual control exists");env.observe(type,node);
    const path=[];for(let current=node;current;current=current.parent)path.push(current);
    for(const current of path)for(const handler of current.events.get(type)||[])await handler({target:node,preventDefault(){}});
    await setImmediate();
  }
  await student.loadLibrary();await setImmediate();if(select)await student.selectCourse(1);
  return {student,state:student.state,server,control,catalog,privateState,content,lessonsBox,get,filters,calls,document,env,storageCalls,
    emit,windowEvent:type=>{for(const handler of windowEvents.get(type)||[])handler({});},click:node=>emit(typeof node==="string"?get(node):node),complete:()=>emit(content.querySelector(".primary")),
    writes:()=>calls.filter(call=>call.method!=="GET"&&call.path!=="/initialize"),
    removeCourse:id=>{server.courses=server.courses.filter(course=>course.id!==id);},
    hold:(path,result)=>{const gate=deferred(),seen=deferred();control.overrides.set(path,async entry=>{
      seen.release();await gate.promise;return result??fallback(entry);});
      return {seen:()=>seen.promise,release:()=>{control.overrides.delete(path);gate.release();}};}};
}
const panel=h=>h.content.querySelector('[data-lesson-reflection]');
const field=h=>h.get('lesson-reflection-text');
const review=h=>h.get('lesson-reflection-review');
const write=async(h,text)=>{field(h).value=text;await h.emit(field(h),'input');};
const compare=h=>h.click(panel(h).querySelector('[data-reflection-review]'));
const blankOld=old=>{assert.equal(old.field.value,'');assert.equal(old.review.textContent,'');assert.equal(old.panel.isConnected,false);};
const oldDraft=h=>({panel:panel(h),field:field(h),review:review(h),compare:panel(h).querySelector('[data-reflection-review]')});
let scenarios=0;
async function scenario(label,run){try{await run();}catch(error){error.message=label+': '+error.message;throw error;}scenarios++;}
await scenario('only the authorized lesson includes a closed optional local panel',async()=>{
  const h=await harness({select:false});assert.equal(panel(h),null);const requests=h.calls.length;await h.student.selectCourse(1);
  assert.equal(panel(h).tag,'details');assert.equal(panel(h).open,false);assert.equal(field(h).autocomplete,'off');assert.equal(field(h).required,undefined);
  assert.equal(panel(h).querySelector('label').htmlFor,field(h).id);assert.match(panel(h).textContent,/não é enviada nem salva/);
  assert.match(panel(h).textContent,/apagada ao sair desta aula/);assert.match(field(h).attributes['aria-describedby'],/lesson-reflection-notice/);
  assert.deepEqual(h.calls.slice(requests).map(row=>row.path).sort(),['/courses/1/lessons','/lessons/11','/lessons/11/progress']);
});
await scenario('writing and self-review leave private data and all requests unchanged',async()=>{
  const h=await harness(),requests=h.calls.length,before=h.privateState();await write(h,'Minha reflexão fictícia');await compare(h);
  assert.equal(h.calls.length,requests);assert.deepEqual(h.privateState(),before);assert.equal(h.storageCalls.length,0);
  assert.equal(field(h).value,'Minha reflexão fictícia');assert.match(review(h).textContent,/Compare sua explicação/);
  assert.match(review(h).textContent,/Fonte: Aula 11 · versão 2/);assert.match(review(h).textContent,/Não há nota, correção automática/);
  assert.ok(!review(h).textContent.includes('Minha reflexão fictícia'));assert.equal(h.content.querySelector('.primary').disabled,false);
  assert.equal(review(h).querySelectorAll('blockquote').length,2);
});
await scenario('review keeps exact literal source and interprets no HTML',async()=>{
  const server=serverState();server.lessons[0].body='Introdução protegida.\n\nEXEMPLO FICTÍCIO\n<img src=x onerror=alert(1)>\n\nAPLICAÇÃO OPCIONAL\n**Texto literal**';
  const h=await harness({server});await write(h,'<script>rascunho literal</script>');await compare(h);
  const excerpts=review(h).querySelectorAll('blockquote');assert.match(excerpts[0].textContent,/<img src=x onerror=alert\(1\)>/);
  assert.match(excerpts[1].textContent,/\*\*Texto literal\*\*/);assert.equal(review(h).querySelectorAll('img').length,0);
  assert.equal(review(h).querySelectorAll('script').length,0);assert.ok(!review(h).textContent.includes('Introdução protegida.'));
});
await scenario('an edit invalidates the old self-review without clearing the input',async()=>{
  const h=await harness();await write(h,'Reflexão inicial.');await compare(h);assert.ok(review(h).textContent);
  await write(h,'Reflexão revisada.');assert.equal(review(h).textContent,'');assert.equal(field(h).value,'Reflexão revisada.');
});
for(const text of ['', '   ', 'a'.repeat(2001), '😀'.repeat(2001)])await scenario('invalid reflection stays correctable: '+text.length,async()=>{
  const h=await harness(),calls=h.calls.length;await write(h,text);await compare(h);
  assert.equal(field(h).value,text);assert.match(review(h).textContent,/1 a 2.000 caracteres/);
  assert.equal(review(h).querySelectorAll('blockquote').length,0);assert.equal(h.document.activeElement,field(h));
  assert.equal(h.calls.length,calls);assert.equal(h.content.querySelector('.primary').disabled,false);
});
await scenario('the 2000 character limit counts whole Unicode code points',async()=>{
  const h=await harness(),text='😀'.repeat(2000);await write(h,text);await compare(h);
  assert.equal(field(h).value,text);assert.match(h.get('lesson-reflection-count').textContent,/2000 de 2.000/);
  assert.equal(review(h).querySelectorAll('blockquote').length,2);assert.equal(field(h).maxLength,undefined);
});
await scenario('long source excerpt is literal with a clear partial notice and whole Unicode',async()=>{
  const server=serverState();server.lessons[0].body='Introdução autorizada.\n\nEXEMPLO FICTÍCIO\n'+'😀'.repeat(1001);
  const h=await harness({server});await write(h,'Exemplo fictício.');await compare(h);
  const excerpt=review(h).querySelector('blockquote');assert.equal(excerpt.querySelector('p').textContent,'😀'.repeat(1000));
  assert.match(excerpt.querySelector('small').textContent,/Trecho parcial/);
});
await scenario('an unstructured lesson offers the complete source instead of fabricated examples',async()=>{
  const server=serverState();server.lessons[0].body='Material autorizado sem seções separadas.';
  const h=await harness({server});await write(h,'Minha ideia.');await compare(h);
  assert.equal(review(h).querySelectorAll('blockquote').length,0);assert.match(review(h).textContent,/texto completo acima/);
});
await scenario('explicit clear removes only the temporary reflection and restores focus',async()=>{
  const h=await harness(),calls=h.calls.length,before=h.privateState();await write(h,'Uma ideia.');await compare(h);
  await h.click(panel(h).querySelector('[data-reflection-clear]'));
  assert.equal(field(h).value,'');assert.equal(review(h).textContent,'');assert.equal(h.document.activeElement,field(h));
  assert.equal(panel(h).open,true);assert.equal(h.calls.length,calls);assert.deepEqual(h.privateState(),before);
});
await scenario('confirmation and valid library refresh preserve the same reflection',async()=>{
  const h=await harness();await write(h,'Plano fictício.');await compare(h);panel(h).open=true;const before=oldDraft(h);
  await h.complete();assert.equal(panel(h),before.panel);assert.equal(field(h).value,'Plano fictício.');assert.equal(panel(h).open,true);
  await h.student.loadLibrary();await setImmediate();assert.equal(panel(h),before.panel);assert.equal(field(h).value,'Plano fictício.');
  assert.equal(h.writes().length,1);assert.equal(h.writes()[0].path,'/lessons/11/complete');
});
await scenario('blank reflection never gates completion or the next lesson',async()=>{
  const h=await harness();await h.complete();assert.equal(h.server.completed.has(11),true);
  await h.click(h.content.querySelector('[data-next-lesson]'));assert.equal(h.state.lessonId,12);assert.equal(field(h).value,'');
});
await scenario('exact same lesson reload reuses only one panel and keeps the draft',async()=>{
  const h=await harness();await write(h,'Reflexão durante leitura.');panel(h).open=true;const before=oldDraft(h),calls=h.calls.length;
  await h.student.selectLesson(11);assert.equal(panel(h),before.panel);assert.equal(field(h).value,'Reflexão durante leitura.');assert.equal(panel(h).open,true);
  assert.equal(h.content.querySelectorAll('[data-lesson-reflection]').length,1);
  assert.deepEqual(h.calls.slice(calls).map(row=>row.path).sort(),['/lessons/11','/lessons/11/progress']);await compare(h);assert.ok(review(h).textContent);
});
await scenario('same-source metadata refresh preserves draft and updates the source label',async()=>{
  const h=await harness();await write(h,'Minha reflexão.');await compare(h);const before=oldDraft(h);
  h.server.lessons[0].title='Título atualizado';await h.student.selectLesson(11);
  assert.equal(panel(h),before.panel);assert.equal(field(h).value,'Minha reflexão.');assert.match(review(h).textContent,/Fonte: Título atualizado · versão 2/);
});
for(const kind of ['version','body'])await scenario('changed source clears a reflection: '+kind,async()=>{
  const h=await harness();await write(h,'Ideia anterior.');await compare(h);const before=oldDraft(h);
  if(kind==='version')h.server.lessons[0].course_version++;else h.server.lessons[0].body+=' Outro texto.';
  await h.student.selectLesson(11);blankOld(before);assert.equal(field(h).value,'');assert.notEqual(panel(h),before.panel);
});
for(const destination of ['lesson','course','query','category','favorite'])await scenario('leaving the lesson scrubs detached input and rejects old controls: '+destination,async()=>{
  const h=await harness();await write(h,'Rascunho reservado.');await compare(h);const before=oldDraft(h);
  if(destination==='lesson')await h.student.selectLesson(12);
  if(destination==='course')await h.student.selectCourse(2);
  if(destination==='query'){h.get('course-search').value='outro';await h.emit(h.get('course-search'),'input');}
  if(destination==='category')await h.click(h.filters[2]);
  if(destination==='favorite'){h.get('favorites-only').checked=true;await h.emit(h.get('favorites-only'),'change');}
  blankOld(before);const requests=h.calls.length;await h.click(before.compare);assert.equal(before.review.textContent,'');assert.equal(h.calls.length,requests);
  if(panel(h))assert.equal(field(h).value,'');else assert.equal(h.student.reflection(),null);
});
await scenario('withdrawal and failed catalogue cannot retain the temporary draft',async()=>{
  for(const failure of [false,true]){
    const h=await harness();await write(h,'Rascunho reservado.');const before=oldDraft(h);
    if(failure)h.control.overrides.set('/courses',{status:503,payload:{}});else h.removeCourse(1);
    await h.student.loadLibrary();await setImmediate();blankOld(before);assert.equal(panel(h),null);assert.equal(h.student.reflection(),null);
  }
});
for(const path of ['/lessons/11','/courses/1/lessons'])await scenario('failed same-context reread erases the suspended reflection: '+path,async()=>{
  const h=await harness();await write(h,'Rascunho reservado.');const before=oldDraft(h);
  h.control.overrides.set(path,{status:503,payload:{}});
  if(path.startsWith('/courses'))await h.student.selectCourse(1,11);else await h.student.selectLesson(11);
  blankOld(before);assert.equal(panel(h),null);assert.equal(h.student.reflection(),null);
});
for(const status of [403,419])await scenario('access denial scrubs all reflection data: '+status,async()=>{
  const h=await harness();await write(h,'Rascunho reservado.');await compare(h);const before=oldDraft(h);
  h.control.overrides.set('/lessons/11',{status,payload:{}});await h.student.selectLesson(11);
  blankOld(before);assert.equal(h.state.accessDenied,true);assert.equal(h.student.reflection(),null);await h.click(before.compare);assert.equal(before.review.textContent,'');
});
await scenario('a delayed read cannot resurrect a reflection after revocation',async()=>{
  const h=await harness();await write(h,'Rascunho reservado.');const before=oldDraft(h),held=h.hold('/lessons/11');
  const pending=h.student.selectLesson(11);await held.seen();h.student.lockAccess('Acesso encerrado');blankOld(before);
  held.release();await pending;assert.equal(h.student.reflection(),null);assert.equal(panel(h),null);
});
await scenario('pagehide erases draft and self-review, including BFCache restoration state',async()=>{
  const h=await harness();await write(h,'Não deve voltar do cache.');await compare(h);panel(h).open=true;const requests=h.calls.length;
  h.windowEvent('pagehide');assert.equal(field(h).value,'');assert.equal(review(h).textContent,'');assert.equal(panel(h).open,false);
  assert.equal(h.calls.length,requests);await write(h,'Nova reflexão.');await compare(h);assert.match(review(h).textContent,/Compare sua explicação/);
});
console.log('PASS student optional reflection: '+scenarios+' real-script scenarios; literal self-review, Unicode, same-lesson preservation, no requests/storage, navigation and revocation cleanup');
