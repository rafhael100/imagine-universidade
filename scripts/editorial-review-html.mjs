import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";

const css=[
"*,*::before,*::after{box-sizing:border-box}",
"body{margin:0;font-family:system-ui,Arial,sans-serif;background:#f7f7f8;color:#171b19;line-height:1.5}",
"header{background:#171b19;color:white;padding:20px;border-bottom:5px solid #f9941d}",
"header p{color:#f7d29e}",
".layout{max-width:1480px;margin:auto;display:grid;grid-template-columns:minmax(230px,300px) minmax(0,1fr);gap:16px;padding:16px}",
"nav,main{background:#fff;border:1px solid #ddd;border-radius:12px;padding:16px}",
"button,select,input,textarea{font:inherit}",
"button{cursor:pointer;border:1px solid #ccc;border-radius:8px;padding:10px;background:#fff}",
"button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid #f9941d;outline-offset:2px}",
"button:disabled{opacity:.45}",
".course-item{display:block;width:100%;text-align:left;margin:5px 0}",
".course-item[aria-current=true]{background:#fff1df;border-color:#f9941d;font-weight:700}",
".review-results{display:grid;gap:6px;max-height:250px;overflow:auto;border:1px solid #e4e4e4;padding:8px;border-radius:8px}",
".review-results[hidden]{display:none}",
".review-result{display:block;width:100%;text-align:left}",
".review-result[aria-current=true]{border-color:#f9941d;background:#fff6ea}",
".warning{padding:12px 16px;background:#fff1df;border-left:4px solid #f9941d}",
".toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:16px 0}",
".primary{background:#f9941d;border-color:#e08815;font-weight:700}",
"label{display:block;font-weight:600;margin:14px 0 4px}",
"input,select,textarea{width:100%;padding:9px;border:1px solid #888;border-radius:7px}",
"textarea{min-height:90px}",
"article{white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #ddd;padding:18px;background:#fdfdfd;border-radius:8px}",
".muted{color:#555;overflow-wrap:anywhere}",
"#message{min-height:30px;color:#205a32;font-weight:600}",
"#message.error{color:#af2424}",
"footer{text-align:center;padding:25px;color:#555}",
"@media(max-width:780px){.layout{grid-template-columns:1fr}}"
].join("\n");
const app=readFileSync(new URL("./editorial-review-app.js",import.meta.url),"utf8");
const sha=s=>"sha256-"+createHash("sha256").update(s,"utf8").digest("base64");

