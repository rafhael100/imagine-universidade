# UNI C179 — Importação de CSV sem corrida de leitura/modo

**19/11/2026 · DRAFT / HOLD_NO_GO**

## Risco
Antes, a importação offline lia o CSV de forma assíncrona e consultava o modo de importação só depois do await. Uma alteração do seletor de modo durante a leitura poderia converter uma mesclagem em substituição. Duas mudanças de arquivo disparadas simultaneamente poderiam ainda disputar a mesma sessão.

## Correção
O modo merge/replace é capturado no início da operação. Os controles de arquivo e modo ficam desabilitados durante a leitura e validação, e um segundo evento simultâneo é recusado. No finally, os controles voltam ao normal também após erro/cancelamento. A substituição continua exigindo confirmação, mesmo sem alterações anteriores; os 35 hashes e a regra de mesclagem atômica permanecem.

## Evidência
Teste Chromium intercepta File.arrayBuffer com Promise controlada, confirma bloqueio dos controles, recusa evento duplicado e prova que forçar programaticamente o modo replace durante a leitura não muda a operação original merge. Depois, confirma desbloqueio e uma revisão importada preservada.

Nenhuma importação autentica editor ou concede acesso. Portal #886 e os 13 gates NOT_VERIFIED mantidos. Sem merge, deploy, VPS, DNS, despesas ou dados reais.
