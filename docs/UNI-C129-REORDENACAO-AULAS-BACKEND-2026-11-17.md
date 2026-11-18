# UNI-C129 — Reordenação atômica de aulas em rascunho

Data de referência: 17/11/2026. Base de implementação: C126, `b67b9a4`.
Código candidato preparado para revisão e execução na CI; este documento não
atribui aprovação de runtime ao novo código.

## Resultado e limites

Um operador editorial autorizado pode mover uma aula uma posição para cima ou
para baixo por uma única operação. O servidor recebe a ordem completa observada,
deriva o destino dessa ordem e compara ambos com o estado atual sob lock.
Empates em `sort_order` são resolvidos dentro de uma transação; a interface não
precisa enviar duas alterações independentes.

O recorte usa o catálogo versionado de BASE-UNI-03-06 e o controle de publicação
de BASE-UNI-04-05 da
[base funcional aprovada](08-fechamento-candidato/02-BASE-FUNCIONAL-14-MODULOS.md).
Não publica, restaura, cria uma versão, muda conteúdo ou representa aprovação
editorial. Versões publicadas e arquivadas permanecem protegidas.

Não há migração, índice, papel SQL, permissão ou política de retenção nova.
O provider operacional continua `UnavailablePortalAuthority`; nenhuma fonte de
identidade alternativa é introduzida.

## Contrato HTTP

`POST /universidade/private/admin/courses/{courseId}/lessons/reorder`

A rota usa `university.grant:manage`, sessão e CSRF reais do grupo web. O grant
precisa pertencer à organização editorial canônica `imagine-editorial`.
Empresa, sujeito e revisão de autoridade nunca vêm do payload.

```json
{
  "lesson_id": 12,
  "direction": "up",
  "expected_order": [
    {"id": 11, "sort_order": 0},
    {"id": 12, "sort_order": 0},
    {"id": 13, "sort_order": 0}
  ]
}
```

`lesson_id` e os IDs da lista são inteiros JSON positivos seguros, até
`9007199254740991`. Não são aceitos strings numéricas, floats, booleanos, nulos
ou IDs repetidos. `direction` aceita somente `up` ou `down`.

`expected_order` é uma lista de 1 a 10.000 pares exatos `id`/`sort_order`, em
ordem crescente de `sort_order` e, nos empates, de ID. A aula alvo precisa estar
nessa lista. Cada ordem é um inteiro JSON entre 0 e 9999. A validação é linear,
com um conjunto de IDs, sem regras wildcard/distinct de custo quadrático.

O ID da rota aceita somente uma sequência decimal e chega ao controlador como
string. O parser exige a forma canônica positiva, no máximo 16 dígitos e valor
até `9007199254740991` antes de convertê-lo para inteiro. IDs numéricos fora
desse domínio recebem `404 not_found`, sem overflow nem passagem pelo fallback
de método da aplicação. O domínio também valida o inteiro positivo seguro.

O destino do exemplo é `[12, 11, 13]`, com ordens `[0, 1, 2]`. Ele é sempre
calculado a partir de `expected_order`; o servidor não reinterpreta “subir”
sobre uma lista diferente que tenha encontrado depois.

### Recibo

```json
{
  "schema_version": 1,
  "scope": "current_editorial_draft",
  "course_id": 7,
  "course_version": 2,
  "status": "draft",
  "lesson_id": 12,
  "direction": "up",
  "changed": true,
  "order": [
    {"id": 12, "sort_order": 0},
    {"id": 11, "sort_order": 1},
    {"id": 13, "sort_order": 2}
  ]
}
```

`course_version` é o número da versão mais recente travada, que deve ser
rascunho. O GET administrativo existente não fornece esse número e não foi
modificado. O frontend pode validar tipo e faixa da versão do recibo; a
vinculação exata à intenção depende do curso, aula, direção e conjunto completo
de IDs/ordens. Não deve presumir que a versão seja 1.

