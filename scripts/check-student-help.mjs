#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,Script} from "node:vm";
import {TextEncoder} from "node:util";

// Exercise the real student view functions and event handlers, with only a
// small DOM and HTTP boundary supplied by the harness. No model, provider,
// Portal session, browser guard or operational service is enabled here.
const view=readFileSync(new URL("../resources/views/university/student.blade.php",import.meta.url),"utf8");
function actualFunction(name){
  const source=view.match(new RegExp("(?:async )?function "+name+"\\([^\\n]*\\)\\{[\\s\\S]*?\\n\\}"))?.[0];
  assert.ok(source,"Student function must exist: "+name);
  return source;
}
const source=["studentRecord","studentText","studentSlug","normalizeSearchText","splitLessonSections",
  "lessonFilterCurrent","resetLessonFilter","renderLessonFilter","renderCourseGuidance",
  "invalidateLessonSearch","renderLessonSearchControls",
  "el","say","lockAccess","discardErrorBody","api","invalidateRetainedFavorites","renderRetainedFavorites","contextualCourses","renderContextualCourses",
  "invalidateProgressHistory","renderProgressHistory","invalidateNavigationFocus","beginNavigationFocus",
  "lessonTextFragment","validatedStudentHelp","lessonHelpExcerpts","lessonHelpPanel"]
  .map(actualFunction).join("\n");
const lesson={id:11,slug:"visitas-ficticias",title:"Visitas fictícias",sort_order:0,course_id:1,course_version:2,
  body:"Visitas são pessoas que chegam ao conteúdo.\n\nEXEMPLO FICTÍCIO\nLeads demonstram interesse no exemplo fictício.\n\nAPLICAÇÃO OPCIONAL\nImagine uma jornada de atendimento respeitoso.\n\nCUIDADO IMPORTANTE\nUse dados fictícios e evite promessas de vendas."};
const validReply=()=>({reply:"Revise o exemplo fictício desta aula.",source:{lesson_slug:lesson.slug,course_version:lesson.course_version}});

class Node {
  constructor(tag,text="",className=""){
    this.tag=tag;this.ownText=text;this.className=className;this.children=[];this.events=new Map();
    this.dataset={};this.attributes={};this.disabled=false;this.hidden=false;this.value="";
  }
  set textContent(value){this.ownText=String(value);this.children=[];}
  get textContent(){return this.ownText+this.children.map(child=>child.textContent).join("");}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.ownText="";this.children=children;}
  addEventListener(event,handler){this.events.set(event,handler);}
  setAttribute(name,value){this.attributes[name]=value;}
  scrollIntoView(){this.scrolled=true;}
  focus(){this.focused=true;}
  all(){return this.children.flatMap(child=>[child,...child.all()]);}
  matches(selector){
    if(selector.startsWith("#"))return this.id===selector.slice(1);
    if(selector.startsWith("."))return this.className.split(" ").includes(selector.slice(1));
    if(selector.startsWith("[data-")){
      const key=selector.slice(6,-1).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
      return Object.hasOwn(this.dataset,key);
    }
    return this.tag===selector;
  }
  querySelectorAll(selector){return this.all().filter(node=>node.matches(selector));}
  querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
}
function harness(response={status:503,payload:{error:"tutor_unavailable"}}){
  const nodes=new Map(),calls=[],navigations=[];
  const content=new Node("article"),list=new Node("div"),lessonsBox=new Node("div");
  const get=id=>{
    const child=content.querySelector("#"+id);if(child)return child;
    if(!nodes.has(id)){const node=new Node("div");node.id=id;nodes.set(id,node);}
    return nodes.get(id);
  };
  const state={courses:[{id:1}],courseId:1,lessonId:11,lessonRequest:7,courseRequest:1,searchRequest:0,
    lessonFilter:{query:"",courseId:null,request:0,ready:false},
    accessDenied:false,accessMessage:"",libraryReady:true,favoriteWriteRequest:0,contextualCoursesVisible:true,contextualRequest:0,
    progressHistory:{rows:[],nextBefore:null,ready:false,loading:false,request:0,message:""},
    retained:{rows:[],nextAfter:null,ready:false,loading:false,request:0,needsRefresh:false,unconfirmed:false,removingId:null,message:""}};
  const control={response};
  const context=createContext({state,content,list,lessonsBox,status:get("status"),overall:get("overall-progress"),
    root:"/universidade/private",csrf:"synthetic-csrf",TextEncoder,navigationFocus:{sequence:0,activity:0},
    document:{createElement:tag=>new Node(tag),getElementById:get,querySelectorAll:()=>[]},
    selectCourse:(courseId,lessonId)=>navigations.push({courseId,lessonId}),
    fetch:async(url,options)=>{
      calls.push({url,method:options.method,body:options.body===undefined?null:JSON.parse(options.body)});
      const result=typeof control.response==="function"?await control.response():control.response;
      return {status:result.status,ok:result.status>=200&&result.status<300,json:async()=>result.payload};
    },
  });
  new Script(source,{filename:"actual-student-help-view"}).runInContext(context);
  const body=context.lessonTextFragment(lesson.body),completion=new Node("button","Marcar como concluída","primary");
  const panel=context.lessonHelpPanel(lesson,7);content.append(body,completion,panel);
  const form=panel.querySelector("form"),question=get("lesson-help-question"),ask=get("lesson-help-submit"),answer=get("lesson-help-answer");
  const submit=async value=>{question.value=value;await form.events.get("submit")({preventDefault(){}});};
  return {context,state,control,content,panel,body,completion,question,ask,answer,calls,navigations,get,submit,
    material:()=>panel.querySelector("[data-help-static]").events.get("click")(),
  };
}
let scenarios=0;
async function scenario(label,run){
  try{await run();}catch(error){error.message=label+": "+error.message;throw error;}
  scenarios++;
}

