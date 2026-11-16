#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = path => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const manifest = JSON.parse(read("ops/release-gates.json"));
assert.equal(manifest.schema_version, 1);
assert.equal(manifest.project, "Imagine Universidade");
assert.equal(manifest.release_decision, "HOLD_NO_GO",
  "CI must never make a release authorization decision");

const required = [
  "portal_official_active_services",
  "portal_independent_revocation",
  "portal_business_sso_identity",
  "portal_editorial_staff_authority",
  "tenant_and_resource_authorization",
  "private_s2s_security_and_key_rotation",
  "appsec_independent_review",
  "dba_independent_review",
  "lgpd_independent_review",
  "educational_editorial_signoff",
  "private_vps_staging_functional_homologation",
  "real_backup_restoration_and_rollback",
  "production_deployment_approval"
];
assert.ok(manifest.blocking_evidence && typeof manifest.blocking_evidence === "object" &&
  !Array.isArray(manifest.blocking_evidence), "blocking_evidence must be an object");
assert.deepEqual(Object.keys(manifest.blocking_evidence).sort(), [...required].sort(),
  "required release gates cannot be renamed, removed or replaced by dummy gates");
for (const name of required) {
  const gate = manifest.blocking_evidence[name];
  assert.ok(gate && typeof gate === "object" && !Array.isArray(gate),
    "missing gate object: " + name);
  assert.deepEqual(Object.keys(gate).sort(), ["evidence_ref", "status"],
    "unexpected gate fields: " + name);
  assert.ok(["NOT_VERIFIED", "VERIFIED"].includes(gate.status),
    "unknown status: " + name);
  if (gate.status === "VERIFIED") {
    assert.ok(typeof gate.evidence_ref === "string" &&
      gate.evidence_ref.trim().length > 20 &&
      /^https:\/\/github\.com\/rafhael100\/[a-z0-9-]+\/(?:issues|pull|blob)\/\S+$/i.test(gate.evidence_ref),
      "traceable GitHub review/evidence reference required: " + name);
  } else {
    assert.equal(gate.evidence_ref, null,
      "unverified gate must not claim evidence: " + name);
  }
}
assert.equal(manifest.blocking_evidence.portal_official_active_services.status,
  "NOT_VERIFIED", "official contract authority has no approved operational evidence");
assert.equal(manifest.blocking_evidence.production_deployment_approval.status,
  "NOT_VERIFIED", "production authorization remains an independent human gate");

const bindings = read("app/Providers/AppServiceProvider.php");
assert.match(bindings, /bind\(PortalAuthority::class, UnavailablePortalAuthority::class\)/,
  "deny-all Portal authority must remain bound");
assert.match(bindings, /bind\(TutorGateway::class, DisabledTutorGateway::class\)/,
  "unapproved AI Tutor must remain disabled");
const routes = read("routes/web.php");
assert.doesNotMatch(routes, /Route::(?:get|post)\(\s*['"]\/?(?:login|sso|oauth|callback)\b/i,
  "do not invent public identity routes");
const pending = required.filter(name =>
  manifest.blocking_evidence[name].status !== "VERIFIED").length;
console.log("PASS: HOLD_NO_GO; " + pending + " of 13 release gates pending.");
console.log("No green synthetic CI is an approval for real customer access, merge or deploy.");
