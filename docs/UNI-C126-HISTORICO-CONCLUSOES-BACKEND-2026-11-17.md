# C-126 — histórico privado de aulas concluídas

17/11/2026 · Backend candidato revisado, com CI integrada aprovada no SHA indicado abaixo. **HOLD_NO_GO** operacional.

## Objetivo e base

Oferecer ao aluno uma consulta paginada das referências de aulas que ele já
marcou como concluídas. A fonte é `educational_lesson_progress`, a mesma da
exportação de progresso existente. Não se cria registro de leitura, avaliação,
nota, certificado, ranking ou nova coleta de dados.

O recorte usa as capacidades de progresso útil e proteção do histórico pessoal
de [BASE-UNI-07-01/06](10-modulos/UNI-07.md), a área pessoal de
[BASE-UNI-12-01](10-modulos/UNI-12.md) e a política de retenção já aprovada na
[DEC-UNI-P0-05](00-governanca/DECISAO-UNI-P0-05-2026-11-03.md). A consulta é
individual, com a empresa e a pessoa do grant VIEW atual. Gestores não recebem
um diretório de conclusões de funcionários.

## Contrato HTTP

`GET /universidade/private/progress/history?before_id=N`

Middleware `university.grant:view`, permissão `university:view` e sessão
validada no servidor. O curso, a empresa e a pessoa não são escolhidos por
parâmetros ou headers do navegador.

```json
{
  "schema_version": 1,
  "scope": "current_authenticated_student",
  "completions": [
    {
      "completion_id": 81,
      "course_slug": "curso-exemplo",
      "course_version": 2,
      "lesson_slug": "aula-exemplo",
      "completed_at": "2026-11-17T10:00:00Z",
      "availability": "available"
    }
  ],
  "next_before_id": null
}
```

Cada item tem exatamente os seis campos apresentados. `completion_id` é o ID
do registro próprio de conclusão; serve para ordenação, deduplicação e
validação da continuação. Não identifica outro aluno nem constitui autorização
para uma aula. Não há `course_id`, `lesson_id`, título, resumo, categoria,
corpo, pessoa, empresa, link ou ação de navegação neste DTO.

IDs e `course_version` são inteiros positivos seguros para JavaScript, até
`9007199254740991`. Não se introduz o teto legado de um milhão de versões
presente no sanitizador da exportação do navegador. Slugs seguem o contrato
editorial ASCII: letras minúsculas e dígitos, com hífens entre grupos, até 120
caracteres. Datas saem em UTC, exatamente `YYYY-MM-DDTHH:MM:SSZ`.

A normalização de datas reutiliza o helper de referências privadas de C-123,
agora denominado `privateReferenceTimestamp`, sem alterar seu comportamento.
Ela aceita as representações legítimas de SQLite e PostgreSQL, incluindo o
offset `+00` de `timestamptz`, e modifica apenas o objeto retornado. O export v1
existente mantém sua formatação e seu contrato anteriores.

## Escopo retido e disponibilidade exata

O SELECT reaproveita os vínculos da exportação:

`progresso → aula exata → versão exata → curso`

Os filtros exigem progresso da organização e pessoa do grant, curso da
organização editorial `imagine-editorial`, `is_shared=true` e status da versão
`published` ou `archived`. Progresso artificialmente associado a um rascunho,
conteúdo de outra organização ou curso não compartilhado fica fora da resposta.
Essas exclusões não eliminam registros.

`availability` é calculada no mesmo SELECT e vale `available` somente quando:

- O curso está publicado.
- **A versão daquela conclusão** está `published`.
- **A aula daquela conclusão** está com `is_published=true`.

Nos demais registros elegíveis ao histórico retido, vale `unavailable`.
A existência de outra versão publicada do mesmo curso não torna uma conclusão
antiga disponível. A retirada mantém o registro antigo, e a republicação usa
novos IDs de aula: o aluno continua sem conclusão na nova aula até realizar a
ação explícita existente. Os mesmos slugs em versões diferentes representam
referências distintas e legítimas.

