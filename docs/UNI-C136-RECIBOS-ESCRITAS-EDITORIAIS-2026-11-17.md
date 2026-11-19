# C136 — confirmação dos recibos de escrita editorial

Referência: rodada de **17/11/2026**. Implementação e verificações locais em
18/11/2026, sobre a base `8099229`, no worktree C136. A execução de navegador,
PHP e PostgreSQL continua reservada à CI.

## Falha reproduzida

Sete handlers do editor tratavam HTTP 2xx com JSON como confirmação suficiente
da escrita. O formulário de curso ignorava o valor de `saved`; as criações
podiam seguir sem um ID ou estado válido; exclusões, publicação e retirada
ignoravam seus indicadores de resultado.

A reprodução executou o script completo da view e seus handlers reais em Node,
com DOM, diálogos e respostas HTTP sintéticos. Antes da correção:

| Operação | Recibo enviado pela fixture | Resultado incorreto observado |
| --- | --- | --- |
| Criar curso | `{}` | Sucesso anunciado e um GET posterior |
| Atualizar curso | `{"saved":false}` | Sucesso anunciado e dois GETs posteriores |
| Criar aula | `{"id":30,"status":"published"}` | Sucesso anunciado e um GET posterior |
| Excluir aula | `{"deleted":false}` | Sucesso anunciado e um GET posterior |
| Excluir curso | `{"deleted":false}` | Sucesso anunciado e um GET posterior |
| Publicar | `{"published":false}` | Sucesso anunciado e dois GETs posteriores |
| Retirar publicação | `{"published":true}` | Sucesso anunciado e dois GETs posteriores |

Nenhum desses casos ativou a cerca de resultado incerto. Nos cinco fluxos de
criação, edição e exclusão, o refresh também substituiu os valores dos
formulários. Publicação e retirada conservaram os campos daquela fixture, mas
anunciaram uma operação que o recibo não confirmava.

Essa evidência verifica a decisão da interface diante de respostas inválidas;
não afirma que o servidor real emita esses recibos. O contrato real foi
conferido no `UniversityController` antes de definir a correção.

## Contratos existentes que a interface passa a exigir

Todos os caminhos abaixo continuam sob `/universidade/private/admin`.

| Método e caminho | Confirmação exigida antes do refresh |
| --- | --- |
| `POST /courses` | Objeto com `id` inteiro seguro positivo e `status` exatamente `"draft"` |
| `PATCH /courses/{courseId}` | `saved` exatamente `true` booleano |
| `POST /courses/{courseId}/lessons` | Objeto com `id` inteiro seguro positivo e `status` exatamente `"draft"` |
| `DELETE /lessons/{lessonId}` | `deleted` exatamente `true` booleano |
| `DELETE /courses/{courseId}` | `deleted` exatamente `true` booleano |
| `POST /courses/{courseId}/publish` | `published` exatamente `true` booleano |
| `POST /courses/{courseId}/unpublish` | `published` exatamente `false` booleano |

Os nomes reais dos métodos de exclusão são `deleteDraftLesson` e
`deleteNeverPublishedCourse`. Ambos devolvem `deleted`, não `removed`.

As criações recusam null, arrays, IDs ausentes, zero, negativos, fracionários,
strings numéricas e valores superiores a `Number.MAX_SAFE_INTEGER`. O limite
superior seguro continua válido; não foi criado um teto de negócio menor.
Estados diferentes de `draft` também não confirmam a criação.

Os indicadores booleanos não usam coerção: strings, números, valores ausentes
ou o booleano oposto são inválidos. Campos extras do recibo são ignorados e
nunca preenchem os formulários. A interface continua obtendo o conteúdo pelo
GET autorizado já existente, depois de um recibo válido.

A correção não exige campos que o servidor não oferece. Os recibos booleanos
continuam associados ao pedido e ao handler que os aguardam; nenhum novo ID,
token, endpoint, schema ou protocolo foi criado.

## Preservação, recuperação e autorização

A validação acontece imediatamente após `api(...)` e antes de qualquer
refresh ou mensagem de sucesso. Quando o recibo é inválido, o handler usa o
catch existente e chama `freezeUncertainEditorialWrite`.

Esse caminho conserva os valores literais dos formulários, a seleção e a
consulta local C131, invalida a autorização local para novas escritas e exibe
a recuperação manual. Não consulta o catálogo automaticamente para tentar
deduzir se houve commit e não repete POST, PATCH ou DELETE. Uma resposta inválida
não prova que a mutação falhou no banco.

Cancelar a confirmação da consulta manual mantém os campos sem outra
requisição. Aceitar permite que a leitura atual substitua esses campos,
conforme o aviso existente. A consulta não reaplica a intenção anterior e não
transforma sua resposta perdida em um recibo de sucesso.

O fluxo válido mantém seus GETs anteriores. Publicação conserva também a
conferência e o `expected_content_hash` já exigidos antes do POST; esta entrega
não acrescenta consulta preventiva nem nova regra editorial.

HTTP 403/419 segue o encerramento de acesso existente, que limpa o conteúdo
privado. Essa limpeza prevalece sobre a preservação de rascunhos. Recibos
válidos que chegam depois da revogação não restauram campos nem iniciam
refresh. A proteção de uma única escrita pendente permanece ativa.

