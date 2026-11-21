#!/usr/bin/env node
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtempSync,readFileSync,writeFileSync,rmSync,renameSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

// Exercise the actual Bash inventory against temporary command fixtures.
// PATH contains only these fixtures: no Docker daemon, socket inventory,
// environment file, VPS or customer resource is read or modified.
const root=fileURLToPath(new URL("../",import.meta.url));
const inventory=join(root,"ops/staging/inventory-readonly.sh");
const compose=readFileSync(join(root,"ops/staging/compose.yaml"),"utf8");
const project=compose.match(/^name: ([a-z0-9][a-z0-9_-]*)$/m)?.[1];
assert.equal(project,"imagine-universidade-staging","inventory project must match Compose");
assert.ok(readFileSync(inventory,"utf8").includes("staging_project='"+project+"'"));
const awkLocation=spawnSync("/bin/bash",["-c","command -v awk"],{encoding:"utf8"});
assert.equal(awkLocation.status,0,"local awk is required for parsing fixture text");
const realAwk=awkLocation.stdout.trim();
assert.ok(realAwk.startsWith("/"));
const directory=mkdtempSync(join(tmpdir(),"uni-staging-inventory-"));
const scenarioPath=join(directory,"scenario.json");
const logPath=join(directory,"commands.jsonl");
let scenarios=0;

const fixtureProgram=`#!${process.execPath}
const {readFileSync,appendFileSync}=require("node:fs");
const {basename}=require("node:path");
const {spawnSync}=require("node:child_process");
const fixture=JSON.parse(readFileSync(process.env.UNI_INVENTORY_SCENARIO,"utf8"));
const name=basename(process.argv[1]),args=process.argv.slice(2);
appendFileSync(fixture.log,JSON.stringify({name,args})+"\\n");
function reply(key,value){
  if(fixture.fail===key){process.stderr.write("PRIVATE_FAILURE_SENTINEL\\n");process.exit(3);}
  process.stdout.write(Array.isArray(value)?value.join("\\n")+(value.length?"\\n":""):String(value));
  process.exit(0);
}
const label="label=com.docker.compose.project="+fixture.project;
const reads=new Map([
  [["context","show"],"context"],
  [["context","inspect","default","--format",'{{ (index .Endpoints "docker").Host }}'],"endpoint"],
  [["ps","--format","{{.Names}}"],"runningContainers"],
  [["ps","-a","--format","{{.Names}}"],"containerNames"],
  [["ps","-a","--filter",label,"--format","{{.ID}}"],"ownedContainers"],
  [["network","ls","--format","{{.Name}}"],"networkNames"],
  [["network","ls","--filter",label,"--format","{{.ID}}"],"ownedNetworks"],
  [["volume","ls","--format","{{.Name}}"],"volumeNames"],
  [["volume","ls","--filter",label,"--format","{{.Name}}"],"ownedVolumes"],
].map(([command,key])=>[JSON.stringify(command),key]));
if(name==="docker"){
  const key=reads.get(JSON.stringify(args));
  if(key!==undefined)reply(key,fixture[key]);
}else if(name==="uname"&&JSON.stringify(args)==='["-s"]'){
  reply("os",fixture.os+"\\n");
}else if(name==="ss"&&JSON.stringify(args)==='["-H","-ltn"]'){
  reply("sockets",fixture.sockets);
}else if(name==="df"&&JSON.stringify(args)==='["-Pk","."]'){
  reply("disk","Filesystem 1024-blocks Used Available Capacity Mounted on\\nfixture 99999999 1 "+fixture.disk+" 1% /\\n");
}else if(name==="awk"){
  if(args.length===2&&args[1]==="/proc/meminfo")reply("memory",fixture.memory+"\\n");
  if(args[0]==="-v"&&fixture.fail==="socketParser")reply("socketParser","");
  const output=spawnSync(${JSON.stringify(realAwk)},args,{input:readFileSync(0)});
  process.stdout.write(output.stdout??"");process.stderr.write(output.stderr??"");
  process.exit(output.status??3);
}
process.stderr.write("UNEXPECTED_INVENTORY_COMMAND\\n");process.exit(99);
`;

