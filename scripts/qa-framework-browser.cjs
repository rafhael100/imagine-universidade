#!/usr/bin/env node
"use strict";

// C-117: real Laravel HTTP/session/CSRF + a disposable SQLite database.
// Authentication fixtures exist only in tests/Browser; no business response
// is fulfilled, patched, mocked or replayed by this runner.
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const {setTimeout:delay}=require("node:timers/promises");

function requireLab(condition,label){if(!condition)throw new Error("HOLD framework browser: "+label);}
requireLab(process.env.CI==="true"&&process.env.GITHUB_ACTIONS==="true"&&
  process.env.GITHUB_REPOSITORY==="rafhael100/imagine-universidade"&&
  process.env.UNI_FRAMEWORK_BROWSER_LAB==="synthetic"&&process.env.APP_ENV==="synthetic-framework-browser",
  "disposable GitHub Actions laboratory required");
const token=process.env.UNI_FRAMEWORK_BROWSER_TOKEN||"";
requireLab(/^[a-f0-9]{64}$/.test(token),"ephemeral laboratory token required");
const base=process.env.UNI_FRAMEWORK_BROWSER_BASE_URL||"";
requireLab(/^http:\/\/127\.0\.0\.1:\d+$/.test(base),"explicit loopback origin required");
const origin=new URL(base);
requireLab(Number(origin.port)>=1024&&Number(origin.port)<=65535,"valid private laboratory port required");
const inside=(child,parent)=>{
  const relative=path.relative(parent,child);
  return relative!==""&&!relative.startsWith(".."+path.sep)&&relative!==".."&&!path.isAbsolute(relative);
};
let runDir,controlFile,evidenceDir,runnerTemp;
try{
  runnerTemp=fs.realpathSync(process.env.RUNNER_TEMP||"");
  runDir=fs.realpathSync(process.env.UNI_FRAMEWORK_BROWSER_DIR||"");
  controlFile=fs.realpathSync(process.env.UNI_FRAMEWORK_BROWSER_CONTROL||"");
  evidenceDir=fs.realpathSync(process.env.UNI_FRAMEWORK_BROWSER_EVIDENCE||"");
}catch{throw new Error("HOLD framework browser: existing isolated temporary paths required");}
requireLab(inside(runDir,runnerTemp)&&/^uni-framework-browser\.[A-Za-z0-9]+$/.test(path.basename(runDir)),
  "unique laboratory directory must be inside RUNNER_TEMP");
requireLab(controlFile===path.join(runDir,"authority.json")&&fs.statSync(controlFile).isFile(),
  "authority control must belong to this laboratory");
requireLab(inside(evidenceDir,runnerTemp)&&!inside(evidenceDir,runDir)&&evidenceDir!==runDir&&
  fs.statSync(evidenceDir).isDirectory(),"evidence must use a separate RUNNER_TEMP directory");
const expectedControlKeys=["editor","schema_version","student-a","student-b"];
function readAuthority(){
  let control;
  try{control=JSON.parse(fs.readFileSync(controlFile,"utf8"));}
  catch{throw new Error("Invalid synthetic authority control");}
  requireLab(control&&typeof control==="object"&&!Array.isArray(control)&&
    JSON.stringify(Object.keys(control).sort())===JSON.stringify(expectedControlKeys)&&
    control.schema_version===1&&["editor","student-a","student-b"].every(key=>typeof control[key]==="boolean"),
    "strict synthetic authority control required");
  return control;
}
const originalAuthority=readAuthority();
requireLab(["editor","student-a","student-b"].every(key=>originalAuthority[key]===true),
  "fresh enabled synthetic identities required");
function setAuthority(profile,allowed){
  requireLab(["editor","student-a","student-b"].includes(profile)&&typeof allowed==="boolean",
    "only fixed synthetic profiles may change");
  const control=readAuthority();control[profile]=allowed;
  const temporary=path.join(runDir,"authority."+process.pid+"."+crypto.randomBytes(6).toString("hex")+".tmp");
  fs.writeFileSync(temporary,JSON.stringify(control)+"\n",{mode:0o600,flag:"wx"});
  try{fs.renameSync(temporary,controlFile);}finally{fs.rmSync(temporary,{force:true});}
}

