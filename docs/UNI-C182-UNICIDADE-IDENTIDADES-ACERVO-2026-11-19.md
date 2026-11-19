# UNI C182 — Unicidade e paridade de identidades na revisão offline

**19/11/2026 · DRAFT · HOLD_NO_GO · somente laboratório**

## Risco

A interface monta um `Map` de 35 chaves `course_slug/lesson_slug`. Um payload com duas aulas de mesmo ID e uma aula faltante ainda poderia passar na checagem de comprimento de 35 itens e transformar o `Map` em 34 revisões, sem aviso, caso o renderizador fosse reutilizado fora do gerador canônico.

## Correção

O renderizador agora recusa hashes que não contenham **exatamente 35** entradas únicas, recusa **qualquer ID de aula duplicado** no texto-fonte e comprova a paridade entre identidades das 35 aulas e o manifesto. A recusa acontece antes de emitir HTML e não causa publicação.

## Testes

`node scripts/check-editorial-offline-review.mjs` exercita payload sintético com segunda aula duplicada, mas comprimento total preservado, e manifesto com hash extra, exigindo falha explícita; também gera a página íntegra e valida CSP hash, 35 pendências e ambiente offline. O Chromium completo continua sendo a evidência de funcionamento visual, não substituída pelo teste unitário.

Sem dados reais, aprovação humana, alteração de `main`, SSO ou grants. A issue Portal [#886](https://github.com/rafhael100/imagine-portal/issues/886) e os 13 gates operacionais continuam bloqueadores.
