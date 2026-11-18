#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {setImmediate} from "node:timers/promises";

// Actual view helpers, API functions and revocation handlers. Native web
// streams exercise EOF and cancellation; controlled readers exercise hangs
// and late failures. No server, browser, Portal or external request is used.
const views=Object.fromEntries(["student","admin"].map(name=>[name,
  readFileSync(new URL("../resources/views/university/"+name+".blade.php",import.meta.url),"utf8")]));
function actual(view,name){
  const source=view.match(new RegExp("(?:async )?function "+name+"\\([^\\n]*\\)\\{[\\s\\S]*?\\n\\}"))?.[0];
  assert.ok(source,"Missing actual function: "+name);return source;
}
assert.equal(actual(views.student,"discardErrorBody"),actual(views.admin,"discardErrorBody"),
  "Both interfaces must use the same bounded cleanup");
function element(tagName="DIV"){
  return {tagName,ownText:"",children:[],value:"",disabled:false,hidden:false,inert:false,attributes:{},
    get textContent(){return this.ownText+this.children.map(child=>child.textContent).join("");},
    set textContent(value){this.ownText=String(value);this.children=[];},
    append(...children){this.children.push(...children);},
    replaceChildren(...children){this.ownText="";this.children=children;},
    setAttribute(name,value){this.attributes[name]=String(value);},
  };
}
function harness(name){
  const view=views[name],nodes=new Map(),timers=new Map(),delays=[],requests=[];
  const calls={logs:0,storage:0,decode:0};let timerId=0;
  const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
  const control={response:null};
  const extra=name==="admin"?["hideLessonPreview","clearPublicationCheck","invalidateEditorialOverview","renderEditorialOverview",
    "archivePositive","editorialArchiveAllowed","clearEditorialArchiveSelection","invalidateEditorialArchive","renderEditorialArchive",
    "editorialCourseFiltersAllowed","renderEditorialCourseFilters","editorialLessonListReady",
    "editorialLessonFiltersAllowed","renderEditorialLessonFilters","filteredEditorialLessons","normalizeEditorialSearch"]:
    ["invalidateRetainedFavorites","renderRetainedFavorites","contextualCourses","renderContextualCourses",
      "normalizeSearchText","lessonFilterCurrent","resetLessonFilter","renderLessonFilter","renderCourseGuidance",
      "invalidateLessonSearch","renderLessonSearchControls",
      "invalidateProgressHistory","renderProgressHistory","invalidateNavigationFocus"];
  const source=["discardErrorBody","api","el","say","lockAccess",...extra].map(fn=>actual(view,fn)).join("\n");
  const initial=view.match(/const state=(\{[\s\S]*?\});/)?.[1];assert.ok(initial);
  const context=createContext({
    root:"/universidade/private",base:"/universidade/private/admin",csrf:"synthetic-csrf",$:get,navigationFocus:{sequence:0,activity:0},
    note:get("status"),status:get("status"),list:get("course-list"),lessonsBox:get("lesson-items"),
    content:get("lesson-content"),overall:get("overall-progress"),
    document:{getElementById:get,createElement:tag=>element(tag.toUpperCase()),
      querySelector:()=>get("layout"),querySelectorAll:()=>Array.from(nodes.values())},
    setTimeout:(fn,delay)=>{const id=++timerId;timers.set(id,fn);delays.push(delay);return id;},
    clearTimeout:id=>timers.delete(id),
    console:Object.fromEntries(["log","warn","error","info","debug"].map(key=>[key,()=>{calls.logs++;}])),
    localStorage:{setItem(){calls.storage++;}},sessionStorage:{setItem(){calls.storage++;}},
    TextDecoder:class{constructor(){calls.decode++;throw new Error("Unexpected decoding");}},
    fetch:async(url,options)=>{requests.push({url,...options});return control.response;},
  });
  new Script("globalThis.state="+initial+";\n"+source,{filename:"actual-"+name+"-error-cleanup"}).runInContext(context);
  context.state.libraryReady=true;context.state.catalogReady=true;
  context.state.courses=[{id:1}];context.state.course={id:1};context.state.lessons=[{id:11}];context.state.lesson={id:11};
  get("course-title").value="Private draft";get("lesson-body").value="Private lesson body";
  get("lesson-content").textContent="Private current lesson";
  return {context,state:context.state,get,control,requests,timers,delays,calls,
    cleanup:response=>context.discardErrorBody(response),api:()=>context.api("/synthetic-error"),
    expire:()=>{for(const callback of Array.from(timers.values()))callback();}};
}
function nativeResponse(chunks,status=503){
  const response=new Response(new ReadableStream({start(controller){
    for(const chunk of chunks)controller.enqueue(chunk);controller.close();
  }}),{status,headers:{"Content-Type":"application/json"}});
  const stats={reads:0,cancels:0,releases:0,interpreted:0};
  const getReader=response.body.getReader.bind(response.body);
  response.body.getReader=()=>{
    const reader=getReader();
    return {read:()=>{stats.reads++;return reader.read();},cancel:()=>{stats.cancels++;return reader.cancel();},
      releaseLock:()=>{stats.releases++;return reader.releaseLock();}};
  };
  for(const method of ["json","text","arrayBuffer","blob","formData","clone"]){
    response[method]=()=>{stats.interpreted++;throw new Error("Private error body must not be interpreted");};
  }
  return {response,stats};
}
function controlledResponse({read=()=>Promise.resolve({done:true}),cancel=()=>Promise.resolve(),release=()=>{},status=503}={}){
  const stats={reads:0,cancels:0,releases:0,interpreted:0};
  return {stats,response:{status,ok:status>=200&&status<300,
    body:{getReader:()=>({read:()=>{stats.reads++;return read();},
      cancel:()=>{stats.cancels++;return cancel();},releaseLock:()=>{stats.releases++;return release();}})},
    json:()=>{stats.interpreted++;throw new Error("Private error body must not be parsed");},
  }};
}
async function bounded(promise){
  let timer;
  try{return await Promise.race([promise,new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new Error("Cleanup/API did not settle without awaiting a pending body")),1000);
  })]);}finally{clearTimeout(timer);}
}
const bytes=text=>new TextEncoder().encode(text);
let scenarios=0,unhandled=0;
const onUnhandled=()=>{unhandled++;};process.on("unhandledRejection",onUnhandled);
async function scenario(name,label,run){
  try{await run();await setImmediate();assert.equal(unhandled,0,"No late cleanup rejection may be unhandled");}
  catch(error){error.message=name+" "+label+": "+error.message;throw error;}
  scenarios++;
}
try{
  for(const name of ["student","admin"]){
    await scenario(name,"drains a small native JSON body to EOF without decoding or cancellation",async()=>{
      const h=harness(name),r=nativeResponse([bytes('{"error":'),bytes('"synthetic-private-detail"}')]);
      await bounded(h.cleanup(r.response));
      assert.equal(r.response.bodyUsed,true);assert.equal(r.response.body.locked,false);
      assert.deepEqual(r.stats,{reads:3,cancels:0,releases:1,interpreted:0});
      assert.deepEqual(h.delays,[2000]);assert.equal(h.timers.size,0);
      assert.deepEqual(h.calls,{logs:0,storage:0,decode:0});
      assert.equal(h.get("status").textContent,"");assert.equal(h.get("lesson-content").textContent,"Private current lesson");
    });
    await scenario(name,"missing Response.body and unavailable readers are safe no-ops",async()=>{
      const h=harness(name);
      for(const response of [undefined,null,{}, {body:null},{body:{}},{body:{getReader:1}}])await bounded(h.cleanup(response));
      assert.equal(h.delays.length,0);assert.equal(h.timers.size,0);
    });
    await scenario(name,"a locked native body is left with its original reader",async()=>{
      const h=harness(name),response=new Response("synthetic-private-detail",{status:503});
      const original=response.body.getReader();await bounded(h.cleanup(response));
      assert.equal(response.body.locked,true);assert.equal(h.delays.length,0);
      await original.cancel();original.releaseLock();
    });
    for(const length of [16384,16385])await scenario(name,"cancels at the byte threshold without requesting another chunk: "+length,async()=>{
      const h=harness(name),r=nativeResponse([new Uint8Array(length),bytes("must not be read")]);
      await bounded(h.cleanup(r.response));assert.equal(r.stats.reads,1);assert.equal(r.stats.cancels,1);
      assert.equal(r.stats.releases,1);assert.equal(r.stats.interpreted,0);assert.equal(h.timers.size,0);
    });
    await scenario(name,"the byte budget accumulates across chunks",async()=>{
      const h=harness(name),r=nativeResponse([new Uint8Array(8192),new Uint8Array(8192),bytes("extra")]);
      await bounded(h.cleanup(r.response));assert.equal(r.stats.reads,2);assert.equal(r.stats.cancels,1);
      assert.equal(r.stats.releases,1);assert.equal(h.delays.length,1);
    });
    await scenario(name,"empty chunks cannot bypass the 64-read budget",async()=>{
      const h=harness(name),r=controlledResponse({read:async()=>({done:false,value:new Uint8Array(0)})});
      await bounded(h.cleanup(r.response));assert.equal(r.stats.reads,64);assert.equal(r.stats.cancels,1);
      assert.equal(r.stats.releases,1);assert.deepEqual(h.delays,[2000]);assert.equal(h.timers.size,0);
    });
    await scenario(name,"EOF on the 64th read releases without cancelling",async()=>{
      const h=harness(name),r=nativeResponse(Array.from({length:63},()=>new Uint8Array(1)));
      await bounded(h.cleanup(r.response));assert.equal(r.stats.reads,64);assert.equal(r.stats.cancels,0);
      assert.equal(r.stats.releases,1);assert.equal(h.timers.size,0);
    });
    for(const failure of [()=>{throw new Error("synthetic-private-read");},()=>Promise.reject(new Error("synthetic-private-read"))]){
      await scenario(name,"failed reads cancel and release without exposing the error",async()=>{
        const h=harness(name),r=controlledResponse({read:failure});await bounded(h.cleanup(r.response));
        assert.equal(r.stats.cancels,1);assert.equal(r.stats.releases,1);assert.equal(h.timers.size,0);
        assert.deepEqual(h.calls,{logs:0,storage:0,decode:0});
      });
    }
    for(const cancel of [()=>{throw new Error("synthetic-private-cancel");},()=>Promise.reject(new Error("synthetic-private-cancel")),
      ()=>new Promise(()=>{})]){
      await scenario(name,"failed or pending cancellation cannot hold cleanup open",async()=>{
        const h=harness(name),r=controlledResponse({read:async()=>({done:false,value:new Uint8Array(16385)}),cancel});
        await bounded(h.cleanup(r.response));assert.equal(r.stats.cancels,1);assert.equal(r.stats.releases,1);
        assert.equal(h.timers.size,0);
      });
    }
    await scenario(name,"releaseLock failure is contained",async()=>{
      const h=harness(name),r=controlledResponse({release:()=>{throw new Error("synthetic-private-release");}});
      await bounded(h.cleanup(r.response));assert.equal(r.stats.releases,1);assert.equal(h.timers.size,0);
    });
    for(const chunk of [null,{done:false,value:"private string"},{done:false,value:{byteLength:-1}},{value:new Uint8Array(1)}]){
      await scenario(name,"unexpected reader results stop safely without text coercion",async()=>{
        const h=harness(name),r=controlledResponse({read:async()=>chunk});await bounded(h.cleanup(r.response));
        assert.equal(r.stats.reads,1);assert.equal(r.stats.cancels,1);assert.equal(r.stats.releases,1);
        assert.deepEqual(h.calls,{logs:0,storage:0,decode:0});
      });
    }
    await scenario(name,"a single deadline ends a pending read even when cancellation never settles",async()=>{
      const h=harness(name);let rejectRead;
      const r=controlledResponse({read:()=>new Promise((_,reject)=>{rejectRead=reject;}),cancel:()=>new Promise(()=>{})});
      const cleanup=h.cleanup(r.response);assert.equal(r.stats.reads,1);assert.deepEqual(h.delays,[2000]);
      h.expire();await bounded(cleanup);assert.equal(r.stats.cancels,1);assert.equal(r.stats.releases,1);
      assert.equal(h.timers.size,0);rejectRead(new Error("synthetic-late-private-error"));await setImmediate();
    });
    await scenario(name,"timeout cancels a native pending stream and releases its lock",async()=>{
      const h=harness(name);let cancels=0;
      const response=new Response(new ReadableStream({cancel(){cancels++;}}),{status:503});
      const cleanup=h.cleanup(response);assert.equal(response.body.locked,true);h.expire();await bounded(cleanup);
      assert.equal(cancels,1);assert.equal(response.body.locked,false);assert.equal(h.timers.size,0);
    });
    for(const status of [403,419])await scenario(name,status+" revokes immediately while the body and cancel remain pending",async()=>{
      const h=harness(name),r=controlledResponse({status,read:()=>new Promise(()=>{}),cancel:()=>new Promise(()=>{})});
      h.control.response=r.response;await assert.rejects(bounded(h.api()));
      assert.equal(h.state.accessDenied,true);assert.equal(h.state.courses.length,0);
      assert.equal(h.get("export-progress").disabled,name==="student");
      assert.equal(h.get("course-title").value,"");assert.equal(h.get("lesson-body").value,"");
      assert.equal(r.stats.reads,1);assert.equal(r.stats.cancels,0);assert.equal(r.stats.interpreted,0);
      assert.equal(h.timers.size,1,"revocation occurs before the cleanup deadline fires");
      h.expire();await setImmediate();assert.equal(r.stats.cancels,1);assert.equal(r.stats.releases,1);
      const before=h.requests.length;await assert.rejects(bounded(h.api()));assert.equal(h.requests.length,before);
    });
    for(const status of [404,503])await scenario(name,status+" preserves the API error without awaiting the body",async()=>{
      const h=harness(name),r=controlledResponse({status,read:()=>new Promise(()=>{})});h.control.response=r.response;
      await assert.rejects(bounded(h.api()),error=>{
        assert.equal(error.message,name==="student"?"Não foi possível concluir esta operação. Tente novamente.":
          "Operação não concluída. Verifique seus dados e permissões.");
        assert.equal(error.httpStatus,name==="student"?status:undefined);return true;
      });
      assert.equal(h.state.accessDenied,false);assert.equal(r.stats.interpreted,0);assert.equal(h.timers.size,1);
      assert.equal(h.get("lesson-content").textContent,"Private current lesson");
      h.expire();await setImmediate();assert.equal(r.stats.cancels,1);assert.equal(r.stats.releases,1);
    });
    await scenario(name,"a body-less 403 mock still reaches the real revocation handler",async()=>{
      const h=harness(name);h.control.response={status:403,ok:false};await assert.rejects(bounded(h.api()));
      assert.equal(h.state.accessDenied,true);assert.equal(h.delays.length,0);
    });
    await scenario(name,"successful JSON keeps the original API contract and never enters cleanup",async()=>{
      const h=harness(name);let bodyReads=0,jsonReads=0;
      h.control.response={status:200,ok:true,body:{getReader(){bodyReads++;throw new Error("Cleanup on success");}},
        json:async()=>{jsonReads++;return {ready:true,completed:false};}};
      assert.deepEqual(await bounded(h.api()),{ready:true,completed:false});
      assert.equal(bodyReads,0);assert.equal(jsonReads,1);assert.equal(h.delays.length,0);
      assert.equal(h.requests[0].credentials,"same-origin");assert.equal(h.requests[0].cache,"no-store");
    });
    await scenario(name,"a successful body arriving after revocation drains to EOF without parsing private data",async()=>{
      const h=harness(name),r=nativeResponse([bytes('{"private":"'),bytes('late content"}')],200);
      let release;h.control.response=new Promise(resolve=>{release=resolve;});
      const pending=h.api();h.context.lockAccess("Synthetic access ended");release(r.response);
      await assert.rejects(bounded(pending),{message:"Synthetic access ended"});await setImmediate();
      assert.equal(h.state.accessDenied,true);assert.equal(h.state.courses.length,0);
      assert.equal(h.get("course-title").value,"");assert.equal(h.get("lesson-body").value,"");
      assert.deepEqual(r.stats,{reads:3,cancels:0,releases:1,interpreted:0});
      assert.equal(r.response.bodyUsed,true);assert.equal(r.response.body.locked,false);
      assert.equal(h.timers.size,0);assert.deepEqual(h.calls,{logs:0,storage:0,decode:0});
    });
    await scenario(name,"a pending successful body after revocation cannot delay denial or hold cleanup indefinitely",async()=>{
      const h=harness(name),r=controlledResponse({status:200,read:()=>new Promise(()=>{}),cancel:()=>new Promise(()=>{})});
      let release;h.control.response=new Promise(resolve=>{release=resolve;});
      const pending=h.api();h.context.lockAccess("Synthetic access ended");release(r.response);
      await assert.rejects(bounded(pending),{message:"Synthetic access ended"});
      assert.equal(h.state.accessDenied,true);assert.equal(r.stats.reads,1);assert.equal(r.stats.interpreted,0);
      assert.equal(h.timers.size,1);assert.equal(r.stats.cancels,0);
      h.expire();await setImmediate();assert.equal(r.stats.cancels,1);assert.equal(r.stats.releases,1);
      assert.equal(h.timers.size,0);assert.deepEqual(h.calls,{logs:0,storage:0,decode:0});
    });
    await scenario(name,"cleanup contains no decoder, logger, storage or body serialization",()=>{
      const fn=actual(views[name],"discardErrorBody");
      assert.doesNotMatch(fn,/\.text\(|\.json\(|\.arrayBuffer\(|\.blob\(|JSON\.|TextDecoder|console\.|localStorage|sessionStorage|\.push\(/);
      const api=actual(views[name],"api"),call=api.indexOf("if(!response.ok||state.accessDenied)void discardErrorBody(response);");
      assert.ok(call>=0&&call<api.indexOf("if(response.status===403)lockAccess"));
      assert.doesNotMatch(api,/await discardErrorBody/);
    });
  }
}finally{process.removeListener("unhandledRejection",onUnhandled);}

console.log("PASS error body cleanup: "+scenarios+" actual-function scenarios; native EOF, bounded bytes/reads/time, cancellation failures, immediate revocation and unchanged API errors");
