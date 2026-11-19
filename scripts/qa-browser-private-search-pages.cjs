"use strict";

// Imported only by the guarded runner. The actual student page and its
// handlers execute against per-page HTTP fixtures; no operational data source is contacted.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:"reduce"});
  const api=base+"/universidade/private",holds=new Set();
  const ok=payload=>({status:200,payload}),clone=value=>JSON.parse(JSON.stringify(value));
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const envelope=(results,next_cursor=null)=>({schema_version:1,scope:"current_published_editorial_lessons",results:clone(results),next_cursor});
  let stage="first page and navigation",failed=false;
  async function bounded(promise,label){let timer;try{
    return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("C140 timeout: "+label)),8000);})]);
  }finally{clearTimeout(timer);}}
  const observe=promise=>{promise.catch(()=>{});return promise;};
  const close=page=>bounded(page.close(),"page cleanup");
  const ready=page=>page.waitForFunction(()=>state.libraryReady&&!state.libraryLoading&&state.favoritesReady&&
    !state.favoritesLoading&&!state.readingLoading&&state.readingSnapshot!==null);
  const ids=page=>page.locator("#lesson-search-results [data-search-lesson]").evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.searchLesson)));
  const settled=(page,index)=>page.waitForFunction(number=>window.__searchPageObservations[number]?.settled===true,index);
  const searches=control=>control.requests.filter(entry=>entry.path==="/search");
  const resultsReady=(page,number=1)=>page.waitForFunction(expected=>!state.searchBusy&&state.searchPage===expected,number);
  const snapshot=page=>page.evaluate(()=>JSON.stringify({courseId:state.courseId,lessonId:state.lessonId,
    courseRequest:state.courseRequest,lessonRequest:state.lessonRequest,filter:state.filter,query:state.query,
    favoritesOnly:state.favoritesOnly,favoriteIds:state.favoriteIds,readingSnapshot:state.readingSnapshot,
    progressHistory:state.progressHistory,lessonFilter:state.lessonFilter}));
  async function submit(page,phrase="texto"){
    await page.locator("#lesson-search-query").fill(phrase);await page.locator("#lesson-search-query").press("Enter");
  }
  const purged=page=>page.evaluate(()=>state.accessDenied&&!state.searchBusy&&state.searchQuery===""&&
    state.searchNextCursor===null&&state.searchPage===0&&document.getElementById("lesson-search-query").value===""&&
    document.getElementById("lesson-search-query").disabled&&document.getElementById("lesson-search-submit").disabled&&
    document.getElementById("lesson-search-next").disabled&&document.getElementById("lesson-search-restart").disabled&&
    document.getElementById("lesson-search-navigation").hidden&&!document.querySelector("[data-search-lesson]"));
  async function open(){
    const page=await context.newPage();await ensureLocalPage(page);
    page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(15000);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    await page.addInitScript(()=>{
      window.__searchStorageCalls=0;
      for(const method of ["getItem","setItem","removeItem","clear"]){
        const original=Storage.prototype[method];
        Storage.prototype[method]=function(...args){window.__searchStorageCalls++;return original.apply(this,args);};
      }
    });
    const fixture={courses:[1,2].map(id=>({id,slug:"curso-"+id,title:"Curso "+id,summary:"Resumo autorizado.",
      category:id===1?"metodologia":"sistemas"})),
      lessons:[11,12,13,14,15,16,17,18,19,21].map(id=>({id,slug:"aula-"+id,title:"Aula "+id,
        body:"Texto literal e autorizado da aula "+id+".",sort_order:id%10,course_id:id===21?2:1,course_version:1})),
      favorites:[2],position:{schema_version:1,scope:"current_authenticated_student",status:"none",revision:"synthetic-private-revision",position:null}};
    fixture.rows=fixture.lessons.filter(lesson=>lesson.course_id===1).map(lesson=>({course_id:1,lesson_id:lesson.id,
      course_title:"Curso 1",lesson_title:lesson.title,snippet:"Trecho sintético da aula "+lesson.id+"."}));
    const control={requests:[],writes:[],overrides:new Map()};
    const fallback=entry=>{
      const {path,method}=entry;
      if(path==="/initialize")return ok({ready:true});
      if(path==="/courses")return ok({courses:fixture.courses.map(course=>({...course,
        lessons_total:fixture.lessons.filter(lesson=>lesson.course_id===course.id).length,lessons_completed:0}))});
      if(path==="/favorites")return ok({course_ids:fixture.favorites});
      if(path==="/reading-position")return ok(fixture.position);
      if(path==="/search"&&method==="POST"){
        if(entry.body?.paginated!==true)return {status:422,payload:{error:"invalid_pagination_mode"}};
        const cursor=entry.body.cursor;
        if(cursor!==undefined&&!/^synthetic-page-[1-9][0-9]*$/.test(cursor))return {status:422,payload:{error:"invalid_cursor"}};
        const offset=cursor===undefined?0:Number(cursor.slice("synthetic-page-".length));
        return ok(envelope(fixture.rows.slice(offset,offset+8),offset+8<fixture.rows.length?"synthetic-page-"+(offset+8):null));
      }
      if(/^\/courses\/\d+\/lessons$/.test(path))return ok({lessons:fixture.lessons.filter(lesson=>lesson.course_id===Number(path.split("/")[2]))
        .map(lesson=>({id:lesson.id,slug:lesson.slug,title:lesson.title,sort_order:lesson.sort_order,completed:0}))});
      if(/^\/lessons\/\d+$/.test(path)){
        const lesson=fixture.lessons.find(row=>row.id===Number(path.split("/")[2]));
        return lesson?ok({lesson}):{status:404,payload:{error:"not_found"}};
      }
      if(path.endsWith("/progress"))return ok({completed:false});
      return {status:404,payload:{error:"not_found"}};
    };
    await page.route(api+"/**",async route=>{
      const request=route.request(),entry={url:request.url(),path:new URL(request.url()).pathname.replace("/universidade/private",""),
        method:request.method(),body:request.postDataJSON()};
      control.requests.push(entry);
      if(entry.method!=="GET"&&!["/initialize","/search"].includes(entry.path))control.writes.push(entry);
      const override=control.overrides.get(entry.path),result=(typeof override==="function"?await override(entry):override)??fallback(entry);
      await route.fulfill({status:result.status,contentType:"application/json",headers:{"Cache-Control":"private, no-store"},body:JSON.stringify(result.payload)});
    });
    const hold=(path,result)=>{
      let release,seen;const gate=new Promise(resolve=>{release=resolve;}),started=new Promise(resolve=>{seen=resolve;});
      const handler=async entry=>{const response=result??fallback(entry);seen();await bounded(gate,"held "+path);return response;};
      const item={seen:()=>bounded(started,"request start "+path),release:()=>{
        if(control.overrides.get(path)===handler)control.overrides.delete(path);
        release();holds.delete(item);
      }};
      control.overrides.set(path,handler);holds.add(item);return item;
    };
    await page.goto(base+"/student");await page.bringToFront();await ready(page);
    await page.locator("#course-list [data-course-id='2']").click();
    await page.waitForFunction(()=>state.lessonId===21&&document.querySelector("#lesson-content h3")?.textContent==="Aula 21");
    await page.waitForLoadState("networkidle",{timeout:8000});
    // Observe only completion flags of the actual function. Keep its original
    // promise/behavior; never inspect or record query text, tokens or responses.
    await page.evaluate(()=>{
      window.__searchPageObservations=[];
      const original=searchLessonPage;
      searchLessonPage=function(...args){
        const observation={settled:false};window.__searchPageObservations.push(observation);
        const result=original(...args);
        Promise.resolve(result).then(()=>{observation.settled=true;},()=>{observation.settled=true;});
        return result;
      };
    });
    return {page,fixture,control,hold};
  }
  try{
    {
      const h=await open(),before=await snapshot(h.page),url=h.page.url();
      await h.page.locator("#lesson-help-question").fill("Dúvida ainda não enviada");
      await h.page.evaluate(()=>{window.__searchReader=document.querySelector(".lesson-text");window.__searchHelp=document.querySelector("[data-lesson-help]");});
      await submit(h.page,"  texto   educativo  ");await resultsReady(h.page);
      check(searches(h.control).length===1&&same(searches(h.control)[0].body,{query:"texto educativo",paginated:true})&&
        searches(h.control)[0].url===api+"/search"&&same(await ids(h.page),[11,12,13,14,15,16,17,18])&&
        await h.page.locator("#lesson-search-next").isEnabled(),
        "C140 first-page search opts in through one private POST and offers eight validated results without prefetch");
      check(await snapshot(h.page)===before&&h.page.url()===url&&h.control.writes.length===0&&
        await h.page.evaluate(()=>window.__searchReader?.isConnected&&window.__searchHelp?.isConnected&&
          window.__searchReader===document.querySelector(".lesson-text")&&window.__searchHelp===document.querySelector("[data-lesson-help]")&&window.__searchStorageCalls===0)&&
        await h.page.locator("#lesson-help-question").inputValue()==="Dúvida ainda não enviada",
        "C140 searching preserves the reader, unsent question, personal state, filters and URL without storage or educational writes");
      await h.page.evaluate(()=>{window.__formerSearchResult=document.querySelector("[data-search-lesson]");});
      await h.page.locator("#lesson-search-next").focus();await h.page.keyboard.press("Enter");await resultsReady(h.page,2);
      check(searches(h.control).length===2&&same(searches(h.control)[1].body,{query:"texto educativo",paginated:true,cursor:"synthetic-page-8"})&&
        same(await ids(h.page),[19])&&await h.page.locator("#lesson-search-next").isDisabled()&&
        await h.page.locator("#lesson-search-restart").isEnabled()&&await snapshot(h.page)===before,
        "C140 the native next-page action replaces eight results with one and keeps the current lesson unchanged");
      await h.page.locator("#lesson-search-restart").click();await resultsReady(h.page);
      check(searches(h.control).length===3&&same(searches(h.control)[2].body,{query:"texto educativo",paginated:true})&&
        same(await ids(h.page),[11,12,13,14,15,16,17,18])&&await snapshot(h.page)===before,
        "C140 restart is a fresh explicit first page and never reuses the continuation token");
      await h.page.setViewportSize({width:390,height:900});
      check(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&
        await h.page.locator("#lesson-search-next").isVisible()&&await h.page.locator("#lesson-search-restart").isVisible(),
        "C140 paging actions wrap accessibly at 390 pixels without horizontal overflow");
      await h.page.setViewportSize({width:1440,height:1000});
      await h.page.locator("#lesson-search-next").click();await resultsReady(h.page,2);
      const navigationStart=h.control.requests.length;await h.page.locator("[data-search-lesson='19']").focus();await h.page.keyboard.press("Enter");
      await h.page.waitForFunction(()=>state.lessonId===19&&document.activeElement?.id==="lesson-navigation-target");
      check(await h.page.locator("#lesson-content h3").innerText()==="Aula 19"&&h.control.writes.length===0&&
        same(h.control.requests.slice(navigationStart).map(entry=>entry.method+" "+entry.path).sort(),
          ["GET /courses/1/lessons","GET /lessons/19","GET /lessons/19/progress"].sort()),
        "C140 activating the last-page result opens its exact authorized lesson with native C127 focus and no completion");
      const staleStart=h.control.requests.length;await h.page.evaluate(()=>window.__formerSearchResult.click());
      check(h.control.requests.length===staleStart&&await h.page.evaluate(()=>state.lessonId===19),
        "C140 a detached result from an older page cannot navigate or create a request");
      const inputStart=h.control.requests.length;await h.page.locator("#lesson-search-query").fill("texto!");await h.page.locator("#lesson-search-query").press("Enter");
      await h.page.waitForFunction(()=>document.getElementById("lesson-search-results").textContent.includes("3 a 60"));
      check(h.control.requests.length===inputStart&&same(await ids(h.page),[])&&await h.page.locator("#lesson-search-navigation").isHidden()&&
        await h.page.evaluate(()=>state.searchQuery===""&&state.searchNextCursor===null&&!state.searchBusy),
        "C140 changing then rejecting a query clears its page and cursor without sending HTTP");
      stage="Unicode search input";
      const unicodeQuery="𐐀".repeat(60),queryField=h.page.locator("#lesson-search-query");
      const unicodeBefore=await snapshot(h.page),unicodeStart=h.control.requests.length;
      await queryField.fill("");await queryField.focus();await h.page.keyboard.insertText(unicodeQuery);
      await queryField.press("Enter");await resultsReady(h.page);
      check(await queryField.inputValue()===unicodeQuery&&h.control.requests.length===unicodeStart+1&&
        same(searches(h.control).at(-1).body,{query:unicodeQuery,paginated:true})&&
        searches(h.control).at(-1).url===api+"/search"&&await snapshot(h.page)===unicodeBefore&&
        h.page.url()===url&&h.control.writes.length===0&&await h.page.evaluate(()=>window.__searchStorageCalls===0),
        "C146 native input must retain all 60 Unicode letters and submit the exact private query without changing study state URL or storage");
      for(const length of [2,61]){
        const invalidQuery="𐐀".repeat(length),before=h.control.requests.length;
        await queryField.fill("");await queryField.focus();await h.page.keyboard.insertText(invalidQuery);
        await queryField.press("Enter");
        await h.page.waitForFunction(()=>document.getElementById("lesson-search-results").textContent.includes("3 a 60"));
        check(await queryField.inputValue()===invalidQuery&&h.control.requests.length===before&&
          await snapshot(h.page)===unicodeBefore&&same(await ids(h.page),[])&&h.control.writes.length===0&&
          await h.page.evaluate(()=>state.searchQuery===""&&state.searchNextCursor===null&&!state.searchBusy),
          "C146 a "+length+"-character Unicode query must remain intact and be rejected locally without a request or stale search page");
      }
      await close(h.page);
    }
    for(const status of [409,422,503]){
      stage="continuation error "+status;const h=await open();await submit(h.page);await resultsReady(h.page);
      h.control.overrides.set("/search",{status,payload:{error:status===409?"search_context_changed":status===422?"invalid_cursor":"temporarily_unavailable"}});
      await h.page.locator("#lesson-search-next").click();await settled(h.page,1);
      check(searches(h.control).length===2&&same(await ids(h.page),[])&&await h.page.locator("#lesson-search-next").isDisabled()&&
        await h.page.locator("#lesson-search-restart").isEnabled()&&await h.page.evaluate(()=>state.searchNextCursor===null&&!state.searchBusy)&&
        (await h.page.locator("#lesson-search-results").innerText()).includes(status===409?"conteúdo da busca mudou":status===422?"validar a continuação":"indisponível"),
        "C140 HTTP "+status+" clears the continuation and requires manual restart without an automatic request");
      h.control.overrides.delete("/search");await h.page.locator("#lesson-search-restart").click();await resultsReady(h.page);
      check(searches(h.control).length===3&&same(searches(h.control)[2].body,{query:"texto",paginated:true})&&
        same(await ids(h.page),[11,12,13,14,15,16,17,18])&&h.control.writes.length===0,
        "C140 an explicit restart after HTTP "+status+" omits the stale cursor and restores a validated first page");
      await close(h.page);
    }
    for(const malformed of ["foreign-course","legacy"]){
      stage="malformed opt-in page "+malformed;const h=await open();
      h.control.overrides.set("/search",ok(malformed==="legacy"?{results:h.fixture.rows.slice(0,8)}:
        envelope([{...h.fixture.rows[0],course_id:999}])));
      await submit(h.page);await settled(h.page,0);
      check(searches(h.control).length===1&&same(await ids(h.page),[])&&
        (await h.page.locator("#lesson-search-results").innerText()).includes("indisponível")&&
        await h.page.locator("#lesson-search-next").isDisabled()&&await h.page.locator("#lesson-search-restart").isEnabled(),
        "C140 "+malformed+" response cannot publish partial results or masquerade as a valid empty page");
      await close(h.page);
    }
    {
      stage="valid empty page";const h=await open();h.fixture.rows=[];await submit(h.page);await resultsReady(h.page);
      check(same(await ids(h.page),[])&&(await h.page.locator("#lesson-search-results").innerText()).includes("Nenhuma aula publicada")&&
        !(await h.page.locator("#lesson-search-results").innerText()).includes("indisponível")&&await h.page.locator("#lesson-search-next").isDisabled(),
        "C140 an authorized empty first page remains an honest empty result");
      await close(h.page);
    }
    {
      stage="new input during pending search";const h=await open(),old=h.hold("/search");
      await submit(h.page);await old.seen();
      await h.page.locator("#lesson-search-form").evaluate(form=>form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
      check(searches(h.control).length===1&&await h.page.evaluate(()=>state.searchBusy),
        "C140 repeated submission cannot start another request in the current generation");
      await h.page.locator("#lesson-search-query").fill("outro");const fresh=h.hold("/search");
      await h.page.locator("#lesson-search-query").press("Enter");await fresh.seen();
      old.release();await settled(h.page,0);
      check(searches(h.control).length===2&&await h.page.evaluate(()=>state.searchBusy&&state.searchQuery==="outro")&&
        await h.page.locator("#lesson-search-submit").isDisabled()&&same(await ids(h.page),[]),
        "C140 input invalidation permits a new query while the older response and finally cannot release its busy state");
      fresh.release();await settled(h.page,1);await resultsReady(h.page);
      check(same(searches(h.control)[1].body,{query:"outro",paginated:true})&&
        (await h.page.locator("#lesson-search-results").innerText()).includes("“outro”")&&same(await ids(h.page),[11,12,13,14,15,16,17,18]),
        "C140 only the current query publishes its result page after the newer request settles");
      await close(h.page);
    }
    {
      stage="pending search during library refresh";const h=await open(),search=h.hold("/search");
      await submit(h.page);await search.seen();const courses=h.hold("/courses");
      const loading=observe(h.page.evaluate(()=>loadLibrary()));await courses.seen();
      check(await h.page.evaluate(()=>state.libraryLoading&&!state.libraryReady&&!state.searchBusy&&state.searchQuery===""&&state.searchNextCursor===null)&&
        await h.page.locator("#lesson-search-query").isDisabled()&&same(await ids(h.page),[]),
        "C140 library reauthorization invalidates the page, cursor and request ownership immediately");
      search.release();await settled(h.page,0);
      const ignored=await h.page.evaluate(()=>state.libraryLoading&&!state.searchBusy&&!document.querySelector("[data-search-lesson]")&&
        document.getElementById("lesson-search-query").disabled);
      courses.release();await bounded(loading,"library refresh");await ready(h.page);
      await submit(h.page,"recuperada");await resultsReady(h.page);
      check(ignored&&searches(h.control).length===2&&same(await ids(h.page),[11,12,13,14,15,16,17,18]),
        "C140 the late old search stays absent during refresh and a new search is usable after successful authorization");
      await close(h.page);
    }
    {
      stage="failed refresh and manual recovery";const h=await open(),search=h.hold("/search");
      await submit(h.page);await search.seen();
      h.control.overrides.set("/initialize",{status:503,payload:{error:"temporarily_unavailable"}});
      await bounded(h.page.evaluate(()=>loadLibrary()),"failed library refresh");await h.page.locator("#library-recovery").waitFor({state:"visible"});
      search.release();await settled(h.page,0);
      const cleared=await h.page.evaluate(()=>!state.libraryReady&&!state.searchBusy&&state.searchQuery===""&&state.searchNextCursor===null);
      h.control.overrides.delete("/initialize");await h.page.locator("#retry-library").click();await ready(h.page);
      await submit(h.page,"recuperada");await resultsReady(h.page);
      check(cleared&&searches(h.control).length===2&&same(searches(h.control)[1].body,{query:"recuperada",paginated:true})&&
        same(await ids(h.page),[11,12,13,14,15,16,17,18])&&await h.page.evaluate(()=>!state.searchBusy),
        "C140 a failed library refresh cannot strand searchBusy after manual library recovery");
      await close(h.page);
    }
    {
      stage="old error after recovery with a new search pending";const h=await open(),old=h.hold("/search",{status:503,payload:{error:"temporarily_unavailable"}});
      await submit(h.page);await old.seen();await bounded(h.page.evaluate(()=>loadLibrary()),"refresh before new search");await ready(h.page);
      const fresh=h.hold("/search");await submit(h.page,"nova busca");await fresh.seen();
      old.release();await settled(h.page,0);
      const protectedBusy=await h.page.evaluate(()=>state.searchBusy&&state.searchQuery==="nova busca"&&
        document.getElementById("lesson-search-submit").disabled&&!document.querySelector("[data-search-lesson]"));
      fresh.release();await settled(h.page,1);await resultsReady(h.page);
      check(protectedBusy&&searches(h.control).length===2&&same(await ids(h.page),[11,12,13,14,15,16,17,18]),
        "C140 an old request error and finally cannot replace the loading state or release a new search after recovery");
      await close(h.page);
    }
    for(const status of [403,419]){
      stage="search revocation "+status;const h=await open();await submit(h.page);await resultsReady(h.page);
      h.control.overrides.set("/search",{status,payload:{error:"access_denied"}});
      await h.page.locator("#lesson-search-next").click();await h.page.waitForFunction(()=>state.accessDenied);
      await settled(h.page,1);
      check(await purged(h.page)&&searches(h.control).length===2&&h.control.writes.length===0,
        "C140 HTTP "+status+" clears query, page, cursor and all paging actions without replay");
      await close(h.page);
    }
    {
      stage="late page after independent revocation";const h=await open(),held=h.hold("/search");
      await submit(h.page);await held.seen();
      h.control.overrides.set("/courses/1/lessons",{status:403,payload:{error:"access_denied"}});
      await h.page.locator("#course-list [data-course-id='1']").click();await h.page.waitForFunction(()=>state.accessDenied);
      held.release();await settled(h.page,0);await h.page.waitForLoadState("networkidle",{timeout:8000});
      check(await purged(h.page)&&searches(h.control).length===1&&h.control.writes.length===0,
        "C140 a page that arrives after another request revokes access cannot restore search or navigate");
      await close(h.page);
    }
  }catch(error){
    failed=true;throw new Error("C140 browser stage "+stage+": "+error.message,{cause:error});
  }finally{
    for(const held of [...holds])held.release();
    try{await bounded(context.close(),"context cleanup");}catch(error){if(!failed)throw error;}
  }
};
