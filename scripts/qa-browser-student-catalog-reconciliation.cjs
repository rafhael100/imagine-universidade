"use strict";

// Imported by the guarded synthetic runner only. All HTTP fixtures belong to
// their own page; the student view, completion and reconciliation are real.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
  context.setDefaultTimeout(8000);context.setDefaultNavigationTimeout(15000);
  const api=base+"/universidade/private",holds=new Set(),timestamp="2026-11-17T10:00:00Z";
  const ok=payload=>({status:200,payload});let stage="catalog reconciliation",failed=false;
  async function bounded(promise,label){let timer;try{
    return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("C130 timeout: "+label)),8000);})]);
  }finally{clearTimeout(timer);}}
  const observe=promise=>{promise.catch(()=>{});return promise;};
  const close=page=>bounded(page.close(),"page cleanup");
  const ready=page=>page.waitForFunction(()=>state.libraryReady&&!state.libraryLoading&&state.favoritesReady&&!state.favoritesLoading&&
    !state.readingLoading&&state.readingSnapshot!==null);
  const selected=async(page,course=1,lesson=11)=>{
    await page.locator("#course-list [data-course-id='"+course+"']").click();
    await page.waitForFunction(id=>state.lessonId===id&&document.querySelector("#lesson-content h3")?.textContent==="Aula "+id,lesson);
  };
  const cleared=page=>page.evaluate(()=>state.libraryReady&&!state.accessDenied&&state.courseId===null&&state.lessonId===null&&
    document.querySelectorAll("#lesson-items [data-lesson-id]").length===0&&!!document.querySelector("[data-course-unavailable]")&&
    document.querySelectorAll("#lesson-content h3,#lesson-content .lesson-text,#lesson-content [data-lesson-help],#lesson-content button").length===0&&
    document.getElementById("course-favorite-panel").hidden&&document.getElementById("contextual-courses-panel").hidden);
  const refresh=async page=>{await page.evaluate(()=>loadLibrary());await ready(page);};
  const finishCompletion=async page=>{
    const before=await page.evaluate(()=>state.progressHistory.request);await page.locator("#lesson-content button.primary").click();
    await page.waitForFunction(previous=>state.progressHistory.request>=previous+2||state.accessDenied,before);
  };
  async function open(){
    const page=await context.newPage();await ensureLocalPage(page);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    const fixture={courses:[1,2].map(id=>({id,slug:"curso-"+id,title:"Curso "+id,summary:"Resumo",category:id===1?"metodologia":"negocios"})),
      lessons:[11,12,21].map(id=>({id,slug:"aula-"+id,title:"Aula "+id,sort_order:id%10,course_id:id===21?2:1,course_version:2,
        body:"Introdução autorizada "+id+".\n\nEXEMPLO FICTÍCIO\nExemplo literal.\n\nOutro parágrafo.\n\nAPLICAÇÃO OPCIONAL\nPrática opcional."})),
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
      const {page,fixture,control,remove}=await open();const position=JSON.stringify(fixture.position);remove();await refresh(page);
      check(await cleared(page)&&JSON.stringify(fixture.favorites)==="[1,2]"&&JSON.stringify(fixture.position)===position&&
        control.writes.length===0&&await page.evaluate(()=>state.readingSnapshot.status==="unavailable"&&
          !document.getElementById("export-progress").disabled&&!document.getElementById("export-favorites").disabled),
        "C130 a valid catalog omission clears the selected reader while retaining global authority and private references");
      const before=control.requests.length;await selected(page,2,21);
      check(await page.locator("#lesson-content h3").innerText()==="Aula 21"&&control.requests.slice(before).length===3&&
        control.requests.slice(before).every(request=>request.method==="GET")&&control.writes.length===0,
        "C130 the student can explicitly select another authorized course after the reader is cleared");await close(page);
    }
    {
      stage="confirmed completion then omission";const {page,fixture,control,remove}=await open();
      const old=await page.locator("#lesson-content button.primary").elementHandle(),position=JSON.stringify(fixture.position);
      remove();await finishCompletion(page);
      check(await cleared(page)&&(await page.locator("#status").innerText()).includes("Seu progresso foi registrado")&&
        fixture.completed.has(11)&&control.writes.length===1&&control.writes[0].path==="/lessons/11/complete"&&
        JSON.stringify(fixture.position)===position&&JSON.stringify(fixture.favorites)==="[1,2]",
        "C130 confirmed completion stays confirmed when its follow-up catalog removes the course");
      const requests=control.requests.length;await page.evaluate(node=>node.click(),old);
      check(control.requests.length===requests&&control.writes.length===1,
        "C130 the removed confirmed completion control cannot replay its POST");
      check(control.requests.every(request=>request.path!=="/progress/history"),
        "C130 clearing the reader never automatically queries or synthesizes completion history");
      await page.locator("#progress-history-panel summary").click();await page.locator("#reload-progress-history").click();
      await page.waitForFunction(()=>state.progressHistory.ready&&!state.progressHistory.loading);
      check(await page.locator("#progress-history-list [data-completion-id]").count()===2&&
        (await page.locator("#progress-history-list [data-completion-id='200']").innerText()).includes("indisponível"),
        "C130 the retained confirmed completion remains available through an explicit historical query");await old.dispose();await close(page);
    }
    {
      stage="valid empty catalog";const {page,fixture,control}=await open();fixture.courses=[];await refresh(page);
      check(await cleared(page)&&await page.evaluate(()=>state.courses.length===0&&
        document.getElementById("resume-course").disabled&&!document.getElementById("export-reading-position").disabled&&
        !document.getElementById("progress-history-panel").hidden)&&control.writes.length===0&&fixture.favorites.length===2,
        "C130 an empty valid catalog clears the reader without locking personal history or export capabilities");await close(page);
    }
    {
      stage="present course keeps the reader";const {page,control}=await open();
      await page.locator("#lesson-help-question").fill("Pergunta ainda não enviada");
      await page.evaluate(()=>{window.__readerBefore={body:document.querySelector(".lesson-text"),help:document.querySelector("[data-lesson-help]"),
        courseRequest:state.courseRequest,lessonRequest:state.lessonRequest,active:document.activeElement};});
      await refresh(page);
      check(await page.evaluate(()=>window.__readerBefore.body===document.querySelector(".lesson-text")&&
        window.__readerBefore.help===document.querySelector("[data-lesson-help]")&&window.__readerBefore.courseRequest===state.courseRequest&&
        window.__readerBefore.lessonRequest===state.lessonRequest&&window.__readerBefore.active===document.activeElement)&&
        await page.locator("#lesson-help-question").inputValue()==="Pergunta ainda não enviada"&&control.writes.length===0,
        "C130 a course that remains present keeps its exact DOM, unsent question, selection generations and focus");
      await finishCompletion(page);
      check(await page.evaluate(()=>window.__readerBefore.body===document.querySelector(".lesson-text")&&
        window.__readerBefore.courseRequest===state.courseRequest&&window.__readerBefore.lessonRequest===state.lessonRequest)&&
        await page.locator("#lesson-content button.primary").isDisabled()&&control.writes.length===1,
        "C130 a progress-only catalog update preserves the current reader and its generations");await close(page);
    }
    {
      stage="metadata is not lesson withdrawal";const {page,control,catalog}=await open();
      control.overrides.set("/courses",ok({courses:catalog().map(course=>course.id===1?{...course,title:"Título novo",lessons_total:0,lessons_completed:0}:course)}));
      await refresh(page);
      check(await page.evaluate(()=>state.courseId===1&&state.lessonId===11)&&await page.locator("#lesson-content h3").innerText()==="Aula 11"&&
        await page.locator("[data-course-unavailable]").count()===0,
        "C130 changed title or aggregate lesson counts do not imply a withdrawn version or substitute another lesson");await close(page);
    }
    {
      stage="local filter rendering";const {page,control}=await open();
      await page.evaluate(()=>{state.query="sem correspondência";state.filter="negocios";state.favoritesOnly=true;renderCourses();});
      check(await page.evaluate(()=>state.courseId===1&&state.lessonId===11)&&await page.locator("#lesson-content h3").innerText()==="Aula 11"&&
        await page.locator("#course-list [data-course-id]").count()===0&&control.writes.length===0,
        "C130 rendering a filtered subset does not mistake a hidden present course for catalog absence");await close(page);
    }
    for(const response of [{status:503,payload:{}},ok({courses:[{id:2}]})]){
      stage="unusable completion catalog";const {page,control}=await open();control.overrides.set("/courses",response);await finishCompletion(page);
      check(await page.locator("#lesson-content h3").innerText()==="Aula 11"&&await page.locator("#lesson-content button.primary").isDisabled()&&
        await page.locator("[data-course-unavailable]").count()===0&&(await page.locator("#status").innerText()).includes("Aula concluída")&&
        control.writes.length===1,"C130 an unusable completion catalog preserves confirmed progress without inventing absence: "+response.status);await close(page);
    }
    for(const path of ["/lessons/11","/courses/1/lessons"]){
      stage="old read after omission "+path;const {page,hold,remove,control}=await open(),held=hold(path);
      const operation=observe(page.evaluate(isCourse=>isCourse?selectCourse(1):selectLesson(11),path.includes("courses")));
      await held.seen();remove();await refresh(page);held.release();await bounded(operation,"old read settlement");
      check(await cleared(page)&&control.writes.length===0,
        "C130 a delayed old read cannot restore the course removed by a newly valid catalog: "+path);await close(page);
    }
    {
      stage="old tutor answer after omission";const {page,hold,remove,control}=await open();
      const held=hold("/lessons/11/tutor",ok({reply:"Resposta antiga",source:{lesson_slug:"aula-11",course_version:2}}));
      await page.locator("#lesson-help-question").fill("Como revisar este exemplo?");await page.locator("#lesson-help-submit").click();
      await held.seen();remove();await refresh(page);held.release();await page.waitForLoadState("networkidle",{timeout:8000});
      check(await cleared(page)&&!(await page.locator("#lesson-content").innerText()).includes("Resposta antiga")&&
        control.requests.filter(request=>request.path.endsWith("/tutor")).length===1,
        "C130 an old tutor answer cannot rebuild help after its selected course leaves the catalog");await close(page);
    }
    for(const sameCourse of [false,true]){
      stage="new selection before completion catalog";const {page,hold}=await open(),held=hold("/courses",ok({courses:[]}));
      await page.locator("#lesson-content button.primary").click();await held.seen();
      if(sameCourse){await page.locator("#lesson-items [data-lesson-id='12']").click();await page.waitForFunction(()=>state.lessonId===12&&document.querySelector("#lesson-content h3"));}
      else await selected(page,2,21);
      const expected=await page.evaluate(()=>({course:state.courseId,lesson:state.lessonId,courseRequest:state.courseRequest,
        lessonRequest:state.lessonRequest,historyRequest:state.progressHistory.request}));held.release();
      await page.waitForFunction(previous=>state.progressHistory.request>previous,expected.historyRequest);
      check(await page.evaluate(previous=>state.courseId===previous.course&&state.lessonId===previous.lesson&&
        state.courseRequest===previous.courseRequest&&state.lessonRequest===previous.lessonRequest&&state.courses.length===2,expected)&&
        await page.locator("[data-course-unavailable]").count()===0,
        "C130 an older completion catalog cannot erase the newer current selection: "+(sameCourse?"lesson":"course"));await close(page);
    }
    {
      stage="uncertain completion after omission";const {page,hold,remove,control}=await open(),held=hold("/lessons/11/complete",{status:503,payload:{}});
      await page.locator("#lesson-content button.primary").click();await held.seen();remove();await refresh(page);
      const requests=control.requests.length,generation=await page.evaluate(()=>state.progressHistory.request);held.release();
      await page.waitForFunction(previous=>state.progressHistory.request>previous,generation);await page.waitForLoadState("networkidle",{timeout:8000});
      check(await cleared(page)&&control.requests.length===requests&&control.writes.length===1,
        "C130 a late uncertain completion does not replay or reconcile against the cleared old selection");await close(page);
    }
    for(const status of [403,419]){
      stage="catalog revocation";const {page,control}=await open();control.overrides.set("/courses",{status,payload:{}});await finishCompletion(page);
      check(await page.evaluate(()=>state.accessDenied&&!state.libraryReady&&state.readingSnapshot===null&&state.courses.length===0)&&
        await page.locator("[data-course-unavailable]").count()===0&&await page.locator("#lesson-content h3").count()===0&&
        await page.locator("#export-progress").isDisabled(),
        "C130 HTTP "+status+" still purges and locks the whole session rather than reporting a single removed course");await close(page);
    }
    {
      stage="republished catalog stays explicit";const {page,fixture,control,remove}=await open(),course=fixture.courses[0];remove();await refresh(page);
      const reads=control.requests.filter(request=>request.path.includes("/lessons")).length;fixture.courses.unshift(course);
      fixture.lessons=fixture.lessons.filter(lesson=>lesson.course_id!==1);fixture.lessons.push({id:13,slug:"aula-13",title:"Aula 13",sort_order:0,
        course_id:1,course_version:3,body:"Material autorizado da nova versão."});await refresh(page);
      check(await page.evaluate(()=>state.courseId===null&&state.lessonId===null)&&await page.locator("#lesson-content h3").count()===0&&
        control.requests.filter(request=>request.path.includes("/lessons")).length===reads,
        "C130 a later republication does not automatically restore or remap the cleared lesson");
      await selected(page,1,13);
      check(await page.locator("#lesson-content h3").innerText()==="Aula 13"&&control.writes.length===0&&fixture.position.lesson_id===12,
        "C130 reopening after republication requires an explicit fresh selection and leaves the saved reference untouched");await close(page);
    }
  }catch(error){
    failed=true;console.error("C130 catalog-reconciliation stage: "+stage+"; "+String(error.message).slice(0,200));throw error;
  }finally{
    for(const held of holds)held.release();
    try{await bounded(context.close(),"context cleanup");}catch(error){if(!failed)throw error;}
  }
};
