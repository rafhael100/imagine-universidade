# C138 — limite de inteiros nos IDs das rotas legadas

Data de referência do ciclo: 17/11/2026. Base: `8368d5261915412233726eafacd5e057bd04e303`.

## Problema e evidência

Dezesseis actions antigas de `UniversityController` recebiam diretamente `int $courseId` ou `int $lessonId`. Suas rotas usam `whereNumber`, que no Laravel instalado aceita qualquer sequência de dígitos, sem limite de magnitude. O dispatcher resolve as dependências e passa a string da rota ao método do controller.

O código oficial do PHP 8.3 rejeita a coerção para `int` de uma string numérica fora de `PHP_INT_MAX`. A falha ocorre antes do corpo da action; os `try/catch` internos não a interceptam. O handler de exceções do Laravel usa status 500 para essa exceção comum. Por exemplo, em PHP de 64 bits, `9223372036854775808` atravessa o regex da rota e excede o tipo do parâmetro.

Essa cadeia foi confirmada por leitura do projeto e das fontes primárias. Não houve reprodução HTTP com PHP local nesta entrega. A nova regressão Feature percorre o dispatcher HTTP real e está preparada para execução na CI.

## Recorte e compatibilidade

O controller recebe esses 16 parâmetros como `string` e aplica `legacyRouteIdentifier()` no início de cada action. O helper exige dígitos, remove somente os zeros à esquerda e compara comprimento e `strcmp` com a representação decimal de `PHP_INT_MAX`. A conversão para `int` acontece apenas depois dessa verificação, sem passagem por `float` nem cast que sature o valor.

| Entrada na rota legada | Comportamento |
| --- | --- |
| `0` ou uma sequência só de zeros | Entrega `0` ao fluxo existente; não converte automaticamente em erro de parser. |
| `00042`, inclusive com muitos zeros à esquerda | Entrega o mesmo inteiro `42`. |
| Decimal representável, até `PHP_INT_MAX` | Mantém validação de payload, consultas, permissões e resultado existentes. |
| Decimal maior que `PHP_INT_MAX` | Retorna `404 {"error":"not_found"}` antes de validar payload, consultar dados educacionais ou chamar o Tutor. |
| Caracteres que não correspondem a `whereNumber` | Mantém o roteamento e fallback existentes; esta entrega não altera o regex. |

`archivedRouteNumber()` continua separado. Seu contrato positivo, canônico e limitado ao inteiro seguro de JavaScript pertence às rotas de histórico editorial e reordenação já existentes. Reutilizá-lo aqui mudaria a semântica de zero, zeros à esquerda e números representáveis acima de `9007199254740991`.

Um ID válido mas ausente continua produzindo o retorno próprio de cada operação, com payload válido e grant atual:

| Operação | Resultado legado preservado |
| --- | --- |
| Listar aulas do aluno ou do editor | `200 {"lessons":[]}`. |
| Remover favorito positivo inexistente | `200 {"course_id":id,"favorite":false}`; não cria um teste de existência de conteúdo. O ID zero continua `404`. |
| Publicar curso inexistente | `409 {"error":"missing_lesson_or_changed_draft"}`. |
| Alterar curso/aula ou criar aula em curso inexistente | `404 {"error":"not_found_or_published"}`. |
| Excluir curso/aula inexistente | `404 {"error":"not_found_or_protected"}`. |
| Favoritar, obter aula/progresso, concluir, consultar Tutor/preflight ou retirar publicação inexistente | `404 {"error":"not_found"}`. |

Não há mudança de contrato de ID no domínio, de formato de URLs, de schema, de grants ou de DTOs de sucesso. A remoção idempotente de favorito segue devolvendo o ID inteiro que já era aceito no backend; esta correção de overflow não amplia o domínio aceito pelos validadores da UI.

## Sequência de autorização e efeitos

A pilha web de sessão/CSRF e o middleware `university.grant:view` ou `university.grant:manage` continuam anteriores à action. Dentro dela, o parser antecede a validação de payload e o fluxo de domínio existente. Assim, um grant negado permanece `403`; uma escrita sem CSRF válido permanece `419`. Não há um caminho público novo para consultar conteúdo ou inferir sua existência.

