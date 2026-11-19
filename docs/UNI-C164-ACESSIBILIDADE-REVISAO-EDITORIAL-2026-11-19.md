# UNI C164 — QA de acessibilidade no revisor offline

O laboratório Chromium exercita o HTML real `revisao-navegavel.html`
com `@axe-core/playwright` e critérios WCAG 2.0/2.1 A/AA.
Rejeita violações sérias/críticas e anexa
`editorial-review-offline-axe.json` às evidências da CI.

Inclui navegação por teclado via Enter, viewport 320/390/768/1440
sem rolagem horizontal, além de todos os ensaios existentes de CSV,
reimportação, hashes, bloqueio de fórmulas e zero tráfego HTTP.

O código somente amplia a QA descartável; nenhuma implementação SSO,
banco, política de serviços ou gate é alterada.

**A aprovação de acessibilidade assistiva e editorial continua humana.**
HOLD_NO_GO / PR DRAFT / NO-MERGE / NO-DEPLOY.
