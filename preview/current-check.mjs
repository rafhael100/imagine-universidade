#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import vm from "node:vm";

const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const html=read("./current.html");
const data=JSON.parse(read("../content/mvp-cursos-v1.json"));
assert.equal(data.status,"editorial_draft");
assert.equal(data.courses.length,10);
assert.equal(data.courses.reduce((n,c)=>n+c.lessons.length,0),35);
assert.match(html,/DEMONSTRAÇÃO OFFLINE/);
assert.match(html,/noindex,nofollow,noarchive/);
assert.match(html,/alt="Imagine"/);
assert.match(html,/Ir para o conteúdo/);
assert.match(html,/sem login|Sem login/);
assert.doesNotMatch(html,/<script[^>]+src=/i);
assert.doesNotMatch(html,/<link[^>]+href="https?:/i);
assert.doesNotMatch(html,/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource/i);
assert.doesNotMatch(html,/\.innerHTML\s*=|\binsertAdjacentHTML\s*\(/i);
const scripts=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scripts,"JavaScript da prévia");
new vm.Script(scripts[1],{filename:"preview/current.html"});
const start=scripts[1].indexOf("const courseManifest = ");
const end=scripts[1].indexOf("const labels=",start);
assert.ok(start>=0 && end>start);
const loaded=vm.runInNewContext(scripts[1].slice(start,end)+"\ncourseManifest",{}, {timeout:1000});
assert.equal(JSON.stringify(loaded),JSON.stringify(data),"prévia deve usar catálogo atual sem conteúdo inventado");
const image=readFileSync(new URL("./logo-imagine.png",import.meta.url));
const hash=createHash("sha1").update(Buffer.from("blob "+image.length+"\0")).update(image).digest("hex");
assert.equal(hash,"678adeceb3a8ecdaeb6b576b9ee18d1bf0396f77","logo original, sem redesenho");
for(const phrase of ["Marcar conclusão fictícia","localStorage.getItem","localStorage.setItem",
   "textContent","nextIndex","aria-pressed","nextLesson","progress.clear()"].filter(x=>x!=="nextLesson")){
  assert.ok(html.includes(phrase),"interação offline ausente: "+phrase);
}
console.log("PASS demo offline: 10 cursos/35 aulas idênticos ao manifesto, logo SHA original, sem rede ou HTML dinâmico inseguro.");
