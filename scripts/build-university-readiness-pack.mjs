#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync, mkdirSync, writeFileSync, realpathSync, lstatSync} from "node:fs";
import {resolve, relative, sep, join, dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {validateReleaseManifest, requiredReleaseGates} from "../ops/staging/release-gate-policy.mjs";

// These are suggested workstreams, NOT named owners or approvals.
const descriptions=Object.freeze({
  portal_official_active_services:["Serviços ativos oficiais","Portal / comercial e financeiro"],
  portal_independent_revocation:["Revogação independente","Portal / integrações"],
  portal_business_sso_identity:["Identidade e SSO empresarial","Portal / segurança"],
  portal_editorial_staff_authority:["Permissão da equipe editorial","Portal / gestão"],
  tenant_and_resource_authorization:["Isolamento de empresa e recurso","Aplicação / segurança"],
  private_s2s_security_and_key_rotation:["Canal privado e rotação de chaves","Infraestrutura / segurança"],
  appsec_independent_review:["Revisão independente de segurança","AppSec"],
  dba_independent_review:["Revisão independente de banco","DBA"],
  lgpd_independent_review:["Revisão de proteção de dados","LGPD"],
  educational_editorial_signoff:["Aprovação das aulas","Editorial"],
  private_vps_staging_functional_homologation:["Homologação funcional privada","QA / infraestrutura"],
  real_backup_restoration_and_rollback:["Backup, restauração e rollback reais","Operações"],
  production_deployment_approval:["Autorização explícita de produção","Direção"],
});
assert.deepEqual(Object.keys(descriptions).sort(), [...requiredReleaseGates].sort());
// Next proof required is guidance ONLY, never a delegated approval.
const nextEvidence=Object.freeze({
  portal_official_active_services:"Homologar autoridade de contrato vigente e SKU elegível por empresa, com conciliação financeira e cancelamento do último serviço.",
  portal_independent_revocation:"Comprovar revisão monotônica independente, cancelamento, reativação e negação sob indisponibilidade do feed.",
  portal_business_sso_identity:"Demonstrar sessão empresarial real do Portal com MFA, sujeito, tenant, expiração e troca de empresa sob isolamento.",
  portal_editorial_staff_authority:"Validar somente equipe editorial autorizada para university:manage, separada de university:view.",
  tenant_and_resource_authorization:"Provar dois clientes e edição com RLS, permissões de recurso e rejeição de acesso entre empresas.",
  private_s2s_security_and_key_rotation:"Homologar mTLS ou canal autenticado equivalente, rotação de chaves, orçamento de timeout e isolamento de credenciais.",
  appsec_independent_review:"Obter revisão AppSec independente com achados, correções e aprovação explícita da revisão aplicável.",
  dba_independent_review:"Revisar migrações PostgreSQL, RLS, privilégios mínimos, concorrência e restauração em ambiente isolado.",
  lgpd_independent_review:"Revisar finalidade, minimização, retenção, direitos dos titulares, logs e exclusão, com aceite responsável.",
  educational_editorial_signoff:"Obter evidência de aceite humano por conteúdo e hash atual de cada uma das 35 aulas; jamais aceitar apenas CSV.",
  private_vps_staging_functional_homologation:"Executar jornada Cliente/Admin com sessão Portal autorizada em staging privado, sem publicar DNS ou produção.",
  real_backup_restoration_and_rollback:"Executar restauração e rollback de dados e versão com evidências em ambiente privado autorizado.",
  production_deployment_approval:"Registrar decisão humana de publicação somente após evidências independentes de todos os gates restantes."
});
assert.deepEqual(Object.keys(nextEvidence).sort(), [...requiredReleaseGates].sort());
for(const [key,action] of Object.entries(nextEvidence)){
  assert.equal(typeof action,"string",key);
  assert.ok(action.length>45 && !/[\r\n|]/u.test(action),"Non-empty single-line safe next evidence: "+key);
}


const quote=(value)=>'"'+String(value).replaceAll('"','""')+'"';

export function buildReadinessPack(manifest,sha){
  const missing=validateReleaseManifest(manifest);
  assert.match(sha,/^[a-f0-9]{40}$/i,"A concrete CI checkout SHA is required");
  const gates=requiredReleaseGates.map(key=>{
    const evidence=manifest.blocking_evidence[key];
    const [title,suggestedArea]=descriptions[key];
    return {key,title,suggested_area:suggestedArea,
      next_evidence:nextEvidence[key],status:evidence.status,evidence_ref:evidence.evidence_ref};
  });
  const verified=gates.length-missing;
  const snapshot={
    schema_version:1,
    project:manifest.project,
    source_sha:sha,
    source_manifest:"ops/release-gates.json",
    release_decision:"HOLD_NO_GO",
    qa_status:"NOT_EVALUATED_BY_THIS_REPORT",
    gates_total:gates.length,
    gates_verified:verified,
    gates_unverified:missing,
    source_issue:manifest.source_issue,
    gates,
    notice:"CI and synthetic checks do not grant access, prove paid contracts, or authorize a release.",
  };
  const md=[
    "# Imagine Universidade — pendências de lançamento",
    "",
    "**HOLD_NO_GO — não autoriza merge, deploy, SSO, grants ou produção.**",
    "",
    "Este é um retrato SOMENTE LEITURA dos 13 gates versionados do projeto.",
    "O status de cada CI deve ser conferido separadamente no GitHub Actions.",
    "Um check técnico verde não comprova contratos ativos nem concede acesso a clientes.",
    "",
    "- Commit inspecionado: `"+sha+"`",
    "- Gates não verificados: **"+missing+" de "+gates.length+"**",
    "- Evidências verificadas no manifesto: **"+verified+" de "+gates.length+"**",
    "- Dependência oficial: "+manifest.source_issue,
    "",
    "| Critério | Área sugerida (não designada) | Próxima evidência necessária | Estado | Evidência |",
    "|---|---|---|---|---|",
    ...gates.map(g=>"| "+g.title+" | "+g.suggested_area+" | "+g.next_evidence+
       " | "+g.status+" | "+(g.evidence_ref||"PENDENTE")+" |"),
    "",
    "## Próximo passo operacional",
    "",
    "A fonte oficial de serviços elegíveis, a revogação independente e o SSO empresarial",
    "devem ser homologados no Portal. O aceite editorial e a homologação privada exigem",
    "evidência humana/operacional própria. Nenhum script pode mudar os gates sozinho.",
    "",
    "**NÃO É APROVAÇÃO, PUBLICAÇÃO, CHECKOUT OU PROVA DE PAGAMENTO.**",
    "",
  ].join("\n");
  const csv=[
    "gate,titulo,area_sugerida,proxima_evidencia,status,evidencia",
    ...gates.map(g=>[g.key,g.title,g.suggested_area,g.next_evidence,g.status,g.evidence_ref??""].map(quote).join(",")),
    "",
  ].join("\n");
  return {snapshot,markdown:md,csv};
}

// A matching HEAD and matching selected Git blobs are not sufficient: an
// earlier CI step could add a new, untracked PHP/config file inside the Docker
// build context without changing any tracked SHA. Refuse a non-clean checkout
// before emitting a source provenance report. Do not print file names or data.
export function requireCleanReleaseCheckout(root){
  // Never trust Git checks when environment variables can redirect Git to a
  // different, clean worktree or index. GIT_WORK_TREE, for example, makes
  // status/ls-files inspect another directory while Node packages THIS one.
  // A caller-supplied Git configuration can likewise change inspection.
  const routingVariables=new Set([
    "GIT_WORK_TREE","GIT_DIR","GIT_COMMON_DIR","GIT_INDEX_FILE",
    "GIT_OBJECT_DIRECTORY","GIT_ALTERNATE_OBJECT_DIRECTORIES",
    "GIT_CEILING_DIRECTORIES","GIT_GRAFT_FILE","GIT_NAMESPACE",
    "GIT_NO_REPLACE_OBJECTS","GIT_REPLACE_REF_BASE","GIT_SUPER_PREFIX",
    "GIT_CONFIG_COUNT","GIT_CONFIG_PARAMETERS","GIT_CONFIG_GLOBAL",
    "GIT_CONFIG_SYSTEM","GIT_CONFIG_NOSYSTEM"
  ]);
  if(Object.keys(process.env).some(key=>routingVariables.has(key)||
    /^GIT_CONFIG_(?:KEY|VALUE)_[0-9]+$/u.test(key))){
    // Never echo the override value, path, source name or credentials.
    throw new Error("Refusing readiness package: untrusted Git routing environment");
  }
  // An attacker can set core.worktree in the repository's own .git/config,
  // without any GIT_* environment override. Git status then inspects that
  // alternate clean directory while the readiness package reads THIS root.
  // Confirm the effective Git top-level is this exact canonical checkout.
  let effectiveRoot;
  let requestedRoot;
  try{
    const top=execFileSync("git",["rev-parse","--show-toplevel"],{
      cwd:root,encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5000,
      maxBuffer:8*1024*1024
    }).trim();
    requestedRoot=realpathSync(root);
    effectiveRoot=realpathSync(top);
  }catch{
    throw new Error("Refusing readiness package: Git worktree root cannot be verified");
  }
  if(effectiveRoot!==requestedRoot){
    throw new Error("Refusing readiness package: Git worktree root mismatch");
  }
  const status=execFileSync("git",["status","--porcelain=v1","--untracked-files=all"],{
    cwd:root,encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5000,
    maxBuffer:8*1024*1024
  });
  if(status.length!==0){
    throw new Error("Refusing readiness package: tracked or untracked source drift");
  }
  // Git's assume-unchanged and skip-worktree index bits can hide altered
  // tracked PHP from --porcelain even when HEAD still matches GITHUB_SHA.
  // A release checkout may not suppress inspection of any tracked source.
  const indexFlags=execFileSync("git",["ls-files","-v","-z"],{
    cwd:root,encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5000,
    maxBuffer:8*1024*1024
  });
  if(indexFlags.split("\0").some(entry=>entry.length>0&&!entry.startsWith("H "))){
    throw new Error("Refusing readiness package: hidden Git index flags");
  }
  // git status suppresses .gitignore matches. Laravel's ignored PHP bootstrap
  // cache was otherwise accepted despite being eligible for Docker COPY.
  // Refuse that hidden input even if future .dockerignore rules drift.
  const ignoredCache=execFileSync("git",[
    "ls-files","--others","--ignored","--exclude-standard","--","bootstrap/cache"
  ],{
    cwd:root,encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5000,
    maxBuffer:8*1024*1024
  });
  if(ignoredCache.length!==0){
    throw new Error("Refusing readiness package: ignored build-context cache files");
  }
  // A local .git/info/exclude, global Git excludes or .gitignore can hide
  // otherwise untracked PHP/configuration under Docker's allowed COPY trees.
  // They are invisible to porcelain status and to the bootstrap-only check.
  // Refuse ignored inputs in reviewed source trees, regardless of which
  // local ignore rule matched. Safe false positives must fail closed.
  const ignoredSources=execFileSync("git",[
    "ls-files","--others","--ignored","--exclude-standard","--",
    "app","bootstrap","database","routes","resources","content",
    "tests","scripts","public","ops"
  ],{
    cwd:root,encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5000,
    maxBuffer:8*1024*1024
  });
  if(ignoredSources.length!==0){
    throw new Error("Refusing readiness package: Git-ignored build source");
  }
}

// Explicitly hashed review inputs, NOT a container image digest or SBOM.
// Git HEAD identifies the full tree; these separate hashes let reviewers
// confirm that the Docker context filter and executable image configuration
// belong to the same reviewed checkout as the release gates.
export const reviewedSourceFiles=Object.freeze([
  ".dockerignore",
  "composer.json",
  "composer.lock",
  "ops/release-gates.json",
  "ops/staging/compose.yaml",
  "ops/staging/Dockerfile.php",
  "ops/staging/Dockerfile.nginx",
  "ops/staging/nginx.conf",
  "ops/qa/Dockerfile"
]);

// Compare the exact bytes used in a source package against the pinned Git
// objects, not only path names or the commit hash. Called AFTER clean-checkout
// and safe-Git-environment admission in the CLI (see requireCleanReleaseCheckout).
export function readPinnedGitSourceBytes(root,sha,names){
  assert.match(sha,/^[a-f0-9]{40}$/iu,"Invalid pinned commit SHA");
  const pinned=new Map();
  for (const name of names){
    const committed=execFileSync("git",["show",sha+":"+name],{
      cwd:root,stdio:["ignore","pipe","pipe"],timeout:5000,maxBuffer:16*1024*1024
    });
    const current=readFileSync(join(root,name));
    if(!current.equals(committed)){
      throw new Error("Source file differs from exact checked-out Git commit: "+name);
    }
    pinned.set(name,committed);
  }
  return pinned;
}

// A lexical RUNNER_TEMP prefix is not an isolation guarantee: a pre-existing
// symlink at the output path can redirect generated reports outside runner temp.
// Only create a fresh, immediate child of the runner-owned temp directory.
// mkdirSync without recursive follows this preflight with an atomic EEXIST
// rejection if an unexpected entry appears before directory creation.
export function requireFreshReadinessOutput(temp,destination){
  const output=resolve(destination);
  if(!temp || dirname(output)!==resolve(temp) ||
    lstatSync(output,{throwIfNoEntry:false})!==undefined){
    throw new Error("Refusing readiness package: output must be a fresh direct runner temp child");
  }
  return output;
}

const selfPath=fileURLToPath(import.meta.url);
if(process.argv[1]&&resolve(process.argv[1])===selfPath){
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=="--out")throw new Error("Usage: --out RUNNER_TEMP/subdirectory");
  const temp=process.env.RUNNER_TEMP;
  const dest=resolve(args[1]);
  const ref=process.env.GITHUB_REF_NAME||"";
  // Cited #85 historical review remains supported; P0 successors may emit a
  // non-authoritative source package only on a branch-local GitHub Actions push.
  const allowedBranch=ref==="fix/uni-c108-private-flow-2026-11-17" ||
    /^review\/uni-p0-[a-z0-9-]+-20[0-9]{2}-[0-9]{2}-[0-9]{2}$/u.test(ref);
  if(process.env.GITHUB_ACTIONS!=="true"
    || process.env.GITHUB_EVENT_NAME!=="push"
    || process.env.GITHUB_REF_TYPE!=="branch"
    || process.env.GITHUB_REPOSITORY!=="rafhael100/imagine-universidade"
    || !allowedBranch
    || !temp){
    throw new Error("Readiness package permitted only for a checked-out P0 review push within runner temp");
  }
  const checkout=execFileSync("git",["rev-parse","HEAD"],{
    cwd:new URL("../",import.meta.url),encoding:"utf8",
    stdio:["ignore","pipe","ignore"],timeout:5000
  }).trim();
  const sha=process.env.GITHUB_SHA||"";
  if(!/^[a-f0-9]{40}$/iu.test(sha)||sha!==checkout){
    throw new Error("Refusing readiness package: checkout SHA does not match GitHub event SHA");
  }
  requireFreshReadinessOutput(temp,dest);
  // Covers non-ignored additions and changes, beyond the pinned source hash list.
  requireCleanReleaseCheckout(fileURLToPath(new URL("../",import.meta.url)));
  // A matching HEAD alone does not attest the working tree. A previous CI
  // step might have rewritten the manifest, dependency lock or release inputs.
  // Reject drift BEFORE writing a package, and hash bytes proven identical to
  // the exact commit (not arbitrary local workspace contents).
  const sourceFiles=reviewedSourceFiles;
  const guardedFiles=[...new Set([...sourceFiles,
    "scripts/build-university-readiness-pack.mjs",
    "ops/staging/release-gate-policy.mjs",
    "ops/staging/check-release-gates.mjs",
    "app/Providers/AppServiceProvider.php",
    "routes/web.php"
  ])];
  const root=fileURLToPath(new URL("../",import.meta.url));
  const exactBytes=readPinnedGitSourceBytes(root,sha,guardedFiles);
  const manifest=JSON.parse(exactBytes.get("ops/release-gates.json").toString("utf8"));
  const report=buildReadinessPack(manifest,sha);
  // These are source hashes only, not Docker digests, SBOM or deploy approval.
  const sum=buffer=>createHash("sha256").update(buffer).digest("hex");
  const sourceHashes=Object.fromEntries(sourceFiles.map(name=>[
    name,sum(exactBytes.get(name))
  ]));
  const provenance={
    schema_version:1,
    source_checkout_sha:sha,
    source_ref:ref,
    source_kind:"GIT_FILES_ONLY",
    source_commit_blobs_verified:true,
    runtime_image_digest_verified:false,
    production_approval:false,
    source_files_sha256:sourceHashes
  };
  mkdirSync(dest);
  writeFileSync(join(dest,"PENDENCIAS-LANCAMENTO.md"),report.markdown);
  writeFileSync(join(dest,"gates.csv"),report.csv);
  writeFileSync(join(dest,"readiness.json"),JSON.stringify(report.snapshot,null,2)+"\n");
  writeFileSync(join(dest,"source-provenance.json"),JSON.stringify(provenance,null,2)+"\n");
  const artifacts=["PENDENCIAS-LANCAMENTO.md","gates.csv","readiness.json","source-provenance.json"];
  writeFileSync(join(dest,"SHA256SUMS"),artifacts.map(name=>
    sum(readFileSync(join(dest,name)))+"  "+name).join("\n")+"\n");
  console.log("PASS readonly readiness pack at "+sha+": "+report.snapshot.gates_unverified+
    "/13 unverified, HOLD_NO_GO, source file/report SHA-256; no image digest, deploy or authority.");
}
