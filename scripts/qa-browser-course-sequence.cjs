#!/usr/bin/env node
"use strict";
/** R159: Chromium verifying 50 in-course focus transitions and back links. */
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
    "review/uni-erd-r156-r160-course-sequence-2026-11-20");
  assert.equal(process.argv.length,3);
  const root=fs.realpathSync(process.env.RUNNER_TEMP);
  const file=fs.realpathSync(process.argv[2]);
  const stat=fs.lstatSync(file);
  assert.ok(file.startsWith(root+path.sep)&&stat.isFile()&&!stat.isSymbolicLink());
  assert.ok(stat.size>0&&stat.size<=1024*1024);
  const browser=await chromium.launch({headless:true,channel:"chrome"});
  const context=await browser.newContext({viewport:{width:1280,height:900},
    reducedMotion:"reduce"});
  const errors=[],remotes=[];
  await context.route("**/*",route=>
    new URL(route.request().url()).protocol==="file:"?route.continue():route.abort());
  try{
    const page=await context.newPage();
    page.on("pageerror",e=>errors.push(e.message));
    page.on("request",req=>{if(/^https?:/iu.test(req.url()))remotes.push(req.url());});
    await page.goto(pathToFileURL(file).href,{waitUntil:"load",timeout:20000});
    const articles=page.locator("article");
    assert.equal(await articles.count(),35);
    let jumps=0;
    for(let i=0;i<35;i++){
      const row=articles.nth(i);
      const nav=row.locator("p.queue-nav").filter({hasText:"Navegação por curso:"});
      assert.equal(await nav.count(),1);
      const neighbors=nav.locator('a[href^="#aula-"]');
      for(let j=0;j<await neighbors.count();j++){
        const link=neighbors.nth(j);
        const href=await link.getAttribute("href");
        assert.match(href,/^#aula-\d+$/u);
        await link.focus();
        await page.keyboard.press("Enter");
        assert.ok(await page.evaluate(id=>location.hash==="#"+id&&
          document.activeElement.id===id,href.slice(1)),
          "Curricular Enter must focus neighbor article");
        jumps++;
      }
      const back=nav.locator('a[href^="#curriculo-curso-"]');
      assert.equal(await back.count(),1);
      await back.focus();
      await page.keyboard.press("Enter");
      const dest=await back.getAttribute("href");
      assert.ok(await page.evaluate(value=>location.hash===value&&
        Boolean(document.getElementById(value.slice(1))),dest),
        "Return to matching course heading");
    }
    assert.equal(jumps,50);
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const axe=await new AxeBuilder({page})
      .withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
    assert.equal(axe.violations.filter(v=>["serious","critical"].includes(v.impact)).length,0);
    assert.equal(errors.length,0);
    assert.equal(remotes.length,0);
    assert.equal(await page.locator("script").count(),0);
    console.log("PASS R159: 50 curricular neighbor jumps and 35 returns, mobile/axe, offline.");
  }finally{await context.close();await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
