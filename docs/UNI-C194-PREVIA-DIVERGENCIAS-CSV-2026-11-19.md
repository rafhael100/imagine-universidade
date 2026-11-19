# UNI C194 — Prévia de identidades no diálogo de substituição CSV

**19/11/2026 · DRAFT · HOLD_NO_GO**

## Risco tratado
Antes, o modo Substituir informava apenas a quantidade de aulas divergentes. Uma confirmação involuntária poderia descartar trabalho sem que o revisor soubesse quais aulas seriam alteradas.

## Correção
- O diálogo lista até cinco IDs reais curso/aula que serão substituídos e contabiliza os restantes.
- Identidades derivam do manifesto validado por hash, não de observações não autenticadas.
- Confirmação humana continua obrigatória; CSV idêntico não gera diálogo nem substitui estado.
- Regressão Chromium verifica a lista de IDs antes de o usuário cancelar a substituição.

HOLD_NO_GO, 13 gates NOT_VERIFIED, Portal #886 sem fonte oficial. Nenhuma aprovação/publicação.