"use strict";

// Called only by the guarded synthetic runner. Each page owns its mutable
// editorial fixture; no shared server state or real service is changed.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
  const api=base+"/universidade/private/admin";
  const names=["metodologia","negocios","sistemas"];
  const fields=["course-title","course-slug","course-category","course-summary","course-sort",
    "lesson-title","lesson-slug","lesson-body","lesson-sort"];
  const course=()=>({id:1,slug:"acervo-ficticio",title:"Acervo editorial fictício",category:"metodologia",
    summary:"Resumo fictício salvo.",sort_order:0,is_published:false});
  const lesson=()=>({id:11,slug:"aula-do-acervo",title:"Aula fictícia do acervo",body:"Texto fictício já salvo para o ensaio editorial.",
    sort_order:0,is_published:false,status:"draft"});
  const pending=[];
  let stage="initial overview";
  function heldResponse(label){
    let release,received;const result=new Promise(resolve=>{release=resolve;});
    const seen=new Promise(resolve=>{received=resolve;});pending.push(()=>release({status:503,payload:{}}));
    return {release,response:async()=>{received();return result;},wait:async()=>{
      let timer;
      try{await Promise.race([seen,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("C119 request not observed: "+label)),8000);})]);}
      finally{clearTimeout(timer);}
    }};
  }
  const waitSettled=page=>page.waitForFunction(()=>state.overviewAttempted&&!state.overviewLoading,null,{timeout:8000});
  const values=page=>page.evaluate(ids=>ids.map(id=>document.getElementById(id).value),fields);
  async function confirmClick(page,selector,accept=true){
    const dialog=page.waitForEvent("dialog",{timeout:8000}).then(dialog=>accept?dialog.accept():dialog.dismiss());
    await Promise.all([dialog,page.locator(selector).click()]);
  }
  async function open({published=false,overview=null,catalog=null,select=true,settle=true}={}){
    const page=await context.newPage();await ensureLocalPage(page);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    const fixture={courses:[course()],lessons:new Map([[1,[lesson()]]]),nextId:20};
    if(catalog?.status===200&&Array.isArray(catalog.payload?.courses)&&catalog.payload.courses.length===0){
      fixture.courses=[];fixture.lessons.clear();
    }
    if(published){fixture.courses[0].is_published=true;fixture.lessons.get(1)[0].is_published=true;fixture.lessons.get(1)[0].status="published";}
    const control={overview,catalog,audit:null,writeResponse:null,overviewReads:0,writes:[],reads:[]};
    function snapshot(){
      const totals={courses:0,published_courses:0,draft_courses:0,current_lessons:0,courses_without_lessons:0,courses_without_summary:0};
      const categories=names.map(category=>({category,courses:0,published_courses:0,draft_courses:0,current_lessons:0}));
      for(const row of fixture.courses){
        const category=categories.find(item=>item.category===row.category),lessons=fixture.lessons.get(row.id)||[];
        totals.courses++;category.courses++;
        const kind=row.is_published?"published_courses":"draft_courses";totals[kind]++;category[kind]++;
        totals.current_lessons+=lessons.length;category.current_lessons+=lessons.length;
        if(!lessons.length)totals.courses_without_lessons++;
        if(!row.summary?.trim())totals.courses_without_summary++;
      }
      return {schema_version:1,scope:"current_editorial_catalog",totals,categories};
    }
    const resolve=async value=>typeof value==="function"?await value():value;
    await page.route(api+"/**",async route=>{
      const request=route.request(),method=request.method(),path=new URL(request.url()).pathname.replace("/universidade/private/admin","");
      const send=response=>route.fulfill({status:response.status,contentType:"application/json",
        headers:{"Cache-Control":"private, no-store"},body:JSON.stringify(response.payload)});
      if(method==="GET")control.reads.push(path);
      else{
        control.writes.push({method,path,body:request.postDataJSON()});
        const failed=await resolve(control.writeResponse);if(failed)return send(failed);
      }
      if(path==="/overview"&&method==="GET"){
        control.overviewReads++;return send((await resolve(control.overview))??{status:200,payload:snapshot()});
      }
      if(path==="/courses"&&method==="GET")return send((await resolve(control.catalog))??{status:200,payload:{courses:fixture.courses}});
      if(path==="/audit"&&method==="GET")return send((await resolve(control.audit))??{status:200,payload:{events:[],next_before_id:null}});
      const list=path.match(/^\/courses\/(\d+)\/lessons$/);
      if(list&&method==="GET")return send({status:200,payload:{lessons:fixture.lessons.get(Number(list[1]))||[]}});
      if(path==="/courses/1/publication-check"&&method==="GET")return send({status:200,payload:{course_id:1,version:1,
        lesson_count:fixture.lessons.get(1).length,ready:true,issues:[],warnings:[],advisory_only:true,content_hash:"b".repeat(64)}});
      if(path==="/courses"&&method==="POST"){
        const id=fixture.nextId++;fixture.courses.push({id,...request.postDataJSON(),is_published:false});fixture.lessons.set(id,[]);
        return send({status:201,payload:{id}});
      }
      if(path==="/courses/1"&&method==="PATCH"){
        Object.assign(fixture.courses[0],request.postDataJSON());return send({status:200,payload:{saved:true}});
      }
      if(path==="/courses/1"&&method==="DELETE"){
        fixture.courses=[];fixture.lessons.delete(1);return send({status:200,payload:{deleted:true}});
      }
      if(list&&method==="POST"){
        const id=fixture.nextId++;fixture.lessons.get(Number(list[1])).push({id,...request.postDataJSON(),is_published:false,status:"draft"});
        return send({status:201,payload:{id}});
      }
      if(path==="/lessons/11"&&method==="PATCH"){
        Object.assign(fixture.lessons.get(1)[0],request.postDataJSON());return send({status:200,payload:{saved:true}});
      }
      if(path==="/lessons/11"&&method==="DELETE"){
        fixture.lessons.set(1,fixture.lessons.get(1).filter(row=>row.id!==11));return send({status:200,payload:{deleted:true}});
      }
      if(method==="POST"&&["/courses/1/publish","/courses/1/unpublish"].includes(path)){
        const published=path.endsWith("/publish");fixture.courses[0].is_published=published;
        for(const row of fixture.lessons.get(1)){row.is_published=published;row.status=published?"published":"draft";}
        return send({status:200,payload:{published}});
      }
      return send({status:404,payload:{error:"synthetic_route_not_found"}});
    });
    await page.goto(base+"/admin");
    if(select){
      await page.locator("#course-items [data-course='1']").click();
      await page.locator("#lesson-items [data-lesson='11']").click();
      await page.waitForFunction(()=>document.getElementById("lesson-title").value==="Aula fictícia do acervo",null,{timeout:8000});
    }
    if(settle)await waitSettled(page);
    return {page,control,fixture,snapshot};
  }
  try{
    {
      const h=await open(),{page,control}=h;
      check(control.overviewReads===1&&control.writes.length===0&&
        await page.locator("#overview-cards [data-overview-metric]").count()===4&&
        await page.locator("#overview-categories tr").count()===3&&
        (await page.locator("#overview-categories tr").allTextContents()).join(" ").includes("Sistemas Imagine"),
        "C119 validated catalogue starts one read-only overview with all three categories including zero values");
      await page.locator("#course-title").fill("Título do curso ainda não salvo");
      await page.locator("#course-summary").fill("  Resumo local preservado  ");
      await page.locator("#lesson-body").fill("Texto local da aula que não foi salvo.");
      const drafts=await values(page),selected=await page.locator("#lesson-items [aria-current='true']").getAttribute("data-lesson");
      const injected=h.snapshot();injected.identity="PRIVATE-EDITOR";injected.categories[0].title="PRIVATE-CONTENT";
      control.overview={status:200,payload:injected};await page.locator("#refresh-overview").click();await waitSettled(page);
      check(JSON.stringify(await values(page))===JSON.stringify(drafts)&&
        await page.locator("#lesson-items [aria-current='true']").getAttribute("data-lesson")===selected&&control.writes.length===0&&
        !(await page.locator("#editorial-overview").innerText()).includes("PRIVATE-"),
        "C119 refreshing safe aggregate counts preserves both dirty forms and never renders extra identity or content fields");
      for(const width of [320,1440]){
        await page.setViewportSize({width,height:900});
        check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1&&
          document.querySelector(".overview-table").getBoundingClientRect().right<=window.innerWidth),
          "C119 compact overview cards and category table fit the "+width+"px layout without horizontal overflow");
      }
      for(const overview of [{status:503,payload:{}},{status:200,payload:{}},
        {status:200,payload:{...h.snapshot(),totals:{...h.snapshot().totals,courses:"1"}}},
        {status:200,payload:{...h.snapshot(),totals:{...h.snapshot().totals,courses_without_summary:2}}}]){
        control.overview=overview;await page.locator("#refresh-overview").click();await waitSettled(page);
        check(await page.locator("#overview-content").isHidden()&&
          (await page.locator("#overview-cards").innerText())===""&&!(await page.locator("#refresh-overview").isDisabled())&&
          (await page.locator("#overview-status").innerText()).includes("indisponível")&&
          JSON.stringify(await values(page))===JSON.stringify(drafts)&&!(await page.locator("#lesson-save").isDisabled()),
          "C119 unavailable or malformed overview clears its numbers while the independent editor remains usable");
      }
      control.overview=null;await page.locator("#refresh-overview").click();await waitSettled(page);
      check(await page.locator("#overview-content").isVisible()&&control.writes.length===0&&
        JSON.stringify(await values(page))===JSON.stringify(drafts),
        "C119 explicit valid retry restores the overview without submitting or replacing drafts");
      await page.close();
    }
    {
      stage="empty collection";
      const h=await open({catalog:{status:200,payload:{courses:[]}},select:false});
      check((await h.page.locator("#overview-status").innerText()).includes("totais do acervo estão zerados")&&
        (await h.page.locator("#overview-cards strong").allTextContents()).every(value=>value==="0")&&
        await h.page.locator("#overview-categories tr").count()===3,
        "C119 a valid empty editorial collection clearly renders zero totals and three empty categories");
      await h.page.close();
    }
    {
      stage="invalid catalogue and recovery";
      const h=await open({catalog:{status:200,payload:{}},select:false,settle:false});
      await h.page.locator("#catalog-recovery").waitFor({state:"visible",timeout:8000});
      await h.page.locator("#refresh-overview").evaluate(button=>button.dispatchEvent(new Event("click",{bubbles:true})));
      check(h.control.overviewReads===0&&await h.page.locator("#refresh-overview").isDisabled(),
        "C119 invalid catalogue cannot trigger an overview even through a synthetic click");
      h.control.catalog=null;await h.page.locator("#retry-catalog").click();await waitSettled(h.page);
      check(h.control.overviewReads===1&&await h.page.locator("#overview-content").isVisible(),
        "C119 explicit catalogue recovery starts its first overview only after valid authorization data");
      await h.page.close();
    }
    const mutations=[
      ["course update",false,"PATCH","/courses/1",async page=>{await page.locator("#course-title").fill("Curso fictício atualizado");await page.locator("#course-save").click();}],
      ["course creation",false,"POST","/courses",async page=>{await page.locator("#new-course").click();
        await page.locator("#course-title").fill("Novo curso fictício");await page.locator("#course-slug").fill("novo-curso-ficticio");await page.locator("#course-save").click();}],
      ["course deletion",false,"DELETE","/courses/1",page=>confirmClick(page,"#delete-course")],
      ["lesson update",false,"PATCH","/lessons/11",async page=>{await page.locator("#lesson-body").fill("Texto fictício atualizado e salvo.");await page.locator("#lesson-save").click();}],
      ["lesson creation",false,"POST","/courses/1/lessons",async page=>{await page.locator("#clear-lesson").click();
        await page.locator("#lesson-title").fill("Nova aula fictícia");await page.locator("#lesson-slug").fill("nova-aula-ficticia");
        await page.locator("#lesson-body").fill("Texto fictício completo da nova aula.");await page.locator("#lesson-save").click();}],
      ["lesson deletion",false,"DELETE","/lessons/11",page=>confirmClick(page,"#delete-lesson")],
      ["publication",false,"POST","/courses/1/publish",page=>confirmClick(page,"#publish")],
      ["withdrawal",true,"POST","/courses/1/unpublish",page=>confirmClick(page,"#unpublish")],
    ];
    for(const [label,published,method,path,mutate] of mutations){
      stage=label;
      const h=await open({published}),held=heldResponse(label),old=h.snapshot();h.control.overview=held.response;
      await h.page.locator("#refresh-overview").click();await held.wait();
      await h.page.locator("#refresh-overview").evaluate(button=>button.dispatchEvent(new Event("click",{bubbles:true})));
      const received=h.page.waitForResponse(response=>response.url()===api+path&&response.request().method()===method,{timeout:8000});
      await mutate(h.page);await received;
      await h.page.waitForFunction(()=>!state.writePending,null,{timeout:8000});
      held.release({status:200,payload:old});await waitSettled(h.page);
      check(h.control.writes.length===1&&h.control.writes[0].method===method&&h.control.writes[0].path===path&&
        h.control.overviewReads===2&&await h.page.locator("#overview-content").isHidden()&&
        !(await h.page.locator("#refresh-overview").isDisabled()),
        "C119 "+label+" invalidates a single-flight overview and prevents its older response from restoring counts");
      h.control.overview=null;await h.page.locator("#refresh-overview").click();await waitSettled(h.page);
      check(h.control.overviewReads===3&&await h.page.locator("#overview-content").isVisible()&&
        (await h.page.locator("[data-overview-metric='courses'] strong").innerText())===String(h.snapshot().totals.courses)&&
        (await h.page.locator("[data-overview-metric='current_lessons'] strong").innerText())===String(h.snapshot().totals.current_lessons),
        "C119 explicit refresh after "+label+" displays the changed saved catalogue without another mutation");
      await h.page.close();
    }
    {
      stage="cancelled and ambiguous writes";
      const h=await open();await confirmClick(h.page,"#delete-lesson",false);
      check(h.control.writes.length===0&&h.control.overviewReads===1&&await h.page.locator("#overview-content").isVisible(),
        "C119 cancelled deletion neither invalidates a valid snapshot nor sends a write");
      await h.page.locator("#course-title").fill("Rascunho de curso preservado");
      await h.page.locator("#lesson-body").fill("Rascunho de aula preservado durante falha.");const before=await values(h.page);
      h.control.writeResponse={status:503,payload:{}};await h.page.locator("#lesson-save").click();
      await h.page.waitForFunction(()=>state.writeOutcomeUnknown&&!state.writePending,null,{timeout:8000});
      await h.page.locator("#refresh-overview").evaluate(button=>button.dispatchEvent(new Event("click",{bubbles:true})));
      check(h.control.writes.length===1&&h.control.overviewReads===1&&await h.page.locator("#refresh-overview").isDisabled()&&
        await h.page.locator("#overview-content").isHidden()&&JSON.stringify(await values(h.page))===JSON.stringify(before),
        "C119 ambiguous editorial write keeps drafts and freezes the summary until the existing catalogue reconciliation");
      h.control.writeResponse=null;await confirmClick(h.page,"#retry-catalog");
      await h.page.waitForFunction(()=>!state.catalogLoading&&!state.writeOutcomeUnknown,null,{timeout:8000});
      check(h.control.overviewReads===1&&h.control.writes.length===1&&!(await h.page.locator("#refresh-overview").isDisabled()),
        "C119 confirmed catalogue reconciliation enables manual summary refresh without replay or automatic overview GET");
      await h.page.close();
    }
    for(const status of [403,419]){
      stage="overview revocation "+status;
      const h=await open();h.control.overview={status,payload:h.snapshot()};
      await h.page.locator("#refresh-overview").click();await waitSettled(h.page);
      check(await h.page.locator("#overview-content").isHidden()&&await h.page.locator("#refresh-overview").isDisabled()&&
        (await h.page.locator("#overview-status").innerText())===""&&
        (await h.page.locator("#course-title").inputValue())===""&&(await h.page.locator("#lesson-body").inputValue())===""&&
        await h.page.locator("#course-items [data-course]").count()===0&&await h.page.locator("#course-save").isDisabled(),
        "C119 "+status+" in the summary purges its counts and all protected editorial content");
      await h.page.locator("#refresh-overview").evaluate(button=>button.dispatchEvent(new Event("click",{bubbles:true})));
      check(h.control.overviewReads===2&&h.control.writes.length===0,
        "C119 revoked summary stays disabled and cannot retry through a synthetic event");
      await h.page.close();
    }
    {
      stage="revocation while overview is pending";
      const h=await open(),held=heldResponse("revocation elsewhere");h.control.overview=held.response;
      await h.page.locator("#refresh-overview").click();await held.wait();
      h.control.audit={status:403,payload:{}};await h.page.locator("#refresh-audit").click();
      await h.page.waitForFunction(()=>state.accessDenied,null,{timeout:8000});
      held.release({status:200,payload:h.snapshot()});await waitSettled(h.page);
      check(await h.page.locator("#overview-content").isHidden()&&(await h.page.locator("#overview-cards").innerText())===""&&
        (await h.page.locator("#overview-status").innerText())===""&&await h.page.locator("#refresh-overview").isDisabled()&&
        (await h.page.locator("#lesson-body").inputValue())===""&&h.control.writes.length===0,
        "C119 late successful overview cannot restore counts or drafts after another request revokes access");
      await h.page.close();
    }
  }catch(error){
    console.error("C119 failure before browser cleanup: "+stage+"; "+String(error.message).split("\n")[0].slice(0,240));
    throw error;
  }finally{
    for(const release of pending)release();
    await context.close();
  }
};
