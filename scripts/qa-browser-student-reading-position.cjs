"use strict";
const fs=require("node:fs");

// Invoked by the guarded synthetic runner. Each page owns its position routes;
// the normal course/lesson fixture and real student markup remain in use.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce",acceptDownloads:true});
  context.setDefaultTimeout(8000);context.setDefaultNavigationTimeout(15000);
  const api=base+"/universidade/private",pending=[];
  const none=revision=>({schema_version:1,scope:"current_authenticated_student",status:"none",revision,position:null});
  const available=(id=11,revision="opaque-slot-1",version=1)=>({...none(revision),status:"available",
    position:{course_id:1,course_version:version,lesson_id:id,saved_at:"2026-11-17T10:00:00Z"}});
  const unavailable=revision=>({...none(revision),status:"unavailable"});
  const reference={course_slug:"trilha-visitas-seja-encontrado",course_version:1,lesson_slug:"visitas-ficticias",saved_at:"2026-11-17T10:00:00Z"};
  let stage="initial position",completionWrites=0;
  async function bounded(promise,label,ms=8000){
    let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error("C121 timeout: "+label)),ms);
    })]);}finally{clearTimeout(timer);}
  }
  function heldResponse(label){
    let release,received;const result=new Promise(resolve=>{release=resolve;});
    const seen=new Promise(resolve=>{received=resolve;});pending.push(()=>release({status:503,payload:{}}));
    return {release,wait:()=>bounded(seen,label),response:async()=>{received();return result;}};
  }
  const waitSettled=page=>page.waitForFunction(()=>!state.readingLoading&&!state.readingWriting&&!state.readingReturning);
  const waitStatus=(page,text)=>page.waitForFunction(value=>document.getElementById("reading-position-status").textContent.includes(value),text);
  const options=async page=>{
    if(!(await page.locator("#reading-position-options").evaluate(node=>node.open)))
      await page.locator("#reading-position-options summary").click();
  };
  async function open({store={snapshot:none("opaque-initial-ticket"),retained:null,revision:0},read=null,write=null,exportResponse=null,settle=true}={}){
    const page=await context.newPage();await ensureLocalPage(page);
    const control={store,read,write,exportResponse,reads:0,writes:[],exports:0,downloads:[],lessonReads:[]};
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    page.on("download",file=>control.downloads.push(file));
    page.on("request",request=>{
      const path=new URL(request.url()).pathname;
      if(request.method()==="POST"&&/\/lessons\/\d+\/complete$/.test(path))completionWrites++;
      if(request.method()==="GET"&&/\/lessons\/\d+$/.test(path))control.lessonReads.push(Number(path.split("/").at(-1)));
    });
    const send=(route,result)=>route.fulfill({status:result.status,contentType:"application/json",
      headers:{"Cache-Control":"private, no-store"},body:JSON.stringify(result.payload)});
    const resolve=async(value,request)=>typeof value==="function"?await value(request):value;
    await page.route(api+"/reading-position",async route=>{
      const method=route.request().method();let result;
      if(method==="GET"){
        control.reads++;result=(await resolve(control.read))??{status:200,payload:store.snapshot};
      }else if(method==="PUT"||method==="DELETE"){
        const request={method,body:route.request().postDataJSON()};control.writes.push(request);
        result=await resolve(control.write,request);
        if(!result){
          if(request.body.expected_revision!==store.snapshot.revision||(method==="DELETE"&&store.snapshot.status==="none"))
            result={status:409,payload:{error:"reading_position_changed"}};
          else{
            const revision="opaque-slot-"+(++store.revision);
            if(method==="DELETE"){store.snapshot=none(revision);store.retained=null;}
            else{
              store.snapshot=available(request.body.lesson_id,revision,request.body.course_version);
              store.retained={...reference,course_version:request.body.course_version,
                lesson_slug:request.body.lesson_id===11?"visitas-ficticias":"leads-ficticios"};
            }
            result={status:200,payload:store.snapshot};
          }
        }
      }else result={status:405,payload:{}};
      await send(route,result);
    });
    await page.route(api+"/reading-position/export",async route=>{
      control.exports++;
      await send(route,(await resolve(control.exportResponse))??{status:200,payload:{
        schema_version:1,scope:"current_authenticated_student",reading_position:store.retained}});
    });
    await page.goto(base+"/student");await page.locator("#course-list [data-course-id='1']").click();
    await page.getByRole("heading",{name:"Visitas fictícias",exact:true}).waitFor({state:"visible"});
    if(settle)await waitSettled(page);
    return {page,control};
  }
  async function download(page){
    await options(page);const event=page.waitForEvent("download");await page.locator("#export-reading-position").click();
    const file=await event;
    await page.waitForFunction(()=>!state.readingExportLoading);
    const path=await bounded(file.path(),"reading position download completion");
    return {file,data:JSON.parse(fs.readFileSync(path,"utf8"))};
  }
  try{
    {
      const {page,control}=await open();
      check(control.reads===1&&control.writes.length===0&&await page.locator("#reading-position-panel").isVisible()&&
        (await page.locator("#resume-course").innerText())==="Continuar aulas pendentes"&&
        (await page.locator("#reading-position-status").innerText()).includes("Nenhuma aula guardada"),
        "C121 initial position is a private read with separate pending-lesson and saved-lesson actions");
      await page.locator("#save-reading-position").click();await waitSettled(page);
      check(control.writes.length===1&&control.writes[0].method==="PUT"&&
        JSON.stringify(control.writes[0].body)===JSON.stringify({course_id:1,course_version:1,lesson_id:11,expected_revision:"opaque-initial-ticket"})&&
        (await page.locator("#save-reading-position").innerText())==="Esta aula está guardada"&&
        !(await page.locator("#lesson-content button.primary").isDisabled()),
        "C121 an explicit save sends only the exact target and opaque revision without completing the lesson");
      await page.locator("#save-reading-position").evaluate(button=>button.dispatchEvent(new Event("click",{bubbles:true})));
      check(control.writes.length===1&&await page.locator("#save-reading-position").isDisabled(),
        "C121 saving an already confirmed current lesson cannot repeat the mutation");
      await page.locator("#lesson-items [data-lesson-id='12']").click();
      await page.getByRole("heading",{name:"Leads fictícios",exact:true}).waitFor({state:"visible"});
      check(control.writes.length===1&&control.reads===1&&
        (await page.locator("#reading-position-replace-hint").innerText()).includes("substitui"),
        "C121 navigating to another lesson never moves the stored position automatically");
      await page.locator("#save-reading-position").click();await waitSettled(page);
      await page.bringToFront();await page.waitForFunction(()=>document.hasFocus()&&document.visibilityState==="visible");
      await page.locator('[data-filter="sistemas"]').click();await page.locator("#resume-reading-position").click();
      await page.getByRole("heading",{name:"Leads fictícios",exact:true}).waitFor({state:"visible"});await waitSettled(page);
      check(control.reads===2&&control.writes.length===2&&control.lessonReads.at(-1)===12&&
        (await page.locator('[data-filter="todos"]').getAttribute("aria-pressed"))==="true",
        "C121 resume revalidates then opens the exact saved lesson and clears a hiding category without a new write");
      check(await page.locator("#lesson-content h3").evaluate(node=>document.activeElement===node)&&
        (await page.locator("#lesson-content button.primary").count())===1,
        "C121 exact saved navigation focuses the lesson heading and keeps completion as the only primary lesson action");
      await page.close();
    }
    {
      stage="two tabs";const store={snapshot:none("ticket-shared"),retained:null,revision:0};
      const a=await open({store}),b=await open({store});
      await b.page.locator("#lesson-items [data-lesson-id='12']").click();
      await b.page.getByRole("heading",{name:"Leads fictícios",exact:true}).waitFor({state:"visible"});
      await a.page.locator("#save-reading-position").click();await waitSettled(a.page);
      await b.page.locator("#save-reading-position").click();await waitStatus(b.page,"Sua posição mudou ou a consulta expirou");
      check(b.control.writes.length===1&&b.control.reads===1&&store.snapshot.position.lesson_id===11&&
        await b.page.locator("#reload-reading-position").isVisible(),
        "C121 a stale second tab receives a conflict without renewing its revision or repeating the write");
      await b.page.locator("#reload-reading-position").click();await waitSettled(b.page);
      await b.page.locator("#save-reading-position").click();await waitSettled(b.page);
      check(b.control.reads===2&&b.control.writes.length===2&&store.snapshot.position.lesson_id===12,
        "C121 another save after an explicit query uses the current opaque revision");
      await options(a.page);await a.page.locator("#remove-reading-position").click();await waitSettled(a.page);
      check(a.control.writes.length===2&&a.control.reads===1&&store.snapshot.position.lesson_id===12,
        "C121 an older tab cannot silently erase the new saved reference");
      await a.page.close();await b.page.close();
    }
    {
      stage="unavailable reference";
      const store={snapshot:unavailable("withdrawn-slot"),retained:{...reference},revision:0};
      const {page,control}=await open({store});
      check(await page.locator("#resume-reading-position").isHidden()&&
        (await page.locator("#reading-position-status").innerText()).includes("não está disponível nesta versão"),
        "C121 a withdrawn version has no resume action and exposes no lesson content in the position panel");
      const {file,data}=await download(page);
      check(file.suggestedFilename()==="imagine-universidade-posicao-leitura.json"&&
        JSON.stringify(data)===JSON.stringify({schema_version:1,scope:"current_authenticated_student",reading_position:reference}),
        "C121 an unavailable own reference still exports only course slug, version, lesson slug and saved date");
      await page.locator("#remove-reading-position").click();await waitSettled(page);
      check(control.writes.length===1&&control.writes[0].method==="DELETE"&&
        JSON.stringify(control.writes[0].body)===JSON.stringify({expected_revision:"withdrawn-slot"})&&
        store.snapshot.status==="none"&&await page.locator("#remove-reading-position").isHidden(),
        "C121 removal of an unavailable reference uses only its own revision and confirms the empty slot");
      await page.close();
    }
    {
      stage="expired initial ticket";
      const {page,control}=await open({write:{status:409,payload:{error:"reading_position_changed"}}});
      await page.locator("#save-reading-position").click();await waitSettled(page);
      await page.locator("#save-reading-position").evaluate(button=>button.dispatchEvent(new Event("click",{bubbles:true})));
      check(control.reads===1&&control.writes.length===1&&await page.locator("#reload-reading-position").isVisible(),
        "C121 an expired absence ticket requires a manual query and never starts a silent preflight");
      control.write=null;control.store.snapshot=none("fresh-absence-ticket");
      await page.locator("#reload-reading-position").click();await waitSettled(page);
      await page.locator("#save-reading-position").click();await waitSettled(page);
      check(control.reads===2&&control.writes.length===2&&control.writes[1].body.expected_revision==="fresh-absence-ticket",
        "C121 ticket recovery requires both the explicit query and a new save click");
      await page.close();
    }
    for(const payload of [{},{...none("ticket"),scope:"other"},{...available(),position:null}]){
      stage="invalid position payload";const {page,control}=await open({read:{status:200,payload}});
      const blocked=await page.locator("#save-reading-position").isDisabled()&&await page.locator("#reload-reading-position").isVisible();
      control.read=null;await page.locator("#reload-reading-position").click();await waitSettled(page);
      check(blocked&&control.writes.length===0&&control.reads===2&&!(await page.locator("#save-reading-position").isDisabled())&&
        !(await page.locator("#lesson-content button.primary").isDisabled()),
        "C121 malformed position response blocks its writes and recovers manually without blocking study");
      await page.close();
    }
    {
      stage="pending position read";const held=heldResponse("initial position GET");
      const {page,control}=await open({read:held.response,settle:false});await held.wait();
      check((await page.locator("#lesson-content h3").innerText())==="Visitas fictícias"&&
        !(await page.locator("#lesson-content button.primary").isDisabled())&&await page.locator("#save-reading-position").isDisabled(),
        "C121 pending position lookup cannot delay authorized lesson reading or completion");
      held.release({status:503,payload:{}});await waitSettled(page);
      control.read=null;await page.locator("#reload-reading-position").click();await waitSettled(page);
      check(control.reads===2&&control.writes.length===0&&!(await page.locator("#save-reading-position").isDisabled()),
        "C121 failed position GET enables only deliberate query recovery");
      await page.close();
    }
    for(const receipt of [available(12,"wrong-target"),available(11,"opaque-initial-ticket")]){
      stage="invalid receipt";const {page,control}=await open();
      control.write=()=>{control.store.snapshot=available(11,"actually-committed");return{status:200,payload:receipt};};
      await page.locator("#save-reading-position").click();await waitStatus(page,"confirmada após consulta");
      check(control.writes.length===1&&control.reads===2&&await page.locator("#save-reading-position").isDisabled(),
        "C121 mismatched or unchanged receipt requires a read-only reconciliation with no repeated PUT");
      await page.close();
    }
    {
      stage="unknown mutation outcome";const {page,control}=await open();
      control.write={status:503,payload:{}};control.read={status:503,payload:{}};
      await page.locator("#save-reading-position").click();await waitStatus(page,"resultado não pôde ser confirmado");
      await page.locator("#save-reading-position").evaluate(button=>button.dispatchEvent(new Event("click",{bubbles:true})));
      check(control.writes.length===1&&control.reads===2&&await page.locator("#save-reading-position").isDisabled(),
        "C121 unknown save outcome freezes further changes until a manual authoritative query");
      control.read=null;control.store.snapshot=available(11,"committed-after-loss");
      await page.locator("#reload-reading-position").click();await waitSettled(page);
      check(control.reads===3&&control.writes.length===1&&(await page.locator("#save-reading-position").innerText())==="Esta aula está guardada",
        "C121 manual reconciliation exposes current position without replaying the failed request");
      await page.close();
    }
    {
      stage="late save after navigation";const held=heldResponse("position PUT"),{page,control}=await open({write:held.response});
      await page.locator("#save-reading-position").click();await held.wait();
      await page.locator("#save-reading-position").evaluate(button=>button.dispatchEvent(new Event("click",{bubbles:true})));
      check(control.writes.length===1&&await page.locator("#save-reading-position").isDisabled(),
        "C121 repeated save events remain single-flight without optimistic confirmation");
      await page.locator("#lesson-items [data-lesson-id='12']").click();
      await page.getByRole("heading",{name:"Leads fictícios",exact:true}).waitFor({state:"visible"});
      held.release({status:200,payload:available(11,"new-slot")});await waitSettled(page);
      check(control.writes.length===1&&control.reads===1&&(await page.locator("#lesson-content h3").innerText())==="Leads fictícios"&&
        await page.locator("#save-reading-position").isDisabled()&&await page.locator("#reload-reading-position").isVisible(),
        "C121 a late receipt for the previous selection cannot label the new lesson as saved");
      await page.close();
    }
    {
      stage="late resume after filter";const {page,control}=await open({store:{snapshot:available(12),retained:null,revision:1}});
      const held=heldResponse("resume position GET");control.read=held.response;
      await page.locator("#resume-reading-position").click();await held.wait();await page.locator('[data-filter="sistemas"]').click();
      held.release({status:200,payload:available(12)});await waitSettled(page);
      check((await page.locator('[data-filter="sistemas"]').getAttribute("aria-pressed"))==="true"&&
        (await page.locator("#lesson-content h3").count())===0&&control.writes.length===0,
        "C121 changing filters cancels a pending resume jump while retaining the global saved position");
      await page.close();
    }
    {
      stage="exact saved version";const {page,control}=await open({store:{snapshot:available(11),retained:null,revision:1}});
      await page.route(api+"/lessons/11",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({lesson:{
        id:11,slug:"visitas-ficticias",title:"Visitas fictícias",body:"Material sintético de outra versão.",sort_order:0,course_id:1,course_version:2}})}));
      await page.locator("#resume-reading-position").click();
      await page.locator(".lesson-detail-retry").waitFor({state:"visible"});
      check((await page.locator("#lesson-content h3").count())===0&&(await page.locator("#status").innerText()).includes("versão guardada"),
        "C121 a saved lesson response from another version never renders its heading, body or completion");
      await page.locator(".lesson-detail-retry").click();await page.locator(".lesson-detail-retry").waitFor({state:"visible"});
      check((await page.locator("#lesson-content h3").count())===0&&control.lessonReads.at(-1)===11&&control.writes.length===0,
        "C121 manual detail retry preserves the saved version constraint and exact lesson ID");
      await page.close();
    }
    {
      stage="missing saved lesson";const {page,control}=await open({store:{snapshot:available(11),retained:null,revision:1}});
      await page.route(api+"/courses/1/lessons",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
        lessons:[{id:12,slug:"leads-ficticios",title:"Leads fictícios",sort_order:1,completed:0}]})}));
      await page.locator("#resume-reading-position").click();
      await page.waitForFunction(()=>document.getElementById("lesson-content").textContent.includes("não está mais disponível"));
      check((await page.locator("#lesson-content h3").count())===0&&control.lessonReads.at(-1)===11&&control.writes.length===0,
        "C121 missing saved lesson never falls back to the first pending lesson of the course");
      await page.close();
    }
    for(const status of [403,419])for(const operation of ["read","write","export"]){
      stage=operation+" revocation "+status;const {page,control}=await open();
      if(operation==="read"){
        control.write={status:409,payload:{}};await page.locator("#save-reading-position").click();await waitSettled(page);
        control.read={status,payload:{}};await page.locator("#reload-reading-position").click();
      }else if(operation==="write"){
        control.write={status,payload:{}};await page.locator("#save-reading-position").click();
      }else{
        control.exportResponse={status,payload:{}};await options(page);await page.locator("#export-reading-position").click();
      }
      await page.waitForFunction(()=>state.accessDenied&&!state.readingLoading&&!state.readingWriting&&!state.readingExportLoading);
      check(await page.locator("#reading-position-panel").isHidden()&&(await page.locator("#reading-position-status").innerText())===""&&
        (await page.locator("#lesson-content h3").count())===0&&(await page.locator("#course-list [data-course-id]").count())===0&&
        control.downloads.length===0,
        "C121 "+status+" on "+operation+" purges saved position, private lessons and pending download status");
      await page.close();
    }
    {
      stage="export allowlist and malformed response";const {page,control}=await open();
      control.exportResponse={status:200,payload:{schema_version:1,scope:"current_authenticated_student",revision:"private-token",
        reading_position:{...reference,person:"private-person",lesson_id:11,title:"private-title"}}};
      const {data}=await download(page);
      check(JSON.stringify(data)===JSON.stringify({schema_version:1,scope:"current_authenticated_student",reading_position:reference}),
        "C121 downloaded position uses an allowlist and strips identity, revision, internal IDs and titles");
      control.exportResponse={status:200,payload:{schema_version:1,scope:"current_authenticated_student",reading_position:{...reference,course_version:"1"}}};
      await page.locator("#export-reading-position").click();await page.waitForFunction(()=>!state.readingExportLoading);
      check(control.downloads.length===1&&!(await page.locator("#export-reading-position").isDisabled()),
        "C121 malformed export cannot create another file and permits an explicit retry");
      await page.close();
    }
    {
      stage="late export after revocation";const held=heldResponse("position export"),{page,control}=await open({exportResponse:held.response});
      await options(page);await page.locator("#export-reading-position").click();await held.wait();
      await page.route(api+"/lessons/12/progress",route=>route.fulfill({status:403,contentType:"application/json",body:'{"error":"access_denied"}'}));
      await page.locator("#lesson-items [data-lesson-id='12']").click();await page.waitForFunction(()=>state.accessDenied);
      held.release({status:200,payload:{schema_version:1,scope:"current_authenticated_student",reading_position:reference}});
      await page.waitForFunction(()=>!state.readingExportLoading);
      check(control.downloads.length===0&&(await page.locator("#reading-position-export-status").innerText())===""&&
        await page.locator("#reading-position-panel").isHidden(),
        "C121 an export arriving after revocation elsewhere cannot download or restore private state");
      await page.close();
    }
    check(completionWrites===0,"C121 all saved-position browser scenarios make zero lesson completion POSTs");
  }catch(error){
    console.error("C121 failure before browser cleanup: "+stage+"; "+String(error.message).split("\n")[0].slice(0,240));throw error;
  }finally{
    for(const release of pending)release();
    await bounded(context.close(),"position context cleanup");
  }
};
