# UNI C-75 — Teste de fronteira Portal sem Composer

**16/11/2026 — DRAFT / NO-MERGE / NO-DEPLOY / HOLD_NO_GO**

## Resultado versionado
O `scripts/check-portal-context.php` importa os arquivos de domínio `PortalAuthority`, `PortalGrant` e `PortalAccessGate` diretamente, sem bootstrap Laravel, Composer, credenciais, cliente externo, banco, Docker ou rede. Exercita nove contextos inválidos (vazio, comprimento, bytes de controle, permissão e relógio) e exige que nenhum deles consulte a autoridade sintética; o décimo caso verifica a passagem válida.

O script está incluído no `scripts/check-local.sh` e em `.github/workflows/university-manual-qa.yml` na etapa de testes sem Composer. Não altera as rotas, permissão editorial, serviços elegíveis ou a política `UnavailablePortalAuthority` por padrão.

## Comandos
```bash
php -l app/Domain/Access/PortalAccessGate.php
php -l scripts/check-portal-context.php
php scripts/check-portal-context.php
node ops/staging/check-release-gates.mjs
node scripts/check-release-gate-policy.mjs
```

## Status de evidência
As alterações e os comandos são reais e estão registrados no repositório, porém nenhuma execução do workflow na nova revisão foi confirmada. A etiqueta `uni-qa-approved` foi aplicada à PR #81, mas o workflow não existe na branch `main` e nenhum run desse commit foi retornado pelo GitHub. Não declarar CI verde.

## Dependência
Permanece necessário vincular fonte oficial de serviços ativos, identidade SSO e revogação verificada por request (Portal #886); autorizações, staging real, revisões AppSec/DBA/LGPD e restore/rollback também continuam pendentes.

Sem merge, sem deploy e sem dados de cliente.
