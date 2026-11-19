"use strict";

// The guarded runner owns browser startup. These pages share only an isolated
// synthetic server fixture; actual submit/reorder/recovery handlers stay intact.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:"reduce"});
  context.setDefaultTimeout(8000);context.setDefaultNavigationTimeout(15000);
  const api=base+"/universidade/private/admin",holds=new Set();
  const fields=["course-title","course-slug","course-category","course-summary","course-sort",
    "lesson-title","lesson-slug","lesson-body","lesson-sort"];
  const original=[{id:11,sort_order:0},{id:12,sort_order:1},{id:13,sort_order:2}];
  const moved=[{id:12,sort_order:0},{id:11,sort_order:1},{id:13,sort_order:2}];
  const clone=value=>JSON.parse(JSON.stringify(value)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const ok=payload=>({status:200,payload});let stage="text-only order omission",failed=false;
  const fixture=()=>({course:{id:1,slug:"curso-ficticio",title:"Curso fictício",category:"metodologia",summary:"Resumo salvo.",sort_order:0,is_published:false},
    lessons:original.map(pair=>({...pair,slug:"aula-"+pair.id,title:"Aula salva "+pair.id,
      body:"Corpo salvo e autorizado da aula "+pair.id+".",status:"draft",is_published:false})),nextId:30});
  const stored=(server,id=11)=>server.lessons.find(lesson=>lesson.id===id);
  const order=server=>server.lessons.map(({id,sort_order})=>({id,sort_order})).sort((a,b)=>a.sort_order-b.sort_order||a.id-b.id);
  const values=page=>page.evaluate(ids=>ids.map(id=>document.getElementById(id).value),fields);
  const patchWrites=control=>control.writes.filter(request=>request.method==="PATCH");
  const paths=requests=>requests.map(request=>request.method+" "+request.path);
  const query="#editorial-lesson-search";
  async function bounded(promise,label){let timer;try{
    return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("C133 timeout: "+label)),8000);})]);
  }finally{clearTimeout(timer);}}
  const close=page=>bounded(page.close(),"page cleanup");
  const success=page=>page.waitForFunction(()=>!state.writePending&&!state.writeOutcomeUnknown&&document.getElementById("status").textContent==="Aula salva em rascunho.");
  const frozen=page=>page.waitForFunction(()=>!state.writePending&&state.writeOutcomeUnknown);
  const textDraft=async page=>{
    await page.locator("#lesson-title").fill("  Aula revisada 😀  ");
    await page.locator("#lesson-body").fill("  Corpo revisado com Unicode 😀 e espaços.  ");
  };
  const siblingDraft=async page=>{
    await page.locator("#course-summary").fill("  Resumo irmão ainda não salvo.  ");
    return (await values(page)).slice(0,5);
  };
  async function open(server=fixture(),selected=11){
    const page=await context.newPage();await ensureLocalPage(page);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    const control={requests:[],writes:[],responses:[],patch:null,commitPatch:true,audit:ok({events:[],next_before_id:null})};
    const patch=entry=>{
      const lesson=stored(server,Number(entry.path.split("/")[2]));
      if(!lesson)return {status:404,payload:{error:"not_found"}};
      if(Object.hasOwn(entry.body,"expected_sort_order")&&entry.body.expected_sort_order!==lesson.sort_order)
        return {status:409,payload:{error:"draft_order_changed"}};
      for(const key of ["title","body","sort_order"])if(Object.hasOwn(entry.body,key))lesson[key]=entry.body[key];
      return ok({saved:true});
    };
    await page.route(api+"/**",async route=>{
      const request=route.request(),entry={path:new URL(request.url()).pathname.replace("/universidade/private/admin",""),
        method:request.method(),body:request.postDataJSON()};
      control.requests.push(entry);if(entry.method!=="GET")control.writes.push(entry);
      let result;
      if(entry.path==="/courses")result=ok({courses:[server.course]});
      else if(entry.path==="/courses/1/lessons"&&entry.method==="GET")
        result=ok({lessons:server.lessons.slice().sort((a,b)=>a.sort_order-b.sort_order||a.id-b.id)});
      else if(/^\/lessons\/\d+$/.test(entry.path)&&entry.method==="PATCH"){
        const normal=control.commitPatch?patch(entry):ok({saved:true});
        result=(typeof control.patch==="function"?await control.patch(entry):control.patch)??normal;
      }else if(entry.path==="/courses/1/lessons"&&entry.method==="POST"){
        const id=server.nextId++;server.lessons.push({id,...entry.body,status:"draft",is_published:false});
        result={status:201,payload:{id,status:"draft"}};
      }else if(entry.path==="/courses/1/lessons/reorder"&&entry.method==="POST"){
        if(!same(entry.body,{lesson_id:12,direction:"up",expected_order:original}))
          result={status:409,payload:{error:"draft_order_changed"}};
        else{
          for(const pair of moved)stored(server,pair.id).sort_order=pair.sort_order;
          result=ok({schema_version:1,scope:"current_editorial_draft",course_id:1,course_version:7,
            status:"draft",lesson_id:12,direction:"up",changed:true,order:clone(moved)});
        }
      }else if(entry.path==="/audit")result=control.audit;
      else if(entry.path==="/overview")result=ok({schema_version:1,scope:"current_editorial_catalog",
        totals:{courses:1,published_courses:0,draft_courses:1,current_lessons:server.lessons.length,courses_without_lessons:0,courses_without_summary:0},
        categories:[{category:"metodologia",courses:1,published_courses:0,draft_courses:1,current_lessons:server.lessons.length},
          ...["negocios","sistemas"].map(category=>({category,courses:0,published_courses:0,draft_courses:0,current_lessons:0}))]});
      else result={status:404,payload:{error:"not_found"}};
      control.responses.push({path:entry.path,method:entry.method,status:result.abort?null:result.status});
      if(result.abort){await route.abort("failed");return;}
      await route.fulfill({status:result.status,contentType:"application/json",headers:{"Cache-Control":"private, no-store"},body:JSON.stringify(result.payload)});
    });
    const holdPatch=()=>{
      let release,seen;const gate=new Promise(resolve=>{release=resolve;}),started=new Promise(resolve=>{seen=resolve;});
      const held={seen:()=>bounded(started,"PATCH start"),release:()=>{release();holds.delete(held);}};
      control.patch=async()=>{seen();await bounded(gate,"held PATCH response");return ok({saved:true});};holds.add(held);return held;
    };
    await page.goto(base+"/admin");await page.waitForFunction(()=>state.catalogReady&&!state.catalogLoading);
    await page.locator("#course-items [data-course='1']").click();await page.waitForFunction(()=>state.course?.id===1&&state.lessonsReady);
    await page.locator("#lesson-items [data-lesson='"+selected+"']").click();await page.waitForFunction(id=>state.lesson?.id===id,selected);
    await page.waitForLoadState("networkidle",{timeout:8000});return {page,server,control,holdPatch};
  }
  async function remoteMove(peer){
    await peer.page.locator("#lesson-items [data-move-lesson='12'][data-direction='up']").click();
    await peer.page.waitForFunction(()=>!state.writePending&&document.getElementById("status").textContent==="Ordem das aulas atualizada.");
  }
  try{
    {
      const old=await open(),peer=await open(old.server,12);await textDraft(old.page);const sibling=await siblingDraft(old.page);
      await old.page.locator(query).fill("salva");await remoteMove(peer);
      check(same(order(old.server),moved)&&await old.page.evaluate(()=>state.lesson.id===11&&state.lesson.sort_order===0)&&peer.control.writes.length===1,
        "C133 a second real editor page confirms C129 while the first retains its original order baseline");
      const requests=old.control.requests.length;await old.page.locator("#lesson-save").click();await success(old.page);
      check(same(patchWrites(old.control)[0].body,{title:"Aula revisada 😀",body:"Corpo revisado com Unicode 😀 e espaços."})&&
        same(paths(old.control.requests.slice(requests)),["PATCH /lessons/11","GET /courses/1/lessons"]),
        "C133 saving only text omits both order fields and performs only PATCH followed by the existing authorized list refresh");
      check(same(order(old.server),moved)&&stored(old.server).body==="Corpo revisado com Unicode 😀 e espaços."&&
        await old.page.locator("#lesson-sort").inputValue()==="1"&&await old.page.locator(query).inputValue()==="salva"&&
        same((await values(old.page)).slice(0,5),sibling)&&old.control.writes.length===1,
        "C133 the remote order survives text editing while the current lesson, sibling draft and C131 query stay intact");
      await close(peer.page);await close(old.page);
    }
    {
      stage="explicit stale order conflict";const old=await open(),peer=await open(old.server,12);
      await textDraft(old.page);await old.page.locator("#lesson-sort").fill("7");await siblingDraft(old.page);await old.page.locator(query).fill("salva");
      const buffers=await values(old.page);await remoteMove(peer);const serverBefore=clone(old.server.lessons),requests=old.control.requests.length;
      await old.page.locator("#lesson-save").click();await frozen(old.page);
      check(same(patchWrites(old.control)[0].body,{title:"Aula revisada 😀",body:"Corpo revisado com Unicode 😀 e espaços.",sort_order:7,expected_sort_order:0})&&
        old.control.responses.some(response=>response.method==="PATCH"&&response.status===409)&&same(old.server.lessons,serverBefore)&&
        same(paths(old.control.requests.slice(requests)),["PATCH /lessons/11"]),
        "C133 a stale explicit numeric change sends the original integer baseline and conflict does not write content or start a preventive/recovery GET");
      check(same(await values(old.page),buffers)&&await old.page.locator(query).inputValue()==="salva"&&
        await old.page.locator(query).isDisabled()&&await old.page.locator("#lesson-save").isDisabled()&&
        (await old.page.locator("#status").innerText()).includes("Não repita a operação"),
        "C133 conflict keeps both literal buffers and the local query behind the existing manual-recovery fence");
      const beforeRecovery=old.control.requests.length;old.page.once("dialog",dialog=>dialog.dismiss());await old.page.locator("#retry-catalog").click();
      check(same(await values(old.page),buffers)&&old.control.requests.length===beforeRecovery&&patchWrites(old.control).length===1,
        "C133 canceling manual reconciliation preserves the disputed fields without another PATCH or GET");
      old.page.once("dialog",dialog=>dialog.accept());await old.page.locator("#retry-catalog").click();
      await old.page.waitForFunction(()=>state.catalogReady&&state.lessonsReady&&!state.catalogLoading&&!state.writeOutcomeUnknown);
      check(await old.page.locator("#lesson-sort").inputValue()==="1"&&await old.page.locator(query).inputValue()==="salva"&&
        patchWrites(old.control).length===1&&same(paths(old.control.requests.slice(beforeRecovery)),["GET /courses","GET /courses/1/lessons"]),
        "C133 only an accepted manual read replaces the stale baseline and it never replays the conflicted PATCH");
      await textDraft(old.page);await old.page.locator("#lesson-sort").fill("7");await old.page.locator("#lesson-save").click();await success(old.page);
      check(patchWrites(old.control).length===2&&patchWrites(old.control)[1].body.expected_sort_order===1&&
        patchWrites(old.control)[1].body.sort_order===7&&stored(old.server).sort_order===7&&await old.page.locator(query).inputValue()==="salva",
        "C133 a new deliberate save uses the newly read order baseline and can confirm the explicit destination");
      await close(peer.page);await close(old.page);
    }
    {
      stage="destination already applied";const {page,server,control}=await open();stored(server).sort_order=7;await textDraft(page);
      await page.locator("#lesson-sort").fill("7");const before=clone(stored(server));await page.locator("#lesson-save").click();await frozen(page);
      check(same(stored(server),before)&&control.responses.some(response=>response.method==="PATCH"&&response.status===409)&&
        patchWrites(control)[0].body.expected_sort_order===0&&control.writes.length===1,
        "C133 a stale baseline remains a conflict even when another operation already chose the same numeric destination");await close(page);
    }
    for(const payload of [{},{saved:false}]){
      stage="malformed successful receipt";const {page,control}=await open();await textDraft(page);await page.locator("#lesson-sort").fill("7");
      await siblingDraft(page);await page.locator(query).fill("salva");const buffers=await values(page),requests=control.requests.length;
      control.patch=ok(payload);await page.locator("#lesson-save").click();await frozen(page);
      check(same(await values(page),buffers)&&await page.locator(query).inputValue()==="salva"&&
        same(paths(control.requests.slice(requests)),["PATCH /lessons/11"])&&control.writes.length===1,
        "C133 HTTP 200 without saved:true preserves buffers and requires manual recovery instead of confirming: "+JSON.stringify(payload));await close(page);
    }
    {
      stage="lost response after commit";const {page,server,control}=await open();await textDraft(page);await page.locator("#lesson-sort").fill("7");
      await siblingDraft(page);await page.locator(query).fill("salva");const buffers=await values(page),requests=control.requests.length;
      control.patch={abort:true};await page.locator("#lesson-save").click();await frozen(page);
      check(stored(server).sort_order===7&&stored(server).body==="Corpo revisado com Unicode 😀 e espaços."&&same(await values(page),buffers)&&
        await page.locator(query).inputValue()==="salva"&&same(paths(control.requests.slice(requests)),["PATCH /lessons/11"]),
        "C133 a lost PATCH response after a simulated commit remains uncertain without an automatic read, replay or discarded buffer");
      page.once("dialog",dialog=>dialog.accept());await page.locator("#retry-catalog").click();
      await page.waitForFunction(()=>state.catalogReady&&state.lessonsReady&&!state.catalogLoading&&!state.writeOutcomeUnknown);
      check(await page.locator("#lesson-sort").inputValue()==="7"&&await page.locator(query).inputValue()==="salva"&&patchWrites(control).length===1,
        "C133 an accepted manual read can observe the committed result without sending the PATCH again");await close(page);
    }
    {
      stage="unchanged creation contract";const {page,control}=await open();await page.locator("#clear-lesson").click();
      await page.locator("#lesson-title").fill("Nova aula 😀");await page.locator("#lesson-slug").fill("nova-aula");
      await page.locator("#lesson-body").fill("Conteúdo novo, enviado por uma ação explícita.");await page.locator("#lesson-sort").fill("7");
      const requests=control.requests.length;await page.locator("#lesson-save").click();await success(page);
      check(same(control.writes[0].body,{title:"Nova aula 😀",slug:"nova-aula",body:"Conteúdo novo, enviado por uma ação explícita.",sort_order:7})&&
        same(paths(control.requests.slice(requests)),["POST /courses/1/lessons","GET /courses/1/lessons"])&&
        await page.evaluate(()=>state.lesson.id===30&&state.lesson.sort_order===7)&&control.writes.length===1,
        "C133 lesson creation keeps its original POST fields including sort_order and never adds an expected baseline");await close(page);
    }
    {
      stage="single-flight PATCH";const {page,control,holdPatch}=await open();await textDraft(page);await page.locator("#lesson-sort").fill("7");
      const held=holdPatch();await page.locator("#lesson-save").click();await held.seen();
      await page.locator("#lesson-form").evaluate(form=>form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
      check(control.writes.length===1&&await page.evaluate(()=>state.writePending&&state.lesson.sort_order===0),
        "C133 a second submit cannot duplicate the pending PATCH or optimistically replace the authoritative order baseline");
      held.release();await success(page);
      check(control.writes.length===1&&await page.locator("#lesson-sort").inputValue()==="7",
        "C133 the pending save finishes through its original receipt and existing refresh only once");await close(page);
    }
    for(const code of [403,419]){
      stage="PATCH revocation";const {page,control}=await open();await textDraft(page);await page.locator("#lesson-sort").fill("7");
      await siblingDraft(page);await page.locator(query).fill("salva");control.commitPatch=false;control.patch={status:code,payload:{error:"access_denied"}};
      const requests=control.requests.length;await page.locator("#lesson-save").click();await page.waitForFunction(()=>state.accessDenied&&!state.writePending);
      check(await page.locator("#lesson-body").inputValue()===""&&await page.locator("#course-summary").inputValue()===""&&
        await page.locator(query).inputValue()===""&&await page.locator("#lesson-save").isDisabled()&&
        await page.locator("#catalog-recovery").isHidden()&&same(paths(control.requests.slice(requests)),["PATCH /lessons/11"]),
        "C133 HTTP "+code+" purges both buffers and the query instead of enabling conflict recovery");await close(page);
    }
    {
      stage="late success after revocation";const {page,control,holdPatch}=await open();await textDraft(page);await page.locator("#lesson-sort").fill("7");
      await page.locator(query).fill("salva");const held=holdPatch();await page.locator("#lesson-save").click();await held.seen();
      control.audit={status:403,payload:{error:"access_denied"}};await page.locator("#refresh-audit").click();await page.waitForFunction(()=>state.accessDenied);
      const requests=control.requests.length;held.release();await page.waitForFunction(()=>!state.writePending);await page.waitForLoadState("networkidle",{timeout:8000});
      check(control.requests.length===requests&&control.writes.length===1&&await page.locator("#lesson-body").inputValue()===""&&
        await page.locator(query).inputValue()===""&&await page.locator("#lesson-items [data-lesson-row]").count()===0,
        "C133 an old successful PATCH cannot refresh or restore private data after another HTTP response revoked access");await close(page);
    }
  }catch(error){failed=true;console.error("C133 lesson-order-patch stage: "+stage+"; "+String(error.message).slice(0,220));throw error;}
  finally{
    for(const held of holds)held.release();
    try{await bounded(context.close(),"context cleanup");}catch(error){if(!failed)throw error;}
  }
};
