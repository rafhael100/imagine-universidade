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
const dbHealthCommand="PGPASSWORD=\"$POSTGRES_PASSWORD\" PGCONNECT_TIMEOUT=2 PGOPTIONS=\"-c statement_timeout=2000\" psql -X -w -h 127.0.0.1 -p 5432 -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\" -v ON_ERROR_STOP=1 -tA -c \"SELECT 1\" 2>/dev/null | grep -qx 1";
const record=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);

// Inspect Docker Compose's resolved model without starting any service.
// All failures are fixed messages: never print configuration values/secrets.
export function validateComposeEnvironment(model){
  assert.ok(record(model?.services),"Missing Compose services");
  const {app,web,db}=model.services;
  assert.ok(record(app)&&record(web)&&record(db),"Missing staging service");
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
  assert.deepEqual(db.healthcheck?.test,["CMD-SHELL",dbHealthCommand],
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
  const fixture={services:{app:{environment},
    web:{healthcheck:{test:["CMD-SHELL","wget -q -T 3 -O /dev/null http://127.0.0.1:8080/up"]}},
    db:{environment:{
    POSTGRES_DB:"ci_database",POSTGRES_USER:"ci_owner",POSTGRES_PASSWORD:"CI_FAKE_OWNER"},
    healthcheck:{test:["CMD-SHELL",dbHealthCommand]}}}};
  assert.ok(validateComposeEnvironment(fixture));
  const invalid=[
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
    model=>{model.services.db.healthcheck.test=["CMD-SHELL",dbHealthCommand.replace("-h 127.0.0.1","-h example.invalid")];},
    model=>{model.services.db.healthcheck.test=["CMD-SHELL",dbHealthCommand.replace("PGCONNECT_TIMEOUT=2 ","")];},
    model=>{model.services.db.healthcheck.test=["CMD-SHELL",dbHealthCommand.replace("$POSTGRES_PASSWORD","$UNTRUSTED_PASSWORD")];},
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
