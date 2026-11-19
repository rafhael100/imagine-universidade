# C130 — Reconciliação do leitor com o catálogo autorizado

Data de referência da rodada: 17/11/2026. Base de implementação: `b67b9a44f92f538a2f595324b6e24dc78304e9c1`, com C126.

## Resultado

Quando um catálogo completo e validado deixa de incluir o curso que estava aberto, a interface encerra aquela leitura. Ela limpa a seleção de curso/aula, a lista de aulas e o conteúdo, incluindo ajuda e ações locais, e informa que o curso deixou de constar no catálogo. As demais capacidades pessoais continuam autorizadas.

Quando o curso continua presente, a reconciliação não altera a seleção, o DOM da aula ou suas gerações de leitura. Metadados e totais do catálogo podem mudar sem que isso signifique retirada de uma aula ou de uma versão.

Esse ajuste desenvolve a coerência do catálogo privado e da leitura acessível já aprovados em [UNI-03](10-modulos/UNI-03.md) e [UNI-02](10-modulos/UNI-02.md), preservando o acompanhamento pessoal de [UNI-07](10-modulos/UNI-07.md). A implementação foi autorizada na rodada de desenvolvimento contínuo; não altera regras de elegibilidade nem habilita integração real com o Portal.

## Reprodução anterior à correção

A reprodução usou o script real da view da base C126, executado em Node VM com DOM e HTTP sintéticos. Antes de qualquer edição, o curso 1 e a aula 11 estavam selecionados; `courseRequest=1` e `lessonRequest=2`.

| Operação | Catálogo recebido e validado | Estado que permanecia indevidamente |
|---|---|---|
| `loadLibrary()` | Apenas o curso 2 | Seleção 1/11, mesmas gerações, corpo da aula 11, ajuda e sua lista de aulas |
| POST de conclusão confirmado seguido de GET `/courses` | Apenas o curso 2 | O mesmo leitor da aula 11; a conclusão estava confirmada e havia exatamente um POST |

Nos dois casos, `libraryReady` era verdadeiro e o catálogo novo já havia substituído `state.courses`. `renderCourses` atualizava a biblioteca, mas não reconciliava a seleção que deixara de pertencer a ela.

A reprodução comprova a lacuna no cliente com respostas válidas. Ela não é uma execução de publicação/retirada contra um backend real; essa validação pertence à integração de navegador/CI.

## Dois pontos de aplicação explícitos

A função `reconcileCatalogSelection` é chamada exclusivamente:

1. Em `loadLibrary`, depois de validar e aplicar a resposta completa de `/courses` e marcar a biblioteca como pronta.
2. Em `confirmCompletion`, depois de validar e aplicar o catálogo atualizado, mantendo os guards existentes de aula/request antes dessa aplicação.

`renderCourses` permanece uma função de apresentação. Ela também é usada por filtros, favoritos e indicadores; inserir uma limpeza genérica ali confundiria ausência no catálogo completo com ausência em uma lista filtrada.

A reconciliação retorna imediatamente quando o acesso está negado, a biblioteca não está pronta, não existe seleção ou o curso selecionado continua presente. Nesse caminho não reconstrói o leitor nem incrementa `courseRequest` ou `lessonRequest`.

Quando há seleção e o curso falta no catálogo validado:

- Incrementa `courseRequest` e `lessonRequest`, invalidando leituras anteriores daquele contexto.
- Define `courseId` e `lessonId` como `null`.
- Esvazia `#lesson-items` e `#lesson-content`.
- Insere uma mensagem local com `data-course-unavailable`.

A mensagem é: “A leitura foi encerrada porque o curso deixou de constar no catálogo. Consulte a biblioteca para verificar os cursos disponíveis.” Ela descreve o encerramento ocorrido, sem chamar a retirada de perda de elegibilidade nem afirmar que o catálogo continuará vazio. Se o curso reaparecer depois, a mensagem não o reabre: a pessoa faz uma nova seleção explícita.

Não existe `state.lessons` na view do aluno desta base. A listagem de aulas é local a `selectCourse` e renderizada em `#lesson-items`; o incremento da geração e a limpeza desse contêiner cobrem esse estado. Não foi criado um cache paralelo.

O `renderCourses` já existente é executado em seguida. Assim, controles de favorito do curso selecionado e sugestões contextuais passam a derivar a seleção nula e o catálogo novo. A ação global de continuar aulas pendentes pode continuar disponível quando outro curso publicado existe, sem abrir esse curso automaticamente.

## Limites do que o catálogo prova

O catálogo validado usado pelo leitor não inclui o número da versão nem os IDs de suas aulas. A reconciliação verifica somente a presença do ID do curso no conjunto completo validado. Não infere retirada de versão por título, resumo, contagens de aulas ou progresso; não remapeia uma aula para outra.

