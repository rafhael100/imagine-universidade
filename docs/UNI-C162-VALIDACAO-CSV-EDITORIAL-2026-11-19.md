# UNI C162 — Validar segurança do CSV mesmo fora da interface

O validador canônico `scripts/validate-editorial-review.mjs` agora
confere os mesmos limites de segurança que o revisor offline já aplicava
antes da exportação:

- Observações com no máximo 2.000 caracteres;
- Proibição de células que começam (inclusive após espaços) com
  `=`, `+`, `-` ou `@`, para impedir fórmulas em planilhas;
- Proibição de caracteres de controle não imprimíveis;
- Identificação do revisor sem quebra de linha ou fórmulas;
- Preservação de observações legítimas em várias linhas dentro do CSV citado.

A importação do CSV continua exigindo os 35 hashes originais e
nenhuma declaração `CLAIMED_HUMAN_APPROVED` vira aceite operacional.
A suíte amplia de 15 para 23 cenários positivos/negativos, sem importar
qualquer documento externo ou editar a fonte das aulas.

Esta mudança é somente validação de arquivos de revisão. Não concede
identidade, aprovação, serviço contratado ou publicação. **HOLD_NO_GO**.
