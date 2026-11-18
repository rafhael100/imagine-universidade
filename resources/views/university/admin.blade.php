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
    .archive-panel{margin-top:20px}
    .archive-panel .panel-header{flex-wrap:wrap}
    .archive-context,.archive-status{font-size:13px;margin:0 0 10px;overflow-wrap:anywhere}
    .archive-grid{display:grid;grid-template-columns:minmax(180px,.8fr) minmax(0,2fr);gap:18px}
    .archive-grid h3{font-size:15px;margin:0 0 9px}
    .archive-list{display:grid;gap:4px;max-height:340px;overflow:auto;margin-bottom:10px}
    .archive-list .item{border-color:var(--line)}
    .archive-reader{border-top:1px solid var(--line);padding-top:16px;margin-top:16px;overflow-wrap:anywhere}
    .archive-reader h4{font-size:18px;margin:0 0 8px}
    .archive-text{white-space:pre-wrap;line-height:1.65;color:#465369}
    .archive-panel [hidden]{display:none}
    .overview-panel{margin:0 0 20px}
    .overview-panel .panel-header{flex-wrap:wrap;padding:15px 20px}
    .overview-body{padding:16px 20px}
    .overview-status{font-size:13px;margin:0 0 12px}
    .overview-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 14px}
    .overview-card{padding:10px 12px;background:#F7F8FA;border:1px solid var(--line);border-radius:10px;min-width:0}
    .overview-card strong{display:block;font-size:23px;line-height:1.3;overflow-wrap:anywhere}
    .overview-card span{display:block;font-size:12px;color:#505650}
    .overview-warnings{display:flex;flex-wrap:wrap;gap:4px 22px;padding-left:18px;margin:0 0 12px;font-size:13px;color:#505650}
    .overview-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px}
    .overview-table caption{text-align:left;font-weight:750;color:var(--ink);padding:0 0 6px}
    .overview-table th,.overview-table td{padding:8px 5px;border-bottom:1px solid var(--line);text-align:right;overflow-wrap:anywhere}
    .overview-table th:first-child{width:36%;text-align:left}
    .overview-body>.help{margin:10px 0 0}
    #overview-content[hidden]{display:none}
    .editorial-preview h3{font-size:19px;color:#263044}
    .editorial-preview h4{font-size:14px;color:#70410C;margin:18px 0 6px}
    .editorial-preview p{white-space:pre-wrap;line-height:1.65;color:#465369}
    .footer{font-size:12px;color:#565D56;margin-top:28px}
    @media(max-width:820px){.layout,.archive-grid{grid-template-columns:1fr}.container{padding:18px 14px}.top-inner{padding:14px;flex-wrap:wrap}.grid{grid-template-columns:1fr}.nav-links{width:100%}.logo{width:145px}}
    @media(max-width:520px){.overview-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.overview-body{padding:14px}.overview-panel .panel-header{padding:14px}.overview-table th:first-child{width:32%}}
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
  <section id="editorial-overview" class="panel overview-panel" aria-labelledby="overview-title">
    <div class="panel-header"><h2 id="overview-title">Visão do acervo</h2><button type="button" id="refresh-overview" class="secondary" disabled>Atualizar visão</button></div>
    <div class="overview-body">
      <p id="overview-status" class="overview-status" role="status" aria-live="polite">A visão do acervo estará disponível após carregar os cursos.</p>
      <div id="overview-content" hidden>
        <div id="overview-cards" class="overview-cards"></div>
        <ul id="overview-warnings" class="overview-warnings"></ul>
        <table class="overview-table">
          <caption>Distribuição por categoria</caption>
          <thead><tr><th scope="col">Categoria</th><th scope="col">Cursos</th><th scope="col">Publicados</th><th scope="col">Rascunhos</th><th scope="col">Aulas</th></tr></thead>
          <tbody id="overview-categories"></tbody>
        </table>
      </div>
      <p class="help">Os números consideram o acervo salvo e as aulas da versão mais recente de cada curso. Os avisos de aula e descrição não substituem a conferência de publicação.</p>
    </div>
  </section>
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
  <section id="editorial-versions-panel" class="panel archive-panel" aria-labelledby="archived-versions-title">
    <div class="panel-header">
      <h2 id="archived-versions-title">Versões arquivadas</h2>
      <button type="button" id="refresh-editorial-versions" class="secondary" disabled>Consultar versões</button>
    </div>
    <div class="panel-body">
      <p id="editorial-versions-context" class="archive-context" hidden></p>
      <p id="editorial-versions-status" class="archive-status" role="status" aria-live="polite">Selecione um curso para consultar suas versões arquivadas.</p>
      <div id="editorial-version-browser" class="archive-grid" hidden>
        <div>
          <h3>Versões disponíveis para consulta</h3>
          <div id="editorial-version-list" class="archive-list" aria-label="Versões arquivadas do curso"></div>
          <button type="button" id="more-editorial-versions" class="secondary" hidden disabled>Carregar versões anteriores</button>
        </div>
        <div>
          <h3 id="editorial-version-heading">Selecione uma versão</h3>
          <p id="editorial-version-lessons-status" class="archive-status" role="status" aria-live="polite"></p>
          <div id="editorial-version-lessons" class="archive-list" aria-label="Aulas da versão arquivada"></div>
          <button type="button" id="more-version-lessons" class="secondary" hidden disabled>Carregar mais aulas</button>
          <p id="editorial-version-body-status" class="archive-status" role="status" aria-live="polite"></p>
          <article id="editorial-version-content" class="archive-reader" aria-label="Aula arquivada, somente leitura" hidden></article>
        </div>
      </div>
      <p class="help">Consulta do conteúdo salvo em cada versão arquivada, somente leitura. O rascunho e a versão publicada continuam no editor acima.</p>
    </div>
  </section>
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
const state={courses:[],course:null,lessons:[],lesson:null,courseRequest:0,lessonRequest:0,auditRequest:0,auditEvents:[],auditNextBeforeId:null,preflightRequest:0,writePending:false,accessDenied:false,accessMessage:"",catalogLoading:false,catalogReady:false,lessonsReady:false,writeOutcomeUnknown:false,
  overviewSnapshot:null,overviewRequest:0,overviewLoading:false,overviewAttempted:false,
  overviewMessage:"A visão do acervo estará disponível após carregar os cursos.",
  archive:{courseId:null,versions:[],nextBefore:null,selectedVersion:null,lessons:[],nextAfter:null,lesson:null,bodyLessonId:null,
    versionsLoaded:false,lessonsLoaded:false,versionsLoading:false,lessonsLoading:false,bodyLoading:false,
    versionsRequest:0,lessonsRequest:0,bodyRequest:0,message:"Selecione um curso para consultar suas versões arquivadas.",
    lessonsMessage:"",bodyMessage:""}};
const cats={metodologia:"Metodologia",negocios:"Negócios",sistemas:"Sistemas Imagine"};
function say(message){
  const shown=state.accessDenied?state.accessMessage:message;
  note.hidden=!shown;note.textContent=shown||"";
}
function beginWrite(){
  if(state.accessDenied||state.writePending||state.writeOutcomeUnknown||!state.catalogReady||(state.course!==null&&!state.lessonsReady))return false;
  state.writePending=true;
  ++state.courseRequest;++state.lessonRequest;
  invalidateEditorialOverview("O acervo pode ter mudado. Atualize a visão após concluir a alteração.");
  invalidateEditorialArchive("O acervo pode ter mudado. Consulte as versões após concluir a alteração.");
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
  renderEditorialOverview();
  renderEditorialArchive();
}
// A server may commit an editorial mutation before its HTTP response is
// lost. Do not let a rejected/ambiguous response unlock a second write.
// Keep unsaved fields visible (but disabled) until an explicit fresh read;
// never make an automatic second POST/DELETE/PATCH to reconcile.
function freezeUncertainEditorialWrite(){
  if(state.accessDenied)return;
  state.writeOutcomeUnknown=true;
  state.catalogReady=false;state.lessonsReady=false;
  ++state.courseRequest;++state.lessonRequest;
  for(const id of ["new-course","course-save","lesson-save","delete-course",
      "delete-lesson","publish","unpublish","check-publication",
      "course-title","course-category","course-summary","course-sort",
      "lesson-title","lesson-slug","lesson-body","lesson-sort"]){
    const element=$(id);if(element)element.disabled=true;
  }
  $("catalog-recovery").hidden=false;
  $("retry-catalog").disabled=false;
  clearPublicationCheck();hideLessonPreview();
  invalidateEditorialOverview("Consulte novamente os cursos para confirmar a alteração antes de atualizar a visão do acervo.");
  invalidateEditorialArchive("Confirme a alteração consultando os cursos antes de abrir as versões arquivadas.");
  say("O resultado da alteração não pôde ser confirmado. Não repita a operação: consulte novamente os cursos e aulas antes de continuar.");
}
function clearPublicationCheck(){
  ++state.preflightRequest;
  $("publication-readiness").replaceChildren();
  $("publication-readiness").hidden=true;
}
function lockAccess(message){
  if(state.accessDenied)return;
  state.accessDenied=true;state.accessMessage=message;state.catalogReady=false;state.lessonsReady=false;
  document.querySelector(".layout").inert=true;
  state.courses=[];state.course=null;state.lessons=[];state.lesson=null;state.lessonsReady=false;
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
  invalidateEditorialOverview("");
  invalidateEditorialArchive("");
  say(message);
}
function el(tag,text,className){
  const x=document.createElement(tag);
  if(text!==undefined)x.textContent=text;
  if(className)x.className=className;
  return x;
}
// Error bodies do not contribute UI data, but their streams still need a
// bounded cleanup. Discard chunks without decoding, retaining or logging them.
// Never await this cleanup before revocation, fallback or an error action.
async function discardErrorBody(response){
  let reader=null,timer=null,cancelled=false;
  const cancel=()=>{
    if(cancelled||reader===null)return;
    cancelled=true;
    try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}
  };
  try{
    const body=response?.body;
    if(!body||typeof body.getReader!=="function")return;
    reader=body.getReader();
    if(!reader||typeof reader.read!=="function"){cancel();return;}
    const expired={};
    const deadline=new Promise(resolve=>{
      timer=setTimeout(()=>{cancel();resolve(expired);},2000);
    });
    let bytes=0;
    for(let reads=0;reads<64;reads++){
      // Promise.race observes late read rejections too, after the deadline
      // has won. Cancellation itself is deliberately never awaited.
      const chunk=await Promise.race([reader.read(),deadline]);
      if(chunk===expired)return;
      if(!chunk||typeof chunk.done!=="boolean"){cancel();return;}
      if(chunk.done)return;
      const length=chunk.value?.byteLength;
      if(!Number.isSafeInteger(length)||length<0){cancel();return;}
      bytes+=length;
      if(bytes>=16384){cancel();return;}
    }
    cancel();
  }catch{cancel();}
  finally{
    if(timer!==null)clearTimeout(timer);
    try{reader?.releaseLock();}catch{}
  }
}
async function api(path,method="GET",payload=null){
  if(state.accessDenied)throw new Error(state.accessMessage);
  const response=await fetch(base+path,{
    method,credentials:"same-origin",cache:"no-store",
    headers:{"Accept":"application/json","X-Requested-With":"XMLHttpRequest","Content-Type":"application/json","X-CSRF-TOKEN":csrf},
    body:payload===null?undefined:JSON.stringify(payload)
  });
  // A successful response can arrive after another request revokes access.
  // Release that unread body too, without decoding it or delaying denial.
  if(!response.ok||state.accessDenied)void discardErrorBody(response);
  if(response.status===403)lockAccess("Acesso administrativo não autorizado. Volte ao Portal.");
  if(response.status===419)lockAccess("Sessão expirada. Acesse novamente pelo Portal.");
  if(state.accessDenied)throw new Error(state.accessMessage);
  if(!response.ok){throw new Error("Operação não concluída. Verifique seus dados e permissões.");}
  const data=await response.json();
  if(state.accessDenied)throw new Error(state.accessMessage);
  return data;
}
// The summary describes persisted editorial material. A valid zero is useful;
// missing, rounded or inconsistent counts must never masquerade as an empty
// collection. Select only the documented aggregate fields from the response.
function validatedEditorialOverview(payload){
  const record=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);
  const count=value=>Number.isSafeInteger(value)&&value>=0;
  const names=["metodologia","negocios","sistemas"];
  const keys=["courses","published_courses","draft_courses","current_lessons"];
  if(!record(payload)||payload.schema_version!==1||payload.scope!=="current_editorial_catalog"||
     !record(payload.totals)||!Array.isArray(payload.categories)||payload.categories.length!==3)return null;
  const totals={};
  for(const key of [...keys,"courses_without_lessons","courses_without_summary"]){
    if(!count(payload.totals[key]))return null;
    totals[key]=payload.totals[key];
  }
  if(!Number.isSafeInteger(totals.published_courses+totals.draft_courses)||
     totals.published_courses+totals.draft_courses!==totals.courses||
     totals.courses_without_lessons>totals.courses||totals.courses_without_summary>totals.courses||
     totals.current_lessons<totals.courses-totals.courses_without_lessons||
     (totals.courses_without_lessons===totals.courses&&totals.current_lessons!==0))return null;
  const categories=[],sums=Object.fromEntries(keys.map(key=>[key,0]));
  for(let index=0;index<names.length;index++){
    const item=payload.categories[index];
    if(!record(item)||item.category!==names[index])return null;
    const category={category:names[index]};
    for(const key of keys){
      if(!count(item[key])||!Number.isSafeInteger(sums[key]+item[key]))return null;
      category[key]=item[key];sums[key]+=item[key];
    }
    if(!Number.isSafeInteger(category.published_courses+category.draft_courses)||
       category.published_courses+category.draft_courses!==category.courses||
       (category.courses===0&&category.current_lessons!==0))return null;
    categories.push(category);
  }
  if(keys.some(key=>sums[key]!==totals[key]))return null;
  return {schema_version:1,scope:"current_editorial_catalog",totals,categories};
}
function renderEditorialOverview(){
  const active=!state.accessDenied&&state.catalogReady&&!state.catalogLoading&&
    !state.writePending&&!state.writeOutcomeUnknown;
  $("refresh-overview").disabled=!active||state.overviewLoading;
  $("overview-status").textContent=state.accessDenied?"":state.overviewMessage;
  const snapshot=active?state.overviewSnapshot:null;
  $("overview-content").hidden=snapshot===null;
  for(const id of ["overview-cards","overview-warnings","overview-categories"])$(id).replaceChildren();
  if(snapshot===null)return;
  for(const [key,label] of [["courses","Cursos"],["published_courses","Publicados"],
      ["draft_courses","Rascunhos"],["current_lessons","Aulas atuais"]]){
    const card=el("div",undefined,"overview-card");card.dataset.overviewMetric=key;
    card.append(el("strong",String(snapshot.totals[key])),el("span",label));
    $("overview-cards").append(card);
  }
  $("overview-warnings").append(
    el("li",String(snapshot.totals.courses_without_lessons)+" curso(s) sem aulas na versão mais recente."),
    el("li",String(snapshot.totals.courses_without_summary)+" curso(s) sem descrição curta.")
  );
  for(const category of snapshot.categories){
    const row=el("tr");row.dataset.overviewCategory=category.category;
    const heading=el("th",cats[category.category]);heading.scope="row";row.append(heading);
    for(const key of ["courses","published_courses","draft_courses","current_lessons"])
      row.append(el("td",String(category[key])));
    $("overview-categories").append(row);
  }
}
function invalidateEditorialOverview(message){
  ++state.overviewRequest;
  state.overviewSnapshot=null;state.overviewMessage=message;
  // Keep an outstanding read single-flight until it settles. Its generation
  // can no longer render, even if the write finishes before the old GET.
  renderEditorialOverview();
}
async function refreshEditorialOverview(){
  if(state.accessDenied||!state.catalogReady||state.catalogLoading||state.writePending||
     state.writeOutcomeUnknown||state.overviewLoading)return;
  const request=++state.overviewRequest;
  const current=()=>!state.accessDenied&&state.catalogReady&&!state.catalogLoading&&
    !state.writePending&&!state.writeOutcomeUnknown&&state.overviewRequest===request;
  state.overviewAttempted=true;state.overviewLoading=true;state.overviewSnapshot=null;
  state.overviewMessage="Consultando a visão do acervo...";renderEditorialOverview();
  try{
    const payload=await api("/overview");
    if(!current())return;
    const snapshot=validatedEditorialOverview(payload);
    if(snapshot===null)throw new Error("invalid_editorial_overview");
    state.overviewSnapshot=snapshot;
    state.overviewMessage=snapshot.totals.courses===0
      ?"Nenhum curso cadastrado. Os totais do acervo estão zerados."
      :"Visão atualizada com os dados salvos do acervo.";
  }catch(error){
    if(current()){
      state.overviewSnapshot=null;
      state.overviewMessage="A visão do acervo está indisponível. Você pode atualizar novamente; o editor continua disponível.";
    }
  }finally{
    state.overviewLoading=false;
    renderEditorialOverview();
  }
}
$("refresh-overview").addEventListener("click",refreshEditorialOverview);
const intField=id=>Number.parseInt($(id).value,10)||0;
const draft=()=>!state.accessDenied&&!state.writeOutcomeUnknown&&state.catalogReady&&(state.course===null||(state.lessonsReady&&!Boolean(state.course.is_published)));
function archiveRecord(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}
function archiveText(value,max){
  return typeof value==="string"&&value.length<=max*2&&value.trim().length>0&&Array.from(value).length<=max;
}
function archiveSlug(value){
  return typeof value==="string"&&value.length<=120&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
function archivePositive(value){
  return Number.isSafeInteger(value)&&value>0;
}
function archiveEnvelope(payload,courseId){
  return archiveRecord(payload)&&payload.schema_version===1&&payload.scope==="editorial_archived_content"&&payload.course_id===courseId;
}
function validatedArchivedVersions(payload,courseId,beforeVersion=null,existing=[]){
  if(!archiveEnvelope(payload,courseId)||!Array.isArray(payload.versions)||payload.versions.length>50)return null;
  const seen=new Set(existing.map(item=>item.version)),versions=[];
  let previous=beforeVersion??Infinity;
  for(const item of payload.versions){
    if(!archiveRecord(item)||!archivePositive(item.version)||item.version>=previous||seen.has(item.version)||
       item.status!=="archived"||!Number.isSafeInteger(item.lesson_count)||item.lesson_count<0)return null;
    previous=item.version;seen.add(item.version);
    versions.push({version:item.version,status:"archived",lesson_count:item.lesson_count});
  }
  const next=payload.next_before_version;
  if(next!==null&&(!archivePositive(next)||versions.length!==50||next!==versions[versions.length-1]?.version))return null;
  return {versions,next_before_version:next};
}
function archivePairAfter(item,cursor){
  return cursor===null||item.sort_order>cursor.sort_order||(item.sort_order===cursor.sort_order&&item.id>cursor.lesson_id);
}
function validatedArchivedLessons(payload,courseId,version,after=null,existing=[],lessonCount=null){
  if(!archiveEnvelope(payload,courseId)||payload.course_version!==version||payload.status!=="archived"||
     !Array.isArray(payload.lessons)||payload.lessons.length>50)return null;
  const ids=new Set(existing.map(item=>item.id)),slugs=new Set(existing.map(item=>item.slug)),lessons=[];
  let cursor=after;
  for(const item of payload.lessons){
    if(!archiveRecord(item)||!archivePositive(item.id)||ids.has(item.id)||!archiveSlug(item.slug)||slugs.has(item.slug)||
       !archiveText(item.title,200)||!Number.isSafeInteger(item.sort_order)||item.sort_order<0||!archivePairAfter(item,cursor))return null;
    ids.add(item.id);slugs.add(item.slug);cursor={sort_order:item.sort_order,lesson_id:item.id};
    lessons.push({id:item.id,slug:item.slug,title:item.title,sort_order:item.sort_order});
  }
  const next=payload.next_after;
  if(next!==null&&(!archiveRecord(next)||!Number.isSafeInteger(next.sort_order)||next.sort_order<0||
     !archivePositive(next.lesson_id)||lessons.length!==50||next.sort_order!==cursor?.sort_order||next.lesson_id!==cursor?.lesson_id))return null;
  const total=existing.length+lessons.length;
  if(lessonCount!==null&&(!Number.isSafeInteger(lessonCount)||lessonCount<0||total>lessonCount||
     (next===null?total!==lessonCount:total>=lessonCount)))return null;
  return {lessons,next_after:next===null?null:{sort_order:next.sort_order,lesson_id:next.lesson_id}};
}
function validatedArchivedLesson(payload,courseId,version,expected){
  if(!archiveEnvelope(payload,courseId)||payload.course_version!==version||payload.status!=="archived"||!archiveRecord(payload.lesson))return null;
  const item=payload.lesson;
  if(item.id!==expected.id||item.slug!==expected.slug||item.title!==expected.title||item.sort_order!==expected.sort_order||
     !archiveText(item.body,30000))return null;
  return {id:item.id,slug:item.slug,title:item.title,body:item.body,sort_order:item.sort_order};
}
function editorialArchiveAllowed(){
  return !state.accessDenied&&state.catalogReady&&!state.catalogLoading&&!state.writePending&&!state.writeOutcomeUnknown&&
    archivePositive(state.course?.id)&&state.courses.some(course=>course.id===state.course.id);
}
function renderEditorialArchive(){
  const a=state.archive,active=editorialArchiveAllowed(),scoped=active&&a.courseId===state.course.id;
  const renderedCourse=a.courseId,renderedVersion=a.selectedVersion;
  $("editorial-versions-panel").hidden=state.accessDenied;
  const context=$("editorial-versions-context");
  context.hidden=!active;context.textContent=active?"Curso no cadastro atual: "+state.course.title:"";
  $("editorial-versions-status").textContent=state.accessDenied?"":!state.course
    ?"Selecione um curso para consultar suas versões arquivadas.":a.message;
  const refresh=$("refresh-editorial-versions");refresh.disabled=!active||a.versionsLoading;
  refresh.textContent=a.versionsLoading?"Consultando versões...":a.versionsLoaded?"Atualizar versões":"Consultar versões";
  $("editorial-version-browser").hidden=!scoped||!a.versionsLoaded||a.versions.length===0;
  const versions=$("editorial-version-list");versions.replaceChildren();
  if(scoped)for(const item of a.versions){
    const button=el("button",undefined,"item");button.type="button";button.dataset.archiveVersion=String(item.version);
    button.disabled=a.versionsLoading;button.setAttribute("aria-current",String(a.selectedVersion===item.version));
    button.append(el("strong","Versão "+item.version+" · Arquivada"),el("small",item.lesson_count+" aula"+(item.lesson_count===1?"":"s")));
    button.addEventListener("click",()=>{
      if(state.course?.id===renderedCourse)void loadEditorialArchiveLessons(item.version);
    });versions.append(button);
  }
  const more=$("more-editorial-versions");more.hidden=!scoped||a.nextBefore===null;more.disabled=!active||a.versionsLoading;
  $("editorial-version-heading").textContent=scoped&&a.selectedVersion!==null?"Versão "+a.selectedVersion+" · Arquivada":"Selecione uma versão";
  $("editorial-version-lessons-status").textContent=scoped?a.lessonsMessage:"";
  const lessons=$("editorial-version-lessons");lessons.replaceChildren();
  if(scoped)for(const item of a.lessons){
    const button=el("button",undefined,"item");button.type="button";button.dataset.archiveLesson=String(item.id);
    button.disabled=!a.lessonsLoaded||(a.bodyLoading&&a.bodyLessonId===item.id);button.setAttribute("aria-current",String(a.lesson?.id===item.id));
    button.append(el("strong",item.title),el("small",item.slug));
    button.addEventListener("click",()=>{
      if(state.course?.id===renderedCourse&&a.selectedVersion===renderedVersion)void loadEditorialArchiveBody(item.id);
    });lessons.append(button);
  }
  const next=$("more-version-lessons");next.hidden=!scoped||a.nextAfter===null;next.disabled=!active||a.lessonsLoading;
  $("editorial-version-body-status").textContent=scoped?a.bodyMessage:"";
  const content=$("editorial-version-content");content.replaceChildren();content.hidden=!scoped||a.lesson===null;
  if(scoped&&a.lesson){
    content.append(el("p","Versão "+a.selectedVersion+" · Arquivada · Somente leitura","help"),
      el("h4",a.lesson.title),el("p",a.lesson.body,"archive-text"));
  }
}
function clearEditorialArchiveSelection(){
  const a=state.archive;++a.lessonsRequest;++a.bodyRequest;
  a.selectedVersion=null;a.lessons=[];a.nextAfter=null;a.lesson=null;a.bodyLessonId=null;
  a.lessonsLoaded=false;a.lessonsLoading=false;a.bodyLoading=false;a.lessonsMessage="";a.bodyMessage="";
}
function invalidateEditorialArchive(message){
  const a=state.archive;++a.versionsRequest;
  a.courseId=null;a.versions=[];a.nextBefore=null;a.versionsLoaded=false;a.versionsLoading=false;a.message=message;
  clearEditorialArchiveSelection();renderEditorialArchive();
}
async function loadEditorialArchiveVersions(beforeVersion=null){
  const a=state.archive;
  if(!editorialArchiveAllowed()||a.versionsLoading)return;
  const courseId=state.course.id,append=beforeVersion!==null;
  if(append&&(!archivePositive(beforeVersion)||!a.versionsLoaded||a.courseId!==courseId||beforeVersion!==a.nextBefore))return;
  if(!append)invalidateEditorialArchive("Consultando versões arquivadas...");
  const request=++a.versionsRequest,existing=append?a.versions:[];
  a.courseId=courseId;a.versionsLoading=true;a.message="Consultando versões arquivadas...";renderEditorialArchive();
  const current=()=>editorialArchiveAllowed()&&state.course.id===courseId&&a.courseId===courseId&&a.versionsRequest===request;
  try{
    const query=append?"?before_version="+encodeURIComponent(String(beforeVersion)):"";
    const payload=await api("/courses/"+courseId+"/versions"+query);
    if(!current())return;
    const page=validatedArchivedVersions(payload,courseId,beforeVersion,existing);
    if(page===null)throw new Error("invalid_archived_versions");
    a.versions=[...existing,...page.versions];a.nextBefore=page.next_before_version;a.versionsLoaded=true;
    a.message=a.versions.length===0?"Este curso não possui versões arquivadas.":
      a.versions.length+" vers"+(a.versions.length===1?"ão arquivada carregada":"ões arquivadas carregadas")+". Selecione uma versão para consultar suas aulas.";
  }catch(error){
    if(current())invalidateEditorialArchive("Não foi possível consultar as versões arquivadas. Use Consultar versões para tentar novamente.");
  }finally{
    if(a.versionsRequest===request){a.versionsLoading=false;renderEditorialArchive();}
  }
}
async function loadEditorialArchiveLessons(version,after=null){
  const a=state.archive,courseId=state.course?.id;
  if(!editorialArchiveAllowed()||a.courseId!==courseId||!a.versionsLoaded||a.versionsLoading||!archivePositive(version))return;
  const metadata=a.versions.find(item=>item.version===version);if(!metadata)return;
  const append=after!==null;
  if(append&&(!a.lessonsLoaded||a.selectedVersion!==version||a.lessonsLoading||!archiveRecord(after)||
     after.sort_order!==a.nextAfter?.sort_order||after.lesson_id!==a.nextAfter?.lesson_id))return;
  if(!append){
    if(a.lessonsLoading&&a.selectedVersion===version)return;
    clearEditorialArchiveSelection();a.selectedVersion=version;
  }
  const request=++a.lessonsRequest,existing=append?a.lessons:[];
  a.lessonsLoading=true;a.lessonsMessage="Consultando aulas arquivadas...";renderEditorialArchive();
  const current=()=>editorialArchiveAllowed()&&state.course.id===courseId&&a.courseId===courseId&&
    a.selectedVersion===version&&a.lessonsRequest===request;
  try{
    const query=append?"?after_sort_order="+encodeURIComponent(String(after.sort_order))+"&after_lesson_id="+encodeURIComponent(String(after.lesson_id)):"";
    const payload=await api("/courses/"+courseId+"/versions/"+version+"/lessons"+query);
    if(!current())return;
    const page=validatedArchivedLessons(payload,courseId,version,after,existing,metadata.lesson_count);
    if(page===null)throw new Error("invalid_archived_lessons");
    a.lessons=[...existing,...page.lessons];a.nextAfter=page.next_after;a.lessonsLoaded=true;
    a.lessonsMessage=a.lessons.length===0?"Esta versão arquivada não possui aulas.":
      a.lessons.length+" aula"+(a.lessons.length===1?" carregada":"s carregadas")+". Selecione uma aula para ler o conteúdo salvo.";
  }catch(error){
    if(current()){
      clearEditorialArchiveSelection();a.selectedVersion=version;
      a.lessonsMessage="Não foi possível consultar as aulas desta versão. Selecione a versão novamente para tentar.";renderEditorialArchive();
    }
  }finally{
    if(a.lessonsRequest===request){a.lessonsLoading=false;renderEditorialArchive();}
  }
}
async function loadEditorialArchiveBody(lessonId){
  const a=state.archive,courseId=state.course?.id,version=a.selectedVersion;
  if(!editorialArchiveAllowed()||a.courseId!==courseId||!a.lessonsLoaded||!archivePositive(version))return;
  const metadata=a.lessons.find(item=>item.id===lessonId);if(!metadata)return;
  if(a.bodyLoading&&a.bodyLessonId===lessonId)return;
  const request=++a.bodyRequest;a.lesson=null;a.bodyLessonId=lessonId;a.bodyLoading=true;a.bodyMessage="Carregando conteúdo arquivado...";renderEditorialArchive();
  const current=()=>editorialArchiveAllowed()&&state.course.id===courseId&&a.courseId===courseId&&a.selectedVersion===version&&a.bodyRequest===request;
  try{
    const payload=await api("/courses/"+courseId+"/versions/"+version+"/lessons/"+lessonId);
    if(!current())return;
    const lesson=validatedArchivedLesson(payload,courseId,version,metadata);
    if(lesson===null)throw new Error("invalid_archived_lesson");
    a.lesson=lesson;a.bodyMessage="Conteúdo arquivado carregado para leitura.";
  }catch(error){
    if(current()){a.lesson=null;a.bodyMessage="Não foi possível ler esta aula arquivada. Selecione a aula novamente para tentar.";}
  }finally{
    if(a.bodyRequest===request){a.bodyLoading=false;renderEditorialArchive();}
  }
}
$("refresh-editorial-versions").addEventListener("click",()=>{void loadEditorialArchiveVersions();});
$("more-editorial-versions").addEventListener("click",()=>{
  if(state.archive.nextBefore!==null)void loadEditorialArchiveVersions(state.archive.nextBefore);
});
$("more-version-lessons").addEventListener("click",()=>{
  if(state.archive.nextAfter!==null)void loadEditorialArchiveLessons(state.archive.selectedVersion,state.archive.nextAfter);
});
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
  updateEditorialControls();
  renderEditorialArchive();
}
// Refreshing lessons must update permissions without replacing the course
// fields: the editor may still have an independent, unsaved course draft.
function updateEditorialControls(){
  if(state.accessDenied)return;
  const c=state.course;
  const editable=draft();
  for(const id of ["course-title","course-category","course-summary","course-sort"]){$(id).disabled=!editable;}
  $("course-save").disabled=!editable;
  $("publish").disabled=!c||!!c.is_published||!state.lessonsReady;
  $("check-publication").disabled=!c||!!c.is_published||!state.lessonsReady;
  clearPublicationCheck();
  $("unpublish").disabled=!c||!c.is_published||!state.lessonsReady;
  $("delete-course").disabled=!c||!!c.is_published||!state.lessonsReady;
  $("lesson-form").querySelectorAll("input,textarea,button").forEach(x=>x.disabled=!c||!editable);
  $("lesson-slug").disabled=!c||!editable||state.lesson!==null;
  $("delete-lesson").disabled=!c||!editable||!state.lesson||
    state.lesson.is_published||state.lesson.status!=="draft";
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
function fillLesson(){
  if(state.accessDenied||!state.lesson)return;
  const lesson=state.lesson;
  hideLessonPreview();
  $("lesson-title").value=lesson.title;$("lesson-slug").value=lesson.slug;
  $("lesson-sort").value=String(lesson.sort_order);
  $("lesson-body").value=lesson.body;$("lesson-title-heading").textContent="Editar aula";
  updateEditorialControls();
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
  if(!state.lessons.length){$("lesson-items").append(el("p",state.course&&!state.lessonsReady?"Verificando aulas autorizadas...":"Nenhuma aula cadastrada.","help"));return;}
  for(const l of state.lessons){
    const btn=el("button",undefined,"item");btn.type="button";btn.dataset.lesson=String(l.id);
    btn.setAttribute("aria-current",String(l.id===state.lesson?.id));
    btn.append(el("strong",l.title),el("small",l.status+" · "+(l.is_published?"Publicada":"Rascunho")));
    $("lesson-items").append(btn);
  }
}
// Validate the catalogue as a whole BEFORE setting catalogReady. A 200
// response containing missing/duplicate IDs or invalid editorial metadata
// must never silently become an "empty catalogue" that permits writes.
// This is supplementary UI validation; the server remains the authority.
function validatedAdminCourses(payload){
  if(!payload||typeof payload!=="object"||Array.isArray(payload)||
     !Array.isArray(payload.courses)||payload.courses.length>5000)return null;
  const ids=new Set(),courses=[];
  for(const item of payload.courses){
    if(!item||typeof item!=="object"||Array.isArray(item)||
       !Number.isSafeInteger(item.id)||item.id<1||ids.has(item.id)||
       typeof item.slug!=="string"||item.slug.length>120||
       !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)||
       typeof item.title!=="string"||!item.title.trim()||item.title.length>200||
       !["metodologia","negocios","sistemas"].includes(item.category)||
       !(item.summary===null||typeof item.summary==="string")||
       (typeof item.summary==="string"&&item.summary.length>500)||
       !Number.isSafeInteger(item.sort_order)||item.sort_order<0||item.sort_order>9999||
       ![true,false,0,1].includes(item.is_published))return null;
    ids.add(item.id);
    courses.push({id:item.id,slug:item.slug,title:item.title,
      category:item.category,summary:item.summary??"",sort_order:item.sort_order,
      is_published:Boolean(item.is_published)});
  }
  return courses;
}
async function refreshCourses(preferredId=state.course?.id??null){
  const request=++state.courseRequest;
  // A failed refresh after an editorial write must never leave the old
  // catalog eligible for another mutation merely because it was once valid.
  state.catalogReady=false;
  invalidateEditorialOverview("Consulte os cursos e atualize a visão para conferir os números do acervo.");
  invalidateEditorialArchive("Consulte as versões arquivadas após carregar os cursos.");
  $("new-course").disabled=true;
  const result=await api("/courses");
  if(state.accessDenied||state.courseRequest!==request)return;
  const verified=validatedAdminCourses(result);
  if(verified===null)throw new Error("O catálogo editorial recebido é inválido. Tente novamente.");
  state.courses=verified;
  state.course=state.courses.find(c=>c.id===preferredId)||null;
  state.catalogReady=true;
  $("new-course").disabled=false;
  renderCourses();fillCourse();
  await refreshLessons();
}
// A course is not editable until its current lesson-version list is
// authenticated and structurally consistent. Invalid 200 responses must
// never be interpreted as "zero lessons" and unlock publishing.
function validatedAdminLessons(payload){
  if(!payload||typeof payload!=="object"||Array.isArray(payload)||
     !Array.isArray(payload.lessons)||payload.lessons.length>5000)return null;
  const ids=new Set(),slugs=new Set(),lessons=[];
  for(const item of payload.lessons){
    if(!item||typeof item!=="object"||Array.isArray(item)||
       !Number.isSafeInteger(item.id)||item.id<1||ids.has(item.id)||
       typeof item.slug!=="string"||item.slug.length>120||
       !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)||slugs.has(item.slug)||
       typeof item.title!=="string"||!item.title.trim()||item.title.length>200||
       typeof item.body!=="string"||item.body.length>30000||
       !Number.isSafeInteger(item.sort_order)||item.sort_order<0||item.sort_order>9999||
       !["draft","published","archived"].includes(item.status)||
       ![true,false,0,1].includes(item.is_published))return null;
    ids.add(item.id);slugs.add(item.slug);
    lessons.push({id:item.id,slug:item.slug,title:item.title,
      body:item.body,sort_order:item.sort_order,status:item.status,
      is_published:Boolean(item.is_published)});
  }
  return lessons;
}
async function refreshLessons(preferredLessonId=state.lesson?.id??null){
  const request=++state.lessonRequest;
  const courseId=state.course?.id??null;
  state.lessonsReady=false;
  state.lessons=[];state.lesson=null;renderLessons();resetLesson();updateEditorialControls();
  if(courseId===null||state.accessDenied)return;
  let result;
  try{
    result=await api("/courses/"+encodeURIComponent(String(courseId))+"/lessons");
    if(state.accessDenied||state.lessonRequest!==request||state.course?.id!==courseId)return;
    const verified=validatedAdminLessons(result);
    if(verified===null)throw new Error("A lista de aulas recebida é inválida. Tente novamente.");
    state.lessons=verified;
    // Only a lesson present in this fresh, authorized list may remain selected.
    // A removed lesson or a new version must never revive the old editor.
    state.lesson=state.lessons.find(lesson=>lesson.id===preferredLessonId)||null;
    state.lessonsReady=true;
    if(state.lesson)fillLesson();
    renderLessons();updateEditorialControls();
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
}
$("course-items").addEventListener("click",async event=>{
  const b=event.target.closest("[data-course]");if(!b||state.accessDenied||state.writePending||state.writeOutcomeUnknown||!state.catalogReady)return;
  const nextId=Number(b.dataset.course);
  if(state.course?.id===nextId)return;
  if(!confirmDiscardCourseAndLesson())return;
  ++state.courseRequest;
  invalidateEditorialArchive("Consulte as versões arquivadas do curso selecionado.");
  say("");state.course=state.courses.find(c=>c.id===Number(b.dataset.course))||null;
  renderCourses();fillCourse();
  try{await refreshLessons();}catch(error){say(error.message);}
});
$("new-course").addEventListener("click",()=>{
  if(state.accessDenied||state.writePending||state.writeOutcomeUnknown||!state.catalogReady)return;
  if(!confirmDiscardCourseAndLesson())return;
  ++state.courseRequest;++state.lessonRequest;
  invalidateEditorialArchive("Selecione um curso para consultar suas versões arquivadas.");
  state.course=null;state.lessons=[];state.lesson=null;state.lessonsReady=false;
  renderCourses();renderLessons();fillCourse();resetLesson();$("course-title").focus();say("");
});
$("course-form").addEventListener("submit",async event=>{
  event.preventDefault();if(!draft())return;
  // Save the lesson first: its refresh preserves these course fields. This
  // prevents a course refresh from silently discarding the other form.
  if(lessonHasUnsavedEdits()){
    say("Salve a aula em edição antes de salvar o curso. Para descartá-la, use Nova aula. As alterações do curso foram mantidas.");
    return;
  }
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
  }catch(error){freezeUncertainEditorialWrite();}
  finally{finishWrite();}
});
$("lesson-items").addEventListener("click",event=>{
  const b=event.target.closest("[data-lesson]");if(!b||state.accessDenied||state.writePending)return;
  if(state.lesson?.id===Number(b.dataset.lesson))return;
  if(!confirmDiscardLesson())return;
  state.lesson=state.lessons.find(l=>l.id===Number(b.dataset.lesson))||null;
  hideLessonPreview();
  if(!state.lesson)return;
  fillLesson();
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
  }catch(error){freezeUncertainEditorialWrite();}
  finally{finishWrite();}
});
$("lesson-form").addEventListener("submit",async event=>{
  event.preventDefault();if(!state.course||!draft())return;
  const payload={title:$("lesson-title").value.trim(),slug:$("lesson-slug").value.trim(),
    body:$("lesson-body").value.trim(),sort_order:intField("lesson-sort")};
  if(!payload.title||payload.body.length<10){say("Preencha título e conteúdo.");return;}
  const courseId=state.course.id,lessonId=state.lesson?.id??null;
  if(!beginWrite())return;
  try{
    let savedLessonId=lessonId;
    if(lessonId!==null){
      const {slug,...data}=payload;
      await api("/lessons/"+lessonId,"PATCH",data);
    }else{
      const result=await api("/courses/"+courseId+"/lessons","POST",payload);
      savedLessonId=result?.id??null;
    }
    if(!state.accessDenied){await refreshLessons(savedLessonId);say("Aula salva em rascunho.");}
  }catch(error){freezeUncertainEditorialWrite();}
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
  }catch(error){freezeUncertainEditorialWrite();}
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

// The UI always publishes the exact diagnostic it just checked. Legacy
// API consumers may omit a hash, but an incomplete 200 response must never
// silently send this interface down that compatibility path.
function validatedPublicationCheck(payload,courseId){
  if(!payload||typeof payload!=="object"||Array.isArray(payload)||
     !Number.isSafeInteger(courseId)||courseId<1||
     payload.course_id!==courseId||
     !Number.isSafeInteger(payload.version)||payload.version<1||
     !Number.isSafeInteger(payload.lesson_count)||payload.lesson_count<0||
     typeof payload.ready!=="boolean"||payload.advisory_only!==true||
     typeof payload.content_hash!=="string"||!/^[a-f0-9]{64}$/.test(payload.content_hash)||
     !Array.isArray(payload.issues)||payload.issues.length>3||
     !Array.isArray(payload.warnings)||payload.warnings.length>1)return null;
  const issueCodes=["not_draft","missing_lessons","invalid_lesson"];
  if(payload.issues.some(code=>!issueCodes.includes(code))||
     new Set(payload.issues).size!==payload.issues.length||
     payload.warnings.some(code=>code!=="missing_optional_summary")||
     payload.ready!==(payload.issues.length===0)||
     payload.issues.includes("missing_lessons")!==(payload.lesson_count===0)||
     (payload.lesson_count===0&&payload.issues.includes("invalid_lesson")))return null;
  return {course_id:courseId,version:payload.version,lesson_count:payload.lesson_count,
    ready:payload.ready,issues:payload.issues.slice(),warnings:payload.warnings.slice(),
    content_hash:payload.content_hash,advisory_only:true};
}
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
  // A failed or malformed new read must not leave the previous readiness
  // visible. Only this diagnostic card is cleared; editor drafts stay intact.
  $("publication-readiness").replaceChildren();
  $("publication-readiness").hidden=true;
  const snapshot=await api("/courses/"+courseId+"/publication-check");
  if(state.accessDenied||state.writePending||state.course?.id!==courseId||
    state.preflightRequest!==request||editorialHasUnsavedChanges())return null;
  const verified=validatedPublicationCheck(snapshot,courseId);
  if(verified===null)throw new Error("Não foi possível validar a conferência de publicação. Tente novamente.");
  renderPublicationCheck(verified);
  return verified;
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
  }catch(error){freezeUncertainEditorialWrite();}
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
  }catch(error){freezeUncertainEditorialWrite();}
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
  if(state.writeOutcomeUnknown&&!confirm("O resultado da última alteração editorial não foi confirmado. Consultar novamente o servidor poderá substituir os campos não salvos desta tela. Continuar?"))return;
  state.catalogLoading=true;
  if(!state.catalogReady)$("new-course").disabled=true;
  const retry=$("retry-catalog"),recovery=$("catalog-recovery");
  retry.disabled=true;recovery.hidden=true;
  $("course-items").replaceChildren();
  $("course-items").append(el("p","Verificando acesso editorial e cursos...", "help"));
  try{
    await refreshCourses();
    if(!state.accessDenied){
      // Only a fully successful course + lesson read resolves uncertainty.
      // Re-render after clearing the fence: controls were intentionally
      // disabled while reconciliation was in progress.
      state.writeOutcomeUnknown=false;
      fillCourse();
      $("new-course").disabled=false;
      say("");
    }
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
    renderEditorialOverview();
    renderEditorialArchive();
    // Only the first fully validated catalogue starts an automatic overview
    // read. Failures and later editorial changes always require a new click.
    if(!state.accessDenied&&state.catalogReady&&!state.writeOutcomeUnknown&&!state.overviewAttempted)
      void refreshEditorialOverview();
  }
}
$("retry-catalog").addEventListener("click",loadAdminCatalog);
loadAdminCatalog();
(async()=>{try{await refreshAudit();}catch(error){say(error.message);}})();
</script>
</body>
</html>
