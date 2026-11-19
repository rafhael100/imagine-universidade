# UNI C176 — Acessibilidade: não repetir anúncios ARIA sem mudança

**Data:** 19/11/2026 · Escopo do revisor editorial `file://` para as 35 aulas.

## Problema

Os blocos de resumo e mensagem de situação usam `role=status` e `aria-live=polite`. Antes, cada digitação no campo de observações reescrevia ambos os nós, ainda que o resumo das situações e a mensagem fossem literalmente idênticos. Isso pode gerar anúncios repetidos e desnecessários em tecnologias assistivas.

## Correção

- Atualizar o texto de resumo e a mensagem apenas quando houver diferença real.
- Manter avisos quando a contagem muda, após importação, cancelamento ou erro.
- Não alterar validação, hashes, autorizações ou persistência; as revisões continuam somente em memória até exportação manual.

## Evidência Chromium

Um `MutationObserver` instalado nos dois nós `aria-live` verifica que dois eventos `input` sucessivos com a mesma situação não geram alterações no resumo/mensagem. Em seguida, a mudança de status para uma declaração de aprovação e de volta para ajustes precisa gerar anúncios de resumo, preservando a nota original e as regras de NO_GO. A suíte anterior cobre viewport, teclado e axe WCAG 2.1 A/AA.

**DRAFT / HOLD_NO_GO:** Portal #886, aceite humano e 13 gates não atendidos. Sem deploy, merge, dados reais ou autenticação editorial.
