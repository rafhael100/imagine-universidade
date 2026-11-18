# C-131 — busca local de aulas no editor

Data de referência da rodada: **17/11/2026**. Implementação candidata para
integração e CI. Este recorte usa a lista editorial já autorizada e validada;
não cria endpoint, tabela, grant, escrita de preferência ou política de retenção.

## Necessidade e escopo

O editor já oferecia busca de cursos e a ordenação explícita de aulas C-129,
mas localizar uma aula ainda exigia percorrer a lista completa do curso. A busca
local aplica os temas de gestão de catálogo e busca de
[BASE-UNI-01-04, BASE-UNI-03-04 e BASE-UNI-03-06](08-fechamento-candidato/02-BASE-FUNCIONAL-14-MODULOS.md)
ao material editorial que o operador já pode consultar.

O campo **Buscar aula neste curso** encontra título ou identificador (`slug`)
salvos. A comparação reutiliza a normalização de caixa e acentos da busca de
cursos. Espaços nas extremidades da consulta são ignorados na comparação;
o valor digitado é mantido para exibição, limitado a 120 caracteres como o
controle HTML. Não há busca no corpo da aula, em outros cursos ou no arquivo
de versões.

A consulta existe somente no estado em memória da página. Filtrar ou limpar
não faz HTTP, não grava dados e não troca a aula selecionada. A interface
continua dependendo da autorização e da validação integral do catálogo e da
lista de aulas já existentes.

## Projeção da lista e preservação da edição

`state.lessons` permanece a lista completa e validada. A projeção de navegação
ordena uma cópia por `sort_order, id` e filtra apenas título e slug. Não altera
os objetos originais, os pares de ordem ou os dados usados por C-129.

Quando a aula em edição não corresponde à consulta, ela aparece antes dos
resultados com a indicação **Em edição · fora da busca**. Essa linha vem do
registro presente na lista autorizada, sem transformar valores ainda não salvos
do formulário em resultado de busca. A contagem considera somente as
correspondências: por exemplo, uma correspondência e uma aula fixada continuam
sendo **1 de 3 aulas**.

Cada posição mostrada pertence à lista completa, mesmo quando a aula fixada
é apresentada antes dos resultados. Com consulta não vazia, a mensagem informa:
**Subir e Descer consideram todas as aulas do curso.** Um movimento pode, assim,
trocar a aula com uma vizinha que não corresponde à busca. Os limites de Subir
e Descer também são os limites reais do curso, e não os da projeção visível.

Filtrar e limpar preservam literalmente os nove campos de curso e aula, a
seleção, a prévia local, a conferência de publicação e o conteúdo arquivado
aberto. Também preservam as gerações das consultas. Nenhum `fillCourse`,
`fillLesson`, reset de formulário ou invalidação de diagnóstico ocorre por
causa da busca.

A seleção de uma aula continua usando a confirmação de descarte existente.
Cancelar mantém os campos e a consulta. Aceitar troca apenas a seleção de aula
e preenche seu formulário, preservando o rascunho independente do curso.
Selecionar a aula que já está fixada não abre confirmação nem descarta texto.
O handler exige uma lista utilizável e um botão conectado, visível e contido
na lista atual; controles removidos por uma filtragem não selecionam outra aula.

## Ciclo da consulta e estados indisponíveis

O estado `lessonQueryCourseId` vincula a consulta ao curso selecionado. A busca
é mantida em uma leitura nova do mesmo curso e no sucesso de C-129. Trocar
efetivamente de curso, iniciar um curso novo ou perder a seleção de curso limpa
a consulta. Uma troca cancelada pela confirmação de descarte não a modifica.

Os controles ficam indisponíveis durante consulta em andamento, escrita
pendente, resultado de escrita incerto ou ausência de catálogo/lista válida.
Eventos programáticos de input ou limpar nesses estados não modificam a
consulta; o campo volta ao valor confirmado em memória. Um curso publicado
continua pesquisável, com os controles de edição e reordenação sujeitos às
restrições anteriores.

Três situações permanecem distintas:

| Situação | Exibição |
| --- | --- |
| Lista válida sem aulas | `Resultados: 0 de 0 aulas.` e `Nenhuma aula cadastrada.` |
| Lista válida sem correspondências | Contagem `0 de N`, aviso de ausência de correspondência e, se aplicável, aula em edição fixada |
| Lista ausente, inválida ou falha | Busca desabilitada e orientação para consultar as aulas; nenhum falso resultado vazio |

O limite anterior de **5.000 aulas no normalizador do editor** permanece
inalterado. Uma resposta com 5.001 aulas é recusada integralmente, sem truncar
a lista nem habilitar uma escrita baseada em dados parciais. Isso não modifica
o limite próprio da operação de reordenação no backend.

