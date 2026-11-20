# UNI ERD-R116–R119 — distinção acessível da fila e do currículo (20/11/2026)

**PR DRAFT / sem publicação.** A lista de triagem editorial prioriza alertas heurísticos, de modo que a primeira aula da lista nem sempre é a primeira aula do curso. Anteriormente a etiqueta **“Aula 1 de 35”** no cabeçalho podia ser confundida com a numeração curricular, enquanto as âncoras eram construídas pelo número **original** da aula.

## Entregas
- **R116 — interface navegável:** o índice exibido e os títulos `h2` declaram duas posições distintas: `Fila N de 35` e `aula M no currículo`. A âncora e o `aria-labelledby` permanecem associados ao índice curricular original, sem troca de IDs ou inclusão de scripts.
- **R117 — acessibilidade:** verificação dos 35 links, 35 títulos, destinos únicos, paridade da indicação de posição e escapamento de conteúdo HTML.
- **R118 — integridade:** execute o verificador byte a byte da fonte sintética. Alterações de rótulos dependem da mesma versão do renderizador; HTML antigo não é aceito pela nova versão (não é autenticação nem assinatura).
- **R119 — QA independente:** workflow na SHA exata, checks de HTML, proveniência, política de gates e integridade de branch. Sem npm, serviços externos, acessos a clientes ou produção.

## Executar
```sh
node scripts/check-priority-readable-order.mjs
node scripts/check-editorial-priority-html.mjs
node scripts/check-verify-editorial-priority-html.mjs
node scripts/check-verify-editorial-review-handoff.mjs
node scripts/check-release-gate-policy.mjs
node ops/staging/check-release-gates.mjs
```

**Limites:** teste automatizado de nomes acessíveis, não substitui homologação manual de leitor de tela. 35 aulas/210 itens continuam exigindo revisão pedagógica humana autenticada. [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) permanece bloqueando fonte de serviços elegíveis, identidade e revogação. `HOLD_NO_GO` com 13/13 `NOT_VERIFIED`; não habilitar grants, SSO, cobrança, merge nem deploy.
