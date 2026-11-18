#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";

// Use the unchanged real browser parser. Backend normalization is covered by
// Feature/PG tests; no second timestamp converter is implemented in this test.
const view=readFileSync(new URL("../resources/views/university/student.blade.php",import.meta.url),"utf8");
const source=view.match(/function sanitizedProgressExport\(payload\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(source,"The actual private progress export parser must exist");
const parse=new Script(source+"\nsanitizedProgressExport",{filename:"actual-progress-export-dates"}).runInNewContext({});
const clone=value=>JSON.parse(JSON.stringify(value));
const reference=completed_at=>({course_slug:"curso-sintetico",course_version:1,lesson_slug:"aula-sintetica",completed_at});
const envelope=completions=>({schema_version:1,scope:"current_authenticated_student",completions});
let scenarios=0;
function scenario(label,run){try{run();}catch(error){throw new Error(label,{cause:error});}scenarios++;}

scenario("canonical UTC references from the backend are accepted unchanged",()=>{
  const expected=envelope([reference("2026-11-17T10:00:00Z"),reference("2025-12-31T22:30:00Z")]);
  assert.deepEqual(clone(parse(expected)),expected);
});
scenario("short and compact database offsets still require server normalization",()=>{
  for(const date of ["2026-11-17 10:00:00+00","2026-11-17 13:00:00+03","2026-11-17 13:30:00+0330"])
    assert.equal(parse(envelope([reference(date)])),null);
});
scenario("existing v1 date representations remain accepted without weakening the UI parser",()=>{
  for(const date of ["2026-11-17 10:00:00","2026-11-17T13:00:00+03:00","2026-11-17T10:00:00.123456Z"]){
    const expected=envelope([reference(date)]);assert.deepEqual(clone(parse(expected)),expected);
  }
});
scenario("malformed date types or syntax refuse a complete download instead of returning partial rows",()=>{
  for(const date of [null,12,"invalid","2026-11-17T10:00:00Z extra","2026-11-17T10:00:00.1234567Z"])
    assert.equal(parse(envelope([reference("2026-11-17T10:00:00Z"),reference(date)])),null);
});
scenario("normalization does not expand the private export allowlist",()=>{
  const expected=envelope([reference("2026-11-17T10:00:00Z")]);
  const extra={...expected,company_id:"excluded",completions:[{...expected.completions[0],
    subject_key:"excluded",lesson_id:1,course_id:2,title:"excluded",body:"excluded",availability:"available"}]};
  assert.deepEqual(clone(parse(extra)),expected);
});
scenario("schema and authenticated-student scope remain exact",()=>{
  for(const patch of [{schema_version:2},{schema_version:"1"},{scope:"another_student"},{completions:null}])
    assert.equal(parse({...envelope([]),...patch}),null);
});
scenario("empty and complete 5000-row files stay valid but overflow is not truncated",()=>{
  assert.deepEqual(clone(parse(envelope([]))),envelope([]));
  const rows=Array.from({length:5000},(_,index)=>({...reference("2026-11-17T10:00:00Z"),lesson_slug:"aula-"+(index+1)}));
  assert.equal(parse(envelope(rows)).completions.length,5000);
  assert.equal(parse(envelope([...rows,{...rows[0],lesson_slug:"aula-5001"}])),null);
});
console.log("PASS progress export timestamps: "+scenarios+" real-parser scenarios; canonical UTC acceptance, unchanged date syntax, private allowlist and complete-file bounds");
