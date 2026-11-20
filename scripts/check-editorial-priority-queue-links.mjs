#!/usr/bin/env node
/**
 * UNI ERD-R134/R135: 35-lesson native anchor regression.
 * No browser, customers, grants, editable signoffs or external connections.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildEditorialReviewPriority} from "./build-editorial-review-priority.mjs";
import {renderReviewPriorityHtml} from "./render-editorial-priority-html.mjs";

export function assertQueueLinks(html, report) {
  assert.equal(report?.items?.length,35,"Exactly 35 draft lessons are required");
  assert.equal(report?.release_decision,"HOLD_NO_GO");
  assert.equal(report?.human_review_authenticated,false);
  const articles=[...html.matchAll(/<article id="aula-(\d+)"[\s\S]*?<\/article>/gu)];
  assert.equal(articles.length,35,"Every draft lesson must be keyboard-reachable");
  const ids=new Set(articles.map(a=>Number(a[1])));
  assert.equal(ids.size,35,"No duplicate curricular anchor");
  let previousLinks=0, nextLinks=0, returns=0;
  for(let i=0;i<35;i++){
    const row=report.items[i];
    const block=articles[i][0];
    assert.equal(Number(articles[i][1]),row.original_position,
      "Priority sequence must keep original curricular anchor");
    assert.ok(block.includes('tabindex="-1"'),"Native same-page links must move focus");
    const nav=block.match(/<p class="queue-nav">([\s\S]*?)<\/p>/u);
    assert.ok(nav,"Missing per-lesson navigation");
    const links=[...nav[1].matchAll(/<a href="([^"]+)">([^<]+)<\/a>/gu)];
    const expected=[];
    if(i>0){
      const position=report.items[i-1].original_position;
      expected.push("#aula-"+position);
      assert.ok(links.some(a=>a[2].includes("Aula anterior na fila: fila "+i+
        " de 35, aula "+position+" no currículo")),"Previous target not labelled");
      previousLinks++;
    }
    if(i<34){
      const position=report.items[i+1].original_position;
      expected.push("#aula-"+position);
      assert.ok(links.some(a=>a[2].includes("Próxima aula na fila: fila "+(i+2)+
        " de 35, aula "+position+" no currículo")),"Next target not labelled");
      nextLinks++;
    }
    expected.push("#conteudo");
    assert.deepEqual(links.map(a=>a[1]),expected,
      "Queue links must point to their exact neighbors and return to the index");
    returns++;
  }
  assert.equal(previousLinks,34);
  assert.equal(nextLinks,34);
  assert.equal(returns,35);
  assert.equal([...html.matchAll(/href="https?:\/\//gu)].length,0,
    "Review document must not link to external origins");
  assert.ok(html.includes("<strong>HOLD_NO_GO · SEM ACEITE.</strong>"),
    "Canonical no-signoff warning must remain intact");
  assert.ok(html.includes("13/13 NOT_VERIFIED"),
    "All operational gates must remain explicitly blocked");
  assert.ok(html.includes("210 perguntas"));
  assert.ok(!html.includes('href="javascript:'),"No executable links");
  return {lessons:35,previousLinks,nextLinks,returns,release:"HOLD_NO_GO"};
}

const source=JSON.parse(readFileSync(
  new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const report=buildEditorialReviewPriority(source);
const original=renderReviewPriorityHtml(report);
const summary=assertQueueLinks(original,report);
let negatives=0;
const reject=(label,altered)=>{
  assert.throws(()=>assertQueueLinks(altered,report),undefined,label);
  negatives++;
};
const firstNext=original.match(/<a href="#aula-\d+">Próxima aula na fila: fila 2 de 35[^<]*<\/a>/u);
assert.ok(firstNext,"Fixture first-next link missing");
reject("next link to missing article",
  original.replace(firstNext[0],firstNext[0].replace(/href="#aula-\d+"/u,'href="#aula-99"')));
const lastBack=original.match(/<a href="#aula-\d+">Aula anterior na fila: fila 34 de 35[^<]*<\/a>/u);
assert.ok(lastBack,"Fixture last-previous link missing");
reject("last previous link removed",original.replace(lastBack[0],""));
reject("navigation wrapper removed",original.replace('<p class="queue-nav">','<p>'));
reject("fake early approval",original.replace("HOLD_NO_GO","GO"));
reject("extra external link",original.replace("</body></html>",
  '<a href="https://example.com">externo</a></body></html>'));
assert.equal(negatives,5);
console.log("PASS ERD R134-R135: "+JSON.stringify({...summary,negatives})+
  " — synthetic offline only, no editorial signoff or access.");
