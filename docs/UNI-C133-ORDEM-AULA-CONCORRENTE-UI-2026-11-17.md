# C133 — salvamento de texto e posição da aula

Referência: rodada de 2026-11-17. Implementação e verificações locais desta entrega em 2026-11-18, sobre a base `c19bea9`, com C131 e C132 integradas. Esta referência não afirma aprovação da CI da base ou deste recorte.

## Falha reproduzida

O formulário enviava `sort_order` em todo PATCH de aula, mesmo quando a pessoa alterava somente título ou conteúdo. Uma sessão podia abrir a aula na posição numérica 0, outra sessão reordená-la para 1 pelo fluxo C129 e a primeira salvar texto reenviando 0. Esse pedido carregava uma posição antiga que a pessoa não estava tentando modificar.

A reprodução anterior à mudança executou o script e o submit reais da view em Node: baseline local 0, posição sintética do servidor alterada para 1 e edição somente do corpo produziram um PATCH com `sort_order: 0`.

## Comportamento implementado

Antes de `beginWrite`, o submit captura uma cópia mínima do registro selecionado: `{id, sort_order}`. A origem é `state.lesson`, preenchida pela lista editorial validada. O campo numérico continua sendo lido por `intField("lesson-sort")`, como no formulário anterior.

O pedido de atualização passa a distinguir duas intenções:

| Ação no formulário existente | Corpo enviado ao PATCH |
|---|---|
| Posição numérica igual ao baseline | `{title, body}` |
| Posição numérica diferente do baseline | `{title, body, sort_order, expected_sort_order}` |

`expected_sort_order` contém a posição do registro originalmente apresentado, não uma consulta preventiva e nem o valor de destino. O par é enviado como números JSON. Pelo contrato C133 do backend, quando a pré-condição está presente ambos os campos devem ser inteiros de 0 a 9999; a divergência da posição corrente resulta em HTTP 409 com `error: "draft_order_changed"`.

Representações numericamente equivalentes, como `0`, `000` e `0.0`, não constituem alteração de ordem para a comparação feita pelo formulário. Elas continuam seguindo a leitura numérica existente. O PATCH de texto não passa a reenviar a ordem atualizada apenas porque outra sessão a modificou: sua ausência pede ao servidor que preserve o valor armazenado.

O slug permanece fora do PATCH, como antes. Título e conteúdo continuam seguindo o tratamento de texto já existente. O POST de criação não foi alterado: conserva `{title, slug, body, sort_order}`, sem pré-condição de ordem.

## Confirmação e recuperação

O PATCH só avança para `refreshLessons(savedLessonId)` quando o recibo contém `saved: true` booleano. HTTP 200 sem esse campo, com `false`, string ou outro valor não confirma o salvamento. Campos extras do recibo não são aplicados ao formulário ou à ordem; o conteúdo exibido depois do sucesso vem da leitura autorizada existente.

O fluxo bem-sucedido continua sendo um PATCH seguido pelo GET de aulas que já atualizava o formulário. Não foi acrescentado GET preventivo, reconciliação automática, retry ou novo endpoint.

Conflito, erro de rede, perda de resposta ou recibo inválido passam pela cerca existente `freezeUncertainEditorialWrite`. A interface preserva os campos literais de curso e aula e a consulta C131, bloqueia outra escrita e mostra a recuperação manual existente. Não assume que uma operação falhou no banco apenas porque sua resposta não chegou.

Cancelar a confirmação de consulta manual conserva os campos sem fazer outra requisição. Aceitar permite substituir esses campos pelo estado atual do servidor, conforme o aviso já existente. Uma nova alteração numérica requer outro clique e usa o baseline recém-lido. Nenhum PATCH anterior é repetido automaticamente, inclusive quando o destino desejado já parece ter sido aplicado por outra sessão.

No sucesso, a leitura de aulas preserva o rascunho independente do formulário do curso, a seleção de aula e a busca local do mesmo curso. A confirmação e a substituição de campos durante recuperação manual mantêm as regras anteriores de C113/C131.

HTTP 403/419 continua encerrando o acesso e limpando os campos e filtros. Uma resposta de sucesso que chega depois de outra resposta ter revogado a sessão não restaura conteúdo nem inicia a atualização da lista.

## Limites do contrato

Esta proteção compara a posição numérica da aula no momento da atualização. Não cria uma revisão geral do documento, não condiciona título/corpo a uma versão anterior e não resolve conflitos entre duas edições simultâneas de texto. Também não identifica um histórico em que a posição mudou e depois voltou ao mesmo número.

O backend mantém o comportamento dos clientes legados que enviam `sort_order` sem `expected_sort_order`. A proteção condicional descrita aqui aplica-se ao novo par explícito; não deve ser atribuída a esses pedidos legados. Omitir a ordem em uma edição de texto é uma intenção independente da comparação condicional.

O teste de interface usa fixtures HTTP sintéticas para verificar os pedidos e as decisões da view. Atomicidade, locks, autorização e auditoria no banco pertencem aos testes Feature, ao probe PostgreSQL e à jornada Laravel real da integração. Nenhum resultado desses ensaios é presumido nesta entrega de UI.

## Arquivos e integração

| Arquivo | Responsabilidade |
|---|---|
| `resources/views/university/admin.blade.php` | Captura do baseline, escolha dos campos do PATCH e validação do recibo |
| `scripts/check-lesson-order-patch.mjs` | Script completo e handlers reais em Node VM |
| `scripts/qa-browser-lesson-order-patch.cjs` | Módulo isolado para o runner Chromium protegido |
| Este documento | Contrato da UI, limites e evidências locais |

