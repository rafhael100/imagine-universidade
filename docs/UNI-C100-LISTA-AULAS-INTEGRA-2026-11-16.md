# UNI C-100 — lista de aulas íntegra antes de autorizar edição

**16/11/2026 | Universidade Imagine | PR #81 DRAFT | somente em laboratório**

## Problema

A interface administrativa considerava `lessons: null`, propriedades ausentes e aulas com identificadores repetidos como se fosse uma lista vazia legítima. Isso poderia habilitar a edição de curso, exclusões, criação de aulas ou publicação sem uma leitura confiável da versão editorial vigente.

## Correção aplicada

- A função `validatedAdminLessons` verifica a resposta integral: `lessons` deve ser vetor de até 5.000 itens, cada um com ID numérico positivo único, slug único válido, título, texto limitado a 30.000 caracteres, ordem, estado de versão (`draft`, `published`, `archived`) e indicador de publicação aceito.
- Reconstrói o objeto com apenas campos editoriais aprovados, descartando campos extras de identidade/empresa.
- Mantém `lessonsReady=false` até receber lista válida do curso selecionado. Enquanto isso, impede gravações de qualquer tipo referentes a esse curso, incluindo publicar ou retirar do ar.
- Se a resposta HTTP 200 vier malformada, a tela mostra indisponibilidade e botão **Tentar carregar aulas**; não mostra falsamente `Nenhuma aula cadastrada`.
- Só a nova leitura válida pode marcar `lessonsReady=true`. A lista vazia explícita `lessons: []` é permitida e não é confundida com erro.
- Uma nova criação de curso pode continuar quando a lista geral de cursos estiver válida, sem exigir lista de aulas de curso ainda inexistente.
- HTTP 403/419 continua revogando toda a sessão, desabilitando qualquer retry.

## Testes

`scripts/check-ui-contract.mjs` executa a função pura com lista válida/vazia, campos extras, ausência/nulidade de lista, duplicação de ID/slug e dados inválidos. `scripts/qa-browser-synthetic.cjs` verifica HTTP 200 com duas aulas de mesmo ID: nenhuma aula renderizada, controles de edição/publicação bloqueados e recuperação manual a partir de nova resposta sintética válida.

## Liberação

Este hardening não autoriza usuários reais, não publica cursos e não muda o controle do Portal. Permanecem os 13 gates `HOLD_NO_GO`: fonte oficial de serviço ativo, SSO/MFA, política comercial, revogação operacional, AppSec/DBA/LGPD, revisão editorial e homologação VPS.
