#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Complete production admin script and real registered handlers. Only its
// startup calls, DOM, HTTP and confirmation primitives are substituted.
const view=readFileSync(new URL("../resources/views/university/admin.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
const boot='loadAdminCatalog();\n(async()=>{try{await refreshAudit();}catch(error){say(error.message);}})();';
assert.ok(start>=0&&end>start&&view.slice(start,end).includes(boot));
const exposed=["state","validatedArchivedVersions","validatedArchivedLessons","validatedArchivedLesson",
  "loadEditorialArchiveVersions","loadEditorialArchiveLessons","loadEditorialArchiveBody","invalidateEditorialArchive",
  "refreshCourses","loadAdminCatalog","beginWrite","finishWrite","freezeUncertainEditorialWrite","lockAccess"];
const source=view.slice(start,end).replace(boot,"")+"\nglobalThis.editor={"+exposed.join(",")+"};";
const clone=value=>JSON.parse(JSON.stringify(value));
const envelope=(course_id=1)=>({schema_version:1,scope:"editorial_archived_content",course_id});
const version=(value=2,count=2)=>({version:value,status:"archived",lesson_count:count});
const versions=(rows=[version(),version(1,0)],next=null,course=1)=>({...envelope(course),versions:rows,next_before_version:next});
const lesson=(id=21,sort_order=0)=>({id,slug:"aula-arquivada-"+id,title:"Título arquivado "+id,sort_order});
const lessons=(rows=[lesson(),lesson(22,1)],next=null,course=1,version=2)=>({...envelope(course),course_version:version,status:"archived",lessons:rows,next_after:next});
const detail=(item=lesson(),course=1,version=2)=>({...envelope(course),course_version:version,status:"archived",
  lesson:{...item,body:"Conteúdo arquivado literal.\n\n<script>conteudoNaoExecutavel()</script>"}});
const courseFields=["course-title","course-slug","course-category","course-summary","course-sort"];
const lessonFields=["lesson-title","lesson-slug","lesson-body","lesson-sort"];
const response=(status,payload)=>({status,ok:status>=200&&status<300,json:async()=>clone(payload)});

class Node {
  constructor(tagName="DIV",id=""){
    this.tagName=tagName;this.id=id;this.value="";this.ownText="";this.children=[];this.dataset={};this.attributes={};
    this.events=new Map();this.disabled=false;this.hidden=false;this.inert=false;this.className="";this.parent=null;
  }
  get isConnected(){return this.parent?this.parent.isConnected:Boolean(this.id);}
  contains(node){return node===this||this.all().includes(node);}
  get textContent(){return this.ownText+this.children.map(node=>node.textContent).join("");}
  set textContent(value){this.ownText=String(value);this.children=[];}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  replaceChildren(...nodes){for(const node of this.children)node.parent=null;this.ownText="";this.children=[];this.append(...nodes);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  addEventListener(type,handler){const items=this.events.get(type)||[];items.push(handler);this.events.set(type,items);}
  all(){return this.children.flatMap(node=>[node,...node.all()]);}
  querySelectorAll(selector){
    if(selector.startsWith("[data-")){
      const key=selector.slice(6,-1).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
      return this.all().filter(node=>Object.hasOwn(node.dataset,key));
    }
    return this.all().filter(node=>selector.split(",").some(tag=>node.tagName===tag.trim().toUpperCase()));
  }
  focus(){}
  scrollIntoView(){}
}
async function harness({load=true,published=false}={}){
  const nodes=new Map(),requests=[],dialogs=[];
  const get=id=>{if(!nodes.has(id))nodes.set(id,new Node(id==="course-category"?"SELECT":"DIV",id));return nodes.get(id);};
  const control={accept:true,hook:null};
  const server={courses:[1,2].map(id=>({id,slug:"curso-atual-"+id,title:"Cadastro atual "+id,category:"metodologia",
    summary:"Resumo atual.",sort_order:0,is_published:published})),
    currentLessons:new Map([1,2].map(id=>[id,[{id:id*100+1,slug:"rascunho-"+id,title:"Aula atual "+id,
      body:"Texto atual ainda no editor.",sort_order:0,status:published?"published":"draft",is_published:published}]])),
    versions:new Map([[1,[version(),version(1,0)]],[2,[]]]),
    archived:new Map([["1:2",[lesson(),lesson(22,1)]],["1:1",[]]]),nextId:300};
  const document={getElementById:get,createElement:tag=>new Node(tag.toUpperCase()),
    querySelector:selector=>selector.startsWith("meta")?{content:"synthetic-csrf"}:get("layout"),
    querySelectorAll:()=>[...courseFields,...lessonFields,"new-course","course-save","lesson-save","delete-course",
      "delete-lesson","publish","unpublish","check-publication","refresh-audit","load-more-audit"].map(get)};
  for(const field of [...courseFields,...lessonFields])get(field).value=field.endsWith("sort")?"0":"";
  get("course-category").value="metodologia";
  get("lesson-form").querySelectorAll=()=>[...lessonFields,"lesson-save","clear-lesson","preview-lesson","delete-lesson"].map(get);
  get("lesson-form").reset=()=>{for(const field of lessonFields)get(field).value=field.endsWith("sort")?"0":"";};
  const context=createContext({document,window:{addEventListener(){}},
    confirm:message=>{dialogs.push(message);return control.accept;},
    fetch:async(url,options)=>{
      const parsed=new URL(url,"http://127.0.0.1"),path=parsed.pathname.replace("/universidade/private/admin","");
      const request={path,query:parsed.search,...options,body:options.body===undefined?null:JSON.parse(options.body)};requests.push(request);
      if(control.hook){const result=await control.hook(request);if(result!==undefined)return result;}
      if(path==="/courses"&&request.method==="GET")return response(200,{courses:server.courses});
      if(path==="/courses"&&request.method==="POST"){
        const id=server.nextId++;server.courses.push({id,...request.body,is_published:false});server.currentLessons.set(id,[]);return response(201,{id,status:"draft"});
      }
      const index=path.match(/^\/courses\/(\d+)\/versions$/);
      if(index){
        const id=Number(index[1]),before=parsed.searchParams.has("before_version")?Number(parsed.searchParams.get("before_version")):Infinity;
        const rows=(server.versions.get(id)||[]).filter(row=>row.version<before).slice(0,51);
        return response(200,versions(rows.slice(0,50),rows.length>50?rows[49].version:null,id));
      }
      const archive=path.match(/^\/courses\/(\d+)\/versions\/(\d+)\/lessons(?:\/(\d+))?$/);
      if(archive){
        const course=Number(archive[1]),version=Number(archive[2]),all=server.archived.get(course+":"+version)||[];
        if(archive[3]){
          const item=all.find(row=>row.id===Number(archive[3]));return item?response(200,detail(item,course,version)):response(404,{});
        }
        const order=parsed.searchParams.get("after_sort_order"),id=Number(parsed.searchParams.get("after_lesson_id"));
        const rows=all.filter(row=>order===null||row.sort_order>Number(order)||(row.sort_order===Number(order)&&row.id>id)).slice(0,51);
        return response(200,lessons(rows.slice(0,50),rows.length>50?{sort_order:rows[49].sort_order,lesson_id:rows[49].id}:null,course,version));
      }
      const current=path.match(/^\/courses\/(\d+)\/lessons$/);
      if(current){
        const id=Number(current[1]);
        if(request.method==="GET")return response(200,{lessons:server.currentLessons.get(id)||[]});
        const lessonId=server.nextId++;server.currentLessons.get(id).push({id:lessonId,...request.body,status:"draft",is_published:false});return response(201,{id:lessonId,status:"draft"});
      }
      if(path==="/courses/1/publication-check")return response(200,{course_id:1,version:3,lesson_count:1,ready:true,
        issues:[],warnings:[],content_hash:"a".repeat(64),advisory_only:true});
      if(path==="/courses/1/publish"||path==="/courses/1/unpublish"){
        server.courses[0].is_published=path.endsWith("/publish");
        for(const item of server.currentLessons.get(1)){item.is_published=server.courses[0].is_published;item.status=item.is_published?"published":"draft";}
        return response(200,{published:server.courses[0].is_published});
      }
      if(path==="/courses/1"&&request.method==="PATCH"){Object.assign(server.courses[0],request.body);return response(200,{saved:true});}
      if(path==="/courses/1"&&request.method==="DELETE"){server.courses.shift();server.currentLessons.delete(1);return response(200,{deleted:true});}
      if(path==="/lessons/101"&&request.method==="PATCH"){Object.assign(server.currentLessons.get(1)[0],request.body);return response(200,{saved:true});}
      if(path==="/lessons/101"&&request.method==="DELETE"){server.currentLessons.set(1,[]);return response(200,{deleted:true});}
      throw new Error("Unexpected fixture request: "+request.method+" "+path);
    }});
  new Script(source,{filename:"actual-admin-version-history"}).runInContext(context);
  const editor=context.editor;
  async function emit(node,type,extra={}){
    for(const handler of node.events.get(type)||[])await handler({preventDefault(){},...extra});await setImmediate();
  }
  const chooseCourse=id=>emit(get("course-items"),"click",{target:{closest:()=>({dataset:{course:String(id)}})}});
  const chooseCurrent=id=>emit(get("lesson-items"),"click",{target:{closest:()=>get("lesson-items")
    .querySelectorAll("[data-lesson]").find(node=>Number(node.dataset.lesson)===id)}});
  if(load){await editor.refreshCourses(1);await chooseCurrent(101);}
  const click=id=>emit(typeof id==="string"?get(id):id,"click");
  const selectVersion=number=>click(get("editorial-version-list").children.find(node=>Number(node.dataset.archiveVersion)===number));
  const selectLesson=id=>click(get("editorial-version-lessons").children.find(node=>Number(node.dataset.archiveLesson)===id));
  return {editor,state:editor.state,get,server,control,requests,dialogs,click,chooseCourse,chooseCurrent,selectVersion,selectLesson,
    submit:form=>emit(get(form+"-form"),"submit"),
    fields:()=>[...courseFields,...lessonFields].map(id=>get(id).value),
    reads:()=>requests.filter(row=>row.path.includes("/versions")),writes:()=>requests.filter(row=>row.method!=="GET"),
    open:async()=>{await click("refresh-editorial-versions");await selectVersion(2);await selectLesson(21);}};
}
function dirty(h){
  for(const [id,value] of [["course-title","Título local não salvo"],["course-category","negocios"],
    ["course-summary","  Resumo local preservado  "],["course-sort","9"],["lesson-title","Aula em edição"],
    ["lesson-body","  Corpo local preservado, sem salvar.  "],["lesson-sort","8"]])h.get(id).value=value;
  return h.fields();
}
let cases=0;
async function scenario(label,run){try{await run();}catch(error){error.message=label+": "+error.message;throw error;}cases++;}
const parser=(await harness({load:false})).editor;

await scenario("only archive metadata is retained and canonical cursors bind to page edges",()=>{
  const payload=versions();payload.course_title="Current, not historical";payload.versions[0].body="Forbidden list body";
  assert.deepEqual(clone(parser.validatedArchivedVersions(payload,1)),{versions:[version(),version(1,0)],next_before_version:null});
  const fifty=Array.from({length:50},(_,i)=>version(51-i,0));
  assert.ok(parser.validatedArchivedVersions(versions(fifty,2),1));
  assert.ok(parser.validatedArchivedVersions(versions([version(1,0)]),1,2,fifty));
});
for(const input of [null,[],{}, {...versions(),schema_version:"1"},{...versions(),scope:"current_editorial_catalog"},
  {...versions(),course_id:2},{...versions(),versions:[version(0)]},{...versions(),versions:[{...version(),status:"draft"}]},
  {...versions(),versions:[{...version(),lesson_count:"2"}]},{...versions(),versions:[{...version(),lesson_count:-1}]},
  {...versions(),versions:[version(),version()]},{...versions(),versions:[version(1),version(2)]},
  {...versions(),next_before_version:1},{...versions(),next_before_version:undefined},
  versions(Array.from({length:51},(_,i)=>version(51-i,0)))]){
  await scenario("invalid version envelope or page never masquerades as an archive",()=>assert.equal(parser.validatedArchivedVersions(input,1),null));
}
await scenario("a duplicate or wrong boundary on later version pages is rejected",()=>{
  assert.equal(parser.validatedArchivedVersions(versions([version(2)]),1,2,[version(2)]),null);
  const page=Array.from({length:50},(_,i)=>version(60-i));assert.equal(parser.validatedArchivedVersions(versions(page,12),1),null);
});
await scenario("lesson metadata and body use codepoints and strict allowlists",()=>{
  const item={...lesson(),title:"😀".repeat(200)},payload=lessons([{...item}],null);payload.lessons[0].body="Not a metadata field";
  assert.deepEqual(clone(parser.validatedArchivedLessons(payload,1,2,null,[],1)),{lessons:[item],next_after:null});
  const body=detail(item);body.lesson.body="😀".repeat(30000);body.lesson.identity="private";
  assert.equal(parser.validatedArchivedLesson(body,1,2,item).body,body.lesson.body);
  assert.ok(!Object.hasOwn(parser.validatedArchivedLesson(body,1,2,item),"identity"));
  body.lesson.body+="😀";assert.equal(parser.validatedArchivedLesson(body,1,2,item),null);
});
for(const input of [{...lessons(),course_id:2},{...lessons(),course_version:3},{...lessons(),status:"published"},
  lessons([lesson(),lesson()]),lessons([lesson(22,1),lesson(21,0)]),lessons([{...lesson(),id:"21"}]),
  lessons([{...lesson(),slug:"../private"}]),lessons([{...lesson(),title:" "}]),lessons([{...lesson(),title:"😀".repeat(201)}]),
  lessons([{...lesson(),sort_order:-1}]),lessons([{...lesson(),sort_order:Number.MAX_SAFE_INTEGER+1}]),
  lessons([lesson()],{sort_order:0,lesson_id:21}),{...lessons(),next_after:undefined}]){
  await scenario("invalid lesson metadata never enables a body request",()=>assert.equal(parser.validatedArchivedLessons(input,1,2),null));
}
await scenario("lesson cursor, total and duplicate checks continue across pages",()=>{
  const rows=Array.from({length:50},(_,i)=>lesson(100+i,Math.floor(i/2))),last=rows.at(-1);
  const cursor={sort_order:last.sort_order,lesson_id:last.id};
  assert.ok(parser.validatedArchivedLessons(lessons(rows,cursor),1,2,null,[],51));
  assert.ok(parser.validatedArchivedLessons(lessons([lesson(150,25)]),1,2,cursor,rows,51));
  assert.equal(parser.validatedArchivedLessons(lessons([lesson(149,25)]),1,2,cursor,rows,51),null);
  assert.equal(parser.validatedArchivedLessons(lessons([lesson(150,25)]),1,2,cursor,rows,52),null);
  assert.equal(parser.validatedArchivedLessons(lessons(rows,{...cursor,lesson_id:148}),1,2,null,[],51),null);
  assert.ok(parser.validatedArchivedLessons(lessons([lesson(150,24)]),1,2,cursor,rows,51));
  assert.equal(parser.validatedArchivedLessons(lessons([lesson(150,23)]),1,2,cursor,rows,51),null);
});
for(const input of [{...detail(),course_id:2},{...detail(),course_version:1},{...detail(),status:"draft"},
  {...detail(),lesson:{...detail().lesson,id:22}},{...detail(),lesson:{...detail().lesson,title:"Other archived lesson"}},
  {...detail(),lesson:{...detail().lesson,slug:"other"}},{...detail(),lesson:{...detail().lesson,sort_order:9}},
  {...detail(),lesson:{...detail().lesson,body:" "}}]){
  await scenario("a body must match the selected course, version and immutable lesson metadata",()=>assert.equal(parser.validatedArchivedLesson(input,1,2,lesson()),null));
}
await scenario("archive reads require deliberate clicks and never write or fetch bodies in lists",async()=>{
  const h=await harness();assert.equal(h.reads().length,0);assert.equal(h.get("refresh-editorial-versions").disabled,false);
  await h.click("refresh-editorial-versions");assert.equal(h.reads().length,1);assert.equal(h.state.archive.lesson,null);
  await h.selectVersion(2);assert.equal(h.reads().length,2);assert.equal(h.get("editorial-version-content").hidden,true);
  assert.ok(!Object.hasOwn(h.state.archive.lessons[0],"body"));
  await h.selectLesson(21);assert.equal(h.reads().length,3);assert.equal(h.writes().length,0);assert.equal(h.dialogs.length,0);
  assert.ok(h.get("editorial-version-content").textContent.includes("<script>conteudoNaoExecutavel()</script>"));
  assert.equal(h.get("editorial-version-content").children.some(node=>node.tagName==="SCRIPT"),false);
  assert.ok(h.get("editorial-versions-context").textContent.includes("cadastro atual"));
  assert.ok(!h.get("editorial-version-content").textContent.includes("Cadastro atual"));
});
await scenario("reading, paging and retry preserve both unsaved forms and publication diagnostics",async()=>{
  const h=await harness(),before=dirty(h),preflight=h.state.preflightRequest;await h.open();
  await h.selectVersion(1);await h.selectVersion(2);await h.selectLesson(22);
  assert.deepEqual(h.fields(),before);assert.equal(h.state.preflightRequest,preflight);assert.equal(h.dialogs.length,0);
  assert.equal(h.state.course.id,1);assert.equal(h.state.lesson.id,101);assert.equal(h.writes().length,0);
});
await scenario("zero archived versions and an empty archived version are real empty states",async()=>{
  const h=await harness();await h.chooseCourse(2);await h.click("refresh-editorial-versions");
  assert.equal(h.state.archive.versionsLoaded,true);assert.equal(h.state.archive.versions.length,0);
  assert.ok(h.get("editorial-versions-status").textContent.includes("não possui versões"));
  await h.chooseCourse(1);await h.click("refresh-editorial-versions");await h.selectVersion(1);
  assert.equal(h.state.archive.lessonsLoaded,true);assert.equal(h.state.archive.lessons.length,0);
  assert.ok(h.get("editorial-version-lessons-status").textContent.includes("não possui aulas"));
});
await scenario("both metadata endpoints page in order without truncation or automatic body reads",async()=>{
  const h=await harness();h.server.versions.set(1,Array.from({length:51},(_,i)=>version(51-i,51)));
  h.server.archived.set("1:51",Array.from({length:51},(_,i)=>lesson(1000+i,Math.floor(i/2))));
  await h.click("refresh-editorial-versions");assert.equal(h.state.archive.versions.length,50);
  await h.click("more-editorial-versions");assert.equal(h.state.archive.versions.length,51);assert.equal(h.get("more-editorial-versions").hidden,true);
  assert.equal(h.reads()[1].query,"?before_version=2");await h.selectVersion(51);await h.click("more-version-lessons");
  assert.equal(h.state.archive.lessons.length,51);assert.equal(h.get("more-version-lessons").hidden,true);
  assert.equal(h.reads()[3].query,"?after_sort_order=24&after_lesson_id=1049");
  assert.equal(h.reads().some(row=>/\/lessons\/\d+$/.test(row.path)),false);assert.equal(h.writes().length,0);
});
for(const kind of ["versions","lessons","body"])for(const failed of [response(503,{}),response(404,{}),response(422,{}),response(200,{})]){
  await scenario(kind+" failure clears only the read panel and recovers without altering drafts",async()=>{
    const h=await harness(),before=dirty(h);await h.open();
    const path=kind==="versions"?"/courses/1/versions":kind==="lessons"?"/courses/1/versions/2/lessons":"/courses/1/versions/2/lessons/21";
    h.control.hook=req=>req.path===path?failed:undefined;
    if(kind==="versions")await h.click("refresh-editorial-versions");else if(kind==="lessons")await h.selectVersion(2);else await h.selectLesson(21);
    assert.equal(h.state.archive.lesson,null);assert.deepEqual(h.fields(),before);assert.equal(h.state.catalogReady,true);
    assert.equal(h.state.writeOutcomeUnknown,false);assert.equal(h.writes().length,0);h.control.hook=null;
    await h.open();assert.equal(h.state.archive.lesson.id,21);assert.deepEqual(h.fields(),before);
  });
}
await scenario("cancelled course changes and New retain the archive and every local field",async()=>{
  const h=await harness();await h.open();const before=dirty(h),snapshot=clone(h.state.archive);h.control.accept=false;
  await h.chooseCourse(2);await h.click("new-course");assert.deepEqual(h.fields(),before);assert.deepEqual(clone(h.state.archive),snapshot);
  assert.equal(h.state.course.id,1);assert.equal(h.dialogs.length,2);
  h.control.accept=true;await h.chooseCourse(2);assert.equal(h.state.archive.lesson,null);assert.equal(h.state.archive.versions.length,0);
  assert.equal(h.get("editorial-version-content").textContent,"");assert.equal(h.reads().length,3);
});
await scenario("a confirmed New course discards old archive and disables its reads",async()=>{
  const h=await harness();await h.open();await h.click("new-course");
  assert.equal(h.state.course,null);assert.equal(h.state.archive.lesson,null);assert.equal(h.get("refresh-editorial-versions").disabled,true);
  await h.click("refresh-editorial-versions");assert.equal(h.reads().length,3);
});
await scenario("duplicate reads of the same pending index or body remain single-flight",async()=>{
  const h=await harness();let release;h.control.hook=req=>req.path==="/courses/1/versions"?new Promise(resolve=>{release=resolve;}):undefined;
  const pending=h.editor.loadEditorialArchiveVersions();await h.click("refresh-editorial-versions");assert.equal(h.reads().length,1);
  release(response(200,versions()));await pending;h.control.hook=null;await h.selectVersion(2);
  h.control.hook=req=>req.path.endsWith("/lessons/21")?new Promise(resolve=>{release=resolve;}):undefined;
  const body=h.editor.loadEditorialArchiveBody(21);await h.selectLesson(21);assert.equal(h.reads().length,3);
  release(response(200,detail()));await body;assert.equal(h.state.archive.lesson.id,21);
});
for(const kind of ["versions","lessons","body"]){
  await scenario("a late "+kind+" response cannot follow a different selected course",async()=>{
    const h=await harness();if(kind!=="versions")await h.click("refresh-editorial-versions");if(kind==="body")await h.selectVersion(2);
    let release;h.control.hook=req=>req.path.includes("/versions")?new Promise(resolve=>{release=resolve;}):undefined;
    const pending=kind==="versions"?h.editor.loadEditorialArchiveVersions():kind==="lessons"?h.editor.loadEditorialArchiveLessons(2):h.editor.loadEditorialArchiveBody(21);
    await h.chooseCourse(2);release(response(200,kind==="versions"?versions():kind==="lessons"?lessons():detail()));await pending;
    assert.equal(h.state.course.id,2);assert.equal(h.state.archive.lesson,null);assert.equal(h.state.archive.versions.length,0);
    assert.equal(h.get("editorial-version-content").textContent,"");
  });
}
await scenario("old version and old body cannot replace a newer selection",async()=>{
  const h=await harness();await h.click("refresh-editorial-versions");let release;
  h.control.hook=req=>req.path==="/courses/1/versions/2/lessons"?new Promise(resolve=>{release=resolve;}):undefined;
  const first=h.editor.loadEditorialArchiveLessons(2);await h.selectVersion(1);release(response(200,lessons()));await first;
  assert.equal(h.state.archive.selectedVersion,1);assert.equal(h.state.archive.lessons.length,0);
  h.control.hook=null;await h.selectVersion(2);
  h.control.hook=req=>req.path.endsWith("/lessons/21")?new Promise(resolve=>{release=resolve;}):undefined;
  const old=h.editor.loadEditorialArchiveBody(21);await h.selectLesson(22);release(response(200,detail()));await old;
  assert.equal(h.state.archive.lesson.id,22);assert.ok(!h.get("editorial-version-content").textContent.includes("Título arquivado 21"));
});
await scenario("late JSON after refresh or denial cannot restore an old body",async()=>{
  for(const deny of [false,true]){
    const h=await harness();await h.click("refresh-editorial-versions");await h.selectVersion(2);let release;
    h.control.hook=req=>req.path.endsWith("/lessons/21")?{status:200,ok:true,json:()=>new Promise(resolve=>{release=resolve;})}:undefined;
    const pending=h.editor.loadEditorialArchiveBody(21);await setImmediate();
    if(deny)h.editor.lockAccess("Synthetic revoked");else await h.editor.refreshCourses(1);
    release(detail());await pending;assert.equal(h.state.archive.lesson,null);assert.equal(h.get("editorial-version-content").textContent,"");
  }
});
for(const status of [403,419])for(const kind of ["versions","lessons","body"]){
  await scenario(status+" on "+kind+" purges all private editorial and archived content",async()=>{
    const h=await harness();await h.open();dirty(h);
    const path=kind==="versions"?"/courses/1/versions":kind==="lessons"?"/courses/1/versions/2/lessons":"/courses/1/versions/2/lessons/21";
    h.control.hook=req=>req.path===path?response(status,{}):undefined;
    if(kind==="versions")await h.click("refresh-editorial-versions");else if(kind==="lessons")await h.selectVersion(2);else await h.selectLesson(21);
    assert.equal(h.state.accessDenied,true);assert.equal(h.state.archive.lesson,null);assert.equal(h.state.archive.versions.length,0);
    assert.equal(h.get("editorial-versions-context").textContent,"");assert.equal(h.get("editorial-versions-panel").hidden,true);
    assert.equal(h.get("lesson-body").value,"");assert.equal(h.get("course-title").value,"");assert.equal(h.writes().length,0);
  });
}
for(const operation of ["save-course","create-course","save-lesson","create-lesson","delete-lesson","delete-course","publish","unpublish"]){
  await scenario(operation+" invalidates archive reads without replaying the editorial write",async()=>{
    const h=await harness({published:operation==="unpublish"});await h.open();
    if(operation==="save-course")h.get("course-title").value="Curso alterado";
    if(operation==="save-lesson")h.get("lesson-body").value="Texto do rascunho alterado.";
    if(operation==="create-course"){
      await h.click("new-course");h.get("course-title").value="Curso novo";h.get("course-slug").value="curso-novo";
    }
    if(operation==="create-lesson"){
      await h.click("clear-lesson");h.get("lesson-title").value="Aula nova";h.get("lesson-slug").value="aula-nova";h.get("lesson-body").value="Texto suficiente da nova aula.";
    }
    if(operation==="publish")await h.click("check-publication");
    let release;h.control.hook=req=>req.path==="/courses/1/versions"?new Promise(resolve=>{release=resolve;}):undefined;
    const pending=operation==="create-course"?null:h.editor.loadEditorialArchiveVersions();
    if(operation.endsWith("course")&&operation!=="delete-course")await h.submit("course");
    else if(operation.endsWith("lesson")&&operation!=="delete-lesson")await h.submit("lesson");else await h.click(operation);
    if(pending){release(response(200,versions()));await pending;}
    assert.equal(h.state.archive.versions.length,0);assert.equal(h.state.archive.lesson,null);assert.equal(h.writes().length,1);
    assert.equal(h.state.accessDenied,false);
  });
}
await scenario("uncertain editorial writes clear the archive while preserving the disabled local drafts",async()=>{
  const h=await harness();await h.open();const before=dirty(h);h.editor.freezeUncertainEditorialWrite();
  assert.deepEqual(h.fields(),before);assert.equal(h.state.archive.lesson,null);assert.equal(h.get("refresh-editorial-versions").disabled,true);
  await h.click("refresh-editorial-versions");assert.equal(h.reads().length,3);assert.equal(h.writes().length,0);
});

console.log("PASS editorial archive: "+cases+" actual-script scenarios; scoped metadata pagination, single-body reads, Unicode, preserved drafts and stale-response fences");
