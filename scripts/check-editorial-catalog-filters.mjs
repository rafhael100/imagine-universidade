#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Run the entire production script and its registered handlers. Only startup,
// DOM primitives, HTTP and confirmation are replaced; no browser or PHP runs.
const view=readFileSync(new URL("../resources/views/university/admin.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
const boot='loadAdminCatalog();\n(async()=>{try{await refreshAudit();}catch(error){say(error.message);}})();';
assert.ok(start>=0&&end>start&&view.slice(start,end).includes(boot));
const exposed=["state","normalizeEditorialSearch","filteredEditorialCourses","renderEditorialCourseFilters",
  "updateEditorialCourseFilters","renderCourses","refreshCourses","loadAdminCatalog","refreshAudit",
  "beginWrite","finishWrite","freezeUncertainEditorialWrite","lockAccess",
  "loadEditorialArchiveVersions","loadEditorialArchiveLessons","loadEditorialArchiveBody"];
const source=view.slice(start,end).replace(boot,"")+"\nglobalThis.editor={"+exposed.join(",")+"};";
const clone=value=>JSON.parse(JSON.stringify(value));
const courseFields=["course-title","course-slug","course-category","course-summary","course-sort"];
const lessonFields=["lesson-title","lesson-slug","lesson-body","lesson-sort"];
const filters=["editorial-course-search","editorial-category-filter","editorial-state-filter"];
const controls=[...filters,"clear-editorial-filters"];
const fixtures=()=>[
  {id:1,slug:"fundamentos-editoriais",title:"Ação e método",summary:"Organização para começar",category:"metodologia",is_published:false},
  {id:2,slug:"gestao-comercial",title:"Gestão de vendas",summary:"Funil comercial",category:"negocios",is_published:true},
  {id:3,slug:"painel-imagine",title:"Painel Imagine",summary:"Automação de relatórios",category:"sistemas",is_published:false},
  {id:4,slug:"planejamento-financeiro",title:"Planejamento financeiro",summary:"Orçamento e margem",category:"negocios",is_published:false},
  {id:5,slug:"metodologia-aplicada",title:"Metodologia aplicada",summary:null,category:"metodologia",is_published:true},
  {id:6,slug:"canais-sistema",title:"Integração e canais",summary:"Gestão das conexões",category:"sistemas",is_published:true},
].map((course,index)=>({...course,sort_order:index}));
const archived={id:21,slug:"aula-antiga",title:"Título histórico",sort_order:0};
const response=(status,payload)=>({status,ok:status>=200&&status<300,json:async()=>clone(payload)});
const deferred=()=>{let resolve;const promise=new Promise(ready=>{resolve=ready;});return {promise,resolve};};

class Node{
  constructor(tagName="DIV",id=""){
    this.tagName=tagName;this.id=id;this.value="";this.ownText="";this.children=[];this.dataset={};this.attributes={};
    this.events=new Map();this.disabled=false;this.hidden=false;this.inert=false;this.className="";this.focused=false;
  }
  get textContent(){return this.ownText+this.children.map(child=>child.textContent).join("");}
  set textContent(value){this.ownText=String(value);this.children=[];}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.ownText="";this.children=nodes;}
  setAttribute(name,value){this.attributes[name]=String(value);}
  addEventListener(type,handler){const list=this.events.get(type)||[];list.push(handler);this.events.set(type,list);}
  focus(){this.focused=true;}
  scrollIntoView(){}
}
async function harness({load=true,selected=1,courses=fixtures()}={}){
  const nodes=new Map(),requests=[],dialogs=[];
  const control={accept:true,hook:null};
  const get=id=>{
    if(!nodes.has(id))nodes.set(id,new Node(id.includes("category")||id==="editorial-state-filter"?"SELECT":"INPUT",id));
    return nodes.get(id);
  };
  const server={courses:clone(courses),lessons:new Map(courses.map(course=>[course.id,[{
    id:course.id*100+1,slug:"aula-"+course.id,title:"Aula atual "+course.id,body:"Conteúdo salvo da aula.",sort_order:0,
    status:course.is_published?"published":"draft",is_published:course.is_published,
  }]]))};
  const document={getElementById:get,createElement:tag=>new Node(tag.toUpperCase()),
    querySelector:selector=>selector.startsWith("meta")?{content:"synthetic-csrf"}:get("layout"),
    querySelectorAll:()=>[...courseFields,...lessonFields,...controls,"new-course","course-save","lesson-save","publish",
      "unpublish","delete-course","delete-lesson","check-publication","refresh-audit","load-more-audit"].map(get)};
  get("course-category").value="metodologia";get("course-sort").value="0";get("lesson-sort").value="0";
  get("lesson-form").querySelectorAll=()=>[...lessonFields,"lesson-save","clear-lesson","preview-lesson","delete-lesson"].map(get);
  get("lesson-form").reset=()=>{for(const id of lessonFields)get(id).value=id.endsWith("sort")?"0":"";};
  const context=createContext({document,window:{addEventListener(){}},setTimeout,clearTimeout,
    confirm:message=>{dialogs.push(message);return control.accept;},
    fetch:async(url,options)=>{
      const parsed=new URL(url,"http://127.0.0.1"),path=parsed.pathname.replace("/universidade/private/admin","");
      const request={path,...options,body:options.body===undefined?null:JSON.parse(options.body)};requests.push(request);
      if(control.hook){const result=await control.hook(request);if(result!==undefined)return result;}
      if(path==="/courses"&&request.method==="GET")return response(200,{courses:server.courses});
      if(path==="/audit")return response(200,{events:[],next_before_id:null});
      if(path==="/overview"){
        const categories=["metodologia","negocios","sistemas"].map(category=>{
          const list=server.courses.filter(course=>course.category===category),published=list.filter(course=>course.is_published).length;
          return {category,courses:list.length,published_courses:published,draft_courses:list.length-published,current_lessons:list.length};
        });
        const totals=Object.fromEntries(["courses","published_courses","draft_courses","current_lessons"].map(key=>
          [key,categories.reduce((sum,row)=>sum+row[key],0)]));
        return response(200,{schema_version:1,scope:"current_editorial_catalog",categories,
          totals:{...totals,courses_without_lessons:0,courses_without_summary:server.courses.filter(course=>!course.summary).length}});
      }
      if(path==="/courses/1/publication-check")return response(200,{course_id:1,version:2,lesson_count:1,ready:true,
        issues:[],warnings:[],content_hash:"a".repeat(64),advisory_only:true});
      if(path==="/courses/1/versions")return response(200,{schema_version:1,scope:"editorial_archived_content",course_id:1,
        versions:[{version:1,status:"archived",lesson_count:1}],next_before_version:null});
      if(path==="/courses/1/versions/1/lessons")return response(200,{schema_version:1,scope:"editorial_archived_content",course_id:1,
        course_version:1,status:"archived",lessons:[archived],next_after:null});
      if(path==="/courses/1/versions/1/lessons/21")return response(200,{schema_version:1,scope:"editorial_archived_content",course_id:1,
        course_version:1,status:"archived",lesson:{...archived,body:"Corpo histórico preservado."}});
      const lessons=path.match(/^\/courses\/(\d+)\/lessons$/);
      if(lessons&&request.method==="GET")return response(200,{lessons:server.lessons.get(Number(lessons[1]))||[]});
      const course=path.match(/^\/courses\/(\d+)$/);
      if(course&&request.method==="PATCH"){
        Object.assign(server.courses.find(row=>row.id===Number(course[1])),request.body);return response(200,{saved:true});
      }
      throw new Error("Unexpected filter fixture request: "+request.method+" "+path);
    }});
  new Script(source,{filename:"actual-editorial-catalog-filters"}).runInContext(context);
  const editor=context.editor;
  async function emit(id,type,extra={}){
    for(const handler of get(id).events.get(type)||[])await handler({preventDefault(){},...extra});await setImmediate();
  }
  const chooseCourse=id=>emit("course-items","click",{target:{closest:()=>({dataset:{course:String(id)}})}});
  const chooseLesson=id=>emit("lesson-items","click",{target:{closest:()=>({dataset:{lesson:String(id)}})}});
  if(load){await editor.refreshCourses(selected);if(selected!==null)await chooseLesson(selected*100+1);}
  const filter=async(query="",category="todos",status="todos")=>{
    get(filters[0]).value=query;get(filters[1]).value=category;get(filters[2]).value=status;
    await emit(filters[0],"input");
  };
  return {editor,state:editor.state,get,control,server,requests,dialogs,emit,chooseCourse,chooseLesson,filter,
    click:id=>emit(id,"click"),submit:()=>emit("course-form","submit"),
    values:()=>[...courseFields,...lessonFields].map(id=>get(id).value),
    ids:()=>get("course-items").children.filter(node=>node.dataset.course).map(node=>Number(node.dataset.course)),
    matches:()=>clone(editor.filteredEditorialCourses().matches.map(row=>row.id)),
    filterState:()=>[editor.state.courseQuery,editor.state.courseCategory,editor.state.courseStatus],
    archive:async()=>{await editor.loadEditorialArchiveVersions();await editor.loadEditorialArchiveLessons(1);await editor.loadEditorialArchiveBody(21);},
  };
}
async function dirty(h){
  for(const [id,value] of [["course-title","Título local não salvo"],["course-category","sistemas"],
    ["course-summary","  Resumo local preservado  "],["course-sort","9"],["lesson-title","Aula local"],
    ["lesson-body","  Corpo local não salvo  "],["lesson-sort","8"]])h.get(id).value=value;
  await h.emit("course-form","input");await h.emit("lesson-form","input");
  return h.values();
}
let cases=0;
async function scenario(label,run){try{await run();}catch(error){error.message=label+": "+error.message;throw error;}cases++;}

await scenario("labelled controls start disabled and search normalizes Portuguese accents",async()=>{
  const h=await harness({load:false});h.editor.renderCourses();
  for(const id of controls)assert.equal(h.get(id).disabled,true);
  for(const id of filters)assert.ok(view.includes('for="'+id+'"'));
  assert.ok(view.includes('id="editorial-catalog-panel"'));
  assert.ok(view.includes('id="editorial-filter-status"')&&view.includes('aria-live="polite"'));
  assert.equal(h.editor.normalizeEditorialSearch("AÇÃO E NEGÓCIOS"),"acao e negocios");
  assert.equal(h.editor.normalizeEditorialSearch("AC\u0327A\u0303O"),"acao");
});
await scenario("real search handler matches saved title slug summary and accent variants without requests",async()=>{
  const h=await harness({selected:null}),before=h.requests.length;
  for(const [query,expected] of [["ACAO E METODO",[1]],["GESTÃO",[2,6]],["  AUTOMACAO  ",[3]],
    ["PAINEL-IMAGINE",[3]],["orcamento",[4]],["",[1,2,3,4,5,6]]]){
    await h.filter(query);assert.deepEqual(h.ids(),expected);assert.deepEqual(h.matches(),expected);
  }
  assert.equal(h.requests.length,before);assert.equal(h.dialogs.length,0);
});
await scenario("category and publication handlers combine with search using stored metadata",async()=>{
  const h=await harness({selected:null}),before=h.requests.length;
  await h.filter("gestao","sistemas","published");assert.deepEqual(h.ids(),[6]);
  h.get(filters[0]).value="";h.get(filters[2]).value="draft";await h.emit(filters[2],"change");assert.deepEqual(h.ids(),[3]);
  h.get(filters[1]).value="negocios";await h.emit(filters[1],"change");assert.deepEqual(h.ids(),[4]);
  h.get(filters[2]).value="todos";await h.emit(filters[2],"change");assert.deepEqual(h.ids(),[2,4]);
  assert.equal(h.requests.length,before);
});
await scenario("current course is pinned outside matches and does not inflate counts",async()=>{
  const h=await harness(),before=h.requests.length;
  await h.filter("gestao","sistemas","published");assert.deepEqual(h.ids(),[1,6]);
  assert.deepEqual(h.matches(),[6]);assert.match(h.get("editorial-filter-status").textContent,/1 de 6/);
  const pinned=h.get("course-items").children.find(node=>node.dataset.course==="1");
  assert.equal(pinned.dataset.outsideFilter,"true");assert.equal(pinned.attributes["aria-current"],"true");
  await h.chooseCourse(1);assert.equal(h.dialogs.length,0);assert.equal(h.requests.length,before);
  await h.filter("nenhuma correspondencia","negocios","published");assert.deepEqual(h.ids(),[1]);
  assert.match(h.get("editorial-filter-status").textContent,/0 de 6/);
  assert.match(h.get("course-items").textContent,/Nenhum curso corresponde/);assert.equal(h.state.course.id,1);
});
await scenario("filtering preserves preflight and historical content without new reads",async()=>{
  const h=await harness();await h.click("check-publication");await h.archive();
  const before={requests:h.requests.length,preflight:h.get("publication-readiness").textContent,
    archive:clone(h.state.archive),body:h.get("editorial-version-content").textContent,
    counters:[h.state.courseRequest,h.state.lessonRequest,h.state.preflightRequest]};
  assert.equal(h.get("publication-readiness").hidden,false);
  await h.filter("orcamento","negocios","draft");
  assert.equal(h.requests.length,before.requests);assert.equal(h.get("publication-readiness").textContent,before.preflight);
  assert.equal(h.get("publication-readiness").hidden,false);assert.deepEqual(clone(h.state.archive),before.archive);
  assert.equal(h.get("editorial-version-content").textContent,before.body);
  assert.deepEqual([h.state.courseRequest,h.state.lessonRequest,h.state.preflightRequest],before.counters);
});
await scenario("both dirty forms survive filtering and clear without entering saved search results",async()=>{
  const h=await harness();await h.archive();const before=await dirty(h),reads=h.requests.length,archive=clone(h.state.archive);
  await h.filter("Titulo local nao salvo","sistemas","draft");assert.deepEqual(h.matches(),[]);
  assert.deepEqual(h.values(),before);assert.deepEqual(h.ids(),[1]);assert.deepEqual(clone(h.state.archive),archive);
  await h.click("clear-editorial-filters");assert.deepEqual(h.ids(),[1,2,3,4,5,6]);assert.deepEqual(h.filterState(),["","todos","todos"]);
  assert.equal(h.get("clear-editorial-filters").disabled,true);assert.equal(h.get(filters[0]).focused,true);
  assert.equal(h.get("course-items").children.some(node=>node.dataset.outsideFilter),false);
  assert.deepEqual(h.values(),before);assert.equal(h.state.course.id,1);assert.equal(h.state.lesson.id,101);
  assert.equal(h.requests.length,reads);assert.equal(h.dialogs.length,0);
});
await scenario("course selection still asks before discarding dirty forms and performs only the intended read",async()=>{
  const h=await harness();await h.archive();const before=await dirty(h);await h.filter("painel");
  const reads=h.requests.length,archive=clone(h.state.archive);h.control.accept=false;
  await h.chooseCourse(3);assert.equal(h.dialogs.length,1);assert.equal(h.state.course.id,1);
  assert.deepEqual(h.values(),before);assert.deepEqual(clone(h.state.archive),archive);assert.equal(h.requests.length,reads);
  h.control.accept=true;await h.chooseCourse(3);assert.equal(h.dialogs.length,2);assert.equal(h.state.course.id,3);
  assert.equal(h.requests.length,reads+1);assert.equal(h.requests.at(-1).path,"/courses/3/lessons");
  assert.equal(h.requests.at(-1).method,"GET");assert.deepEqual(h.ids(),[3]);assert.equal(h.state.archive.lesson,null);
  assert.equal(h.get("course-title").value,"Painel Imagine");assert.equal(h.state.lesson,null);
});
await scenario("a new unsaved course remains untouched by filtering and clearing",async()=>{
  const h=await harness();await h.click("new-course");h.get("course-title").value="Novo rascunho local";
  h.get("course-slug").value="novo-rascunho";await h.emit("course-form","input");const values=h.values(),reads=h.requests.length;
  await h.filter("gestao");await h.click("clear-editorial-filters");
  assert.equal(h.state.course,null);assert.deepEqual(h.values(),values);assert.equal(h.requests.length,reads);assert.equal(h.dialogs.length,0);
});
await scenario("zero matches empty catalog and unavailable catalog stay distinct",async()=>{
  const h=await harness({selected:null});await h.filter("semresultado");
  assert.match(h.get("course-items").textContent,/Nenhum curso corresponde/);assert.equal(h.ids().length,0);
  const empty=await harness({courses:[],selected:null});assert.match(empty.get("course-items").textContent,/Nenhum curso cadastrado/);
  assert.match(empty.get("editorial-filter-status").textContent,/0 de 0/);assert.equal(empty.get(filters[0]).disabled,false);
  h.control.hook=req=>req.path==="/courses"?response(503,{}):undefined;await h.editor.loadAdminCatalog();
  assert.match(h.get("course-items").textContent,/temporariamente indisponíveis/);
  assert.doesNotMatch(h.get("course-items").textContent,/Nenhum curso cadastrado|Nenhum curso corresponde/);
  assert.match(h.get("editorial-filter-status").textContent,/Consulte o catálogo/);
  for(const id of controls)assert.equal(h.get(id).disabled,true);
  const reads=h.requests.length;await h.filter("acao");await h.click("clear-editorial-filters");assert.equal(h.requests.length,reads);
  h.control.hook=null;await h.editor.loadAdminCatalog();assert.equal(h.get(filters[0]).disabled,false);
});
await scenario("invalid filter values are ignored and query length stays bounded without an API call",async()=>{
  const h=await harness(),before=h.requests.length;await h.filter("acao");const stable=h.filterState();
  await h.filter("other","foreign","todos");assert.deepEqual(h.filterState(),stable);
  await h.filter("other","todos","unknown");assert.deepEqual(h.filterState(),stable);
  await h.filter("x".repeat(121));assert.equal(h.state.courseQuery.length,120);assert.equal(h.get(filters[0]).value.length,120);
  assert.equal(h.requests.length,before);
});
await scenario("an in-flight editorial save disables filtering until its actual completion",async()=>{
  const h=await harness();await h.filter("acao");h.get("course-title").value="Ação revisada";await h.emit("course-form","input");
  const held=deferred();h.control.hook=async req=>{if(req.method==="PATCH")await held.promise;};
  const pending=h.submit();await setImmediate();assert.equal(h.state.writePending,true);
  const stable=h.filterState(),reads=h.requests.length;
  for(const id of controls)assert.equal(h.get(id).disabled,true);
  await h.filter("painel","sistemas","draft");await h.click("clear-editorial-filters");
  assert.deepEqual(h.filterState(),stable);assert.equal(h.requests.length,reads);assert.equal(h.get("layout").inert,true);
  held.resolve();await pending;assert.equal(h.state.writePending,false);assert.equal(h.get(filters[0]).disabled,false);
  assert.equal(h.requests.filter(req=>req.method!=="GET").length,1);
});
await scenario("uncertain writes cannot be cleared by filters or a failed reconciliation",async()=>{
  const h=await harness();await h.filter("acao");h.get("course-title").value="Alteração incerta";await h.emit("course-form","input");
  h.control.hook=req=>req.method==="PATCH"?response(503,{}):undefined;await h.submit();
  assert.equal(h.state.writeOutcomeUnknown,true);const stable=h.filterState(),reads=h.requests.length;
  await h.filter("gestao","negocios","published");await h.click("clear-editorial-filters");h.editor.renderCourses();h.editor.finishWrite();
  assert.deepEqual(h.filterState(),stable);assert.equal(h.requests.length,reads);
  for(const id of controls)assert.equal(h.get(id).disabled,true);
  h.control.hook=req=>req.path==="/courses"?response(503,{}):undefined;await h.editor.loadAdminCatalog();
  assert.equal(h.state.writeOutcomeUnknown,true);assert.equal(h.get(filters[0]).disabled,true);
  h.control.hook=null;await h.editor.loadAdminCatalog();assert.equal(h.state.writeOutcomeUnknown,false);
  assert.equal(h.get(filters[0]).disabled,false);assert.equal(h.requests.filter(req=>req.method!=="GET").length,1);
});
await scenario("revocation and expiry purge the query and cannot be undone by later filter events",async()=>{
  for(const status of [403,419]){
    const h=await harness();await h.filter("gestao","sistemas","published");
    h.control.hook=req=>req.path==="/audit"?response(status,{}):undefined;
    await assert.rejects(h.editor.refreshAudit());assert.equal(h.state.accessDenied,true);
    assert.deepEqual(h.filterState(),["","todos","todos"]);assert.equal(h.get(filters[0]).value,"");
    assert.equal(h.get("editorial-filter-status").textContent,"");assert.deepEqual(h.ids(),[]);
    const before=h.requests.length;await h.filter("acao");await h.click("clear-editorial-filters");h.editor.renderCourses();h.editor.finishWrite();
    assert.deepEqual(h.filterState(),["","todos","todos"]);assert.equal(h.requests.length,before);
    for(const id of controls)assert.equal(h.get(id).disabled,true);
  }
});
await scenario("a late catalog response after denial cannot restore filters or courses",async()=>{
  const h=await harness();await h.filter("gestao");const held=deferred();
  h.control.hook=async req=>req.path==="/courses"?await held.promise:req.path==="/audit"?response(403,{}):undefined;
  const pending=h.editor.refreshCourses().catch(()=>{});await setImmediate();
  await assert.rejects(h.editor.refreshAudit());held.resolve(response(200,{courses:fixtures()}));await pending;
  assert.deepEqual(h.ids(),[]);assert.deepEqual(h.filterState(),["","todos","todos"]);
  assert.equal(h.state.catalogReady,false);for(const id of controls)assert.equal(h.get(id).disabled,true);
});
await scenario("filtering during a selected lesson-list read preserves its request and target",async()=>{
  const h=await harness(),held=deferred();
  h.control.hook=async req=>{if(req.path==="/courses/3/lessons")await held.promise;};
  const pending=h.chooseCourse(3);await setImmediate();const reads=h.requests.length,request=h.state.lessonRequest;
  await h.filter("acao e metodo");assert.equal(h.state.course.id,3);assert.deepEqual(h.ids(),[3,1]);
  assert.equal(h.state.lessonRequest,request);assert.equal(h.requests.length,reads);
  held.resolve();await pending;assert.equal(h.state.course.id,3);assert.equal(h.state.lessonsReady,true);
  assert.equal(h.state.lessons[0].id,301);assert.equal(h.dialogs.length,0);
});

console.log("PASS editorial catalog filters: "+cases+" actual-script scenarios; local matching, pinned drafts, unchanged reads and revocation guards");
