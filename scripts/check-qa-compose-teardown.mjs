#!/usr/bin/env node
// UNI P0: prove Docker QA cleanup failure cannot falsely turn a run green.
// PATH stubs ONLY: no real Docker, PostgreSQL, migration, network, or credentials.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtempSync, writeFileSync, rmSync, existsSync} from "node:fs";
import {join, delimiter} from "node:path";
import {tmpdir} from "node:os";

const fakeDir=mkdtempSync(join(tmpdir(),"uni-compose-teardown-"));
try {
  writeFileSync(join(fakeDir,"docker"), `#!/bin/sh
case "$*" in
  "compose version") exit 0 ;;
  "context show") echo default; exit 0 ;;
  *" build qa")
    touch "$UNI_FAKE_BUILD_MARKER"
    if [ "\${UNI_FAKE_MODE:-}" = "build_failed" ]; then exit 37; fi
    exit 0 ;;
  *" run --rm qa") exit 0 ;;
  *" exec -T db sh -s") cat >/dev/null; exit 0 ;;
  *" logs --no-color --tail 70 db") exit 0 ;;
  *" down --volumes --remove-orphans")
    touch "$UNI_FAKE_DOWN_MARKER"
    if [ "\${UNI_FAKE_MODE:-}" = "down_failed" ]; then exit 41; fi
    exit 0 ;;
  *"ps -aq --filter label=com.docker.compose.project="*)
    if [ "\${UNI_FAKE_MODE:-}" = "preexisting_container" ] ||
       { [ "\${UNI_FAKE_MODE:-}" = "container_remaining" ] && [ -e "$UNI_FAKE_DOWN_MARKER" ]; }; then
      echo synthetic-container
    fi
    if [ "\${UNI_FAKE_MODE:-}" = "preflight_inspect_error" ] && [ ! -e "$UNI_FAKE_DOWN_MARKER" ]; then exit 49; fi
    if [ "\${UNI_FAKE_MODE:-}" = "postflight_inspect_error" ] && [ -e "$UNI_FAKE_DOWN_MARKER" ]; then exit 49; fi
    exit 0 ;;
  *"volume ls -q --filter label=com.docker.compose.project="*)
    if [ "\${UNI_FAKE_MODE:-}" = "preexisting_volume" ] ||
       { [ "\${UNI_FAKE_MODE:-}" = "volume_remaining" ] && [ -e "$UNI_FAKE_DOWN_MARKER" ]; }; then
      echo synthetic-volume
    fi
    exit 0 ;;
  *"network ls -q --filter label=com.docker.compose.project="*)
    if [ "\${UNI_FAKE_MODE:-}" = "preexisting_network" ] ||
       { [ "\${UNI_FAKE_MODE:-}" = "network_remaining" ] && [ -e "$UNI_FAKE_DOWN_MARKER" ]; }; then
      echo synthetic-network
    fi
    exit 0 ;;
esac
echo "FAIL unrecognized synthetic Docker command" >&2
exit 99
`,{mode:0o755});
  const cases=[
    ["success",0,true],
    ["down_failed",2,false],
    ["container_remaining",2,false],
    ["volume_remaining",2,false],
    ["network_remaining",2,false],
    ["postflight_inspect_error",2,false],
    ["preexisting_container",2,false],
    ["preexisting_volume",2,false],
    ["preexisting_network",2,false],
    ["preflight_inspect_error",2,false],
    ["build_failed",37,false],
  ];
  for (const [mode,expected,pass] of cases) {
    const downMarker=join(fakeDir,mode+".down");
    const buildMarker=join(fakeDir,mode+".build");
    const result=spawnSync("bash",["scripts/run-qa-compose.sh"],{
      cwd:new URL("../",import.meta.url),
      encoding:"utf8",
      timeout:7000,
      env:{...process.env,PATH:fakeDir+delimiter+(process.env.PATH||"/usr/bin:/bin"),
        UNI_FAKE_MODE:mode,UNI_FAKE_DOWN_MARKER:downMarker,
        UNI_FAKE_BUILD_MARKER:buildMarker},
    });
    assert.ifError(result.error);
    assert.equal(result.status,expected,mode+": "+result.stderr);
    const success=/PASS: synthetic PostgreSQL restore and verified disposal of QA containers/u;
    assert.equal(success.test(result.stdout),pass,mode+": must never report a false PASS");
    if(mode==="volume_remaining")assert.match(result.stderr,/database volumes remain/u);
    if(mode==="down_failed")assert.match(result.stderr,/teardown failed/u);
    if(mode==="build_failed")assert.match(result.stderr,/QA Docker failed/u);
    const refusal=/^(?:preexisting_|preflight_inspect_error$)/u.test(mode);
    if(refusal){
      assert.equal(existsSync(downMarker),false,mode+": must not teardown another project");
      assert.equal(existsSync(buildMarker),false,mode+": must not build on collision");
      assert.doesNotMatch(result.stderr,/Last 70 lines/u,mode+": must not read other logs");
    } else {
      assert.equal(existsSync(downMarker),true,mode+": own attempt must cleanup");
    }
  }
  console.log("PASS eleven synthetic teardown and preflight cases: collisions never trigger build/logs/down; no real Docker.");
} finally {
  rmSync(fakeDir,{force:true,recursive:true});
}
