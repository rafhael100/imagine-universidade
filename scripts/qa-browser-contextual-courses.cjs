"use strict";

// Loaded only by the guarded synthetic runner. Suggestions use the actual
// view and a private page fixture; no business response reaches the main
// fixture and no browser is started by importing this module.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
  context.setDefaultTimeout(8000);context.setDefaultNavigationTimeout(15000);
  const api=base+"/universidade/private";
  const course=(id,category="metodologia",completed=0,total=1)=>({id,slug:"curso-"+id,title:"Curso "+id,
    category,summary:"Resumo do curso "+id,lessons_total:total,lessons_completed:completed});
  const catalog=()=>[course(10),course(7,"negocios"),course(30,"metodologia",1),course(5,"sistemas"),
    course(2,"metodologia",0,0),course(90),course(6),course(4,"negocios")];
  const lesson=id=>({id:id*10+1,course_id:id,course_version:1,slug:"aula-"+id,title:"Aula do curso "+id,
    body:"Conteúdo autorizado e sintético para o curso "+id+".",sort_order:0});
  let stage="contextual suggestions";
  async function bounded(promise,label){
    let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error("C125 timeout: "+label)),8000);
    })]);}finally{clearTimeout(timer);}
  }
  const ids=page=>page.locator("#contextual-courses-list [data-contextual-course-id]").evaluateAll(
    nodes=>nodes.map(node=>Number(node.dataset.contextualCourseId)));
  const selected=async(page,id)=>{
    await page.locator("#course-list [data-course-id='"+id+"']").click();
    await page.waitForFunction(target=>state.courseId===target&&state.lessonId===target*10+1,id);
    await page.locator("#lesson-content h3").waitFor();
  };
  const close=page=>bounded(page.close(),"page cleanup");
  async function open({select=true,literal=false}={}){
    const page=await context.newPage();await ensureLocalPage(page);
    page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(15000);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    await page.addInitScript(()=>{
      window.__contextualStorageCalls=0;
      for(const name of ["getItem","setItem","removeItem","clear"]){
        const actual=Storage.prototype[name];
        Storage.prototype[name]=function(...args){window.__contextualStorageCalls++;return actual.apply(this,args);};
      }
    });
    const fixture={courses:catalog()};if(literal)fixture.courses.find(course=>course.id===30).title="<script>window.__courseExecuted=true</script>";
    const control={lessons:null,requests:[],writes:[]};
    await page.route(api+"/**",async route=>{
      const request=route.request(),path=new URL(request.url()).pathname.replace("/universidade/private","");
      const entry={path,method:request.method()};control.requests.push(entry);
      if(entry.method!=="GET"&&path!=="/initialize")control.writes.push(entry);
      const send=result=>route.fulfill({status:result.status,contentType:"application/json",
        headers:{"Cache-Control":"private, no-store"},body:JSON.stringify(result.payload)});
      if(path==="/initialize")return send({status:200,payload:{ready:true}});
      if(path==="/courses")return send({status:200,payload:{courses:fixture.courses}});
      if(path==="/favorites")return send({status:200,payload:{course_ids:[6]}});
      if(path==="/reading-position")return send({status:200,payload:{schema_version:1,scope:"current_authenticated_student",
        status:"none",revision:"synthetic-context-ticket",position:null}});
      if(/^\/courses\/\d+\/lessons$/.test(path)){
        const failure=typeof control.lessons==="function"?await control.lessons(entry):control.lessons;
        if(failure)return send(failure);
        const id=Number(path.split("/")[2]),course=fixture.courses.find(row=>row.id===id),item=lesson(id);
        return send({status:200,payload:{lessons:course?.lessons_total
          ?[{id:item.id,slug:item.slug,title:item.title,sort_order:0,completed:course.lessons_completed?1:0}]:[]}});
      }
      if(/^\/lessons\/\d+$/.test(path))return send({status:200,payload:{lesson:lesson(Math.floor(Number(path.split("/")[2])/10))}});
      if(path.endsWith("/progress")){
        const id=Math.floor(Number(path.split("/")[2])/10);
        return send({status:200,payload:{completed:!!fixture.courses.find(course=>course.id===id)?.lessons_completed}});
      }
      return send({status:404,payload:{error:"not_found"}});
    });
    await page.goto(base+"/student");
    await page.waitForFunction(()=>state.libraryReady&&state.favoritesReady&&!state.favoritesLoading&&
      !state.readingLoading&&state.readingSnapshot?.status==="none");
    if(select)await selected(page,10);
    return {page,fixture,control};
  }
  try{
    {
      const {page,control}=await open({select:false});
      check(await page.locator("#contextual-courses-panel").isHidden()&&
        (await ids(page)).length===0&&await page.locator("#contextual-courses-toggle").isDisabled()&&
        control.requests.every(request=>!request.path.includes("/lessons")),
        "C125 an authorized library without a selected course has no suggestions or lesson prefetch");
      await selected(page,10);
      check(JSON.stringify(await ids(page))==="[30,2,90]",
        "C125 suggestions include at most three other courses of exactly the same category in editorial order");
      check((await page.locator("#contextual-courses-status").innerText()).includes("Metodologia, a mesma categoria")&&
        await page.evaluate(()=>Boolean(document.getElementById("lesson-content").compareDocumentPosition(
          document.getElementById("contextual-courses-panel"))&Node.DOCUMENT_POSITION_FOLLOWING)),
        "C125 the category reason is explicit and suggestions appear after the lesson");
      check(await page.locator("#contextual-courses-list progress").count()===0&&
        !(await page.locator("#contextual-courses-list").innerText()).match(/Conclu|favorit|ranking|pontos/i)&&
        (await ids(page)).includes(30)&&(await ids(page)).includes(2),
        "C125 completed and zero-lesson courses retain their editorial position without personal ranking");
      const old=await page.locator("[data-contextual-course-id='30']").elementHandle();
      const count=control.requests.length,before=await page.locator("#lesson-content").innerText();
      const resumeDisabled=await page.locator("#resume-course").isDisabled();
      await page.locator("#contextual-courses-toggle").click();
      check((await ids(page)).length===0&&await page.locator("#contextual-courses-toggle").getAttribute("aria-expanded")==="false"&&
        (await page.locator("#contextual-courses-toggle").innerText()).includes("Mostrar sugestões nesta visita")&&
        control.requests.length===count&&(await page.locator("#lesson-content").innerText())===before,
        "C125 hiding suggestions clears only their rows without requests or changes to the lesson");
      check(await page.locator("#resume-course").isDisabled()===resumeDisabled&&
        await page.evaluate(()=>state.courseId===10&&state.lessonId===101),
        "C125 the pending-lessons continuation remains unchanged when suggestions are hidden");
      await selected(page,7);await page.evaluate(()=>loadLibrary());
      await page.waitForFunction(()=>state.libraryReady&&!state.libraryLoading&&!state.favoritesLoading&&
        !state.readingLoading&&state.readingSnapshot?.status==="none");
      check((await ids(page)).length===0&&await page.evaluate(()=>state.contextualCoursesVisible===false)&&
        (await page.locator("#contextual-courses-toggle").innerText()).includes("Mostrar sugestões"),
        "C125 the hide preference survives course navigation and a library refresh in the same page");
      await page.locator("#contextual-courses-toggle").click();
      check(JSON.stringify(await ids(page))==="[4]"&&
        (await page.locator("#contextual-courses-status").innerText()).includes("Negócios"),
        "C125 showing suggestions again uses the currently selected category");
      const after=control.requests.length;await page.evaluate(node=>node.click(),old);
      check(control.requests.length===after&&await page.evaluate(()=>state.courseId===7),
        "C125 a detached button from an earlier source selection cannot navigate");
      await selected(page,5);
      check((await ids(page)).length===0&&
        (await page.locator("#contextual-courses-status").innerText()).includes("Não há outros cursos de Treinamentos Imagine"),
        "C125 a category without another course shows an honest empty state without a fallback category");
      check(control.writes.length===0&&await page.evaluate(()=>window.__contextualStorageCalls===0&&
        JSON.stringify(state.favoriteIds)==="[6]"&&state.readingSnapshot.status==="none"),
        "C125 suggestions and visit preferences do not write personal state, storage or behavioral events");
      await old.dispose();await close(page);
    }
    {
      stage="fresh navigation from suggestion";const {page,control}=await open();
      const before=control.requests.length;await page.locator("[data-contextual-course-id='30']").click();
      await page.waitForFunction(()=>state.courseId===30&&state.lessonId===301);
      await page.locator("#lesson-content h3").waitFor();
      check(control.requests.slice(before).length===3&&JSON.stringify(control.requests.slice(before).map(request=>request.path).sort())===
        JSON.stringify(["/courses/30/lessons","/lessons/301","/lessons/301/progress"].sort())&&
        control.requests.slice(before).every(request=>request.method==="GET"),
        "C125 an explicit suggestion click uses the existing fresh course, lesson and progress authorization flow");
      check(control.writes.length===0&&await page.evaluate(()=>JSON.stringify(state.favoriteIds)==="[6]"&&state.readingSnapshot.status==="none"),
        "C125 opening a suggestion never completes a lesson or changes favorites or the reading position");
      await close(page);
    }
    {
      stage="removed suggested target";const {page,fixture,control}=await open();
      const old=await page.locator("[data-contextual-course-id='30']").elementHandle();
      fixture.courses=fixture.courses.filter(course=>course.id!==30);
      await page.evaluate(()=>loadLibrary());await page.waitForFunction(()=>state.libraryReady&&!state.favoritesLoading&&
        !state.readingLoading&&state.readingSnapshot?.status==="none");
      check(JSON.stringify(await ids(page))==="[2,90,6]",
        "C125 an authorized catalog refresh removes withdrawn suggestions and keeps the remaining editorial order");
      const count=control.requests.length;await page.evaluate(node=>node.click(),old);
      check(control.requests.length===count&&await page.evaluate(()=>state.courseId===10),
        "C125 a detached button cannot open a target that disappeared during refresh");
      await old.dispose();await close(page);
    }
    {
      stage="literal course title";const {page}=await open({literal:true});
      check((await page.locator("[data-contextual-course-id='30']").innerText()).includes("<script>window.__courseExecuted=true</script>")&&
        await page.locator("#contextual-courses-list script").count()===0&&await page.evaluate(()=>window.__courseExecuted)===undefined,
        "C125 current catalog titles are rendered literally without executing markup");
      await close(page);
    }
    {
      stage="suggested course manual retry";const {page,control}=await open();
      control.lessons={status:503,payload:{}};const count=control.requests.length;
      await page.locator("[data-contextual-course-id='30']").click();await page.locator(".lesson-retry").waitFor();
      check(control.requests.length===count+1&&control.writes.length===0&&await page.evaluate(()=>state.courseId===30&&state.lessonId===null),
        "C125 a failed suggestion read keeps the existing recovery state without automatic retry");
      control.lessons=null;await page.locator(".lesson-retry").click();await page.locator("#lesson-content h3").waitFor();
      check(await page.evaluate(()=>state.courseId===30&&state.lessonId===301)&&control.writes.length===0,
        "C125 manual retry reauthorizes and opens the explicitly selected course");
      await close(page);
    }
    for(const status of [403,419]){
      stage="suggested course revocation";const {page,control}=await open();
      const old=await page.locator("[data-contextual-course-id='30']").elementHandle();
      control.lessons={status,payload:{}};await page.locator("[data-contextual-course-id='30']").click();
      await page.waitForFunction(()=>state.accessDenied);
      const count=control.requests.length;await page.evaluate(node=>node.click(),old);
      check(await page.locator("#contextual-courses-panel").isHidden()&&(await ids(page)).length===0&&
        (await page.locator("#contextual-courses-status").textContent())===""&&
        await page.locator("#contextual-courses-toggle").isDisabled()&&control.requests.length===count&&control.writes.length===0,
        "C125 "+status+" purges the category suggestions, disables controls and rejects old navigation buttons");
      await old.dispose();await close(page);
    }
  }catch(error){
    console.error("C125 contextual-courses stage: "+stage+"; "+String(error.message).slice(0,200));throw error;
  }finally{
    await bounded(context.close(),"context cleanup");
  }
};
