# UNI C169 — Reconciliação da main sem executar merge

Leitura de 19/11/2026, sobre a candidata
`ad42bd8a7bf85592888643b1f9e45ccbca315c3b` e a main
`dac4e242981fb57e4abfbbe68f7fd5d79ebd0b04`:

- Base comum: `a0cba481b7db75e4509d8ed00c410948cb92d3e5`.
- Na consulta, a candidata tinha 503 commits exclusivos e a main 13
  commits exclusivos. A API de comparação limitou a exibição da
  candidata aos 300 primeiros arquivos; não tratar como listagem total.
- Os 13 commits exclusivos da main alteravam sete arquivos.
- Seis documentos de governança aparecem na história de ambos os
  lados, mas os hashes Git dos blobs são **idênticos**.
- O único arquivo com blob divergente entre esses sete é
  `README.md`. O corpo histórico é comum; a candidata substitui
  o cabeçalho de planejamento por contexto explícito de desenvolvimento
  DRAFT, inclui o link para a PR #85 e a prévia offline de 35 aulas.
- Não foi executado merge, rebase, resolução automática ou mudança de
  branch principal.

`scripts/check-main-governance-parity.mjs` recalcula os hashes Git
das seis decisões/documentos e falha caso seu conteúdo se altere
em relação à main auditada. O script também verifica que o README da
candidata identifica desenvolvimento em curso e release gates.

A verificação fixa uma fotografia histórica da main: se ela avançar
novamente, a análise de integração precisa ser repetida. A prova
não certifica que um merge eventual seria isento de conflitos nem
aprova deploy. Todas as etapas operacionais dependem dos 13 gates,
Portal #886 e revisões independentes. **HOLD_NO_GO.**