function run(label,changes={},expected="hold",options={}){
  const fixture={project,log:logPath,os:"Linux",context:"default\n",endpoint:"unix:///var/run/docker.sock\n",runningContainers:[],
    containerNames:[],ownedContainers:[],networkNames:[],ownedNetworks:[],volumeNames:[],ownedVolumes:[],
    sockets:[],memory:"4194304",disk:"20971520",...changes};
  writeFileSync(scenarioPath,JSON.stringify(fixture));writeFileSync(logPath,"");
  const result=spawnSync("/bin/bash",[inventory,...(options.args??["18123"])],{
    cwd:root,encoding:"utf8",timeout:5000,
    env:{PATH:directory,LC_ALL:"C",UNI_INVENTORY_SCENARIO:scenarioPath,...options.env}
  });
  assert.ifError(result.error);
  assert.equal(result.status,expected==="pass"?0:2,label+": "+result.stdout+result.stderr);
  const output=result.stdout+result.stderr;
  assert.doesNotMatch(output,/PRIVATE_|UNEXPECTED_INVENTORY_COMMAND/,label+": no raw resource/error data");
  if(expected==="pass"){
    assert.match(output,/no University staging container, network or volume collision found/);
    assert.match(output,/HOLD: no socket was reserved/);
  }else{
    assert.match(output,/HOLD:/);assert.doesNotMatch(output,/PASS READ-ONLY:/);
  }
  if(options.reason)assert.match(output,options.reason,label);
  const commands=readFileSync(logPath,"utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
  if(options.noCommands)assert.equal(commands.length,0,label+": reject before inventory calls");
  scenarios++;
  return commands;
}

try{
  for(const name of ["docker","ss","uname","df","awk"]){
    writeFileSync(join(directory,name),fixtureProgram,{mode:0o700});
  }
  const clean=run("empty local inventory",{},"pass");
  assert.equal(clean.filter(command=>command.name==="docker").length,9,
    "a clean result must read names and ownership for all three resource kinds");
  run("unrelated resources and a similar project are not collisions",{
    containerNames:["PRIVATE_OTHER_CONTAINER",project+"2-app-1"],
    networkNames:["PRIVATE_OTHER_NETWORK",project+"2_university_front"],
    volumeNames:["PRIVATE_OTHER_VOLUME",project+"2_university_pgdata"]
  },"pass");
  for(const name of [project+"-app-1",project+"_db_1","imagine-uni-stage-web-1","university-stage_db_1"]){
    run("existing or stopped staging container by name",{containerNames:[name]},"hold",{reason:/staging container/});
  }
  run("renamed staging container by project label",{
    containerNames:["PRIVATE_RENAMED_CONTAINER"],ownedContainers:["PRIVATE_CONTAINER_ID"]
  },"hold",{reason:/staging container/});
  for(const name of [project+"_university_front",project+"_university_database"]){
    run("orphaned staging network by name",{networkNames:[name]},"hold",{reason:/staging network/});
  }
  run("renamed staging network by project label",{
    networkNames:["PRIVATE_RENAMED_NETWORK"],ownedNetworks:["PRIVATE_NETWORK_ID"]
  },"hold",{reason:/staging network/});
  for(const name of [project+"_university_pgdata",project+"_university_storage",project+"_university_cache"]){
    run("orphaned staging volume by name",{volumeNames:[name]},"hold",{reason:/staging volume/});
  }
  run("renamed staging volume by project label",{
    volumeNames:["PRIVATE_RENAMED_VOLUME"],ownedVolumes:["PRIVATE_RENAMED_VOLUME"]
  },"hold",{reason:/staging volume/});
  for(const fail of ["context","runningContainers","containerNames","ownedContainers",
    "networkNames","ownedNetworks","volumeNames","ownedVolumes","sockets","socketParser","memory","disk"]){
    run("unavailable read holds: "+fail,{fail});
  }
  for(const address of ["127.0.0.1:18123","0.0.0.0:18123","[::]:18123"]){
    run("candidate socket in use",{sockets:["LISTEN 0 128 "+address+" 0.0.0.0:*"]},"hold",{reason:/listening socket/});
  }
  for(const args of [[],["18123","18124"],["invalid"],["17999"],["60001"],["18081"]]){
    run("invalid or reserved candidate port",{},"hold",{args,noCommands:true});
  }
  // A named "default" may still be remote. Reject before querying host resources.
  for (const endpoint of ["tcp://10.0.0.20:2376\n","ssh://qa@remote.example\n",
    "unix:///run/user/1000/docker.sock\n"]) {
    const commands=run("remote or alternate default endpoint refused",{endpoint},"hold",
      {reason:/approved local Unix socket/});
    assert.deepEqual(commands.filter(c=>c.name==="docker").map(c=>c.args[0]),
      ["context","context"],"endpoint refusal must precede every Docker resource read");
  }
  const failedInspect=run("context inspect failed",{fail:"endpoint"},"hold",
    {reason:/Cannot inspect/});
  assert.deepEqual(failedInspect.filter(c=>c.name==="docker").map(c=>c.args[0]),
    ["context","context"],"cannot read resources if Docker endpoint is unknown");
  for (const [name,value] of [["DOCKER_TLS_VERIFY","1"],
    ["DOCKER_CERT_PATH","/tmp/fixture-certificate"]]) {
    const commands=run("Docker client override refused: "+name,{},"hold",
      {env:{[name]:value},reason:/overridden Docker daemon/});
    assert.equal(commands.filter(c=>c.name==="docker").length,0,
      "override must refuse before Docker reads");
  }
  run("remote Docker host is refused",{},"hold",{env:{DOCKER_HOST:"tcp://unavailable.invalid:2376"}});
  run("overridden Docker context is refused",{},"hold",{env:{DOCKER_CONTEXT:"another-context"}});
  run("nondefault Docker context is refused",{context:"remote\n"});
  run("non-Linux host is refused",{os:"Darwin"});
  run("insufficient memory",{memory:"2097151"});
  run("malformed memory reading",{memory:"unavailable"});
  run("insufficient disk",{disk:"10485759"});
  run("malformed disk reading",{disk:"unavailable"});
  renameSync(join(directory,"df"),join(directory,"df-unavailable"));
  try{run("required local tool unavailable");}
  finally{renameSync(join(directory,"df-unavailable"),join(directory,"df"));}
  console.log("PASS staging inventory: "+scenarios+" isolated command scenarios; canonical names, labels, orphan resources and read failures; no real Docker/VPS access.");
}finally{
  rmSync(directory,{recursive:true,force:true});
}
