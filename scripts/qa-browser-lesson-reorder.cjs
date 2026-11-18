"use strict";

// Private per-page fixtures around the actual editorial HTML and handlers.
// The guarded runner owns browser startup; this module never starts services.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
  context.setDefaultTimeout(8000);context.setDefaultNavigationTimeout(15000);
  const api=base+"/universidade/private/admin",heldRequests=[];
  const original=[{id:11,sort_order:5},{id:12,sort_order:5},{id:13,sort_order:9}];
  const up=[{id:12,sort_order:0},{id:11,sort_order:1},{id:13,sort_order:2}];
  const reversed=[{id:11,sort_order:0},{id:12,sort_order:1},{id:13,sort_order:2}];
  const fields=["course-title","course-slug","course-category","course-summary","course-sort",
    "lesson-title","lesson-slug","lesson-body","lesson-sort"];
  const clone=value=>JSON.parse(JSON.stringify(value)),ok=payload=>({status:200,payload});
  const receipt=(order=up,extra={})=>({schema_version:1,scope:"current_editorial_draft",course_id:1,
    course_version:7,status:"draft",lesson_id:12,direction:"up",changed:true,order:clone(order),...extra});
  const move=(id=12,direction="up")=>"#lesson-items [data-move-lesson='"+id+"'][data-direction='"+direction+"']";
  const select=id=>"#lesson-items [data-lesson='"+id+"']";
  const values=page=>page.evaluate(ids=>ids.map(id=>document.getElementById(id).value),fields);
  const order=page=>page.evaluate(()=>state.lessons.map(({id,sort_order})=>({id,sort_order})));
  const rows=page=>page.locator("#lesson-items [data-lesson-row]").evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.lessonRow)));
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  let stage="reorder controls",failed=false;
  async function bounded(promise,label){
    let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error("C129 timeout: "+label)),8000);
    })]);}finally{clearTimeout(timer);}
  }
  const settled=page=>page.waitForFunction(()=>!state.writePending);
  const success=page=>page.waitForFunction(()=>!state.writePending&&document.getElementById("status").textContent.startsWith("Ordem das aulas"));
  const frozen=page=>page.waitForFunction(()=>!state.writePending&&state.writeOutcomeUnknown);
  const close=page=>bounded(page.close(),"page cleanup");
  async function open({published=false,invalid=false}={}){
    const page=await context.newPage();await ensureLocalPage(page);
    page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(15000);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    const fixture={courses:[{id:1,slug:"curso-ficticio",title:"Curso fictício",category:"metodologia",
      summary:"Resumo editorial preservado.",sort_order:0,is_published:published}],
      lessons:original.map(pair=>({...pair,slug:"aula-"+pair.id,title:"Aula salva "+pair.id,
        body:"Texto original da aula "+pair.id+".\n\nSegundo parágrafo preservado.",status:published?"published":"draft",is_published:published}))};
    const control={requests:[],writes:[],reorder:ok(receipt()),commitOrder:clone(up),audit:null};
    await page.route(api+"/**",async route=>{
      const request=route.request(),path=new URL(request.url()).pathname.replace("/universidade/private/admin","");
      const entry={path,method:request.method(),body:request.postDataJSON(),request};control.requests.push(entry);
      if(entry.method!=="GET")control.writes.push(entry);
      let result;
      if(path==="/courses"&&entry.method==="GET")result=ok({courses:fixture.courses});
      else if(path==="/courses/1/lessons"&&entry.method==="GET")result=ok({lessons:invalid?null:fixture.lessons});
      else if(path==="/courses/1/lessons/reorder"&&entry.method==="POST"){
        if(control.commitOrder){
          const stored=new Map(fixture.lessons.map(lesson=>[lesson.id,lesson]));
          fixture.lessons=control.commitOrder.map(pair=>({...stored.get(pair.id),sort_order:pair.sort_order}));
        }
        result=typeof control.reorder==="function"?await control.reorder(entry):control.reorder;
        if(result.abort){await route.abort("failed");return;}
      }else if(path==="/audit")result=control.audit??ok({events:[],next_before_id:null});
      else if(path==="/overview")result=ok({schema_version:1,scope:"current_editorial_catalog",
        totals:{courses:1,published_courses:published?1:0,draft_courses:published?0:1,current_lessons:3,courses_without_lessons:0,courses_without_summary:0},
        categories:[{category:"metodologia",courses:1,published_courses:published?1:0,draft_courses:published?0:1,current_lessons:3},
          ...["negocios","sistemas"].map(category=>({category,courses:0,published_courses:0,draft_courses:0,current_lessons:0}))]});
      else if(path==="/courses/1/publication-check")result=ok({course_id:1,version:7,lesson_count:3,ready:true,
        issues:[],warnings:[],content_hash:"a".repeat(64),advisory_only:true});
      else result={status:404,payload:{error:"not_found"}};
      await route.fulfill({status:result.status,contentType:"application/json",headers:{"Cache-Control":"private, no-store"},body:JSON.stringify(result.payload)});
    });
    const hold=()=>{
      let releaseGate,markSeen,markTerminal,request=null,released=false;
      const gate=new Promise(resolve=>{releaseGate=resolve;}),seen=new Promise(resolve=>{markSeen=resolve;});
      const terminal=new Promise(resolve=>{markTerminal=resolve;});
      const onTerminal=value=>{if(value===request)markTerminal();};
      page.on("requestfinished",onTerminal);page.on("requestfailed",onTerminal);
      control.reorder=async entry=>{request=entry.request;markSeen();await gate;return ok(receipt());};
      const held={seen:()=>bounded(seen,"pending reorder"),release:()=>{if(released)return;released=true;releaseGate();},
        terminal:async()=>{try{
          await bounded(terminal,"reorder terminal");await page.waitForLoadState("networkidle",{timeout:8000});
        }finally{held.dispose();}},
        dispose:()=>{page.off("requestfinished",onTerminal);page.off("requestfailed",onTerminal);}};
      heldRequests.push(held);return held;
    };
    await page.goto(base+"/admin");await page.waitForFunction(()=>state.catalogReady&&!state.catalogLoading);
    await page.locator("#course-items [data-course='1']").click();
    if(invalid)await page.locator("#retry-lessons").waitFor();
    else{
      await page.waitForFunction(()=>state.course?.id===1&&state.lessonsReady);
      await page.locator(select(12)).click();await page.waitForFunction(()=>state.lesson?.id===12);
    }
    return {page,fixture,control,hold};
  }
  try{
    {
      const {page,control}=await open();const initial=await values(page);
      check(same(await rows(page),[11,12,13])&&await page.locator(move(11,"up")).isDisabled()&&
        await page.locator(move(13,"down")).isDisabled()&&!(await page.locator(move()).isDisabled()),
        "C129 canonical tie order is visible and only legal neighboring movements are enabled");
      check((await page.locator(move()).getAttribute("aria-label"))==="Subir aula: Aula salva 12"&&
        (await page.locator("#lesson-items [data-lesson-row='11']").innerText()).includes("Posição 1"),
        "C129 movement controls name their lesson and expose the current sequence position");
      await page.locator(move(11,"up")).evaluate(button=>button.dispatchEvent(new MouseEvent("click",{bubbles:true})));
      await page.locator(move(13,"down")).evaluate(button=>button.dispatchEvent(new MouseEvent("click",{bubbles:true})));
      check(control.writes.length===0&&same(await order(page),original),
        "C129 boundary controls remain no-op even when their click handlers receive synthetic events");
      await page.locator("#check-publication").click();await page.locator("#publication-readiness").waitFor();
      const count=control.requests.length;await page.locator(move()).click();await success(page);
      const after=await values(page);
      check(same(await order(page),up)&&same(await rows(page),[12,11,13])&&await page.evaluate(()=>state.lesson.id===12)&&
        after[8]==="0"&&same(after.slice(0,8),initial.slice(0,8)),
        "C129 an explicit upward move resolves ties while preserving both forms and selected lesson");
      check(control.requests.length===count+1&&control.writes.length===1&&
        same(control.writes[0].body,{lesson_id:12,direction:"up",expected_order:original})&&
        await page.locator("#publication-readiness").isHidden(),
        "C129 only one canonical POST is sent and preflight is invalidated without a refill or automatic GET");
      await page.locator(select(11)).click();const selectedBody=await page.locator("#lesson-body").inputValue();
      control.commitOrder=clone(reversed);control.reorder=ok(receipt(reversed,{direction:"down"}));
      await page.locator(move(12,"down")).click();await success(page);
      check(same(await order(page),reversed)&&await page.evaluate(()=>state.lesson.id===11)&&
        await page.locator("#lesson-sort").inputValue()==="0"&&await page.locator("#lesson-body").inputValue()===selectedBody&&
        same(control.writes[1].body,{lesson_id:12,direction:"down",expected_order:up}),
        "C129 reverse movement preserves a different selected lesson and updates only its confirmed order baseline");
      await page.setViewportSize({width:390,height:844});
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&
        await page.locator(move(12,"up")).isVisible()&&!(await page.locator(move(12,"up")).isDisabled()),
        "C129 movement controls remain usable at mobile width without horizontal overflow");
      await close(page);
    }
    {
      stage="unsaved sibling forms";const {page,control}=await open(),initial=await values(page);
      await page.locator("#course-title").fill("Curso ainda não salvo");await page.locator("#lesson-body").fill("Texto de aula ainda não salvo.");
      const dirty=await values(page);await page.locator(move()).evaluate(button=>button.dispatchEvent(new MouseEvent("click",{bubbles:true})));
      check(await page.locator(move()).isDisabled()&&control.writes.length===0&&same(await values(page),dirty)&&
        (await page.locator("#status").innerText()).includes("primeiro a aula e depois o curso"),
        "C129 dirty sibling forms block movement without discarding text or sending a POST");
      await page.locator("#course-title").fill(initial[0]);await page.locator("#lesson-body").fill(initial[7]);
      check(!(await page.locator(move()).isDisabled())&&control.writes.length===0,
        "C129 returning the fields to their confirmed values restores controls without a write");
      await close(page);
    }
    {
      stage="idempotent target confirmation";const {page,control}=await open();control.reorder=ok(receipt(up,{changed:false}));
      await page.locator(move()).click();await success(page);
      check(same(await order(page),up)&&control.writes.length===1&&
        (await page.locator("#status").innerText()).includes("Nenhuma nova alteração foi necessária"),
        "C129 an exact changed-false receipt confirms the intended order without claiming another mutation");
      await close(page);
    }
    {
      stage="single flight and no optimism";const {page,control,hold}=await open(),initial=await values(page),held=hold();
      const button=await page.locator(move()).elementHandle();await page.locator(move()).click();await held.seen();
      await page.evaluate(node=>node.dispatchEvent(new MouseEvent("click",{bubbles:true})),button);
      check(control.writes.length===1&&same(await order(page),original)&&same(await values(page),initial)&&
        await page.locator(".layout").evaluate(node=>node.inert),
        "C129 pending movement keeps the previous order and buffers while rejecting a duplicate handler event");
      held.release();await held.terminal();await success(page);
      check(same(await order(page),up)&&await page.locator(".layout").evaluate(node=>!node.inert)&&
        !(await page.locator(move(12,"down")).isDisabled()),
        "C129 a confirmed receipt releases the shared write fence and enables the next explicit move");
      await button.dispose();await close(page);
    }
    for(const id of ["course-summary","lesson-body"]){
      stage="buffer changes during reorder "+id;const {page,control,hold}=await open(),held=hold();
      await page.locator(move()).click();await held.seen();
      await page.locator("#"+id).evaluate(node=>{
        node.value="  Texto programático alterado durante a espera.  ";node.dispatchEvent(new Event("input",{bubbles:true}));
      });
      const changed=await values(page);held.release();await held.terminal();await frozen(page);
      check(same(await values(page),changed)&&same(await order(page),original)&&control.writes.length===1&&
        await page.locator(move()).isDisabled()&&(await page.locator("#status").innerText()).includes("campos atuais foram preservados"),
        "C129 a programmatic edit during inert preserves the current buffer and requires manual refresh: "+id);
      page.once("dialog",dialog=>dialog.dismiss());const count=control.requests.length;await page.locator("#retry-catalog").click();
      check(control.requests.length===count&&same(await values(page),changed)&&await page.evaluate(()=>state.writeOutcomeUnknown),
        "C129 canceling reconciliation keeps the changed buffer and does not repeat or read automatically: "+id);
      await close(page);
    }
    {
      stage="detached control with same request";const {page,control}=await open();
      const old=await page.locator(move()).elementHandle(),request=await page.evaluate(()=>state.lessonRequest);
      await page.locator(select(11)).click();await page.evaluate(node=>node.click(),old);await page.waitForLoadState("networkidle");
      check(control.writes.length===0&&await page.evaluate(previous=>state.lessonRequest===previous&&state.lesson.id===11,request)&&
        await old.evaluate(node=>!node.isConnected),
        "C129 a removed movement button cannot write after local selection rerenders the same course and request");
      await old.dispose();await close(page);
    }
    for(const code of [409,503]){
      stage="rejected or ambiguous reorder "+code;const {page,control}=await open(),initial=await values(page);
      control.reorder={status:code,payload:{error:code===409?"draft_order_changed":"temporarily_unavailable"}};
      if(code===409)control.commitOrder=null;
      await page.locator(move()).click();await frozen(page);
      check(control.writes.length===1&&same(await order(page),original)&&same(await values(page),initial)&&
        (await page.locator("#status").innerText()).includes("Não repita o movimento")&&await page.locator(move()).isDisabled(),
        "C129 HTTP "+code+" freezes writes without interpreting the error body or replaying the move");
      await close(page);
    }
    {
      stage="malformed success receipt";const {page,control}=await open(),initial=await values(page);
      control.reorder=ok(receipt(original));await page.locator(move()).click();await frozen(page);
      check(same(await order(page),original)&&same(await values(page),initial)&&control.writes.length===1&&
        await page.locator("#retry-catalog").isVisible(),
        "C129 a successful but wrong order receipt cannot replace rows or form baselines");
      await close(page);
    }
    {
      stage="lost response and manual reconciliation";const {page,control}=await open(),initial=await values(page);
      control.reorder={abort:true};await page.locator(move()).click();await frozen(page);
      page.once("dialog",dialog=>dialog.dismiss());const count=control.requests.length;await page.locator("#retry-catalog").click();
      check(control.requests.length===count&&same(await values(page),initial)&&control.writes.length===1,
        "C129 canceling manual refresh after a lost response preserves all fields without replay");
      page.once("dialog",dialog=>dialog.accept());await page.locator("#retry-catalog").click();
      await page.waitForFunction(()=>state.catalogReady&&state.lessonsReady&&!state.catalogLoading&&!state.writeOutcomeUnknown);
      check(same(await order(page),up)&&await page.evaluate(()=>state.lesson.id===12)&&
        await page.locator("#lesson-sort").inputValue()==="0"&&control.writes.length===1&&
        !(await page.locator(move(12,"down")).isDisabled()),
        "C129 an accepted fresh read resolves the committed order and restores controls without another POST");
      await close(page);
    }
    for(const options of [{published:true},{invalid:true}]){
      stage="noneditable lesson list";const {page,control}=await open(options);
      const buttons=page.locator("#lesson-items [data-move-lesson]");
      check(control.writes.length===0&&(options.invalid?await buttons.count()===0:
        await buttons.evaluateAll(nodes=>nodes.every(node=>node.disabled)))&&
        await page.locator("#lesson-save").isDisabled(),
        "C129 published or invalid current lesson lists cannot enable order writes: "+(options.invalid?"invalid":"published"));
      await close(page);
    }
    for(const code of [403,419]){
      stage="revocation during delayed reorder "+code;const {page,control,hold}=await open(),held=hold();
      await page.locator(move()).click();await held.seen();control.audit={status:code,payload:{error:"access_denied"}};
      await page.locator("#refresh-audit").click();await page.waitForFunction(()=>state.accessDenied);
      held.release();await held.terminal();await settled(page);
      check(await page.locator("#lesson-items [data-move-lesson]").count()===0&&
        (await values(page)).every((value,index)=>index===2||value==="")&&
        await page.locator("#lesson-order-status").evaluate(node=>node.hidden&&node.textContent==="")&&
        await page.locator(".layout").evaluate(node=>node.inert)&&control.writes.length===1,
        "C129 HTTP "+code+" purges private fields and a late receipt cannot restore order, controls or text");
      await close(page);
    }
  }catch(error){
    failed=true;console.error("C129 lesson reorder failed at "+stage+": "+String(error.message).slice(0,300));throw error;
  }finally{
    for(const held of heldRequests)held.release();
    try{await bounded(context.close(),"context cleanup");}
    catch(error){if(!failed)throw error;console.error("C129 context cleanup exceeded its bound after the reported failure");}
    finally{for(const held of heldRequests)held.dispose();}
  }
};
