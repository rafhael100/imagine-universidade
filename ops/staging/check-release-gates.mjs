#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateReleaseManifest} from "./release-gate-policy.mjs";

const read = path => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const manifest = JSON.parse(read("ops/release-gates.json"));
const pending = validateReleaseManifest(manifest);

// ERD-R52: check the active provider binding rather than accepting a string
// that exists only in a commented-out line. Also reject duplicate registrations
// for the same Portal or Tutor interface. This is a STATIC synthetic preflight,
// not a substitute for an authenticated Portal #886 integration test.
function requireDenyAllBindings(source) {
  const active = source.replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/^\s*(?:\/\/|#).*$/gmu, "");
  for (const [contract, safeProvider] of [
    ["PortalAuthority", "UnavailablePortalAuthority"],
    ["TutorGateway", "DisabledTutorGateway"],
  ]) {
    const pattern = new RegExp(
      String.raw`->(?:bind|singleton|scoped|instance)\s*\(\s*${contract}::class\s*,\s*([^)]*)\)`, "gu"
    );
    const matches = [...active.matchAll(pattern)];
    assert.equal(matches.length, 1,
      contract + " must have exactly one explicit active default binding");
    assert.equal(matches[0][1].trim(), safeProvider + "::class",
      contract + " must default to " + safeProvider);
  }
}
const bindings = read("app/Providers/AppServiceProvider.php");
requireDenyAllBindings(bindings);

const portalBinding = "$this->app->bind(PortalAuthority::class, UnavailablePortalAuthority::class);";
assert.ok(bindings.includes(portalBinding), "Known production deny-all binding fixture changed");
assert.throws(() => requireDenyAllBindings(bindings.replace(portalBinding, "// " + portalBinding)),
  /PortalAuthority must have exactly one/u, "Commented-out deny-all binding must fail");
assert.throws(() => requireDenyAllBindings(bindings.replace(portalBinding,
  "$this->app->bind(PortalAuthority::class, PortalAuthority::class);")),
  /PortalAuthority must default/u, "Unexpected authority binding must fail");
assert.throws(() => requireDenyAllBindings(bindings + "\n" +
  "$this->app->singleton(PortalAuthority::class, PortalAuthority::class);"),
  /PortalAuthority must have exactly one/u, "Duplicate potentially overriding binding must fail");
const routes = read("routes/web.php");
assert.doesNotMatch(routes, /Route::(?:get|post)\(\s*['"]\/?(?:login|sso|oauth|callback)\b/i,
  "do not create unaudited public identity routes");
console.log("PASS: HOLD_NO_GO; " + pending + " of 13 independent gates pending.");
console.log("PASS: Portal/Tutor deny-all default bindings and three negative mutation fixtures.");
console.log("Synthetic CI is never authorization to merge, deploy or bill real customers.");
