"use strict";

// Only the guarded runner launches Chromium. Each page below owns its HTTP
// fixtures; the actual editor, dialogs and write/recovery handlers are intact.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:"reduce"});
  context.setDefaultTimeout(8000);context.setDefaultNavigationTimeout(15000);
  const api=base+"/universidade/private/admin";
  const fields=["course-title","course-slug","course-category","course-summary","course-sort",
    "lesson-title","lesson-slug","lesson-body","lesson-sort"];
  const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right),hash="a".repeat(64);
  const values=page=>page.evaluate(ids=>ids.map(id=>document.getElementById(id).value),fields);
  const cases=[
    {kind:"course-create",button:"course-save",method:"POST",path:"/courses",receipt:{},success:"Rascunho salvo."},
    {kind:"course-update",button:"course-save",method:"PATCH",path:"/courses/1",receipt:{saved:false},success:"Rascunho salvo."},
    {kind:"lesson-create",button:"lesson-save",method:"POST",path:"/courses/1/lessons",receipt:{id:30,status:"published"},success:"Aula salva em rascunho."},
    {kind:"lesson-delete",button:"delete-lesson",method:"DELETE",path:"/lessons/11",receipt:{deleted:false},success:"Aula em rascunho excluída."},
    {kind:"course-delete",button:"delete-course",method:"DELETE",path:"/courses/1",receipt:{deleted:false},success:"Rascunho nunca publicado excluído"},
    {kind:"publish",button:"publish",method:"POST",path:"/courses/1/publish",receipt:{published:false},success:"Versão do curso publicada"},
    {kind:"unpublish",button:"unpublish",method:"POST",path:"/courses/1/unpublish",receipt:{published:true},success:"Versão anterior arquivada"},
  ];
  let stage="malformed editorial receipts",failed=false;
  async function bounded(promise,label){let timer;try{
    return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("C136 timeout: "+label)),8000);})]);
  }finally{clearTimeout(timer);}}
  const close=page=>bounded(page.close(),"page cleanup");
  const frozen=page=>page.waitForFunction(()=>!state.writePending&&state.writeOutcomeUnknown);
  async function open(test,receipt=test.receipt){
    const page=await context.newPage();await ensureLocalPage(page);
    page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(15000);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    const published=test.kind==="unpublish";
    const fixture={courses:[1,2].map(id=>({id,slug:"curso-"+id,title:"Curso salvo "+id,category:"metodologia",
      summary:"Resumo salvo "+id,sort_order:0,is_published:published&&id===1})),
      lessons:[11,12].map((id,index)=>({id,slug:"aula-"+id,title:"Aula salva "+id,
        body:"Conteúdo original da aula "+id+".\n\nSegundo parágrafo literal.",sort_order:index,
        status:published?"published":"draft",is_published:published}))};
    const control={requests:[],writes:[],accept:true};
    page.on("dialog",dialog=>control.accept?dialog.accept():dialog.dismiss());
    await page.route(api+"/**",async route=>{
      const request=route.request(),entry={path:new URL(request.url()).pathname.replace("/universidade/private/admin",""),
        method:request.method(),body:request.postDataJSON()};
      control.requests.push(entry);
      let payload,status=200;
      if(entry.method!=="GET"){
        control.writes.push(entry);
        if(entry.path===test.path&&entry.method===test.method){payload=receipt;status=test.kind.endsWith("create")?201:200;}
        else{status=405;payload={error:"unexpected_fixture_write"};}
      }else if(entry.path==="/courses")payload={courses:fixture.courses};
      else if(entry.path==="/courses/1/lessons")payload={lessons:fixture.lessons};
      else if(entry.path==="/courses/2/lessons")payload={lessons:[]};
      else if(entry.path==="/courses/1/publication-check")payload={course_id:1,version:1,lesson_count:2,
        ready:true,issues:[],warnings:[],content_hash:hash,advisory_only:true};
      else if(entry.path==="/audit")payload={events:[],next_before_id:null};
      else if(entry.path==="/overview")payload={schema_version:1,scope:"current_editorial_catalog",
        totals:{courses:2,published_courses:published?1:0,draft_courses:published?1:2,current_lessons:2,
          courses_without_lessons:1,courses_without_summary:0},
        categories:[{category:"metodologia",courses:2,published_courses:published?1:0,draft_courses:published?1:2,current_lessons:2},
          ...["negocios","sistemas"].map(category=>({category,courses:0,published_courses:0,draft_courses:0,current_lessons:0}))]};
      else{status=404;payload={error:"not_found"};}
      await route.fulfill({status,contentType:"application/json",headers:{"Cache-Control":"private, no-store"},body:JSON.stringify(payload)});
    });
    await page.goto(base+"/admin");await page.waitForFunction(()=>state.catalogReady&&!state.catalogLoading);
    await page.locator("#course-items [data-course='1']").click();
    await page.waitForFunction(()=>state.course?.id===1&&state.lessonsReady);
    await page.locator("#lesson-items [data-lesson='11']").click();await page.waitForFunction(()=>state.lesson?.id===11);
    if(test.kind==="course-create")await page.locator("#new-course").click();
    if(test.kind==="lesson-create")await page.locator("#clear-lesson").click();
    if(test.kind.startsWith("course-")&&!test.kind.endsWith("delete")){
      await page.locator("#course-title").fill("  Curso revisado 😀  ");
      await page.locator("#course-summary").fill("  Resumo literal ainda em edição.  ");
      if(test.kind==="course-create")await page.locator("#course-slug").fill("curso-novo");
    }
    if(test.kind==="lesson-create"){
      await page.locator("#lesson-title").fill("  Aula nova 😀  ");await page.locator("#lesson-slug").fill("aula-nova");
      await page.locator("#lesson-body").fill("  Texto literal da nova aula, com espaços.  ");
      await page.locator("#course-summary").fill("  Rascunho irmão preservado.  ");
    }
    if(test.kind.endsWith("delete")){
      await page.locator("#course-summary").fill("  Rascunho de curso antes da exclusão.  ");
      await page.locator("#lesson-body").fill("  Rascunho de aula antes da exclusão.  ");
    }
    if(test.kind!=="course-create")await page.locator("#editorial-lesson-search").fill("salva");
    await page.waitForLoadState("networkidle",{timeout:8000});control.requests.length=0;
    return {page,control};
  }
  function noRefresh(control){
    const index=control.requests.findIndex(entry=>entry.method!=="GET");
    return index>=0&&control.requests.slice(index+1).length===0;
  }
  try{
    for(const test of cases){
      stage=test.kind+" invalid receipt";
      const {page,control}=await open(test),before=await values(page);
      const selected=await page.evaluate(()=>[state.course?.id??null,state.lesson?.id??null]);
      const query=await page.locator("#editorial-lesson-search").inputValue();
      await page.locator("#"+test.button).click();await frozen(page);
      check(control.writes.length===1&&control.writes[0].method===test.method&&control.writes[0].path===test.path&&
        noRefresh(control)&&same(await values(page),before)&&
        same(await page.evaluate(()=>[state.course?.id??null,state.lesson?.id??null]),selected)&&
        await page.locator("#editorial-lesson-search").inputValue()===query,
        "C136 "+test.kind+" rejects its invalid success receipt before any refresh and keeps both literal forms, selection and filter");
      const message=await page.locator("#status").innerText();
      check(await page.locator("#"+test.button).isDisabled()&&await page.locator("#retry-catalog").isEnabled()&&
        await page.locator("#catalog-recovery").isVisible()&&message.includes("Não repita a operação")&&!message.includes(test.success)&&
        await page.evaluate(()=>!state.catalogReady&&!state.lessonsReady&&!state.writePending),
        "C136 "+test.kind+" cannot claim success or enable another mutation until an explicit manual read");
      if(test.kind==="course-update"){
        stage="manual recovery after an invalid receipt";const requests=control.requests.length;
        control.accept=false;await page.locator("#retry-catalog").click();
        check(control.requests.length===requests&&control.writes.length===1&&same(await values(page),before),
          "C136 canceling manual recovery leaves an unconfirmed course update untouched without PATCH or GET replay");
        control.accept=true;await page.locator("#retry-catalog").click();
        await page.waitForFunction(()=>state.catalogReady&&state.lessonsReady&&!state.catalogLoading&&!state.writeOutcomeUnknown);
        check(control.writes.length===1&&same(control.requests.slice(requests).map(entry=>entry.method+" "+entry.path),
          ["GET /courses","GET /courses/1/lessons"])&&await page.locator("#course-title").inputValue()==="Curso salvo 1"&&
          await page.locator("#editorial-lesson-search").inputValue()===query&&await page.locator("#course-save").isEnabled(),
          "C136 accepted recovery reads the current catalog once and restores editing without replaying the disputed operation");
      }
      if(test.kind==="publish")check(same(control.writes[0].body,{expected_content_hash:hash})&&
        control.requests[0].path==="/courses/1/publication-check"&&control.requests[0].method==="GET",
        "C136 publication keeps the existing reviewed hash and preflight; it adds no preventive or post-error read");
      await close(page);
    }
    for(const test of cases.filter(test=>test.kind.endsWith("create"))){
      for(const [label,receipt] of [
        ["numeric string ID",{id:"30",status:"draft"}],
        ["unsafe ID",{id:Number.MAX_SAFE_INTEGER+1,status:"draft"}],
        ["incorrect status",{id:30,status:"archived"}],
      ]){
        stage=test.kind+" "+label;const {page,control}=await open(test,receipt),before=await values(page);
        await page.locator("#"+test.button).click();await frozen(page);
        check(control.writes.length===1&&noRefresh(control)&&same(await values(page),before)&&
          await page.locator("#"+test.button).isDisabled(),
          "C136 "+test.kind+" rejects a "+label+" instead of refreshing with an untrusted identifier");
        await close(page);
      }
    }
  }catch(error){failed=true;console.error("C136 editorial-write-receipts stage: "+stage+"; "+String(error.message).slice(0,220));throw error;}
  finally{try{await bounded(context.close(),"context cleanup");}catch(error){if(!failed)throw error;}}
};
