# C132 — Localizar aulas no curso atual

Referência: rodada de desenvolvimento de 2026-11-17. Verificações locais desta entrega realizadas em 2026-11-18.

## Objetivo e escopo aprovado

Os requisitos `BASE-UNI-03-04`, em `docs/10-modulos/UNI-03.md`, e `BASE-UNI-02-05`, em `docs/10-modulos/UNI-02.md`, preveem busca/filtros no material autorizado e revisão voluntária. A busca global de aulas já existe; esta entrega permite localizar uma aula na lista completa do curso aberto, sem uma nova consulta ao servidor.

A implementação usa a base `3beec99`, com C127, C128, C129 e C130 integradas. Essa referência identifica a base de trabalho; não constitui afirmação de aprovação da CI dessa base ou deste recorte.

O campo **Localizar aula neste curso** compara somente o título e o slug que já passaram por `validatedStudentLessons`. A comparação ignora caixa e acentos por meio de `normalizeSearchText`, compartilhada com os filtros existentes. O texto original dos títulos permanece intacto. Corpo, status de conclusão e demais campos não participam da correspondência.

Digitar ou limpar não faz HTTP, não modifica a URL, não grava histórico de pesquisa e não usa armazenamento do navegador. A consulta dura apenas na memória da página. Não há novo endpoint, schema, grant, regra de retenção ou integração externa.

## Apresentação e contrato dos seletores

O bloco aparece entre o controle de favorito do curso e a lista de aulas. Ele tem rótulo explícito, input nativo de pesquisa, botão de limpeza e mensagem acessível. Não é um formulário e não envia uma pesquisa ao pressionar Enter no campo.

| Seletor | Finalidade |
|---|---|
| `#course-lesson-filter` | Bloco local, inicialmente oculto |
| `#course-lesson-query` | Campo com o rótulo “Localizar aula neste curso” |
| `#clear-course-lesson-query` | Botão “Limpar”, `type="button"` |
| `#course-lesson-filter-status` | Contagem com `role="status"` e `aria-live="polite"` |
| `#lesson-items [data-lesson-id]` | Lista completa e autorizada; inclui os botões ocultos pelo filtro |

O status normal é `Resultados: M de N aulas.`. `N` sempre representa a lista completa validada; `M` representa somente correspondências reais. Quando a aula selecionada está fora dos resultados, ela continua visível e a mensagem acrescenta ` A aula aberta continua visível fora dos resultados.`. A aula fixada não aumenta `M`.

Uma lista válida vazia apresenta `Resultados: 0 de 0 aulas.` e conserva a mensagem existente de curso sem aulas. Uma lista indisponível ou inválida não apresenta contagem zero: o bloco fica oculto e seus controles desabilitados, enquanto a recuperação existente explica a falha.

Durante a verificação da biblioteca, uma lista que já estava aberta mantém a consulta, mas os controles ficam desabilitados e o status passa a `Verificando a biblioteca...`. O sucesso restaura a apresentação, desde que o curso continue no catálogo validado.

## Lista completa, ordem e progresso

Não foi criado um segundo cache de aulas. Cada botão gerado a partir da lista validada guarda apenas os valores normalizados de título e slug necessários à correspondência. `renderLessonFilter` percorre os botões atuais e altera `hidden`; não remove, reordena ou recria esses botões, nem o conteúdo da aula.

A regra `.lesson-btn[hidden]{display:none}` é explícita porque a regra existente de botão usa `display:block`. Assim, os elementos ocultos deixam de ocupar espaço e de participar da navegação nativa por teclado, mas continuam na árvore DOM.

`nextPendingLessonId` e `markLessonStatus` permanecem inalteradas. Ambas consultam o contêiner completo `lessonsBox`, incluindo botões com `hidden`. O filtro não participa do cálculo de próxima aula, conclusão, porcentagem ou ordem. Os seletores são restritos a `#lesson-items`; outros controles, como a ação de guardar posição, também podem ter `data-lesson-id` e não pertencem à sequência do curso.

Ao abrir uma aula, `selectLesson` atualiza imediatamente a apresentação do filtro depois de trocar `state.lessonId`. Isso cobre tanto o clique em um resultado quanto “Ir para a próxima aula”, a retomada de posição e outros caminhos existentes. Uma próxima aula que estava oculta abre pelo seu ID exato e se torna a nova aula fixada. A consulta não é substituída e a aula anterior deixa de ficar fixada se também não corresponder à consulta.

`renderCourses` não chama o filtro e não foi alterada para reinicializá-lo. Renderizações de favoritos, progresso e recomendações preservam a consulta e os elementos da lista.

## Estado e ciclo de vida

`state.lessonFilter` contém apenas `{query, courseId, request, ready}`. `request` registra o `courseRequest` que produziu a lista validada. O estado não depende de `lessonRequest`, que muda legitimamente entre aulas da mesma lista.

`lessonFilterCurrent` exige biblioteca autorizada, ausência de revogação, lista pronta e correspondência entre curso e geração atuais. `resetLessonFilter` remove a associação e a prontidão; pode preservar a consulta somente para o recarregamento do mesmo curso.