As validações transacionais de `freshGrant`, a ordem dos locks e os contratos de resultado das escritas não foram alterados. Para GET/HEAD, inclusive o novo `404` de overflow, o middleware continua revalidando a autoridade antes de liberar a resposta. A fronteira privada também conserva JSON, `no-store`, `private`, ausência de redirecionamento e demais headers de segurança.

## Inteiros do PHP e do banco

As migrações definem as chaves de cursos e aulas com `$table->id()`. No Laravel isso corresponde a `bigIncrements`; a gramática PostgreSQL produz `bigserial`/`bigint`, não `integer` de 32 bits. Esses tipos aceitam até `9223372036854775807`. Os campos de versão e ordem têm outros domínios, que não estão sendo modificados.

`Connection::bindValues()` liga um inteiro PHP como `PDO::PARAM_INT`. No driver PDO PostgreSQL do PHP 8.3, o valor escalar é enviado como texto decimal e o tipo do parâmetro fica inferido pelo SQL. Não há motivo para impor `2147483647` a uma comparação de PK `bigint`; também não se deve deixar uma string maior que o inteiro do runtime chegar à conversão do parâmetro do controller. O novo helper protege precisamente essa fronteira, sem mudar queries ou bindings.

## Arquivos e verificação

Produção: `app/Http/Controllers/UniversityController.php`, com um helper e os 16 pontos de entrada. Permanecem intactos `routes/web.php`, repositório, middleware, providers, schema, views, runners e workflows.

`tests/Feature/LegacyRouteIdentifierBoundaryTest.php` contém oito métodos preparados, usando Laravel, migrações e SQLite reais. Somente a autoridade de identidade e um spy de Tutor desativado são sintéticos. Os cenários cobrem:

- Os 16 caminhos HTTP com o primeiro decimal fora da faixa e uma sequência longa com zeros iniciais; esperam `404` privado, nenhuma query educacional, nenhuma chamada ao Tutor e snapshot completo inalterado.
- IDs ausentes `999999` e `PHP_INT_MAX`, com cada status e recibo legado preservado.
- Zero, muitos zeros iniciais e, em runtime de 64 bits, valores acima de `int4` e de `MAX_SAFE_INTEGER` que continuam representáveis.
- Uma sequência de ações reais nos 16 endpoints, usando aliases com 40 zeros à esquerda; criação, edição, publicação, conclusão, favoritos e exclusões conservam os recibos e o recurso exato. PATCH sem ordem continua preservando os valores da C133/C137.
- Precedência do parser sobre payload inválido somente para overflow, com `422` legado preservado para IDs representáveis.
- Provider padrão que nega acesso, capacidade incorreta, CSRF real ativado pelo marcador de ambiente de teste e revalidação final de GET.
- Recusa da autoridade dentro da transação de conclusão, sem alteração persistida e com o resultado legado preservado.

Verificações locais executadas: checker Node existente de escritas (`check-write-fence.mjs`, 15 caminhos) e inspeção de diff/whitespace. PHP, PostgreSQL e navegador não foram executados localmente. Os oito métodos Feature ficam pendentes da CI integrada; não há novo probe ou gate declarado satisfeito.

## Fontes primárias consultadas

O `composer.lock` fixa Laravel `v13.42.0`, commit `f5c01f6b63803f16f38ebb31622c4fea412bd022`:

