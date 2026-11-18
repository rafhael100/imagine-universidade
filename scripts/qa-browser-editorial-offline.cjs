"use strict";
/**
 * Real Chromium interactions with the generated offline editorial review UI.
 * No public endpoint, authentication or external network allowed.
 */
const fs=require("node:fs");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const {pathToFileURL}=require("node:url");

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
    await page.locator("#next").click();
    check((await page.locator("#title").innerText()).includes("Leads:"),
      "C158 next lesson is usable without server");
    await page.locator("#previous").click();

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