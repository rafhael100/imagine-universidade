"use strict";

// Imported by the guarded synthetic runner only. All HTTP fixtures belong to
// their own page; the student view, local filtering, navigation and completion are real.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
  context.setDefaultTimeout(8000);context.setDefaultNavigationTimeout(15000);
  const api=base+"/universidade/private",holds=new Set(),timestamp="2026-11-17T10:00:00Z";
  const ok=payload=>({status:200,payload});let stage="local lesson filter",failed=false;
  async function bounded(promise,label){let timer;try{
    return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("C132 timeout: "+label)),8000);})]);
  }finally{clearTimeout(timer);}}
  const observe=promise=>{promise.catch(()=>{});return promise;};
  const close=page=>bounded(page.close(),"page cleanup");
  const ready=page=>page.waitForFunction(()=>state.libraryReady&&!state.libraryLoading&&state.favoritesReady&&!state.favoritesLoading&&
    !state.readingLoading&&state.readingSnapshot!==null);
  const titles={11:"Introdução à comunicação 😀",12:"Revisão de atendimento",13:"Prática opcional",14:"<b>AÇÃO & confiança</b> 😀",21:"Aula de sistemas"};
  const selected=async(page,course=1,lesson=11)=>{
    await page.locator("#course-list [data-course-id='"+course+"']").click();
    await page.waitForFunction(({id,title})=>state.lessonId===id&&document.querySelector("#lesson-content h3")?.textContent===title,{id:lesson,title:titles[lesson]});
  };
  const visible=page=>page.locator("#lesson-items [data-lesson-id]:visible").evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.lessonId)));
  const query=page=>page.locator("#course-lesson-query");
  const status=page=>page.locator("#course-lesson-filter-status").innerText();
  const cleared=page=>page.evaluate(()=>!state.lessonFilter.ready&&state.lessonFilter.query===""&&state.lessonFilter.courseId===null&&
    document.getElementById("course-lesson-query").value===""&&document.getElementById("course-lesson-query").disabled&&
    document.getElementById("clear-course-lesson-query").disabled&&document.getElementById("course-lesson-filter").hidden&&
    document.getElementById("course-lesson-filter-status").textContent==="");
  const refresh=async page=>{await page.evaluate(()=>loadLibrary());await ready(page);};
  const finishCompletion=async page=>{
    const before=await page.evaluate(()=>state.progressHistory.request);await page.locator("#lesson-content button.primary").click();
    await page.waitForFunction(previous=>state.progressHistory.request>=previous+2||state.accessDenied,before);
  };
  async function open(){
    const page=await context.newPage();await ensureLocalPage(page);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    await page.addInitScript(()=>{
      window.__lessonFilterStorageCalls=0;
      for(const name of ["getItem","setItem","removeItem","clear"]){
        const original=Storage.prototype[name];
        Storage.prototype[name]=function(...args){window.__lessonFilterStorageCalls++;return original.apply(this,args);};
      }
    });
    const fixture={courses:[1,2].map(id=>({id,slug:"curso-"+id,title:"Curso "+id,summary:"Resumo",category:id===1?"metodologia":"negocios"})),
      lessons:[11,12,13,14,21].map(id=>({id,slug:({11:"inicio",12:"rotina-comercial",13:"acao-responsavel",14:"contato",21:"aula-sistemas"})[id],title:titles[id],sort_order:id%10,course_id:id===21?2:1,course_version:2,
        body:"SomenteNoCorpo autorizado "+id+".\n\nEXEMPLO FICTÍCIO\nExemplo literal.\n\nOutro parágrafo.\n\nAPLICAÇÃO OPCIONAL\nPrática opcional."})),
      completed:new Set(),favorites:[1,2],position:{course_id:1,course_version:2,lesson_id:12,saved_at:timestamp},
      history:[{completion_id:100,course_slug:"curso-1",course_version:1,lesson_slug:"aula-antiga",completed_at:timestamp,availability:"unavailable"}]};
    const control={requests:[],writes:[],overrides:new Map()};
    const catalog=()=>fixture.courses.map(course=>({...course,lessons_total:fixture.lessons.filter(lesson=>lesson.course_id===course.id).length,
      lessons_completed:fixture.lessons.filter(lesson=>lesson.course_id===course.id&&fixture.completed.has(lesson.id)).length}));
    const fallback=entry=>{
      const {path,method}=entry;
      if(path==="/initialize")return ok({ready:true});
      if(path==="/courses")return ok({courses:catalog()});
      if(path==="/favorites")return ok({course_ids:fixture.favorites.filter(id=>fixture.courses.some(course=>course.id===id))});
      if(path==="/reading-position")return ok({schema_version:1,scope:"current_authenticated_student",revision:"saved-private-revision",
        status:fixture.courses.some(course=>course.id===fixture.position.course_id)?"available":"unavailable",
        position:fixture.courses.some(course=>course.id===fixture.position.course_id)?fixture.position:null});
      if(path==="/progress/history")return ok({schema_version:1,scope:"current_authenticated_student",next_before_id:null,
        completions:fixture.history.map(row=>({...row,availability:row.course_version===2&&fixture.courses.some(course=>course.slug===row.course_slug)?"available":"unavailable"}))});
      if(/^\/courses\/\d+\/lessons$/.test(path))return ok({lessons:fixture.lessons.filter(lesson=>lesson.course_id===Number(path.split("/")[2]))
        .map(lesson=>({id:lesson.id,slug:lesson.slug,title:lesson.title,sort_order:lesson.sort_order,completed:fixture.completed.has(lesson.id)?1:0}))});
      if(/^\/lessons\/\d+$/.test(path))return ok({lesson:fixture.lessons.find(row=>row.id===Number(path.split("/")[2]))});
      if(path.endsWith("/progress"))return ok({completed:fixture.completed.has(Number(path.split("/")[2]))});
      if(path.endsWith("/complete")&&method==="POST"){
        const id=Number(path.split("/")[2]),lesson=fixture.lessons.find(row=>row.id===id);fixture.completed.add(id);
        fixture.history.unshift({completion_id:200,course_slug:"curso-"+lesson.course_id,course_version:lesson.course_version,
          lesson_slug:lesson.slug,completed_at:timestamp,availability:"available"});return ok({completed:true});
      }
      return {status:404,payload:{error:"not_found"}};
    };
    await page.route(api+"/**",async route=>{
      const request=route.request(),entry={path:new URL(request.url()).pathname.replace("/universidade/private",""),method:request.method()};
      control.requests.push(entry);if(entry.method!=="GET"&&entry.path!=="/initialize")control.writes.push(entry);
      const override=control.overrides.get(entry.path),result=(typeof override==="function"?await override(entry):override)??fallback(entry);
      await route.fulfill({status:result.status,contentType:"application/json",headers:{"Cache-Control":"private, no-store"},body:JSON.stringify(result.payload)});
    });
    const hold=(path,result)=>{
      let release,seen;const gate=new Promise(resolve=>{release=resolve;}),started=new Promise(resolve=>{seen=resolve;});
      const item={seen:()=>bounded(started,"request start "+path),release:()=>{control.overrides.delete(path);release();holds.delete(item);}};
      control.overrides.set(path,async entry=>{seen();await bounded(gate,"held response "+path);return result??fallback(entry);});holds.add(item);return item;
    };
    await page.goto(base+"/student");await page.bringToFront();await ready(page);
    await page.waitForFunction(()=>document.hasFocus()&&document.visibilityState==="visible");await selected(page);
    return {page,fixture,control,catalog,hold,remove:()=>{fixture.courses=fixture.courses.filter(course=>course.id!==1);}};
  }

  try{
    {
      const {page,control}=await open();
      check(await page.locator("label[for='course-lesson-query']").innerText()==="Localizar aula neste curso"&&
        await page.locator("#course-lesson-filter-status").getAttribute("role")==="status"&&
        await status(page)==="Resultados: 4 de 4 aulas."&&await page.locator("#lesson-items [data-lesson-id]").count()===4&&
        await page.locator("#lesson-items b").count()===0,
        "C132 the authorized full list has an explicitly labelled local search, honest count and literal lesson titles");
      await page.locator("#lesson-help-question").fill("Pergunta ainda não enviada");
      const url=page.url(),requests=control.requests.length;
      await page.evaluate(()=>{window.__lessonFilterBefore={body:document.querySelector(".lesson-text"),help:document.querySelector("[data-lesson-help]"),
        rows:Array.from(document.querySelectorAll("#lesson-items [data-lesson-id]")),courseRequest:state.courseRequest,lessonRequest:state.lessonRequest,
        preferences:JSON.stringify({favoriteIds:state.favoriteIds,readingSnapshot:state.readingSnapshot,progressHistory:state.progressHistory,
          contextualCoursesVisible:state.contextualCoursesVisible,filter:state.filter,query:state.query,favoritesOnly:state.favoritesOnly})};});
      for(const [term,ids,count] of [["ReViSaO",[11,12],1],["rotina-comercial",[11,12],1],["ação",[11,13,14],3],["😀",[11,14],2]]){
        await query(page).fill(term);
        check(JSON.stringify(await visible(page))===JSON.stringify(ids)&&(await status(page)).startsWith("Resultados: "+count+" de 4 aulas.")&&
          await page.locator("#lesson-items [data-lesson-id]").count()===4,
          "C132 title/slug matching ignores case and accents while preserving all rows: "+term);
      }
      await query(page).fill("SomenteNoCorpo");
      check(JSON.stringify(await visible(page))==="[11]"&&
        await status(page)==="Resultados: 0 de 4 aulas. A aula aberta continua visível fora dos resultados.",
        "C132 zero local matches keeps the open lesson outside the count and never searches body content");
      check(control.requests.length===requests&&page.url()===url&&await page.evaluate(()=>{
        const before=window.__lessonFilterBefore;
        return before.body===document.querySelector(".lesson-text")&&before.help===document.querySelector("[data-lesson-help]")&&
          before.rows.every((node,index)=>node===document.querySelectorAll("#lesson-items [data-lesson-id]")[index])&&
          before.courseRequest===state.courseRequest&&before.lessonRequest===state.lessonRequest&&
          before.preferences===JSON.stringify({favoriteIds:state.favoriteIds,readingSnapshot:state.readingSnapshot,progressHistory:state.progressHistory,
            contextualCoursesVisible:state.contextualCoursesVisible,filter:state.filter,query:state.query,favoritesOnly:state.favoritesOnly})&&window.__lessonFilterStorageCalls===0;
      })&&await page.locator("#lesson-help-question").inputValue()==="Pergunta ainda não enviada",
        "C132 filtering preserves the reader, preferences, generations, unsent question and URL without HTTP or storage");
      await page.locator("#clear-course-lesson-query").focus();await page.keyboard.press("Enter");
      check(await query(page).inputValue()===""&&await status(page)==="Resultados: 4 de 4 aulas."&&
        await page.evaluate(()=>document.activeElement===document.getElementById("course-lesson-query"))&&control.requests.length===requests,
        "C132 keyboard clearing restores all rows and deliberately returns focus to the field without HTTP");
      await query(page).fill("revisao");await query(page).focus();await page.keyboard.press("Tab");
      const clearFocused=await page.evaluate(()=>document.activeElement===document.getElementById("clear-course-lesson-query"));
      await page.keyboard.press("Tab");const pinFocused=await page.evaluate(()=>document.activeElement?.dataset.lessonId==="11");
      await page.keyboard.press("Tab");
      check(clearFocused&&pinFocused&&await page.evaluate(()=>document.activeElement?.dataset.lessonId==="12")&&
        await page.locator("#lesson-items [data-lesson-id='13']").evaluate(node=>node.hidden&&getComputedStyle(node).display==="none"),
        "C132 native Tab reaches clear, the selected pin and the matching row while hidden rows are absent from layout");
      const beforeOpen=control.requests.length;await page.keyboard.press("Enter");
      await page.waitForFunction(()=>state.lessonId===12&&document.querySelector("#lesson-content h3")?.textContent==="Revisão de atendimento");
      check(await page.evaluate(()=>document.activeElement===document.querySelector("#lesson-content h3"))&&
        JSON.stringify(await visible(page))==="[12]"&&await status(page)==="Resultados: 1 de 4 aulas."&&
        JSON.stringify(control.requests.slice(beforeOpen).map(request=>request.method+" "+request.path).sort())===
          JSON.stringify(["GET /lessons/12","GET /lessons/12/progress"])&&control.writes.length===0,
        "C132 native activation opens the exact matching lesson through C127 without moving a preference or completing it");
      await page.setViewportSize({width:390,height:844});await query(page).fill("sem correspondência");
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&await query(page).isVisible()&&
        await page.locator("#clear-course-lesson-query").isVisible()&&JSON.stringify(await visible(page))==="[12]",
        "C132 the compact local search, count and selected pin remain usable at 390 pixels");
      await page.reload();await ready(page);await selected(page);
      check(await query(page).inputValue()===""&&await status(page)==="Resultados: 4 de 4 aulas."&&
        await page.evaluate(()=>window.__lessonFilterStorageCalls===0),
        "C132 a new page starts with an empty local query and never restores it from browser storage");await close(page);
    }
    {
      stage="hidden complete sequence";const {page,control,fixture}=await open();await query(page).fill("contato");
      check(await page.evaluate(()=>nextPendingLessonId(11)===12)&&await page.locator("#lesson-items [data-lesson-id='12']").isHidden(),
        "C132 the next pending lesson still comes from the complete authorized sequence including hidden rows");
      await finishCompletion(page);const requests=control.requests.length;await page.locator("[data-next-lesson]").click();
      await page.waitForFunction(()=>state.lessonId===12&&document.querySelector("#lesson-content h3")?.textContent==="Revisão de atendimento");
      check(JSON.stringify(await visible(page))==="[12,14]"&&await query(page).inputValue()==="contato"&&
        (await status(page)).startsWith("Resultados: 1 de 4 aulas.")&&control.writes.length===1&&
        control.writes[0].path==="/lessons/11/complete"&&JSON.stringify([...fixture.completed])==="[11]"&&
        JSON.stringify(control.requests.slice(requests).map(request=>request.method+" "+request.path).sort())===
          JSON.stringify(["GET /lessons/12","GET /lessons/12/progress"]),
        "C132 next opens the exact hidden pending ID and moves only the pin, retaining the query and the one explicit completion");await close(page);
    }
    for(const failure of [{status:503,payload:{}},ok({lessons:[{id:11,slug:"inicio",sort_order:1,completed:0}]})]){
      stage="same-course list recovery";const {page,control}=await open();await query(page).fill("revisao");
      control.overrides.set("/courses/1/lessons",failure);await page.locator("#course-list [data-course-id='1']").click();
      await page.locator(".lesson-retry").waitFor();
      check(await page.evaluate(()=>!state.lessonFilter.ready&&state.lessonFilter.query==="revisao")&&
        await page.locator("#lesson-items [data-lesson-id]").count()===0&&await query(page).isDisabled()&&
        await page.locator("#course-lesson-filter-status").textContent()==="",
        "C132 an unavailable or malformed list clears readiness without falsely describing zero results: "+failure.status);
      control.overrides.delete("/courses/1/lessons");await page.locator(".lesson-retry").click();
      await page.waitForFunction(()=>state.lessonFilter.ready&&document.querySelector("#lesson-content h3")?.textContent?.startsWith("Introdução"));
      check(await query(page).inputValue()==="revisao"&&JSON.stringify(await visible(page))==="[11,12]"&&control.writes.length===0,
        "C132 explicit retry of the same course reapplies the saved in-memory query after a valid list: "+failure.status);await close(page);
    }
    {
      stage="valid empty list";const {page,fixture,control}=await open();fixture.lessons=fixture.lessons.filter(lesson=>lesson.course_id!==1);
      await page.locator("#course-list [data-course-id='1']").click();await page.waitForFunction(()=>state.lessonFilter.ready&&state.lessonId===null);
      check(await status(page)==="Resultados: 0 de 0 aulas."&&await page.locator("#course-lesson-filter").isVisible()&&
        (await page.locator("#lesson-content").innerText()).includes("Ainda não existem aulas publicadas")&&control.writes.length===0,
        "C132 a valid empty list is explicitly counted and remains distinct from a failed read");await close(page);
    }
    for(const change of ["category","course search","favorites"]){
      stage="global selection discard";const {page,control}=await open();await query(page).fill("revisao");const requests=control.requests.length;
      if(change==="category")await page.locator("[data-filter='negocios']").click();
      else if(change==="course search")await page.locator("#course-search").fill("Curso 2");
      else await page.locator("#favorites-only").check();
      check(await cleared(page)&&await page.locator("#lesson-items [data-lesson-id]").count()===0&&control.requests.length===requests,
        "C132 discarding the selected course also clears its local query without HTTP: "+change);await close(page);
    }
    {
      stage="catalog refresh with same course";const {page,control,hold}=await open();await query(page).fill("contato");
      await page.evaluate(()=>{window.__filterBody=document.querySelector(".lesson-text");window.__filterCourseRequest=state.courseRequest;});
      const held=hold("/courses"),operation=observe(refresh(page));await held.seen();
      check(await query(page).isDisabled()&&await page.locator("#clear-course-lesson-query").isDisabled()&&
        await query(page).inputValue()==="contato"&&await status(page)==="Verificando a biblioteca...",
        "C132 library reauthorization temporarily disables local controls without discarding the query");
      held.release();await bounded(operation,"present course refresh");
      check(await page.evaluate(()=>window.__filterBody===document.querySelector(".lesson-text")&&window.__filterCourseRequest===state.courseRequest)&&
        await query(page).inputValue()==="contato"&&JSON.stringify(await visible(page))==="[11,14]"&&control.writes.length===0,
        "C132 a validated present course preserves the query, full list and reader through library refresh");await close(page);
    }
    {
      stage="C130 completion removal";const {page,control,fixture,remove}=await open();await query(page).fill("contato");remove();await finishCompletion(page);
      check(await cleared(page)&&await page.locator("#lesson-items [data-lesson-id]").count()===0&&
        await page.locator("[data-course-unavailable]").count()===1&&fixture.completed.has(11)&&
        (await page.locator("#status").innerText()).includes("Seu progresso foi registrado")&&control.writes.length===1,
        "C132 C130 course omission purges query and guards while retaining the already-confirmed completion");await close(page);
    }
    {
      stage="library failure";const {page,control}=await open();await query(page).fill("contato");control.overrides.set("/courses",ok({}));
      await page.evaluate(()=>loadLibrary());await page.locator("#library-recovery").waitFor();
      check(await cleared(page)&&await page.locator("#lesson-items [data-lesson-id]").count()===0&&
        (await page.locator("#overall-progress").innerText()).includes("indisponível")&&control.writes.length===0,
        "C132 a global catalog failure clears local filter data and never presents it as a valid empty course");await close(page);
    }
    {
      stage="detached and hidden controls";const {page,control}=await open();const hidden=await page.locator("#lesson-items [data-lesson-id='12']").elementHandle();
      await query(page).fill("contato");const requests=control.requests.length;await query(page).focus();await page.evaluate(node=>node.click(),hidden);
      check(control.requests.length===requests&&await page.evaluate(()=>state.lessonId===11&&document.activeElement===document.getElementById("course-lesson-query")),
        "C132 a programmatic click on a hidden row cannot issue reads or steal focus");
      await selected(page,2,21);const after=control.requests.length;await query(page).focus();await page.evaluate(node=>node.click(),hidden);
      check(await query(page).inputValue()===""&&await status(page)==="Resultados: 1 de 1 aulas."&&control.requests.length===after&&
        await page.evaluate(()=>state.lessonId===21&&document.activeElement===document.getElementById("course-lesson-query")),
        "C132 changing course resets the local query and detached old rows cannot navigate or take focus");await hidden.dispose();await close(page);
    }
    {
      stage="typing during pending lesson";const {page,hold,control}=await open(),held=hold("/lessons/12");
      await page.locator("#lesson-items [data-lesson-id='12']").click();await held.seen();await query(page).fill("contato");held.release();
      await page.waitForFunction(()=>document.querySelector("#lesson-content h3")?.textContent==="Revisão de atendimento");
      check(await page.evaluate(()=>document.activeElement===document.getElementById("course-lesson-query"))&&
        JSON.stringify(await visible(page))==="[12,14]"&&await query(page).inputValue()==="contato"&&control.writes.length===0,
        "C132 typing during an explicit lesson read changes only presentation and cancels delivery of its old focus intent");await close(page);
    }
    {
      stage="old course response";const {page,hold,control}=await open();await query(page).fill("contato");
      const held=hold("/courses/1/lessons"),old=observe(page.evaluate(()=>selectCourse(1)));await held.seen();await selected(page,2,21);
      held.release();await bounded(old,"old list settlement");
      check(await page.evaluate(()=>state.lessonFilter.ready&&state.lessonFilter.courseId===2&&state.lessonFilter.request===state.courseRequest)&&
        await query(page).inputValue()===""&&JSON.stringify(await visible(page))==="[21]"&&control.writes.length===0,
        "C132 a delayed course list cannot replace the newer owner, query, count or visible lesson");await close(page);
    }
    for(const denial of [403,419]){
      stage="revocation";const {page,control}=await open();await query(page).fill("revisao");control.overrides.set("/lessons/12",{status:denial,payload:{}});
      await page.locator("#lesson-items [data-lesson-id='12']").click();await page.waitForFunction(()=>state.accessDenied);
      check(await cleared(page)&&await page.locator("#lesson-items [data-lesson-id]").count()===0&&
        await page.locator("#lesson-content h3").count()===0&&control.writes.length===0,
        "C132 HTTP "+denial+" purges the local query and list along with the revoked reader");await close(page);
    }
  }catch(error){
    failed=true;console.error("C132 local-lesson-filter stage: "+stage+"; "+String(error.message).slice(0,200));throw error;
  }finally{
    for(const held of holds)held.release();
    try{await bounded(context.close(),"context cleanup");}catch(error){if(!failed)throw error;}
  }
};
