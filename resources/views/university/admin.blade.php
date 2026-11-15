<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <title>Universidade Imagine | Administração</title>
  <style>
    :root{--orange:#F9941D;--ink:#263044;--muted:#697586;--line:#E4E8EE;--bg:#F8F9FB;--white:#fff}
    *{box-sizing:border-box}
    body{font:14px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;background:var(--bg);color:var(--ink)}
    button,input,select,textarea{font:inherit}button{cursor:pointer}button:disabled{opacity:.6;cursor:not-allowed}
    :focus-visible{outline:3px solid #CE7500;outline-offset:2px}
    .top{background:#fff;border-bottom:1px solid var(--line)}.top-inner{max-width:1180px;margin:auto;display:flex;justify-content:space-between;gap:15px;align-items:center;padding:18px 22px}
    .brand{font-size:20px;font-weight:850;letter-spacing:-.5px}.brand em{font-style:normal;color:#CC7000}
    .eyebrow{color:#A85B00;font-size:11px;letter-spacing:1.6px;font-weight:850;text-transform:uppercase}
    .container{max-width:1180px;margin:auto;padding:27px 22px 55px}h1{margin:4px 0 8px;font-size:30px}h2{font-size:19px;margin:0}h3{font-size:16px;margin:0 0 10px}
    p{color:var(--muted);margin:0 0 14px}
    .notice{border-radius:12px;padding:12px 17px;background:#FFF5E6;border:1px solid #EED2A6;color:#7F521A;margin:20px 0}
    .notice[hidden]{display:none}
    .layout{display:grid;grid-template-columns:300px minmax(0,1fr);gap:19px;align-items:start}
    .panel{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden}
    .panel-header{padding:19px 21px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:12px;align-items:center}
    .panel-body{padding:21px}.items{padding:9px;display:grid;gap:6px}
    .item{border:1px solid transparent;background:#fff;text-align:left;border-radius:10px;padding:13px 12px;width:100%}
    .item:hover{background:#F8F9FB}.item[aria-current="true"]{background:#FFF3E2;border-color:#F2D2AA}
    .item strong{display:block;font-size:14px}.item small{display:block;color:var(--muted);font-size:12px;margin-top:3px}
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
    .help{font-size:12px}.footer{font-size:12px;color:#8F98A4;margin-top:28px}
    @media(max-width:820px){.layout{grid-template-columns:1fr}.container{padding:18px 14px}.top-inner{padding:14px}.grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
<header class="top"><div class="top-inner">
  <div class="brand">imagine <em>✦</em> <small>universidade</small></div>
  <div class="eyebrow">Painel de conteúdos · acesso restrito</div>
</div></header>
<main class="container">
  <div class="eyebrow">Administração Imagine</div>
  <h1>Biblioteca de cursos</h1>
  <p>Cadastre cursos e aulas em rascunho. A publicação só é permitida a operadores autorizados pelo Portal.</p>
  <div id="status" class="notice" role="status" aria-live="polite" hidden></div>
  <div class="layout">
    <section class="panel" aria-labelledby="courses-title">
      <div class="panel-header"><h2 id="courses-title">Cursos</h2><button type="button" class="primary" id="new-course">+ Novo</button></div>
      <div id="course-items" class="items"><p>Carregando cursos...</p></div>
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
            <button type="button" class="secondary" id="publish">Publicar curso</button>
            <button type="button" class="secondary" id="unpublish">Retirar do ar</button>
            <button type="button" class="secondary danger" id="delete-course" disabled>Excluir rascunho nunca publicado</button>
          </div>
          <p class="help">Retirar um curso do ar arquiva a versão publicada e cria um novo rascunho. O histórico anterior é preservado, mas o progresso da nova versão começa novamente.</p>
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
          <div class="actions"><button class="primary" id="lesson-save" type="submit">Salvar aula</button><button class="secondary" type="button" id="clear-lesson">Nova aula</button><button class="secondary danger" type="button" id="delete-lesson" disabled>Excluir rascunho</button></div>
        </form>
      </div>
    </section>
  </div>
  <footer class="footer">Universidade Imagine · Somente a área Imagine autorizada poderá administrar conteúdos. Toda alteração deve ser auditada em produção.</footer>
</main>
<script>
"use strict";
const base="/universidade/private/admin";
const csrf=document.querySelector('meta[name="csrf-token"]')?.content||"";
const $=id=>document.getElementById(id),note=$("status");
const state={courses:[],course:null,lessons:[],lesson:null,courseRequest:0,lessonRequest:0,accessDenied:false,accessMessage:""};
const cats={metodologia:"Metodologia",negocios:"Negócios",sistemas:"Sistemas Imagine"};
function say(message){
  const shown=state.accessDenied?state.accessMessage:message;
  note.hidden=!shown;note.textContent=shown||"";
}
function lockAccess(message){
  if(state.accessDenied)return;
  state.accessDenied=true;state.accessMessage=message;
  state.courses=[];state.course=null;state.lessons=[];state.lesson=null;
  ++state.courseRequest;++state.lessonRequest;
  $("course-items").replaceChildren();$("lesson-items").replaceChildren();
  $("course-items").append(el("p","Cursos indisponíveis até novo acesso autorizado.","help"));
  $("lesson-items").append(el("p","Retorne ao Portal para verificar a sessão.","help"));
  document.querySelectorAll(".layout button,.layout input,.layout select,.layout textarea")
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
const draft=()=>!state.accessDenied&&(state.course===null||!Boolean(state.course.is_published));
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
  $("unpublish").disabled=!c||!c.is_published;
  $("delete-course").disabled=!c||!!c.is_published;
  $("lesson-form").querySelectorAll("input,textarea,button").forEach(x=>x.disabled=!c||!editable);
}
function resetLesson(){
  if(state.accessDenied)return;
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
  renderCourses();fillCourse();
  await refreshLessons();
}
async function refreshLessons(){
  const request=++state.lessonRequest;
  const courseId=state.course?.id??null;
  state.lessons=[];state.lesson=null;renderLessons();resetLesson();fillCourse();
  if(courseId===null||state.accessDenied)return;
  const result=await api("/courses/"+encodeURIComponent(String(courseId))+"/lessons");
  if(state.accessDenied||state.lessonRequest!==request||state.course?.id!==courseId)return;
  state.lessons=Array.isArray(result.lessons)?result.lessons:[];renderLessons();
}
$("course-items").addEventListener("click",async event=>{
  const b=event.target.closest("[data-course]");if(!b||state.accessDenied)return;
  ++state.courseRequest;
  say("");state.course=state.courses.find(c=>c.id===Number(b.dataset.course))||null;
  renderCourses();fillCourse();
  try{await refreshLessons();}catch(error){say(error.message);}
});
$("new-course").addEventListener("click",()=>{
  if(state.accessDenied)return;
  ++state.courseRequest;++state.lessonRequest;
  state.course=null;state.lessons=[];state.lesson=null;
  renderCourses();renderLessons();fillCourse();resetLesson();$("course-title").focus();say("");
});
$("course-form").addEventListener("submit",async event=>{
  event.preventDefault();if(!draft())return;
  const payload={title:$("course-title").value.trim(),slug:$("course-slug").value.trim(),
    category:$("course-category").value,summary:$("course-summary").value.trim(),sort_order:intField("course-sort")};
  if(!payload.title){say("Informe o título.");return;}
  try{
    const result=state.course
      ? await api("/courses/"+state.course.id,"PATCH",(({slug,...withoutSlug})=>withoutSlug)(payload))
      : await api("/courses","POST",payload);
    const id=state.course?.id??result.id;
    await refreshCourses(id);say("Rascunho salvo.");
  }catch(error){say(error.message);}
});
$("lesson-items").addEventListener("click",event=>{
  const b=event.target.closest("[data-lesson]");if(!b||state.accessDenied)return;
  state.lesson=state.lessons.find(l=>l.id===Number(b.dataset.lesson))||null;
  if(!state.lesson)return;
  $("lesson-title").value=state.lesson.title;$("lesson-slug").value=state.lesson.slug;
  $("lesson-slug").disabled=true;$("lesson-sort").value=String(state.lesson.sort_order);
  $("lesson-body").value=state.lesson.body;$("lesson-title-heading").textContent="Editar aula";
  $("delete-lesson").disabled=!draft()||state.lesson.is_published||state.lesson.status!=="draft";
  renderLessons();
});
$("clear-lesson").addEventListener("click",()=>{if(state.accessDenied)return;resetLesson();renderLessons();});
$("delete-lesson").addEventListener("click",async()=>{
  const lesson=state.lesson,course=state.course;
  if(state.accessDenied||!course||course.is_published||!lesson||lesson.is_published||lesson.status!=="draft")return;
  if(!confirm("Excluir esta aula em rascunho? Esta ação não pode ser desfeita."))return;
  $("delete-lesson").disabled=true;
  try{
    await api("/lessons/"+encodeURIComponent(String(lesson.id)),"DELETE");
    await refreshLessons();
    say("Aula em rascunho excluída. Histórico publicado foi preservado.");
  }catch(error){
    if(!state.accessDenied)$("delete-lesson").disabled=false;
    say(error.message);
  }
});
$("lesson-form").addEventListener("submit",async event=>{
  event.preventDefault();if(!state.course||!draft())return;
  const payload={title:$("lesson-title").value.trim(),slug:$("lesson-slug").value.trim(),
    body:$("lesson-body").value.trim(),sort_order:intField("lesson-sort")};
  if(!payload.title||payload.body.length<10){say("Preencha título e conteúdo.");return;}
  try{
    if(state.lesson){
      const {slug,...data}=payload;
      await api("/lessons/"+state.lesson.id,"PATCH",data);
    }else{
      await api("/courses/"+state.course.id+"/lessons","POST",payload);
    }
    await refreshLessons();say("Aula salva em rascunho.");
  }catch(error){say(error.message);}
});
$("delete-course").addEventListener("click",async()=>{
  if(state.accessDenied||!state.course||state.course.is_published)return;
  const courseId=state.course.id;
  if(!confirm("Excluir definitivamente este curso criado em rascunho? Somente cursos nunca publicados e sem histórico ou progresso podem ser removidos."))return;
  if(state.accessDenied||state.course?.id!==courseId)return;
  $("delete-course").disabled=true;
  try{
    await api("/courses/"+courseId,"DELETE");
    if(state.accessDenied)return;
    await refreshCourses(state.course?.id===courseId?null:state.course?.id??null);
    say("Rascunho nunca publicado excluído com registro de auditoria.");
  }catch(error){say(error.message);if(!state.accessDenied&&state.course?.id===courseId)$("delete-course").disabled=false;}
});
$("publish").addEventListener("click",async()=>{
  if(state.accessDenied||!state.course||state.course.is_published)return;
  try{await api("/courses/"+state.course.id+"/publish","POST");await refreshCourses(state.course.id);say("Curso publicado para clientes autorizados.");}
  catch(error){say(error.message);}
});
function unpublishWarning(title){
  const name=String(title||"este curso").slice(0,200);
  return "Retirar "+name+" do ar? As aulas publicadas ficarão indisponíveis para os alunos, o histórico anterior será preservado e a nova versão começará com progresso separado. Confirme apenas se deseja criar o novo rascunho.";
}
$("unpublish").addEventListener("click",async()=>{
  if(state.accessDenied||!state.course||!state.course.is_published)return;
  const courseId=state.course.id;
  if(!confirm(unpublishWarning(state.course.title)))return;
  if(state.accessDenied||state.course?.id!==courseId)return;
  try{
    await api("/courses/"+courseId+"/unpublish","POST");
    if(state.accessDenied)return;
    await refreshCourses(state.course?.id===courseId?courseId:state.course?.id??null);
    say("Versão anterior arquivada; novo rascunho criado. O progresso da versão nova começa separado.");
  }catch(error){say(error.message);}
});
(async()=>{try{await refreshCourses();}catch(error){say(error.message);if(!state.accessDenied)$("course-items").replaceChildren();}})();
</script>
</body>
</html>