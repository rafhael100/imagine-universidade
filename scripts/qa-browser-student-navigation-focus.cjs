"use strict";

// Called only by the guarded synthetic runner. Every page owns its HTTP
// fixture; browser focus and keyboard events exercise the actual view.
// Importing this module never starts a browser or operational service.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
  context.setDefaultTimeout(8000);context.setDefaultNavigationTimeout(15000);
  const api=base+"/universidade/private",holds=[];
  let stage="initial focus",failed=false;
  const ok=payload=>({status:200,payload});
  const none=()=>({schema_version:1,scope:"current_authenticated_student",status:"none",revision:"initial-ticket",position:null});
  const saved=(version=1)=>({...none(),status:"available",revision:"saved-revision",
    position:{course_id:1,course_version:version,lesson_id:12,saved_at:"2026-11-17T10:00:00Z"}});
  async function bounded(promise,label){
    let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error("C127 timeout: "+label)),8000);
    })]);}finally{clearTimeout(timer);}
  }
  const focusCount=page=>page.evaluate(()=>window.__navigationFocusEvents.length);
  const focused=page=>page.evaluate(()=>document.activeElement?.id||"");
  const target=async(page,text)=>{
    await page.waitForFunction(expected=>document.getElementById("lesson-navigation-target")?.textContent===expected,text,{polling:100});
  };
  const select=async(page,id,text="Aula "+(id*10+1))=>{
    await page.locator("#course-list [data-course-id='"+id+"']").click();await target(page,text);
  };
  const ready=page=>page.waitForFunction(()=>state.libraryReady&&!state.libraryLoading&&state.favoritesReady&&!state.favoritesLoading&&
    !state.readingLoading&&state.readingSnapshot!==null);
  const search=async page=>{
    await page.locator("#lesson-search-query").fill("texto");await page.locator("#lesson-search-query").press("Enter");
    await page.locator("#lesson-search-results [data-search-lesson='12']").waitFor();
  };
  const close=page=>bounded(page.close(),"page cleanup");
  async function open({position=none()}={}){
    const page=await context.newPage();await ensureLocalPage(page);
    page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(15000);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    await page.addInitScript(()=>{
      window.__navigationFocusEvents=[];
      document.addEventListener("focusin",event=>{
        if(["lesson-navigation-target","reading-position-status"].includes(event.target.id))
          window.__navigationFocusEvents.push(event.target.id);
      });
    });
    const fixture={courses:[{id:1,category:"metodologia"},{id:2,category:"metodologia"},{id:3,category:"negocios"},{id:4,category:"sistemas"}]
      .map(row=>({...row,slug:row.id===3?"trilha-clientes-conquiste-acompanhe":"curso-"+row.id,
        title:"Curso "+row.id,summary:"Resumo autorizado "+row.id})),
      lessons:[11,12,21,31].map(id=>({id,slug:"aula-"+id,title:"Aula "+id,body:"Texto sintético autorizado da aula "+id+".",
        sort_order:id%10,course_id:Math.floor(id/10),course_version:1})),completed:new Set(),favorites:[2],position};
    const control={requests:[],writes:[],overrides:new Map()};
    const catalog=()=>fixture.courses.map(course=>({...course,
      lessons_total:fixture.lessons.filter(lesson=>lesson.course_id===course.id).length,
      lessons_completed:fixture.lessons.filter(lesson=>lesson.course_id===course.id&&fixture.completed.has(lesson.id)).length}));
    const fallback=entry=>{
      const {path,method}=entry;
      if(path==="/initialize")return ok({ready:true});
      if(path==="/courses")return ok({courses:catalog()});
      if(path==="/favorites")return ok({course_ids:fixture.favorites});
      if(path==="/favorites/retained")return ok({schema_version:1,scope:"current_authenticated_student",favorites:[],next_after_course_id:null});
      if(path==="/reading-position"&&method==="GET")return ok(fixture.position);
      if(path==="/search")return ok({results:[{course_id:1,lesson_id:12,course_title:"Curso 1",lesson_title:"Aula 12",snippet:"Texto sintético."}]});
      if(/^\/courses\/\d+\/favorite$/.test(path)){
        const id=Number(path.split("/")[2]),favorite=method==="PUT";
        fixture.favorites=fixture.favorites.filter(value=>value!==id);if(favorite)fixture.favorites.push(id);
        return ok({course_id:id,favorite});
      }
      if(/^\/courses\/\d+\/lessons$/.test(path))return ok({lessons:fixture.lessons.filter(lesson=>lesson.course_id===Number(path.split("/")[2]))
        .map(lesson=>({id:lesson.id,slug:lesson.slug,title:lesson.title,sort_order:lesson.sort_order,completed:fixture.completed.has(lesson.id)?1:0}))});
      if(/^\/lessons\/\d+$/.test(path)){
        const lesson=fixture.lessons.find(row=>row.id===Number(path.split("/")[2]));
        return lesson?ok({lesson}):{status:404,payload:{error:"not_found"}};
      }
      if(path.endsWith("/progress"))return ok({completed:fixture.completed.has(Number(path.split("/")[2]))});
      if(path.endsWith("/complete")){fixture.completed.add(Number(path.split("/")[2]));return ok({completed:true});}
      return {status:404,payload:{error:"not_found"}};
    };
    await page.route(api+"/**",async route=>{
      const request=route.request(),path=new URL(request.url()).pathname.replace("/universidade/private","");
      const entry={path,method:request.method(),request};control.requests.push(entry);
      if(entry.method!=="GET"&&!["/initialize","/search"].includes(path))control.writes.push(entry);
      const override=control.overrides.get(path);
      const result=(typeof override==="function"?await override(entry):override)??fallback(entry);
      await route.fulfill({status:result.status,contentType:"application/json",headers:{"Cache-Control":"private, no-store"},
        body:JSON.stringify(result.payload)});
    });
    const hold=(path,result=null)=>{
      let releaseGate,markSeen,markTerminal,request=null,released=false;
      const gate=new Promise(resolve=>{releaseGate=resolve;}),seen=new Promise(resolve=>{markSeen=resolve;});
      const terminal=new Promise(resolve=>{markTerminal=resolve;});
      const onTerminal=value=>{if(value===request)markTerminal();};
      page.on("requestfinished",onTerminal);page.on("requestfailed",onTerminal);
      control.overrides.set(path,async entry=>{request=entry.request;markSeen();await gate;return result??fallback(entry);});
      const held={seen:()=>bounded(seen,"request "+path),
        release:()=>{if(released)return;released=true;control.overrides.delete(path);releaseGate();},
        terminal:async()=>{try{
          await bounded(terminal,"request terminal "+path);
          await page.waitForLoadState("networkidle",{timeout:8000});
        }finally{held.dispose();}},
        dispose:()=>{page.off("requestfinished",onTerminal);page.off("requestfailed",onTerminal);}};
      holds.push(held);return held;
    };
    await page.goto(base+"/student");await page.bringToFront();await ready(page);
    await page.waitForFunction(()=>document.hasFocus()&&document.visibilityState==="visible");
    return {page,fixture,control,hold};
  }
  try{
    {
      const {page,fixture,control}=await open();
      check(await focusCount(page)===0&&control.requests.every(entry=>!entry.path.includes("/lessons")),
        "C127 authorized initialization has no focus jump or lesson prefetch");
      await page.locator("#course-list [data-course-id='1']").focus();await page.keyboard.press("Enter");await target(page,"Aula 11");
      check(await focused(page)==="lesson-navigation-target"&&await page.locator("#lesson-navigation-target").getAttribute("tabindex")==="-1"&&
        await page.locator("#lesson-navigation-target").evaluate(node=>node.tagName)==="H3",
        "C127 keyboard course activation focuses the authorized lesson heading outside the ordinary Tab sequence");
      await page.locator("#lesson-items [data-lesson-id='12']").click();await target(page,"Aula 12");
      check(await focused(page)==="lesson-navigation-target"&&await page.evaluate(()=>state.lessonId===12),
        "C127 ordinary lesson selection focuses the new lesson without requiring a saved version");
      fixture.completed.add(11);await page.locator("#lesson-items [data-lesson-id='11']").click();await target(page,"Aula 11");
      await page.locator("[data-next-lesson]").focus();await page.keyboard.press("Enter");await target(page,"Aula 12");
      check(await focused(page)==="lesson-navigation-target",
        "C127 activating next lesson replaces its button and leaves focus on the newly loaded heading");
      fixture.completed.add(12);await page.locator("#lesson-items [data-lesson-id='12']").click();await target(page,"Aula 12");
      await page.locator("[data-next-course]").click();await target(page,"Aula 21");
      check(await focused(page)==="lesson-navigation-target"&&await page.evaluate(()=>state.courseId===2),
        "C127 next-course activation focuses the authorized target after its source button is removed");
      await page.locator("#pillar-cards [data-pillar-course='3']").click();await target(page,"Aula 31");
      check(await focused(page)==="lesson-navigation-target"&&await page.evaluate(()=>state.courseId===3),
        "C127 published pillar navigation uses the same explicit focus destination");
      await select(page,1,"Aula 12");await page.locator("[data-contextual-course-id='2']").click();await target(page,"Aula 21");
      check(await focused(page)==="lesson-navigation-target"&&await page.evaluate(()=>state.courseId===2),
        "C127 a contextual suggestion focuses only after fresh authorized course and lesson reads");
      const count=await focusCount(page);await search(page);
      check(await focusCount(page)===count&&await focused(page)==="lesson-search-query",
        "C127 searching alone leaves keyboard focus in the search control and never opens a lesson");
      await page.locator("[data-search-lesson='12']").click();await target(page,"Aula 12");
      check(await focused(page)==="lesson-navigation-target"&&await page.evaluate(()=>state.lessonId===12),
        "C127 an explicit search result focuses its exact authorized lesson");
      await page.locator("#resume-course").click();await target(page,"Aula 12");
      check(await focused(page)==="lesson-navigation-target"&&control.writes.length===0&&
        await page.evaluate(()=>JSON.stringify(state.favoriteIds)==="[2]"&&state.readingSnapshot.status==="none"),
        "C127 pending-course continuation uses focus without writing favorites, position or completion");
      await page.setViewportSize({width:390,height:844});await select(page,2);
      check(await focused(page)==="lesson-navigation-target"&&
        await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),
        "C127 the focus destination also works in the mobile layout without horizontal overflow");
      await close(page);
    }
    for(const path of ["/courses/1/lessons","/lessons/11","/lessons/11/progress"]){
      stage="focus changed during "+path;const {page,hold}=await open(),held=hold(path);
      await page.locator("#course-list [data-course-id='1']").click();await held.seen();
      await page.locator("#lesson-search-query").click();held.release();await held.terminal();await target(page,"Aula 11");
      check(await focused(page)==="lesson-search-query"&&await focusCount(page)===0,
        "C127 a new control interaction prevents late focus after "+path);
      await close(page);
    }
    {
      stage="tab changed while waiting";const {page,hold}=await open(),held=hold("/lessons/11");
      await page.locator("#course-list [data-course-id='1']").click();await held.seen();
      const other=await context.newPage();await ensureLocalPage(other);await other.bringToFront();
      await page.waitForFunction(()=>document.visibilityState!=="visible"||!document.hasFocus(),null,{polling:100});
      held.release();await held.terminal();await target(page,"Aula 11");await page.bringToFront();
      await page.waitForFunction(()=>document.hasFocus()&&document.visibilityState==="visible");
      check(await focusCount(page)===0&&await focused(page)!=="lesson-navigation-target",
        "C127 leaving the tab and returning does not revive the old pending focus intent");
      await close(other);await close(page);
    }
    {
      stage="saved position intent";const {page,control}=await open({position:saved()});
      await page.locator("#resume-reading-position").click();await target(page,"Aula 12");
      check(await focused(page)==="lesson-navigation-target"&&await page.locator("#save-reading-position").getAttribute("data-course-version")==="1"&&
        control.writes.length===0,
        "C127 saved-position return focuses the exact version without mutating the position");
      await close(page);
    }
    {
      stage="focus changed before saved position resolves";const {page,hold}=await open({position:saved()}),held=hold("/reading-position");
      await page.locator("#resume-reading-position").click();await held.seen();await page.locator("#lesson-search-query").click();
      held.release();await held.terminal();await target(page,"Aula 12");
      check(await focused(page)==="lesson-search-query"&&await focusCount(page)===0,
        "C127 saved-position navigation carries its original click intent across the snapshot request");
      await close(page);
    }
    for(const response of [ok(none()),{status:503,payload:{error:"temporarily_unavailable"}}]){
      stage="saved position cannot proceed";const {page,control}=await open({position:saved()});
      control.overrides.set("/reading-position",response);await page.locator("#resume-reading-position").click();
      await page.waitForFunction(()=>!state.readingReturning&&!state.readingLoading&&document.activeElement?.id==="reading-position-status");
      check(await focused(page)==="reading-position-status"&&control.requests.every(entry=>!entry.path.includes("/lessons"))&&
        (await page.locator("#reading-position-status").innerText()).includes(response.status===200?"Sua posição foi atualizada":"Não foi possível consultar"),
        "C127 a changed or failed saved-position return focuses its current explanatory status: "+response.status);
      await close(page);
    }
    {
      stage="exact version retry";const {page,fixture,control}=await open({position:saved(2)});
      await page.locator("#resume-reading-position").click();await target(page,"A aula está temporariamente indisponível.");
      await page.locator(".lesson-detail-retry").click();await target(page,"A aula está temporariamente indisponível.");
      check(await focused(page)==="lesson-navigation-target"&&await page.locator("#lesson-content h3").count()===0,
        "C127 exact-version failure and manual retry retain the original target instead of opening a replacement version");
      fixture.lessons.find(lesson=>lesson.id===12).course_version=2;
      await page.locator(".lesson-detail-retry").click();await target(page,"Aula 12");
      check(await focused(page)==="lesson-navigation-target"&&control.writes.length===0&&
        await page.locator("#save-reading-position").getAttribute("data-course-version")==="2",
        "C127 a new explicit retry focuses the requested version once its authorized reads succeed");
      await close(page);
    }
    {
      stage="empty, error and manual retry";const {page,control,hold}=await open();
      await select(page,4,"Ainda não existem aulas publicadas neste curso.");
      check(await focused(page)==="lesson-navigation-target"&&await page.evaluate(()=>state.lessonId===null),
        "C127 an empty authorized course focuses its honest empty message");
      control.overrides.set("/courses/1/lessons",{status:503,payload:{}});const before=control.requests.length;
      await select(page,1,"As aulas não puderam ser carregadas.");
      check(await focused(page)==="lesson-navigation-target"&&control.requests.length===before+1&&control.writes.length===0,
        "C127 a transient course failure focuses recovery text without automatic retry or writes");
      const held=hold("/courses/1/lessons");await page.locator(".lesson-retry").click();await held.seen();
      const count=await focusCount(page);await page.locator("#lesson-search-query").click();
      held.release();await held.terminal();await target(page,"Aula 11");
      check(await focused(page)==="lesson-search-query"&&await focusCount(page)===count,
        "C127 a retry never recaptures focus after the user chooses another control while waiting");
      control.overrides.set("/lessons/12/progress",ok({completed:"false"}));
      await page.locator("#lesson-items [data-lesson-id='12']").click();await target(page,"A aula está temporariamente indisponível.");
      check(await focused(page)==="lesson-navigation-target"&&await page.locator("#lesson-content h3").count()===0,
        "C127 malformed progress gives a useful error focus destination without rendering partial lesson content");
      await close(page);
    }
    {
      stage="removed search result";const {page,fixture,control}=await open();await search(page);
      fixture.lessons=fixture.lessons.filter(lesson=>lesson.id!==12);
      await page.locator("[data-search-lesson='12']").click();await target(page,"Esta aula não está mais disponível na versão publicada atual.");
      check(await focused(page)==="lesson-navigation-target"&&await page.evaluate(()=>state.lessonId===null)&&
        control.requests.every(entry=>!/^\/lessons\//.test(entry.path)),
        "C127 a removed exact search target focuses unavailable text without substituting another lesson");
      await close(page);
    }
    {
      stage="latest course owns focus";const {page,hold}=await open(),held=hold("/courses/1/lessons");
      await page.locator("#course-list [data-course-id='1']").click();await held.seen();await select(page,2);
      const count=await focusCount(page);held.release();await held.terminal();
      check(await focused(page)==="lesson-navigation-target"&&await focusCount(page)===count&&
        (await page.locator("#lesson-navigation-target").innerText())==="Aula 21",
        "C127 an older course response cannot supersede the latest heading or focus");
      await close(page);
    }
    {
      stage="latest lesson owns focus";const {page,hold}=await open();await select(page,1);const held=hold("/lessons/11");
      await page.locator("#lesson-items [data-lesson-id='11']").click();await held.seen();
      await page.locator("#lesson-items [data-lesson-id='12']").click();await target(page,"Aula 12");const count=await focusCount(page);
      held.release();await held.terminal();
      check(await focused(page)==="lesson-navigation-target"&&await focusCount(page)===count&&
        (await page.locator("#lesson-navigation-target").innerText())==="Aula 12",
        "C127 an older lesson response cannot restore its heading or move focus after a newer choice");
      await close(page);
    }
    for(const nextCourse of [false,true]){
      stage="stale sequence button";const {page,fixture,control}=await open();fixture.completed.add(11);if(nextCourse)fixture.completed.add(12);
      await select(page,1,"Aula 12");if(!nextCourse){await page.locator("#lesson-items [data-lesson-id='11']").click();await target(page,"Aula 11");}
      const old=await page.locator(nextCourse?"[data-next-course]":"[data-next-lesson]").elementHandle();
      await select(page,1,"Aula 12");if(!nextCourse){await page.locator("#lesson-items [data-lesson-id='11']").click();await target(page,"Aula 11");}
      const count=await focusCount(page),requests=control.requests.length;
      await page.evaluate(node=>node.click(),old);
      await page.waitForLoadState("networkidle",{timeout:8000});
      check(await focusCount(page)===count&&control.requests.length===requests&&await page.evaluate(()=>state.courseId===1),
        "C127 a detached sequence button cannot create a new navigation intent: "+(nextCourse?"course":"lesson"));
      await old.dispose();await close(page);
    }
    {
      stage="replaced search button";const {page,control}=await open();await search(page);
      const old=await page.locator("[data-search-lesson='12']").elementHandle();await search(page);await select(page,2);
      const count=await focusCount(page),requests=control.requests.length;await page.evaluate(node=>node.click(),old);
      await page.waitForLoadState("networkidle",{timeout:8000});
      check(await focusCount(page)===count&&control.requests.length===requests&&await page.evaluate(()=>state.courseId===2),
        "C127 a result from a replaced search cannot navigate or focus after the current selection");
      await old.dispose();await close(page);
    }
    {
      stage="search result removed by invalid query";const {page,control}=await open();await search(page);
      const old=await page.locator("[data-search-lesson='12']").elementHandle();
      await page.locator("#lesson-search-query").fill("x");await page.locator("#lesson-search-query").press("Enter");
      await page.waitForFunction(()=>document.getElementById("lesson-search-results").textContent.includes("Informe de 3 a 60"));
      await select(page,2);const count=await focusCount(page),requests=control.requests.length;
      await page.evaluate(node=>node.click(),old);await page.waitForLoadState("networkidle",{timeout:8000});
      check(await focusCount(page)===count&&control.requests.length===requests&&await page.evaluate(()=>state.courseId===2),
        "C127 an invalid query removes the former search button without leaving its handler able to navigate or focus");
      await old.dispose();await close(page);
    }
    {
      stage="passive refresh and explicit personal writes";const {page,fixture}=await open();await select(page,1);
      await page.locator(".skip-link").focus();const count=await focusCount(page);
      await page.evaluate(()=>loadLibrary());await ready(page);
      await page.evaluate(()=>Promise.all([loadFavorites(),loadRetainedFavorites(),loadReadingPosition()]));
      check(await focusCount(page)===count&&await page.locator(".skip-link").evaluate(node=>document.activeElement===node),
        "C127 passive library and private-reference refreshes do not move focus to lesson content");
      await page.locator("#lesson-content button.primary").click();await page.waitForFunction(()=>
        document.querySelector("#lesson-content button.primary")?.textContent==="✓ Aula concluída"&&state.courses.find(course=>course.id===1)?.lessons_completed===1);
      check(await focusCount(page)===count&&fixture.completed.has(11),
        "C127 confirmed completion and its catalog refresh never refocus the lesson heading");
      await page.locator("#course-favorite-toggle").click();await page.waitForFunction(()=>!state.favoriteWriting&&state.favoriteIds.includes(1));
      check(await focusCount(page)===count&&await page.evaluate(()=>state.lessonId===11),
        "C127 favorite writes leave navigation and lesson focus untouched");
      await close(page);
    }
    for(const code of [403,419]){
      stage="revocation with delayed body "+code;const {page,hold,control}=await open(),held=hold("/lessons/11");
      await page.locator("#course-list [data-course-id='1']").click();await held.seen();
      control.overrides.set("/favorites",{status:code,payload:{error:"access_denied"}});await page.evaluate(()=>loadFavorites());
      await page.waitForFunction(()=>state.accessDenied);held.release();await held.terminal();
      check(await focusCount(page)===0&&await page.locator("#lesson-navigation-target").count()===0&&
        await page.locator("#lesson-content h3").count()===0&&await page.evaluate(()=>state.courses.length===0&&state.courseId===null),
        "C127 late lesson responses after HTTP "+code+" cannot restore private content or focus");
      await close(page);
    }
  }catch(error){
    failed=true;console.error("C127 navigation focus failed at "+stage+": "+String(error.message).slice(0,300));throw error;
  }finally{
    for(const held of holds)held.release();
    try{await bounded(context.close(),"context cleanup");}
    catch(error){if(!failed)throw error;console.error("C127 context cleanup exceeded its bound after the reported failure");}
    finally{for(const held of holds)held.dispose();}
  }
};
