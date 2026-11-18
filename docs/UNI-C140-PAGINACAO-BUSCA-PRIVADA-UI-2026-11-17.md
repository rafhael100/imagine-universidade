# C140 — Paginação explícita da busca privada de aulas

Data de referência da rodada: 17/11/2026. Implementação e verificações locais concluídas em 18/11/2026, a partir de `8368d5261915412233726eafacd5e057bd04e303`.

## Resultado e limite do recorte

A busca do aluno passa a consultar páginas de até oito resultados, com as ações **Próximos resultados** e **Recomeçar busca**. Cada página substitui a anterior. O aluno continua lendo a mesma aula até escolher um resultado; pesquisar e paginar não concluem aulas, não guardam posição de leitura e não alteram favoritos.

O estado mantém somente a consulta ativa, o cursor da próxima página e o número da página exibida. Não há lista acumulada, histórico de consultas, persistência no navegador, consulta na URL ou carregamento automático da página seguinte. Como o DOM contém no máximo oito resultados, não se introduz um limite total de resultados acumulados. A contagem informa apenas os itens da página atual, sem estimar um total global.

Este recorte contém a view do aluno, o checker focal, o módulo Chromium e esta nota. O contrato de consulta e a criptografia do cursor pertencem ao backend C140. Não há alteração de esquema, concessões, integração operacional, habilitação do provider ou implantação.

## Contrato usado pela interface

Todas as consultas da interface usam `POST /universidade/private/search`. A primeira página e o reinício enviam `{query, paginated:true}`; a continuação acrescenta `cursor`. O campo `query` conserva a validação de 3 a 60 caracteres Unicode, com letras, números, espaços e hífen, e a normalização de espaços já usada pela busca.

O parser exige o envelope `schema_version:1`, `scope:"current_published_editorial_lessons"`, `results` com até oito entradas e `next_cursor` nulo ou válido. Cada resultado preserva somente `course_id`, `lesson_id`, `course_title`, `lesson_title` e `snippet`. IDs devem ser inteiros seguros positivos, aulas repetidas na mesma página são rejeitadas e o curso precisa estar no catálogo local autorizado. Os limites de título e trecho são medidos em caracteres Unicode, e todos os textos são inseridos como texto literal.

O cursor é uma string opaca de 1 a 2.048 caracteres ASCII visíveis. A interface não interpreta prefixo, conteúdo, identidade ou validade criptográfica. Um próximo cursor exige oito resultados e não pode ser exatamente igual ao enviado. Essa comparação pontual não prova identidade de páginas: o backend usa criptografia com aleatoriedade. Não existe histórico de tokens ou deduplicação entre páginas substituídas.

O backend conserva o formato legado `{results}` para clientes que não optam pela paginação. A interface nova sempre opta e rejeita esse formato incompleto, para não tratar silenciosamente a primeira página como uma busca completa.

O catálogo continua vivo. A cada consulta, o servidor reavalia a autoridade e a âncora do cursor. Não se promete uma fotografia imutável dos resultados, ordem histórica ou prazo de validade do token. Mudanças fora da âncora podem afetar páginas posteriores; o reinício é explícito.

## Controles, falhas e navegação

| Situação | Comportamento |
| --- | --- |
| Primeira página válida | Exibe a contagem da página e seus resultados. Próximos resultados só fica habilitado quando existe cursor. |
| Continuação válida | Substitui os resultados anteriores, sem alterar o leitor. |
| Página vazia válida | Apresenta ausência de resultados; uma continuação vazia sugere reiniciar para consultar o catálogo atual. |
| HTTP 409 | Informa que o conteúdo da busca mudou e pede reinício manual. |
| HTTP 422 | Informa que a continuação não pôde ser validada e pede reinício manual. |
| HTTP 503 ou envelope inválido | Limpa a página/cursor e informa indisponibilidade, sem apresentar falso vazio ou resultados parciais. |
| HTTP 403 ou 419 | Usa `lockAccess`, apaga consulta, página e cursor, e desabilita todos os controles. |

