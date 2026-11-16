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

const progress = section(repository, "public function complete(", "private function audit(");
const publish = section(repository, "public function setPublished(", null);
const edit = section(repository, "public function updateCourse(", "public function addLesson(");
assert.match(repository, /private function freshWriteGrantMatches\(/);
assert.match(repository, /if \(\$verifyFreshGrant === null \|\| !\$this->grantUsable\(\$expected, \$permission\)\)/);
assert.match(repository, /\$latest->companyId === \$expected->companyId/);
assert.match(repository, /\$latest->subjectId === \$expected->subjectId/);
assert.match(repository, /\$latest->revision === \$expected->revision/);
assert.match(progress, /DB::transaction\(function \(\) use \([^)]*\$verifyFreshGrant/);
assert.match(progress, /freshWriteGrantMatches\(\$grant, PortalAccessGate::VIEW, \$verifyFreshGrant\)/);
assert.match(progress, /freshWriteGrantMatches[\s\S]*?insertOrIgnore\(/);
assert.match(publish, /DB::transaction\(function \(\) use \([^)]*\$verifyFreshGrant/);
assert.match(publish, /freshWriteGrantMatches\(\$grant, PortalAccessGate::MANAGE, \$verifyFreshGrant\)/);
assert.match(publish, /freshWriteGrantMatches[\s\S]*?->update\(/);
assert.doesNotMatch(edit, /\$verifyFreshGrant/,
  "course editing cannot reference an unbound callback");
const studentController = section(controller, "public function complete(", "public function adminAudit(");
const publicationController = section(controller, "public function publish(", null);
assert.match(studentController, /PortalAccessGate \$gate/);
assert.match(studentController, /\$this->freshGrant\(\$request, \$gate, \$grant\)/);
assert.equal((publicationController.match(/\$this->freshGrant\(\$request, \$gate, \$grant\)/g) || []).length, 2,
  "publish and unpublish must reconsult Portal");
assert.match(bindings, /bind\(PortalAuthority::class, UnavailablePortalAuthority::class\)/);
for (const test of [
  "test_last_service_revoked_during_completion_lookup_does_not_commit_progress",
  "test_progress_write_checks_exact_subject_tenant_permission_and_revision_again",
  "test_editor_revoked_during_unpublish_read_does_not_change_published_course",
  "test_direct_publication_without_live_portal_fence_is_denied",
]) assert.ok(feature.includes(test), "missing regression: " + test);
console.log("PASS: write fences wired for progress, publication and removal; original editor method unaffected.");
