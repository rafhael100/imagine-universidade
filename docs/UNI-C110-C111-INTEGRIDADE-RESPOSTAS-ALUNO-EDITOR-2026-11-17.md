# UNI C-110/C-111 — Integridade das respostas do aluno e editor

**17/11/2026 — continuação da PR #85, sobre a base validada `0c08d272`.**

## Problemas reproduzidos

O fluxo do aluno aceitava algumas respostas HTTP 200 incompletas como dados válidos. Um catálogo ou uma lista de aulas com campo `null` virava uma lista vazia; progresso ausente permitia concluir uma aula; a string `"false"` era interpretada como conclusão verdadeira. Um detalhe com identificador diferente do solicitado podia exibir uma aula enquanto o botão tentava concluir outra.

No painel editorial, o resultado do diagnóstico de publicação era usado sem validar sua estrutura. Uma resposta com `ready: "false"` ou com hash ausente podia chegar ao diálogo de confirmação e produzir um POST sem a identificação da versão revisada.

Esses casos foram reproduzidos com funções reais das views e respostas sintéticas. Não representam concessão de acesso a clientes nem bypass demonstrado da autorização do Portal.

## Comportamento da proposta

| Resposta | Validação aplicada antes de usar os dados |
|---|---|
| Inicialização | `ready` deve ser exatamente `true`. |
| Catálogo do aluno | Lista obrigatória; IDs e slugs únicos; campos e contagens válidos; campos internos extras não entram no estado da interface. |
| Lista de aulas | Lista obrigatória; identidade e metadados consistentes; progresso numérico `0` ou `1`, como no contrato SQL existente. |
| Detalhe e progresso | Aula correspondente ao ID solicitado e ao curso selecionado; texto válido; progresso individual estritamente booleano. |
| Resumo após conclusão | A mesma validação de catálogo; falha de resumo não desfaz uma conclusão já confirmada. |
| Diagnóstico editorial | Curso correto, versão e quantidade válidas, hash SHA-256 completo, `ready` booleano, listas de problemas coerentes e `advisory_only: true`. |

Uma resposta inválida gera indisponibilidade com nova tentativa manual. Ela não se transforma em conteúdo vazio legítimo, em progresso concluído ou em autorização para publicar. O detalhe da aula só aparece depois da validação conjunta do conteúdo e do progresso. Os limites de texto consideram caracteres Unicode e respeitam os limites existentes do backend.

O estado `libraryReady` mantém filtros, busca, navegação, simulador e exportação indisponíveis até a validação da biblioteca. Eventos de filtro após uma falha não apagam a mensagem nem reativam ações. Listas vazias válidas continuam sendo aceitas e não há novo limite de quantidade de cursos ou aulas; a regressão inclui listas de 5.001 registros.

A publicação pelo painel exige um diagnóstico íntegro antes do diálogo e envia o hash da versão revisada. Respostas inválidas limpam a indicação de prontidão e preservam os formulários. Respostas atrasadas e sessões revogadas continuam sendo descartadas.

## Compatibilidade e limites

O backend não muda: `expected_content_hash` permanece opcional para consumidores legados conforme a decisão explícita da C-53. A C-111 evita que uma falha na resposta do diagnóstico faça a interface normal usar esse caminho de compatibilidade involuntariamente. O hash continua sendo proteção de concorrência; não é prova de aprovação humana.

Não foram adicionados serviços, fontes de identidade, mecanismos de cobrança ou armazenamento de pesquisas. O provider Portal continua negando acesso enquanto a integração oficial não estiver homologada. Permanecem os 13 critérios operacionais, a revisão editorial pendente das 35 aulas e a condição `HOLD_NO_GO`.

## Evidências

Os testes de contrato executam os normalizadores extraídos do JavaScript real. A suíte Chromium verifica respostas incompletas, duplicadas ou com tipos incorretos, divergência de aula/curso, recuperação com dados válidos e ausência de POST indevido. No painel editorial, verifica também que uma resposta inválida não abre confirmação e que uma confirmação válida conserva o hash.

O verificador editorial acrescenta 35 cenários executados com as funções e os handlers reais da view. Os novos casos de navegador incluem 71 verificações do aluno e 14 do editor, integradas ao laboratório descartável existente. Nenhuma proteção que restringe esse laboratório à CI foi alterada.

Os resultados de execução, o SHA final e o link do GitHub Actions ficam registrados na PR #85. A existência desses testes não constitui aprovação humana de conteúdo, publicação operacional ou homologação da VPS.
