# UNI C-26 — busca de cursos na área do cliente

**15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY**

## UX entregue

A área Cliente da Universidade ganhou campo **Buscar cursos**, rotulado,
acessível via teclado e sem envio de novos dados ao servidor. A busca
funciona sobre os cursos já autorizados recebidos pela API privada,
considerando título, resumo e nome da categoria. Os filtros de categoria
e texto são combináveis; a consulta é independente de maiúsculas e acentos.

O texto digitado fica somente no estado efêmero da página, limitado a
80 caracteres; não é persistido no navegador e não cria rotas abertas.
Trocar a busca desmarca a aula selecionada para evitar mostrar conteúdo
de um curso que ficou fora do filtro.

## QA

O contrato Node `scripts/check-ui-contract.mjs` passa a exercitar a
função pura de busca com casos sintéticos: acentos, títulos, resumos,
busca vazia, categorias combinadas e ausência de resultados, além de
verificar o campo rotulado. O script original continua conferindo
`textContent`, same-origin, CSRF, páginas privadas e `deny-all`.

Isso não substitui navegação real, leitores de tela ou homologação em
ambiente privado. Não houve alteração de backend, permissões ou cursos.
