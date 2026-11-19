# C-129 — ordenação explícita de aulas no editor

Data de referência da rodada: **17/11/2026**. Implementação candidata para
integração e CI; os gates operacionais existentes permanecem inalterados.

## Capacidade entregue

Cada aula da lista editorial passa a ter ações **Subir** e **Descer**, com o
nome da aula no rótulo acessível e a posição atual visível. O movimento troca
uma aula com sua vizinha, conforme a ordem canônica `sort_order, id`. Empates
nos números de ordem deixam de exigir edição manual de várias aulas.

A interface permite o movimento somente com catálogo e lista de aulas
validados, curso não publicado e todas as aulas da lista em `draft`. A primeira
aula não sobe e a última não desce; uma lista com menos de duas aulas não
oferece movimento válido. Os mesmos limites são conferidos pelo handler, além
do estado `disabled` dos botões. O limite de 5.000 aulas do editor é preservado.

O movimento não seleciona outra aula, não troca o curso e não modifica filtros,
títulos, slugs, resumo ou corpo. Quando a aula selecionada recebe outra posição,
somente seu campo de ordem e o valor confirmado correspondente são atualizados.
O formulário de nova aula continua vazio quando não há uma aula selecionada.

## Contrato e confirmação da ordem

Cada gesto válido envia um único `POST` a
`/universidade/private/admin/courses/{courseId}/lessons/reorder`, com:

- `lesson_id` e `direction`, respectivamente a aula escolhida e `up` ou `down`;
- `expected_order`, a lista completa e única dos pares `{id, sort_order}` da
  leitura validada, ordenada por `sort_order, id`.

Os pares da origem são preservados no pedido, incluindo números empatados ou
intervalos. Para um movimento possível, o destino esperado é a troca de
vizinhas seguida da numeração `0..n-1`. Um limite da lista é um no-op local,
sem POST. O normalizador também reconhece o recibo de limite sem normalização,
com `changed: false` e os pares originais intactos.

O cliente valida `schema_version: 1`, `scope: current_editorial_draft`, o curso,
o status `draft`, a aula, a direção e o booleano `changed`. A lista recebida deve
coincidir integralmente com o destino calculado: quantidade, IDs e cada número
de ordem. Pares ausentes, repetidos, extras ou inesperados não são aplicados.
Os dados aceitos são reconstruídos por uma lista explícita de campos.

`course_version` precisa ser um inteiro positivo seguro. O GET editorial de
aulas atual não fornece esse número; portanto a UI **não afirma comparar a
versão recebida com uma versão previamente lida**. O vínculo disponível no
cliente é o curso, a lista completa de IDs e pares e a intenção exata do
movimento. O endpoint confere a versão draft mais recente no servidor. O número
retornado não libera publicação nem acesso ao material.

Um recibo `changed: false` também é aceito quando contém exatamente o destino
pedido, conforme o contrato idempotente do endpoint. A mensagem distingue
confirmação de ordem de uma nova alteração. Isso não cria uma repetição
automática da requisição no cliente.

## Preservação dos formulários e concorrência

Antes da escrita, a interface compara literalmente os nove campos de curso e
aula com os valores confirmados: título, slug, categoria, resumo e ordem do
curso; título, slug, corpo e ordem da aula. Espaços e representações textuais
dos números também são preservados. Se algum campo estiver alterado, os botões
ficam desabilitados e o handler não escreve. Quando ambos os formulários estão
sujos, a orientação é **salvar primeiro a aula e depois o curso**.

O fluxo reutiliza `beginWrite`, `finishWrite` e
`freezeUncertainEditorialWrite`. Enquanto há um POST pendente, a ordem anterior
continua visível e nenhuma segunda escrita editorial pode começar. O layout
fica `inert`, como nas demais mutações. A conferência de publicação, a prévia e
os snapshots de visão do acervo e arquivo são invalidados.

Como `inert` não impede alteração programática dos campos, o handler captura
os nove valores literais, o curso, a seleção de aula e as gerações de leitura
antes de aguardar a resposta. Após validar o recibo, compara novamente esses
dados e a lista original. Se algum deles mudou, preserva os campos atuais,
mantém a ordem local anterior e exige uma consulta manual antes de liberar
novas escritas. Uma resposta tardia não refaz os formulários.

Em sucesso, não há `fillCourse`, `fillLesson`, reset ou GET automático: apenas
os pares de ordem confirmados entram nos objetos já validados. A atualização
do campo de ordem da seleção também atualiza seu valor de referência, evitando
que a própria confirmação deixe um falso rascunho sujo.

Os handlers dos botões conferem o curso e a geração de origem, a conexão do
botão ao documento e sua presença na linha atual. Um botão removido por uma
nova renderização da mesma lista não pode iniciar uma escrita. O cálculo dos
estados dos botões usa um único mapa de posições por renderização.

## Falha, conflito e recuperação manual

Um erro HTTP, perda de resposta ou recibo inválido não confirma a ordem local.
O editor mantém os campos e suspende novas mutações com a orientação de não
repetir o movimento e consultar novamente cursos e aulas. O corpo de erro não
é exibido nem usado para adivinhar se o servidor concluiu a escrita. Não há
replay, reconciliação por GET automático ou diálogo de sucesso especulativo.

