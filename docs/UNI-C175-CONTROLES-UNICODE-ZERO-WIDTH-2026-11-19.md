# UNI C175 — Unicode invisível e prefixos de fórmula no CSV editorial

**Data:** 19/11/2026. **Ambiente:** pacote local `file://`, CSV sintético, sem API nem serviços reais.

## Falha que a revisão anterior não cobria

A validação C172 bloqueava controles bidirecionais de apresentação, mas permitia certos caracteres Unicode de largura zero. Isso possibilitava disfarçar nomes de revisores, comentários e prefixos de fórmula, por exemplo `U+200B` seguido por `=`. Também não rejeitava um `U+FEFF` no meio de uma célula. Esses caracteres não são necessários para as observações editoriais correntes.

## Alteração em paridade

O navegador offline e a ferramenta CLI recusam `U+200B..U+200F`, `U+2028..U+202E`, `U+2060..U+2069` e `U+FEFF` dentro das células de observação e revisor. Preservam acentos, português, CSV com BOM inicial legítimo, aspas escapadas e observações multilinha.

- 6 novos casos negativos na validação estrutural (31 → 37): zero-width space, word joiner e BOM interno em observações; prefixo invisível de fórmula; dois tipos de falsificação de nome do revisor.
- Chromium real: um CSV com fórmula escondida é rejeitado sem perder nenhuma das duas revisões locais e exportação de nota contaminada é recusada.
- C174: confirmação obrigatória para substituição de CSV mesmo em editor limpo continua exercitada na mesma suíte.

## Limites de decisão

A validação de campos não verifica a identidade da pessoa revisora, a evidência GitHub nem qualquer contrato. **DRAFT / HOLD_NO_GO** e os 13 gates mantidos sem alteração; Portal #886 e aceite editorial humano continuam obrigatórios. A CI da HEAD exata, com `[uni-full-qa]`, é a evidência técnica aplicável, jamais autorização de produção.
