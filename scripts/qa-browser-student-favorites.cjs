"use strict";

// Called by the guarded synthetic runner. Only the favorites endpoints are
// controlled here; real student markup and the main lesson fixtures remain.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
  let completionWrites=0;
  const waitStatus=(page,text)=>page.waitForFunction(value=>
    document.getElementById("favorites-status").textContent.includes(value),text,{timeout:8000});
  const waitReady=page=>page.waitForFunction(()=>!document.getElementById("favorites-only").disabled);
  async function waitHeld(seen){
    let timer;
    try{return await Promise.race([seen,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error("C116 expected request was not observed within 8 seconds")),8000);
    })]);}finally{clearTimeout(timer);}
  }
  function heldResponse(){
    let release,received;const result=new Promise(resolve=>{release=resolve;});
    return {seen:new Promise(resolve=>{received=resolve;}),release,
      response:async()=>{received();return result;}};
  }
  async function open({favoriteIds=[],read=null,write=null}={}){
    const page=await context.newPage();
    const control={favoriteIds:new Set(favoriteIds),read,write,reads:0,writes:[]};
    await ensureLocalPage(page);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    page.on("request",request=>{
      if(request.method()==="POST"&&/\/lessons\/\d+\/complete$/.test(new URL(request.url()).pathname))completionWrites++;
    });
    const fulfill=(route,response)=>route.fulfill({status:response.status,contentType:"application/json",
      headers:{"Cache-Control":"private, no-store"},body:JSON.stringify(response.payload)});
    await page.route(base+"/universidade/private/favorites",async route=>{
      if(route.request().method()!=="GET")return route.continue();
      control.reads++;
      const response=typeof control.read==="function"?await control.read():control.read;
      await fulfill(route,response??{status:200,payload:{course_ids:Array.from(control.favoriteIds)}});
    });
    await page.route(base+"/universidade/private/courses/*/favorite",async route=>{
      const method=route.request().method();if(!["PUT","DELETE"].includes(method))return route.continue();
      const courseId=Number(new URL(route.request().url()).pathname.split("/").at(-2));
      const favorite=method==="PUT";
      control.writes.push({method,courseId,body:route.request().postData()});
      let response=typeof control.write==="function"?await control.write({courseId,favorite}):control.write;
      if(!response){
        if(favorite)control.favoriteIds.add(courseId);else control.favoriteIds.delete(courseId);
        response={status:200,payload:{course_id:courseId,favorite}};
      }
      await fulfill(route,response);
    });
    await page.goto(base+"/student");
    await page.locator("#course-list [data-course-id='1']").click();
    await page.getByRole("heading",{name:"Visitas fictícias",exact:true}).waitFor({state:"visible",timeout:8000});
    return {page,control};
  }
  const selectCourse=async page=>{
    await page.locator("#course-list [data-course-id='1']").click();
    await page.getByRole("heading",{name:"Visitas fictícias",exact:true}).waitFor({state:"visible",timeout:8000});
  };
  try{
    {
      const {page,control}=await open();await waitReady(page);
      check((await page.locator("#course-favorite-toggle").innerText())==="Salvar curso nos favoritos" &&
        (await page.locator("#course-list [data-course-id] button").count())===0 && control.writes.length===0,
        "C116 empty favorites permit a separate save action without nested course buttons or automatic writes");
      await page.locator("#favorites-only").check();
      check((await page.locator("#course-list [data-course-id]").count())===0 &&
        (await page.locator("#course-list").innerText()).includes("Nenhum curso favorito"),
        "C116 an explicit empty favorites array is a valid empty filtered library");
      await page.locator("#favorites-only").uncheck();await selectCourse(page);
      await page.locator("#course-favorite-toggle").click();await waitStatus(page,"Curso salvo nos favoritos.");
      check((await page.locator("#course-favorite-toggle").innerText())==="Remover curso dos favoritos" &&
        (await page.locator("#course-list [data-course-id='1']").innerText()).includes("Salvo nos favoritos") &&
        control.writes.length===1 && control.writes[0].method==="PUT" && control.writes[0].body===null,
        "C116 confirmed PUT updates the favorite badge without sending identity or tenant data");
      await page.locator("#favorites-only").check();
      await page.locator('[data-filter="negocios"]').click();
      const categoryEmpty=(await page.locator("#course-list [data-course-id]").count())===0;
      await page.locator('[data-filter="todos"]').click();
      await page.locator("#course-search").fill("absent-topic");
      check(categoryEmpty && await page.locator("#favorites-only").isChecked() &&
        (await page.locator("#course-list [data-course-id]").count())===0 && control.writes.length===1,
        "C116 favorite filter combines with category and search without changing the preference");
      await page.locator("#course-search").fill("");await selectCourse(page);
      await page.locator("#course-favorite-toggle").click();await waitStatus(page,"Curso removido dos favoritos.");
      check(control.writes.length===2 && control.writes[1].method==="DELETE" &&
        (await page.locator("#course-list [data-course-id]").count())===0 &&
        (await page.locator("#lesson-content h3").innerText())==="Visitas fictícias" &&
        !(await page.locator("#lesson-content button.primary").isDisabled()),
        "C116 confirmed removal updates the filtered list while the selected lesson remains usable");
      await page.close();
    }
    {
      const held=heldResponse(),{page,control}=await open({read:held.response});await waitHeld(held.seen);
      check((await page.locator("#lesson-content h3").innerText())==="Visitas fictícias" &&
        !(await page.locator("#lesson-content button.primary").isDisabled()) &&
        !(await page.locator("#export-progress").isDisabled()) && await page.locator("#favorites-only").isDisabled(),
        "C116 pending favorite GET cannot block the authorized library, lesson or completion");
      held.release({status:503,payload:{}});
      await page.locator("#reload-favorites").waitFor({state:"visible",timeout:8000});
      check(await page.locator("#course-favorite-toggle").isDisabled() && control.reads===1 && control.writes.length===0,
        "C116 failed initial GET offers manual recovery without fabricating empty success");
      control.read=null;await page.locator("#reload-favorites").click();await waitReady(page);
      check(!(await page.locator("#course-favorite-toggle").isDisabled()) && control.reads===2 && control.writes.length===0,
        "C116 valid manual GET restores favorite controls without any mutation");
      await page.close();
    }
    for(const payload of [{},{course_ids:[1,1]},{course_ids:["1"]}]){
      const {page,control}=await open({read:{status:200,payload}});
      await page.locator("#reload-favorites").waitFor({state:"visible",timeout:8000});
      check(await page.locator("#course-favorite-toggle").isDisabled() &&
        (await page.locator("#course-list [data-course-id]").count())===1 &&
        !(await page.locator("#lesson-content button.primary").isDisabled()),
        "C116 malformed 200 favorite list cannot enable writes or disable normal study");
      control.read=null;control.favoriteIds.add(1);
      await page.locator("#reload-favorites").click();await waitReady(page);
      check((await page.locator("#course-favorite-toggle").innerText())==="Remover curso dos favoritos" && control.writes.length===0,
        "C116 a valid retry recovers exact favorite membership after malformed 200");
      await page.close();
    }
    {
      const {page}=await open({favoriteIds:[1,999]});await waitReady(page);
      await page.locator("#favorites-only").check();
      check((await page.locator("#course-list [data-course-id]").count())===1 &&
        (await page.locator("#course-list [data-course-id='999']").count())===0,
        "C116 favorites only display courses from the currently authorized catalogue");
      await page.close();
    }
    for(const receipt of [{course_id:2,favorite:true},{course_id:1,favorite:"true"},{course_id:1,favorite:false}]){
      const {page,control}=await open();await waitReady(page);
      control.write=()=>{control.favoriteIds.add(1);return{status:200,payload:receipt};};
      await page.locator("#course-favorite-toggle").click();await waitStatus(page,"Favorito confirmado após consulta");
      check(control.writes.length===1 && control.reads===2 &&
        (await page.locator("#course-favorite-toggle").innerText())==="Remover curso dos favoritos",
        "C116 mismatched receipt requires authoritative GET and never repeats PUT");
      await page.close();
    }
    for(const favoriteIds of [[],[1]]){
      const {page,control}=await open({favoriteIds});await waitReady(page);
      control.write=({courseId,favorite})=>{
        if(favorite)control.favoriteIds.add(courseId);else control.favoriteIds.delete(courseId);
        return{status:503,payload:{}};
      };
      await page.locator("#course-favorite-toggle").click();
      await waitStatus(page,favoriteIds.length?"Remoção confirmada após consulta":"Favorito confirmado após consulta");
      check(control.writes.length===1 && control.reads===2 &&
        (await page.locator("#course-favorite-toggle").innerText())===(favoriteIds.length?"Salvar curso nos favoritos":"Remover curso dos favoritos"),
        "C116 lost "+(favoriteIds.length?"DELETE":"PUT")+" response reconciles the committed preference without replay");
      await page.close();
    }
    {
      const {page,control}=await open();await waitReady(page);control.write={status:503,payload:{}};
      await page.locator("#course-favorite-toggle").click();await waitStatus(page,"A alteração não foi confirmada");
      check(control.writes.length===1 && !(await page.locator("#course-favorite-toggle").isDisabled()) &&
        (await page.locator("#course-favorite-toggle").innerText())==="Salvar curso nos favoritos",
        "C116 verified uncommitted preference permits an explicit retry without automatic repetition");
      await page.close();
    }
    {
      const {page,control}=await open();await waitReady(page);
      control.write={status:503,payload:{}};control.read={status:503,payload:{}};
      await page.locator("#course-favorite-toggle").click();await waitStatus(page,"O resultado não pôde ser confirmado");
      await page.locator("#course-favorite-toggle").evaluate(button=>button.dispatchEvent(new Event("click",{bubbles:true})));
      check(control.writes.length===1 && await page.locator("#course-favorite-toggle").isDisabled() &&
        await page.locator("#reload-favorites").isVisible(),
        "C116 unknown mutation outcome blocks further writes until manual reconciliation");
      control.read=null;control.favoriteIds.add(1);
      await page.locator("#reload-favorites").click();await waitReady(page);
      check((await page.locator("#course-favorite-toggle").innerText())==="Remover curso dos favoritos" && control.writes.length===1,
        "C116 manual read unlocks the verified preference without replaying the uncertain write");
      await page.close();
    }
    {
      const {page,control}=await open();await waitReady(page);const held=heldResponse();control.write=held.response;
      await page.locator("#course-favorite-toggle").click();await waitHeld(held.seen);
      await page.locator("#course-favorite-toggle").evaluate(button=>button.dispatchEvent(new Event("click",{bubbles:true})));
      check(control.writes.length===1 && await page.locator("#course-favorite-toggle").isDisabled() &&
        !(await page.locator("#course-list [data-course-id='1']").innerText()).includes("Salvo nos favoritos") &&
        !(await page.locator("#lesson-content button.primary").isDisabled()),
        "C116 favorite mutation is single flight and never marks the course optimistically");
      await page.locator("#lesson-items [data-lesson-id='12']").click();
      await page.getByRole("heading",{name:"Leads fictícios",exact:true}).waitFor({state:"visible",timeout:8000});
      control.favoriteIds.add(1);
      held.release({status:200,payload:{course_id:1,favorite:true}});await waitStatus(page,"Curso salvo nos favoritos.");
      check((await page.locator("#lesson-content h3").innerText())==="Leads fictícios" &&
        (await page.locator("#course-favorite-toggle").innerText())==="Remover curso dos favoritos" && control.writes.length===1,
        "C116 changing lessons within the same course preserves compatible favorite confirmation");
      await page.close();
    }
    for(const destination of ["filter","reselected course"]){
      const {page,control}=await open();await waitReady(page);const held=heldResponse();control.write=held.response;
      await page.locator("#course-favorite-toggle").click();await waitHeld(held.seen);
      if(destination==="filter")await page.locator('[data-filter="negocios"]').click();
      else await selectCourse(page);
      held.release({status:200,payload:{course_id:1,favorite:true}});
      await waitStatus(page,"A seleção mudou durante a alteração");
      check(control.writes.length===1 && control.reads===1 && await page.locator("#reload-favorites").isVisible(),
        "C116 late receipt after "+destination+" is withheld until explicit state verification");
      control.favoriteIds.add(1);await page.locator("#reload-favorites").click();await waitReady(page);
      await page.locator('[data-filter="todos"]').click();
      check((await page.locator("#course-list [data-course-id='1']").innerText()).includes("Salvo nos favoritos") &&
        control.reads===2 && control.writes.length===1,
        "C116 manual read recovers the preference after incompatible "+destination+" navigation");
      await page.close();
    }
    for(const status of [403,419]){
      const {page,control}=await open();await waitReady(page);control.write={status,payload:{}};
      await page.locator("#course-favorite-toggle").click();
      await page.waitForFunction(()=>document.getElementById("course-list").textContent.includes("Biblioteca indisponível"));
      check((await page.locator("#course-list [data-course-id]").count())===0 &&
        !(await page.locator("#course-favorite-panel").isVisible()) &&
        await page.locator("#favorites-only").isDisabled() &&
        (await page.locator("#favorites-status").innerText())==="" && control.reads===1 && control.writes.length===1,
        "C116 "+status+" purges favorite data and locks the entire private interface without reconciliation");
      await page.close();
    }
    {
      const {page,control}=await open();await waitReady(page);
      control.write={status:404,payload:{}};control.read={status:403,payload:{}};
      await page.locator("#course-favorite-toggle").click();
      await page.waitForFunction(()=>document.getElementById("course-list").textContent.includes("Biblioteca indisponível"));
      check(control.reads===2 && control.writes.length===1 &&
        !(await page.locator("#course-favorite-panel").isVisible()) && (await page.locator("#lesson-content h3").count())===0,
        "C116 PUT 404 followed by revoked GET reconciliation purges content and favorite controls");
      await page.close();
    }
    check(completionWrites===0,"C116 saving, filtering and recovering favorites never records lesson completion");
  }catch(error){
    console.error("C116 browser scenario failed: "+String(error.message).split(/\r?\n/,1)[0].slice(0,240));
    throw error;
  }finally{
    await context.close();
  }
};
