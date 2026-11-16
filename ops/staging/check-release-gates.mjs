#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const manifest=JSON.parse(read("ops/release-gates.json"));
assert.equal(manifest.schema_version,1);
assert.equal(manifest.release_decision,"HOLD_NO_GO");
const gates=Object.entries(manifest.blocking_evidence);
assert.ok(gates.length>=13,"critical release gates cannot be silently omitted");
for(const [name,gate] of gates){
  assert.match(name,/^[a-z0-9_]+$/);
  assert.ok(["NOT_VERIFIED","VERIFIED"].includes(gate.status),"unknown state: "+name);
  if(gate.status==="VERIFIED"){
    assert.ok(typeof gate.evidence_ref==="string"&&gate.evidence_ref.length>20,
      "independent evidence required for "+name);
  }else{
    assert.equal(gate.evidence_ref,null,"unverified gate must not claim evidence: "+name);
  }
}
assert.ok(gates.some(([name,g])=>name==="portal_official_active_services"&&g.status==="NOT_VERIFIED"),
  "official active contract source remains unverified");
const bindings=read("app/Providers/AppServiceProvider.php");
assert.match(bindings,/bind\(PortalAuthority::class, UnavailablePortalAuthority::class\)/,
  "deny-all Portal provider must remain enabled without proof");
assert.match(bindings,/bind\(TutorGateway::class, DisabledTutorGateway::class\)/,
  "real AI Tutor must remain disabled without approved model manager");
const routes=read("routes/web.php");
assert.doesNotMatch(routes,/Route::(?:get|post)\(\s*['"]\/?(?:login|sso|oauth|callback)\b/i,
  "do not invent public identity routes");
const pending=gates.filter(([,g])=>g.status!=="VERIFIED").length;
console.log("PASS: ReleaseStatus=HOLD_NO_GO; "+pending+" independent approvals/evidence gates still pending.");
console.log("A synthetic green CI must never enable customer sessions, deploy or billing.");
