#!/usr/bin/env node
/** Read-only checksum verification of a generated offline editorial package.
 * UNSIGNED hashes detect corruption, not provenance or human authorization.
 * Usage: node scripts/verify-editorial-package-integrity.mjs --dir /path
 */
import assert from "node:assert/strict";
import {verifyEditorialPackage} from "./editorial-package-integrity.mjs";
assert.equal(process.argv.length,4,"Usage: --dir <explicit offline package directory>");
assert.equal(process.argv[2],"--dir","Pass --dir explicitly");
assert.ok(process.argv[3].trim()!=="","Empty package directory");
const result=await verifyEditorialPackage(process.argv[3]);
console.log("PASS UNSIGNED integrity: "+result.files.length+
  " files match; HOLD_NO_GO; NO HUMAN SIGNOFF/PORTAL GRANT.");
