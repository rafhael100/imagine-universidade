"use strict";

// Invoked only by the existing guarded synthetic browser runner. The real
// server supplies the authorized lesson fixtures; this module intercepts
// only tutor POST responses and never submits lesson completion.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
  let completionWrites=0;
  const reply=(text="Orientação educativa sintética.")=>({reply:text,
    source:{lesson_slug:"visitas-ficticias",course_version:1}});
  const waitAnswer=(page,text)=>page.waitForFunction(value=>
    document.getElementById("lesson-help-answer")?.textContent.includes(value),text,{timeout:8000});
  const submit=async(page,question,message)=>{
    await page.locator("#lesson-help-question").fill(question);
    await page.locator("#lesson-help-submit").click();
    if(message)await waitAnswer(page,message);
  };
  function heldResponse(){
    let release,received;
    const result=new Promise(resolve=>{release=resolve;});
    const seen=new Promise(resolve=>{received=resolve;});
    return {seen,release,response:async()=>{received();return result;}};
  }
  async function open(response={status:503,payload:{error:"tutor_unavailable"}},lessonId=11){
    const page=await context.newPage(),posts=[];
    await ensureLocalPage(page);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    page.on("request",request=>{
      if(request.method()==="POST"&&/\/lessons\/\d+\/complete$/.test(new URL(request.url()).pathname))completionWrites++;
    });
    await page.route(base+"/universidade/private/lessons/*/tutor",async route=>{
      if(route.request().method()!=="POST")return route.continue();
      posts.push({url:route.request().url(),body:route.request().postDataJSON()});
      const result=typeof response==="function"?await response():response;
      await route.fulfill({status:result.status,contentType:"application/json",
        headers:{"Cache-Control":"private, no-store"},body:JSON.stringify(result.payload)});
    });
    await page.goto(base+"/student");
    await page.locator("#course-list [data-course-id='1']").click();
    await page.getByRole("heading",{name:"Visitas fictícias",exact:true}).waitFor({state:"visible",timeout:8000});
    if(lessonId===12){
      await page.locator("#lesson-items [data-lesson-id='12']").click();
      await page.getByRole("heading",{name:"Leads fictícios",exact:true}).waitFor({state:"visible",timeout:8000});
    }
    await page.locator("[data-lesson-help]").waitFor({state:"visible",timeout:8000});
    return {page,posts};
  }
  try{
    // A useful static path exists before any tutor request or provider.
    {
      const {page,posts}=await open();
      check(posts.length===0 && await page.locator("[data-lesson-help]").isVisible(),
        "C112 opening an authorized lesson never sends a tutor request");
      await page.locator("[data-help-static]").click();
      check((await page.locator("#lesson-help-answer").innerText()).includes("Um visitante fictício.") &&
        (await page.locator("#lesson-help-answer").innerText()).includes("Fonte: Visitas fictícias · versão 1") && posts.length===0,
        "C112 static review shows literal published material and exact source without POST");
      await page.locator("[data-help-source]").click();
      check(await page.evaluate(()=>document.activeElement?.classList.contains("lesson-text")),
        "C112 source action moves accessible focus to the already authorized lesson text");
      for(const question of ["ab","😀😀","x".repeat(501)]){
        await submit(page,question,"3 a 500 caracteres");
      }
      check(posts.length===0,"C112 short, astral-short and oversized questions are rejected before POST");
      await submit(page,"visitante fictício","tutoria está indisponível");
      check((await page.locator("#lesson-help-answer").innerText()).includes("Um visitante fictício.") &&
        (await page.locator("#lesson-help-answer").innerText()).includes("Trechos do material desta aula") && posts.length===1,
        "C112 503 produces useful literal fallback with one deliberate request");
      check(!(await page.locator("#lesson-content button.primary").isDisabled()) &&
        (await page.locator("#lesson-content button.primary").innerText()).includes("Marcar como concluída") &&
        !(await page.locator("#lesson-help-submit").isDisabled()),
        "C112 unavailable tutor keeps study, conclusion and manual help retry available");
      await submit(page,"😀".repeat(500),"Não encontrei um trecho correspondente");
      check(posts.length===2 && Array.from(posts[1].body.question).length===500,
        "C112 500 astral Unicode characters fit the form and reach the existing contract intact");
      await page.close();
    }

    {
      const text='<img src="invalid" onerror="window.unsafeTutor=true"> Orientação educativa sintética.';
      const payload=reply(text);payload.identity="private-field";payload.source.credential="secret-field";
      const {page,posts}=await open({status:200,payload});
      await submit(page,"Explique o exemplo fictício.","Orientação do tutor");
      const shown=await page.locator("#lesson-help-answer").innerText();
      check(shown.includes(text) && (await page.locator("#lesson-help-answer img").count())===0 &&
        shown.includes("Fonte: Visitas fictícias · versão 1"),
        "C112 valid response renders HTML as text and cites the exact lesson/version");
      check(posts.length===1 && Object.keys(posts[0].body).join(",")==="question" &&
        posts[0].url===base+"/universidade/private/lessons/11/tutor" &&
        !shown.includes("private-field") && !shown.includes("secret-field"),
        "C112 question body and rendered response retain only the allowed fields");
      await page.close();
    }

    for(const [name,payload] of [["malformed",{}],
      ["wrong slug",{...reply("UNTRUSTED-HELP"),source:{lesson_slug:"other-lesson",course_version:1}}],
      ["wrong version",{...reply("UNTRUSTED-HELP"),source:{lesson_slug:"visitas-ficticias",course_version:2}}]]){
      const {page,posts}=await open({status:200,payload});
      await submit(page,"visitante fictício","Não foi possível validar");
      const shown=await page.locator("#lesson-help-answer").innerText();
      check(shown.includes("Um visitante fictício.") && !shown.includes("UNTRUSTED-HELP") &&
        !shown.includes("Orientação do tutor") && posts.length===1,
        "C112 "+name+" response is rejected without losing literal study material");
      await page.close();
    }

    {
      const held=heldResponse(),{page,posts}=await open(held.response);
      await submit(page,"visitante fictício");await held.seen;
      await page.locator("[data-lesson-help] form").evaluate(form=>{
        form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
      });
      check(posts.length===1 && await page.locator("#lesson-help-submit").isDisabled() &&
        await page.locator("#lesson-help-question").isDisabled() &&
        !(await page.locator("#lesson-content button.primary").isDisabled()),
        "C112 duplicate submit cannot start another request or block conclusion");
      await page.locator("[data-help-static]").click();
      check((await page.locator("#lesson-help-answer").innerText()).includes("Um visitante fictício."),
        "C112 student may choose static material while a tutor response is pending");
      held.release({status:200,payload:reply("LATE-TUTOR-REPLY")});
      await page.waitForFunction(()=>!document.getElementById("lesson-help-submit").disabled);
      check(!(await page.locator("#lesson-help-answer").innerText()).includes("LATE-TUTOR-REPLY") && posts.length===1,
        "C112 late tutor response preserves the student's explicit material selection");
      await page.close();
    }

    for(const destination of ["lesson","filter"]){
      const held=heldResponse(),{page,posts}=await open(held.response);
      await submit(page,"visitante fictício");await held.seen;
      if(destination==="lesson"){
        await page.locator("#lesson-items [data-lesson-id='12']").click();
        await page.getByRole("heading",{name:"Leads fictícios",exact:true}).waitFor({state:"visible",timeout:8000});
        check((await page.locator("#lesson-help-question").inputValue())==="" &&
          (await page.locator("#lesson-help-answer").innerText())==="",
          "C112 switching lessons clears the previous question and response");
      }else{
        await page.locator('[data-filter="negocios"]').click();
        check((await page.locator("[data-lesson-help]").count())===0,
          "C112 changing category removes the old contextual help");
      }
      held.release({status:200,payload:reply("OBSOLETE-TUTOR-REPLY")});
      await page.waitForLoadState("networkidle");
      check(!(await page.locator("#lesson-content").innerText()).includes("OBSOLETE-TUTOR-REPLY") &&
        posts.length===1 && (destination==="lesson"
          ?(await page.locator("#lesson-content h3").innerText())==="Leads fictícios"
          :(await page.locator("[data-lesson-help]").count())===0),
        "C112 delayed response cannot restore help after "+destination+" navigation");
      await page.close();
    }

    for(const status of [403,419]){
      const {page,posts}=await open({status,payload:{error:"access_denied"}});
      await submit(page,"visitante fictício");
      await page.waitForFunction(()=>document.getElementById("course-list").textContent.includes("Biblioteca indisponível"));
      check((await page.locator("[data-lesson-help]").count())===0 &&
        (await page.locator("#lesson-content h3").count())===0 &&
        (await page.locator("#lesson-content button.primary").count())===0 &&
        (await page.locator("#course-list [data-course-id]").count())===0,
        "C112 "+status+" purges question, reply, protected material and completion");
      check(await page.locator("#resume-course").isDisabled() &&
        await page.locator("#export-progress").isDisabled() &&
        await page.locator("#lesson-search-submit").isDisabled() && posts.length===1,
        "C112 "+status+" keeps the private interface locked without automatic replay");
      await page.close();
    }

    {
      const {page,posts}=await open({status:404,payload:{error:"not_found"}},12);
      await submit(page,"Explique o interesse fictício.");
      await page.locator("[data-help-reload]").waitFor({state:"visible",timeout:8000});
      check((await page.locator("#lesson-help-answer blockquote").count())===0 &&
        (await page.locator("[data-help-source]").count())===0 && posts.length===1,
        "C112 missing source offers manual revalidation without old excerpts");
      await page.locator("[data-help-reload]").click();
      await page.getByRole("heading",{name:"Leads fictícios",exact:true}).waitFor({state:"visible",timeout:8000});
      check((await page.locator("#lesson-items [data-lesson-id='12']").getAttribute("aria-current"))==="true" &&
        (await page.locator("#lesson-help-answer").innerText())==="" && posts.length===1,
        "C112 manual source recovery preserves lesson 12 rather than opening pending lesson 11");
      await page.close();
    }
    check(completionWrites===0,"C112 all help paths leave lesson completion exclusively under student control");
  }finally{
    await context.close();
  }
};
