#!/usr/bin/env node
/**
 * ERD R194–R195: source-bound navigation contract for the offline reader.
 * This is an inventory, not a claim of pedagogical signoff or a grant.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {buildEditorialReviewPriority} from "./build-editorial-review-priority.mjs";
import {renderEditorialFulltextHtml} from "./render-editorial-fulltext-html.mjs";
import {verifyEditorialFulltextHtml} from "./verify-editorial-fulltext-html.mjs";

const digest=bytes=>createHash("sha256").update(bytes).digest("hex");

export function auditManifestAnchors(manifest,html){
  assert.equal(typeof html,"string");
  assert.equal(manifest.release_decision,"HOLD_NO_GO");
  assert.equal(manifest.human_signoff_authenticated,false);
  assert.equal(manifest.grants_issued,0);
  assert.equal(manifest.courses.length,10);
  const seen=new Set();
  let lessons=0,checks=0;
  for(const course of manifest.courses){
    for(const lesson of course.lessons){
      lessons++;
      checks+=lesson.rubric_questions;
      const anchors=[
        lesson.anchors.lesson,lesson.anchors.text,
        ...lesson.anchors.sections,lesson.anchors.rubric
      ];
      assert.equal(anchors.length,7,"Exactly seven destinations per draft lesson");
      for(const id of anchors){
        assert.match(id,/^[a-z0-9-]+$/u,"Only safe fragment IDs");
        assert.ok(!seen.has(id),"Duplicate navigation identity: "+id);
        seen.add(id);
        assert.equal(html.split('id="'+id+'"').length,2,
          "Missing or repeated HTML anchor: "+id);
        assert.ok(html.includes('href="#'+id+'"'),
          "Anchor cannot be reached by a native link: "+id);
      }
    }
  }
  assert.equal(lessons,35);
  assert.equal(checks,210);
  assert.equal(seen.size,245);
  assert.ok(html.includes("HOLD_NO_GO · 13/13 NOT_VERIFIED"));
  assert.ok(!/<script\b/iu.test(html));
  return Object.freeze({lessons,checks,anchors:seen.size});
}

export function buildEditorialNavigationManifest(source){
  assert.equal(source?.status,"editorial_draft");
  assert.equal(source?.audience,"authorized_imagine_clients_only");
  const priority=buildEditorialReviewPriority(source);
  const html=renderEditorialFulltextHtml(source);
  verifyEditorialFulltextHtml(Buffer.from(html,"utf8"),source);
  assert.equal(priority.items.length,35);
  const byId=new Map(priority.items.map((row,index)=>[
    row.id,{...row,queue_position:index+1}
  ]));
  assert.equal(byId.size,35);
  let position=0;
  const courses=source.courses.map(course=>{
    const lessons=course.lessons.map(lesson=>{
      const id=course.slug+"/"+lesson.slug;
      const row=byId.get(id);
      assert.ok(row,"Missing source-bound review row");
      position++;
      assert.equal(row.original_position,position);
      return {
        id, title:lesson.title,
        curriculum_position:position,
        queue_position:row.queue_position,
        content_sha256:row.content_sha256,
        rubric_questions:6,
        anchors:{
          lesson:"aula-"+position,
          text:"secoes-aula-"+position,
          sections:[1,2,3,4].map(n=>"aula-secao-"+position+"-"+n),
          rubric:"rubrica-aula-"+position
        }
      };
    });
    return {slug:course.slug,title:course.title,lessons};
  });
  assert.equal(position,35);
  const manifest={
    schema_version:1,
    provenance:"REPOSITORY_SYNTHETIC_DRAFT_ONLY",
    release_decision:"HOLD_NO_GO",
    human_signoff_authenticated:false,
    grants_issued:0,
    total_courses:10,
    total_lessons:35,
    total_rubric_checks:210,
    html_sha256:digest(Buffer.from(html,"utf8")),
    courses
  };
  auditManifestAnchors(manifest,html);
  return manifest;
}
export function renderEditorialNavigationManifest(source){
  return JSON.stringify(buildEditorialNavigationManifest(source),null,2)+"\n";
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  assert.equal(process.argv.length,2,"Only the versioned synthetic draft source is permitted");
  const source=JSON.parse(readFileSync(
    new URL("../content/mvp-cursos-v1.json",import.meta.url),"utf8"));
  process.stdout.write(renderEditorialNavigationManifest(source));
}
