<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <link rel="stylesheet" href="{{ asset('assets/imagine-tokens.css') }}">
  <title>Universidade Imagine | Área do cliente</title>
  <style nonce="{{ request()->attributes->get('university.csp_nonce') }}">
    :root{--orange:var(--imagine-orange);--ink:var(--imagine-ink);--muted:var(--imagine-muted);--line:var(--imagine-border);--bg:var(--imagine-surface);--white:var(--imagine-white)}
    *{box-sizing:border-box}
    body{font:15px/1.6 var(--imagine-font-ui);color:var(--ink);background:var(--bg);margin:0}
    button{font:inherit;cursor:pointer;min-height:var(--imagine-touch-target)}button:disabled{opacity:.6;cursor:not-allowed}
    :focus-visible{outline:3px solid var(--imagine-focus);outline-offset:3px}
    .top{background:#fff;border-bottom:1px solid var(--line)}
    .top-inner{max-width:1160px;margin:auto;padding:19px 23px;display:flex;justify-content:space-between;gap:15px;align-items:center}
    .brand{display:flex;align-items:center;gap:14px;min-width:0}
    .logo{width:170px;max-width:100%;height:auto;display:block}
    .product-name{border-left:1px solid var(--line);padding-left:14px;font-weight:750;font-size:16px;color:var(--ink)}
    .nav-links{display:flex;gap:5px;align-items:center;flex-wrap:wrap}
    .nav-links a{display:inline-flex;align-items:center;min-height:var(--imagine-touch-target);color:#414441;text-decoration:none;padding:7px 11px;border-radius:var(--imagine-radius-navigation);font-weight:700;font-size:13px}
    .nav-links a:hover,.nav-links a:focus-visible{background:var(--imagine-orange-soft)}
    .skip-link{position:absolute;top:-100px;left:12px;background:var(--ink);color:white;padding:12px;z-index:20}
    .skip-link:focus{top:8px}
    .mini{font-size:12px;color:var(--muted)}
    .container{max-width:1160px;margin:0 auto;padding:28px 23px 55px}
    .hero{border-radius:var(--imagine-radius-panel);padding:33px 37px;background:var(--ink);color:#fff}
    .hero h1{font-size:clamp(25px,3vw,36px);line-height:1.2;margin:6px 0 12px;letter-spacing:-.8px}
    .hero p{color:#E2E7EF;max-width:660px;margin:0}
    .eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#FFBC70;font-weight:850}
.learning-path{margin:23px 0 21px}
    .learning-path h2{font-size:19px;margin:0 0 5px}
    .learning-path p{font-size:13px;color:#565D56;margin:0 0 14px}
    .path-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    .path-card{border:1px solid var(--line);border-radius:var(--imagine-radius-panel);background:#fff;padding:16px;text-align:left;min-width:0;box-shadow:var(--imagine-shadow-panel)}
    .path-card:disabled{cursor:default;opacity:1}
    .path-card:focus-visible{outline-offset:3px}
    .path-card strong,.path-card small{display:block}
    .path-card strong{font-size:17px}
    .path-card small{font-size:12px;color:#535A55;margin:8px 0}
    .path-card[aria-current="true"]{border-color:#F9941D;background:#FFF6EC}
    .path-card progress{display:block;width:100%;height:8px;accent-color:#F9941D;margin:9px 0}
    .simulator{background:#fff;border:1px solid var(--line);border-radius:var(--imagine-radius-panel);box-shadow:var(--imagine-shadow-panel);padding:22px;margin:0 0 22px}
    .simulator h2{font-size:19px;margin:0 0 7px}
    .simulator p{font-size:13px;color:#535A55;margin:0 0 15px}
    .sim-inputs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
    .sim-inputs label{display:block;font-weight:750;font-size:13px;margin-bottom:6px}
    .sim-inputs input{width:100%;min-height:44px;border:1px solid #C9D1DC;border-radius:9px;padding:9px;font:inherit;color:var(--ink)}
    .sim-results{margin-top:16px;padding:12px;background:#FFF6EC;border-radius:10px;border:1px solid #F2D5AC;font-weight:700;font-size:14px}
    .sim-results[hidden]{display:none}
    .pills{display:flex;gap:7px;flex-wrap:wrap;margin:27px 0 18px}
    .searchbar{display:grid;gap:7px;margin:0 0 18px;max-width:460px}
    .searchbar label{font-weight:750;font-size:13px;color:#465369}
    .searchbar input{font:inherit;width:100%;padding:11px 14px;border:1px solid #C9D1DC;border-radius:11px;background:#fff;color:var(--ink)}
        .lesson-search-panel{background:#fff;border:1px solid var(--line);border-radius:var(--imagine-radius-panel);padding:17px 19px;margin-bottom:18px}
    .lesson-search-panel h2{font-size:18px;margin:0 0 6px}
    .lesson-search-panel p{font-size:13px;color:var(--muted);margin:0 0 10px}
    .lesson-search-fields{display:flex;gap:9px;flex-wrap:wrap;align-items:center}
    .lesson-search-fields input{font:inherit;flex:1 1 210px;min-width:0;padding:11px 14px;border:1px solid #C9D1DC;border-radius:11px}
    .lesson-search-results{display:grid;gap:7px;margin-top:12px}
    .lesson-search-result{border:1px solid var(--line);background:#fff;border-radius:10px;text-align:left;padding:11px 13px;width:100%}
    .lesson-search-result:hover{background:#FFF5E8}
    .lesson-search-result strong,.lesson-search-result small{display:block}
    .lesson-search-result small{color:var(--muted);margin-top:3px;font-size:12px}
    .pill{border:1px solid var(--line);background:white;border-radius:999px;padding:9px 14px;font-weight:750;font-size:13px}
    .pill[aria-pressed="true"]{background:#FFF0D9;border-color:#F0BD7C;color:#8A4700}
    .main{display:grid;grid-template-columns:1fr 1.4fr;gap:20px;align-items:start}
    .panel{background:#fff;border:1px solid var(--line);border-radius:var(--imagine-radius-panel);box-shadow:var(--imagine-shadow-panel);overflow:hidden}
    .panel-head{padding:20px;border-bottom:1px solid var(--line)}
    .panel-head h2{font-size:19px;letter-spacing:-.3px;margin:0 0 4px}
    .panel-head p{margin:0;color:var(--muted);font-size:13px}
    .courses{display:grid;gap:7px;padding:12px}
    .course-btn,.lesson-btn{display:block;text-align:left;border:1px solid transparent;background:white;width:100%;padding:13px 14px;border-radius:10px}
    .course-btn:hover,.lesson-btn:hover{background:#F7F8FA}
    .course-btn[aria-current="true"],.lesson-btn[aria-current="true"]{border-color:#F4D4A9;background:#FFF5E8}
    .course-btn strong,.lesson-btn strong{display:block}.course-btn span,.lesson-btn span{display:block;font-size:12px;color:#505650;margin-top:4px}
    .overall-progress{font-size:13px;font-weight:700;color:#FFF0DC!important;margin-top:14px!important}
    .resume-btn{margin-top:16px}
    .course-progress{height:7px;width:100%;accent-color:#F9941D;display:block;margin-top:8px;border-radius:8px}
    .course-progress::-webkit-progress-bar{background:#EDEFF2;border-radius:8px}
    .course-progress::-webkit-progress-value{background:#F9941D;border-radius:8px}
    .course-progress::-moz-progress-bar{background:#F9941D;border-radius:8px}
    .lesson-items{border-bottom:1px solid var(--line);padding:10px}
    .lesson-content{padding:25px}
    .lesson-content h3{font-size:22px;letter-spacing:-.5px;margin:0 0 12px}
    .lesson-text{overflow-wrap:anywhere;color:#4B5769;margin:12px 0 20px}
    .lesson-text h4{font-size:15px;color:#70410C;font-weight:800;letter-spacing:.2px;margin:20px 0 8px}
    .lesson-text p{white-space:pre-wrap;margin:0 0 17px}
    .lesson-help{margin-top:24px;padding:18px;border:1px solid var(--line);border-radius:12px;background:#FAFBFC}
    .lesson-help h4{font-size:18px;margin:0 0 8px}
    .lesson-help p{margin:8px 0}
    .lesson-help label{display:block;font-weight:750;margin:14px 0 6px}
    .lesson-help textarea{display:block;width:100%;min-height:100px;resize:vertical;padding:11px;border:1px solid #C9D1DC;border-radius:9px;font:inherit;color:var(--ink);background:#fff}
    .help-actions{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}
    .help-actions .secondary,.help-answer .secondary{margin-left:0}
    .help-answer{overflow-wrap:anywhere}
    .help-answer:empty{display:none}
    .help-reply,.help-excerpt{white-space:pre-wrap}
    .help-excerpt{margin:12px 0;padding:12px;border-left:3px solid var(--orange);background:#fff}
    .help-excerpt h5{font-size:14px;margin:0 0 6px}
    .help-source{font-size:12px;color:var(--muted)}
    .primary{background:var(--orange);border:1px solid var(--orange);padding:11px 16px;border-radius:10px;font-weight:850;color:#3D290F}
    .primary:hover{background:#FFAC48}
    .secondary{margin-left:9px;background:#fff;color:#70410C;border:1px solid #E5B56D;padding:11px 16px;border-radius:10px;font-weight:750}
    .secondary:hover{background:#FFF5E8}
    .status{padding:12px 17px;border-radius:10px;background:#FFF6E8;border:1px solid #F0D7AD;color:#75501D;margin:18px 0}
    .status[hidden]{display:none}
    .empty{padding:25px;color:var(--muted)}
    .library-recovery{margin:0 12px 14px;padding:16px;border:1px solid #E8C99F;background:#FFF8F0;border-radius:12px}
    .library-recovery p{font-size:13px;color:#65431B;margin:0 0 10px}
    .library-recovery[hidden]{display:none}
    .footer{color:#565D56;font-size:12px;margin-top:28px}
    @media(max-width:800px){.sim-inputs{grid-template-columns:1fr}.path-cards{grid-template-columns:1fr}.main{grid-template-columns:1fr}.container{padding:17px 14px 35px}.hero{padding:24px}.top-inner{padding:14px;flex-wrap:wrap}.nav-links{width:100%}.logo{width:145px}}
  </style>
</head>
<body>
<a class="skip-link" href="#main-content">Ir para o conteúdo</a>
<header class="top"><div class="top-inner">
  <div class="brand"><img class="logo" src="{{ asset('assets/logo-imagine.png') }}" alt="Imagine" width="200" height="55"><span class="product-name">Universidade</span></div>
  <nav class="nav-links" aria-label="Seções da Universidade"><a href="#courses-title">Biblioteca</a><a href="#lesson-panel-title">Minhas aulas</a></nav>
  <div class="mini">Benefício exclusivo de clientes elegíveis</div>
</div></header>
<main id="main-content" class="container">
  <section class="hero" aria-labelledby="hero-title">
    <span class="eyebrow">Conhecimento que impulsiona seu negócio</span>
    <h1 id="hero-title">Visitas. Leads. Clientes.</h1>
    <p>Aprenda com aulas rápidas, nossa metodologia e orientações práticas para aproveitar melhor os serviços Imagine.</p>
    <p id="overall-progress" class="overall-progress" aria-live="polite">Seu progresso será exibido após autorizar os cursos.</p>
    <button type="button" id="resume-course" class="primary resume-btn" disabled>Retomar meus estudos</button>
    <button type="button" id="export-progress" class="secondary" disabled>Exportar meu progresso</button>
  </section>
  <section class="learning-path" aria-labelledby="path-title">
    <h2 id="path-title">Sua jornada: Visitas → Leads → Clientes</h2>
    <p>Cada pilar conecta a teoria à prática. Cursos aparecem aqui somente quando publicados e autorizados.</p>
    <div id="pillar-cards" class="path-cards" aria-live="polite"></div>
  </section>
  <section class="simulator" aria-labelledby="sim-title">
    <h2 id="sim-title">Simulador educativo: visitas, leads e clientes</h2>
    <p>Use números hipotéticos para compreender as taxas da jornada. Os resultados não são previsões nem garantias comerciais; nenhum valor é enviado ao servidor.</p>
    <div class="sim-inputs">
      <div><label for="sim-visits">Visitas semanais hipotéticas</label><input id="sim-visits" type="number" min="0" max="1000000" step="1" value="1000" inputmode="numeric" disabled></div>
      <div><label for="sim-leads-rate">Visitas que viram leads (%)</label><input id="sim-leads-rate" type="number" min="0" max="100" step="0.1" value="5" disabled></div>
      <div><label for="sim-clients-rate">Leads que viram clientes (%)</label><input id="sim-clients-rate" type="number" min="0" max="100" step="0.1" value="10" disabled></div>
    </div>
    <p id="sim-results" class="sim-results" aria-live="polite" hidden></p>
    <p>Exemplo: 1.000 visitas × 5% = 50 leads; 50 leads × 10% = 5 clientes hipotéticos. Pessoas reais podem agir de forma diferente.</p>
  </section>
  <div id="status" role="status" aria-live="polite" class="status" hidden></div>
  <nav class="pills" aria-label="Categorias dos cursos">
    <button type="button" class="pill" data-filter="todos" aria-pressed="true" disabled>Todos</button>
    <button type="button" class="pill" data-filter="metodologia" aria-pressed="false" disabled>Metodologia</button>
    <button type="button" class="pill" data-filter="negocios" aria-pressed="false" disabled>Negócios</button>
    <button type="button" class="pill" data-filter="sistemas" aria-pressed="false" disabled>Sistemas Imagine</button>
  </nav>
  <div class="searchbar">
    <label for="course-search">Buscar cursos</label>
    <input id="course-search" type="search" placeholder="Busque pelo nome ou assunto" maxlength="80" autocomplete="off" disabled>
  </div>
  <section class="lesson-search-panel" aria-labelledby="lesson-search-title">
    <h2 id="lesson-search-title">Encontre um assunto dentro das aulas</h2>
    <p>Busca privada somente nos materiais publicados. As palavras pesquisadas não são enviadas a ferramentas externas.</p>
    <form id="lesson-search-form" role="search">
      <label for="lesson-search-query" class="sr-only">Palavra ou expressão da aula</label>
      <div class="lesson-search-fields">
        <input id="lesson-search-query" aria-label="Pesquisar texto das aulas" maxlength="60" minlength="3" required placeholder="Ex.: atendimento respeitoso" autocomplete="off" disabled>
        <button id="lesson-search-submit" type="submit" class="secondary" disabled>Pesquisar aulas</button>
      </div>
    </form>
    <div id="lesson-search-results" class="lesson-search-results" role="status" aria-live="polite"></div>
  </section>
  <div class="main">
    <section class="panel" aria-labelledby="courses-title">
      <div class="panel-head"><h2 id="courses-title">Seus cursos</h2><p>Escolha um tema para começar.</p></div>
      <div id="course-list" class="courses"><p class="empty">Carregando cursos autorizados...</p></div>
      <div id="library-recovery" class="library-recovery" hidden>
        <p role="alert">A biblioteca não pôde ser carregada. Verifique a conexão e tente novamente. Se a sessão expirou, volte ao Portal.</p>
        <button id="retry-library" type="button" class="secondary">Tentar carregar novamente</button>
      </div>
    </section>
    <section class="panel" aria-labelledby="lesson-panel-title">
      <div class="panel-head"><h2 id="lesson-panel-title">Sua aprendizagem</h2><p>Aulas curtas, sem provas, notas ou certificados.</p></div>
      <div id="lesson-items" class="lesson-items"></div>
      <article id="lesson-content" class="lesson-content"><p class="empty">Selecione um curso para visualizar as aulas.</p></article>
    </section>
  </div>
  <footer class="footer">Universidade Imagine · Educação prática para clientes elegíveis · Resultados comerciais nunca são garantidos.</footer>
</main>
<script nonce="{{ request()->attributes->get('university.csp_nonce') }}">
"use strict";
const root="/universidade/private";
const csrf=document.querySelector('meta[name="csrf-token"]')?.content||"";
const status=document.getElementById("status");
const list=document.getElementById("course-list"),lessonsBox=document.getElementById("lesson-items");
const content=document.getElementById("lesson-content");
const state={courses:[],filter:"todos",query:"",courseId:null,lessonId:null,courseRequest:0,lessonRequest:0,accessDenied:false,accessMessage:"",libraryLoading:false,libraryReady:false,exportLoading:false,searchRequest:0,searchBusy:false};
const labels={metodologia:"Metodologia",negocios:"Negócios",sistemas:"Treinamentos Imagine"};
const overall=document.getElementById("overall-progress");
function illustrativeFunnel(visits,leadRate,clientRate){
  const n=Number(visits),a=Number(leadRate),b=Number(clientRate);
  if(String(visits).trim()===""||String(leadRate).trim()===""||
     String(clientRate).trim()===""||!Number.isInteger(n)||n<0||n>1000000||
     !Number.isFinite(a)||!Number.isFinite(b)||a<0||a>100||b<0||b>100){
    return null;
  }
  const leads=Math.round(n*a/100);
  return {visits:n,leads,clients:Math.round(leads*b/100)};
}
function renderSimulator(){
  const out=document.getElementById("sim-results");
  if(state.accessDenied||!state.libraryReady){out.hidden=true;out.textContent="";return;}
  const result=illustrativeFunnel(
    document.getElementById("sim-visits").value,
    document.getElementById("sim-leads-rate").value,
    document.getElementById("sim-clients-rate").value
  );
  out.hidden=false;
  if(!result){out.textContent="Informe quantidades e taxas válidas para esta simulação.";return;}
  const fmt=n=>new Intl.NumberFormat("pt-BR").format(n);
  out.textContent=fmt(result.visits)+" visitas → "+fmt(result.leads)+" leads → "+
    fmt(result.clients)+" clientes hipotéticos (valores arredondados).";
}
function progressLabel(course){
  const total=Number.isInteger(course.lessons_total)&&course.lessons_total>=0?course.lessons_total:0;
  const completed=Number.isInteger(course.lessons_completed)&&course.lessons_completed>=0
    ?Math.min(course.lessons_completed,total):0;
  return {total,completed,percent:total?Math.round(completed*100/total):0};
}
function say(message){
  const shown=state.accessDenied?state.accessMessage:message;
  status.hidden=!shown;status.textContent=shown||"";
}
function lockAccess(message){
  if(state.accessDenied)return;
  state.accessDenied=true;state.accessMessage=message;state.libraryReady=false;
  state.courses=[];state.courseId=null;state.lessonId=null;
  ++state.courseRequest;++state.lessonRequest;++state.searchRequest;
  document.getElementById("lesson-search-query").value="";
  document.getElementById("lesson-search-query").disabled=true;
  document.getElementById("lesson-search-submit").disabled=true;
  document.getElementById("lesson-search-results").replaceChildren();
  list.replaceChildren();lessonsBox.replaceChildren();content.replaceChildren();
  document.getElementById("pillar-cards").replaceChildren();
  document.getElementById("pillar-cards").append(el("p","Jornada indisponível. Volte ao Portal.","empty"));
  list.append(el("p","Biblioteca indisponível até um novo acesso autorizado.","empty"));
  content.append(el("p","Volte ao Portal do Cliente para verificar seu acesso.","empty"));
  overall.textContent="Acesso à Universidade encerrado.";
  document.querySelectorAll(".sim-inputs input").forEach(input=>{input.value="";input.disabled=true;});
  document.getElementById("sim-results").textContent="";
  document.getElementById("sim-results").hidden=true;
  document.getElementById("course-search").disabled=true;
  document.getElementById("resume-course").disabled=true;
  document.getElementById("export-progress").disabled=true;
  document.getElementById("library-recovery").hidden=true;
  document.getElementById("retry-library").disabled=true;
  document.querySelectorAll("[data-filter]").forEach(btn=>{btn.disabled=true;});
  say(message);
}
function el(tag,text,className){
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  if(className)node.className=className;
  return node;
}
async function api(path,options={}){
  if(state.accessDenied)throw new Error(state.accessMessage);
  const response=await fetch(root+path,{
    method:options.method||"GET",
    credentials:"same-origin",
    cache:"no-store",
    headers:{"Accept":"application/json","X-Requested-With":"XMLHttpRequest","X-CSRF-TOKEN":csrf,
      ...(options.body===undefined?{}:{"Content-Type":"application/json"})},
    body:options.body===undefined?undefined:JSON.stringify(options.body),
  });
  if(response.status===403)lockAccess("Seu acesso não está autorizado. Retorne ao Portal do Cliente.");
  if(response.status===419)lockAccess("Sua sessão expirou. Acesse novamente pelo Portal.");
  if(state.accessDenied)throw new Error(state.accessMessage);
  if(!response.ok){
    const error=new Error("Não foi possível concluir esta operação. Tente novamente.");
    error.httpStatus=response.status;
    throw error;
  }
  const data=await response.json();
  if(state.accessDenied)throw new Error(state.accessMessage);
  return data;
}
// Validate complete server responses before granting them UI meaning. A
// successful HTTP status is not proof of a valid catalogue or progress state.
// Text limits count Unicode code points, matching Laravel's string limits.
function studentRecord(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}
function studentText(value,min,max){
  if(typeof value!=="string"||value.length>max*2)return false;
  const length=Array.from(value).length;
  return length>=min&&length<=max&&(min===0||value.trim().length>0);
}
function studentSlug(value){
  return typeof value==="string"&&value.length<=120&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
function validatedStudentCourses(payload){
  if(!studentRecord(payload)||!Array.isArray(payload.courses))return null;
  const ids=new Set(),slugs=new Set(),courses=[];
  let totalLessons=0;
  for(const item of payload.courses){
    if(!studentRecord(item)||!Number.isSafeInteger(item.id)||item.id<1||ids.has(item.id)||
       !studentSlug(item.slug)||slugs.has(item.slug)||!studentText(item.title,3,200)||
       !["metodologia","negocios","sistemas"].includes(item.category)||
       !(item.summary===null||studentText(item.summary,0,500))||
       !Number.isSafeInteger(item.lessons_total)||item.lessons_total<0||
       !Number.isSafeInteger(item.lessons_completed)||item.lessons_completed<0||
       item.lessons_completed>item.lessons_total||
       !Number.isSafeInteger(totalLessons+item.lessons_total))return null;
    totalLessons+=item.lessons_total;
    ids.add(item.id);slugs.add(item.slug);
    courses.push({id:item.id,slug:item.slug,title:item.title,category:item.category,
      summary:item.summary??"",lessons_total:item.lessons_total,lessons_completed:item.lessons_completed});
  }
  return courses;
}
function validatedStudentLessons(payload){
  if(!studentRecord(payload)||!Array.isArray(payload.lessons))return null;
  const ids=new Set(),slugs=new Set(),lessons=[];
  for(const item of payload.lessons){
    if(!studentRecord(item)||!Number.isSafeInteger(item.id)||item.id<1||ids.has(item.id)||
       !studentSlug(item.slug)||slugs.has(item.slug)||!studentText(item.title,3,200)||
       !Number.isSafeInteger(item.sort_order)||item.sort_order<0||item.sort_order>9999||
       ![0,1].includes(item.completed))return null;
    ids.add(item.id);slugs.add(item.slug);
    lessons.push({id:item.id,slug:item.slug,title:item.title,sort_order:item.sort_order,completed:item.completed});
  }
  return lessons;
}
function validatedStudentLesson(payload,lessonId,courseId){
  const item=studentRecord(payload)?payload.lesson:null;
  if(!studentRecord(item)||!Number.isSafeInteger(item.id)||item.id<1||item.id!==lessonId||
     !Number.isSafeInteger(item.course_id)||item.course_id<1||item.course_id!==courseId||
     !studentSlug(item.slug)||!studentText(item.title,3,200)||!studentText(item.body,10,30000)||
     !Number.isSafeInteger(item.sort_order)||item.sort_order<0||item.sort_order>9999||
     !Number.isSafeInteger(item.course_version)||item.course_version<1)return null;
  return {id:item.id,slug:item.slug,title:item.title,body:item.body,sort_order:item.sort_order,
    course_id:item.course_id,course_version:item.course_version};
}
function validatedStudentProgress(payload){
  return studentRecord(payload)&&typeof payload.completed==="boolean"?{completed:payload.completed}:null;
}
function normalizeSearchText(text){
  return String(text||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");
}
function filterCourses(courses,category,query){
  const term=normalizeSearchText(String(query||"").trim());
  return courses.filter(c=>(category==="todos"||c.category===category)&&
    (!term||normalizeSearchText([c.title,c.summary,labels[c.category]||""].join(" ")).includes(term)));
}
function coursesFiltered(){
  return filterCourses(state.courses,state.filter,state.query);
}
function nextPendingCourseId(courses,currentCourseId){
  if(!Array.isArray(courses))return null;
  const pending=courses.filter(course=>{
    const p=progressLabel(course);
    return Number.isSafeInteger(course.id)&&course.id>0&&p.total>0&&p.completed<p.total;
  });
  const selected=pending.find(course=>course.id===currentCourseId);
  return (selected||pending[0])?.id??null;
}
function nextIncompleteOtherCourseId(courses,currentCourseId){
  if(!Array.isArray(courses))return null;
  const found=courses.find(course=>{
    const p=progressLabel(course);
    return Number.isSafeInteger(course.id)&&course.id>0&&course.id!==currentCourseId&&
      p.total>0&&p.completed<p.total;
  });
  return found?.id??null;
}
const pillars=[
  {slug:"trilha-visitas-seja-encontrado",title:"1 · Visitas",intro:"Seja encontrado e ofereça uma página útil"},
  {slug:"trilha-leads-interesse-contato",title:"2 · Leads",intro:"Transforme interesse em contato informado"},
  {slug:"trilha-clientes-conquiste-acompanhe",title:"3 · Clientes",intro:"Atenda, proponha e acompanhe com respeito"}
];
function pillarCards(courses){
  return pillars.map(pillar=>{
    const course=Array.isArray(courses)?courses.find(c=>c.slug===pillar.slug):null;
    const progress=course?progressLabel(course):{total:0,completed:0,percent:0};
    return {...pillar,courseId:course?.id??null,progress};
  });
}
function renderPillars(){
  if(state.accessDenied||!state.libraryReady)return;
  const box=document.getElementById("pillar-cards");box.replaceChildren();
  for(const pillar of pillarCards(state.courses)){
    const button=el("button",undefined,"path-card");button.type="button";
    button.disabled=!Number.isSafeInteger(pillar.courseId)||pillar.courseId<1||!pillar.progress.total;
    if(!button.disabled)button.dataset.pillarCourse=String(pillar.courseId);
    button.setAttribute("aria-current",String(pillar.courseId!==null&&pillar.courseId===state.courseId));
    button.append(el("strong",pillar.title),el("small",pillar.intro));
    if(button.disabled){
      button.append(el("small","Trilha ainda não publicada para seu acesso."));
    }else{
      button.append(el("small",pillar.progress.completed+" de "+pillar.progress.total+" aulas · "+pillar.progress.percent+"%"));
      const bar=el("progress");
      bar.max=Math.max(1,pillar.progress.total);bar.value=pillar.progress.completed;
      bar.setAttribute("aria-label","Progresso em "+pillar.title+": "+pillar.progress.percent+"%");
      button.append(bar);
    }
    box.append(button);
  }
}
function renderCourses(){
  if(state.accessDenied||!state.libraryReady)return;
  renderPillars();
  list.replaceChildren();
  const totals=state.courses.reduce((memo,c)=>{
    const p=progressLabel(c);memo.completed+=p.completed;memo.total+=p.total;return memo;
  },{completed:0,total:0});
  overall.textContent=totals.total
    ?"Seu progresso: "+totals.completed+" de "+totals.total+" aulas concluídas."
    :"Nenhuma aula publicada disponível no momento.";
  const resume=document.getElementById("resume-course");
  resume.disabled=nextPendingCourseId(state.courses,state.courseId)===null;
  document.getElementById("export-progress").disabled=state.exportLoading;
  const items=coursesFiltered();
  if(!items.length){list.append(el("p","Nenhum curso publicado nesta categoria.","empty"));return;}
  for(const c of items){
    const p=progressLabel(c);
    const btn=el("button",undefined,"course-btn");
    btn.type="button";btn.dataset.courseId=String(c.id);
    btn.setAttribute("aria-current",String(c.id===state.courseId));
    btn.append(el("strong",c.title),
      el("span",(labels[c.category]||"Curso")+" · "+(c.summary||"Aulas práticas")),
      el("span",p.completed+" de "+p.total+" aulas concluídas · "+p.percent+"%"));
    const bar=el("progress",undefined,"course-progress");
    bar.max=Math.max(1,p.total);
    bar.value=p.completed;
    bar.setAttribute("aria-label","Progresso do curso "+c.title+": "+p.percent+"%");
    btn.append(bar);
    list.append(btn);
  }
}
async function selectCourse(id,preferredLessonId=null){
  if(state.accessDenied||!state.libraryReady||!Number.isSafeInteger(id)||id<1||!state.courses.some(course=>course.id===id))return;
  // Invalidate prior course requests and lesson reads, including same-course clicks.
  const request=++state.courseRequest;
  ++state.lessonRequest;
  state.courseId=id;state.lessonId=null;renderCourses();
  lessonsBox.replaceChildren();content.replaceChildren();
  content.append(el("p","Carregando aulas...","empty"));
  try{
    const payload=await api("/courses/"+encodeURIComponent(String(id))+"/lessons");
    if(state.courseRequest!==request)return;
    const lessons=validatedStudentLessons(payload);
    if(lessons===null)throw new Error("A lista de aulas recebida é inválida. Tente novamente.");
    lessonsBox.replaceChildren();content.replaceChildren();
    if(!lessons.length){content.append(el("p","Ainda não existem aulas publicadas neste curso.","empty"));return;}
    for(const item of lessons){
      const btn=el("button",undefined,"lesson-btn");btn.type="button";btn.dataset.lessonId=String(item.id);btn.dataset.completed=item.completed?"1":"0";
      const statusLabel=el("span",item.completed?"✓ Concluída":"Pendente");
      statusLabel.dataset.lessonStatus="";
      btn.append(el("strong",item.title),statusLabel);
      lessonsBox.append(btn);
    }
    // A search result can become stale after a course is republished.
    // Never silently open another lesson in place of the requested result.
    const selected=preferredLessonId===null?null:lessons.find(item=>item.id===preferredLessonId);
    if(preferredLessonId!==null&&!selected){
      content.append(el("p","Esta aula não está mais disponível na versão publicada atual.","empty"));
      return;
    }
    // With no search target, resume the first unfinished authorized lesson.
    const next=selected||lessons.find(item=>!Boolean(item.completed))||lessons[lessons.length-1];
    await selectLesson(Number(next.id));
  }catch(error){
    if(state.courseRequest===request&&!state.accessDenied){
      // A transient lesson read may be retried by a deliberate click; never
      // automatically re-use old course content or bypass a revoked session.
      say(error.message);lessonsBox.replaceChildren();content.replaceChildren();
      content.append(el("p","As aulas não puderam ser carregadas.", "empty"));
      const retry=el("button","Tentar carregar aulas","secondary lesson-retry");
      retry.type="button";
      retry.addEventListener("click",()=>{
        // A search result keeps its exact lesson target across recovery.
        // If it disappeared meanwhile, show unavailable instead of resuming
        // an unrelated pending lesson from the same course.
        if(!state.accessDenied&&state.courseId===id)selectCourse(id,preferredLessonId);
      });
      content.append(retry);
    }
  }
}
function markLessonStatus(id,completed){
  lessonsBox.querySelectorAll("[data-lesson-id]").forEach(btn=>{
    if(Number(btn.dataset.lessonId)!==id)return;
    const marker=btn.querySelector("[data-lesson-status]");
    if(marker)marker.textContent=completed?"✓ Concluída":"Pendente";
    btn.dataset.completed=completed?"1":"0";
  });
}
function splitLessonSections(body){
  // The only structural labels recognized are editorial labels authored
  // in the approved fixture. Every body is still displayed as plain text.
  const input=Array.from(String(body||"")).slice(0,30000).join("");
  const parts=input.split(/\n\n(?=(?:EXEMPLO FICTÍCIO|APLICAÇÃO OPCIONAL|CUIDADO IMPORTANTE)\n)/);
  const headings=["EXEMPLO FICTÍCIO","APLICAÇÃO OPCIONAL","CUIDADO IMPORTANTE"];
  return parts.map((part,index)=>{
    const newline=part.indexOf("\n");
    const header=newline>=0?part.slice(0,newline):"";
    if(index>0&&headings.includes(header)){
      return {heading:header,text:part.slice(newline+1).trim()};
    }
    return {heading:null,text:part.trim()};
  }).filter(section=>section.text.length>0);
}
function lessonTextFragment(body){
  const wrapper=el("div",undefined,"lesson-text");wrapper.tabIndex=-1;
  for(const section of splitLessonSections(body)){
    if(section.heading)wrapper.append(el("h4",section.heading));
    wrapper.append(el("p",section.text));
  }
  return wrapper;
}
// C-112: a grounded, optional help panel. Published lesson text remains
// useful when the tutor gateway is unavailable; no answer is invented.
function validatedStudentHelp(payload,lesson){
  if(!studentRecord(payload)||!studentRecord(payload.source)||
     typeof payload.reply!=="string"||payload.reply.trim()===""||payload.reply.length>12000||
     new TextEncoder().encode(payload.reply).length>12000||
     !studentSlug(payload.source.lesson_slug)||payload.source.lesson_slug!==lesson.slug||
     !Number.isSafeInteger(payload.source.course_version)||
     payload.source.course_version!==lesson.course_version)return null;
  return {reply:payload.reply,source:{lesson_slug:payload.source.lesson_slug,course_version:payload.source.course_version}};
}
function lessonHelpExcerpts(body,question=""){
  if(!studentText(body,10,30000)||typeof question!=="string"||!studentText(question,0,500))return[];
  const hasQuestion=question.trim()!=="";
  const ignored=new Set(["como","qual","quais","que","para","por","uma","uns","umas","dos","das","aos","com","sem","esta","este","essa","esse","aula","sobre","explique","explicar","entender"]);
  const terms=Array.from(new Set((normalizeSearchText(question).match(/[\p{L}\p{N}]+/gu)||[])
    .filter(term=>Array.from(term).length>=3&&!ignored.has(term))));
  if(hasQuestion&&!terms.length)return[];
  const excerpts=[];
  for(const section of splitLessonSections(body)){
    for(const paragraph of section.text.split(/\n\s*\n/)){
      const characters=Array.from(paragraph.trim());
      if(!characters.length)continue;
      let best=null;
      // Overlapping literal windows keep long paragraphs useful without
      // fabricating a summary or cutting an astral character in half.
      for(let offset=0;offset<characters.length;offset+=600){
        const text=characters.slice(offset,offset+700).join("");
        const normalized=normalizeSearchText(text);
        const score=terms.filter(term=>normalized.includes(term)).length;
        if(!best||score>best.score)best={heading:section.heading,text,score,
          truncated:offset>0||offset+700<characters.length,order:excerpts.length};
        if(!hasQuestion||offset+700>=characters.length)break;
      }
      if(best&&(!hasQuestion||best.score>0))excerpts.push(best);
    }
  }
  return excerpts.sort((a,b)=>b.score-a.score||a.order-b.order).slice(0,hasQuestion?3:4)
    .map(({heading,text,truncated})=>({heading,text,truncated}));
}
function lessonHelpPanel(lesson,lessonRequest){
  const panel=el("section",undefined,"lesson-help");panel.dataset.lessonHelp="";
  panel.setAttribute("aria-labelledby","lesson-help-title");
  const title=el("h4","Ajuda desta aula");title.id="lesson-help-title";
  panel.append(title,el("p","Revise o material e tire dúvidas educativas sobre esta aula."));
  const guidance=el("p","Use exemplos fictícios. Deixe de fora dados de clientes, senhas e informações pessoais.","mini");
  guidance.id="lesson-help-guidance";
  const form=el("form");form.noValidate=true;
  const label=el("label","Sua dúvida sobre esta aula");label.htmlFor="lesson-help-question";
  const question=el("textarea");question.id="lesson-help-question";question.rows=3;
  // HTML maxlength counts UTF-16 units. JavaScript enforces 500 Unicode
  // characters, so 500 valid astral characters must still fit this field.
  question.maxLength=1000;question.required=true;question.autocomplete="off";
  question.placeholder="Ex.: Como diferenciar visitas e leads?";
  question.setAttribute("aria-describedby","lesson-help-guidance lesson-help-limit");
  const limit=el("p","Escreva de 3 a 500 caracteres. A consulta é opcional.","mini");limit.id="lesson-help-limit";
  const actions=el("div",undefined,"help-actions");
  const ask=el("button","Consultar ajuda","secondary");ask.type="submit";ask.id="lesson-help-submit";
  const material=el("button","Rever trechos da aula","secondary");material.type="button";material.dataset.helpStatic="";
  actions.append(ask,material);form.append(label,question,guidance,limit,actions);
  const answer=el("div",undefined,"help-answer");answer.id="lesson-help-answer";
  answer.setAttribute("role","status");answer.setAttribute("aria-live","polite");
  panel.append(form,answer,el("p","Para falhas técnicas ou solicitações sobre sua conta, consulte o suporte oficial pelo Portal do Cliente.","mini"));
  let busy=false,materialSelected=false;
  const current=()=>!state.accessDenied&&state.libraryReady&&state.lessonRequest===lessonRequest&&
    state.lessonId===lesson.id&&state.courseId===lesson.course_id&&
    state.courses.some(course=>course.id===lesson.course_id);
  const addSource=()=>{
    answer.append(el("p","Fonte: "+lesson.title+" · versão "+lesson.course_version,"help-source"));
    const source=el("button","Voltar ao texto desta aula","secondary");source.type="button";source.dataset.helpSource="";
    source.addEventListener("click",()=>{
      if(!current())return;
      const text=content.querySelector(".lesson-text");
      text?.scrollIntoView({block:"start"});text?.focus({preventScroll:true});
    });
    answer.append(source);
  };
  const showMaterial=message=>{
    if(!current())return;
    answer.replaceChildren(el("p",message),el("strong","Trechos do material desta aula"));
    const excerpts=lessonHelpExcerpts(lesson.body,question.value.trim());
    if(!excerpts.length)answer.append(el("p","Não encontrei um trecho correspondente nesta aula. Você pode rever o texto completo ou pesquisar outros materiais na biblioteca."));
    for(const excerpt of excerpts){
      const block=el("blockquote",undefined,"help-excerpt");
      if(excerpt.heading)block.append(el("h5",excerpt.heading));
      block.append(el("p",excerpt.text));
      if(excerpt.truncated)block.append(el("small","Trecho parcial. O texto completo está na aula."));
      answer.append(block);
    }
    addSource();
  };
  material.addEventListener("click",()=>{
    if(!current())return;
    materialSelected=true;
    showMaterial("Consulta ao conteúdo da aula, disponível para sua revisão.");
  });
  form.addEventListener("submit",async event=>{
    event.preventDefault();
    if(!current()||busy)return;
    const submitted=question.value.trim();
    if(!studentText(submitted,3,500)){
      answer.replaceChildren(el("p","Escreva uma dúvida de 3 a 500 caracteres sobre esta aula."));
      question.focus();return;
    }
    busy=true;materialSelected=false;ask.disabled=true;question.disabled=true;
    answer.replaceChildren(el("p","Consultando ajuda para esta aula..."));
    try{
      const payload=await api("/lessons/"+encodeURIComponent(String(lesson.id))+"/tutor",{method:"POST",body:{question:submitted}});
      if(!current()||materialSelected)return;
      const reply=validatedStudentHelp(payload,lesson);
      if(reply===null)throw new Error("invalid_tutor_reply");
      answer.replaceChildren(el("strong","Orientação do tutor"),el("p",reply.reply,"help-reply"));
      addSource();
    }catch(error){
      if(!current())return;
      if(error.httpStatus===404){
        answer.replaceChildren(el("p","Esta aula não está disponível para consulta. Reabra as aulas do curso para verificar o material atual."));
        const reload=el("button","Reabrir aulas do curso","secondary");reload.type="button";reload.dataset.helpReload="";
        reload.addEventListener("click",()=>{if(current())selectCourse(lesson.course_id,lesson.id);});
        answer.append(reload);
      }else if(!materialSelected){
        showMaterial(error.message==="invalid_tutor_reply"
          ?"Não foi possível validar a orientação. Confira os trechos do material desta aula."
          :"A tutoria está indisponível no momento. Confira os trechos do material desta aula.");
      }
    }finally{
      busy=false;
      if(current()){ask.disabled=false;question.disabled=false;}
    }
  });
  return panel;
}
function nextPendingLessonId(currentId){
  const items=Array.from(lessonsBox.querySelectorAll("[data-lesson-id]"));
  const currentIndex=items.findIndex(btn=>Number(btn.dataset.lessonId)===currentId);
  if(currentIndex<0)return null;
  // Prioriza a aula seguinte e, caso necessário, volta às anteriores.
  const ordered=items.slice(currentIndex+1).concat(items.slice(0,currentIndex));
  const next=ordered.find(btn=>btn.dataset.completed==="0");
  return next?Number(next.dataset.lessonId):null;
}
function offerNextLesson(id){
  if(state.accessDenied||state.lessonId!==id||content.querySelector("[data-next-lesson]")||
    content.querySelector("[data-next-course]"))return;
  const nextId=nextPendingLessonId(id);
  if(nextId===null){
    content.append(el("p","Você concluiu todas as aulas deste curso. Pode revisá-las quando quiser.","mini"));
    const nextCourseId=nextIncompleteOtherCourseId(state.courses,state.courseId);
    if(nextCourseId!==null){
      const nextCourse=el("button","Continuar em outro curso","secondary");
      nextCourse.type="button";nextCourse.dataset.nextCourse="";
      nextCourse.addEventListener("click",()=>openCourseWithAllFilters(nextCourseId));
      content.append(nextCourse);
    }
    return;
  }
  const advance=el("button","Ir para a próxima aula","secondary");
  advance.type="button";advance.dataset.nextLesson="";
  advance.addEventListener("click",()=>{say("");selectLesson(nextId);});
  content.append(advance);
}
async function selectLesson(id){
  const courseId=state.courseId;
  if(state.accessDenied||!state.libraryReady||!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(courseId)||courseId<1)return;
  const request=++state.lessonRequest;
  state.lessonId=id;
  lessonsBox.querySelectorAll("[data-lesson-id]").forEach(btn=>btn.setAttribute("aria-current",String(Number(btn.dataset.lessonId)===id)));
  content.replaceChildren();content.append(el("p","Carregando aula...","empty"));
  try{
    const [lessonPayload,progressPayload]=await Promise.all([
      api("/lessons/"+encodeURIComponent(String(id))),
      api("/lessons/"+encodeURIComponent(String(id))+"/progress"),
    ]);
    if(state.lessonRequest!==request)return;
    const lesson=validatedStudentLesson(lessonPayload,id,courseId);
    const progress=validatedStudentProgress(progressPayload);
    if(lesson===null||progress===null)throw new Error("A aula ou o progresso recebido é inválido. Tente novamente.");
    markLessonStatus(id,progress.completed);
    content.replaceChildren();
    content.append(el("h3",lesson.title),lessonTextFragment(lesson.body));
    const action=el("button",progress.completed?"✓ Aula concluída":"Marcar como concluída","primary");
    action.type="button";action.disabled=progress.completed;
    async function confirmCompletion(message){
      if(state.accessDenied||state.lessonRequest!==request||state.lessonId!==id)return;
      action.disabled=true;action.textContent="✓ Aula concluída";
      markLessonStatus(id,true);offerNextLesson(id);say(message);
      // A confirmed completion is never reversed merely because a secondary
      // catalogue refresh fails or an older navigation response arrives.
      try{
        const latest=await api("/courses");
        if(state.accessDenied||state.lessonRequest!==request||state.lessonId!==id)return;
        const refreshed=validatedStudentCourses(latest);
        if(refreshed===null)throw new Error("Resumo do progresso indisponível.");
        state.courses=refreshed;
        renderCourses();
      }catch(refreshError){
        if(!state.accessDenied&&state.lessonRequest===request&&state.lessonId===id)
          say("Aula concluída. Atualize a página para conferir o resumo do progresso.");
      }
    }
    action.addEventListener("click",async()=>{
      if(action.disabled||state.accessDenied||state.lessonId!==id)return;
      action.disabled=true;
      try{
        const receipt=await api("/lessons/"+encodeURIComponent(String(id))+"/complete",{method:"POST"});
        if(receipt?.completed!==true)throw new Error("Conclusão sem confirmação do servidor.");
        await confirmCompletion("Seu progresso foi registrado.");
      }catch(error){
        if(state.accessDenied||state.lessonRequest!==request||state.lessonId!==id)return;
        // An HTTP error/timeout can occur AFTER the server committed the
        // completion. Reconcile with an authoritative GET before another
        // POST is possible; never blindly replay an uncertain mutation.
        try{
          const verified=await api("/lessons/"+encodeURIComponent(String(id))+"/progress");
          if(state.accessDenied||state.lessonRequest!==request||state.lessonId!==id)return;
          if(verified?.completed===true){
            await confirmCompletion("Conclusão confirmada após consulta ao servidor.");
          }else if(verified?.completed===false){
            action.disabled=false;
            say("A conclusão não foi registrada. Você pode tentar novamente.");
          }else{
            action.disabled=true;
            say("O progresso não pôde ser confirmado. Reabra a aula antes de tentar novamente.");
          }
        }catch(reconcileError){
          if(state.accessDenied||state.lessonRequest!==request||state.lessonId!==id)return;
          action.disabled=true;
          say("Não foi possível confirmar o resultado. Reabra a aula para verificar o progresso antes de tentar novamente.");
        }
      }
    });
    content.append(action);
    if(progress.completed)offerNextLesson(id);
    content.append(lessonHelpPanel(lesson,request));
  }catch(error){
    if(state.lessonRequest===request&&!state.accessDenied&&state.lessonId===id){
      // A transient failure loading EITHER body or progress must not render
      // a partial lesson. The user chooses whether to retry; 403/419 always
      // purges and locks the UI. Never retry an old lesson selection.
      content.replaceChildren();
      say(error.message);
      content.append(el("p","A aula está temporariamente indisponível.", "empty"));
      const retry=el("button","Tentar abrir aula novamente","secondary lesson-detail-retry");
      retry.type="button";
      retry.addEventListener("click",()=>{
        if(!state.accessDenied&&state.lessonId===id)selectLesson(id);
      });
      content.append(retry);
    }
  }
}
function openCourseWithAllFilters(target,preferredLessonId=null){
  if(state.accessDenied||!state.libraryReady||!Number.isSafeInteger(target)||target<1)return;
  if(!state.courses.some(course=>course.id===target))return;
  state.filter="todos";state.query="";
  document.getElementById("course-search").value="";
  document.querySelectorAll("[data-filter]").forEach(btn=>{
    btn.setAttribute("aria-pressed",String(btn.dataset.filter==="todos"));
  });
  say("");
  selectCourse(target,preferredLessonId);
}
// Read-only search results are rendered with textContent, never HTML.
// A 403/419 revokes and purges them; late responses cannot restore results.
function validLessonSearchResults(payload){
  if(!payload||!Array.isArray(payload.results)||payload.results.length>8)return null;
  const unique=new Set(),results=[];
  for(const item of payload.results){
    if(!item||!Number.isSafeInteger(item.course_id)||item.course_id<1||
       !Number.isSafeInteger(item.lesson_id)||item.lesson_id<1||
       !studentText(item.course_title,3,200)||!studentText(item.lesson_title,3,200)||
       !studentText(item.snippet,0,180)||
       unique.has(item.lesson_id))return null;
    unique.add(item.lesson_id);
    // Only link to a course already in the authorized local library.
    if(!state.courses.some(c=>c.id===item.course_id))return null;
    results.push({course_id:item.course_id,lesson_id:item.lesson_id,
      course_title:item.course_title,lesson_title:item.lesson_title,
      snippet:item.snippet});
  }
  return results;
}
document.getElementById("lesson-search-form").addEventListener("submit",async event=>{
  event.preventDefault();
  if(state.accessDenied||!state.libraryReady||state.searchBusy||state.libraryLoading)return;
  const input=document.getElementById("lesson-search-query");
  const phrase=input.value.trim().replace(/ +/g," ");
  const results=document.getElementById("lesson-search-results");
  const button=document.getElementById("lesson-search-submit");
  if(!studentText(phrase,3,60)||!/^[\p{L}\p{N} -]+$/u.test(phrase)){
    results.replaceChildren(el("p","Informe de 3 a 60 letras ou números para pesquisar.","empty"));
    return;
  }
  const request=++state.searchRequest;
  state.searchBusy=true;button.disabled=true;
  results.replaceChildren(el("p","Procurando aulas publicadas...","empty"));
  try{
    const payload=await api("/search",{method:"POST",body:{query:phrase}});
    if(state.accessDenied||request!==state.searchRequest)return;
    const hits=validLessonSearchResults(payload);
    if(hits===null)throw new Error("A pesquisa retornou dados inesperados. Tente novamente.");
    results.replaceChildren();
    if(!hits.length){
      results.append(el("p","Nenhuma aula publicada encontrada para esta expressão.","empty"));
      return;
    }
    for(const hit of hits){
      const b=el("button",undefined,"lesson-search-result");
      b.type="button";b.dataset.searchLesson=String(hit.lesson_id);
      b.append(el("strong",hit.lesson_title),
        el("small","Curso: "+hit.course_title),el("small",hit.snippet));
      b.addEventListener("click",()=>{
        if(!state.accessDenied)openCourseWithAllFilters(hit.course_id,hit.lesson_id);
      });
      results.append(b);
    }
  }catch(error){
    if(!state.accessDenied&&request===state.searchRequest)
      results.replaceChildren(el("p","A pesquisa está indisponível. Tente novamente.","empty"));
  }finally{
    if(request===state.searchRequest){
      state.searchBusy=false;
      if(!state.accessDenied&&state.libraryReady)button.disabled=false;
    }
  }
});
document.querySelectorAll(".sim-inputs input").forEach(field=>{
  field.addEventListener("input",renderSimulator);
});
// An allowlisted, versioned portable format. Never serialize the raw
// server object into a student file: a future regression in the endpoint
// could introduce private identity, contract, or other tenant fields.
// Reject malformed/oversized histories instead of silently truncating.
function sanitizedProgressExport(payload){
  if(!payload||typeof payload!=="object"||Array.isArray(payload)||
     payload.schema_version!==1||payload.scope!=="current_authenticated_student"||
     !Array.isArray(payload.completions)||payload.completions.length>5000)return null;
  const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const timestamp=/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})?)?$/;
  const rows=[];
  for(const item of payload.completions){
    if(!item||typeof item!=="object"||Array.isArray(item)||
       typeof item.course_slug!=="string"||item.course_slug.length>120||!slug.test(item.course_slug)||
       typeof item.lesson_slug!=="string"||item.lesson_slug.length>120||!slug.test(item.lesson_slug)||
       !Number.isSafeInteger(item.course_version)||item.course_version<1||item.course_version>1000000||
       typeof item.completed_at!=="string"||item.completed_at.length>40||!timestamp.test(item.completed_at))return null;
    rows.push({
      course_slug:item.course_slug,
      course_version:item.course_version,
      lesson_slug:item.lesson_slug,
      completed_at:item.completed_at,
    });
  }
  return {schema_version:1,scope:"current_authenticated_student",completions:rows};
}
document.getElementById("export-progress").addEventListener("click",async()=>{
  if(state.accessDenied||!state.libraryReady||state.exportLoading)return;
  state.exportLoading=true;
  const button=document.getElementById("export-progress");
  button.disabled=true;
  try{
    const progress=await api("/progress/export");
    if(state.accessDenied)return;
    const sanitized=sanitizedProgressExport(progress);
    if(sanitized===null)throw new Error("O histórico recebido não passou na validação de privacidade. Tente novamente mais tarde.");
    const data=new Blob([JSON.stringify(sanitized,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(data);
    try{
      if(state.accessDenied)return;
      const link=document.createElement("a");
      link.href=url;link.download="imagine-universidade-progresso.json";
      document.body.append(link);
      link.click();link.remove();
      say("Arquivo de progresso preparado. Guarde seus dados com segurança.");
    }finally{
      // Give the browser a task boundary for the download and revoke the
      // temporary object URL even when a local browser action fails.
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
  }catch(error){if(!state.accessDenied)say(error.message);}
  finally{
    state.exportLoading=false;
    if(!state.accessDenied&&state.libraryReady)button.disabled=false;
  }
});
document.getElementById("resume-course").addEventListener("click",()=>{
  const target=nextPendingCourseId(state.courses,state.courseId);
  if(target!==null)openCourseWithAllFilters(target);
});
document.getElementById("pillar-cards").addEventListener("click",e=>{
  const item=e.target.closest("[data-pillar-course]");
  if(!item||state.accessDenied)return;
  const id=Number(item.dataset.pillarCourse);
  if(Number.isSafeInteger(id)&&state.courses.some(c=>c.id===id)){
    openCourseWithAllFilters(id);
  }
});
list.addEventListener("click",e=>{const btn=e.target.closest("[data-course-id]");if(btn){say("");selectCourse(Number(btn.dataset.courseId));}});
lessonsBox.addEventListener("click",e=>{const btn=e.target.closest("[data-lesson-id]");if(btn){say("");selectLesson(Number(btn.dataset.lessonId));}});
document.getElementById("course-search").addEventListener("input",event=>{
  if(state.accessDenied||!state.libraryReady)return;
  state.query=event.target.value.slice(0,80);
  ++state.courseRequest;++state.lessonRequest;
  state.courseId=null;state.lessonId=null;
  lessonsBox.replaceChildren();content.replaceChildren();
  content.append(el("p","Escolha um curso para ver as aulas.","empty"));
  renderCourses();
});
document.querySelectorAll("[data-filter]").forEach(btn=>btn.addEventListener("click",()=>{
  if(state.accessDenied||!state.libraryReady)return;
  state.filter=btn.dataset.filter;++state.courseRequest;++state.lessonRequest;
  state.courseId=null;state.lessonId=null;
  document.querySelectorAll("[data-filter]").forEach(b=>b.setAttribute("aria-pressed",String(b===btn)));
  lessonsBox.replaceChildren();content.replaceChildren();content.append(el("p","Escolha um curso para ver as aulas.","empty"));renderCourses();
}));
// Recovery is manual and single-flight. Never retry a 403/419 automatically
// or retain a previous list after a failed initial authorization request.
async function loadLibrary(){
  if(state.accessDenied||state.libraryLoading)return;
  state.libraryLoading=true;state.libraryReady=false;
  document.getElementById("course-search").disabled=true;
  document.querySelectorAll("[data-filter]").forEach(btn=>{btn.disabled=true;});
  document.getElementById("resume-course").disabled=true;
  document.getElementById("export-progress").disabled=true;
  document.getElementById("lesson-search-query").disabled=true;
  document.getElementById("lesson-search-submit").disabled=true;
  document.querySelectorAll(".sim-inputs input").forEach(field=>{field.disabled=true;});
  const recovery=document.getElementById("library-recovery");
  const retry=document.getElementById("retry-library");
  recovery.hidden=true;retry.disabled=true;
  list.replaceChildren();
  list.append(el("p","Verificando acesso e carregando cursos...", "empty"));
  try{
    // POST only creates the tenant after the Portal has authorized it.
    const initialized=await api("/initialize",{method:"POST"});
    if(!studentRecord(initialized)||initialized.ready!==true)
      throw new Error("Não foi possível confirmar a preparação da biblioteca. Tente novamente.");
    const payload=await api("/courses");
    if(state.accessDenied)return;
    const courses=validatedStudentCourses(payload);
    if(courses===null)throw new Error("O catálogo recebido é inválido. Tente novamente.");
    state.courses=courses;state.libraryReady=true;
    document.getElementById("course-search").disabled=false;
    document.querySelectorAll("[data-filter]").forEach(btn=>{btn.disabled=false;});
    document.querySelectorAll(".sim-inputs input").forEach(field=>{field.disabled=false;});
    document.getElementById("lesson-search-query").disabled=false;
    document.getElementById("lesson-search-submit").disabled=false;
    renderSimulator();renderCourses();say("");
  }catch(error){
    if(!state.accessDenied){
      state.libraryReady=false;state.courses=[];state.courseId=null;state.lessonId=null;
      document.getElementById("course-search").disabled=true;
      document.querySelectorAll("[data-filter]").forEach(btn=>{btn.disabled=true;});
      ++state.courseRequest;++state.lessonRequest;++state.searchRequest;
      lessonsBox.replaceChildren();content.replaceChildren();
      document.getElementById("pillar-cards").replaceChildren();
      document.getElementById("resume-course").disabled=true;
      document.getElementById("export-progress").disabled=true;
      document.querySelectorAll(".sim-inputs input").forEach(field=>{field.disabled=true;});
      document.getElementById("sim-results").hidden=true;
      document.getElementById("sim-results").textContent="";
      overall.textContent="Seu progresso está temporariamente indisponível.";
      document.getElementById("lesson-search-query").disabled=true;
      document.getElementById("lesson-search-submit").disabled=true;
      document.getElementById("lesson-search-results").replaceChildren();
      list.replaceChildren();
      list.append(el("p","Cursos temporariamente indisponíveis.","empty"));
      say(error.message);
      recovery.hidden=false;
    }
  }finally{
    state.libraryLoading=false;
    if(!state.accessDenied)retry.disabled=false;
  }
}
document.getElementById("retry-library").addEventListener("click",loadLibrary);
loadLibrary();
</script>
</body>
</html>
