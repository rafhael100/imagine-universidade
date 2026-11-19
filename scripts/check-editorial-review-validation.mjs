#!/usr/bin/env node
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {inspectEditorialReview} from "./validate-editorial-review.mjs";

const root=fileURLToPath(new URL("../",import.meta.url));
const source=await readFile(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8");
const dir=await mkdtemp(join(tmpdir(),"uni-review-verification-"));
let scenarios=0;
function accepts(label,csv,check){
  const actual=inspectEditorialReview(csv,source);
  check(actual);scenarios++;
}
function rejects(label,csv){
  assert.throws(()=>inspectEditorialReview(csv,source),undefined,label);scenarios++;
}
function alter(csv,rowIndex,fieldIndex,newValue){
  const lines=csv.trimEnd().split("\n");
  assert.ok(rowIndex>0&&rowIndex<lines.length);
  const cells=lines[rowIndex].match(/"(?:[^"]|"")*"/g);
  assert.equal(cells.length,7);
  cells[fieldIndex]='"'+String(newValue).replaceAll('"','""')+'"';
  lines[rowIndex]=cells.join(",");
  return lines.join("\n")+"\n";
}
try{
  const command=spawnSync(process.execPath,[
    fileURLToPath(new URL("./build-editorial-review-pack.mjs",import.meta.url)),
    "--out",dir],{cwd:root,encoding:"utf8"});
  assert.equal(command.status,0,command.stderr||command.stdout);
  const csv=await readFile(join(dir,"revisao.csv"),"utf8");
  accepts("all 35 pending",csv,summary=>{
    assert.equal(summary.pending,35);
    assert.equal(summary.claimed_human_approved,0);
    assert.equal(summary.publishable,false);
    assert.equal(summary.release_decision,"HOLD_NO_GO");
    assert.equal(summary.review_evidence_authenticated,false);
  });
  const ref="https://github.com/rafhael100/imagine-universidade/issues/12";
  const changed=alter(alter(alter(csv,1,3,"CLAIMED_HUMAN_APPROVED"),1,4,"Revisora Editorial"),1,5,ref);
  accepts("one human review claim without operational authorization",changed,s=>{
    assert.equal(s.claimed_human_approved,1);
    assert.equal(s.pending,34);
    assert.equal(s.publishable,false);
    assert.equal(s.review_evidence_authenticated,false);
  });
  let all=csv;
  for(let i=1;i<=35;i++){
    all=alter(alter(alter(all,i,3,"CLAIMED_HUMAN_APPROVED"),i,4,"Revisor Humano"),i,5,ref);
  }
  accepts("even 35 claims do not permit production publish",all,s=>{
    assert.equal(s.claimed_human_approved,35);
    assert.equal(s.pending,0);
    assert.equal(s.publishable,false);
    assert.equal(s.release_decision,"HOLD_NO_GO");
  });
  const needs=alter(alter(alter(csv,3,3,"NEEDS_CHANGES"),3,4,"Revisora Editorial"),3,5,ref);
  accepts("needs changes is not approval",needs,s=>{
    assert.equal(s.needs_changes,1);
    assert.equal(s.claimed_human_approved,0);
  });
  const excel="\uFEFF"+csv.replaceAll('","','";"');
  accepts("Brazilian Excel CSV with semicolon and BOM",excel,s=>assert.equal(s.pending,35));
  // Both malformed inputs used to parse as identical valid values because
  // non-delimiter data after a quoted field was appended silently.
  const badStatus=csv.replace('"PENDING_HUMAN_REVIEW"','"PENDING_HUMAN_"REVIEW');
  assert.notEqual(badStatus,csv,"Malformed status fixture must change the CSV");
  rejects("text after closing quote in review status",badStatus);
  const firstDataLine=csv.split("\n")[1];
  const firstSlug=firstDataLine.slice(1,firstDataLine.indexOf('"',1));
  assert.ok(firstSlug.length>4);
  const badSlug=csv.replace('"'+firstSlug+'"','"'+firstSlug.slice(0,3)+'"'+firstSlug.slice(3));
  assert.notEqual(badSlug,csv,"Malformed slug fixture must change the CSV");
  rejects("text after closing quote in lesson identity",badSlug);
  rejects("stale content digest",alter(csv,1,2,"0".repeat(64)));
  rejects("fake unknown course",alter(csv,1,0,"fake-course"));
  const duplicateReviewLines=csv.trimEnd().split("\n");
  duplicateReviewLines[2]=duplicateReviewLines[1];
  rejects("duplicate lesson key",duplicateReviewLines.join("\n")+"\n");
  rejects("untrusted single-letter reviewer",alter(alter(alter(csv,1,3,"CLAIMED_HUMAN_APPROVED"),1,4,"X"),1,5,ref));
  rejects("reviewer evidence from outside repository",alter(alter(alter(csv,1,3,"CLAIMED_HUMAN_APPROVED"),1,4,"Revisora Editorial"),1,5,"https://github.com/external/repo/issues/1"));
  rejects("missing claimed reviewer",alter(alter(csv,1,3,"CLAIMED_HUMAN_APPROVED"),1,5,ref));
  rejects("unsupported signoff status",alter(csv,1,3,"APPROVED"));
  rejects("pending row with forged reviewer",alter(csv,1,4,"Some Person"));
  rejects("spreadsheet formula in notes",alter(csv,1,6,'=HYPERLINK("https://invalid.test")'));
  rejects("spreadsheet formula with leading whitespace",alter(csv,1,6,"  +2+3"));
  rejects("spreadsheet formula using @ in notes",alter(csv,1,6,"@SUM(2,2)"));
  rejects("oversized editorial notes",alter(csv,1,6,"z".repeat(2001)));
  rejects("control character inside notes",alter(csv,1,6,"Inadequado\u0007"));
  rejects("bidirectional override inside notes",alter(csv,1,6,"Texto\u202Einvertido"));
  rejects("bidirectional isolate inside notes",alter(csv,1,6,"Texto\u2067isolado"));
  rejects("left-to-right mark inside notes",alter(csv,1,6,"Texto\u200eoculto"));
  rejects("zero-width space inside notes",alter(csv,1,6,"Texto\u200boculto"));
  rejects("word joiner inside notes",alter(csv,1,6,"Texto\u2060oculto"));
  rejects("internal BOM inside notes",alter(csv,1,6,"Texto\ufeffoculto"));
  rejects("zero-width formula prefix",alter(csv,1,6,"\u200b=HYPERLINK(1)"));
  // Invalid UTF-8 within an otherwise valid pending note must fail on bytes.
  const poisoned=csv.replace('"PENDING_HUMAN_REVIEW","","",""',
    '"PENDING_HUMAN_REVIEW","","","~"');
  assert.notEqual(poisoned,csv,"Invalid UTF-8 fixture must alter a pending note");
  const bytes=Buffer.from(poisoned,"utf8");
  const marker=bytes.indexOf(Buffer.from(',"~"\n'));
  assert.ok(marker>=0,"Expected pending note marker");
  bytes[marker+2]=0xc3; // Incomplete UTF-8 before closing quote.
  const malformedPath=join(dir,"invalid-utf8.csv");
  await writeFile(malformedPath,bytes);
  const strict=spawnSync(process.execPath,[
    fileURLToPath(new URL("./validate-editorial-review.mjs",import.meta.url)),
    "--csv",malformedPath
  ],{cwd:root,encoding:"utf8"});
  assert.notEqual(strict.status,0,"Invalid UTF-8 must fail before CSV schema check");
  assert.match(strict.stderr,/encoded data was not valid|utf-8/iu);
  scenarios++;
  const hugePath=join(dir,"oversized-utf8.csv");
  await writeFile(hugePath,Buffer.alloc(1_000_001,0x20));
  const huge=spawnSync(process.execPath,[
    fileURLToPath(new URL("./validate-editorial-review.mjs",import.meta.url)),
    "--csv",hugePath
  ],{cwd:root,encoding:"utf8"});
  assert.notEqual(huge.status,0,"Oversized byte input must fail before CSV parsing");
  assert.match(huge.stderr,/exceeds 1 MB byte limit/u);
  scenarios++;
  const named=alter(alter(alter(csv,1,3,"NEEDS_CHANGES"),1,4,"Equipe de QA"),1,5,ref);
  rejects("spreadsheet formula in reviewer",alter(named,1,4,"@cmd"));
  rejects("newline in reviewer",alter(named,1,4,"Revisora\nFalsa"));
  rejects("bidirectional override in reviewer",alter(named,1,4,"Revisor\u202EFalso"));
  rejects("Unicode line separator in reviewer",alter(named,1,4,"Revisor\u2028Falso"));
  rejects("zero-width reviewer spoofing",alter(named,1,4,"Revisor\u200bFalso"));
  rejects("word joiner reviewer spoofing",alter(named,1,4,"Revisor\u2060Falso"));
  accepts("valid multiline review notes",alter(csv,1,6,"Revisão clara,\ncom texto em duas linhas."),s=>{
    assert.equal(s.pending,35);
    assert.equal(s.publishable,false);
  });
  accepts("ordinary Portuguese diacritics remain allowed",
    alter(csv,1,6,"Revisão pedagógica: ações, métrica e inclusão."),s=>
      assert.equal(s.pending,35));
  rejects("one missing lesson review",csv.trimEnd().split("\n").slice(0,-1).join("\n")+"\n");
  rejects("duplicated lesson review",csv+csv.trimEnd().split("\n")[1]+"\n");
  assert.equal(scenarios,39);
  console.log("PASS editorial signoff validation: "+scenarios+" scenarios, 35 hashes checked, NO_GO even if every row claims approval.");
}finally{
  await rm(dir,{recursive:true,force:true});
}
