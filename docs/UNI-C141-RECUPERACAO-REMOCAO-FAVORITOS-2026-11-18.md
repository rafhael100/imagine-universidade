# C141 — Recuperação de remoção de favoritos sem falso sucesso

Data: 18/11/2026. Base: `92d8452b5cb3e65308a11044747f75d6c77e9cd5`, já com C140.

## Falha reproduzida

O botão de favorito do curso usava `GET /favorites` para reconciliar tanto PUT quanto DELETE sem recibo válido. Essa consulta retorna somente favoritos atualmente publicados. A ausência de um ID pode significar retirada editorial, mesmo que a referência pessoal continue guardada.

A sequência foi reproduzida antes da correção com o script completo da view principal e o harness existente de C123, sem executar PHP ou navegador:

1. O curso 1 estava selecionado e favoritado.
2. O clique em remover enviou um único `DELETE /courses/1/favorite`. A fixture devolveu 503 sem apagar a preferência e simulou uma retirada editorial independente.
3. A reconciliação automática `GET /favorites` devolveu `course_ids:[]`, conforme a projeção de publicados.
4. A interface mostrou **“Remoção confirmada após consulta ao servidor.”**, com `favoriteOutcomeUnknown:false` e `favoritesReady:true`.
5. Uma consulta manual `GET /favorites/retained` ainda mostrou o curso 1 como indisponível, com a ação de remover.

A causa estava em `toggleCourseFavorite`: a comparação entre ausência do ID e intenção de remover tratava a projeção publicada como prova de exclusão da referência retida. `UniversityCatalogRepository::favoriteCourseIds` filtra curso/versão publicados; as consultas retidas e a exportação preservam referências próprias após retirada, conforme C118/C123. O backend não precisa ser alterado para corrigir essa interpretação.

## Correção mínima

A alteração de produção fica em `toggleCourseFavorite`, na view do aluno. DELETE incerto passa a usar o estado de recuperação de remoção que C123 já possui. Erro HTTP sem revogação, recibo inválido ou troca incompatível do contexto deixam a remoção **não confirmada**, invalidam a lista retida e orientam consultar **Gerenciar favoritos**.

Esse caminho não faz GET automático nem repete o DELETE. O recibo exato com o mesmo `course_id` e `favorite:false` continua confirmando uma remoção compatível. A reconciliação de PUT permanece: presença positiva numa consulta válida pode confirmar que o favorito está disponível. Ausência continua sem provar remoção retida.

403/419 prevalecem sobre a recuperação: `lockAccess` purga a interface, inclusive os avisos e guardas de favoritos. Uma resposta tardia não pode restaurá-los. A exclusão mútua e os tokens de escrita existentes permanecem intactos.

## Significado dos estados e recuperação manual

| Estado | Responsabilidade |
| --- | --- |
| `favoritesReady` e `favoriteOutcomeUnknown` | Controlam se a projeção de favoritos publicados foi consultada com sucesso e pode orientar os controles do curso. Um GET válido pode tornar essa projeção conhecida; isso não prova a remoção anterior. |
| `retained.needsRefresh` | Bloqueia novas alterações de favorito até uma consulta retida manual válida. `GET /favorites` não limpa essa guarda. |
| `retained.unconfirmed` | Conserva o aviso de que a remoção anterior não foi confirmada. Uma consulta, inclusive vazia, não o apaga nem transforma o resultado anterior em sucesso. |

Após o DELETE incerto, a projeção fica desconhecida e a guarda retida fica ativa. A recuperação usa os controles existentes:

- **Para remover uma referência ainda presente:** consultar Gerenciar favoritos e clicar em remover na linha validada. Esse é um novo gesto explícito, com novo recibo; não é repetição automática da tentativa anterior.
- **Para voltar a alterar pelo botão do curso:** consultar os favoritos publicados e as referências retidas, em qualquer ordem. A consulta publicada restaura a projeção atual; a consulta retida válida libera sua guarda. O aviso sobre o resultado anterior permanece.
- **Se a página retida vier vazia:** mostrar apenas que nenhuma referência foi encontrada nessa consulta. Não afirmar que o DELETE anterior ocorreu, nem inferir ausência global a partir de uma página.
- **Se a consulta manual falhar ou vier malformada:** manter a guarda, apresentar recuperação manual e continuar permitindo o estudo autorizado.

Uma consulta retida, sozinha, não promove uma página parcial para a lista completa de favoritos publicados. Ela permite ações nas linhas presentes, mesmo quando a projeção publicada ainda está desconhecida. Os testes exercitam as duas ordens de consulta para demonstrar recuperação alcançável, sem bloqueio permanente.

Curso, aula, texto do leitor, filtros, progresso e posição de leitura não são descartados pelo novo tratamento. Não foram criados endpoint, política de retenção, leitura automática, armazenamento no navegador, seletor ou helper global.

## Regressões nos ensaios existentes

Os testes foram acrescentados aos checkers e módulos C116/C123 existentes, sem criar um harness novo:

| Verificação | Evidência local |
| --- | --- |
| `scripts/check-student-favorites.mjs` | **61 cenários passaram**, 11 adicionais. Incluem recibos DELETE inválidos, cinco mudanças de contexto, perda de resposta e precedência de 403/419. |
| `scripts/check-retained-favorites.mjs` | **79 cenários passaram**, seis adicionais. Incluem a retirada reproduzida, remoção ainda guardada, página vazia, recuperação nas duas ordens, falha manual, resposta antiga e atualização da biblioteca. |
| `node scripts/check-ui-contract.mjs` | **Passou integralmente**, incluindo os cenários legados e C140. |
| Sintaxe dos dois módulos Chromium | `node --check` passou. |
| `git diff --check` | Passou. |

O módulo `qa-browser-student-favorites.cjs` prepara **35 checks**: dois adicionais de revogação durante DELETE e adaptação do cenário já existente de resposta perdida. PUT continua com a mesma verificação positiva. O módulo `qa-browser-retained-favorites.cjs` prepara **46 checks**: nove adicionais para retirada, recuperação, vazio, recibo inválido e mudança de curso. Esses números são preparação para CI, não resultado de execução local do navegador.

Dois cenários Node e um cenário Chromium que testam exclusão mútua durante GET de reconciliação passaram a selecionar um curso não favoritado antes de disparar a escrita. Assim continuam exercitando PUT + GET e preservam seus asserts de concorrência; DELETE já não inicia essa leitura por definição.

O módulo C123 espera também a leitura inicial da posição antes de comparar o texto completo do leitor. Mantém o contexto e as rotas por página, limites de espera/limpeza de oito segundos e navegação de quinze segundos. As respostas retidas são liberadas pelo cenário e pelo `finally`. O módulo C116 conserva seus prazos e fixtures anteriores; as novas negativas de DELETE usam respostas imediatas.

Não há auxiliar/extrator novo nem mudança necessária no checker principal, imports ou seletores dos runners. Nenhum PHP, PostgreSQL ou navegador foi executado localmente; não houve consulta operacional, implantação, stage, commit ou push nesta entrega.
