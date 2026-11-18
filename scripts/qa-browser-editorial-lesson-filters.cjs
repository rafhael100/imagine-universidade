"use strict";

// The guarded browser runner owns services and browser startup. This module
// uses the real editor with page-local synthetic HTTP, never shared fixtures.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:"reduce"});
  context.setDefaultTimeout(8000);context.setDefaultNavigationTimeout(15000);
  const api=base+"/universidade/private/admin",heldRequests=[];
  const original=[{id:11,sort_order:5},{id:12,sort_order:5},{id:13,sort_order:9}];
  const target=[{id:11,sort_order:0},{id:13,sort_order:1},{id:12,sort_order:2}];
  const fields=["course-title","course-slug","course-category","course-summary","course-sort",
    "lesson-title","lesson-slug","lesson-body","lesson-sort"];
  const clone=value=>JSON.parse(JSON.stringify(value)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const ok=payload=>({status:200,payload});
  const search="#editorial-lesson-search",clear="#clear-editorial-lesson-filter",status="#editorial-lesson-filter-status";
  const choice=id=>"#lesson-items [data-lesson='"+id+"']";
  const move=(id=13,direction="up")=>"#lesson-items [data-move-lesson='"+id+"'][data-direction='"+direction+"']";
  const rows=page=>page.locator("#lesson-items [data-lesson-row]").evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.lessonRow)));
  const values=page=>page.evaluate(ids=>ids.map(id=>document.getElementById(id).value),fields);
  const order=page=>page.evaluate(()=>state.lessons.map(({id,sort_order})=>({id,sort_order})));
  const snapshot=page=>page.evaluate(ids=>JSON.stringify({
    fields:ids.map(id=>document.getElementById(id).value),course:state.course?.id,lesson:state.lesson?.id,
    courseRequest:state.courseRequest,lessonRequest:state.lessonRequest,preflightRequest:state.preflightRequest,
    archive:state.archive,preflight:document.getElementById("publication-readiness").innerHTML,
    preview:document.getElementById("preview-body").innerHTML,previewHidden:document.getElementById("lesson-preview").hidden,
  }),fields);
  const receipt=()=>({schema_version:1,scope:"current_editorial_draft",course_id:1,course_version:7,
    status:"draft",lesson_id:13,direction:"up",changed:true,order:clone(target)});
  let stage="initial lesson search",failed=false;
  async function bounded(promise,label){
    let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error("C131 timeout: "+label)),8000);
    })]);}finally{clearTimeout(timer);}
  }
  const close=page=>bounded(page.close(),"page cleanup");
  async function open({published=false,empty=false,invalid=false,selected=12}={}){
    const page=await context.newPage();await ensureLocalPage(page);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    const fixture={courses:[1,2].map(id=>({id,slug:"curso-ficticio-"+id,title:"Curso fictício "+id,
      category:"metodologia",summary:"Resumo salvo.",sort_order:0,is_published:published})),
      lessons:new Map([[1,empty?[]:original.map((pair,index)=>({...pair,
        slug:["inicio-editorial","planejamento-vendas","gestao-canais"][index],
        title:["Ação e método","Planejamento de vendas","Conexões de canais"][index],
        body:"Conteúdo exclusivo-corpo "+pair.id+".\n\nSegundo parágrafo literal.",
        status:published?"published":"draft",is_published:published}))],
        [2,[{id:21,slug:"aula-21",title:"Aula do outro curso",body:"Texto do outro curso.",sort_order:0,status:"draft",is_published:false}]]])};
    const control={requests:[],writes:[],hook:null,reorder:ok(receipt()),commitOrder:clone(target),audit:ok({events:[],next_before_id:null})};
    await page.route(api+"/**",async route=>{
      const request=route.request(),pathname=new URL(request.url()).pathname.replace("/universidade/private/admin","");
      const entry={path:pathname,method:request.method(),body:request.postDataJSON(),request};
      control.requests.push(entry);if(entry.method!=="GET")control.writes.push(entry);
      if(pathname==="/courses/1/lessons/reorder"&&entry.method==="POST"&&control.commitOrder){
        const stored=new Map(fixture.lessons.get(1).map(lesson=>[lesson.id,lesson]));
        fixture.lessons.set(1,control.commitOrder.map(pair=>({...stored.get(pair.id),sort_order:pair.sort_order})));
      }
      let result=control.hook?await control.hook(entry):undefined;
      if(result===undefined){
        if(pathname==="/courses")result=ok({courses:fixture.courses});
        else if(/^\/courses\/\d+\/lessons$/.test(pathname))result=ok({lessons:invalid?null:fixture.lessons.get(Number(pathname.split("/")[2]))});
        else if(pathname==="/courses/1/lessons/reorder")result=control.reorder;
        else if(pathname==="/courses/1/publication-check")result=ok({course_id:1,version:7,lesson_count:3,
          ready:true,issues:[],warnings:[],content_hash:"a".repeat(64),advisory_only:true});
        else if(pathname==="/courses/1/versions")result=ok({schema_version:1,scope:"editorial_archived_content",course_id:1,
          versions:[{version:1,status:"archived",lesson_count:1}],next_before_version:null});
        else if(pathname==="/courses/1/versions/1/lessons")result=ok({schema_version:1,scope:"editorial_archived_content",course_id:1,
          course_version:1,status:"archived",lessons:[{id:91,slug:"aula-arquivada",title:"Aula histórica",sort_order:0}],next_after:null});
        else if(pathname==="/courses/1/versions/1/lessons/91")result=ok({schema_version:1,scope:"editorial_archived_content",course_id:1,
          course_version:1,status:"archived",lesson:{id:91,slug:"aula-arquivada",title:"Aula histórica",sort_order:0,body:"Corpo histórico literal."}});
        else if(pathname==="/audit")result=control.audit;
        else if(pathname==="/overview")result=ok({schema_version:1,scope:"current_editorial_catalog",
          totals:{courses:2,published_courses:published?2:0,draft_courses:published?0:2,current_lessons:empty?1:4,courses_without_lessons:empty?1:0,courses_without_summary:0},
          categories:[{category:"metodologia",courses:2,published_courses:published?2:0,draft_courses:published?0:2,current_lessons:empty?1:4},
            ...["negocios","sistemas"].map(category=>({category,courses:0,published_courses:0,draft_courses:0,current_lessons:0}))]});
        else result={status:404,payload:{error:"not_found"}};
      }
      if(result.abort){await route.abort("failed");return;}
      await route.fulfill({status:result.status,contentType:"application/json",headers:{"Cache-Control":"private, no-store"},body:JSON.stringify(result.payload)});
    });
    function holdReorder(){
      let releaseGate,markSeen,markTerminal,request=null,released=false;
      const gate=new Promise(resolve=>{releaseGate=resolve;}),seen=new Promise(resolve=>{markSeen=resolve;});
      const terminal=new Promise(resolve=>{markTerminal=resolve;});
      const onTerminal=value=>{if(value===request)markTerminal();};
      page.on("requestfinished",onTerminal);page.on("requestfailed",onTerminal);
      control.hook=async entry=>{
        if(entry.path!=="/courses/1/lessons/reorder")return undefined;
        request=entry.request;markSeen();await gate;return ok(receipt());
      };
      const held={seen:()=>bounded(seen,"pending reorder"),release:()=>{if(released)return;released=true;releaseGate();},
        terminal:()=>bounded(terminal,"reorder terminal"),
        dispose:()=>{page.off("requestfinished",onTerminal);page.off("requestfailed",onTerminal);}};
      heldRequests.push(held);return held;
    }
    await page.goto(base+"/admin");await page.waitForFunction(()=>state.catalogReady&&!state.catalogLoading);
    await page.locator("#course-items [data-course='1']").click();
    if(invalid)await page.locator("#retry-lessons").waitFor();
    else{
      await page.waitForFunction(()=>state.course?.id===1&&state.lessonsReady);
      if(!empty&&selected!==null){await page.locator(choice(selected)).click();await page.waitForFunction(id=>state.lesson?.id===id,selected);}
    }
    await page.waitForLoadState("networkidle",{timeout:8000});
    return {page,fixture,control,holdReorder};
  }
  try{
    {
      const {page,control}=await open();
      await page.locator("#check-publication").click();await page.locator("#publication-readiness").waitFor({state:"visible"});
      await page.locator("#refresh-editorial-versions").click();await page.locator("[data-archive-version='1']").click();
      await page.locator("[data-archive-lesson='91']").click();await page.locator("#editorial-version-content").waitFor({state:"visible"});
      await page.locator("#preview-lesson").click();await page.locator("#lesson-preview").waitFor({state:"visible"});
      const originalState=await snapshot(page),requests=control.requests.length,url=page.url();
      await page.getByLabel("Buscar aula neste curso",{exact:true}).fill("  ACAO  ");
      check(same(await rows(page),[12,11])&&(await page.locator(status).innerText()).startsWith("Resultados: 1 de 3 aulas.")&&
        await page.locator("#lesson-items [data-lesson-row='12']").getAttribute("data-outside-filter")==="true"&&
        (await page.locator("#lesson-items [data-lesson-row='12']").innerText()).includes("Posição 2"),
        "C131 accent-insensitive title search pins the selected lesson without inflating matches or changing its full-list position");
      await page.locator(search).fill("GESTAO-CANAIS");
      check(same(await rows(page),[12,13])&&(await page.locator(status).innerText()).includes("Subir e Descer consideram todas as aulas do curso"),
        "C131 saved slugs match case-insensitively and filtered order controls explain their complete-course scope");
      await page.locator(search).fill("exclusivo-corpo");
      check(same(await rows(page),[12])&&(await page.locator(status).innerText()).startsWith("Resultados: 0 de 3 aulas.")&&
        (await page.locator("#lesson-items").innerText()).includes("Nenhuma aula corresponde à busca")&&
        await snapshot(page)===originalState&&control.requests.length===requests&&page.url()===url,
        "C131 body text is not searched and no-match navigation preserves preview, archive, preflight, forms and generations without HTTP");
      await page.locator(search).focus();await page.keyboard.press("Tab");
      check(await page.locator(clear).evaluate(node=>node===document.activeElement),
        "C131 the clear action is reachable directly after the labelled search field by keyboard");
      await page.keyboard.press("Enter");
      check(same(await rows(page),[11,12,13])&&await page.locator(search).inputValue()===""&&
        await page.locator(search).evaluate(node=>node===document.activeElement)&&await snapshot(page)===originalState&&control.requests.length===requests,
        "C131 keyboard clear restores all rows and returns focus to the search without refilling any editor content");
      await page.setViewportSize({width:390,height:844});await page.locator(search).fill("gestao-canais");
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&await page.locator(clear).isVisible()&&
        same(await rows(page),[12,13])&&await snapshot(page)===originalState&&control.requests.length===requests,
        "C131 the filter and pinned lesson remain usable at 390 pixels with no horizontal overflow or mutation");
      await close(page);
    }
    {
      stage="dirty forms and explicit selection";const {page,control}=await open();
      await page.locator("#course-summary").fill("  Resumo local preservado  ");await page.locator("#lesson-body").fill("  Texto local não salvo  ");
      const before=await values(page),requests=control.requests.length;await page.locator(search).fill("acao");
      page.once("dialog",dialog=>dialog.dismiss());await page.locator(choice(11)).click();
      check(same(await values(page),before)&&await page.evaluate(()=>state.lesson.id===12&&state.lessonQuery==="acao")&&control.requests.length===requests,
        "C131 canceling the existing lesson discard dialog preserves both dirty forms and the active filter");
      page.once("dialog",dialog=>dialog.accept());await page.locator(choice(11)).click();
      check(await page.evaluate(()=>state.lesson.id===11&&state.lessonQuery==="acao")&&await page.locator("#course-summary").inputValue()===before[3]&&
        control.requests.length===requests&&control.writes.length===0,
        "C131 accepting a lesson selection keeps the course buffer and query and performs no HTTP request");
      await close(page);
    }
    {
      stage="obsolete controls";const {page,control}=await open();
      const oldChoice=await page.locator(choice(13)).elementHandle(),oldMove=await page.locator(move()).elementHandle();
      const generation=await page.evaluate(()=>state.lessonRequest);await page.locator(search).fill("acao");
      await page.evaluate(nodes=>nodes.forEach(node=>node.dispatchEvent(new MouseEvent("click",{bubbles:true}))),[oldChoice,oldMove]);
      check(await oldChoice.evaluate(node=>!node.isConnected)&&await oldMove.evaluate(node=>!node.isConnected)&&
        await page.evaluate(previous=>state.lesson.id===12&&state.lessonRequest===previous,generation)&&control.writes.length===0,
        "C131 filtering removes old controls without advancing a generation and their stale handlers cannot select or reorder");
      await oldChoice.dispose();await oldMove.dispose();await close(page);
    }
    {
      stage="hidden neighbor and pending search";const {page,control,holdReorder}=await open({selected:11});
      await page.locator(search).fill("gestao-canais");const held=holdReorder(),before=await values(page),requests=control.requests.length;
      await page.locator(move()).click();await held.seen();
      await page.locator(search).evaluate(node=>{node.value="forged pending";node.dispatchEvent(new Event("input",{bubbles:true}));});
      await page.locator(clear).evaluate(node=>node.dispatchEvent(new MouseEvent("click",{bubbles:true})));
      check(await page.locator(search).isDisabled()&&await page.locator(search).inputValue()==="gestao-canais"&&same(await order(page),original)&&
        same(await values(page),before)&&control.requests.length===requests+1,
        "C131 pending reordering rejects programmatic filter changes and retains the unmodified complete snapshot");
      held.release();await held.terminal();await page.waitForFunction(()=>!state.writePending&&!state.writeOutcomeUnknown);
      check(same(await order(page),target)&&same(await rows(page),[11,13])&&
        same(control.writes[0].body,{lesson_id:13,direction:"up",expected_order:original})&&
        await page.locator(search).inputValue()==="gestao-canais"&&(await page.locator("#lesson-items [data-lesson-row='13']").innerText()).includes("Posição 2")&&
        !(await page.locator(search).isDisabled())&&control.requests.length===requests+1,
        "C131 moving across a hidden neighbor submits all three lessons and applies the confirmed full order while keeping the query");
      await close(page);
    }
    {
      stage="lost response and same-course recovery";const {page,control}=await open({selected:11});
      await page.locator(search).fill("gestao-canais");control.reorder={abort:true};await page.locator(move()).click();
      await page.waitForFunction(()=>state.writeOutcomeUnknown&&!state.writePending);
      const before=await values(page),requests=control.requests.length;
      page.once("dialog",dialog=>dialog.dismiss());await page.locator("#retry-catalog").click();
      check(await page.locator(search).isDisabled()&&await page.locator(search).inputValue()==="gestao-canais"&&
        same(await values(page),before)&&control.requests.length===requests&&control.writes.length===1,
        "C131 canceling uncertain-write reconciliation keeps the course-local query and buffers without another request");
      page.once("dialog",dialog=>dialog.accept());await page.locator("#retry-catalog").click();
      await page.waitForFunction(()=>state.catalogReady&&state.lessonsReady&&!state.catalogLoading&&!state.writeOutcomeUnknown);
      check(same(await order(page),target)&&same(await rows(page),[11,13])&&await page.locator(search).inputValue()==="gestao-canais"&&
        !(await page.locator(search).isDisabled())&&control.writes.length===1,
        "C131 successful manual reconciliation redraws the filtered committed list without replaying POST or clearing the query");
      await page.locator("#course-items [data-course='2']").click();await page.waitForFunction(()=>state.course?.id===2&&state.lessonsReady);
      check(await page.locator(search).inputValue()===""&&same(await rows(page),[21])&&control.writes.length===1,
        "C131 switching to another course resets only the previous course's local lesson query");
      await close(page);
    }
    for(const options of [{empty:true},{invalid:true},{published:true}]){
      stage="list availability";const {page,control}=await open(options);
      if(options.published)await page.locator(search).fill("acao");
      check(options.invalid
        ?await page.locator(search).isDisabled()&&!(await page.locator(status).innerText()).includes("0 de 0")&&same(await rows(page),[])
        :options.empty?!(await page.locator(search).isDisabled())&&(await page.locator(status).innerText()).startsWith("Resultados: 0 de 0 aulas.")
        :same(await rows(page),[12,11])&&await page.locator("#lesson-save").isDisabled()&&
          await page.locator("#lesson-items [data-move-lesson]").evaluateAll(nodes=>nodes.every(node=>node.disabled)),
        "C131 valid empty, malformed and published lists keep distinct search/edit availability: "+Object.keys(options)[0]);
      check(control.writes.length===0,"C131 list availability never starts an editorial mutation: "+Object.keys(options)[0]);
      await close(page);
    }
    for(const code of [403,419]){
      stage="revocation during delayed reorder "+code;const {page,control,holdReorder}=await open({selected:11});
      await page.locator(search).fill("gestao-canais");const held=holdReorder();await page.locator(move()).click();await held.seen();
      control.audit={status:code,payload:{error:"access_denied"}};await page.locator("#refresh-audit").click();
      await page.waitForFunction(()=>state.accessDenied);held.release();await held.terminal();await page.waitForFunction(()=>!state.writePending);
      check(await page.locator(search).inputValue()===""&&await page.locator(search).isDisabled()&&same(await rows(page),[])&&
        await page.locator(status).evaluate(node=>node.hidden&&node.textContent==="")&&
        await page.evaluate(()=>state.lessonQuery===""&&state.lessonQueryCourseId===null)&&control.writes.length===1,
        "C131 HTTP "+code+" purges the private query and a late order receipt cannot restore it or the lesson list");
      await close(page);
    }
  }catch(error){
    failed=true;console.error("C131 lesson search failed at "+stage+": "+String(error.message).slice(0,300));throw error;
  }finally{
    for(const held of heldRequests)held.release();
    try{await bounded(context.close(),"context cleanup");}
    catch(error){if(!failed)throw error;console.error("C131 context cleanup exceeded its bound after the reported failure");}
    finally{for(const held of heldRequests)held.dispose();}
  }
};
