#!/usr/bin/env node
/**
 * UNI ERD-R104: fail-closed invariants for the offline human-review handoff.
 * This is a structural assertion, never approval, authorization or evidence.
 */
import assert from "node:assert/strict";

const identity=/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const digest=/^[a-f0-9]{64}$/u;
const positions=Array.from({length:35},(_,i)=>i+1);

export function validatePriorityReport(report){
  assert.equal(report?.schema_version,1,"Unexpected priority report schema");
  assert.equal(report?.review_scope,"10 courses / 35 lessons");
  assert.equal(report?.order_policy,"FLAGGED_FIRST_THEN_CURRICULUM_ORDER");
  assert.equal(report?.flags_are,"HEURISTIC_READING_HINTS_NOT_PROVEN_VIOLATIONS");
  assert.equal(report?.total_lessons,35);
  assert.equal(report?.human_rubric_checks,210);
  assert.equal(report?.approval_authority,"NONE");
  assert.equal(report?.human_review_authenticated,false);
  assert.equal(report?.grants_issued,0);
  assert.equal(report?.release_decision,"HOLD_NO_GO");
  assert.ok(Array.isArray(report?.items)&&report.items.length===35,"Expected 35 lessons");
  const seenIds=new Set(),seenPositions=new Set();
  let flagged=0,previousGroup=-1,previousPosition=0;
  for(const [index,row] of report.items.entries()){
    assert.ok(row && typeof row==="object" && !Array.isArray(row),"Invalid lesson row");
    assert.equal(typeof row.id,"string");
    assert.match(row.id,identity);
    assert.ok(!seenIds.has(row.id),"Duplicate lesson identity: "+row.id);
    seenIds.add(row.id);
    assert.ok(Number.isInteger(row.original_position)&&row.original_position>=1&&row.original_position<=35,
      "Invalid curriculum position");
    assert.ok(!seenPositions.has(row.original_position),
      "Duplicate HTML anchor / curriculum position: "+row.original_position);
    seenPositions.add(row.original_position);
    assert.ok(typeof row.course_title==="string"&&row.course_title.trim().length>0,"Blank course title");
    assert.ok(typeof row.lesson_title==="string"&&row.lesson_title.trim().length>0,"Blank lesson title");
    assert.match(row.content_sha256,digest);
    assert.equal(row.review_status,"PENDING_HUMAN_REVIEW","No authenticated editorial signoff");
    assert.equal(row.authenticated_signoff,false);
    assert.ok(Array.isArray(row.section_words)&&row.section_words.length===4,"Missing four lesson sections");
    assert.ok(row.section_words.every(n=>Number.isInteger(n)&&n>0),"Invalid section word count");
    assert.ok(Array.isArray(row.possible_risks) &&
      row.possible_risks.every(r=>typeof r==="string"&&r.length>0),"Invalid heuristic risk entries");
    const group=row.possible_risks.length>0?0:1;
    if(group===0)flagged++;
    assert.ok(group>previousGroup ||
      (group===previousGroup&&row.original_position>previousPosition),
      "Priority list must be flagged-first, then stable curriculum order at row "+(index+1));
    previousGroup=group;
    previousPosition=row.original_position;
  }
  assert.deepEqual([...seenPositions].sort((a,b)=>a-b),positions,
    "Every one of the 35 source positions must have one unique anchor");
  assert.equal(report.flagged_lessons,flagged,"Flagged count mismatch");
  assert.equal(report.unflagged_lessons,35-flagged,"Unflagged count mismatch");
  return true;
}