Nenhum desses erros repete automaticamente o POST. **Recomeçar busca** envia a consulta ativa sem o cursor anterior. Alterar o campo de consulta invalida os resultados e a geração anterior sem fazer HTTP; o aluno precisa submeter a nova consulta.

Os botões de resultado continuam abrindo os IDs exatos de curso e aula por `openCourseWithAllFilters`, com o gesto de foco C127 capturado antes das leituras. Um alvo indisponível não é substituído por uma primeira aula pendente; a recuperação da lista mantém o alvo exato C109. Cada botão exige conexão ao DOM, pertencimento ao contêiner atual, geração vigente, autoridade e presença do curso no catálogo. Botões de uma página substituída não podem navegar.

A navegação ordinária entre cursos/aulas preserva a página de busca global. Os filtros locais, leitor, pergunta ainda não enviada, progresso, favoritos e posição de leitura permanecem independentes da paginação.

## Concorrência com a atualização da biblioteca

Antes da correção, duas sequências foram reproduzidas com o script real da view em Node VM e HTTP sintético:

1. Uma busca pendente podia publicar um resultado enquanto `loadLibrary` aguardava o catálogo: `libraryLoading:true`, `libraryReady:false` e um resultado ainda renderizado.
2. Se a atualização falhasse durante essa busca, a geração avançava sem liberar `searchBusy`. Depois de recuperar a biblioteca, uma nova submissão permanecia bloqueada e não produzia POST.

`invalidateLessonSearch` agora avança a geração e limpa página, cursor e estado ocupado no início de `loadLibrary`, na falha da biblioteca e na revogação. A autorização em andamento desabilita os controles imediatamente; a recuperação válida volta a permitir uma nova consulta. A entrada do campo é preservada na atualização, mas é apagada na revogação.

`searchLessonPage` confere a geração, a consulta ativa, a biblioteca pronta e a ausência de atualização antes de aplicar resultados ou erros. Seu `finally` libera os controles somente se ainda possuir a geração atual. Assim, uma resposta ou um erro antigo não pode apagar uma página nova nem liberar seu estado ocupado. Mudar a entrada pode iniciar uma geração nova enquanto o transporte anterior termina; não há cancelamento ou repetição automática da busca anterior.

## Seletores e pontos de integração

| Elemento | Seletor |
| --- | --- |
| Formulário e consulta | `#lesson-search-form`, `#lesson-search-query` |
| Submissão | `#lesson-search-submit` |
| Resultados | `#lesson-search-results [data-search-lesson]` |
| Grupo de paginação | `#lesson-search-navigation` |
| Continuação | `#lesson-search-next` |
| Reinício | `#lesson-search-restart` |

Os botões são nativos e acionáveis por teclado. O grupo usa quebra de linha no layout estreito. O estado usa `searchRequest`, `searchBusy`, `searchQuery`, `searchNextCursor` e `searchPage`; `renderLessonSearchControls` não inicia leituras.

Na integração, as fixtures de busca dos checkers/módulos C127 e do runner sintético principal devem responder ao opt-in com o envelope completo, mantendo os mesmos resultados válidos, estrangeiros ou retirados que cada cenário já exercita. Os extratores de `lockAccess`/`loadLibrary` dos checkers C112, C116, C118, C120 e do checker principal precisam incluir `invalidateLessonSearch` e `renderLessonSearchControls`. Os asserts estáticos da assinatura do parser, do corpo privado do POST e do guard de navegação devem acompanhar a nova forma, preservando suas verificações de limite, autoridade e alvo exato. Esses ajustes pertencem à integração do coordenador; não foram feitos neste worktree.

O módulo exporta a assinatura existente `async ({browser,base,ensureLocalPage,check,pageErrors})`. Sua importação não inicia navegador ou serviço. O coordenador integra esse módulo, o import do checker focal e a jornada Laravel real separadamente.

