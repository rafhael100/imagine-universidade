#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const repository = read("app/Domain/Learning/UniversityCatalogRepository.php");
const controller = read("app/Http/Controllers/UniversityController.php");
const bindings = read("app/Providers/AppServiceProvider.php");
const feature = read("tests/Feature/PortalBoundaryFlowTest.php");

function section(text, start, end) {
  const first = text.indexOf(start);
  assert.ok(first >= 0, "missing method: " + start);
  const last = end ? text.indexOf(end, first + start.length) : text.length;
  assert.ok(last > first, "missing method boundary: " + end);
  return text.slice(first, last);
}

assert.ok(repository.includes("private function freshWriteGrantMatches("));
for (const field of ["companyId", "subjectId", "permission", "revision"]) {
  assert.ok(repository.includes("$latest->" + field + " === $expected->" + field),
    "live grant must match original " + field);
}
assert.ok(repository.includes("$verifyFreshGrant === null"));
assert.match(bindings, /bind\(PortalAuthority::class, UnavailablePortalAuthority::class\)/);

const writes = [
  ["complete", "audit", "VIEW"],
  ["createCourse", "updateCourse", "MANAGE"],
  ["updateCourse", "addLesson", "MANAGE"],
  ["addLesson", "updateLesson", "MANAGE"],
  ["updateLesson", "deleteDraftLesson", "MANAGE"],
  ["deleteDraftLesson", "deleteNeverPublishedCourse", "MANAGE"],
  ["deleteNeverPublishedCourse", "setPublished", "MANAGE"],
  ["setPublished", null, "MANAGE"],
];
for (const [method, next, capability] of writes) {
  const body = section(repository, "public function " + method + "(",
    next === "audit" ? "private function audit(" : (next ? "public function " + next + "(" : null));
  assert.ok(body.includes("DB::transaction"), "write must be transactional: " + method);
  assert.ok(body.includes("$verifyFreshGrant"), "missing live grant callback: " + method);
  assert.ok(body.includes("freshWriteGrantMatches($grant, PortalAccessGate::" +
    capability + ", $verifyFreshGrant)"), "missing live grant fence: " + method);

  const fence = body.indexOf("freshWriteGrantMatches(");
  const mutation = Math.min(...["->insertGetId(", "->insert(", "->update(", "->delete(", "->insertOrIgnore("]
    .map(x => body.indexOf(x)).filter(x => x >= 0));
  assert.ok(Number.isFinite(mutation) && fence >= 0 && fence < mutation,
    "authority must be checked before first mutation: " + method);
}

const controllers = [
  ["complete", "adminAudit"],
  ["createCourse", "updateCourse"],
  ["updateCourse", "createLesson"],
  ["createLesson", "updateLesson"],
  ["updateLesson", "deleteDraftLesson"],
  ["deleteDraftLesson", "deleteNeverPublishedCourse"],
  ["deleteNeverPublishedCourse", "publish"],
  ["publish", "unpublish"],
  ["unpublish", null]
];
for (const [method, next] of controllers) {
  const body = section(controller, "public function " + method + "(",
    next ? "public function " + next + "(" : null);
  assert.ok(body.includes("PortalAccessGate $gate"), "missing Gate dependency: " + method);
  assert.ok(body.includes("freshGrant($request, $gate, $grant)"),
    "HTTP controller must refresh the official Portal decision: " + method);
}
for (const regression of [
  "test_last_service_revoked_during_completion_lookup_does_not_commit_progress",
  "test_progress_write_checks_exact_subject_tenant_permission_and_revision_again",
  "test_editor_revoked_during_unpublish_read_does_not_change_published_course",
  "test_direct_publication_without_live_portal_fence_is_denied",
]) {
  assert.ok(feature.includes(regression), "missing negative regression: " + regression);
}
console.log("PASS: all 9 HTTP write paths use transaction-scoped Portal validation, including 2 publish actions.");
