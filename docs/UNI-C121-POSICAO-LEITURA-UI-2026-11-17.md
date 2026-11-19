# C-121 — posição de leitura explícita na interface do aluno

17/11/2026 · Candidato implementado para revisão e CI. **HOLD_NO_GO** operacional.

## Resultado e escopo

O aluno pode guardar uma aula específica para continuar depois, voltar à mesma
aula e versão, substituir a escolha, removê-la e exportar sua referência privada.
Existe somente uma posição por pessoa e empresa. A escrita depende do clique
**Guardar esta aula para continuar depois**; abrir, filtrar, ler, rolar a página
ou concluir uma aula não altera a posição.

A interface concretiza o escopo de [UNI-07-02](10-modulos/UNI-07.md) e
[UNI-12-01](10-modulos/UNI-12.md), usando o
[contrato backend C-121](UNI-C121-MARCADOR-PRIVADO-LEITURA-BACKEND-2026-11-17.md).
O fluxo anterior de procurar a primeira aula pendente continua com o mesmo
algoritmo e o mesmo ID; seu texto passa a **Continuar aulas pendentes**, para
distinguir as duas ações.

## Apresentação e controles

O bloco **Aula guardada** fica dentro de **Sua aprendizagem**, antes do painel
de favorito do curso. Mostra a situação atual e, quando disponível, o botão
**Continuar da aula guardada**. Remover e exportar ficam em **Opções da posição**,
um elemento `details` nativo. A ação de guardar aparece somente no conteúdo de
uma aula validada. Ao substituir outra posição, uma mensagem explica que a
escolha anterior será substituída.

| Seletor estável | Função |
|---|---|
| `#reading-position-panel` | Bloco privado da posição de leitura |
| `#reading-position-status` | Estado e recuperação, com `role="status"` e `aria-live="polite"` |
| `#save-reading-position` | Guarda a aula e versão exibidas mediante clique |
| `#reading-position-replace-hint` | Explica a substituição de uma posição anterior |
| `#resume-reading-position` | Revalida e volta à aula exata |
| `#reload-reading-position` | Consulta manual após erro, conflito ou resposta incompatível |
| `#reading-position-options` | Opções recolhíveis de remoção e exportação |
| `#remove-reading-position` | Remove a referência própria usando sua revisão atual |
| `#export-reading-position` | Exporta a referência privada por um GET próprio |
| `#reading-position-export-status` | Resultado acessível da exportação |
| `#resume-course` | Ação anterior de continuar aulas pendentes |

Os controles novos usam a classe `secondary`. Em `#lesson-content`, o `h3`
continua identificando somente o título da aula, e `button.primary` continua
identificando somente a conclusão. O título da aula recebe foco após uma
retomada exata bem-sucedida. A revisão opaca não é mostrada no DOM.

## Contrato consumido e validação

Após obter catálogo válido e autorizado, a página consulta
`GET /universidade/private/reading-position` uma vez, independentemente da
consulta de favoritos. Uma falha ou demora nesse GET não impede abrir aulas,
usar o material, pedir ajuda ou concluir a aula. Uma biblioteca vazia válida
continua sendo um catálogo autorizado; a consulta da posição não inventa cursos
para preencher esse estado.

O normalizador exige `schema_version: 1`,
`scope: "current_authenticated_student"`, revisão opaca não vazia de até 2.048
caracteres Unicode e um dos estados documentados:

- `none`: `position` deve ser exatamente `null`; não há ação de remover.
- `available`: `position` deve conter `course_id`, `course_version` e `lesson_id`
  como inteiros positivos seguros, além de `saved_at` válido.
- `unavailable`: `position` deve ser exatamente `null`; é possível remover ou
  exportar a referência, mas não navegar por ela.

