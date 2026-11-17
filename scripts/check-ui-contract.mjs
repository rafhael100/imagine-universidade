#!/usr/bin/env node

/**
 * Universidade Imagine: static frontend and routing contract.
 * Node.js 18+. No dependencies, HTTP requests, secrets or server startup.
 * Run: node scripts/check-ui-contract.mjs
 *
 * This protects source-level invariants only. It is NOT an auth or browser test.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { Script } from "node:vm";
import { createHash } from "node:crypto";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const views = [
  ["student", "resources/views/university/student.blade.php", "/universidade/private"],
  ["admin", "resources/views/university/admin.blade.php", "/universidade/private/admin"],
];

for (const [role, path, prefix] of views) {
  const html = read(path);
  const match = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
  assert.ok(match, role + ": JavaScript ausente");
  new Script(match[1], { filename: path });

  assert.match(html, /<html lang="pt-BR">/, role + ": idioma");
  assert.match(html, /<script nonce="\{\{ request\(\)->attributes->get\('university\.csp_nonce'\) \}\}">/, role + ": CSP nonce JS");
  assert.match(html, /<style nonce="\{\{ request\(\)->attributes->get\('university\.csp_nonce'\) \}\}">/, role + ": CSP nonce CSS");
  assert.match(html, /name="robots" content="noindex,nofollow,noarchive"/, role + ": robots");
  assert.match(html, /name="csrf-token" content="\{\{ csrf_token\(\) \}\}"/, role + ": CSRF");
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=/i, role + ": JS externo");
  assert.doesNotMatch(html, /\b(?:localStorage|sessionStorage|eval)\b/, role + ": armazenamento ou eval");
  assert.doesNotMatch(match[1], /\b(?:innerHTML|outerHTML)\s*=|\binsertAdjacentHTML\s*\(/, role + ": HTML dinâmico não saneado");
  assert.ok(match[1].includes('credentials:"same-origin"'), role + ": cookies same-origin");
  assert.ok(match[1].includes('"X-CSRF-TOKEN":csrf'), role + ": cabeçalho CSRF");
  assert.ok(match[1].includes(prefix), role + ": endpoint privado");
  console.log("PASS " + role + ": JavaScript válido, conteúdo textual seguro, CSRF e mesmo domínio");
}

const studentProgressUI = read("resources/views/university/student.blade.php");
assert.match(studentProgressUI, /id="overall-progress"/, "aluno: resumo do progresso");
assert.match(studentProgressUI, /function progressLabel\(course\)/, "aluno: progresso normalizado");
assert.match(studentProgressUI, /el\("progress",undefined,"course-progress"\)/, "aluno: barra nativa acessível");
assert.match(studentProgressUI, /bar\.setAttribute\("aria-label"/, "aluno: texto acessível por curso");
assert.match(studentProgressUI, /await api\("\/courses"\)/, "aluno: atualização pelo servidor");
console.log("PASS student progress: resumo, porcentagem, barra acessível e API autoritativa");
assert.ok(studentProgressUI.includes('lessons.find(item=>!Boolean(item.completed))'), "aluno: abrir primeira aula pendente");
assert.ok(studentProgressUI.includes('markLessonStatus(id,true)'), "aluno: marcar status após conclusão");
assert.ok(studentProgressUI.includes('statusLabel.dataset.lessonStatus'), "aluno: indicador textual por aula");
console.log("PASS student resume: aula pendente priorizada e conclusão textual acessível");
assert.ok(studentProgressUI.includes('advance.dataset.nextLesson'), "aluno: botão para próxima aula");
assert.ok(studentProgressUI.includes("Você concluiu todas as aulas deste curso"), "aluno: conclusão sem certificação");

const nextFunction = studentProgressUI.match(/function nextPendingLessonId\(currentId\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(nextFunction, "aluno: função pura de seleção de próxima aula ausente");
function fixtureNext(entries, currentId) {
  const items = entries.map(([id, completed]) => ({
    dataset: { lessonId: String(id), completed: String(completed) },
  }));
  return new Script(nextFunction + "\nnextPendingLessonId(currentId)", {
    filename: "student-next-lesson",
  }).runInNewContext({
    currentId,
    lessonsBox: { querySelectorAll: () => items },
  });
}
assert.equal(fixtureNext([[10, 1], [20, 0], [30, 0]], 10), 20, "próxima pendente");
assert.equal(fixtureNext([[10, 0], [20, 1], [30, 1]], 30), 10, "retorno ao início");
assert.equal(fixtureNext([[10, 1], [20, 1]], 10), null, "curso concluído");
assert.equal(fixtureNext([[10, 0], [20, 1]], 999), null, "aula inválida");
console.log("PASS next lesson: sequência, retorno, conclusão e ID inválido");





assert.match(studentProgressUI, /id="course-search" type="search"/, "aluno: campo de busca acessível");
assert.match(studentProgressUI, /<label for="course-search">Buscar cursos<\/label>/, "aluno: label de busca");
assert.ok(studentProgressUI.includes('state.query=event.target.value.slice(0,80)'), "aluno: entrada limitada");
const normalizeFn=studentProgressUI.match(/function normalizeSearchText\(text\)\{[\s\S]*?\n\}/)?.[0];
const filterFn=studentProgressUI.match(/function filterCourses\(courses,category,query\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(normalizeFn && filterFn, "aluno: funções puras de busca");
const sampleCourses=[
  {id:1,title:"Gestão de negócios",summary:"Funil de vendas",category:"negocios"},
  {id:2,title:"Sistemas Imagine",summary:"Primeiros passos",category:"sistemas"},
  {id:3,title:"Conversão de leads",summary:"Acompanhamento",category:"metodologia"}
];
function searchFixture(query,category="todos"){
  const code=normalizeFn+"\n"+filterFn+"\nfilterCourses(items,category,query)";
  return new Script(code,{filename:"student-course-search"}).runInNewContext({
    items:sampleCourses,category,query,
    labels:{metodologia:"Metodologia",negocios:"Negócios",sistemas:"Treinamentos Imagine"}
  }).map(item=>item.id).join(",");
}
assert.equal(searchFixture("NEGOCIOS"),"1","busca sem acentos");
assert.equal(searchFixture("  primeiros  "),"2","busca por resumo com trim");
assert.equal(searchFixture(""),"1,2,3","busca vazia");
assert.equal(searchFixture("funil","sistemas"),"","interseção categoria + busca");
assert.equal(searchFixture("SISTEMAS","sistemas"),"2","categoria + busca");
assert.equal(searchFixture("não existe"),"","sem resultado");
console.log("PASS course search: acessibilidade, limites, acentos e categorias");


assert.ok(studentProgressUI.includes("const request=++state.courseRequest;"),"aluno: token monotônico de curso");
assert.ok(studentProgressUI.includes("const request=++state.lessonRequest;"),"aluno: token monotônico de aula");
assert.ok(studentProgressUI.includes("if(state.courseRequest!==request)return;"),"aluno: curso atrasado não altera tela");
assert.ok(studentProgressUI.includes("if(state.lessonRequest!==request)return;"),"aluno: aula atrasada não altera tela");
assert.ok(studentProgressUI.includes("if(state.courseRequest===request&&!state.accessDenied){"),"aluno: erro antigo de curso ignorado e revogação não reabre tela");
assert.ok(studentProgressUI.includes("if(state.lessonRequest===request&&!state.accessDenied&&state.lessonId===id){"),"aluno: erro antigo, aula trocada ou sessão revogada não reabre conteúdo");
assert.ok(studentProgressUI.includes("++state.courseRequest;++state.lessonRequest;"),"aluno: troca de filtro cancela seleção antiga");
console.log("PASS async navigation: respostas e erros obsoletos isolados por token");

const adminUI=read("resources/views/university/admin.blade.php");
for(const [role,view] of [["student",studentProgressUI],["admin",adminUI]]){
  assert.match(view,/function lockAccess\(message\)/,role+": encerramento explícito");
  assert.match(view,/if\(response.status===403\)lockAccess/,role+": revogação 403");
  assert.match(view,/if\(response.status===419\)lockAccess/,role+": sessão 419");
  assert.match(view,/if\(state.accessDenied\)throw new Error\(state.accessMessage\)/,role+": negar novas requisições");
  assert.match(view,/if\(state.accessDenied\)throw new Error\(state.accessMessage\);\n  return data;/,role+": retorno JSON só após conferir revogação");
  assert.match(view,/state.courses=\[\]/,role+": limpeza de catálogo");
}
assert.match(studentProgressUI,/\+\+state.courseRequest;\+\+state.lessonRequest;/,"aluno: invalidar respostas obsoletas");
assert.match(adminUI,/document.querySelectorAll\("\.layout button,.layout input,.layout select,.layout textarea,.audit-panel button"\)/,"admin: impedir uso de controles e auditoria após revogação");
console.log("PASS revocation UI: student/admin fail-closed on HTTP 403/419, clear private state");


const lessonsFn=adminUI.match(/async function refreshLessons\([^\n]*\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(lessonsFn,"admin: função de atualização de aulas");
const pendingLessons=[];
const fakeState={course:{id:1},lessons:[],lesson:null,lessonRequest:0,accessDenied:false};
const fakeContext={
  state:fakeState,
  api:path=>new Promise(resolve=>pendingLessons.push({path,resolve})),
  renderLessons:()=>{},
  resetLesson:()=>{},
  fillCourse:()=>{},
  updateEditorialControls:()=>{},
  fillLesson:()=>{},
  // Race test isolates request ordering; the actual validator is tested below.
  validatedAdminLessons:response=>response.lessons
};
const refreshFixture=new Script(lessonsFn+"\nrefreshLessons",{filename:"admin-lesson-race"}).runInNewContext(fakeContext);
const first=refreshFixture();
fakeState.course={id:2};
const second=refreshFixture();
assert.equal(pendingLessons.length,2);
assert.match(pendingLessons[0].path,/\/courses\/1\/lessons$/);
assert.match(pendingLessons[1].path,/\/courses\/2\/lessons$/);
pendingLessons[1].resolve({lessons:[{id:20}]});
await second;
pendingLessons[0].resolve({lessons:[{id:10}]});
await first;
assert.equal(fakeState.lessons[0].id,20,"admin: resposta tardia de curso antigo não substitui aulas atuais");
fakeState.course={id:3};
const third=refreshFixture();
fakeState.accessDenied=true;
pendingLessons[2].resolve({lessons:[{id:30}]});
await third;
assert.equal(fakeState.lessons.length,0,"admin: após revogação, carregamento de aulas não restaura conteúdo");
assert.match(adminUI,/const request=\+\+state.courseRequest;/,"admin: token de atualização de cursos");
assert.match(adminUI,/\+\+state.courseRequest;\+\+state.lessonRequest;/,"admin: invalidar após troca/negação");
assert.match(adminUI,/function fillCourse\(\)\{\n  if\(state.accessDenied\)return;/,"admin: formulário não reabilitado");
console.log("PASS admin race: respostas fora de ordem e pós-revogação descartadas");


const warningFn=adminUI.match(/function unpublishWarning\(title\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(warningFn,"admin: aviso de despublicação obrigatório");
const warning=new Script(warningFn+"\nunpublishWarning('Curso fictício')").runInNewContext({});
for(const word of ["Curso fictício","histórico anterior","nova versão","progresso separado"]){
  assert.ok(warning.includes(word),"admin: aviso omite "+word);
}
assert.match(adminUI,/if\(!confirm\(unpublishWarning\(state.course.title\)\)\)return;/,"admin: exigência de confirmação antes do POST");
assert.match(adminUI,/if\(state.accessDenied\|\|state.course\?\.id!==courseId\|\|!beginWrite\(\)\)return;/,"admin: revalidar seleção após confirmação");
assert.match(adminUI,/await api\("\/courses\/".*\+courseId\+"\/unpublish","POST"\)/,"admin: endpoint de despublicação com ID capturado");
console.log("PASS unpublish: confirmação explícita, histórico e novo progresso declarados");


assert.match(studentProgressUI, /id="resume-course" class="primary resume-btn" disabled/, "aluno: retomar bloqueado antes de dados autorizados");
assert.match(studentProgressUI, /document.getElementById\("resume-course"\).disabled=true/, "aluno: retomar bloqueado após revogação");
assert.match(studentProgressUI, /state.filter="todos";state.query="";/, "aluno: retomar restaura filtros");
const progressFn=studentProgressUI.match(/function progressLabel\(course\)\{[\s\S]*?\n\}/)?.[0];
const resumeFn=studentProgressUI.match(/function nextPendingCourseId\(courses,currentCourseId\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(progressFn&&resumeFn, "aluno: funções puras de retomada");
function resumeFixture(courses,currentCourseId=null){
  return new Script(progressFn+"\n"+resumeFn+"\nnextPendingCourseId(courses,currentCourseId)",{
    filename:"student-resume",
  }).runInNewContext({courses,currentCourseId});
}
const sampleResume=[
  {id:10,lessons_total:4,lessons_completed:4},
  {id:20,lessons_total:4,lessons_completed:1},
  {id:30,lessons_total:3,lessons_completed:0}
];
assert.equal(resumeFixture(sampleResume),20,"retomar primeira pendente");
assert.equal(resumeFixture(sampleResume,30),30,"manter curso atual pendente");
assert.equal(resumeFixture(sampleResume,10),20,"pular curso já concluído");
assert.equal(resumeFixture([{id:3,lessons_total:2,lessons_completed:2}]),null,"todos concluídos");
assert.equal(resumeFixture([{id:3,lessons_total:0,lessons_completed:0}]),null,"curso sem aulas publicado");
assert.equal(resumeFixture([{id:-1,lessons_total:4,lessons_completed:0}]),null,"ID inválido");
assert.equal(resumeFixture(null),null,"catálogo inválido");
console.log("PASS resume studies: priorizar curso incompleto, proteger curso concluído e IDs");


const otherCourseFn=studentProgressUI.match(/function nextIncompleteOtherCourseId\(courses,currentCourseId\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(otherCourseFn,"aluno: próximo curso pendente");
function otherCourseFixture(courses,currentId){
  return new Script(progressFn+"\n"+otherCourseFn+"\nnextIncompleteOtherCourseId(courses,currentCourseId)",{
    filename:"student-next-course",
  }).runInNewContext({courses,currentCourseId:currentId});
}
const crossCourse=[
  {id:1,lessons_total:2,lessons_completed:2},
  {id:2,lessons_total:2,lessons_completed:1},
  {id:3,lessons_total:1,lessons_completed:0},
];
assert.equal(otherCourseFixture(crossCourse,2),3,"pular atual e concluídos");
assert.equal(otherCourseFixture(crossCourse,1),2,"priorizar primeiro incompleto");
assert.equal(otherCourseFixture([{id:1,lessons_total:2,lessons_completed:2}],1),null,"biblioteca concluída");
assert.equal(otherCourseFixture([{id:1,lessons_total:1,lessons_completed:0}],1),null,"não indicar o mesmo curso");
assert.equal(otherCourseFixture(null,1),null,"dados inválidos");
assert.match(studentProgressUI,/nextCourse.dataset.nextCourse=""/,"aluno: botão de próximo curso");
assert.match(studentProgressUI,/nextCourse.addEventListener\("click",\(\)=>openCourseWithAllFilters\(nextCourseId\)\)/,"aluno: troca segura de curso");
assert.match(studentProgressUI,/function openCourseWithAllFilters\(target,preferredLessonId=null\)/,"aluno: navegação segura por curso e aula selecionada");
assert.match(studentProgressUI,/if\(state.accessDenied\|\|!state.libraryReady\|\|!Number.isSafeInteger\(target\)\|\|target<1\)return;/,"aluno: transição bloqueada após revogação");
console.log("PASS cross-course resume: próximo curso incompleto, sem voltar ao atual");

const routes = read("routes/web.php");
const provider = read("app/Providers/AppServiceProvider.php");
const middleware = read("app/Http/Middleware/RequireUniversityGrant.php");
const privateResponsePolicy = read("app/Http/Middleware/ProtectPrivateUniversityResponses.php");
assert.match(routes, /university\.grant:view/);
assert.match(routes, /university\.grant:manage/);
assert.match(routes, /Route::view\('\/app', 'university\.student'\)/);
assert.match(routes, /Route::view\('\/app', 'university\.admin'\)/);
assert.match(routes, /Route::fallback/);
assert.match(provider, /UnavailablePortalAuthority::class/, "provider padrão deve negar");
assert.match(middleware, /university\.verified_grant/, "decisão do backend");
assert.match(privateResponsePolicy, /Cache-Control/, "respostas privadas, inclusive erros anteriores ao grant");
assert.doesNotMatch(middleware, /->header\(['"]X-(?:Company|Portal)/, "não aceitar prova em header");
console.log("PASS routes: Cliente/Admin com grants separados, fallback e provider deny-all");


assert.match(adminUI,/id="delete-course"/,"admin: botão de exclusão de rascunho");
assert.match(adminUI,/if\(!confirm\("Excluir definitivamente este curso/,"admin: confirmação irreversível");
assert.match(adminUI,/await api\("\/courses\/"\+courseId,"DELETE"\)/,"admin: delete usa ID capturado");
assert.match(adminUI,/\$\("delete-course"\)\.disabled=!c\|\|!!c.is_published/,"admin: bloquear exclusão enquanto publicado");
assert.match(routes,/Route::delete\('\/courses\/\{courseId\}'/,"backend: rota privada de exclusão");
console.log("PASS delete draft course: confirmação UI e rota administrativa protegida");


assert.match(routes,/Route::get\('\/progress\/export', \[UniversityController::class, 'exportProgress'\]\)/,"backend: export exige permissão view");
assert.match(studentProgressUI,/id="export-progress" class="secondary" disabled/,"aluno: exportação inicia bloqueada");
assert.match(studentProgressUI,/document.getElementById\("export-progress"\).disabled=true/,"aluno: revogação desativa export");
assert.match(studentProgressUI,/await api\("\/progress\/export"\)/,"aluno: export usa API privada");
assert.match(studentProgressUI,/link.download="imagine-universidade-progresso.json"/,"aluno: arquivo com nome explícito");
console.log("PASS export progress: download privado, desabilitado na revogação");

const exportFn=studentProgressUI.match(/function sanitizedProgressExport\(payload\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(exportFn,"export: sanitizer pure function must exist");
const sanitizeExport=input=>new Script(exportFn+"\nsanitizedProgressExport(input)",{
  filename:"university-safe-export",
}).runInNewContext({input});
const safeExportFixture={schema_version:1,scope:"current_authenticated_student",completions:[{
  course_slug:"visitas",course_version:2,lesson_slug:"primeiros-passos",
  completed_at:"2026-11-16 12:34:56",email:"must-not-export@example.invalid",
}]};
assert.equal(JSON.stringify(sanitizeExport(safeExportFixture)),JSON.stringify({
  schema_version:1,scope:"current_authenticated_student",completions:[{
    course_slug:"visitas",course_version:2,lesson_slug:"primeiros-passos",
    completed_at:"2026-11-16 12:34:56",
  }],
}),"export: allowlist must strip unknown personal fields");
assert.equal(sanitizeExport({...safeExportFixture,schema_version:2}),null,"export: reject future or unknown schema");
assert.equal(sanitizeExport({...safeExportFixture,scope:"another_student"}),null,"export: reject foreign scope");
assert.equal(sanitizeExport({...safeExportFixture,completions:new Array(5001).fill(safeExportFixture.completions[0])}),null,"export: reject oversized histories");
assert.equal(sanitizeExport({...safeExportFixture,completions:[{...safeExportFixture.completions[0],course_version:0}]}),null,"export: reject invalid course versions");
assert.equal(sanitizeExport({...safeExportFixture,completions:[{...safeExportFixture.completions[0],course_slug:"tenant/other"}]}),null,"export: reject invalid slug");
assert.equal(sanitizeExport({...safeExportFixture,completions:[{...safeExportFixture.completions[0],completed_at:"yesterday"}]}),null,"export: reject malformed timestamps");
assert.equal(JSON.stringify(sanitizeExport({...safeExportFixture,completions:[]})),JSON.stringify({
  schema_version:1,scope:"current_authenticated_student",completions:[],
}),"export: an empty history is still valid");
assert.match(studentProgressUI,/if\(state\.accessDenied\|\|!state\.libraryReady\|\|state\.exportLoading\)return;/,"export: no duplicate requests or revoked download");
assert.match(studentProgressUI,/const sanitized=sanitizedProgressExport\(progress\)/,"export: never serialize raw API payload");
assert.match(studentProgressUI,/JSON\.stringify\(sanitized,null,2\)/,"export: download only allowlisted progress");
console.log("PASS export privacy: versioned scope, max 5000 entries, allowlisted fields, single-flight and no foreign data");



assert.match(routes,/Route::post\('\/lessons\/\{lessonId\}\/tutor', \[UniversityController::class, 'askTutor'\]\)/,"tutor: route protected inside student group");
assert.match(provider,/TutorGateway::class, DisabledTutorGateway::class/,"tutor: provider default disabled");
console.log("PASS tutor policy: no model provider activated in application");


const splitLessonFn=studentProgressUI.match(/function splitLessonSections\(body\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(splitLessonFn,"aula: parser puro de seções educacionais");
const sampleText="Aprenda a jornada.\n\nEXEMPLO FICTÍCIO\nUm caso imaginário.\n\nAPLICAÇÃO OPCIONAL\nFaça no seu negócio fictício.\n\nCUIDADO IMPORTANTE\nNunca prometa resultado.";
const parsedSections=new Script(splitLessonFn+"\nsplitLessonSections(input)",{
  filename:"lesson-section-safety",
}).runInNewContext({input:sampleText});
assert.equal(parsedSections.length,4,"aula: quatro blocos sem perder a introdução");
assert.equal(parsedSections.map(x=>x.heading??"INTRO").join("|"),
  "INTRO|EXEMPLO FICTÍCIO|APLICAÇÃO OPCIONAL|CUIDADO IMPORTANTE");
assert.equal(parsedSections[2].text,"Faça no seu negócio fictício.");
const malicious="<img src=x onerror=alert(1)>";
const maliciousBlocks=new Script(splitLessonFn+"\nsplitLessonSections(input)").runInNewContext({input:malicious});
assert.equal(maliciousBlocks[0].text,malicious,"aula: conteúdo potencialmente hostil preservado como texto, não HTML");
assert.match(studentProgressUI,/function lessonTextFragment\(body\)/,"aula: construção de DOM");
assert.match(studentProgressUI,/wrapper.append\(el\("h4",section.heading\)\)/,"aula: estrutura semântica");
assert.match(studentProgressUI,/wrapper.append\(el\("p",section.text\)\)/,"aula: texto seguro");
assert.match(studentProgressUI,/content.append\(el\("h3",lesson.title\),lessonTextFragment\(lesson.body\)\)/);
assert.doesNotMatch(studentProgressUI,/\.innerHTML\s*=/,"aula: nunca interpretar HTML de currículo");
console.log("PASS lesson sections: semântica acessível e texto seguro sem HTML");


const previewFn=adminUI.match(/function previewLessonParts\(body\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(previewFn,"editor: parser de prévia acessível");
const previewText="Introdução.\n\nEXEMPLO FICTÍCIO\nCaso de teste.\n\nAPLICAÇÃO OPCIONAL\nAtividade livre.\n\nCUIDADO IMPORTANTE\nNão prometer resultados.";
const previewParts=new Script(previewFn+"\npreviewLessonParts(body)",{filename:"editorial-preview"}).runInNewContext({body:previewText});
assert.equal(previewParts.length,4);
assert.equal(previewParts[1].title,"EXEMPLO FICTÍCIO");
assert.equal(previewParts[2].text,"Atividade livre.");
assert.match(adminUI,/id="lesson-preview" class="editorial-preview".*hidden>/,"editor: preview oculta inicialmente");
assert.match(adminUI,/id="preview-lesson"/,"editor: ação disponível para rascunho");
assert.match(adminUI,/\$\("preview-body"\)\.append\(el\("p",section.text\)\)/,"editor: conteúdo apenas texto");
assert.match(adminUI,/function hideLessonPreview\(\)/,"editor: limpar conteúdo na navegação");
assert.match(adminUI,/if\(!confirm\("Publicar esta versão revisada para os clientes elegíveis/,"editor: publicação exige confirmação");
assert.match(adminUI,/if\(state.accessDenied\|\|state.course\?\.id!==courseId\|\|!beginWrite\(\)\)return;/,"editor: evitar troca de curso no diálogo");
console.log("PASS preview editorial: conteúdo local sem HTML, confirmação humana explícita");


// The test runner image intentionally excludes its Docker build metadata.
// Validate that allowlist in source checkouts; verify copied assets in BOTH.
if(existsSync(new URL("../.dockerignore",import.meta.url))){
  const dockerIgnore=read(".dockerignore");
  const qaDockerfile=read("ops/qa/Dockerfile");
  for(const path of ["public/assets/logo-imagine.png","public/assets/imagine-tokens.css"]){
    assert.ok(dockerIgnore.includes("!"+path),"Docker allowlist deve incluir "+path);
    assert.ok(qaDockerfile.includes(path),"Docker QA deve copiar "+path);
  }
}
const originalLogo=readFileSync(new URL("../public/assets/logo-imagine.png",import.meta.url));
assert.equal(originalLogo.subarray(0,8).toString("hex"),"89504e470d0a1a0a","logo Imagine PNG válido");
const gitBlobHash=createHash("sha1").update(Buffer.from("blob "+originalLogo.length+"\0")).update(originalLogo).digest("hex");
assert.equal(gitBlobHash,"678adeceb3a8ecdaeb6b576b9ee18d1bf0396f77","logo idêntico ao original do Portal Node");
const imagineTokens=read("public/assets/imagine-tokens.css");
for(const token of ["--imagine-orange: #f9941d","--imagine-ink: #171b19","--imagine-surface: #f7f7f8","--imagine-touch-target: 44px"]){
  assert.ok(imagineTokens.includes(token),"token canônico ausente: "+token);
}
for(const [role,view] of [["aluno",studentProgressUI],["admin",adminUI]]){
  assert.match(view,/assets\/logo-imagine.png/,"identidade original "+role);
  assert.match(view,/alt="Imagine" width="200" height="55"/,"alt e tamanho logo "+role);
  assert.match(view,/assets\/imagine-tokens.css/,"CSS local "+role);
  assert.match(view,/class="skip-link" href="#main-content"/,"atalho de teclado "+role);
  assert.match(view,/id="main-content"/,"alvo de navegação "+role);
  assert.match(view,/min-height:var\(--imagine-touch-target\)/,"alvos de toque "+role);
  assert.match(view,/class="nav-links" aria-label=/,"navegação real por tarefa "+role);
}
console.log("PASS Imagine DS-v1: logo original SHA, tokens canônicos, navegação e acessibilidade");


assert.match(routes,/Route::get\('\/audit', \[UniversityController::class, 'adminAudit'\]\)/,"admin: rota privada audit");
assert.match(adminUI,/id="audit-panel" class="panel audit-panel"/,"admin: seção de histórico");
assert.match(adminUI,/state.auditRequest!==request/,"admin: resposta obsoleta ignorada");
assert.match(adminUI,/\+\+state.auditRequest;state.auditEvents=\[\]/,"admin: zerar histórico após revogação");
assert.match(adminUI,/el\("strong",String\(item.action\|\|"alteração"\)\)/,"admin: somente texto na tela");
console.log("PASS private audit: painel, filtro de acesso, paginação e limpeza por revogação");


function contrastRatio(foreground, background) {
  const luminance = h => {
    const channels=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
    const linear=channels.map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
    return linear[0]*0.2126+linear[1]*0.7152+linear[2]*0.0722;
  };
  const a=luminance(foreground),b=luminance(background);
  return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
}
for(const [role,source] of [["aluno",studentProgressUI],["editor",adminUI]]){
  const footer=source.match(/\.footer\{[^}]*color:(#[0-9a-fA-F]{6})/);
  assert.ok(footer,role+": CSS footer not found");
  assert.ok(contrastRatio(footer[1],"#F7F7F8")>=4.5,
    role+": footer WCAG AA must be at least 4.5:1");
}
console.log("PASS WCAG AA footer contrast: student/editor text remains legible");


const writeStart=adminUI.match(/function beginWrite\(\)\{[\s\S]*?\n\}/)?.[0];
const writeEnd=adminUI.match(/function finishWrite\(\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(writeStart&&writeEnd,"Admin: single-flight writes defined");
const fakeLayout={inert:false,setAttribute(){}};
const result=new Script(writeStart+"\n"+writeEnd+"\n"+
  "const first=beginWrite(),duplicate=beginWrite();finishWrite();"+
  "const retry=beginWrite();state.accessDenied=true;finishWrite();"+
  "({first,duplicate,retry,locked:document.querySelector('.layout').inert,"+
  "courseRequest:state.courseRequest,lessonRequest:state.lessonRequest})",
  {filename:"admin-write-serialization"}).runInNewContext({
    state:{accessDenied:false,writePending:false,catalogReady:true,course:null,lessonsReady:true,courseRequest:0,lessonRequest:0},
    document:{querySelector:()=>fakeLayout},say:()=>{},
    invalidateEditorialOverview:()=>{},renderEditorialOverview:()=>{}
  });
assert.equal(result.first,true);
assert.equal(result.duplicate,false,"double-click cannot start second POST");
assert.equal(result.retry,true,"next write allowed after completion");
assert.equal(result.locked,true,"403 remains inert after completion");
assert.equal(result.courseRequest,2);
assert.equal(result.lessonRequest,2);
assert.match(adminUI,/document.querySelector\("\.layout"\)\.inert=true/,"lock on 403");
assert.ok((adminUI.match(/finally\{finishWrite\(\);\}/g)||[]).length>=6,
  "all six write pathways must release busy fence");
console.log("PASS admin single-flight: no duplicate submits, stale GET invalidation and fail-closed state");


const publicationRoutes=read("routes/web.php");
const publicationRepository=read("app/Domain/Learning/UniversityCatalogRepository.php");
const publicationController=read("app/Http/Controllers/UniversityController.php");
assert.match(publicationRoutes,/\/courses\/\{courseId\}\/publication-check/,"only manager route for readiness");
assert.match(publicationRepository,/function publicationPreflight\(PortalGrant \$grant, int \$courseId\)/,"preflight stays tenant-scoped");
assert.match(publicationRepository,/hash_equals\(/,"content snapshot compared under transaction");
assert.match(publicationController,/expected_content_hash/,"publish accepts reviewed hash");
assert.match(adminUI,/id="check-publication"/,"admin: explicit readiness button");
assert.match(adminUI,/id="publication-readiness"/,"admin: read-only checklist");
assert.match(adminUI,/function editorialHasUnsavedChanges\(\)/,"admin: do not publish unsaved form");
assert.match(adminUI,/if\(editorialHasUnsavedChanges\(\)\)/,"admin: unsaved work blocks preflight");
assert.match(adminUI,/expected_content_hash:reviewed.content_hash/,"admin: publish exact checked version");
console.log("PASS publication preflight: manager-only, review hash, unsaved form guard");


assert.match(adminUI,/function clearPublicationCheck\(\)/,"editor: invalidate stale preview");
assert.match(adminUI,/state\.preflightRequest!==request/,"editor: ignore out-of-order readiness");
assert.match(adminUI,/\$\("course-form"\)\.addEventListener\("input",clearPublicationCheck\)/);
assert.match(adminUI,/\$\("lesson-form"\)\.addEventListener\("input",clearPublicationCheck\)/);
assert.match(adminUI,/clearPublicationCheck\(\);\s*\+\+state\.auditRequest/,"editor: clear on 403/419");
console.log("PASS editorial readiness: pending GET invalidated by edits and revocation");


const pillarFn=studentProgressUI.match(/function pillarCards\(courses\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(pillarFn,"student: pure 3 pillar path function");
const testPath = new Script("const pillars="+JSON.stringify([
  {slug:"trilha-visitas-seja-encontrado",title:"1 · Visitas",intro:"v"},
  {slug:"trilha-leads-interesse-contato",title:"2 · Leads",intro:"l"},
  {slug:"trilha-clientes-conquiste-acompanhe",title:"3 · Clientes",intro:"c"}
])+";\n"+pillarFn+"\n"+
"pillarCards(courses).map(p=>[p.courseId,p.progress.total,p.progress.completed])",
{filename:"student-guided-path"}).runInNewContext({
  courses:[{id:41,slug:"trilha-visitas-seja-encontrado",lessons_total:4,lessons_completed:2}],
  progressLabel:course=>({total:course.lessons_total,completed:course.lessons_completed,percent:50}),
});
assert.equal(JSON.stringify(testPath),JSON.stringify([[41,4,2],[null,0,0],[null,0,0]]));
assert.match(studentProgressUI,/id="pillar-cards"/,"student: 3 pillars region");
assert.match(studentProgressUI,/renderPillars\(\);/,"student: refresh from authoritative catalog");
assert.match(studentProgressUI,/document.getElementById\("pillar-cards"\)\.replaceChildren\(\)/,"student: purge on 403");
assert.match(studentProgressUI,/button\.disabled=!Number\.isSafeInteger\(pillar\.courseId\)/,"student: unapproved courses are disabled");
assert.match(studentProgressUI,/openCourseWithAllFilters\(id\)/,"student: route through guarded course selection");
console.log("PASS student three-pillar journey: only published authorized course IDs clickable");


const simFn=studentProgressUI.match(/function illustrativeFunnel\(visits,leadRate,clientRate\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(simFn,"student: local educational funnel calculator");
const simTest=values=>new Script(simFn+"\nillustrativeFunnel(v,a,b)",{
  filename:"imagine-local-simulator"
}).runInNewContext({v:values[0],a:values[1],b:values[2]});
assert.equal(JSON.stringify(simTest(["1000","5","10"])),JSON.stringify({visits:1000,leads:50,clients:5}));
assert.equal(JSON.stringify(simTest(["0","100","100"])),JSON.stringify({visits:0,leads:0,clients:0}));
assert.equal(simTest(["-1","5","10"]),null);
assert.equal(simTest(["10","101","10"]),null);
assert.equal(simTest(["10","5","-1"]),null);
assert.equal(simTest(["1.5","5","10"]),null);
assert.equal(simTest(["","5","10"]),null);
assert.match(studentProgressUI,/id="sim-visits"/);
assert.match(studentProgressUI,/id="sim-leads-rate"/);
assert.match(studentProgressUI,/id="sim-clients-rate"/);
assert.match(studentProgressUI,/document.querySelectorAll\("\.sim-inputs input"\)\.forEach\(input=>\{input.value="";input.disabled=true;\}\)/);
assert.doesNotMatch(studentProgressUI,/fetch\([^)]*sim-/,"simulator must not transmit fields");
console.log("PASS educational simulator: hypothetical 1000→50→5, limits, no personal data");

// Recover transient server failures, but NEVER automatically retry an
// unavailable/revoked Portal session. Both private pages must be recoverable
// with a single explicit action and clear all stale data on denial.
const adminRecoveryUI=read("resources/views/university/admin.blade.php");
assert.match(studentProgressUI,/id="library-recovery"/,"student: retry panel");
assert.match(studentProgressUI,/id="retry-library"/,"student: manual retry button");
assert.match(studentProgressUI,/if\(state\.accessDenied\|\|state\.libraryLoading\)return;/,"student: no retry after revocation and single flight");
assert.match(studentProgressUI,/recovery\.hidden=false;/,"student: show retry only after recoverable failure");
assert.match(studentProgressUI,/document\.getElementById\("library-recovery"\)\.hidden=true;/,"student: revoked state hides retry");
assert.match(adminRecoveryUI,/id="catalog-recovery"/,"admin: retry panel");
assert.match(adminRecoveryUI,/id="retry-catalog"/,"admin: manual retry button");
assert.match(adminRecoveryUI,/if\(state\.accessDenied\|\|state\.writePending\|\|state\.catalogLoading\)return;/,"admin: no stale retries or concurrent writes");
assert.match(adminRecoveryUI,/state\.courses=\[\];state\.course=null;state\.lessons=\[\];state\.lesson=null;/,"admin: purge stale editorial data");
assert.match(adminRecoveryUI,/\$\("catalog-recovery"\)\.hidden=true;/,"admin: access revocation hides retry");
console.log("PASS manual recovery UI: transient errors retry once; denial purges and disables both panels");

assert.match(adminRecoveryUI,/function courseHasUnsavedEdits\(\)/,"admin: course dirty-state guard");
assert.match(adminRecoveryUI,/function lessonHasUnsavedEdits\(\)/,"admin: lesson dirty-state guard");
assert.match(adminRecoveryUI,/if\(!confirmDiscardCourseAndLesson\(\)\)return;/,"admin: switching courses does not discard edits silently");
assert.match(adminRecoveryUI,/if\(!confirmDiscardLesson\(\)\)return;/,"admin: switching lessons does not discard edits silently");
assert.match(adminRecoveryUI,/state\.lesson\?\.id===Number\(b\.dataset\.lesson\)/,"admin: same-lesson selection preserves edits");
console.log("PASS editorial navigation: unsaved course and lesson changes require explicit discard");

assert.ok(studentProgressUI.includes('const retry=el("button","Tentar carregar aulas","secondary lesson-retry")'),"student: failed lesson read must offer manual retry");
assert.ok(studentProgressUI.includes('if(!state.accessDenied&&state.courseId===id)selectCourse(id,preferredLessonId);'),"student: lesson retry preserves exact search target in current authorized course");
assert.ok(adminRecoveryUI.includes('retry.id="retry-lessons"'),"admin: failed lesson read must offer manual retry");
assert.ok(adminRecoveryUI.includes('if(!state.accessDenied&&!state.writePending&&state.course?.id===courseId)'),"admin: retry forbidden after revocation or concurrent edit");
console.log("PASS both private lesson lists: fail-closed manual recovery without stale data");

assert.ok(studentProgressUI.includes('"secondary lesson-detail-retry"'),"student: a failed detail or progress read offers deliberate retry");
assert.ok(studentProgressUI.includes('if(state.lessonRequest===request&&!state.accessDenied&&state.lessonId===id)'),"student: stale or revoked lesson responses do not show retry");
assert.ok(studentProgressUI.includes('if(!state.accessDenied&&state.lessonId===id)selectLesson(id);'),"student: retry only while same lesson and permission context remains active");
console.log("PASS individual lesson read: no partial body or progress and no revoked retry");

assert.match(adminRecoveryUI,/function mustConfirmBrowserExit\(\)/,"admin: beforeunload gate is explicit");
assert.match(adminRecoveryUI,/state\.writePending\|\|courseHasUnsavedEdits\(\)\|\|lessonHasUnsavedEdits\(\)/,"admin: pending writes and both drafts warn");
assert.match(adminRecoveryUI,/window\.addEventListener\("beforeunload",event=>\{/,"admin: window exit protection");
assert.match(adminRecoveryUI,/if\(!mustConfirmBrowserExit\(\)\)return;/,"admin: clean or revoked session does not block exit");
console.log("PASS editor browser exit: warn on unsaved drafts/write, no lock after Portal revocation");

assert.ok(adminRecoveryUI.includes('state.catalogReady=false;'),"admin: catalog begins and fails closed");
assert.ok(adminRecoveryUI.includes('state.catalogReady=true;'),"admin: only successful authoritative catalog load permits writes");
assert.match(adminRecoveryUI,/if\(state\.accessDenied\|\|state\.writePending\|\|state\.writeOutcomeUnknown\|\|!state\.catalogReady\|\|\(state\.course!==null&&!state\.lessonsReady\)\)return false;/,"admin: no writes until previous uncertain mutation and catalogue/lessons are reconciled");
assert.match(adminRecoveryUI,/const draft=\(\)=>!state\.accessDenied&&!state\.writeOutcomeUnknown&&state\.catalogReady/,"admin: draft controls disabled while write outcome is unknown");
console.log("PASS editorial catalog authority: do not mutate during unavailable service list");

const adminCatalogFn=adminRecoveryUI.match(/function validatedAdminCourses\(payload\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(adminCatalogFn,"admin: malformed 200 catalogs require closed-schema validation");
const parseAdmin=input=>new Script(adminCatalogFn+"\nvalidatedAdminCourses(input)",{
  filename:"university-admin-catalog-contract",
}).runInNewContext({input});
const item={id:1,slug:"curso-um",title:"Curso privado de teste",category:"metodologia",
  summary:null,sort_order:0,is_published:0,internal_identity:"must-not-enter-browser-state"};
const accepted=parseAdmin({courses:[item]});
assert.equal(JSON.stringify(accepted),JSON.stringify([{id:1,slug:"curso-um",
  title:"Curso privado de teste",category:"metodologia",summary:"",
  sort_order:0,is_published:false}]),"admin: drop unexpected internal fields");
assert.equal(JSON.stringify(parseAdmin({courses:[]})),JSON.stringify([]),"admin: valid empty list is permitted");
assert.equal(parseAdmin({}),null,"admin: missing courses is not an empty list");
assert.equal(parseAdmin({courses:null}),null,"admin: null courses fail closed");
assert.equal(parseAdmin({courses:[item,{...item}]}),null,"admin: duplicate course IDs fail closed");
assert.equal(parseAdmin({courses:[{...item,id:0}]}),null,"admin: invalid IDs fail closed");
assert.equal(parseAdmin({courses:[{...item,category:"universidade_imagine"}]}),null,"admin: invalid category fails closed");
assert.equal(parseAdmin({courses:[{...item,title:" "}]}),null,"admin: blank course title fails closed");
assert.equal(parseAdmin({courses:[{...item,is_published:"true"}]}),null,"admin: invalid publishing status fails closed");
assert.equal(parseAdmin({courses:[{...item,sort_order:10000}]}),null,"admin: invalid sort order fails closed");
assert.match(adminRecoveryUI,/const verified=validatedAdminCourses\(result\);/,"admin: validate before enabling catalogue writes");
assert.match(adminRecoveryUI,/if\(verified===null\)throw new Error/,"admin: unknown response must deny mutations");
console.log("PASS admin catalogue: invalid or duplicate 200 response cannot activate editorial writes");

const lessonsValidatorFn=adminRecoveryUI.match(/function validatedAdminLessons\(payload\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(lessonsValidatorFn,"editor: private lesson list validator must exist");
const parseLessons=input=>new Script(lessonsValidatorFn+"\nvalidatedAdminLessons(input)",{
  filename:"university-admin-lesson-contract",
}).runInNewContext({input});
const validLesson={id:11,slug:"aula-ficticia",title:"Aula de teste",
  body:"Conteúdo sintético para conferir aula.",sort_order:0,status:"draft",
  is_published:false,subject_key:"must-not-be-in-editor-state"};
assert.equal(JSON.stringify(parseLessons({lessons:[validLesson]})),JSON.stringify([{
  id:11,slug:"aula-ficticia",title:"Aula de teste",
  body:"Conteúdo sintético para conferir aula.",sort_order:0,status:"draft",
  is_published:false,
}]),"editor: allowed fields only");
assert.equal(JSON.stringify(parseLessons({lessons:[]})),JSON.stringify([]),"editor: verified empty lesson list");
assert.equal(parseLessons({}),null,"editor: missing list is not an empty lesson list");
assert.equal(parseLessons({lessons:null}),null,"editor: null list fails closed");
assert.equal(parseLessons({lessons:[validLesson,{...validLesson}]}),null,"editor: duplicate IDs fail closed");
assert.equal(parseLessons({lessons:[validLesson,{...validLesson,id:12}]}),null,"editor: duplicate slug fails closed");
assert.equal(parseLessons({lessons:[{...validLesson,status:"untrusted"}]}),null,"editor: unknown status fails closed");
assert.equal(parseLessons({lessons:[{...validLesson,is_published:"true"}]}),null,"editor: non-boolean published flag fails closed");
assert.equal(parseLessons({lessons:[{...validLesson,body:42}]}),null,"editor: malformed content fails closed");
assert.match(adminRecoveryUI,/if\(verified===null\)throw new Error\("A lista de aulas recebida é inválida/,"editor: malformed 200 response is an error");
assert.match(adminRecoveryUI,/state\.lessonsReady=true;/,"editor: lesson state opened only after verified list");
assert.match(adminRecoveryUI,/state\.course!==null&&!state\.lessonsReady/,"editor: prevent writes while selected course lessons unverified");
console.log("PASS admin lessons: invalid 200 list never unlocks edits or publication");

const freezeFn=adminRecoveryUI.match(/function freezeUncertainEditorialWrite\(\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(freezeFn,"editor: ambiguous mutation must have a dedicated no-replay fence");
const ids=["new-course","course-save","lesson-save","delete-course","delete-lesson","publish","unpublish","check-publication"];
const elements=Object.fromEntries(ids.map(k=>[k,{disabled:false,hidden:true,replaceChildren(){}}]));
elements["catalog-recovery"]={hidden:true};
elements["retry-catalog"]={disabled:true};
let statusMessage="";
const frozen= new Script(freezeFn+"\nfreezeUncertainEditorialWrite();"+
  "({unknown:state.writeOutcomeUnknown,catalog:state.catalogReady,lessons:state.lessonsReady})",
  {filename:"ambiguous-editorial-no-replay"}).runInNewContext({
  state:{accessDenied:false,writeOutcomeUnknown:false,catalogReady:true,lessonsReady:true,courseRequest:0,lessonRequest:0},
  $:id=>elements[id]??{disabled:false},clearPublicationCheck:()=>{},hideLessonPreview:()=>{},
  say:m=>{statusMessage=m;},invalidateEditorialOverview:()=>{},
});
assert.equal(frozen.unknown,true,"editor: error after possible commit must freeze writes");
assert.equal(frozen.catalog,false,"editor: no cached catalogue authority after ambiguous write");
assert.equal(frozen.lessons,false,"editor: no cached lesson authority after ambiguous write");
assert.ok(ids.every(k=>elements[k].disabled),"editor: every write/publish/delete control disabled");
assert.equal(elements["catalog-recovery"].hidden,false,"editor: manual reconciliation must be visible");
assert.equal(elements["retry-catalog"].disabled,false,"editor: manual fresh read must remain possible");
assert.match(statusMessage,/Não repita a operação/,"editor: warn against replaying ambiguous POST");
for(const op of ["course-form","lesson-form","delete-course","delete-lesson","publish","unpublish"]){
  assert.ok((adminRecoveryUI.match(/catch\(error\)\{freezeUncertainEditorialWrite\(\);\}/g)||[]).length>=6,
    "all six editorial writes must call freeze on a failed response");
}
assert.match(adminRecoveryUI,/if\(state\.writeOutcomeUnknown&&!confirm\(/,"editor: fresh read must warn before replacing drafts");
assert.match(adminRecoveryUI,/state\.writeOutcomeUnknown=false;/,"editor: clear unknown only after a successful fresh catalogue+lessons read");
console.log("PASS ambiguous editorial mutation: no automatic replay; manual revalidation with warning");




assert.ok(studentProgressUI.includes('if(receipt?.completed!==true)throw new Error('),"student: completion requires explicit server acknowledgment");
assert.ok(studentProgressUI.includes('const verified=await api("/lessons/"+encodeURIComponent(String(id))+"/progress")'),"student: uncertain completion must be reconciled via authoritative GET");
assert.ok(studentProgressUI.includes('if(verified?.completed===true)'),"student: committed-but-lost response is confirmed");
assert.ok(studentProgressUI.includes('}else if(verified?.completed===false){'),"student: retry only after verified not completed");
assert.ok(studentProgressUI.includes('action.disabled=true;\n          say("Não foi possível confirmar o resultado.'),"student: unverified completion outcome forbids blind replay");
assert.ok(studentProgressUI.includes('if(state.accessDenied||state.lessonRequest!==request||state.lessonId!==id)return;'),"student: reconciliation cannot bypass revoked or stale lesson context");
console.log("PASS completion uncertainty: GET reconciliation before any repeated POST");






// C-110: execute the actual response normalizers and read/recovery flows.
// These assertions supplement the real Chromium suite; no auth is simulated
// by replacing production providers and no HTTP request leaves this process.
const studentFunction=name=>{
  const source=studentProgressUI.match(new RegExp("(?:async )?function "+name+"\\([^\\n]*\\)\\{[\\s\\S]*?\\n\\}"))?.[0];
  assert.ok(source,"student function missing: "+name);return source;
};
const studentNormalizers=["studentRecord","studentText","studentSlug","validatedStudentCourses",
  "validatedStudentLessons","validatedStudentLesson","validatedStudentProgress"].map(studentFunction).join("\n");
const studentParsers=new Script(studentNormalizers+"\n({validatedStudentCourses,validatedStudentLessons,validatedStudentLesson,validatedStudentProgress,studentText})")
  .runInNewContext({});
const studentCourse={id:1,slug:"curso-ficticio",title:"Curso fictício",category:"metodologia",
  summary:"Resumo fictício",lessons_total:2,lessons_completed:0};
const studentRow={id:11,slug:"aula-ficticia",title:"Aula fictícia",sort_order:0,completed:0};
const studentDetail={id:11,slug:"aula-ficticia",title:"Aula fictícia",body:"Corpo fictício para verificação.",
  sort_order:0,course_id:1,course_version:1};
const {validatedStudentCourses:parseStudentCourses,validatedStudentLessons:parseStudentRows,
  validatedStudentLesson:parseStudentDetail,validatedStudentProgress:parseStudentProgress}=studentParsers;
assert.equal(JSON.stringify(parseStudentCourses({courses:[{...studentCourse,private_identity:"excluded",version_id:4}]})),
  JSON.stringify([studentCourse]),"student catalogue retains only allowed fields");
assert.equal(JSON.stringify(parseStudentRows({lessons:[{...studentRow,subject_key:"excluded"}]})),
  JSON.stringify([studentRow]),"student lesson list retains only allowed fields");
assert.equal(JSON.stringify(parseStudentDetail({lesson:{...studentDetail,subject_key:"excluded"}},11,1)),
  JSON.stringify(studentDetail),"student detail retains only allowed fields");
assert.equal(JSON.stringify(parseStudentCourses({courses:[]})),"[]","verified empty catalogue remains empty");
assert.equal(JSON.stringify(parseStudentRows({lessons:[]})),"[]","verified empty lesson list remains empty");
for(const payload of [{},{courses:null},{courses:[studentCourse,{...studentCourse,slug:"different"}]},
  {courses:[studentCourse,{...studentCourse,id:2}]},{courses:[{...studentCourse,id:"1"}]},
  {courses:[{...studentCourse,lessons_completed:3}]},{courses:[{...studentCourse,lessons_total:"2"}]},
  {courses:[{...studentCourse,category:"unknown"}]},
  {courses:[{...studentCourse,lessons_total:Number.MAX_SAFE_INTEGER},{...studentCourse,id:2,slug:"second"}]}]){
  assert.equal(parseStudentCourses(payload),null,"invalid student catalogue rejected as a whole");
}
for(const payload of [{},{lessons:null},{lessons:[studentRow,{...studentRow,slug:"different"}]},
  {lessons:[studentRow,{...studentRow,id:12}]},{lessons:[{...studentRow,completed:"false"}]},
  {lessons:[{...studentRow,completed:false}]},{lessons:[{...studentRow,sort_order:-1}]}]){
  assert.equal(parseStudentRows(payload),null,"invalid student lesson list rejected as a whole");
}
assert.equal(parseStudentCourses({courses:Array.from({length:5001},(_,index)=>({
  ...studentCourse,id:index+1,slug:"course-"+index}))}).length,5001,
  "catalogue accepts backend-authorized lists without inventing a record limit");
assert.equal(parseStudentRows({lessons:Array.from({length:5001},(_,index)=>({
  ...studentRow,id:index+1,slug:"lesson-"+index}))}).length,5001,
  "lessons accept backend-authorized lists without inventing a record limit");
for(const payload of [{},{completed:"false"},{completed:0},{completed:1},{completed:null},[]]){
  assert.equal(parseStudentProgress(payload),null,"individual progress requires a boolean");
}
assert.equal(parseStudentProgress({completed:false}).completed,false,"pending boolean preserved");
assert.equal(parseStudentProgress({completed:true,subject_key:"excluded"}).completed,true,"completed boolean preserved");
assert.equal(Object.keys(parseStudentProgress({completed:true,subject_key:"excluded"})).join(","),"completed");
for(const payload of [{},{lesson:null},{lesson:{...studentDetail,id:12}},
  {lesson:{...studentDetail,course_id:2}},{lesson:{...studentDetail,body:42}},
  {lesson:{...studentDetail,course_version:0}}]){
  assert.equal(parseStudentDetail(payload,11,1),null,"wrong or malformed detail cannot render for another lesson");
}
assert.ok(parseStudentCourses({courses:[{...studentCourse,title:"😀".repeat(200),summary:"😀".repeat(500)}]}),
  "valid Unicode titles and summaries use Laravel character limits");
assert.equal(parseStudentCourses({courses:[{...studentCourse,title:"😀".repeat(201)}]}),null);
assert.ok(parseStudentDetail({lesson:{...studentDetail,body:"😀".repeat(30000)}},11,1),
  "valid astral body is not rejected by UTF-16 length");
assert.equal(parseStudentDetail({lesson:{...studentDetail,body:"😀".repeat(30001)}},11,1),null);
const unicodeSections=new Script(studentFunction("splitLessonSections")+"\nsplitLessonSections(body)")
  .runInNewContext({body:"😀".repeat(30000)});
assert.equal(Array.from(unicodeSections[0].text).length,30000,"renderer does not halve valid astral body");

function studentTestNode(tag,text,className){
  return {tag,textContent:text??"",className:className??"",children:[],events:{},dataset:{},
    hidden:false,disabled:false,append(...nodes){this.children.push(...nodes);},
    replaceChildren(...nodes){this.children=nodes;},setAttribute(){},querySelectorAll(){return[];},
    addEventListener(event,callback){this.events[event]=callback;}};
}
function studentFlowFixture(){
  const nodes=new Map();
  const get=id=>{if(!nodes.has(id)){const node=studentTestNode("div");node.disabled=true;nodes.set(id,node);}return nodes.get(id);};
  const state={courses:[{...studentCourse}],filter:"todos",query:"",courseId:1,lessonId:null,courseRequest:0,lessonRequest:0,
    searchRequest:0,accessDenied:false,libraryLoading:false,libraryReady:true,exportLoading:false,
    favoriteIds:[],favoritesReady:false,favoritesLoading:false,favoritesRequest:0,favoriteWriting:false,
    favoriteOutcomeUnknown:false,favoritesOnly:false,favoritesMessage:""};
  const content=studentTestNode("article"),lessonsBox=studentTestNode("div"),list=studentTestNode("div");
  const messages=[],marks=[],calls=[];
  const filters=["todos","metodologia"].map(filter=>{const node=studentTestNode("button");node.dataset.filter=filter;return node;});
  const context={state,content,lessonsBox,list,overall:studentTestNode("p"),document:{getElementById:get,querySelectorAll:selector=>selector==="[data-filter]"?filters:[]},
    el:studentTestNode,lessonTextFragment:body=>studentTestNode("div",body),lessonHelpPanel:()=>studentTestNode("section"),renderCourses:()=>{},renderSimulator:()=>{},renderFavoriteControls:()=>{},loadFavorites:async()=>false,
    markLessonStatus:(id,completed)=>marks.push({id,completed}),offerNextLesson:()=>{},say:message=>messages.push(message)};
  return {state,content,lessonsBox,list,get,filters,messages,marks,calls,context};
}
for(const initial of [{},{ready:false},{ready:"true"}]){
  const fixture=studentFlowFixture();
  fixture.context.api=async(path,options={})=>{fixture.calls.push({path,method:options.method??"GET"});return path==="/initialize"?initial:{courses:[studentCourse]};};
  const load=new Script(studentNormalizers+"\n"+studentFunction("loadLibrary")+"\nloadLibrary")
    .runInNewContext(fixture.context);
  await load();
  assert.equal(fixture.calls.length,1,"invalid ready never causes a catalogue read or automatic replay");
  assert.equal(fixture.get("library-recovery").hidden,false,"invalid ready exposes manual recovery");
  assert.equal(fixture.get("lesson-search-query").disabled,true);
  assert.equal(fixture.get("export-progress").disabled,true);
}
{
  const fixture=studentFlowFixture();let fail=true;
  fixture.context.api=async path=>path==="/initialize"?{ready:true}:fail?{courses:null}:{courses:[studentCourse]};
  fixture.context.renderPillars=()=>{};
  fixture.context.coursesFiltered=()=>fixture.state.courses;
  fixture.context.labels={metodologia:"Metodologia"};
  const filterEvents=studentProgressUI.match(/document\.getElementById\("course-search"\)\.addEventListener\("input",event=>\{[\s\S]*?\n\/\/ Recovery/)?.[0].replace(/\n\/\/ Recovery$/,"");
  assert.ok(filterEvents,"actual course filter handlers must be available");
  const flow=new Script(studentNormalizers+"\n"+
    ["progressLabel","nextPendingCourseId","renderCourses","loadLibrary"].map(studentFunction).join("\n")+
    "\n"+filterEvents+"\n({loadLibrary,renderCourses})").runInNewContext(fixture.context);
  await flow.loadLibrary();assert.equal(fixture.get("library-recovery").hidden,false);
  assert.equal(fixture.state.courses.length,0,"invalid catalogue has no partial courses");
  assert.equal(fixture.state.libraryReady,false,"invalid catalogue cannot grant ready state");
  const unavailable=fixture.context.overall.textContent;
  fixture.get("course-search").events.input({target:{value:"ignored"}});
  fixture.filters[1].events.click();
  flow.renderCourses();
  assert.equal(fixture.context.overall.textContent,unavailable,"filters cannot turn unavailable data into a valid empty state");
  assert.equal(fixture.get("export-progress").disabled,true,"filters cannot unlock export after invalid catalogue");
  assert.equal(fixture.get("course-search").disabled,true,"course search stays disabled after failure");
  assert.ok(fixture.filters.every(button=>button.disabled),"category filters stay disabled after failure");
  assert.equal(fixture.state.query,"");assert.equal(fixture.state.filter,"todos");
  fail=false;await flow.loadLibrary();assert.equal(fixture.get("library-recovery").hidden,true);
  assert.equal(fixture.state.courses.length,1,"manual recovery accepts later valid catalogue");
  assert.equal(fixture.state.libraryReady,true,"only a verified catalogue grants ready state");
  assert.equal(fixture.get("course-search").disabled,false);
  assert.equal(fixture.get("export-progress").disabled,false);
  assert.ok(fixture.filters.every(button=>!button.disabled));
}
for(const payload of [{},{lessons:null},{lessons:[studentRow,{...studentRow,slug:"another"}]},
  {lessons:[{...studentRow,completed:"false"}]}]){
  const fixture=studentFlowFixture();let fail=true;
  fixture.context.api=async(path,options={})=>{fixture.calls.push({path,method:options.method??"GET"});
    return fail?payload:{lessons:[studentRow]};};
  const opened=[];fixture.context.selectLesson=async id=>opened.push(id);
  const select=new Script(studentNormalizers+"\n"+studentFunction("selectCourse")+"\nselectCourse").runInNewContext(fixture.context);
  await select(1,11);
  assert.equal(fixture.lessonsBox.children.length,0,"malformed list never renders partial rows");
  assert.equal(opened.length,0,"malformed list never selects a lesson");
  assert.ok(fixture.content.children.some(node=>node.className.includes("lesson-retry")));
  fail=false;await select(1,11);
  assert.deepEqual(opened,[11],"valid recovery preserves the exact selected lesson");
  assert.equal(fixture.calls.filter(call=>call.method==="POST").length,0);
}
for(const [lesson,progress] of [[studentDetail,{}],[studentDetail,{completed:"false"}],
  [{...studentDetail,id:12},{completed:false}],[{...studentDetail,course_id:2},{completed:false}]]){
  const fixture=studentFlowFixture();let fail=true;
  fixture.context.api=async(path,options={})=>{fixture.calls.push({path,method:options.method??"GET"});
    return path.endsWith("/progress")?(fail?progress:{completed:false}):{lesson:fail?lesson:studentDetail};};
  const select=new Script(studentNormalizers+"\n"+studentFunction("selectLesson")+"\nselectLesson").runInNewContext(fixture.context);
  await select(11);
  assert.equal(fixture.content.children.some(n=>n.tag==="h3"),false,"invalid detail/progress never renders a partial lesson");
  assert.equal(fixture.content.children.some(n=>n.className==="primary"),false,"invalid reads never enable completion");
  assert.equal(fixture.marks.length,0,"invalid progress does not mark local completion");
  const retry=fixture.content.children.find(n=>n.className.includes("lesson-detail-retry"));assert.ok(retry);
  fail=false;await select(11);
  assert.ok(fixture.content.children.some(n=>n.tag==="h3"),"later valid read recovers the lesson");
  assert.equal(fixture.calls.filter(x=>x.method==="POST").length,0,"read recovery never writes completion");
}
{
  const fixture=studentFlowFixture();
  fixture.context.api=async(path,options={})=>{fixture.calls.push({path,method:options.method??"GET"});
    if(options.method==="POST")return{completed:true};
    if(path==="/courses")return{courses:null};
    return path.endsWith("/progress")?{completed:false}:{lesson:studentDetail};};
  const select=new Script(studentNormalizers+"\n"+studentFunction("selectLesson")+"\nselectLesson").runInNewContext(fixture.context);
  await select(11);const action=fixture.content.children.find(n=>n.className==="primary");await action.events.click();
  assert.equal(action.disabled,true,"confirmed completion remains closed after a catalogue failure");
  assert.equal(action.textContent,"✓ Aula concluída");
  assert.equal(fixture.calls.filter(x=>x.method==="POST").length,1,"catalogue failure never replays completion");
  assert.equal(fixture.state.courses.length,1,"invalid refresh cannot replace known catalogue with false empty success");
  assert.ok(fixture.messages.at(-1).includes("Aula concluída. Atualize"));
}
{
  const fixture=studentFlowFixture();let resolveOld;
  fixture.context.api=async(path,options={})=>{
    fixture.calls.push({path,method:options.method??"GET"});
    if(path==="/lessons/11")return new Promise(resolve=>{resolveOld=resolve;});
    if(path.endsWith("/progress"))return{completed:false};
    return{lesson:{...studentDetail,id:12,slug:"second-lesson",title:"Segunda aula"}};
  };
  const select=new Script(studentNormalizers+"\n"+studentFunction("selectLesson")+"\nselectLesson").runInNewContext(fixture.context);
  const old=select(11);await select(12);
  resolveOld({lesson:{...studentDetail,id:99}});await old;
  assert.equal(fixture.content.children.find(node=>node.tag==="h3").textContent,"Segunda aula",
    "malformed late response cannot replace a newer valid lesson or show its retry");
  assert.equal(fixture.content.children.some(node=>node.className.includes("lesson-detail-retry")),false);
  assert.equal(fixture.marks.length,1,"old response cannot mutate lesson progress");
  assert.equal(fixture.calls.filter(call=>call.method==="POST").length,0);
}
console.log("PASS student response integrity: validated catalogue, lists, exact lesson, boolean progress, Unicode, recovery and no replay");

const manifest = JSON.parse(read("content/mvp-cursos-v1.json"));
assert.equal(manifest.schema_version, 1);
assert.equal(manifest.status, "editorial_draft", "não publicar automaticamente");
assert.ok(Array.isArray(manifest.courses));
assert.ok(manifest.courses.length > 0 && manifest.courses.length <= 20);
const courseSlugs = new Set();
let lessonCount = 0;
for (const course of manifest.courses) {
  assert.ok(["metodologia", "negocios", "sistemas"].includes(course.category));
  assert.match(course.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(!courseSlugs.has(course.slug), "slug de curso repetido");
  courseSlugs.add(course.slug);
  assert.ok(course.title?.trim() && course.summary?.trim());
  assert.ok(Array.isArray(course.lessons) && course.lessons.length > 0);
  const lessonSlugs = new Set();
  for (const lesson of course.lessons) {
    assert.match(lesson.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(!lessonSlugs.has(lesson.slug), "slug de aula repetido");
    lessonSlugs.add(lesson.slug);
    assert.ok(lesson.title?.trim() && lesson.body?.trim());
    lessonCount++;
  }
}
console.log("PASS catalog: " + manifest.courses.length + " cursos em rascunho e " + lessonCount + " aulas únicas");

const trackCourses=manifest.courses.filter(c=>c.slug.startsWith("trilha-"));
assert.equal(trackCourses.length,6,"trilha aprovada: seis cursos");
assert.equal(trackCourses.reduce((n,c)=>n+c.lessons.length,0),24,"trilha aprovada: vinte e quatro aulas");
for(const course of trackCourses){
  assert.equal(course.lessons.length,4,"cada curso da trilha tem 4 aulas: "+course.slug);
  for(const lesson of course.lessons){
    assert.ok(lesson.body.length>=750,"roteiro editorial incompleto: "+lesson.slug);
    assert.match(lesson.body,/EXEMPLO FICTÍCIO\n[\s\S]+APLICAÇÃO OPCIONAL\n[\s\S]+CUIDADO IMPORTANTE\n/,"estrutura do microcurso: "+lesson.slug);
    assert.doesNotMatch(lesson.body,/https?:\/\/\S+/,"não incluir links externos em conteúdo editorial sintético");
  }
}
console.log("PASS 6 trilhas / 24 microaulas com caso fictício, prática e salvaguarda");


const searchBackend=read("app/Domain/Learning/UniversityCatalogRepository.php");
const searchController=read("app/Http/Controllers/UniversityController.php");
const searchRoutes=read("routes/web.php");
assert.match(searchRoutes,/Route::post\('\/search',[^\n]+\n\s+->middleware\('throttle:20,1'\)/,
  "private lesson search must be a rate-limited VIEW POST");
assert.match(searchBackend,/function searchPublishedLessons\(PortalGrant \$grant, string \$query\)/,
  "search must derive tenant from verified Portal grant");
for(const fence of [
  "where('c.educational_organization_id', $editorialOrg)",
  "where('c.is_shared', true)",
  "where('c.is_published', true)",
  "where('v.status', 'published')",
  "where('l.is_published', true)"
])assert.ok(searchBackend.includes(fence),"search must hide draft/archived material: "+fence);
assert.match(searchBackend,/->limit\(9\)/,"server search must be bounded");
assert.match(searchBackend,/preg_match\('\/\\A\[\\p\{L\}/,
  "reject wildcard and control characters, accept literal Unicode terms");
assert.match(searchController,/function searchLessons\(Request \$request, PortalAccessGate \$gate\)/,
  "controller must verify live Portal authority");
assert.match(searchController,/if \(\$this->freshGrant\(\$request, \$gate, \$grant\) === null\)/,
  "search results cannot be emitted after grant revocation");
assert.match(studentProgressUI,/id="lesson-search-form"/,"student must expose private lesson search");
assert.match(studentProgressUI,/function validLessonSearchResults\(payload\)/,"student must check result shape");
assert.match(studentProgressUI,/api\("\/search",\{method:"POST",body:\{query:phrase\}\}\)/,
  "student must never place search terms in query URL");
assert.match(studentProgressUI,/if\(!state\.accessDenied\)openCourseWithAllFilters\(hit\.course_id,hit\.lesson_id\)/,
  "result must open an authorized selected lesson");
assert.match(studentProgressUI,/document\.getElementById\("lesson-search-results"\)\.replaceChildren\(\)/,
  "search results must be purged on Portal denial");
console.log("PASS private lesson search: 8-hit bounded, published-only, CSRF, tenant, revocation and no external AI");

await import("./check-publication-response.mjs");
await import("./check-student-help.mjs");
await import("./check-student-favorites.mjs");
await import("./check-student-favorites-export.mjs");
await import("./check-editor-draft-preservation.mjs");
await import("./check-editorial-overview.mjs");
console.log("PASS: contrato estático de UI, rotas e conteúdo. Não é teste de runtime ou homologação.");
