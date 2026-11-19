# UNI ERD-R03 — Testes de privacidade e identidade no revisor

**19/11/2026 · DRAFT · HOLD_NO_GO**

O teste de ERD-R01 antes verificava somente a quantidade de itens encontrados pelo nome declarado do revisor. Ele agora exige que o nome não apareça no texto público do botão de resultado; continua sendo consulta inteiramente offline.

O teste de ERD-R02 antes aceitava qualquer string com barra como prévia de ID. Agora extrai o identificador real curso/aula da primeira linha do CSV exportado e exige que o diálogo apresente esse ID exato.

São regressões do Chromium real, sem rede, servidor, login real, publicação ou mudança no Portal. Execução na SHA exata permanece necessária. Gates NOT_VERIFIED/HOLD_NO_GO.