let checks=0,stage="health",browser;
const pageErrors=[],businessRequests=[],contexts=[];
function enterStage(value){stage=value;console.log("RUN framework browser stage: "+value);}
const check=(condition,label)=>{if(!condition)throw new Error(label);checks++;};
const json=async(response,label)=>{
  try{return await response.json();}catch{throw new Error(label+": expected a JSON response");}
};
async function awaitHealth(){
  const expected=crypto.createHash("sha256").update(token).digest("hex");
  const deadline=Date.now()+20000;
  let lastBootstrapFailure=null;
  while(Date.now()<deadline){
    let response;
    try{
      response=await fetch(base+"/__uni_ci/health",{
        headers:{"X-Uni-Framework-Lab":token,Accept:"application/json"},
        signal:AbortSignal.timeout(1000),redirect:"error",
      });
    }catch{await delay(150);continue;}
    if(response.ok){
      const health=await json(response,"Laboratory health");
      requireLab(health.lab==="uni-framework-browser"&&health.instance===expected&&
        health.environment==="synthetic-framework-browser","health must match this exact laboratory instance");
      return;
    }
    // Bootstrap failures expose only a fixed stage and exception class.
    // Never retain or print raw response bodies, exception messages or headers.
    let failure;
    try{failure=await response.json();}catch{failure=null;}
    if(failure?.error==="lab_bootstrap_failed"&&
      typeof failure.stage==="string"&&failure.stage.length<=50&&/^[a-z_-]+$/.test(failure.stage)&&
      typeof failure.type==="string"&&failure.type.length<=150&&/^[A-Za-z_\\][A-Za-z0-9_\\]*$/.test(failure.type)){
      lastBootstrapFailure={stage:failure.stage,type:failure.type};
    }
    await delay(150);
  }
  const diagnostic=lastBootstrapFailure
    ?" (bootstrap stage="+lastBootstrapFailure.stage+"; type="+lastBootstrapFailure.type+")":"";
  throw new Error("The isolated Laravel laboratory did not become ready"+diagnostic);
}
function responseFor(page,method,route){
  return page.waitForResponse(response=>response.request().method()===method&&response.url()===base+route);
}
async function clickResponse(page,selector,method,route){
  const [response]=await Promise.all([responseFor(page,method,route),page.locator(selector).click()]);
  return response;
}
async function confirmResponse(page,selector,method,route,prefix){
  const dialogue=page.waitForEvent("dialog").then(async dialog=>{
    const matches=dialog.type()==="confirm"&&dialog.message().startsWith(prefix);
    if(matches)await dialog.accept();else await dialog.dismiss();
    check(matches,"Editorial confirmation must describe the requested action");
  });
  const [response]=await Promise.all([responseFor(page,method,route),page.locator(selector).click(),dialogue]);
  return response;
}
const waitText=(page,id,text)=>page.waitForFunction(({id,text})=>
  document.getElementById(id)?.textContent.includes(text),{id,text});
const fields=(page,ids)=>page.evaluate(keys=>keys.map(id=>document.getElementById(id).value),ids);
const csrf=page=>page.locator('meta[name="csrf-token"]').getAttribute("content");
const headers=async page=>({Accept:"application/json","X-CSRF-TOKEN":await csrf(page)});
const countWrites=profile=>businessRequests.filter(request=>request.profile===profile&&
  ["POST","PUT","PATCH","DELETE"].includes(request.method)).length;
