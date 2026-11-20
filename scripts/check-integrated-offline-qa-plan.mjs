#!/usr/bin/env node
/** UNI ERD-R212: prove that suite and release gates fail on omitted evidence. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {groups,verifyOfflineSuitePlan,verifyNoGoState}
  from "./check-integrated-offline-qa.mjs";

assert.equal(verifyOfflineSuitePlan(groups),21);
const gates=JSON.parse(readFileSync(
  new URL("../ops/release-gates.json",import.meta.url),"utf8"));
assert.equal(verifyNoGoState(gates),13);
let negatives=0;
const rejectPlan=(label,mutate)=>{
  const candidate=structuredClone(groups);
  mutate(candidate);
  assert.throws(()=>verifyOfflineSuitePlan(candidate),undefined,label);
  negatives++;
};
rejectPlan("missing Portal check",p=>p[2].scripts.pop());
rejectPlan("missing gate check",p=>p[3].scripts.pop());
rejectPlan("duplicate checks",p=>p[0].scripts.push(p[0].scripts[0]));
rejectPlan("unrecognized network command",p=>p[0].scripts[0]="curl https://example.test");
rejectPlan("cross-repository path",p=>p[0].scripts[0]="../external/untrusted.mjs");
rejectPlan("missing human review group",p=>p.shift());
const rejectGate=(label,mutate)=>{
  const candidate=structuredClone(gates);
  mutate(candidate);
  assert.throws(()=>verifyNoGoState(candidate),undefined,label);
  negatives++;
};
rejectGate("falsified GO",g=>g.release_decision="GO");
rejectGate("falsified gate",g=>Object.values(g.blocking_evidence)[0].status="VERIFIED");
rejectGate("unsupported evidence",g=>Object.values(g.blocking_evidence)[0].evidence_ref="synthetic-test");
rejectGate("missing gate",g=>delete g.blocking_evidence.production_deployment_approval);
rejectGate("wrong authority issue",g=>g.source_issue="https://example.test/fake");
assert.equal(negatives,11);
console.log("PASS UNI R212: 21 integrated checks / 13 blocked gates; "+
  negatives+" rejected omitted, forged and cross-repository QA/gate mutations.");