A ação de recuperação existente avisa que uma nova consulta pode substituir
campos não salvos. Cancelar preserva os campos e não faz leitura ou escrita.
Aceitar executa uma leitura autorizada de cursos e aulas; somente a leitura
completa bem-sucedida libera as mutações. Os controles de ordenação são
renderizados novamente **depois** de `catalogLoading` voltar a `false`, para
que uma reconciliação bem-sucedida não os deixe desabilitados.

403 ou 419 seguem a limpeza existente do editor. Curso, aulas, campos e
controles privados são removidos; o recibo atrasado de um POST anterior não
restaura os dados nem substitui a negação.

## Arquivos e seletores

| Responsabilidade | Arquivo ou seletor |
| --- | --- |
| Interface e handlers reais | `resources/views/university/admin.blade.php` |
| Checker focal em Node/VM | `scripts/check-lesson-reorder.mjs` |
| Módulo focal Chromium | `scripts/qa-browser-lesson-reorder.cjs` |
| Linha de uma aula | `#lesson-items [data-lesson-row='ID']` |
| Seleção existente da aula | `#lesson-items [data-lesson='ID']` |
| Subir | `#lesson-items [data-move-lesson='ID'][data-direction='up']` |
| Descer | `#lesson-items [data-move-lesson='ID'][data-direction='down']` |
| Orientação de disponibilidade | `#lesson-order-status` |
| Resultado ou recuperação | `#status` e `#retry-catalog` |

Os checkers anteriores de filtros editoriais e versões arquivadas receberam
apenas suporte a `querySelectorAll` na implementação sintética de DOM. Suas
asserções foram preservadas. A importação principal e os runners integrados
pertencem à etapa de integração desta rodada.

## Verificação realizada e preparação para CI

**Executado localmente, sem iniciar navegador ou servidor:**

- 85 cenários do checker focal, usando o script completo e os handlers reais
  da view, com movimentos e recibos esperados escritos como fixtures literais.
  A cobertura inclui empates, limite de 5.000, recibos inválidos, todos os nove
  campos alterados antes e durante a escrita, seleção concorrente, controles
  removidos, escrita única, ausência de otimismo e replay, 403/419 e recuperação
  depois de uma resposta perdida que já havia sido gravada na fixture.
- Regressões anteriores: 35 cenários de diagnóstico de publicação, 11 de
  preservação dos rascunhos, 61 de visão do acervo, 79 de versões arquivadas,
  15 de filtros editoriais e 58 de limpeza de respostas HTTP, todos aprovados.
- Sintaxe do módulo Chromium e `git diff --check` aprovados.
- Revisão independente do núcleo, checker e módulo Chromium concluída sem
  bloqueadores, incluindo o restabelecimento dos botões após consulta manual.

**Preparado, ainda sem execução local ou resultado de CI deste recorte:**

- 26 verificações Chromium focais em um contexto isolado, com fixtures HTTP
  privadas por página. Incluem 390 pixels, eventos nos controles desabilitados,
  resposta pendente, campos alterados durante `inert`, conflito, perda após
  commit e revogação durante uma resposta tardia. As esperas de início e
  término das requisições suspensas têm prazo de oito segundos e observam
  `requestfinished` ou `requestfailed`; a limpeza libera os gates pendentes.
- O percurso Laravel/SQLite real preparado na integração contém oito
  verificações com as duas aulas que já existiam nessa jornada: empate, ida e
  volta, formulário sujo sem POST, recibo exato, conteúdo e seleção preservados,
  consulta ao banco, duas entradas de auditoria e captura desktop/mobile. A
  aula temporária continua sendo excluída em seguida. Esse percurso não usa
  respostas de negócio simuladas nem uma nova fixture persistente.

A integração conectou o checker e o módulo aos runners principais. O checker
principal completo passou, incluindo os 85 cenários novos e todos os cenários
anteriores. Seus harnesses de funções extraídas receberam apenas o stub de
renderização dos novos controles. O percurso real e o módulo também passaram
na conferência de sintaxe, mantendo os 15 caminhos transacionais na verificação
estática. As asserções anteriores permanecem presentes.

PHP, PostgreSQL, Chromium e a persistência real deste recorte dependem da
execução dos jobs existentes de CI. Os resultados acima não afirmam execução
desses ambientes, aprovação humana do acervo ou implantação.

## Confirmação integrada em 18/11/2026

O [run 44225106281](https://github.com/rafhael100/imagine-universidade/actions/runs/44225106281), no SHA **8099229f696331625264e2792d0c3b75a937ff3a**, aprovou os **seis jobs**. A suíte completa registrou **683 verificações Chromium** e **206 verificações pelo Laravel/SQLite real**, com persistência aprovada e sem respostas de negócio simuladas nesse segundo percurso.

O módulo C129 completou **26 verificações Chromium** e o percurso real confirmou **8 verificações** de ordem, conteúdo, recibo e auditoria. As capturas reais desktop e 390 px foram inspecionadas: posições completas e controles Subir/Descer permanecem legíveis, com as ações de fronteira desabilitadas e sem transbordamento horizontal.

Esta evidência substitui as pendências de execução descritas na preparação acima somente para esse SHA. Não valida alterações posteriores e não altera revisão humana, integração operacional, os 13 gates HOLD_NO_GO ou a proibição de merge/deploy.
