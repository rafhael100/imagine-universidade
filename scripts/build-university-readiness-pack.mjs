#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync, mkdirSync, writeFileSync} from "node:fs";
import {resolve, relative, sep, join} from "node:path";
import {fileURLToPath} from "node:url";
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

const quote=(value)=>'"'+String(value).replaceAll('"','""')+'"';

export function buildReadinessPack(manifest,sha){
  const missing=validateReleaseManifest(manifest);
  assert.match(sha,/^[a-f0-9]{40}$/i,"A concrete CI checkout SHA is required");
  const gates=requiredReleaseGates.map(key=>{
    const evidence=manifest.blocking_evidence[key];
    const [title,suggestedArea]=descriptions[key];
    return {key,title,suggested_area:suggestedArea,status:evidence.status,evidence_ref:evidence.evidence_ref};
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
    "| Critério | Área sugerida (não designada) | Estado | Evidência |",
    "|---|---|---|---|",
    ...gates.map(g=>"| "+g.title+" | "+g.suggested_area+" | "+g.status+
       " | "+(g.evidence_ref||"PENDENTE")+" |"),
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
    "gate,titulo,area_sugerida,status,evidencia",
    ...gates.map(g=>[g.key,g.title,g.suggested_area,g.status,g.evidence_ref??""].map(quote).join(",")),
    "",
  ].join("\n");
  return {snapshot,markdown:md,csv};
}

const selfPath=fileURLToPath(import.meta.url);
if(process.argv[1]&&resolve(process.argv[1])===selfPath){
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=="--out")throw new Error("Usage: --out RUNNER_TEMP/subdirectory");
  const tmp=process.env.RUNNER_TEMP;
  const dest=resolve(args[1]);
  if(process.env.GITHUB_ACTIONS!=="true"
    || process.env.GITHUB_REPOSITORY!=="rafhael100/imagine-universidade"
    || process.env.GITHUB_REF_NAME!=="fix/uni-c108-private-flow-2026-11-17"
    || !tmp || !resolve(tmp) || !dest.startsWith(resolve(tmp)+sep)){
    throw new Error("Readiness package only allowed in isolated reviewed GitHub Actions runner temp");
  }
  const manifest=JSON.parse(readFileSync(new URL("../ops/release-gates.json",import.meta.url),"utf8"));
  const report=buildReadinessPack(manifest,process.env.GITHUB_SHA||"");
  mkdirSync(dest,{recursive:true});
  writeFileSync(join(dest,"PENDENCIAS-LANCAMENTO.md"),report.markdown);
  writeFileSync(join(dest,"gates.csv"),report.csv);
  writeFileSync(join(dest,"readiness.json"),JSON.stringify(report.snapshot,null,2)+"\n");
  console.log("PASS readonly readiness pack: "+report.snapshot.gates_unverified+
    "/13 gates remain unverified; HOLD_NO_GO; no deployment or authority.");
}
