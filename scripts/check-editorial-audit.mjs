#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// The complete actual editor registers the tested click handlers. Only the
// DOM and HTTP boundary are synthetic; no audit validator is copied here.
const view=readFileSync(new URL("../resources/views/university/admin.blade.php",import.meta.url),"utf8");
const start=view.indexOf('"use strict";'),end=view.lastIndexOf("</script>");
const boot='loadAdminCatalog();\n(async()=>{try{await refreshAudit();}catch(error){say(error.message);}})();';
assert.ok(start>=0&&end>start&&view.slice(start,end).includes(boot));
const source=view.slice(start,end).replace(boot,"")+"\nglobalThis.editor={state,validatedEditorialAuditPage,refreshAudit,lockAccess,api};";
const clone=value=>JSON.parse(JSON.stringify(value));
const fields=["course-title","course-slug","course-category","course-summary","course-sort",
  "lesson-title","lesson-slug","lesson-body","lesson-sort"];
const event=(id=2147483700)=>({id,action:"course.updated",resource_kind:"course",resource_id:12,
  authority_revision:1,occurred_at:"2026-11-18 10:00:00+00"});
const page=(count=50,first=2147483750,more=true)=>({events:Array.from({length:count},(_,index)=>event(first-index)),
  next_before_id:more&&count===50?first-count+1:null});
const empty=()=>({events:[],next_before_id:null});
const ok=payload=>({status:200,payload});
function deferred(){let release;const promise=new Promise(resolve=>{release=resolve;});return {promise,release};}
async function bounded(promise){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{
  timer=setTimeout(()=>reject(new Error("Audit fixture did not reach its expected boundary")),1000);
})]);}finally{clearTimeout(timer);}}

function harness(){
  const nodes=new Map(),requests=[],created=[];
  function element(tagName="DIV",id=""){
    const node={tagName,id,value:"",ownText:"",disabled:false,hidden:false,inert:false,dataset:{},attributes:{},children:[],events:new Map(),parent:null,
      get isConnected(){return Boolean(this.id)||Boolean(this.parent?.isConnected);},
      all(){return this.children.flatMap(child=>[child,...child.all()]);},
      contains(child){return child===this||this.all().includes(child);},
      get textContent(){return this.ownText+this.children.map(child=>child.textContent).join("");},
      set textContent(value){this.replaceChildren();this.ownText=String(value);},
      append(...children){for(const child of children){child.parent=this;this.children.push(child);}},
      replaceChildren(...children){for(const child of this.children)child.parent=null;this.ownText="";this.children=[];this.append(...children);},
      setAttribute(name,value){this.attributes[name]=String(value);},
      addEventListener(type,handler){const list=this.events.get(type)||[];list.push(handler);this.events.set(type,list);},
      querySelectorAll(selector){
        if(id==="lesson-form")return fields.slice(5).map(get);
        if(selector.startsWith("[data-")){
          const key=selector.slice(6,-1).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
          return this.all().filter(child=>Object.hasOwn(child.dataset,key));
        }
        return [];
      },
      focus(){},scrollIntoView(){},reset(){},
    };
    created.push(node);return node;
  }
  for(const match of view.slice(0,start).matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
    const node=element(match[1].toUpperCase(),match[2]);nodes.set(node.id,node);
    node.hidden=/\bhidden\b/.test(match[0]);node.disabled=/\bdisabled\b/.test(match[0]);
  }
  function get(id){assert.ok(nodes.has(id),"The actual view contains #"+id);return nodes.get(id);}
  const layout=element("DIV","layout"),control={reply:ok(page()),hook:null};
  const document={getElementById:get,createElement:tag=>element(tag.toUpperCase()),
    querySelector:selector=>selector.startsWith("meta")?{content:"synthetic-csrf"}:layout,
    querySelectorAll:()=>[...fields,"course-save","lesson-save","new-course","refresh-audit","load-more-audit"].map(get)};
  const context=createContext({document,window:{addEventListener(){}},confirm:()=>false,setTimeout,clearTimeout,
    fetch:async(url,options)=>{
      const entry={path:url.replace("/universidade/private/admin",""),...options};requests.push(entry);
      const result=(control.hook?await control.hook(entry):undefined)??control.reply;
      return {status:result.status,ok:result.status>=200&&result.status<300,
        json:async()=>result.json?await result.json():clone(result.payload)};
    }});
  new Script(source,{filename:"actual-admin-editorial-audit"}).runInContext(context);
  const editor=context.editor;
  Object.assign(editor.state,{catalogReady:true,lessonsReady:true,course:{id:1,title:"Curso salvo",category:"metodologia"},
    lesson:{id:11,title:"Aula salva"},lessons:[{id:11,title:"Aula salva"}]});
  fields.forEach((id,index)=>{get(id).value=id==="course-category"?"metodologia":"  Rascunho literal "+index+"  ";});
  get("status").textContent="Mensagem do editor preservada.";
  async function click(id){for(const handler of get(id).events.get("click")||[])
    await handler({target:get(id),preventDefault(){}});await setImmediate();}
  async function settled(){for(let turn=0;turn<20;turn++){await setImmediate();if(!editor.state.auditLoading)return;}
    throw new Error("Audit handler remained unexpectedly pending");}
  return {editor,state:editor.state,get,control,requests,created,click,settled,
    read:async(id="refresh-audit")=>{await click(id);await settled();},
    fields:()=>fields.map(id=>get(id).value),writes:()=>requests.filter(row=>row.method!=="GET")};
}
const parser=harness().editor.validatedEditorialAuditPage;
let scenarios=0;
async function scenario(label,run){try{await run();}catch(error){error.message=label+": "+error.message;throw error;}scenarios++;}

