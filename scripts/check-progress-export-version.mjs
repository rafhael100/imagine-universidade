#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";

// Execute the actual sanitizer and explicit download handler. JSON.parse is
// used for every payload; only HTTP and browser download primitives are fake.
// This check starts no application, browser, database or external service.
const view=readFileSync(new URL("../resources/views/university/student.blade.php",import.meta.url),"utf8");
const sanitizer=view.match(/function sanitizedProgressExport\(payload\)\{[\s\S]*?\n\}/)?.[0];
const clickHandler=view.match(/document\.getElementById\("export-progress"\)\.addEventListener\("click",async\(\)=>\{[\s\S]*?\n\}\);/)?.[0];
assert.ok(sanitizer,"The actual progress export sanitizer must exist");
assert.ok(clickHandler,"The actual explicit progress export handler must exist");
const context=createContext({});
new Script(sanitizer,{filename:"actual-progress-export-sanitizer"}).runInContext(context);
const sanitize=json=>context.sanitizedProgressExport(JSON.parse(json));
const plain=value=>JSON.parse(JSON.stringify(value));
const row={course_slug:"qa-history-volume",course_version:1000001,lesson_slug:"lesson-1",
  completed_at:"2026-11-17T10:00:00Z"};
const payload=(completions=[{...row}])=>({schema_version:1,scope:"current_authenticated_student",completions});
const versionJson=literal=>'{"schema_version":1,"scope":"current_authenticated_student","completions":['+
  '{"course_slug":"qa-history-volume","course_version":'+literal+
  ',"lesson_slug":"lesson-1","completed_at":"2026-11-17T10:00:00Z"}]}';
let scenarios=0;
async function scenario(label,run){
  try{await run();}catch(error){error.message=label+": "+error.message;throw error;}
  scenarios++;
}

// These are browser representation boundaries, not new database limits.
for(const [literal,expected] of [
  ["1",1],["1000000",1000000],["1000001",1000001],
  ["2147483647",2147483647],["2147483648",2147483648],["4294967295",4294967295],
  ["9007199254740990",Number.MAX_SAFE_INTEGER-1],["9007199254740991",Number.MAX_SAFE_INTEGER],
  ["1000001.0",1000001],["1.000001e6",1000001],["9.007199254740991e15",Number.MAX_SAFE_INTEGER],
]){
  await scenario("positive safe JSON version "+literal+" is preserved exactly",()=>{
    const result=sanitize(versionJson(literal));
    assert.ok(result);
    assert.equal(result.completions[0].course_version,expected);
    assert.deepEqual(plain(result),payload([{...row,course_version:expected}]));
  });
}
for(const literal of ["0","-0","-1","0.5","1000001.5","9007199254740992",
  "9007199254740993","1e309",'"1000001"',"null","true","false","[]","{}"]){
  await scenario("unsafe or noninteger JSON version "+literal+" rejects the complete file",()=>{
    assert.equal(sanitize(versionJson(literal)),null);
  });
}
await scenario("a missing version is still rejected",()=>{
  const missing={...row};delete missing.course_version;
  assert.equal(sanitize(JSON.stringify(payload([missing]))),null);
});
await scenario("the allowlist removes identities and content without mutating the parsed input",()=>{
  const input=JSON.parse(JSON.stringify({...payload(),company_id:44,subject_key:"synthetic-owner",
    email:"synthetic@example.invalid",completions:[{...row,course_id:7,lesson_id:9,company_id:44,
      subject_key:"synthetic-owner",title:"Extra title",body:"Extra content"}]}));
  const before=JSON.stringify(input);
  assert.deepEqual(plain(context.sanitizedProgressExport(input)),payload());
  assert.equal(JSON.stringify(input),before);
});
await scenario("schema, scope and array requirements remain strict",()=>{
  for(const input of [null,[],{}, {...payload(),schema_version:"1"},{...payload(),schema_version:2},
    {...payload(),scope:"another_student"},{...payload(),scope:null},
    {...payload(),completions:null},{...payload(),completions:{}}]){
    assert.equal(sanitize(JSON.stringify(input)),null);
  }
});
await scenario("slug and timestamp rejection rules are unchanged",()=>{
  for(const item of [
    {...row,course_slug:"tenant/other"},{...row,course_slug:"a".repeat(121)},
    {...row,lesson_slug:"Aula"},{...row,lesson_slug:"a".repeat(121)},
    {...row,completed_at:"yesterday"},{...row,completed_at:null},
    {...row,completed_at:"2026-11-17T10:00:00.1234567Z"},
    {...row,completed_at:"2026-11-17 10:00:00+00"},{...row,completed_at:"1".repeat(41)},
  ])assert.equal(sanitize(JSON.stringify(payload([item]))),null);
});
await scenario("accepted timestamp strings are copied literally, without conversion",()=>{
  for(const completed_at of ["2026-11-17","2026-11-17 10:00:00",
    "2026-11-17T10:00:00Z","2026-11-17T13:30:00.123456+03:30"]){
    const expected=payload([{...row,completed_at}]);
    assert.deepEqual(plain(sanitize(JSON.stringify(expected))),expected);
  }
});
await scenario("5000 high-version references are valid and 5001 rejects the whole history",()=>{
  const rows=Array.from({length:5000},(_,index)=>({...row,lesson_slug:"lesson-"+(index+1)}));
  const valid=sanitize(JSON.stringify(payload(rows)));
  assert.equal(valid.completions.length,5000);
  assert.deepEqual(plain(valid.completions[4999]),rows[4999]);
  assert.equal(sanitize(JSON.stringify(payload([...rows,{...row,lesson_slug:"lesson-5001"}]))),null);
});
await scenario("an empty authorized history remains an empty portable file",()=>{
  assert.deepEqual(plain(sanitize(JSON.stringify(payload([])))),payload([]));
});
await scenario("one unsafe version does not produce a partial download payload",()=>{
  const input=payload([{...row},{...row,lesson_slug:"lesson-2",course_version:9007199254740992}]);
  assert.equal(sanitize(JSON.stringify(input)),null);
});

