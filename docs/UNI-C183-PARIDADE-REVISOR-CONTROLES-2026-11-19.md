# UNI C183 — Paridade da validação de caracteres no revisor CSV

**19/11/2026 · DRAFT · HOLD_NO_GO · sem publicação**

## Falha identificada

O verificador Node rejeitava caracteres de controle ASCII C0/DEL no campo `reviewer`, enquanto o revisor offline só barrava quebra de linha, símbolos de direção invisíveis e fórmulas. Um nome colado com `U+0007` (BEL) ou `U+007F` (DEL) poderia ser exportado pelo navegador e recusado depois no validador, criando uma falsa impressão de pacote válido.

## Correção e regressão

`scripts/editorial-review-app.js` passa a bloquear os controles ASCII também no campo de nome, alinhando a regra do navegador ao validador canônico. A suíte Node adiciona casos negativos para BEL e DEL, e o Chromium tenta exportar com esses caracteres, exige o erro de nome inválido e restaura o rascunho legítimo antes da exportação normal. Status declarados continuam sem autenticação e nenhuma linha do CSV concede acesso.

## Critérios

Executar `node scripts/check-editorial-review-validation.mjs` e a bateria `scripts/qa-browser-editorial-offline.cjs` no laboratório sintético; conferir resultados da SHA exata. Não tocar na `main`, VPS, produção ou em grants. Os 13 gates continuam `NOT_VERIFIED` e a fonte oficial do Portal [#886](https://github.com/rafhael100/imagine-portal/issues/886) permanece pendente.