- [ControllerDispatcher: chamada da action após resolução de dependências](https://github.com/laravel/framework/blob/f5c01f6b63803f16f38ebb31622c4fea412bd022/src/Illuminate/Routing/ControllerDispatcher.php).
- [whereNumber: expressão `[0-9]+`](https://github.com/laravel/framework/blob/f5c01f6b63803f16f38ebb31622c4fea412bd022/src/Illuminate/Routing/CreatesRegularExpressionRouteConstraints.php).
- [Handler: resposta JSON de exceções comuns com status 500](https://github.com/laravel/framework/blob/f5c01f6b63803f16f38ebb31622c4fea412bd022/src/Illuminate/Foundation/Exceptions/Handler.php).
- [Connection: bindValues e preparo de parâmetros](https://github.com/laravel/framework/blob/f5c01f6b63803f16f38ebb31622c4fea412bd022/src/Illuminate/Database/Connection.php).
- [Blueprint: id e bigIncrements](https://github.com/laravel/framework/blob/f5c01f6b63803f16f38ebb31622c4fea412bd022/src/Illuminate/Database/Schema/Blueprint.php) e [gramática PostgreSQL](https://github.com/laravel/framework/blob/f5c01f6b63803f16f38ebb31622c4fea412bd022/src/Illuminate/Database/Schema/Grammars/PostgresGrammar.php).
- [PHP 8.3: zend_parse_arg_long_weak](https://github.com/php/php-src/blob/PHP-8.3/Zend/zend_API.c), [verificação de parâmetros escalares](https://github.com/php/php-src/blob/PHP-8.3/Zend/zend_execute.c) e [binding do driver PDO PostgreSQL](https://github.com/php/php-src/blob/PHP-8.3/ext/pdo_pgsql/pgsql_statement.c).
- [PostgreSQL: faixas dos tipos numeric, integer, bigint e bigserial](https://www.postgresql.org/docs/current/datatype-numeric.html).

## Integração preparada

Os três arquivos foram integrados após C136/C137, preservando integralmente os novos recibos e a edição de ordem. A correção textual C139 usa o mesmo painel existente. A suíte Node principal completa, a cerca estática dos **15 caminhos de escrita** e a conferência de diff passaram na combinação. Duas leituras independentes de produção, Feature e documentação não encontraram bloqueadores.

Os **oito métodos Feature C138** dependem da CI do próximo SHA. A referência anterior completa é `8368d526` / [run 44230182074](https://github.com/rafhael100/imagine-universidade/actions/runs/44230182074), com seis jobs aprovados, 351 testes PHP/3.959 asserções, 746 verificações sintéticas e 232 pelo Laravel real; esses números não incluem a nova regressão C138.

## Primeiro runtime C138 e correção da observação de erros

O [run 44231820243](https://github.com/rafhael100/imagine-universidade/actions/runs/44231820243), SHA `1e223288cdaad68ae2758d4fbcfa8c0e97d6b6b4`, aprovou **cinco jobs**, incluindo **359 testes PHP / 4.726 asserções** (39 Unit/169 e 320 Feature/4.557), todos os oito métodos C138 e os probes PostgreSQL. O Chromium sintético passou **746 verificações**.

O percurso Laravel real parou após a verificação 29: o runner tentou interpretar o JSON de um PATCH 409 e observou `network=aborted`. A aplicação trata erros pelo status; C120 drena o corpo sem decodificá-lo e pode cancelar o stream ao atingir limites ou erro. O log confirma a indisponibilidade do corpo para o runner, sem provar qual condição específica causou o aborto. Não é correto depender dessa segunda interpretação para observar a recuperação da UI.

A correção do runner abrange somente as três respostas de erro originadas pela UI que ainda eram interpretadas: os conflitos de ordem de aula/curso e o Tutor desativado. Exige o status 409/503, Content-Type JSON, headers privados/no-store e ausência de redirecionamento. Mantém as verificações de dados/auditoria intactos, campos locais, recuperação manual, material literal e ausência de mutações. Não altera o produto, não espera `Response.finished`, não simula resposta nem repete a requisição. Os DTOs exatos seguem testados pelos Feature C133/C137, PortalBoundaryFlowTest e C138.

A sintaxe do runner e o diff passaram. A aprovação completa depende da próxima CI. A fonte primária do [Playwright v1.58.2](https://github.com/microsoft/playwright/blob/v1.58.2/packages/playwright-core/src/server/network.ts) distingue a leitura do corpo, que aguarda o término da resposta, dos metadados de status/headers já recebidos.
