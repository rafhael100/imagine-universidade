#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";

const appKeys=["APP_NAME","APP_KEY","APP_URL","APP_ENV","APP_DEBUG",
  "DB_CONNECTION","DB_HOST","DB_PORT","DB_DATABASE","DB_USERNAME","DB_PASSWORD",
  "SESSION_DRIVER","SESSION_ENCRYPT","SESSION_SECURE_COOKIE","SESSION_HTTP_ONLY",
  "SESSION_SAME_SITE","SESSION_COOKIE","LOG_CHANNEL","LOG_LEVEL","CACHE_STORE",
  "QUEUE_CONNECTION","MAIL_MAILER"];
const dbKeys=["POSTGRES_DB","POSTGRES_USER","POSTGRES_PASSWORD"];
const dbHealthCommand="PGPASSWORD=\"$POSTGRES_PASSWORD\" PGCONNECT_TIMEOUT=2 PGOPTIONS=\"-c statement_timeout=2000\" psql -X -w -h db -p 5432 -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\" -v ON_ERROR_STOP=1 -tA -c \"SELECT 1\" 2>/dev/null | grep -qx 1";
// Docker Compose config --format json retains the double-dollar escape in
// CMD-SHELL; Docker runtime is verified separately by the disposable health test.
const resolvedDbHealthCommand=dbHealthCommand.replaceAll("$",()=>"$"+"$");
const record=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);

// Inspect Docker Compose's resolved model without starting any service.
// All failures are fixed messages: never print configuration values/secrets.
export function validateComposeEnvironment(model){
  assert.ok(record(model?.services),"Missing Compose services");
  const {app,web,db}=model.services;
  assert.ok(record(app)&&record(web)&&record(db),"Missing staging service");
  // A valid environment and SQL healthcheck are not sufficient if a resolved
  // override publishes the database, adds a debug service, or binds public web.
  // Inspect the resolved model, not only the literal Compose YAML.
  assert.deepEqual(Object.keys(model.services).sort(),["app","db","web"],
    "Only the three reviewed private staging services are permitted");
  for(const service of [app,db]){
    assert.ok(!Object.hasOwn(service,"ports"),
      "Application and database must not publish host ports");
  }
  assert.ok([app,web,db].every(service=>!Object.hasOwn(service,"network_mode")),
    "Custom network modes may bypass the private Compose network boundary");
  assert.ok(Array.isArray(web.ports)&&web.ports.length===1&&record(web.ports[0]),
    "Web must publish exactly one explicit loopback-only port");
  const exposed=web.ports[0],published=String(exposed.published??"");
  assert.ok(exposed.host_ip==="127.0.0.1"&&exposed.target===8080&&
    exposed.protocol==="tcp"&&/^[0-9]{5}$/.test(published)&&
    Number(published)>=18000&&Number(published)<=60000&&published!=="18081",
    "Resolved web port must be the one approved loopback TCP mapping");
  // Overrides can keep private ports and still escape confinement by adding
  // privileges, host namespaces, or a bind mount of the Docker socket.
  // Check the resolved Compose model, not only the reviewed YAML text.
  for(const service of [app,web,db]){
    assert.ok(service.privileged!==true&&!Object.hasOwn(service,"cap_add")&&
      !Object.hasOwn(service,"devices")&&!Object.hasOwn(service,"volumes_from")&&
      !Object.hasOwn(service,"pid")&&!Object.hasOwn(service,"ipc")&&
      !Object.hasOwn(service,"userns_mode"),
      "Unsafe container privilege, device or host namespace override");
  }
  for(const service of [app,web]){
    assert.ok(service.read_only===true&&
      Array.isArray(service.cap_drop)&&service.cap_drop.length===1&&service.cap_drop[0]==="ALL"&&
      Array.isArray(service.security_opt)&&service.security_opt.length===1&&
      service.security_opt[0]==="no-new-privileges:true",
      "Application and web must remain read-only without capabilities or new privileges");
  }
  assert.ok(!Object.hasOwn(db,"security_opt"),"Database security overrides require independent review");
  for(const [service,expected] of [
    [app,["university_cache:/var/www/html/bootstrap/cache",
      "university_storage:/var/www/html/storage"]],
    [web,[]],
    [db,["university_pgdata:/var/lib/postgresql"]]
  ]){
    const mounts=service.volumes??[];
    assert.ok(Array.isArray(mounts)&&mounts.every(record),"Invalid resolved service mounts");
    const actual=mounts.map(mount=>mount.type==="volume"?
      mount.source+":"+mount.target:"UNAPPROVED_MOUNT").sort();
    assert.deepEqual(actual,expected,"Unexpected mount: bind, host path, or extra volume");
  }
  for(const service of [app,web,db]){
    assert.ok(!Object.hasOwn(service,"env_file"),"Service env_file is not allowed");
  }
  // Validate the *resolved* Docker Compose health contract, not just YAML text.
  // Never use a private Student/Admin route as a health endpoint.
  assert.ok(record(web.healthcheck)&&Array.isArray(web.healthcheck.test),
    "Missing resolved private web healthcheck");
  assert.deepEqual(web.healthcheck.test,[
    "CMD-SHELL","wget -q -T 3 -O /dev/null http://127.0.0.1:8080/up"
  ],"Web healthcheck must probe only local Laravel /up through Nginx");
  assert.deepEqual(db.healthcheck?.test,["CMD-SHELL",resolvedDbHealthCommand],
    "Resolved database health must use authenticated local TCP SELECT 1 with bounded timeout");
  const application=app.environment,database=db.environment;
  assert.ok(record(application)&&record(database),"Missing explicit service environment");
  assert.ok(Object.keys(application).length===appKeys.length&&
    Object.keys(application).every(key=>appKeys.includes(key)),"Unexpected or missing application environment key");
  assert.ok(Object.keys(database).length===dbKeys.length&&
    Object.keys(database).every(key=>dbKeys.includes(key)),"Unexpected or missing database environment key");
  assert.ok(web.environment===undefined||(record(web.environment)&&Object.keys(web.environment).length===0),
    "Web service must not receive application or database secrets");
  assert.ok(Object.values(application).every(value=>typeof value==="string"&&value.length>0)&&
    Object.values(database).every(value=>typeof value==="string"&&value.length>0),"Empty or unresolved environment value");
  assert.ok(application.DB_USERNAME!==database.POSTGRES_USER,"Runtime and owner roles must differ");
  assert.ok(application.DB_PASSWORD!==database.POSTGRES_PASSWORD,"Runtime and owner passwords must differ");
  assert.ok(!Object.values(application).includes(database.POSTGRES_PASSWORD),"Owner password leaked into application environment");
  assert.ok(application.DB_DATABASE===database.POSTGRES_DB,"Database names must match");
  const fixed={APP_ENV:"staging",APP_DEBUG:"false",DB_CONNECTION:"pgsql",DB_HOST:"db",DB_PORT:"5432",
    SESSION_DRIVER:"database",SESSION_ENCRYPT:"true",SESSION_SECURE_COOKIE:"true",SESSION_HTTP_ONLY:"true",
    SESSION_SAME_SITE:"lax",SESSION_COOKIE:"imagine_universidade_staging_session",LOG_CHANNEL:"stderr",
    LOG_LEVEL:"warning",CACHE_STORE:"array",QUEUE_CONNECTION:"sync",MAIL_MAILER:"array"};
  assert.ok(Object.entries(fixed).every(([key,value])=>application[key]===value),"Unsafe staging runtime setting");
  return true;
}

