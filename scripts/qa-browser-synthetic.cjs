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
const courses=()=>[{id:1,slug:"trilha-visitas-seja-encontrado",title:"Visitas, Leads e Clientes — Exemplo sintético",summary:"Aulas fictícias apenas para QA.",category:"metodologia",version_id:1,lessons_total:2,lessons_completed:completed?1:0,progress_percent:completed?50:0}];
const lessonRows=()=>[
 {id:11,slug:"visitas-ficticias",title:"Visitas fictícias",sort_order:0,completed:completed?1:0},
 {id:12,slug:"leads-ficticios",title:"Leads fictícios",sort_order:1,completed:0}
];
let completed=false,denyStudent=false,failInitializeOnce=false,failAdminCoursesOnce=false,invalidAdminCoursesOnce=false,failStudentLessonsOnce=false,failAdminLessonsOnce=false,invalidAdminLessonsOnce=false,failLessonDetailOnce=false,failLessonProgressOnce=false,denyLessonDetailOnce=false,completionFault="none",failReconcileProgressOnce=false,exportFault="none";
let requests=0,progressReads=0,completionPosts=0,exportReads=0;
let initializePosts=0,studentCatalogReads=0,studentLessonListReads=0,studentDetailReads=0;
const studentFaults={initialize:"none",courses:"none",lessons:"none",detail:"none",progress:"none"};
let heldStudentDetail=null,notifyHeldStudentDetail=null;
function takeStudentFault(endpoint){const fault=studentFaults[endpoint];studentFaults[endpoint]="none";return fault;}
function studentLesson(id){
  const row=lessonRows().find(lesson=>lesson.id===id);
  return {id:row.id,slug:row.slug,title:row.title,sort_order:row.sort_order,course_id:1,course_version:1,
    body:id===11?"Contexto da aula.\n\nEXEMPLO FICTÍCIO\nUm visitante fictício.\n\nAPLICAÇÃO OPCIONAL\nDesenhar a jornada.\n\nCUIDADO IMPORTANTE\nSem promessas de vendas.":"Todo interesse deve ser tratado com responsabilidade."};
}
let editorialCoursePosts=0,uncertainCourseWriteOnce=false,createdCourseInLab=false;
let lessonSearchReads=0,failLessonSearchOnce=false,denyLessonSearchOnce=false,malformedLessonSearchOnce=false,staleLessonSearchOnce=false;
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
    initializePosts++;
    const fault=takeStudentFault("initialize");
    if(fault==="missing")return send(res,200,{});
    if(fault==="string")return send(res,200,{ready:"true"});
    if(failInitializeOnce){failInitializeOnce=false;return send(res,503,{error:"temporarily_unavailable"});}
    return send(res,200,{ready:true});
  }
  if(p==="/universidade/private/courses"&&req.method==="GET"){
    studentCatalogReads++;
    const fault=takeStudentFault("courses"),rows=courses();
    if(fault==="missing")return send(res,200,{});
    if(fault==="null")return send(res,200,{courses:null});
    if(fault==="duplicate_id")rows.push({...rows[0],slug:"duplicate-course"});
    if(fault==="duplicate_slug")rows.push({...rows[0],id:2});
    if(fault==="missing_total")delete rows[0].lessons_total;
    if(fault==="empty")return send(res,200,{courses:[]});
    return send(res,200,{courses:rows});
  }
  // Existing journeys have no saved courses. C-116 mutation scenarios use
  // isolated per-page routes, never a write to this shared fixture.
  if(p==="/universidade/private/favorites"&&req.method==="GET"){
    return send(res,200,{course_ids:[]});
  }
  // Existing journeys use an empty synthetic position. C-121 mutations and
  // failures belong to isolated per-page routes in its dedicated module.
  if(p==="/universidade/private/reading-position"&&req.method==="GET"){
    return send(res,200,{schema_version:1,scope:"current_authenticated_student",
      status:"none",revision:"r1."+"a".repeat(64),position:null});
  }
  if(p==="/universidade/private/reading-position/export"&&req.method==="GET"){
    return send(res,200,{schema_version:1,scope:"current_authenticated_student",reading_position:null});
  }
  if(p==="/universidade/private/search"&&req.method==="POST"){
    lessonSearchReads++;
    if(denyLessonSearchOnce){denyLessonSearchOnce=false;return send(res,403,{error:"access_denied"});}
    if(failLessonSearchOnce){failLessonSearchOnce=false;return send(res,503,{error:"temporarily_unavailable"});}
    if(malformedLessonSearchOnce){malformedLessonSearchOnce=false;return send(res,200,{results:[{course_id:999,lesson_id:999,course_title:"Vazamento sintético",lesson_title:"Proibido",snippet:""}]});}
    if(staleLessonSearchOnce){staleLessonSearchOnce=false;return send(res,200,{results:[{course_id:1,lesson_id:99,course_title:"Exemplo sintético",lesson_title:"Aula retirada",snippet:"A versão atual não contém esta aula."}]});}
    return send(res,200,{results:[{course_id:1,course_title:"Visitas, Leads e Clientes — Exemplo sintético",
      lesson_id:12,lesson_title:"Leads fictícios",snippet:"Entenda a jornada do lead."}]});
  }

  if(p==="/universidade/private/courses/1/lessons"){
    studentLessonListReads++;
    const fault=takeStudentFault("lessons"),rows=lessonRows();
    if(fault==="missing")return send(res,200,{});
    if(fault==="duplicate_id")rows[1].id=rows[0].id;
    if(fault==="duplicate_slug")rows[1].slug=rows[0].slug;
    if(fault==="string_completed")rows[0].completed="false";
    if(fault==="missing_order")delete rows[0].sort_order;
    if(fault==="empty")return send(res,200,{lessons:[]});
    if(failStudentLessonsOnce){failStudentLessonsOnce=false;return send(res,503,{error:"temporarily_unavailable"});}
    return send(res,200,{lessons:rows});
  }
  if(p==="/universidade/private/lessons/11"&&req.method==="GET"){
    studentDetailReads++;
    const fault=takeStudentFault("detail"),lesson=studentLesson(11);
    if(fault==="wrong_id")lesson.id=12;
    if(fault==="wrong_course")lesson.course_id=2;
    if(fault==="missing_title")delete lesson.title;
    if(fault==="delayed_wrong_id"){heldStudentDetail=res;notifyHeldStudentDetail?.();return;}
    if(denyLessonDetailOnce){denyLessonDetailOnce=false;return send(res,403,{error:"access_denied"});}
    if(failLessonDetailOnce){failLessonDetailOnce=false;return send(res,503,{error:"temporarily_unavailable"});}
    return send(res,200,{lesson});
  }
  if(p==="/universidade/private/lessons/12"&&req.method==="GET"){
    studentDetailReads++;return send(res,200,{lesson:studentLesson(12)});
  }
  if(p==="/universidade/private/lessons/11/progress"){
    progressReads++;
    const fault=takeStudentFault("progress");
    if(fault==="missing")return send(res,200,{});
    if(fault==="string_false")return send(res,200,{completed:"false"});
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
  if(p==="/universidade/private/progress/export"){
    exportReads++;
    const fault=exportFault;exportFault="none";
    if(fault==="bad_schema")return send(res,200,{schema_version:2,scope:"current_authenticated_student",completions:[]});
    if(fault==="network_error")return send(res,503,{error:"temporarily_unavailable"});
    const payload={schema_version:1,scope:"current_authenticated_student",
      completions:completed?[{course_slug:"qa",lesson_slug:"visitantes",course_version:1,completed_at:"2026-11-15"}]:[]};
    if(fault==="extra"){
      payload.subject_key="private-subject-must-not-be-downloaded";
      payload.completions[0].email="private-email-must-not-be-downloaded";
    }
    return send(res,200,payload);
  }
  if(p==="/universidade/private/admin/overview"&&req.method==="GET"){
    const count=createdCourseInLab?2:1;
    return send(res,200,{schema_version:1,scope:"current_editorial_catalog",
      totals:{courses:count,published_courses:0,draft_courses:count,current_lessons:1,
        courses_without_lessons:count-1,courses_without_summary:0},
      categories:[{category:"metodologia",courses:count,published_courses:0,draft_courses:count,current_lessons:1},
        ...["negocios","sistemas"].map(category=>({category,courses:0,published_courses:0,draft_courses:0,current_lessons:0}))]});
  }
  if(p==="/universidade/private/admin/courses"){
    if(req.method==="POST"){
      editorialCoursePosts++;
      if(uncertainCourseWriteOnce){
        uncertainCourseWriteOnce=false;
        createdCourseInLab=true; // the fake server committed despite HTTP 503
        return send(res,503,{error:"commit_succeeded_but_response_lost"});
      }
      return send(res,201,{id:3}); // never used for the ambiguous-write scenario
    }
    if(failAdminCoursesOnce){failAdminCoursesOnce=false;return send(res,503,{error:"temporarily_unavailable"});}
    if(invalidAdminCoursesOnce){
      invalidAdminCoursesOnce=false;
      return send(res,200,{courses:[{id:1,slug:"curso-sintetico",
        title:"Curso editorial fictício",category:"metodologia",summary:"Rascunho",
        sort_order:0,is_published:false},{id:1,slug:"curso-duplicado",
        title:"Curso duplicado",category:"negocios",summary:null,
        sort_order:1,is_published:false}]});
    }
    const rows=[{id:1,slug:"curso-sintetico",title:"Curso editorial fictício",category:"metodologia",summary:"Rascunho exclusivo de QA",sort_order:0,is_published:false}];
    if(createdCourseInLab)rows.push({id:2,slug:"curso-resposta-perdida",
      title:"Rascunho após resposta perdida",category:"metodologia",
      summary:"Gravado somente na fixture sintética.",sort_order:1,is_published:false});
    return send(res,200,{courses:rows});
  }
  if(p==="/universidade/private/admin/courses/1/lessons"){
    if(failAdminLessonsOnce){failAdminLessonsOnce=false;return send(res,503,{error:"temporarily_unavailable"});}
    if(invalidAdminLessonsOnce){
      invalidAdminLessonsOnce=false;
      return send(res,200,{lessons:[{id:11,slug:"aula-ficticia",title:"Aula fictícia de revisão",
        body:"Texto sintético aprovado.",sort_order:0,status:"draft",is_published:false},
        {id:11,slug:"aula-duplicada",title:"Aula duplicada",
        body:"Texto sintético duplicado.",sort_order:1,status:"draft",is_published:false}]});
    }
    return send(res,200,{lessons:[{id:11,slug:"aula-ficticia",title:"Aula fictícia de revisão",body:"Texto fictício de revisão sem dados reais.\n\nEXEMPLO FICTÍCIO\nCaso demonstrativo.",sort_order:0,status:"draft",is_published:false}]});
  }
  if(p==="/universidade/private/admin/courses/1/publication-check")
    return send(res,200,{course_id:1,version:1,lesson_count:1,ready:true,issues:[],
      warnings:[],advisory_only:true,content_hash:"a".repeat(64)});
  if(p==="/universidade/private/admin/audit")return send(res,200,{events:audit,next_before_id:null});
  send(res,404,{error:"not_found"});
});
const results={screenshots:[],accessibility:[],assertions:0};
let lastCheck="browser startup";
function check(value,message){assert.ok(value,message);results.assertions++;lastCheck=message;}
async function ensureLocalPage(page){
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(20000);
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
  if(results.accessibility.at(-1).seriousOrCritical>0){
    console.error("Synthetic accessibility violations: "+JSON.stringify({page:name,violations:issues.filter(v=>v.impact==="serious"||v.impact==="critical")}));
  }
  check(results.accessibility.at(-1).seriousOrCritical===0,name+" has serious/critical axe violations.");
}
(async()=>{
  await new Promise((resolve,reject)=>server.once("error",reject).listen(port,host,resolve));
  const browser=await chromium.launch({headless:true,timeout:30000});
  const deadline=setTimeout(()=>{
    console.error("Synthetic browser deadline after last check: "+lastCheck);
    process.exitCode=1;
    const forcedExit=setTimeout(()=>process.exit(1),5000);forcedExit.unref();
    void browser.close().catch(()=>{}).finally(()=>{server.closeAllConnections();server.close();});
  },180000);deadline.unref();
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

    // C-110: HTTP 200 must carry a complete, typed response before the
    // library or a lesson becomes usable. Recovery is always deliberate.
    async function studentIntegrityPage(){
      const current=await context.newPage();
      await ensureLocalPage(current);
      current.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
      await current.goto(base+"/student");
      return current;
    }
    for(const [endpoint,fault] of [["initialize","missing"],["initialize","string"],
      ["courses","missing"],["courses","null"],["courses","duplicate_id"],
      ["courses","duplicate_slug"],["courses","missing_total"]]){
      studentFaults[endpoint]=fault;
      const beforeInit=initializePosts,beforeCatalog=studentCatalogReads,beforePost=completionPosts;
      const beforeExport=exportReads,beforeSearch=lessonSearchReads;
      const malformed=await studentIntegrityPage();
      await malformed.locator("#retry-library").waitFor({state:"visible",timeout:8000});
      check((await malformed.locator("#course-list [data-course-id]").count())===0,
        endpoint+" "+fault+" cannot render partial authorized courses");
      check(await malformed.locator("#course-search").isDisabled() &&
        await malformed.locator("#export-progress").isDisabled() &&
        await malformed.locator("#lesson-search-submit").isDisabled(),
        endpoint+" "+fault+" keeps catalogue-dependent controls disabled");
      const unavailable=await malformed.locator("#overall-progress").innerText();
      await malformed.evaluate(()=>{
        const input=document.getElementById("course-search");input.value="Leads";
        input.dispatchEvent(new Event("input",{bubbles:true}));
        document.querySelector('[data-filter="metodologia"]').dispatchEvent(new Event("click",{bubbles:true}));
        document.getElementById("export-progress").dispatchEvent(new Event("click",{bubbles:true}));
        document.getElementById("lesson-search-form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
      });
      check((await malformed.locator("#overall-progress").innerText())===unavailable &&
        await malformed.locator("#export-progress").isDisabled(),
        endpoint+" "+fault+" remains unavailable after filter/search events");
      check(initializePosts===beforeInit+1 && studentCatalogReads===beforeCatalog+(endpoint==="initialize"?0:1) &&
        completionPosts===beforePost && exportReads===beforeExport && lessonSearchReads===beforeSearch,
        endpoint+" "+fault+" does not retry or issue dependent reads/writes automatically");
      await malformed.locator("#retry-library").click();
      await malformed.locator("#course-list [data-course-id='1']").waitFor({state:"visible",timeout:8000});
      check(!(await malformed.locator("#course-search").isDisabled()) &&
        !(await malformed.locator("#library-recovery").isVisible()) && completionPosts===beforePost,
        endpoint+" "+fault+" recovers only after a new valid manual read");
      await malformed.close();
    }

    for(const fault of ["missing","duplicate_id","duplicate_slug","string_completed","missing_order"]){
      studentFaults.lessons=fault;
      const beforePost=completionPosts,beforeList=studentLessonListReads,beforeDetail=studentDetailReads;
      const malformed=await studentIntegrityPage();
      await malformed.locator("#course-list [data-course-id='1']").click();
      await malformed.locator("#lesson-content .lesson-retry").waitFor({state:"visible",timeout:8000});
      check((await malformed.locator("#lesson-items [data-lesson-id]").count())===0 &&
        (await malformed.locator("#lesson-content button.primary").count())===0,
        "malformed lesson list "+fault+" cannot render rows or completion");
      check(studentLessonListReads===beforeList+1 && studentDetailReads===beforeDetail && completionPosts===beforePost,
        "malformed lesson list "+fault+" cannot select, retry, or complete a lesson");
      await malformed.locator("#lesson-content .lesson-retry").click();
      await malformed.getByRole("heading",{name:"Visitas fictícias"}).waitFor({state:"visible",timeout:8000});
      check(!(await malformed.locator("#lesson-content button.primary").isDisabled()) && completionPosts===beforePost,
        "valid list recovery after "+fault+" restores the pending lesson without POST");
      await malformed.close();
    }

    for(const [endpoint,fault] of [["detail","wrong_id"],["detail","wrong_course"],["detail","missing_title"],
      ["progress","missing"],["progress","string_false"]]){
      studentFaults[endpoint]=fault;
      const beforePost=completionPosts;
      const malformed=await studentIntegrityPage();
      await malformed.locator("#course-list [data-course-id='1']").click();
      await malformed.locator("#lesson-content .lesson-detail-retry").waitFor({state:"visible",timeout:8000});
      check((await malformed.locator("#lesson-content h3").count())===0 &&
        (await malformed.locator("#lesson-content button.primary").count())===0,
        endpoint+" "+fault+" never displays a partial or mismatched lesson");
      check((await malformed.locator("#lesson-items [data-lesson-id='11']").getAttribute("data-completed"))==="0" &&
        completionPosts===beforePost,
        endpoint+" "+fault+" neither fabricates completion nor sends a POST");
      await malformed.locator("#lesson-content .lesson-detail-retry").click();
      await malformed.getByRole("heading",{name:"Visitas fictícias"}).waitFor({state:"visible",timeout:8000});
      check(!(await malformed.locator("#lesson-content button.primary").isDisabled()) && completionPosts===beforePost,
        endpoint+" "+fault+" accepts a valid manual recovery without a write");
      await malformed.close();
    }

    studentFaults.courses="empty";
    const emptyLibrary=await studentIntegrityPage();
    await emptyLibrary.waitForFunction(()=>document.getElementById("overall-progress").textContent.includes("Nenhuma aula publicada"));
    check(!(await emptyLibrary.locator("#library-recovery").isVisible()) &&
      !(await emptyLibrary.locator("#course-search").isDisabled()),
      "valid empty catalogue stays a legitimate empty state");
    await emptyLibrary.close();
    studentFaults.lessons="empty";
    const emptyLessons=await studentIntegrityPage();
    const beforeEmptyPost=completionPosts;
    await emptyLessons.locator("#course-list [data-course-id='1']").click();
    await emptyLessons.waitForFunction(()=>document.getElementById("lesson-content").textContent.includes("Ainda não existem aulas publicadas"));
    check((await emptyLessons.locator("#lesson-content .lesson-retry").count())===0 &&
      (await emptyLessons.locator("#lesson-content button.primary").count())===0 && completionPosts===beforeEmptyPost,
      "valid empty lesson list shows no error or completion action");
    await emptyLessons.close();

    studentFaults.detail="delayed_wrong_id";
    const heldDetail=new Promise(resolve=>{notifyHeldStudentDetail=resolve;});
    const delayed=await studentIntegrityPage();
    const beforeDelayedPost=completionPosts;
    await delayed.locator("#course-list [data-course-id='1']").click();
    await heldDetail;notifyHeldStudentDetail=null;
    await delayed.locator("#lesson-items [data-lesson-id='12']").click();
    await delayed.getByRole("heading",{name:"Leads fictícios"}).waitFor({state:"visible",timeout:8000});
    const oldResponse=delayed.waitForResponse(response=>response.url()===base+"/universidade/private/lessons/11");
    send(heldStudentDetail,200,{lesson:{...studentLesson(11),id:99}});heldStudentDetail=null;
    await oldResponse;await delayed.waitForLoadState("networkidle");
    check((await delayed.locator("#lesson-content h3").innerText())==="Leads fictícios" &&
      (await delayed.locator("#lesson-content .lesson-detail-retry").count())===0,
      "late malformed detail cannot replace the newly selected lesson or create stale recovery");
    check(completionPosts===beforeDelayedPost,"late malformed detail cannot issue a completion POST");
    await delayed.close();

    const refreshFailure=await studentIntegrityPage();
    await refreshFailure.locator("#course-list [data-course-id='1']").click();
    await refreshFailure.locator("#lesson-content button.primary").waitFor({state:"visible",timeout:8000});
    studentFaults.courses="null";
    const beforeRefreshPost=completionPosts;
    await refreshFailure.locator("#lesson-content button.primary").click();
    await refreshFailure.waitForFunction(()=>document.getElementById("status").textContent.includes("Aula concluída. Atualize"));
    check(await refreshFailure.locator("#lesson-content button.primary").isDisabled() &&
      (await refreshFailure.locator("#lesson-content button.primary").innerText()).includes("concluída"),
      "invalid catalogue refresh cannot reverse confirmed lesson completion");
    check((await refreshFailure.locator("#course-list [data-course-id]").count())===1 && completionPosts===beforeRefreshPost+1,
      "invalid refresh retains known catalogue and never repeats the confirmed POST");
    await refreshFailure.close();completed=false;

    await require("./qa-browser-student-help.cjs")({browser,base,ensureLocalPage,check,pageErrors});
    await require("./qa-browser-student-favorites.cjs")({browser,base,ensureLocalPage,check,pageErrors});
    await require("./qa-browser-student-favorites-export.cjs")({browser,base,ensureLocalPage,check,pageErrors});
    await require("./qa-browser-retained-favorites.cjs")({browser,base,ensureLocalPage,check,pageErrors});
    await require("./qa-browser-student-reading-position.cjs")({browser,base,ensureLocalPage,check,pageErrors});

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
    // Private full-lesson search: actual browser POST and direct result navigation.
    const sbox=page.locator("#lesson-search-query"),sgo=page.locator("#lesson-search-submit");
    check(!(await sbox.isDisabled()),"authorized course load enables private lesson search");
    await sbox.fill("Leads");
    const searchBefore=lessonSearchReads;
    await sgo.click();
    await page.locator("#lesson-search-results [data-search-lesson='12']").waitFor({state:"visible",timeout:8000});
    check(lessonSearchReads===searchBefore+1,"private lesson search uses exactly one POST");
    check((await page.locator("#lesson-search-results").innerText()).includes("Leads fictícios"),
      "published lesson search result appears without HTML injection");
    await page.locator("#lesson-search-results [data-search-lesson='12']").click();
    await page.getByRole("heading",{name:"Leads fictícios"}).waitFor({state:"visible",timeout:8000});
    check((await page.locator("#lesson-content h3").innerText())==="Leads fictícios",
      "search result opens its exact authorized lesson, not arbitrary next lesson");

    // C-109: a transient list failure must not lose the search target.
    failStudentLessonsOnce=true;
    await page.locator("#lesson-search-results [data-search-lesson='12']").click();
    await page.locator("#lesson-content .lesson-retry").waitFor({state:"visible",timeout:8000});
    check((await page.locator("#lesson-content h3").count())===0,
      "failed search-target navigation does not retain an old lesson");
    await page.locator("#lesson-content .lesson-retry").click();
    await page.locator("#lesson-content h3").waitFor({state:"visible",timeout:8000});
    check((await page.locator("#lesson-content h3").innerText())==="Leads fictícios",
      "retry after search-target list failure opens the selected lesson, not the first pending lesson");

    failLessonSearchOnce=true;
    await sbox.fill("visitas");
    await sgo.click();
    await page.waitForFunction(()=>document.querySelector("#lesson-search-results").textContent.includes("indisponível"));
    check((await page.locator("#lesson-search-results [data-search-lesson]").count())===0,
      "temporary search failure wipes stale results");

    malformedLessonSearchOnce=true;
    await sbox.fill("leads");
    await sgo.click();
    await page.waitForFunction(()=>document.querySelector("#lesson-search-results").textContent.includes("indisponível"));
    check((await page.locator("#lesson-search-results [data-search-lesson]").count())===0,
      "unknown course from 200 response never creates a forged result");

    staleLessonSearchOnce=true;
    await sbox.fill("clientes");
    await sgo.click();
    await page.locator("#lesson-search-results [data-search-lesson='99']").waitFor({state:"visible",timeout:8000});
    await page.locator("#lesson-search-results [data-search-lesson='99']").click();
    await page.waitForFunction(()=>document.querySelector("#lesson-content").textContent.includes("não está mais disponível"));
    check((await page.locator("#lesson-content h3").count())===0,
      "stale result must not open an unrelated authorized lesson");

    // The exact target remains mandatory when it vanished during a retry.
    failStudentLessonsOnce=true;
    await page.locator("#lesson-search-results [data-search-lesson='99']").click();
    await page.locator("#lesson-content .lesson-retry").waitFor({state:"visible",timeout:8000});
    await page.locator("#lesson-content .lesson-retry").click();
    await page.waitForFunction(()=>document.querySelector("#lesson-content").textContent.includes("não está mais disponível"));
    check((await page.locator("#lesson-content h3").count())===0,
      "retry for a removed search target must not open another lesson");
    check((await page.locator("#lesson-content button.primary").count())===0,
      "retry for a removed search target must not offer completion for another lesson");

    const beforeBadQuery=lessonSearchReads;
    await sbox.fill("%");
    await page.locator("#lesson-search-form").evaluate(form=>{
      form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
    });
    await page.waitForFunction(()=>document.querySelector("#lesson-search-results").textContent.includes("3 a 60"));
    check(lessonSearchReads===beforeBadQuery,"SQL wildcard-like query rejected before network access");

    await page.locator("#course-list [data-course-id='1']").click();
    await page.waitForFunction(()=>document.querySelector("#lesson-content h3")!==null);
    check(await page.getByRole("heading",{name:"Visitas fictícias"}).count()===1,"lesson must load");
    await page.locator("#lesson-content button.primary").click();
    await page.waitForFunction(()=>document.querySelector("#overall-progress").textContent.includes("1 de 2"));
    check(await page.getByText("✓ Aula concluída",{exact:true}).count()>=1,"student completion persisted in synthetic API");
    check(await page.getByRole("heading",{name:"EXEMPLO FICTÍCIO"}).count()===1,"lesson sections rendered");

    // A compromised/upgraded backend may accidentally return subject or
    // tenant metadata. The export file must NEVER serialize those extras.
    exportFault="extra";
    const exportBefore=exportReads;
    const downloads=[];
    page.on("download",d=>downloads.push(d));
    await page.evaluate(()=>{
      const button=document.getElementById("export-progress");
      button.click();button.click();
    });
    await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("Arquivo de progresso preparado"));
    check(exportReads===exportBefore+1,"double-click exports use exactly one private API read");
    await page.waitForTimeout(250);
    check(downloads.length===1,"double-click causes exactly one file download");
    check(downloads[0].suggestedFilename()==="imagine-universidade-progresso.json",
      "student export keeps fixed and predictable file name");
    const exported=JSON.parse(fs.readFileSync(await downloads[0].path(),"utf8"));
    check(JSON.stringify(exported)==JSON.stringify({
      schema_version:1,scope:"current_authenticated_student",
      completions:[{course_slug:"qa",course_version:1,lesson_slug:"visitantes",completed_at:"2026-11-15"}],
    }),"download contains only allowlisted fields and current student data");
    check(!JSON.stringify(exported).includes("private-"),"export strips simulated confidential fields");

    exportFault="bad_schema";
    const fileCount=downloads.length;
    await page.locator("#export-progress").click();
    await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("validação de privacidade"));
    check(downloads.length===fileCount,"malformed schema must never create a download");
    check(!(await page.locator("#export-progress").isDisabled()),
      "invalid schema error still allows a later deliberate retry");

    exportFault="network_error";
    await page.locator("#export-progress").click();
    await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("Não foi possível concluir esta operação"));
    check(downloads.length===fileCount,"HTTP 503 may not expose stale exported data");

    await inspect(page,"student");
    // Use a separate authorized page for search revocation, so existing
    // export-revocation tests can independently provoke their own HTTP 403.
    const deniedSearch=await context.newPage();
    await ensureLocalPage(deniedSearch);
    deniedSearch.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    await deniedSearch.goto(base+"/student");
    await deniedSearch.locator("#lesson-search-query").waitFor({state:"visible",timeout:8000});
    await deniedSearch.waitForFunction(()=>!document.querySelector("#lesson-search-query").disabled);
    denyLessonSearchOnce=true;
    await deniedSearch.locator("#lesson-search-query").fill("clientes");
    await deniedSearch.locator("#lesson-search-submit").click();
    await deniedSearch.waitForFunction(()=>document.querySelector("#overall-progress").textContent.includes("Acesso à Universidade encerrado"));
    check(await deniedSearch.locator("#lesson-search-query").isDisabled(),
      "rejected search locks input after Portal 403");
    check((await deniedSearch.locator("#lesson-search-results [data-search-lesson]").count())===0,
      "rejected search never preserves prior result buttons");
    check(await deniedSearch.locator("#lesson-search-submit").isDisabled(),
      "search submit forbidden after revocation");
    await deniedSearch.close();

    denyStudent=true;
    await page.locator("#export-progress").click();
    await page.waitForFunction(()=>document.querySelector("#resume-course").disabled && document.querySelector("#export-progress").disabled);
    check((await page.locator("#lesson-content").innerText()).includes("Volte ao Portal"),"revoke must purge lesson");
    check(await page.locator("#sim-visits").isDisabled(),"revoked student cannot use simulator");
    check(!(await page.locator("#library-recovery").isVisible()),"revoked access cannot offer retry");
    check(!(await page.locator("#sim-results").isVisible()),"simulator response purged after revocation");
    check(await page.getByText("Visitas fictícias",{exact:true}).count()===0,"private lesson title must be removed");
    denyStudent=false;

    invalidAdminCoursesOnce=true;
    const malformedAdmin=await context.newPage();
    await ensureLocalPage(malformedAdmin);
    malformedAdmin.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    await malformedAdmin.goto(base+"/admin");
    await malformedAdmin.locator("#retry-catalog").waitFor({state:"visible",timeout:8000});
    check((await malformedAdmin.locator("#course-items [data-course]").count())===0,
      "duplicate-ID catalogue response must never render an editable item");
    check(await malformedAdmin.locator("#new-course").isDisabled(),
      "malformed HTTP 200 catalogue must not allow new editorial writes");
    check(await malformedAdmin.locator("#course-save").isDisabled(),
      "malformed HTTP 200 catalogue must not allow saving drafts");
    check((await malformedAdmin.locator("#course-items").innerText()).includes("temporariamente indisponíveis"),
      "malformed 200 must be shown as failure, never an empty catalogue");
    await malformedAdmin.locator("#retry-catalog").click();
    await malformedAdmin.locator("#course-items [data-course='1']").waitFor({state:"visible",timeout:8000});
    check(!(await malformedAdmin.locator("#new-course").isDisabled()),
      "subsequent valid catalogue response can restore editorial editing");
    await malformedAdmin.close();

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

    invalidAdminLessonsOnce=true;
    const malformedLessons=await context.newPage();
    await ensureLocalPage(malformedLessons);
    malformedLessons.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    await malformedLessons.goto(base+"/admin");
    await malformedLessons.locator("#course-items [data-course='1']").waitFor();
    await malformedLessons.locator("#course-items [data-course='1']").click();
    await malformedLessons.locator("#retry-lessons").waitFor({state:"visible",timeout:8000});
    check((await malformedLessons.locator("#lesson-items [data-lesson]").count())===0,
      "malformed HTTP 200 lesson list must not render an editable lesson");
    check(await malformedLessons.locator("#course-save").isDisabled(),
      "malformed lesson list must block course edits");
    check(await malformedLessons.locator("#publish").isDisabled(),
      "malformed lesson list must block publication");
    check(await malformedLessons.locator("#lesson-save").isDisabled(),
      "malformed lesson list must block lesson creation");
    await malformedLessons.locator("#retry-lessons").click();
    await malformedLessons.locator("#lesson-items [data-lesson='11']").waitFor({state:"visible",timeout:8000});
    check(!(await malformedLessons.locator("#course-save").isDisabled()),
      "verified lesson list restores editor after an invalid response");
    await malformedLessons.close();

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

    // A POST may commit server-side then return a 503. The frontend
    // must not replay it; allow a deliberate GET reconciliation only.
    uncertainCourseWriteOnce=true;
    const uncertainAdmin=await context.newPage();
    await ensureLocalPage(uncertainAdmin);
    uncertainAdmin.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
    await uncertainAdmin.goto(base+"/admin");
    await uncertainAdmin.locator("#new-course").waitFor({state:"visible",timeout:8000});
    await uncertainAdmin.locator("#course-title").fill("Rascunho após resposta perdida");
    await uncertainAdmin.locator("#course-slug").fill("curso-resposta-perdida");
    const beforeEditorialPosts=editorialCoursePosts;
    await uncertainAdmin.locator("#course-save").click();
    await uncertainAdmin.waitForFunction(()=>document.querySelector("#status").textContent.includes("Não repita a operação"));
    check(editorialCoursePosts===beforeEditorialPosts+1,
      "lost editorial POST response must never trigger a second automatic write");
    check(await uncertainAdmin.locator("#course-save").isDisabled(),
      "ambiguous course creation must disable subsequent saves");
    check(await uncertainAdmin.locator("#new-course").isDisabled(),
      "ambiguous editorial write blocks new course creation");
    check(await uncertainAdmin.locator("#retry-catalog").isVisible(),
      "ambiguous write offers a human-initiated verification of server state");
    check((await uncertainAdmin.locator("#course-title").inputValue())==="Rascunho após resposta perdida",
      "ambiguous write preserves the editor's draft until human reconciliation");

    let acceptReconciliation=false,confirmationCount=0;
    uncertainAdmin.on("dialog",async dialog=>{
      confirmationCount++;
      if(acceptReconciliation)await dialog.accept();else await dialog.dismiss();
    });
    await uncertainAdmin.locator("#retry-catalog").click();
    check(confirmationCount===1,"refresh after ambiguous mutation requires a discard warning");
    check(await uncertainAdmin.locator("#course-save").isDisabled(),
      "cancelled verification must keep uncertain writes frozen");
    check(editorialCoursePosts===beforeEditorialPosts+1,
      "cancelled verification must never resubmit POST");
    acceptReconciliation=true;
    await uncertainAdmin.locator("#retry-catalog").click();
    await uncertainAdmin.locator("#course-items [data-course='2']").waitFor({state:"visible",timeout:8000});
    check(confirmationCount===2,"reconciliation requires explicit approval");
    check(!(await uncertainAdmin.locator("#new-course").isDisabled()),
      "fresh authorized GET unfreezes course creation");
    check(editorialCoursePosts===beforeEditorialPosts+1,
      "server-side committed course is observed via GET, not replay");
    await uncertainAdmin.close();
    createdCourseInLab=false;

    await require("./qa-browser-editor-drafts.cjs")({browser,base,ensureLocalPage,check,pageErrors});
    await require("./qa-browser-contextual-courses.cjs")({browser,base,ensureLocalPage,check,pageErrors});
    await require("./qa-browser-progress-history.cjs")({browser,base,ensureLocalPage,check,pageErrors});
    await require("./qa-browser-student-navigation-focus.cjs")({browser,base,ensureLocalPage,check,pageErrors});
    await require("./qa-browser-lesson-sections.cjs")({browser,base,ensureLocalPage,check,pageErrors});
    await require("./qa-browser-student-catalog-reconciliation.cjs")({browser,base,ensureLocalPage,check,pageErrors});
    await require("./qa-browser-student-lesson-filter.cjs")({browser,base,ensureLocalPage,check,pageErrors});
    await require("./qa-browser-editorial-overview.cjs")({browser,base,ensureLocalPage,check,pageErrors});
    await require("./qa-browser-editorial-version-history.cjs")({browser,base,ensureLocalPage,check,pageErrors});
    await require("./qa-browser-editorial-catalog-filters.cjs")({browser,base,ensureLocalPage,check,pageErrors});
    await require("./qa-browser-lesson-reorder.cjs")({browser,base,ensureLocalPage,check,pageErrors});
    await require("./qa-browser-editorial-lesson-filters.cjs")({browser,base,ensureLocalPage,check,pageErrors});
    await require("./qa-browser-lesson-order-patch.cjs")({browser,base,ensureLocalPage,check,pageErrors});

    // C-111: the real publication handler must reject incomplete HTTP 200
    // diagnostics before confirmation or mutation. These per-page routes
    // stay on the synthetic loopback origin and never reach a live service.
    const publicationContext=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
    const publicationFaults=[
      ["textual readiness",payload=>{payload.ready="false";}],
      ["missing hash",payload=>{delete payload.content_hash;}],
      ["different course",payload=>{payload.course_id=2;}]
    ];
    for(const [fault,alter] of publicationFaults){
      const publicationPage=await publicationContext.newPage();
      await ensureLocalPage(publicationPage);
      publicationPage.on("pageerror",error=>pageErrors.push(String(error.message).slice(0,150)));
      const validDiagnostic=()=>({course_id:1,version:1,lesson_count:1,ready:true,
        issues:[],warnings:[],advisory_only:true,content_hash:"b".repeat(64)});
      let diagnostic=validDiagnostic(),dialogs=0,acceptPublication=false;
      const publicationWrites=[];
      publicationPage.on("dialog",async dialog=>{
        dialogs++;
        if(acceptPublication)await dialog.accept();else await dialog.dismiss();
      });
      publicationPage.on("request",request=>{
        if(request.method()!=="GET"&&request.url().startsWith(base+"/universidade/private/admin/")){
          publicationWrites.push({url:request.url(),method:request.method(),body:request.postDataJSON()});
        }
      });
      await publicationPage.route(base+"/universidade/private/admin/courses/1/publication-check",
        route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(diagnostic)}));
      await publicationPage.route(base+"/universidade/private/admin/courses/1/publish",
        route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({published:true})}));
      await publicationPage.goto(base+"/admin");
      await publicationPage.locator("#course-items [data-course='1']").click();
      await publicationPage.locator("#lesson-items [data-lesson='11']").click();
      const draftFields=["course-title","course-summary","lesson-title","lesson-body"];
      const readDrafts=()=>publicationPage.evaluate(ids=>ids.map(id=>document.getElementById(id).value),draftFields);
      const originalDrafts=await readDrafts();
      await publicationPage.locator("#check-publication").click();
      await publicationPage.locator("#publication-readiness").waitFor({state:"visible",timeout:8000});
      alter(diagnostic);
      await publicationPage.locator("#publish").click();
      await publicationPage.waitForFunction(()=>document.getElementById("status").textContent.includes("validar a conferência"));
      check(dialogs===0&&publicationWrites.length===0,
        "publication "+fault+" must not open a confirmation or send any write");
      check(!(await publicationPage.locator("#publication-readiness").isVisible())&&
        (await publicationPage.locator("#publication-readiness").innerText())==="",
        "publication "+fault+" clears the previous readiness diagnostic");
      check(JSON.stringify(await readDrafts())===JSON.stringify(originalDrafts),
        "publication "+fault+" preserves all course and lesson fields");
      diagnostic=validDiagnostic();
      await publicationPage.locator("#check-publication").click();
      await publicationPage.locator("#publication-readiness").waitFor({state:"visible",timeout:8000});
      check(dialogs===0&&publicationWrites.length===0&&
        (await publicationPage.locator("#publication-readiness").innerText()).includes("1 aula"),
        "publication "+fault+" recovers through a new valid read without publishing");
      if(fault==="different course"){
        await Promise.all([publicationPage.waitForEvent("dialog"),publicationPage.locator("#publish").click()]);
        check(dialogs===1&&publicationWrites.length===0,
          "cancelling a valid publication confirmation must not send a POST");
        acceptPublication=true;
        await publicationPage.locator("#publish").click();
        await publicationPage.waitForFunction(()=>document.getElementById("status").textContent.includes("Versão do curso publicada"));
        check(dialogs===2&&publicationWrites.length===1&&publicationWrites[0].method==="POST"&&
          publicationWrites[0].url===base+"/universidade/private/admin/courses/1/publish"&&
          JSON.stringify(publicationWrites[0].body)===JSON.stringify({expected_content_hash:diagnostic.content_hash}),
          "accepted synthetic publication sends exactly one POST containing the reviewed hash");
      }
      await publicationPage.close();
    }
    await publicationContext.close();

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
  }finally{await browser.close();clearTimeout(deadline);}
})().catch(error=>{
  console.error("Synthetic browser last completed check: "+lastCheck);
  console.error("Synthetic browser failure: "+String(error.message).slice(0,240));
  process.exitCode=1;
}).finally(()=>server.close());