| Evento | Efeito local |
|---|---|
| Digitar ou limpar | Muda somente consulta, visibilidade e contagem; não altera gerações |
| Selecionar outra aula do curso | Preserva consulta e recalcula a aula fixada |
| Selecionar outro curso | Limpa consulta antes do primeiro await e aguarda a nova lista validada |
| Recarregar o mesmo curso | Preserva consulta, remove a prontidão e não reutiliza a lista anterior |
| Falha ou payload inválido da lista | Mantém consulta para retry do mesmo curso; limpa prontidão, associação e lista |
| Retry explícito com lista válida | Reassocia a lista à geração atual e reaplica a consulta |
| Busca, categoria ou filtro de favoritos que descarta o curso | Limpa consulta, associação e prontidão |
| `loadLibrary` com curso ainda presente | Desabilita durante a verificação; mantém lista, consulta e leitor após sucesso |
| Curso omitido do catálogo, ramo C130 | Limpa consulta e associação junto com a seleção e o conteúdo removidos |
| Falha global do catálogo | Limpa o filtro e preserva a indicação de indisponibilidade |
| HTTP 403/419 | `lockAccess` limpa consulta, metadados e controles antes de qualquer reutilização |

O helper C130 conserva seu early return quando o curso está presente. A chamada nova a `resetLessonFilter` fica somente no ramo de omissão; `invalidateNavigationFocus` continua nesse mesmo ramo. Uma conclusão já confirmada continua confirmada quando o GET posterior remove o curso do catálogo.

Respostas de lista antigas continuam sujeitas ao `courseRequest` existente antes de atribuir prontidão, metadados ou DOM. O filtro não cria requests paralelos nem modifica o token de uma leitura em andamento.

## Teclado e controles antigos

O listener delegado da lista exige, antes de capturar `beginNavigationFocus`, que o filtro pertença à lista atual e que o botão esteja conectado, dentro de `lessonsBox` e visível. Um botão oculto, desconectado, estrangeiro ao contêiner ou de uma associação já invalidada não abre uma aula nem captura uma nova intenção de foco.

O clique válido conserva o ID do botão e usa o fluxo C127 já existente. O filtro não recaptura intenção após await. Digitar enquanto uma aula carrega cancela a entrega de foco antiga por meio dos observadores de interação existentes, sem cancelar a leitura ou trocar seu alvo. O campo mantém o foco quando a resposta chega.

Tab, Enter e Espaço usam os comportamentos nativos dos controles. “Limpar” devolve o foco ao campo por ser uma ação explícita. Digitação e atualização da contagem não transferem foco para o leitor.

## Verificação realizada e ensaio preparado

`node scripts/check-student-lesson-filter.mjs` passou **35 cenários**, executando o script e os handlers reais da view com DOM/HTTP sintéticos. A cobertura inclui:

- Caixa, acentos compostos/decompostos, Unicode, título/slug e marcação literal; exclusão de corpo e status da pesquisa.
- Contagem correta, aula fixada, preservação dos mesmos nós e ausência de HTTP, gravações e armazenamento ao filtrar/limpar.
- Próxima aula e status de progresso em linhas ocultas; abertura do ID exato com um único POST de conclusão deliberado.
- Guarda de geração, botões ocultos/desconectados/fora do contêiner, troca de curso e respostas antigas.
- Lista vazia válida, falha transitória, payload inválido, recuperação do mesmo curso e alvo preferido indisponível.
- Reset por filtros globais, refresh que preserva o curso, erro global, C130 e HTTP 403/419.
- Digitação durante leitura pendente sem transferência tardia de foco e preservação de preferências pessoais.

O checker principal completo também passou após inclusões mecânicas das novas dependências nos harnesses legados. Nenhuma asserção anterior foi removida ou enfraquecida.

`scripts/qa-browser-student-lesson-filter.cjs` prepara **32 verificações Chromium**, exportando a mesma assinatura dos módulos existentes: `({browser,base,ensureLocalPage,check,pageErrors})`. Usa contexto próprio e rotas restritas a cada página. Exercita o DOM real, teclado, foco, layout em 390 px, sequência completa, retry, respostas atrasadas e limpeza por revogação. Seus gates e cleanup têm prazo de 8 segundos; o módulo não usa `Response.finished`. Sintaxe e `git diff --check` passaram.

Nenhum navegador, PHP, PostgreSQL, servidor ou serviço real foi executado localmente nesta entrega. As 32 verificações estão preparadas para o runner protegido e ainda não representam resultado de CI ou homologação. A revisão independente do núcleo e dos 35 cenários não encontrou bloqueadores; a revisão do módulo/documentação é uma etapa separada da execução em CI.

## Integração

Arquivos funcionais: a view do aluno, o checker focal, o módulo Chromium e esta documentação. As únicas adaptações legadas são:

- `scripts/check-ui-contract.mjs`: funções reais do filtro nas dependências e estado mínimo na fixture de fluxo do aluno.
- `scripts/check-student-help.mjs` e `scripts/check-student-favorites.mjs`: dependências reais e estado mínimo para o caminho de revogação/seleção.
- `scripts/check-student-favorites-export.mjs` e `scripts/check-error-body-cleanup.mjs`: dependências reais da limpeza de acesso; ambos já obtêm o estado da view.

Na integração, o checker focal e o módulo Chromium foram adicionados aos runners existentes. O módulo é isolado e não altera fixtures compartilhadas. O percurso Laravel/SQLite prepara mais **7 verificações** sobre a aula realmente criada e publicada pelo editor: título sem acento, slug, exclusão do corpo, aula fixada sem inflar contagem, limpeza por Enter/Espaço, foco, preservação do estado e ausência de HTTP em 1440/390 px. A retirada C130 também confere input vazio/desabilitado, bloco oculto e status vazio. Foram preparadas capturas `framework-student-lesson-filter-desktop.png` e `framework-student-lesson-filter-mobile.png`; ainda dependem da execução no SHA integrado. Nenhuma resposta de negócio é simulada nesse percurso. Workflows, rotas e backend permanecem inalterados.