Conflito ou perda de resposta de C-129 preservam a busca, junto dos campos, mas
bloqueiam novas ações. A consulta manual continua exigindo a confirmação
existente sobre substituir campos não salvos. Depois de uma leitura completa
bem-sucedida, `loadAdminCatalog` renderiza novamente as aulas após retirar
`writeOutcomeUnknown`, e os controles são liberados depois de
`catalogLoading=false`. Essa renderização recupera a projeção sem repetir o
POST ou acrescentar outra consulta.

403 ou 419 seguem a limpeza integral já existente: a consulta local é apagada,
o identificador de seu curso é removido, as linhas são limpas e a mensagem de
busca fica vazia. Uma resposta atrasada não recupera a busca nem o conteúdo.

## Controles e arquivos

| Responsabilidade | Arquivo ou seletor |
| --- | --- |
| View e handlers reais | `resources/views/university/admin.blade.php` |
| Campo de busca | `#editorial-lesson-search` |
| Limpar busca | `#clear-editorial-lesson-filter` |
| Contagem e orientação | `#editorial-lesson-filter-status` |
| Aula fixada fora da busca | `#lesson-items [data-lesson-row][data-outside-filter='true']` |
| Seleção e ordenação | Seletores C-129 `[data-lesson]` e `[data-move-lesson]` preservados |
| Checker focal Node | `scripts/check-editorial-lesson-filters.mjs` |
| Módulo Chromium | `scripts/qa-browser-editorial-lesson-filters.cjs` |

O campo e o botão são controles nativos, com rótulo explícito e status
`aria-live="polite"`. Limpar devolve o foco ao campo. O bloco usa quebra de
linha flexível para conservar a apresentação em 390 pixels.

Os mocks anteriores de preservação de rascunhos, visão do acervo, versões
arquivadas e filtros de cursos receberam conexão/parentesco/containment dos
elementos e passaram a selecionar o botão que a view realmente criou. O
checker de limpeza HTTP recebeu as funções reais adicionais usadas pelo
handler de revogação. As asserções desses checkers foram preservadas.

## Verificação e integração

**Executado localmente, sem iniciar navegador ou servidor:**

- **27 cenários Node**, executando o script completo da view e seus handlers
  reais. Resultados e movimentos esperados são fixtures literais. Incluem
  normalização, título/slug sem corpo, pin e posição completa, nove campos,
  prévia/preflight/arquivo, confirmação de descarte, troca e recarga de curso,
  falhas e respostas antigas, controles removidos, vizinha oculta na operação
  C-129, resposta perdida/conflito sem replay, 5.000/5.001 aulas e 403/419.
- **`check-ui-contract.mjs` completo aprovado**, incluindo as regressões
  existentes e os **85 cenários C-129**. O novo checker focal foi executado
  separadamente; sua importação na suíte principal cabe à integração.
- Sintaxe do módulo Chromium e `git diff --check` aprovados.
- Revisão independente do núcleo, checker focal e adaptações legadas concluída
  sem bloqueador; o revisor também executou os 27 cenários e a verificação de
  whitespace.

**Preparado para CI, sem execução local de Chromium:**

- **22 verificações no módulo Chromium**, com contexto próprio e fixtures HTTP
  isoladas por página: rótulo/teclado, 390 pixels, pin, contagem, posição, nenhum
  HTTP ao filtrar, formulários e painéis preservados, controles removidos,
  escrita pendente, vizinha oculta, recuperação manual e revogação com recibo
  tardio. As esperas pelo início e término das requisições suspensas e a limpeza
  têm prazo de oito segundos; cada gate é liberado explicitamente pelo cenário
  e também no `finally`.
- O módulo usa a assinatura existente
  `{browser, base, ensureLocalPage, check, pageErrors}`. Não inicia serviços.
- Na integração, o checker focal e o módulo foram incluídos nos runners
  existentes. O percurso Laravel/SQLite prepara **7 verificações** com as duas
  aulas realmente criadas: título sem acento, slug, pin fora da contagem,
  posição completa, nove campos preservados, Enter/Espaço, foco, ausência de
  HTTP e largura de 390 px. As capturas preparadas são
  `framework-editorial-lesson-filter-desktop.png` e
  `framework-editorial-lesson-filter-mobile.png`. O helper termina com busca
  vazia e campos originais antes do ensaio real de C-129. Nenhuma resposta de
  negócio é simulada nesse percurso. As verificações e capturas ainda dependem
  da CI do SHA integrado.

Este documento não afirma resultado de CI, execução local de PHP/PostgreSQL,
homologação editorial, integração oficial com Portal ou implantação.
