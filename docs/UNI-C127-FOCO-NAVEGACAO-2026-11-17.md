# UNI-C127 — Foco após navegação explícita de estudo

Data de referência da rodada: 17/11/2026.

## Resultado

Ao escolher um curso ou uma aula, o aluno recebe um destino de foco no conteúdo que acabou de abrir. O título da aula é o destino quando as leituras autorizadas terminam com sucesso. Uma mensagem de recuperação, ausência ou indisponibilidade recebe o foco quando a navegação não pode entregar a aula solicitada.

Essa entrega é condicionada à intenção original: se a pessoa interagir com outro controle, mover o foco, iniciar outra navegação ou sair da aba/janela enquanto aguarda, a resposta pode terminar de renderizar sem puxar o foco de volta. Voltar à aba não reativa uma intenção antiga.

O recorte desenvolve a acessibilidade e a orientação na navegação já aprovada em BASE-UNI-02-06, BASE-UNI-03-03 e BASE-UNI-12-01 da [base funcional](08-fechamento-candidato/02-BASE-FUNCIONAL-14-MODULOS.md). Não acrescenta uma regra acadêmica, um direito de acesso ou um pré-requisito de estudo.

## Lacuna reproduzida

Antes da alteração, `selectLesson` só chamava `heading.focus()` quando recebia uma versão preferida, caminho usado pela posição guardada. A navegação comum de curso, aula, sequência, busca e sugestões não tinha destino equivalente. Alguns desses cliques removiam o próprio botão ativo ao reconstruir a lista ou o conteúdo.

O teste com o script real também reproduziu o efeito inverso: uma retomada por versão exata terminava de carregar e focava o título mesmo depois de o aluno ter colocado o foco no campo de busca durante a espera.

Na implementação C127, todos os caminhos explícitos compartilham uma entrega condicionada de foco. Chamadas programáticas às funções internas sem uma intenção de navegação continuam sem mover o foco.

## Caminhos cobertos

| Ação explícita | Destino autorizado |
| --- | --- |
| Selecionar curso na biblioteca | Título da aula escolhida pelo fluxo existente, ou mensagem de ausência/erro |
| Selecionar uma aula | Título daquela aula, depois de validar corpo e progresso |
| Próxima aula / continuar em outro curso | Título do destino, mantendo a seleção de origem vigente até o clique |
| Continuar aulas pendentes | Título da aula indicada pelo fluxo existente |
| Abrir trilha de um pilar publicado | Título da aula autorizada do curso selecionado |
| Abrir resultado de busca | Título da aula exata do resultado; ausência não substitui por outra aula |
| Abrir sugestão do mesmo tema | Título do curso/aula reautorizado pelas leituras existentes |
| Continuar da posição guardada | Título da versão/aula exatas, ou estado atual da posição se a consulta impedir a navegação |
| Tentar carregar novamente | Título ou mensagem do mesmo alvo; o novo clique inicia uma intenção nova |
| Reabrir aulas após indisponibilidade na ajuda | Mesmo curso e aula do contexto atual da ajuda |

O destino em `#lesson-content` usa o seletor `#lesson-navigation-target`. É um `h3` para a aula e um `p` para ausência/erro. `tabindex="-1"` permite focalização deliberada sem inserir esses textos na sequência comum de Tab. A apresentação textual segura existente continua sendo usada; nenhum HTML do conteúdo é interpretado.

Se a consulta da posição guardada falhar, indicar outra revisão ou não encontrar o curso no catálogo atual, a mensagem em `#reading-position-status` é o destino. A retomada não abre outra aula silenciosamente.

## Intenção capturada antes da espera

`navigationFocus` contém somente dois contadores locais de interface. `beginNavigationFocus` cria uma intenção com a geração, a atividade observada e uma marca de entrega única. Ela é criada no handler do gesto explícito, antes de qualquer `await`.

A mesma intenção percorre `openCourseWithAllFilters` → `selectCourse` → `selectLesson`. Na retomada, também atravessa a consulta de `loadReadingPosition`. Nenhuma dessas etapas recaptura o foco depois da resposta; isso preserva uma interação ocorrida durante a leitura do catálogo, do corpo, do progresso ou da posição.

`finishNavigationFocus` só entrega quando:

- A intenção ainda é a mais recente e ainda não foi entregue.
- Nenhuma interação posterior alterou o contador local de atividade.
- O acesso e o catálogo continuam ativos.
- O destino permanece conectado ao documento.
- A página está visível e tem foco.

Os guards existentes de `courseRequest` e `lessonRequest` continuam decidindo se uma resposta pode renderizar. O foco é aplicado somente depois dessas verificações e da validação do conteúdo; ele não transforma uma resposta antiga em uma navegação válida.

Os observadores de `pointerdown`, `keydown`, `focusin`, `click`, `input`, `change` e `wheel` apenas invalidam a entrega pendente por um contador local. São passivos, não impedem eventos nem alteram a seleção, o progresso ou qualquer estado de negócio. A mudança de visibilidade e o `blur` da janela invalidam a geração. Refresh da biblioteca e `lockAccess` também invalidam a intenção.

