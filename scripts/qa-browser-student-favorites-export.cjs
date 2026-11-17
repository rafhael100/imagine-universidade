"use strict";
const fs=require("node:fs");

// Invoked only by the guarded synthetic runner. The real student markup and
// handlers drive every action; controlled responses belong to this context.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce",acceptDownloads:true});
  const row={course_slug:"referencia-retirada",saved_at:"2026-11-17 10:00:00"};
  const payload=()=>({schema_version:1,scope:"current_authenticated_student",favorites:[{...row}]});
  const waitReady=page=>page.waitForFunction(()=>!document.getElementById("export-favorites").disabled);
  const waitSettled=page=>page.waitForFunction(()=>state.favoriteExportLoading===false);
  const waitStatus=(page,text)=>page.waitForFunction(value=>
    document.getElementById("favorites-export-status").textContent.includes(value),text,{timeout:8000});
  let preferenceWrites=0,completionWrites=0;
  function heldResponse(){
    let release,received;const result=new Promise(resolve=>{release=resolve;});
    return {seen:new Promise(resolve=>{received=resolve;}),release,response:async()=>{received();return result;}};
  }
  async function open({favorites=null,exportResponse=null,initialize=null,courses=null,select=true}={}){
    const page=await context.newPage();
    const control={favorites,exportResponse,initialize,courses,reads:[],favoriteReads:0,downloads:[]};
    await ensureLocalPage(page);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    page.on("download",download=>control.downloads.push(download));
    page.on("request",request=>{
      const path=new URL(request.url()).pathname;
      if(["PUT","DELETE"].includes(request.method())&&/\/courses\/\d+\/favorite$/.test(path))preferenceWrites++;
      if(request.method()==="POST"&&/\/lessons\/\d+\/complete$/.test(path))completionWrites++;
    });
    const fulfill=(route,response)=>response?.abort?route.abort("failed"):
      route.fulfill({status:response.status,contentType:"application/json",headers:{"Cache-Control":"private, no-store"},
        body:JSON.stringify(response.payload)});
    const resolve=async value=>typeof value==="function"?await value():value;
    await page.route(base+"/universidade/private/favorites/export",async route=>{
      const request=route.request();
      control.reads.push({method:request.method(),body:request.postData(),headers:request.headers()});
      await fulfill(route,(await resolve(control.exportResponse))??{status:200,payload:payload()});
    });
    await page.route(base+"/universidade/private/favorites",async route=>{
      control.favoriteReads++;
      await fulfill(route,(await resolve(control.favorites))??{status:200,payload:{course_ids:[]}});
    });
    if(initialize!==null)await page.route(base+"/universidade/private/initialize",async route=>
      fulfill(route,(await resolve(control.initialize))??{status:200,payload:{ready:true}}));
    if(courses!==null)await page.route(base+"/universidade/private/courses",async route=>
      fulfill(route,await resolve(control.courses)));
    await page.goto(base+"/student");
    if(select){
      await page.locator("#course-list [data-course-id='1']").click();
      await page.getByRole("heading",{name:"Visitas fictícias",exact:true}).waitFor({state:"visible",timeout:8000});
    }
    return {page,control};
  }
  async function download(page){
    const event=page.waitForEvent("download");
    await page.locator("#export-favorites").click();
    const file=await event;await waitStatus(page,"Arquivo de favoritos preparado");
    return {file,data:JSON.parse(fs.readFileSync(await file.path(),"utf8"))};
  }
  try{
    {
      const {page,control}=await open({exportResponse:{status:200,payload:{...payload(),favorites:[]}}});await waitReady(page);
      check(control.reads.length===0&&await page.locator(".favorite-tools #export-favorites").count()===1&&
        (await page.locator("#export-favorites").innerText())==="Exportar meus favoritos"&&
        (await page.locator("#favorites-export-status").getAttribute("aria-live"))==="polite",
        "C118 personal favorite export is an explicit accessible action in favorite tools");
      const {file,data}=await download(page);
      check(file.suggestedFilename()==="imagine-universidade-favoritos.json"&&
        JSON.stringify(data)===JSON.stringify({...payload(),favorites:[]})&&control.downloads.length===1,
        "C118 an empty private favorites history downloads a valid file with its fixed filename");
      check(control.reads.length===1&&control.reads[0].method==="GET"&&control.reads[0].body===null&&
        control.reads[0].headers["x-csrf-token"]==="ci-synthetic-csrf",
        "C118 export reads the private API without sending a person, company or course identity");
      await page.close();
    }
    {
      const extra={...payload(),subject_key:"private-subject",organization_id:42,
        favorites:[{...row,course_id:77,title:"private-title",body:"private-content",email:"private-email"}]};
      const {page,control}=await open({exportResponse:{status:200,payload:extra}});
      const {data}=await download(page);
      check(JSON.stringify(data)===JSON.stringify(payload())&&!JSON.stringify(data).includes("private-"),
        "C118 the actual downloaded JSON contains only schema, scope and allowlisted favorite references");
      check((await page.locator("#course-list").innerText()).includes("Visitas, Leads e Clientes")&&
        data.favorites[0].course_slug==="referencia-retirada"&&control.reads.length===1,
        "C118 a retained withdrawn reference remains exportable without joining current course content");
      await page.close();
    }
    {
      const held=heldResponse(),{page,control}=await open({exportResponse:held.response});
      const event=page.waitForEvent("download");
      await page.locator("#export-favorites").click();await held.seen;
      await page.locator("#export-favorites").evaluate(button=>{
        button.dispatchEvent(new Event("click",{bubbles:true}));button.dispatchEvent(new Event("click",{bubbles:true}));
      });
      await page.locator("#lesson-items [data-lesson-id='12']").click();
      await page.getByRole("heading",{name:"Leads fictícios",exact:true}).waitFor({state:"visible",timeout:8000});
      check(control.reads.length===1&&control.downloads.length===0&&await page.locator("#export-favorites").isDisabled(),
        "C118 repeated clicks and lesson navigation keep one pending export request");
      held.release({status:200,payload:payload()});const file=await event;await waitSettled(page);
      check(control.downloads.length===1&&JSON.stringify(JSON.parse(fs.readFileSync(await file.path(),"utf8")))===JSON.stringify(payload())&&
        (await page.locator("#lesson-content h3").innerText())==="Leads fictícios",
        "C118 global personal export completes without disturbing a newly selected authorized lesson");
      await page.close();
    }
    for(const favorites of [{status:503,payload:{}},{status:200,payload:{}}]){
      const {page,control}=await open({favorites});
      await page.locator("#reload-favorites").waitFor({state:"visible",timeout:8000});
      const before=await page.locator("#favorites-status").innerText();const {data}=await download(page);
      check(JSON.stringify(data)===JSON.stringify(payload())&&control.favoriteReads===1&&
        (await page.locator("#favorites-status").innerText())===before&&
        !(await page.locator("#lesson-content button.primary").isDisabled()),
        "C118 "+favorites.status+" unavailable favorites list cannot block export or overwrite its independent recovery status");
      await page.close();
    }
    {
      const held=heldResponse(),{page,control}=await open({favorites:held.response});await held.seen;
      const {data}=await download(page);
      check(data.favorites.length===1&&control.reads.length===1&&await page.locator("#favorites-only").isDisabled(),
        "C118 pending favorites lookup does not delay the authorized private export");
      held.release({status:200,payload:{course_ids:[]}});
      await page.waitForFunction(()=>!document.getElementById("favorites-only").disabled);await page.close();
    }
    {
      const {page}=await open({courses:{status:200,payload:{courses:[]}},select:false});await waitReady(page);
      const {data}=await download(page);
      check((await page.locator("#course-list [data-course-id]").count())===0&&data.favorites[0].course_slug===row.course_slug,
        "C118 a legitimately empty authorized catalogue still permits retained favorite references");
      await page.close();
    }
    {
      const {page,control}=await open({initialize:{status:200,payload:{}},select:false});
      await page.locator("#library-recovery").waitFor({state:"visible",timeout:8000});
      await page.locator("#export-favorites").evaluate(button=>button.dispatchEvent(new Event("click",{bubbles:true})));
      check(await page.locator("#export-favorites").isDisabled()&&control.reads.length===0,
        "C118 an unconfirmed library initialization cannot start a private export");
      control.initialize={status:200,payload:{ready:true}};await page.locator("#retry-library").click();await waitReady(page);
      const {data}=await download(page);
      check(data.favorites.length===1&&control.reads.length===1,
        "C118 successful manual authorization recovery makes export available without automatic downloads");
      await page.close();
    }
    {
      const malformed=[{...payload(),schema_version:2},{...payload(),scope:"other_student"},
        {...payload(),favorites:[row,row]},{...payload(),favorites:[{...row,course_slug:"other/person"}]},
        {...payload(),favorites:[{...row,saved_at:"yesterday"}]},{...payload(),favorites:[{title:"missing reference"}]}];
      const {page,control}=await open();
      for(let index=0;index<malformed.length;index++){
        control.exportResponse={status:200,payload:malformed[index]};
        await page.locator("#export-favorites").click();await waitSettled(page);await waitStatus(page,"validação de privacidade");
        check(control.downloads.length===0&&control.reads.length===index+1&&!(await page.locator("#export-favorites").isDisabled()),
          "C118 malformed export "+(index+1)+" produces no file and requires another explicit action");
      }
      control.exportResponse=null;const {data}=await download(page);
      check(data.favorites.length===1&&control.downloads.length===1&&control.reads.length===malformed.length+1,
        "C118 valid manual retry recovers from rejected export payloads without replay");
      await page.close();
    }
    for(const exportResponse of [{status:503,payload:{private_detail:"not for display"}},{abort:true}]){
      const {page,control}=await open({exportResponse});await page.locator("#export-favorites").click();
      await waitSettled(page);await waitStatus(page,"Não foi possível exportar");
      check(control.downloads.length===0&&control.reads.length===1&&
        !(await page.locator("#lesson-content button.primary").isDisabled())&&!(await page.locator("#export-progress").isDisabled())&&
        !(await page.locator("#favorites-export-status").innerText()).includes("private_detail"),
        "C118 "+(exportResponse.abort?"network":"503")+" export failure leaves study and progress export usable with no automatic retry");
      await page.close();
    }
    for(const status of [403,419]){
      const {page,control}=await open({exportResponse:{status,payload:payload()}});
      await page.locator("#export-favorites").click();await waitSettled(page);
      await page.waitForFunction(()=>document.getElementById("overall-progress").textContent.includes("Acesso à Universidade encerrado"));
      check(control.downloads.length===0&&(await page.locator("#course-list [data-course-id]").count())===0&&
        (await page.locator("#lesson-content h3").count())===0&&await page.locator("#course-favorite-panel").isHidden()&&
        await page.locator("#export-favorites").isDisabled()&&await page.locator("#favorites-export-status").isHidden(),
        "C118 "+status+" during export clears private courses, lesson, favorite controls and export status");
      await page.locator("#export-favorites").evaluate(button=>button.dispatchEvent(new Event("click",{bubbles:true})));
      check(control.reads.length===1&&control.downloads.length===0,
        "C118 a revoked export cannot be retried by a synthetic click event");
      await page.close();
    }
    {
      const held=heldResponse(),{page,control}=await open({favorites:{status:503,payload:{}},exportResponse:held.response});
      await page.locator("#reload-favorites").waitFor({state:"visible",timeout:8000});
      await page.locator("#export-favorites").click();await held.seen;
      control.favorites={status:403,payload:{}};await page.locator("#reload-favorites").click();
      await page.waitForFunction(()=>document.getElementById("overall-progress").textContent.includes("Acesso à Universidade encerrado"));
      held.release({status:200,payload:payload()});await waitSettled(page);
      check(control.downloads.length===0&&control.reads.length===1&&await page.locator("#export-favorites").isDisabled()&&
        (await page.locator("#favorites-export-status").innerText())===""&&
        (await page.locator("#lesson-content h3").count())===0,
        "C118 late successful export after revocation by another request cannot download or restore private UI");
      await page.close();
    }
    check(preferenceWrites===0&&completionWrites===0,
      "C118 all private export scenarios make zero favorite mutations and zero lesson completion POSTs");
  }finally{await context.close();}
};
