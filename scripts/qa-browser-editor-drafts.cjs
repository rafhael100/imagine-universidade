// C-113: invoked only by the existing synthetic Chromium runner. Every
// administrative request below is intercepted per page on its loopback origin;
// mutations never reach the runner's shared server or an external service.
module.exports=async function({browser,base,ensureLocalPage,check,pageErrors}){
  if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)){
    throw new Error("Editorial draft browser QA requires the synthetic loopback origin");
  }
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
  const courseFields=["course-title","course-summary","course-category","course-sort"];
  const lessonFields=["lesson-title","lesson-slug","lesson-body","lesson-sort"];
  async function setupPage(){
    const page=await context.newPage();
    await ensureLocalPage(page);
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    const fixture={
      course:{id:1,slug:"curso-rascunhos-ficticio",title:"Curso fictício de rascunhos",
        category:"metodologia",summary:"Resumo inicial fictício.",sort_order:0,is_published:false},
      lessons:[{id:11,slug:"aula-rascunhos-ficticia",title:"Aula fictícia inicial",
        body:"Conteúdo inicial fictício para o editor de aulas.",sort_order:0,status:"draft",is_published:false}],
      nextLessonId:12,denyLessons:false,writes:[],dialogs:[],acceptDialog:false,
    };
    let dialogCompletion=Promise.resolve();
    page.on("dialog",dialog=>{
      fixture.dialogs.push(dialog.message());
      dialogCompletion=fixture.acceptDialog?dialog.accept():dialog.dismiss();
    });
    await page.route(base+"/universidade/private/admin/**",async route=>{
      const request=route.request(),method=request.method();
      const path=new URL(request.url()).pathname.replace("/universidade/private/admin","");
      const body=request.postData()?request.postDataJSON():null;
      const reply=(status,payload)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify(payload)});
      if(method!=="GET")fixture.writes.push({path,method,body});
      if(method==="GET"&&path==="/courses")return reply(200,{courses:[fixture.course]});
      if(method==="GET"&&path==="/audit")return reply(200,{events:[],next_before_id:null});
      if(method==="GET"&&path==="/courses/1/lessons"){
        return fixture.denyLessons?reply(403,{error:"access_denied"}):reply(200,{lessons:fixture.lessons});
      }
      if(method==="PATCH"&&path==="/courses/1"){
        Object.assign(fixture.course,body);
        return reply(200,{saved:true});
      }
      if(method==="POST"&&path==="/courses/1/lessons"){
        const id=fixture.nextLessonId++;
        fixture.lessons.push({id,...body,status:"draft",is_published:false});
        return reply(201,{id,status:"draft"});
      }
      const target=path.match(/^\/lessons\/(\d+)$/);
      if(target){
        const index=fixture.lessons.findIndex(lesson=>lesson.id===Number(target[1]));
        if(index>=0&&method==="PATCH"){
          Object.assign(fixture.lessons[index],body);
          return reply(200,{saved:true});
        }
        if(index>=0&&method==="DELETE"){
          fixture.lessons.splice(index,1);
          return reply(200,{deleted:true});
        }
      }
      return reply(404,{error:"synthetic_route_not_found"});
    });
    await page.goto(base+"/admin");
    await page.locator("#course-items [data-course='1']").click();
    await page.locator("#lesson-items [data-lesson='11']").click();
    const fields=ids=>page.evaluate(keys=>keys.map(id=>document.getElementById(id).value),ids);
    const waitForStatus=text=>page.waitForFunction(expected=>
      document.getElementById("status").textContent.includes(expected),text);
    const confirmClick=async(selector,accept)=>{
      fixture.acceptDialog=accept;
      await Promise.all([page.waitForEvent("dialog"),page.locator(selector).click()]);
      await dialogCompletion;
    };
    return {page,fixture,fields,waitForStatus,confirmClick};
  }
  async function changeCourse(page,title,order){
    await page.locator("#course-title").fill(title);
    await page.locator("#course-summary").fill("  Resumo fictício ainda não salvo do curso.  ");
    await page.locator("#course-category").selectOption("negocios");
    await page.locator("#course-sort").fill(String(order));
  }
  try{
    const h=await setupPage(),{page,fixture}=h;
    await changeCourse(page,"Curso fictício com edição local",7);
    await page.locator("#lesson-title").fill("Aula fictícia com edição local");
    await page.locator("#lesson-body").fill("Texto fictício da aula, alterado antes de salvar os dois formulários.");
    await page.locator("#lesson-sort").fill("3");
    const courseDraft=await h.fields(courseFields),lessonDraft=await h.fields(lessonFields);

    await page.locator("#course-save").click();
    await h.waitForStatus("Salve a aula em edição antes de salvar o curso");
    check(fixture.writes.length===0&&fixture.dialogs.length===0,
      "dirty sibling lesson blocks course save before any write or discard confirmation");
    check(JSON.stringify(await h.fields(courseFields))===JSON.stringify(courseDraft)&&
      JSON.stringify(await h.fields(lessonFields))===JSON.stringify(lessonDraft),
      "blocked course save preserves both editorial drafts");

    await page.locator("#lesson-save").click();
    await h.waitForStatus("Aula salva em rascunho.");
    check(JSON.stringify(await h.fields(courseFields))===JSON.stringify(courseDraft),
      "saving a lesson preserves course title, summary, category and order exactly");
    check(await page.locator("#lesson-items [data-lesson='11'][aria-current='true']").count()===1&&
      JSON.stringify(await h.fields(lessonFields))===JSON.stringify(lessonDraft)&&
      await page.locator("#lesson-slug").isDisabled(),
      "saved lesson remains selected from the authorized list with its immutable slug");
    check(fixture.writes.length===1&&fixture.writes[0].method==="PATCH"&&fixture.writes[0].path==="/lessons/11",
      "saving the lesson writes only that lesson and never auto-saves the course");

    await page.locator("#course-save").click();
    await h.waitForStatus("Rascunho salvo.");
    check(await page.locator("#lesson-items [data-lesson='11'][aria-current='true']").count()===1&&
      JSON.stringify(await h.fields(lessonFields))===JSON.stringify(lessonDraft),
      "subsequent course save preserves the saved lesson and selection");
    const courseWrite=fixture.writes[1];
    check(fixture.writes.length===2&&courseWrite.method==="PATCH"&&courseWrite.path==="/courses/1"&&
      courseWrite.body.title===courseDraft[0]&&courseWrite.body.summary===courseDraft[1].trim()&&
      courseWrite.body.category===courseDraft[2]&&courseWrite.body.sort_order===7,
      "guided lesson-then-course save persists the exact course draft in a separate PATCH");

    await changeCourse(page,"Curso fictício pendente durante nova aula",9);
    const pendingCourse=await h.fields(courseFields);
    await page.locator("#clear-lesson").click();
    await page.locator("#lesson-title").fill("Nova aula fictícia selecionada");
    await page.locator("#lesson-slug").fill("nova-aula-ficticia-selecionada");
    await page.locator("#lesson-body").fill("Novo conteúdo fictício, salvo somente no servidor simulado desta página.");
    await page.locator("#lesson-sort").fill("4");
    await page.locator("#lesson-save").click();
    await h.waitForStatus("Aula salva em rascunho.");
    check(fixture.writes.length===3&&fixture.writes[2].method==="POST"&&
      fixture.writes[2].path==="/courses/1/lessons"&&
      await page.locator("#lesson-items [data-lesson='12'][aria-current='true']").count()===1&&
      (await page.locator("#lesson-slug").inputValue())==="nova-aula-ficticia-selecionada"&&
      await page.locator("#lesson-slug").isDisabled(),
      "new lesson selects the returned ID only after it exists in the authorized lesson list");
    check(JSON.stringify(await h.fields(courseFields))===JSON.stringify(pendingCourse),
      "new lesson creation preserves the independent course draft");

    await h.confirmClick("#delete-lesson",false);
    check(fixture.dialogs.length===1&&fixture.writes.length===3&&
      await page.locator("#lesson-items [data-lesson='12'][aria-current='true']").count()===1,
      "cancelled lesson deletion sends no DELETE and keeps the selected lesson");
    check(JSON.stringify(await h.fields(courseFields))===JSON.stringify(pendingCourse),
      "cancelled deletion preserves all pending course fields");
    await h.confirmClick("#delete-lesson",true);
    await h.waitForStatus("Aula em rascunho excluída.");
    check(fixture.dialogs.length===2&&fixture.writes.length===4&&
      fixture.writes[3].method==="DELETE"&&fixture.writes[3].path==="/lessons/12"&&
      await page.locator("#lesson-items [data-lesson='12']").count()===0&&
      (await page.locator("#lesson-body").inputValue())===""&&
      await page.locator("#delete-lesson").isDisabled(),
      "accepted deletion removes exactly the selected lesson without reviving its editor");
    check(JSON.stringify(await h.fields(courseFields))===JSON.stringify(pendingCourse),
      "accepted lesson deletion preserves the unsaved course draft");
    await page.close();

    const revoked=await setupPage();
    await changeCourse(revoked.page,"Curso fictício que deve desaparecer na revogação",6);
    await revoked.page.locator("#lesson-body").fill("Alteração fictícia antes da revogação durante a consulta posterior.");
    revoked.fixture.denyLessons=true;
    await revoked.page.locator("#lesson-save").click();
    await revoked.waitForStatus("Acesso administrativo não autorizado");
    const privateFields=await revoked.fields(["course-title","course-summary","lesson-title","lesson-body"]);
    check(privateFields.every(value=>value==="")&&
      await revoked.page.locator("#course-items [data-course]").count()===0&&
      await revoked.page.locator("#lesson-items [data-lesson]").count()===0,
      "403 after a lesson save purges the preserved sibling draft and all private selections");
    check(revoked.fixture.writes.length===1&&revoked.fixture.writes[0].method==="PATCH"&&
      await revoked.page.locator("#course-save").isDisabled()&&
      await revoked.page.locator("#lesson-save").isDisabled(),
      "revocation disables further editorial writes without replaying the saved lesson");
    await revoked.page.close();
  }finally{
    await context.close();
  }
};