async function session(profile){
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:"reduce"});
  contexts.push(context);context.setDefaultTimeout(15000);context.setDefaultNavigationTimeout(20000);
  // This is the only request routing: external origins are aborted. All
  // same-origin Laravel business requests continue to the actual server.
  await context.route("**/*",route=>{
    const url=new URL(route.request().url());
    return url.origin===base?route.continue():route.abort();
  });
  const guest=await context.request.get(base+"/universidade/private/courses",{headers:{Accept:"application/json"}});
  check(guest.status()===403,"A context without a server session cannot read the private catalogue");
  const bootstrap=await context.request.get(base+"/__uni_ci/session",{
    headers:{"X-Uni-Framework-Lab":token,Accept:"application/json"},
  });
  const initial=await json(bootstrap,"Session bootstrap");
  check(bootstrap.status()===200&&typeof initial.csrf_token==="string"&&initial.csrf_token.length>=20,
    "The test-only session bootstrap must create a real CSRF token");
  const logged=await context.request.post(base+"/__uni_ci/session/"+profile,{
    headers:{"X-Uni-Framework-Lab":token,"X-CSRF-TOKEN":initial.csrf_token,Accept:"application/json"},
    data:{},
  });
  const result=await json(logged,"Synthetic session login");
  check(logged.status()===200&&result.ready===true&&result.profile===profile&&
    typeof result.csrf_token==="string"&&result.csrf_token.length>=20,
    "A fixed test profile must receive its server-owned session");
  const page=await context.newPage();
  page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,200)));
  page.on("request",request=>{
    const route=new URL(request.url()).pathname;
    if(!route.startsWith("/universidade/private/"))return;
    businessRequests.push({profile,path:route,method:request.method(),
      body:request.postData()?request.postDataJSON():null});
  });
  return {context,page,profile};
}
async function openStudent(student,courseId,lessonTitle){
  await student.page.goto(base+"/universidade/private/app");
  await student.page.locator("#course-list [data-course-id='"+courseId+"']").click();
  await student.page.getByRole("heading",{name:lessonTitle,exact:true}).waitFor({state:"visible"});
  await student.page.waitForFunction(()=>!document.getElementById("course-favorite-toggle").disabled);
}
async function favorite(student,courseId,desired){
  const response=await clickResponse(student.page,"#course-favorite-toggle",desired?"PUT":"DELETE",
    "/universidade/private/courses/"+courseId+"/favorite");
  const receipt=await json(response,"Favorite mutation");
  check(response.status()===200&&receipt.course_id===courseId&&receipt.favorite===desired,
    "Favorite mutation must return the exact course and boolean state from Laravel");
  await student.page.waitForFunction(value=>
    document.getElementById("course-favorite-toggle").getAttribute("aria-pressed")===String(value)&&
    !document.getElementById("course-favorite-toggle").disabled,desired);
}
async function exportFavorites(student,expectedSlugs){
  const [download,response]=await Promise.all([
    student.page.waitForEvent("download"),
    responseFor(student.page,"GET","/universidade/private/favorites/export"),
    student.page.locator("#export-favorites").click(),
  ]);
  check(response.status()===200&&
    (response.headers()["cache-control"]||"").includes("no-store")&&
    response.headers()["content-disposition"]==='attachment; filename="imagine-universidade-favoritos.json"',
    "The real favorites export must be private and use the fixed attachment name");
  let payload;
  try{payload=JSON.parse(fs.readFileSync(await download.path(),"utf8"));}
  finally{await download.delete();}
  check(download.suggestedFilename()==="imagine-universidade-favoritos.json"&&
    payload.schema_version===1&&payload.scope==="current_authenticated_student"&&
    JSON.stringify(Object.keys(payload).sort())===JSON.stringify(["favorites","schema_version","scope"])&&
    Array.isArray(payload.favorites)&&
    JSON.stringify(payload.favorites.map(row=>row.course_slug).sort())===JSON.stringify([...expectedSlugs].sort())&&
    payload.favorites.every(row=>JSON.stringify(Object.keys(row).sort())===JSON.stringify(["course_slug","saved_at"])&&
      typeof row.saved_at==="string"&&/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(row.saved_at)),
    "The browser must download only this student's course references and original save timestamps");
}
async function publish(editor,courseId,version){
  const before=await clickResponse(editor.page,"#check-publication","GET",
    "/universidade/private/admin/courses/"+courseId+"/publication-check");
  const diagnostic=await json(before,"Publication readiness");
  await editor.page.locator("#publication-readiness").waitFor({state:"visible"});
  check(before.status()===200&&diagnostic.course_id===courseId&&diagnostic.version===version&&
    diagnostic.ready===true&&diagnostic.advisory_only===true&&/^[a-f0-9]{64}$/.test(diagnostic.content_hash),
    "Real publication preflight must identify the exact ready draft and content hash");
  const reread=responseFor(editor.page,"GET","/universidade/private/admin/courses/"+courseId+"/publication-check");
  const response=await confirmResponse(editor.page,"#publish","POST",
    "/universidade/private/admin/courses/"+courseId+"/publish","Publicar esta versão revisada");
  const reviewed=await json(await reread,"Publication recheck");
  const request=response.request().postDataJSON();
  const receipt=await json(response,"Publication receipt");
  await waitText(editor.page,"status","Versão do curso publicada");
  check(response.status()===200&&receipt.published===true&&
    Object.keys(request).length===1&&request.expected_content_hash===reviewed.content_hash&&
    reviewed.content_hash===diagnostic.content_hash,
    "UI publication must send the exact hash rechecked by the real backend");
}

