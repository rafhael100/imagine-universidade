#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";

// Run the actual editor, API wrapper, refreshes and submit/click handlers.
// Only DOM primitives and the synthetic HTTP server are supplied here;
// preservation, selection, revocation and write decisions stay in the view.
const view=readFileSync(new URL("../resources/views/university/admin.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";');
const end=view.indexOf("// The UI always publishes",start);
assert.ok(start>=0&&end>start,"Actual editor source boundaries must exist");
const source=view.slice(start,end)+"\nglobalThis.editor={state,refreshCourses,refreshLessons,beginWrite,courseHasUnsavedEdits,lessonHasUnsavedEdits,mustConfirmBrowserExit};";
const clone=value=>JSON.parse(JSON.stringify(value));
const courseFields=["course-title","course-slug","course-category","course-summary","course-sort"];
const lessonFields=["lesson-title","lesson-slug","lesson-body","lesson-sort"];
const courseButtons=["new-course","course-save","check-publication","publish","unpublish","delete-course","retry-catalog"];
const lessonButtons=["lesson-save","clear-lesson","preview-lesson","delete-lesson"];
const response=(status,payload)=>({status,ok:status>=200&&status<300,json:async()=>clone(payload)});
const fixtureCourse=(id=1)=>({id,slug:"curso-ficticio-"+id,title:"Curso salvo "+id,
  category:"metodologia",summary:"Resumo salvo "+id,sort_order:id,is_published:false});
const fixtureLesson=(id=11)=>({id,slug:"aula-ficticia-"+id,title:"Aula salva "+id,
  body:"Conteúdo original da aula fictícia "+id+".",sort_order:id-10,status:"draft",is_published:false});

async function harness(){
  const nodes=new Map(),handlers=new Map(),requests=[],dialogs=[];
  const control={accept:true,fetchHook:null};
  const server={courses:[fixtureCourse(),fixtureCourse(2)],
    lessons:new Map([[1,[fixtureLesson(),fixtureLesson(12)]],[2,[fixtureLesson(21)]]]),nextLessonId:30};
  function element(tagName="DIV",id=null){
    return {tagName,id,value:"",textContent:"",disabled:false,hidden:true,inert:false,
      dataset:{},children:[],attributes:{},className:"",
      append(...items){this.children.push(...items);},
      replaceChildren(...items){this.children=items;},
      setAttribute(name,value){this.attributes[name]=String(value);},
      addEventListener(event,fn){handlers.set(id+":"+event,fn);},
      querySelectorAll(){return id==="lesson-form"?[...lessonFields,...lessonButtons].map(node):[];},
      reset(){for(const field of lessonFields)node(field).value=field==="lesson-sort"?"0":"";},
      focus(){},scrollIntoView(){},
    };
  }
  function node(id){
    if(!nodes.has(id)){
      const tagName=id==="course-category"?"SELECT":id.endsWith("summary")||id==="lesson-body"?"TEXTAREA":
        [...courseFields,...lessonFields].includes(id)?"INPUT":
        [...courseButtons,...lessonButtons].includes(id)?"BUTTON":"DIV";
      nodes.set(id,element(tagName,id));
    }
    return nodes.get(id);
  }
  const document={getElementById:node,createElement:tag=>element(tag.toUpperCase()),
    querySelector:selector=>selector.startsWith("meta")?{content:"synthetic-csrf"}:node("layout"),
    querySelectorAll:()=>[...courseFields,...lessonFields,...courseButtons,...lessonButtons,
      "refresh-audit","load-more-audit"].map(node)};
  async function fetch(url,options){
    const path=url.replace("/universidade/private/admin","");
    const request={path,method:options.method,body:options.body===undefined?null:JSON.parse(options.body)};
    requests.push(request);
    if(control.fetchHook){
      const custom=await control.fetchHook(request);
      if(custom!==undefined)return custom;
    }
    if(request.method==="GET"&&path==="/courses")return response(200,{courses:server.courses});
    const list=path.match(/^\/courses\/(\d+)\/lessons$/);
    if(list&&request.method==="GET")return response(200,{lessons:server.lessons.get(Number(list[1]))||[]});
    if(list&&request.method==="POST"){
      const id=server.nextLessonId++;
      const lesson={id,...request.body,status:"draft",is_published:false};
      server.lessons.get(Number(list[1])).push(lesson);
      return response(201,{id,status:"draft"});
    }
    const course=path.match(/^\/courses\/(\d+)$/);
    if(course&&request.method==="PATCH"){
      Object.assign(server.courses.find(row=>row.id===Number(course[1])),request.body);
      return response(200,{saved:true});
    }
    const lesson=path.match(/^\/lessons\/(\d+)$/);
    if(lesson){
      for(const rows of server.lessons.values()){
        const index=rows.findIndex(row=>row.id===Number(lesson[1]));
        if(index<0)continue;
        if(request.method==="PATCH"){
          Object.assign(rows[index],request.body);return response(200,{saved:true});
        }
        if(request.method==="DELETE"){
          rows.splice(index,1);return response(200,{deleted:true});
        }
      }
    }
    throw new Error("Unexpected synthetic request: "+request.method+" "+path);
  }
  const context=createContext({document,fetch,window:{addEventListener(){}},
    confirm:message=>{dialogs.push(message);return control.accept;}});
  new Script(source,{filename:"actual-admin-editor-drafts"}).runInContext(context);
  const editor=context.editor;
  await editor.refreshCourses(1);
  const click=(id,targetId=null)=>{
    const dataset=id==="course-items"?{course:String(targetId)}:{lesson:String(targetId)};
    return handlers.get(id+":click")({target:{closest:()=>({dataset})}});
  };
  click("lesson-items",11);
  requests.length=0;
  return {editor,node,control,server,requests,dialogs,click,
    submit:id=>handlers.get(id+"-form:submit")({preventDefault(){}}),
    fields:ids=>ids.map(id=>node(id).value),
    writes:()=>requests.filter(request=>request.method!=="GET"),
  };
}
function changeCourse(h){
  h.node("course-title").value="Título de curso ainda não salvo";
  h.node("course-category").value="negocios";
  h.node("course-summary").value="  Resumo local com espaços preservados.  ";
  h.node("course-sort").value="8";
  return h.fields(courseFields);
}
function changeLesson(h){
  h.node("lesson-title").value="Aula com edição local";
  h.node("lesson-body").value="Texto local da aula ainda não salvo.";
  h.node("lesson-sort").value="7";
  return h.fields(lessonFields);
}
function assertRevoked(h){
  assert.equal(h.editor.state.accessDenied,true);
  assert.equal(h.editor.state.course,null);
  assert.equal(h.editor.state.lesson,null);
  for(const id of [...courseFields,...lessonFields]){
    if(id!=="course-category")assert.equal(h.node(id).value,"",id+" must not restore revoked content");
    assert.equal(h.node(id).disabled,true,id+" must remain disabled");
  }
  assert.equal(h.editor.beginWrite(),false);
}
let scenarios=0;
async function scenario(label,run){
  try{await run();}catch(error){error.message=label+": "+error.message;throw error;}
  scenarios++;
}

await scenario("course save with a dirty lesson has no request and preserves both forms",async()=>{
  const h=await harness(),course=changeCourse(h),lesson=changeLesson(h);
  await h.submit("course");
  assert.equal(h.requests.length,0);
  assert.equal(h.dialogs.length,0);
  assert.deepEqual(h.fields(courseFields),course);
  assert.deepEqual(h.fields(lessonFields),lesson);
  assert.equal(h.editor.state.lesson.id,11);
  assert.match(h.node("status").textContent,/Salve a aula em edição antes de salvar o curso/);
  assert.equal(h.editor.state.writePending,false);
});
await scenario("save lesson then course preserves every sibling field and selected lesson",async()=>{
  const h=await harness(),course=changeCourse(h),lesson=changeLesson(h);
  await h.submit("lesson");
  assert.deepEqual(h.fields(courseFields),course);
  assert.deepEqual(h.fields(lessonFields),lesson);
  assert.equal(h.editor.state.lesson.id,11);
  assert.equal(h.node("lesson-slug").disabled,true);
  assert.equal(h.node("delete-lesson").disabled,false);
  assert.equal(h.editor.courseHasUnsavedEdits(),true);
  assert.equal(h.editor.lessonHasUnsavedEdits(),false);
  assert.deepEqual(h.writes().map(write=>[write.method,write.path]),[["PATCH","/lessons/11"]]);
  await h.submit("course");
  assert.equal(h.editor.state.lesson.id,11);
  assert.deepEqual(h.fields(lessonFields),lesson);
  assert.equal(h.editor.courseHasUnsavedEdits(),false);
  assert.equal(h.editor.lessonHasUnsavedEdits(),false);
  assert.deepEqual(h.writes().map(write=>[write.method,write.path]),
    [["PATCH","/lessons/11"],["PATCH","/courses/1"]]);
  assert.equal(h.server.courses[0].title,course[0]);
  assert.equal(h.server.courses[0].category,course[2]);
  assert.equal(h.server.courses[0].summary,course[3].trim());
  assert.equal(h.server.courses[0].sort_order,8);
});
await scenario("new lesson creation preserves the course and selects only its returned authorized ID",async()=>{
  const h=await harness(),course=changeCourse(h);
  h.click("clear-lesson");
  changeLesson(h);h.node("lesson-slug").value="nova-aula-ficticia";
  await h.submit("lesson");
  assert.deepEqual(h.fields(courseFields),course);
  assert.equal(h.editor.state.lesson.id,30);
  assert.equal(h.node("lesson-slug").value,"nova-aula-ficticia");
  assert.equal(h.node("lesson-slug").disabled,true);
  assert.equal(h.editor.lessonHasUnsavedEdits(),false);
  assert.deepEqual(h.writes().map(write=>[write.method,write.path]),[["POST","/courses/1/lessons"]]);
});
await scenario("cancelled deletion preserves drafts and sends no request; accepted deletion keeps course edits",async()=>{
  const h=await harness(),course=changeCourse(h),lesson=changeLesson(h);
  h.control.accept=false;
  await h.click("delete-lesson");
  assert.equal(h.requests.length,0);
  assert.deepEqual(h.fields(courseFields),course);
  assert.deepEqual(h.fields(lessonFields),lesson);
  h.control.accept=true;
  await h.click("delete-lesson");
  assert.equal(h.dialogs.length,2);
  assert.deepEqual(h.fields(courseFields),course);
  assert.equal(h.editor.state.lesson,null);
  assert.equal(h.node("lesson-body").value,"");
  assert.equal(h.node("delete-lesson").disabled,true);
  assert.equal(h.editor.courseHasUnsavedEdits(),true);
  assert.deepEqual(h.writes().map(write=>[write.method,write.path]),[["DELETE","/lessons/11"]]);
});
await scenario("explicit draft discard may be cancelled before the guided course save",async()=>{
  const h=await harness(),course=changeCourse(h),lesson=changeLesson(h);
  await h.submit("course");
  h.control.accept=false;h.click("clear-lesson");
  assert.deepEqual(h.fields(courseFields),course);
  assert.deepEqual(h.fields(lessonFields),lesson);
  assert.equal(h.requests.length,0);
  h.control.accept=true;h.click("clear-lesson");
  await h.submit("course");
  assert.equal(h.editor.state.lesson,null);
  assert.equal(h.server.courses[0].title,course[0]);
  assert.deepEqual(h.writes().map(write=>[write.method,write.path]),[["PATCH","/courses/1"]]);
});
await scenario("refresh preserves an existing selection but never revives a removed lesson",async()=>{
  const h=await harness(),course=changeCourse(h);
  h.click("lesson-items",12);
  await h.editor.refreshLessons();
  assert.equal(h.editor.state.lesson.id,12);
  assert.equal(h.node("lesson-body").value,fixtureLesson(12).body);
  assert.deepEqual(h.fields(courseFields),course);
  h.server.lessons.set(1,[fixtureLesson()]);
  await h.editor.refreshLessons();
  assert.equal(h.editor.state.lesson,null);
  assert.equal(h.node("lesson-body").value,"");
  assert.deepEqual(h.fields(courseFields),course);
  assert.equal(h.node("delete-lesson").disabled,true);
});
await scenario("an out-of-order lesson refresh cannot restore the previous course selection",async()=>{
  const h=await harness();
  let release,started;
  const pending=new Promise(resolve=>{started=resolve;});
  h.control.fetchHook=request=>{
    if(request.path==="/courses/1/lessons")return new Promise(resolve=>{release=resolve;started();});
  };
  const old=h.editor.refreshLessons(11);await pending;
  await h.click("course-items",2);
  h.click("lesson-items",21);
  release(response(200,{lessons:[fixtureLesson()]}));
  await old;
  assert.equal(h.editor.state.course.id,2);
  assert.equal(h.editor.state.lesson.id,21);
  assert.equal(h.node("course-title").value,fixtureCourse(2).title);
  assert.equal(h.node("lesson-body").value,fixtureLesson(21).body);
});
await scenario("403 after a lesson save clears sibling drafts and cannot restore revoked data",async()=>{
  const h=await harness();changeCourse(h);changeLesson(h);
  h.control.fetchHook=request=>request.method==="GET"&&request.path==="/courses/1/lessons"
    ?response(403,{error:"access_denied"}):undefined;
  await h.submit("lesson");
  assertRevoked(h);
  assert.equal(h.writes().length,1);
  const count=h.requests.length;
  await h.submit("course");await h.submit("lesson");
  assert.equal(h.requests.length,count);
});
await scenario("a late 200 after revocation never restores preserved fields or lesson selection",async()=>{
  const h=await harness();changeCourse(h);
  let release,started;
  const pending=new Promise(resolve=>{started=resolve;});
  h.control.fetchHook=request=>{
    if(request.path==="/courses/1/lessons")return new Promise(resolve=>{release=resolve;started();});
    if(request.path==="/courses")return response(403,{error:"access_denied"});
  };
  const old=h.editor.refreshLessons(11);await pending;
  await assert.rejects(h.editor.refreshCourses(1));
  release(response(200,{lessons:[fixtureLesson()]}));
  await assert.rejects(old);
  assertRevoked(h);
});
await scenario("ambiguous committed write preserves both forms, freezes controls and never replays",async()=>{
  const h=await harness(),course=changeCourse(h),lesson=changeLesson(h);
  h.control.fetchHook=request=>{
    if(request.path==="/lessons/11"&&request.method==="PATCH"){
      Object.assign(h.server.lessons.get(1)[0],request.body);
      return response(503,{error:"response_lost_after_commit"});
    }
  };
  await h.submit("lesson");
  assert.deepEqual(h.fields(courseFields),course);
  assert.deepEqual(h.fields(lessonFields),lesson);
  assert.equal(h.editor.state.writeOutcomeUnknown,true);
  assert.equal(h.editor.state.catalogReady,false);
  assert.equal(h.editor.state.lessonsReady,false);
  assert.equal(h.editor.beginWrite(),false);
  assert.equal(h.node("course-save").disabled,true);
  assert.equal(h.node("lesson-save").disabled,true);
  assert.match(h.node("status").textContent,/Não repita a operação/);
  await h.submit("lesson");await h.submit("course");
  assert.equal(h.requests.length,1);
  assert.equal(h.writes().length,1);
});
await scenario("failed post-save lesson refresh keeps the unsaved course and the existing write fence",async()=>{
  const h=await harness(),course=changeCourse(h);changeLesson(h);
  h.control.fetchHook=request=>request.method==="GET"&&request.path==="/courses/1/lessons"
    ?response(503,{error:"temporarily_unavailable"}):undefined;
  await h.submit("lesson");
  assert.deepEqual(h.fields(courseFields),course);
  assert.equal(h.editor.state.writeOutcomeUnknown,true);
  assert.equal(h.editor.beginWrite(),false);
  assert.equal(h.writes().length,1);
  assert.equal(h.requests.length,2);
});
console.log("PASS editor draft preservation: "+scenarios+" actual-handler scenarios; sibling drafts, selection, revocation and ambiguous writes");
