#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateReleaseManifest, requiredReleaseGates} from "../ops/staging/release-gate-policy.mjs";

const base = JSON.parse(readFileSync(new URL("../ops/release-gates.json", import.meta.url), "utf8"));
const copy = () => structuredClone(base);
let scenarios = 0;
function rejected(name, transform) {
  const data = copy();
  transform(data);
  assert.throws(() => validateReleaseManifest(data), undefined, name);
  scenarios++;
}
function accepted(name, transform = () => {}) {
  const data = copy();
  transform(data);
  assert.equal(validateReleaseManifest(data),
    requiredReleaseGates.filter(key => data.blocking_evidence[key].status !== "VERIFIED").length,
    name);
  scenarios++;
}
accepted("current deny-all manifest");
rejected("missing gate", m => { delete m.blocking_evidence.dba_independent_review; });
rejected("replacement fake gate", m => {
  delete m.blocking_evidence.lgpd_independent_review;
  m.blocking_evidence.fake_gate = {status:"NOT_VERIFIED", evidence_ref:null};
});
rejected("extra fake gate", m => {
  m.blocking_evidence.fake_gate = {status:"NOT_VERIFIED", evidence_ref:null};
});
rejected("unknown status", m => { m.blocking_evidence.appsec_independent_review.status = "PASSED"; });
rejected("unverified gate with evidence", m => {
  m.blocking_evidence.appsec_independent_review.evidence_ref = "https://github.com/rafhael100/imagine-universidade/issues/1";
});
rejected("verified without evidence", m => {
  m.blocking_evidence.appsec_independent_review.status = "VERIFIED";
});
rejected("evidence from external owner", m => {
  Object.assign(m.blocking_evidence.appsec_independent_review, {
    status:"VERIFIED", evidence_ref:"https://github.com/external/repo/issues/1"
  });
});
accepted("verified non-critical gate with traceable reference", m => {
  Object.assign(m.blocking_evidence.appsec_independent_review, {
    status:"VERIFIED", evidence_ref:"https://github.com/rafhael100/imagine-universidade/issues/1"
  });
});
rejected("unverified official contract gate may not be advanced by JSON", m => {
  Object.assign(m.blocking_evidence.portal_official_active_services, {
    status:"VERIFIED", evidence_ref:"https://github.com/rafhael100/imagine-portal/issues/886"
  });
});
rejected("production approval requires explicit separate process", m => {
  Object.assign(m.blocking_evidence.production_deployment_approval, {
    status:"VERIFIED", evidence_ref:"https://github.com/rafhael100/imagine-universidade/issues/1"
  });
});
rejected("release decision changed to go", m => { m.release_decision = "GO"; });
rejected("incorrect project identifier", m => { m.project = "Other"; });
rejected("gate array instead of object", m => { m.blocking_evidence = []; });
rejected("unknown gate property", m => { m.blocking_evidence.dba_independent_review.approved_by = "ci"; });
assert.equal(scenarios, 15);
console.log("PASS release-gate policy: " + scenarios + " positive/negative scenarios; no operational release authorized.");
