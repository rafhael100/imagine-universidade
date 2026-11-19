# UNI C186 — Exportação e confirmação protegidas durante importação

**19/11/2026 · DRAFT · HOLD_NO_GO · laboratório sintético**

## Problema
Enquanto um CSV de revisão está sendo lido, é perigoso emitir outro CSV, um resumo de coordenação ou reconhecer o salvamento de uma versão intermediária das 35 aulas.

## Implementação
Exportação CSV, resumo e confirmação de salvamento são desabilitados durante a importação e os handlers também recusam chamadas reentrantes. `finally` restaura os controles; uma confirmação de salvamento antes disponível é restaurada após falha/no-op somente se o snapshot permanece idêntico. Importações com alterações continuam invalidando a confirmação, exigindo nova exportação. A confirmação é uma declaração local, não prova de gravação, pessoa revisora ou aceite editorial.

## Evidência
Chromium verifica indisponibilidade dos controles durante leitura retardada e sua restauração. Um CSV adulterado por hash é recusado após exportação prévia; as observações e a opção de confirmar o arquivo previamente exportado devem sobreviver intactas. CI na HEAD exata é necessária.

Todos os 13 gates continuam `NOT_VERIFIED`, `HOLD_NO_GO`; a fonte oficial de serviços e revogação segue bloqueada em https://github.com/rafhael100/imagine-portal/issues/886.