Um catálogo vazio válido é uma resposta legítima. Ele pode encerrar a leitura de um curso ausente sem encerrar a autoridade para consultar histórico, posição guardada e exportações privadas.

Uma resposta 503 ou 200 malformada não prova ausência. Depois de uma conclusão confirmada, essas falhas mantêm o leitor conhecido e o estado concluído, com a mensagem anterior de resumo indisponível. Na atualização geral da biblioteca, continuam usando a recuperação existente para biblioteca indisponível. A mensagem de curso removido só nasce depois de uma resposta válida.

403 e 419 continuam sendo tratados exclusivamente por `lockAccess`: encerram o acesso, limpam o estado privado e bloqueiam controles. A nova reconciliação não substitui esse tratamento nem exibe sua mensagem local depois da revogação.

## Conclusão, concorrência e referências pessoais

A conclusão já confirmada continua confirmada. C130 não repete o POST, não consulta o histórico para reconciliar o resultado e não inventa um registro local. A mensagem de confirmação permanece no status mesmo quando o leitor é encerrado pelo catálogo subsequente. O registro retido pode ser consultado depois pela ação manual de histórico.

O protocolo anterior para resposta incerta também é preservado: o GET de progresso pode confirmar o POST e levar ao mesmo refresh de catálogo. Se esse catálogo válido omitir o curso, a seleção é reconciliada sem replay. Uma conclusão não confirmada, sem nova resposta de catálogo, não produz inferência de retirada.

Se o aluno escolher outra aula ou outro curso enquanto o catálogo da conclusão anterior está pendente, os guards existentes descartam essa resposta antes de substituir `state.courses`. O helper não roda contra a nova seleção. Se uma resposta de corpo, lista ou Tutor da seleção removida chegar depois, as gerações incrementadas impedem sua restauração.

O helper não limpa preferências de categoria/busca, filtro de favoritos, preferência de sugestões, snapshots de posição, histórico ou referências retidas. Ele não chama APIs de gravação, exclusão, exportação ou reconsulta dessas referências. O cache de favoritos visíveis continua sendo intersectado com o catálogo pelo renderer anterior; isso não remove o favorito retido no servidor.

Os comportamentos anteriores de reautorização e C126 continuam em vigor: `loadLibrary` invalida seus caches de leitura e consulta novamente favoritos/posição; a tentativa de conclusão invalida o histórico no início e no encerramento. C130 não acrescenta invalidação global nem apaga registros pessoais. Uma posição guardada pode conservar o snapshot anterior até sua própria consulta; retomar continua exigindo a leitura autoritativa existente e o alvo exato.

Uma republicação posterior não restaura automaticamente a aula encerrada nem modifica a posição guardada. Somente uma nova ação de escolha abre o material que a API autorizar naquele momento.

## Integração com C127 e C128

Esta implementação foi feita na base C126. Ao integrar C127, deve-se inserir `invalidateNavigationFocus()` dentro de `reconcileCatalogSelection`, logo depois do early return e antes da limpeza, exclusivamente no ramo que confirma ausência. A presença do curso não deve cancelar uma intenção pela reconciliação. A invalidação já existente de `loadLibrary` em C127 permanece separada dessa regra.

Os guards de origem dos botões antigos de próxima aula/curso e retries de C127 devem ser preservados. O incremento de curso/aula em C130 faz esses guards rejeitarem a origem encerrada. Ações locais da ajuda, posição e sugestões contextuais também perdem seu contexto corrente, enquanto os controles globais continuam seguindo a autoridade do catálogo.

Em C128, o índice de seções pertence a `.lesson-text`; portanto é removido com o corpo. Seus guards de curso, aula, gerações e conexão também rejeitam botões antigos. Não é necessário alterar o parser ou os handlers locais de seções.

### Dependências mecânicas dos checkers

Nenhum checker anterior, runner ou workflow foi editado neste recorte. Na integração:

- `scripts/check-student-favorites.mjs` e `scripts/check-student-favorites-export.mjs` extraem `loadLibrary` e precisam incluir a função real `reconcileCatalogSelection` em sua lista de dependências.
- `scripts/check-ui-contract.mjs` usa um `studentFlowFixture` para funções extraídas de biblioteca/conclusão; precisa incluir a função ou o stub mecânico correspondente, mantendo seus asserts anteriores.
- Os checkers que executam o script completo recebem o helper automaticamente. Os checkers de histórico e posição foram executados sem qualquer edição.
- O novo checker já oferece primitivas DOM de conexão, texto, eventos de documento/janela, visibilidade e foco, para receber C127/C128 sem copiar sua política.

O coordenador integra o import do novo checker, a chamada do módulo Chromium e o percurso real. A implementação do helper tem somente esses dois pontos de aplicação; não há hook em renderização genérica ou em filtros.

## Verificação executada