Nenhuma alteração mecânica nos checkers legados foi necessária. O checker principal completo passou com as asserções anteriores intactas. A importação do novo checker, a chamada do módulo Chromium e a jornada Laravel real são tarefas da integração.

O módulo usa `({browser,base,ensureLocalPage,check,pageErrors})`, cria seu próprio contexto e restringe as rotas sintéticas às páginas que cria. Duas páginas podem compartilhar apenas a fixture de servidor do cenário para representar visões antigas e atuais da mesma ordem. Isso não afirma autenticação ou concorrência real de banco.

São reutilizados os seletores existentes `#lesson-title`, `#lesson-body`, `#lesson-sort`, `#lesson-save`, `#editorial-lesson-search` e `#retry-catalog`. Não há novos controles, alteração de CSS ou mudança nos seletores do percurso atual.

## Verificação

Executado localmente:

- **28 cenários Node aprovados** em `check-lesson-order-patch.mjs`, executando o script completo e os handlers reais. Incluem duas instâncias de editor com fixture compartilhada e reordenação pelo handler C129, omissão da ordem inalterada, limites numéricos, par explícito, conflito sem alteração de corpo, destino já aplicado, buffers e filtro preservados, recuperação manual com novo baseline, resposta perdida depois de commit sintético, recibos 200 malformados, POST inalterado, single-flight, HTTP 403/419 e resposta tardia após revogação.
- **Checker principal completo aprovado** depois da mudança da view, sem relaxamento de asserções e sem mocks adicionais.
- **Sintaxe do módulo Chromium e `git diff --check` aprovados**.

Preparado, sem execução local:

- **19 verificações Chromium** em `qa-browser-lesson-order-patch.cjs`. Exercitam as duas páginas com ordem divergente, os corpos exatos dos pedidos, o resultado condicional, os formulários/filtro, a confirmação de recuperação, resposta perdida, recibo inválido, criação, single-flight e limpeza de acesso.
- As esperas de requests suspensos, os gates e o cleanup do módulo têm prazo de 8 segundos; cada gate também é liberado no `finally`. O módulo não usa `Response.finished` e não inicia serviços.
- O percurso Laravel real preparado pelo integrador abre uma segunda sessão editorial antes de C129, verifica a preservação da ordem ao salvar texto, provoca um conflito por edição numérica em outra sessão, consulta banco/auditoria, exige recuperação manual e termina com a ordem restaurada para a jornada existente. Sua leitura independente não encontrou bloqueador de sequência ou contrato; a execução continua reservada à CI.

Não houve execução local de navegador, PHP, PostgreSQL ou serviço operacional. Não foram modificados backend, runners, workflows, grants, schema ou configuração de Portal nesta entrega de UI. Não foi realizado stage, commit ou push.

## Integração preparada

O checker de 28 cenários e o módulo Chromium de 19 verificações foram incluídos nos runners existentes. A suíte Node principal completa, a cerca estática dos 15 caminhos de escrita, a sintaxe dos runners e a conferência de diff passaram após integrar backend e UI. Revisão independente não encontrou bloqueadores.

O runner Laravel/SQLite acrescenta **13 verificações preparadas**: três na sessão/CSRF da segunda instância do mesmo editor, uma no baseline antigo e nove no fluxo de texto, alteração explícita, conflito, auditoria, cancelamento/aceite da recuperação e nova ação. A comparação de auditoria exige dois eventos anteriores confirmados, além de igualdade após a rejeição. Não há quarta identidade nem resposta de negócio simulada. A ordem é restaurada antes da exclusão da aula temporária já existente. A captura `framework-lesson-order-conflict.png` e os resultados de runtime dependem da CI deste código integrado.

## Primeiro runtime e ajuste do percurso real

O [run 44227212699](https://github.com/rafhael100/imagine-universidade/actions/runs/44227212699), SHA `3894f10715be4d52a9a3d4d946cc9923617e05f5`, aprovou cinco jobs e as **702 verificações Chromium sintéticas**, incluindo as 19 novas. O backend registrou **328 testes PHP / 3.721 asserções**, com os probes PostgreSQL C133/C134 aprovados.

No percurso Laravel, a segunda sessão salvou texto e preservou a ordem concorrente com sucesso. O ensaio seguinte detectou um erro na própria preparação: clicar no curso e na aula já selecionados é uma operação sem efeito na interface; não atualiza o conteúdo salvo pela outra sessão. O runner corrigido usa **Novo curso** apenas para deixar a seleção, sem criar registro, e reabre o curso existente para executar o GET real de aulas. Faz isso antes da alteração explícita e da comparação final. As asserções, o produto e o número de verificações permanecem intactos. A conclusão do percurso real depende da nova execução.

## Percurso completo executado

O [run 44228136328](https://github.com/rafhael100/imagine-universidade/actions/runs/44228136328), SHA `2bec87cbb1ce998a518311575c18457125a7ae89`, aprovou os **seis jobs**, com **328 testes PHP / 3.721 asserções**, **702 verificações Chromium sintéticas** e **221 verificações pelo Laravel/SQLite real**. O percurso de duas sessões confirmou a omissão da ordem ao editar texto, alteração numérica com baseline, conflito 409 sem alteração de registros ou auditoria, preservação dos campos, cancelamento/aceite da consulta manual e nova ação com a ordem restaurada. Persistência e os probes PostgreSQL passaram.

A captura real `framework-lesson-order-conflict.png` foi inspecionada: aviso e campos preservados legíveis, controles de gravação bloqueados e recuperação manual visível. Essa aprovação refere-se ao SHA acima; incrementos posteriores precisam de sua própria execução.
