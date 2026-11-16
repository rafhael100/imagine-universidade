<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <link rel="stylesheet" href="{{ asset('assets/imagine-tokens.css') }}">
  <title>Universidade Imagine | Administração</title>
  <style nonce="{{ request()->attributes->get('university.csp_nonce') }}">
    :root{--orange:var(--imagine-orange);--ink:var(--imagine-ink);--muted:var(--imagine-muted);--line:var(--imagine-border);--bg:var(--imagine-surface);--white:var(--imagine-white)}
    *{box-sizing:border-box}
    body{font:14px/1.6 var(--imagine-font-ui);margin:0;background:var(--bg);color:var(--ink)}
    button,input,select,textarea{font:inherit}button{cursor:pointer;min-height:var(--imagine-touch-target)}button:disabled{opacity:.6;cursor:not-allowed}
    :focus-visible{outline:3px solid var(--imagine-focus);outline-offset:2px}
    .top{background:#fff;border-bottom:1px solid var(--line)}.top-inner{max-width:1180px;margin:auto;display:flex;justify-content:space-between;gap:15px;align-items:center;padding:18px 22px}
    .brand{display:flex;align-items:center;gap:14px;min-width:0}
    .logo{width:170px;max-width:100%;height:auto;display:block}
    .product-name{border-left:1px solid var(--line);padding-left:14px;font-weight:750;font-size:16px;color:var(--ink)}
    .nav-links{display:flex;gap:5px;align-items:center;flex-wrap:wrap}
    .nav-links a{display:inline-flex;align-items:center;min-height:var(--imagine-touch-target);color:#414441;text-decoration:none;padding:7px 11px;border-radius:var(--imagine-radius-navigation);font-weight:700;font-size:13px}
    .nav-links a:hover,.nav-links a:focus-visible{background:var(--imagine-orange-soft)}
    .skip-link{position:absolute;top:-100px;left:12px;background:var(--ink);color:white;padding:12px;z-index:20}
    .skip-link:focus{top:8px}
    .eyebrow{color:#A85B00;font-size:11px;letter-spacing:1.6px;font-weight:850;text-transform:uppercase}
    .container{max-width:1180px;margin:auto;padding:27px 22px 55px}h1{margin:4px 0 8px;font-size:30px}h2{font-size:19px;margin:0}h3{font-size:16px;margin:0 0 10px}
    p{color:#505650;margin:0 0 14px}
    .notice{border-radius:12px;padding:12px 17px;background:#FFF5E6;border:1px solid #EED2A6;color:#7F521A;margin:20px 0}
    .notice[hidden]{display:none}
    .layout{display:grid;grid-template-columns:300px minmax(0,1fr);gap:19px;align-items:start}
    .panel{background:#fff;border:1px solid var(--line);border-radius:var(--imagine-radius-panel);box-shadow:var(--imagine-shadow-panel);overflow:hidden}
    .panel-header{padding:19px 21px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:12px;align-items:center}
    .panel-body{padding:21px}.items{padding:9px;display:grid;gap:6px}
    .catalog-recovery{margin:0 10px 13px;padding:15px;border:1px solid #E8C99F;background:#FFF8F0;border-radius:12px}
    .catalog-recovery p{font-size:13px;color:#65431B;margin:0 0 10px}
    .catalog-recovery[hidden]{display:none}
    .item{border:1px solid transparent;background:#fff;text-align:left;border-radius:10px;padding:13px 12px;width:100%}
    .item:hover{background:#F8F9FB}.item[aria-current="true"]{background:#FFF3E2;border-color:#F2D2AA}
    .item strong{display:block;font-size:14px}.item small{display:block;color:#505650;font-size:12px;margin-top:3px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.field{display:grid;gap:5px;margin-bottom:14px}
    .field label{font-size:12px;font-weight:750;color:#465369}.span{grid-column:1/-1}
    input,select,textarea{padding:11px;border:1px solid #D7DDE5;border-radius:10px;min-width:0;width:100%;color:var(--ink);background:white}
    textarea{resize:vertical;min-height:95px}
    .actions{display:flex;flex-wrap:wrap;gap:9px;align-items:center}
    .primary{background:var(--orange);color:#39230F;border:1px solid var(--orange);border-radius:10px;padding:10px 16px;font-weight:850}
    .secondary{background:white;border:1px solid #D8DEE6;border-radius:10px;padding:10px 15px;font-weight:750}
    .danger{color:#A22724;border-color:#E8BDBA}
    .chip{font-size:11px;border-radius:999px;padding:5px 9px;background:#F0F2F5;color:#536071;font-weight:800}
    .chip.published{background:#E7F5ED;color:#23684A}
    hr{border:0;border-top:1px solid var(--line);margin:26px 0}
    .help{font-size:12px}
    .editorial-preview{border:1px solid #E7BF88;background:#FFFAF4;border-radius:12px;padding:20px;margin:20px 0 0;overflow-wrap:anywhere}
    .editorial-preview[hidden]{display:none}
    .readiness{border:1px solid #E6BC83;background:#FFF9F0;border-radius:10px;padding:13px 16px;margin:14px 0;overflow-wrap:anywhere}
    .readiness[hidden]{display:none}
    .readiness strong{display:block;color:#61380A;margin-bottom:6px}
    .readiness p{color:#484848;margin:6px 0;font-size:13px}
    .audit-panel{margin-top:20px}
    .audit-list{padding:10px 20px;display:grid;gap:6px}
    .audit-row{padding:12px 0;border-bottom:1px solid var(--line)}
    .audit-row strong{display:block;font-weight:750}
    .audit-row small{display:block;color:#505650;font-size:12px}
    .editorial-preview h3{font-size:19px;color:#263044}
    .editorial-preview h4{font-size:14px;color:#70410C;margin:18px 0 6px}
    .editorial-preview p{white-space:pre-wrap;line-height:1.65;color:#465369}
    .footer{font-size:12px;color:#565D56;margin-top:28px}
    @media(max-width:820px){.layout{grid-template-columns:1fr}.container{padding:18px 14px}.top-inner{padding:14px;flex-wrap:wrap}.grid{grid-template-columns:1fr}.nav-links{width:100%}.logo{width:145px}}
  </style>
</head>
<body>
<a class="skip-link" href="#main-content">Ir para o conteúdo</a>
<header class="top"><div class="top-inner">
  <div class="brand"><img class="logo" src="{{ asset('assets/logo-imagine.png') }}" alt="Imagine" width="200" height="55"><span class="product-name">Universidade</span></div>
  <nav class="nav-links" aria-label="Seções administrativas"><a href="#courses-title">Cursos</a><a href="#edit-title">Editar conteúdo</a><a href="#audit-title">Histórico</a></nav>
  <div class="eyebrow">Painel editorial · acesso restrito</div>
</div></header>
<main id="main-content" class="container">
  <div class="eyebrow">Administração Imagine</div>
  <h1>Biblioteca de cursos</h1>
  <p>Cadastre cursos e aulas em rascunho. A publicação só é permitida a operadores autorizados pelo Portal.</p>
  <div id="status" class="notice" role="status" aria-live="polite" hidden></div>
  <div class="layout">
    <section class="panel" aria-labelledby="courses-title">
      <div class="panel-header"><h2 id="courses-title">Cursos</h2><button type="button" class="primary" id="new-course">+ Novo</button></div>
      <div id="course-items" class="items"><p>Carregando cursos...</p></div>
      <div id="catalog-recovery" class="catalog-recovery" hidden>
        <p role="alert">Não foi possível consultar os cursos. Verifique a conexão e tente novamente. Uma sessão expirada exige novo acesso pelo Portal.</p>
        <button type="button" id="retry-catalog" class="secondary">Tentar carregar cursos</button>
      </div>
    </section>
    <section class="panel" aria-labelledby="edit-title">
      <div class="panel-header"><h2 id="edit-title">Editar conteúdo</h2><span id="publication-status" class="chip">Rascunho</span></div>
      <div class="panel-body">
        <form id="course-form">
          <div class="grid">
            <div class="field span"><label for="course-title">Título</label><input id="course-title" maxlength="200" required></div>
            <div class="field"><label for="course-slug">Identificador do curso</label><input id="course-slug" maxlength="120" pattern="[a-z0-9]+(-[a-z0-9]+)*" required></div>
            <div class="field"><label for="course-category">Categoria</label><select id="course-category"><option value="metodologia">Metodologia</option><option value="negocios">Negócios</option><option value="sistemas">Sistemas Imagine</option></select></div>
            <div class="field span"><label for="course-summary">Descrição curta</label><textarea id="course-summary" maxlength="500"></textarea></div>
            <div class="field"><label for="course-sort">Ordem</label><input id="course-sort" type="number" min="0" max="9999" step="1" value="0"></div>
          </div>
          <div class="actions">
            <button type="submit" class="primary" id="course-save">Salvar rascunho</button>
            <button type="button" class="secondary" id="check-publication">Verificar publicação</button>
            <button type="button" class="secondary" id="publish">Publicar curso</button>
            <button type="button" class="secondary" id="unpublish">Retirar do ar</button>
            <button type="button" class="secondary danger" id="delete-course" disabled>Excluir rascunho nunca publicado</button>
          </div>
          <p class="help">Retirar um curso do ar arquiva a versão publicada e cria um novo rascunho. O histórico anterior é preservado, mas o progresso da nova versão começa novamente.</p>
          <div id="publication-readiness" class="readiness" aria-live="polite" role="status" hidden></div>
          <p class="help">Antes de publicar, salve os campos e verifique a versão vigente. A conferência de conteúdo não substitui revisão editorial independente nem autorização oficial do Portal.</p>
        </form>
        <hr>
        <h3>Aulas do curso</h3>
        <div id="lesson-items" class="items"><p class="help">Selecione um curso.</p></div>
        <form id="lesson-form">
          <h3 id="lesson-title-heading">Nova aula</h3>
          <div class="grid">
            <div class="field span"><label for="lesson-title">Título da aula</label><input id="lesson-title" maxlength="200" required></div>
            <div class="field"><label for="lesson-slug">Identificador</label><input id="lesson-slug" maxlength="120" pattern="[a-z0-9]+(-[a-z0-9]+)*" required></div>
            <div class="field"><label for="lesson-sort">Ordem</label><input id="lesson-sort" type="number" min="0" max="9999" step="1" value="0"></div>
            <div class="field span"><label for="lesson-body">Conteúdo (texto simples)</label><textarea id="lesson-body" minlength="10" maxlength="30000" required></textarea></div>
          </div>
          <div class="actions"><button class="primary" id="lesson-save" type="submit">Salvar aula</button><button class="secondary" type="button" id="clear-lesson">Nova aula</button><button class="secondary" type="button" id="preview-lesson">Pré-visualizar aula</button><button class="secondary danger" type="button" id="delete-lesson" disabled>Excluir rascunho</button></div>
        </form>
        <section id="lesson-preview" class="editorial-preview" role="region" aria-labelledby="preview-title" hidden>
          <div class="eyebrow">Prévia local do rascunho · não publicada</div>
          <h3 id="preview-title">Pré-visualização de aula</h3>
          <div id="preview-body"></div>
          <p class="help">A prévia exibe os valores atuais do formulário. Não envia conteúdo nem substitui revisão editorial independente.</p>
        </section>
      </div>
    </section>
  </div>
  <section id="audit-panel" class="panel audit-panel" aria-labelledby="audit-title">
    <div class="panel-header">
      <h2 id="audit-title">Histórico editorial</h2>
      <button type="button" id="refresh-audit" class="secondary">Atualizar histórico</button>
    </div>
    <div id="audit-items" class="audit-list" aria-live="polite"><p class="help">Carregando alterações autorizadas...</p></div>
    <div class="panel-body"><button type="button" class="secondary" id="load-more-audit" disabled>Carregar anteriores</button>
      <p class="help">Eventos paginados, sem identificadores pessoais dos operadores. A retenção depende da política Imagine.</p>
    </div>
  </section>
  <footer class="footer">Universidade Imagine · Somente a área Imagine autorizada poderá administrar conteúdos. Toda alteração deve ser auditada em produção.</footer>
</main>
<script nonce="{{ request()->attributes->get('university.csp_nonce') }}">
"use strict";
const base="/universidade/private/admin";
const csrf=document.querySelector('meta[name="csrf-token"]')?.content||"";
const $=id=>document.getElementById(id),note=$("status");
const state={courses:[],course:null,lessons:[],lesson:null,courseRequest:0,lessonRequest:0,auditRequest:0,auditEvents:[],auditNextBeforeId:null,preflightRequest:0,writePending:false,accessDenied:false,accessMessage:"",catalogLoading:false,catalogReady:false};
const cats={metodologia:"Metodologia",negocios:"Negócios",sistemas:"Sistemas Imagine"};
function say(message){
  const shown=state.accessDenied?state.accessMessage:message;
  note.hidden=!shown;note.textContent=shown||"";
}
function beginWrite(){
  if(state.accessDenied||state.writePending||!state.catalogReady)return false;
  state.writePending=true;
  ++state.courseRequest;++state.lessonRequest;
  const layout=document.querySelector(".layout");
  layout.inert=true;
  layout.setAttribute("aria-busy","true");
  say("Aplicando alteração editorial...");
  return true;
}
function finishWrite(){
  state.writePending=false;
  const layout=document.querySelector(".layout");
  layout.setAttribute("aria-busy","false");
  layout.inert=state.accessDenied;
}
function clearPublicationCheck(){
  ++state.preflightRequest;
  $("publication-readiness").replaceChildren();
  $("publication-readiness").hidden=true;
}
function lockAccess(message){
  if(state.accessDenied)return;
  state.accessDenied=true;state.accessMessage=message;state.catalogReady=false;
  document.querySelector(".layout").inert=true;
  state.courses=[];state.course=null;state.lessons=[];state.lesson=null;
  ++state.courseRequest;++state.lessonRequest;
  $("course-items").replaceChildren();$("lesson-items").replaceChildren();
  $("catalog-recovery").hidden=true;
  $("retry-catalog").disabled=true;
  hideLessonPreview();
  clearPublicationCheck();
  ++state.auditRequest;state.auditEvents=[];state.auditNextBeforeId=null;
  $("audit-items").replaceChildren();
  $("course-items").append(el("p","Cursos indisponíveis até novo acesso autorizado.","help"));
  $("lesson-items").append(el("p","Retorne ao Portal para verificar a sessão.","help"));
  document.querySelectorAll(".layout button,.layout input,.layout select,.layout textarea,.audit-panel button")
    .forEach(field=>{if("value" in field&&field.tagName!=="SELECT")field.value="";field.disabled=true;});
  $("publication-status").textContent="Acesso encerrado";
  say(message);
}
function el(tag,text,className){
  const x=document.createElement(tag);
  if(text!==undefined)x.textContent=text;
  if(className)x.className=className;
  return x;
}
async function api(path,method="GET",payload=null){
  if(state.accessDenied)throw new Error(state.accessMessage);
  const response=await fetch(base+path,{
    method,credentials:"same-origin",cache:"no-store",
    headers:{"Accept":"application/json","X-Requested-With":"XMLHttpRequest","Content-Type":"application/json","X-CSRF-TOKEN":csrf},
    body:payload===null?undefined:JSON.stringify(payload)
  });
  if(response.status===403)lockAccess("Acesso administrativo não autorizado. Volte ao Portal.");
  if(response.status===419)lockAccess("Sessão expirada. Acesse novamente pelo Portal.");
  if(state.accessDenied)throw new Error(state.accessMessage);
  if(!response.ok){throw new Error("Operação não concluída. Verifique seus dados e permissões.");}
  const data=await response.json();
  if(state.accessDenied)throw new Error(state.accessMessage);
  return data;
}
const intField=id=>Number.parseInt($(id).value,10)||0;
const draft=()=>!state.accessDenied&&state.catalogReady&&(state.course===null||!Boolean(state.course.is_published));
function fillCourse(){
  if(state.accessDenied)return;
  const c=state.course;
  $("course-title").value=c?.title||"";
  $("course-slug").value=c?.slug||"";
  $("course-slug").disabled=!!c;
  $("course-category").value=c?.category||"metodologia";
  $("course-summary").value=c?.summary||"";
  $("course-sort").value=String(c?.sort_order??0);
  $("publication-status").textContent=c?.is_published?"Publicado":"Rascunho";
  $("publication-status").className="chip"+(c?.is_published?" published":"");
  const editable=draft();
  for(const id of ["course-title","course-category","course-summary","course-sort"]){$(id).disabled=!editable;}
  $("course-save").disabled=!editable;
  $("publish").disabled=!c||!!c.is_published;
  $("check-publication").disabled=!c||!!c.is_published;
  clearPublicationCheck();
  $("unpublish").disabled=!c||!c.is_published;
  $("delete-course").disabled=!c||!!c.is_published;
  $("lesson-form").querySelectorAll("input,textarea,button").forEach(x=>x.disabled=!c||!editable);
}
function previewLessonParts(body){
  const markers=["EXEMPLO FICTÍCIO","APLICAÇÃO OPCIONAL","CUIDADO IMPORTANTE"];
  return String(body||"").slice(0,30000)
    .split(/\n\n(?=(?:EXEMPLO FICTÍCIO|APLICAÇÃO OPCIONAL|CUIDADO IMPORTANTE)\n)/)
    .map((chunk,index)=>{
      const nl=chunk.indexOf("\n");
      const heading=nl>=0?chunk.slice(0,nl):"";
      return index>0&&markers.includes(heading)
        ?{title:heading,text:chunk.slice(nl+1).trim()}
        :{title:null,text:chunk.trim()};
    }).filter(section=>section.text.length>0);
}
function hideLessonPreview(){
  $("preview-body").replaceChildren();
  $("lesson-preview").hidden=true;
}
function showLessonPreview(){
  if(state.accessDenied||!state.course||state.course.is_published)return;
  const title=$("lesson-title").value.trim();
  const body=$("lesson-body").value.trim();
  if(!title||body.length<10){say("Informe título e conteúdo antes de pré-visualizar.");return;}
  hideLessonPreview();
  $("preview-title").textContent=title;
  for(const section of previewLessonParts(body)){
    if(section.title)$("preview-body").append(el("h4",section.title));
    $("preview-body").append(el("p",section.text));
  }
  $("lesson-preview").hidden=false;
  $("lesson-preview").scrollIntoView({behavior:"smooth",block:"nearest"});
}
function resetLesson(){
  if(state.accessDenied)return;
  hideLessonPreview();
  state.lesson=null;
  $("lesson-form").reset();
  $("lesson-title-heading").textContent="Nova aula";
  $("lesson-slug").disabled=false;
  $("lesson-sort").value="0";
  $("delete-lesson").disabled=true;
}
function renderCourses(){
  if(state.accessDenied)return;
  $("course-items").replaceChildren();
  if(!state.courses.length){$("course-items").append(el("p","Nenhum curso cadastrado."));return;}
  for(const c of state.courses){
    const b=el("button",undefined,"item");b.type="button";b.dataset.course=String(c.id);
    b.setAttribute("aria-current",String(c.id===state.course?.id));
    b.append(el("strong",c.title),el("small",(cats[c.category]||"Curso")+" · "+(c.is_published?"Publicado":"Rascunho")));
    $("course-items").append(b);
  }
}
function renderLessons(){
  if(state.accessDenied)return;
  $("lesson-items").replaceChildren();
  if(!state.lessons.length){$("lesson-items").append(el("p","Nenhuma aula cadastrada.","help"));return;}
  for(const l of state.lessons){
    const btn=el("button",undefined,"item");btn.type="button";btn.dataset.lesson=String(l.id);
    btn.setAttribute("aria-current",String(l.id===state.lesson?.id));
    btn.append(el("strong",l.title),el("small",l.status+" · "+(l.is_published?"Publicada":"Rascunho")));
    $("lesson-items").append(btn);
  }
}
async function refreshCourses(preferredId=state.course?.id??null){
  const request=++state.courseRequest;
  const result=await api("/courses");
  if(state.accessDenied||state.courseRequest!==request)return;
  state.courses=Array.isArray(result.courses)?result.courses:[];
  state.course=state.courses.find(c=>c.id===preferredId)||null;
  state.catalogReady=true;
  $("new-course").disabled=false;
  renderCourses();fillCourse();
  await refreshLessons();
}
async function refreshLessons(){
  const request=++state.lessonRequest;
  const courseId=state.course?.id??null;
  state.lessons=[];state.lesson=null;renderLessons();resetLesson();fillCourse();
  if(courseId===null||state.accessDenied)return;
  let result;
  try{
    result=await api("/courses/"+encodeURIComponent(String(courseId))+"/lessons");
  }catch(error){
    if(!state.accessDenied&&state.lessonRequest===request&&state.course?.id===courseId){
      // The selected course remains authoritative; no stale lesson data is
      // shown. A human may retry this read without abandoning the course.
      const panel=$("lesson-items");panel.replaceChildren();
      panel.append(el("p","Aulas temporariamente indisponíveis.", "help"));
      const retry=el("button","Tentar carregar aulas","secondary");
      retry.id="retry-lessons";retry.type="button";
      retry.addEventListener("click",()=>{
        if(!state.accessDenied&&!state.writePending&&state.course?.id===courseId)
          refreshLessons().catch(failure=>say(failure.message));
      });
      panel.append(retry);
    }
    throw error;
  }
  if(state.accessDenied||state.lessonRequest!==request||state.course?.id!==courseId)return;
  state.lessons=Array.isArray(result.lessons)?result.lessons:[];renderLessons();
}
$("course-items").addEventListener("click",async event=>{
  const b=event.target.closest("[data-course]");if(!b||state.accessDenied||state.writePending)return;
  const nextId=Number(b.dataset.course);
  if(state.course?.id===nextId)return;
  if(!confirmDiscardCourseAndLesson())return;
  ++state.courseRequest;
  say("");state.course=state.courses.find(c=>c.id===Number(b.dataset.course))||null;
  renderCourses();fillCourse();
  try{await refreshLessons();}catch(error){say(error.message);}
});
$("new-course").addEventListener("click",()=>{
  if(state.accessDenied||state.writePending||!state.catalogReady)return;
  if(!confirmDiscardCourseAndLesson())return;
  ++state.courseRequest;++state.lessonRequest;
  state.course=null;state.lessons=[];state.lesson=null;
  renderCourses();renderLessons();fillCourse();resetLesson();$("course-title").focus();say("");
});
$("course-form").addEventListener("submit",async event=>{
  event.preventDefault();if(!draft())return;
  const payload={title:$("course-title").value.trim(),slug:$("course-slug").value.trim(),
    category:$("course-category").value,summary:$("course-summary").value.trim(),sort_order:intField("course-sort")};
  if(!payload.title){say("Informe o título.");return;}
  const courseId=state.course?.id??null;
  if(!beginWrite())return;
  try{
    const result=courseId!==null
      ? await api("/courses/"+courseId,"PATCH",(({slug,...withoutSlug})=>withoutSlug)(payload))
      : await api("/courses","POST",payload);
    if(!state.accessDenied){await refreshCourses(courseId??result.id);say("Rascunho salvo.");}
  }catch(error){say(error.message);}
  finally{finishWrite();}
});
$("lesson-items").addEventListener("click",event=>{
  const b=event.target.closest("[data-lesson]");if(!b||state.accessDenied||state.writePending)return;
  if(state.lesson?.id===Number(b.dataset.lesson))return;
  if(!confirmDiscardLesson())return;
  state.lesson=state.lessons.find(l=>l.id===Number(b.dataset.lesson))||null;
  hideLessonPreview();
  if(!state.lesson)return;
  $("lesson-title").value=state.lesson.title;$("lesson-slug").value=state.lesson.slug;
  $("lesson-slug").disabled=true;$("lesson-sort").value=String(state.lesson.sort_order);
  $("lesson-body").value=state.lesson.body;$("lesson-title-heading").textContent="Editar aula";
  $("delete-lesson").disabled=!draft()||state.lesson.is_published||state.lesson.status!=="draft";
  renderLessons();
});
$("clear-lesson").addEventListener("click",()=>{
  if(state.accessDenied||state.writePending||!confirmDiscardLesson())return;
  resetLesson();renderLessons();
});
$("preview-lesson").addEventListener("click",showLessonPreview);
$("delete-lesson").addEventListener("click",async()=>{
  const lesson=state.lesson,course=state.course;
  if(state.accessDenied||!course||course.is_published||!lesson||lesson.is_published||lesson.status!=="draft")return;
  if(!confirm("Excluir esta aula em rascunho? Esta ação não pode ser desfeita."))return;
  if(!beginWrite())return;
  $("delete-lesson").disabled=true;
  try{
    await api("/lessons/"+encodeURIComponent(String(lesson.id)),"DELETE");
    if(!state.accessDenied){await refreshLessons();say("Aula em rascunho excluída. Histórico publicado foi preservado.");}
  }catch(error){
    if(!state.accessDenied)$("delete-lesson").disabled=false;
    say(error.message);
  }finally{finishWrite();}
});
$("lesson-form").addEventListener("submit",async event=>{
  event.preventDefault();if(!state.course||!draft())return;
  const payload={title:$("lesson-title").value.trim(),slug:$("lesson-slug").value.trim(),
    body:$("lesson-body").value.trim(),sort_order:intField("lesson-sort")};
  if(!payload.title||payload.body.length<10){say("Preencha título e conteúdo.");return;}
  const courseId=state.course.id,lessonId=state.lesson?.id??null;
  if(!beginWrite())return;
  try{
    if(lessonId!==null){
      const {slug,...data}=payload;
      await api("/lessons/"+lessonId,"PATCH",data);
    }else{
      await api("/courses/"+courseId+"/lessons","POST",payload);
    }
    if(!state.accessDenied){await refreshLessons();say("Aula salva em rascunho.");}
  }catch(error){say(error.message);}
  finally{finishWrite();}
});
$("delete-course").addEventListener("click",async()=>{
  if(state.accessDenied||!state.course||state.course.is_published)return;
  const courseId=state.course.id;
  if(!confirm("Excluir definitivamente este curso criado em rascunho? Somente cursos nunca publicados e sem histórico ou progresso podem ser removidos."))return;
  if(state.accessDenied||state.course?.id!==courseId||!beginWrite())return;
  $("delete-course").disabled=true;
  try{
    await api("/courses/"+courseId,"DELETE");
    if(!state.accessDenied){await refreshCourses(null);say("Rascunho nunca publicado excluído com registro de auditoria.");}
  }catch(error){say(error.message);if(!state.accessDenied&&state.course?.id===courseId)$("delete-course").disabled=false;}
  finally{finishWrite();}
});
function editorialHasUnsavedChanges(){
  const c=state.course;
  if(!c)return true;
  if($("course-title").value.trim()!==String(c.title||"")||
     $("course-category").value!==String(c.category||"")||
     $("course-summary").value.trim()!==String(c.summary||"")||
     intField("course-sort")!==Number(c.sort_order||0))return true;
  const lesson=state.lesson;
  if(lesson){
    return $("lesson-title").value.trim()!==String(lesson.title||"")||
      $("lesson-body").value.trim()!==String(lesson.body||"")||
      intField("lesson-sort")!==Number(lesson.sort_order||0);
  }
  return Boolean($("lesson-title").value.trim()||
     $("lesson-slug").value.trim()||$("lesson-body").value.trim());
}
// A navigation-only dirty check. The editorial publication preflight uses
// editorialHasUnsavedChanges() with stricter semantics for unsaved courses.
function courseHasUnsavedEdits(){
  const c=state.course;
  if(!c)return Boolean($("course-title").value.trim()||$("course-slug").value.trim()||
    $("course-summary").value.trim()||Number($("course-sort").value)!==0||
    $("course-category").value!=="metodologia");
  return $("course-title").value.trim()!==String(c.title||"")||
    $("course-category").value!==String(c.category||"")||
    $("course-summary").value.trim()!==String(c.summary||"")||
    intField("course-sort")!==Number(c.sort_order||0);
}
function lessonHasUnsavedEdits(){
  const lesson=state.lesson;
  if(!lesson)return Boolean($("lesson-title").value.trim()||
    $("lesson-slug").value.trim()||$("lesson-body").value.trim()||
    Number($("lesson-sort").value)!==0);
  return $("lesson-title").value.trim()!==String(lesson.title||"")||
    $("lesson-body").value.trim()!==String(lesson.body||"")||
    intField("lesson-sort")!==Number(lesson.sort_order||0);
}
function confirmDiscardCourseAndLesson(){
  if(!courseHasUnsavedEdits()&&!lessonHasUnsavedEdits())return true;
  return confirm("Há alterações em curso ou aula que ainda não foram salvas. Descartar essas alterações e continuar?");
}
function confirmDiscardLesson(){
  if(!lessonHasUnsavedEdits())return true;
  return confirm("Esta aula tem alterações não salvas. Descartá-las e continuar?");
}
// Protect drafts on browser navigation as well as internal course/lesson
// switching. Do not intercept navigation after the Portal revokes access;
// no private content may be retained by an expired session.
function mustConfirmBrowserExit(){
  return !state.accessDenied &&
    (state.writePending||courseHasUnsavedEdits()||lessonHasUnsavedEdits());
}
window.addEventListener("beforeunload",event=>{
  if(!mustConfirmBrowserExit())return;
  event.preventDefault();
  event.returnValue="";
});

function renderPublicationCheck(snapshot){
  const box=$("publication-readiness");box.replaceChildren();box.hidden=false;
  box.append(el("strong",snapshot.ready?
    "Rascunho tecnicamente pronto para revisão editorial":
    "Pendências antes da publicação"));
  box.append(el("p","Versão "+String(snapshot.version)+" · "+
    String(snapshot.lesson_count)+" aula(s) · Diagnóstico informativo, sem publicar."));
  const messages={
    not_draft:"O curso não está em um rascunho publicável.",
    missing_lessons:"Inclua pelo menos uma aula antes de publicar.",
    invalid_lesson:"Revise títulos e conteúdo das aulas.",
    missing_optional_summary:"Uma descrição curta facilita a compreensão do curso."
  };
  for(const key of [].concat(snapshot.issues||[],snapshot.warnings||[])){
    box.append(el("p",messages[key]||"Revise os dados editoriais."));
  }
  if(snapshot.ready)box.append(el("p","A aprovação humana independente continua obrigatória."));
}
async function publicationCheck(){
  const courseId=state.course?.id??null;
  if(courseId===null||state.accessDenied||state.writePending||state.course.is_published)return null;
  if(editorialHasUnsavedChanges()){
    say("Salve todas as alterações do curso e das aulas antes de verificar a publicação.");
    return null;
  }
  const request=++state.preflightRequest;
  const snapshot=await api("/courses/"+courseId+"/publication-check");
  if(state.accessDenied||state.writePending||state.course?.id!==courseId||
    state.preflightRequest!==request||editorialHasUnsavedChanges())return null;
  renderPublicationCheck(snapshot);
  return snapshot;
}
$("course-form").addEventListener("input",clearPublicationCheck);
$("lesson-form").addEventListener("input",clearPublicationCheck);
$("check-publication").addEventListener("click",async()=>{
  try{await publicationCheck();}catch(error){say(error.message);}
});
$("publish").addEventListener("click",async()=>{
  if(state.accessDenied||!state.course||state.course.is_published)return;
  const courseId=state.course.id;
  let reviewed;
  try{reviewed=await publicationCheck();}catch(error){say(error.message);return;}
  if(!reviewed)return;
  if(!reviewed.ready){
    say("Existem pendências no rascunho. Consulte a verificação de publicação.");
    return;
  }
  if(!confirm("Publicar esta versão revisada para os clientes elegíveis? Confirme somente após revisão editorial independente. A publicação não libera o SSO ou o Portal por si só."))return;
  if(state.accessDenied||state.course?.id!==courseId||state.course.is_published||!beginWrite())return;
  try{
    await api("/courses/"+courseId+"/publish","POST",{expected_content_hash:reviewed.content_hash});
    if(!state.accessDenied){
      await refreshCourses(courseId);
      say("Versão do curso publicada no catálogo privado; elegibilidade continua decidida pelo Portal.");
    }
  }catch(error){say(error.message);}
  finally{finishWrite();}
});
function unpublishWarning(title){
  const name=String(title||"este curso").slice(0,200);
  return "Retirar "+name+" do ar? As aulas publicadas ficarão indisponíveis para os alunos, o histórico anterior será preservado e a nova versão começará com progresso separado. Confirme apenas se deseja criar o novo rascunho.";
}
$("unpublish").addEventListener("click",async()=>{
  if(state.accessDenied||!state.course||!state.course.is_published)return;
  const courseId=state.course.id;
  if(!confirm(unpublishWarning(state.course.title)))return;
  if(state.accessDenied||state.course?.id!==courseId||!beginWrite())return;
  try{
    await api("/courses/"+courseId+"/unpublish","POST");
    if(!state.accessDenied){
      await refreshCourses(courseId);
      say("Versão anterior arquivada; novo rascunho criado. O progresso da versão nova começa separado.");
    }
  }catch(error){say(error.message);}
  finally{finishWrite();}
});
function renderAudit(){
  if(state.accessDenied)return;
  const box=$("audit-items");box.replaceChildren();
  if(!state.auditEvents.length)box.append(el("p","Nenhuma alteração editorial registrada.","help"));
  for(const item of state.auditEvents){
    const row=el("div",undefined,"audit-row");
    row.append(
      el("strong",String(item.action||"alteração")),
      el("small",String(item.resource_kind||"recurso")+" #"+
        String(item.resource_id??"")+" · "+String(item.occurred_at||"").slice(0,19))
    );
    box.append(row);
  }
  $("load-more-audit").disabled=state.auditNextBeforeId===null;
}
async function refreshAudit(beforeId=null){
  if(state.accessDenied)return;
  const request=++state.auditRequest;
  $("refresh-audit").disabled=true;$("load-more-audit").disabled=true;
  try{
    const query=beforeId!==null?"?before_id="+encodeURIComponent(String(beforeId)):"";
    const response=await api("/audit"+query);
    if(state.accessDenied||state.auditRequest!==request)return;
    const rows=Array.isArray(response.events)?response.events:[];
    state.auditEvents=beforeId===null?rows:state.auditEvents.concat(rows);
    state.auditNextBeforeId=Number.isSafeInteger(response.next_before_id)&&response.next_before_id>0
      ?response.next_before_id:null;
    renderAudit();
  }finally{
    if(!state.accessDenied&&state.auditRequest===request)$("refresh-audit").disabled=false;
  }
}
$("refresh-audit").addEventListener("click",()=>{refreshAudit().catch(error=>say(error.message));});
$("load-more-audit").addEventListener("click",()=>{
  if(state.auditNextBeforeId!==null){
    refreshAudit(state.auditNextBeforeId).catch(error=>say(error.message));
  }
});
async function loadAdminCatalog(){
  if(state.accessDenied||state.writePending||state.catalogLoading)return;
  state.catalogLoading=true;
  if(!state.catalogReady)$("new-course").disabled=true;
  const retry=$("retry-catalog"),recovery=$("catalog-recovery");
  retry.disabled=true;recovery.hidden=true;
  $("course-items").replaceChildren();
  $("course-items").append(el("p","Verificando acesso editorial e cursos...", "help"));
  try{
    await refreshCourses();
    if(!state.accessDenied)say("");
  }catch(error){
    if(!state.accessDenied){
      // A failed catalog read cannot keep stale editorial data on screen.
      state.catalogReady=false;
      $("new-course").disabled=true;
      state.courses=[];state.course=null;state.lessons=[];state.lesson=null;
      ++state.lessonRequest;
      renderCourses();renderLessons();fillCourse();resetLesson();
      $("course-items").replaceChildren();
      $("course-items").append(el("p","Cursos temporariamente indisponíveis.", "help"));
      $("lesson-items").replaceChildren();
      hideLessonPreview();clearPublicationCheck();
      say(error.message);
      recovery.hidden=false;
    }
  }finally{
    state.catalogLoading=false;
    if(!state.accessDenied)retry.disabled=false;
  }
}
$("retry-catalog").addEventListener("click",loadAdminCatalog);
loadAdminCatalog();
(async()=>{try{await refreshAudit();}catch(error){say(error.message);}})();
</script>
</body>
</html>