As restrições existentes tornam única a referência
`course_slug + course_version + lesson_slug` no escopo editorial e no histórico
de uma pessoa/empresa: slug de curso por organização, número de versão por
curso, slug de aula por versão e progresso por organização/pessoa/aula.

Disponibilidade descreve a referência no instante daquela consulta; não é uma
concessão de conteúdo ou promessa de acesso futuro. O recorte não resolve uma
versão antiga por slug para abrir uma aula nova. Os endpoints atuais de leitura
continuam verificando a aula e a autoridade a cada acesso.

## Paginação por registro

A ordem é `p.id DESC`. A primeira consulta omite `before_id`; as seguintes
usam `p.id < before_id`. O cursor é um inteiro decimal canônico positivo e
seguro. Ele é somente um limite numérico, **sem consulta de uma âncora**.
Um registro removido por manutenção não invalida o limite. Um número de outro
aluno, de outra empresa ou inexistente também não amplia o escopo: os filtros
de identidade continuam presentes no mesmo SELECT.

A consulta lê no máximo 51 registros. Devolve os primeiros 50 e, somente se
houver o registro 51, retorna como `next_before_id` o `completion_id` do último
item devolvido. Caso contrário, retorna `null`. Uma página vazia é válida.
Todos os 51 registros são validados antes de devolver a página; uma sentinela
inválida não é ocultada como se a primeira página estivesse íntegra.

A ordem é de registro, não uma classificação do aluno nem uma garantia de
ordem pelos timestamps. Datas iguais não geram empates no cursor, e IDs de aula
não são usados para inferir quando a conclusão ocorreu. `completed_at` permanece
a data original da conclusão idempotente.

Cada página tem seu próprio snapshot SQL. O histórico não é congelado entre
requisições. Conclusões novas com ID maior que o limite não deslocam as páginas
seguintes; uma nova consulta desde o início permite vê-las. Mudanças concorrentes
ou manutenção podem alterar o conjunto disponível entre páginas. A UI deve
oferecer consulta manual e respeitar a continuação, sem declarar uma lista
completa enquanto houver `next_before_id`.

Não há teto total de 5.000 neste endpoint paginado. O limite de 5.000 da
exportação v1 permanece separado e inalterado. Não se introduz offset SQL,
contagem global de registros, ticket de paginação ou estado escrito por GET.

## Erros e autoridade

| Situação | Resposta |
|---|---|
| Página válida, inclusive vazia | `200`, envelope v1 |
| Grant negado, revogado, alterado ou autoridade indisponível | `403`, `{"error":"access_denied"}` |
| Cursor malformado ou fora do domínio | `422`, `{"error":"invalid_cursor"}` |
| Organização ausente, falha de banco ou DTO armazenado inválido | `503`, `{"error":"temporarily_unavailable"}` |

O controller revalida empresa, pessoa, permissão e revisão depois da consulta,
inclusive quando o repositório lança uma exceção. O middleware GET revalida a
saída novamente. Metadados inválidos, indisponibilidade ou revogação nunca se
convertem em uma página vazia de sucesso ou em resposta parcial. A fronteira
privada existente mantém `private` e `no-store`.

## Retenção, schema e demais contratos

P0-05 mantém progresso e favoritos por 120 dias após a perda da última
elegibilidade, condicionada às validações jurídica e operacional previstas.
`completed_at` antigo, retirada editorial e revogação não são eventos novos de
expurgo. Esta entrega não inventa a fonte oficial desse evento nem implementa
um purger. Um aluno atualmente autorizado pode consultar uma conclusão antiga
retida dentro do escopo definido.

Não há tabela, migração, índice, grant SQL ou escrita nova. SELECT já está
previsto para progresso, aulas, versões e cursos. O POST de conclusão, a
consulta de progresso atual e `GET /progress/export` não foram alterados. O
binding operacional Portal continua negando acesso até sua homologação.

## Estado editorial: publicado com rascunho mais novo

A leitura do fluxo atual não encontrou uma ação que produza esse estado:

- `createCourse()` cria curso não publicado e versão 1 em rascunho.
- `updateCourse()`, `addLesson()` e `updateLesson()` exigem curso não publicado;
  a alteração de aula exige também sua versão em rascunho.
