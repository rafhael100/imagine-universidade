#!/usr/bin/env node
// UNI P0: prove Docker QA cleanup failure cannot falsely turn a run green.
// PATH stubs ONLY: no real Docker, PostgreSQL, migration, network, or credentials.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync} from "node:fs";
import {join, delimiter} from "node:path";
import {tmpdir} from "node:os";
import {createHash} from "node:crypto";

const fakeDir=mkdtempSync(join(tmpdir(),"uni-compose-teardown-"));
try {
  writeFileSync(join(fakeDir,"docker"), `#!/bin/sh
case "$*" in
  *"ps -aq --filter name=^/uni-ci-pg-http-"*)
    [ "$UNI_FAKE_MODE" = "pg_preflight_inspect_error" ] && exit 45
    exit 0 ;;
  *"network ls -q --filter name=^uni-ci-pg-http-net-"*)
    [ -e "$UNI_FAKE_PG_NETWORK_MARKER" ] && echo synthetic-network
    exit 0 ;;
  *"volume ls -q --filter name=^uni-ci-pg-data-"*)
    if [ "$UNI_FAKE_MODE" = "pg_preexisting_volume" ] || [ -e "$UNI_FAKE_PG_VOLUME_MARKER" ]; then
      echo synthetic-volume
    fi
    exit 0 ;;
  "network create --internal --driver bridge uni-ci-pg-http-net-"*)
    touch "$UNI_FAKE_PG_NETWORK_MARKER"; exit 0 ;;
  "volume create uni-ci-pg-data-"*)
    touch "$UNI_FAKE_PG_VOLUME_MARKER"; exit 0 ;;
  "run -d --name uni-ci-pg-http-db-"*) exit 37 ;;
  "run --pull=never -d --name uni-ci-pg-http-db-"*)
    for arg in "$@"; do last="$arg"; done
    [ "$last" = "$UNI_FAKE_TRANSPORT_PG_ID" ] || exit 98
    touch "$UNI_FAKE_TRANSPORT_RUN"; exit 37 ;;
  "ps -aq")
    [ "$UNI_FAKE_MODE" = transport_occupied ] && echo synthetic-container
    exit 0 ;;
  "volume ls -q") exit 0 ;;
  "network ls --format {{.Name}}") printf 'host\\nbridge\\nnone\\n'; exit 0 ;;
  "image ls --all --no-trunc --quiet")
    printf '%s\\n' "$UNI_FAKE_TRANSPORT_IDS"
    [ "$UNI_FAKE_MODE" = transport_extra ] && printf 'sha256:%064d\\n' 0
    exit 0 ;;
  "image inspect --format {{.Id}} sha256:"*) printf '%s\\n' "$5"; exit 0 ;;
  "rm -f uni-ci-pg-http-web-"*) exit 0 ;;
  "network rm uni-ci-pg-http-net-"*)
    if [ "$UNI_FAKE_MODE" != "pg_cleanup_leak" ]; then rm -f "$UNI_FAKE_PG_NETWORK_MARKER"; fi
    exit 0 ;;
  "volume rm uni-ci-pg-data-"*)
    rm -f "$UNI_FAKE_PG_VOLUME_MARKER"; exit 0 ;;
  *"ps -aq --filter name=^/uni-ci-private-"*)
    if [ "$UNI_FAKE_MODE" = "http_preflight_inspect_error" ]; then exit 45; fi
    if [ "$UNI_FAKE_MODE" = "http_preexisting_app" ] ||
       { [ "$UNI_FAKE_MODE" = "http_container_leak" ] && [ -e "$UNI_FAKE_HTTP_APP_MARKER" ]; }; then
      echo synthetic-app
    fi
    exit 0 ;;
  *"network ls -q --filter name=^uni-ci-private-net-"*)
    if [ "$UNI_FAKE_MODE" = "http_preexisting_network" ] ||
       [ -e "$UNI_FAKE_HTTP_NETWORK_MARKER" ]; then echo synthetic-network; fi
    exit 0 ;;
  "network create --internal --driver bridge uni-ci-private-net-"*)
    touch "$UNI_FAKE_HTTP_NETWORK_MARKER"; exit 0 ;;
  "run -d --name uni-ci-private-app-"*)
    touch "$UNI_FAKE_HTTP_APP_MARKER"
    [ "$UNI_FAKE_MODE" = "http_app_failed" ] && exit 37
    exit 0 ;;
  "run -d --name uni-ci-private-web-"*) exit 0 ;;
  "run --rm -i --network uni-ci-private-net-"*)
    cat >/dev/null
    [ "$UNI_FAKE_MODE" = "http_probe_failed" ] && exit 38
    exit 0 ;;
  "rm -f uni-ci-private-web-"*)
    if [ "$UNI_FAKE_MODE" != "http_container_leak" ]; then rm -f "$UNI_FAKE_HTTP_APP_MARKER"; fi
    exit 0 ;;
  "network rm uni-ci-private-net-"*)
    if [ "$UNI_FAKE_MODE" != "http_network_leak" ]; then rm -f "$UNI_FAKE_HTTP_NETWORK_MARKER"; fi
    exit 0 ;;
  # Separate DB-health Compose entrypoint: fail closed on reused resources.
  *"ps -aq --filter label=com.docker.compose.project=uni-p0-pghealth-"*)
    if [ "$UNI_FAKE_MODE" = "health_inspect_error" ]; then exit 45; fi
    if [ "$UNI_FAKE_MODE" = "health_preexisting_container" ]; then echo synthetic-container; fi
    exit 0 ;;
  *"volume ls -q --filter label=com.docker.compose.project=uni-p0-pghealth-"*)
    if [ "$UNI_FAKE_MODE" = "health_preexisting_volume" ] ||
       { [ "$UNI_FAKE_MODE" = "health_leftover_volume" ] &&
         [ -e "$UNI_FAKE_HEALTH_DOWN_MARKER" ]; }; then echo synthetic-volume; fi
    exit 0 ;;
  *"network ls -q --filter label=com.docker.compose.project=uni-p0-pghealth-"*)
    exit 0 ;;
  *"config --quiet") exit 0 ;;
  *"up -d --no-build db")
    touch "$UNI_FAKE_HEALTH_UP_MARKER"; exit 37 ;;
  *"down --volumes --remove-orphans -t 2")
    touch "$UNI_FAKE_HEALTH_DOWN_MARKER"
    [ "$UNI_FAKE_MODE" = "health_down_failed" ] && exit 41
    exit 0 ;;
  "compose version") exit 0 ;;
  "context show")
    if [ "\${UNI_FAKE_MODE:-}" = "context_show_failed" ]; then exit 43; fi
    if [ "\${UNI_FAKE_MODE:-}" = "context_non_default" ]; then echo shared; else echo default; fi
    exit 0 ;;
  *"context inspect default --format "*)
    case "\${UNI_FAKE_MODE:-}" in
      context_inspect_failed) exit 42 ;;
      remote_endpoint_tcp) echo "tcp://10.0.0.20:2376" ;;
      remote_endpoint_ssh) echo "ssh://tester@host" ;;
      alternate_unix_socket) echo "unix:///run/user/1000/docker.sock" ;;
      *) echo "unix:///var/run/docker.sock" ;;
    esac
    exit 0 ;;
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
    ["remote_endpoint_tcp",2,false],
    ["remote_endpoint_ssh",2,false],
    ["alternate_unix_socket",2,false],
    ["context_inspect_failed",2,false],
    ["context_non_default",2,false],
    ["context_show_failed",2,false],
    ["explicit_host_override",2,false],
    ["explicit_context_override",2,false],
    ["explicit_tls_override",2,false],
    ["explicit_cert_override",2,false],
  ];
  for (const [mode,expected,pass] of cases) {
    const downMarker=join(fakeDir,mode+".down");
    const buildMarker=join(fakeDir,mode+".build");
    const env={...process.env,PATH:fakeDir+delimiter+(process.env.PATH||"/usr/bin:/bin"),
      UNI_FAKE_MODE:mode,UNI_FAKE_DOWN_MARKER:downMarker,
      UNI_FAKE_BUILD_MARKER:buildMarker};
    for(const name of ["DOCKER_HOST","DOCKER_CONTEXT","DOCKER_TLS_VERIFY","DOCKER_CERT_PATH"]) delete env[name];
    if(mode==="explicit_host_override") env.DOCKER_HOST="tcp://shared-daemon:2376";
    if(mode==="explicit_context_override") env.DOCKER_CONTEXT="default";
    if(mode==="explicit_tls_override") env.DOCKER_TLS_VERIFY="1";
    if(mode==="explicit_cert_override") env.DOCKER_CERT_PATH="/tmp/synthetic-cert";
    const result=spawnSync("bash",["scripts/run-qa-compose.sh"],{
      cwd:new URL("../",import.meta.url),
      encoding:"utf8",
      timeout:7000,
      env,
    });
    assert.ifError(result.error);
    assert.equal(result.status,expected,mode+": "+result.stderr);
    const success=/PASS: synthetic PostgreSQL restore and verified disposal of QA containers/u;
    assert.equal(success.test(result.stdout),pass,mode+": must never report a false PASS");
    if(mode==="volume_remaining")assert.match(result.stderr,/database volumes remain/u);
    if(mode==="down_failed")assert.match(result.stderr,/teardown failed/u);
    if(mode==="build_failed")assert.match(result.stderr,/QA Docker failed/u);
    const refusal=/^(?:preexisting_|preflight_inspect_error$|remote_endpoint_|alternate_unix_socket$|context_|explicit_)/u.test(mode);
    if(refusal){
      assert.equal(existsSync(downMarker),false,mode+": must not teardown another project");
      assert.equal(existsSync(buildMarker),false,mode+": must not build on collision");
      assert.doesNotMatch(result.stderr,/Last 70 lines/u,mode+": must not read other logs");
    } else {
      assert.equal(existsSync(downMarker),true,mode+": own attempt must cleanup");
    }
  }
  // The four staging QA scripts must not trust a context merely named "default".
  // PATH fixtures simulate remote endpoints without using any Docker daemon.
  const entrypoints=[
    ["scripts/qa-staging-image-build.sh","fix/uni-c108-private-flow-2026-11-17",["uni-qa-stage-test-php","uni-qa-stage-test-nginx"]],
    ["scripts/qa-staging-private-http.sh","fix/uni-c108-private-flow-2026-11-17",["uni-qa-stage-test-php","uni-qa-stage-test-nginx"]],
    ["scripts/qa-staging-postgres-http.sh","review/uni-p0-db-aware-health-2026-11-20",["uni-qa-stage-test-php","uni-qa-stage-test-nginx"]],
    ["scripts/qa-p0-db-compose-health.sh","review/uni-p0-readiness-git-config-root-fence-2026-11-22",[]],
  ];
  let remoteScriptCases=0;
  for(const [file,branch,args] of entrypoints){
    for(const mode of ["remote_endpoint_tcp","remote_endpoint_ssh",
      "alternate_unix_socket","context_inspect_failed"]){
      const env={...process.env,
        PATH:fakeDir+delimiter+(process.env.PATH||"/usr/bin:/bin"),
        UNI_FAKE_MODE:mode,CI:"true",GITHUB_ACTIONS:"true",
        GITHUB_EVENT_NAME:"push",GITHUB_REPOSITORY:"rafhael100/imagine-universidade",
        GITHUB_REF:"refs/heads/"+branch,GITHUB_REF_NAME:branch,
        GITHUB_RUN_ID:"900001",GITHUB_RUN_ATTEMPT:"1"};
      for(const name of ["DOCKER_HOST","DOCKER_CONTEXT",
        "DOCKER_TLS_VERIFY","DOCKER_CERT_PATH"])delete env[name];
      const result=spawnSync("bash",[file,...args],{
        cwd:new URL("../",import.meta.url),encoding:"utf8",timeout:7000,env});
      assert.ifError(result.error);
      assert.equal(result.status,2,file+" "+mode+": "+result.stderr);
      assert.match(result.stderr,/exact local Docker Unix socket required/u);
      assert.doesNotMatch(result.stderr,/FAIL unrecognized synthetic Docker command/u,
        file+" "+mode+": must not perform Docker build, run or cleanup");
      assert.doesNotMatch(result.stdout,/PASS/u);
      remoteScriptCases++;
    }
  }
  // CI staging PG18 must refuse resource collisions and report failed disposal.
  // Fake Docker only: no daemon, PostgreSQL, network or real image is used.
  for (const [mode, expected] of [
    ["pg_cleanup_ok",37],
    ["pg_cleanup_leak",2],
    ["pg_preexisting_volume",2],
    ["pg_preflight_inspect_error",2],
  ]) {
    const networkMarker=join(fakeDir,mode+".pg-network");
    const volumeMarker=join(fakeDir,mode+".pg-volume");
    const env={...process.env,
      PATH:fakeDir+delimiter+(process.env.PATH||"/usr/bin:/bin"),
      UNI_FAKE_MODE:mode,UNI_FAKE_PG_NETWORK_MARKER:networkMarker,
      UNI_FAKE_PG_VOLUME_MARKER:volumeMarker,
      CI:"true",GITHUB_ACTIONS:"true",GITHUB_EVENT_NAME:"push",
      GITHUB_REPOSITORY:"rafhael100/imagine-universidade",
      GITHUB_REF:"refs/heads/review/uni-p0-readiness-git-config-root-fence-2026-11-22",
      GITHUB_REF_NAME:"review/uni-p0-readiness-git-config-root-fence-2026-11-22",
      GITHUB_RUN_ID:"900001",GITHUB_RUN_ATTEMPT:"1"};
    for(const name of ["DOCKER_HOST","DOCKER_CONTEXT",
      "DOCKER_TLS_VERIFY","DOCKER_CERT_PATH"])delete env[name];
    const result=spawnSync("bash",[
      "scripts/qa-staging-postgres-http.sh",
      "uni-qa-stage-test-php","uni-qa-stage-test-nginx"],{
      cwd:new URL("../",import.meta.url),encoding:"utf8",timeout:7000,env});
    assert.ifError(result.error);
    assert.equal(result.status,expected,mode+": "+result.stderr);
    assert.doesNotMatch(result.stdout,/PASS synthetic 3-service staging PG18/u,
      mode+": success must never appear before verified teardown");
    if(mode==="pg_cleanup_ok"){
      assert.equal(existsSync(networkMarker),false);
      assert.equal(existsSync(volumeMarker),false);
    } else if(mode==="pg_cleanup_leak"){
      assert.match(result.stderr,/verified teardown failed/u);
      assert.equal(existsSync(networkMarker),true);
    } else {
      assert.match(result.stderr,/disposable Docker resource/u);
      assert.equal(existsSync(networkMarker),false,
        mode+": no resource may be created on failed preflight");
    }
  }
  // Transport QA: real transport verifier, synthetic archive bytes and
  // PATH-stub Docker; abort at the first run, never execute a container.
  const transportSource=readFileSync(new URL("./qa-staging-postgres-http.sh",import.meta.url),"utf8");
  const calls=transportSource.split("\n").filter(line=>/^\s*docker run /u.test(line));
  assert.ok(calls.length>0 && calls.every(line=>line.includes('docker run "${pullArgs[@]}" ')));
  assert.match(transportSource,/pullArgs=\(--pull=never\)/u);
  const checkout=spawnSync("git",["rev-parse","HEAD"],{cwd:new URL("../",import.meta.url),encoding:"utf8"});
  assert.equal(checkout.status,0);
  const origin=checkout.stdout.trim();
  const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
  const images=["php","nginx","pg"].map((role,i)=>{
    const bytes=Buffer.from("synthetic archive "+role);
    const id="sha256:"+String(i+1).repeat(64), hash=digest(bytes);
    writeFileSync(join(fakeDir,"uni-p0-"+role+"-os-image.tar"),bytes);
    return {role,image_id:id,image_tar_sha256:hash,archive_verification:{
      scope:"local_docker_save_only",image_id:id,archive_sha256:hash,ordered_layer_count:1}};
  });
  const proof=JSON.stringify({schema:2,repository:"rafhael100/imagine-universidade",commit:origin,
    workflow_run_id:"900001",workflow_attempt:"1",release_decision:"HOLD_NO_GO",appsec_signoff:false,
    registry_published:false,full_sbom_complete:false,images,
    postgres_runtime:{scope:"synthetic_3_service_runtime",image_id:images[2].image_id}});
  writeFileSync(join(fakeDir,"uni-p0-os-cve-scan-provenance.json"),proof);
  for(const [mode,sha,anchor,expected,diagnostic,run] of [
    ["transport_wrong_sha","0".repeat(40),digest(proof),2,/exact push checkout/u,false],
    ["transport_bad_anchor",origin,"a".repeat(64),2,/transport archive provenance rejected/u,false],
    ["transport_occupied",origin,digest(proof),2,/existing containers or volumes/u,false],
    ["transport_extra",origin,digest(proof),2,/image inventory differs/u,false],
    ["transport_valid",origin,digest(proof),37,/stage=postgres_start/u,true],
  ]){
    const marker=join(fakeDir,mode+".transport-run");
    const networkMarker=join(fakeDir,mode+".pg-network"),volumeMarker=join(fakeDir,mode+".pg-volume");
    const env={...process.env,PATH:fakeDir+delimiter+(process.env.PATH||"/usr/bin:/bin"),
      CI:"true",GITHUB_ACTIONS:"true",GITHUB_EVENT_NAME:"push",GITHUB_REPOSITORY:"rafhael100/imagine-universidade",
      GITHUB_REF:"refs/heads/review/uni-p0-readiness-git-config-root-fence-2026-11-22",
      GITHUB_SHA:origin,GITHUB_RUN_ID:"900001",GITHUB_RUN_ATTEMPT:"1",UNI_FAKE_MODE:mode,
      UNI_FAKE_TRANSPORT_RUN:marker,UNI_FAKE_TRANSPORT_PG_ID:images[2].image_id,UNI_FAKE_TRANSPORT_IDS:images.map(i=>i.image_id).join("\n"),
      UNI_FAKE_PG_NETWORK_MARKER:networkMarker,UNI_FAKE_PG_VOLUME_MARKER:volumeMarker};
    for(const name of ["DOCKER_HOST","DOCKER_CONTEXT","DOCKER_TLS_VERIFY","DOCKER_CERT_PATH"])delete env[name];
    const res=spawnSync("bash",["scripts/qa-staging-postgres-http.sh","--transport",fakeDir,sha,"900001","1",anchor],
      {cwd:new URL("../",import.meta.url),encoding:"utf8",timeout:7000,env});
    assert.ifError(res.error);assert.equal(res.status,expected,res.stderr);
    assert.match(res.stderr,diagnostic);
    assert.doesNotMatch(res.stderr,/FAIL unrecognized synthetic Docker command/u);
    assert.doesNotMatch(res.stdout,/PASS/u);
    assert.equal(existsSync(marker),run);
    assert.equal(existsSync(networkMarker),false);
    assert.equal(existsSync(volumeMarker),false);
  }
  // The older two-container private HTTP path must also refuse occupied
  // resources and cannot emit PASS before verified cleanup.
  const httpCases=[
    ["http_success",0,true],
    ["http_app_failed",37,false],
    ["http_probe_failed",38,false],
    ["http_network_leak",2,false],
    ["http_container_leak",2,false],
    ["http_preexisting_network",2,false],
    ["http_preexisting_app",2,false],
    ["http_preflight_inspect_error",2,false],
  ];
  for (const [mode,expected,pass] of httpCases) {
    const networkMarker=join(fakeDir,mode+".http-network");
    const appMarker=join(fakeDir,mode+".http-app");
    const env={...process.env,
      PATH:fakeDir+delimiter+(process.env.PATH||"/usr/bin:/bin"),
      UNI_FAKE_MODE:mode,UNI_FAKE_HTTP_NETWORK_MARKER:networkMarker,
      UNI_FAKE_HTTP_APP_MARKER:appMarker,
      CI:"true",GITHUB_ACTIONS:"true",GITHUB_EVENT_NAME:"push",
      GITHUB_REPOSITORY:"rafhael100/imagine-universidade",
      GITHUB_REF:"refs/heads/review/uni-p0-readiness-git-config-root-fence-2026-11-22",
      GITHUB_REF_NAME:"review/uni-p0-readiness-git-config-root-fence-2026-11-22",
      GITHUB_RUN_ID:"900001",GITHUB_RUN_ATTEMPT:"1"};
    for (const name of ["DOCKER_HOST","DOCKER_CONTEXT",
      "DOCKER_TLS_VERIFY","DOCKER_CERT_PATH"])delete env[name];
    const result=spawnSync("bash",[
      "scripts/qa-staging-private-http.sh",
      "uni-qa-stage-test-php","uni-qa-stage-test-nginx"],{
      cwd:new URL("../",import.meta.url),encoding:"utf8",timeout:7000,env});
    assert.ifError(result.error);
    assert.equal(result.status,expected,mode+": "+result.stderr);
    assert.equal(/PASS: private Docker network HTTP integration/u.test(result.stdout),
      pass,mode+": PASS only after confirmed removal");
    if(mode==="http_network_leak"||mode==="http_container_leak"){
      assert.match(result.stderr,/verified teardown failed/u);
    }
    if(mode.startsWith("http_preexisting_")||mode==="http_preflight_inspect_error"){
      assert.match(result.stderr,/disposable Docker resource/u);
      assert.equal(existsSync(networkMarker),false,
        mode+": refuse before creating or removing another run resource");
    }else if(mode==="http_network_leak"){
      assert.equal(existsSync(networkMarker),true);
    }else{
      assert.equal(existsSync(networkMarker),false);
    }
    assert.equal(existsSync(appMarker),mode==="http_container_leak",
      mode+": container cleanup visibility");
  }
  // DB-health standalone runner: ownership and verified cleanup regressions.
  // PATH fixture only; no real daemon, SQL, network or migrations.
  const dbHealthCases=[
    ["health_up_failed",37,true],
    ["health_down_failed",2,true],
    ["health_leftover_volume",2,true],
    ["health_preexisting_container",2,false],
    ["health_preexisting_volume",2,false],
    ["health_inspect_error",2,false],
  ];
  for(const [mode,expected,downExpected] of dbHealthCases){
    const upMarker=join(fakeDir,mode+".health-up");
    const downMarker=join(fakeDir,mode+".health-down");
    const env={...process.env,
      PATH:fakeDir+delimiter+(process.env.PATH||"/usr/bin:/bin"),
      UNI_FAKE_MODE:mode,UNI_FAKE_HEALTH_UP_MARKER:upMarker,
      UNI_FAKE_HEALTH_DOWN_MARKER:downMarker,
      CI:"true",GITHUB_ACTIONS:"true",GITHUB_EVENT_NAME:"push",
      GITHUB_REPOSITORY:"rafhael100/imagine-universidade",
      GITHUB_REF_NAME:"review/uni-p0-readiness-git-config-root-fence-2026-11-22",
      GITHUB_RUN_ID:"900001",GITHUB_RUN_ATTEMPT:"1"};
    for(const name of ["DOCKER_HOST","DOCKER_CONTEXT",
      "DOCKER_TLS_VERIFY","DOCKER_CERT_PATH"])delete env[name];
    const result=spawnSync("bash",["scripts/qa-p0-db-compose-health.sh"],{
      cwd:new URL("../",import.meta.url),encoding:"utf8",timeout:7000,env});
    assert.ifError(result.error);
    assert.equal(result.status,expected,mode+": "+result.stderr);
    assert.doesNotMatch(result.stdout,/PASS: disposable PG18 Compose DB health/u,
      mode+": PASS forbidden before verified teardown");
    assert.equal(existsSync(downMarker),downExpected,
      mode+": never teardown another CI project");
    assert.equal(existsSync(upMarker),downExpected,
      mode+": never start an occupied CI project");
    if(mode==="health_down_failed"||mode==="health_leftover_volume"){
      assert.match(result.stderr,/verified Compose teardown failed/u);
    }
    if(mode.startsWith("health_preexisting_")||mode==="health_inspect_error"){
      assert.match(result.stderr,/disposable Compose project/u);
    }
  }
  console.log("PASS "+dbHealthCases.length+" DB-health Compose ownership/cleanup negatives with fake Docker.");
  console.log("PASS "+httpCases.length+" private HTTP ownership / verified teardown synthetic cases.");
  console.log("PASS 4 staging PG18 ownership / cleanup negatives with fake Docker.");
  console.log("PASS 21 existing Docker QA cases + "+remoteScriptCases+" remote-endpoint checks across four staging entrypoints; no real Docker.");
} finally {
  rmSync(fakeDir,{force:true,recursive:true});
}