## Escopo e integração com C133/C137

O diff da view limita-se aos sete handlers. O ramo de **PATCH de aula** foi
preservado literalmente em relação à base desta worktree, para integrar sem
sobrescrever a proteção C133 preparada em paralelo. Apenas o ramo de criação
do mesmo formulário recebeu a validação de ID e estado.

O handler de curso foi congelado e compartilhado com o autor da C137. Essa
entrega posterior deve conservar as validações de recibo ao distinguir a
edição textual da alteração explícita de ordem. Nenhum helper novo precisa
ser transportado: as verificações são locais aos handlers.

Não houve alteração de backend, rotas, grants, retenção, bindings de Portal,
configuração operacional ou regras de publicação. O percurso Laravel real já
exercita as sete ações válidas; o novo módulo sintético concentra-se nos
recibos negativos.

## Arquivos

- `resources/views/university/admin.blade.php`: validações dos sete recibos.
- `scripts/check-editorial-write-receipts.mjs`: script completo e handlers
  reais em Node VM, sem reproduzir os validadores ou decisões de recuperação.
- `scripts/qa-browser-editorial-write-receipts.cjs`: módulo para o runner
  Chromium protegido, com assinatura
  `({browser,base,ensureLocalPage,check,pageErrors})`.
- Este documento: reprodução, contrato, limites e evidências.

Três fixtures legadas receberam somente `status:"draft"` nos recibos de
criação de curso/aula, para corresponder ao controller. Nenhuma asserção foi
removida ou relaxada:

1. `scripts/check-editorial-overview.mjs` — duas respostas.
2. `scripts/check-editorial-version-history.mjs` — duas respostas.
3. `scripts/qa-browser-editorial-overview.cjs` — duas respostas.

A importação do checker e a chamada do módulo no runner pertencem à
integração. Runners, workflows e o checker principal não foram editados nesta
worktree.

## Verificação

Executado localmente:

- **29 cenários Node aprovados** no checker focal. Os vetores incluem recibos
  ausentes, mal tipados e contraditórios; ID seguro máximo; indicadores exatos;
  campos extras ignorados; sequência de GETs válidos intacta; preservação de
  nove campos e seleção; resposta perdida depois de commit sintético;
  confirmação de recuperação; JSON inválido; uma única escrita pendente;
  HTTP 403/419 e JSON tardio depois de outra resposta revogar o acesso.
- **Checker principal completo aprovado**, incluindo as verificações
  anteriores de overview, histórico, edição, reordenação e filtros.
- **Sintaxe Node e `git diff --check` aprovados**.

Preparado, sem execução local:

- **23 verificações Chromium**: negativos dos sete handlers, buffers e
  controles, recuperação manual sem replay, preflight/hash preservados e
  rejeição de ID string, ID inseguro e estado incorreto nas duas criações.
- O módulo cria um contexto próprio e rotas por página; o runner controla
  inicialização e bloqueio de rede externa. Esperas de interação e limpeza
  têm prazo de oito segundos, e a navegação tem prazo de quinze segundos.
  Não há gates HTTP suspensos nem serviço adicional.

Os resultados Node não substituem a execução Chromium, Laravel ou PostgreSQL
em CI. Não houve navegador, PHP ou PG local, stage, commit ou push.

## Integração com C137

Os sete blocos de validação foram integrados, conservando a montagem condicional da ordem no formulário de curso C137 e a proteção de aula C133. A suíte Node principal completa passou após essa combinação, incluindo **29 cenários C136 e 30 C137**. Passaram também a cerca estática dos **15 caminhos de escrita**, a sintaxe dos runners/módulos e a conferência de diff. A revisão independente não encontrou bloqueadores.

As **23 verificações Chromium C136** estão chamadas pelo runner protegido existente. Sua execução depende da CI do próximo SHA integrado; os resultados completos do SHA `2bec87c` são a referência anterior, sem essas alterações.

## Clareza da recuperação — C139

Em 2026-11-18, o parágrafo do painel de recuperação passou a orientar a consulta manual sem atribuir o problema a uma falha de conexão ou de GET. O mesmo painel aparece após leitura indisponível e escrita não confirmada. A orientação mantém o aviso de não repetir a operação; CTA, estado, handlers, confirmação, preservação dos campos e revogação permanecem intactos. Não foram adicionados testes ou fluxos.

## CI integrada executada em 8368d526

O [run 44230182074](https://github.com/rafhael100/imagine-universidade/actions/runs/44230182074), SHA `8368d5261915412233726eafacd5e057bd04e303`, aprovou os **seis jobs**: **351 testes PHP / 3.959 asserções** (39 Unit/169 e 312 Feature/3.790), probes PostgreSQL, **746 verificações Chromium sintéticas** e **232 pelo Laravel/SQLite real**. As 23 verificações Chromium C136 executaram recibos inválidos, preservação e recuperação manual; os fluxos de gravação real mantiveram seus recibos confirmados. Persistência passou. Essa rodada é anterior à alteração textual C139 acima.
