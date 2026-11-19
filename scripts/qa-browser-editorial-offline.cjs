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
    // C176: only real status/count changes should announce to a screen
    // reader. Repeated note-input events must not rewrite unchanged live regions.
    await page.evaluate(()=>{
      window.__uniLiveMutations={summary:0,message:0};
      const counts=window.__uniLiveMutations;
      new MutationObserver(()=>{counts.summary++;}).observe(
        document.getElementById("summary"),{childList:true,characterData:true,subtree:true});
      new MutationObserver(()=>{counts.message++;}).observe(
        document.getElementById("message"),{childList:true,characterData:true,subtree:true});
    });
    await page.locator("#notes").dispatchEvent("input");
    await page.locator("#notes").dispatchEvent("input");
    const stable=await page.evaluate(async()=>{
      await Promise.resolve();return {...window.__uniLiveMutations};
    });
    check(stable.summary===0&&stable.message===0,
      "C176 unchanged notes do not redundantly announce identical live-region text");
    await page.locator("#status").selectOption("CLAIMED_HUMAN_APPROVED");
    await page.locator("#status").selectOption("NEEDS_CHANGES");
    const changed=await page.evaluate(async()=>{
      await Promise.resolve();return {...window.__uniLiveMutations};
    });
    check(changed.summary>=2&&changed.message===0,
      "C176 actual status changes still update the live summary without repetitive message");
    // C177: mutation counts prove that stable navigation labels stay quiet.
    await page.evaluate(()=>{
      window.__uniNavMutations={courses:0,search:0};
      const mutations=window.__uniNavMutations;
      new MutationObserver(rows=>{mutations.courses+=rows.length;}).observe(
        document.getElementById("courses"),{childList:true,characterData:true,subtree:true});
      new MutationObserver(rows=>{mutations.search+=rows.length;}).observe(
        document.getElementById("review-search-count"),{childList:true,characterData:true,subtree:true});
    });
    await page.locator("#notes").dispatchEvent("input");
    await page.locator("#notes").dispatchEvent("input");
    const quietNav=await page.evaluate(async()=>{
      await Promise.resolve();return {...window.__uniNavMutations};
    });
    check(quietNav.courses===0&&quietNav.search===0,
      "C177 repeated notes do not rewrite course labels or live search count");
    await page.locator("#status").selectOption("PENDING_HUMAN_REVIEW");
    await page.locator("#status").selectOption("NEEDS_CHANGES");
    const navChanged=await page.evaluate(async()=>{
      await Promise.resolve();return {...window.__uniNavMutations};
    });
    check(navChanged.courses>=2,
      "C177 genuine pending-count changes still update course navigation");
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
    const countEvents=await page.evaluate(()=>window.__uniNavMutations.search);
    await page.locator("#review-search").fill("VISITA");
    check(await page.evaluate(()=>window.__uniNavMutations.search)===countEvents,
      "C177 unchanged result count avoids duplicate aria-live announcements");
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


    // C183: pasted ASCII controls in the reviewer field used to escape the
    // browser's export fence, producing CSV rejected by the canonical CLI.
    // Test both BEL and DEL while retaining the existing human draft.
    for(const control of [7,127]){
      await page.locator("#reviewer").evaluate((el,code)=>{
        el.value="Equipe"+String.fromCharCode(code)+" Editorial";
        el.dispatchEvent(new Event("input",{bubbles:true}));
      },control);
      await page.locator("#export").click();
      check((await page.locator("#message").innerText()).includes("Informe revisor válido"),
        "C183 reviewer control character rejected before CSV export");
    }
    await page.locator("#reviewer").fill("Equipe Editorial QA");

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
    // C184: browser download events are not durable-write receipts.
    const warnsBeforeExit=()=>page.evaluate(()=>{
      const e=new Event("beforeunload",{cancelable:true});
      dispatchEvent(e);return e.defaultPrevented;
    });
    check(await page.locator("#confirm-export").isEnabled()&&await warnsBeforeExit(),
      "C184 requested CSV download still warns until the human checks saved file");
    await page.locator("#confirm-export").click();
    check(await page.locator("#confirm-export").isDisabled()&&!(await warnsBeforeExit()),
      "C184 explicit acknowledgment clears only local unsaved-work warning");
    await page.locator("#notes").fill("Nova alteração depois do download confirmado");
    check(await page.locator("#confirm-export").isDisabled()&&await warnsBeforeExit(),
      "C184 a subsequent edit invalidates prior save acknowledgment");
    await page.locator("#notes").fill("Revisar métricas e clareza do exemplo fictício.");

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
    // Invalid files must fail BEFORE any confirmation dialog exists.
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
    // C186: a malformed import cannot invalidate a previously exported
    // snapshot or erase human notes when nothing was actually imported.
    const ackPage=await browserContext.newPage();
    ackPage.on("pageerror",error=>errors.push(String(error.message).slice(0,160)));
    await ackPage.goto(url,{waitUntil:"load"});
    await ackPage.locator("#notes").fill("Revisão local para conservar após falha");
    const [ackDownload]=await Promise.all([
      ackPage.waitForEvent("download",{timeout:10000}),
      ackPage.locator("#export").click()
    ]);
    await ackDownload.saveAs(path.join(dir,"revisao-antes-import-invalido.csv"));
    check(await ackPage.locator("#confirm-export").isEnabled(),
      "C186 acknowledgment offered for previously exported CSV");
    await ackPage.locator("#import").setInputFiles(invalidCsvPath);
    await ackPage.waitForFunction(
      ()=>document.getElementById("message").textContent.includes("Importação recusada"),
      null,{timeout:10000});
    check(await ackPage.locator("#confirm-export").isEnabled()&&
      (await ackPage.locator("#notes").inputValue()).includes("Revisão local"),
      "C186 rejected CSV restores download acknowledgment and original notes");
    await ackPage.locator("#confirm-export").click();
    check(!(await ackPage.evaluate(()=>{
      const event=new Event("beforeunload",{cancelable:true});
      dispatchEvent(event);return event.defaultPrevented;
    })),"C186 original saved CSV may still be acknowledged after failed import");
    await ackPage.close();
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
    await importedPage.waitForFunction(
      ()=>document.getElementById("message").textContent.includes("Substituição cancelada"),
      null,{timeout:10000}
    );
    check(asked && (await importedPage.locator("#summary").innerText()).includes("2 pedem ajustes"),
      "C168 user can cancel explicit full replacement without losing work");

    // C174: replacement remains a deliberate action even when the editor
    // has no unsaved edits. A diff-aware no-op never asks or changes state.
    const cleanReplacement=await browserContext.newPage();
    cleanReplacement.on("pageerror",error=>errors.push(String(error.message).slice(0,160)));
    await cleanReplacement.goto(url,{waitUntil:"load"});
    await cleanReplacement.locator("#import-mode").selectOption("replace");
    let cleanPrompt="";
    cleanReplacement.once("dialog",async dialog=>{
      cleanPrompt=dialog.message();await dialog.dismiss();
    });
    await cleanReplacement.locator("#import").setInputFiles(csvPath);
    await cleanReplacement.waitForFunction(
      ()=>document.getElementById("message").textContent.includes("Substituição cancelada"),
      null,{timeout:10000}
    );
    check(cleanPrompt.includes("Substituir 1 de 35")&&
      (await cleanReplacement.locator("#summary").innerText()).includes("35 pendentes"),
      "C174 clean editor requires explicit confirmation before replacing even one row");
    cleanReplacement.once("dialog",async dialog=>{await dialog.accept();});
    await cleanReplacement.locator("#import").setInputFiles(csvPath);
    await cleanReplacement.waitForFunction(
      ()=>document.getElementById("message").textContent.includes("carregado por substituição"),
      null,{timeout:10000}
    );
    check((await cleanReplacement.locator("#summary").innerText()).includes("1 pedem ajustes")&&
      (await cleanReplacement.locator("#message").innerText()).includes("1 aula(s) alterada"),
      "C174 confirmed replacement imports exactly one changed lesson");
    await cleanReplacement.locator("#import").setInputFiles(csvPath);
    await cleanReplacement.waitForFunction(
      ()=>document.getElementById("message").textContent.includes("CSV idêntico"),
      null,{timeout:10000}
    );
    check((await cleanReplacement.locator("#summary").innerText()).includes("1 pedem ajustes"),
      "C174 identical CSV is a no-op; existing review remains untouched");
    await cleanReplacement.close();

    const partialPage=await browserContext.newPage();
    partialPage.on("pageerror",error=>errors.push(String(error.message).slice(0,160)));
    await partialPage.goto(url,{waitUntil:"load"});
    await partialPage.locator("#notes").fill("Anotação preliminar ainda não exportada");
    await partialPage.locator("#import").setInputFiles(csvPath);
    await partialPage.waitForFunction(
      ()=>document.getElementById("message").textContent.includes("Conflito"),
      null,{timeout:10000}
    );
    check((await partialPage.locator("#notes").inputValue())==="Anotação preliminar ainda não exportada",
      "C168 pending local notes cannot be erased by a completed imported review");
    check((await partialPage.locator("#summary").innerText()).includes("35 pendentes"),
      "C168 pending review conflict refuses the entire import without partial application");
    await partialPage.locator("#reviewer").fill("Anotação de responsável ainda pendente");
    await partialPage.locator("#import").setInputFiles(csvPath);
    await partialPage.waitForFunction(
      ()=>document.getElementById("message").textContent.includes("campos locais pendentes"),
      null,{timeout:10000}
    );
    check((await partialPage.locator("#reviewer").inputValue()).includes("ainda pendente")&&
      (await partialPage.locator("#summary").innerText()).includes("35 pendentes"),
      "C170 local pending reviewer field is never overwritten by a merged CSV");
    await partialPage.close();

    // A PENDING row with remote notes cannot silently be discarded when the
    // local lesson was already reviewed.
    const remotePending=originalCsv.trimEnd().split("\n");
    const tail='"PENDING_HUMAN_REVIEW","","",""';
    check(remotePending[1].includes(tail),"C170 original first review row is pending");
    remotePending[1]=remotePending[1].replace(tail,
      '"PENDING_HUMAN_REVIEW","","","Comentário remoto não incorporado"');
    const remotePath=path.join(dir,"revisao-pendente-remota.csv");
    fs.writeFileSync(remotePath,remotePending.join("\n")+"\n","utf8");
    await importedPage.locator("#import-mode").selectOption("merge");
    await importedPage.locator("#import").setInputFiles(remotePath);
    await importedPage.waitForFunction(
      ()=>document.getElementById("message").textContent.includes("Conflito"),
      null,{timeout:10000}
    );
    check((await importedPage.locator("#summary").innerText()).includes("2 pedem ajustes"),
      "C170 remote pending notes conflict with reviewed lesson without silent data loss");
    // An externally edited CSV must not smuggle visual spoofing controls past
    // the canonical validator, nor alter any of the previously merged reviews.
    const unicodeCsvPath=path.join(dir,"revisao-direcao-invisivel.csv");
    fs.writeFileSync(unicodeCsvPath,csv.replace(
      "Revisar métricas e clareza do exemplo fictício.",
      "Observação\u202Evisualmente invertida"),"utf8");
    await importedPage.locator("#import").setInputFiles(unicodeCsvPath);
    await importedPage.waitForFunction(
      ()=>document.getElementById("message").textContent.includes("Importação recusada"),
      null,{timeout:10000}
    );
    check((await importedPage.locator("#message").innerText()).includes("direção invisível") &&
      (await importedPage.locator("#summary").innerText()).includes("2 pedem ajustes"),
      "C172 Unicode-bidi CSV is rejected before atomic merge without losing local reviews");
    const hiddenCsvPath=path.join(dir,"revisao-zero-width.csv");
    fs.writeFileSync(hiddenCsvPath,csv.replace(
      "Revisar métricas e clareza do exemplo fictício.",
      "\u200b=HYPERLINK(1)"),"utf8");
    await importedPage.locator("#import").setInputFiles(hiddenCsvPath);
    await importedPage.waitForFunction(
      ()=>document.getElementById("message").textContent.includes("Importação recusada"),
      null,{timeout:10000}
    );
    check((await importedPage.locator("#message").innerText()).includes("direção invisível") &&
      (await importedPage.locator("#summary").innerText()).includes("2 pedem ajustes"),
      "C175 hidden zero-width formula is rejected atomically before a CSV merge");

    const malformedCsvPath=path.join(dir,"revisao-aspas-nao-canonicas.csv");
    const malformedCsv=csv.replace('"PENDING_HUMAN_REVIEW"','"PENDING_HUMAN_"REVIEW');
    fs.writeFileSync(malformedCsvPath,malformedCsv,"utf8");
    await importedPage.locator("#import").setInputFiles(malformedCsvPath);
    await importedPage.waitForFunction(
      ()=>document.getElementById("message").textContent.includes("Importação recusada"),
      null,{timeout:10000}
    );
    check((await importedPage.locator("#message").innerText()).includes("aspas fechadas") &&
      (await importedPage.locator("#summary").innerText()).includes("2 pedem ajustes"),
      "C173 noncanonical CSV quote is refused atomically even when parsed text would match");
    // C178: corrupt bytes must not become replacement characters in notes.
    const invalidEncoding=Buffer.from(csv,"utf8");
    const noteAt=invalidEncoding.indexOf(Buffer.from("Revisar métricas"));
    check(noteAt>=0,"C178 tampering targets an existing valid review note");
    invalidEncoding[noteAt]=0xc3;
    const utf8Path=path.join(dir,"revisao-utf8-invalido.csv");
    fs.writeFileSync(utf8Path,invalidEncoding);
    await importedPage.locator("#import").setInputFiles(utf8Path);
    await importedPage.waitForFunction(
      ()=>document.getElementById("message").textContent.includes("UTF-8 válido"),
      null,{timeout:10000}
    );
    check((await importedPage.locator("#summary").innerText()).includes("2 pedem ajustes"),
      "C178 invalid UTF-8 is rejected before atomic merge; local reviews remain");
    await importedPage.close();

    // C179: simulate a slow file read to prove that import mode cannot be
    // switched while reading or raced with a second import.
    const lockedPage=await browserContext.newPage();
    lockedPage.on("pageerror",error=>errors.push(String(error.message).slice(0,160)));
    await lockedPage.goto(url,{waitUntil:"load"});
    await lockedPage.evaluate(()=>{
      const original=File.prototype.arrayBuffer;
      window.__uniResumeCsv=null;
      File.prototype.arrayBuffer=function(){
        return new Promise((resolve,reject)=>{
          window.__uniResumeCsv=()=>original.call(this).then(resolve,reject);
        });
      };
    });
    await lockedPage.locator("#import").setInputFiles(csvPath);
    await lockedPage.waitForFunction(()=>typeof window.__uniResumeCsv==="function",
      null,{timeout:10000});
    check(await lockedPage.locator("#import").isDisabled()&&
      await lockedPage.locator("#import-mode").isDisabled(),
      "C179 in-flight import locks file and mode controls");
    check(await lockedPage.locator("#status").isDisabled()&&
      await lockedPage.locator("#reviewer").isDisabled()&&
      await lockedPage.locator("#evidence").isDisabled()&&
      await lockedPage.locator("#notes").isDisabled(),
      "C185 delayed CSV read locks all editorial editing fields");
    check(await lockedPage.locator("#export").isDisabled()&&
      await lockedPage.locator("#export-summary").isDisabled()&&
      await lockedPage.locator("#confirm-export").isDisabled(),
      "C186 import also locks export/summary/save acknowledgment");
    await lockedPage.evaluate(()=>{
      const notes=document.getElementById("notes");
      notes.value="Anotação forçada durante importação";
      notes.dispatchEvent(new Event("input",{bubbles:true}));
    });
    check((await lockedPage.locator("#notes").inputValue())===""&&
      (await lockedPage.locator("#summary").innerText()).includes("35 pendentes"),
      "C185 programmatically forced input is rejected without corrupting draft");
    await lockedPage.evaluate(()=>{
      document.getElementById("import").dispatchEvent(new Event("change",{bubbles:true}));
    });
    check((await lockedPage.locator("#message").innerText()).includes("Outra importação"),
      "C179 duplicate import events are refused during an unfinished read");
    // Programmatic value change is more adversarial than a disabled UI.
    await lockedPage.evaluate(()=>{
      document.getElementById("import-mode").value="replace";
      window.__uniResumeCsv();
    });
    await lockedPage.waitForFunction(
      ()=>document.getElementById("message").textContent.includes("mesclagem"),
      null,{timeout:10000});
    check((await lockedPage.locator("#summary").innerText()).includes("1 pedem ajustes")&&
      (await lockedPage.locator("#status").inputValue())==="NEEDS_CHANGES",
      "C179 mode snapshot stays merge despite a forced value change during I/O");
    check(!(await lockedPage.locator("#import").isDisabled())&&
      !(await lockedPage.locator("#import-mode").isDisabled()),
      "C179 controls unlock after import finishes");
    check(!(await lockedPage.locator("#notes").isDisabled())&&
      !(await lockedPage.locator("#status").isDisabled())&&
      !(await lockedPage.locator("#export").isDisabled())&&
      !(await lockedPage.locator("#export-summary").isDisabled()),
      "C185/C186 editing and export controls unlock after import completes");
    // C180: the same 1 MB byte boundary also holds in the browser.
    const oversizedPath=path.join(dir,"revisao-maior-1mb.csv");
    fs.writeFileSync(oversizedPath,Buffer.alloc(1000001,0x20));
    await lockedPage.locator("#import").setInputFiles(oversizedPath);
    await lockedPage.waitForFunction(
      ()=>document.getElementById("message").textContent.includes("CSV excede 1 MB"),
      null,{timeout:10000});
    check((await lockedPage.locator("#status").inputValue())==="NEEDS_CHANGES"&&
      !(await lockedPage.locator("#import").isDisabled()),
      "C180 oversized CSV rejects before read and preserves the loaded review");
    await lockedPage.close();

    await page.locator("#notes").fill("Observação\u200boculta");
    await page.locator("#export").click();
    check((await page.locator("#message").innerText()).includes("direção invisível"),
      "C175 offline export blocks zero-width note characters before CSV download");

    await page.locator("#notes").fill("Anotação\u202Einvertida");
    await page.locator("#export").click();
    check((await page.locator("#message").innerText()).includes("direção invisível"),
      "C172 offline CSV export blocks invisible direction controls in notes");
    await page.locator("#notes").fill("Observação temporária segura");
    await page.locator("#reviewer").fill("Equipe\u202EFalsa");
    await page.locator("#export").click();
    check((await page.locator("#message").innerText()).includes("revisor válido"),
      "C172 offline CSV export blocks invisible reviewer spoofing");
    await page.locator("#reviewer").fill("Equipe Editorial QA");

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