async function main(){
  enterStage("health");
  await awaitHealth();
  // Require/launch Chromium only after a token-bound health response proves
  // the randomly selected local port belongs to this test instance.
  const {chromium}=require("playwright");
  browser=await chromium.launch({headless:true});
  enterStage("editorial session and CSRF");
  const editor=await session("editor");
  const adminRoot="/universidade/private/admin";
  const invalid=await editor.context.request.post(base+adminRoot+"/courses",{
    headers:{Accept:"application/json"},data:{slug:"must-not-exist",title:"CSRF must reject this",category:"metodologia"},
  });
  const invalidBody=await json(invalid,"CSRF rejection");
  check(invalid.status()===419&&invalidBody&&typeof invalidBody==="object"&&!Array.isArray(invalidBody)&&
    !invalid.headers().location&&
    (invalid.headers()["cache-control"]||"").includes("no-store"),
    "Actual Laravel middleware must reject a business POST without CSRF and prevent caching");
  await editor.page.goto(base+adminRoot+"/app");
  await editor.page.waitForFunction(()=>!document.getElementById("new-course").disabled);
  check(await editor.page.locator("#course-items [data-course]").count()===0,
    "Rejected CSRF request must not create a course in SQLite");

  enterStage("course and lesson creation");
  await editor.page.locator("#course-title").fill("Curso sintético do laboratório HTTP");
  await editor.page.locator("#course-slug").fill("curso-framework-sintetico");
  await editor.page.locator("#course-summary").fill("Material fictício, sem clientes reais.");
  const created=await clickResponse(editor.page,"#course-save","POST",adminRoot+"/courses");
  const createdBody=await json(created,"Course creation"),courseId=createdBody.id;
  await waitText(editor.page,"status","Rascunho salvo.");
  check(created.status()===201&&Number.isSafeInteger(courseId)&&courseId>0,
    "The editor UI must create a real draft course");
  const firstTitle="Primeira aula sintética";
  const firstBody="Contexto sintético para a leitura.\n\nEXEMPLO FICTÍCIO\nUm visitante fictício consulta uma página.\n\nAPLICAÇÃO OPCIONAL\nDesenhe uma jornada fictícia.";
  await editor.page.locator("#lesson-title").fill(firstTitle);
  await editor.page.locator("#lesson-slug").fill("aula-principal-sintetica");
  await editor.page.locator("#lesson-body").fill(firstBody);
  const lessonCreated=await clickResponse(editor.page,"#lesson-save","POST",adminRoot+"/courses/"+courseId+"/lessons");
  const firstLessonId=(await json(lessonCreated,"Lesson creation")).id;
  await waitText(editor.page,"status","Aula salva em rascunho.");
  check(lessonCreated.status()===201&&Number.isSafeInteger(firstLessonId)&&firstLessonId>0,
    "The editor UI must create a real lesson with a database identity");

  await editor.page.locator("#clear-lesson").click();
  await editor.page.locator("#lesson-title").fill("Aula temporária sintética");
  await editor.page.locator("#lesson-slug").fill("aula-temporaria-sintetica");
  await editor.page.locator("#lesson-body").fill("Conteúdo temporário fictício para testar exclusão de rascunho.");
  const temporaryLesson=await clickResponse(editor.page,"#lesson-save","POST",adminRoot+"/courses/"+courseId+"/lessons");
  const temporaryLessonId=(await json(temporaryLesson,"Temporary lesson creation")).id;
  await editor.page.locator("#lesson-items [data-lesson='"+temporaryLessonId+"'][aria-current='true']").waitFor();
  const deletedLesson=await confirmResponse(editor.page,"#delete-lesson","DELETE",
    adminRoot+"/lessons/"+temporaryLessonId,"Excluir esta aula em rascunho");
  await waitText(editor.page,"status","Aula em rascunho excluída.");
  check(deletedLesson.status()===200&&await editor.page.locator("#lesson-items [data-lesson='"+temporaryLessonId+"']").count()===0,
    "Confirmed UI deletion removes only the temporary draft lesson");

  enterStage("independent course and lesson drafts");
  await editor.page.locator("#lesson-items [data-lesson='"+firstLessonId+"']").click();
  await editor.page.locator("#course-title").fill("Curso sintético revisado");
  await editor.page.locator("#course-summary").fill("  Resumo fictício que deve sobreviver ao salvamento da aula.  ");
  await editor.page.locator("#course-category").selectOption("negocios");
  await editor.page.locator("#course-sort").fill("5");
  const revisedBody=firstBody+"\n\nCUIDADO IMPORTANTE\nEste material usa somente exemplos fictícios.";
  await editor.page.locator("#lesson-body").fill(revisedBody);
  const courseFields=["course-title","course-summary","course-category","course-sort"];
  const pendingCourse=await fields(editor.page,courseFields),writesBefore=countWrites("editor");
  await editor.page.locator("#course-save").click();
  await waitText(editor.page,"status","Salve a aula em edição antes de salvar o curso");
  check(countWrites("editor")===writesBefore,"A dirty sibling lesson must prevent the real course PATCH");
  const lessonSaved=await clickResponse(editor.page,"#lesson-save","PATCH",adminRoot+"/lessons/"+firstLessonId);
  await waitText(editor.page,"status","Aula salva em rascunho.");
  check(lessonSaved.status()===200&&JSON.stringify(await fields(editor.page,courseFields))===JSON.stringify(pendingCourse),
    "A real lesson save preserves all unsaved course metadata");
  const courseSaved=await clickResponse(editor.page,"#course-save","PATCH",adminRoot+"/courses/"+courseId);
  await waitText(editor.page,"status","Rascunho salvo.");
  check(courseSaved.status()===200&&(await editor.page.locator("#lesson-body").inputValue())===revisedBody&&
    await editor.page.locator("#lesson-items [data-lesson='"+firstLessonId+"'][aria-current='true']").count()===1,
    "Saving the real course preserves the saved lesson and its selection");

  await editor.page.locator("#new-course").click();
  await editor.page.locator("#course-title").fill("Curso temporário sintético");
  await editor.page.locator("#course-slug").fill("curso-temporario-sintetico");
  const temporaryCourse=await clickResponse(editor.page,"#course-save","POST",adminRoot+"/courses");
  const temporaryCourseId=(await json(temporaryCourse,"Temporary course creation")).id;
  await waitText(editor.page,"status","Rascunho salvo.");
  const deletedCourse=await confirmResponse(editor.page,"#delete-course","DELETE",
    adminRoot+"/courses/"+temporaryCourseId,"Excluir definitivamente este curso");
  await waitText(editor.page,"status","Rascunho nunca publicado excluído");
  check(deletedCourse.status()===200&&await editor.page.locator("#course-items [data-course]").count()===1,
    "The real never-published course DELETE preserves the other course");
  await editor.page.locator("#course-items [data-course='"+courseId+"']").click();
  await editor.page.locator("#lesson-items [data-lesson='"+firstLessonId+"']").waitFor();
  enterStage("publication and audit");
  await publish(editor,courseId,1);
  const audited=await clickResponse(editor.page,"#refresh-audit","GET",adminRoot+"/audit");
  const audit=await json(audited,"Editorial audit");
  const actions=new Set((audit.events||[]).map(event=>event.action));
  check(audited.status()===200&&["course.created","course.updated","course.deleted","lesson.created",
    "lesson.updated","lesson.deleted","course.published"].every(action=>actions.has(action)),
    "SQLite must persist the actual editorial audit for all exercised mutations");
  await editor.page.locator("#audit-items .audit-row").first().waitFor({state:"visible"});
  await editor.page.screenshot({path:path.join(evidenceDir,"framework-editor.png"),fullPage:true});

  enterStage("independent student sessions");
  const studentA=await session("student-a"),studentB=await session("student-b");
  await openStudent(studentA,courseId,firstTitle);
  await openStudent(studentB,courseId,firstTitle);
  const forbiddenAdmin=await studentA.context.request.get(base+adminRoot+"/courses",{headers:{Accept:"application/json"}});
  check(forbiddenAdmin.status()===403,"A learner's real session must not authorize editorial endpoints");
  check((await studentA.page.locator("#course-favorite-toggle").getAttribute("aria-pressed"))==="false"&&
    (await studentB.page.locator("#course-favorite-toggle").getAttribute("aria-pressed"))==="false",
    "Fresh student companies must begin without private favorites");
  await favorite(studentA,courseId,true);
  await openStudent(studentA,courseId,firstTitle);
  await openStudent(studentB,courseId,firstTitle);
  check((await studentA.page.locator("#course-favorite-toggle").getAttribute("aria-pressed"))==="true"&&
    (await studentB.page.locator("#course-favorite-toggle").getAttribute("aria-pressed"))==="false",
    "A persisted favorite must survive reload without appearing in the other company");
  await favorite(studentB,courseId,true);
  await favorite(studentA,courseId,false);
  await openStudent(studentB,courseId,firstTitle);
  check((await studentB.page.locator("#course-favorite-toggle").getAttribute("aria-pressed"))==="true",
    "Removing one company's favorite must preserve the same person's other-company preference");
  await favorite(studentA,courseId,true);

  enterStage("completion and disabled tutor");
  const completion=await clickResponse(studentA.page,"#lesson-content button.primary","POST",
    "/universidade/private/lessons/"+firstLessonId+"/complete");
  await studentA.page.waitForFunction(()=>{
    const button=document.querySelector("#lesson-content button.primary");
    return button?.disabled===true&&button.textContent.includes("Aula concluída");
  });
  const completed=await json(completion,"Lesson completion");
  check(completion.status()===200&&completed.completed===true&&
    (await studentA.page.locator("#lesson-content button.primary").innerText()).includes("Aula concluída"),
    "Student completion must be confirmed by the real database-backed API");
  await openStudent(studentB,courseId,firstTitle);
  check(!(await studentB.page.locator("#lesson-content button.primary").isDisabled())&&
    (await studentB.page.locator("#lesson-content button.primary").innerText()).includes("Marcar como concluída"),
    "Completion must not cross companies even when the synthetic person identifier is the same");
  const tutorWrites=countWrites("student-a");
  await studentA.page.locator("#lesson-help-question").fill("Explique o visitante fictício desta aula.");
  const tutor=await clickResponse(studentA.page,"#lesson-help-submit","POST",
    "/universidade/private/lessons/"+firstLessonId+"/tutor");
  await waitText(studentA.page,"lesson-help-answer","A tutoria está indisponível");
  check(tutor.status()===503&&(await json(tutor,"Disabled tutor")).error==="tutor_unavailable"&&
    (await studentA.page.locator("#lesson-help-answer").innerText()).includes("Um visitante fictício"),
    "The default disabled tutor must return real 503 while literal authorized material remains useful");
  check(countWrites("student-a")===tutorWrites+1&&await studentA.page.locator("#lesson-content button.primary").isDisabled(),
    "The tutor fallback must not create another completion or mutate learning state");

  enterStage("withdrawal and retained private history");
  const withdrawn=await confirmResponse(editor.page,"#unpublish","POST",
    adminRoot+"/courses/"+courseId+"/unpublish","Retirar ");
  await waitText(editor.page,"status","Versão anterior arquivada");
  check(withdrawn.status()===200&&(await json(withdrawn,"Course withdrawal")).published===false,
    "Real withdrawal must archive the publication and create a new draft");
  const newLessonId=Number(await editor.page.locator("#lesson-items [data-lesson]").first().getAttribute("data-lesson"));
  check(Number.isSafeInteger(newLessonId)&&newLessonId>0&&newLessonId!==firstLessonId,
    "The new draft must have a new lesson identity instead of overwriting historical progress");
  for(const student of [studentA,studentB]){
    await student.page.goto(base+"/universidade/private/app");
    await waitText(student.page,"favorites-status","Nenhum favorito disponível");
    check(await student.page.locator("#course-list [data-course-id]").count()===0&&
      await student.page.locator("#lesson-content h3").count()===0,
      "Withdrawn material and its favorite must disappear from each real student catalogue");
  }
  const oldSource=await studentA.context.request.get(base+"/universidade/private/lessons/"+firstLessonId,
    {headers:{Accept:"application/json"}});
  check(oldSource.status()===404,"The archived lesson must be unavailable through its previous HTTP identity");
  await exportFavorites(studentA,["curso-framework-sintetico"]);
  const removeWithdrawn=await studentB.context.request.delete(base+"/universidade/private/courses/"+courseId+"/favorite",
    {headers:await headers(studentB.page)});
  const removal=await json(removeWithdrawn,"Withdrawn favorite removal");
  check(removeWithdrawn.status()===200&&removal.course_id===courseId&&removal.favorite===false,
    "The owner may remove a retained withdrawn favorite through the real CSRF-protected API");
  await exportFavorites(studentB,[]);

  enterStage("republication and independent current progress");
  await editor.page.locator("#lesson-items [data-lesson='"+newLessonId+"']").click();
  const revisedTitle="Primeira aula sintética revisada";
  await editor.page.locator("#lesson-title").fill(revisedTitle);
  await editor.page.locator("#lesson-body").fill(revisedBody+"\n\nRevisão editorial sintética da segunda versão.");
  const savedRevision=await clickResponse(editor.page,"#lesson-save","PATCH",adminRoot+"/lessons/"+newLessonId);
  await waitText(editor.page,"status","Aula salva em rascunho.");
  check(savedRevision.status()===200,"The cloned draft lesson must remain editable through the UI");
  await publish(editor,courseId,2);
  await openStudent(studentA,courseId,revisedTitle);
  await openStudent(studentB,courseId,revisedTitle);
  check((await studentA.page.locator("#course-favorite-toggle").getAttribute("aria-pressed"))==="true"&&
    (await studentB.page.locator("#course-favorite-toggle").getAttribute("aria-pressed"))==="false",
    "Republication must restore retained favorites and respect an explicit withdrawn favorite removal");
  check(!(await studentA.page.locator("#lesson-content button.primary").isDisabled())&&
    (await studentA.page.locator("#lesson-content button.primary").innerText()).includes("Marcar como concluída"),
    "The new version starts pending without inheriting an archived lesson completion");
  const historyResponse=await studentA.context.request.get(base+"/universidade/private/progress/export",{
    headers:{Accept:"application/json"},
  });
  const history=await json(historyResponse,"Historical progress export");
  check(historyResponse.status()===200&&history.scope==="current_authenticated_student"&&
    Array.isArray(history.completions)&&history.completions.length===1&&
    history.completions[0].course_slug==="curso-framework-sintetico"&&history.completions[0].course_version===1&&
    history.completions[0].lesson_slug==="aula-principal-sintetica",
    "A real private export must preserve the original version's completion after republication");

  enterStage("revocation, purge and retained preference");
  const readsBefore=businessRequests.filter(request=>request.profile==="student-a"&&request.path==="/universidade/private/favorites").length;
  setAuthority("student-a",false);
  const revoked=await clickResponse(studentA.page,"#course-favorite-toggle","DELETE",
    "/universidade/private/courses/"+courseId+"/favorite");
  await studentA.page.waitForFunction(()=>document.getElementById("course-list").textContent.includes("Biblioteca indisponível"));
  check(revoked.status()===403&&await studentA.page.locator("#course-list [data-course-id]").count()===0&&
    await studentA.page.locator("#lesson-content h3").count()===0&&
    await studentA.page.locator("#course-favorite-panel").isHidden()&&
    await studentA.page.locator("#course-favorite-toggle").isDisabled(),
    "Real eligibility revocation must purge private content and disable favorite writes");
  check(businessRequests.filter(request=>request.profile==="student-a"&&request.path==="/universidade/private/favorites").length===readsBefore,
    "Revocation must not trigger an automatic favorite retry or reconciliation GET");
  const otherCompany=await studentB.context.request.get(base+"/universidade/private/courses",{
    headers:{Accept:"application/json"},
  });
  check(otherCompany.status()===200&&(await json(otherCompany,"Other company catalogue")).courses.some(course=>course.id===courseId),
    "Revoking one company must leave the other company independently authorized");
  setAuthority("student-a",true);
  await openStudent(studentA,courseId,revisedTitle);
  check((await studentA.page.locator("#course-favorite-toggle").getAttribute("aria-pressed"))==="true",
    "The denied removal must preserve the preference after a new eligible page load");
  await studentA.page.screenshot({path:path.join(evidenceDir,"framework-student.png"),fullPage:true});
  check(pageErrors.length===0,"The real framework browser flow must have no uncaught page errors");
  fs.writeFileSync(path.join(evidenceDir,"framework-browser-summary.json"),JSON.stringify({
    status:"passed",checks,framework:"Laravel",database:"disposable SQLite",business_responses:"real HTTP",
    synthetic_profiles:3,scenarios:["csrf","editorial CRUD","publication hash","audit","private favorites","favorites export download",
      "completion isolation","disabled tutor","withdrawal and republication","historical progress","revocation"],
  },null,2)+"\n",{mode:0o600});
  console.log("PASS framework browser: "+checks+" checks against real Laravel/SQLite; no business responses intercepted");
}

main().catch(error=>{
  // Playwright call logs can include request headers. Keep only the first
  // diagnostic line; never print cookies, CSRF values or the lab credential.
  const message=String(error?.message||"Unknown failure").split(/\r?\n/,1)[0]
    .replaceAll(token,"[redacted]").slice(0,300);
  console.error("FAIL framework browser at "+stage+": "+message);
  try{
    fs.writeFileSync(path.join(evidenceDir,"framework-browser-summary.json"),
      JSON.stringify({status:"failed",checks,stage},null,2)+"\n",{mode:0o600});
  }catch{console.error("FAIL framework browser: could not save the synthetic result summary");}
  process.exitCode=1;
}).finally(async()=>{
  for(const context of contexts){try{await context.close();}catch{process.exitCode=1;}}
  if(browser){try{await browser.close();}catch{process.exitCode=1;}}
});
