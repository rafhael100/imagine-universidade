# UNI ERD-R04 — Estabilidade de resultados na busca editorial

**19/11/2026 · DRAFT · HOLD_NO_GO · NO-MERGE / NO-DEPLOY**

## Falha reproduzível e correção
Antes desta entrega, o revisor offline descartava e recriava **todos** os botões de resultados em `updateReviewResults()`, mesmo quando a digitação só trocava `VISITAS` por `VISITA` e o conjunto de aulas era idêntico. Essa operação remove o elemento focado do DOM, desperdiça trabalho e pode gerar anúncios desnecessários em tecnologia assistiva.

A implementação agora compara as identidades exatas `lessonIndex` com o resultado anterior, preserva os mesmos botões quando não houve mudança, reconstitui a lista quando realmente há diferença e atualiza `aria-current` mesmo sem reconstrução. Não altera nem autentica revisões ou dados de aula.

## Aceite e evidência exigida
- Teste Chromium na suíte `scripts/qa-browser-editorial-offline.cjs`: `VISITAS` → `VISITA` mantém a referência ao botão e **zero mutações `childList`** no grupo; a contagem `aria-live` também permanece silenciosa.
- Termo inexistente ainda produz zero resultados e a contagem acessível correspondente; mudança real de seleção continua atualizando `aria-current`.
- Executar a suíte na **SHA exata do draft**; verificação de sintaxe não substitui Chromium.

Nenhuma comunicação externa, armazenamento persistente, SSO, publicação ou autorização é adicionada. As 35 aulas continuam sem aceite humano e os 13 gates `NOT_VERIFIED`. Fonte oficial de serviço ativo e revogação: [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886).
