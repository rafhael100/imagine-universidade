"use strict";

// Called by the guarded synthetic browser runner. Routes and fixtures belong
// to this context/page; the shared editorial fixture is never modified.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
  context.setDefaultTimeout(8000);context.setDefaultNavigationTimeout(15000);
  const api=base+"/universidade/private/admin",pending=[];
  const fields=["course-title","course-slug","course-category","course-summary","course-sort",
    "lesson-title","lesson-slug","lesson-body","lesson-sort"];
  const filterIds=["editorial-course-search","editorial-category-filter","editorial-state-filter","clear-editorial-filters"];
  const courses=()=>[
    {id:1,slug:"fundamentos-editoriais",title:"Ação e método",summary:"Organização para começar",category:"metodologia",is_published:false},
    {id:2,slug:"gestao-comercial",title:"Gestão de vendas",summary:"Funil comercial",category:"negocios",is_published:true},
    {id:3,slug:"painel-imagine",title:"Painel Imagine",summary:"Automação de relatórios",category:"sistemas",is_published:false},
    {id:4,slug:"planejamento-financeiro",title:"Planejamento financeiro",summary:"Orçamento e margem",category:"negocios",is_published:false},
    {id:5,slug:"metodologia-aplicada",title:"Metodologia aplicada",summary:null,category:"metodologia",is_published:true},
    {id:6,slug:"canais-sistema",title:"Integração e canais",summary:"Gestão das conexões",category:"sistemas",is_published:true},
  ].map((course,index)=>({...course,sort_order:index}));
  const archived={id:21,slug:"aula-antiga",title:"Título histórico",sort_order:0};
  const envelope={schema_version:1,scope:"editorial_archived_content",course_id:1};
  let stage="initial catalog filters";
  async function bounded(promise,label){
    let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error("C124 timeout: "+label)),8000);
    })]);}finally{clearTimeout(timer);}
  }
  function heldResponse(label){
    let release,received;const answer=new Promise(resolve=>{release=resolve;}),seen=new Promise(resolve=>{received=resolve;});
    pending.push(()=>release({status:503,payload:{}}));
    return {release,wait:()=>bounded(seen,label),response:async()=>{received();return answer;}};
  }
  const ids=page=>page.locator("#course-items [data-course]").evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.course)));
  const matches=page=>page.evaluate(()=>filteredEditorialCourses().matches.map(course=>course.id));
  const values=page=>page.evaluate(names=>names.map(id=>document.getElementById(id).value),fields);
  const filterState=page=>page.evaluate(()=>[state.courseQuery,state.courseCategory,state.courseStatus]);
  const disabled=page=>page.evaluate(names=>names.every(id=>document.getElementById(id).disabled),filterIds);
  const snapshot=page=>page.evaluate(names=>({fields:names.map(id=>document.getElementById(id).value),
    course:state.course?.id??null,lesson:state.lesson?.id??null,archive:state.archive,
    preflight:document.getElementById("publication-readiness").textContent,
    preflightHidden:document.getElementById("publication-readiness").hidden,
    body:document.getElementById("editorial-version-content").textContent,
    counters:[state.courseRequest,state.lessonRequest,state.preflightRequest]}),fields);
  const filter=async(page,query="",category="todos",status="todos")=>{
    await page.locator("#editorial-course-search").fill(query);
    await page.locator("#editorial-category-filter").selectOption(category);
    await page.locator("#editorial-state-filter").selectOption(status);
  };
  const forceFilterEvents=page=>page.evaluate(()=>{
    document.getElementById("editorial-course-search").value="tentativa tardia";
    document.getElementById("editorial-course-search").dispatchEvent(new Event("input",{bubbles:true}));
    document.getElementById("editorial-category-filter").dispatchEvent(new Event("change",{bubbles:true}));
    document.getElementById("clear-editorial-filters").dispatchEvent(new Event("click",{bubbles:true}));
  });
  async function readArchive(page){
    await page.locator("#refresh-editorial-versions").click();
    await page.locator("#editorial-version-list [data-archive-version='1']").click();
    await page.locator("#editorial-version-lessons [data-archive-lesson='21']").click();
    await page.locator("#editorial-version-content h4").waitFor({state:"visible"});
    await page.waitForFunction(()=>!state.archive.bodyLoading);
  }
  async function dirty(page){
    await page.locator("#course-title").fill("Título local não salvo");
    await page.locator("#course-category").selectOption("sistemas");
    await page.locator("#course-summary").fill("  Resumo local preservado  ");await page.locator("#course-sort").fill("9");
    await page.locator("#lesson-title").fill("Aula local não salva");
    await page.locator("#lesson-body").fill("  Corpo local preservado  ");await page.locator("#lesson-sort").fill("8");
    return values(page);
  }
  async function open({initialCourses=courses(),selected=1,catalog=null}={}){
    const page=await context.newPage();await ensureLocalPage(page);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    const fixture={courses:initialCourses,lessons:new Map(initialCourses.map(course=>[course.id,[{
      id:course.id*100+1,slug:"aula-"+course.id,title:"Aula atual "+course.id,body:"Conteúdo salvo da aula.",sort_order:0,
      status:course.is_published?"published":"draft",is_published:course.is_published,
    }]]))};
    const control={catalog,audit:null,write:null,requests:[],dialogs:0,accept:true};
    page.on("dialog",dialog=>{control.dialogs++;void (control.accept?dialog.accept():dialog.dismiss()).catch(()=>{});});
    const resolve=async(value,request)=>typeof value==="function"?await value(request):value;
    await page.route(api+"/**",async route=>{
      const request=route.request(),url=new URL(request.url()),path=url.pathname.replace("/universidade/private/admin","");
      const method=request.method(),entry={path,method};control.requests.push(entry);
      const send=result=>route.fulfill({status:result.status,contentType:"application/json",
        headers:{"Cache-Control":"private, no-store"},body:JSON.stringify(result.payload)});
      if(method!=="GET"){
        entry.body=request.postDataJSON();const failure=await resolve(control.write,entry);if(failure)return send(failure);
      }
      if(path==="/courses"&&method==="GET")return send(await resolve(control.catalog,entry)||{status:200,payload:{courses:fixture.courses}});
      if(path==="/audit")return send(await resolve(control.audit,entry)||{status:200,payload:{events:[],next_before_id:null}});
      if(path==="/overview"){
        const categories=["metodologia","negocios","sistemas"].map(category=>{
          const list=fixture.courses.filter(course=>course.category===category),published=list.filter(course=>course.is_published).length;
          return {category,courses:list.length,published_courses:published,draft_courses:list.length-published,current_lessons:list.length};
        });
        const totals=Object.fromEntries(["courses","published_courses","draft_courses","current_lessons"].map(key=>
          [key,categories.reduce((sum,row)=>sum+row[key],0)]));
        return send({status:200,payload:{schema_version:1,scope:"current_editorial_catalog",categories,
          totals:{...totals,courses_without_lessons:0,courses_without_summary:fixture.courses.filter(course=>!course.summary).length}}});
      }
      if(path==="/courses/1/publication-check")return send({status:200,payload:{course_id:1,version:2,lesson_count:1,ready:true,
        issues:[],warnings:[],content_hash:"a".repeat(64),advisory_only:true}});
      if(path==="/courses/1/versions")return send({status:200,payload:{...envelope,
        versions:[{version:1,status:"archived",lesson_count:1}],next_before_version:null}});
      if(path==="/courses/1/versions/1/lessons")return send({status:200,payload:{...envelope,
        course_version:1,status:"archived",lessons:[archived],next_after:null}});
      if(path==="/courses/1/versions/1/lessons/21")return send({status:200,payload:{...envelope,
        course_version:1,status:"archived",lesson:{...archived,body:"Corpo histórico preservado."}}});
      const lessons=path.match(/^\/courses\/(\d+)\/lessons$/);
      if(lessons&&method==="GET")return send({status:200,payload:{lessons:fixture.lessons.get(Number(lessons[1]))||[]}});
      const course=path.match(/^\/courses\/(\d+)$/);
      if(course&&method==="PATCH"){
        Object.assign(fixture.courses.find(row=>row.id===Number(course[1])),entry.body);return send({status:200,payload:{saved:true}});
      }
      return send({status:404,payload:{error:"not_found"}});
    });
    await page.goto(base+"/admin");await page.waitForFunction(()=>!state.catalogLoading&&!state.overviewLoading&&
      !document.getElementById("refresh-audit").disabled);
    if(selected!==null){
      await page.locator("#course-items [data-course='"+selected+"']").click();
      await page.locator("#lesson-items [data-lesson='"+(selected*100+1)+"']").click();
      await page.waitForFunction(()=>state.catalogReady&&state.lessonsReady);
    }
    return {page,control,fixture};
  }
  try{
    {
      const {page,control}=await open(),reads=control.requests.length;
      check(await page.locator("#editorial-course-search").isEnabled()&&await page.locator("#clear-editorial-filters").isDisabled()&&
        (await page.locator("#editorial-filter-status").innerText()).includes("6 de 6"),
        "C124 validated catalog enables labelled local filters with an explicit total");
      let matching=true;
      for(const [query,expected] of [["ACAO E METODO",[1]],["GESTÃO",[2,6]],["  AUTOMACAO  ",[3]],
        ["PAINEL-IMAGINE",[3]],["orcamento",[4]]]){
        await filter(page,query);matching&&=JSON.stringify(await matches(page))===JSON.stringify(expected);
      }
      check(matching&&control.requests.length===reads&&control.dialogs===0,
        "C124 title slug summary and Portuguese accent searches use only the already validated catalog");
      await filter(page,"gestao","sistemas","published");
      check(JSON.stringify(await ids(page))==="[1,6]"&&JSON.stringify(await matches(page))==="[6]"&&
        await page.locator("#course-items [data-course='1']").getAttribute("data-outside-filter")==="true"&&
        (await page.locator("#editorial-filter-status").innerText()).startsWith("Resultados: 1 de 6 cursos.")&&control.requests.length===reads,
        "C124 combined search category and status retain the current course without counting it as a match");
      await filter(page,"nenhuma correspondencia","negocios","published");
      check(JSON.stringify(await ids(page))==="[1]"&&(await page.locator("#editorial-filter-status").innerText()).startsWith("Resultados: 0 de 6 cursos.")&&
        (await page.locator("#course-items").innerText()).includes("Nenhum curso corresponde")&&
        await page.evaluate(()=>state.course.id===1&&state.lesson.id===101),
        "C124 zero matches keep the selected course and lesson visible without claiming an empty catalog");
      await page.locator("#clear-editorial-filters").click();
      check(JSON.stringify(await ids(page))==="[1,2,3,4,5,6]"&&await page.locator("#course-items [data-outside-filter]").count()===0&&
        await page.locator("#clear-editorial-filters").isDisabled()&&await page.locator("#editorial-course-search").evaluate(input=>input===document.activeElement)&&
        control.requests.length===reads,
        "C124 clear restores original ordering and focus without selecting a course or requesting data");
      await page.close();
    }
    {
      stage="preflight archive and unsaved forms";const {page,control}=await open();
      await page.locator("#check-publication").click();await page.locator("#publication-readiness").waitFor({state:"visible"});
      await readArchive(page);const before=await snapshot(page),reads=control.requests.length;
      await filter(page,"orcamento","negocios","draft");
      check(JSON.stringify(await snapshot(page))===JSON.stringify(before)&&control.requests.length===reads&&control.dialogs===0,
        "C124 filtering preserves publication preflight archived body selected lesson and all request generations");
      const dirtyValues=await dirty(page),dirtyBefore=await snapshot(page);
      await filter(page,"Titulo local nao salvo","sistemas","draft");
      check(JSON.stringify(await matches(page))==="[]"&&JSON.stringify(await snapshot(page))===JSON.stringify(dirtyBefore),
        "C124 filters match saved data while preserving both unsaved forms and the historical panel");
      await page.locator("#clear-editorial-filters").click();
      check(JSON.stringify(await values(page))===JSON.stringify(dirtyValues)&&control.requests.length===reads&&control.dialogs===0,
        "C124 clearing filters does not discard local course or lesson changes or invalidate historical content");
      await filter(page,"painel");control.accept=false;const cancelBefore=await snapshot(page);
      await page.locator("#course-items [data-course='3']").click();
      check(control.dialogs===1&&JSON.stringify(await snapshot(page))===JSON.stringify(cancelBefore)&&
        JSON.stringify(await filterState(page))==='["painel","todos","todos"]'&&control.requests.length===reads,
        "C124 cancelling a real course switch keeps filters dirty forms selected lesson and archive intact");
      control.accept=true;await page.locator("#course-items [data-course='3']").click();
      await page.waitForFunction(()=>state.course?.id===3&&state.lessonsReady);
      check(control.dialogs===2&&control.requests.length===reads+1&&control.requests.at(-1).method==="GET"&&
        control.requests.at(-1).path==="/courses/3/lessons"&&await page.locator("#editorial-version-content").isHidden()&&
        (await page.locator("#course-title").inputValue())==="Painel Imagine"&&JSON.stringify(await ids(page))==="[3]",
        "C124 confirmed course selection retains the original discard guard and performs only its authorized lesson read");
      await page.close();
    }
    {
      stage="empty and unavailable catalogs";const empty=await open({initialCourses:[],selected:null});
      await filter(empty.page,"semresultado");
      check((await empty.page.locator("#course-items").innerText()).includes("Nenhum curso cadastrado")&&
        (await empty.page.locator("#editorial-filter-status").innerText()).startsWith("Resultados: 0 de 0 cursos.")&&
        await empty.page.locator("#editorial-course-search").isEnabled(),
        "C124 a valid empty catalog remains distinct from no matches in an existing catalog");
      await empty.page.close();
      const {page,control}=await open({selected:null,catalog:{status:503,payload:{}}}),reads=control.requests.length;
      await forceFilterEvents(page);
      check(await disabled(page)&&(await page.locator("#course-items").innerText()).includes("temporariamente indisponíveis")&&
        !(await page.locator("#course-items").innerText()).includes("Nenhum curso")&&control.requests.length===reads,
        "C124 an unavailable catalog disables filters and cannot be changed into a false empty state by events");
      control.catalog=null;await page.locator("#retry-catalog").click();
      await page.waitForFunction(()=>state.catalogReady&&!state.catalogLoading&&!state.overviewLoading);
      check(await page.locator("#editorial-course-search").isEnabled()&&JSON.stringify(await ids(page))==="[1,2,3,4,5,6]",
        "C124 explicit catalog recovery enables filters only after a valid response");
      await page.close();
    }
    {
      stage="busy and uncertain writes";const {page,control}=await open();await filter(page,"acao");
      await page.locator("#course-title").fill("Ação atualizada");const held=heldResponse("editorial save");control.write=held.response;
      await page.locator("#course-save").click();await held.wait();const stable=await filterState(page),reads=control.requests.length;
      await forceFilterEvents(page);
      check(await disabled(page)&&JSON.stringify(await filterState(page))===JSON.stringify(stable)&&control.requests.length===reads&&
        await page.evaluate(()=>state.writePending&&document.querySelector(".layout").inert),
        "C124 a pending editorial mutation keeps filters disabled and ignores programmatic events");
      held.release({status:200,payload:{saved:true}});await page.waitForFunction(()=>!state.writePending&&state.catalogReady&&state.lessonsReady);
      check(await page.locator("#editorial-course-search").isEnabled()&&control.requests.filter(row=>row.method!=="GET").length===1,
        "C124 filters return only after the original write and fresh catalog settle without replay");
      control.write={status:503,payload:{}};await page.locator("#course-title").fill("Alteração incerta");
      await page.locator("#course-save").click();await page.waitForFunction(()=>state.writeOutcomeUnknown&&!state.writePending);
      const uncertain=await filterState(page),requests=control.requests.length;await forceFilterEvents(page);
      check(await disabled(page)&&JSON.stringify(await filterState(page))===JSON.stringify(uncertain)&&control.requests.length===requests,
        "C124 an uncertain write cannot be reopened or reconciled automatically through filter events");
      control.catalog={status:503,payload:{}};await page.locator("#retry-catalog").click();await page.waitForFunction(()=>!state.catalogLoading);
      check(await disabled(page)&&await page.evaluate(()=>state.writeOutcomeUnknown)&&control.requests.filter(row=>row.method!=="GET").length===2,
        "C124 a failed explicit reconciliation keeps filters disabled and does not repeat the mutation");
      await page.close();
    }
    for(const status of [403,419]){
      stage="revoked filter context "+status;const {page,control}=await open();await filter(page,"gestao","sistemas","published");
      control.audit={status,payload:{}};await page.locator("#refresh-audit").click();await page.waitForFunction(()=>state.accessDenied);
      const reads=control.requests.length;await forceFilterEvents(page);
      check(await disabled(page)&&JSON.stringify(await filterState(page))==='["","todos","todos"]'&&
        (await page.locator("#editorial-filter-status").innerText())===""&&await page.locator("#course-items [data-course]").count()===0&&
        control.requests.length===reads,
        "C124 "+status+" purges the query and catalog and late events cannot restore private navigation");
      await page.close();
    }
  }catch(error){
    console.error("C124 failure before browser cleanup: "+stage+"; "+String(error.message).split("\n")[0].slice(0,240));throw error;
  }finally{
    for(const release of pending)release();await bounded(context.close(),"catalog-filter context cleanup");
  }
};