O recibo tem apenas os campos acima. Não inclui título, corpo, resumo, identidade,
hash de aprovação ou conteúdo de uma versão histórica. A fronteira privada
existente aplica `private, no-store`.

### Erros

| HTTP | Código | Situação |
| --- | --- | --- |
| 403 | `access_denied` | Autoridade negada, indisponível, expirada ou alterada; empresa sem escopo editorial |
| 404 | `not_found` | Curso inexistente, não compartilhado, estrangeiro ou ID de rota fora do domínio |
| 409 | `draft_order_changed` | Publicação, versão não draft, flag publicada de aula ou snapshot incompatível |
| 409 | `order_limit_exceeded` | Mais de 10.000 aulas na versão atual |
| 422 | `invalid_order` | Payload incompleto, tipos/faixas/duplicatas/direção/lista canônica inválidos |
| 503 | `temporarily_unavailable` | Organização editorial ausente, dado numérico persistido inválido ou falha de banco/auditoria |

Falha não produz um recibo parcial nem uma lista vazia fictícia. Resultados de
erro do domínio e exceções sem commit são revalidados no controller antes de
sair. Tipos inválidos no envelope recebem 422 antes de qualquer leitura de
recurso; a autorização inicial continua sendo exigida pelo middleware. Um recibo de
sucesso já confirmado não recebe uma consulta posterior capaz de descrever
incorretamente uma escrita commitada como negada.

## Comparação da intenção e ausência de replay

O servidor aceita somente dois estados atuais:

1. Os pares atuais são exatamente os pares esperados: aplica o destino.
2. Os pares atuais já são exatamente o destino derivado: responde
   `changed:false`, sem UPDATE, timestamp ou auditoria novos.

Qualquer outro estado retorna conflito. Isso inclui adição, exclusão,
reordenação e mudança apenas dos valores numéricos, mesmo que a ordem relativa
dos IDs ainda pareça igual.

Na primeira posição, “subir”, e na última, “descer”, são no-ops. Os pares
originais são preservados integralmente: uma ordem 9999 não é normalizada só
porque houve um clique sem movimento.

A repetição idêntica de uma intenção já aplicada não move a aula outra vez.
Uma intenção diferente baseada no snapshot anterior falha. Uma requisição
não precisa de token persistido ou registro adicional de idempotência.

A UI continua sem replay automático. Se perder a resposta, conserva o bloqueio
de resultado incerto e oferece consulta explícita do estado atual. Encontrar
o destino desejado depois não prova qual tentativa o produziu.

Esta é uma comparação de estados, não uma identificação histórica de comandos:
se outras edições restaurarem integralmente um estado antigo, ele volta a
satisfazer a condição antiga. Não se promete eliminação permanente de ABA
nem se cria infraestrutura de retenção de comandos.

## Transação, locks e autoridade

`UniversityCatalogRepository::reorderDraftLessons()` segue:

1. Grant MANAGE válido e empresa editorial; organização existente.
2. Lock do curso compartilhado no escopo editorial.
3. Lock da versão mais recente e exigência de `draft`.
4. Locks das aulas dessa versão por ID crescente.
5. Validação de todas as linhas, ordenação em memória por `sort_order,id` e
   comparação com os pares esperados/destino.
6. `freshWriteGrantMatches()` antes da primeira mutação, inclusive nos no-ops
   que devolvem metadados protegidos.
7. UPDATEs parametrizados e auditoria dentro da mesma transação.
8. Nova consulta de autoridade antes do commit de uma mudança efetiva.

As operações editoriais existentes também travam o curso primeiro. Isso
serializa criação, edição, exclusão, publicação e reordenação no mesmo curso.
A versão e as aulas são explicitamente travadas antes da consulta de autoridade.

Uma falha na segunda consulta lança `EditorialOrderWriteRejected` dentro da
transação. O catch fica fora dela: retornar um erro depois de alterar linhas,
sem lançar a exceção, poderia commitar uma falha e foi evitado.

Mudança de pessoa, empresa, permissão ou revisão do grant, expiração e exceção
da autoridade são recusadas pelos mesmos critérios existentes. Callback
ausente também nega a operação.