Os objetos aceitos são reconstruídos com uma lista explícita de campos. Campos
extras não passam para o estado da posição nem para o arquivo. Identidade e
empresa não são recebidas da página nem enviadas como parâmetros. O backend
normaliza `saved_at` somente deste contrato para UTC ISO8601 com segundos, por
exemplo `2026-11-17T10:00:00Z`, evitando diferenças da representação crua entre
SQLite e PostgreSQL. As fixtures desta interface usam essa forma canônica.

O PUT envia apenas `course_id`, `course_version`, `lesson_id` e
`expected_revision`. O DELETE envia somente `expected_revision`. Um recibo só
confirma a ação quando possui revisão diferente da anterior e descreve
exatamente o alvo solicitado, ou o estado `none` para remoção. Não há gravação
otimista. Um recibo de outra aula, curso, versão ou revisão não é tratado como
confirmação.

## Conflito, resposta incerta e concorrência

A revisão permanece apenas na memória da página. A interface não interpreta o
prefixo nem os campos internos do ticket inicial e não o persiste em
`localStorage`, `sessionStorage`, URL ou histórico de navegação. O ticket de
ausência tem validade de cinco minutos no servidor; a página não o renova em
segundo plano.

| Situação | Comportamento da interface |
|---|---|
| GET inválido, indisponível ou malformado | Mantém o estudo disponível e oferece consulta manual; não simula posição vazia |
| PUT/DELETE 409, inclusive ticket expirado | Exige consulta manual e um novo clique; não consulta nem repete a escrita automaticamente |
| PUT 404 ou 422 | Solicita nova consulta e reabertura da aula antes de outra alteração; não troca o alvo |
| Falha de rede, 503 ou recibo inválido | Faz no máximo um GET para conferir o estado, sem repetir PUT/DELETE |
| Reconciliação confirma o alvo ou a remoção | Mostra a confirmação obtida pela consulta |
| Reconciliação falha | Bloqueia novas alterações até uma consulta manual válida |
| Reconciliação encontra outra posição ou referência indisponível | Mostra o estado atual sem afirmar que a alteração desejada foi confirmada |
| 403 ou 419 em qualquer operação privada | Aciona `lockAccess` imediatamente e elimina os dados e controles privados |

Consultas e alterações da posição são serializadas por aba. Duas abas continuam
sujeitas à comparação de revisão no servidor: a segunda não pode substituir ou
apagar uma escolha recente com uma revisão antiga. Depois de um conflito, a
nova escolha requer tanto a consulta quanto uma nova ação do aluno.

Recarregar a biblioteca invalida a geração da consulta ou escrita anterior, mas
mantém sua indicação de operação em andamento até a resposta encerrar. Assim,
o `finally` de uma operação antiga não pode liberar uma segunda operação que
tenha começado em seu lugar. Quando a resposta invalidada encerra, a recuperação
manual fica disponível. O mesmo princípio vale para uma exportação em andamento.
Uma nova escrita invalida o resultado de uma exportação anterior.

Uma resposta de salvamento que chega após a troca da aula não marca a nova aula
como guardada. A posição fica pendente de consulta manual. Nenhuma resposta
tardia após revogação restaura o painel, o conteúdo ou uma ação de download.

## Retomada da aula e versão exatas

**Continuar da aula guardada** primeiro faz uma consulta autorizada atual. Só
prossegue se revisão e referência continuarem iguais às que motivaram o clique.
Uma posição modificada em outra aba exige novo clique sobre o estado atualizado.
Alterar a seleção ou o filtro durante essa consulta cancela o salto pendente.

O fluxo usa `openCourseWithAllFilters(courseId, lessonId, courseVersion)`. Apenas
essa ação explícita limpa os filtros que esconderiam o curso. Salvar, remover,
consultar e exportar preservam a seleção e os filtros existentes. A navegação
exige um curso presente no catálogo autorizado, a aula exata na lista recebida e
o mesmo número de versão no detalhe. A ausência de qualquer um deles não leva à
primeira aula pendente, a outro slug ou a uma versão republicada.