await scenario("allowlist retains a complete large-id page without actor or arbitrary response data",()=>{
  const input=page();input.operator="PRIVATE-OPERATOR";input.events[0].actor_key="PRIVATE-OPERATOR";
  input.events[0].authority_revision="ignored-not-displayed";const saved=clone(input),result=parser(input);
  assert.equal(result.events.length,50);assert.equal(result.next_before_id,2147483701);
  assert.deepEqual(Object.keys(result.events[0]),["id","action","resource_kind","resource_id","occurred_at"]);
  assert.ok(!JSON.stringify(result).includes("PRIVATE-"));assert.deepEqual(input,saved);
});
await scenario("empty and full terminal pages are valid without fabricating a continuation",()=>{
  assert.equal(JSON.stringify(parser(empty())),JSON.stringify(empty()));
  assert.equal(parser(page(50,9007199254740991,false)).next_before_id,null);
});
await scenario("native SQL and ISO timestamps remain exact text without assuming a timezone",()=>{
  for(const value of ["2026-11-18 10:00:00","2026-11-18 10:00:00+00","2026-11-18 10:00:00.123456+03:30",
    "2026-11-18T10:00:00Z","2026-11-18T10:00:00","2024-02-29T10:00:00-0300"]){
    const input=page(1);input.events[0].occurred_at=value;assert.equal(parser(input).events[0].occurred_at,value);
  }
});
for(const [label,input] of [["missing envelope",null],["array envelope",[]],["missing fields",{}],
  ["missing events",{next_before_id:null}],["null events",{events:null,next_before_id:null}],
  ["missing cursor",{events:[]}],["more than fifty events",page(51)]]){
  await scenario(label+" is not an empty history",()=>assert.equal(parser(input),null));
}
await scenario("every displayed event and its id must be complete before any row is accepted",()=>{
  for(const [key,value] of [["id",0],["id","2147483700"],["id",Number.MAX_SAFE_INTEGER+1],["resource_id",-1],
    ["resource_id","12"],["action",null],["action"," "],["action","a".repeat(49)],
    ["resource_kind",{}],["resource_kind","a".repeat(25)],["occurred_at",null],
    ["occurred_at","2026-02-30 10:00:00"],["occurred_at","2026-11-18 25:00:00"],
    ["occurred_at","2026-11-18 10:00:00+99"],["occurred_at","not a date"]]){
    const input=page();input.events[49][key]=value;assert.equal(parser(input),null,key+"="+String(value));
  }
  const input=page();delete input.events[49].action;assert.equal(parser(input),null);
});
await scenario("duplicate ascending or nonexclusive ids cannot continue an existing history",()=>{
  const duplicate=page();duplicate.events[49].id=duplicate.events[0].id;assert.equal(parser(duplicate),null);
  const ascending=page();ascending.events.reverse();assert.equal(parser(ascending),null);
  assert.equal(parser(page(1,20),20),null);
  assert.equal(parser(page(1,19),20,[event(19)]),null);
  assert.equal(parser(page(1,19),20,[event(20)]).events[0].id,19);
});
await scenario("continuation must be the final id of a full page",()=>{
  for(const cursor of [0,"2147483701",2147483750,2147483700,Number.MAX_SAFE_INTEGER+1]){
    const input=page();input.next_before_id=cursor;assert.equal(parser(input),null);
  }
  assert.equal(parser({events:[],next_before_id:1}),null);
  assert.equal(parser({events:[event(20)],next_before_id:20}),null);
});
await scenario("the real click consumes two pages above int4 with exact exclusive cursor and no automatic third GET",async()=>{
  const h=harness(),drafts=h.fields(),selection=[h.state.course.id,h.state.lesson.id];
  await h.read();assert.equal(h.get("audit-items").children.length,50);assert.equal(h.get("load-more-audit").disabled,false);
  h.control.reply=ok(page(1,2147483700,false));await h.read("load-more-audit");
  assert.deepEqual(h.requests.map(row=>row.path),["/audit","/audit?before_id=2147483701"]);
  assert.equal(h.state.auditEvents.length,51);assert.equal(h.get("load-more-audit").disabled,true);
  assert.deepEqual(h.fields(),drafts);assert.deepEqual([h.state.course.id,h.state.lesson.id],selection);
  assert.equal(h.get("status").textContent,"Mensagem do editor preservada.");assert.equal(h.writes().length,0);
  for(const request of h.requests){assert.equal(request.credentials,"same-origin");assert.equal(request.cache,"no-store");assert.equal(request.body,undefined);}
});
await scenario("a valid empty first page alone may say no recorded changes",async()=>{
  const h=harness();h.control.reply=ok(empty());await h.read();
  assert.ok(h.get("audit-items").textContent.includes("Nenhuma alteração editorial registrada."));
  assert.equal(h.state.auditLoaded,true);assert.equal(h.get("load-more-audit").disabled,true);
});
for(const [label,reply] of [["missing envelope",ok({})],["null events",ok({events:null,next_before_id:null})],
  ["503",{status:503,payload:{error:"private detail"}}],["invalid JSON",{status:200,json:async()=>{throw new Error("PRIVATE BODY");}}]]){
  await scenario(label+" clears only history and manual retry recovers",async()=>{
    const h=harness(),drafts=h.fields();await h.read();h.control.reply=reply;await h.read();
    assert.equal(h.state.auditLoaded,false);assert.equal(h.get("audit-items").textContent,"");
    assert.ok(h.get("audit-status").textContent.includes("indisponível"));assert.ok(!h.get("audit-status").textContent.includes("PRIVATE"));
    assert.equal(h.get("refresh-audit").disabled,false);assert.equal(h.get("load-more-audit").disabled,true);
    assert.deepEqual(h.fields(),drafts);assert.equal(h.requests.length,2);
    h.control.reply=ok(page(1));await h.read();assert.equal(h.get("audit-items").children.length,1);
    assert.equal(h.state.auditLoaded,true);assert.equal(h.requests.length,3);assert.equal(h.writes().length,0);
  });
}
await scenario("a malformed tail never partially appends or silently claims the end of history",async()=>{
  const h=harness();await h.read();const tail=page(2,2147483700,false);delete tail.events[1].resource_kind;
  h.control.reply=ok(tail);await h.read("load-more-audit");
  assert.equal(h.state.auditEvents.length,0);assert.equal(h.state.auditNextBeforeId,null);
  assert.equal(h.get("audit-items").children.length,0);assert.ok(h.get("audit-status").textContent.includes("indisponível"));
  h.control.reply=ok(page(2));await h.read();assert.equal(h.requests.at(-1).path,"/audit");
  assert.equal(h.state.auditEvents.length,2);
});
await scenario("text rendering never interprets event markup or exposes extra actor data",async()=>{
  const h=harness(),input=page(1);input.events[0].action="<img src=x onerror=alert(1)>";
  input.events[0].actor_key="PRIVATE-OPERATOR";h.control.reply=ok(input);await h.read();
  assert.ok(h.get("audit-items").textContent.includes(input.events[0].action));
  assert.ok(!h.get("audit-items").textContent.includes("PRIVATE-OPERATOR"));
  assert.ok(h.get("audit-items").all().every(node=>node.tagName!=="IMG"));
});
await scenario("pending reads block repeated gestures and reject a stale cursor without any write",async()=>{
  const h=harness(),gate=deferred(),seen=deferred();h.control.hook=async()=>{seen.release();await gate.promise;return ok(page());};
  const first=h.click("refresh-audit");await bounded(seen.promise);await h.click("refresh-audit");await h.click("load-more-audit");
  assert.equal(h.requests.length,1);assert.equal(h.get("refresh-audit").disabled,true);assert.equal(h.get("load-more-audit").disabled,true);
  gate.release();await first;await h.settled();await h.editor.refreshAudit(999);
  assert.equal(h.requests.length,1);assert.equal(h.get("refresh-audit").disabled,false);
});
await scenario("an independent history retry cannot clear the editorial uncertain-write fence",async()=>{
  const h=harness(),drafts=h.fields();h.state.writeOutcomeUnknown=true;h.state.catalogReady=false;
  await h.read();assert.equal(h.state.writeOutcomeUnknown,true);assert.equal(h.state.catalogReady,false);
  assert.deepEqual(h.fields(),drafts);assert.equal(h.writes().length,0);
});
for(const status of [403,419]){
  await scenario(status+" purges loaded history and keeps every audit action disabled",async()=>{
    const h=harness();await h.read();h.control.reply={status,payload:{error:"ignored"}};await h.read();
    assert.equal(h.state.accessDenied,true);assert.equal(h.state.auditEvents.length,0);assert.equal(h.state.auditNextBeforeId,null);
    assert.equal(h.get("audit-items").textContent,"");assert.equal(h.get("audit-status").textContent,"");
    assert.equal(h.get("refresh-audit").disabled,true);assert.equal(h.get("load-more-audit").disabled,true);
    const count=h.requests.length;await h.click("refresh-audit");assert.equal(h.requests.length,count);
  });
}
for(const phase of ["response","json"]){
  await scenario("late "+phase+" after a separate revocation cannot restore history or controls",async()=>{
    const h=harness(),gate=deferred(),seen=deferred();
    h.control.hook=async entry=>{
      if(entry.path==="/courses")return {status:403,payload:{error:"access_denied"}};
      if(phase==="response"){seen.release();await gate.promise;return ok(page());}
      return {status:200,json:async()=>{seen.release();await gate.promise;return page();}};
    };
    await h.click("refresh-audit");await bounded(seen.promise);
    await assert.rejects(h.editor.api("/courses"));gate.release();await h.settled();await setImmediate();
    assert.equal(h.state.accessDenied,true);assert.equal(h.state.auditEvents.length,0);
    assert.equal(h.get("audit-items").textContent,"");assert.equal(h.get("audit-status").textContent,"");
    assert.equal(h.get("refresh-audit").disabled,true);assert.equal(h.get("load-more-audit").disabled,true);
  });
}
console.log(`PASS editorial audit: ${scenarios} real-script scenarios`);