await scenario("source allowlist and exact context",()=>{
  const h=harness(),payload=validReply();payload.identity="private";payload.source.credential="secret";
  assert.equal(JSON.stringify(h.context.validatedStudentHelp(payload,lesson)),JSON.stringify(validReply()));
});
for(const [name,change] of [
  ["empty reply",p=>{p.reply="   ";}],
  ["non-string reply",p=>{p.reply={text:"unsafe"};}],
  ["missing source",p=>{delete p.source;}],
  ["array source",p=>{p.source=[];}],
  ["different slug",p=>{p.source.lesson_slug="other-lesson";}],
  ["different version",p=>{p.source.course_version=3;}],
  ["string version",p=>{p.source.course_version="2";}],
  ["unsafe version",p=>{p.source.course_version=Number.MAX_SAFE_INTEGER+1;}],
  ["reply exceeds PHP byte limit",p=>{p.reply="😀".repeat(3001);}],
])await scenario(name,()=>{
  const h=harness(),payload=validReply();change(payload);
  assert.equal(h.context.validatedStudentHelp(payload,lesson),null);
});
await scenario("UTF-8 reply limit agrees with PHP strlen",()=>{
  const h=harness(),payload=validReply();payload.reply="😀".repeat(3000);
  assert.equal(h.context.validatedStudentHelp(payload,lesson).reply,payload.reply);
});
await scenario("literal contextual material",()=>{
  const h=harness(),excerpts=h.context.lessonHelpExcerpts(lesson.body,"Qual o cuidado com dados fictícios?");
  assert.ok(excerpts.length>0&&excerpts.length<=3);
  assert.ok(excerpts.some(excerpt=>excerpt.heading==="CUIDADO IMPORTANTE"));
  for(const excerpt of excerpts)assert.ok(lesson.body.includes(excerpt.text),"Every excerpt must be literal source text");
});
await scenario("no inferred answer without a matching source",()=>{
  const h=harness();assert.equal(h.context.lessonHelpExcerpts(lesson.body,"Astronomia quântica").length,0);
  assert.equal(h.context.lessonHelpExcerpts(lesson.body,"Qual é esta aula?").length,0);
  assert.equal(h.context.lessonHelpExcerpts(lesson.body,"x".repeat(501)).length,0);
});
await scenario("bounded windows preserve astral characters and late matches",()=>{
  const h=harness(),body="😀".repeat(2300)+" Texto sobre leads fictícios ao final.";
  const excerpts=h.context.lessonHelpExcerpts(body,"leads fictícios");
  assert.equal(excerpts.length,1);assert.ok(excerpts[0].text.includes("leads"));
  assert.ok(Array.from(excerpts[0].text).length<=700);assert.ok(body.includes(excerpts[0].text));
  assert.equal(excerpts[0].truncated,true);
});
await scenario("help is optional and performs no automatic request",()=>{
  const h=harness();assert.equal(h.calls.length,0);assert.equal(h.completion.disabled,false);
  assert.equal(h.panel.querySelectorAll("h3").length,0);assert.equal(h.panel.querySelectorAll(".primary").length,0);
  assert.equal(h.question.maxLength,1000,"HTML permits 500 astral characters");
});
await scenario("manual static review works without a tutor request",()=>{
  const h=harness();h.material();
  assert.equal(h.calls.length,0);assert.equal(h.answer.querySelectorAll("blockquote").length,4);
  assert.ok(h.answer.textContent.includes("Trechos do material desta aula"));
  assert.ok(h.answer.textContent.includes("Fonte: Visitas fictícias · versão 2"));
  h.answer.querySelector("[data-help-source]").events.get("click")();
  assert.equal(h.body.focused,true);assert.equal(h.body.scrolled,true);assert.equal(h.calls.length,0);
});
for(const question of ["", "ab", "😀😀", "a".repeat(501), "😀".repeat(501)]){
  await scenario("question rejected before network ("+Array.from(question).length+" Unicode characters)",async()=>{
    const h=harness();await h.submit(question);assert.equal(h.calls.length,0);
    assert.ok(h.answer.textContent.includes("3 a 500 caracteres"));assert.equal(h.question.focused,true);
  });
}
await scenario("500 Unicode characters are accepted without identity or history",async()=>{
  const h=harness();await h.submit("😀".repeat(500));
  assert.equal(h.calls.length,1);assert.equal(h.calls[0].url,"/universidade/private/lessons/11/tutor");
  assert.equal(h.calls[0].method,"POST");assert.deepEqual(Object.keys(h.calls[0].body),["question"]);
  assert.equal(Array.from(h.calls[0].body.question).length,500);
  assert.doesNotMatch(actualFunction("lessonHelpPanel"),/localStorage|sessionStorage|indexedDB|\.innerHTML|insertAdjacentHTML/);
});
await scenario("valid reply is plain text with the exact source",async()=>{
  const payload=validReply();payload.reply='<img src="x" onerror="attack()"> Explicação literal.';payload.identity="private-secret";
  const h=harness({status:200,payload});await h.submit("Explique os leads fictícios.");
  assert.ok(h.answer.textContent.includes(payload.reply));assert.equal(h.answer.querySelectorAll("img").length,0);
  assert.ok(h.answer.textContent.includes("Orientação do tutor"));assert.ok(!h.answer.textContent.includes("private-secret"));
  assert.equal(h.completion.disabled,false);assert.equal(h.ask.disabled,false);assert.equal(h.question.disabled,false);
});
for(const [name,payload] of [["missing response",{}],["wrong source",{...validReply(),source:{lesson_slug:"other",course_version:2}}]]){
  await scenario(name+" falls back to literal material",async()=>{
    const h=harness({status:200,payload});await h.submit("leads fictícios");
    assert.ok(h.answer.textContent.includes("Não foi possível validar"));
    assert.ok(h.answer.textContent.includes("Leads demonstram interesse"));
    assert.ok(!h.answer.textContent.includes("Orientação do tutor"));assert.equal(h.calls.length,1);
  });
}
for(const code of [503,429])await scenario(code+" keeps study and completion usable",async()=>{
  const h=harness({status:code,payload:{error:"unavailable"}});await h.submit("leads fictícios");
  assert.ok(h.answer.textContent.includes("tutoria está indisponível"));
  assert.ok(h.answer.textContent.includes("Leads demonstram interesse"));
  assert.equal(h.completion.disabled,false);assert.equal(h.state.accessDenied,false);
  assert.equal(h.calls.length,1);assert.equal(h.ask.disabled,false);
});
await scenario("unmatched fallback states its limitation",async()=>{
  const h=harness();await h.submit("astronomia quântica");
  assert.equal(h.answer.querySelectorAll("blockquote").length,0);
  assert.ok(h.answer.textContent.includes("Não encontrei um trecho correspondente"));
  assert.ok(h.answer.querySelector("[data-help-source]"));
});
await scenario("single flight and explicit retry",async()=>{
  const h=harness();let release;
  h.control.response=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.submit("leads fictícios");await h.submit("leads fictícios");
  assert.equal(h.calls.length,1);assert.equal(h.ask.disabled,true);assert.equal(h.question.disabled,true);
  assert.equal(h.completion.disabled,false);
  release({status:503,payload:{}});await pending;
  assert.equal(h.calls.length,1);h.control.response={status:200,payload:validReply()};
  await h.submit("leads fictícios");assert.equal(h.calls.length,2);
});
await scenario("material choice during request does not get replaced or trigger another request",async()=>{
  const h=harness();let release;h.control.response=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.submit("leads fictícios");h.material();await h.submit("leads fictícios");
  release({status:200,payload:validReply()});await pending;
  assert.equal(h.calls.length,1);assert.ok(h.answer.textContent.includes("Trechos do material"));
  assert.ok(!h.answer.textContent.includes("Orientação do tutor"));assert.equal(h.ask.disabled,false);
});
for(const [name,change] of [
  ["other lesson",h=>{h.state.lessonId=12;h.state.lessonRequest++;}],
  ["same lesson selected again",h=>{h.state.lessonRequest++;}],
  ["other course",h=>{h.state.courseId=2;h.state.lessonRequest++;}],
  ["category/search filter",h=>{h.state.courseId=null;h.state.lessonId=null;h.state.lessonRequest++;}],
  ["library unavailable",h=>{h.state.libraryReady=false;}],
])await scenario("late tutor reply ignored after "+name,async()=>{
  const h=harness();let release;h.control.response=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.submit("leads fictícios");change(h);h.content.replaceChildren(new Node("p","Current screen"));
  release({status:200,payload:{...validReply(),reply:"OBSOLETE-REPLY"}});await pending;
  assert.ok(!h.answer.textContent.includes("OBSOLETE-REPLY"));assert.equal(h.content.textContent,"Current screen");
  h.material();assert.ok(!h.answer.textContent.includes("Trechos do material"));assert.equal(h.calls.length,1);
});
for(const status of [403,419])await scenario(status+" revokes help and the entire private screen",async()=>{
  const h=harness({status,payload:{}});await h.submit("leads fictícios");
  assert.equal(h.state.accessDenied,true);assert.equal(h.state.libraryReady,false);
  assert.equal(h.content.querySelectorAll("[data-lesson-help]").length,0);
  assert.ok(h.content.textContent.includes("Portal do Cliente"));assert.equal(h.calls.length,1);
  await h.submit("leads fictícios");assert.equal(h.calls.length,1);
});
await scenario("late reply cannot restore a revoked panel",async()=>{
  const h=harness();let release;h.control.response=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.submit("leads fictícios");h.context.lockAccess("Access revoked");
  release({status:200,payload:{...validReply(),reply:"REVOKED-REPLY"}});await pending;
  assert.equal(h.content.querySelectorAll("[data-lesson-help]").length,0);
  assert.ok(!h.content.textContent.includes("REVOKED-REPLY"));assert.ok(!h.answer.textContent.includes("REVOKED-REPLY"));
});
await scenario("missing lesson offers exact manual revalidation without old excerpts",async()=>{
  const h=harness({status:404,payload:{}});await h.submit("leads fictícios");
  assert.equal(h.answer.querySelectorAll("blockquote").length,0);
  assert.equal(h.answer.querySelectorAll("[data-help-source]").length,0);
  h.answer.querySelector("[data-help-reload]").events.get("click")();
  assert.deepEqual(h.navigations,[{courseId:1,lessonId:11}]);assert.equal(h.calls.length,1);
});
await scenario("404 supersedes a material selection made while waiting",async()=>{
  const h=harness();let release;h.control.response=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.submit("leads fictícios");h.material();
  release({status:404,payload:{}});await pending;
  assert.equal(h.answer.querySelectorAll("blockquote").length,0);
  assert.ok(h.answer.querySelector("[data-help-reload]"));
});

console.log("PASS student contextual help: "+scenarios+" real-function scenarios; source integrity, Unicode, literal fallback, single flight, navigation and revocation");
