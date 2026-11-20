#!/usr/bin/env node
"use strict";
/** R154: keyboard, 35 curricular destinations, responsive, axe, no HTTP. */
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
    "review/uni-erd-r151-r155-curricular-lesson-index-2026-11-20");
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
    const nav=page.locator('nav[aria-label="Índice curricular de aulas"]');
    assert.equal(await nav.locator("section").count(),10);
    const links=nav.locator("a");
    assert.equal(await links.count(),35);
    assert.equal(await page.locator("article").count(),35);
    assert.equal(await page.locator('section[aria-label="Texto integral da aula em rascunho"]').count(),35);
    assert.equal(await page.locator("article ol li").count(),210);
    const targets=new Set();
    for(let i=0;i<35;i++){
      const link=links.nth(i);
      const href=await link.getAttribute("href");
      assert.match(href,/^#aula-\d+$/u);
      assert.ok(!targets.has(href),"Duplicate target");
      targets.add(href);
      await link.focus();
      await page.keyboard.press("Enter");
      assert.ok(await page.evaluate(id=>location.hash==="#"+id&&
        document.activeElement.id===id,href.slice(1)),
        "Enter must move focus to the target article");
    }
    assert.equal(targets.size,35);
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),
      "Mobile page must not scroll horizontally");
    const axe=await new AxeBuilder({page})
      .withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
    const severe=axe.violations.filter(v=>["serious","critical"].includes(v.impact));
    assert.equal(severe.length,0,"WCAG severe: "+severe.map(v=>v.id).join(","));
    assert.equal(await page.locator("script").count(),0);
    assert.equal(errors.length,0);
    assert.equal(remotes.length,0);
    console.log("PASS R154: 35 focusable curricular links in 10 groups; Chrome/axe mobile; offline.");
  }finally{
    await context.close();
    await browser.close();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
