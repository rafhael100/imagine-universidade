#!/usr/bin/env node

/**
 * Universidade Imagine: static frontend and routing contract.
 * Node.js 18+. No dependencies, HTTP requests, secrets or server startup.
 * Run: node scripts/check-ui-contract.mjs
 *
 * This protects source-level invariants only. It is NOT an auth or browser test.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const views = [
  ["student", "resources/views/university/student.blade.php", "/universidade/private"],
  ["admin", "resources/views/university/admin.blade.php", "/universidade/private/admin"],
];

for (const [role, path, prefix] of views) {
  const html = read(path);
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, role + ": JavaScript ausente");
  new Script(match[1], { filename: path });

  assert.match(html, /<html lang="pt-BR">/, role + ": idioma");
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
assert.ok(studentProgressUI.includes("if(state.courseRequest===request){say(error.message)"),"aluno: erro antigo de curso ignorado");
assert.ok(studentProgressUI.includes("if(state.lessonRequest===request){say(error.message)"),"aluno: erro antigo de aula ignorado");
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
assert.match(adminUI,/document.querySelectorAll\("\.layout button,.layout input,.layout select,.layout textarea"\)/,"admin: impedir uso de controles após revogação");
console.log("PASS revocation UI: student/admin fail-closed on HTTP 403/419, clear private state");


const lessonsFn=adminUI.match(/async function refreshLessons\(\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(lessonsFn,"admin: função de atualização de aulas");
const pendingLessons=[];
const fakeState={course:{id:1},lessons:[],lesson:null,lessonRequest:0,accessDenied:false};
const fakeContext={
  state:fakeState,
  api:path=>new Promise(resolve=>pendingLessons.push({path,resolve})),
  renderLessons:()=>{},
  resetLesson:()=>{},
  fillCourse:()=>{}
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
assert.match(adminUI,/if\(state.accessDenied\|\|state.course\?\.id!==courseId\)return;/,"admin: revalidar seleção após confirmação");
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
assert.match(studentProgressUI,/function openCourseWithAllFilters\(target\)/,"aluno: caminho comum de transição");
assert.match(studentProgressUI,/if\(state.accessDenied\|\|!Number.isSafeInteger\(target\)\|\|target<1\)return;/,"aluno: transição bloqueada após revogação");
console.log("PASS cross-course resume: próximo curso incompleto, sem voltar ao atual");

const routes = read("routes/web.php");
const provider = read("app/Providers/AppServiceProvider.php");
const middleware = read("app/Http/Middleware/RequireUniversityGrant.php");
assert.match(routes, /university\.grant:view/);
assert.match(routes, /university\.grant:manage/);
assert.match(routes, /Route::view\('\/app', 'university\.student'\)/);
assert.match(routes, /Route::view\('\/app', 'university\.admin'\)/);
assert.match(routes, /Route::fallback/);
assert.match(provider, /UnavailablePortalAuthority::class/, "provider padrão deve negar");
assert.match(middleware, /university\.verified_grant/, "decisão do backend");
assert.match(middleware, /Cache-Control/, "respostas privadas");
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
console.log("PASS: contrato estático de UI, rotas e conteúdo. Não é teste de runtime ou homologação.");
