# UNI C177 — Contagens e navegação sem anúncios duplicados

**19/11/2026 · DRAFT / HOLD_NO_GO**

## Problema e correção
O revisor offline das 35 aulas/10 cursos atualizava os rótulos dos dez cursos e o contador aria-live de resultados a cada digitação de observações, mesmo quando não havia diferença visual. Esse comportamento pode gerar anúncios desnecessários para usuários de leitores de tela.

As atualizações de textContent passam a ocorrer somente quando o rótulo ou a contagem muda. Uma mudança real da aula pendente para ajustes continua atualizando a navegação.

## QA
A suíte Chromium registra MutationObserver nos rótulos do menu e no contador vivo, exige zero mutações para notas repetidas, atualização para mudança real de pendências e ausência de novo anúncio ao refinar busca sem alterar o total.

Sem rede, armazenamento automático, publicação ou autenticação de revisor. Todos os 13 gates seguem NOT_VERIFIED; Portal #886 permanece bloqueador.
