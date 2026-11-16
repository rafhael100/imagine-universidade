# UNI C-99 — catálogo editorial inválido não libera gravações

**16/11/2026 — Universidade Imagine, PR #81 DRAFT**

## Falha e correção

O painel editorial tratava todo HTTP 200 de `GET /admin/courses` como catálogo válido, mesmo quando `courses` estava ausente, nulo, duplicado ou com metadados inconsistentes. Isso podia diferenciar incorretamente "erro de dados" de "nenhum curso" e habilitar ações editoriais sem uma listagem confiável.

O novo `validatedAdminCourses` valida a coleção de ponta a ponta antes de colocar `catalogReady=true`:
- exige lista de até 5.000 registros e ID inteiro positivo **sem duplicações**;
- valida `slug`, título, categoria, resumo, ordem e status de publicação;
- reconstrói apenas campos editoriais permitidos, excluindo qualquer campo extra inadvertidamente incluído pela API;
- recusa payload malformado como erro de consulta: os formulários e a criação permanecem bloqueados, o catálogo não fica visível e uma nova consulta manual é oferecida;
- permite lista realmente vazia somente quando o backend devolve explicitamente `courses: []` válida.

A autorização efetiva de leitura/escrita continua sendo exclusivamente do servidor/Portal. A validação JS é uma proteção de consistência e UX, não um novo emissor de grants.

## Regressões

`scripts/check-ui-contract.mjs` cobre lista vazia válida, campos extras, duplicação de IDs, categoria, publicação, título, ordem e ausência de dados. `scripts/qa-browser-synthetic.cjs` entrega HTTP 200 sintético com IDs duplicados e verifica editor bloqueado, mensagem de indisponibilidade e recuperação após nova resposta íntegra.

## Bloqueadores de publicação

Nenhum requisito de produção foi afrouxado: fonte oficial de serviço ativo e revogação Portal #886, política SKU, SSO/MFA, revisão editorial e segurança, ambiente VPS e rollback permanecem `HOLD_NO_GO`. Sem merge ou deploy.
