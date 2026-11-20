#!/usr/bin/env node
"use strict";
/** UNI ERD-R167: native keyboard focus for all 140 source-bound section links. */
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
    "review/uni-erd-r165-r169-section-navigation-2026-11-20");
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
    page.on("pageerror",error=>errors.push(error.message));
    page.on("request",req=>{if(/^https?:/iu.test(req.url()))remotes.push(req.url());});
    await page.goto(pathToFileURL(file).href,{waitUntil:"load",timeout:20000});
    const articles=page.locator("article");
    assert.equal(await articles.count(),35);
    const seen=new Set();
    for(let i=0;i<35;i++){
      const row=articles.nth(i);
      const nav=row.locator('nav[aria-label^="Seções desta aula:"]');
      assert.equal(await nav.count(),1);
      const links=nav.locator("ol li a");
      assert.equal(await links.count(),4);
      for(let j=0;j<4;j++){
        const link=links.nth(j);
        const href=await link.getAttribute("href");
        assert.match(href,/^#aula-secao-\d+-[1-4]$/u);
        assert.ok(!seen.has(href),"Duplicate same-page section destination");
        seen.add(href);
        await link.focus();
        await page.keyboard.press("Enter");
        assert.ok(await page.evaluate(id=>location.hash==="#"+id&&
          document.activeElement.id===id&&
          document.activeElement.tagName==="H4",href.slice(1)),
          "Keyboard Enter must focus the expected section heading");
      }
    }
    assert.equal(seen.size,140);
    assert.equal(await page.locator("article h4[tabindex='-1']").count(),140);
    assert.equal(await page.locator("article ol li").count(),350);
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),
      "Mobile viewport must not scroll horizontally");
    const axe=await new AxeBuilder({page})
      .withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
    const severe=axe.violations.filter(v=>["serious","critical"].includes(v.impact));
    assert.equal(severe.length,0,
      "Serious/critical axe: "+severe.map(v=>v.id).join(","));
    assert.equal(errors.length,0);
    assert.equal(remotes.length,0);
    assert.equal(await page.locator("script").count(),0);
    console.log("PASS R167: 140 native section keyboard transitions, mobile, axe, no HTTP.");
  }finally{await context.close();await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