Esses contadores não são telemetria: não registram destinos, identidades, texto, eventos de aprendizagem ou histórico e não são enviados a endpoint algum. Não há preferência em `localStorage`, `sessionStorage`, cookie ou banco.

## Botões antigos e recuperação

Os botões de próxima aula e de próximo curso verificam curso, aula e request de origem antes de criar uma intenção nova. Os retries verificam o request atual além do ID selecionado. Um resultado de busca verifica `searchRequest`, sua conexão ao documento e sua presença no contêiner atual de resultados antes de navegar. Isso também cobre a limpeza local por uma consulta inválida, que não dispara outra pesquisa HTTP.

Os cenários negativos invocam os handlers reais mesmo depois da remoção do elemento, provando que esses botões antigos não geram leituras nem uma intenção nova. A reprodução anterior do resultado de busca substituído produzia três GETs; com a guarda da pesquisa atual, o mesmo caso produz zero requisições.

Recuperação continua manual. Falhas de lista, corpo ou progresso não geram repetição automática nem renderização parcial. A versão guardada é mantida no retry: receber uma versão diferente continua sendo indisponibilidade até uma nova leitura autorizada corresponder ao alvo original.

## Atualizações que preservam o foco

Carregar ou atualizar a biblioteca, consultar favoritos/referências/posição, reconstruir indicadores, confirmar conclusão e atualizar o resumo do progresso não criam uma intenção de navegação. Esses caminhos não movem o foco para o título da aula. Consultar a busca também não abre uma aula; é necessário escolher um resultado.

Uma interação explícita com outro controle durante uma navegação pendente cancela somente a entrega de foco. O conteúdo continua sujeito às mesmas autorizações e validações. A nova funcionalidade não interrompe requests, não grava conclusão, não modifica favoritos e não troca a posição guardada.

403 e 419 continuam usando o encerramento existente: limpam os dados e invalidam requests. Respostas tardias não restauram conteúdo nem foco privado. O cleanup limitado dos corpos HTTP permanece intacto, assim como CSRF, `no-store` e as demais proteções do cliente.

## Arquivos e integração

- `resources/views/university/student.blade.php`: intenção, observadores e propagação pelos handlers reais.
- `scripts/check-student-navigation-focus.mjs`: script completo executado com DOM/eventos/HTTP sintéticos, incluindo foco conectado e atividade concorrente.
- `scripts/qa-browser-student-navigation-focus.cjs`: módulo Chromium com teclado, foco, aba e respostas suspensas da página real.

As adaptações nos checkers anteriores são mecânicas: primitivas de documento/janela para o script completo e dependências de foco para funções extraídas. O checker principal preserva os asserts anteriores, ajusta suas assinaturas e reforça as guardas de retry e de busca; a origem textual segura do título continua sendo verificada.

A importação do teste focal, a chamada do módulo Chromium e a extensão do percurso Laravel são integradas separadamente. Os hooks de conclusão de C126 não foram modificados por este recorte. A observação global de interação não muda o comportamento de consulta do histórico.

Testes de foco em runners com várias páginas devem trazer a página pertinente à frente **antes do clique**. Uma asserção de título ativo em uma aba sem foco contrariaria a proteção que este recorte introduz.

## Verificação preparada e executada

Executado localmente sem navegador, servidor PHP ou banco:

- `node scripts/check-student-navigation-focus.mjs`: **64 cenários aprovados**.
- `node scripts/check-ui-contract.mjs`: suíte anterior aprovada após as adaptações mecânicas. O teste C127 foi executado separadamente.
- `node --check scripts/qa-browser-student-navigation-focus.cjs`: sintaxe aprovada.
- `git diff --check`: aprovado.

Os 64 cenários executam as funções e os handlers da view completa. Cobrem todos os pontos de entrada, conservação do alvo e da versão, ausência/erro/malformação, retry manual, respostas fora de ordem, interação em cada etapa assíncrona, perda de foco da janela, mudança de aba, destinos desconectados, entrega única, chamadas passivas, estado pessoal preservado e revogação durante corpo tardio. Nenhuma lógica de decisão de foco foi copiada para o harness.

O módulo Chromium prepara **37 verificações**. Usa contexto e fixtures privados por página e `bringToFront` para os gestos que devem receber foco. A perda de foco da janela é um evento `blur` controlado pelo harness, entregue ao listener real; não é apresentada como troca nativa de aba. As esperas pelo início e pelo término das requisições suspensas têm prazo de oito segundos; a espera de término observa `requestfinished` ou `requestfailed`, seguida de rede ociosa, sem depender de `Response.finished()`. Cada suspensão é liberada explicitamente no cenário ou pelo `finally`. O estágio é registrado antes da limpeza em falha.

