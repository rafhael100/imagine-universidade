# UNI C191 — Controles Unicode C1 no revisor offline e CLI

**19/11/2026 · DRAFT · HOLD_NO_GO · sem publicação**

## Falha reproduzível
A validação anterior recusava DEL (U+007F), categoria Cf e controles ASCII, porém permitia U+0080–U+009F, inclusive NEXT LINE (U+0085) e CSI (U+009B), em observações e nomes de revisores. Esses caracteres podem alterar a apresentação de relatórios de texto e criar ambiguidades em outras ferramentas que leem CSV.

## Implementação
- O navegador e o CLI agora recusam U+007F–U+009F em texto não autenticado.
- Observações comuns com nova linha, tabulação e acentuação permanecem válidas.
- scripts/check-editorial-review-validation.mjs amplia 49 para 53 casos.
- scripts/qa-browser-editorial-offline.cjs cobre dois controles C1 nas notas e um no revisor.

A aprovação depende da CI da SHA exata; nenhum CSV autentica usuário ou libera cliente. Todos os 13 gates permanecem NOT_VERIFIED, HOLD_NO_GO; Portal #886 é bloqueador.
