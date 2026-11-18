"use strict";

// Imported only by the guarded synthetic runner. A page-local fixture serves
// the real student UI; section actions are native DOM interactions, not mocks.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
  context.setDefaultTimeout(8000);context.setDefaultNavigationTimeout(15000);
  const api=base+"/universidade/private",pending=new Set();let stage="lesson section index";
  const sample="Introdução literal 😀.\nA quebra simples permanece.\n\nSegundo parágrafo introdutório.\n\n"+
    "EXEMPLO FICTÍCIO\nUm exemplo literal.\nOutra linha.\n \t\nMais um parágrafo.\n\n"+
    "APLICAÇÃO OPCIONAL\nPasso opcional sem promessa.\n\nCUIDADO IMPORTANTE\nMantenha o cuidado publicado.";
  const ok=payload=>({status:200,payload});
  const buttons=".lesson-text [data-lesson-section-id]",headings=".lesson-text h4[data-lesson-section]";
  async function bounded(promise,label){
    let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error("C128 timeout: "+label)),8000);
    })]);}finally{clearTimeout(timer);}
  }
  function held(result){
    let release,entered;const waiting=new Promise(resolve=>{release=resolve;}),started=new Promise(resolve=>{entered=resolve;});
    const control={started,release};pending.add(control);
    control.read=async()=>{entered();await bounded(waiting,"held read");pending.delete(control);return result;};return control;
  }
  const observed=promise=>{promise.catch(()=>{});return promise;};
  const close=page=>bounded(page.close(),"page cleanup");
  const ready=page=>page.waitForFunction(()=>state.libraryReady&&!state.libraryLoading&&state.favoritesReady&&!state.favoritesLoading&&
    !state.readingLoading&&state.readingSnapshot?.status==="none");
  async function open(body=sample){
    const page=await context.newPage();await ensureLocalPage(page);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    await page.addInitScript(()=>{
      window.__sectionStorageCalls=0;
      for(const name of ["getItem","setItem","removeItem","clear"]){
        const original=Storage.prototype[name];
        Storage.prototype[name]=function(...args){window.__sectionStorageCalls++;return original.apply(this,args);};
      }
    });
    const courses=[
      {id:1,slug:"curso-um",title:"Curso um",summary:"Resumo",category:"metodologia",lessons_total:2,lessons_completed:0},
      {id:2,slug:"curso-dois",title:"Curso dois",summary:null,category:"negocios",lessons_total:1,lessons_completed:0}];
    const lessons=[11,12,21].map(id=>({id,slug:"aula-"+id,title:"Aula "+id,sort_order:id%10,course_id:id===21?2:1,
      course_version:1,body:id===12?"Uma aula breve e literal, sem seções adicionais.":body}));
    const control={requests:[],writes:[],details:null,initialize:null,favorites:null};
    await page.route(api+"/**",async route=>{
      const request=route.request(),path=new URL(request.url()).pathname.replace("/universidade/private","");
      const entry={path,method:request.method()};control.requests.push(entry);
      if(entry.method!=="GET"&&path!=="/initialize")control.writes.push(entry);
      const resolve=async value=>typeof value==="function"?await value(entry):value;
      let result;
      if(path==="/initialize")result=(await resolve(control.initialize))??ok({ready:true});
      else if(path==="/courses")result=ok({courses});
      else if(path==="/favorites")result=(await resolve(control.favorites))??ok({course_ids:[]});
      else if(path==="/reading-position")result=ok({schema_version:1,scope:"current_authenticated_student",status:"none",revision:"synthetic-sections-ticket",position:null});
      else if(/^\/courses\/\d+\/lessons$/.test(path)){
        const id=Number(path.split("/")[2]);result=ok({lessons:lessons.filter(row=>row.course_id===id)
          .map(row=>({id:row.id,slug:row.slug,title:row.title,sort_order:row.sort_order,completed:0}))});
      }else if(/^\/lessons\/\d+$/.test(path)){
        result=(await resolve(control.details))??ok({lesson:lessons.find(row=>row.id===Number(path.split("/")[2]))});
      }else if(path.endsWith("/progress"))result=ok({completed:false});
      else result={status:404,payload:{error:"not_found"}};
      return route.fulfill({status:result.status,contentType:"application/json",headers:{"Cache-Control":"private, no-store"},body:JSON.stringify(result.payload)});
    });
    await page.goto(base+"/student?source=c128#reading");await ready(page);
    await page.bringToFront();await page.waitForFunction(()=>document.hasFocus()&&document.visibilityState==="visible");
    await page.locator("#course-list [data-course-id='1']").click();
    await page.locator("#lesson-content h3").waitFor();return {page,control,lessons};
  }
  async function unchangedOldAction(page,handle,control){
    await page.locator(".nav-links a").first().focus();
    const before=await page.evaluate(()=>({active:document.activeElement?.outerHTML,x:scrollX,y:scrollY})),requests=control.requests.length;
    await page.evaluate(node=>node.click(),handle);
    return control.requests.length===requests&&await page.evaluate(previous=>document.activeElement?.outerHTML===previous.active&&
      scrollX===previous.x&&scrollY===previous.y,before);
  }
  try{
    for(const body of ["Texto simples.\n\nOutro parágrafo.","Introdução.\n\nEXEMPLO FICTÍCIO\nUm exemplo literal."]){
      stage="index usefulness";const {page,control}=await open(body);
      check(await page.locator("[data-lesson-sections]").count()===0&&await page.locator(buttons).count()===0&&
        await page.locator(".lesson-paragraph").count()===2&&control.writes.length===0,
        "C128 fewer than two recognized headings keeps the lesson readable without an index");
      await close(page);
    }
    {
      stage="literal paragraphs and local navigation";const {page,control}=await open();
      check(JSON.stringify(await page.locator(buttons).allTextContents())===JSON.stringify(["EXEMPLO FICTÍCIO","APLICAÇÃO OPCIONAL","CUIDADO IMPORTANTE"])&&
        await page.locator("[data-lesson-sections]").getAttribute("aria-label")==="Índice das seções desta aula",
        "C128 a useful index preserves exact recognized labels and editorial occurrence order");
      // Compare only literal source content, excluding the intentionally repeated index labels.
      check(await page.evaluate(body=>{
        const wrapper=document.querySelector(".lesson-text"),sections=[];let current={heading:null,text:""};
        for(const node of wrapper.childNodes){
          if(node.nodeName==="NAV")continue;
          if(node.nodeName==="H4"){if(current.heading!==null||current.text)sections.push(current);current={heading:node.textContent,text:""};}
          else current.text+=node.textContent;
        }
        if(current.heading!==null||current.text)sections.push(current);
        return JSON.stringify(sections)===JSON.stringify(splitLessonSections(body))&&wrapper.querySelectorAll(".lesson-paragraph").length===6&&
          Array.from(wrapper.querySelectorAll(".lesson-paragraph")).every(node=>node.checkVisibility())&&
          wrapper.querySelector(".lesson-paragraph").textContent==="Introdução literal 😀.\nA quebra simples permanece.";
      },sample),"C128 semantic paragraphs retain all section text, blank separators, Unicode and simple line breaks without collapsing content");
      check(await page.locator(buttons).evaluateAll(nodes=>nodes.every(button=>button.type==="button"&&
        button.getAttribute("aria-controls")===button.dataset.lessonSectionId&&
        document.getElementById(button.dataset.lessonSectionId)?.tabIndex===-1))&&
        new Set(await page.locator(headings).evaluateAll(nodes=>nodes.map(node=>node.id))).size===3,
        "C128 native buttons address unique focusable headings with safe DOM targets");
      const url=page.url(),requests=control.requests.length;
      const before=await page.evaluate(()=>JSON.stringify({courses:state.courses,courseId:state.courseId,lessonId:state.lessonId,
        filter:state.filter,query:state.query,favoriteIds:state.favoriteIds,readingSnapshot:state.readingSnapshot}));
      await page.locator(buttons).nth(1).click();
      check(await page.evaluate(()=>{
        const target=document.querySelectorAll("h4[data-lesson-section]")[1],rect=target.getBoundingClientRect();
        return document.activeElement===target&&rect.top>=0&&rect.top<innerHeight;
      })&&page.url()===url&&control.requests.length===requests,
        "C128 clicking the index focuses and scrolls to the exact section without requests or URL/hash changes");
      await page.locator(buttons).first().focus();await page.keyboard.press("Enter");
      check(await page.locator(headings).first().evaluate(node=>document.activeElement===node),
        "C128 Enter activates the native section button and places focus on its heading");
      await page.locator(buttons).last().focus();await page.keyboard.press("Space");
      check(await page.locator(headings).last().evaluate(node=>document.activeElement===node),
        "C128 Space activates the native section button and places focus on its heading");
      check(control.requests.length===requests&&control.writes.length===0&&page.url()===url&&await page.evaluate(previous=>
        window.__sectionStorageCalls===0&&JSON.stringify({courses:state.courses,courseId:state.courseId,lessonId:state.lessonId,
          filter:state.filter,query:state.query,favoriteIds:state.favoriteIds,readingSnapshot:state.readingSnapshot})===previous,before),
        "C128 repeated jumps do not change progress, favorites, the saved reading position or persistent storage");
      await page.setViewportSize({width:390,height:844});await page.locator(buttons).nth(1).click();
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&
        document.activeElement===document.querySelectorAll("h4[data-lesson-section]")[1])&&
        await page.locator(".lesson-paragraph").count()===6,
        "C128 the mobile index wraps without horizontal overflow and retains every paragraph");
      await close(page);
    }
    {
      stage="literal line separators";const body="Primeira😀\r\nLinha simples\r\n \t\r\n\r\n  Segundo\n\n\nTerceiro";
      const {page}=await open(body);
      check(await page.locator(".lesson-text").evaluate((node,expected)=>node.textContent===expected&&
        node.querySelectorAll(".lesson-paragraph").length===3&&
        node.querySelector(".lesson-paragraph").textContent==="Primeira😀\r\nLinha simples",body),
        "C128 CRLF, blank-line whitespace, indentation and astral text retain their exact literal characters");await close(page);
    }
    {
      stage="literal markup";const body="<img src=x onerror=window.__sectionExecuted=true>\n\nEXEMPLO FICTÍCIO\n**literal**\n\nAPLICAÇÃO OPCIONAL\n[url](https://invalid.example)";
      const {page}=await open(body);
      check(await page.locator(".lesson-text img,.lesson-text script,.lesson-text a").count()===0&&
        (await page.locator(".lesson-paragraph").first().textContent()).includes("<img src=x")&&await page.evaluate(()=>window.__sectionExecuted)===undefined,
        "C128 HTML and Markdown remain literal text without active markup or external links");await close(page);
    }
    {
      stage="maximum Unicode text";const prefix="Introdução.\n\nEXEMPLO FICTÍCIO\nExemplo.\n\nAPLICAÇÃO OPCIONAL\n";
      const count=30000-Array.from(prefix).length,{page}=await open(prefix+"😀".repeat(count));
      check(await page.locator(".lesson-paragraph").last().evaluate((node,length)=>Array.from(node.textContent).length===length&&
        node.textContent==="😀".repeat(length),count)&&await page.locator(buttons).count()===2,
        "C128 a maximum-size Unicode lesson retains its complete final paragraph without truncation");await close(page);
    }
    {
      stage="duplicate labels";const {page}=await open("Introdução."+"\n\nEXEMPLO FICTÍCIO\nExemplo literal.".repeat(4));
      check(await page.locator(headings).evaluateAll(nodes=>nodes.length===4&&new Set(nodes.map(node=>node.id)).size===4&&
        nodes.every(node=>/^lesson-section-\d+-\d+-\d+-\d+$/.test(node.id)))&&await page.locator(buttons).count()===4,
        "C128 repeated labels remain separate sections with unique safe IDs");await close(page);
    }
    {
      stage="old lesson action";const {page,control}=await open(),old=await page.locator(buttons).first().elementHandle();
      await page.locator("#lesson-items [data-lesson-id='12']").click();await page.waitForFunction(()=>state.lessonId===12&&document.querySelector("#lesson-content h3"));
      check(await page.locator(buttons).count()===0&&await unchangedOldAction(page,old,control)&&control.writes.length===0,
        "C128 an old index action cannot move focus or scroll after another lesson is selected");await old.dispose();await close(page);
    }
    {
      stage="same lesson new generation";const {page,control}=await open(),old=await page.locator(buttons).first().elementHandle();
      const id=await page.locator(headings).first().getAttribute("id");
      await page.locator("#lesson-items [data-lesson-id='11']").click();await page.locator(headings).first().waitFor();
      check(await page.locator(headings).first().getAttribute("id")!==id&&await unchangedOldAction(page,old,control),
        "C128 reopening the same lesson gives new targets and rejects its previous index");await old.dispose();await close(page);
    }
    {
      stage="filtered old action";const {page,control}=await open(),old=await page.locator(buttons).first().elementHandle();
      await page.locator("[data-filter='negocios']").click();
      check(await page.locator(buttons).count()===0&&await unchangedOldAction(page,old,control)&&control.writes.length===0,
        "C128 changing the catalog filter invalidates section actions from the previous selection");await old.dispose();await close(page);
    }
    for(const status of [403,419]){
      stage="revoked section actions";const {page,control}=await open(),old=await page.locator(buttons).first().elementHandle();
      control.details={status,payload:{}};await page.locator("#lesson-items [data-lesson-id='12']").click();await page.waitForFunction(()=>state.accessDenied);
      check(await page.locator(buttons).count()===0&&await page.locator(headings).count()===0&&await unchangedOldAction(page,old,control)&&control.writes.length===0,
        "C128 "+status+" purges section content and prevents old controls from taking focus or scrolling");await old.dispose();await close(page);
    }
    {
      stage="late lesson after revocation";const {page,control,lessons}=await open();
      const hold=held(ok({lesson:lessons[0]}));control.details=hold.read;
      const operation=observed(page.evaluate(()=>selectLesson(11)));await bounded(hold.started,"lesson request start");
      control.favorites={status:403,payload:{}};await page.evaluate(()=>loadFavorites());await page.waitForFunction(()=>state.accessDenied);
      hold.release();await bounded(operation,"late lesson settlement");await page.waitForLoadState("networkidle");
      check(await page.locator(buttons).count()===0&&await page.locator(headings).count()===0&&
        await page.locator(".lesson-paragraph").count()===0&&control.writes.length===0,
        "C128 a late successful lesson response cannot restore headings or an index after revocation");await close(page);
    }
  }catch(error){
    console.error("C128 lesson-sections stage: "+stage+"; "+String(error.message).slice(0,200));throw error;
  }finally{
    for(const hold of pending)hold.release();await bounded(context.close(),"context cleanup");
  }
};
