#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const d=JSON.parse(readFileSync(new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
assert.equal(d.status,"editorial_draft");
assert.equal(d.audience,"authorized_imagine_clients_only");
assert.equal(d.courses.length,10);
let total=0;
for(const c of d.courses){
  for(const l of c.lessons){
    total++;
    assert.ok(l.body.trim().split(/\s+/).length>=95,"short lesson: "+l.slug);
    for(const k of ["EXEMPLO FICTÍCIO","APLICAÇÃO OPCIONAL","CUIDADO IMPORTANTE"]){
      assert.ok(l.body.includes("\n\n"+k+"\n"),"section missing: "+l.slug+" / "+k);
    }
    assert.doesNotMatch(l.body,/<script|<\/|javascript:/i);
  }
}
assert.equal(total,35);
console.log("PASS 35 practical lessons: >=95 words and example, optional practice and caution.");