export function renderOfflineReviewPage(payload,hashes){
  assert.equal(payload.status,"editorial_draft");
  assert.equal(payload.audience,"authorized_imagine_clients_only");
  assert.equal(payload.courses.length,10);
  const checksums=new Map(hashes.map(h=>[h.course_slug+"/"+h.lesson_slug,h.content_sha256]));
  const items=payload.courses.flatMap(course=>course.lessons.map(lesson=>{
    const id=course.slug+"/"+lesson.slug,contentHash=checksums.get(id);
    assert.match(contentHash||"",/^[a-f0-9]{64}$/);
    return {course_slug:course.slug,course_title:course.title,
      lesson_slug:lesson.slug,lesson_title:lesson.title,
      body:lesson.body,content_sha256:contentHash};
  }));
  assert.equal(items.length,35);
  assert.equal(checksums.size,35);
  const data=JSON.stringify(items).replaceAll("<","\\u003c")
    .replaceAll(">","\\u003e").replaceAll("\u2028","\\u2028")
    .replaceAll("\u2029","\\u2029");
  const script="const REVIEW_ITEMS="+data+";\n"+app;
  assert.ok(!script.toLowerCase().includes("</script"));
  const policy="default-src 'none'; base-uri 'none'; form-action 'none'; "+
    "script-src '"+sha(script)+"'; style-src '"+sha(css)+"'; "+
    "connect-src 'none'; img-src 'none'; object-src 'none'";
  return [
    "<!doctype html>",'<html lang="pt-BR"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta http-equiv="Content-Security-Policy" content="'+policy+'">',
    "<title>Universidade Imagine — Revisão editorial offline</title>",
    "<style>"+css+"</style></head><body>",
    "<header><strong>Universidade Imagine · Revisão editorial</strong>",
    "<p>35 aulas em rascunho · sem conexão com serviços reais</p></header>",
    '<div class="layout"><nav aria-label="Cursos para revisão">',
    "<h2>Cursos</h2><div id='courses'></div>",
    "<p class='muted'>Sem armazenamento automático. Exporte o CSV antes de sair.</p></nav>",
    "<main><p class='warning'><strong>REVISÃO PENDENTE — NÃO É APROVAÇÃO NEM PUBLICAÇÃO.</strong>",
    " Qualquer status de aceite preenchido é somente uma declaração não autenticada.</p>",
    "<div class='toolbar'><button id='export' type='button' class='primary'>Exportar revisão CSV</button>",
    "<button id='export-summary' type='button'>Baixar resumo de pendências</button>",
    "<label for='import'>Importar CSV anterior</label><input id='import' type='file' accept='.csv,text/csv'>",
    "<span id='position' class='muted'></span></div>",
    "<p id='summary' role='status' aria-live='polite'></p>",
    "<p id='message' role='status' aria-live='polite'></p>",
    "<section aria-label='Localizador editorial'>",
    "<label for='review-search'>Buscar curso ou aula</label>",
    "<input id='review-search' type='search' maxlength='120' autocomplete='off' placeholder='Ex.: Visitas, Lead, IA'>",
    "<label for='review-filter'>Filtrar por situação</label>",
    "<select id='review-filter'>",
    "<option value='ALL'>Todas as situações</option>",
    "<option value='PENDING_HUMAN_REVIEW'>Pendentes</option>",
    "<option value='NEEDS_CHANGES'>Precisam de ajustes</option>",
    "<option value='CLAIMED_HUMAN_APPROVED'>Declarações humanas não verificadas</option>",
    "</select><p id='review-search-count' class='muted' role='status' aria-live='polite'></p>",
    "<div id='review-results' class='review-results' hidden></div></section>",
    "<label for='lessons'>Aulas do curso selecionado</label><select id='lessons'></select>",
    "<div class='toolbar'><button id='previous' type='button'>Aula anterior</button>",
    "<button id='next' type='button'>Próxima aula</button>",
    "<button id='next-pending' type='button'>Próxima pendente</button>",
    "<button id='next-adjustment' type='button'>Próxima com ajustes</button></div>",
    "<p id='course-title' class='muted'></p><h1 id='title' tabindex='-1'></h1>",
    "<p id='identity' class='muted'></p>",
    "<article id='body' aria-label='Texto integral da aula'></article>",
    "<h2>Observações editoriais</h2>",
    "<label for='status'>Status da revisão</label><select id='status'>",
    "<option value='PENDING_HUMAN_REVIEW'>Pendente de revisão humana</option>",
    "<option value='NEEDS_CHANGES'>Necessita ajustes</option>",
    "<option value='CLAIMED_HUMAN_APPROVED'>Aprovação humana declarada — não verificada</option>",
    "</select>",
    "<label for='reviewer'>Pessoa revisora</label><input id='reviewer' maxlength='120' autocomplete='off'>",
    "<label for='evidence'>Link de evidência (issue/PR deste repositório)</label>",
    "<input id='evidence' maxlength='250' autocomplete='off'>",
    "<label for='notes'>Observações (até 2.000 caracteres)</label>",
    "<textarea id='notes' maxlength='2000'></textarea>",
    "<p class='muted'>Para status Pendente, deixe revisor e evidência vazios. O CSV jamais libera acesso.</p>",
    "</main></div><footer>Imagine Universidade — revisão exclusivamente offline.</footer>",
    "<script>"+script+"</script></body></html>"
  ].join("\n");
}