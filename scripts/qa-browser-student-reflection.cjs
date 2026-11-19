"use strict";

// Imported only by the guarded synthetic runner. The production view is real;
// each page owns its HTTP fixtures and contacts no operational data source.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors,out}){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
  const api=base+"/universidade/private",holds=new Set(),timestamp="2026-11-18T10:00:00Z";
  const ok=payload=>({status:200,payload});let stage="optional reflection",failed=false;
  async function bounded(promise,label){let timer;try{
    return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("C147 timeout: "+label)),8000);})]);
  }finally{clearTimeout(timer);}}
  const observe=promise=>{promise.catch(()=>{});return promise;};
  const close=page=>bounded(page.close(),"page cleanup");
  const ready=page=>page.waitForFunction(()=>state.libraryReady&&!state.libraryLoading&&state.favoritesReady&&!state.favoritesLoading&&
    !state.readingLoading&&state.readingSnapshot!==null);
  const selected=async(page,course=1,lesson=11)=>{
    await page.locator("#course-list [data-course-id='"+course+"']").click();
    await page.waitForFunction(id=>state.lessonId===id&&document.querySelector("#lesson-content h3")?.textContent==="Aula "+id,lesson);
  };
  const refresh=async page=>{await page.evaluate(()=>loadLibrary());await ready(page);};
  async function open(){
    const page=await context.newPage();await ensureLocalPage(page);
    page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(15000);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    const fixture={courses:[
      {id:1,slug:"curso-1",title:"Curso 1",summary:"Resumo",category:"metodologia"},
      {id:2,slug:"curso-2",title:"Curso 2",summary:"Resumo",category:"negocios"}],
      lessons:[11,12,21].map(id=>({id,slug:"aula-"+id,title:"Aula "+id,sort_order:id%10,course_id:id===21?2:1,course_version:2,
        body:"Introdução autorizada "+id+".\n\nEXEMPLO FICTÍCIO\nExemplo literal.\n\nAPLICAÇÃO OPCIONAL\nPrática opcional."})),
      completed:new Set(),favorites:[1,2],position:{course_id:1,course_version:2,lesson_id:12,saved_at:timestamp}};
    const control={requests:[],writes:[],overrides:new Map()};
    const catalog=()=>fixture.courses.map(course=>({...course,lessons_total:fixture.lessons.filter(lesson=>lesson.course_id===course.id).length,
      lessons_completed:fixture.lessons.filter(lesson=>lesson.course_id===course.id&&fixture.completed.has(lesson.id)).length}));
    const fallback=entry=>{
      const {path,method}=entry;
      if(path==="/initialize")return ok({ready:true});
      if(path==="/courses")return ok({courses:catalog()});
      if(path==="/favorites")return ok({course_ids:fixture.favorites.filter(id=>fixture.courses.some(course=>course.id===id))});
      if(path==="/reading-position")return ok({schema_version:1,scope:"current_authenticated_student",revision:"saved-private-revision",
        status:fixture.courses.some(course=>course.id===fixture.position.course_id)?"available":"unavailable",
        position:fixture.courses.some(course=>course.id===fixture.position.course_id)?fixture.position:null});
      if(/^\/courses\/\d+\/lessons$/.test(path))return ok({lessons:fixture.lessons.filter(lesson=>lesson.course_id===Number(path.split("/")[2]))
        .map(lesson=>({id:lesson.id,slug:lesson.slug,title:lesson.title,sort_order:lesson.sort_order,completed:fixture.completed.has(lesson.id)?1:0}))});
      if(/^\/lessons\/\d+$/.test(path))return ok({lesson:fixture.lessons.find(lesson=>lesson.id===Number(path.split("/")[2]))});
      if(path.endsWith("/progress"))return ok({completed:fixture.completed.has(Number(path.split("/")[2]))});
      if(path.endsWith("/complete")&&method==="POST"){
        fixture.completed.add(Number(path.split("/")[2]));return ok({completed:true});
      }
      return {status:404,payload:{error:"not_found"}};
    };
    await page.route(api+"/**",async route=>{
      const request=route.request(),entry={path:new URL(request.url()).pathname.replace("/universidade/private",""),method:request.method()};
      control.requests.push(entry);if(entry.method!=="GET"&&entry.path!=="/initialize")control.writes.push(entry);
      const override=control.overrides.get(entry.path),result=(typeof override==="function"?await override(entry):override)??fallback(entry);
      await route.fulfill({status:result.status,contentType:"application/json",headers:{"Cache-Control":"private, no-store"},body:JSON.stringify(result.payload)});
    });
    const hold=(path,result)=>{
      let release,seen;const gate=new Promise(resolve=>{release=resolve;}),started=new Promise(resolve=>{seen=resolve;});
      const item={seen:()=>bounded(started,"request start "+path),release:()=>{control.overrides.delete(path);release();holds.delete(item);}};
      control.overrides.set(path,async entry=>{seen();await bounded(gate,"held response "+path);return result??fallback(entry);});holds.add(item);return item;
    };
    await page.goto(base+"/student");await page.bringToFront();await ready(page);
    return {page,fixture,control,catalog,hold};
  }
  const expand=async page=>{await page.locator('[data-lesson-reflection] summary').click();};
  const fill=async(page,text)=>{await page.locator('#lesson-reflection-text').fill(text);};
  const compare=async page=>{await page.locator('[data-reflection-review]').click();};
  const remember=page=>page.evaluate(()=>{window.__c147={panel:document.querySelector('[data-lesson-reflection]'),
    field:document.getElementById('lesson-reflection-text'),review:document.getElementById('lesson-reflection-review'),
    compare:document.querySelector('[data-reflection-review]')};});
  const oldErased=page=>page.evaluate(()=>window.__c147.field.value===''&&window.__c147.review.textContent===''&&
    !window.__c147.panel.isConnected);
  try{
    {
      stage='optional local review';const {page,control,fixture}=await open();
      check(await page.locator('[data-lesson-reflection]').count()===0,'C147 no reflection exists before an authorized lesson');
      fixture.lessons[0].body='Introdução autorizada.\n\nEXEMPLO FICTÍCIO\n<img src=x onerror=alert(1)> Texto literal.\n\nAPLICAÇÃO OPCIONAL\nPrática opcional.';
      const before=control.requests.length;await selected(page);
      check(await page.evaluate(()=>!document.querySelector('[data-lesson-reflection]').open)&&
        JSON.stringify(control.requests.slice(before).map(row=>row.method+' '+row.path).sort())===
        JSON.stringify(['GET /courses/1/lessons','GET /lessons/11','GET /lessons/11/progress']),
        'C147 reflection starts closed and adds no request to the existing lesson reads');
      await expand(page);const requests=control.requests.length;
      await fill(page,'Minha ideia fictícia.');await page.locator('#lesson-reflection-text').press('Tab');
      check(await page.evaluate(()=>document.activeElement===document.querySelector('[data-reflection-review]')),
        'C147 keyboard moves from the labelled text input to its optional self-review action');
      await page.keyboard.press('Enter');
      check((await page.locator('#lesson-reflection-review').innerText()).includes('<img src=x onerror=alert(1)> Texto literal.')&&
        (await page.locator('#lesson-reflection-review').innerText()).includes('Fonte: Aula 11 · versão 2')&&
        await page.locator('#lesson-reflection-review img').count()===0&&control.requests.length===requests&&control.writes.length===0,
        'C147 self-review cites literal authorized sections without interpreting HTML or sending the draft');
      await fill(page,'😀'.repeat(2000));await compare(page);
      check((await page.locator('#lesson-reflection-text').inputValue())==='😀'.repeat(2000)&&
        (await page.locator('#lesson-reflection-count').innerText()).includes('2000 de 2.000')&&
        await page.locator('#lesson-reflection-review blockquote').count()===2,
        'C147 real textarea preserves all 2000 astral Unicode characters');
      await fill(page,'a'.repeat(2001));await compare(page);
      check((await page.locator('#lesson-reflection-text').inputValue()).length===2001&&
        (await page.locator('#lesson-reflection-review').innerText()).includes('1 a 2.000 caracteres')&&
        await page.locator('#lesson-reflection-review blockquote').count()===0&&
        !(await page.locator('#lesson-content button.primary').isDisabled())&&control.requests.length===requests,
        'C147 oversized draft remains correctable and never blocks study or completion');
      await page.locator('[data-reflection-clear]').click();
      check(await page.locator('#lesson-reflection-text').inputValue()===''&&
        await page.evaluate(()=>document.activeElement===document.getElementById('lesson-reflection-text'))&&control.requests.length===requests,
        'C147 explicit clearing erases only the local draft and returns focus');
      await fill(page,'Eu explicaria a ideia usando uma situação fictícia e compararia meu exemplo com a aplicação da aula.');await compare(page);
      for(const width of [1440,390]){
        await page.setViewportSize({width,height:1000});
        check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
          'C147 reflection and literal source fit viewport '+width);
        if(out)await page.locator('[data-lesson-reflection]').screenshot({path:require('node:path').join(out,'student-reflection-'+width+'.png')});
      }
      await close(page);
    }
    {
      stage='same lesson continuity';const {page,control,fixture}=await open();await selected(page);await expand(page);
      await fill(page,'Reflexão temporária preservada.');await compare(page);await remember(page);
      await page.evaluate(()=>selectLesson(11));
      check(await page.evaluate(()=>document.querySelector('[data-lesson-reflection]')===window.__c147.panel)&&
        await page.locator('#lesson-reflection-text').inputValue()==='Reflexão temporária preservada.',
        'C147 same lesson reread reuses the panel without dropping the reflection');
      await page.locator('#lesson-content button.primary').click();
      await page.waitForFunction(()=>state.courses.find(course=>course.id===1).lessons_completed===1);
      await refresh(page);
      check(await page.locator('#lesson-reflection-text').inputValue()==='Reflexão temporária preservada.'&&
        await page.evaluate(()=>document.querySelector('[data-lesson-reflection]')===window.__c147.panel)&&
        control.writes.length===1&&control.writes[0].path==='/lessons/11/complete',
        'C147 completion and validated catalogue refresh preserve reflection with only the requested progress write');
      fixture.lessons[0].course_version=3;await page.evaluate(()=>selectLesson(11));
      check(await oldErased(page)&&await page.locator('#lesson-reflection-text').inputValue()==='',
        'C147 new lesson version scrubs the old detached draft before rendering a fresh reflection');
      await close(page);
    }
    for(const destination of ['lesson','course','filter','withdrawal']){
      stage='departure '+destination;const {page,fixture}=await open();await selected(page);await expand(page);
      await fill(page,'Texto reservado.');await compare(page);await remember(page);
      if(destination==='lesson')await page.evaluate(()=>selectLesson(12));
      if(destination==='course')await selected(page,2,21);
      if(destination==='filter')await page.locator('[data-filter="negocios"]').click();
      if(destination==='withdrawal'){fixture.courses=fixture.courses.filter(course=>course.id!==1);await refresh(page);}
      await page.evaluate(()=>window.__c147.compare.click());
      check(await oldErased(page), 'C147 '+destination+' erases detached text and old controls cannot recreate review');
      await close(page);
    }
    for(const code of [403,419]){
      stage='access denial '+code;const {page,control}=await open();await selected(page);await expand(page);
      await fill(page,'Texto reservado.');await compare(page);await remember(page);
      control.overrides.set('/favorites',{status:code,payload:{}});await page.evaluate(()=>loadFavorites());
      await page.evaluate(()=>window.__c147.compare.click());
      check(await oldErased(page)&&await page.evaluate(()=>activeReflection===null&&state.accessDenied)&&control.writes.length===0,
        'C147 '+code+' scrubs reflection and keeps access closed without any learning write');
      await close(page);
    }
    {
      stage='delayed same lesson after denial';const {page,control,hold}=await open();await selected(page);await expand(page);
      await fill(page,'Texto temporário.');await remember(page);
      const gate=hold('/lessons/11'),pending=observe(page.evaluate(()=>selectLesson(11)));await gate.seen();
      control.overrides.set('/favorites',{status:403,payload:{}});await page.evaluate(()=>api('/favorites').catch(()=>{}));
      gate.release();await bounded(pending,'late same-lesson read');
      check(await oldErased(page)&&await page.locator('[data-lesson-reflection]').count()===0&&control.writes.length===0,
        'C147 delayed lesson response cannot restore an erased reflection after revocation');
      await close(page);
    }
    {
      stage='page lifecycle cleanup';const {page,control}=await open();await selected(page);await expand(page);
      await fill(page,'Texto que não volta.');await compare(page);const requests=control.requests.length;
      await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
      check(await page.locator('#lesson-reflection-text').inputValue()===''&&
        await page.evaluate(()=>!document.querySelector('[data-lesson-reflection]').open&&document.getElementById('lesson-reflection-review').textContent==='')&&
        control.requests.length===requests,'C147 pagehide purges reflection and review before possible document restoration');
      await close(page);
    }
  }catch(error){failed=true;throw new Error('C147 '+stage+': '+error.message,{cause:error});}
  finally{
    for(const held of Array.from(holds))held.release();
    try{await bounded(context.close(),'context cleanup');}catch(error){if(!failed)throw error;}
  }
};
