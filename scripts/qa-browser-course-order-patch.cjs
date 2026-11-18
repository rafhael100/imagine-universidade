"use strict";

// Browser startup belongs to the guarded runner. Only HTTP is synthetic;
// two real editor pages share one private fixture and use actual form handlers.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:"reduce"});
  context.setDefaultTimeout(8000);context.setDefaultNavigationTimeout(15000);
  const api=base+"/universidade/private/admin",holds=new Set();
  const fields=["course-title","course-slug","course-category","course-summary","course-sort",
    "lesson-title","lesson-slug","lesson-body","lesson-sort"];
  const clone=value=>JSON.parse(JSON.stringify(value)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const ok=payload=>({status:200,payload});let stage="text-only course order omission",failed=false;
  const text={title:"Curso revisado 😀",category:"negocios",summary:"Resumo revisado com Unicode 😀."};
  const fixture=()=>({courses:[1,2].map(id=>({id,slug:"curso-"+id,title:"Curso salvo "+id,
    category:"metodologia",summary:"Resumo salvo "+id,sort_order:id===1?0:2,is_published:false})),
    lessons:new Map([[1,[11,12,13].map((id,index)=>({id,slug:"aula-"+id,title:"Aula salva "+id,
      body:"Corpo autorizado da aula "+id+".",sort_order:index,status:"draft",is_published:false}))],
      [2,[{id:21,slug:"aula-21",title:"Aula salva 21",body:"Corpo autorizado do segundo curso.",
        sort_order:0,status:"draft",is_published:false}]]]),nextCourseId:3});
  const stored=server=>server.courses.find(course=>course.id===1);
  const values=page=>page.evaluate(ids=>ids.map(id=>document.getElementById(id).value),fields);
  const patchWrites=control=>control.writes.filter(request=>request.method==="PATCH");
  const paths=requests=>requests.map(request=>request.method+" "+request.path);
  const query="#editorial-lesson-search";
  async function bounded(promise,label){let timer;try{
    return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("C137 timeout: "+label)),8000);})]);
  }finally{clearTimeout(timer);}}
  const close=page=>bounded(page.close(),"page cleanup");
  const success=page=>page.waitForFunction(()=>!state.writePending&&!state.writeOutcomeUnknown&&
    document.getElementById("status").textContent==="Rascunho salvo.");
  const frozen=page=>page.waitForFunction(()=>!state.writePending&&state.writeOutcomeUnknown);
  const recovered=page=>page.waitForFunction(()=>state.catalogReady&&state.lessonsReady&&!state.catalogLoading&&!state.writeOutcomeUnknown);
  const textDraft=async page=>{
    await page.locator("#course-title").fill("  "+text.title+"  ");
    await page.locator("#course-category").selectOption(text.category);
    await page.locator("#course-summary").fill("  "+text.summary+"  ");
  };
  function overview(server){
    const categories=["metodologia","negocios","sistemas"].map(category=>{
      const courses=server.courses.filter(course=>course.category===category);
      return {category,courses:courses.length,published_courses:0,draft_courses:courses.length,
        current_lessons:courses.reduce((total,course)=>total+(server.lessons.get(course.id)||[]).length,0)};
    });
    return {schema_version:1,scope:"current_editorial_catalog",totals:{
      courses:server.courses.length,published_courses:0,draft_courses:server.courses.length,
      current_lessons:categories.reduce((total,category)=>total+category.current_lessons,0),
      courses_without_lessons:server.courses.filter(course=>!(server.lessons.get(course.id)||[]).length).length,
      courses_without_summary:server.courses.filter(course=>!course.summary).length},categories};
  }
  async function open(server=fixture()){
    const page=await context.newPage();await ensureLocalPage(page);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    const control={requests:[],writes:[],responses:[],patch:null,commitPatch:true,audit:ok({events:[],next_before_id:null})};
    const patch=entry=>{
      const course=server.courses.find(item=>item.id===Number(entry.path.split("/")[2]));
      if(!course)return {status:404,payload:{error:"not_found"}};
      if(Object.hasOwn(entry.body,"expected_sort_order")&&entry.body.expected_sort_order!==course.sort_order)
        return {status:409,payload:{error:"draft_order_changed"}};
      for(const key of ["title","category","summary","sort_order"])if(Object.hasOwn(entry.body,key))course[key]=entry.body[key];
      return ok({saved:true});
    };
    await page.route(api+"/**",async route=>{
      const request=route.request(),entry={path:new URL(request.url()).pathname.replace("/universidade/private/admin",""),
        method:request.method(),body:request.postDataJSON()};
      control.requests.push(entry);if(entry.method!=="GET")control.writes.push(entry);
      let result;
      if(entry.path==="/courses"&&entry.method==="GET")
        result=ok({courses:server.courses.slice().sort((a,b)=>a.sort_order-b.sort_order||a.id-b.id)});
      else if(/^\/courses\/\d+\/lessons$/.test(entry.path)&&entry.method==="GET")
        result=ok({lessons:server.lessons.get(Number(entry.path.split("/")[2]))||[]});
      else if(/^\/courses\/\d+$/.test(entry.path)&&entry.method==="PATCH"){
        const normal=control.commitPatch?patch(entry):ok({saved:true});
        result=(typeof control.patch==="function"?await control.patch(entry):control.patch)??normal;
      }else if(entry.path==="/courses"&&entry.method==="POST"){
        const id=server.nextCourseId++;server.courses.push({id,...entry.body,is_published:false});server.lessons.set(id,[]);
        result={status:201,payload:{id,status:"draft"}};
      }else if(entry.path==="/audit")result=control.audit;
      else if(entry.path==="/overview")result=ok(overview(server));
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
    await page.locator("#lesson-items [data-lesson='11']").click();await page.waitForFunction(()=>state.lesson?.id===11);
    await page.waitForLoadState("networkidle",{timeout:8000});
    return {page,server,control,holdPatch};
  }
  async function peerOrder(peer,value=5){
    await peer.page.locator("#course-sort").fill(String(value));
    await peer.page.locator("#course-save").click();await success(peer.page);
  }
  try{
    {
      const old=await open(),peer=await open(old.server);
      await old.page.locator("#course-summary").fill("  Resumo editado na sessão antiga.  ");await old.page.locator(query).fill("salva");
      const sibling=(await values(old.page)).slice(5);await peerOrder(peer);
      check(stored(old.server).sort_order===5&&await old.page.evaluate(()=>state.course.id===1&&state.course.sort_order===0)&&
        same(patchWrites(peer.control)[0].body,{title:"Curso salvo 1",category:"metodologia",summary:"Resumo salvo 1",sort_order:5,expected_sort_order:0}),
        "C137 a second editor confirms course order 5 while the first retains its original order 0 baseline");
      const requests=old.control.requests.length;await old.page.locator("#course-save").click();await success(old.page);
      check(same(patchWrites(old.control)[0].body,{title:"Curso salvo 1",category:"metodologia",summary:"Resumo editado na sessão antiga."})&&
        same(paths(old.control.requests.slice(requests)),["PATCH /courses/1","GET /courses","GET /courses/1/lessons"]),
        "C137 a summary edit omits both order fields and uses only PATCH followed by the existing catalog and lesson reads");
      check(stored(old.server).sort_order===5&&stored(old.server).summary==="Resumo editado na sessão antiga."&&
        await old.page.locator("#course-sort").inputValue()==="5"&&await old.page.locator(query).inputValue()==="salva"&&
        same((await values(old.page)).slice(5),sibling)&&await old.page.evaluate(()=>state.course.id===1&&state.lesson.id===11)&&old.control.writes.length===1,
        "C137 the peer order survives the text save, with the selected course, clean lesson buffer and C131 query preserved");
      await close(peer.page);await close(old.page);
    }
    {
      stage="explicit stale course order conflict";const old=await open(),peer=await open(old.server);
      await textDraft(old.page);await old.page.locator("#course-sort").fill("7");await old.page.locator(query).fill("salva");
      const buffers=await values(old.page);await peerOrder(peer);const before=clone(old.server.courses),requests=old.control.requests.length;
      await old.page.locator("#course-save").click();await frozen(old.page);
      check(same(patchWrites(old.control)[0].body,{...text,sort_order:7,expected_sort_order:0})&&
        old.control.responses.some(response=>response.method==="PATCH"&&response.status===409)&&same(old.server.courses,before)&&
        same(paths(old.control.requests.slice(requests)),["PATCH /courses/1"]),
        "C137 an explicit stale course order sends its original baseline and conflict neither writes text nor starts a preventive GET");
      check(same(await values(old.page),buffers)&&await old.page.locator(query).inputValue()==="salva"&&
        await old.page.locator(query).isDisabled()&&await old.page.locator("#course-save").isDisabled()&&
        (await old.page.locator("#status").innerText()).includes("Não repita a operação"),
        "C137 conflict preserves both literal form buffers and the local lesson query behind the manual recovery fence");
      const recoveryStart=old.control.requests.length;old.page.once("dialog",dialog=>dialog.dismiss());
      await old.page.locator("#retry-catalog").click();
      check(same(await values(old.page),buffers)&&old.control.requests.length===recoveryStart&&patchWrites(old.control).length===1,
        "C137 canceling reconciliation does not change buffers or send any GET or repeated PATCH");
      old.page.once("dialog",dialog=>dialog.accept());await old.page.locator("#retry-catalog").click();await recovered(old.page);
      check(await old.page.locator("#course-sort").inputValue()==="5"&&await old.page.locator(query).inputValue()==="salva"&&
        patchWrites(old.control).length===1&&same(paths(old.control.requests.slice(recoveryStart)),["GET /courses","GET /courses/1/lessons"]),
        "C137 accepted manual reads replace the stale baseline without replaying the failed edit");
      await textDraft(old.page);await old.page.locator("#course-sort").fill("7");await old.page.locator("#course-save").click();await success(old.page);
      check(patchWrites(old.control).length===2&&same(patchWrites(old.control)[1].body,{...text,sort_order:7,expected_sort_order:5})&&
        stored(old.server).sort_order===7&&await old.page.locator(query).inputValue()==="salva",
        "C137 a new explicit save after recovery uses baseline 5 and confirms destination 7");
      await close(peer.page);await close(old.page);
    }
    for(const explicitOrder of [false,true]){
      stage="lost "+(explicitOrder?"explicit-order":"text-only")+" course response";const h=await open();
      await textDraft(h.page);if(explicitOrder)await h.page.locator("#course-sort").fill("7");await h.page.locator(query).fill("salva");
      h.control.patch={abort:true};const buffers=await values(h.page),requests=h.control.requests.length;
      await h.page.locator("#course-save").click();await frozen(h.page);
      check(stored(h.server).summary===text.summary&&stored(h.server).sort_order===(explicitOrder?7:0)&&
        same(await values(h.page),buffers)&&await h.page.locator(query).inputValue()==="salva"&&h.control.writes.length===1&&
        same(paths(h.control.requests.slice(requests)),["PATCH /courses/1"]),
        "C137 a lost "+(explicitOrder?"order":"text")+" receipt keeps the result uncertain even if the fixture committed");
      const recoveryStart=h.control.requests.length;h.control.patch=null;h.page.once("dialog",dialog=>dialog.accept());
      await h.page.locator("#retry-catalog").click();await recovered(h.page);
      check(h.control.writes.length===1&&same(paths(h.control.requests.slice(recoveryStart)),["GET /courses","GET /courses/1/lessons"])&&
        await h.page.locator("#course-sort").inputValue()===String(explicitOrder?7:0)&&await h.page.locator(query).inputValue()==="salva",
        "C137 only explicit consultation resolves the lost "+(explicitOrder?"order":"text")+" response without replay");
      await close(h.page);
    }
    for(const receipt of [null,{saved:false},{saved:"true"}]){
      stage="invalid C136 course receipt "+JSON.stringify(receipt);const h=await open();
      await textDraft(h.page);await h.page.locator("#course-sort").fill("7");await h.page.locator(query).fill("salva");
      h.control.patch=ok(receipt);const buffers=await values(h.page),requests=h.control.requests.length;
      await h.page.locator("#course-save").click();await frozen(h.page);
      check(same(await values(h.page),buffers)&&await h.page.locator(query).inputValue()==="salva"&&
        same(paths(h.control.requests.slice(requests)),["PATCH /courses/1"])&&h.control.writes.length===1,
        "C137 preserves the C136 strict save receipt fence for "+JSON.stringify(receipt));
      await close(h.page);
    }
    {
      stage="unsaved lesson guard";const h=await open();await textDraft(h.page);await h.page.locator("#course-sort").fill("7");
      await h.page.locator("#lesson-body").fill("  Rascunho irmão ainda não salvo.  ");await h.page.locator(query).fill("salva");
      const buffers=await values(h.page),requests=h.control.requests.length;await h.page.locator("#course-save").click();
      await h.page.waitForFunction(()=>document.getElementById("status").textContent.includes("Salve a aula em edição antes"));
      check(same(await values(h.page),buffers)&&h.control.requests.length===requests&&h.control.writes.length===0&&
        await h.page.evaluate(()=>!state.writePending&&!state.writeOutcomeUnknown&&state.lessonQuery==="salva"),
        "C137 an unsaved sibling lesson prevents the course write and preserves both drafts without invalidating their reads");
      await close(h.page);
    }
    {
      stage="single-flight course write";const h=await open();await textDraft(h.page);await h.page.locator("#course-sort").fill("7");
      const held=h.holdPatch();await h.page.locator("#course-save").click();await held.seen();
      await h.page.evaluate(()=>document.getElementById("course-form").requestSubmit());
      const stillSingle=h.control.writes.length===1&&await h.page.evaluate(()=>state.writePending);
      held.release();await success(h.page);
      check(stillSingle&&h.control.writes.length===1&&stored(h.server).sort_order===7,
        "C137 the existing single-flight guard rejects a second submit while the first order response is pending");
      await close(h.page);
    }
    {
      stage="unchanged course creation";const h=await open();await h.page.locator("#new-course").click();await textDraft(h.page);
      await h.page.locator("#course-slug").fill("novo-curso");await h.page.locator("#course-sort").fill("4");
      const requests=h.control.requests.length;await h.page.locator("#course-save").click();await success(h.page);
      check(h.control.writes.length===1&&h.control.writes[0].method==="POST"&&
        same(h.control.writes[0].body,{title:text.title,slug:"novo-curso",category:text.category,summary:text.summary,sort_order:4})&&
        same(paths(h.control.requests.slice(requests)),["POST /courses","GET /courses","GET /courses/3/lessons"])&&
        await h.page.evaluate(()=>state.course.id===3&&state.course.sort_order===4),
        "C137 leaves the creation POST unchanged and accepts the C136 draft receipt before its normal refresh");
      await close(h.page);
    }
    for(const status of [403,419]){
      stage="course write revocation "+status;const h=await open();await textDraft(h.page);
      await h.page.locator("#course-sort").fill("7");await h.page.locator(query).fill("salva");
      h.control.commitPatch=false;h.control.patch={status,payload:{error:"access_denied"}};
      const requests=h.control.requests.length;await h.page.locator("#course-save").click();
      await h.page.waitForFunction(()=>state.accessDenied&&!state.writePending);
      check(await h.page.evaluate(()=>state.course===null&&state.lesson===null&&state.lessonQuery===""&&
        document.getElementById("course-summary").value===""&&document.getElementById("lesson-body").value===""&&
        document.getElementById("retry-catalog").disabled)&&same(paths(h.control.requests.slice(requests)),["PATCH /courses/1"])&&
        h.control.writes.length===1,
        "C137 HTTP "+status+" purges the private forms and query without a catalog refresh or repeat write");
      await close(h.page);
    }
    {
      stage="late course success after revocation";const h=await open();await textDraft(h.page);
      const held=h.holdPatch(),requests=h.control.requests.length;await h.page.locator("#course-save").click();await held.seen();
      h.control.audit={status:403,payload:{error:"access_denied"}};await h.page.locator("#refresh-audit").click();
      await h.page.waitForFunction(()=>state.accessDenied);held.release();
      await h.page.waitForFunction(()=>!state.writePending);await h.page.waitForLoadState("networkidle",{timeout:8000});
      check(await h.page.evaluate(()=>state.course===null&&state.lesson===null&&
        document.getElementById("course-title").value===""&&document.getElementById("lesson-body").value==="")&&
        same(paths(h.control.requests.slice(requests)),["PATCH /courses/1","GET /audit"])&&h.control.writes.length===1,
        "C137 a successful late receipt cannot refresh or restore content after the audit request revokes access");
      await close(h.page);
    }
  }catch(error){
    failed=true;throw new Error("C137 browser stage "+stage+": "+error.message,{cause:error});
  }finally{
    for(const held of [...holds])held.release();
    try{await bounded(context.close(),"context cleanup");}catch(error){if(!failed)throw error;}
  }
};