## Evidência local e ensaio preparado

| Verificação | Resultado |
| --- | --- |
| `node scripts/check-private-search-pages.mjs` | **34 cenários passaram**, usando o script completo e os handlers reais da view. |
| Revisão independente do núcleo/checker | Leitura integral e execução dos mesmos 34 cenários, sem bloqueador encontrado. |
| `node --check scripts/qa-browser-private-search-pages.cjs` | Passou. |
| `git diff --check` | Passou. |
| `scripts/qa-browser-private-search-pages.cjs` | **27 checks preparados**; navegador não executado localmente. |

Os cenários Node cobrem o contrato estrito, Unicode, allowlist, limites do cursor, oito resultados por página, várias páginas sem acúmulo, reinício, literalidade de texto, navegação exata, recuperação do alvo, controles desconectados, consulta nova, respostas e parsing tardios, as duas corridas reproduzidas, erro antigo versus consulta nova, HTTP 409/422/503, revogação e preservação dos estados particulares.

O módulo Chromium usa um contexto isolado e fixtures por página. Exercita teclado, largura de 390 pixels, sequência 8→1→reinício, abertura da última aula, controles antigos, consulta inválida, falhas, recuperação manual, respostas retidas, as duas corridas da biblioteca e 403/419. As interações/esperas comuns e a liberação das pendências têm limite de 8 segundos; navegação tem 15 segundos. Cada gate é liberado pelo cenário e novamente no `finally`, quando necessário. A limpeza de página/contexto também tem prazo de 8 segundos.

Para observar que um `finally` antigo já terminou, o ensaio envolve a função real `searchLessonPage`, devolve sua promise original e registra somente um booleano de término. Não inspeciona nem registra consulta, cursor ou corpo por esse observador, não altera `Response` e não depende de `Response.finished`. As fixtures HTTP registram somente seus próprios dados sintéticos para verificar os pedidos. O caso de revogação tardia também exige `networkidle`.

Os tokens dos ensaios são sintéticos: esses testes da interface não substituem os testes PHP/PostgreSQL da criptografia, âncora e autoridade do backend. Nenhum PHP, PostgreSQL, Chromium, fonte operacional ou deploy foi executado nesta entrega local. Os 27 checks preparados e a jornada Laravel dependem da CI integrada; não se presume um resultado de CI.

## Integração com os ensaios existentes

O coordenador integrou os quatro arquivos e os pontos de chamada nos runners existentes. Os extratores C112/C116/C118/C120 e principal incluem os dois helpers reais; as fixtures antigas C127 e do runner sintético conservam seus resultados e escopos adversos dentro do novo envelope. As verificações de autoridade, limite, navegação exata, foco, recuperação e ausência de efeitos foram preservadas. A suíte Node principal completa passou na combinação final, incluindo o import e os **34 cenários focais C140**. Sintaxe dos runners e a cerca dos 15 caminhos de escrita também passaram.

O percurso Laravel real acrescenta **13 verificações preparadas**. Usa o segundo curso sintético já criado pela jornada contextual, com nove aulas contendo uma expressão exclusiva do laboratório. Exercita duas páginas (8→1), abre a nona aula exata, retorna ao estudo original e reinicia a consulta. Compara progresso, favoritos e posição antes/depois, confere os três POSTs explícitos de busca sem outra mutação, e verifica a limpeza na revogação e na nova sessão. Capturas desktop/mobile estão previstas nesse percurso, sem afirmar resultado visual antes da CI.

A referência completa anterior é `f458bacef4dbc32ca59b4dfbf0db7b833f65294f`, [run 44233262064](https://github.com/rafhael100/imagine-universidade/actions/runs/44233262064): seis jobs aprovados, 359 testes PHP/4.726 asserções, 746 verificações sintéticas e 232 pelo Laravel real. Esses totais ainda não incluem C140.
