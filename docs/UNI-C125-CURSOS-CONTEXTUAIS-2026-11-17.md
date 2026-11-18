# UNI-C125 — Outros cursos do mesmo tema

Data de referência: 17/11/2026, conforme o contexto do usuário em America/Sao_Paulo.

## Resultado

A área de estudo passa a mostrar **Outros cursos deste tema** depois do conteúdo da aula. O aluno pode abrir uma das sugestões por escolha explícita ou usar **Ocultar sugestões nesta visita**. O controle **Mostrar sugestões nesta visita** permite exibi-las novamente.

As sugestões usam somente o catálogo publicado, autorizado e validado que a página já carregou. São até três outros cursos da mesma categoria do curso selecionado, na ordem editorial recebida. A explicação informa a categoria que originou a sugestão. Sem outro curso da categoria, o painel apresenta uma mensagem de ausência, sem substituir por cursos de outra categoria.

Essa entrega concretiza um recorte de BASE-UNI-03-03, BASE-UNI-07-03 e BASE-UNI-12-02 da [base funcional aprovada](08-fechamento-candidato/02-BASE-FUNCIONAL-14-MODULOS.md): recomendações contextuais opcionais e percursos livres, sem constrangimento ou classificação pessoal.

## Critério das sugestões

O helper `contextualCourses` recebe o catálogo já validado e o ID do curso selecionado. Ele localiza esse curso, seleciona os demais com a mesma categoria e conserva os três primeiros na ordem original.

A seleção não usa conclusão, favorito, posição de leitura, tempo, cliques, contrato de produto, pontuação ou perfil. Um curso concluído ou sem aulas continua na sua posição editorial se estiver na lista autorizada. A abertura de um curso sem aulas usa o estado vazio já existente.

Busca, filtros de categoria e filtro de favoritos não classificam essas sugestões. O contexto é o curso atualmente escolhido. Ao abrir uma sugestão, o fluxo existente `openCourseWithAllFilters` ajusta os filtros da biblioteca para permitir a seleção explícita do curso.

## Escolha durante a visita

`state.contextualCoursesVisible` guarda a escolha somente na memória desta página. A preferência de ocultar permanece quando o aluno troca de curso ou a biblioteca é consultada novamente. Uma página nova começa com a configuração padrão de mostrar sugestões.

Renderizar, mostrar ou ocultar o painel não consulta endpoints, não modifica dados de aprendizagem e não usa `localStorage`, `sessionStorage`, cookies de preferência ou eventos de comportamento. A funcionalidade não cria um histórico de recomendações.

O painel fica sem linhas e oculto quando não há curso selecionado, quando o curso não está mais no catálogo atual ou enquanto a biblioteca não está validada. O controle de sugestões fica desabilitado nesses estados. A ação **Continuar aulas pendentes** mantém seu comportamento anterior.

## Abertura e proteção de estado

Cada botão contém o ID de um curso já presente no catálogo. O clique confere novamente:

- Acesso e catálogo continuam válidos.
- As sugestões continuam habilitadas.
- A geração de renderização e a seleção de curso continuam sendo as que produziram o botão.
- O curso de origem ainda tem o mesmo ID e categoria.
- O curso de destino ainda existe, é outro curso e continua na mesma categoria.

Depois dessas verificações, a abertura usa o fluxo existente: nova leitura da lista de aulas, da aula escolhida e do seu progresso. A sugestão não entrega corpo de aula a partir de cache próprio e não abre automaticamente um curso.

Uma atualização do catálogo, uma troca de seleção ou a ocultação das sugestões invalida os botões anteriores. Mesmo um elemento removido do DOM não conserva autoridade para navegar se seu handler for chamado depois.

As respostas 403 e 419 continuam passando por `lockAccess`. O painel limpa linhas e descrição de categoria, é ocultado e desabilita seus controles. Uma resposta tardia de catálogo não pode recriá-lo após a revogação. Falhas ao abrir um curso preservam a recuperação manual já existente, sem nova tentativa automática.

## Apresentação e seletores

O painel fica após `#lesson-content`, dentro da área **Sua aprendizagem**. Cada sugestão mostra o título atual do catálogo e a ação **Abrir curso**, usando texto literal. Não mostra barras, contadores de conclusão ou classificação pessoal.

O botão de visibilidade usa `aria-controls` e `aria-expanded`. A descrição/ausência usa status textual. A lista admite quebra de títulos longos e a disposição acompanha a largura da área de estudo.

| Elemento | Seletor |
| --- | --- |
| Painel | `#contextual-courses-panel` |
| Título | `#contextual-courses-title` |
| Mostrar/ocultar | `#contextual-courses-toggle` |
| Razão ou estado vazio | `#contextual-courses-status` |
| Lista | `#contextual-courses-list` |
| Abrir curso | `[data-contextual-course-id]` |

## Arquivos

