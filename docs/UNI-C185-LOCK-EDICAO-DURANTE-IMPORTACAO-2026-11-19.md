# UNI C185 — Importação offline sem corrida com edição humana

**19/11/2026 · DRAFT · HOLD_NO_GO · laboratório sintético**

## Problema
A C179 bloqueava importação reentrante e mudança de modo, mas uma leitura de CSV via `File.arrayBuffer()` pode durar tempo suficiente para uma pessoa alterar os quatro campos da aula. Essa concorrência dificulta atribuir alterações e pode criar rascunhos inconsistentes.

## Implementação
Durante leitura/validação, situação, revisor, link de evidência e notas ficam desabilitados. O handler de edição rejeita também eventos `input` forçados via DOM e restaura os valores a partir do `Map` das 35 aulas, sem alterá-lo. O `finally` reabilita os controles mesmo quando o CSV é recusado. Não há armazenamento automático ou conexão de rede.

## Evidência
`scripts/qa-browser-editorial-offline.cjs` retarda `File.arrayBuffer()` em Chromium, testa os quatro controles bloqueados e tenta forçar observação por evento DOM, exigindo a preservação de 35 pendentes. Testa também reabilitação ao fim. Verificar a CI da SHA exata antes de afirmar aprovação.

Nenhum aceite editorial autenticado, permissão real, merge, deploy, DNS ou VPS.
