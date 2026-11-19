#!/usr/bin/env node
/** Read-only checksum verification of a generated offline editorial package.
 * UNSIGNED hashes detect corruption, not provenance or human authorization.
 * Usage: --dir /package [--source /versioned/content/mvp-cursos-v1.json]
 */
import assert from "node:assert/strict";
import {verifyEditorialPackage,verifyEditorialSourceBinding} from "./editorial-package-integrity.mjs";
assert.ok(process.argv.length===4||process.argv.length===6,
  "Usage: --dir <offline package> [--source <versioned original>]");
assert.equal(process.argv[2],"--dir","Pass --dir explicitly");
assert.ok(process.argv[3].trim()!=="","Empty package directory");
if(process.argv.length===6){
  assert.equal(process.argv[4],"--source","Pass --source explicitly");
  assert.ok(process.argv[5].trim()!=="","Empty source file");
}
const result=process.argv.length===6
  ?await verifyEditorialSourceBinding(process.argv[3],process.argv[5])
  :await verifyEditorialPackage(process.argv[3]);
console.log("PASS UNSIGNED integrity: "+result.files.length+
  " files match"+(process.argv.length===6?" versioned source":"")+
  "; HOLD_NO_GO; NO HUMAN SIGNOFF/PORTAL GRANT.");