- `resources/views/university/student.blade.php`: apresentação, estado em memória, seleção contextual e guards do clique.
- `scripts/check-contextual-courses.mjs`: teste focal do script completo e handlers reais.
- `scripts/qa-browser-contextual-courses.cjs`: módulo do laboratório de navegador com fixtures isoladas por página.
- `scripts/qa-framework-browser.cjs`: percurso complementar HTTP contra Laravel e SQLite descartável, sem respostas de negócio simuladas.

As alterações nos checkers C112, C116, C118 e C120 incluem as novas dependências reais de encerramento/renderização. O harness isolado de fluxo de aluno no checker principal recebeu somente o stub da nova renderização. Nenhuma asserção anterior foi removida ou afrouxada. A importação do checker e a chamada do módulo nos runners principais são integradas separadamente.

## Verificação

Foram executados localmente sem navegador ou servidor:

- `node scripts/check-contextual-courses.mjs`: **39 cenários aprovados**.
- `node scripts/check-ui-contract.mjs`: suíte principal aprovada após as adaptações mecânicas; o teste C125 foi executado separadamente.
- `node --check scripts/qa-browser-contextual-courses.cjs`: sintaxe aprovada.
- `node --check scripts/qa-framework-browser.cjs`: sintaxe aprovada.
- `git diff --check`: aprovado.

Os 39 cenários verificam categoria exata, exclusão do curso atual, ordem editorial, limite de três, estado vazio, nenhum uso de progresso para ordenar, preferência em memória, ausência de requisições na renderização, preservação dos dados pessoais, abertura pelas leituras autorizadas, botões removidos/obsoletos, atualização do catálogo, falha com recuperação manual e revogação.

O módulo Chromium prepara **20 verificações** do fluxo visível. Usa o HTML e os handlers reais, contexto isolado, fixtures por página e prazos para navegação/limpeza. Verifica ordem e justificativa, preferência durante a visita, localização após a aula, ausência de escrita/armazenamento, clique autorizado, alvo retirado, texto literal, falha temporária e 403/419.

Chromium não foi executado localmente. Este registro distingue código/testes preparados da futura evidência de CI no SHA integrado.

## Percurso real preparado

O laboratório HTTP já existente é ampliado somente depois de suas verificações originais de catálogo com um curso, retirada, consulta histórica, republicação e exportação de progresso. Nesse ponto, o editor cria um segundo curso fictício de Negócios, adiciona uma aula e publica sua primeira versão pela interface real, usando o preflight, a confirmação e o hash de conteúdo já exigidos.

O curso adicional não é introduzido por seed ou escrita direta no banco. Criação, gravação da aula e publicação passam pelos endpoints Laravel e persistem no SQLite exclusivo do laboratório. O rascunho temporário do teste de DELETE anterior continua sendo excluído; os asserts originais não são enfraquecidos para acomodar o novo curso. O bootstrap e as fixtures de identidade permanecem inalterados.

Com os dois cursos publicados, o aluno:

1. Recebe o catálogo real com exatamente os dois IDs esperados, na ordem editorial e na categoria Negócios.
2. Vê a razão da sugestão sem que a outra aula seja consultada antecipadamente.
3. Oculta e mostra sugestões sem gerar novas requisições privadas ou escritas, mantendo a aula selecionada e a ação de continuar aulas pendentes.
4. Abre o outro curso e volta ao curso original por cliques explícitos. A ida e a volta devem produzir somente as seis leituras existentes de lista de aulas, conteúdo e progresso.
5. Mantém exatamente os mesmos favoritos e suas datas, conclusões históricas e posição de leitura com sua revisão. A comparação usa snapshots reais das APIs próprias antes e depois.
6. Tem o painel e seus controles limpos na revogação. Após nova entrada elegível, a sugestão volta a usar os IDs específicos do catálogo atual.

Esse complemento prepara **17 verificações adicionais** no runner real, incluindo as três verificações reutilizadas da publicação do segundo curso. O segundo curso não recebe favorito, conclusão ou posição de leitura. A invariância já exigida pelo bootstrap — duas posições, sendo uma referência e um slot esvaziado — permanece intacta.

A comparação das seis rotas conserva quantidade e multiplicidade exatas, exigindo somente GET e nenhuma escrita. A chegada dos eventos de conteúdo e progresso pode variar porque essas duas leituras são concorrentes; a sequência de ida e volta continua sendo confirmada pelas respostas e pelos títulos exatos de cada aula.

O runner também prepara capturas do painel em desktop e em largura móvel, verificando ausência de transbordamento horizontal. Os arquivos ficam no diretório de evidências isolado da CI. Nenhuma execução local de navegador, PHP ou banco foi realizada para essa extensão.

## Limites do recorte

Esta é uma sugestão editorial por categoria. Não é recomendação por IA ou inferência de necessidade pessoal, não muda a elegibilidade, não bloqueia cursos e não atribui direitos nos produtos Imagine. A escolha de ocultar dura somente enquanto esta página existir. Preferências permanentes, notificações, campanhas e comunicação com outros sistemas permanecem fora deste recorte.