export function checkEnvironmentRegressionCases(){
  const environment={APP_NAME:"CI synthetic",APP_KEY:"CI_FAKE_KEY",APP_URL:"https://unavailable.invalid",
    APP_ENV:"staging",APP_DEBUG:"false",DB_CONNECTION:"pgsql",DB_HOST:"db",DB_PORT:"5432",
    DB_DATABASE:"ci_database",DB_USERNAME:"ci_runtime",DB_PASSWORD:"CI_FAKE_RUNTIME",
    SESSION_DRIVER:"database",SESSION_ENCRYPT:"true",SESSION_SECURE_COOKIE:"true",SESSION_HTTP_ONLY:"true",
    SESSION_SAME_SITE:"lax",SESSION_COOKIE:"imagine_universidade_staging_session",LOG_CHANNEL:"stderr",
    LOG_LEVEL:"warning",CACHE_STORE:"array",QUEUE_CONNECTION:"sync",MAIL_MAILER:"array"};
  const safeRuntime={read_only:true,cap_drop:["ALL"],security_opt:["no-new-privileges:true"]};
  const fixture={services:{app:{environment,...safeRuntime,volumes:[
      {type:"volume",source:"university_storage",target:"/var/www/html/storage"},
      {type:"volume",source:"university_cache",target:"/var/www/html/bootstrap/cache"}]},
    web:{...safeRuntime,ports:[{mode:"ingress",target:8080,published:"18123",protocol:"tcp",host_ip:"127.0.0.1"}],
      healthcheck:{test:["CMD-SHELL","wget -q -T 3 -O /dev/null http://127.0.0.1:8080/up"]}},
    db:{volumes:[{type:"volume",source:"university_pgdata",target:"/var/lib/postgresql"}],
    environment:{
    POSTGRES_DB:"ci_database",POSTGRES_USER:"ci_owner",POSTGRES_PASSWORD:"CI_FAKE_OWNER"},
    healthcheck:{test:["CMD-SHELL",resolvedDbHealthCommand]}}}};
  assert.ok(validateComposeEnvironment(fixture));
  const invalid=[
    model=>{model.services.app.privileged=true;},
    model=>{model.services.web.privileged=true;},
    model=>{model.services.db.privileged=true;},
    model=>{model.services.app.cap_add=["SYS_ADMIN"];},
    model=>{model.services.web.devices=["/dev/kvm"];},
    model=>{model.services.db.pid="host";},
    model=>{model.services.web.ipc="host";},
    model=>{model.services.app.userns_mode="host";},
    model=>{model.services.web.volumes_from=["app"];},
    model=>{model.services.app.read_only=false;},
    model=>{model.services.web.cap_drop=[];},
    model=>{model.services.app.security_opt=["seccomp:unconfined"];},
    model=>{model.services.db.security_opt=["seccomp:unconfined"];},
    model=>{model.services.app.volumes.push({type:"bind",source:"/var/run/docker.sock",target:"/socket"});},
    model=>{model.services.db.volumes.push({type:"volume",source:"unapproved_volume",target:"/tmp/extra"});},
    model=>{model.services.debug={ports:[{host_ip:"0.0.0.0",published:"5432",target:5432,protocol:"tcp"}]};},
    model=>{model.services.app.ports=[{host_ip:"0.0.0.0",published:"9000",target:9000,protocol:"tcp"}];},
    model=>{model.services.db.ports=[{host_ip:"127.0.0.1",published:"5432",target:5432,protocol:"tcp"}];},
    model=>{model.services.web.ports.push({host_ip:"0.0.0.0",published:"8080",target:8080,protocol:"tcp"});},
    model=>{model.services.web.ports[0].host_ip="0.0.0.0";},
    model=>{model.services.web.ports[0].host_ip="::1";},
    model=>{delete model.services.web.ports[0].host_ip;},
    model=>{model.services.web.ports[0].target=80;},
    model=>{model.services.web.ports[0].protocol="udp";},
    model=>{model.services.web.ports[0].published="18081";},
    model=>{model.services.web.ports[0].published="60001";},
    model=>{delete model.services.web.ports;},
    model=>{model.services.app.network_mode="host";},
    model=>{model.services.db.network_mode="host";},
    model=>{model.services.web.network_mode="host";},
    model=>{model.services.app.environment.UNI_STAGING_DB_OWNER_PASSWORD="CI_FAKE_OWNER";},
    model=>{model.services.app.environment.UNI_STAGING_DB_OWNER="ci_owner";},
    model=>{model.services.app.environment.UNRELATED_SECRET="CI_FAKE_OTHER";},
    model=>{model.services.app.env_file=[".env.staging"];},
    model=>{model.services.app.environment.DB_USERNAME="ci_owner";},
    model=>{model.services.app.environment.DB_PASSWORD="CI_FAKE_OWNER";},
    model=>{model.services.app.environment.APP_KEY="CI_FAKE_OWNER";},
    model=>{delete model.services.app.environment.APP_KEY;},
    model=>{model.services.app.environment.APP_KEY="";},
    model=>{model.services.app.environment.APP_DEBUG="true";},
    model=>{model.services.app.environment.DB_DATABASE="another_database";},
    model=>{model.services.web.environment={APP_KEY:"CI_FAKE_KEY"};},
    model=>{model.services.db.environment.EXTRA_SECRET="CI_FAKE_OTHER";},
    model=>{delete model.services.db.healthcheck;},
    model=>{model.services.db.healthcheck.test=["CMD-SHELL","pg_isready -U ci_owner"];},
    model=>{model.services.db.healthcheck.test=["CMD-SHELL",resolvedDbHealthCommand.replace("-h db","-h example.invalid")];},
    model=>{model.services.db.healthcheck.test=["CMD-SHELL",resolvedDbHealthCommand.replace("PGCONNECT_TIMEOUT=2 ","")];},
    model=>{model.services.db.healthcheck.test=["CMD-SHELL",resolvedDbHealthCommand.replace("$POSTGRES_PASSWORD","$UNTRUSTED_PASSWORD")];},
    model=>{delete model.services.web.healthcheck;},
    model=>{model.services.web.healthcheck.test=["CMD-SHELL","true"];},
    model=>{model.services.web.healthcheck.test=["CMD-SHELL","wget -q -O /dev/null http://example.invalid/up"];},
    model=>{model.services.web.healthcheck.test=["CMD-SHELL","wget -q -O /dev/null http://127.0.0.1:8080/universidade/private/app"];},
  ];
  for(const alter of invalid){
    const model=structuredClone(fixture);alter(model);
    assert.throws(()=>validateComposeEnvironment(model));
  }
  console.log("PASS staging environment: "+invalid.length+" regression cases; authenticated DB SQL health and owner/runtime isolation");
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.argv[2]==="--self-test")checkEnvironmentRegressionCases();
  else{
    let model;
    try{model=JSON.parse(readFileSync(process.argv[2],"utf8"));}
    catch{throw new Error("Could not parse the resolved Compose model");}
    validateComposeEnvironment(model);
    console.log("PASS resolved Compose environment: explicit runtime keys only; owner credentials stay in database service; no services started");
  }
}
