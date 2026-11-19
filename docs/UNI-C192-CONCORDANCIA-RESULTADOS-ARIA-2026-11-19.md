# UNI C192 — Concordância de resultados para leitores de tela

**19/11/2026 · DRAFT · HOLD_NO_GO**

## Defeito visível
Com apenas um resultado, o campo live de acessibilidade anunciava '1 aulas encontradas neste filtro'. A informação quantitativa estava certa, mas a concordância atrapalhava clareza dos anúncios em português.

## Correção e regressões
- Para exatamente um item, o leitor recebe '1 aula encontrada neste filtro'.
- Para zero ou múltiplos itens, o texto usa '0 aulas encontradas' ou 'N aulas encontradas'.
- Teste real do Chromium reforça 1 resultado por status e zero por busca; a proteção C177 contra anúncios duplicados continua preservada.
- Nenhuma alteração de acesso, status de contrato, identidade ou informação de cliente. Todos os 13 gates seguem NOT_VERIFIED/HOLD_NO_GO e Portal #886 continua pendente.

A CI da SHA consolidada deve passar antes de declarar a entrega homologada.