O parâmetro opcional de versão acompanha `selectCourse`, `selectLesson` e os
dois caminhos de recuperação manual: falha da lista de aulas e falha do detalhe.
O detalhe de outra versão é recusado antes de renderizar título, material,
conclusão, ação de guardar ou ajuda. As navegações anteriores, sem versão
preferida, mantêm seu comportamento.

## Exportação própria

O botão consulta `GET /universidade/private/reading-position/export` e cria
`imagine-universidade-posicao-leitura.json` somente após validar a resposta.
A exportação funciona mesmo se a consulta da posição falhar ou se a referência
estiver indisponível para estudo. O arquivo pode conter `reading_position: null`
ou a referência própria retida com `course_slug`, `course_version`,
`lesson_slug` e `saved_at`, além do envelope v1 e escopo fixo.

Os slugs devem seguir o formato ASCII estrito já usado pela interface, com no
máximo 120 caracteres. IDs internos, revisão, tickets, identidade, título e
conteúdo são descartados. A referência exportável não é intersectada com o
catálogo visível, pois uma posição própria retirada pode continuar exportável.
Cada clique inicia no máximo um GET, sem repetição automática, e o download
confere novamente autorização e geração antes de criar o arquivo.

Os formatos existentes de exportação de progresso e favoritos permanecem
separados. A posição não muda seus dados nem altera o significado de conclusão.

## Verificação e estado de integração

`scripts/check-student-reading-position.mjs` executa o script real da página e
seus handlers, removendo somente a chamada inicial de `loadLibrary()`. DOM, HTTP
e download são as fronteiras sintéticas. Os **59 cenários Node** passaram,
incluindo validação, duas abas, conflito, resposta incerta, confirmação perdida,
ausência legítima, seleção alterada, revogação, exportação, single-flight durante
invalidação e preservação da versão nos dois caminhos de recuperação.

O checker principal importa essa suíte. Seus mocks e os extratores de favoritos
receberam apenas as dependências mecânicas do novo painel; as asserções anteriores
foram preservadas e as de navegação exata passaram a conferir também a versão.
`node scripts/check-ui-contract.mjs` passou com a integração.

`scripts/qa-browser-student-reading-position.cjs` fornece **39 checks de Chromium
preparados** em um contexto isolado. Usa as aulas 11 e 12 da fixture principal e
rotas de posição por página, incluindo duas abas, GET pendente, erro de escrita,
recibo inválido, versão incompatível, referência ausente, revogação e download.
As jornadas exigem zero POST de conclusão. O runner principal chama o módulo
quando o progresso sintético ainda está incompleto; os seletores acima também
são usados pela jornada real C-117 contra Laravel e SQLite.

`node --check` do módulo e `git diff --check` passaram. PHP, PostgreSQL e Chromium
não foram executados localmente nesta entrega. Os checks preparados e a extensão
da jornada real C-117 ainda dependem do run de integração C-121; a aprovação da
base C-120 não é apresentada como execução do novo marcador.

O provider operacional permanece desativado. Este painel não acrescenta uma
fonte Portal, SSO real, IA paga, dados reais, deploy, purge ou relógio de retenção
baseado em `saved_at`. As condições de retenção e eliminação permanecem no
contrato backend e na decisão de governança aplicável.

## Resultado real da CI

Em `0cff8de56f1da5bf5b5a00ad899e8332042b48ad`,
[Actions #44204205999](https://github.com/rafhael100/imagine-universidade/actions/runs/44204205999)
aprovou os seis jobs. O módulo C121 executou seus **39 checks** dentro das
**380 verificações Chromium**; a varredura da interface não encontrou violações
graves ou críticas. O percurso real pelo Laravel/SQLite chegou a **91
verificações aprovadas**, incluindo guardar, recarregar, retomar a aula e versão
exatas após um filtro, retirar/republicar, exportar, remover e revogar acesso.
Os estados persistidos foram conferidos ao final. Esses resultados pertencem
ao SHA indicado e não representam homologação operacional.
