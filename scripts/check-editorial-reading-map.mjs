#!/usr/bin/env node
/**
 * ERD-R206/R207: independent course coverage and review-risk display checks.
 * A heuristic signal never authorizes publication or confirms a factual error.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildHumanEditorialChecklist} from "./build-editorial-human-checklist.mjs";
import {renderEditorialReadingTranscript} from "./render-editorial-reading-transcript.mjs";
import {verifyEditorialReadingTranscript} from "./verify-editorial-reading-transcript.mjs";

const source=JSON.parse(readFileSync(
  new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
const text=renderEditorialReadingTranscript(source);
const checklist=buildHumanEditorialChecklist(source);
const mapCourses=[...text.matchAll(/^MAPA-CURSO (\d+)\/10: (.+) \| (\d+) aulas$/gmu)];
const mapLessons=[...text.matchAll(/^MAPA-AULA (\d+)\/35: (.+) \| ([a-z0-9-]+\/[a-z0-9-]+) \| 4 seções \| (\d+) palavras nas seções \| sinais para leitura: (.+)$/gmu)];
assert.equal(mapCourses.length,10);
assert.equal(mapLessons.length,35);
assert.equal(mapCourses.reduce((a,c)=>a+Number(c[3]),0),35);
const seen=new Set();
for(const [index,match] of mapLessons.entries()){
  const position=index+1;
  const [,pos,title,id,wordCount,flags]=match;
  assert.equal(Number(pos),position,"Map order must follow curriculum");
  assert.ok(!seen.has(id),"Duplicate map lesson identity");
  seen.add(id);
  const row=checklist.lessons[index];
  assert.equal(id,row.id);
  assert.equal(title,source.courses.flatMap(c=>c.lessons)[index].title.replace(/\s+/gu," ").trim());
  assert.equal(Number(wordCount),row.section_words.reduce((a,b)=>a+b,0));
  assert.equal(flags,row.possible_risks.length?
    row.possible_risks.join(", "):"nenhum sinal automático");
  assert.ok(!/APROVAD[OA]|SIGNOFF|VERIFIED/u.test(flags));
}
assert.equal(seen.size,35);
assert.equal((text.match(/^PERGUNTA [1-6]\/6:/gmu)||[]).length,210);
assert.ok(text.includes("FIM DO MAPA — 35 aulas sem aceite."));
assert.ok(text.includes("HOLD_NO_GO | 13/13 NOT_VERIFIED | 0 grants"));
const bytes=Buffer.from(text,"utf8");
const success=verifyEditorialReadingTranscript(bytes,source);
assert.equal(success.human_signoff_authenticated,false);
assert.equal(success.grants_issued,0);
let negatives=0;
function deny(label,oldText,newText){
  assert.ok(text.includes(oldText),"Ineffective source for mutation "+label);
  const mutated=text.replace(oldText,newText);
  assert.notEqual(mutated,text);
  assert.throws(()=>verifyEditorialReadingTranscript(Buffer.from(mutated,"utf8"),source),
    undefined,label);
  negatives++;
}
deny("missing course",mapCourses[0][0],"");
deny("wrong lesson id",mapLessons[0][0],mapLessons[0][0].replace(mapLessons[0][3],"other-course/other-lesson"));
deny("wrong word count",mapLessons[0][0],mapLessons[0][0].replace(" | "+mapLessons[0][4]+" palavras"," | 999999 palavras"));
deny("fake risk clearing",mapLessons[0][0],mapLessons[0][0].replace("sinais para leitura: ","sinais aprovados: "));
deny("invented review approval","FIM DO MAPA — 35 aulas sem aceite.","FIM DO MAPA — 35 aulas aprovadas.");
deny("altered course count",mapCourses[0][0],mapCourses[0][0].replace(" aulas"," cursos"));
assert.equal(negatives,6);
console.log("PASS ERD R204–R207: 10 course summaries, 35 ordered coverage rows, "+
  "140 sections and 210 prompts; 6 negative map mutations; HOLD_NO_GO.");