O módulo cobre desktop e largura móvel, teclado, navegação comum e por posição, cancelamento por interação, mensagens úteis, alvos retirados, versão exata, handlers antigos, atualizações passivas e 403/419 com resposta tardia. Ele está preparado para a CI; Chromium não foi executado localmente. Este documento não atribui aprovação de CI, homologação de tecnologia assistiva ou aceite humano a testes ainda não executados.

## Integração com o leitor atual

A integração preservou os hooks de histórico de C126 e incorporou C128 sem
remover asserções anteriores. O checker principal completo passou com os
64 cenários de foco, os 38 de histórico e os 34 de seções. Os ambientes
sintéticos receberam somente as primitivas de documento/janela necessárias.

O módulo de 37 verificações foi incluído no runner Chromium. O percurso
Laravel recebeu cinco verificações: foco ao selecionar curso, continuidade de
Tab dentro da aula, retomada exata e foco na ida/volta por sugestões. As páginas
são trazidas à frente e aguardam visibilidade/foco antes dos gestos; o teste
anterior de posição guardada mantém a asserção de foco com a mesma precondição.
A sintaxe passou. A aprovação desses novos percursos depende da execução
integrada de CI; nenhum navegador foi executado localmente.

## Diagnóstico da primeira execução integrada

No SHA `b8667e730489fd4ba585dc01a4e58e8385f9efeb`, a
[execução 44219355416](https://github.com/rafhael100/imagine-universidade/actions/runs/44219355416)
aprovou validação, paridade Portal, Docker, imagem candidata e pacote editorial.
O navegador completou os primeiros casos de foco e parou após a próxima aula:
um seletor não escopado `[data-lesson-id='12']` encontrou a aula da lista e o
botão da posição guardada. O erro foi `strict mode violation` no harness,
antes da execução de C128 e da jornada Laravel dessa rodada.

Os seis seletores de aula restantes no módulo C127 foram limitados a
`#lesson-items [data-lesson-id=...]`. Nenhuma asserção, contagem ou regra do
produto foi removida para acomodar o resultado. A sintaxe passou; o efeito da
correção e os percursos ainda não executados dependem da próxima CI integrada.
O último conjunto completo aprovado continua sendo C126 no SHA `b67b9a4`.

### Segunda execução e foco em múltiplas páginas

No SHA `1d439bd81980107a784fafdcaea01ee3b534b8f2`, a
[execução 44222871749](https://github.com/rafhael100/imagine-universidade/actions/runs/44222871749)
voltou a aprovar os cinco jobs fora do navegador. O Chromium passou pelo
seletor corrigido e pelos três cancelamentos por interação durante respostas
pendentes. Em seguida, o teste de troca de aba excedeu oito segundos ao
esperar perda de foco após trazer outra página à frente.

Essa expectativa não corresponde ao ambiente do teste: a
[documentação oficial de múltiplas páginas do Playwright](https://playwright.dev/docs/pages#multiple-pages)
explica que cada página se comporta como ativa e focada. A correção remove a
suposição sobre a janela do sistema e emite `blur` controlado no Chromium.
Exige que o listener real invalide a intenção pendente, que o corpo autorizado
termine de carregar e que nenhuma entrega tardia ocorra, mesmo após um evento
posterior de `focus`. A contagem permanece em 37; o produto não foi alterado.
Os 64 cenários Node continuam cobrindo separadamente visibilidade, foco do
documento e mudança de atividade. Essa combinação não comprova comportamento
de um gerenciador de janelas ou tecnologia assistiva específicos.

A sintaxe e os 64 cenários passaram após o ajuste; a execução integral do
módulo e dos percursos seguintes permanece pendente no próximo SHA.

## Recortes identificados durante a preparação

| Capacidade aprovada | Evidência no código atual | Recorte útil e limite |
| --- | --- | --- |
| Catálogo e evolução editorial — BASE-UNI-01-04 / 03-06 | `admin.blade.php` oferece `#lesson-sort`; o repositório ordena por `sort_order,id` e atualiza uma aula por PATCH | Reordenação explícita de aulas de rascunho, com operação coerente para empates, concorrência e preservação de formulários. Não presumir publicação e rascunho paralelos, que o fluxo atual não produz |
| Compreensão acessível — BASE-UNI-02-02 / 02-06 | `splitLessonSections` reconhece rótulos editoriais literais; `lessonTextFragment` exibe cada seção como um único parágrafo | Orientação em textos longos por seções existentes e parágrafos, sem inventar resumo, conteúdo ou marcação executável |

Esses recortes podem ser desenvolvidos na base local com dados sintéticos. Integração de identidade e eventos oficiais de perda/restabelecimento depende do Portal; tutoria por modelo e mídia protegida dependem dos respectivos contratos/provedores; canais oficiais de suporte e comunicação dependem do ecossistema. Persistir feedback exige definir finalidade e retenção próprias, sem estender por suposição a política existente de progresso/favoritos. A revisão humana de materiais reais continua sendo distinta do desenvolvimento desses mecanismos.
