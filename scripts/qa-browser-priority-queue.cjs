#!/usr/bin/env node
"use strict";
/**
 * UNI ERD-R137-R139: browser proof of native next/previous queue anchors.
 * Only a source-verified synthetic file:// document, with zero external calls.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const {chromium}=require("playwright");
const AxeBuilder=require("@axe-core/playwright").default;

async function main(){
  assert.equal(process.env.CI,"true");
  assert.equal(process.env.GITHUB_ACTIONS,"true");
  assert.equal(process.env.GITHUB_REPOSITORY,"rafhael100/imagine-universidade");
  assert.equal(process.env.UNI_BROWSER_LAB,"synthetic");
  assert.equal(process.env.GITHUB_REF_NAME,
    "review/uni-erd-r137-r140-chromium-review-queue-2026-11-20");
  assert.equal(process.argv.length,3,"Exactly one local, source-verified HTML file");
  const root=fs.realpathSync(process.env.RUNNER_TEMP);
  const file=fs.realpathSync(process.argv[2]);
  const stat=fs.lstatSync(file);
  assert.ok(file.startsWith(root+path.sep),"Only runner temporary files allowed");
  assert.ok(stat.isFile()&&!stat.isSymbolicLink()&&stat.size>0&&stat.size<1024*1024);

  const browser=await chromium.launch({headless:true,channel:"chrome"});
  const errors=[],remotes=[];
  const context=await browser.newContext({
    viewport:{width:1280,height:900},reducedMotion:"reduce"
  });
  await context.route("**/*",route=>{
    const url=new URL(route.request().url());
    return url.protocol==="file:"?route.continue():route.abort();
  });
  const page=await context.newPage();
  page.on("pageerror",e=>errors.push(String(e.message).slice(0,120)));
  page.on("request",req=>{if(/^https?:/iu.test(req.url()))remotes.push(req.url());});
  let navigation=0,quality=0;
  try{
    await page.goto(pathToFileURL(file).href,{waitUntil:"load",timeout:20000});
    assert.equal(await page.locator("article").count(),35);
    assert.equal(await page.locator("article ol li").count(),210);
    assert.ok((await page.locator(".warning").innerText()).includes("HOLD_NO_GO"));
    quality+=3;
    const articles=page.locator("article");
    const ids=[];
    for(let i=0;i<35;i++)ids.push(await articles.nth(i).getAttribute("id"));
    assert.equal(new Set(ids).size,35,"All 35 article IDs must be unique");
    quality++;
    assert.equal(await articles.first().locator('.queue-nav a').count(),2,
      "First article must have no previous");
    assert.equal(await articles.last().locator('.queue-nav a').count(),2,
      "Last article must have no next");
    quality+=2;

    for(let i=0;i<34;i++){
      const anchor=articles.nth(i).locator('.queue-nav a')
        .filter({hasText:"Próxima aula na fila:"});
      assert.equal(await anchor.count(),1,"Every nonfinal lesson needs one next link");
      assert.equal(await anchor.getAttribute("href"),"#"+ids[i+1]);
      await anchor.focus();
      await page.keyboard.press("Enter");
      assert.ok(await page.evaluate(id=>location.hash==="#"+id&&
        document.activeElement.id===id,ids[i+1]),
        "Enter must focus the next priority article");
      navigation++;
    }
    for(let i=34;i>0;i--){
      const anchor=articles.nth(i).locator('.queue-nav a')
        .filter({hasText:"Aula anterior na fila:"});
      assert.equal(await anchor.count(),1,"Every nonfirst lesson needs one previous link");
      assert.equal(await anchor.getAttribute("href"),"#"+ids[i-1]);
      await anchor.focus();
      await page.keyboard.press("Enter");
      assert.ok(await page.evaluate(id=>location.hash==="#"+id&&
        document.activeElement.id===id,ids[i-1]),
        "Enter must focus the previous priority article");
      navigation++;
    }
    assert.equal(navigation,68);
    const returnLink=articles.first().locator('.queue-nav a')
      .filter({hasText:"Voltar ao índice"});
    await returnLink.focus();
    await page.keyboard.press("Enter");
    assert.ok(await page.evaluate(()=>location.hash==="#conteudo"&&
      document.activeElement.id==="conteudo"),"Index return must move keyboard focus");
    quality++;

    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),
      "390px responsive layout must not horizontally overflow");
    const axe=await new AxeBuilder({page})
      .withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
    const severe=axe.violations.filter(v=>["serious","critical"].includes(v.impact));
    assert.equal(severe.length,0,"No serious or critical WCAG findings: "+
      severe.map(v=>v.id).join(","));
    assert.equal(errors.length,0,"No page JS exceptions");
    assert.equal(remotes.length,0,"No remote network attempts");
    quality+=4;
    console.log("PASS UNI R137-R139: "+navigation+
      " native keyboard queue transitions and "+quality+
      " browser quality checks; 35 synthetic lessons, no editorial signoff.");
  }finally{
    await context.close();
    await browser.close();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
