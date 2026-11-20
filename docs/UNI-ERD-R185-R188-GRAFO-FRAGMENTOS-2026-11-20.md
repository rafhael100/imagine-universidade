# ERD-R185–R188 — auditoria do grafo de links do leitor offline

**DRAFT · 35 aulas em rascunho, 210 perguntas · HOLD_NO_GO · 13/13 NOT_VERIFIED.**

R185: inventaria todos os IDs HTML e todos os links internos do leitor das 35 aulas, rejeitando IDs duplicados, destinos inexistentes e URLs externas.
R186: exige destino semanticamente focável (main, article, h3, h4 ou p com tabindex -1) para cada fragmento. Oito mutações negativas cobrem links quebrados, foco ausente, URL remota, IDs inválidos e alegação de GO.
R187: a conferência continua byte a byte ligada às 35 fontes de versão e jamais marca revisão humana como concluída.
R188: workflow isolado, SHA exata, regressões herdadas e confirmação dos 13 gates bloqueados.

Reprodução: 
    node scripts/check-editorial-fragment-graph.mjs
    node scripts/check-editorial-rubric-jumps.mjs
    node scripts/check-editorial-fulltext-html.mjs
    node scripts/check-release-gate-policy.mjs
    node ops/staging/check-release-gates.mjs

Auditoria estrutural não substitui teste de leitor de tela ou homologação do Portal. Fonte oficial de serviços ativos e revogação: https://github.com/rafhael100/imagine-portal/issues/886.

Sem merge, deploy, main, VPS, DNS, SSO, grants reais, clientes ou custos.
