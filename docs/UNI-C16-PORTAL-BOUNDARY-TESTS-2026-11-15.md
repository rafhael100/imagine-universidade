# UNI C-16 — testes da fronteira Portal / Universidade

**15/11/2026 · Somente testes sintéticos · NO-MERGE / NO-DEPLOY.**

## Objetivo

A homologação da [PR #24](https://github.com/rafhael100/imagine-universidade/pull/24) aprovou 47 testes PHPUnit, as migrações reais no PostgreSQL 18 e todos os checks SQL no runner descartável. O bloqueio real ainda é a autenticação/eligibilidade do Portal, que permanece **deny-all** em produção.

Esta rodada amplia a bateria HTTP para detectar regressões **antes** de conectar o emissor real de grants.

## Cobertura adicionada

`tests/Feature/PortalBoundaryFlowTest.php` contém sete testes Feature com SQLite em memória, usando uma implementação de `PortalAuthority` **inteiramente fictícia injetada apenas no Laravel TestCase**:

1. Headers, query e corpo com credenciais/empresa autodeclaradas não criam sessão nem acessam API.
2. Cliente e editor usam permissões diferentes; páginas privadas devolvem no-store e anti-frame.
3. Cancelamento do último serviço (simulado) impede novas leituras/escritas sem apagar o progresso histórico.
4. Troca do tenant na sessão, header e query forjados não dão acesso ao progresso de outra empresa.
5. Indisponibilidade do Portal durante sessão já estabelecida bloqueia novas operações.
6. Parâmetros de empresa/sujeito no corpo não provisionam outra empresa.
7. Revogação do editor bloqueia mutações, preservando conteúdos publicados.

A autoridade sintética só conhece usuários e empresas fictícios; não acessa credenciais, serviços ou cadastros reais, não cria login e não registra acessos operacionais. O binding padrão `UnavailablePortalAuthority` não foi alterado.

## Limites importantes

Esses testes avaliam **o comportamento da Universidade diante de decisões simuladas**, não certificam a identidade/sessão, a elegibilidade ou a revogação do Portal real. O uso de `PortalGrant::allow()` no teste não representa concessão de produção.

Não substituem testes reais de CSRF em navegador, assinatura/auth backend-to-backend, consistência transacional do autorizador de recurso, RLS, MFA e auditoria LGPD. Esses pontos continuam no [Portal #848](https://github.com/rafhael100/imagine-portal/issues/848).

## Execução

No workflow de homologação GitHub, o passo `vendor/bin/phpunit --testsuite Feature` executa automaticamente esse arquivo. Não exige editar o workflow ou liberar novos gatilhos. O acionamento deverá ocorrer **somente com a etiqueta uni-qa-approved em PR do próprio repositório com base main**, num runner com Postgres sintético e sem deploy.

**Sem merge, deploy, dados pessoais ou nova permissão concedida.**