function downloadHarness(json){
  const state={accessDenied:false,libraryReady:true,exportLoading:false};
  const control={json,wait:null};
  const calls=[],messages=[],downloads=[],objects=new Map(),revoked=[],timers=[],links=[];
  const button={disabled:false,handler:null,addEventListener(event,handler){
    assert.equal(event,"click");this.handler=handler;
  }};
  const document={getElementById(id){assert.equal(id,"export-progress");return button;},
    body:{append(link){link.connected=true;}},
    createElement(tag){
      assert.equal(tag,"a");
      const link={connected:false,removed:false,click(){
        assert.equal(this.connected,true);
        downloads.push({filename:this.download,blob:objects.get(this.href)});
      },remove(){this.connected=false;this.removed=true;}};
      links.push(link);return link;
    }};
  const environment=createContext({state,document,Blob,
    api:async(...args)=>{calls.push(args);if(control.wait)await control.wait;return JSON.parse(control.json);},
    say:message=>messages.push(message),
    URL:{createObjectURL(blob){
      const url="blob:synthetic-progress-"+(objects.size+1);objects.set(url,blob);return url;
    },revokeObjectURL:url=>revoked.push(url)},
    setTimeout(fn,ms){timers.push({fn,ms});return timers.length;},
  });
  new Script(sanitizer+"\n"+clickHandler,{filename:"actual-progress-export-click"}).runInContext(environment);
  return {state,control,button,calls,messages,downloads,objects,revoked,timers,links,
    click:()=>button.handler(),output:async()=>JSON.parse(await downloads[0].blob.text())};
}
await scenario("the actual click downloads the sanitized high-version JSON and releases its object URL",async()=>{
  const input={...payload(),company_id:44,subject_key:"synthetic-owner",
    completions:[{...row,course_id:7,lesson_id:9,title:"Extra title",body:"Extra content"}]};
  const h=downloadHarness(JSON.stringify(input));
  assert.equal(h.calls.length,0);
  await h.click();
  assert.deepEqual(h.calls,[["/progress/export"]]);
  assert.equal(h.downloads.length,1);
  assert.equal(h.downloads[0].filename,"imagine-universidade-progresso.json");
  assert.equal(h.downloads[0].blob.type,"application/json");
  assert.deepEqual(await h.output(),payload());
  assert.equal(h.links[0].removed,true);
  assert.equal(h.timers.length,1);assert.equal(h.timers[0].ms,1000);
  h.timers[0].fn();assert.deepEqual(h.revoked,[...h.objects.keys()]);
  assert.equal(h.state.exportLoading,false);assert.equal(h.button.disabled,false);
  assert.match(h.messages.at(-1),/Arquivo de progresso preparado/);
});
await scenario("an unsafe response creates no download and a valid manual retry succeeds without replay",async()=>{
  const h=downloadHarness(versionJson("9007199254740992"));
  await h.click();
  assert.equal(h.calls.length,1);assert.equal(h.downloads.length,0);assert.equal(h.objects.size,0);
  assert.equal(h.state.exportLoading,false);assert.equal(h.button.disabled,false);
  assert.match(h.messages.at(-1),/não passou na validação de privacidade/);
  h.control.json=versionJson("1000001");
  assert.equal(h.calls.length,1);
  await h.click();
  assert.equal(h.calls.length,2);assert.equal(h.downloads.length,1);
  assert.deepEqual(await h.output(),payload());
});
await scenario("an already-started high-version export cannot download after access denial",async()=>{
  const h=downloadHarness(versionJson("1000001"));
  let release;h.control.wait=new Promise(resolve=>{release=resolve;});
  const pending=h.click();
  assert.equal(h.calls.length,1);assert.equal(h.state.exportLoading,true);
  h.state.accessDenied=true;release();await pending;
  assert.equal(h.downloads.length,0);assert.equal(h.objects.size,0);
  assert.equal(h.state.exportLoading,false);assert.equal(h.button.disabled,true);
  assert.equal(h.messages.length,0);
});
await scenario("a repeated click during the request remains single-flight",async()=>{
  const h=downloadHarness(versionJson("1000001"));
  let release;h.control.wait=new Promise(resolve=>{release=resolve;});
  const pending=h.click();await h.click();
  assert.equal(h.calls.length,1);assert.equal(h.state.exportLoading,true);
  release();await pending;
  assert.equal(h.downloads.length,1);assert.deepEqual(await h.output(),payload());
});
console.log("PASS C135 progress export version: "+scenarios+" actual sanitizer/handler scenarios");