- `setPublished(false)` bloqueia curso e versão, arquiva a publicação, retira
  suas aulas do ar e cria a versão seguinte em rascunho, tudo na mesma transação.
- `setPublished(true)` publica o rascunho existente. O importador editorial e
  o seeder sintético criam apenas cursos novos em rascunho e ignoram os existentes.

O schema permite no máximo uma versão publicada e uma em rascunho por curso,
por índices separados; portanto a coexistência pode ser construída diretamente
no banco. Isso não a torna um fluxo HTTP suportado. Mesmo nesse estado defensivo,
`catalog()`, `lessons()` e `lesson()` já selecionam `v.status='published'`, não a
maior versão independentemente de status. Não há uma correção funcional de leitor
a acrescentar a C-126, nem motivo para criar uma nova escrita editorial.

Referências: [repositório](../app/Domain/Learning/UniversityCatalogRepository.php),
[importador](../app/Domain/Learning/UniversityEditorialFixtureImporter.php),
[seeder](../database/seeders/UniversityMvpContentSeeder.php),
[restrições de versões](../database/migrations/2026_11_15_000004_enforce_one_live_course_version.php)
e os testes de retirada/republicação e edição bloqueada de curso publicado em
[SharedCurriculumFlowTest](../tests/Feature/SharedCurriculumFlowTest.php).

## Verificação preparada e integração

`tests/Feature/ProgressHistoryFlowTest.php` contém 25 testes Laravel com migrações
e SQLite reais. Cobrem isolamento, contexto forjado, conclusão idempotente,
export preservado, páginas 50/51, timestamps iguais, cursor removido/estrangeiro/
grande, novas conclusões durante paginação, retirada/republicação, disponibilidade
exata, conteúdo omitido, UTC, IDs/versões seguros, DTO inválido inclusive sentinela,
snapshot único e revalidação após sucesso ou erro.

`scripts/check-pg-progress-history.php` prepara a execução do repositório real
no PostgreSQL descartável, com timestamps `timestamptz`, curso republicado,
paginação e casos acima de `int4`. As fixtures ficam numa transação encerrada
por rollback. O guard verifica CI/GitHub Actions/repositório, ambiente de teste
e banco fixos; recusa arquivos de ambiente e URLs alternativas; e confere a
configuração efetiva antes da primeira leitura. Falhas mostram somente fase
fixa e classe da exceção, sem mensagens, SQL ou credenciais.

Invocação de integração: `php scripts/check-pg-progress-history.php`, depois das
migrações e **antes** de `university:load-synthetic-editorial`. O script recusa
organizações de fixture preexistentes. Workflows, UI e percurso real do navegador
são integrados separadamente pelo responsável principal.

Validação local realizada: `git diff --check` e `node scripts/check-write-fence.mjs`
passaram; os 14 caminhos de escrita existentes mantêm sua proteção transacional.
PHP, PostgreSQL e navegador não foram executados localmente. Na preparação
inicial, os 25 Feature tests e o probe ainda dependiam da CI.

## Evidência integrada C126

O commit `b67b9a44f92f538a2f595324b6e24dc78304e9c1` concluiu os seis jobs da
[execução 44216815401](https://github.com/rafhael100/imagine-universidade/actions/runs/44216815401)
com sucesso: validação, paridade Portal, imagem candidata, pacote editorial,
Docker e navegador. Foram aprovados **270 testes PHP e 3.111 asserções**,
incluindo os **25 novos Feature tests**. O probe real de PostgreSQL passou com
paginação 50+1, isolamento, versões exatas, timestamps UTC, cursor removido ou
acima de int4, dados inválidos e rollback das fixtures.

Os **16 invariantes de schema**, **24 verificações de privilégios** e
**14 caminhos de escrita** permanecem aprovados. O navegador concluiu
**523 verificações sintéticas** e **169 pelo Laravel/SQLite real**, incluindo
consulta manual nas duas empresas, conclusão, retirada/republicação e revogação.
Essa execução confirma o código desse SHA; não homologa identidade operacional,
conteúdo real ou publicação. Os 13 critérios de liberação seguem em HOLD_NO_GO.
