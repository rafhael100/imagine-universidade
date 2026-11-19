#!/usr/bin/env node
/**
 * Read-only validation of an editorial review CSV against the CURRENT source.
 * A claimed review is NEVER an authenticated or approved publication decision.
 *
 * Usage:
 *   node scripts/validate-editorial-review.mjs --csv /path/revisao.csv
 */
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";

function parseCsv(text){
  assert.ok(typeof text==="string" && text.length<=1_000_000,"Oversized review CSV");
  text=text.replace(/^\uFEFF/,""); // Excel UTF-8 export can add BOM
  const header=text.split(/\r?\n/,1)[0];
  const delimiter=header.includes('";"')?";":","; // Brazilian Excel uses semicolon
  const rows=[];let row=[],value="",quoted=false,fieldStart=true,closedQuote=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    // Noncanonical text after the terminating quote must not be silently
    // joined to an otherwise valid identity/status field.
    if(!quoted&&closedQuote&&ch!==delimiter&&ch!=='\n'&&ch!=='\r')
      assert.fail("Text after closing CSV quote");
    if(quoted){
      if(ch==='"'){
        if(text[i+1]==='"'){value+='"';i++;}
        else {quoted=false;closedQuote=true;}
      }else value+=ch;
    }else if(ch==='"'&&fieldStart){quoted=true;fieldStart=false;}
    else if(ch===delimiter){row.push(value);value="";fieldStart=true;closedQuote=false;}
    else if(ch==='\n'){
      row.push(value);rows.push(row);row=[];value="";fieldStart=true;closedQuote=false;
    }else if(ch==='\r'){
      assert.equal(text[i+1],'\n',"Carriage return must precede newline");
    }else{
      assert.notEqual(ch,'"',"Invalid CSV quoting");value+=ch;fieldStart=false;
    }
  }
  assert.ok(!quoted,"CSV contains unclosed quotation");
  if(value!==""||row.length){row.push(value);rows.push(row);}
  return rows;
}
export function inspectEditorialReview(csvText,sourceText){
  const source=JSON.parse(sourceText);
  assert.equal(source.status,"editorial_draft","Only original unapproved source may be reviewed");
  assert.equal(source.audience,"authorized_imagine_clients_only");
  const expected=new Map();
  for(const c of source.courses){
    for(const l of c.lessons){
      const key=c.slug+"/"+l.slug;
      assert.ok(!expected.has(key),"Duplicate source lesson key");
      const hash=createHash("sha256").update(JSON.stringify({
        course_slug:c.slug,course_title:c.title,category:c.category,
        lesson_slug:l.slug,lesson_title:l.title,body:l.body,
      })).digest("hex");
      expected.set(key,hash);
    }
  }
  assert.equal(expected.size,35,"Source must still have 35 lessons");
  const rows=parseCsv(csvText);
  const columns=["course_slug","lesson_slug","content_sha256","review_status",
    "reviewer","evidence_ref","notes"];
  assert.deepEqual(rows[0],columns,"Review CSV header changed");
  assert.equal(rows.length,36,"Expected one row per source lesson");
  const seen=new Set();
  const counters={pending:0,needs_changes:0,claims:0};
  for(const [idx,row] of rows.slice(1).entries()){
    assert.equal(row.length,7,"Invalid review row at "+String(idx+2));
    const [course,lesson,hash,status,reviewer,ref,notes]=row;
    const key=course+"/"+lesson;
    assert.ok(expected.has(key),"Unknown course or lesson "+key);
    assert.ok(!seen.has(key),"Duplicate review row "+key);
    seen.add(key);
    assert.equal(hash,expected.get(key),"Stale or edited content hash: "+key);
    assert.ok(["PENDING_HUMAN_REVIEW","NEEDS_CHANGES","CLAIMED_HUMAN_APPROVED"].includes(status),
      "Unsupported review status: "+key);
    // CSV exports may be opened by reviewers in Excel/LibreOffice. An
    // externally edited CSV must not bypass the offline UI's formula fence.
    const unsafeCell = value => /^\s*[=+\-@]/u.test(value)
      || /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u.test(value)
      || /[\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/u.test(value);
    assert.ok(typeof notes==="string" && notes.length<=2000 && !unsafeCell(notes),
      "Unsafe or oversized editorial notes: "+key);
    assert.ok(!unsafeCell(reviewer) && !/[\r\n\u2028\u2029]/u.test(reviewer),
      "Unsafe reviewer field: "+key);
    if(status==="PENDING_HUMAN_REVIEW"){
      assert.equal(reviewer,"","Pending row must not claim reviewer");
      assert.equal(ref,"","Pending row must not claim approval");
      counters.pending++;
    }else{
      assert.ok(typeof reviewer==="string"&&reviewer.trim().length>=3&&reviewer.length<=120,
        "Named editorial reviewer is required: "+key);
      assert.ok(/^https:\/\/github\.com\/rafhael100\/imagine-universidade\/(?:issues|pull)\/[1-9]\d*(?:#issuecomment-[1-9]\d*)?$/i.test(ref),
        "Review evidence reference must be in the Imagine Universidade repository: "+key);
      if(status==="NEEDS_CHANGES")counters.needs_changes++;
      else counters.claims++;
    }
  }
  assert.equal(seen.size,expected.size,"Every original lesson must be included");
  return {
    schema_version:1,
    course_count:source.courses.length,
    lesson_count:expected.size,
    pending:counters.pending,
    needs_changes:counters.needs_changes,
    claimed_human_approved:counters.claims,
    review_evidence_authenticated:false,
    publishable:false,
    release_decision:"HOLD_NO_GO",
    note:"Local schema/hash check ONLY. GitHub evidence, reviewer identity and signoff are not verified by this tool."
  };
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  assert.equal(process.argv[2],"--csv","Usage: --csv <review spreadsheet>");
  assert.equal(process.argv.length,4);
  const csv=await readFile(process.argv[3],"utf8");
  const source=await readFile(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8");
  console.log(JSON.stringify(inspectEditorialReview(csv,source),null,2));
}