## Empates, capacidade e SQL

Um movimento efetivo troca dois vizinhos e atribui `0..n-1` à sequência
resultante. Mantém os demais relacionamentos de ordem e resolve empates sem
alterar IDs, slugs, título, corpo, versão ou flags de publicação.

O intervalo 0–9999 representa 10.000 posições. A consulta lê até 10.001 linhas:
a sentinela provoca recusa integral antes de qualquer UPDATE. Não há
truncamento, sucesso parcial ou atribuição de 10000.

São atualizadas apenas as linhas cujos números efetivamente mudam. Cada lote
tem até 256 linhas, uma expressão CASE parametrizada e filtros pela versão,
flag não publicada e IDs desse lote. São no máximo 40 UPDATEs e 770 parâmetros
por lote, dentro de uma única transação. A ordem destino usa `CAST(? AS INTEGER)`
e todos os valores variáveis são bindings.

Uma quantidade inesperada de linhas afetadas gera exceção e rollback. Falha
num lote posterior ou na auditoria também desfaz os lotes anteriores.

O normalizador da UI administrativa existente admite até 5.000 aulas. Esse
limite de leitura não foi ampliado nesta entrega de backend e não é apresentado
como uma restrição nova de criação de cursos.

## Histórico, publicação e auditoria

O conjunto completo de IDs precisa corresponder à versão draft atual. Aulas
de outro curso, organização ou versão não são consultadas isoladamente para
justificar o erro. Um snapshot anterior à retirada não passa a apontar para
os novos IDs criados para o rascunho.

O hash de publicação existente já inclui a ordem. Um preflight anterior ao
movimento não corresponde ao novo estado, sem que a C129 mude as regras de
publicação ou transforme o preflight em aprovação humana.

Uma mudança efetiva gera um evento:

- `action`: `course.lessons_reordered`;
- `resource_kind`: `course`;
- `resource_id`: ID do curso no escopo autorizado.

Os demais campos são os da auditoria editorial existente. Não são armazenados
arrays de ordem, conteúdo, tokens ou uma política adicional de retenção.
No-ops não geram evento.

A operação não lê nem escreve progresso, favoritos ou posições de leitura.
Os grants SQL existentes de UPDATE em aulas e INSERT em auditoria já atendem
ao recorte; nenhum arquivo de privilégios foi alterado.

## Integração esperada da interface

O backend está separado da implementação de UI. O fluxo acordado bloqueia o
movimento se curso ou aula tiverem campos não salvos, sem descartar seus buffers.
Não realiza ordenação otimista nem uma segunda escrita para reconciliar erro.

`beginWrite()` usa `.layout.inert=true`, mas não define `disabled` nos inputs.
Ambos os formulários estão nessa árvore e a edição nativa fica bloqueada;
alterações programáticas ainda são possíveis. A integração deve preservar ou
detectar mudanças feitas durante o await, além de conferir o dirty inicial,
antes de aplicar o recibo ou atualizar o campo de ordem selecionado.

O recibo validado permite atualizar a lista e o número de ordem sem reconstruir
título/corpo. Curso, seleção e campos devem ser preservados. A conferência de
publicação precisa ser invalidada porque a ordem mudou.

A C129 não acrescenta concorrência otimista geral aos PATCHes antigos: um
outro editor ainda pode enviar posteriormente um `sort_order` antigo junto
de seu formulário. A operação protege sua própria comparação e transação.

## Testes preparados e integração de CI

Arquivos:

- `tests/Feature/EditorialLessonReorderFlowTest.php`: **26 métodos de teste**
  com migrations, HTTP, middleware, banco SQLite e transações reais; apenas a
  autoridade de autorização é sintética.
- `scripts/check-pg-lesson-reorder.php`: repositório real e duas conexões
  independentes ao PostgreSQL descartável da CI.

