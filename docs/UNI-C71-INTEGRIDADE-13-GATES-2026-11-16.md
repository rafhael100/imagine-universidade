# UNI C-71 — Integridade dos 13 gates operacionais

**16/11/2026 — DRAFT / NO-MERGE / NO-DEPLOY / HOLD_NO_GO**

## Problema corrigido
O checker anterior aceitava qualquer lista com pelo menos 13 entradas e verificava nominalmente apenas um dos gates. Assim, uma edição acidental poderia apagar um requisito crítico e substituí-lo por uma entrada fictícia, mantendo a contagem verde.

## Alteração
`ops/staging/check-release-gates.mjs` passa a exigir exatamente os **13 nomes canônicos** do manifesto, sem campos desconhecidos em cada gate. O CI continua recusando valores fora de `NOT_VERIFIED` e `VERIFIED`; evidências para `VERIFIED` precisam ser referências rastreáveis ao GitHub do proprietário, não texto solto. São conferidos explicitamente dois estados de segurança que **não podem ser avançados só por editar JSON**: serviço ativo oficial e aprovação da implantação, ambos ainda `NOT_VERIFIED`.

Permanece obrigatória a vinculação `PortalAuthority → UnavailablePortalAuthority` e `TutorGateway → DisabledTutorGateway`, além da ausência de rotas públicas de identidade inventadas.

## Limitações e verificações
- Alteração versionada na branch cumulativa de revisão da PR #81.
- Esta entrega é de **endurecimento estático do gate**, sem ativar serviços nem aprovar pessoas ou contratos.
- O controle de formato de URL não prova a legitimidade, independência ou suficiência de uma evidência; essa validação segue humana.
- Executar `node ops/staging/check-release-gates.mjs` no QA autorizado; verificar caso positivo e casos negativos (remoção/renomeação de gate, status inválido, aprovação de deploy sem revisão, provider não seguro).
- Não houve execução comprovada da suíte completa nesta entrega, nem revisão independente, homologação VPS, merge ou deploy.

## Sequência P0
1. Concluir contrato oficial de elegibilidade e revogação com Portal [#886](https://github.com/rafhael100/imagine-portal/issues/886).
2. Validar SSO empresarial, permissões editoriais e isolamento multiempresa em ambiente privado.
3. Obter evidências independentes AppSec/DBA/LGPD, revisão pedagógica, restore/rollback e autorização final antes de qualquer GO.
