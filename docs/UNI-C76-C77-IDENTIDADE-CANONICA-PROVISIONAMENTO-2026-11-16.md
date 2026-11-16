# UNI C-76/C-77 — normalização dos identificadores Portal, progresso e provisionamento

**16/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY / HOLD_NO_GO**

## Código implementado
1. O `PortalAccessGate` exige a mesma gramática canônica de `org` e `sub` usada no verificador Ed25519 candidato: ASCII alfanumérico inicial, seguido de letras, dígitos, ponto, sublinhado, dois-pontos ou hífen (máximo de 80 bytes para organização e 120 para sujeito). Rejeita entrada de empresa antes de consultar Portal e rejeita grants malformados após consulta. Credenciais opacas ainda podem usar caracteres próprios, mas não bytes de controle.
2. `UniversityCatalogRepository::grantUsable` repete a restrição (defesa em profundidade), impedindo leituras, conclusão e exportação com grants construídos indevidamente em chamadas internas.
3. `UniversityTenantProvisioner::initialize` bloqueia identificadores malformados antes de `DB::transaction`. Continua sem criar organização real antes do Portal autorizar.
4. Testes PHPUnit acrescentados para ambos os casos; `scripts/check-portal-context.php` agora possui 17 cenários (12 requisições inválidas, quatro grants com sujeito malformado, um allow apenas sintético).
5. `scripts/check-provisioner-contract.php` possui 13 testes de negação sem Composer/banco e está integrado ao QA e ao smoke local.
6. Corrigida expectativa no antigo `scripts/check-access-domain.php`: ID de tenant maior que 80 bytes agora deve produzir `invalid_context` imediatamente, não `invalid_grant`.

## Verificação executada nesta rodada
Uma **reconstrução isolada do domínio PHP** (não o checkout integral do GitHub) foi executada com PHP 8.4:
- `php -l` dos trechos equivalentes de gateway e provisionamento — sem erros;
- simulação dos **17 cenários de fronteira** — PASS;
- simulação das **13 negativas de provisionamento** — PASS.

O espelho não é byte a byte igual aos arquivos da PR; não é evidência de PHPUnit ou da aplicação completa. **CI do commit da PR e PostgreSQL seguem sem execução confirmada.**

## Contrato e bloqueios
Há dois pontos independentes de confiança. O Portal [#886](https://github.com/rafhael100/imagine-portal/issues/886) ainda não forneceu a fonte oficial de contratos vigentes e revogação; sua [PR #882](https://github.com/rafhael100/imagine-portal/pull/882) ainda é um `preflight` não autorizador. Na Universidade, `UnavailablePortalAuthority` continua binding padrão deny-all.

Nenhum merge, mudança na VPS, publicação, cliente real, token, cobrança ou permissão SSO foi habilitado.

## QA reproduzível ao haver runner de revisão autorizado
```bash
php scripts/check-access-domain.php
php scripts/check-portal-context.php
php scripts/check-tenant-guard.php
php scripts/check-provisioner-contract.php
vendor/bin/phpunit --filter 'PortalAccessGateTest|UniversityTenantProvisionerTest|PortalBoundaryFlowTest'
node scripts/check-release-gate-policy.mjs
```
