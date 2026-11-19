# UNI C172 — Segurança de revisão editorial: controles Unicode invisíveis

**Data:** 19/11/2026. **Escopo:** laboratório editorial offline, sem API externa, alteração do Portal ou publicação.

## Problema reproduzível

O CSV validava fórmulas e controles ASCII, mas aceitava caracteres Unicode que podem inverter ou isolar visualmente partes do nome da pessoa revisora e das observações, como U+202E (RIGHT-TO-LEFT OVERRIDE), U+2067 (RIGHT-TO-LEFT ISOLATE) e marcas direcionais U+200E/U+200F. O validador do navegador também permitia U+2028/U+2029 no nome, embora o validador CLI os proibisse. Isso criava inconsistência entre exportação e validação posterior.

## Alteração

- O navegador e o validador CLI recusam os mesmos controles de apresentação invisíveis: U+200E, U+200F, U+2028..U+202E e U+2066..U+2069 nas observações e no campo de pessoa revisora.
- Preservados textos comuns em português, quebras de linha normais em observações e todas as 35 identidades/hashes originais de aula.
- O CSV adulterado é rejeitado **antes** da mesclagem; nenhuma das revisões locais pode ser sobrescrita na falha. Exportação igualmente recusa células contaminadas.
- Testes adicionais no verificador canônico: override, isolate, marca de direção, spoofing de revisor, separador de linha Unicode e regressão positiva de diacríticos. Testes no Chromium: rejeição de importação com revisão existente e veto de exportação de observação/revisor adulterado.

## Aceite e limites

**A validar na SHA exata:** `node scripts/check-editorial-review-validation.mjs`, `node scripts/check-editorial-offline-review.mjs`, QA do Chromium e CI completa `[uni-full-qa]`. A eventual passagem dos testes não constitui aprovação humana, nem autoriza acesso real, SSO, merge, publicação ou deploy. `ops/release-gates.json` e Portal #886 permanecem `HOLD_NO_GO`.
