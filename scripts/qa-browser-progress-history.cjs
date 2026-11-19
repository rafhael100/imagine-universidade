"use strict";

// Invoked only by the guarded synthetic runner. Each page owns its fixtures;
// no history or completion request reaches the shared main fixture.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
  context.setDefaultTimeout(8000);context.setDefaultNavigationTimeout(15000);
  const api=base+"/universidade/private",pending=[];
  const row=(completion_id=100,changes={})=>({completion_id,course_slug:"curso-"+completion_id,course_version:1,
    lesson_slug:"aula-"+completion_id,completed_at:"2026-11-17T12:34:56Z",availability:"unavailable",...changes});
  const envelope=(completions=[row()],next_before_id=null)=>({schema_version:1,scope:"current_authenticated_student",completions,next_before_id});
  const course=id=>({id,slug:"curso-"+id,title:"Título atual privado "+id,summary:"Resumo atual",
    category:id===1?"metodologia":"negocios",lessons_total:1,lessons_completed:0});
  const lesson=id=>({id,course_id:Math.floor(id/10),course_version:id===11?2:1,slug:"aula-"+Math.floor(id/10),
    title:"Aula atual "+id,sort_order:0,body:"Conteúdo autorizado atual da aula "+id+"."});
  let stage="manual completion history";
  async function bounded(promise,label){
    let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error("C126 timeout: "+label)),8000);
    })]);}finally{clearTimeout(timer);}
  }
  function heldResponse(label){
    let release,received;const answer=new Promise(resolve=>{release=resolve;}),seen=new Promise(resolve=>{received=resolve;});
    pending.push(()=>release({status:503,payload:{}}));
    return {release,wait:()=>bounded(seen,label),response:async()=>{received();return answer;}};
  }
  // Observe rejections even if a failed assertion closes the context before
  // a deliberately pending evaluate has settled. Normal paths still await it.
  const observed=promise=>{promise.catch(()=>{});return promise;};
  const close=page=>bounded(page.close(),"page cleanup");
  const rows=page=>page.locator("#progress-history-list [data-completion-id]");
  const ready=page=>page.waitForFunction(()=>!state.progressHistory.loading);
  const read=async(page,more=false)=>{await page.locator(more?"#more-progress-history":"#reload-progress-history").click();await ready(page);};
  const snapshot=page=>page.evaluate(()=>JSON.stringify({courseId:state.courseId,lessonId:state.lessonId,
    query:state.query,filter:state.filter,favoritesOnly:state.favoritesOnly,favorites:state.favoriteIds,reading:state.readingSnapshot,
    content:document.getElementById("lesson-content").textContent}));
  async function open(){
    const page=await context.newPage();await ensureLocalPage(page);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    await page.addInitScript(()=>{
      window.__historyStorageCalls=0;
      for(const method of ["getItem","setItem","removeItem","clear"]){const original=Storage.prototype[method];
        Storage.prototype[method]=function(...args){window.__historyStorageCalls++;return original.apply(this,args);};}
    });
    const fixture={courses:[course(1),course(2)],completed:new Set([21]),rows:[
      row(100,{course_slug:"curso-1",lesson_slug:"aula-1",title:"HIDDEN_TITLE",body:"HIDDEN_BODY",subject_key:"HIDDEN_PERSON"}),
      row(80,{course_slug:"curso-2",lesson_slug:"aula-2",availability:"available"})]};
    const control={history:null,complete:null,progress:null,favorites:null,requests:[],reads:[],writes:[]};
    const resolve=async(value,request)=>typeof value==="function"?await value(request):value;
    await page.route(api+"/**",async route=>{
      const request=route.request(),url=new URL(request.url()),path=url.pathname.replace("/universidade/private","");
      const entry={path,query:url.search,method:request.method()};control.requests.push(entry);
      if(entry.method!=="GET"&&path!=="/initialize")control.writes.push(entry);
      const send=result=>route.fulfill({status:result.status,contentType:"application/json",
        headers:{"Cache-Control":"private, no-store"},body:JSON.stringify(result.payload)});
      if(path==="/initialize")return send({status:200,payload:{ready:true}});
      if(path==="/courses")return send({status:200,payload:{courses:fixture.courses.map(course=>({...course,
        lessons_completed:fixture.completed.has(course.id*10+1)?1:0}))}});
      if(path==="/favorites")return send((await resolve(control.favorites,entry))??{status:200,payload:{course_ids:[1]}});
      if(path==="/reading-position")return send({status:200,payload:{schema_version:1,scope:"current_authenticated_student",
        status:"none",revision:"synthetic-history-position",position:null}});
      if(path==="/progress/history"){
        control.reads.push(entry);const failure=await resolve(control.history,entry);if(failure)return send(failure);
        const before=url.searchParams.has("before_id")?Number(url.searchParams.get("before_id")):Infinity;
        const result=fixture.rows.filter(row=>row.completion_id<before).sort((a,b)=>b.completion_id-a.completion_id).slice(0,51);
        return send({status:200,payload:envelope(result.slice(0,50),result.length>50?result[49].completion_id:null)});
      }
      if(/^\/courses\/\d+\/lessons$/.test(path)){
        const id=Number(path.split("/")[2])*10+1,item=lesson(id);
        return send({status:200,payload:{lessons:[{id,slug:item.slug,title:item.title,sort_order:0,completed:fixture.completed.has(id)?1:0}]}});
      }
      if(/^\/lessons\/\d+$/.test(path))return send({status:200,payload:{lesson:lesson(Number(path.split("/")[2]))}});
      if(path.endsWith("/progress"))return send((await resolve(control.progress,entry))??{status:200,payload:{completed:fixture.completed.has(Number(path.split("/")[2]))}});
      if(path.endsWith("/complete")&&entry.method==="POST"){
        const failure=await resolve(control.complete,entry);if(failure)return send(failure);
        const id=Number(path.split("/")[2]),item=lesson(id);fixture.completed.add(id);
        fixture.rows.push(row(200,{course_slug:"curso-"+item.course_id,course_version:item.course_version,lesson_slug:item.slug,availability:"available"}));
        return send({status:200,payload:{completed:true}});
      }
      return send({status:404,payload:{error:"not_found"}});
    });
    await page.goto(base+"/student");
    await page.waitForFunction(()=>state.libraryReady&&!state.libraryLoading&&state.favoritesReady&&!state.favoritesLoading&&
      !state.readingLoading&&state.readingSnapshot?.status==="none");
    await page.locator("#course-list [data-course-id='1']").click();await page.locator("#lesson-content h3").waitFor();
    return {page,fixture,control};
  }
  try{
    {
      const {page,control}=await open();
      check(await page.locator("#progress-history-panel").isVisible()&&
        await page.locator("#progress-history-panel").getAttribute("open")===null&&control.reads.length===0,
        "C126 the global history is collapsed and does not load automatically");
      await page.locator("#progress-history-panel summary").click();const before=await snapshot(page);
      check(control.reads.length===0,"C126 opening the history still requires an explicit query");
      await read(page);
      check(await rows(page).count()===2&&control.reads.length===1&&control.reads[0].method==="GET"&&control.writes.length===0&&
        (await page.locator("#reload-progress-history").innerText())==="Atualizar histórico",
        "C126 a manual query displays validated private references without writes");
      const text=await page.locator("#progress-history-list").innerText();
      check(text.includes("Curso: curso-1")&&text.includes("Aula: aula-1")&&text.includes("Versão da aula: 1")&&
        text.includes("indisponível")&&text.includes("estão disponíveis")&&text.includes("(UTC)")&&
        !/HIDDEN_|Título atual privado|Conteúdo autorizado/.test(text)&&
        await page.locator("#progress-history-list a,#progress-history-list button").count()===0&&
        await page.locator("#progress-history-list time").first().getAttribute("datetime")==="2026-11-17T12:34:56Z"&&
        await snapshot(page)===before&&await page.evaluate(()=>window.__historyStorageCalls===0),
        "C126 rows show only exact references UTC dates and server availability while preserving study and private preferences");
      await close(page);
    }
    {
      stage="history pagination";const {page,fixture,control}=await open();
      fixture.rows=Array.from({length:51},(_,index)=>row(200-index));
      await page.locator("#progress-history-panel summary").click();await read(page);
      check(await rows(page).count()===50&&control.reads.length===1&&await page.locator("#more-progress-history").isVisible(),
        "C126 the first page contains at most fifty records with no automatic continuation");
      fixture.rows=fixture.rows.filter(row=>row.completion_id!==151);fixture.rows.unshift(row(201));await read(page,true);
      check(control.reads[1].query==="?before_id=151"&&await rows(page).count()===51&&
        await page.locator("[data-completion-id='150']").count()===1&&await page.locator("[data-completion-id='201']").count()===0&&
        await page.locator("#more-progress-history").isHidden(),
        "C126 a removed cursor remains a valid exclusive page boundary and newer records do not appear in an older page");
      await read(page);
      check(await rows(page).first().getAttribute("data-completion-id")==="201"&&await rows(page).count()===50&&control.reads.length===3&&
        (await page.locator("#progress-history-status").innerText()).includes("Atualize o histórico"),
        "C126 a manual refresh starts at the latest records without presenting a frozen total");
      await close(page);
    }
    for(const invalid of [
      {...envelope(),schema_version:"1"},envelope([row(100),{...row(100),completion_id:90}]),
      envelope([row(100,{completed_at:"2026-02-30T12:34:56Z"})]),envelope([row()],100),
      envelope([row(100,{course_version:"1"})]),envelope([row(100,{availability:"false"})]),
    ]){
      stage="invalid history response";const {page,control}=await open();control.history={status:200,payload:invalid};
      await page.locator("#progress-history-panel summary").click();await read(page);
      check(await rows(page).count()===0&&(await page.locator("#progress-history-status").innerText()).includes("Não foi possível")&&
        await page.locator("#reload-progress-history").isEnabled()&&await page.locator("#lesson-content h3").isVisible()&&control.writes.length===0,
        "C126 malformed schema references dates versions or cursors fail closed without blocking the lesson");
      await close(page);
    }
    {
      stage="history unavailable and empty";const {page,control}=await open();control.history={status:503,payload:{}};
      await page.locator("#progress-history-panel summary").click();await read(page);
      check((await page.locator("#progress-history-status").innerText()).includes("Não foi possível")&&
        !(await page.locator("#progress-history-status").innerText()).includes("Nenhuma conclusão"),
        "C126 a failed service read is not a legitimate empty history");
      control.history={status:200,payload:envelope([])};await read(page);
      check(await page.evaluate(()=>state.progressHistory.ready)&&
        (await page.locator("#progress-history-status").innerText()).includes("Nenhuma conclusão encontrada nesta consulta")&&
        control.reads.length===2&&control.writes.length===0,
        "C126 manual retry accepts a valid empty history without another action");
      await close(page);
    }
    {
      stage="independent pending history";const {page,control}=await open(),held=heldResponse("pending history");
      await page.locator("#progress-history-panel summary").click();control.history=held.response;
      const lookup=observed(page.evaluate(()=>loadProgressHistory()));await held.wait();await page.evaluate(()=>loadProgressHistory());
      await page.locator("#course-list [data-course-id='2']").click();await page.locator("#lesson-content h3").waitFor();
      check(await page.locator("#reload-progress-history").isDisabled()&&control.reads.length===1&&
        await page.evaluate(()=>state.courseId===2&&state.lessonId===21),
        "C126 a pending history query is single-flight and does not block normal lesson navigation");
      held.release({status:200,payload:envelope([row(70)])});await bounded(lookup,"history after navigation");
      check(await rows(page).count()===1&&await page.evaluate(()=>state.courseId===2&&state.lessonId===21)&&control.writes.length===0,
        "C126 the global read remains compatible with a different current course");
      await close(page);
    }
    {
      stage="late history after library refresh";const {page,control}=await open(),held=heldResponse("old library history");
      await page.locator("#progress-history-panel summary").click();control.history=held.response;
      const old=observed(page.evaluate(()=>loadProgressHistory()));await held.wait();await page.evaluate(()=>loadLibrary());
      await page.waitForFunction(()=>state.libraryReady&&!state.libraryLoading&&!state.favoritesLoading&&!state.readingLoading);
      control.history={status:200,payload:envelope([row(65)])};await read(page);
      held.release({status:200,payload:envelope([row(90)])});await bounded(old,"invalidated history response");
      check(await rows(page).count()===1&&await rows(page).first().getAttribute("data-completion-id")==="65"&&
        await page.evaluate(()=>state.progressHistory.ready&&!state.progressHistory.loading),
        "C126 an obsolete lookup and its finally cannot overwrite the current history after library refresh");
      await close(page);
    }
    {
      stage="confirmed completion and manual history";const {page,control}=await open();
      await page.locator("#progress-history-panel summary").click();await read(page);
      const generation=await page.evaluate(()=>state.progressHistory.request);
      await page.locator("#lesson-content button.primary").click();
      await page.waitForFunction(before=>state.progressHistory.request>=before+2&&!state.progressHistory.ready,generation);
      await page.locator("#status").filter({hasText:"Seu progresso foi registrado"}).waitFor();
      check(await rows(page).count()===0&&control.reads.length===1&&control.writes.length===1&&
        await page.locator("#lesson-content button.primary").isDisabled(),
        "C126 a confirmed completion invalidates cached history without an optimistic row or automatic query");
      await read(page);
      check(await rows(page).count()===3&&(await page.locator("[data-completion-id='200']").innerText()).includes("Versão da aula: 2")&&
        await page.locator("[data-completion-id='100']").count()===1&&control.writes.length===1,
        "C126 an explicit fresh query keeps the historical version and the newly completed version separate");
      await close(page);
    }
    {
      stage="history around a pending completion";const {page,control}=await open();
      const readHeld=heldResponse("history before completion"),writeHeld=heldResponse("pending completion");
      await page.locator("#progress-history-panel summary").click();control.history=readHeld.response;control.complete=writeHeld.response;
      const old=observed(page.evaluate(()=>loadProgressHistory()));await readHeld.wait();
      await page.locator("#lesson-content button.primary").click();await writeHeld.wait();
      readHeld.release({status:200,payload:envelope([row(60)])});await bounded(old,"history invalidated by completion start");
      check(await rows(page).count()===0&&!(await page.evaluate(()=>state.progressHistory.ready))&&control.reads.length===1,
        "C126 starting the POST invalidates a history response that was already pending");
      control.history=null;await read(page);writeHeld.release({status:200,payload:{completed:true}});
      await page.waitForFunction(()=>!state.progressHistory.ready&&state.progressHistory.rows.length===0);
      check(await rows(page).count()===0&&control.reads.length===2&&control.writes.length===1,
        "C126 settling the POST also invalidates a history snapshot read while the write was pending");
      await close(page);
    }
    {
      stage="pending history at completion settlement";const {page,control}=await open();
      const readHeld=heldResponse("history during completion"),writeHeld=heldResponse("completion before history body");
      await page.locator("#progress-history-panel summary").click();control.complete=writeHeld.response;
      await page.locator("#lesson-content button.primary").click();await writeHeld.wait();control.history=readHeld.response;
      const lookup=observed(page.evaluate(()=>loadProgressHistory()));await readHeld.wait();
      writeHeld.release({status:200,payload:{completed:true}});await page.waitForFunction(()=>!state.progressHistory.loading);
      readHeld.release({status:200,payload:envelope([row(50)])});await bounded(lookup,"history after completion settled");
      check(await rows(page).count()===0&&!(await page.evaluate(()=>state.progressHistory.ready))&&control.reads.length===1&&control.writes.length===1,
        "C126 a read still pending when the POST finishes cannot restore a stale history");
      await close(page);
    }
    {
      stage="late uncertain completion after navigation";const {page,control}=await open(),held=heldResponse("completion after navigation");
      await page.locator("#progress-history-panel summary").click();control.complete=held.response;
      await page.locator("#lesson-content button.primary").click();await held.wait();
      await page.locator("#course-list [data-course-id='2']").click();await page.locator("#lesson-content h3").waitFor();
      await read(page);const current=await snapshot(page);held.release({status:503,payload:{}});
      await page.waitForFunction(()=>!state.progressHistory.ready&&state.progressHistory.rows.length===0);
      check(await snapshot(page)===current&&control.writes.length===1&&
        control.requests.filter(request=>request.path==="/lessons/11/progress").length===1,
        "C126 an old failed POST invalidates global history without changing the newly selected lesson or reconciling the old one");
      await close(page);
    }
    {
      stage="uncertain completion is not reconciled by history";const {page,control}=await open();
      await page.locator("#progress-history-panel summary").click();await read(page);
      control.complete={status:503,payload:{}};control.progress={status:503,payload:{}};
      await page.locator("#lesson-content button.primary").click();await page.locator("#status").filter({hasText:"Não foi possível confirmar"}).waitFor();
      control.history={status:200,payload:envelope([])};await read(page);
      check(await rows(page).count()===0&&await page.locator("#lesson-content button.primary").isDisabled()&&
        (await page.locator("#status").innerText()).includes("Não foi possível confirmar")&&control.writes.length===1&&
        control.requests.filter(request=>request.path==="/lessons/11/progress").length===2,
        "C126 an empty history never confirms or replays an uncertain completion");
      await close(page);
    }
    for(const status of [403,419]){
      stage="history revocation";const {page,control}=await open();
      await page.locator("#progress-history-panel summary").click();await read(page);control.history={status,payload:{}};await read(page);
      check(await page.evaluate(()=>state.accessDenied)&&await rows(page).count()===0&&
        await page.locator("#progress-history-panel").isHidden()&&await page.locator("#progress-history-panel").getAttribute("open")===null&&
        (await page.locator("#progress-history-status").textContent())===""&&await page.locator("#reload-progress-history").isDisabled()&&control.writes.length===0,
        "C126 "+status+" purges and closes private history without altering progress");
      await close(page);
    }
    {
      stage="late history after revocation";const {page,control}=await open(),held=heldResponse("revoked history read");
      await page.locator("#progress-history-panel summary").click();control.history=held.response;
      const lookup=observed(page.evaluate(()=>loadProgressHistory()));await held.wait();control.favorites={status:403,payload:{}};
      await page.evaluate(()=>loadFavorites());await page.waitForFunction(()=>state.accessDenied);
      held.release({status:200,payload:envelope([row(40)])});await bounded(lookup,"revoked history handler");
      check(await rows(page).count()===0&&await page.locator("#progress-history-panel").isHidden()&&
        await page.evaluate(()=>state.progressHistory.rows.length===0&&state.progressHistory.message==="")&&control.writes.length===0,
        "C126 a late successful history response cannot restore references after revocation");
      await close(page);
    }
  }catch(error){
    console.error("C126 progress-history stage: "+stage+"; "+String(error.message).slice(0,200));throw error;
  }finally{
    for(const release of pending)release();await bounded(context.close(),"context cleanup");
  }
};
