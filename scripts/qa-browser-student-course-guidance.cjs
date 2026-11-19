"use strict";

// Imported only by the guarded synthetic runner. The production view is real;
// each page owns its HTTP fixtures and contacts no operational data source.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
  const api=base+"/universidade/private",holds=new Set(),timestamp="2026-11-18T10:00:00Z";
  const ok=payload=>({status:200,payload});let stage="course guidance",failed=false;
  async function bounded(promise,label){let timer;try{
    return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("C144 timeout: "+label)),8000);})]);
  }finally{clearTimeout(timer);}}
  const observe=promise=>{promise.catch(()=>{});return promise;};
  const close=page=>bounded(page.close(),"page cleanup");
  const ready=page=>page.waitForFunction(()=>state.libraryReady&&!state.libraryLoading&&state.favoritesReady&&!state.favoritesLoading&&
    !state.readingLoading&&state.readingSnapshot!==null);
  const cleared=page=>page.evaluate(()=>document.getElementById("course-guidance").hidden&&
    ["audience","knowledge"].every(name=>document.getElementById("course-guidance-"+name).textContent===""&&
      document.getElementById("course-guidance-"+name+"-group").hidden));
  const selected=async(page,course=1,lesson=11)=>{
    await page.locator("#course-list [data-course-id='"+course+"']").click();
    await page.waitForFunction(id=>state.lessonId===id&&document.querySelector("#lesson-content h3")?.textContent==="Aula "+id,lesson);
  };
  const refresh=async page=>{await page.evaluate(()=>loadLibrary());await ready(page);};
  const refs=page=>page.evaluate(()=>{
    window.__c144Reader={body:document.querySelector("#lesson-content .lesson-text"),help:document.querySelector("[data-lesson-help]"),
      heading:document.querySelector("#lesson-content h3"),courseId:state.courseId,lessonId:state.lessonId,
      courseRequest:state.courseRequest,lessonRequest:state.lessonRequest,focus:document.activeElement};
  });
  const sameReader=page=>page.evaluate(()=>{
    const before=window.__c144Reader;
    return before.body===document.querySelector("#lesson-content .lesson-text")&&before.help===document.querySelector("[data-lesson-help]")&&
      before.heading===document.querySelector("#lesson-content h3")&&before.courseId===state.courseId&&before.lessonId===state.lessonId&&
      before.courseRequest===state.courseRequest&&before.lessonRequest===state.lessonRequest&&before.focus===document.activeElement;
  });
  async function open({guidance={
    audience:"Pessoas interessadas em revisar o tema.\n<img src=x onerror=alert(1)> 😀",
    suggested_knowledge:"Experiências do dia a dia.\n\n**Texto literal**\n<script>apenas texto</script>"
  }}={}){
    const page=await context.newPage();await ensureLocalPage(page);
    page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(15000);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    const fixture={courses:[
      {id:1,slug:"curso-1",title:"Curso 1",summary:"Resumo",category:"metodologia",...guidance},
      {id:2,slug:"curso-2",title:"Curso 2",summary:"Resumo",category:"negocios"}],
      lessons:[11,12,21].map(id=>({id,slug:"aula-"+id,title:"Aula "+id,sort_order:id%10,course_id:id===21?2:1,course_version:2,
        body:"Introdução autorizada "+id+".\n\nEXEMPLO FICTÍCIO\nExemplo literal.\n\nAPLICAÇÃO OPCIONAL\nPrática opcional."})),
      completed:new Set(),favorites:[1,2],position:{course_id:1,course_version:2,lesson_id:12,saved_at:timestamp}};
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
      if(/^\/courses\/\d+\/lessons$/.test(path))return ok({lessons:fixture.lessons.filter(lesson=>lesson.course_id===Number(path.split("/")[2]))
        .map(lesson=>({id:lesson.id,slug:lesson.slug,title:lesson.title,sort_order:lesson.sort_order,completed:fixture.completed.has(lesson.id)?1:0}))});
      if(/^\/lessons\/\d+$/.test(path))return ok({lesson:fixture.lessons.find(lesson=>lesson.id===Number(path.split("/")[2]))});
      if(path.endsWith("/progress"))return ok({completed:fixture.completed.has(Number(path.split("/")[2]))});
      if(path.endsWith("/complete")&&method==="POST"){
        fixture.completed.add(Number(path.split("/")[2]));return ok({completed:true});
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
    return {page,fixture,control,catalog,hold};
  }
  try{
    {
      const {page,fixture,control}=await open();
      check(await cleared(page)&&await page.evaluate(()=>state.courseId===null)&&control.requests.every(row=>!row.path.includes("/lessons"))&&control.writes.length===0,
        "C144 guidance stays hidden before an explicit course selection without extra requests");
      const start=control.requests.length;await selected(page);
      check(await page.evaluate(expected=>!document.getElementById("course-guidance").hidden&&
        document.getElementById("course-guidance-audience").textContent===expected.audience&&
        document.getElementById("course-guidance-knowledge").textContent===expected.suggested_knowledge&&
        document.querySelectorAll("#course-guidance-audience *,#course-guidance-knowledge *").length===0&&
        getComputedStyle(document.getElementById("course-guidance-audience")).whiteSpace==="pre-wrap",fixture.courses[0]),
        "C144 optional guidance renders literal text and line breaks without HTML or Markdown interpretation");
      check(await page.evaluate(()=>document.activeElement===document.querySelector("#lesson-content h3")&&
        !document.querySelector("#lesson-content button.primary").disabled)&&
        JSON.stringify(control.requests.slice(start).map(row=>row.method+" "+row.path).sort())===
        JSON.stringify(["GET /courses/1/lessons","GET /lessons/11","GET /lessons/11/progress"]),
        "C144 guidance preserves authorized lesson focus and completion with exactly the existing three course-opening GETs");
      const lessonStart=control.requests.length;await page.locator("#lesson-items [data-lesson-id='12']").click();
      await page.waitForFunction(()=>state.lessonId===12&&document.querySelector("#lesson-content h3")?.textContent==="Aula 12");
      check(await page.locator("#course-guidance-audience").textContent()===fixture.courses[0].audience&&
        JSON.stringify(control.requests.slice(lessonStart).map(row=>row.method+" "+row.path).sort())===JSON.stringify(["GET /lessons/12","GET /lessons/12/progress"]),
        "C144 changing lessons preserves course guidance and introduces no guidance request");
      const filterStart=control.requests.length;await page.locator("#course-lesson-query").fill("Pessoas interessadas");
      check((await page.locator("#course-lesson-filter-status").innerText()).startsWith("Resultados: 0 de 2 aulas.")&&
        await page.locator("#course-guidance-audience").textContent()===fixture.courses[0].audience&&control.requests.length===filterStart,
        "C144 local lesson matching does not search guidance or modify study visibility");
      await close(page);
    }
    {
      stage="refresh and metadata removal";const {page,fixture,control,hold}=await open();await selected(page);
      await page.locator("#course-lesson-query").fill("consulta local");await page.locator("#lesson-help-question").fill("Dúvida ainda não enviada");
      await page.locator("#lesson-help-question").focus();await refs(page);
      const position=JSON.stringify(fixture.position),favorites=JSON.stringify(fixture.favorites);
      fixture.courses[0].audience="Público atualizado\nTexto atual";fixture.courses[0].suggested_knowledge="Orientação atual";
      const gate=hold("/courses"),pending=observe(page.evaluate(()=>loadLibrary()));
      await gate.seen();
      check(await cleared(page)&&await sameReader(page),"C144 a pending catalog refresh clears guidance while retaining the exact reader and focus");
      gate.release();await bounded(pending,"catalog refresh settlement");await ready(page);
      check(await sameReader(page)&&await page.locator("#course-guidance-audience").textContent()===fixture.courses[0].audience&&
        await page.locator("#course-guidance-knowledge").textContent()===fixture.courses[0].suggested_knowledge&&
        await page.locator("#lesson-help-question").inputValue()==="Dúvida ainda não enviada"&&
        await page.locator("#course-lesson-query").inputValue()==="consulta local"&&JSON.stringify(fixture.position)===position&&
        JSON.stringify(fixture.favorites)===favorites&&control.writes.length===0,
        "C144 current guidance updates without replacing the lesson question focus filters or private references");
      delete fixture.courses[0].audience;fixture.courses[0].suggested_knowledge=null;await refresh(page);
      check(await cleared(page)&&await sameReader(page)&&control.writes.length===0,
        "C144 optional fields can disappear on a valid refresh without clearing the reader");
      await close(page);
    }
    {
      stage="course switch and list recovery";const {page,fixture,control,hold}=await open();await selected(page);
      const gate=hold("/courses/2/lessons"),opening=observe(page.evaluate(()=>selectCourse(2)));
      await gate.seen();check(await cleared(page),"C144 switching courses clears old guidance before the new lesson list finishes");
      gate.release();await bounded(opening,"course opening");
      check(await cleared(page)&&await page.locator("#lesson-content h3").innerText()==="Aula 21"&&control.writes.length===0,
        "C144 a legacy course with no optional fields remains fully readable and has no guidance panel");
      control.overrides.set("/courses/1/lessons",{status:503,payload:{}});const start=control.requests.length;
      await page.evaluate(()=>selectCourse(1));
      check(await cleared(page)&&await page.locator(".lesson-retry").isVisible()&&control.requests.length===start+1,
        "C144 a failed current lesson list leaves guidance empty and offers only the existing manual retry");
      control.overrides.delete("/courses/1/lessons");await page.locator(".lesson-retry").click();
      await page.waitForFunction(()=>state.lessonId===11&&document.querySelector("#lesson-content h3")?.textContent==="Aula 11");
      check(await page.locator("#course-guidance-audience").textContent()===fixture.courses[0].audience&&control.writes.length===0,
        "C144 an explicit same-course retry restores current guidance and the authorized lesson");await close(page);
    }
    {
      stage="Unicode boundaries and optional emptiness";const {page,fixture,control}=await open({guidance:{audience:"😀".repeat(500),suggested_knowledge:"😀".repeat(500)}});
      await selected(page);await page.setViewportSize({width:390,height:844});
      check(await page.evaluate(()=>["audience","knowledge"].every(name=>Array.from(document.getElementById("course-guidance-"+name).textContent).length===500)&&
        document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),
        "C144 both 500-code-point Unicode fields remain complete and wrap at a 390px viewport");
      fixture.courses[0].audience="😀".repeat(501);await page.evaluate(()=>loadLibrary());
      check(await cleared(page)&&await page.evaluate(()=>!state.libraryReady&&state.courseId===null)&&await page.locator("#library-recovery").isVisible(),
        "C144 an overlong field rejects the catalog and clears previous guidance without a partial reader");
      fixture.courses[0].audience=null;fixture.courses[0].suggested_knowledge=" \n\t ";await page.locator("#retry-library").click();await ready(page);await selected(page);
      check(await cleared(page)&&await page.locator("#lesson-content h3").innerText()==="Aula 11"&&control.writes.length===0,
        "C144 manual recovery accepts null and blank guidance without imposing an academic requirement");await close(page);
    }
    {
      stage="completion and catalog withdrawal";const {page,fixture,control}=await open();await selected(page);
      fixture.courses[0].audience="Orientação atual após a consulta do catálogo";
      const body=await page.locator("#lesson-content .lesson-text").elementHandle(),history=await page.evaluate(()=>state.progressHistory.request);
      await page.locator("#lesson-content button.primary").click();await page.waitForFunction(before=>state.progressHistory.request>=before+2,history);
      check(await page.evaluate(node=>node===document.querySelector("#lesson-content .lesson-text"),body)&&
        await page.locator("#course-guidance-audience").textContent()===fixture.courses[0].audience&&fixture.completed.has(11)&&
        control.writes.length===1&&control.writes[0].path==="/lessons/11/complete",
        "C144 confirmed completion keeps its single POST and reader while applying newly validated guidance");
      fixture.courses=fixture.courses.filter(course=>course.id!==1);await refresh(page);
      check(await cleared(page)&&await page.evaluate(()=>state.courseId===null&&!state.accessDenied&&state.libraryReady&&
        state.readingSnapshot.status==="unavailable")&&await page.locator("[data-course-unavailable]").isVisible()&&
        fixture.completed.has(11)&&JSON.stringify(fixture.favorites)==="[1,2]"&&control.writes.length===1,
        "C144 catalog withdrawal removes guidance and reader while preserving confirmed progress and private references");
      await body.dispose();await close(page);
    }
    for(const code of [403,419]){
      stage="access denial "+code;const {page,control}=await open();await selected(page);
      control.overrides.set("/favorites",{status:code,payload:{}});await page.evaluate(()=>loadFavorites());
      check(await cleared(page)&&await page.evaluate(()=>state.accessDenied&&state.courses.length===0)&&
        await page.locator("#lesson-content h3").count()===0&&control.writes.length===0,
        "C144 "+code+" purges guidance with the reader and all current course data");await close(page);
    }
    {
      stage="late catalog after revocation";const {page,control,hold}=await open();await selected(page);
      const gate=hold("/courses"),pending=observe(page.evaluate(()=>loadLibrary()));await gate.seen();
      control.overrides.set("/favorites",{status:403,payload:{}});await page.evaluate(()=>api("/favorites").catch(()=>{}));
      gate.release();await bounded(pending,"revoked catalog settlement");
      check(await cleared(page)&&await page.evaluate(()=>state.accessDenied&&state.courses.length===0&&state.courseId===null)&&control.writes.length===0,
        "C144 a late catalog cannot restore guidance after access revocation");await close(page);
    }
  }catch(error){failed=true;throw new Error("C144 "+stage+": "+error.message,{cause:error});}
  finally{
    for(const held of Array.from(holds))held.release();
    try{await bounded(context.close(),"context cleanup");}catch(error){if(!failed)throw error;}
  }
};
