"use strict";

// Only the guarded runner starts Chromium. Each page owns its editorial
// fixtures; no request below mutates the shared runner or external services.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw new Error("Course context QA requires the synthetic loopback origin");
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:"reduce"});
  context.setDefaultTimeout(8000);context.setDefaultNavigationTimeout(15000);
  const api=base+"/universidade/private/admin";
  const fields=["course-title","course-slug","course-category","course-summary","course-sort",
    "course-audience","course-suggested-knowledge","lesson-title","lesson-slug","lesson-body","lesson-sort"];
  const values=page=>page.evaluate(ids=>ids.map(id=>document.getElementById(id).value),fields);
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),ok=payload=>({status:200,payload});
  let stage="optional editorial fields";
  async function bounded(promise,label){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new Error("C144 editor timeout: "+label)),8000);
  })]);}finally{clearTimeout(timer);}}
  const close=page=>bounded(page.close(),"page cleanup");
  const saved=page=>page.waitForFunction(()=>!state.writePending&&!state.writeOutcomeUnknown&&
    document.getElementById("status").textContent==="Rascunho salvo.");
  const frozen=page=>page.waitForFunction(()=>state.writeOutcomeUnknown&&!state.writePending);
  async function open({legacy=false}={}){
    const page=await context.newPage();await ensureLocalPage(page);
    page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(15000);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    const server={nextId:3,hash:"a".repeat(64),courses:[1,2].map(id=>({id,slug:"curso-"+id,title:"Curso salvo "+id,
      category:"metodologia",summary:"Resumo salvo "+id,sort_order:0,is_published:false,
      ...(legacy?{}:{audience:"Pessoas que organizam o atendimento.",suggested_knowledge:"Conhecer a rotina pode ajudar."})})),
      lessons:new Map([[1,[11,12].map((id,index)=>({id,slug:"aula-"+id,title:"Aula salva "+id,
        body:"Conteúdo literal e autorizado da aula "+id+".",sort_order:index,status:"draft",is_published:false}))],
        [2,[{id:21,slug:"aula-21",title:"Aula salva 21",body:"Conteúdo do segundo curso.",sort_order:0,status:"draft",is_published:false}]]])};
    const control={requests:[],writes:[],hook:null,accept:false,dialogs:[],dialogCompletion:Promise.resolve()};
    page.on("dialog",dialog=>{control.dialogs.push(dialog.message());control.dialogCompletion=control.accept?dialog.accept():dialog.dismiss();});
    function commit(entry){
      if(entry.path==="/courses"&&entry.method==="POST"){
        const id=server.nextId++;server.courses.push({id,...entry.body,audience:entry.body.audience??null,
          suggested_knowledge:entry.body.suggested_knowledge??null,is_published:false});server.lessons.set(id,[]);
        return {status:201,payload:{id,status:"draft"}};
      }
      const course=entry.path.match(/^\/courses\/(\d+)$/);
      if(course&&entry.method==="PATCH"){
        const row=server.courses.find(item=>item.id===Number(course[1]));
        for(const key of ["title","summary","category","sort_order","audience","suggested_knowledge"])
          if(Object.hasOwn(entry.body,key))row[key]=entry.body[key];
        server.hash="b".repeat(64);return ok({saved:true});
      }
      const lesson=entry.path.match(/^\/lessons\/(\d+)$/);
      if(lesson&&entry.method==="PATCH"){
        for(const rows of server.lessons.values()){
          const row=rows.find(item=>item.id===Number(lesson[1]));if(row)Object.assign(row,entry.body);
        }
        return ok({saved:true});
      }
      if(entry.path==="/courses/1/publish"&&entry.method==="POST"){
        server.courses[0].is_published=true;
        for(const lesson of server.lessons.get(1)){lesson.status="published";lesson.is_published=true;}
        return ok({published:true});
      }
      return {status:404,payload:{error:"fixture_not_found"}};
    }
    await page.route(api+"/**",async route=>{
      const request=route.request(),entry={path:new URL(request.url()).pathname.replace("/universidade/private/admin",""),
        method:request.method(),body:request.postData()?request.postDataJSON():null};
      control.requests.push(entry);if(entry.method!=="GET")control.writes.push(entry);
      let result=control.hook?await control.hook(entry):undefined;
      if(result===undefined){
        if(entry.method!=="GET")result=commit(entry);
        else if(entry.path==="/courses")result=ok({courses:server.courses});
        else if(/^\/courses\/\d+\/lessons$/.test(entry.path))result=ok({lessons:server.lessons.get(Number(entry.path.split("/")[2]))||[]});
        else if(entry.path==="/courses/1/publication-check")result=ok({course_id:1,version:1,lesson_count:2,ready:true,
          issues:[],warnings:[],content_hash:server.hash,advisory_only:true});
        else if(entry.path==="/audit")result=ok({events:[],next_before_id:null});
        else if(entry.path==="/overview")result=ok({schema_version:1,scope:"current_editorial_catalog",
          totals:{courses:2,published_courses:0,draft_courses:2,current_lessons:3,courses_without_lessons:0,courses_without_summary:0},
          categories:[{category:"metodologia",courses:2,published_courses:0,draft_courses:2,current_lessons:3},
            ...["negocios","sistemas"].map(category=>({category,courses:0,published_courses:0,draft_courses:0,current_lessons:0}))]});
        else result={status:404,payload:{error:"fixture_not_found"}};
      }
      await route.fulfill({status:result.status,contentType:"application/json",headers:{"Cache-Control":"private, no-store"},body:JSON.stringify(result.payload)});
    });
    await page.goto(base+"/admin");
    await page.waitForFunction(()=>state.catalogReady&&!state.catalogLoading&&!state.auditLoading&&!state.overviewLoading);
    await page.locator("#course-items [data-course='1']").click();
    await page.waitForFunction(()=>state.course?.id===1&&state.lessonsReady);
    await page.locator("#lesson-items [data-lesson='11']").click();
    await page.waitForFunction(()=>state.lesson?.id===11);
    const confirmClick=async(selector,accept)=>{
      control.accept=accept;await Promise.all([page.waitForEvent("dialog"),page.locator(selector).click()]);
      await bounded(control.dialogCompletion,"dialog response");
    };
    return {page,server,control,commit,confirmClick};
  }
  try{
    {
      const {page,server,control}=await open({legacy:true});
      await page.setViewportSize({width:390,height:844});
      check(await page.getByLabel("Para quem",{exact:true}).inputValue()===""&&
        await page.getByLabel("Conhecimentos úteis",{exact:true}).inputValue()===""&&
        await page.locator("#course-audience").getAttribute("maxlength")===null&&
        await page.locator("#course-suggested-knowledge").getAttribute("maxlength")===null,
        "C144 optional legacy metadata renders as empty labelled fields without a UTF-16 maxlength");
      await page.locator("#new-course").click();
      await page.locator("#course-title").fill("Curso fictício com orientações");
      await page.locator("#course-slug").fill("curso-ficticio-com-orientacoes");
      const before=control.requests.length;
      await page.locator("#course-audience").fill("🧭".repeat(501));await page.locator("#course-save").click();
      await page.waitForFunction(()=>document.getElementById("status").textContent.includes("500 caracteres"));
      check(control.requests.length===before&&control.writes.length===0&&
        await page.locator("#course-audience").inputValue()==="🧭".repeat(501)&&
        await page.locator("#course-audience").evaluate(field=>document.activeElement===field)&&
        await page.evaluate(()=>!state.writePending&&!state.writeOutcomeUnknown),
        "C144 an overlong Unicode field stays intact and focused without HTTP or an uncertain-write fence");
      await page.locator("#course-audience").fill("🧭".repeat(500));
      await page.locator("#course-suggested-knowledge").fill("  Sugestão opcional <script>literal</script>.  ");
      await page.locator("#course-save").click();await saved(page);
      check(control.writes.length===1&&control.writes[0].method==="POST"&&
        control.writes[0].body.audience==="🧭".repeat(500)&&
        control.writes[0].body.suggested_knowledge==="Sugestão opcional <script>literal</script>."&&
        await page.locator("#course-audience").inputValue()==="🧭".repeat(500)&&
        await page.locator("#course-suggested-knowledge").inputValue()==="Sugestão opcional <script>literal</script>."&&
        await page.locator("#course-form script").count()===0&&await page.evaluate(()=>state.course.id===3),
        "C144 creation round-trips all 500 Unicode characters and literal guidance through the existing course flow");
      await page.locator("#course-suggested-knowledge").fill("");await page.locator("#course-save").click();await saved(page);
      const cleared=control.writes[1].body;
      check(cleared.suggested_knowledge===null&&!Object.hasOwn(cleared,"audience")&&
        !Object.hasOwn(cleared,"sort_order")&&server.courses[2].audience==="🧭".repeat(500)&&
        server.courses[2].suggested_knowledge===null&&await page.locator("#course-suggested-knowledge").inputValue()==="",
        "C144 explicit clearing sends null for one field and omits the unchanged guidance and order");
      await page.locator("#course-summary").fill("Resumo alterado sem mexer nas orientações.");
      await page.locator("#course-save").click();await saved(page);
      check(!Object.hasOwn(control.writes[2].body,"audience")&&!Object.hasOwn(control.writes[2].body,"suggested_knowledge")&&
        server.courses[2].audience==="🧭".repeat(500)&&await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),
        "C144 unrelated course editing preserves guidance and the 390px editor remains within the viewport");
      await close(page);
    }
    {
      stage="sibling drafts and publication";const h=await open(),{page,control}=h;
      await page.locator("#check-publication").click();await page.locator("#publication-readiness").waitFor({state:"visible"});
      await page.locator("#course-audience").fill("  Público local ainda não salvo 😀  ");
      await page.locator("#course-suggested-knowledge").fill("  Sugestão local ainda não salva.  ");
      const contextDraft=await values(page),before=control.requests.length;
      await page.locator("#publish").click();
      await page.waitForFunction(()=>document.getElementById("status").textContent.includes("Salve todas as alterações"));
      await h.confirmClick("#course-items [data-course='2']",false);
      check(control.requests.length===before&&control.writes.length===0&&
        await page.locator("#publication-readiness").isHidden()&&same(await values(page),contextDraft)&&
        await page.locator("[data-move-lesson='12'][data-direction='up']").isDisabled()&&
        await page.evaluate(()=>state.course.id===1),
        "C144 guidance edits invalidate preflight, block publication and reorder, and survive cancelled course navigation");
      await page.locator("#lesson-body").fill("  Aula irmã com edição ainda não salva.  ");const buffers=await values(page);
      await page.locator("#course-save").click();
      await page.waitForFunction(()=>document.getElementById("status").textContent.includes("Salve a aula em edição"));
      check(control.writes.length===0&&same(await values(page),buffers),
        "C144 the existing lesson-first guard preserves both new guidance fields and the unsaved lesson");
      await page.locator("#lesson-save").click();
      await page.waitForFunction(()=>!state.writePending&&document.getElementById("status").textContent==="Aula salva em rascunho.");
      check(control.writes.length===1&&control.writes[0].path==="/lessons/11"&&
        same((await values(page)).slice(0,7),buffers.slice(0,7)),
        "C144 saving the sibling lesson leaves all seven course fields literally unchanged");
      await page.locator("#course-save").click();await saved(page);
      await h.confirmClick("#publish",true);await page.waitForFunction(()=>!state.writePending&&state.course?.is_published===true);
      const publication=control.writes.find(entry=>entry.path==="/courses/1/publish");
      check(same(publication.body,{expected_content_hash:"b".repeat(64)})&&
        await page.locator("#course-audience").isDisabled()&&await page.locator("#course-suggested-knowledge").isDisabled()&&
        await page.locator("#course-audience").inputValue()==="Público local ainda não salvo 😀",
        "C144 publication uses the opaque fresh server hash and makes both guidance fields read-only with the published course");
      await close(page);
    }
    {
      stage="uncertain guidance save";const h=await open(),{page,control}=h;
      await page.locator("#course-audience").fill("  Público salvo com resposta perdida.  ");
      await page.locator("#course-suggested-knowledge").fill("  Sugestão guardada com resposta perdida.  ");
      const buffers=await values(page),before=control.requests.length;
      control.hook=entry=>{if(entry.method==="PATCH"){h.commit(entry);return {status:503,payload:{}};}};
      await page.locator("#course-save").click();await frozen(page);
      await h.confirmClick("#retry-catalog",false);
      check(same(await values(page),buffers)&&control.requests.length===before+1&&control.writes.length===1&&
        await page.locator("#course-audience").isDisabled()&&await page.locator("#course-suggested-knowledge").isDisabled(),
        "C144 an uncertain save keeps both literal guidance buffers disabled and cancelled recovery sends no read or replay");
      control.hook=null;await h.confirmClick("#retry-catalog",true);
      await page.waitForFunction(()=>!state.catalogLoading&&!state.writeOutcomeUnknown&&state.catalogReady&&state.lessonsReady);
      check(control.writes.length===1&&await page.locator("#course-audience").isEnabled()&&
        await page.locator("#course-audience").inputValue()==="Público salvo com resposta perdida."&&
        await page.locator("#course-suggested-knowledge").inputValue()==="Sugestão guardada com resposta perdida."&&
        await page.evaluate(()=>state.course.id===1&&state.lesson.id===11),
        "C144 explicit catalogue recovery displays authoritative guidance and restores the same lesson without another write");
      await close(page);
    }
    for(const status of [403,419]){
      stage="guidance revocation "+status;const {page,control}=await open();
      await page.locator("#course-audience").fill("Orientação privada ainda não salva.");
      control.hook=entry=>entry.method==="PATCH"?{status,payload:{}}:undefined;
      await page.locator("#course-save").click();await page.waitForFunction(()=>state.accessDenied&&!state.writePending);
      check((await values(page)).every((value,index)=>fields[index]==="course-category"||value==="")&&
        await page.locator("#course-audience").isDisabled()&&await page.locator("#course-suggested-knowledge").isDisabled()&&
        control.writes.length===1&&await page.locator("#retry-catalog").isHidden(),
        "C144 "+status+" purges guidance with the rest of the editor and prevents recovery under revoked authority");
      await close(page);
    }
  }catch(error){console.error("C144 editor failed at "+stage+": "+String(error?.message||error).slice(0,240));throw error;}
  finally{await bounded(context.close(),"context cleanup");}
};
