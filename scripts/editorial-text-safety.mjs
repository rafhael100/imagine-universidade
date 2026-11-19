import assert from "node:assert/strict";

// The editorial pack is a human-readable Markdown/HTML handoff. Invisible
// direction/format characters can impersonate headings, reviewers or content
// even when the JSON syntax and a lesson hash are valid. Only LF is allowed as
// a layout control inside full lesson bodies; titles are single-line text.
// Unicode accent marks and normal Portuguese text remain supported.
const unsafeTextControl =
  /[\x00-\x09\x0b-\x1f\x7f-\x9f\p{Cf}\u034f\u2028\u2029\ufe00-\ufe0f\u{e0100}-\u{e01ef}\uD800-\uDFFF]/u;

function verifyVisibleText(value, label) {
  assert.ok(typeof value === "string" && !unsafeTextControl.test(value),
    "Unsafe invisible/control Unicode in " + label);
}

export function safeLine(value) {
  assert.ok(typeof value === "string" && value.trim() !== "" &&
    value.length <= 200 && !/[\r\n]/u.test(value),
    "Title must fit in one line");
  verifyVisibleText(value, "editorial title");
  return value.trim().replace(/[|]/g, "\\|");
}

export function safeBody(value) {
  assert.ok(typeof value === "string" && value.length <= 30000 &&
    value.trim().split(/\s+/u).length >= 95,
    "A lesson must contain substantive editorial draft text");
  verifyVisibleText(value, "editorial lesson body");
  // Checking mere presence accepts missing order and repeated headings. A
  // handoff that changes the four-part lesson sequence can mislead reviewers
  // even when the total word count and individual section markers look valid.
  const headings=["EXEMPLO FICTÍCIO","APLICAÇÃO OPCIONAL","CUIDADO IMPORTANTE"];
  const found=[...value.matchAll(/\n\n(EXEMPLO FICTÍCIO|APLICAÇÃO OPCIONAL|CUIDADO IMPORTANTE)\n/gu)]
    .map(match=>match[1]);
  assert.deepEqual(found,headings,
    "Missing, duplicated or reordered editorial lesson sections");
  assert.doesNotMatch(value, /<script|javascript:|<\//i);
  return value.trim();
}
