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
// Only fixed lifecycle labels are retained; never request/response contents.
const requestLifecycle=new WeakMap();
function enterStage(value){stage=value;console.log("RUN framework browser stage: "+value);}
const check=(condition,label)=>{
  if(!condition)throw new Error(label);
  checks++;
  console.log("PASS framework check "+checks+": "+label);
};
const json=async(response,label)=>{
  let timer;
  try{
    return await Promise.race([response.json(),new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error("response_body_timeout")),15000);
    })]);
  }catch(error){
    const lifecycle=typeof response.request==="function"?requestLifecycle.get(response.request()):null;
    const diagnostic=lifecycle?" (network="+lifecycle+")":"";
    throw new Error(label+(error.message==="response_body_timeout"
      ?": response body did not finish within 15 seconds":": expected a JSON response")+diagnostic);
  }finally{clearTimeout(timer);}
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
  page.on("requestfinished",request=>requestLifecycle.set(request,"finished"));
  page.on("requestfailed",request=>requestLifecycle.set(request,
    request.failure()?.errorText==="net::ERR_ABORTED"?"aborted":"failed"));
  page.on("request",request=>{
    requestLifecycle.set(request,"pending");
    const route=new URL(request.url()).pathname;
    if(!route.startsWith("/universidade/private/"))return;
    businessRequests.push({profile,path:route,method:request.method(),
      body:request.postData()?request.postDataJSON():null});
  });
  return {context,page,profile};
}
async function openStudent(student,courseId,lessonTitle){
  await student.page.bringToFront();
  await student.page.waitForFunction(()=>document.hasFocus()&&document.visibilityState==="visible");
  await student.page.goto(base+"/universidade/private/app");
  await student.page.locator("#course-list [data-course-id='"+courseId+"']").click();
  await student.page.getByRole("heading",{name:lessonTitle,exact:true}).waitFor({state:"visible"});
  await student.page.waitForFunction(()=>!document.getElementById("course-favorite-toggle").disabled);
}
async function lessonSectionNavigation(student){
  enterStage("explicit local lesson sections");
  const page=student.page;
  await page.waitForFunction(()=>state.libraryReady&&!state.libraryLoading&&state.favoritesReady&&
    !state.favoritesLoading&&!state.readingLoading);
  const sectionButtons=page.locator(".lesson-text [data-lesson-section-id]");
  const headings=page.locator(".lesson-text h4[data-lesson-section]");
  const labels=["EXEMPLO FICTÍCIO","APLICAÇÃO OPCIONAL","CUIDADO IMPORTANTE"];
  const paragraphs=["Contexto sintético para a leitura.","Um visitante fictício consulta uma página.",
    "Desenhe uma jornada fictícia.","Este material usa somente exemplos fictícios."];
  check(JSON.stringify(await sectionButtons.allTextContents())===JSON.stringify(labels)&&
    JSON.stringify(await headings.allTextContents())===JSON.stringify(labels)&&
    JSON.stringify(await page.locator(".lesson-paragraph").allTextContents())===JSON.stringify(paragraphs)&&
    await sectionButtons.evaluateAll(nodes=>nodes.every(button=>button.type==="button"&&
      button.getAttribute("aria-controls")===button.dataset.lessonSectionId&&
      document.getElementById(button.dataset.lessonSectionId)?.tabIndex===-1)),
    "The real authorized lesson must retain its exact paragraphs and expose native actions for the three editorial sections");
  const snapshot=()=>page.evaluate(()=>JSON.stringify({courses:state.courses,courseId:state.courseId,lessonId:state.lessonId,
    filter:state.filter,query:state.query,favoriteIds:state.favoriteIds,favoritesOnly:state.favoritesOnly,
    readingSnapshot:state.readingSnapshot}));
  const before=await snapshot(),url=page.url(),writes=countWrites(student.profile);
  const requests=businessRequests.filter(request=>request.profile===student.profile).length;
  await sectionButtons.nth(1).click();
  check(await headings.nth(1).evaluate(node=>{
    const rect=node.getBoundingClientRect();return document.activeElement===node&&rect.top>=0&&rect.top<innerHeight;
  }),"A section click in the real lesson must focus and reveal the exact optional-application heading");
  await sectionButtons.first().focus();await page.keyboard.press("Enter");
  check(await headings.first().evaluate(node=>document.activeElement===node),
    "Enter must activate the real native section action without a custom keyboard shortcut");
  await sectionButtons.last().focus();await page.keyboard.press("Space");
  check(await headings.last().evaluate(node=>document.activeElement===node),
    "Space must activate the real native section action and focus its exact heading");
  check(await snapshot()===before&&page.url()===url&&countWrites(student.profile)===writes&&
    businessRequests.filter(request=>request.profile===student.profile).length===requests,
    "Real section navigation must preserve course, lesson, progress, favorites, reading revision and URL with zero private requests");
  await page.locator(".lesson-text").screenshot({path:path.join(evidenceDir,"framework-lesson-sections-desktop.png")});
  await page.setViewportSize({width:390,height:844});await sectionButtons.nth(1).click();
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&
    await headings.nth(1).evaluate(node=>document.activeElement===node)&&
    JSON.stringify(await page.locator(".lesson-paragraph").allTextContents())===JSON.stringify(paragraphs)&&
    await snapshot()===before&&page.url()===url&&countWrites(student.profile)===writes&&
    businessRequests.filter(request=>request.profile===student.profile).length===requests,
    "The real mobile index must fit 390 pixels and keep all text, private state and local-only navigation intact");
  await page.locator(".lesson-text").screenshot({path:path.join(evidenceDir,"framework-lesson-sections-mobile.png")});
  await page.setViewportSize({width:1440,height:1000});
}
async function studentLessonFilter(student,courseId,lessonId){
  enterStage("local lesson locator in a real authorized course");
  const page=student.page;
  await page.waitForFunction(()=>state.libraryReady&&!state.libraryLoading&&state.favoritesReady&&
    !state.favoritesLoading&&!state.readingLoading);
  const query=page.locator("#course-lesson-query"),clear=page.locator("#clear-course-lesson-query");
  const message=page.locator("#course-lesson-filter-status");
  const rows=()=>page.locator("#lesson-items [data-lesson-id]").evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.lessonId)));
  const visible=()=>page.locator("#lesson-items [data-lesson-id]:not([hidden])").evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.lessonId)));
  const snapshot=()=>page.evaluate(()=>JSON.stringify({courseId:state.courseId,lessonId:state.lessonId,
    courseRequest:state.courseRequest,lessonRequest:state.lessonRequest,courses:state.courses,
    filter:state.filter,query:state.query,favoriteIds:state.favoriteIds,favoritesOnly:state.favoritesOnly,
    readingSnapshot:state.readingSnapshot,progressHistory:state.progressHistory,
    content:document.getElementById("lesson-content").textContent}));
  const before=await snapshot(),url=page.url(),writes=countWrites(student.profile);
  const requests=businessRequests.filter(request=>request.profile===student.profile).length;
  check(await page.locator("#course-lesson-filter").isVisible()&&await query.isEnabled()&&await clear.isDisabled()&&
    (await message.textContent())==="Resultados: 1 de 1 aulas."&&
    JSON.stringify(await rows())===JSON.stringify([lessonId])&&
    await page.evaluate(id=>state.lessonFilter.ready&&state.lessonFilter.courseId===id&&
      state.lessonFilter.request===state.courseRequest,courseId),
    "The local locator must belong to the complete real authorized lesson list and its current course generation");
  await query.fill("PRIMEIRA AULA SINTETICA");
  check((await message.textContent())==="Resultados: 1 de 1 aulas."&&
    JSON.stringify(await visible())===JSON.stringify([lessonId])&&await query.evaluate(node=>document.activeElement===node),
    "The real lesson title must match without accents or case sensitivity while typing keeps its focus");
  await query.fill("aula-principal-sintetica");
  check((await message.textContent())==="Resultados: 1 de 1 aulas."&&
    JSON.stringify(await visible())===JSON.stringify([lessonId]),
    "The local locator must also match the exact authorized slug without opening another lesson");
  await query.fill("Desenhe uma jornada");
  const pinned="Resultados: 0 de 1 aulas. A aula aberta continua visível fora dos resultados.";
  check((await message.textContent())===pinned&&JSON.stringify(await rows())===JSON.stringify([lessonId])&&
    JSON.stringify(await visible())===JSON.stringify([lessonId])&&
    await page.locator("#lesson-items [data-lesson-id='"+lessonId+"']").getAttribute("aria-current")==="true",
    "Lesson body text must not be searched locally or counted as a match; the open lesson stays visible outside the results");
  await page.locator("#course-lesson-filter").screenshot({path:path.join(evidenceDir,"framework-student-lesson-filter-desktop.png")});
  await clear.focus();await page.keyboard.press("Enter");
  check(await query.inputValue()===""&&await clear.isDisabled()&&
    await query.evaluate(node=>document.activeElement===node)&&
    (await message.textContent())==="Resultados: 1 de 1 aulas."&&await snapshot()===before&&page.url()===url&&
    countWrites(student.profile)===writes&&businessRequests.filter(request=>request.profile===student.profile).length===requests,
    "Clearing through the native Enter action must return focus to the field and preserve all real study state with zero private requests");
  await page.setViewportSize({width:390,height:844});await query.fill("sem correspondencia");
  check((await message.textContent())===pinned&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&
    JSON.stringify(await visible())===JSON.stringify([lessonId])&&await snapshot()===before&&page.url()===url&&
    countWrites(student.profile)===writes&&businessRequests.filter(request=>request.profile===student.profile).length===requests,
    "The mobile locator must retain the selected lesson and honest zero-result count within 390 pixels without requests or state changes");
  await page.locator("#course-lesson-filter").screenshot({path:path.join(evidenceDir,"framework-student-lesson-filter-mobile.png")});
  await clear.focus();await page.keyboard.press("Space");
  check(await query.inputValue()===""&&await query.evaluate(node=>document.activeElement===node)&&
    await snapshot()===before&&countWrites(student.profile)===writes&&
    businessRequests.filter(request=>request.profile===student.profile).length===requests,
    "The native Space action must restore the unfiltered real list without altering the lesson or private preferences");
  await page.setViewportSize({width:1440,height:1000});
}
async function reconcileWithdrawnReader(student,courseId,lessonId,readingRevision){
  enterStage("withdrawn course in an already open reader");
  const page=student.page;
  await page.locator("#course-lesson-query").fill("curso retirado");
  const before=await page.evaluate(()=>({courseId:state.courseId,lessonId:state.lessonId,
    courseRequest:state.courseRequest,lessonRequest:state.lessonRequest}));
  check(before.courseId===courseId&&before.lessonId===lessonId&&await page.locator("#lesson-content h3").count()===1,
    "The reconciliation journey must begin with the previously authorized lesson still open in its existing page");
  await page.bringToFront();await page.waitForFunction(()=>document.hasFocus()&&document.visibilityState==="visible");
  await page.locator(".skip-link").focus();
  const start=businessRequests.length;
  // Exercise the existing reauthorization function against real Laravel HTTP.
  // The document and its selected lesson remain in place; no response is mocked.
  await page.evaluate(()=>{void loadLibrary();});
  await page.waitForFunction(()=>state.libraryReady&&!state.libraryLoading&&!state.favoritesLoading&&!state.readingLoading);
  check(await page.evaluate(previous=>!state.accessDenied&&state.courseId===null&&state.lessonId===null&&
    state.courseRequest>previous.courseRequest&&state.lessonRequest>previous.lessonRequest,before)&&
    await page.locator("#lesson-items [data-lesson-id]").count()===0&&await page.locator("#lesson-content h3").count()===0&&
    await page.locator(".lesson-text,.lesson-help").count()===0&&
    await page.locator("#course-lesson-filter").isHidden()&&await page.locator("#course-lesson-query").inputValue()===""&&
    await page.locator("#course-lesson-query").isDisabled()&&await page.locator("#clear-course-lesson-query").isDisabled()&&
    await page.locator("#course-lesson-filter-status").textContent()===""&&
    (await page.locator("[data-course-unavailable]").textContent()).includes("curso deixou de constar no catálogo"),
    "A fresh real catalogue that omits the selected course must clear its old body, help, section actions, local lesson query and selection");
  check(await page.evaluate(()=>state.libraryReady&&!state.accessDenied&&
    document.activeElement?.classList.contains("skip-link"))&&await page.locator("#course-search").isEnabled()&&
    await page.evaluate(revision=>state.readingSnapshot?.status==="unavailable"&&state.readingSnapshot.revision===revision,readingRevision),
    "Course withdrawal must preserve global eligibility, the current focus and the exact retained reading revision");
  const requests=businessRequests.slice(start).filter(request=>request.profile===student.profile);
  const expected=["POST /universidade/private/initialize","GET /universidade/private/courses",
    "GET /universidade/private/favorites","GET /universidade/private/reading-position"];
  check(JSON.stringify(requests.map(request=>request.method+" "+request.path).sort())===JSON.stringify(expected.sort()),
    "Real catalogue reconciliation must use only the existing initialization and three reads, without completion, preference or history writes");
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
async function retainedFavorites(student,courseId,availability){
  const selection=()=>student.page.evaluate(()=>({
    course:document.querySelector("#course-list [aria-current='true']")?.getAttribute("data-course-id")??null,
    lesson:document.querySelector("#lesson-content h3")?.textContent??null,
    category:document.querySelector("[data-filter][aria-pressed='true']")?.getAttribute("data-filter")??null,
    query:document.getElementById("course-search").value,
    favoritesOnly:document.getElementById("favorites-only").checked,
  }));
  const before=await selection(),writes=countWrites(student.profile);
  if(!await student.page.locator("#retained-favorites-panel").evaluate(node=>node.open)){
    await student.page.locator("#retained-favorites-panel > summary").click();
  }
  const response=await clickResponse(student.page,"#reload-retained-favorites","GET","/universidade/private/favorites/retained");
  const payload=await json(response,"Private retained favorites");
  await student.page.waitForFunction(()=>!document.getElementById("reload-retained-favorites").disabled);
  const rows=payload.favorites;
  check(response.status()===200&&(response.headers()["cache-control"]||"").includes("no-store")&&
    payload.schema_version===1&&payload.scope==="current_authenticated_student"&&payload.next_after_course_id===null&&
    JSON.stringify(Object.keys(payload).sort())===JSON.stringify(["favorites","next_after_course_id","schema_version","scope"])&&
    Array.isArray(rows)&&(availability===null?rows.length===0:rows.length===1&&rows[0].course_id===courseId&&
      rows[0].course_slug==="curso-framework-sintetico"&&rows[0].availability===availability&&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(rows[0].saved_at)&&
      JSON.stringify(Object.keys(rows[0]).sort())===JSON.stringify(["availability","course_id","course_slug","saved_at"])),
    "The retained favorites page must expose only this student's references, original UTC date and current availability");
  const list=student.page.locator("#retained-favorites-list");
  check(await list.locator("[data-retained-course-id]").count()===rows.length&&
    (availability===null||await list.locator("[data-retained-course-id='"+courseId+"']").getAttribute("data-retained-availability")===availability)&&
    JSON.stringify(await selection())===JSON.stringify(before)&&countWrites(student.profile)===writes,
    "Consulting retained favorites through the real UI must preserve the current lesson, course, filters and write count");
  return rows[0]??null;
}
async function progressHistory(student,availability){
  const historyPath="/universidade/private/progress/history";
  const selection=()=>student.page.evaluate(()=>({
    course:document.querySelector("#course-list [aria-current='true']")?.getAttribute("data-course-id")??null,
    lesson:document.querySelector("#lesson-content h3")?.textContent??null,
    category:document.querySelector("[data-filter][aria-pressed='true']")?.getAttribute("data-filter")??null,
    query:document.getElementById("course-search").value,
    favoritesOnly:document.getElementById("favorites-only").checked,
    reading:state.readingSnapshot,favorites:state.favoriteIds,courses:state.courses,
  }));
  await student.page.waitForFunction(()=>!state.libraryLoading&&!state.favoritesLoading&&!state.readingLoading);
  const before=await selection(),writes=countWrites(student.profile);
  if(!await student.page.locator("#progress-history-panel").evaluate(node=>node.open)){
    const reads=businessRequests.filter(request=>request.profile===student.profile&&request.path===historyPath).length;
    await student.page.locator("#progress-history-panel > summary").click();
    check(businessRequests.filter(request=>request.profile===student.profile&&request.path===historyPath).length===reads,
      "Opening the real completion-history panel must not request private records automatically");
  }
  const response=await clickResponse(student.page,"#reload-progress-history","GET",historyPath);
  const payload=await json(response,"Private completion history");
  await student.page.waitForFunction(()=>!document.getElementById("reload-progress-history").disabled);
  const rows=payload.completions;
  check(response.status()===200&&(response.headers()["cache-control"]||"").includes("no-store")&&
    payload.schema_version===1&&payload.scope==="current_authenticated_student"&&payload.next_before_id===null&&
    JSON.stringify(Object.keys(payload).sort())===JSON.stringify(["completions","next_before_id","schema_version","scope"])&&
    Array.isArray(rows)&&(availability===null?rows.length===0:rows.length===1&&
      Number.isSafeInteger(rows[0].completion_id)&&rows[0].completion_id>0&&
      rows[0].course_slug==="curso-framework-sintetico"&&rows[0].course_version===1&&
      rows[0].lesson_slug==="aula-principal-sintetica"&&rows[0].availability===availability&&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(rows[0].completed_at)&&
      JSON.stringify(Object.keys(rows[0]).sort())===JSON.stringify([
        "availability","completed_at","completion_id","course_slug","course_version","lesson_slug"
      ])),
    "The real completion-history API must return only this student's exact version references, UTC date and availability");
  const list=student.page.locator("#progress-history-list"),text=await list.textContent();
  check(await list.locator("[data-completion-id]").count()===rows.length&&
    await list.locator("a,button").count()===0&&
    (rows.length===0||await list.locator("[data-completion-id='"+rows[0].completion_id+"'] time").getAttribute("datetime")===rows[0].completed_at&&
      text.includes("Curso: "+rows[0].course_slug)&&text.includes("Aula: "+rows[0].lesson_slug)&&
      text.includes("Versão da aula: 1")&&text.includes(availability==="available"
        ?"Esta aula e versão estão disponíveis.":"Esta aula ou versão está indisponível."))&&
    JSON.stringify(await selection())===JSON.stringify(before)&&countWrites(student.profile)===writes,
    "Reading the real history must preserve current study, filters, favorites and reading position without a navigation or mutation action");
  return rows[0]??null;
}
async function exportProgress(student){
  const writes=countWrites(student.profile);
  const [download,response]=await Promise.all([
    student.page.waitForEvent("download"),
    responseFor(student.page,"GET","/universidade/private/progress/export"),
    student.page.locator("#export-progress").click(),
  ]);
  check(response.status()===200&&
    (response.headers()["cache-control"]||"").includes("no-store")&&
    response.headers()["content-disposition"]==='attachment; filename="imagine-universidade-progresso.json"',
    "The real progress download must use the private response and fixed attachment name");
  const received=await json(response,"Private progress download");
  let payload;
  try{payload=JSON.parse(fs.readFileSync(await download.path(),"utf8"));}
  finally{await download.delete();}
  check(download.suggestedFilename()==="imagine-universidade-progresso.json"&&
    payload.schema_version===1&&payload.scope==="current_authenticated_student"&&
    JSON.stringify(Object.keys(payload).sort())===JSON.stringify(["completions","schema_version","scope"])&&
    Array.isArray(payload.completions)&&payload.completions.length<=5000&&
    payload.completions.every(row=>JSON.stringify(Object.keys(row).sort())===
      JSON.stringify(["completed_at","course_slug","course_version","lesson_slug"])&&
      Number.isSafeInteger(row.course_version)&&row.course_version>0&&typeof row.completed_at==="string"&&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(row.completed_at))&&
    JSON.stringify(payload)===JSON.stringify(received)&&countWrites(student.profile)===writes,
    "The real UI must download every authorized progress reference with canonical UTC dates and no business write");
  return payload;
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
async function readingSnapshot(student){
  const response=await student.context.request.get(base+"/universidade/private/reading-position",{
    headers:{Accept:"application/json"},
  });
  const payload=await json(response,"Reading position snapshot");
  check(response.status()===200&&payload.schema_version===1&&payload.scope==="current_authenticated_student"&&
    ["none","available","unavailable"].includes(payload.status)&&
    typeof payload.revision==="string"&&payload.revision.length>0&&payload.revision.length<=2048&&
    JSON.stringify(Object.keys(payload).sort())===JSON.stringify(["position","revision","schema_version","scope","status"]),
    "The reading position snapshot must be scoped to the authenticated student and carry an opaque precondition");
  return payload;
}
async function saveReadingPosition(student,courseId,version,lessonId){
  await student.page.waitForFunction(()=>document.getElementById("save-reading-position")?.disabled===false);
  const response=await clickResponse(student.page,"#save-reading-position","PUT","/universidade/private/reading-position");
  const receipt=await json(response,"Reading position save");
  const request=response.request().postDataJSON();
  await waitText(student.page,"reading-position-status","Aula guardada para continuar depois");
  check(response.status()===200&&receipt.status==="available"&&receipt.position?.course_id===courseId&&
    receipt.position.course_version===version&&receipt.position.lesson_id===lessonId&&
    typeof receipt.position.saved_at==="string"&&/^r1\.[a-f0-9]{64}$/.test(receipt.revision)&&
    request.course_id===courseId&&request.course_version===version&&request.lesson_id===lessonId&&
    typeof request.expected_revision==="string"&&request.expected_revision!==receipt.revision&&
    JSON.stringify(Object.keys(request).sort())===JSON.stringify(["course_id","course_version","expected_revision","lesson_id"])&&
    await student.page.locator("#save-reading-position").isDisabled(),
    "Saving a position through the real UI must conditionally pin the exact lesson and version without completing it");
  return receipt;
}
async function openReadingOptions(student){
  if(!await student.page.locator("#reading-position-options").evaluate(node=>node.open)){
    await student.page.locator("#reading-position-options > summary").click();
  }
}
async function exportReadingPosition(student,expectedVersion){
  await openReadingOptions(student);
  const [download,response]=await Promise.all([
    student.page.waitForEvent("download"),
    responseFor(student.page,"GET","/universidade/private/reading-position/export"),
    student.page.locator("#export-reading-position").click(),
  ]);
  check(response.status()===200&&(response.headers()["cache-control"]||"").includes("no-store")&&
    response.headers()["content-disposition"]==='attachment; filename="imagine-universidade-posicao-leitura.json"',
    "The reading position download must use a private response and its fixed attachment name");
  let payload;
  try{payload=JSON.parse(fs.readFileSync(await download.path(),"utf8"));}
  finally{await download.delete();}
  const position=payload.reading_position;
  check(download.suggestedFilename()==="imagine-universidade-posicao-leitura.json"&&
    payload.schema_version===1&&payload.scope==="current_authenticated_student"&&
    JSON.stringify(Object.keys(payload).sort())===JSON.stringify(["reading_position","schema_version","scope"])&&
    (expectedVersion===null?position===null:
      position?.course_slug==="curso-framework-sintetico"&&position.course_version===expectedVersion&&
      position.lesson_slug==="aula-principal-sintetica"&&typeof position.saved_at==="string"&&
      JSON.stringify(Object.keys(position).sort())===JSON.stringify(["course_slug","course_version","lesson_slug","saved_at"])),
    "A downloaded reading reference must contain only this student's exact saved version, slugs and date, or null after removal");
}
async function editorialLessonFilter(editor,courseId,firstLessonId,temporaryLessonId){
  enterStage("local editorial lesson search preserves both drafts");
  const page=editor.page,query=page.locator("#editorial-lesson-search");
  const clear=page.locator("#clear-editorial-lesson-filter"),message=page.locator("#editorial-lesson-filter-status");
  const fieldIds=["course-title","course-slug","course-category","course-summary","course-sort",
    "lesson-title","lesson-slug","lesson-body","lesson-sort"];
  const original=await fields(page,fieldIds);
  const snapshot=()=>page.evaluate(()=>JSON.stringify({courseId:state.course?.id,lessonId:state.lesson?.id,
    courseRequest:state.courseRequest,lessonRequest:state.lessonRequest,lessons:state.lessons,
    archive:state.archive}));
  const before=await snapshot(),writes=countWrites(editor.profile);
  const requests=businessRequests.filter(request=>request.profile===editor.profile).length;
  const rows=()=>page.locator("#lesson-items [data-lesson-row]").evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.lessonRow)));
  check(await query.isEnabled()&&await clear.isDisabled()&&
    (await message.textContent())==="Resultados: 2 de 2 aulas."&&
    JSON.stringify(await rows())===JSON.stringify([firstLessonId,temporaryLessonId])&&
    await page.evaluate(id=>state.course?.id===id&&state.lessonQueryCourseId===id,courseId),
    "The editorial lesson search must begin with the complete real draft order and current course ownership");
  await page.locator("#course-summary").fill(original[3]+"  Resumo local pendente.  ");
  await page.locator("#lesson-body").fill(original[7]+"\nTexto local ainda não salvo.");
  const pending=await fields(page,fieldIds),preflightBefore=await page.evaluate(()=>state.preflightRequest);
  await query.fill("AULA TEMPORARIA SINTETICA");
  check((await message.textContent())==="Resultados: 1 de 2 aulas. Subir e Descer consideram todas as aulas do curso."&&
    JSON.stringify(await rows())===JSON.stringify([temporaryLessonId])&&
    (await page.locator("#lesson-items [data-lesson='"+temporaryLessonId+"']").textContent()).includes("Posição 2")&&
    await query.evaluate(node=>document.activeElement===node),
    "An accent-insensitive title search must retain the full-list position and typing focus in the real editor");
  await query.fill("aula-principal-sintetica");
  const pinned="Resultados: 1 de 2 aulas. A aula em edição também permanece visível. Subir e Descer consideram todas as aulas do curso.";
  check((await message.textContent())===pinned&&
    JSON.stringify((await rows()).sort((a,b)=>a-b))===JSON.stringify([firstLessonId,temporaryLessonId].sort((a,b)=>a-b))&&
    await page.locator("#lesson-items [data-lesson-row='"+temporaryLessonId+"']").getAttribute("data-outside-filter")==="true"&&
    await page.locator("#lesson-items [data-lesson='"+temporaryLessonId+"']").getAttribute("aria-current")==="true",
    "A slug match must keep the other edited lesson pinned without counting it among the real results");
  await query.fill("Texto local ainda não salvo");
  const emptyPinned="Resultados: 0 de 2 aulas. A aula em edição também permanece visível. Subir e Descer consideram todas as aulas do curso.";
  check((await message.textContent())===emptyPinned&&JSON.stringify(await rows())===JSON.stringify([temporaryLessonId])&&
    JSON.stringify(await fields(page,fieldIds))===JSON.stringify(pending)&&await snapshot()===before&&
    await page.evaluate(()=>state.preflightRequest)===preflightBefore&&
    countWrites(editor.profile)===writes&&businessRequests.filter(request=>request.profile===editor.profile).length===requests,
    "The local search must exclude body buffers and preserve both unsaved forms, selection and complete order with zero HTTP requests");
  await page.locator(".lesson-filters").screenshot({path:path.join(evidenceDir,"framework-editorial-lesson-filter-desktop.png")});
  await clear.focus();await page.keyboard.press("Enter");
  check(await query.inputValue()===""&&await clear.isDisabled()&&await query.evaluate(node=>document.activeElement===node)&&
    JSON.stringify(await rows())===JSON.stringify([firstLessonId,temporaryLessonId])&&
    JSON.stringify(await fields(page,fieldIds))===JSON.stringify(pending),
    "Clearing the editorial search through native Enter must restore every row without discarding pending course or lesson text");
  await page.setViewportSize({width:390,height:844});await query.fill("sem correspondencia");
  check((await message.textContent())===emptyPinned&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&
    JSON.stringify(await rows())===JSON.stringify([temporaryLessonId])&&
    JSON.stringify(await fields(page,fieldIds))===JSON.stringify(pending)&&await snapshot()===before&&
    await page.evaluate(()=>state.preflightRequest)===preflightBefore&&
    countWrites(editor.profile)===writes&&businessRequests.filter(request=>request.profile===editor.profile).length===requests,
    "The mobile editorial locator must fit 390 pixels while preserving the pinned lesson, both forms and complete authoritative order");
  await page.locator(".lesson-filters").screenshot({path:path.join(evidenceDir,"framework-editorial-lesson-filter-mobile.png")});
  await clear.focus();await page.keyboard.press("Space");
  const preflightAfterFiltering=await page.evaluate(()=>state.preflightRequest);
  await page.locator("#course-summary").fill(original[3]);await page.locator("#lesson-body").fill(original[7]);
  check(await query.inputValue()===""&&JSON.stringify(await rows())===JSON.stringify([firstLessonId,temporaryLessonId])&&
    JSON.stringify(await fields(page,fieldIds))===JSON.stringify(original)&&await snapshot()===before&&
    preflightAfterFiltering===preflightBefore&&
    await page.evaluate(()=>!editorialHasUnsavedChanges())&&countWrites(editor.profile)===writes&&
    businessRequests.filter(request=>request.profile===editor.profile).length===requests,
    "Restoring the original literal fields must leave a clean unfiltered draft for the existing real reorder journey without any write");
  await page.setViewportSize({width:1440,height:1000});
}
async function openConcurrentLessonEditor(courseId,lessonId){
  enterStage("second real editorial session before reordering");
  const peer=await session("editor");
  await peer.page.goto(base+"/universidade/private/admin/app");
  await peer.page.locator("#course-items [data-course='"+courseId+"']").click();
  await peer.page.locator("#lesson-items [data-lesson='"+lessonId+"']").click();
  await peer.page.locator("#editorial-lesson-search").fill("temporaria");
  peer.courseSummary=(await peer.page.locator("#course-summary").inputValue())+" Rascunho independente da segunda sessão.";
  await peer.page.locator("#course-summary").fill(peer.courseSummary);
  check(await peer.page.evaluate(id=>state.lesson?.id===id&&state.lesson.sort_order===0,lessonId)&&
    await peer.page.locator("#lesson-sort").inputValue()==="0"&&
    await peer.page.locator("#editorial-lesson-search").inputValue()==="temporaria",
    "A second real editorial session must retain the original lesson order and its independent unsaved course draft before reordering");
  return peer;
}
async function concurrentLessonEdits(editor,peer,courseId,firstLessonId,lessonId){
  enterStage("content edits and guarded order across real editorial sessions");
  const root="/universidade/private/admin",route=root+"/lessons/"+lessonId;
  const fieldIds=["course-title","course-slug","course-category","course-summary","course-sort",
    "lesson-title","lesson-slug","lesson-body","lesson-sort"];
  const page=peer.page,writes=countWrites(editor.profile);
  const savedTitle=await page.locator("#lesson-title").inputValue();
  const savedBody=(await page.locator("#lesson-body").inputValue())+"\nTexto salvo pela segunda sessão editorial.";
  await page.locator("#lesson-body").fill(savedBody);
  const textSaved=await clickResponse(page,"#lesson-save","PATCH",route);
  const textReceipt=await json(textSaved,"Concurrent text-only lesson save");
  await page.waitForFunction(id=>!state.writePending&&state.lessonsReady&&state.lesson?.id===id&&state.lesson.sort_order===1,lessonId);
  check(textSaved.status()===200&&textReceipt.saved===true&&
    (textSaved.headers()["cache-control"]||"").includes("no-store")&&
    JSON.stringify(textSaved.request().postDataJSON())===JSON.stringify({title:savedTitle,body:savedBody}),
    "Saving only text from an older real session must omit both order fields and preserve the concurrent reorder in the database");
  check(await page.locator("#lesson-sort").inputValue()==="1"&&await page.locator("#lesson-body").inputValue()===savedBody&&
    await page.locator("#course-summary").inputValue()===peer.courseSummary&&
    await page.locator("#editorial-lesson-search").inputValue()==="temporaria"&&
    await page.locator("#lesson-items [data-lesson='"+lessonId+"']").getAttribute("aria-current")==="true",
    "The confirmed text save must adopt the server's current order while preserving the other form, filtered list and lesson selection");
  // Refresh through the current UI before changing the order from the first
  // session, so this deliberate edit does not also replay old lesson text.
  // Selecting the already selected course is intentionally a no-op. Leave
  // its form without creating a record, then select it for a real lesson GET.
  await editor.page.locator("#new-course").click();
  await editor.page.locator("#course-items [data-course='"+courseId+"']").click();
  await editor.page.locator("#lesson-items [data-lesson='"+lessonId+"']").click();
  await editor.page.locator("#lesson-sort").fill("2");
  const moved=await clickResponse(editor.page,"#lesson-save","PATCH",route);
  const movedReceipt=await json(moved,"Explicit guarded lesson order");
  await editor.page.waitForFunction(id=>!state.writePending&&state.lessonsReady&&state.lesson?.id===id&&state.lesson.sort_order===2,lessonId);
  check(moved.status()===200&&movedReceipt.saved===true&&
    JSON.stringify(moved.request().postDataJSON())===JSON.stringify({title:savedTitle,body:savedBody,sort_order:2,expected_sort_order:1})&&
    await editor.page.locator("#lesson-body").inputValue()===savedBody,
    "An explicit real order edit must send its exact previous order and keep the freshly read lesson content");
  const auditBeforeResponse=await editor.context.request.get(base+root+"/audit",{headers:{Accept:"application/json"}});
  const auditBefore=(await json(auditBeforeResponse,"Audit before stale order edit")).events
    .filter(event=>event.action==="lesson.updated"&&event.resource_id===lessonId);
  await page.locator("#lesson-body").fill(savedBody+"\nRascunho em conflito que deve permanecer local.");
  await page.locator("#lesson-sort").fill("3");
  const pending=await fields(page,fieldIds),requests=businessRequests.length;
  const conflict=await clickResponse(page,"#lesson-save","PATCH",route);
  const failure=await json(conflict,"Stale real order precondition");
  await page.waitForFunction(()=>state.writeOutcomeUnknown&&!state.writePending);
  check(conflict.status()===409&&failure.error==="draft_order_changed"&&
    (conflict.headers()["cache-control"]||"").includes("no-store")&&
    conflict.request().postDataJSON().expected_sort_order===1&&conflict.request().postDataJSON().sort_order===3&&
    JSON.stringify(await fields(page,fieldIds))===JSON.stringify(pending)&&
    businessRequests.slice(requests).filter(request=>request.profile===editor.profile).length===1&&
    countWrites(editor.profile)===writes+3,
    "A stale real order edit must return 409 and preserve both local drafts without any automatic read, retry or additional mutation");
  const currentResponse=await editor.context.request.get(base+root+"/courses/"+courseId+"/lessons",{headers:{Accept:"application/json"}});
  const current=(await json(currentResponse,"Lesson after rejected order edit")).lessons.find(lesson=>lesson.id===lessonId);
  const auditAfterResponse=await editor.context.request.get(base+root+"/audit",{headers:{Accept:"application/json"}});
  const auditAfter=(await json(auditAfterResponse,"Audit after rejected order edit")).events
    .filter(event=>event.action==="lesson.updated"&&event.resource_id===lessonId);
  check(currentResponse.status()===200&&current.sort_order===2&&current.title===savedTitle&&current.body===savedBody&&
    auditBeforeResponse.status()===200&&auditAfterResponse.status()===200&&auditBefore.length===2&&
    JSON.stringify(auditAfter)===JSON.stringify(auditBefore),
    "The real conflict must leave lesson text, stored order and its audit history unchanged");
  await page.screenshot({path:path.join(evidenceDir,"framework-lesson-order-conflict.png"),fullPage:true});
  const beforeCancel=businessRequests.length;
  page.once("dialog",dialog=>dialog.dismiss());await page.locator("#retry-catalog").click();
  check(await page.evaluate(()=>state.writeOutcomeUnknown)&&JSON.stringify(await fields(page,fieldIds))===JSON.stringify(pending)&&
    businessRequests.length===beforeCancel,
    "Canceling the real recovery confirmation must preserve the conflicting drafts without querying or replaying the edit");
  const dialogue=page.waitForEvent("dialog").then(async dialog=>{
    const matches=dialog.type()==="confirm"&&dialog.message().startsWith("O resultado da última alteração editorial não foi confirmado.");
    if(matches)await dialog.accept();else await dialog.dismiss();return matches;
  });
  await page.locator("#retry-catalog").click();const confirmed=await dialogue;
  await page.waitForFunction(()=>state.catalogReady&&state.lessonsReady&&!state.catalogLoading&&!state.writeOutcomeUnknown);
  await page.locator("#lesson-items [data-lesson='"+lessonId+"']").click();
  check(confirmed&&await page.locator("#lesson-sort").inputValue()==="2"&&await page.locator("#lesson-body").inputValue()===savedBody&&
    await page.locator("#editorial-lesson-search").inputValue()==="temporaria"&&countWrites(editor.profile)===writes+3,
    "An accepted manual recovery must load the current real order, retain the same-course query and wait for a new explicit edit");
  await page.locator("#lesson-sort").fill("1");
  const restored=await clickResponse(page,"#lesson-save","PATCH",route);
  const restoreReceipt=await json(restored,"Order edit after manual recovery");
  await page.waitForFunction(id=>!state.writePending&&state.lessonsReady&&state.lesson?.id===id&&state.lesson.sort_order===1,lessonId);
  check(restored.status()===200&&restoreReceipt.saved===true&&
    JSON.stringify(restored.request().postDataJSON())===JSON.stringify({title:savedTitle,body:savedBody,sort_order:1,expected_sort_order:2})&&
    countWrites(editor.profile)===writes+4,
    "A new deliberate edit after recovery must use the new order baseline and succeed without replaying the rejected request");
  await editor.page.locator("#new-course").click();
  await editor.page.locator("#course-items [data-course='"+courseId+"']").click();
  await editor.page.locator("#lesson-items [data-lesson='"+lessonId+"']").click();
  check(await editor.page.evaluate(({first,lesson})=>JSON.stringify(state.lessons.map(item=>({id:item.id,sort_order:item.sort_order})))===
      JSON.stringify([{id:first,sort_order:0},{id:lesson,sort_order:1}])&&state.lesson?.id===lesson&&
      !editorialHasUnsavedChanges(),{first:firstLessonId,lesson:lessonId})&&
    await editor.page.locator("#lesson-body").inputValue()===savedBody&&countWrites(editor.profile)===writes+4,
    "Both real sessions must reconcile to the preserved lesson text and restored complete order before the existing draft deletion continues");
  await peer.context.close();contexts.splice(contexts.indexOf(peer.context),1);
}
async function editorialLessonReorder(editor,courseId,firstLessonId,temporaryLessonId){
  enterStage("atomic editorial lesson order");
  const page=editor.page,route="/universidade/private/admin/courses/"+courseId+"/lessons/reorder";
  const move=(id,direction)=>"#lesson-items [data-move-lesson='"+id+"'][data-direction='"+direction+"']";
  const fieldIds=["course-title","course-slug","course-category","course-summary","course-sort",
    "lesson-title","lesson-slug","lesson-body","lesson-sort"];
  const original=await fields(page,fieldIds),writes=countWrites(editor.profile);
  const originalLessons=await page.evaluate(()=>state.lessons.map(lesson=>({id:lesson.id,slug:lesson.slug,
    title:lesson.title,body:lesson.body,status:lesson.status,is_published:lesson.is_published})).sort((a,b)=>a.id-b.id));
  const rows=()=>page.locator("#lesson-items [data-lesson-row]").evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.lessonRow)));
  check(JSON.stringify(await rows())===JSON.stringify([firstLessonId,temporaryLessonId])&&
    await page.locator(move(firstLessonId,"up")).isDisabled()&&await page.locator(move(temporaryLessonId,"down")).isDisabled()&&
    await page.locator(move(temporaryLessonId,"up")).isEnabled(),
    "The real draft must expose exact full-list positions and disable only the impossible boundary moves");
  await page.locator("#course-title").fill(original[0]+" pendente");
  await page.locator("#lesson-body").fill(original[7]+"\nRascunho local pendente.");
  const pending=await fields(page,fieldIds);
  await page.locator(move(temporaryLessonId,"up")).evaluate(button=>button.dispatchEvent(new MouseEvent("click",{bubbles:true})));
  check(await page.locator(move(temporaryLessonId,"up")).isDisabled()&&
    (await page.locator("#lesson-order-status").textContent()).includes("antes de mudar a ordem")&&
    JSON.stringify(await fields(page,fieldIds))===JSON.stringify(pending)&&countWrites(editor.profile)===writes,
    "Unsaved course and lesson fields must block even a dispatched reorder event without a POST or discarded text");
  await page.locator("#course-title").fill(original[0]);await page.locator("#lesson-body").fill(original[7]);
  await page.waitForFunction(selector=>!document.querySelector(selector).disabled,move(temporaryLessonId,"up"));
  const preflight=await clickResponse(page,"#check-publication","GET",
    "/universidade/private/admin/courses/"+courseId+"/publication-check");
  const diagnostic=await json(preflight,"Pre-reorder publication snapshot");
  await page.locator("#publication-readiness").waitFor({state:"visible"});
  check(preflight.status()===200&&diagnostic.course_id===courseId&&diagnostic.version===1&&diagnostic.ready===true,
    "The order test must begin with a real publication diagnostic for this exact draft");
  const expected=[{id:firstLessonId,sort_order:0},{id:temporaryLessonId,sort_order:0}];
  const target=[{id:temporaryLessonId,sort_order:0},{id:firstLessonId,sort_order:1}];
  const moved=await clickResponse(page,move(temporaryLessonId,"up"),"POST",route);
  const receipt=await json(moved,"Atomic lesson reorder"),request=moved.request().postDataJSON();
  await waitText(page,"status","Ordem das aulas atualizada.");
  await page.waitForFunction(id=>!state.writePending&&state.lessons[0]?.id===id,temporaryLessonId);
  check(moved.status()===200&&(moved.headers()["cache-control"]||"").includes("no-store")&&
    JSON.stringify(request)===JSON.stringify({lesson_id:temporaryLessonId,direction:"up",expected_order:expected})&&
    JSON.stringify(Object.keys(receipt).sort())===JSON.stringify(["changed","course_id","course_version","direction","lesson_id","order","schema_version","scope","status"])&&
    receipt.schema_version===1&&receipt.scope==="current_editorial_draft"&&receipt.course_id===courseId&&
    receipt.course_version===1&&receipt.status==="draft"&&receipt.lesson_id===temporaryLessonId&&receipt.direction==="up"&&
    receipt.changed===true&&JSON.stringify(receipt.order)===JSON.stringify(target),
    "Moving a tied lesson must send the full original order and receive the exact private normalized destination");
  check(JSON.stringify(await rows())===JSON.stringify([temporaryLessonId,firstLessonId])&&
    await page.locator("#lesson-items [data-lesson='"+temporaryLessonId+"']").getAttribute("aria-current")==="true"&&
    JSON.stringify(await fields(page,fieldIds))===JSON.stringify(original)&&await page.locator("#publication-readiness").isHidden(),
    "The first real move must preserve both forms and the selected lesson while invalidating the earlier publication diagnostic");
  const reversed=await clickResponse(page,move(firstLessonId,"up"),"POST",route);
  const reverseReceipt=await json(reversed,"Reverse exact lesson order"),reverseRequest=reversed.request().postDataJSON();
  await waitText(page,"status","Ordem das aulas atualizada.");
  await page.waitForFunction(id=>!state.writePending&&state.lessons[0]?.id===id,firstLessonId);
  const restored=[{id:firstLessonId,sort_order:0},{id:temporaryLessonId,sort_order:1}];
  const expectedFields=[...original];expectedFields[8]="1";
  check(reversed.status()===200&&reverseReceipt.changed===true&&reverseReceipt.lesson_id===firstLessonId&&
    JSON.stringify(reverseRequest)===JSON.stringify({lesson_id:firstLessonId,direction:"up",expected_order:target})&&
    JSON.stringify(reverseReceipt.order)===JSON.stringify(restored)&&
    JSON.stringify(await rows())===JSON.stringify([firstLessonId,temporaryLessonId])&&
    await page.locator("#lesson-items [data-lesson='"+temporaryLessonId+"']").getAttribute("aria-current")==="true"&&
    JSON.stringify(await fields(page,fieldIds))===JSON.stringify(expectedFields)&&
    await page.evaluate(()=>!editorialHasUnsavedChanges()),
    "Moving the other lesson back must retain the selection and update only its confirmed sort field without leaving a false dirty form");
  const stored=await editor.context.request.get(base+"/universidade/private/admin/courses/"+courseId+"/lessons",{headers:{Accept:"application/json"}});
  const storedLessons=(await json(stored,"Stored reordered lessons")).lessons;
  const audit=await editor.context.request.get(base+"/universidade/private/admin/audit",{headers:{Accept:"application/json"}});
  const events=(await json(audit,"Reorder audit")).events.filter(event=>event.action==="course.lessons_reordered"&&event.resource_id===courseId);
  check(stored.status()===200&&storedLessons.every(lesson=>[false,0].includes(lesson.is_published))&&
    JSON.stringify(storedLessons.map(lesson=>({id:lesson.id,sort_order:lesson.sort_order})))===JSON.stringify(restored)&&
    JSON.stringify(storedLessons.map(lesson=>({id:lesson.id,slug:lesson.slug,title:lesson.title,body:lesson.body,
      status:lesson.status,is_published:Boolean(lesson.is_published)})).sort((a,b)=>a.id-b.id))===JSON.stringify(originalLessons)&&
    audit.status()===200&&events.length===2&&events.every(event=>event.resource_kind==="course"&&!Object.hasOwn(event,"actor_key"))&&
    countWrites(editor.profile)===writes+2,
    "The real database must preserve both lesson bodies and identities, store the final order and audit exactly the two explicit moves");
  await page.locator("#lesson-items").screenshot({path:path.join(evidenceDir,"framework-lesson-reorder-desktop.png")});
  await page.setViewportSize({width:390,height:844});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&
    JSON.stringify(await fields(page,fieldIds))===JSON.stringify(expectedFields)&&countWrites(editor.profile)===writes+2,
    "The mobile editor must keep reorder controls within 390 pixels without altering forms or sending another write");
  await page.locator("#lesson-items").screenshot({path:path.join(evidenceDir,"framework-lesson-reorder-mobile.png")});
  await page.setViewportSize({width:1440,height:1000});
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
async function editorialOverview(editor,published){
  const response=await clickResponse(editor.page,"#refresh-overview","GET","/universidade/private/admin/overview");
  const payload=await json(response,"Editorial overview");
  await editor.page.locator("#overview-content").waitFor({state:"visible"});
  check(response.status()===200&&payload.schema_version===1&&payload.scope==="current_editorial_catalog"&&
    JSON.stringify(payload.totals)===JSON.stringify({courses:1,published_courses:published?1:0,
      draft_courses:published?0:1,current_lessons:1,courses_without_lessons:0,courses_without_summary:0})&&
    payload.categories.length===3&&payload.categories[1].category==="negocios"&&
    payload.categories[1].courses===1&&payload.categories[1].current_lessons===1,
    "Editorial overview must count the latest real course version without adding archived lessons");
  check(await editor.page.locator('[data-overview-metric="courses"] strong').innerText()==="1"&&
    await editor.page.locator('[data-overview-metric="current_lessons"] strong').innerText()==="1"&&
    await editor.page.locator('[data-overview-metric="published_courses"] strong').innerText()===(published?"1":"0"),
    "The real editor must render the current aggregate snapshot after an explicit refresh");
}
async function archivedLessonPreview(editor,courseId,version,lessonId,expectedBody){
  const index=await clickResponse(editor.page,"#refresh-editorial-versions","GET",
    "/universidade/private/admin/courses/"+courseId+"/versions");
  const versions=await json(index,"Archived version index");
  check(index.status()===200&&versions.schema_version===1&&versions.scope==="editorial_archived_content"&&
    versions.course_id===courseId&&versions.next_before_version===null&&
    Array.isArray(versions.versions)&&versions.versions.length===1&&versions.versions[0].version===version&&
    versions.versions[0].status==="archived"&&versions.versions[0].lesson_count===1&&
    JSON.stringify(Object.keys(versions.versions[0]).sort())===JSON.stringify(["lesson_count","status","version"])&&
    JSON.stringify(Object.keys(versions).sort())===JSON.stringify(["course_id","next_before_version","schema_version","scope","versions"]),
    "The editorial archive index must expose only the exact archived version and lesson count");
  const listing=await clickResponse(editor.page,'#editorial-version-list [data-archive-version="'+version+'"]',"GET",
    "/universidade/private/admin/courses/"+courseId+"/versions/"+version+"/lessons");
  const lessons=await json(listing,"Archived lesson list");
  check(listing.status()===200&&lessons.course_id===courseId&&lessons.course_version===version&&
    lessons.scope==="editorial_archived_content"&&lessons.status==="archived"&&lessons.next_after===null&&
    lessons.lessons.length===1&&lessons.lessons[0].id===lessonId&&
    JSON.stringify(Object.keys(lessons.lessons[0]).sort())===JSON.stringify(["id","slug","sort_order","title"]),
    "The archived lesson page must keep the exact course/version and omit lesson bodies until selection");
  const detail=await clickResponse(editor.page,'#editorial-version-lessons [data-archive-lesson="'+lessonId+'"]',"GET",
    "/universidade/private/admin/courses/"+courseId+"/versions/"+version+"/lessons/"+lessonId);
  const archived=await json(detail,"Archived lesson detail");
  await editor.page.waitForFunction(()=>document.getElementById("editorial-version-content")?.textContent.includes("Um visitante fictício"));
  check(detail.status()===200&&archived.course_id===courseId&&archived.course_version===version&&
    archived.scope==="editorial_archived_content"&&archived.status==="archived"&&
    archived.lesson.id===lessonId&&archived.lesson.body===expectedBody&&
    JSON.stringify(Object.keys(archived.lesson).sort())===JSON.stringify(["body","id","slug","sort_order","title"]),
    "An explicit archive selection must render only the historical lesson from its exact course and version");
}
async function contextualCoursesJourney(editor,student,source){
  // Run only after the original single-course/withdrawal/archive assertions.
  // This additional synthetic publication is made entirely through the real
  // editorial UI; it is not seeded and never receives personal learning data.
  enterStage("contextual courses with a real editorial peer");
  const adminRoot="/universidade/private/admin";
  const peerTitle="Aula contextual sintética de negócios";
  await editor.page.locator("#new-course").click();
  await editor.page.locator("#course-title").fill("Outro curso sintético de negócios");
  await editor.page.locator("#course-slug").fill("curso-contextual-framework-sintetico");
  await editor.page.locator("#course-category").selectOption("negocios");
  await editor.page.locator("#course-summary").fill("Material fictício para testar escolha livre entre cursos da mesma categoria.");
  await editor.page.locator("#course-sort").fill("10");
  const created=await clickResponse(editor.page,"#course-save","POST",adminRoot+"/courses");
  const peerId=(await json(created,"Contextual course creation")).id;
  await waitText(editor.page,"status","Rascunho salvo.");
  check(created.status()===201&&Number.isSafeInteger(peerId)&&peerId>0&&peerId!==source.courseId,
    "The contextual peer must be a distinct real course created through the editorial UI");
  await editor.page.locator("#lesson-title").fill(peerTitle);
  await editor.page.locator("#lesson-slug").fill("aula-contextual-framework-sintetica");
  await editor.page.locator("#lesson-body").fill("Exemplo totalmente fictício para estudar negócios.\n\nA escolha deste curso é opcional e não registra avaliação.");
  const lessonCreated=await clickResponse(editor.page,"#lesson-save","POST",adminRoot+"/courses/"+peerId+"/lessons");
  const peerLessonId=(await json(lessonCreated,"Contextual lesson creation")).id;
  await waitText(editor.page,"status","Aula salva em rascunho.");
  check(lessonCreated.status()===201&&Number.isSafeInteger(peerLessonId)&&peerLessonId>0&&peerLessonId!==source.lessonId,
    "The contextual peer lesson must be persisted by the real Laravel endpoint");
  await publish(editor,peerId,1);

  const catalogueResponse=await student.context.request.get(base+"/universidade/private/courses",{headers:{Accept:"application/json"}});
  const catalogue=await json(catalogueResponse,"Contextual authorized catalogue");
  check(catalogueResponse.status()===200&&Array.isArray(catalogue.courses)&&
    JSON.stringify(catalogue.courses.map(course=>course.id))===JSON.stringify([source.courseId,peerId])&&
    catalogue.courses.every(course=>course.category==="negocios"),
    "The real published catalogue must contain exactly the two expected courses in editorial order and the same category");
  await openStudent(student,source.courseId,source.title);
  await student.page.waitForFunction(()=>!state.libraryLoading&&!state.favoritesLoading&&state.favoritesReady&&
    !state.readingLoading&&state.readingSnapshot?.status==="available");

  const personalSnapshot=async()=>{
    const payload={};
    for(const [key,endpoint] of [["favorites","/favorites/export"],["progress","/progress/export"],["position","/reading-position"]]){
      const response=await student.context.request.get(base+"/universidade/private"+endpoint,{headers:{Accept:"application/json"}});
      const value=await json(response,"Contextual private snapshot");
      if(response.status()!==200||value.schema_version!==1||value.scope!=="current_authenticated_student")
        throw new Error("Contextual comparison requires valid private snapshots from the real backend");
      payload[key]=value;
    }
    return payload;
  };
  const before=await personalSnapshot();
  check(before.favorites.favorites.length===1&&before.favorites.favorites[0].course_slug==="curso-framework-sintetico"&&
    JSON.stringify(before.progress)===JSON.stringify(source.history)&&
    JSON.stringify(before.position)===JSON.stringify(source.position),
    "The real contextual journey must start with the exact existing favorite, historical completion and saved reading revision");
  const buttons=student.page.locator("#contextual-courses-list [data-contextual-course-id]");
  check(await buttons.count()===1&&await buttons.first().getAttribute("data-contextual-course-id")===String(peerId)&&
    (await student.page.locator("#contextual-courses-status").innerText()).includes("Negócios, a mesma categoria")&&
    businessRequests.filter(request=>request.profile===student.profile&&
      request.path==="/universidade/private/courses/"+peerId+"/lessons").length===0,
    "A real same-category suggestion must explain its category without preloading the other course");

  enterStage("contextual visibility without requests");
  const requestCount=businessRequests.filter(request=>request.profile===student.profile).length;
  const writes=countWrites(student.profile);
  const selected=await student.page.locator("#lesson-content h3").innerText();
  const resumeDisabled=await student.page.locator("#resume-course").isDisabled();
  await student.page.locator("#contextual-courses-toggle").click();
  check(await buttons.count()===0&&await student.page.locator("#contextual-courses-toggle").getAttribute("aria-expanded")==="false"&&
    (await student.page.locator("#contextual-courses-toggle").innerText()).includes("Mostrar sugestões nesta visita"),
    "The real student may hide contextual suggestions explicitly");
  await student.page.locator("#contextual-courses-toggle").click();
  check(await buttons.count()===1&&await student.page.locator("#contextual-courses-toggle").getAttribute("aria-expanded")==="true"&&
    businessRequests.filter(request=>request.profile===student.profile).length===requestCount&&countWrites(student.profile)===writes&&
    await student.page.locator("#lesson-content h3").innerText()===selected&&
    await student.page.locator("#resume-course").isDisabled()===resumeDisabled,
    "Showing and hiding suggestions must make zero private requests or writes and preserve the selected lesson and pending-course action");

  enterStage("explicit real contextual navigation");
  const navigationStart=businessRequests.length;
  const opened=await clickResponse(student.page,"[data-contextual-course-id='"+peerId+"']","GET",
    "/universidade/private/lessons/"+peerLessonId);
  const peerLesson=await json(opened,"Contextual peer lesson");
  await student.page.getByRole("heading",{name:peerTitle,exact:true}).waitFor({state:"visible"});
  check(await student.page.locator("#lesson-navigation-target").evaluate(node=>
    node===document.activeElement&&node.tagName==="H3"&&node.tabIndex===-1),
    "An explicit real contextual navigation must place focus on the authorized peer lesson heading");
  check(opened.status()===200&&peerLesson.lesson?.id===peerLessonId&&peerLesson.lesson.course_id===peerId&&
    peerLesson.lesson.course_version===1&&await student.page.locator("#lesson-content button.primary").isEnabled()&&
    await student.page.locator("#course-favorite-toggle").getAttribute("aria-pressed")==="false",
    "The explicit contextual click must read the real peer lesson without completing or favoriting it");
  const returned=await clickResponse(student.page,"[data-contextual-course-id='"+source.courseId+"']","GET",
    "/universidade/private/lessons/"+source.lessonId);
  const sourceLesson=await json(returned,"Contextual return lesson");
  await student.page.getByRole("heading",{name:source.title,exact:true}).waitFor({state:"visible"});
  check(await student.page.locator("#lesson-navigation-target").evaluate(node=>node===document.activeElement),
    "The real return navigation must deliver focus to the newly selected source lesson");
  check(returned.status()===200&&sourceLesson.lesson?.id===source.lessonId&&
    sourceLesson.lesson.course_id===source.courseId&&sourceLesson.lesson.course_version===source.version,
    "The return suggestion must reauthorize the exact currently published source lesson");
  const requests=businessRequests.slice(navigationStart).filter(request=>request.profile===student.profile);
  const expectedRoutes=[
    "/universidade/private/courses/"+peerId+"/lessons","/universidade/private/lessons/"+peerLessonId,
    "/universidade/private/lessons/"+peerLessonId+"/progress","/universidade/private/courses/"+source.courseId+"/lessons",
    "/universidade/private/lessons/"+source.lessonId,"/universidade/private/lessons/"+source.lessonId+"/progress"
  ];
  // Body and progress start together. Require the exact multiset of six
  // routes without imposing a browser event order on concurrent reads.
  check(requests.length===expectedRoutes.length&&requests.every(request=>request.method==="GET")&&
    JSON.stringify(requests.map(request=>request.path).sort())===JSON.stringify(expectedRoutes.sort())&&
    countWrites(student.profile)===writes,
    "The real contextual round trip must perform only the existing six authorized reads and no learning mutation");
  check(JSON.stringify(await personalSnapshot())===JSON.stringify(before),
    "The actual SQLite favorite timestamps, historical completions and reading reference/revision must be identical after the contextual round trip");
  await student.page.locator("#contextual-courses-panel").screenshot({
    path:path.join(evidenceDir,"framework-contextual-courses-desktop.png")});
  await student.page.setViewportSize({width:390,height:844});
  check(await student.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),
    "The real contextual suggestion must fit the narrow mobile viewport");
  await student.page.locator("#contextual-courses-panel").screenshot({
    path:path.join(evidenceDir,"framework-contextual-courses-mobile.png")});
  await student.page.setViewportSize({width:1440,height:1000});
  return peerId;
}

