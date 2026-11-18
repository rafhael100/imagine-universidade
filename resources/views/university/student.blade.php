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
    .favorite-tools{margin:0 0 18px;display:flex;align-items:center;gap:10px 16px;flex-wrap:wrap}
    .favorite-tools label{display:inline-flex;align-items:center;gap:9px;min-height:44px;font-weight:750;font-size:13px}
    .favorite-tools input{width:20px;height:20px;accent-color:var(--orange)}
    .favorite-tools .secondary{margin-left:0}
    .retained-favorites{flex-basis:100%;min-width:0;border:1px solid var(--line);border-radius:12px;background:#FAFBFC;padding:12px 15px}
    .retained-favorites summary{cursor:pointer;font-weight:750;min-height:28px}
    .retained-favorites>p{font-size:13px;color:#565D56;margin:10px 0}
    .retained-favorites-list{list-style:none;padding:0;margin:10px 0;display:grid;gap:8px}
    .retained-favorite{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px 16px;padding:12px;border:1px solid var(--line);border-radius:9px;background:#fff}
    .retained-favorite-info{flex:1 1 240px;min-width:0;overflow-wrap:anywhere}
    .retained-favorite-info strong,.retained-favorite-info span,.retained-favorite-info time{display:block}
    .retained-favorite-info span,.retained-favorite-info time{font-size:12px;color:#565D56;margin-top:3px}
    .progress-history{margin:0 0 18px;padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:#FAFBFC;min-width:0}
    .progress-history summary{cursor:pointer;font-weight:750;min-height:28px}
    .progress-history>p{font-size:13px;color:#565D56;margin:10px 0}
    .progress-history .secondary{margin-left:0}
    .progress-history-list{list-style:none;padding:0;margin:12px 0;display:grid;gap:8px}
    .progress-history-entry{padding:12px 14px;border:1px solid var(--line);border-radius:9px;background:#fff;overflow-wrap:anywhere}
    .progress-history-entry strong,.progress-history-entry span,.progress-history-entry time{display:block}
    .progress-history-entry span,.progress-history-entry time{font-size:12px;color:#565D56;margin-top:4px}
    .favorite-status{flex-basis:100%;font-size:13px;color:#565D56;margin:0}
    .course-favorite{padding:14px 20px;border-bottom:1px solid var(--line);background:#FAFBFC}
    .course-favorite p{font-size:13px;font-weight:750;margin:0 0 8px;overflow-wrap:anywhere}
    .course-favorite .secondary{margin-left:0}
    .course-favorite[hidden]{display:none}
    .reading-position{padding:14px 20px;border-bottom:1px solid var(--line);background:#FAFBFC}
    .reading-position[hidden]{display:none}
    .reading-position h3{font-size:15px;margin:0 0 6px}
    .reading-position p,.reading-lesson-action p{font-size:13px;color:#565D56;margin:6px 0;overflow-wrap:anywhere}
    .reading-position .secondary,.reading-lesson-action .secondary{margin-left:0}
    .reading-position summary{cursor:pointer;min-height:44px;line-height:44px;font-size:13px;font-weight:750;width:fit-content}
    .reading-position details>div{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 6px}
    .reading-lesson-action{margin-top:16px;padding-top:12px;border-top:1px solid var(--line)}
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
    .lesson-search-navigation{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px}
    .lesson-search-navigation[hidden]{display:none}
    .pill{border:1px solid var(--line);background:white;border-radius:999px;padding:9px 14px;font-weight:750;font-size:13px}
    .pill[aria-pressed="true"]{background:#FFF0D9;border-color:#F0BD7C;color:#8A4700}
    .main{display:grid;grid-template-columns:1fr 1.4fr;gap:20px;align-items:start}
    .panel{background:#fff;border:1px solid var(--line);border-radius:var(--imagine-radius-panel);box-shadow:var(--imagine-shadow-panel);overflow:hidden}
    .panel-head{padding:20px;border-bottom:1px solid var(--line)}
    .panel-head h2{font-size:19px;letter-spacing:-.3px;margin:0 0 4px}
    .panel-head p{margin:0;color:var(--muted);font-size:13px}
    .courses{display:grid;gap:7px;padding:12px}
    .course-btn,.lesson-btn{display:block;text-align:left;border:1px solid transparent;background:white;width:100%;padding:13px 14px;border-radius:10px}
    .lesson-btn[hidden]{display:none}
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
    .course-lesson-filter{padding:16px 20px;border-bottom:1px solid var(--line)}
    .course-lesson-filter label{display:block;font-weight:750;font-size:13px;margin-bottom:7px}
    .course-lesson-filter-fields{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    .course-lesson-filter-fields input{font:inherit;flex:1 1 200px;min-width:0;padding:10px 12px;border:1px solid #C9D1DC;border-radius:10px}
    .course-lesson-filter-fields .secondary{margin-left:0}
    .course-lesson-filter p{font-size:13px;color:#565D56;margin:9px 0 0}
    .lesson-content{padding:25px}
    .lesson-content h3{font-size:22px;letter-spacing:-.5px;margin:0 0 12px}
    .contextual-courses{padding:20px 25px;border-top:1px solid var(--line);background:#FAFBFC}
    .contextual-courses h3{font-size:17px;margin:0 0 7px}
    .contextual-courses p{font-size:13px;color:#565D56;margin:10px 0}
    .contextual-courses .secondary{margin-left:0;padding:8px 12px;font-size:12px}
    .contextual-courses-list{list-style:none;padding:0;margin:12px 0 0;display:grid;gap:8px}
    .contextual-course{width:100%;text-align:left;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink);overflow-wrap:anywhere}
    .contextual-course:hover{border-color:#E5B56D;background:#FFF8EE}
    .contextual-course strong,.contextual-course span{display:block}
    .contextual-course span{font-size:12px;color:#70410C;margin-top:4px}
    .lesson-text{overflow-wrap:anywhere;color:#4B5769;margin:12px 0 20px}
    .lesson-text h4{font-size:15px;color:#70410C;font-weight:800;letter-spacing:.2px;margin:20px 0 8px;scroll-margin-top:24px}
    .lesson-text p{white-space:pre-wrap;margin:0 0 17px}
    .lesson-sections{margin:0 0 20px;padding:14px 16px;border:1px solid var(--line);border-radius:10px;background:#FAFBFC}
    .lesson-sections>p{margin:0 0 8px;font-size:13px;font-weight:750;color:#565D56;white-space:normal}
    .lesson-sections ol{margin:0;padding-left:22px;display:grid;gap:5px}
    .lesson-section-jump{max-width:100%;text-align:left;white-space:normal;overflow-wrap:anywhere;border:1px solid #E5B56D;border-radius:8px;background:#fff;color:#70410C;padding:7px 10px;font-size:13px;font-weight:750}
    .lesson-section-jump:hover{background:#FFF5E8}
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
    <button type="button" id="resume-course" class="primary resume-btn" disabled>Continuar aulas pendentes</button>
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
  <div class="favorite-tools">
    <label for="favorites-only"><input id="favorites-only" type="checkbox" disabled>Somente favoritos</label>
    <button id="reload-favorites" type="button" class="secondary" hidden disabled>Consultar favoritos novamente</button>
    <button id="export-favorites" type="button" class="secondary" disabled>Exportar meus favoritos</button>
    <p id="favorites-status" class="favorite-status" role="status" aria-live="polite">Seus favoritos serão consultados após carregar a biblioteca.</p>
    <p id="favorites-export-status" class="favorite-status" role="status" aria-live="polite" hidden></p>
    <details id="retained-favorites-panel" class="retained-favorites" hidden>
      <summary>Gerenciar favoritos</summary>
      <p>Consulte suas referências guardadas, inclusive de cursos que não estão disponíveis. Remover um favorito não altera suas aulas concluídas.</p>
      <button id="reload-retained-favorites" type="button" class="secondary" disabled>Consultar favoritos guardados</button>
      <p id="retained-favorites-status" role="status" aria-live="polite"></p>
      <ul id="retained-favorites-list" class="retained-favorites-list"></ul>
      <button id="more-retained-favorites" type="button" class="secondary" hidden disabled>Ver mais favoritos</button>
    </details>
  </div>
  <details id="progress-history-panel" class="progress-history" hidden>
    <summary>Meu histórico de conclusões</summary>
    <p>Consulte as conclusões registradas nas versões exatas das aulas, inclusive quando o material não está mais disponível. Esta consulta não altera seu progresso.</p>
    <button id="reload-progress-history" type="button" class="secondary" disabled>Consultar histórico</button>
    <p id="progress-history-status" role="status" aria-live="polite"></p>
    <ul id="progress-history-list" class="progress-history-list"></ul>
    <button id="more-progress-history" type="button" class="secondary" hidden disabled>Ver mais conclusões</button>
  </details>
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
    <div id="lesson-search-navigation" class="lesson-search-navigation" role="group" aria-label="Páginas da busca de aulas" hidden>
      <button id="lesson-search-next" type="button" class="secondary" disabled>Próximos resultados</button>
      <button id="lesson-search-restart" type="button" class="secondary" disabled>Recomeçar busca</button>
    </div>
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
      <section id="reading-position-panel" class="reading-position" aria-labelledby="reading-position-title" hidden>
        <h3 id="reading-position-title">Aula guardada</h3>
        <p id="reading-position-status" role="status" aria-live="polite"></p>
        <button id="resume-reading-position" type="button" class="secondary" hidden disabled>Continuar da aula guardada</button>
        <button id="reload-reading-position" type="button" class="secondary" hidden disabled>Consultar posição novamente</button>
        <details id="reading-position-options">
          <summary>Opções da posição</summary>
          <div>
            <button id="remove-reading-position" type="button" class="secondary" hidden disabled>Apagar posição guardada</button>
            <button id="export-reading-position" type="button" class="secondary" disabled>Exportar minha posição</button>
          </div>
          <p id="reading-position-export-status" role="status" aria-live="polite" hidden></p>
        </details>
      </section>
      <div id="course-favorite-panel" class="course-favorite" hidden>
        <p id="favorite-course-title"></p>
        <button id="course-favorite-toggle" type="button" class="secondary" disabled>Salvar curso nos favoritos</button>
      </div>
      <div id="course-lesson-filter" class="course-lesson-filter" hidden>
        <label for="course-lesson-query">Localizar aula neste curso</label>
        <div class="course-lesson-filter-fields">
          <input id="course-lesson-query" type="search" autocomplete="off" aria-controls="lesson-items" aria-describedby="course-lesson-filter-status" disabled>
          <button id="clear-course-lesson-query" type="button" class="secondary" disabled>Limpar</button>
        </div>
        <p id="course-lesson-filter-status" role="status" aria-live="polite"></p>
      </div>
      <div id="lesson-items" class="lesson-items"></div>
      <article id="lesson-content" class="lesson-content"><p class="empty">Selecione um curso para visualizar as aulas.</p></article>
      <section id="contextual-courses-panel" class="contextual-courses" aria-labelledby="contextual-courses-title" hidden>
        <h3 id="contextual-courses-title">Outros cursos deste tema</h3>
        <button id="contextual-courses-toggle" type="button" class="secondary" aria-controls="contextual-courses-list" aria-expanded="false" disabled>Ocultar sugestões nesta visita</button>
        <p id="contextual-courses-status" role="status" aria-live="polite"></p>
        <ul id="contextual-courses-list" class="contextual-courses-list"></ul>
      </section>
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
const state={courses:[],filter:"todos",query:"",courseId:null,lessonId:null,courseRequest:0,lessonRequest:0,accessDenied:false,accessMessage:"",libraryLoading:false,libraryReady:false,exportLoading:false,searchRequest:0,searchBusy:false,searchQuery:"",searchNextCursor:null,searchPage:0,
  lessonFilter:{query:"",courseId:null,request:0,ready:false},
  contextualCoursesVisible:true,contextualRequest:0,
  progressHistory:{rows:[],nextBefore:null,ready:false,loading:false,request:0,
    message:"Consulte seu histórico quando desejar."},
  favoriteIds:[],favoritesReady:false,favoritesLoading:false,favoritesRequest:0,
  favoriteWriting:false,favoriteWriteRequest:0,favoriteOutcomeUnknown:false,favoritesOnly:false,favoritesMessage:"",
  favoriteExportLoading:false,favoriteExportRequest:0,
  retained:{rows:[],nextAfter:null,ready:false,loading:false,request:0,needsRefresh:false,
    unconfirmed:false,removingId:null,message:"Consulte suas referências guardadas quando desejar."},
  readingSnapshot:null,readingLoading:false,readingWriting:false,readingReturning:false,
  readingUncertain:false,readingRequest:0,readingMessage:"",
  readingExportLoading:false,readingExportRequest:0};
// This ephemeral intent controls only focus. A later interaction, another
// navigation or leaving the page cancels delivery without changing requests
// or personal state. Capture once at the explicit action, before any await.
const navigationFocus={sequence:0,activity:0};
function invalidateNavigationFocus(){
  ++navigationFocus.sequence;
}
function beginNavigationFocus(){
  if(state.accessDenied||!state.libraryReady)return null;
  return {sequence:++navigationFocus.sequence,activity:navigationFocus.activity,delivered:false};
}
function finishNavigationFocus(target,intent){
  if(!intent||intent.delivered||intent.sequence!==navigationFocus.sequence||
     intent.activity!==navigationFocus.activity||state.accessDenied||!state.libraryReady||
     !target?.isConnected||document.visibilityState!=="visible"||!document.hasFocus())return;
  intent.delivered=true;target.tabIndex=-1;target.focus();
}
function lessonNavigationTarget(tag,text,className){
  const target=el(tag,text,className);target.id="lesson-navigation-target";target.tabIndex=-1;return target;
}
for(const event of ["pointerdown","keydown","focusin","click","input","change","wheel"]){
  document.addEventListener(event,()=>{++navigationFocus.activity;},{capture:true,passive:true});
}
document.addEventListener("visibilitychange",invalidateNavigationFocus);
window.addEventListener("blur",invalidateNavigationFocus);
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
  invalidateNavigationFocus();
  state.accessDenied=true;state.accessMessage=message;state.libraryReady=false;
  state.courses=[];state.courseId=null;state.lessonId=null;
  resetLessonFilter();
  renderContextualCourses();
  invalidateProgressHistory("");
  document.getElementById("progress-history-panel").open=false;
  renderProgressHistory();
  state.favoriteIds=[];state.favoritesReady=false;state.favoritesLoading=false;
  state.favoriteWriting=false;state.favoriteOutcomeUnknown=false;state.favoritesOnly=false;
  ++state.favoriteWriteRequest;
  invalidateRetainedFavorites("");state.retained.needsRefresh=false;state.retained.unconfirmed=false;
  document.getElementById("retained-favorites-panel").open=false;
  renderRetainedFavorites();
  state.favoritesMessage="";++state.favoritesRequest;
  document.getElementById("favorites-only").checked=false;
  document.getElementById("favorites-only").disabled=true;
  document.getElementById("reload-favorites").hidden=true;
  document.getElementById("reload-favorites").disabled=true;
  document.getElementById("favorites-status").textContent="";
  ++state.favoriteExportRequest;
  document.getElementById("export-favorites").disabled=true;
  document.getElementById("favorites-export-status").textContent="";
  document.getElementById("favorites-export-status").hidden=true;
  document.getElementById("course-favorite-panel").hidden=true;
  document.getElementById("favorite-course-title").textContent="";
  document.getElementById("course-favorite-toggle").disabled=true;
  state.readingSnapshot=null;state.readingUncertain=false;state.readingMessage="";
  ++state.readingRequest;++state.readingExportRequest;
  document.getElementById("reading-position-panel").hidden=true;
  document.getElementById("reading-position-status").textContent="";
  document.getElementById("reading-position-export-status").textContent="";
  document.getElementById("reading-position-export-status").hidden=true;
  document.getElementById("reading-position-options").open=false;
  for(const id of ["resume-reading-position","reload-reading-position","remove-reading-position","export-reading-position"])
    document.getElementById(id).disabled=true;
  ++state.courseRequest;++state.lessonRequest;
  invalidateLessonSearch({clearInput:true});
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
  // A successful response can arrive after another request revokes access.
  // Release that unread body too, without decoding it or delaying denial.
  if(!response.ok||state.accessDenied)void discardErrorBody(response);
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
// Favorites are a private course preference, independent from completion.
// A missing list is unavailable, while an explicit empty array is valid.
function validatedStudentFavorites(payload){
  if(!studentRecord(payload)||!Array.isArray(payload.course_ids))return null;
  const unique=new Set();
  for(const id of payload.course_ids){
    if(!Number.isSafeInteger(id)||id<1||unique.has(id))return null;
    unique.add(id);
  }
  return Array.from(unique);
}
function validatedFavoriteReceipt(payload,courseId,favorite){
  if(!studentRecord(payload)||payload.course_id!==courseId||
     !Number.isSafeInteger(payload.course_id)||payload.course_id<1||
     typeof payload.favorite!=="boolean"||payload.favorite!==favorite)return null;
  return {course_id:payload.course_id,favorite:payload.favorite};
}
function readingTimestamp(value){
  return typeof value==="string"&&value.length<=40&&
    /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value);
}
function readingTarget(value){
  return studentRecord(value)&&["course_id","course_version","lesson_id"]
    .every(key=>Number.isSafeInteger(value[key])&&value[key]>0);
}
function validatedReadingPosition(payload){
  if(!studentRecord(payload)||payload.schema_version!==1||payload.scope!=="current_authenticated_student"||
     !["none","available","unavailable"].includes(payload.status)||!studentText(payload.revision,1,2048))return null;
  let position=null;
  if(payload.status==="available"){
    if(!readingTarget(payload.position)||!readingTimestamp(payload.position.saved_at))return null;
    const item=payload.position;
    position={course_id:item.course_id,course_version:item.course_version,lesson_id:item.lesson_id,saved_at:item.saved_at};
  }else if(payload.position!==null)return null;
  return {schema_version:1,scope:"current_authenticated_student",status:payload.status,revision:payload.revision,position};
}
function sameReadingTarget(snapshot,target){
  return snapshot?.status==="available"&&readingTarget(target)&&
    ["course_id","course_version","lesson_id"].every(key=>snapshot.position[key]===target[key]);
}
function validatedReadingReceipt(payload,target,previousRevision){
  const snapshot=validatedReadingPosition(payload);
  if(!snapshot||snapshot.revision===previousRevision||
     (target===null?snapshot.status!=="none":!sameReadingTarget(snapshot,target)))return null;
  return snapshot;
}
function readingPositionMessage(snapshot){
  if(snapshot.status==="available")return "Você tem uma aula guardada para continuar.";
  if(snapshot.status==="unavailable")return "A aula guardada não está disponível nesta versão. Você pode remover ou exportar a referência.";
  return "Nenhuma aula guardada. Abra uma aula e guarde-a para continuar depois.";
}
function renderReadingPosition(){
  const active=state.libraryReady&&!state.accessDenied;
  const snapshot=active?state.readingSnapshot:null;
  const busy=state.readingLoading||state.readingWriting||state.readingReturning;
  document.getElementById("reading-position-panel").hidden=!active;
  document.getElementById("reading-position-status").textContent=active?state.readingMessage:"";
  const resume=document.getElementById("resume-reading-position"),reload=document.getElementById("reload-reading-position");
  const remove=document.getElementById("remove-reading-position");
  resume.hidden=!snapshot||snapshot.status!=="available";
  resume.disabled=!active||busy||resume.hidden;
  reload.hidden=!active||!!snapshot||state.readingLoading;
  reload.disabled=!active||busy;
  remove.hidden=!snapshot||snapshot.status==="none";
  remove.disabled=!active||busy||remove.hidden;
  document.getElementById("export-reading-position").disabled=!active||state.readingExportLoading===true;
  const save=document.getElementById("save-reading-position");
  if(save){
    const target={course_id:Number(save.dataset.courseId),course_version:Number(save.dataset.courseVersion),lesson_id:Number(save.dataset.lessonId)};
    const current=readingTarget(target)&&state.courses.some(course=>course.id===target.course_id)&&state.courseId===target.course_id&&state.lessonId===target.lesson_id&&
      state.lessonRequest===Number(save.dataset.lessonRequest);
    const already=!!snapshot&&sameReadingTarget(snapshot,target);
    save.disabled=!active||!current||busy||!snapshot||state.readingUncertain||already;
    save.textContent=already?"Esta aula está guardada":snapshot?"Guardar esta aula para continuar depois":"Consulte sua posição para guardar esta aula";
    const hint=document.getElementById("reading-position-replace-hint");
    if(hint)hint.textContent=snapshot&&snapshot.status!=="none"&&!already?"Esta ação substitui sua posição guardada anterior.":"";
  }
}
async function loadReadingPosition(){
  if(state.accessDenied||!state.libraryReady||state.readingLoading||state.readingWriting)return null;
  const request=++state.readingRequest;
  state.readingLoading=true;state.readingSnapshot=null;
  state.readingMessage="Consultando sua posição...";renderReadingPosition();
  try{
    const payload=await api("/reading-position");
    if(state.accessDenied||!state.libraryReady||state.readingRequest!==request)return null;
    const snapshot=validatedReadingPosition(payload);
    if(snapshot===null)throw new Error("invalid_reading_position");
    state.readingSnapshot=snapshot;state.readingUncertain=false;
    state.readingMessage=readingPositionMessage(snapshot);
    return snapshot;
  }catch(error){
    if(!state.accessDenied&&state.libraryReady&&state.readingRequest===request){
      state.readingSnapshot=null;
      state.readingMessage=state.readingUncertain
        ?"O resultado não pôde ser confirmado. Consulte sua posição novamente antes de alterar."
        :"Não foi possível consultar sua posição. Tente consultar novamente.";
    }
    return null;
  }finally{
    state.readingLoading=false;renderReadingPosition();
  }
}
function lessonReadingPositionAction(lesson,request){
  const target={course_id:lesson.course_id,course_version:lesson.course_version,lesson_id:lesson.id};
  const box=el("div",undefined,"reading-lesson-action"),button=el("button","Guardar esta aula para continuar depois","secondary");
  button.id="save-reading-position";button.type="button";button.disabled=true;
  button.dataset.courseId=String(target.course_id);button.dataset.courseVersion=String(target.course_version);
  button.dataset.lessonId=String(target.lesson_id);button.dataset.lessonRequest=String(request);
  button.addEventListener("click",()=>{
    if(state.lessonRequest===request&&state.courseId===target.course_id&&state.lessonId===target.lesson_id)
      void writeReadingPosition(target,request);
  });
  const hint=el("p","");hint.id="reading-position-replace-hint";
  box.append(button,hint);return box;
}
async function writeReadingPosition(target=null,lessonRequest=null){
  const previous=state.readingSnapshot;
  if(state.accessDenied||!state.libraryReady||state.readingLoading||state.readingWriting||state.readingReturning||
     state.readingUncertain||!previous)return;
  if(target===null){if(previous.status==="none")return;}
  else if(!readingTarget(target)||!state.courses.some(course=>course.id===target.course_id)||state.courseId!==target.course_id||state.lessonId!==target.lesson_id||
          state.lessonRequest!==lessonRequest||sameReadingTarget(previous,target))return;
  const request=++state.readingRequest;
  const current=()=>!state.accessDenied&&state.libraryReady&&state.readingRequest===request;
  const sameLesson=()=>target===null||(state.lessonRequest===lessonRequest&&state.courseId===target.course_id&&state.lessonId===target.lesson_id);
  state.readingWriting=true;state.readingSnapshot=null;
  ++state.readingExportRequest;
  document.getElementById("reading-position-export-status").textContent="";
  document.getElementById("reading-position-export-status").hidden=true;
  state.readingMessage=target===null?"Removendo sua posição guardada...":"Guardando esta aula para continuar depois...";
  renderReadingPosition();
  let reconcile=false;
  try{
    const payload=await api("/reading-position",{method:target===null?"DELETE":"PUT",
      body:target===null?{expected_revision:previous.revision}:{course_id:target.course_id,course_version:target.course_version,
        lesson_id:target.lesson_id,expected_revision:previous.revision}});
    if(!current())return;
    if(!sameLesson()){
      state.readingMessage="A seleção da aula mudou. Consulte sua posição para conferir a alteração.";
      return;
    }
    const snapshot=validatedReadingReceipt(payload,target,previous.revision);
    if(snapshot===null)throw new Error("invalid_reading_receipt");
    state.readingSnapshot=snapshot;state.readingUncertain=false;
    state.readingMessage=target===null?"Posição guardada removida.":"Aula guardada para continuar depois.";
  }catch(error){
    if(!current())return;
    if(!sameLesson()){
      state.readingUncertain=true;
      state.readingMessage="A seleção da aula mudou. Consulte sua posição para conferir a alteração.";
    }else if(error.httpStatus===409){
      // An absence ticket can expire. Never silently renew it or retry the
      // write: the next GET and next mutation both require explicit actions.
      state.readingMessage="Sua posição mudou ou a consulta expirou. Consulte novamente antes de alterar.";
    }else if(error.httpStatus===404||error.httpStatus===422){
      state.readingMessage="Não foi possível guardar esta referência. Consulte sua posição novamente e reabra a aula.";
    }else{
      state.readingUncertain=true;reconcile=true;
      state.readingMessage="Não foi possível confirmar a alteração. Vamos consultar sua posição atual.";
    }
  }finally{
    state.readingWriting=false;renderReadingPosition();
  }
  if(reconcile&&current()){
    const expectedRequest=state.readingRequest+1;
    const snapshot=await loadReadingPosition();
    if(!snapshot||state.accessDenied||!state.libraryReady||state.readingRequest!==expectedRequest||!sameLesson())return;
    if(target===null&&snapshot.status==="none")state.readingMessage="Remoção confirmada após consulta.";
    else if(target!==null&&sameReadingTarget(snapshot,target))state.readingMessage="Aula guardada confirmada após consulta.";
    else if(snapshot.status==="unavailable")state.readingMessage="Há uma posição guardada, mas a aula está indisponível. A alteração anterior não pôde ser confirmada.";
    else state.readingMessage="Consulta concluída. A posição atual não corresponde à alteração solicitada; confira antes de tentar novamente.";
    renderReadingPosition();
  }
}
async function resumeReadingPosition(focusIntent=null){
  const previous=state.readingSnapshot;
  if(state.accessDenied||!state.libraryReady||state.readingLoading||state.readingWriting||state.readingReturning||
     !previous||previous.status!=="available")return;
  const courseRequest=state.courseRequest,lessonRequest=state.lessonRequest;
  let navigationStarted=false;
  state.readingReturning=true;renderReadingPosition();
  try{
    const snapshot=await loadReadingPosition();
    if(!snapshot||state.accessDenied||!state.libraryReady)return;
    if(state.courseRequest!==courseRequest||state.lessonRequest!==lessonRequest){
      state.readingMessage="Posição consultada. Clique em continuar quando quiser voltar.";return;
    }
    if(snapshot.revision!==previous.revision||!sameReadingTarget(snapshot,previous.position)){
      state.readingMessage="Sua posição foi atualizada. Confira o estado atual antes de continuar.";return;
    }
    const target=snapshot.position;
    if(!state.courses.some(course=>course.id===target.course_id)){
      state.readingMessage="A aula guardada não está no catálogo carregado. Atualize a página para consultar os cursos atuais.";return;
    }
    navigationStarted=true;
    openCourseWithAllFilters(target.course_id,target.lesson_id,target.course_version,focusIntent);
  }finally{
    state.readingReturning=false;renderReadingPosition();
    if(!navigationStarted&&state.courseRequest===courseRequest&&state.lessonRequest===lessonRequest)
      finishNavigationFocus(document.getElementById("reading-position-status"),focusIntent);
  }
}
function sanitizedReadingPositionExport(payload){
  if(!studentRecord(payload)||payload.schema_version!==1||payload.scope!=="current_authenticated_student")return null;
  let position=null;
  if(payload.reading_position!==null){
    const item=payload.reading_position;
    if(!studentRecord(item)||!studentSlug(item.course_slug)||!studentSlug(item.lesson_slug)||
       !Number.isSafeInteger(item.course_version)||item.course_version<1||!readingTimestamp(item.saved_at))return null;
    position={course_slug:item.course_slug,course_version:item.course_version,lesson_slug:item.lesson_slug,saved_at:item.saved_at};
  }
  return {schema_version:1,scope:"current_authenticated_student",reading_position:position};
}
async function exportReadingPosition(){
  if(state.accessDenied||!state.libraryReady||state.readingExportLoading)return;
  const request=++state.readingExportRequest;
  const current=()=>!state.accessDenied&&state.libraryReady&&state.readingExportRequest===request;
  const message=document.getElementById("reading-position-export-status");
  state.readingExportLoading=true;message.hidden=false;message.textContent="Preparando sua referência de leitura...";
  renderReadingPosition();
  try{
    const payload=await api("/reading-position/export");
    if(!current())return;
    const sanitized=sanitizedReadingPositionExport(payload);
    if(sanitized===null)throw new Error("invalid_reading_export");
    const url=URL.createObjectURL(new Blob([JSON.stringify(sanitized,null,2)],{type:"application/json"}));
    try{
      if(!current())return;
      const link=document.createElement("a");link.href=url;link.download="imagine-universidade-posicao-leitura.json";
      document.body.append(link);try{link.click();}finally{link.remove();}
      if(current())message.textContent="Arquivo da posição preparado. Guarde seus dados com segurança.";
    }finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }catch(error){
    if(current())message.textContent=error.message==="invalid_reading_export"
      ?"A referência recebida não passou na validação de privacidade. Tente novamente mais tarde."
      :"Não foi possível exportar sua posição. Você pode tentar novamente.";
  }finally{
    state.readingExportLoading=false;renderReadingPosition();
  }
}
document.getElementById("reload-reading-position").addEventListener("click",()=>{void loadReadingPosition();});
document.getElementById("resume-reading-position").addEventListener("click",()=>{void resumeReadingPosition(beginNavigationFocus());});
document.getElementById("remove-reading-position").addEventListener("click",()=>{void writeReadingPosition();});
document.getElementById("export-reading-position").addEventListener("click",()=>{void exportReadingPosition();});
function progressHistoryTimestamp(value){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value))return false;
  const date=new Date(value);
  return Number.isFinite(date.getTime())&&date.toISOString().replace(".000Z","Z")===value;
}
function validatedProgressHistory(payload,before=null,previous=[]){
  if(!studentRecord(payload)||payload.schema_version!==1||payload.scope!=="current_authenticated_student"||
     !Array.isArray(payload.completions)||payload.completions.length>50||
     !(before===null||(Number.isSafeInteger(before)&&before>0)))return null;
  const ids=new Set(previous.map(row=>row.completion_id));
  const references=new Set(previous.map(row=>JSON.stringify([row.course_slug,row.course_version,row.lesson_slug])));
  const completions=[];let last=before;
  for(const row of payload.completions){
    if(!studentRecord(row)||!Number.isSafeInteger(row.completion_id)||row.completion_id<1||
       (last!==null&&row.completion_id>=last)||ids.has(row.completion_id)||
       !studentSlug(row.course_slug)||!studentSlug(row.lesson_slug)||
       !Number.isSafeInteger(row.course_version)||row.course_version<1||
       !progressHistoryTimestamp(row.completed_at)||!["available","unavailable"].includes(row.availability))return null;
    const reference=JSON.stringify([row.course_slug,row.course_version,row.lesson_slug]);
    if(references.has(reference))return null;
    completions.push({completion_id:row.completion_id,course_slug:row.course_slug,
      course_version:row.course_version,lesson_slug:row.lesson_slug,completed_at:row.completed_at,availability:row.availability});
    ids.add(row.completion_id);references.add(reference);last=row.completion_id;
  }
  const next=payload.next_before_id;
  if(next!==null&&(!Number.isSafeInteger(next)||next<1||completions.length!==50||next!==last))return null;
  return {completions,next_before_id:next};
}
function invalidateProgressHistory(message="Seu histórico pode ter mudado. Consulte novamente para ver os registros atuais."){
  const history=state.progressHistory;++history.request;
  history.rows=[];history.nextBefore=null;history.ready=false;history.loading=false;history.message=message;
}
function renderProgressHistory(){
  const history=state.progressHistory,active=state.libraryReady&&!state.accessDenied;
  const panel=document.getElementById("progress-history-panel"),list=document.getElementById("progress-history-list");
  const reload=document.getElementById("reload-progress-history"),more=document.getElementById("more-progress-history");
  panel.hidden=!active;list.replaceChildren();
  reload.disabled=!active||history.loading;
  reload.textContent=history.ready?"Atualizar histórico":"Consultar histórico";
  more.hidden=!active||!history.ready||history.nextBefore===null;more.disabled=!active||history.loading;
  document.getElementById("progress-history-status").textContent=active?history.message:"";
  if(!active)return;
  for(const row of history.rows){
    const item=el("li",undefined,"progress-history-entry");item.dataset.completionId=String(row.completion_id);
    item.append(el("strong","Curso: "+row.course_slug),el("span","Aula: "+row.lesson_slug),
      el("span","Versão da aula: "+row.course_version));
    const time=el("time","Conclusão registrada em "+new Intl.DateTimeFormat("pt-BR",{
      dateStyle:"short",timeStyle:"medium",timeZone:"UTC"
    }).format(new Date(row.completed_at))+" (UTC)");
    time.setAttribute("datetime",row.completed_at);item.append(time);
    item.append(el("span",row.availability==="available"
      ?"Esta aula e versão estão disponíveis.":"Esta aula ou versão está indisponível."));
    list.append(item);
  }
}
async function loadProgressHistory(append=false){
  const history=state.progressHistory;
  if(state.accessDenied||!state.libraryReady||history.loading||
     (append&&(!history.ready||history.nextBefore===null)))return false;
  const before=append?history.nextBefore:null,previous=append?history.rows:[];
  const request=++history.request;
  if(!append){history.rows=[];history.nextBefore=null;history.ready=false;}
  history.loading=true;history.message=append?"Consultando mais conclusões...":"Consultando seu histórico de conclusões...";
  renderProgressHistory();
  const current=()=>!state.accessDenied&&state.libraryReady&&history.request===request;
  try{
    const payload=await api("/progress/history"+(before===null?"":"?before_id="+encodeURIComponent(String(before))));
    if(!current())return false;
    const page=validatedProgressHistory(payload,before,previous);
    if(page===null)throw new Error("invalid_progress_history");
    history.rows=[...previous,...page.completions];history.nextBefore=page.next_before_id;history.ready=true;
    history.message=history.rows.length
      ?"Registros consultados: "+history.rows.length+"."+(history.nextBefore!==null?" Há mais registros para consultar.":"")+
        " Atualize o histórico para conferir novas conclusões."
      :"Nenhuma conclusão encontrada nesta consulta.";
    return true;
  }catch{
    if(current()){
      history.rows=[];history.nextBefore=null;history.ready=false;
      history.message="Não foi possível consultar seu histórico. Use Consultar histórico para tentar novamente.";
    }
    return false;
  }finally{
    if(history.request===request){history.loading=false;renderProgressHistory();}
  }
}
document.getElementById("reload-progress-history").addEventListener("click",()=>{void loadProgressHistory();});
document.getElementById("more-progress-history").addEventListener("click",()=>{void loadProgressHistory(true);});
function retainedTimestamp(value){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value))return false;
  const date=new Date(value);
  return Number.isFinite(date.getTime())&&date.toISOString().replace(".000Z","Z")===value;
}
function validatedRetainedFavorites(payload,after=null,previous=[]){
  if(!studentRecord(payload)||payload.schema_version!==1||payload.scope!=="current_authenticated_student"||
     !Array.isArray(payload.favorites)||payload.favorites.length>50||
     !(after===null||(Number.isSafeInteger(after)&&after>0)))return null;
  const ids=new Set(previous.map(row=>row.course_id)),slugs=new Set(previous.map(row=>row.course_slug));
  const favorites=[];let last=after??0;
  for(const row of payload.favorites){
    if(!studentRecord(row)||!Number.isSafeInteger(row.course_id)||row.course_id<=last||ids.has(row.course_id)||
       !studentSlug(row.course_slug)||slugs.has(row.course_slug)||!retainedTimestamp(row.saved_at)||
       !["available","unavailable"].includes(row.availability))return null;
    favorites.push({course_id:row.course_id,course_slug:row.course_slug,saved_at:row.saved_at,availability:row.availability});
    ids.add(row.course_id);slugs.add(row.course_slug);last=row.course_id;
  }
  const next=payload.next_after_course_id;
  if(next!==null&&(!Number.isSafeInteger(next)||next<1||favorites.length!==50||next!==last))return null;
  return {favorites,next_after_course_id:next};
}
function invalidateRetainedFavorites(message="Os favoritos podem ter mudado. Consulte as referências novamente."){
  const retained=state.retained;++retained.request;
  retained.rows=[];retained.nextAfter=null;retained.ready=false;retained.loading=false;
  retained.removingId=null;retained.message=message;
  // The outcome of a lost removal remains unknown independently of any
  // catalogue-only favorites read, an empty page, or a library refresh.
}
function renderRetainedFavorites(){
  const retained=state.retained,active=state.libraryReady&&!state.accessDenied;
  const panel=document.getElementById("retained-favorites-panel"),list=document.getElementById("retained-favorites-list");
  const reload=document.getElementById("reload-retained-favorites"),more=document.getElementById("more-retained-favorites");
  const message=document.getElementById("retained-favorites-status");
  panel.hidden=!active;list.replaceChildren();
  reload.disabled=!active||retained.loading||state.favoriteWriting;
  more.hidden=!active||!retained.ready||retained.nextAfter===null;
  more.disabled=!active||retained.loading||state.favoriteWriting;
  message.textContent=active?(retained.unconfirmed?"O resultado da remoção anterior não foi confirmado. ":"")+retained.message:"";
  if(!active)return;
  for(const row of retained.rows){
    const item=el("li",undefined,"retained-favorite");
    item.dataset.retainedCourseId=String(row.course_id);item.dataset.retainedAvailability=row.availability;
    const info=el("div",undefined,"retained-favorite-info");
    // Availability comes from this response, never from a possibly older
    // catalogue. A current matching title is context, not retained content.
    const current=row.availability==="available"
      ?state.courses.find(course=>course.id===row.course_id&&course.slug===row.course_slug):null;
    info.append(el("strong",row.course_slug));
    if(current)info.append(el("span","Título no catálogo atual: "+current.title));
    info.append(el("span",row.availability==="available"?"Disponível no catálogo":"Curso indisponível"));
    const time=el("time","Guardado em "+new Intl.DateTimeFormat("pt-BR",{
      dateStyle:"short",timeStyle:"short",timeZone:"UTC"
    }).format(new Date(row.saved_at))+" (UTC)");
    time.setAttribute("datetime",row.saved_at);info.append(time);
    const remove=el("button",retained.removingId===row.course_id?"Removendo...":"Remover favorito","secondary");
    remove.type="button";remove.dataset.removeRetainedFavorite=String(row.course_id);
    remove.setAttribute("aria-label","Remover favorito "+row.course_slug);
    remove.disabled=!retained.ready||retained.loading||retained.needsRefresh||state.favoriteWriting||state.favoritesLoading;
    item.append(info,remove);list.append(item);
  }
}
async function loadRetainedFavorites(append=false){
  const retained=state.retained;
  if(state.accessDenied||!state.libraryReady||retained.loading||state.favoriteWriting||
     (append&&(!retained.ready||retained.nextAfter===null||retained.needsRefresh)))return false;
  const after=append?retained.nextAfter:null,previous=append?retained.rows:[];
  const request=++retained.request;
  if(!append){retained.rows=[];retained.nextAfter=null;retained.ready=false;}
  retained.loading=true;retained.message=append?"Consultando mais referências...":"Consultando seus favoritos guardados...";
  renderRetainedFavorites();
  const current=()=>!state.accessDenied&&state.libraryReady&&retained.request===request;
  try{
    const payload=await api("/favorites/retained"+(after===null?"":"?after_course_id="+encodeURIComponent(String(after))));
    if(!current())return false;
    const page=validatedRetainedFavorites(payload,after,previous);
    if(page===null)throw new Error("invalid_retained_favorites");
    retained.rows=[...previous,...page.favorites];retained.nextAfter=page.next_after_course_id;
    retained.ready=true;retained.needsRefresh=false;
    retained.message=retained.rows.length
      ?retained.rows.length+" referência(s) consultada(s)."+(retained.nextAfter!==null?" Há mais favoritos para consultar.":"")
      :"Nenhuma referência encontrada nesta consulta.";
    return true;
  }catch(error){
    if(current()){
      retained.rows=[];retained.nextAfter=null;retained.ready=false;
      retained.message="Não foi possível consultar suas referências. Use Consultar favoritos guardados para tentar novamente.";
    }
    return false;
  }finally{
    if(retained.request===request){retained.loading=false;renderFavoriteControls();}
  }
}
async function removeRetainedFavorite(id){
  const retained=state.retained;
  if(state.accessDenied||!state.libraryReady||!retained.ready||retained.loading||retained.needsRefresh||
     state.favoriteWriting||state.favoritesLoading||!retained.rows.some(row=>row.course_id===id))return;
  const write=++state.favoriteWriteRequest,request=++retained.request;
  // No partial retained page can replace the complete, catalogue-only list.
  // Invalidate an older read without promoting this page into that cache.
  ++state.favoritesRequest;state.favoritesLoading=false;
  state.favoriteWriting=true;retained.removingId=id;retained.message="Removendo esta referência dos favoritos...";
  renderFavoriteControls();
  const current=()=>!state.accessDenied&&state.libraryReady&&state.favoriteWriteRequest===write&&retained.request===request;
  const unknown=()=>{
    invalidateRetainedFavorites("Consulte suas referências antes de outra alteração. Uma nova consulta não confirma o resultado anterior.");
    retained.needsRefresh=true;retained.unconfirmed=true;
    state.favoriteIds=[];state.favoritesReady=false;state.favoriteOutcomeUnknown=true;
    state.favoritesMessage="Uma remoção não foi confirmada. Consulte Gerenciar favoritos antes de outra alteração.";
  };
  try{
    const payload=await api("/courses/"+encodeURIComponent(String(id))+"/favorite",{method:"DELETE"});
    if(state.accessDenied||state.favoriteWriteRequest!==write)return;
    if(!current()){unknown();return;}
    if(validatedFavoriteReceipt(payload,id,false)===null)throw new Error("invalid_retained_removal");
    retained.rows=retained.rows.filter(row=>row.course_id!==id);
    // The server's cursor is a lower bound, not an anchor. Keep it even
    // after removing the last row of a page, so later rows remain reachable.
    state.favoriteIds=state.favoriteIds.filter(value=>value!==id);
    retained.message="Remoção desta referência confirmada."+(retained.nextAfter!==null?" Você pode consultar mais favoritos.":"");
  }catch{
    if(!state.accessDenied&&state.favoriteWriteRequest===write)unknown();
  }finally{
    if(state.favoriteWriteRequest===write){
      state.favoriteWriting=false;retained.removingId=null;
      if(!state.accessDenied&&state.libraryReady)renderCourses();
    }
  }
}
function renderFavoriteControls(){
  const active=state.libraryReady&&!state.accessDenied;
  const filter=document.getElementById("favorites-only"),retry=document.getElementById("reload-favorites");
  const panel=document.getElementById("course-favorite-panel"),button=document.getElementById("course-favorite-toggle");
  const course=active?state.courses.find(item=>item.id===state.courseId):null;
  const known=active&&state.favoritesReady&&!state.favoriteOutcomeUnknown;
  // Unpublication/catalogue refresh cannot leave a hidden course in the UI.
  const available=new Set(state.courses.map(item=>item.id));
  state.favoriteIds=state.favoriteIds.filter(id=>available.has(id));
  filter.checked=state.favoritesOnly;
  // An unavailable favorites service must still let the student turn this
  // filter off and read the rest of the authorized catalogue.
  filter.disabled=!active||(!known&&!state.favoritesOnly);
  retry.hidden=!active||(!state.favoriteOutcomeUnknown&&state.favoritesReady)||state.favoritesLoading;
  retry.disabled=!active||state.favoritesLoading||state.favoriteWriting;
  document.getElementById("favorites-status").textContent=active?state.favoritesMessage:"";
  // A personal export includes retained references, even when no favorite
  // is visible in today's catalogue or the separate favorites list fails.
  document.getElementById("export-favorites").disabled=!active||state.favoriteExportLoading===true;
  panel.hidden=!course;
  document.getElementById("favorite-course-title").textContent=course?"Favoritos · "+course.title:"";
  const saved=!!course&&known&&state.favoriteIds.includes(course.id);
  button.disabled=!course||!known||state.favoritesLoading||state.favoriteWriting||state.retained.needsRefresh;
  button.textContent=known?(saved?"Remover curso dos favoritos":"Salvar curso nos favoritos")
    :"Consulte os favoritos para alterar";
  if(known&&course)button.setAttribute("aria-pressed",String(saved));
  else button.removeAttribute("aria-pressed");
  renderRetainedFavorites();
}
async function loadFavorites(){
  if(state.accessDenied||!state.libraryReady||state.favoritesLoading||state.favoriteWriting)return false;
  invalidateRetainedFavorites();
  const request=++state.favoritesRequest;
  state.favoritesLoading=true;state.favoritesReady=false;state.favoriteIds=[];
  state.favoritesMessage="Consultando seus favoritos...";
  renderCourses();
  try{
    const payload=await api("/favorites");
    if(state.accessDenied||!state.libraryReady||state.favoritesRequest!==request)return false;
    const ids=validatedStudentFavorites(payload);
    if(ids===null)throw new Error("invalid_favorites");
    const available=new Set(state.courses.map(course=>course.id));
    state.favoriteIds=ids.filter(id=>available.has(id));
    state.favoritesReady=true;state.favoriteOutcomeUnknown=false;
    state.favoritesMessage=state.favoriteIds.length?"Seus favoritos estão atualizados.":"Nenhum favorito disponível no catálogo atual.";
    return true;
  }catch(error){
    if(!state.accessDenied&&state.libraryReady&&state.favoritesRequest===request){
      state.favoriteIds=[];state.favoritesReady=false;
      state.favoritesMessage=state.favoriteOutcomeUnknown
        ?"O resultado não pôde ser confirmado. Consulte seus favoritos antes de tentar outra alteração."
        :"Não foi possível consultar seus favoritos. Seus cursos continuam disponíveis.";
    }
    return false;
  }finally{
    if(state.favoritesRequest===request){
      state.favoritesLoading=false;
      if(!state.accessDenied&&state.libraryReady)renderCourses();
    }
  }
}
async function toggleCourseFavorite(){
  if(state.accessDenied||!state.libraryReady||!state.favoritesReady||state.favoritesLoading||
     state.favoriteWriting||state.favoriteOutcomeUnknown||state.retained.needsRefresh)return;
  const id=state.courseId,selection=state.courseRequest,generation=state.favoritesRequest;
  if(!Number.isSafeInteger(id)||id<1||!state.courses.some(course=>course.id===id))return;
  const desired=!state.favoriteIds.includes(id);
  const sameSelection=()=>state.libraryReady&&state.courseId===id&&state.courseRequest===selection&&
    state.courses.some(course=>course.id===id);
  const uncertain=()=>{
    state.favoriteIds=[];state.favoritesReady=false;state.favoriteOutcomeUnknown=true;
    state.favoritesMessage="A seleção mudou durante a alteração. Consulte seus favoritos para confirmar o estado atual.";
  };
  const write=++state.favoriteWriteRequest;
  invalidateRetainedFavorites();state.favoriteWriting=true;
  state.favoritesMessage=desired?"Salvando curso nos favoritos...":"Removendo curso dos favoritos...";
  renderFavoriteControls();
  try{
    const payload=await api("/courses/"+encodeURIComponent(String(id))+"/favorite",{method:desired?"PUT":"DELETE"});
    if(state.accessDenied||state.favoriteWriteRequest!==write)return;
    if(!sameSelection()||state.favoritesRequest!==generation){uncertain();return;}
    const receipt=validatedFavoriteReceipt(payload,id,desired);
    if(receipt===null)throw new Error("invalid_favorite_receipt");
    state.favoriteIds=desired?[...state.favoriteIds,id]:state.favoriteIds.filter(value=>value!==id);
    state.favoritesMessage=desired?"Curso salvo nos favoritos.":"Curso removido dos favoritos.";
  }catch(error){
    if(state.accessDenied||state.favoriteWriteRequest!==write)return;
    if(!sameSelection()||state.favoritesRequest!==generation){uncertain();return;}
    // A lost PUT/DELETE response may follow a committed preference. Re-read
    // the authoritative list; never replay the uncertain write automatically.
    state.favoriteIds=[];state.favoritesReady=false;state.favoriteOutcomeUnknown=true;
    state.favoriteWriting=false;
    const reconciled=await loadFavorites();
    if(reconciled&&sameSelection()&&!state.accessDenied&&state.favoriteWriteRequest===write){
      state.favoritesMessage=state.favoriteIds.includes(id)===desired
        ?(desired?"Favorito confirmado após consulta ao servidor.":"Remoção confirmada após consulta ao servidor.")
        :"A alteração não foi confirmada. Você pode tentar novamente.";
    }
  }finally{
    if(state.favoriteWriteRequest===write){
      state.favoriteWriting=false;
      if(!state.accessDenied&&state.libraryReady)renderCourses();
    }
  }
}
function normalizeSearchText(text){
  return String(text||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");
}
function lessonFilterCurrent(){
  const filter=state.lessonFilter;
  return !state.accessDenied&&state.libraryReady&&filter.ready&&
    filter.courseId===state.courseId&&filter.request===state.courseRequest;
}
function resetLessonFilter(preserveQuery=false){
  const filter=state.lessonFilter;
  if(!preserveQuery)filter.query="";
  filter.ready=false;filter.courseId=null;filter.request=0;
  renderLessonFilter();
}
function renderLessonFilter(){
  const filter=state.lessonFilter,panel=document.getElementById("course-lesson-filter");
  const field=document.getElementById("course-lesson-query"),clear=document.getElementById("clear-course-lesson-query");
  const message=document.getElementById("course-lesson-filter-status");
  const owned=filter.ready&&filter.courseId===state.courseId&&filter.request===state.courseRequest;
  panel.hidden=state.accessDenied||!owned;
  if(field.value!==filter.query)field.value=filter.query;
  field.disabled=!lessonFilterCurrent();clear.disabled=field.disabled||filter.query==="";
  if(panel.hidden){message.textContent="";return;}
  if(!state.libraryReady){message.textContent="Verificando a biblioteca...";return;}
  const term=normalizeSearchText(filter.query.trim());
  const buttons=Array.from(lessonsBox.querySelectorAll("[data-lesson-id]"));
  let matches=0,pinned=false;
  for(const button of buttons){
    const matched=!term||button.dataset.lessonTitle.includes(term)||button.dataset.lessonSlug.includes(term);
    const selected=Number(button.dataset.lessonId)===state.lessonId;
    button.hidden=!matched&&!selected;
    if(matched)matches++;else if(selected)pinned=true;
  }
  message.textContent="Resultados: "+matches+" de "+buttons.length+" aulas."+
    (pinned?" A aula aberta continua visível fora dos resultados.":"");
}
function filterCourses(courses,category,query){
  const term=normalizeSearchText(String(query||"").trim());
  return courses.filter(c=>(category==="todos"||c.category===category)&&
    (!term||normalizeSearchText([c.title,c.summary,labels[c.category]||""].join(" ")).includes(term)));
}
function coursesFiltered(){
  const courses=filterCourses(state.courses,state.filter,state.query);
  const favorites=new Set(state.favoritesReady?state.favoriteIds:[]);
  return state.favoritesOnly?courses.filter(course=>favorites.has(course.id)):courses;
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
function contextualCourses(courses,currentId){
  if(!Array.isArray(courses)||!Number.isSafeInteger(currentId)||currentId<1)return [];
  const current=courses.find(course=>course.id===currentId);
  if(!current)return [];
  // Input is the already validated published catalogue. Keep its editorial
  // order and use category alone, without ranking or personal activity.
  return courses.filter(course=>course.id!==currentId&&course.category===current.category).slice(0,3);
}
function renderContextualCourses(){
  const generation=++state.contextualRequest;
  const panel=document.getElementById("contextual-courses-panel"),list=document.getElementById("contextual-courses-list");
  const toggle=document.getElementById("contextual-courses-toggle"),message=document.getElementById("contextual-courses-status");
  const current=state.libraryReady&&!state.accessDenied?state.courses.find(course=>course.id===state.courseId):null;
  panel.hidden=!current;list.replaceChildren();message.textContent="";
  toggle.disabled=!current;
  const shown=!!current&&state.contextualCoursesVisible;
  list.hidden=!shown;toggle.setAttribute("aria-expanded",String(shown));
  toggle.textContent=state.contextualCoursesVisible?"Ocultar sugestões nesta visita":"Mostrar sugestões nesta visita";
  if(!current)return;
  if(!shown){message.textContent="As sugestões estão ocultas nesta visita.";return;}
  const courses=contextualCourses(state.courses,current.id),selection=state.courseRequest;
  const category=current.category,fromId=current.id;
  message.textContent=courses.length
    ?"Outros cursos de "+labels[category]+", a mesma categoria deste curso. Você escolhe se deseja abri-los."
    :"Não há outros cursos de "+labels[category]+" no catálogo atual.";
  for(const course of courses){
    const item=el("li"),button=el("button",undefined,"contextual-course"),id=course.id;
    button.type="button";button.dataset.contextualCourseId=String(id);
    button.append(el("strong",course.title),el("span","Abrir curso"));
    button.addEventListener("click",()=>{
      // A removed button retains its closure. Recheck both source context
      // and target against the current authorized catalogue before opening.
      if(state.accessDenied||!state.libraryReady||!state.contextualCoursesVisible||
         state.contextualRequest!==generation||state.courseRequest!==selection||state.courseId!==fromId)return;
      const source=state.courses.find(item=>item.id===fromId),target=state.courses.find(item=>item.id===id);
      if(!source||source.category!==category||!target||target.id===fromId||target.category!==category)return;
      openCourseWithAllFilters(id,null,null,beginNavigationFocus());
    });
    item.append(button);list.append(item);
  }
}
document.getElementById("contextual-courses-toggle").addEventListener("click",()=>{
  if(state.accessDenied||!state.libraryReady||!state.courses.some(course=>course.id===state.courseId))return;
  state.contextualCoursesVisible=!state.contextualCoursesVisible;
  renderContextualCourses();
});
function reconcileCatalogSelection(){
  // Only a newly validated full catalogue can establish course absence.
  // Local filters and progress changes must not discard a current lesson.
  if(state.accessDenied||!state.libraryReady||state.courseId===null||
     state.courses.some(course=>course.id===state.courseId))return false;
  invalidateNavigationFocus();
  ++state.courseRequest;++state.lessonRequest;
  state.courseId=null;state.lessonId=null;
  resetLessonFilter();
  lessonsBox.replaceChildren();content.replaceChildren();
  const message=el("p","A leitura foi encerrada porque o curso deixou de constar no catálogo. Consulte a biblioteca para verificar os cursos disponíveis.","empty");
  message.dataset.courseUnavailable="";content.append(message);
  return true;
}
function renderCourses(){
  renderContextualCourses();
  renderProgressHistory();
  if(state.accessDenied||!state.libraryReady)return;
  renderFavoriteControls();renderReadingPosition();renderPillars();
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
  const items=coursesFiltered(),favorites=new Set(state.favoritesReady?state.favoriteIds:[]);
  if(!items.length){
    const message=state.favoritesOnly
      ?(state.favoritesReady?"Nenhum curso favorito corresponde a esta busca ou categoria."
        :"Favoritos indisponíveis. Desmarque Somente favoritos para consultar todos os cursos.")
      :"Nenhum curso publicado nesta categoria.";
    list.append(el("p",message,"empty"));return;
  }
  for(const c of items){
    const p=progressLabel(c);
    const btn=el("button",undefined,"course-btn");
    btn.type="button";btn.dataset.courseId=String(c.id);
    btn.setAttribute("aria-current",String(c.id===state.courseId));
    btn.append(el("strong",c.title),
      el("span",(labels[c.category]||"Curso")+" · "+(c.summary||"Aulas práticas")),
      el("span",p.completed+" de "+p.total+" aulas concluídas · "+p.percent+"%"));
    if(favorites.has(c.id))btn.append(el("span","Salvo nos favoritos"));
    const bar=el("progress",undefined,"course-progress");
    bar.max=Math.max(1,p.total);
    bar.value=p.completed;
    bar.setAttribute("aria-label","Progresso do curso "+c.title+": "+p.percent+"%");
    btn.append(bar);
    list.append(btn);
  }
}
async function selectCourse(id,preferredLessonId=null,preferredVersion=null,focusIntent=null){
  if(state.accessDenied||!state.libraryReady||!Number.isSafeInteger(id)||id<1||!state.courses.some(course=>course.id===id))return;
  if(preferredVersion!==null&&(!Number.isSafeInteger(preferredVersion)||preferredVersion<1))return;
  resetLessonFilter(state.courseId===id);
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
    state.lessonFilter.courseId=id;state.lessonFilter.request=request;state.lessonFilter.ready=true;
    if(!lessons.length){
      renderLessonFilter();
      const target=lessonNavigationTarget("p","Ainda não existem aulas publicadas neste curso.","empty");
      content.append(target);finishNavigationFocus(target,focusIntent);return;
    }
    for(const item of lessons){
      const btn=el("button",undefined,"lesson-btn");btn.type="button";btn.dataset.lessonId=String(item.id);btn.dataset.completed=item.completed?"1":"0";
      // Local matching uses only this complete, validated list. Hidden rows
      // remain the source for sequence and progress, never a filtered cache.
      btn.dataset.lessonTitle=normalizeSearchText(item.title);btn.dataset.lessonSlug=normalizeSearchText(item.slug);
      const statusLabel=el("span",item.completed?"✓ Concluída":"Pendente");
      statusLabel.dataset.lessonStatus="";
      btn.append(el("strong",item.title),statusLabel);
      lessonsBox.append(btn);
    }
    renderLessonFilter();
    // A search result can become stale after a course is republished.
    // Never silently open another lesson in place of the requested result.
    const selected=preferredLessonId===null?null:lessons.find(item=>item.id===preferredLessonId);
    if(preferredLessonId!==null&&!selected){
      const target=lessonNavigationTarget("p","Esta aula não está mais disponível na versão publicada atual.","empty");
      content.append(target);finishNavigationFocus(target,focusIntent);
      return;
    }
    // With no search target, resume the first unfinished authorized lesson.
    const next=selected||lessons.find(item=>!Boolean(item.completed))||lessons[lessons.length-1];
    await selectLesson(Number(next.id),preferredVersion,focusIntent);
  }catch(error){
    if(state.courseRequest===request&&!state.accessDenied){
      // A transient lesson read may be retried by a deliberate click; never
      // automatically re-use old course content or bypass a revoked session.
      say(error.message);resetLessonFilter(true);lessonsBox.replaceChildren();content.replaceChildren();
      const target=lessonNavigationTarget("p","As aulas não puderam ser carregadas.","empty");
      content.append(target);
      const retry=el("button","Tentar carregar aulas","secondary lesson-retry");
      retry.type="button";
      retry.addEventListener("click",()=>{
        // A search result keeps its exact lesson target across recovery.
        // If it disappeared meanwhile, show unavailable instead of resuming
        // an unrelated pending lesson from the same course.
        if(!state.accessDenied&&state.courseId===id&&state.courseRequest===request)
          selectCourse(id,preferredLessonId,preferredVersion,beginNavigationFocus());
      });
      content.append(retry);finishNavigationFocus(target,focusIntent);
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
  const sections=splitLessonSections(body);
  const courseId=state.courseId,lessonId=state.lessonId;
  const courseRequest=state.courseRequest,lessonRequest=state.lessonRequest;
  let index=null;
  if(sections.filter(section=>section.heading!==null).length>=2){
    const navigation=el("nav",undefined,"lesson-sections");navigation.dataset.lessonSections="";
    navigation.setAttribute("aria-label","Índice das seções desta aula");
    navigation.append(el("p","Nesta aula"));index=el("ol");navigation.append(index);wrapper.append(navigation);
  }
  sections.forEach((section,sectionIndex)=>{
    if(section.heading){
      const heading=el("h4",section.heading);
      heading.id="lesson-section-"+courseId+"-"+lessonId+"-"+lessonRequest+"-"+sectionIndex;
      heading.tabIndex=-1;heading.dataset.lessonSection="";wrapper.append(heading);
      if(index){
        const item=el("li"),button=el("button",section.heading,"lesson-section-jump");button.type="button";
        button.dataset.lessonSectionId=heading.id;button.setAttribute("aria-controls",heading.id);
        const current=()=>!state.accessDenied&&state.libraryReady&&state.courses.some(course=>course.id===courseId)&&
          state.courseId===courseId&&state.lessonId===lessonId&&
          state.courseRequest===courseRequest&&state.lessonRequest===lessonRequest&&wrapper.isConnected&&
          heading.isConnected&&button.isConnected&&content.contains(wrapper)&&wrapper.contains(heading)&&wrapper.contains(button);
        button.addEventListener("click",()=>{
          if(!current())return;
          heading.focus({preventScroll:true});
          // Focusing can synchronously trigger another navigation handler.
          if(current()&&document.activeElement===heading)heading.scrollIntoView({block:"start",behavior:"auto"});
        });
        item.append(button);index.append(item);
      }
    }
    // Blank lines are paragraph boundaries; their literal characters remain
    // text nodes between paragraphs. Single line breaks stay inside the text.
    const paragraphs=section.text.split(/(\r?\n(?:[^\S\r\n]*\r?\n)+)/);
    paragraphs.forEach((paragraph,part)=>{
      if(part%2===1)wrapper.append(document.createTextNode(paragraph));
      else if(paragraph.length)wrapper.append(el("p",paragraph,"lesson-paragraph"));
    });
  });
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
        reload.addEventListener("click",()=>{if(current())selectCourse(lesson.course_id,lesson.id,null,beginNavigationFocus());});
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
  const courseId=state.courseId,request=state.lessonRequest;
  const current=()=>!state.accessDenied&&state.libraryReady&&state.courseId===courseId&&
    state.lessonId===id&&state.lessonRequest===request;
  const nextId=nextPendingLessonId(id);
  if(nextId===null){
    content.append(el("p","Você concluiu todas as aulas deste curso. Pode revisá-las quando quiser.","mini"));
    const nextCourseId=nextIncompleteOtherCourseId(state.courses,state.courseId);
    if(nextCourseId!==null){
      const nextCourse=el("button","Continuar em outro curso","secondary");
      nextCourse.type="button";nextCourse.dataset.nextCourse="";
      nextCourse.addEventListener("click",()=>{
        if(current())openCourseWithAllFilters(nextCourseId,null,null,beginNavigationFocus());
      });
      content.append(nextCourse);
    }
    return;
  }
  const advance=el("button","Ir para a próxima aula","secondary");
  advance.type="button";advance.dataset.nextLesson="";
  advance.addEventListener("click",()=>{
    if(current()){say("");selectLesson(nextId,null,beginNavigationFocus());}
  });
  content.append(advance);
}
async function selectLesson(id,preferredVersion=null,focusIntent=null){
  const courseId=state.courseId;
  if(state.accessDenied||!state.libraryReady||!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(courseId)||courseId<1)return;
  if(preferredVersion!==null&&(!Number.isSafeInteger(preferredVersion)||preferredVersion<1))return;
  const request=++state.lessonRequest;
  state.lessonId=id;
  lessonsBox.querySelectorAll("[data-lesson-id]").forEach(btn=>btn.setAttribute("aria-current",String(Number(btn.dataset.lessonId)===id)));
  renderLessonFilter();
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
    if(preferredVersion!==null&&lesson.course_version!==preferredVersion)
      throw new Error("Esta aula não está disponível na versão guardada. Consulte sua posição novamente.");
    markLessonStatus(id,progress.completed);
    content.replaceChildren();
    const heading=lessonNavigationTarget("h3",lesson.title);
    content.append(heading,lessonTextFragment(lesson.body));
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
        reconcileCatalogSelection();
        renderCourses();
      }catch(refreshError){
        if(!state.accessDenied&&state.lessonRequest===request&&state.lessonId===id)
          say("Aula concluída. Atualize a página para conferir o resumo do progresso.");
      }
    }
    action.addEventListener("click",async()=>{
      if(action.disabled||state.accessDenied||state.lessonId!==id)return;
      // A read begun before or during this explicit write may omit its
      // outcome. Keep the global history manual, including after navigation.
      invalidateProgressHistory();renderProgressHistory();
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
      }finally{
        if(!state.accessDenied){invalidateProgressHistory();renderProgressHistory();}
      }
    });
    content.append(action);
    if(progress.completed)offerNextLesson(id);
    content.append(lessonReadingPositionAction(lesson,request));
    renderReadingPosition();
    content.append(lessonHelpPanel(lesson,request));
    finishNavigationFocus(heading,focusIntent);
  }catch(error){
    if(state.lessonRequest===request&&!state.accessDenied&&state.lessonId===id){
      // A transient failure loading EITHER body or progress must not render
      // a partial lesson. The user chooses whether to retry; 403/419 always
      // purges and locks the UI. Never retry an old lesson selection.
      content.replaceChildren();
      say(error.message);
      const target=lessonNavigationTarget("p","A aula está temporariamente indisponível.","empty");
      content.append(target);
      const retry=el("button","Tentar abrir aula novamente","secondary lesson-detail-retry");
      retry.type="button";
      retry.addEventListener("click",()=>{
        if(!state.accessDenied&&state.lessonId===id&&state.lessonRequest===request)
          selectLesson(id,preferredVersion,beginNavigationFocus());
      });
      content.append(retry);finishNavigationFocus(target,focusIntent);
    }
  }
}
function openCourseWithAllFilters(target,preferredLessonId=null,preferredVersion=null,focusIntent=null){
  if(state.accessDenied||!state.libraryReady||!Number.isSafeInteger(target)||target<1)return;
  if(!state.courses.some(course=>course.id===target))return;
  state.filter="todos";state.query="";state.favoritesOnly=false;
  document.getElementById("course-search").value="";
  document.querySelectorAll("[data-filter]").forEach(btn=>{
    btn.setAttribute("aria-pressed",String(btn.dataset.filter==="todos"));
  });
  say("");
  selectCourse(target,preferredLessonId,preferredVersion,focusIntent);
}
// Read-only search results are rendered with textContent, never HTML.
// A 403/419 revokes and purges them; late responses cannot restore results.
function renderLessonSearchControls(){
  const allowed=!state.accessDenied&&state.libraryReady&&!state.libraryLoading;
  document.getElementById("lesson-search-query").disabled=!allowed;
  document.getElementById("lesson-search-submit").disabled=!allowed||state.searchBusy;
  document.getElementById("lesson-search-navigation").hidden=!state.searchQuery;
  document.getElementById("lesson-search-next").disabled=!allowed||state.searchBusy||state.searchNextCursor===null;
  document.getElementById("lesson-search-restart").disabled=!allowed||state.searchBusy||!state.searchQuery;
}
function invalidateLessonSearch({clearInput=false,advance=true}={}){
  if(advance)++state.searchRequest;
  state.searchBusy=false;state.searchQuery="";state.searchNextCursor=null;state.searchPage=0;
  document.getElementById("lesson-search-results").replaceChildren();
  if(clearInput)document.getElementById("lesson-search-query").value="";
  renderLessonSearchControls();
}
function validLessonSearchCursor(value){
  return typeof value==="string"&&value.length>0&&value.length<=2048&&/^[\x21-\x7E]+$/.test(value);
}
function validLessonSearchResults(payload,cursor=null){
  if(!studentRecord(payload)||payload.schema_version!==1||payload.scope!=="current_published_editorial_lessons"||
     !Array.isArray(payload.results)||payload.results.length>8||
     !(payload.next_cursor===null||validLessonSearchCursor(payload.next_cursor))||
     (payload.next_cursor!==null&&(payload.results.length!==8||payload.next_cursor===cursor)))return null;
  const unique=new Set(),results=[];
  for(const item of payload.results){
    if(!studentRecord(item)||!Number.isSafeInteger(item.course_id)||item.course_id<1||
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
  return {results,next_cursor:payload.next_cursor};
}
async function searchLessonPage(phrase,cursor=null,page=1){
  if(state.accessDenied||!state.libraryReady||state.searchBusy||state.libraryLoading)return;
  if(!studentText(phrase,3,60)||!/^[\p{L}\p{N} -]+$/u.test(phrase)||
     (cursor!==null&&!validLessonSearchCursor(cursor))||!Number.isSafeInteger(page)||page<1)return;
  const results=document.getElementById("lesson-search-results");
  const request=++state.searchRequest;
  state.searchBusy=true;state.searchQuery=phrase;state.searchNextCursor=null;state.searchPage=0;
  renderLessonSearchControls();
  results.replaceChildren(el("p","Procurando aulas publicadas...","empty"));
  const current=()=>!state.accessDenied&&state.libraryReady&&!state.libraryLoading&&
    request===state.searchRequest&&state.searchQuery===phrase;
  try{
    const body={query:phrase,paginated:true};if(cursor!==null)body.cursor=cursor;
    const payload=await api("/search",{method:"POST",body});
    if(!current())return;
    const verified=validLessonSearchResults(payload,cursor);
    if(verified===null)throw new Error("invalid_search_page");
    const hits=verified.results;
    state.searchNextCursor=verified.next_cursor;state.searchPage=page;
    results.replaceChildren();
    results.append(el("p","Página "+page+": "+hits.length+" "+(hits.length===1?"resultado":"resultados")+" para “"+phrase+"”.","mini"));
    if(!hits.length){
      results.append(el("p",cursor===null?"Nenhuma aula publicada encontrada para esta expressão.":
        "Nenhuma outra aula publicada encontrada nesta página. Recomece a busca para consultar o catálogo atual.","empty"));
      return;
    }
    for(const hit of hits){
      const b=el("button",undefined,"lesson-search-result");
      b.type="button";b.dataset.searchLesson=String(hit.lesson_id);
      b.append(el("strong",hit.lesson_title),
        el("small","Curso: "+hit.course_title),el("small",hit.snippet));
      b.addEventListener("click",()=>{
        if(current()&&!state.searchBusy&&b.isConnected&&results.contains(b)&&state.courses.some(course=>course.id===hit.course_id))
          openCourseWithAllFilters(hit.course_id,hit.lesson_id,null,beginNavigationFocus());
      });
      results.append(b);
    }
  }catch(error){
    if(current()){
      state.searchNextCursor=null;state.searchPage=0;
      const message=error.httpStatus===409
        ?"O conteúdo da busca mudou. Recomece a busca para consultar os resultados atuais."
        :error.httpStatus===422
          ?"Não foi possível validar a continuação desta busca. Recomece a busca para continuar."
          :"A pesquisa está indisponível. Recomece a busca para tentar novamente.";
      results.replaceChildren(el("p",message,"empty"));
    }
  }finally{
    if(request===state.searchRequest){
      state.searchBusy=false;
      renderLessonSearchControls();
    }
  }
}
document.getElementById("lesson-search-form").addEventListener("submit",async event=>{
  event.preventDefault();
  if(state.accessDenied||!state.libraryReady||state.searchBusy||state.libraryLoading)return;
  const phrase=document.getElementById("lesson-search-query").value.trim().replace(/ +/g," ");
  if(!studentText(phrase,3,60)||!/^[\p{L}\p{N} -]+$/u.test(phrase)){
    // No request is active here. A rejected query must still detach the
    // former page and its controls before the user starts another search.
    invalidateLessonSearch({advance:false});
    document.getElementById("lesson-search-results").append(el("p","Informe de 3 a 60 letras ou números para pesquisar.","empty"));
    return;
  }
  await searchLessonPage(phrase);
});
document.getElementById("lesson-search-query").addEventListener("input",event=>{
  if(state.accessDenied||!state.libraryReady||state.libraryLoading)return;
  if(state.searchQuery&&event.target.value.trim().replace(/ +/g," ")!==state.searchQuery)
    invalidateLessonSearch();
});
document.getElementById("lesson-search-next").addEventListener("click",async()=>{
  if(state.accessDenied||!state.libraryReady||state.libraryLoading||state.searchBusy||
     !state.searchQuery||state.searchNextCursor===null)return;
  await searchLessonPage(state.searchQuery,state.searchNextCursor,state.searchPage+1);
});
document.getElementById("lesson-search-restart").addEventListener("click",async()=>{
  if(state.accessDenied||!state.libraryReady||state.libraryLoading||state.searchBusy||!state.searchQuery)return;
  await searchLessonPage(state.searchQuery);
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
       !Number.isSafeInteger(item.course_version)||item.course_version<1||
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
// Favorite references have their own format. A withdrawn course may still
// appear here, but never its title, lesson content, IDs or student identity.
function sanitizedFavoritesExport(payload){
  if(!studentRecord(payload)||payload.schema_version!==1||
     payload.scope!=="current_authenticated_student"||!Array.isArray(payload.favorites)||
     payload.favorites.length>5000)return null;
  const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const timestamp=/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})?)?$/;
  const rows=[],unique=new Set();
  for(const item of payload.favorites){
    if(!studentRecord(item)||typeof item.course_slug!=="string"||item.course_slug.length>120||
       !slug.test(item.course_slug)||unique.has(item.course_slug)||
       typeof item.saved_at!=="string"||item.saved_at.length>40||!timestamp.test(item.saved_at))return null;
    unique.add(item.course_slug);
    rows.push({course_slug:item.course_slug,saved_at:item.saved_at});
  }
  return {schema_version:1,scope:"current_authenticated_student",favorites:rows};
}
async function exportFavorites(){
  if(state.accessDenied||!state.libraryReady||state.favoriteExportLoading)return;
  state.favoriteExportLoading=true;
  const request=++state.favoriteExportRequest;
  const current=()=>!state.accessDenied&&state.libraryReady&&state.favoriteExportRequest===request;
  const button=document.getElementById("export-favorites");
  const message=document.getElementById("favorites-export-status");
  button.disabled=true;message.hidden=false;message.textContent="Preparando seu arquivo de favoritos...";
  try{
    const payload=await api("/favorites/export");
    if(!current())return;
    const sanitized=sanitizedFavoritesExport(payload);
    if(sanitized===null)throw new Error("invalid_favorites_export");
    const data=new Blob([JSON.stringify(sanitized,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(data);
    try{
      if(!current())return;
      const link=document.createElement("a");
      link.href=url;link.download="imagine-universidade-favoritos.json";
      document.body.append(link);
      try{link.click();}finally{link.remove();}
      if(current())message.textContent="Arquivo de favoritos preparado. Guarde seus dados com segurança.";
    }finally{
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
  }catch(error){
    if(current())message.textContent=error.message==="invalid_favorites_export"
      ?"O arquivo de favoritos recebido não passou na validação de privacidade. Tente novamente mais tarde."
      :"Não foi possível exportar seus favoritos. Você pode tentar novamente.";
  }finally{
    state.favoriteExportLoading=false;
    button.disabled=state.accessDenied||!state.libraryReady;
  }
}
document.getElementById("export-favorites").addEventListener("click",exportFavorites);
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
  if(target!==null)openCourseWithAllFilters(target,null,null,beginNavigationFocus());
});
document.getElementById("pillar-cards").addEventListener("click",e=>{
  const item=e.target.closest("[data-pillar-course]");
  if(!item||state.accessDenied)return;
  const id=Number(item.dataset.pillarCourse);
  if(Number.isSafeInteger(id)&&state.courses.some(c=>c.id===id)){
    openCourseWithAllFilters(id,null,null,beginNavigationFocus());
  }
});
list.addEventListener("click",e=>{const btn=e.target.closest("[data-course-id]");if(btn){say("");selectCourse(Number(btn.dataset.courseId),null,null,beginNavigationFocus());}});
lessonsBox.addEventListener("click",e=>{
  const btn=e.target.closest("[data-lesson-id]");
  if(!btn||!lessonFilterCurrent()||!btn.isConnected||!lessonsBox.contains(btn)||btn.hidden)return;
  say("");selectLesson(Number(btn.dataset.lessonId),null,beginNavigationFocus());
});
document.getElementById("course-lesson-query").addEventListener("input",event=>{
  if(!lessonFilterCurrent())return;
  state.lessonFilter.query=event.target.value;renderLessonFilter();
});
document.getElementById("clear-course-lesson-query").addEventListener("click",()=>{
  if(!lessonFilterCurrent())return;
  state.lessonFilter.query="";renderLessonFilter();
  document.getElementById("course-lesson-query").focus();
});
document.getElementById("reload-favorites").addEventListener("click",()=>{void loadFavorites();});
document.getElementById("course-favorite-toggle").addEventListener("click",()=>{void toggleCourseFavorite();});
document.getElementById("reload-retained-favorites").addEventListener("click",()=>{void loadRetainedFavorites();});
document.getElementById("more-retained-favorites").addEventListener("click",()=>{void loadRetainedFavorites(true);});
document.getElementById("retained-favorites-list").addEventListener("click",event=>{
  const button=event.target.closest("[data-remove-retained-favorite]");
  if(button)void removeRetainedFavorite(Number(button.dataset.removeRetainedFavorite));
});
document.getElementById("favorites-only").addEventListener("change",event=>{
  if(state.accessDenied||!state.libraryReady||(!state.favoritesReady&&event.target.checked)){
    event.target.checked=state.favoritesOnly;return;
  }
  state.favoritesOnly=event.target.checked===true;
  ++state.courseRequest;++state.lessonRequest;
  state.courseId=null;state.lessonId=null;
  resetLessonFilter();
  lessonsBox.replaceChildren();content.replaceChildren();
  content.append(el("p","Escolha um curso para ver as aulas.","empty"));
  renderCourses();
});
document.getElementById("course-search").addEventListener("input",event=>{
  if(state.accessDenied||!state.libraryReady)return;
  state.query=event.target.value.slice(0,80);
  ++state.courseRequest;++state.lessonRequest;
  state.courseId=null;state.lessonId=null;
  resetLessonFilter();
  lessonsBox.replaceChildren();content.replaceChildren();
  content.append(el("p","Escolha um curso para ver as aulas.","empty"));
  renderCourses();
});
document.querySelectorAll("[data-filter]").forEach(btn=>btn.addEventListener("click",()=>{
  if(state.accessDenied||!state.libraryReady)return;
  state.filter=btn.dataset.filter;++state.courseRequest;++state.lessonRequest;
  state.courseId=null;state.lessonId=null;
  resetLessonFilter();
  document.querySelectorAll("[data-filter]").forEach(b=>b.setAttribute("aria-pressed",String(b===btn)));
  lessonsBox.replaceChildren();content.replaceChildren();content.append(el("p","Escolha um curso para ver as aulas.","empty"));renderCourses();
}));
// Recovery is manual and single-flight. Never retry a 403/419 automatically
// or retain a previous list after a failed initial authorization request.
async function loadLibrary(){
  if(state.accessDenied||state.libraryLoading)return;
  invalidateNavigationFocus();
  invalidateRetainedFavorites();
  invalidateProgressHistory();
  state.libraryLoading=true;state.libraryReady=false;
  invalidateLessonSearch();
  renderLessonFilter();
  renderContextualCourses();
  renderProgressHistory();
  state.favoriteIds=[];state.favoritesReady=false;state.favoritesLoading=false;++state.favoritesRequest;
  // Keep an outstanding export single-flight, but invalidate its download
  // when library authorization starts again, even if the new load succeeds.
  ++state.favoriteExportRequest;
  document.getElementById("favorites-export-status").textContent="";
  document.getElementById("favorites-export-status").hidden=true;
  ++state.readingRequest;++state.readingExportRequest;
  state.readingSnapshot=null;state.readingUncertain=false;
  state.readingMessage="Consulte sua posição após carregar a biblioteca.";
  document.getElementById("reading-position-export-status").textContent="";
  document.getElementById("reading-position-export-status").hidden=true;
  renderReadingPosition();
  renderFavoriteControls();
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
    reconcileCatalogSelection();
    renderLessonFilter();
    document.getElementById("course-search").disabled=false;
    document.querySelectorAll("[data-filter]").forEach(btn=>{btn.disabled=false;});
    document.querySelectorAll(".sim-inputs input").forEach(field=>{field.disabled=false;});
    document.getElementById("lesson-search-query").disabled=false;
    document.getElementById("lesson-search-submit").disabled=false;
    renderSimulator();renderCourses();say("");
    // Favorites load separately: their failure cannot hold libraryLoading
    // open or block lessons, educational search, progress or completion.
    void loadFavorites();
    void loadReadingPosition();
  }catch(error){
    if(!state.accessDenied){
      state.libraryReady=false;state.courses=[];state.courseId=null;state.lessonId=null;
      resetLessonFilter();
      document.getElementById("course-search").disabled=true;
      document.querySelectorAll("[data-filter]").forEach(btn=>{btn.disabled=true;});
      ++state.courseRequest;++state.lessonRequest;
      invalidateLessonSearch();
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
    renderLessonSearchControls();
  }
}
document.getElementById("retry-library").addEventListener("click",loadLibrary);
loadLibrary();
</script>
</body>
</html>
