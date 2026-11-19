# UNI C-156 — Relatório de pendências gerado pela CI sem liberar produção

## Por quê

A Universidade possui 13 critérios independentes de liberação. É possível ter
PHP, PostgreSQL, navegador, imagens Docker e paridade com o Portal aprovados
em laboratório sem possuir contrato elegível oficial, SSO empresarial, aceite
editorial ou autorização de deploy. O resultado verde de um job não pode
converter essas pendências em `GO`.

## Entrega

- `scripts/build-university-readiness-pack.mjs` valida o manifesto
  canônico `ops/release-gates.json` com a política existente,
  sem consultar serviços externos ou permitir alterações dos gates.
- Gera `PENDENCIAS-LANCAMENTO.md`, `gates.csv` e `readiness.json`
  contendo os 13 critérios, status, evidências existentes e **áreas sugeridas**
  (não pessoas designadas).
- O status da CI é explícito como `NOT_EVALUATED_BY_THIS_REPORT`. O pacote
  nunca afirma `GO` nem valida o próprio job em que é produzido.
- Execução limitada a runner GitHub Actions autorizado e pasta temporária;
  nada se escreve em `main`, VPS, DNS, contas ou banco.
- O job de revisão editorial já existente anexa o pacote como **artefato
  distinto**, após a validação, evitando um novo runner.

## Verificações automatizadas

`scripts/check-university-readiness-pack.mjs` cobre 6 cenários: os 13
gates atuais, um gate não crítico hipoteticamente comprovado, tentativa
de declarar serviço ativo sem evidência, GO, gate ausente e SHA inválida.
O script de teste não altera o manifesto persistente.

Para obter aceite, exigir `validation` e `editorial-review-pack`
concluídos na **mesma HEAD**; os outros jobs de navegador/Docker/Portal
continuam a ter resultado separado, sem inferência de sucesso.

## Próxima dependência

Portal issue #886: fonte oficial de contratos e vigência, revisão/revogação,
política de elegibilidade por produto, SSO empresarial e testes de acesso
revogado. Exigem ainda aceite editorial, AppSec/DBA/LGPD, backup/rollback,
homologação privada e autorização humana de produção.

**HOLD_NO_GO / NO-MERGE / NO-DEPLOY / NO-CHARGE.**
