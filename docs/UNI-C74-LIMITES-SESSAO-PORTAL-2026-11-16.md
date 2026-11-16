# UNI C-74 — Limites de contexto da sessão Portal

**16/11/2026 — DRAFT / NO-MERGE / NO-DEPLOY / HOLD_NO_GO**

## Problema
A fronteira `PortalAccessGate` já rejeitava credenciais vazias, permissões desconhecidas e grants inválidos. Contudo, não aplicava limite ao tamanho da credencial de sessão nem verificava bytes de controle antes da chamada à autoridade Portal. Empresa recebida da sessão backend também poderia exceder o limite de coluna/contrato antes da verificação.

## Implementação
- `app/Domain/Access/PortalAccessGate.php` rejeita credencial de sessão com mais de 4096 bytes, ID da empresa com mais de 80 bytes e bytes de controle ASCII em ambos (`0x00–0x1F`, `0x7F`).
- Continua exigindo valor não vazio, época válida e permissão explícita `university:view` ou `university:manage`.
- A verificação continua somente com autoridade backend; não lê cabeçalhos do navegador, não instala SSO e não faz grant operacional.
- `tests/Unit/PortalAccessGateTest.php` recebe sete negativos de limites, nulidade, controle, permissão ou relógio inválidos, todos exigindo **zero** consultas à autoridade falsa.

## Como validar
```bash
vendor/bin/phpunit --filter PortalAccessGateTest
node ops/staging/check-release-gates.mjs
node scripts/check-release-gate-policy.mjs
```

A classe PHP precisa ser validada na matriz do runner descartável autorizado. Um smoke local isolado do padrão PCRE de controle retornou 0 para token normal e 1 para newline, NUL e tab; isso **não substitui** PHPUnit ou testes Laravel da branch.

## Gates atuais
`UnavailablePortalAuthority` permanece padrão deny-all; a fonte de serviço ativo e revogação do Portal [#886](https://github.com/rafhael100/imagine-portal/issues/886) ainda não foi homologada. Nenhuma execução de workflow da branch foi confirmada nesta rodada. Não houve alteração de `main`, deploy, configuração da VPS, credencial ou cobrança.

## Próximo passo operacional condicionado
O `pull_request:labeled` não iniciou workflow verificável porque a definição do workflow ainda não está em `main`. Não realizar merge de código amplo só para testar. Opções a avaliar com revisão de segurança: execução manual do script no clone em sandbox autorizado, ou introdução isolada do workflow de QA (sem deploy) em `main` mediante gate separado.
