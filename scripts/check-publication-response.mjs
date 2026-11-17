#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";

// Execute the actual view functions and click handlers. The harness only
// supplies a tiny DOM, synthetic GET responses and captured writes/dialogs;
// it never duplicates the validation or publication decision logic.
const view=readFileSync(new URL("../resources/views/university/admin.blade.php",import.meta.url),"utf8");
function section(start,end){
  const a=view.indexOf(start),b=view.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,"Actual publication function boundaries must exist: "+start);
  return view.slice(a,b);
}
const source=[
  section("function clearPublicationCheck(){","function lockAccess("),
  section("function validatedPublicationCheck(","function renderPublicationCheck("),
  section("function renderPublicationCheck(","async function publicationCheck("),
  section("async function publicationCheck(",'$("course-form").addEventListener("input",clearPublicationCheck);'),
  section('$("check-publication").addEventListener("click",async()=>{',"function unpublishWarning("),
].join("\n");
const valid=()=>({course_id:1,version:2,lesson_count:1,ready:true,issues:[],
  warnings:[],content_hash:"a".repeat(64),advisory_only:true});
const clone=value=>JSON.parse(JSON.stringify(value));

function harness(initial=valid()){
  const nodes=new Map(),handlers=new Map();
  const node=id=>{
    if(!nodes.has(id))nodes.set(id,{hidden:true,children:[],value:"draft:"+id,
      replaceChildren(...items){this.children=items;},
      append(...items){this.children.push(...items);},
      addEventListener(event,fn){handlers.set(id+":"+event,fn);}});
    return nodes.get(id);
  };
  const observed={posts:[],dialogs:0,begins:0,finishes:0,freezes:0,refreshes:0,messages:[]};
  const control={reply:initial,accept:true,unsaved:false};
  const state={course:{id:1,is_published:false},accessDenied:false,writePending:false,preflightRequest:0};
  const context=createContext({state,$:node,
    el:(tag,text)=>({tag,text}),
    api:async(path,method="GET",payload=null)=>{
      if(method==="GET"&&path.endsWith("/publication-check")){
        if(typeof control.reply==="function")return control.reply();
        return control.reply;
      }
      assert.equal(method,"POST","Only publication may write in this harness");
      observed.posts.push({path,method,body:JSON.parse(JSON.stringify(payload))});
      return {published:true};
    },
    editorialHasUnsavedChanges:()=>control.unsaved,
    confirm:()=>{observed.dialogs++;return control.accept;},
    beginWrite:()=>{observed.begins++;state.writePending=true;return true;},
    finishWrite:()=>{observed.finishes++;state.writePending=false;},
    freezeUncertainEditorialWrite:()=>{observed.freezes++;},
    refreshCourses:async()=>{observed.refreshes++;},
    say:message=>{observed.messages.push(message);},
  });
  new Script(source,{filename:"actual-admin-publication-view"}).runInContext(context);
  const draftIds=["course-title","course-summary","lesson-title","lesson-body"];
  const originalDrafts=draftIds.map(id=>node(id).value);
  return {context,state,node,observed,control,
    clickPublish:()=>handlers.get("publish:click")(),
    clickCheck:()=>handlers.get("check-publication:click")(),
    assertDrafts:()=>assert.deepEqual(draftIds.map(id=>node(id).value),originalDrafts),
  };
}
let scenarios=0;
async function scenario(label,run){
  try{await run();}catch(error){error.message=label+": "+error.message;throw error;}
  scenarios++;
}
const invalid=[
  ["missing hash",p=>{delete p.content_hash;}],
  ["truncated hash",p=>{p.content_hash="a".repeat(63);}],
  ["non-hex hash",p=>{p.content_hash="g".repeat(64);}],
  ["non-string hash",p=>{p.content_hash={value:"a".repeat(64)};}],
  ["uppercase hash",p=>{p.content_hash="A".repeat(64);}],
  ["string false readiness",p=>{p.ready="false";}],
  ["numeric readiness",p=>{p.ready=1;}],
  ["different course",p=>{p.course_id=2;}],
  ["string course ID",p=>{p.course_id="1";}],
  ["zero version",p=>{p.version=0;}],
  ["fractional version",p=>{p.version=1.5;}],
  ["negative lesson count",p=>{p.lesson_count=-1;}],
  ["fractional lesson count",p=>{p.lesson_count=1.5;}],
  ["non-array issues",p=>{p.issues=null;}],
  ["non-array warnings",p=>{p.warnings={};}],
  ["ready despite issue",p=>{p.issues=["invalid_lesson"];}],
  ["not ready without issue",p=>{p.ready=false;}],
  ["ready without lessons",p=>{p.lesson_count=0;}],
  ["missing-lessons issue despite lessons",p=>{p.ready=false;p.issues=["missing_lessons"];}],
  ["invalid lesson in empty course",p=>{p.ready=false;p.lesson_count=0;p.issues=["missing_lessons","invalid_lesson"];}],
  ["unknown issue",p=>{p.ready=false;p.issues=["allow_publish"];}],
  ["duplicate issue",p=>{p.ready=false;p.issues=["not_draft","not_draft"];}],
  ["unknown warning",p=>{p.warnings=["approval_granted"];}],
  ["duplicate warning",p=>{p.warnings=["missing_optional_summary","missing_optional_summary"];}],
  ["non-advisory response",p=>{p.advisory_only=false;}],
  ["missing advisory flag",p=>{delete p.advisory_only;}],
];
for(const [label,alter] of invalid){
  await scenario(label,async()=>{
    const payload=valid();alter(payload);
    const h=harness(payload);
    assert.equal(h.context.validatedPublicationCheck(payload,1),null);
    h.node("publication-readiness").hidden=false;
    h.node("publication-readiness").append({text:"Previous readiness must disappear"});
    await h.clickPublish();
    assert.equal(h.observed.dialogs,0,"Invalid diagnostic must not ask to publish");
    assert.equal(h.observed.posts.length,0,"Invalid diagnostic must not produce a POST");
    assert.equal(h.observed.begins,0,"Invalid diagnostic must not start a write");
    assert.equal(h.observed.freezes,0,"An invalid read must not freeze editor drafts");
    assert.equal(h.node("publication-readiness").hidden,true);
    assert.equal(h.node("publication-readiness").children.length,0);
    assert.match(h.observed.messages.at(-1),/validar a conferência/);
    h.assertDrafts();
  });
}
await scenario("null and array diagnostic",async()=>{
  for(const payload of [null,[],"ready"]){
    const h=harness(payload);
    await h.clickPublish();
    assert.equal(h.observed.dialogs,0);
    assert.equal(h.observed.posts.length,0);
    assert.equal(h.node("publication-readiness").hidden,true);
  }
});
await scenario("valid advisory readiness reconstructs permitted fields",async()=>{
  const payload={...valid(),private_actor:"must-not-survive",authorization:true};
  payload.warnings=["missing_optional_summary"];
  const h=harness(payload);
  const normalized=h.context.validatedPublicationCheck(payload,1);
  assert.deepEqual(clone(normalized),{...valid(),warnings:["missing_optional_summary"]});
  assert.notEqual(normalized.issues,payload.issues);
  assert.notEqual(normalized.warnings,payload.warnings);
  assert.equal(h.context.validatedPublicationCheck(payload,2),null);
});
await scenario("valid non-ready states are informative and never publish",async()=>{
  for(const [count,issues] of [[0,["missing_lessons"]],[0,["not_draft","missing_lessons"]],
    [1,["not_draft"]],[1,["invalid_lesson"]]]){
    const h=harness({...valid(),ready:false,lesson_count:count,issues});
    await h.clickPublish();
    assert.equal(h.observed.dialogs,0);
    assert.equal(h.observed.posts.length,0);
    assert.equal(h.node("publication-readiness").hidden,false);
    assert.match(h.observed.messages.at(-1),/pendências/);
    h.assertDrafts();
  }
});
await scenario("valid read followed by malformed read clears old readiness and recovers manually",async()=>{
  const h=harness();
  await h.clickCheck();
  assert.equal(h.node("publication-readiness").hidden,false);
  h.control.reply={...valid(),content_hash:undefined};
  await h.clickCheck();
  assert.equal(h.node("publication-readiness").hidden,true);
  assert.equal(h.observed.posts.length,0);
  h.control.reply=valid();
  await h.clickCheck();
  assert.equal(h.node("publication-readiness").hidden,false);
  assert.equal(h.observed.dialogs,0);
  h.assertDrafts();
});
await scenario("failed GET removes old readiness without losing drafts",async()=>{
  const h=harness();
  await h.clickCheck();
  h.control.reply=()=>Promise.reject(new Error("Synthetic temporary read failure"));
  await h.clickCheck();
  assert.equal(h.node("publication-readiness").hidden,true);
  assert.equal(h.observed.posts.length,0);
  assert.equal(h.observed.dialogs,0);
  h.assertDrafts();
});
await scenario("valid publication sends the exact diagnostic hash once",async()=>{
  const h=harness({...valid(),content_hash:"b".repeat(64)});
  await h.clickPublish();
  assert.equal(h.observed.dialogs,1);
  assert.deepEqual(h.observed.posts,[{path:"/courses/1/publish",method:"POST",
    body:{expected_content_hash:"b".repeat(64)}}]);
  assert.equal(h.observed.begins,1);
  assert.equal(h.observed.finishes,1);
  assert.equal(h.observed.freezes,0);
  h.assertDrafts();
});
await scenario("cancelled confirmation never writes",async()=>{
  const h=harness();h.control.accept=false;
  await h.clickPublish();
  assert.equal(h.observed.dialogs,1);
  assert.equal(h.observed.posts.length,0);
  assert.equal(h.observed.begins,0);
  h.assertDrafts();
});
await scenario("late malformed response cannot replace newer valid readiness",async()=>{
  const h=harness();let release;
  h.control.reply=()=>new Promise(resolve=>{release=resolve;});
  const older=h.context.publicationCheck();
  h.control.reply=valid();
  await h.clickCheck();
  release({ready:"true"});
  assert.equal(await older,null);
  assert.equal(h.node("publication-readiness").hidden,false);
  assert.equal(h.observed.dialogs,0);
  assert.equal(h.observed.posts.length,0);
});
await scenario("editing while a diagnostic is pending invalidates its result",async()=>{
  const h=harness();let release;
  h.control.reply=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.context.publicationCheck();
  h.context.clearPublicationCheck();
  h.control.unsaved=true;
  release(valid());
  assert.equal(await pending,null);
  assert.equal(h.node("publication-readiness").hidden,true);
  assert.equal(h.observed.posts.length,0);
  h.assertDrafts();
});
console.log("PASS publication response: "+scenarios+" scenarios using actual view functions; malformed diagnostics never confirm or publish, legacy backend unchanged.");
