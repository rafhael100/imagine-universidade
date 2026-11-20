# ERD-R180–R184 — atalhos para as rubricas das 35 aulas

**DRAFT · ambiente sintético offline · HOLD_NO_GO · 13/13 NOT_VERIFIED.**

R180: cada uma das 35 aulas oferece link nativo para sua rubrica de seis perguntas (210 no total).
R181: cada destino é um aviso focável e visível, reiterando ausência de aceite autenticado; foco destacado por CSS.
R182: QA semântico por artigo, unicidade de 35 links/destinos, checagem byte a byte e seis mutações negativas.
R183: Chrome real valida Enter, foco, mobile a 390px, axe WCAG A/AA e ausência de HTTP/script.
R184: pipeline isolado com validação da HEAD exata, regressões herdadas e os 13 gates.

Reproduza localmente: 
    node scripts/check-editorial-rubric-jumps.mjs
    node scripts/check-editorial-fulltext-html.mjs
    node scripts/check-editorial-section-returns.mjs
    node scripts/check-release-gate-policy.mjs
    node ops/staging/check-release-gates.mjs

Testes sintéticos não são aceite humano de nenhuma aula, nem comprovam serviço ativo, identidade Portal, revogação ou autorização. Gate principal: https://github.com/rafhael100/imagine-portal/issues/886.

Sem merge, deploy, alterações em main/VPS/DNS, SSO, grants reais, dados de clientes ou despesas.