async function main(){
  enterStage("health");
  await awaitHealth();
  // Require/launch Chromium only after a token-bound health response proves
  // the randomly selected local port belongs to this test instance.
  const {chromium}=require("playwright");
  browser=await chromium.launch({headless:true,timeout:30000});
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
  await editorialLessonFilter(editor,courseId,firstLessonId,temporaryLessonId);
  const parallelLessonEditor=await openConcurrentLessonEditor(courseId,temporaryLessonId);
  await editorialLessonReorder(editor,courseId,firstLessonId,temporaryLessonId);
  await concurrentLessonEdits(editor,parallelLessonEditor,courseId,firstLessonId,temporaryLessonId);
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
  check(audited.status()===200&&["course.created","course.updated","course.deleted","course.lessons_reordered","lesson.created",
    "lesson.updated","lesson.deleted","course.published"].every(action=>actions.has(action)),
    "SQLite must persist the actual editorial audit for all exercised mutations");
  await editor.page.locator("#audit-items .audit-row").first().waitFor({state:"visible"});
  await editorialOverview(editor,true);
  await editor.page.screenshot({path:path.join(evidenceDir,"framework-editor.png"),fullPage:true});

  enterStage("independent student sessions");
  const studentA=await session("student-a"),studentB=await session("student-b");
  await openStudent(studentA,courseId,firstTitle);
  check(await studentA.page.locator("#lesson-navigation-target").evaluate(node=>
    node===document.activeElement&&node.tagName==="H3"&&node.tabIndex===-1),
    "Selecting a real course must deliver keyboard focus to its authorized lesson heading");
  await studentA.page.keyboard.press("Tab");
  check(await studentA.page.evaluate(()=>{
    const active=document.activeElement;
    return document.getElementById("lesson-content").contains(active)&&
      active.matches("button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled])");
  }),"Keyboard navigation after the real lesson heading must continue into an enabled lesson action without a focus trap");
  await lessonSectionNavigation(studentA);
  await studentLessonFilter(studentA,courseId,firstLessonId);
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

  enterStage("own retained references before withdrawal");
  const retainedA=await retainedFavorites(studentA,courseId,"available");
  await retainedFavorites(studentB,courseId,"available");

  enterStage("explicit private reading position");
  const emptyA=await readingSnapshot(studentA),emptyB=await readingSnapshot(studentB);
  check(emptyA.status==="none"&&emptyA.position===null&&emptyB.status==="none"&&emptyB.position===null,
    "Navigating and favoriting courses must not automatically create a reading position");
  const savedPositionA=await saveReadingPosition(studentA,courseId,1,firstLessonId);
  await openStudent(studentA,courseId,firstTitle);
  await studentA.page.waitForFunction(()=>document.getElementById("resume-reading-position").disabled===false);
  const isolatedPositionB=await readingSnapshot(studentB);
  check(await studentA.page.locator("#save-reading-position").isDisabled()&&
    isolatedPositionB.status==="none"&&isolatedPositionB.position===null&&
    !await studentA.page.locator("#lesson-content button.primary").isDisabled(),
    "The saved position must survive reload, stay private to the company and leave completion pending");
  const writesBeforeResume=countWrites("student-a");
  await studentA.page.bringToFront();
  await studentA.page.waitForFunction(()=>document.hasFocus()&&document.visibilityState==="visible");
  await studentA.page.locator('[data-filter="sistemas"]').click();
  const resumed=await clickResponse(studentA.page,"#resume-reading-position","GET",
    "/universidade/private/lessons/"+firstLessonId);
  const resumedLesson=await json(resumed,"Resumed exact reading position");
  await studentA.page.getByRole("heading",{name:firstTitle,exact:true}).waitFor({state:"visible"});
  check(resumed.status()===200&&resumedLesson.lesson?.id===firstLessonId&&
    resumedLesson.lesson.course_id===courseId&&resumedLesson.lesson.course_version===1&&
    await studentA.page.locator('[data-filter="todos"]').getAttribute("aria-pressed")==="true"&&
    countWrites("student-a")===writesBeforeResume,
    "Explicit resume must clear obstructing filters, open the saved exact version and remain read-only");
  check(await studentA.page.locator("#lesson-navigation-target").evaluate(node=>node===document.activeElement),
    "Resuming the exact real reading position must deliver the original focus intention only after the lesson is authorized");
  const savedPositionB=await saveReadingPosition(studentB,courseId,1,firstLessonId);

  enterStage("manual completion history before the first completion");
  await progressHistory(studentA,null);
  await progressHistory(studentB,null);
  const historyReadsBeforeCompletion=businessRequests.filter(request=>request.profile==="student-a"&&
    request.path==="/universidade/private/progress/history").length;
  enterStage("completion and disabled tutor");
  const completion=await clickResponse(studentA.page,"#lesson-content button.primary","POST",
    "/universidade/private/lessons/"+firstLessonId+"/complete");
  enterStage("completion interface confirmation");
  await studentA.page.waitForFunction(()=>{
    const button=document.querySelector("#lesson-content button.primary");
    return button?.disabled===true&&button.textContent.includes("Aula concluída");
  });
  const completed=await json(completion,"Lesson completion");
  check(completion.status()===200&&completed.completed===true&&
    (await studentA.page.locator("#lesson-content button.primary").innerText()).includes("Aula concluída"),
    "Student completion must be confirmed by the real database-backed API");
  await studentA.page.waitForFunction(id=>state.courses.find(course=>course.id===id)?.lessons_completed===1,courseId);
  check(await studentA.page.locator("#progress-history-list [data-completion-id]").count()===0&&
    (await studentA.page.locator("#progress-history-status").textContent()).includes("Consulte novamente")&&
    businessRequests.filter(request=>request.profile==="student-a"&&request.path==="/universidade/private/progress/history").length===historyReadsBeforeCompletion,
    "A real completion must invalidate the consulted history without inserting an optimistic row or requesting history automatically");
  const originalCompletion=await progressHistory(studentA,"available");
  await progressHistory(studentB,null);
  enterStage("completion isolation after student reload");
  await openStudent(studentB,courseId,firstTitle);
  check(!(await studentB.page.locator("#lesson-content button.primary").isDisabled())&&
    (await studentB.page.locator("#lesson-content button.primary").innerText()).includes("Marcar como concluída"),
    "Completion must not cross companies even when the synthetic person identifier is the same");
  const tutorWrites=countWrites("student-a");
  enterStage("disabled tutor request");
  await studentA.page.locator("#lesson-help-question").fill("Explique o visitante fictício desta aula.");
  const tutor=await clickResponse(studentA.page,"#lesson-help-submit","POST",
    "/universidade/private/lessons/"+firstLessonId+"/tutor");
  enterStage("disabled tutor static fallback");
  await waitText(studentA.page,"lesson-help-answer","A tutoria está indisponível");
  check(tutor.status()===503&&(await json(tutor,"Disabled tutor")).error==="tutor_unavailable"&&
    (await studentA.page.locator("#lesson-help-answer").innerText()).includes("Um visitante fictício"),
    "The default disabled tutor must return real 503 while literal authorized material remains useful");
  check(countWrites("student-a")===tutorWrites+1&&await studentA.page.locator("#lesson-content button.primary").isDisabled(),
    "The tutor fallback must not create another completion or mutate learning state");
  const unchangedPosition=await readingSnapshot(studentA);
  check(unchangedPosition.revision===savedPositionA.revision&&
    unchangedPosition.position?.saved_at===savedPositionA.position.saved_at,
    "Completion, reload and contextual help must not move or refresh the explicit reading preference");

  enterStage("withdrawal and retained private history");
  const withdrawn=await confirmResponse(editor.page,"#unpublish","POST",
    adminRoot+"/courses/"+courseId+"/unpublish","Retirar ");
  await waitText(editor.page,"status","Versão anterior arquivada");
  check(withdrawn.status()===200&&(await json(withdrawn,"Course withdrawal")).published===false,
    "Real withdrawal must archive the publication and create a new draft");
  await editorialOverview(editor,false);
  const newLessonId=Number(await editor.page.locator("#lesson-items [data-lesson]").first().getAttribute("data-lesson"));
  check(Number.isSafeInteger(newLessonId)&&newLessonId>0&&newLessonId!==firstLessonId,
    "The new draft must have a new lesson identity instead of overwriting historical progress");
  await reconcileWithdrawnReader(studentA,courseId,firstLessonId,savedPositionA.revision);
  for(const student of [studentA,studentB]){
    await student.page.goto(base+"/universidade/private/app");
    await waitText(student.page,"favorites-status","Nenhum favorito disponível");
    check(await student.page.locator("#course-list [data-course-id]").count()===0&&
      await student.page.locator("#lesson-content h3").count()===0,
      "Withdrawn material and its favorite must disappear from each real student catalogue");
    await waitText(student.page,"reading-position-status","A aula guardada não está disponível");
    check(await student.page.locator("#resume-reading-position").isHidden(),
      "Withdrawal must make the exact reading position unavailable without offering another lesson");
  }
  const oldSource=await studentA.context.request.get(base+"/universidade/private/lessons/"+firstLessonId,
    {headers:{Accept:"application/json"}});
  check(oldSource.status()===404,"The archived lesson must be unavailable through its previous HTTP identity");
  const withdrawnCompletion=await progressHistory(studentA,"unavailable");
  check(withdrawnCompletion.completion_id===originalCompletion.completion_id&&
    withdrawnCompletion.completed_at===originalCompletion.completed_at,
    "Withdrawal must retain the original completion identity and date while marking that exact lesson version unavailable");
  await progressHistory(studentB,null);
  await studentA.page.locator("#progress-history-panel").screenshot({path:path.join(evidenceDir,"framework-progress-history-desktop.png")});
  await studentA.page.setViewportSize({width:390,height:844});
  check(await studentA.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),
    "The real retained completion references must remain legible inside the narrow mobile viewport");
  await studentA.page.locator("#progress-history-panel").screenshot({path:path.join(evidenceDir,"framework-progress-history-mobile.png")});
  await studentA.page.setViewportSize({width:1440,height:1000});
  await exportFavorites(studentA,["curso-framework-sintetico"]);
  const retainedAfterWithdrawal=await retainedFavorites(studentA,courseId,"unavailable");
  check(retainedAfterWithdrawal.saved_at===retainedA.saved_at&&
    !await studentA.page.locator("#retained-favorites-list a").count()&&
    !(await studentA.page.locator("#retained-favorites-list").textContent()).includes("Curso sintético revisado"),
    "Withdrawal must preserve the original favorite date without exposing a withdrawn title or content link");
  await studentA.page.locator("#retained-favorites-panel").screenshot({path:path.join(evidenceDir,"framework-retained-favorites-desktop.png")});
  await studentA.page.setViewportSize({width:390,height:844});
  check(await studentA.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),
    "The retained favorites manager must remain within the narrow mobile viewport");
  await studentA.page.locator("#retained-favorites-panel").screenshot({path:path.join(evidenceDir,"framework-retained-favorites-mobile.png")});
  await studentA.page.setViewportSize({width:1440,height:1000});
  await retainedFavorites(studentB,courseId,"unavailable");
  const beforeRetainedRemoval=countWrites("student-b");
  const removeWithdrawn=await clickResponse(studentB.page,"[data-remove-retained-favorite='"+courseId+"']","DELETE",
    "/universidade/private/courses/"+courseId+"/favorite");
  const removal=await json(removeWithdrawn,"Withdrawn favorite removal");
  await studentB.page.locator("#retained-favorites-list [data-retained-course-id='"+courseId+"']").waitFor({state:"detached"});
  check(removeWithdrawn.status()===200&&removal.course_id===courseId&&removal.favorite===false,
    "The owner may remove a withdrawn favorite through its own real UI row and CSRF-protected API");
  check(countWrites("student-b")===beforeRetainedRemoval+1&&
    await studentB.page.locator("#lesson-content h3").count()===0&&
    (await retainedFavorites(studentA,courseId,"unavailable")).saved_at===retainedA.saved_at,
    "One explicit removal must preserve the other company's retained preference and keep withdrawn lessons closed");
  await exportFavorites(studentB,[]);
  const withdrawnPosition=await readingSnapshot(studentA);
  check(withdrawnPosition.status==="unavailable"&&withdrawnPosition.position===null&&
    withdrawnPosition.revision===savedPositionA.revision,
    "A withdrawn reading position must hide navigable details while retaining its own revision for removal");
  await exportReadingPosition(studentA,1);
  await openReadingOptions(studentB);
  const removedPosition=await clickResponse(studentB.page,"#remove-reading-position","DELETE","/universidade/private/reading-position");
  const positionRemoval=await json(removedPosition,"Reading position removal");
  await waitText(studentB.page,"reading-position-status","Posição guardada removida");
  check(removedPosition.status()===200&&positionRemoval.status==="none"&&positionRemoval.position===null&&
    positionRemoval.revision!==savedPositionB.revision&&/^r1\.[a-f0-9]{64}$/.test(positionRemoval.revision),
    "Removing an unavailable position through the UI must erase the reference and replace its concurrency revision");
  await exportReadingPosition(studentB,null);
  const otherPosition=await readingSnapshot(studentA);
  check(otherPosition.status==="unavailable"&&otherPosition.revision===savedPositionA.revision,
    "Removing one company's reading position must preserve the other company's independent preference");

  enterStage("read-only editorial archive with independent drafts");
  await editor.page.locator("#lesson-items [data-lesson='"+newLessonId+"']").click();
  const archiveFields=["course-summary","lesson-title","lesson-body"];
  const cleanArchiveFields=await fields(editor.page,archiveFields);
  await editor.page.locator("#course-summary").fill("Resumo local sintético preservado durante a consulta histórica.");
  await editor.page.locator("#lesson-body").fill(revisedBody+"\n\nRascunho local ainda não salvo.");
  const pendingArchiveFields=await fields(editor.page,archiveFields),archiveWrites=countWrites("editor");
  await archivedLessonPreview(editor,courseId,1,firstLessonId,revisedBody);
  check(JSON.stringify(await fields(editor.page,archiveFields))===JSON.stringify(pendingArchiveFields)&&
    countWrites("editor")===archiveWrites&&
    await editor.page.locator("#lesson-items [data-lesson='"+newLessonId+"'][aria-current='true']").count()===1,
    "Browsing an archived version must preserve both unsaved forms, current draft selection and the write count");
  const beforeFilters=businessRequests.filter(request=>request.profile==="editor").length;
  await editor.page.locator("#editorial-course-search").fill("Termo sem correspondência no cadastro");
  await editor.page.locator("#editorial-category-filter").selectOption("sistemas");
  await editor.page.locator("#editorial-state-filter").selectOption("published");
  check(await editor.page.locator("#course-items [data-course]").count()===1&&
    await editor.page.locator("#course-items [data-course='"+courseId+"'][data-outside-filter='true'][aria-current='true']").count()===1&&
    (await editor.page.locator("#editorial-filter-status").textContent()).includes("0 de 1 curso")&&
    JSON.stringify(await fields(editor.page,archiveFields))===JSON.stringify(pendingArchiveFields)&&
    (await editor.page.locator("#editorial-version-content").textContent()).includes("Um visitante fictício")&&
    businessRequests.filter(request=>request.profile==="editor").length===beforeFilters,
    "Local editorial filters must keep the selected nonmatching course, both drafts and archived reader without another request");
  await editor.page.locator("#editorial-catalog-panel").screenshot({path:path.join(evidenceDir,"framework-editorial-filters-desktop.png")});
  await editor.page.locator("#editorial-versions-panel").screenshot({path:path.join(evidenceDir,"framework-archive-desktop.png")});
  await editor.page.setViewportSize({width:390,height:844});
  check(await editor.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),
    "The real archived reader and editorial catalogue controls must remain within the narrow mobile viewport");
  await editor.page.locator("#editorial-catalog-panel").screenshot({path:path.join(evidenceDir,"framework-editorial-filters-mobile.png")});
  await editor.page.locator("#editorial-versions-panel").screenshot({path:path.join(evidenceDir,"framework-archive-mobile.png")});
  await editor.page.setViewportSize({width:1440,height:1000});
  await editor.page.locator("#clear-editorial-filters").click();
  check(await editor.page.locator("#editorial-course-search").inputValue()===""&&
    await editor.page.locator("#editorial-category-filter").inputValue()==="todos"&&
    await editor.page.locator("#editorial-state-filter").inputValue()==="todos"&&
    await editor.page.locator("#course-items [data-outside-filter]").count()===0&&
    await editor.page.locator("#course-items [data-course='"+courseId+"'][aria-current='true']").count()===1&&
    JSON.stringify(await fields(editor.page,archiveFields))===JSON.stringify(pendingArchiveFields)&&
    businessRequests.filter(request=>request.profile==="editor").length===beforeFilters,
    "Clearing editorial filters must restore the full navigation and preserve the same unsaved content without network activity");
  for(let index=0;index<archiveFields.length;index++){
    await editor.page.locator("#"+archiveFields[index]).fill(cleanArchiveFields[index]);
  }

  enterStage("republication and independent current progress");
  await editor.page.locator("#lesson-items [data-lesson='"+newLessonId+"']").click();
  const revisedTitle="Primeira aula sintética revisada";
  await editor.page.locator("#lesson-title").fill(revisedTitle);
  await editor.page.locator("#lesson-body").fill(revisedBody+"\n\nRevisão editorial sintética da segunda versão.");
  const savedRevision=await clickResponse(editor.page,"#lesson-save","PATCH",adminRoot+"/lessons/"+newLessonId);
  await waitText(editor.page,"status","Aula salva em rascunho.");
  check(savedRevision.status()===200,"The cloned draft lesson must remain editable through the UI");
  check(!(await editor.page.locator("#editorial-version-content").textContent()).includes("Um visitante fictício"),
    "A new editorial mutation must invalidate the previously loaded archive view");
  await publish(editor,courseId,2);
  const preservedArchiveResponse=await editor.context.request.get(base+adminRoot+"/courses/"+courseId+
    "/versions/1/lessons/"+firstLessonId,{headers:{Accept:"application/json"}});
  const preservedArchive=await json(preservedArchiveResponse,"Archive after republication");
  check(preservedArchiveResponse.status()===200&&preservedArchive.course_version===1&&
    preservedArchive.status==="archived"&&preservedArchive.lesson.id===firstLessonId&&preservedArchive.lesson.body===revisedBody,
    "Editing and publishing the new version must preserve the earlier archived lesson content");
  await openStudent(studentA,courseId,revisedTitle);
  await openStudent(studentB,courseId,revisedTitle);
  check((await studentA.page.locator("#course-favorite-toggle").getAttribute("aria-pressed"))==="true"&&
    (await studentB.page.locator("#course-favorite-toggle").getAttribute("aria-pressed"))==="false",
    "Republication must restore retained favorites and respect an explicit withdrawn favorite removal");
  check((await retainedFavorites(studentA,courseId,"available")).saved_at===retainedA.saved_at&&
    await retainedFavorites(studentB,courseId,null)===null,
    "Republication must update retained availability without recreating the explicitly removed favorite or refreshing its original date");
  check(!(await studentA.page.locator("#lesson-content button.primary").isDisabled())&&
    (await studentA.page.locator("#lesson-content button.primary").innerText()).includes("Marcar como concluída"),
    "The new version starts pending without inheriting an archived lesson completion");
  await waitText(studentA.page,"reading-position-status","A aula guardada não está disponível");
  check(await studentA.page.locator("#resume-reading-position").isHidden(),
    "Republication must not silently remap an archived reading position to the new version");
  const revisedPosition=await saveReadingPosition(studentA,courseId,2,newLessonId);
  await exportReadingPosition(studentA,2);
  const history=await exportProgress(studentA);
  check(history.scope==="current_authenticated_student"&&
    Array.isArray(history.completions)&&history.completions.length===1&&
    history.completions[0].course_slug==="curso-framework-sintetico"&&history.completions[0].course_version===1&&
    history.completions[0].lesson_slug==="aula-principal-sintetica"&&
    history.completions[0].completed_at===originalCompletion.completed_at,
    "A real browser download must preserve the original version and exact UTC completion timestamp after republication");

  const contextualPeerId=await contextualCoursesJourney(editor,studentA,{
    courseId,lessonId:newLessonId,title:revisedTitle,version:2,position:revisedPosition,history
  });

  enterStage("retained completion version after republication");
  const republishedCompletion=await progressHistory(studentA,"unavailable");
  check(JSON.stringify(republishedCompletion)===JSON.stringify(withdrawnCompletion)&&
    await studentA.page.locator("#lesson-content button.primary").isEnabled(),
    "Republication and contextual navigation must preserve the old unavailable completion without completing the new version");
  await progressHistory(studentB,null);
  // The contextual journey reloads the student page. Refill the manager so
  // the following revocation still proves removal of populated private rows.
  await retainedFavorites(studentA,courseId,"available");
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
  check(await studentA.page.locator("#reading-position-panel").isHidden()&&
    await studentA.page.locator("#resume-reading-position").isDisabled()&&
    await studentA.page.locator("#export-reading-position").isDisabled(),
    "Eligibility revocation must also purge reading-position controls and block exports");
  check(await studentA.page.locator("#retained-favorites-panel").isHidden()&&
    await studentA.page.locator("#retained-favorites-list [data-retained-course-id]").count()===0&&
    await studentA.page.locator("#reload-retained-favorites").isDisabled(),
    "Eligibility revocation must purge retained references and disable the private manager");
  check(await studentA.page.locator("#progress-history-panel").isHidden()&&
    !(await studentA.page.locator("#progress-history-panel").evaluate(node=>node.open))&&
    await studentA.page.locator("#progress-history-list [data-completion-id]").count()===0&&
    (await studentA.page.locator("#progress-history-status").textContent())===""&&
    await studentA.page.locator("#reload-progress-history").isDisabled(),
    "Eligibility revocation must close and purge the populated personal completion history without deleting its records");
  check(await studentA.page.locator("#contextual-courses-panel").isHidden()&&
    await studentA.page.locator("#contextual-courses-list [data-contextual-course-id]").count()===0&&
    (await studentA.page.locator("#contextual-courses-status").textContent())===""&&
    await studentA.page.locator("#contextual-courses-toggle").isDisabled(),
    "Eligibility revocation must purge the real category suggestions and disable their controls");
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
  await studentA.page.waitForFunction(()=>document.getElementById("resume-reading-position").disabled===false);
  const restoredPosition=await readingSnapshot(studentA);
  check(restoredPosition.status==="available"&&restoredPosition.revision===revisedPosition.revision&&
    restoredPosition.position?.lesson_id===newLessonId,
    "A new eligible page load may restore the retained position without inventing another save");
  check(await studentA.page.locator("#course-list [data-course-id='"+courseId+"']").count()===1&&
    await studentA.page.locator("#contextual-courses-list [data-contextual-course-id='"+contextualPeerId+"']").count()===1,
    "A newly eligible page may suggest the independently published peer while preserving the selected source course");
  check(JSON.stringify(await progressHistory(studentA,"unavailable"))===JSON.stringify(withdrawnCompletion),
    "A newly eligible manual history query must restore the same retained reference without creating another completion");
  await studentA.page.screenshot({path:path.join(evidenceDir,"framework-student.png"),fullPage:true});
  check(pageErrors.length===0,"The real framework browser flow must have no uncaught page errors");
  fs.writeFileSync(path.join(evidenceDir,"framework-browser-summary.json"),JSON.stringify({
    status:"passed",checks,framework:"Laravel",database:"disposable SQLite",business_responses:"real HTTP",
    synthetic_profiles:3,scenarios:["csrf","editorial CRUD","local editorial lesson search","atomic lesson reorder","concurrent text and order edits","publication hash","audit","editorial overview","private favorites","favorites export download",
      "retained favorites manager","explicit reading position","reading position export","read-only editorial archive","completion isolation","disabled tutor","withdrawal and republication","withdrawn selected course reconciliation","historical progress","contextual courses without personal ranking","manual completion history","explicit navigation focus","local lesson section index","local student lesson locator","revocation"],
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
