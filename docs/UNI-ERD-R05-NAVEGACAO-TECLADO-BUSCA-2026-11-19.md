# UNI ERD-R05 — Navegação por teclado nos resultados editoriais

**19/11/2026 · DRAFT · HOLD_NO_GO · NO-MERGE / NO-DEPLOY**

## Comportamento
O filtro e a busca da prévia `file://` apontam para o grupo nomeado `review-results` via `aria-controls`; a busca expõe a contagem via `aria-describedby`. Apenas resultados filtrados e títulos não confidenciais integram os botões, sem expor nomes e observações.

- **Seta para baixo** na busca foca a primeira aula, quando houver resultados; com lista vazia mantém o foco.
- **Setas para baixo/cima** nos botões navegam; seta para cima no primeiro volta ao campo de pesquisa.
- **Home/End** vão ao primeiro/último resultado; **Escape** retorna à pesquisa sem apagar o filtro.
- **Enter/Espaço** conservam a ativação nativa do botão, abrindo a aula e focando o título `h1`.

## Regressões versionadas
`scripts/qa-browser-editorial-offline.cjs` prova vínculo `aria-controls`, lista de **34 aulas pendentes** após marcar uma aula como `NEEDS_CHANGES`, sequência das setas, Home/End, Escape, Enter e foco final em `#title`. Execução de Chromium e auditoria axe devem ser verificadas na SHA final; os testes não autenticam os dados de revisor.

Preservar CSP offline, sem fetch, login, grant, custo, edição de `main`, merge ou deploy. A Universidade continua `HOLD_NO_GO` / 13 gates `NOT_VERIFIED` enquanto [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) não for homologada.
