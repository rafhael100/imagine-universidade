import assert from "node:assert/strict";

export const requiredReleaseGates = Object.freeze([
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
]);

// Structural checks are guardrails, not a substitute for independent evidence review.
export function validateReleaseManifest(manifest) {
  assert.ok(manifest && typeof manifest === "object" && !Array.isArray(manifest),
    "release manifest must be an object");
  assert.equal(manifest.schema_version, 1);
  assert.equal(manifest.project, "Imagine Universidade");
  assert.equal(manifest.release_decision, "HOLD_NO_GO",
    "CI must never make a production release decision");
  assert.ok(manifest.blocking_evidence &&
    typeof manifest.blocking_evidence === "object" &&
    !Array.isArray(manifest.blocking_evidence), "blocking_evidence must be an object");
  assert.deepEqual(Object.keys(manifest.blocking_evidence).sort(),
    [...requiredReleaseGates].sort(),
    "the 13 named gates cannot be replaced, removed or renamed");
  for (const name of requiredReleaseGates) {
    const gate = manifest.blocking_evidence[name];
    assert.ok(gate && typeof gate === "object" && !Array.isArray(gate),
      "invalid gate object: " + name);
    assert.deepEqual(Object.keys(gate).sort(), ["evidence_ref", "status"],
      "unexpected gate fields: " + name);
    assert.ok(["NOT_VERIFIED", "VERIFIED"].includes(gate.status),
      "unknown status: " + name);
    if (gate.status === "VERIFIED") {
      assert.ok(typeof gate.evidence_ref === "string" &&
        /^https:\/\/github\.com\/rafhael100\/[a-z0-9-]+\/(?:issues\/\d+|pull\/\d+|blob\/[^\s]+)$/i.test(gate.evidence_ref),
        "a GitHub evidence link is required: " + name);
    } else {
      assert.equal(gate.evidence_ref, null,
        "unverified gate must not claim evidence: " + name);
    }
  }
  assert.equal(manifest.blocking_evidence.portal_official_active_services.status,
    "NOT_VERIFIED", "official active-services source remains unverified");
  assert.equal(manifest.blocking_evidence.production_deployment_approval.status,
    "NOT_VERIFIED", "production release requires independent approval");
  return requiredReleaseGates.filter(name =>
    manifest.blocking_evidence[name].status !== "VERIFIED").length;
}