Os Feature tests cobrem empates, subida/descida, 9999, conteúdo preservado,
no-op sem DML, intenção duplicada, conflito, criação/exclusão concorrente,
publicação/retirada, isolamento, CSRF real, validação estrita, 10.000/10.001,
limite de parâmetros por lote e rollback após um lote ou após auditoria.
Também cobrem revalidação de sujeito/empresa/permissão/revisão, expiração,
callback ausente, revogação, indisponibilidade e ausência de consultas a
tabelas pessoais.

O probe verifica os guards antes de carregar Laravel e a configuração efetiva
antes da primeira consulta. Exige CI/GitHub Actions, repositório exato,
`APP_ENV=testing`, chave fictícia e PostgreSQL de laboratório em
`127.0.0.1:5432`; rejeita arquivos `.env` e URLs de conexão.

As fixtures são commitadas somente para a segunda conexão enxergá-las.
Colisões de organizações são recusadas. O peer usa esperas de lock limitadas,
disputa as implementações reais de reordenação/publicação e faz rollback de
seus conflitos. Depois da liberação do lock, a mesma intenção é exercitada
na segunda conexão e precisa retornar no-op. O teste não implementa retry
na interface.

O probe ainda verifica 600 aulas em três lotes, conteúdo histórico intacto,
hash de publicação antigo, falha depois do primeiro lote e negação depois de
UPDATEs e auditoria visíveis dentro da transação. O cleanup desfaz transações
pendentes e remove apenas auditoria e descendentes dos IDs de organizações,
cursos e versões criados por ele. Diagnósticos usam somente etapa fixa e classe
da exceção, sem mensagem, SQL, credenciais ou stack.

Invocação para o workflow já configurado de laboratório:

```sh
php scripts/check-pg-lesson-reorder.php
```

Executar **depois das migrations e antes de
`university:load-synthetic-editorial`**. O workflow e os runners são integrados
separadamente pelo coordenador.

O checker `check-write-fence.mjs` precisa incluir `reorderDraftLessons` entre
`updateLesson` e `deleteDraftLesson` no repositório e controller, além de
reconhecer `DB::update(` como a primeira mutação parametrizada dessa operação.
A classe `EditorialOrderWriteRejected.php` deve acompanhar a integração.

Na integração, os dois workflows passaram a chamar o probe antes do seeder.
O checker foi ampliado para reconhecer a mutação parametrizada e verificar
as regressões de revogação antes e depois dos lotes/auditoria. Os **15 caminhos
de escrita HTTP** passaram nessa verificação estática, preservando as demais
asserções.

## Evidência de runtime observada

No SHA `1d439bd81980107a784fafdcaea01ee3b534b8f2`, a
[execução 44222871749](https://github.com/rafhael100/imagine-universidade/actions/runs/44222871749)
aprovou o job de validação: **39 Unit / 169 asserções** e **257 Feature /
3.229 asserções**, totalizando **296 testes / 3.398 asserções**. Os 26 Feature
C129 estão incluídos. O primeiro run havia detectado `405` para IDs numéricos
inválidos; o parser de string antes da conversão passou preservando `404` como
resultado esperado.

O probe PostgreSQL também passou com duas sessões independentes: disputa de
reordenação/publicação sob o lock comum, 600 aulas em três lotes, uma auditoria,
no-op da intenção idêntica após liberação, conflito do snapshot/hash anterior,
conteúdo histórico intacto e rollback após falha de lote ou negação posterior
à auditoria. Foram observadas as **16 invariantes de schema, 24 verificações
de privilégios e 15 caminhos de escrita HTTP**.

Esse run aprovou cinco jobs e parou no navegador por uma premissa de foco do
harness C127, descrita no documento correspondente. Portanto, esta evidência
confirma o backend e os probes citados, sem atribuir aprovação à jornada de
interface C129 ou a alterações posteriores.

Verificação local realizada nesta entrega: `git diff --check`. PHP,
PostgreSQL, Chromium e laboratórios não foram executados localmente. A evidência
de runtime deverá ser vinculada ao SHA integrado que executar a CI.
