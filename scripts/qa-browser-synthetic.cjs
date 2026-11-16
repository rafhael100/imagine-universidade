#!/usr/bin/env node
"use strict";
/**
 * Browser-only smoke of real Blade markup and frontend JS under SYNTHETIC
 * API fixtures. No Portal auth/session or backend writes are bypassed.
 * Run ONLY in disposable GitHub Actions QA, with 127.0.0.1 binding.
 */
const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

if (process.env.CI !== "true" || process.env.UNI_BROWSER_LAB !== "synthetic") {
  throw new Error("Only explicitly labeled, CI-only synthetic browser QA is allowed.");
}
const root = path.resolve(__dirname, "..");
const out = process.env.UNI_BROWSER_EVIDENCE;
if (!out || !fs.existsSync(out)) throw new Error("Synthetic evidence destination missing.");

const host = "127.0.0.1", port = 18762, base = "http://" + host + ":" + port;
const nonce = Buffer.from("synthetic-csp-qa-only").toString("base64");
function render(filename) {
  let markup = fs.readFileSync(path.join(root,"resources/views/university",filename+".blade.php"),"utf8");
  markup = markup.replaceAll("{{ csrf_token() }}","ci-synthetic-csrf");
  markup = markup.replaceAll("{{ request()->attributes->get('university.csp_nonce') }}",nonce);
  for(const asset of ["imagine-tokens.css","logo-imagine.png"]){
    markup = markup.replaceAll("{{ asset('assets/"+asset+"') }}",base+"/assets/"+asset);
  }
  if(markup.includes("{{")||markup.includes("{!!"))throw new Error("Unexpected Blade directive in synthetic test fixture.");
  return markup;
}
const studentHTML=render("student"), adminHTML=render("admin");
const assets={
  "/assets/logo-imagine.png":{body:fs.readFileSync(path.join(root,"public/assets/logo-imagine.png")),type:"image/png"},
  "/assets/imagine-tokens.css":{body:fs.readFileSync(path.join(root,"public/assets/imagine-tokens.css")),type:"text/css; charset=utf-8"}
};
const courses=()=>[{id:1,slug:"trilha-visitas-seja-encontrado",title:"Visitas, Leads e Clientes — Exemplo sintético",summary:"Aulas fictícias apenas para QA.",category:"metodologia",lessons_total:2,lessons_completed:completed?1:0}];
const lessonRows=()=>[
 {id:11,title:"Visitas fictícias",completed:completed?1:0},
 {id:12,title:"Leads fictícios",completed:0}
];
let completed=false,denyStudent=false,failInitializeOnce=false,failAdminCoursesOnce=false,failStudentLessonsOnce=false,failAdminLessonsOnce=false,failLessonDetailOnce=false,failLessonProgressOnce=false,denyLessonDetailOnce=false,completionFault="none",failReconcileProgressOnce=false;
let requests=0,progressReads=0,completionPosts=0;
const audit=[
 {id:2,action:"lesson.created",resource_kind:"lesson",resource_id:11,occurred_at:"2026-11-15T12:00:00"},
 {id:1,action:"course.created",resource_kind:"course",resource_id:1,occurred_at:"2026-11-15T11:00:00"}
];
function send(res,status,body,contentType="application/json"){
  res.writeHead(status,{
    "Content-Type":contentType,
    "Cache-Control":"private, no-store",
    "X-Content-Type-Options":"nosniff",
    "Content-Security-Policy":"default-src 'none'; script-src 'self' 'nonce-"+nonce+"'; style-src 'self' 'nonce-"+nonce+"'; img-src 'self'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'"
  });
  res.end(contentType.startsWith("application/json")?JSON.stringify(body):body);
}
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,base);
  const p=url.pathname;requests++;
  if(req.method==="GET"&&assets[p])return send(res,200,assets[p].body,assets[p].type);
  if(p==="/student")return send(res,200,studentHTML,"text/html; charset=utf-8");
  if(p==="/admin")return send(res,200,adminHTML,"text/html; charset=utf-8");
  if(p.startsWith("/universidade/private/")&&!p.startsWith("/universidade/private/admin/")&&denyStudent){
    return send(res,403,{error:"access_denied"});
  }
  if(p==="/universidade/private/initialize"&&req.method==="POST"){
    if(failInitializeOnce){failInitializeOnce=false;return send(res,503,{error:"temporarily_unavailable"});}
    return send(res,200,{ready:true});
  }
  if(p==="/universidade/private/courses"&&req.method==="GET")return send(res,200,{courses:courses()});
  if(p==="/universidade/private/courses/1/lessons"){
    if(failStudentLessonsOnce){failStudentLessonsOnce=false;return send(res,503,{error:"temporarily_unavailable"});}
    return send(res,200,{lessons:lessonRows()});
  }
  if(p==="/universidade/private/lessons/11"&&req.method==="GET"){
    if(denyLessonDetailOnce){denyLessonDetailOnce=false;return send(res,403,{error:"access_denied"});}
    if(failLessonDetailOnce){failLessonDetailOnce=false;return send(res,503,{error:"temporarily_unavailable"});}
    return send(res,200,{lesson:{id:11,title:"Visitas fictícias",body:"Contexto da aula.\n\nEXEMPLO FICTÍCIO\nUm visitante fictício.\n\nAPLICAÇÃO OPCIONAL\nDesenhar a jornada.\n\nCUIDADO IMPORTANTE\nSem promessas de vendas."}});
  }
  if(p==="/universidade/private/lessons/12"&&req.method==="GET")return send(res,200,{lesson:{id:12,title:"Leads fictícios",body:"Todo interesse deve ser tratado com responsabilidade."}});
  if(p==="/universidade/private/lessons/11/progress"){
    progressReads++;
    if(failLessonProgressOnce){failLessonProgressOnce=false;return send(res,503,{error:"temporarily_unavailable"});}
    if(failReconcileProgressOnce){failReconcileProgressOnce=false;return send(res,503,{error:"temporarily_unavailable"});}
    return send(res,200,{completed});
  }
  if(p==="/universidade/private/lessons/12/progress")return send(res,200,{completed:false});
  if(p==="/universidade/private/lessons/11/complete"&&req.method==="POST"){
    completionPosts++;
    const fault=completionFault;completionFault="none";
    if(fault==="after_commit"){completed=true;return send(res,503,{error:"response_lost_after_commit"});}
    if(fault==="before_commit")return send(res,503,{error:"write_not_committed"});
    completed=true;return send(res,200,{completed:true});
  }
  if(p==="/universidade/private/progress/export")return send(res,200,{schema_version:1,scope:"current_authenticated_student",completions:completed?[{course_slug:"qa",lesson_slug:"visitantes",course_version:1,completed_at:"2026-11-15"}]:[]});
  if(p==="/universidade/private/admin/courses"){
    if(failAdminCoursesOnce){failAdminCoursesOnce=false;return send(res,503,{error:"temporarily_unavailable"});}
    return send(res,200,{courses:[{id:1,slug:"curso-sintetico",title:"Curso editorial fictício",category:"metodologia",summary:"Rascunho exclusivo de QA",sort_order:0,is_published:false}]});
  }
  if(p==="/universidade/private/admin/courses/1/lessons"){
    if(failAdminLessonsOnce){failAdminLessonsOnce=false;return send(res,503,{error:"temporarily_unavailable"});}
    return send(res,200,{lessons:[{id:11,slug:"aula-ficticia",title:"Aula fictícia de revisão",body:"Texto fictício de revisão sem dados reais.\n\nEXEMPLO FICTÍCIO\nCaso demonstrativo.",sort_order:0,status:"draft",is_published:false}]});
  }
  if(p==="/universidade/private/admin/courses/1/publication-check")
    return send(res,200,{course_id:1,version:1,lesson_count:1,ready:true,issues:[],
      warnings:[],advisory_only:true,content_hash:"a".repeat(64)});
  if(p==="/universidade/private/admin/audit")return send(res,200,{events:audit,next_before_id:null});
  send(res,404,{error:"not_found"});
});
const results={screenshots:[],accessibility:[],assertions:0};
function check(value,message){assert.ok(value,message);results.assertions++;}
async function ensureLocalPage(page){
  await page.route("**/*",route=>{
    const url=route.request().url();
    if(url.startsWith(base+"/"))return route.continue();
    return route.abort();
  });
}
async function inspect(page,name){
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});
    await page.waitForTimeout(90);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
    check(!overflow,name+" horizontal overflow "+width);
    if([320,390,768,1440].includes(width)){
      const file=name+"-"+width+".png";
      await page.screenshot({path:path.join(out,file),fullPage:true});
      results.screenshots.push(file);
    }
  }
  // Responsive viewport at 720 CSS px approximates the layout space
  // left by a 1440 px wide browser window at 200% zoom. This is a layout
  // proxy, not a substitute for manual assistive-technology review.
  await page.setViewportSize({width:720,height:900});
  await page.waitForTimeout(90);
  const zoomEquivalentOverflow=await page.evaluate(
    ()=>document.documentElement.scrollWidth>window.innerWidth+1
  );
  check(!zoomEquivalentOverflow,name+" effective 200%-zoom layout proxy must not overflow");
  await page.setViewportSize({width:1440,height:900});
  const axe=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
  const issues=axe.violations.map(v=>({id:v.id,impact:v.impact,description:v.help,targets:v.nodes.map(n=>n.target)}));
  fs.writeFileSync(path.join(out,name+"-axe.json"),JSON.stringify({page:name,violations:issues},null,2));
  results.accessibility.push({page:name,seriousOrCritical:issues.filter(v=>v.impact==="serious"||v.impact==="critical").length});
  check(results.accessibility.at(-1).seriousOrCritical===0,name+" has serious/critical axe violations.");
}
(async()=>{
  await new Promise((resolve,reject)=>server.once("error",reject).listen(port,host,resolve));
  const browser=await chromium.launch({headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
    const page=await context.newPage();
    await ensureLocalPage(page);
    const pageErrors=[];
    page.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));

    // Temporary Portal/backend outage: no automatic retry, explicit
    // accessible recovery; authorized data appears only after a new
    // server-side initialize + catalog request succeeds.
    failInitializeOnce=true;
    const recovering=await context.newPage();
    await ensureLocalPage(recovering);
    await recovering.goto(base+"/student");
    await recovering.locator("#retry-library").waitFor({state:"visible",timeout:8000});
    check((await recovering.locator("#course-list").innerText()).includes("indisponíveis"),
      "transient failure does not leak a cached catalog");
    check((await recovering.locator("#course-list [data-course-id]").count())===0,
      "no authorized course is rendered before retry");
    await recovering.locator("#retry-library").click();
    await recovering.locator("#course-list [data-course-id='1']").waitFor({state:"visible",timeout:8000});
    check(!(await recovering.locator("#library-recovery").isVisible()),
      "successful manual retry hides the recovery action");
    check((await recovering.locator("#course-list [data-course-id]").count())===1,
      "successful retry reloads catalog from synthetic server");
    await recovering.close();

    failStudentLessonsOnce=true;
    const recoveringLessons=await context.newPage();
    await ensureLocalPage(recoveringLessons);
    recoveringLessons.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    await recoveringLessons.goto(base+"/student");
    await recoveringLessons.locator("#course-list [data-course-id='1']").waitFor();
    await recoveringLessons.locator("#course-list [data-course-id='1']").click();
    await recoveringLessons.locator("#lesson-content .lesson-retry").waitFor({state:"visible",timeout:8000});
    check((await recoveringLessons.locator("#lesson-items [data-lesson-id]").count())===0,
      "failed lesson-list read has no stale lesson buttons");
    await recoveringLessons.locator("#lesson-content .lesson-retry").click();
    await recoveringLessons.locator("#lesson-items [data-lesson-id='11']").waitFor({state:"visible",timeout:8000});
    check((await recoveringLessons.locator("#lesson-content .lesson-retry").count())===0,
      "successful lesson retry removes error button and reloads authorized lessons");
    await recoveringLessons.close();

    for(const failedRead of ["detail","progress"]){
      if(failedRead==="detail")failLessonDetailOnce=true;
      else failLessonProgressOnce=true;
      const recoveringDetail=await context.newPage();
      await ensureLocalPage(recoveringDetail);
      recoveringDetail.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
      await recoveringDetail.goto(base+"/student");
      await recoveringDetail.locator("#course-list [data-course-id='1']").waitFor();
      await recoveringDetail.locator("#course-list [data-course-id='1']").click();
      await recoveringDetail.locator("#lesson-content .lesson-detail-retry").waitFor({state:"visible",timeout:8000});
      check((await recoveringDetail.locator("#lesson-content button.primary").count())===0,
        "failure to read "+failedRead+" must not show a completion action");
      await recoveringDetail.locator("#lesson-content .lesson-detail-retry").click();
      await recoveringDetail.locator("#lesson-content h3").waitFor({state:"visible",timeout:8000});
      check((await recoveringDetail.getByRole("heading",{name:"Visitas fictícias"}).count())===1,
        "manual retry after "+failedRead+" reloads authorized lesson");
      check((await recoveringDetail.locator("#lesson-content .lesson-detail-retry").count())===0,
        "successful "+failedRead+" retry clears the recovery state");
      await recoveringDetail.close();
    }

    denyLessonDetailOnce=true;
    const deniedDetail=await context.newPage();
    await ensureLocalPage(deniedDetail);
    deniedDetail.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    await deniedDetail.goto(base+"/student");
    await deniedDetail.locator("#course-list [data-course-id='1']").waitFor();
    await deniedDetail.locator("#course-list [data-course-id='1']").click();
    await deniedDetail.waitForFunction(()=>document.querySelector("#resume-course").disabled &&
      document.querySelector("#course-list").textContent.includes("Biblioteca indisponível"));
    check((await deniedDetail.locator("#lesson-content .lesson-detail-retry").count())===0,
      "403 in individual lesson must not offer an unauthorized retry");
    check((await deniedDetail.locator("#lesson-content button.primary").count())===0,
      "403 in individual lesson cannot leave completion enabled");
    await deniedDetail.close();

    // An uncertain POST may already have committed. Compare read-only
    // authoritative progress before any second write is available.
    for(const fault of ["after_commit","before_commit","unverifiable"]){
      completed=false;
      completionFault=fault==="unverifiable"?"after_commit":fault;
      const retrying=await context.newPage();
      await ensureLocalPage(retrying);
      retrying.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
      await retrying.goto(base+"/student");
      await retrying.locator("#course-list [data-course-id='1']").waitFor();
      await retrying.locator("#course-list [data-course-id='1']").click();
      await retrying.locator("#lesson-content button.primary").waitFor({state:"visible",timeout:8000});
      const beforePost=completionPosts,beforeRead=progressReads;
      if(fault==="unverifiable")failReconcileProgressOnce=true;
      await retrying.locator("#lesson-content button.primary").click();
      await retrying.waitForFunction(fault==="after_commit"
        ?()=>document.querySelector("#status").textContent.includes("Conclusão confirmada")
        :fault==="before_commit"
        ?()=>document.querySelector("#status").textContent.includes("não foi registrada")
        :()=>document.querySelector("#status").textContent.includes("Não foi possível confirmar o resultado"));
      check(completionPosts===beforePost+1,
        "exactly one POST sent during an ambiguous "+fault+" completion");
      check(progressReads===beforeRead+1,
        "ambiguous "+fault+" completion must reconcile with a GET");
      if(fault==="before_commit"){
        check(!(await retrying.locator("#lesson-content button.primary").isDisabled()),
          "confirmed not-committed write may be explicitly retried");
        check((await retrying.locator("#lesson-content button.primary").innerText()).includes("Marcar"),
          "uncommitted write must not falsely claim completion");
      }else{
        check(await retrying.locator("#lesson-content button.primary").isDisabled(),
          "committed or uncertain write must not be submitted twice");
        if(fault==="after_commit"){
          check((await retrying.locator("#lesson-content button.primary").innerText()).includes("concluída"),
            "committed write is confirmed by independent progress GET");
        }
      }
      await retrying.close();
    }
    completed=false;

    await page.goto(base+"/student");
    await page.waitForFunction(()=>!document.querySelector("#resume-course").disabled);
    await page.locator("#sim-visits").fill("1000");
    await page.locator("#sim-leads-rate").fill("5");
    await page.locator("#sim-clients-rate").fill("10");
    check((await page.locator("#sim-results").innerText()).includes("50 leads"),
      "simulator calculates fictional leads on the client");
    check((await page.locator("#sim-results").innerText()).includes("5 clientes"),
      "simulator calculates fictional clients on the client");
    check((await page.locator("#course-list [data-course-id]").count())===1,"student must show authorized synthetic course");
    await page.locator("#course-list [data-course-id='1']").click();
    await page.waitForFunction(()=>document.querySelector("#lesson-content h3")!==null);
    check(await page.getByRole("heading",{name:"Visitas fictícias"}).count()===1,"lesson must load");
    await page.locator("#lesson-content button.primary").click();
    await page.waitForFunction(()=>document.querySelector("#overall-progress").textContent.includes("1 de 2"));
    check(await page.getByText("✓ Aula concluída",{exact:true}).count()>=1,"student completion persisted in synthetic API");
    check(await page.getByRole("heading",{name:"EXEMPLO FICTÍCIO"}).count()===1,"lesson sections rendered");
    await inspect(page,"student");
    denyStudent=true;
    await page.locator("#export-progress").click();
    await page.waitForFunction(()=>document.querySelector("#resume-course").disabled && document.querySelector("#export-progress").disabled);
    check((await page.locator("#lesson-content").innerText()).includes("Volte ao Portal"),"revoke must purge lesson");
    check(await page.locator("#sim-visits").isDisabled(),"revoked student cannot use simulator");
    check(!(await page.locator("#library-recovery").isVisible()),"revoked access cannot offer retry");
    check(!(await page.locator("#sim-results").isVisible()),"simulator response purged after revocation");
    check(await page.getByText("Visitas fictícias",{exact:true}).count()===0,"private lesson title must be removed");
    denyStudent=false;

    failAdminCoursesOnce=true;
    const recoveringAdmin=await context.newPage();
    await ensureLocalPage(recoveringAdmin);
    recoveringAdmin.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    await recoveringAdmin.goto(base+"/admin");
    await recoveringAdmin.locator("#retry-catalog").waitFor({state:"visible",timeout:8000});
    check((await recoveringAdmin.locator("#course-items [data-course]").count())===0,
      "temporary admin outage must not expose stale courses");
    check(await recoveringAdmin.locator("#new-course").isDisabled(),
      "new course disabled while verified editorial catalog is unavailable");
    check(await recoveringAdmin.locator("#course-save").isDisabled(),
      "editorial write disabled while current catalog has not been verified");
    check((await recoveringAdmin.locator("#course-items").innerText()).includes("temporariamente indisponíveis"),
      "admin outage notice distinguishes failure from truly empty library");
    await recoveringAdmin.locator("#retry-catalog").click();
    await recoveringAdmin.locator("#course-items [data-course='1']").waitFor({state:"visible",timeout:8000});
    check(!(await recoveringAdmin.locator("#catalog-recovery").isVisible()),
      "successful admin catalog retry hides error state");
    check(!(await recoveringAdmin.locator("#new-course").isDisabled()),
      "successful verified catalog reload re-enables editorial creation");
    await recoveringAdmin.close();

    failAdminLessonsOnce=true;
    const adminLessonRetry=await context.newPage();
    await ensureLocalPage(adminLessonRetry);
    adminLessonRetry.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    await adminLessonRetry.goto(base+"/admin");
    await adminLessonRetry.locator("#course-items [data-course='1']").waitFor();
    await adminLessonRetry.locator("#course-items [data-course='1']").click();
    await adminLessonRetry.locator("#retry-lessons").waitFor({state:"visible",timeout:8000});
    check((await adminLessonRetry.locator("#lesson-items [data-lesson]").count())===0,
      "failed admin lesson fetch contains no stale editorial lesson");
    await adminLessonRetry.locator("#retry-lessons").click();
    await adminLessonRetry.locator("#lesson-items [data-lesson='11']").waitFor({state:"visible",timeout:8000});
    check((await adminLessonRetry.locator("#retry-lessons").count())===0,
      "successful admin lesson retry clears error state");
    await adminLessonRetry.close();

    const admin=await context.newPage();
    await ensureLocalPage(admin);
    admin.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    await admin.goto(base+"/admin");
    const studentJourney=await context.newPage();
    await ensureLocalPage(studentJourney);
    await studentJourney.goto(base+"/student");
    await studentJourney.locator("#pillar-cards .path-card").first().waitFor();
    check(await studentJourney.locator("#pillar-cards .path-card").count()===3,
      "exactly three methodology pillars, even if not published");
    check(await studentJourney.locator("#pillar-cards [data-pillar-course='1']").count()===1,
      "only published authorized pillar is clickable");
    check(await studentJourney.locator("#pillar-cards button:disabled").count()===2,
      "unpublished pillar courses must stay disabled");
    await studentJourney.locator("#pillar-cards [data-pillar-course='1']").click();
    await studentJourney.locator("#lesson-items [data-lesson-id='11']").waitFor({state:"visible",timeout:8000});
    check(await studentJourney.locator("#lesson-items [data-lesson-id='11']").count()>0,
      "authorized pillar takes student to actual course");
    await studentJourney.close();
    await admin.locator("#course-items [data-course='1']").waitFor();
    await admin.locator("#course-items [data-course='1']").click();
    await admin.locator("#lesson-items [data-lesson='11']").waitFor();
    await admin.locator("#lesson-items [data-lesson='11']").click();
    await admin.locator("#preview-lesson").click();
    check(await admin.locator("#lesson-preview").isVisible(),"admin preview must open");
    check(await admin.locator("#preview-body h4").count()===1,"preview must show real sections");
    check((await admin.locator("#audit-items").innerText()).includes("lesson.created"),"staff audit visible");
    await admin.locator("#course-title").fill("Alteração local não salva");
    await admin.locator("#check-publication").click();
    check((await admin.locator("#status").innerText()).includes("Salve"),
      "editor cannot publish unsaved form changes");
    await admin.locator("#course-title").fill("Curso editorial fictício");
    await admin.locator("#check-publication").click();
    // Readiness is an asynchronous GET: wait for the server response.
    await admin.locator("#publication-readiness").waitFor({state:"visible",timeout:8000});
    check(await admin.locator("#publication-readiness").isVisible(),
      "manager sees real read-only readiness state");
    check((await admin.locator("#publication-readiness").innerText()).includes("1 aula"),
      "readiness shows lesson count without publishing");
    const originalLessonBody=await admin.locator("#lesson-body").inputValue();
    await admin.locator("#lesson-body").fill("Alteração fictícia ainda não salva");
    check(!(await admin.locator("#publication-readiness").isVisible()),
      "editing a lesson immediately invalidates the previous readiness review");
    await inspect(admin,"admin");
    const deniedDiscards=[];
    admin.on("dialog",async dialog=>{
      deniedDiscards.push(dialog.message());
      await dialog.dismiss();
    });
    const unsavedLessonText="Alteração fictícia ainda não salva";
    await admin.locator("#new-course").click();
    check((await admin.locator("#lesson-body").inputValue())===unsavedLessonText,
      "cancelled course navigation preserves unsaved lesson edits");
    await admin.locator("#clear-lesson").click();
    check((await admin.locator("#lesson-body").inputValue())===unsavedLessonText,
      "cancelled new-lesson navigation preserves unsaved lesson edits");
    check(deniedDiscards.length===2,
      "course and lesson navigation must each request one confirmation");
    check(deniedDiscards.every(text=>text.includes("alterações")),
      "both confirmation messages must clearly describe unsaved changes");
    const dirtyExit=await admin.evaluate(()=>{
      const event=new Event("beforeunload",{cancelable:true});
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });
    check(dirtyExit,"unsaved editorial fields must request browser-navigation confirmation");
    await admin.locator("#lesson-body").fill(originalLessonBody);
    const cleanExit=await admin.evaluate(()=>{
      const event=new Event("beforeunload",{cancelable:true});
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });
    check(!cleanExit,"clean editorial form must not block browser navigation");
    check(pageErrors.length===0,"uncaught JavaScript errors: "+pageErrors.join(";"));
    fs.writeFileSync(path.join(out,"summary.json"),JSON.stringify(results,null,2));
    console.log("PASS synthetic Chromium browser: "+results.assertions+" checks, student/admin UI, progress, revocation, draft preview, audit, widths 320/390/768/1440 and WCAG serious/critical scan.");
  }finally{await browser.close();}
})().catch(error=>{
  console.error("Synthetic browser failure: "+String(error.message).slice(0,240));
  process.exitCode=1;
}).finally(()=>server.close());
