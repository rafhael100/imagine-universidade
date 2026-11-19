# UNI C190 — Bloqueio estendido de controles Unicode invisíveis

**19/11/2026 · DRAFT · HOLD_NO_GO · QA offline sintético**

## Problema concreto
Além dos intervalos já recusados, o texto editável ainda aceitava caracteres praticamente invisíveis: soft hyphen (U+00AD), Arabic letter mark (U+061C), combining grapheme joiner (U+034F) e variation selector (U+FE0F). Eles podem causar confusão visual em nomes de revisores e anotações e esconder sinais relevantes.

## Correção
A validação do navegador e o validador CLI passam a rejeitar toda a categoria Unicode `Cf` e os controles invisíveis adicionais `U+034F`, `U+180E`, `U+2028/U+2029`, `U+FE00..U+FE0F` e `U+E0100..U+E01EF`. Acentos portugueses normais e observações com múltiplas linhas continuam válidos.

## QA esperado
`scripts/check-editorial-review-validation.mjs` ganha 8 casos negativos (41→49). Chromium cobre uma anotação com soft hyphen e um nome de revisor com Arabic letter mark, ambos recusados antes da exportação. A aprovação depende da CI da SHA exata.

Não há autenticação de pessoa revisora, autorização, publicação ou acesso de clientes. Os 13 gates seguem `NOT_VERIFIED`, `HOLD_NO_GO`; a fonte real no Portal #886 continua pendente.
