# C-122 — consulta de versões arquivadas na interface editorial

17/11/2026 · Implementação candidata para revisão e CI. **HOLD_NO_GO** operacional.

## Evidência validada após a correção

O commit `98e32b357248c8bd40cb68f38edcb47d338942b6`, na
[execução 44209334123](https://github.com/rafhael100/imagine-universidade/actions/runs/44209334123),
concluiu **os seis jobs com sucesso**. O mesmo teste de corpo tardio após
revogação passou, sem retirada da espera de rede nem alteração da asserção.

- **217 testes PHP / 2.519 asserções**, com os 21 testes Feature C-122.
- **419 verificações Chromium** com falhas controladas, incluindo as 39 C-122.
- **98 verificações pelo Laravel/SQLite real**, com leitura da versão arquivada,
  preservação de ambos os rascunhos e do conteúdo antigo após republicação.
- Capturas do leitor em **1440 e 390 pixels** inspecionadas: identificação de
  versão, texto, controles e contexto atual legíveis, sem corte horizontal.
- Persistência, PostgreSQL, papéis, Docker, Portal e pacote editorial aprovados.

Esses resultados validam o SHA citado. Não concedem aprovação humana do acervo,
SSO operacional, merge, implantação ou mudança dos gates.

## Primeira execução e correção da resposta tardia

O commit `fe71c926ef8cd70e94f9effe9997802fa652e32d`, na
[execução 44207898533](https://github.com/rafhael100/imagine-universidade/actions/runs/44207898533),
passou em cinco dos seis jobs. O backend concluiu 39 testes Unit/169 asserções
e 178 Feature/2.350, incluindo os 21 testes de arquivo. O probe PostgreSQL
confirmou paginação, escopo, Unicode e os parâmetros acima do intervalo int4.

O navegador falhou no caso **late body after revocation**, ao esperar a rede
encerrar em 20 segundos. O último caso concluído verificou a limpeza após 419
no corpo arquivado. A jornada pelo Laravel foi pulada, portanto não há evidência
de conclusão do navegador nesse SHA.

A análise do cliente encontrou um caminho distinto: um HTTP 200 pode chegar
depois de outra requisição revogar o acesso. O cliente rejeitava essa resposta
antes de ler JSON, mas o descarte limitado era acionado somente para HTTP sem
sucesso. A correção estende o mesmo descarte às respostas recebidas quando o
acesso já está negado, sem ler o conteúdo, alterar a negação ou aguardar o corpo.
O teste Chromium e sua espera de rede permanecem intactos.

O checker local passou a ter 58 cenários de limpeza HTTP, com quatro novos
casos nas funções reais de aluno e editor: sucesso tardio drenado até EOF sem
decodificação e sucesso tardio com leitura/cancelamento pendentes, limitado
pelo prazo existente. O checker principal, incluindo os 79 cenários C-122,
também passou. A confirmação posterior no navegador está registrada acima.

## Capacidade entregue

O painel **Versões arquivadas**, separado dos formulários de curso e aula,
permite ao operador editorial consultar as aulas preservadas em uma versão
anterior. A consulta atende à evolução editorial e à rastreabilidade previstas
em `BASE-UNI-03-06`, `BASE-UNI-04-04` e `BASE-UNI-14-05` da
[base funcional aprovada](08-fechamento-candidato/02-BASE-FUNCIONAL-14-MODULOS.md).

O painel oferece somente leitura de versões com status `archived`. Rascunhos e
versões publicadas permanecem no editor existente. Nenhum comando de restauração,
edição de arquivo, publicação ou aprovação foi acrescentado ao histórico.

Selecionar um curso não consulta seu histórico automaticamente. Após o catálogo
atual ser validado, o operador pode executar esta sequência:

1. **Consultar versões**: carrega a primeira página de metadados das versões.
2. Escolher **Versão N · Arquivada**: carrega os metadados das aulas dessa versão.
3. Escolher uma aula: carrega somente o corpo daquele registro exato.

As ações **Carregar versões anteriores** e **Carregar mais aulas** são
explícitas. Cada página possui no máximo 50 entradas. A interface não percorre
cursores automaticamente e não baixa todos os corpos de uma versão.

O nome do curso mostrado acima da consulta vem do catálogo autorizado atual e
recebe o rótulo **Curso no cadastro atual**. Ele não é apresentado como título
histórico. Título, slug, corpo e ordem da aula consultada pertencem ao registro
da versão arquivada. O painel não infere datas de publicação, responsável humano,
descrição, categoria ou título antigo do curso.

## Contrato consumido

As três rotas usam o cliente administrativo já existente: sessão de mesma
origem, `cache: no-store`, controle de acesso do backend e tratamento global de
negação. Não é criado um caminho alternativo de autorização.

| GET relativo a `/universidade/private/admin` | Dados usados na interface |
|---|---|
| `/courses/{courseId}/versions?before_version=N` | `versions: [{version,status,lesson_count}]`, `next_before_version` |
| `/courses/{courseId}/versions/{courseVersion}/lessons?after_sort_order=S&after_lesson_id=I` | `course_version`, `status`, `lessons: [{id,slug,title,sort_order}]`, `next_after` |
| `/courses/{courseId}/versions/{courseVersion}/lessons/{lessonId}` | `course_version`, `status`, `lesson: {id,slug,title,body,sort_order}` |

Todos os envelopes exigem `schema_version: 1`,
`scope: "editorial_archived_content"` e o `course_id` exato. `courseVersion`
representa o número da versão, não sua chave interna de banco. O status aceito
é exclusivamente `archived`.

### Validação antes da apresentação

Os normalizadores reais da view verificam:

- IDs e versões inteiros positivos seguros para JavaScript; contagens e ordem
  inteiras seguras não negativas.
- Até 50 itens por página, versões em ordem estritamente decrescente e aulas em
  ordem crescente pelo par `(sort_order, id)`.
- Versões, IDs e slugs sem duplicatas, incluindo as páginas já carregadas.
- Cursor seguinte exatamente igual ao último item da página, com uma página
  completa quando há continuação. O cursor de aulas preserva os dois campos.
- Aulas acumuladas compatíveis com `lesson_count` do índice da versão arquivada;
  o fim da paginação não pode afirmar conclusão de uma lista parcial.
- Curso, versão e status exatos em todas as respostas. O detalhe também precisa
  corresponder ao ID, slug, título e ordem dos metadados selecionados.
- Slug no formato ASCII existente, com até 120 caracteres; título não vazio
  com até 200 pontos de código; corpo não vazio com até 30.000 pontos de código.
  A contagem usa `Array.from`, preservando texto Unicode válido. Não há `slice`
  para fazer um texto excessivo parecer uma resposta válida.

Somente os campos documentados são copiados para o estado do painel. Metadados
de aula não conservam um `body` indevidamente recebido na listagem. O corpo
selecionado é apresentado por `textContent`, com quebras preservadas por CSS;
HTML, scripts e atributos presentes no texto não são interpretados.

Uma lista vazia válida de versões gera **Este curso não possui versões
arquivadas**. Uma versão válida sem aulas tem mensagem própria. Resposta
malformada ou falha HTTP gera indisponibilidade com uma ação manual de nova
consulta, nunca um vazio confirmado ou o aproveitamento de conteúdo antigo.

## Rascunhos, concorrência e revogação

O histórico possui estado separado em `state.archive`. Ler, paginar ou trocar
aula arquivada não chama `fillCourse`, `fillLesson`, `resetLesson`, confirmação
de descarte ou qualquer método de escrita. Os dois formulários podem continuar
com alterações locais e sua seleção original. A leitura também não invalida a
conferência de publicação existente.

As gerações de índice de versões, metadados de aulas e corpo são independentes.
Trocar versão ou aula remove imediatamente o corpo anterior. Uma resposta
tardia só é aceita se curso, versão, pedido e autorização local ainda
corresponderem à consulta iniciada. Um clique repetido no mesmo índice ou corpo
pendente não dispara uma cópia da mesma requisição. A seleção de outro registro
pode iniciar sua própria leitura; somente o registro atual pode ocupar o leitor.

O painel é limpo e as gerações são invalidadas nos seguintes momentos:

- mudança confirmada de curso ou ação **Novo**;
- atualização do catálogo administrativo;
- início de uma escrita editorial;
- resultado incerto de escrita;
- encerramento de acesso.

Cancelar uma confirmação de descarte preserva o histórico e os campos locais.
Os eventos de escrita continuam sob o fluxo já existente. O histórico não
repete PATCH/POST/DELETE nem resolve uma mutação ambígua por conta própria.

`403` e `419` usam o encerramento global de acesso da view: limpam conteúdo,
contexto do curso e formulários privados, ocultam o painel e impedem recuperação
por respostas antigas. Nas demais falhas de leitura, a edição atual continua
disponível e os rascunhos permanecem intactos. Após uma escrita editorial, a
consulta do histórico requer uma nova ação manual.

## Verificação preparada e executada localmente

### Node: 79 cenários aprovados

`scripts/check-editorial-version-history.mjs` executa o script completo da view e
os handlers efetivamente registrados. Apenas chamadas de inicialização, DOM,
HTTP e confirmações são substituídos. O verificador não contém uma cópia da
lógica de normalização ou navegação.

Os cenários cobrem cursores, ordenação, duplicatas entre páginas, 51 registros,
allowlists, limites Unicode, versão e aula exatas, ausência de corpos na
listagem, texto literal, preservação dos dois rascunhos e da conferência de
publicação, cancelamento, estados vazios, erros 404/422/503, JSON inválido,
cliques duplicados, respostas e JSON atrasados, 403/419 e as oito operações
editoriais que passam pela invalidação de escrita.

O checker principal de UI também passou após as adaptações mecânicas das
dependências extraídas da view. Seus asserts anteriores foram preservados.

### Chromium: 39 verificações preparadas, execução pendente na CI

`scripts/qa-browser-editorial-version-history.cjs` exporta a mesma interface dos
outros módulos focais:

```js
await require("./qa-browser-editorial-version-history.cjs")({
  browser, base, ensureLocalPage, check, pageErrors,
});
```

O módulo usa contexto separado, rotas e fixtures por página sobre a origem
loopback do runner sintético. Não altera o estado compartilhado dos demais
cenários. Exercita leitura por cliques, duas paginações, XSS textual, rascunhos
preservados, cancelamento, falhas independentes, trocas durante respostas
pendentes, negação, corpo tardio após revogação, invalidação por PATCH editorial
e congelamento após resposta ambígua.

Esperas de respostas retidas possuem prazo de oito segundos. O diagnóstico de
falha antecede a limpeza; o `finally` libera respostas pendentes e limita o
fechamento do contexto. `node --check` do módulo e `git diff --check` passaram.
Chromium não foi executado localmente nesta entrega. O percurso adicional
contra Laravel/SQLite reais é integrado pelo responsável pelo runner principal.

## Arquivos e integração

- `resources/views/university/admin.blade.php`: painel, normalizadores,
  paginação, leitura e invalidações.
- `scripts/check-editorial-version-history.mjs`: verificação Node focal.
- `scripts/qa-browser-editorial-version-history.cjs`: módulo Chromium focal.
- `scripts/check-ui-contract.mjs`: stubs das novas dependências nos cenários
  anteriores que extraem handlers; importação do checker pelo integrador.
- `scripts/check-error-body-cleanup.mjs`: dependências reais adicionais do
  `lockAccess` administrativo no harness já existente.

Seletores para o percurso real: `#refresh-editorial-versions`,
`#editorial-version-list [data-archive-version]`,
`#editorial-version-lessons [data-archive-lesson]`,
`#editorial-version-heading` e `#editorial-version-content h4`.

Nenhum provider operacional, gate de liberação, grant de banco, aprovação
editorial humana, publicação ou ambiente real é ativado pela interface C-122.
