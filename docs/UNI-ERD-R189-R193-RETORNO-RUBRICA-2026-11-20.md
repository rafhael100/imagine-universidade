# ERD-R189–R193 — retorno ao texto depois da rubrica da aula

**DRAFT · 35 aulas e 210 perguntas em rascunho · HOLD_NO_GO · 13/13 NOT_VERIFIED.**

R189: cada bloco de seis perguntas oferece link para retornar à leitura da própria aula, preservando a ordem da fila e o currículo.
R190: auditoria associa os 35 links aos 35 títulos de texto focáveis e rejeita cinco mutações: aula errada, falta, duplicação, foco removido e falsa aprovação.
R191: integridade byte a byte da fonte, recusa de assinatura/aceite humano fictício e 0 grants.
R192: teste Chrome de Enter com 35 focos reais no título h3, viewport de 390px, axe WCAG A/AA e zero HTTP.
R193: workflow dedicado por branch, SHA exata, regressões herdadas e 13 gates.

Reprodução:
    node scripts/check-editorial-rubric-returns.mjs
    node scripts/check-editorial-fragment-graph.mjs
    node scripts/check-editorial-fulltext-html.mjs
    node scripts/check-release-gate-policy.mjs
    node ops/staging/check-release-gates.mjs

O teste não substitui homologação com leitor de tela ou aceite humano autenticado das 35 aulas. A autoridade de contratos ativos e revogação do Portal continua pendente: https://github.com/rafhael100/imagine-portal/issues/886.

Sem merge, deploy, main, VPS, DNS, SSO, grants reais, custos ou dados de clientes.
