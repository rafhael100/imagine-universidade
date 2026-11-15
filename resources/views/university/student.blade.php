<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <title>Universidade Imagine | Área do cliente</title>
  <style>
    :root{--orange:#F9941D;--ink:#252D3A;--muted:#677285;--line:#E5E9EF;--bg:#F8F9FB;--white:#fff}
    *{box-sizing:border-box}
    body{font:15px/1.55 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink);background:var(--bg);margin:0}
    button{font:inherit;cursor:pointer}button:disabled{opacity:.6;cursor:not-allowed}
    :focus-visible{outline:3px solid #D87906;outline-offset:3px}
    .top{background:#fff;border-bottom:1px solid var(--line)}
    .top-inner{max-width:1160px;margin:auto;padding:19px 23px;display:flex;justify-content:space-between;gap:15px;align-items:center}
    .brand{font-size:20px;font-weight:850;letter-spacing:-.6px}.brand em{font-style:normal;color:#CC7000}
    .mini{font-size:12px;color:var(--muted)}
    .container{max-width:1160px;margin:0 auto;padding:28px 23px 55px}
    .hero{border-radius:20px;padding:33px 37px;background:#252D3A;color:#fff}
    .hero h1{font-size:clamp(25px,3vw,36px);line-height:1.2;margin:6px 0 12px;letter-spacing:-.8px}
    .hero p{color:#E2E7EF;max-width:660px;margin:0}
    .eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#FFBC70;font-weight:850}
    .pills{display:flex;gap:7px;flex-wrap:wrap;margin:27px 0 18px}
    .pill{border:1px solid var(--line);background:white;border-radius:999px;padding:9px 14px;font-weight:750;font-size:13px}
    .pill[aria-pressed="true"]{background:#FFF0D9;border-color:#F0BD7C;color:#8A4700}
    .main{display:grid;grid-template-columns:1fr 1.4fr;gap:20px;align-items:start}
    .panel{background:#fff;border:1px solid var(--line);border-radius:17px;overflow:hidden}
    .panel-head{padding:20px;border-bottom:1px solid var(--line)}
    .panel-head h2{font-size:19px;letter-spacing:-.3px;margin:0 0 4px}
    .panel-head p{margin:0;color:var(--muted);font-size:13px}
    .courses{display:grid;gap:7px;padding:12px}
    .course-btn,.lesson-btn{display:block;text-align:left;border:1px solid transparent;background:white;width:100%;padding:13px 14px;border-radius:10px}
    .course-btn:hover,.lesson-btn:hover{background:#F7F8FA}
    .course-btn[aria-current="true"],.lesson-btn[aria-current="true"]{border-color:#F4D4A9;background:#FFF5E8}
    .course-btn strong,.lesson-btn strong{display:block}.course-btn span,.lesson-btn span{display:block;font-size:12px;color:var(--muted);margin-top:4px}
    .overall-progress{font-size:13px;font-weight:700;color:#FFF0DC!important;margin-top:14px!important}
    .course-progress{height:7px;width:100%;accent-color:#F9941D;display:block;margin-top:8px;border-radius:8px}
    .course-progress::-webkit-progress-bar{background:#EDEFF2;border-radius:8px}
    .course-progress::-webkit-progress-value{background:#F9941D;border-radius:8px}
    .course-progress::-moz-progress-bar{background:#F9941D;border-radius:8px}
    .lesson-items{border-bottom:1px solid var(--line);padding:10px}
    .lesson-content{padding:25px}
    .lesson-content h3{font-size:22px;letter-spacing:-.5px;margin:0 0 12px}
    .lesson-text{white-space:pre-wrap;overflow-wrap:anywhere;color:#4B5769;margin:12px 0 20px}
    .primary{background:var(--orange);border:1px solid var(--orange);padding:11px 16px;border-radius:10px;font-weight:850;color:#3D290F}
    .primary:hover{background:#FFAC48}
    .status{padding:12px 17px;border-radius:10px;background:#FFF6E8;border:1px solid #F0D7AD;color:#75501D;margin:18px 0}
    .status[hidden]{display:none}
    .empty{padding:25px;color:var(--muted)}
    .footer{color:#8892A1;font-size:12px;margin-top:28px}
    @media(max-width:800px){.main{grid-template-columns:1fr}.container{padding:17px 14px 35px}.hero{padding:24px}.top-inner{padding:14px}}
  </style>
</head>
<body>
<header class="top"><div class="top-inner">
  <div class="brand">imagine <em>✦</em> <small>universidade</small></div>
  <div class="mini">Benefício exclusivo dos clientes Imagine</div>
</div></header>
<main class="container">
  <section class="hero" aria-labelledby="hero-title">
    <span class="eyebrow">Conhecimento que impulsiona seu negócio</span>
    <h1 id="hero-title">Visitas. Leads. Clientes.</h1>
    <p>Aprenda com aulas rápidas, nossa metodologia e orientações práticas para aproveitar melhor os serviços Imagine.</p>
    <p id="overall-progress" class="overall-progress" aria-live="polite">Seu progresso será exibido após autorizar os cursos.</p>
  </section>
  <div id="status" role="status" aria-live="polite" class="status" hidden></div>
  <nav class="pills" aria-label="Categorias dos cursos">
    <button type="button" class="pill" data-filter="todos" aria-pressed="true">Todos</button>
    <button type="button" class="pill" data-filter="metodologia" aria-pressed="false">Metodologia</button>
    <button type="button" class="pill" data-filter="negocios" aria-pressed="false">Negócios</button>
    <button type="button" class="pill" data-filter="sistemas" aria-pressed="false">Sistemas Imagine</button>
  </nav>
  <div class="main">
    <section class="panel" aria-labelledby="courses-title">
      <div class="panel-head"><h2 id="courses-title">Seus cursos</h2><p>Escolha um tema para começar.</p></div>
      <div id="course-list" class="courses"><p class="empty">Carregando cursos autorizados...</p></div>
    </section>
    <section class="panel" aria-labelledby="lesson-panel-title">
      <div class="panel-head"><h2 id="lesson-panel-title">Sua aprendizagem</h2><p>Aulas curtas, sem provas, notas ou certificados.</p></div>
      <div id="lesson-items" class="lesson-items"></div>
      <article id="lesson-content" class="lesson-content"><p class="empty">Selecione um curso para visualizar as aulas.</p></article>
    </section>
  </div>
  <footer class="footer">Universidade Imagine · Educação prática para clientes elegíveis · Resultados comerciais nunca são garantidos.</footer>
</main>
<script>
"use strict";
const root="/universidade/private";
const csrf=document.querySelector('meta[name="csrf-token"]')?.content||"";
const status=document.getElementById("status");
const list=document.getElementById("course-list"),lessonsBox=document.getElementById("lesson-items");
const content=document.getElementById("lesson-content");
const state={courses:[],filter:"todos",courseId:null,lessonId:null};
const labels={metodologia:"Metodologia",negocios:"Negócios",sistemas:"Treinamentos Imagine"};
const overall=document.getElementById("overall-progress");
function progressLabel(course){
  const total=Number.isInteger(course.lessons_total)&&course.lessons_total>=0?course.lessons_total:0;
  const completed=Number.isInteger(course.lessons_completed)&&course.lessons_completed>=0
    ?Math.min(course.lessons_completed,total):0;
  return {total,completed,percent:total?Math.round(completed*100/total):0};
}
function say(message){status.hidden=!message;status.textContent=message||"";}
function el(tag,text,className){
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  if(className)node.className=className;
  return node;
}
async function api(path,options={}){
  const response=await fetch(root+path,{
    method:options.method||"GET",
    credentials:"same-origin",
    cache:"no-store",
    headers:{"Accept":"application/json","X-Requested-With":"XMLHttpRequest","X-CSRF-TOKEN":csrf},
  });
  if(response.status===403){throw new Error("Seu acesso não está autorizado. Retorne ao Portal do Cliente.");}
  if(response.status===419){throw new Error("Sua sessão expirou. Acesse novamente pelo Portal.");}
  if(!response.ok){throw new Error("Não foi possível concluir esta operação. Tente novamente.");}
  return response.json();
}
function coursesFiltered(){
  return state.courses.filter(c=>state.filter==="todos"||c.category===state.filter);
}
function renderCourses(){
  list.replaceChildren();
  const totals=state.courses.reduce((memo,c)=>{
    const p=progressLabel(c);memo.completed+=p.completed;memo.total+=p.total;return memo;
  },{completed:0,total:0});
  overall.textContent=totals.total
    ?"Seu progresso: "+totals.completed+" de "+totals.total+" aulas concluídas."
    :"Nenhuma aula publicada disponível no momento.";
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
async function selectCourse(id){
  state.courseId=id;state.lessonId=null;renderCourses();
  lessonsBox.replaceChildren();content.replaceChildren();
  content.append(el("p","Carregando aulas...","empty"));
  try{
    const payload=await api("/courses/"+encodeURIComponent(String(id))+"/lessons");
    if(state.courseId!==id)return;
    const lessons=Array.isArray(payload.lessons)?payload.lessons:[];
    lessonsBox.replaceChildren();content.replaceChildren();
    if(!lessons.length){content.append(el("p","Ainda não existem aulas publicadas neste curso.","empty"));return;}
    for(const item of lessons){
      const btn=el("button",undefined,"lesson-btn");btn.type="button";btn.dataset.lessonId=String(item.id);
      btn.append(el("strong",item.title),el("span","Abrir aula"));
      lessonsBox.append(btn);
    }
    await selectLesson(Number(lessons[0].id));
  }catch(error){say(error.message);content.replaceChildren();}
}
async function selectLesson(id){
  state.lessonId=id;
  lessonsBox.querySelectorAll("[data-lesson-id]").forEach(btn=>btn.setAttribute("aria-current",String(Number(btn.dataset.lessonId)===id)));
  content.replaceChildren();content.append(el("p","Carregando aula...","empty"));
  try{
    const [lessonPayload,progressPayload]=await Promise.all([
      api("/lessons/"+encodeURIComponent(String(id))),
      api("/lessons/"+encodeURIComponent(String(id))+"/progress"),
    ]);
    if(state.lessonId!==id)return;
    const lesson=lessonPayload.lesson;
    content.replaceChildren();
    content.append(el("h3",lesson.title),el("p",lesson.body,"lesson-text"));
    const action=el("button",progressPayload.completed?"✓ Aula concluída":"Marcar como concluída","primary");
    action.type="button";action.disabled=!!progressPayload.completed;
    action.addEventListener("click",async()=>{
      action.disabled=true;
      try{
        await api("/lessons/"+encodeURIComponent(String(id))+"/complete",{method:"POST"});
        action.textContent="✓ Aula concluída";say("Seu progresso foi registrado.");
        // Atualização autoritativa: nunca supor que o banco contabilizou
        // apenas com base no clique; atualiza o resumo após confirmação.
        const latest=await api("/courses");
        state.courses=Array.isArray(latest.courses)?latest.courses:[];
        renderCourses();
      }catch(error){action.disabled=false;say(error.message);}
    });
    content.append(action);
  }catch(error){say(error.message);content.replaceChildren();}
}
list.addEventListener("click",e=>{const btn=e.target.closest("[data-course-id]");if(btn){say("");selectCourse(Number(btn.dataset.courseId));}});
lessonsBox.addEventListener("click",e=>{const btn=e.target.closest("[data-lesson-id]");if(btn){say("");selectLesson(Number(btn.dataset.lessonId));}});
document.querySelectorAll("[data-filter]").forEach(btn=>btn.addEventListener("click",()=>{
  state.filter=btn.dataset.filter;state.courseId=null;state.lessonId=null;
  document.querySelectorAll("[data-filter]").forEach(b=>b.setAttribute("aria-pressed",String(b===btn)));
  lessonsBox.replaceChildren();content.replaceChildren();content.append(el("p","Escolha um curso para ver as aulas.","empty"));renderCourses();
}));
(async()=>{
  try{
    // Post estritamente autorizado pelo Portal; cria somente o tenant técnico.
    await api("/initialize",{method:"POST"});
    const payload=await api("/courses");
    state.courses=Array.isArray(payload.courses)?payload.courses:[];
    renderCourses();
  }catch(error){say(error.message);list.replaceChildren();list.append(el("p","A biblioteca permanece indisponível.","empty"));}
})();
</script>
</body>
</html>