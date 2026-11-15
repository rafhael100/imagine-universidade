#!/usr/bin/env node
// Verificação estática, sem navegador, sem chamadas de rede nem dependências.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
assert.match(html, /<html lang="pt-BR">/);
assert.match(html, /name="robots" content="noindex,nofollow,noarchive"/);
assert.match(html, /Prévia demonstrativa/);
assert.match(html, /Visitas → Leads → Clientes/);
assert.match(html, /Sem provas, notas ou certificados/);
assert.match(html, /aria-modal="true"/);
assert.match(html, /aria-label="Buscar conteúdos"/);
assert.doesNotMatch(html, /<script[^>]+src=/i);
assert.doesNotMatch(html, /<link[^>]+href="https?:\/\//i);
assert.doesNotMatch(html, /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/);

const match = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/);
assert.ok(match, "JavaScript local deve estar presente");
const js = match[1];
new vm.Script(js, { filename: "preview/index.html:script" });
const start = js.indexOf("const catalog = [");
const end = js.indexOf("const labels=", start);
assert.ok(start !== -1 && end > start, "manifesto editorial presente");
const snippet = js.slice(start, end) + "\ncatalog;";
const catalog = vm.runInNewContext(snippet, Object.create(null), {timeout:1000});

assert.equal(catalog.length, 6, "seis cursos demonstrativos");
assert.equal(catalog.reduce((n,c)=>n+c.lessons.length,0), 14, "quatorze microaulas");
assert.equal(new Set(catalog.map(c=>c.id)).size, catalog.length);
assert.equal([...new Set(catalog.map(c=>c.area))].sort().join("|"), "metodologia|negocios|sistemas");
for (const c of catalog) {
  for (const key of ["id","area","name","description","icon"]) assert.ok(typeof c[key]==="string" && c[key].length>0);
  assert.ok(c.lessons.length>0);
  for (const l of c.lessons) {
    for (const key of ["title","text","time","task"]) assert.ok(typeof l[key]==="string" && l[key].length>0, c.id+" aula "+key);
  }
}
// Validar o elo local entre admin publicado e biblioteca, sem browser ou servidor.
const preState = js.slice(start, js.indexOf("const state=", end));
const demoAdmin = [
  {id:"demo-published",title:"Curso publicado",category:"sistemas",summary:"Aula fictícia",published:true,
   lessons:[{title:"Aula segura",body:"Conteúdo demonstrativo."}]},
  {id:"demo-hidden",title:"Curso rascunho",category:"sistemas",summary:"Não aparecerá",published:false,
   lessons:[{title:"Outra aula",body:"Conteúdo demonstrativo."}]}
];
const evaluation = '({demoCount:catalog.filter(c=>c.id.startsWith("admin-")).length, publishedName:catalog.find(c=>c.id==="admin-demo-published")?.name, hidden:catalog.some(c=>c.id==="admin-demo-hidden"), escaped:htmlSafe("<img src=x onerror=alert(1)>")})';
const imported = vm.runInNewContext(preState + evaluation, {localStorage:{getItem:()=>JSON.stringify(demoAdmin)}}, {timeout:1000});
assert.equal(imported.demoCount, 1);
assert.equal(imported.publishedName, "Curso publicado");
assert.equal(imported.hidden, false);
assert.equal(imported.escaped, "&lt;img src=x onerror=alert(1)&gt;");
console.log("OK: catálogo sintético, importação do admin e escape de HTML validados estaticamente.");

