#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateReleaseManifest} from "./release-gate-policy.mjs";

const read = path => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const manifest = JSON.parse(read("ops/release-gates.json"));
const pending = validateReleaseManifest(manifest);

const bindings = read("app/Providers/AppServiceProvider.php");
assert.match(bindings, /bind\(PortalAuthority::class, UnavailablePortalAuthority::class\)/,
  "Portal deny-all binding must remain in place");
assert.match(bindings, /bind\(TutorGateway::class, DisabledTutorGateway::class\)/,
  "AI Tutor must remain disabled until its independent gate is approved");
const routes = read("routes/web.php");
assert.doesNotMatch(routes, /Route::(?:get|post)\(\s*['"]\/?(?:login|sso|oauth|callback)\b/i,
  "do not create unaudited public identity routes");
console.log("PASS: HOLD_NO_GO; " + pending + " of 13 independent gates pending.");
console.log("Synthetic CI is never authorization to merge, deploy or bill real customers.");
