"use strict";

// Invoked only by the guarded synthetic runner. Each page owns an isolated
// editorial fixture; archived reads cannot mutate the shared main fixture.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
  context.setDefaultTimeout(8000);context.setDefaultNavigationTimeout(15000);
  const api=base+"/universidade/private/admin",pending=[];
  const fields=["course-title","course-slug","course-category","course-summary","course-sort",
    "lesson-title","lesson-slug","lesson-body","lesson-sort"];
  const env=course_id=>({schema_version:1,scope:"editorial_archived_content",course_id});
  const item=(id=21,sort_order=0)=>({id,slug:"aula-arquivada-"+id,title:"Título arquivado "+id,sort_order});
  const index=(versions=[{version:2,status:"archived",lesson_count:2},{version:1,status:"archived",lesson_count:0}],next=null,course=1)=>
    ({...env(course),versions,next_before_version:next});
  const list=(lessons=[item(),item(22,1)],next=null,course=1,version=2)=>
    ({...env(course),course_version:version,status:"archived",lessons,next_after:next});
  const detail=(lesson=item(),course=1,version=2)=>({...env(course),course_version:version,status:"archived",
    lesson:{...lesson,body:"Texto literal da aula "+lesson.id+".\n\n<script>window.__archiveExecuted=true</script>"}});
  let stage="initial archive panel";
  async function bounded(promise,label){
    let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error("C122 timeout: "+label)),8000);
    })]);}finally{clearTimeout(timer);}
  }
  function heldResponse(label){
    let release,received;const result=new Promise(resolve=>{release=resolve;});
    const seen=new Promise(resolve=>{received=resolve;});pending.push(()=>release({status:503,payload:{}}));
    return {release,wait:()=>bounded(seen,label),response:async()=>{received();return result;}};
  }
  const values=page=>page.evaluate(ids=>ids.map(id=>document.getElementById(id).value),fields);
  const settled=page=>page.waitForFunction(()=>!state.archive.versionsLoading&&!state.archive.lessonsLoading&&!state.archive.bodyLoading);
  const selectVersion=(page,version=2)=>page.locator("#editorial-version-list [data-archive-version='"+version+"']").click();
  const selectLesson=(page,id=21)=>page.locator("#editorial-version-lessons [data-archive-lesson='"+id+"']").click();
  async function readArchive(page){
    await page.locator("#refresh-editorial-versions").click();await settled(page);
    await selectVersion(page);await settled(page);await selectLesson(page);
    await page.locator("#editorial-version-content h4").waitFor({state:"visible"});await settled(page);
  }
  async function dirty(page){
    await page.locator("#course-title").fill("Título local não salvo");
    await page.locator("#course-category").selectOption("negocios");
    await page.locator("#course-summary").fill("  Resumo local com espaços  ");await page.locator("#course-sort").fill("9");
    await page.locator("#lesson-title").fill("Aula em edição local");
    await page.locator("#lesson-body").fill("  Corpo local do rascunho, sem salvar.  ");await page.locator("#lesson-sort").fill("8");
    return values(page);
  }
  async function open(){
    const page=await context.newPage();await ensureLocalPage(page);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    const fixture={courses:[1,2].map(id=>({id,slug:"curso-atual-"+id,title:"Cadastro atual "+id,category:"metodologia",
      summary:"Resumo atual.",sort_order:0,is_published:false})),
      current:new Map([1,2].map(id=>[id,[{id:id*100+1,slug:"aula-atual-"+id,title:"Aula atual "+id,
        body:"Conteúdo atual do rascunho.",sort_order:0,status:"draft",is_published:false}]])),
      versions:new Map([[1,index().versions],[2,[]]]),lessons:new Map([["1:2",[item(),item(22,1)]],["1:1",[]]])};
    const control={index:null,lessons:null,body:null,write:null,reads:[],writes:[],dialogs:0};
    page.on("dialog",()=>{control.dialogs++;});
    const resolve=async(value,request)=>typeof value==="function"?await value(request):value;
    await page.route(api+"/**",async route=>{
      const request=route.request(),url=new URL(request.url()),path=url.pathname.replace("/universidade/private/admin","");
      const method=request.method(),entry={path,query:url.search,method};
      const send=result=>route.fulfill({status:result.status,contentType:"application/json",
        headers:{"Cache-Control":"private, no-store"},body:JSON.stringify(result.payload)});
      if(method!=="GET"){
        entry.body=request.postDataJSON();control.writes.push(entry);
        const failure=await resolve(control.write,entry);if(failure)return send(failure);
      }
      const versions=path.match(/^\/courses\/(\d+)\/versions$/);
      if(versions){
        control.reads.push(entry);const failure=await resolve(control.index,entry);if(failure)return send(failure);
        const id=Number(versions[1]),before=url.searchParams.has("before_version")?Number(url.searchParams.get("before_version")):Infinity;
        const rows=(fixture.versions.get(id)||[]).filter(row=>row.version<before).slice(0,51);
        return send({status:200,payload:index(rows.slice(0,50),rows.length>50?rows[49].version:null,id)});
      }
      const archived=path.match(/^\/courses\/(\d+)\/versions\/(\d+)\/lessons(?:\/(\d+))?$/);
      if(archived){
        control.reads.push(entry);const course=Number(archived[1]),version=Number(archived[2]),rows=fixture.lessons.get(course+":"+version)||[];
        const failure=await resolve(archived[3]?control.body:control.lessons,entry);if(failure)return send(failure);
        if(archived[3]){
          const lesson=rows.find(row=>row.id===Number(archived[3]));return send(lesson?{status:200,payload:detail(lesson,course,version)}:{status:404,payload:{}});
        }
        const order=url.searchParams.get("after_sort_order"),id=Number(url.searchParams.get("after_lesson_id"));
        const pageRows=rows.filter(row=>order===null||row.sort_order>Number(order)||(row.sort_order===Number(order)&&row.id>id)).slice(0,51);
        return send({status:200,payload:list(pageRows.slice(0,50),pageRows.length>50?{sort_order:pageRows[49].sort_order,lesson_id:pageRows[49].id}:null,course,version)});
      }
      if(path==="/courses"&&method==="GET")return send({status:200,payload:{courses:fixture.courses}});
      if(path==="/audit")return send({status:200,payload:{events:[],next_before_id:null}});
      if(path==="/overview")return send({status:200,payload:{schema_version:1,scope:"current_editorial_catalog",
        totals:{courses:2,published_courses:0,draft_courses:2,current_lessons:2,courses_without_lessons:0,courses_without_summary:0},
        categories:["metodologia","negocios","sistemas"].map((category,i)=>({category,courses:i===0?2:0,published_courses:0,draft_courses:i===0?2:0,current_lessons:i===0?2:0}))}});
      const current=path.match(/^\/courses\/(\d+)\/lessons$/);
      if(current&&method==="GET")return send({status:200,payload:{lessons:fixture.current.get(Number(current[1]))||[]}});
      if(path==="/courses/1"&&method==="PATCH"){
        Object.assign(fixture.courses[0],entry.body);return send({status:200,payload:{saved:true}});
      }
      return send({status:404,payload:{error:"not_found"}});
    });
    await page.goto(base+"/admin");await page.locator("#course-items [data-course='1']").click();
    await page.locator("#lesson-items [data-lesson='101']").click();
    await page.waitForFunction(()=>state.catalogReady&&state.lessonsReady&&!state.catalogLoading);
    return {page,control,fixture};
  }
  try{
    {
      const {page,control}=await open();
      check(control.reads.length===0&&await page.locator("#refresh-editorial-versions").isEnabled(),
        "C122 selecting an authorized course does not automatically load its archived content");
      const before=await dirty(page);await page.locator("#refresh-editorial-versions").click();await settled(page);
      check(control.reads.length===1&&await page.locator("#editorial-version-list [data-archive-version]").count()===2&&
        await page.locator("#editorial-version-content").isHidden(),
        "C122 the first request lists only archived version metadata and no lesson body");
      await selectVersion(page);await settled(page);
      check(control.reads.length===2&&await page.locator("#editorial-version-lessons [data-archive-lesson]").count()===2&&
        await page.locator("#editorial-version-content").isHidden()&&
        (await page.locator("#editorial-version-heading").innerText())==="Versão 2 · Arquivada",
        "C122 selecting a version loads scoped lesson metadata with explicit historical status");
      await selectLesson(page);await settled(page);
      check(control.reads.length===3&&JSON.stringify(await values(page))===JSON.stringify(before)&&
        control.writes.length===0&&control.dialogs===0,
        "C122 reading an archived lesson preserves both dirty forms without confirmations or writes");
      check((await page.locator("#editorial-version-content").innerText()).includes("<script>window.__archiveExecuted=true</script>")&&
        await page.locator("#editorial-version-content script").count()===0&&await page.evaluate(()=>window.__archiveExecuted)===undefined,
        "C122 archived text is literal and cannot execute markup from the historical body");
      check((await page.locator("#editorial-versions-context").innerText()).includes("Curso no cadastro atual: Cadastro atual 1")&&
        !(await page.locator("#editorial-version-content").innerText()).includes("Cadastro atual"),
        "C122 current course metadata is labelled as current and is not presented as a historical snapshot");
      const dialog=page.waitForEvent("dialog").then(value=>value.dismiss());
      await Promise.all([dialog,page.locator("#course-items [data-course='2']").click()]);
      check(JSON.stringify(await values(page))===JSON.stringify(before)&&control.reads.length===3&&
        (await page.locator("#editorial-version-content h4").innerText())==="Título arquivado 21",
        "C122 cancelling an editor course switch preserves the displayed archive and all unsaved fields");
      await page.close();
    }
    {
      stage="metadata pagination";const {page,control,fixture}=await open();
      fixture.versions.set(1,Array.from({length:51},(_,i)=>({version:51-i,status:"archived",lesson_count:i===0?51:0})));
      fixture.lessons.set("1:51",Array.from({length:51},(_,i)=>item(1000+i,Math.floor(i/2))));
      await page.locator("#refresh-editorial-versions").click();await settled(page);
      check(await page.locator("#editorial-version-list [data-archive-version]").count()===50&&
        await page.locator("#more-editorial-versions").isVisible(),
        "C122 version metadata is limited to a page of 50 and exposes deliberate pagination");
      await page.locator("#more-editorial-versions").click();await settled(page);
      check(await page.locator("#editorial-version-list [data-archive-version]").count()===51&&
        control.reads[1].query==="?before_version=2"&&await page.locator("#more-editorial-versions").isHidden(),
        "C122 the next version page uses its exact last-version cursor without duplication or truncation");
      await selectVersion(page,51);await settled(page);await page.locator("#more-version-lessons").click();await settled(page);
      check(await page.locator("#editorial-version-lessons [data-archive-lesson]").count()===51&&
        control.reads[3].query==="?after_sort_order=24&after_lesson_id=1049"&&await page.locator("#more-version-lessons").isHidden()&&
        !control.reads.some(row=>/\/lessons\/\d+$/.test(row.path)),
        "C122 lesson metadata pages preserve order and both cursor fields without downloading all bodies");
      await selectLesson(page,1050);await settled(page);
      check(control.reads.filter(row=>/\/lessons\/\d+$/.test(row.path)).length===1&&
        (await page.locator("#editorial-version-content h4").innerText())==="Título arquivado 1050"&&control.writes.length===0,
        "C122 only the deliberately selected lesson body is requested after metadata pagination");
      await page.close();
    }
    {
      stage="empty archives";const {page,control}=await open();await page.locator("#refresh-editorial-versions").click();await settled(page);
      await selectVersion(page,1);await settled(page);
      check((await page.locator("#editorial-version-lessons-status").innerText()).includes("não possui aulas")&&
        await page.locator("#editorial-version-content").isHidden(),
        "C122 an empty archived version is distinct from unavailable metadata");
      await page.locator("#course-items [data-course='2']").click();await page.waitForFunction(()=>state.course?.id===2&&state.lessonsReady);
      await page.locator("#refresh-editorial-versions").click();await settled(page);
      check((await page.locator("#editorial-versions-status").innerText()).includes("não possui versões arquivadas")&&
        await page.locator("#editorial-version-list [data-archive-version]").count()===0&&control.writes.length===0,
        "C122 a course without archived versions returns a clear valid empty state");
      await page.close();
    }
    for(const kind of ["index","lessons","body"])for(const result of [{status:503,payload:{}},{status:200,payload:{}}]){
      stage=kind+" unavailable or malformed";const {page,control}=await open();await readArchive(page);const before=await dirty(page);
      control[kind]=result;
      if(kind==="index")await page.locator("#refresh-editorial-versions").click();else if(kind==="lessons")await selectVersion(page);else await selectLesson(page);
      await settled(page);
      check(await page.locator("#editorial-version-content").isHidden()&&JSON.stringify(await values(page))===JSON.stringify(before)&&
        await page.locator("#course-save").isEnabled()&&control.writes.length===0,
        "C122 "+kind+" unavailable or malformed response clears the reader without blocking or resetting the draft editor");
      control[kind]=null;await readArchive(page);
      check((await page.locator("#editorial-version-content h4").innerText())==="Título arquivado 21"&&
        JSON.stringify(await values(page))===JSON.stringify(before)&&control.dialogs===0,
        "C122 "+kind+" query recovery is manual, read-only and preserves local edits");
      await page.close();
    }
    {
      stage="late index after course switch";const {page,control}=await open(),held=heldResponse("version index");control.index=held.response;
      await page.locator("#refresh-editorial-versions").click();await held.wait();
      await page.locator("#refresh-editorial-versions").evaluate(button=>button.dispatchEvent(new Event("click",{bubbles:true})));
      check(control.reads.length===1,"C122 a duplicate click cannot overlap the same pending version index");
      await page.locator("#course-items [data-course='2']").click();await page.waitForFunction(()=>state.course?.id===2);
      held.release({status:200,payload:index()});await settled(page);await page.waitForLoadState("networkidle");
      check(await page.locator("#editorial-version-list [data-archive-version]").count()===0&&
        await page.locator("#editorial-version-content").isHidden()&&
        (await page.locator("#editorial-versions-context").innerText()).includes("Cadastro atual 2"),
        "C122 a late index cannot restore versions from a different selected course");
      await page.close();
    }
    {
      stage="late version metadata";const {page,control}=await open();await page.locator("#refresh-editorial-versions").click();await settled(page);
      const held=heldResponse("version lesson metadata");control.lessons=request=>request.path.includes("/versions/2/")?held.response():null;
      await selectVersion(page,2);await held.wait();await selectVersion(page,1);await settled(page);
      held.release({status:200,payload:list()});await page.waitForLoadState("networkidle");
      check((await page.locator("#editorial-version-heading").innerText())==="Versão 1 · Arquivada"&&
        await page.locator("#editorial-version-lessons [data-archive-lesson]").count()===0&&await page.locator("#editorial-version-content").isHidden(),
        "C122 older metadata cannot replace a newer archived version selection");
      await page.close();
    }
    {
      stage="late body and single flight";const {page,control}=await open();await page.locator("#refresh-editorial-versions").click();await settled(page);
      await selectVersion(page);await settled(page);const held=heldResponse("archived lesson body");
      control.body=request=>request.path.endsWith("/21")?held.response():null;
      await selectLesson(page,21);await held.wait();
      await page.locator("#editorial-version-lessons [data-archive-lesson='21']").evaluate(button=>button.dispatchEvent(new Event("click",{bubbles:true})));
      check(control.reads.filter(row=>row.path.endsWith("/lessons/21")).length===1,
        "C122 the same pending archived body remains single-flight even for repeated events");
      await selectLesson(page,22);await settled(page);held.release({status:200,payload:detail()});await page.waitForLoadState("networkidle");
      check((await page.locator("#editorial-version-content h4").innerText())==="Título arquivado 22"&&
        await page.locator("#editorial-version-content h4").count()===1,
        "C122 a late previous body cannot replace the one deliberately selected afterward");
      await page.close();
    }
    for(const status of [403,419])for(const kind of ["index","lessons","body"]){
      stage=kind+" denied "+status;const {page,control}=await open();await readArchive(page);await dirty(page);control[kind]={status,payload:{}};
      if(kind==="index")await page.locator("#refresh-editorial-versions").click();else if(kind==="lessons")await selectVersion(page);else await selectLesson(page);
      await page.waitForFunction(()=>state.accessDenied);
      check(await page.locator("#editorial-versions-panel").isHidden()&&
        (await page.locator("#editorial-version-content").textContent())===""&&
        (await page.locator("#editorial-versions-context").textContent())===""&&
        (await page.locator("#course-title").inputValue())===""&&(await page.locator("#lesson-body").inputValue())===""&&control.writes.length===0,
        "C122 "+status+" on "+kind+" purges archive content and all revoked private editor fields");
      await page.close();
    }
    {
      stage="late body after revocation";const {page,control}=await open();await readArchive(page);
      const held=heldResponse("body before revoked version query");control.body=held.response;
      await selectLesson(page);await held.wait();control.index={status:403,payload:{error:"access_denied"}};
      await page.locator("#refresh-editorial-versions").click();await page.waitForFunction(()=>state.accessDenied);
      held.release({status:200,payload:detail()});await page.waitForLoadState("networkidle");
      check(await page.locator("#editorial-versions-panel").isHidden()&&
        (await page.locator("#editorial-version-content").textContent())===""&&
        (await page.locator("#lesson-body").inputValue())===""&&control.writes.length===0,
        "C122 a body arriving after revocation cannot restore archived content or editor fields");
      await page.close();
    }
    {
      stage="editorial save invalidates pending archive";const {page,control}=await open();await readArchive(page);
      const held=heldResponse("body before editorial save");control.body=held.response;await selectLesson(page);await held.wait();
      await page.locator("#course-title").fill("Cadastro atual alterado");await page.locator("#course-save").click();
      await page.waitForFunction(()=>!state.writePending&&state.catalogReady&&state.lessonsReady);
      held.release({status:200,payload:detail()});await page.waitForLoadState("networkidle");
      check(control.writes.length===1&&control.writes[0].method==="PATCH"&&stateUnavailable(await page.evaluate(()=>({
        versions:state.archive.versions.length,lesson:state.archive.lesson})))&&await page.locator("#editorial-version-content").isHidden(),
        "C122 an authorized editorial save invalidates pending archived reads without replaying the mutation");
      await page.close();
    }
    {
      stage="uncertain editor save";const {page,control}=await open();await readArchive(page);
      control.write={status:503,payload:{}};await page.locator("#course-title").fill("Rascunho local incerto");
      await page.locator("#course-save").click();await page.waitForFunction(()=>state.writeOutcomeUnknown&&!state.writePending);
      const before=control.reads.length;
      await page.locator("#refresh-editorial-versions").evaluate(button=>button.dispatchEvent(new Event("click",{bubbles:true})));
      check((await page.locator("#course-title").inputValue())==="Rascunho local incerto"&&
        await page.locator("#course-title").isDisabled()&&await page.locator("#refresh-editorial-versions").isDisabled()&&
        control.reads.length===before&&control.writes.length===1&&await page.locator("#editorial-version-content").isHidden(),
        "C122 an uncertain editor mutation preserves disabled local fields and cannot reopen stale archived content");
      await page.close();
    }
  }catch(error){
    console.error("C122 failure before browser cleanup: "+stage+"; "+String(error.message).split("\n")[0].slice(0,240));throw error;
  }finally{
    for(const release of pending)release();await bounded(context.close(),"archive context cleanup");
  }
};
function stateUnavailable(value){return value.versions===0&&value.lesson===null;}
