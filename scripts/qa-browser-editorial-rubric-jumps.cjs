#!/usr/bin/env node
"use strict";
/** R183: Chrome keyboard, focus, mobile and axe checks on 35 rubric jumps. */
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
    "review/uni-erd-r180-r184-rubric-quickjump-2026-11-20");
  assert.equal(process.argv.length,3);
  const root=fs.realpathSync(process.env.RUNNER_TEMP);
  const file=fs.realpathSync(process.argv[2]);
  const stat=fs.lstatSync(file);
  assert.ok(file.startsWith(root+path.sep)&&stat.isFile()&&!stat.isSymbolicLink());
  assert.ok(stat.size>0&&stat.size<=1024*1024);
  const browser=await chromium.launch({headless:true,channel:"chrome"});
  const context=await browser.newContext({viewport:{width:1280,height:900},
    reducedMotion:"reduce"});
  const remotes=[],errors=[];
  await context.route("**/*",route=>
    new URL(route.request().url()).protocol==="file:"?route.continue():route.abort());
  try{
    const page=await context.newPage();
    page.on("pageerror",err=>errors.push(err.message));
    page.on("request",req=>{if(/^https?:/iu.test(req.url()))remotes.push(req.url());});
    await page.goto(pathToFileURL(file).href,{waitUntil:"load",timeout:20000});
    assert.equal(await page.locator("article").count(),35);
    for(let i=0;i<35;i++){
      const article=page.locator("article").nth(i);
      const link=article.locator('a[href^="#rubrica-aula-"]');
      assert.equal(await link.count(),1);
      const id=(await link.getAttribute("href")).slice(1);
      assert.equal(await article.locator('[id="'+id+'"]').count(),1);
      await link.focus();
      await page.keyboard.press("Enter");
      assert.ok(await page.evaluate(id=>location.hash==="#"+id &&
        document.activeElement.id===id &&
        document.activeElement.tagName==="P",id),"Enter must focus the rubric note");
      assert.equal(await article.locator("li").filter({hasText:"Precisão factual:"}).count(),1);
    }
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const axe=await new AxeBuilder({page})
      .withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
    const severe=axe.violations.filter(v=>["serious","critical"].includes(v.impact));
    assert.equal(severe.length,0,severe.map(v=>v.id).join(","));
    assert.equal(await page.locator("script").count(),0);
    assert.equal(errors.length,0);
    assert.equal(remotes.length,0);
    console.log("PASS R183: 35 focused rubric jumps, mobile axe and zero HTTP.");
  }finally{await context.close();await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
