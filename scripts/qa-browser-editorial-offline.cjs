"use strict";
/**
 * Real Chromium interactions with the generated offline editorial review UI.
 * No public endpoint, authentication or external network allowed.
 */
const fs=require("node:fs");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const {pathToFileURL}=require("node:url");
const AxeBuilder=require("@axe-core/playwright").default;

module.exports=async function({browser,out,check}){
  const repo=path.resolve(__dirname,"..");
  const dir=fs.mkdtempSync(path.join(out,"editorial-offline-"));
  const cmd=spawnSync(process.execPath,[
    path.join(repo,"scripts/build-editorial-review-pack.mjs"),
    "--out",dir
  ],{cwd:repo,encoding:"utf8",timeout:20000});
  check(cmd.status===0,"C158 editorial pack built for actual offline Chromium QA: "+(cmd.stderr||cmd.stdout));
  const browserContext=await browser.newContext({viewport:{width:390,height:800},acceptDownloads:true,reducedMotion:"reduce"});
  const page=await browserContext.newPage();
  let network=0;
  const errors=[];
  page.on("request",req=>{if(/^https?:/u.test(req.url()))network++;});
  page.on("pageerror",error=>errors.push(String(error.message).slice(0,160)));
  page.on("console",msg=>{if(msg.type()==="error")errors.push(msg.text().slice(0,160));});
  try{
    const url=pathToFileURL(path.join(dir,"revisao-navegavel.html")).href;
    await page.goto(url,{waitUntil:"load",timeout:20000});
    await page.locator("#title").waitFor({state:"visible",timeout:10000});
    check(await page.locator("#courses .course-item").count()===10,
      "C158 offline reviewer navigates all ten real curriculum courses");
    check((await page.locator("#summary").innerText()).includes("35 pendentes"),
      "C158 35 lessons remain unapproved on first load");
    check((await page.locator("#body").innerText()).includes("EXEMPLO FICTÍCIO"),
      "C158 full real draft lesson shown, no public API");
    check((await page.locator("#title").innerText()).includes("Visitas:"),
      "C158 selected first lesson matches the source");
    // Scan the actual generated file:// review page, not a mocked DOM.
    const axe=await new AxeBuilder({page})
      .withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
    const major=axe.violations.filter(v=>v.impact==="serious"||v.impact==="critical");
    fs.writeFileSync(path.join(out,"editorial-review-offline-axe.json"),JSON.stringify({
      violations:axe.violations.map(v=>({
        id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)
      }))
    },null,2));
    check(major.length===0,"C164 offline editor has no serious/critical WCAG 2.1 A/AA failures: "+
      major.map(v=>v.id+":"+v.nodes.map(n=>n.target.join(",")).join("|")).join(";"));
    for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:800});
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
      check(!overflow,"C164 offline reviewer fits viewport "+width+"px without overflow");
    }
    await page.setViewportSize({width:390,height:800});
    await page.locator("#next").click();
    check((await page.locator("#title").innerText()).includes("Leads:"),
      "C158 next lesson is usable without server");
    await page.locator("#previous").click();
    await page.locator("#next").focus();
    await page.keyboard.press("Enter");
    check((await page.locator("#title").innerText()).includes("Leads:"),
      "C164 keyboard Enter navigates to next lesson");
    await page.locator("#previous").focus();
    await page.keyboard.press("Enter");
    check((await page.locator("#title").innerText()).includes("Visitas:"),
      "C164 keyboard Enter returns to first lesson");

    await page.locator("#status").selectOption("NEEDS_CHANGES");
    await page.locator("#reviewer").fill("Equipe Editorial QA");
    await page.locator("#evidence").fill("https://github.com/rafhael100/imagine-universidade/issues/12");
    await page.locator("#notes").fill("Revisar métricas e clareza do exemplo fictício.");
    await page.locator("#next").click();
    await page.locator("#previous").click();
    check(await page.locator("#status").inputValue()==="NEEDS_CHANGES" &&
      (await page.locator("#notes").inputValue()).includes("Revisar métricas"),
      "C158 navigation preserves a local unfinished human review");
    check((await page.locator("#summary").innerText()).includes("1 pedem ajustes"),
      "C158 UI labels the review as needs changes, not approved");
    await page.locator("#review-filter").selectOption("NEEDS_CHANGES");
    check(await page.locator("#review-results .review-result").count()===1,
      "C163 status filter returns only the lesson marked for adjustments");
    check((await page.locator("#review-search-count").innerText()).includes("1 aulas"),
      "C163 status filter has explicit live result count");
    await page.locator("#review-search").fill("VISITAS");
    check(await page.locator("#review-results .review-result").count()===1,
      "C163 case-insensitive search respects current review status");
    await page.locator("#review-search").fill("inexistente");
    check(await page.locator("#review-results .review-result").count()===0,
      "C163 missing terms produce no invented matches");
    await page.locator("#review-search").fill("");
    await page.locator("#review-filter").selectOption("ALL");
    check(await page.locator("#review-results").isHidden(),
      "C163 empty search and all-status filter do not clutter the editor");

    check((await page.locator("#courses .course-item").first().innerText()).includes("3 pendentes / 4"),
      "C160 first course shows accurate unfinished lesson count");
    await page.locator("#next-pending").click();
    check((await page.locator("#title").innerText()).includes("Leads:"),
      "C160 next pending skips a lesson already marked for adjustments");
    await page.locator("#next-adjustment").click();
    check((await page.locator("#title").innerText()).includes("Visitas:"),
      "C160 next adjustment wraps to the currently changed lesson");


    const [summaryDownload]=await Promise.all([
      page.waitForEvent("download",{timeout:10000}),
      page.locator("#export-summary").click()
    ]);
    const summaryPath=path.join(dir,"resumo-revisao.txt");
    await summaryDownload.saveAs(summaryPath);
    const summary=fs.readFileSync(summaryPath,"utf8");
    check(summaryDownload.suggestedFilename()==="resumo-revisao.txt" &&
      summary.includes("HOLD_NO_GO")&&summary.includes("não autenticado")&&
      summary.includes("NÃO É APROVAÇÃO NEM PUBLICAÇÃO"),
      "C165 local handoff exports plain-text review without claiming release");
    check(summary.includes("Pendentes: 34")&&summary.includes("Precisam ajustes: 1"),
      "C165 summary includes exact 35-lesson counters");
    check(summary.includes("Revisar métricas e clareza")&&summary.includes("SHA-256"),
      "C165 summary retains review notes and exact lesson provenance");
    check(await page.evaluate(()=>{
      const e=new Event("beforeunload",{cancelable:true});
      dispatchEvent(e);return e.defaultPrevented;
    }),"C165 exporting summary does not mark editable CSV as safely saved");

    const [download]=await Promise.all([
      page.waitForEvent("download",{timeout:10000}),
      page.locator("#export").click()
    ]);
    const csvPath=path.join(dir,"exported-review.csv");
    await download.saveAs(csvPath);
    check(download.suggestedFilename()==="revisao.csv",
      "C158 offline reviewer offers the canonical 35-lesson CSV filename");
    const csv=fs.readFileSync(csvPath,"utf8");
    check(csv.includes("NEEDS_CHANGES")&&csv.includes("Equipe Editorial QA")&&
      csv.includes("PENDING_HUMAN_REVIEW"),
      "C158 CSV contains reviewed row and pending other rows");
    const validated=spawnSync(process.execPath,[
      path.join(repo,"scripts/validate-editorial-review.mjs"),"--csv",csvPath
    ],{cwd:repo,encoding:"utf8",timeout:20000});
    check(validated.status===0,"C158 exported CSV accepted by exact current validator");
    const receipt=JSON.parse(validated.stdout);
    check(receipt.pending===34&&receipt.needs_changes===1&&
      receipt.claimed_human_approved===0&&receipt.publishable===false&&
      receipt.review_evidence_authenticated===false,
      "C158 no local review state ever claims authenticated release");

    // Reopen an exported review on a different offline page, using only the
    // browser's File API. No server or reviewer approval is involved.
    const importedPage=await browserContext.newPage();
    importedPage.on("pageerror",error=>errors.push(String(error.message).slice(0,160)));
    await importedPage.goto(url,{waitUntil:"load"});
    await importedPage.locator("#import").setInputFiles(csvPath);
    await importedPage.waitForFunction(
      ()=>document.getElementById("message").textContent.includes("CSV carregado"),
      null,{timeout:10000}
    );
    check(await importedPage.locator("#status").inputValue()==="NEEDS_CHANGES" &&
      (await importedPage.locator("#notes").inputValue()).includes("Revisar métricas"),
      "C159 previous CSV is reloaded into the same 35-lesson draft UI");
    check((await importedPage.locator("#summary").innerText()).includes("1 pedem ajustes"),
      "C159 import preserves review counters, never human signoff");

    const invalidCsvPath=path.join(dir,"tampered-review.csv");
    const firstHash=csv.match(/[a-f0-9]{64}/u)?.[0];
    check(Boolean(firstHash),"C159 exported review contains a lesson content checksum");
    fs.writeFileSync(invalidCsvPath,csv.replace(firstHash,"0".repeat(64)),"utf8");
    importedPage.once("dialog",dialog=>dialog.accept());
    await importedPage.locator("#import").setInputFiles(invalidCsvPath);
    await importedPage.waitForFunction(
      ()=>document.getElementById("message").textContent.includes("Importação recusada"),
      null,{timeout:10000}
    );
    check((await importedPage.locator("#message").innerText()).includes("Hash desatualizado"),
      "C159 stale altered lesson checksum cannot be imported");
    check(await importedPage.locator("#status").inputValue()==="NEEDS_CHANGES" &&
      (await importedPage.locator("#notes").inputValue()).includes("Revisar métricas"),
      "C159 failed import leaves the previously reviewed data intact");
    check(await importedPage.locator("#import-mode").inputValue()==="merge",
      "C167 merging another person's CSV is the conservative default");
    const originalCsv=fs.readFileSync(path.join(dir,"revisao.csv"),"utf8");
    const second=originalCsv.trimEnd().split("\n");
    const pendingTail='"PENDING_HUMAN_REVIEW","","",""';
    check(second[2].includes(pendingTail),"C167 second lesson is pending in the original package");
    second[2]=second[2].replace(pendingTail,
      '"NEEDS_CHANGES","Equipe de QA","https://github.com/rafhael100/imagine-universidade/issues/12","Revisar segunda aula"');
    const peerPath=path.join(dir,"revisao-outra-pessoa.csv");
    fs.writeFileSync(peerPath,second.join("\n")+"\n","utf8");
    await importedPage.locator("#import").setInputFiles(peerPath);
    await importedPage.waitForFunction(
      ()=>document.getElementById("message").textContent.includes("mesclagem"),
      null,{timeout:10000});
    check((await importedPage.locator("#summary").innerText()).includes("2 pedem ajustes"),
      "C167 two independent non-conflicting reviews combine without dropping either");
    check((await importedPage.locator("#notes").inputValue()).includes("Revisar métricas"),
      "C167 merge keeps the first reviewer local observation");
    await importedPage.locator("#next").click();
    check((await importedPage.locator("#notes").inputValue()).includes("Revisar segunda aula"),
      "C167 merge imports the second independent review");
    await importedPage.locator("#previous").click();
    const conflictPath=path.join(dir,"revisao-conflitante.csv");
    fs.writeFileSync(conflictPath,csv.replace(
      "Revisar métricas e clareza do exemplo fictício.","Mudança divergente de outro revisor"),"utf8");
    await importedPage.locator("#import").setInputFiles(conflictPath);
    await importedPage.waitForFunction(
      ()=>document.getElementById("message").textContent.includes("Conflito"),
      null,{timeout:10000});
    check((await importedPage.locator("#summary").innerText()).includes("2 pedem ajustes")&&
      (await importedPage.locator("#notes").inputValue()).includes("Revisar métricas"),
      "C167 conflicting full CSV is rejected atomically, preserving both reviews");
    await importedPage.locator("#import-mode").selectOption("replace");
    let asked=false;
    importedPage.once("dialog",async dialog=>{asked=true;await dialog.dismiss();});
    await importedPage.locator("#import").setInputFiles(path.join(dir,"revisao.csv"));
    check(asked && (await importedPage.locator("#summary").innerText()).includes("2 pedem ajustes"),
      "C167 user can cancel explicit full replacement without losing work");
    await importedPage.close();

    await page.locator("#notes").fill("=HYPERLINK(\"https://example.invalid\")");
    await page.locator("#export").click();
    check((await page.locator("#message").innerText()).includes("fórmula"),
      "C158 spreadsheet formula injection is rejected before CSV creation");
    check(network===0,"C158 standalone review makes zero HTTP requests");
    check(errors.length===0,"C158 offline page JS/CSP has no runtime errors: "+errors.join(";"));
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    check(!overflow,"C158 offline reviewer has no horizontal overflow at 390 px");
    await page.locator("#notes").fill("Aula revisada parcialmente; exportação anterior é apenas QA.");
    await page.screenshot({path:path.join(out,"editorial-review-offline-390.png"),fullPage:true});
  }finally{
    await browserContext.close();
    fs.rmSync(dir,{recursive:true,force:true});
  }
};