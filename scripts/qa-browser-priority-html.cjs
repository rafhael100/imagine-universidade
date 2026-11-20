#!/usr/bin/env node
"use strict";
/**
 * UNI ERD-R96/R97: real Chrome file:// keyboard/viewport/WCAG checks on
 * 35 versioned SYNTHETIC draft lessons; no production network or signoff.
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
    "review/uni-erd-r96-r99-chromium-passive-html-2026-11-20");
  assert.equal(process.argv.length,3,"Expected only one local verified HTML path");
  const runner=fs.realpathSync(process.env.RUNNER_TEMP);
  const target=fs.realpathSync(process.argv[2]);
  assert.ok(target.startsWith(runner+path.sep),"Only RUNNER_TEMP artifacts allowed");
  const st=fs.lstatSync(target);
  assert.ok(st.isFile()&&!st.isSymbolicLink()&&st.size>0&&st.size<=1024*1024);

  const browser=await chromium.launch({headless:true,channel:"chrome"});
  const errors=[],requests=[];
  let checks=0;
  const check=(condition,label)=>{
    assert.ok(condition,label);
    checks++;
    console.log("PASS R96/R97 "+checks+": "+label);
  };
  const context=await browser.newContext({
    viewport:{width:1280,height:900},reducedMotion:"reduce"
  });
  // All remote origins are blocked even if the CSP is accidentally changed.
  await context.route("**/*",route=>{
    const url=new URL(route.request().url());
    return url.protocol==="file:"?route.continue():route.abort();
  });
  const page=await context.newPage();
  page.on("pageerror",e=>errors.push(String(e.message).slice(0,100)));
  page.on("request",r=>{if(/^https?:/iu.test(r.url()))requests.push(r.url());});
  try{
    await page.goto(pathToFileURL(target).href,{waitUntil:"load",timeout:20000});
    check((await page.title()).includes("não autenticada"),"page labels review as unauthenticated");
    check(await page.locator("article").count()===35,"all 35 review articles present");
    check(await page.locator("article ol li").count()===210,"all 210 reading questions present");
    check(await page.locator("nav[aria-label='Índice de aulas'] a").count()===35,
      "all 35 index anchors present");
    check((await page.locator(".warning").innerText()).includes("HOLD_NO_GO"),
      "human approval and operational release explicitly blocked");

    await page.keyboard.press("Tab");
    check(await page.evaluate(()=>document.activeElement.classList.contains("skip")),
      "first keyboard Tab opens a skip link");
    await page.keyboard.press("Enter");
    check(await page.evaluate(()=>document.activeElement.id==="conteudo"&&
      location.hash==="#conteudo"),
      "skip link moves keyboard focus to the main review content");

    // Exercise native anchor actions, including non-sequential priority order.
    const links=page.locator("nav[aria-label='Índice de aulas'] a");
    for(let i=0;i<35;i++){
      const link=links.nth(i);
      const anchor=(await link.getAttribute("href")).slice(1);
      await link.focus();
      await page.keyboard.press("Enter");
      const reached=await page.evaluate(id=>document.activeElement.id===id&&
        location.hash==="#"+id,anchor);
      check(reached,"anchor "+(i+1)+" must focus its original-curriculum article");
    }
    check(await page.evaluate(()=>{
      const node=document.activeElement;
      const style=getComputedStyle(node);
      return node.matches(":focus-visible")&&parseFloat(style.outlineWidth)>=3;
    }),"keyboard-selected review article has visible focus outline");
    check(await page.locator("article").first().getAttribute("tabindex")==="-1",
      "focus targets are not extra Tab stops");

    await page.setViewportSize({width:390,height:844});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),
      "390px review layout has no horizontal document overflow");
    check(await page.locator("article").last().isVisible(),
      "final review article remains present on mobile");

    const axe=await new AxeBuilder({page})
      .withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
    const serious=axe.violations.filter(v=>["serious","critical"].includes(v.impact));
    check(serious.length===0,
      "no serious/critical axe WCAG 2.1 A/AA findings: "+
      serious.map(v=>v.id).join(","));
    check(errors.length===0,"zero browser JavaScript exceptions");
    check(requests.length===0,"zero remote requests during review");
    console.log("PASS R96-R99: "+checks+" Chromium keyboard, responsive and axe checks; "+
      "synthetic source only, 0 grants and 0 signoffs.");
  }finally{
    await context.close();
    await browser.close();
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
