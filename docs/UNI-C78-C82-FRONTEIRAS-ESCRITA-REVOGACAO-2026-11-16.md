# UNI C-78 a C-82 — autorizações vivas em todas as mutações privadas

**16/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY / HOLD_NO_GO**

## Problema
A revalidação da autoridade Portal na entrada de uma requisição não impede que um contrato, um vínculo de empresa ou uma permissão editorial seja revogado durante uma operação lenta. Cursos publicados, dados editoriais, progresso e provisionamento não devem depender apenas do grant inicial.

## Alterações implementadas
- `UniversityCatalogRepository::freshWriteGrantMatches` exige novo `PortalGrant` válido, idêntico em empresa, sujeito, permissão e revisão, com expiração curta; callbacks ausentes, erros e retorno inválido resultam em recusa.
- Operações de escrita protegidas **antes da primeira mutação dentro da transação**: concluir aula, criar/editar/excluir cursos rascunho, criar/editar/excluir aulas rascunho e publicar/despublicar curso.
- `UniversityController` injeta `PortalAccessGate` nos nove métodos de escrita e chama `freshGrant` usando apenas os campos da sessão backend.
- `UniversityTenantProvisioner` exige nova decisão válida dentro da transação e antes de `insertOrIgnore`, completando **dez caminhos HTTP de escrita** revalidados.
- `scripts/check-write-fence.mjs` confere ligação e ordem da guarda em código, detectando métodos sem callback e guardas aplicadas acidentalmente ao método errado.
- Os testes `PortalBoundaryFlowTest` cobrem revogação durante registro de progresso, criação editorial, exclusão de aula rascunho e despublicação; chamadas internas sem callback; grants com tenant, sujeito, permissão ou revisão diferentes; e revogação da empresa durante inicialização.

## Evidências e limites
A inspeção remota do código GitHub identificou os oito métodos de escrita do repositório, os nove controladores e confirmou estruturalmente a presença das guardas antes do primeiro `INSERT/UPDATE/DELETE`. **Isso não equivale à execução PHPUnit, migrações PostgreSQL ou testes de concorrência reais.**

A nova `.github/workflows/uni-branch-qa-isolated.yml` contém execução de testes em runner descartável, disparada apenas quando o próprio arquivo é alterado na branch de revisão. Ela não permite merge, deploy, DNS, acesso à VPS, credenciais de produção ou pagamentos. Seu resultado deve ser confirmado no GitHub Actions; a API disponível aqui não expõe diretamente runs disparados por push e nenhum status positivo será presumido.

## Restrições importantes
A revalidação reduz a janela TOCTOU, mas **não estabelece atomicidade distribuída** entre PostgreSQL e uma futura fonte de contratos no Portal. A ativação exige: fonte oficial de serviços ativos e revisões de revogação (Portal [#886](https://github.com/rafhael100/imagine-portal/issues/886)), autenticação S2S, identidade de sessão confiável, revisão de timeout/locks, testes de cancelamento do último serviço, reembolso, concorrência e rollback. Não há provider real instalado: `UnavailablePortalAuthority` permanece deny-all.

## Testes recomendados no runner isolado
```bash
php scripts/check-access-domain.php
php scripts/check-portal-context.php
php scripts/check-tenant-guard.php
php scripts/check-provisioner-contract.php
node ops/staging/check-release-gates.mjs
node scripts/check-release-gate-policy.mjs
node scripts/check-write-fence.mjs
vendor/bin/phpunit --testsuite Unit
vendor/bin/phpunit --testsuite Feature
php artisan migrate:fresh --database=pgsql --force
php scripts/check-pg-flow.php
```

**Status:** código e testes versionados, CI da revisão mais recente ainda sem evidência confirmada. Nenhuma operação real habilitada.
