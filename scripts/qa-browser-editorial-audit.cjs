"use strict";

// Only the guarded parent runner starts Chromium. Fixtures belong to this
// context/page and cannot mutate the parent runner's editorial collection.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:"reduce"});
  context.setDefaultTimeout(8000);context.setDefaultNavigationTimeout(15000);
  const api=base+"/universidade/private/admin",pending=[];
  const fields=["course-title","course-slug","course-category","course-summary","course-sort",
    "lesson-title","lesson-slug","lesson-body","lesson-sort"];
  const values=page=>page.evaluate(ids=>ids.map(id=>document.getElementById(id).value),fields);
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const event=id=>({id,action:"course.updated",resource_kind:"course",resource_id:12,
    authority_revision:1,occurred_at:"2026-11-18 10:00:00+00",actor_key:"PRIVATE-OPERATOR"});
  const envelope=(count=50,first=2147483750,more=true)=>({events:Array.from({length:count},(_,index)=>event(first-index)),
    next_before_id:more&&count===50?first-count+1:null});
  const ok=payload=>({status:200,payload});
  let stage="initial audit page";
  async function bounded(promise,label){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new Error("C142 timeout: "+label)),8000);
  })]);}finally{clearTimeout(timer);}}
  function held(){
    let release,received;const result=new Promise(resolve=>{release=resolve;});
    const seen=new Promise(resolve=>{received=resolve;});pending.push(()=>release({status:503,payload:{}}));
    return {release,wait:()=>bounded(seen,"pending audit request"),response:()=>{received();return result;}};
  }
  const settled=page=>page.waitForFunction(()=>!state.auditLoading,null,{timeout:8000});
  const read=async(page,id="refresh-audit")=>{await page.locator("#"+id).click();await settled(page);};
  const close=page=>bounded(page.close(),"page cleanup");
  async function open(){
    const page=await context.newPage();await ensureLocalPage(page);
    page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(15000);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    const control={audit:null,reads:[],writes:[]};
    await page.route(api+"/**",async route=>{
      const request=route.request(),url=new URL(request.url()),path=url.pathname.replace("/universidade/private/admin","");
      const entry={path,query:url.search,method:request.method()};
      let result;
      if(entry.method!=="GET"){control.writes.push(entry);result={status:405,payload:{error:"unexpected_write"}};}
      else if(path==="/audit"){
        control.reads.push(entry);
        result=(typeof control.audit==="function"?await control.audit(entry):control.audit)
          ??ok(url.search?envelope(1,2147483700,false):envelope());
      }else if(path==="/courses")result=ok({courses:[{id:1,slug:"curso-audit",title:"Curso salvo",category:"metodologia",
        summary:"Resumo salvo",sort_order:0,is_published:false}]});
      else if(path==="/courses/1/lessons")result=ok({lessons:[{id:11,slug:"aula-audit",title:"Aula salva",
        body:"Conteúdo salvo para a aula sintética.",sort_order:0,status:"draft",is_published:false}]});
      else if(path==="/overview")result=ok({schema_version:1,scope:"current_editorial_catalog",
        totals:{courses:1,published_courses:0,draft_courses:1,current_lessons:1,courses_without_lessons:0,courses_without_summary:0},
        categories:[{category:"metodologia",courses:1,published_courses:0,draft_courses:1,current_lessons:1},
          ...["negocios","sistemas"].map(category=>({category,courses:0,published_courses:0,draft_courses:0,current_lessons:0}))]});
      else result={status:404,payload:{error:"not_found"}};
      await route.fulfill({status:result.status,contentType:"application/json",headers:{"Cache-Control":"private, no-store"},
        body:result.raw??JSON.stringify(result.payload)});
    });
    await page.goto(base+"/admin");
    await page.waitForFunction(()=>state.catalogReady&&!state.catalogLoading&&!state.auditLoading&&!state.overviewLoading);
    await page.locator("#course-items [data-course='1']").click();
    await page.waitForFunction(()=>state.course?.id===1&&state.lessonsReady);
    await page.locator("#lesson-items [data-lesson='11']").click();
    await page.waitForFunction(()=>state.lesson?.id===11);
    return {page,control};
  }
  try{
    {
      const {page,control}=await open();
      check(control.reads.length===1&&await page.locator("#audit-items [data-audit-id]").count()===50&&
        await page.locator("#audit-items [data-audit-id]").first().getAttribute("data-audit-id")==="2147483750"&&
        !(await page.locator("#audit-panel").innerText()).includes("PRIVATE-OPERATOR")&&
        (await page.locator("#audit-items").innerText()).includes("2026-11-18 10:00:00+00"),
        "C142 the first bounded page displays exact ids above int4 and native dates without exposing extra actor fields");
      await page.locator("#course-title").fill("  Curso ainda não salvo  ");
      await page.locator("#course-summary").fill("  Resumo local preservado  ");
      await page.locator("#lesson-body").fill("  Texto literal ainda em edição.  ");
      const drafts=await values(page);
      await read(page,"load-more-audit");
      check(control.reads.length===2&&control.reads[1].query==="?before_id=2147483701"&&
        await page.locator("#audit-items [data-audit-id]").count()===51&&await page.locator("#load-more-audit").isDisabled(),
        "C142 explicit continuation sends the exact large exclusive cursor and appends only the remaining event");
      check(same(await values(page),drafts)&&await page.evaluate(()=>state.course.id===1&&state.lesson.id===11)&&
        control.writes.length===0,"C142 audit pagination preserves both dirty forms and selection without editorial writes");
      const malformedOrder=envelope(2);malformedOrder.events.reverse();
      const malformedCursor=envelope();malformedCursor.next_before_id++;
      const cases=[ok({}),ok({events:null,next_before_id:null}),ok(malformedOrder),ok(malformedCursor),
        {status:503,payload:{error:"PRIVATE-ERROR"}},{status:200,raw:"{not-json"}];
      for(const [index,result] of cases.entries()){
        stage="unavailable audit "+index;control.audit=result;const before=control.reads.length;await read(page);
        check(await page.locator("#audit-items").innerText()===""&&
          (await page.locator("#audit-status").innerText()).includes("indisponível")&&
          !(await page.locator("#audit-panel").innerText()).includes("Nenhuma alteração")&&
          await page.locator("#refresh-audit").isEnabled()&&await page.locator("#load-more-audit").isDisabled()&&
          control.reads.length===before+1&&same(await values(page),drafts),
          "C142 incomplete malformed or failed audit response "+index+" is unavailable rather than empty and leaves drafts untouched");
      }
      control.audit=ok({events:[],next_before_id:null});await read(page);
      check((await page.locator("#audit-items").innerText()).includes("Nenhuma alteração editorial registrada.")&&
        await page.locator("#refresh-audit").isEnabled()&&same(await values(page),drafts),
        "C142 an explicit successful retry can distinguish a valid empty history");
      const literal=envelope(1);literal.events[0].action="<img src=x onerror=alert(1)>";
      control.audit=ok(literal);await read(page);
      check(await page.locator("#audit-items img").count()===0&&
        (await page.locator("#audit-items").innerText()).includes(literal.events[0].action)&&control.writes.length===0,
        "C142 rendered event text is literal and a valid manual retry restores the history without writes");
      await page.setViewportSize({width:320,height:900});
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),
        "C142 the audit status and complete timestamp fit the narrow editor layout");
      stage="pending audit read";const gate=held();control.audit=gate.response;
      await page.locator("#refresh-audit").click();await gate.wait();const reads=control.reads.length;
      await page.evaluate(()=>{
        document.getElementById("refresh-audit").dispatchEvent(new Event("click"));
        document.getElementById("load-more-audit").dispatchEvent(new Event("click"));
      });
      check(control.reads.length===reads&&await page.locator("#refresh-audit").isDisabled()&&
        await page.locator("#load-more-audit").isDisabled(),
        "C142 pending history reads ignore repeated and synthetic continuation clicks");
      gate.release(ok(envelope(1)));await settled(page);
      check(await page.locator("#refresh-audit").isEnabled()&&await page.locator("#audit-items [data-audit-id]").count()===1&&
        same(await values(page),drafts)&&control.writes.length===0,
        "C142 the owning read alone releases history controls and preserves both unsaved forms");
      await close(page);
    }
    for(const status of [403,419]){
      stage="audit denial "+status;const {page,control}=await open();control.audit={status,payload:{error:"denied"}};
      await read(page);
      check(await page.locator("#audit-items").innerText()===""&&await page.locator("#audit-status").innerText()===""&&
        await page.locator("#refresh-audit").isDisabled()&&await page.locator("#load-more-audit").isDisabled()&&
        await page.evaluate(()=>state.accessDenied&&state.auditEvents.length===0&&state.auditNextBeforeId===null)&&
        control.writes.length===0,"C142 audit "+status+" purges history and prevents further history actions");
      await close(page);
    }
  }catch(error){console.error("C142 editorial audit failed at "+stage+": "+String(error?.message||error).slice(0,240));throw error;}
  finally{for(const release of pending)release();await bounded(context.close(),"context cleanup");}
};
