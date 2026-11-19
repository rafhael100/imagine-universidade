"use strict";

// Called by the guarded synthetic runner only. Each page owns its fixtures;
// neither retained reads nor favorite writes touch the shared main fixture.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
  context.setDefaultTimeout(8000);context.setDefaultNavigationTimeout(15000);
  const api=base+"/universidade/private",pending=[];
  const row=(course_id=1,availability="available")=>({
    course_id,course_slug:"curso-"+course_id,saved_at:"2026-11-17T12:34:56Z",availability});
  const envelope=(favorites=[row(),row(3,"unavailable"),row(70,"unavailable")],next=null)=>({
    schema_version:1,scope:"current_authenticated_student",favorites,next_after_course_id:next});
  let stage="initial retained manager";
  async function bounded(promise,label){
    let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error("C123 timeout: "+label)),8000);
    })]);}finally{clearTimeout(timer);}
  }
  function heldResponse(label){
    let release,received;
    const result=new Promise(resolve=>{release=resolve;});
    const seen=new Promise(resolve=>{received=resolve;});
    pending.push(()=>release({status:503,payload:{}}));
    return {release,wait:()=>bounded(seen,label),response:async()=>{received();return result;}};
  }
  const ready=page=>page.waitForFunction(()=>!state.retained.loading&&!state.favoriteWriting);
  const read=async page=>{await page.locator("#reload-retained-favorites").click();await ready(page);};
  const rowLocator=(page,id)=>page.locator("[data-retained-course-id='"+id+"']");
  const remove=(page,id)=>page.locator("[data-remove-retained-favorite='"+id+"']").click();
  const close=page=>bounded(page.close(),"page cleanup");
  const selection=page=>page.evaluate(()=>({
    course:state.courseId,lesson:state.lessonId,query:state.query,filter:state.filter,favoritesOnly:state.favoritesOnly,
    text:document.getElementById("lesson-content").textContent
  }));
  async function open(){
    const page=await context.newPage();await ensureLocalPage(page);
    page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(15000);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    const fixture={courses:[1,2,3].map(id=>({id,slug:"curso-"+id,title:"Título atual "+id,summary:"Resumo atual",
      category:"metodologia",lessons_total:1,lessons_completed:0})),rows:envelope().favorites};
    const control={retained:null,favorites:null,write:null,reads:[],visibleReads:0,writes:[]};
    const resolve=async(value,request)=>typeof value==="function"?await value(request):value;
    await page.route(api+"/**",async route=>{
      const request=route.request(),url=new URL(request.url()),path=url.pathname.replace("/universidade/private","");
      const entry={path,query:url.search,method:request.method()};
      const send=result=>route.fulfill({status:result.status,contentType:"application/json",
        headers:{"Cache-Control":"private, no-store"},body:JSON.stringify(result.payload)});
      if(path==="/initialize")return send({status:200,payload:{ready:true}});
      if(path==="/courses")return send({status:200,payload:{courses:fixture.courses}});
      if(path==="/favorites"){
        control.visibleReads++;const failure=await resolve(control.favorites,entry);
        return send(failure??{status:200,payload:{course_ids:fixture.rows.filter(row=>row.availability==="available").map(row=>row.course_id)}});
      }
      if(path==="/favorites/retained"){
        control.reads.push(entry);const failure=await resolve(control.retained,entry);if(failure)return send(failure);
        const after=Number(url.searchParams.get("after_course_id")||0);
        const rows=fixture.rows.filter(row=>row.course_id>after).sort((a,b)=>a.course_id-b.course_id).slice(0,51);
        return send({status:200,payload:envelope(rows.slice(0,50),rows.length>50?rows[49].course_id:null)});
      }
      if(/^\/courses\/\d+\/favorite$/.test(path)&&["PUT","DELETE"].includes(entry.method)){
        control.writes.push(entry);const failure=await resolve(control.write,entry);if(failure)return send(failure);
        const id=Number(path.split("/")[2]),favorite=entry.method==="PUT";
        fixture.rows=fixture.rows.filter(row=>row.course_id!==id);if(favorite)fixture.rows.push(row(id));
        return send({status:200,payload:{course_id:id,favorite}});
      }
      if(path==="/reading-position")return send({status:200,payload:{schema_version:1,scope:"current_authenticated_student",
        status:"none",revision:"synthetic-retained-ticket",position:null}});
      if(/^\/courses\/\d+\/lessons$/.test(path)){
        const id=Number(path.split("/")[2])*10+1;
        return send({status:200,payload:{lessons:[{id,slug:"aula-"+id,title:"Aula "+id,sort_order:0,completed:0}]}});
      }
      if(/^\/lessons\/\d+$/.test(path)){
        const id=Number(path.split("/")[2]);
        return send({status:200,payload:{lesson:{id,slug:"aula-"+id,title:"Aula "+id,sort_order:0,
          course_id:Math.floor(id/10),course_version:1,body:"Conteúdo sintético autorizado da aula."}}});
      }
      if(path.endsWith("/progress"))return send({status:200,payload:{completed:false}});
      return send({status:404,payload:{error:"not_found"}});
    });
    await page.goto(base+"/student");await page.locator("#course-list [data-course-id='1']").click();
    await page.locator("#lesson-content h3").waitFor();
    await page.waitForFunction(()=>state.libraryReady&&!state.libraryLoading&&state.favoritesReady&&!state.favoritesLoading&&
      !state.readingLoading&&state.readingSnapshot!==null);
    return {page,fixture,control};
  }
  try{
    {
      const {page,control}=await open();
      check(control.reads.length===0&&await page.locator("#retained-favorites-panel").isVisible()&&
        await page.locator("#retained-favorites-panel").getAttribute("open")===null,
        "C123 the retained manager is collapsed and makes no automatic request after authorization");
      await page.locator("#retained-favorites-panel summary").click();
      check(control.reads.length===0,"C123 opening management still requires an explicit query");
      await page.locator("#favorites-only").check();await page.locator("#course-list [data-course-id='1']").click();
      await page.locator("#lesson-content h3").waitFor();const before=await selection(page);
      await read(page);
      check(control.reads.length===1&&await page.locator("[data-retained-course-id]").count()===3&&control.writes.length===0,
        "C123 a manual private query renders own retained references without any write");
      check((await rowLocator(page,1).innerText()).includes("Título no catálogo atual: Título atual 1")&&
        await rowLocator(page,1).getAttribute("data-retained-availability")==="available",
        "C123 an available row can show only its matching current catalog title");
      check((await rowLocator(page,3).innerText()).includes("Curso indisponível")&&
        !(await rowLocator(page,3).innerText()).includes("Título atual 3")&&
        await rowLocator(page,70).getAttribute("data-retained-availability")==="unavailable",
        "C123 unavailable references suppress titles even when a stale catalog still contains the course");
      check(await rowLocator(page,70).locator("time").getAttribute("datetime")==="2026-11-17T12:34:56Z"&&
        await page.locator("#retained-favorites-list a").count()===0,
        "C123 retained rows show the canonical saved date without content links");
      check(JSON.stringify(await selection(page))===JSON.stringify(before)&&
        await page.evaluate(()=>JSON.stringify(state.favoriteIds))==="[1]",
        "C123 consultation preserves course, lesson and filters without promoting a partial list");
      const held=heldResponse("pending retained removal");control.write=held.response;
      await remove(page,3);await held.wait();
      check(await rowLocator(page,3).count()===1&&await page.locator("#course-favorite-toggle").isDisabled()&&
        await page.locator("[data-remove-retained-favorite='70']").isDisabled(),
        "C123 a pending removal keeps the row visible and serializes all favorite mutations");
      held.release({status:200,payload:{course_id:3,favorite:false}});await ready(page);
      check(await rowLocator(page,3).count()===0&&await rowLocator(page,1).count()===1&&
        control.writes.length===1&&control.writes[0].path==="/courses/3/favorite"&&control.writes[0].method==="DELETE",
        "C123 only the exact existing DELETE receipt removes its own reference");
      check(JSON.stringify(await selection(page))===JSON.stringify(before)&&
        await page.evaluate(()=>JSON.stringify(state.favoriteIds))==="[1]",
        "C123 removing an unavailable favorite preserves current study and other known favorites");
      await close(page);
    }
    {
      stage="retained pagination";const {page,fixture,control}=await open();
      fixture.rows=Array.from({length:51},(_,i)=>row(i+1,"unavailable"));
      await page.locator("#retained-favorites-panel summary").click();await read(page);
      check(await page.locator("[data-retained-course-id]").count()===50&&control.reads.length===1&&
        await page.locator("#more-retained-favorites").isVisible(),
        "C123 first-page management is bounded to 50 rows and never fetches the next page automatically");
      await remove(page,50);await ready(page);
      check(await page.locator("[data-retained-course-id]").count()===49&&
        await page.evaluate(()=>state.retained.nextAfter)===50,
        "C123 deleting the page's final reference preserves the server cursor");
      await page.locator("#more-retained-favorites").click();await ready(page);
      check(control.reads[1].query==="?after_course_id=50"&&await rowLocator(page,51).count()===1&&
        await rowLocator(page,50).count()===0&&await page.locator("[data-retained-course-id]").count()===50,
        "C123 the next request uses an unanchored lower bound without skipping or duplicating later references");
      check(await page.locator("#more-retained-favorites").isHidden(),
        "C123 the last validated page ends pagination without inventing a total");
      await close(page);
    }
    for(const invalid of [
      {...envelope(),schema_version:"1"},
      {...envelope(),scope:"other_student"},
      envelope([row(),row()]),
      envelope([{...row(),saved_at:"2026-02-30T12:34:56Z"}]),
      envelope([{...row(),availability:"false"}]),
      envelope([row()],1),
    ]){
      stage="invalid retained response";const {page,control}=await open();
      control.retained={status:200,payload:invalid};
      await page.locator("#retained-favorites-panel summary").click();await read(page);
      check(await page.locator("[data-retained-course-id]").count()===0&&
        (await page.locator("#retained-favorites-status").innerText()).includes("Não foi possível")&&
        await page.locator("#reload-retained-favorites").isEnabled()&&await page.locator("#lesson-content h3").isVisible(),
        "C123 malformed references, identity scope or cursor fail closed without blocking learning");
      await close(page);
    }
    {
      stage="retained unavailable then empty";const {page,control}=await open();
      control.retained={status:503,payload:{}};
      await page.locator("#retained-favorites-panel summary").click();await read(page);
      check((await page.locator("#retained-favorites-status").innerText()).includes("Não foi possível")&&
        !(await page.locator("#retained-favorites-status").innerText()).includes("Nenhuma referência"),
        "C123 service failure cannot become an empty favorites state");
      control.retained={status:200,payload:envelope([])};await read(page);
      check(await page.evaluate(()=>state.retained.ready)&&
        (await page.locator("#retained-favorites-status").innerText()).includes("Nenhuma referência encontrada")&&control.reads.length===2,
        "C123 explicit retry can accept a legitimate empty page");
      await close(page);
    }
    for(const mode of ["lost","invalid-receipt"]){
      stage="unconfirmed retained removal";const {page,fixture,control}=await open();
      await page.locator("#retained-favorites-panel summary").click();await read(page);
      control.write=mode==="lost"?{status:503,payload:{}}:{status:200,payload:{course_id:70,favorite:"false"}};
      const visibleReads=control.visibleReads;await remove(page,70);await ready(page);
      check(control.reads.length===1&&control.visibleReads===visibleReads&&control.writes.length===1&&
        await page.locator("[data-retained-course-id]").count()===0&&
        (await page.locator("#retained-favorites-status").innerText()).includes("resultado da remoção anterior não foi confirmado"),
        "C123 a lost or invalid removal clears the snapshot without automatic reconciliation or replay");
      await page.locator("#reload-favorites").click();await page.waitForFunction(()=>!state.favoritesLoading);
      check(await page.locator("#course-favorite-toggle").isDisabled()&&
        await page.evaluate(()=>state.retained.needsRefresh)&&control.writes.length===1,
        "C123 a catalog-only favorite query cannot confirm an unavailable removal or unlock writes");
      if(mode==="lost"){
        fixture.rows=[];await read(page);
        check((await page.locator("#retained-favorites-status").innerText()).includes("resultado da remoção anterior não foi confirmado")&&
          (await page.locator("#retained-favorites-status").innerText()).includes("Nenhuma referência encontrada")&&control.writes.length===1,
          "C123 an empty manual page does not prove the uncertain removal happened");
      }else{
        control.write=null;await read(page);await remove(page,70);await ready(page);
        check(control.writes.length===2&&await rowLocator(page,70).count()===0&&
          (await page.locator("#retained-favorites-status").innerText()).includes("resultado da remoção anterior não foi confirmado")&&
          (await page.locator("#retained-favorites-status").innerText()).includes("Remoção desta referência confirmada"),
          "C123 a fresh existing row permits a new explicit action while the prior outcome stays unconfirmed");
      }
      await close(page);
    }
    {
      stage="C141 withdrawn favorite after uncommitted course removal";
      const {page,fixture,control}=await open(),before=await selection(page);
      control.write=()=>{
        fixture.rows=fixture.rows.map(item=>item.course_id===1?{...item,availability:"unavailable"}:item);
        fixture.courses=fixture.courses.filter(item=>item.id!==1);
        return {status:503,payload:{error:"temporarily_unavailable"}};
      };
      await page.locator("#course-favorite-toggle").click();await ready(page);
      check(control.visibleReads===1&&control.reads.length===0&&control.writes.length===1&&
        fixture.rows.some(item=>item.course_id===1)&&
        await page.evaluate(()=>state.favoriteOutcomeUnknown&&state.retained.needsRefresh&&state.retained.unconfirmed)&&
        (await page.locator("#favorites-status").innerText()).includes("remoção não foi confirmada")&&
        JSON.stringify(await selection(page))===JSON.stringify(before),
        "C141 failed course removal preserves the retained reference and study without an automatic read or false confirmation");
      await page.locator("#reload-favorites").click();await page.waitForFunction(()=>!state.favoritesLoading);
      await page.locator("#course-favorite-toggle").evaluate(button=>button.dispatchEvent(new Event("click",{bubbles:true})));
      check(control.visibleReads===2&&control.writes.length===1&&await page.locator("#course-favorite-toggle").isDisabled()&&
        await page.evaluate(()=>state.favoritesReady&&!state.favoriteOutcomeUnknown&&state.favoriteIds.length===0&&state.retained.needsRefresh)&&
        !(await page.locator("#favorites-status").innerText()).includes("Remoção confirmada"),
        "C141 an empty published-only query refreshes its projection but cannot confirm deletion or release the retained guard");
      await page.locator("#retained-favorites-panel summary").click();await read(page);
      check(await rowLocator(page,1).getAttribute("data-retained-availability")==="unavailable"&&
        await page.locator("[data-remove-retained-favorite='1']").isEnabled()&&
        (await page.locator("#retained-favorites-status").innerText()).includes("resultado da remoção anterior não foi confirmado")&&
        control.writes.length===1&&JSON.stringify(await selection(page))===JSON.stringify(before),
        "C141 manual retained consultation exposes the still-saved withdrawn reference and permits a new explicit removal");
      control.write=null;await remove(page,1);await ready(page);
      check(control.writes.length===2&&control.writes.every(entry=>entry.method==="DELETE"&&entry.path==="/courses/1/favorite")&&
        !fixture.rows.some(item=>item.course_id===1)&&await rowLocator(page,1).count()===0&&
        (await page.locator("#retained-favorites-status").innerText()).includes("Remoção desta referência confirmada")&&
        await page.evaluate(()=>state.retained.unconfirmed)&&JSON.stringify(await selection(page))===JSON.stringify(before),
        "C141 only the second explicit action and exact receipt confirm that reference's removal, while preserving prior uncertainty");
      await close(page);
    }
    {
      stage="C141 lost committed removal and empty manual recovery";
      const {page,fixture,control}=await open(),before=await selection(page);fixture.rows=[row()];
      control.write=()=>{fixture.rows=[];return {status:503,payload:{error:"temporarily_unavailable"}};};
      await page.locator("#course-favorite-toggle").click();await ready(page);
      await page.locator("#retained-favorites-panel summary").click();await read(page);
      check(control.visibleReads===1&&control.reads.length===1&&control.writes.length===1&&
        await page.locator("[data-retained-course-id]").count()===0&&
        await page.evaluate(()=>state.retained.ready&&!state.retained.needsRefresh&&state.retained.unconfirmed&&!state.favoritesReady)&&
        (await page.locator("#retained-favorites-status").innerText()).includes("Nenhuma referência encontrada")&&
        (await page.locator("#retained-favorites-status").innerText()).includes("resultado da remoção anterior não foi confirmado"),
        "C141 an empty manual retained page remains an empty consultation, never proof that the lost DELETE succeeded");
      await page.locator("#reload-favorites").click();await page.waitForFunction(()=>!state.favoritesLoading);
      check(await page.locator("#course-favorite-toggle").isEnabled()&&
        await page.evaluate(()=>state.favoritesReady&&!state.favoriteOutcomeUnknown&&!state.retained.needsRefresh&&state.retained.unconfirmed)&&
        control.visibleReads===2&&control.writes.length===1,
        "C141 both manual consultations can restore an actionable current preference without erasing the prior uncertainty");
      control.write=null;await page.locator("#course-favorite-toggle").click();await ready(page);
      check(control.writes.length===2&&control.writes[0].method==="DELETE"&&control.writes[1].method==="PUT"&&
        fixture.rows.some(item=>item.course_id===1)&&JSON.stringify(await selection(page))===JSON.stringify(before),
        "C141 recovery permits a new deliberate save and never replays the earlier DELETE");
      await close(page);
    }
    for(const mode of ["invalid receipt","changed course"]){
      stage="C141 course removal with "+mode;const {page,fixture,control}=await open();
      const held=mode==="changed course"?heldResponse("C141 pending course DELETE"):null;
      control.write=held?held.response:{status:200,payload:{course_id:2,favorite:false}};
      await page.locator("#course-favorite-toggle").click();
      if(held){
        await held.wait();await page.locator("#course-list [data-course-id='2']").click();
        await page.waitForFunction(()=>state.courseId===2&&state.lessonId===21&&document.querySelector("#lesson-content h3")?.textContent==="Aula 21");
        fixture.rows=fixture.rows.filter(item=>item.course_id!==1);
        held.release({status:200,payload:{course_id:1,favorite:false}});
      }
      await ready(page);
      check(control.visibleReads===1&&control.reads.length===0&&control.writes.length===1&&
        await page.evaluate(expected=>state.courseId===expected&&state.lessonId===expected*10+1&&
          state.favoriteOutcomeUnknown&&state.retained.needsRefresh&&state.retained.unconfirmed,held?2:1)&&
        await page.locator("#course-favorite-toggle").isDisabled(),
        "C141 "+mode+" leaves course removal unconfirmed without changing the current lesson or starting a reconciliation");
      await close(page);
    }
    {
      stage="late retained lookup after toggle";const {page,control}=await open(),held=heldResponse("late retained GET");
      await page.locator("#retained-favorites-panel summary").click();control.retained=held.response;
      const response=page.waitForResponse(api+"/favorites/retained");
      await page.locator("#reload-retained-favorites").click();await held.wait();
      await page.locator("#course-favorite-toggle").click();await page.waitForFunction(()=>!state.favoriteWriting);
      held.release({status:200,payload:envelope()});await bounded((await response).finished(),"late retained response");
      await page.waitForLoadState("networkidle");
      check(await page.locator("[data-retained-course-id]").count()===0&&
        !(await page.evaluate(()=>state.retained.ready))&&control.writes.length===1,
        "C123 a favorite mutation invalidates the old retained response before it can restore rows");
      await close(page);
    }
    {
      stage="shared favorite reconciliation";const {page,control}=await open(),held=heldResponse("visible favorites reconciliation");
      // Only PUT retains published-list reconciliation; select an unsaved course.
      await page.locator("#course-list [data-course-id='2']").click();
      await page.waitForFunction(()=>state.courseId===2&&state.lessonId===21&&document.querySelector("#lesson-content h3")?.textContent==="Aula 21");
      control.write={status:503,payload:{}};control.favorites=held.response;
      await page.locator("#course-favorite-toggle").click();await held.wait();
      await page.locator("#retained-favorites-panel summary").click();await read(page);
      check(await page.locator("[data-remove-retained-favorite='70']").isDisabled()&&control.writes.length===1,
        "C123 retained deletion is blocked while a previous toggle reconciles through its separate GET");
      held.release({status:200,payload:{course_ids:[1]}});await page.waitForFunction(()=>!state.favoritesLoading);
      check(await page.locator("[data-remove-retained-favorite='70']").isEnabled(),
        "C123 the shared mutation gate releases after the prior reconciliation settles");
      await close(page);
    }
    {
      stage="navigation during retained removal";const {page,control}=await open(),held=heldResponse("global retained removal");
      await page.locator("#retained-favorites-panel summary").click();await read(page);control.write=held.response;
      await remove(page,70);await held.wait();await page.locator("#course-list [data-course-id='2']").click();
      await page.waitForFunction(()=>state.lessonId===21);
      held.release({status:200,payload:{course_id:70,favorite:false}});await ready(page);
      check(await rowLocator(page,70).count()===0&&await page.evaluate(()=>state.courseId===2&&state.lessonId===21&&!state.retained.unconfirmed),
        "C123 global reference removal remains compatible with navigating to another authorized lesson");
      await close(page);
    }
    for(const status of [403,419])for(const operation of ["read","remove"]){
      stage="retained revocation";const {page,control}=await open();
      await page.locator("#retained-favorites-panel summary").click();await read(page);
      if(operation==="read"){control.retained={status,payload:{}};await page.locator("#reload-retained-favorites").click();}
      else{control.write={status,payload:{}};await remove(page,70);}
      await page.waitForFunction(()=>state.accessDenied);
      check(await page.locator("[data-retained-course-id]").count()===0&&await page.locator("#retained-favorites-panel").isHidden()&&
        await page.locator("#retained-favorites-panel").getAttribute("open")===null&&
        (await page.locator("#retained-favorites-status").textContent())===""&&
        await page.locator("#reload-retained-favorites").isDisabled(),
        "C123 "+status+" during "+operation+" purges references, closes management and disables further actions");
      await close(page);
    }
    {
      stage="late retained body after revocation";const {page,control}=await open(),held=heldResponse("revoked retained response");
      let finishLifecycle;
      const lifecycle=new Promise(resolve=>{finishLifecycle=resolve;});
      const target=request=>request.method()==="GET"&&request.url()===api+"/favorites/retained";
      page.on("requestfinished",request=>{if(target(request))finishLifecycle("finished");});
      page.on("requestfailed",request=>{if(target(request))finishLifecycle("failed");});
      // Observe the real in-page cleanup, without reading its payload or
      // replacing the Response. The application still calls it without await.
      // A host-side Response.finished() wait did not settle in this scenario;
      // reader completion/lock release is the actual condition under test.
      await page.evaluate(()=>{
        const original=discardErrorBody;
        window.__retainedCleanup={calls:0,settled:false,bodyUsed:false,locked:true};
        discardErrorBody=function(response){
          const tracked=response.status===200&&new URL(response.url).pathname==="/universidade/private/favorites/retained";
          if(tracked)window.__retainedCleanup.calls++;
          return original(response).finally(()=>{
            if(tracked){window.__retainedCleanup.settled=true;
              window.__retainedCleanup.bodyUsed=response.bodyUsed;
              window.__retainedCleanup.locked=response.body?.locked??true;}
          });
        };
      });
      await page.locator("#retained-favorites-panel summary").click();control.retained=held.response;
      const response=page.waitForResponse(api+"/favorites/retained");
      await page.locator("#reload-retained-favorites").click();await held.wait();control.favorites={status:403,payload:{}};
      await page.evaluate(()=>loadFavorites());await page.waitForFunction(()=>state.accessDenied);
      held.release({status:200,payload:envelope()});const late=await response;
      await page.waitForFunction(()=>window.__retainedCleanup.settled,null,{timeout:8000});
      const terminal=await bounded(lifecycle,"revoked retained request lifecycle");
      await page.waitForLoadState("networkidle");
      const cleanup=await page.evaluate(()=>window.__retainedCleanup);
      check(late.status()===200&&["finished","failed"].includes(terminal)&&
        cleanup.calls===1&&cleanup.settled&&cleanup.bodyUsed&&!cleanup.locked&&
        await page.locator("[data-retained-course-id]").count()===0&&await page.locator("#retained-favorites-panel").isHidden()&&
        await page.evaluate(()=>state.retained.rows.length===0&&!state.retained.unconfirmed)&&control.writes.length===0,
        "C123 a late successful body is released by the actual cleanup and cannot restore private references after revocation");
      console.log("PASS C123 revoked-body lifecycle: "+terminal+"; actual cleanup settled and response reader unlocked.");
      await close(page);
    }
  }catch(error){
    console.error("C123 retained-favorites stage: "+stage+"; "+String(error.message).slice(0,200));throw error;
  }finally{
    for(const release of pending)release();
    await bounded(context.close(),"context cleanup");
  }
};