| Verificação | Resultado local |
|---|---|
| `node scripts/check-student-catalog-reconciliation.mjs` | 28 cenários do script real aprovados |
| `node scripts/check-progress-history.mjs` | 38 cenários anteriores aprovados |
| `node scripts/check-student-reading-position.mjs` | 59 cenários anteriores aprovados |
| `node --check scripts/qa-browser-student-catalog-reconciliation.cjs` | Sintaxe aprovada |
| `git diff --check` | Aprovado |

Os 28 cenários focais cobrem os dois pontos de aplicação, vazio válido, presença com DOM/gerações intactos, metadados insuficientes para inferir retirada de aula, filtros, preferências, callbacks tardios, seleção mais recente, falhas distintas de ausência, revogação, confirmação de POST incerto e republicação sem restauração automática.

A revisão independente do núcleo e do checker também executou os 28 cenários e não encontrou bloqueadores. O checker principal completo ainda depende das inclusões mecânicas acima; não se atribui aprovação dele nesta base isolada sem essas adaptações.

## Chromium preparado, sem execução local

`scripts/qa-browser-student-catalog-reconciliation.cjs` prepara **23 verificações** e exporta:

```js
module.exports = async function ({browser, base, ensureLocalPage, check, pageErrors}) { /* ... */ }
```

Usa contexto isolado, rotas por página, material sintético e a view real. Os cenários verificam corpo/ajuda/ações removidos, confirmação preservada e sem replay, histórico manual, vazio válido, presença e foco preservados, filtros, falhas de catálogo, respostas tardias de corpo/lista/Tutor/POST, seleção mais recente, 403/419 e republicação com novo clique.

O ensaio observa a geração do histórico C126 somente como barreira de encerramento da tentativa de conclusão. Isso não é lógica de reconciliação da aplicação. As esperas de respostas retidas e o cleanup possuem prazo; pendências são liberadas no `finally`. Não usa `Response.finished` nem altera as respostas para contornar validações.

Chromium, PHP, PostgreSQL, servidor de laboratório e serviços reais não foram executados localmente. Os 23 checks são preparados, não uma aprovação de CI. Integração, inspeção visual e execução real permanecem com o coordenador.

## Integração preparada

A integração preservou C127/C128 e acrescentou a invalidação de foco somente
no ramo de curso ausente. Os dois extratores de favoritos passaram a incluir
o helper real; o harness de fluxo do checker principal recebeu o stub
correspondente. Todas as asserções anteriores foram preservadas. O checker
principal integrado passou, incluindo os 28 cenários C130, 64 de foco e
34 de seções. O módulo de 23 checks foi conectado ao runner Chromium.

O percurso Laravel prepara quatro verificações sobre uma página que conserva
a aula aberta após a retirada feita pelo editor. Ele invoca a função existente
`loadLibrary()` nessa página, sem recriar o documento ou simular respostas,
e observa a limpeza da seleção, corpo, ajuda e índice após o catálogo real
vazio. Confere a autoridade global ativa, foco preservado no link de salto e
revisão da posição retida. As únicas requisições dessa etapa são a inicialização
existente e três GETs: catálogo, favoritos e posição. Nenhum POST de conclusão
ou gravação de preferência é acrescentado ao percurso.

A sintaxe passou. Esse conjunto depende da próxima execução integrada de CI;
não há aprovação de runtime atribuída ao código ainda não executado.

## Arquivos e limites de entrega

- `resources/views/university/student.blade.php`: helper e duas chamadas após catálogos validados.
- `scripts/check-student-catalog-reconciliation.mjs`: 28 cenários reais de VM.
- `scripts/qa-browser-student-catalog-reconciliation.cjs`: 23 verificações Chromium preparadas.
- Este documento.

Não houve alteração de backend, schema, rota, grants, formato de exportação ou mecanismo de autorização. Não houve stage, commit, push ou deploy neste trabalho.

## Confirmação integrada em 18/11/2026

O [run 44225106281](https://github.com/rafhael100/imagine-universidade/actions/runs/44225106281), no SHA **8099229f696331625264e2792d0c3b75a937ff3a**, aprovou os **seis jobs**. A suíte completa registrou **683 verificações Chromium** e **206 verificações pelo Laravel/SQLite real**, com persistência aprovada e sem respostas de negócio simuladas nesse segundo percurso.

O módulo C130 completou **23 verificações Chromium** e o percurso real confirmou **4 verificações** de curso retirado. O catálogo real vazio encerrou a seleção anterior, preservou a referência de leitura e limpou também a localização de aulas C132, mantendo os limites de requisições e de escrita.

Esta evidência substitui as pendências de execução descritas na preparação acima somente para esse SHA. Não valida alterações posteriores e não altera revisão humana, integração operacional, os 13 gates HOLD_NO_GO ou a proibição de merge/deploy.
