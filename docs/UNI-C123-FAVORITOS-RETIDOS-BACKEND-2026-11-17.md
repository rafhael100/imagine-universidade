# C-123 — consulta privada dos favoritos retidos

17/11/2026 · Backend candidato para revisão e CI. **HOLD_NO_GO** operacional.

## Objetivo e base

Permitir que o aluno consulte as próprias referências salvas, inclusive quando
o curso tiver sido retirado, para decidir se deseja remover uma preferência.
O recorte complementa os favoritos privados de
[C-116](UNI-C116-FAVORITOS-PRIVADOS-BACKEND-2026-11-17.md) e a exportação de
[C-118](UNI-C118-EXPORTACAO-FAVORITOS-PRIVADOS-2026-11-17.md), previstos em
[UNI-07-02](10-modulos/UNI-07.md) e [UNI-12-01](10-modulos/UNI-12.md).

A listagem usa o escopo já existente da exportação de favoritos retidos.
Devolve apenas referências próprias, sem conceder acesso ao conteúdo de um
curso retirado. O gestor editorial ou da empresa não recebe acesso às
preferências de alunos por possuir a permissão MANAGE.

## Contrato HTTP

`GET /universidade/private/favorites/retained?after_course_id=N`

O endpoint exige o middleware `university.grant:view`, com a permissão
`university:view`, sessão validada no servidor e grant atual. Empresa e pessoa
vêm exclusivamente desse grant. Parâmetros ou headers com empresa, pessoa,
curso ou permissão não alteram o escopo.

```json
{
  "schema_version": 1,
  "scope": "current_authenticated_student",
  "favorites": [
    {
      "course_id": 17,
      "course_slug": "curso-exemplo",
      "saved_at": "2026-11-17T10:00:00Z",
      "availability": "unavailable"
    }
  ],
  "next_after_course_id": null
}
```

Cada item possui exatamente `course_id`, `course_slug`, `saved_at` e
`availability`. Não há título, resumo, categoria, corpo de aula, versão,
identificador de empresa, pessoa ou outro registro de aprendizagem.

`course_id` é inteiro positivo seguro para JavaScript, até
`9007199254740991`. O slug segue o contrato editorial ASCII existente, com
letras minúsculas, dígitos e hífens entre grupos, até 120 caracteres. A data é
sempre UTC, no formato `YYYY-MM-DDTHH:MM:SSZ`. Representações legítimas do
banco são convertidas apenas no objeto de resposta; a consulta não altera o
timestamp armazenado. Os formatos existentes dos outros endpoints permanecem
inalterados.

`saved_at` corresponde à criação original da preferência. Não representa
publicação, retirada, revisão do curso, último acesso ou início da retenção.

## Escopo e disponibilidade

Uma referência só entra no índice quando corresponde simultaneamente a:

1. Favorito da empresa e pessoa do grant VIEW atual.
2. Curso compartilhado da organização editorial canônica `imagine-editorial`.
3. Existência de ao menos uma versão `published` ou `archived` desse curso.

O terceiro requisito impede que uma preferência injetada em um curso nunca
publicado exponha seu slug. Curso de outra organização, curso não compartilhado
ou curso sem evidência de publicação fica fora da listagem. Nenhuma dessas
exclusões apaga a preferência.

`availability` será `available` somente quando o curso estiver com
`is_published=true` **e** existir uma versão `published`. Nos demais casos
elegíveis ao índice retido, será `unavailable`. As duas condições são avaliadas
no mesmo SELECT que retorna a referência. Não há uma segunda consulta por item
que possa combinar estados de publicação de momentos diferentes.

As versões entram por `EXISTS`, sem join que multiplique favoritos quando um
curso possui várias versões arquivadas. A consulta não lê aulas, progresso,
marcador de leitura ou conversas. As organizações são resolvidas antes do
SELECT de metadados; nenhum resultado vazio substitui uma organização ausente.

Uma retirada editorial preserva a referência, tornando-a indisponível. Uma
republicação pode torná-la disponível novamente, sem alterar a data de criação.
O índice não remapeia referências para outro curso nem oferece acesso a aulas
antigas. A consulta de conteúdo continua submetida aos endpoints publicados.

## Paginação e consistência

A ordenação é `course_id` crescente. Cada página devolve no máximo 50 itens; o
banco lê 51 para detectar a continuação. `next_after_course_id` recebe o ID do
último item devolvido somente quando existe a linha 51. Caso contrário, recebe
`null`. Uma página vazia com `null` é um resultado válido.

`after_course_id` é opcional e deve ser um inteiro positivo em representação
decimal canônica, até `9007199254740991`. O parâmetro funciona exclusivamente
como limite `course_id > N`: **não exige uma âncora existente**. Assim, remover
o último favorito de uma página não invalida o cursor que já foi entregue.
Um ID de outro aluno, empresa ou de um registro inexistente também é apenas
um limite numérico, sem consulta de presença e sem ampliação de escopo.

Cada página representa seu próprio snapshot SQL. Não há snapshot congelado
entre requisições: alterações posteriores podem exigir que o aluno consulte
novamente desde o início. A paginação não declara uma lista completa enquanto
`next_after_course_id` indicar continuação.

Todos os registros lidos, inclusive a linha sentinela, passam pela validação
do DTO antes da resposta. ID inseguro, slug inválido, data ausente ou malformada
impedem a página inteira. Dados inválidos não são cortados, arredondados,
pulados ou convertidos em uma lista vazia de sucesso.

## Remoção, erros e revalidação

A remoção reutiliza `DELETE /universidade/private/courses/{courseId}/favorite`,
com a mesma identidade, CSRF, transação e revalidação já existentes. Não foi
criada nova capacidade de escrita. Ela continua removendo somente a preferência
própria, inclusive após retirada do curso, e permanece idempotente.

Se a resposta de um DELETE se perder, a ausência em uma única página não prova
que a remoção ocorreu. A interface mantém o resultado como não confirmado e
oferece consulta manual; não repete a escrita automaticamente. O índice
`GET /favorites` continua mostrando somente favoritos atualmente publicados
e também não constitui confirmação da remoção de uma referência retirada.

| Situação | HTTP e resposta |
|---|---|
| Página válida, inclusive vazia | `200`, envelope v1 |
| Grant negado, revogado, alterado ou autoridade indisponível | `403`, `{"error":"access_denied"}` |
| Cursor malformado ou fora do domínio | `422`, `{"error":"invalid_cursor"}` |
| Organização ausente, erro de banco ou metadado inválido | `503`, `{"error":"temporarily_unavailable"}` |

O controller revalida empresa, pessoa, permissão e revisão após a consulta,
inclusive quando ela falha. O middleware GET revalida novamente antes de
liberar a resposta. Nenhum erro devolve o resultado parcial da consulta.
Respostas privadas mantêm `private` e `no-store`, sem anexo ou novo canal de
exportação.

`GET /favorites`, a exportação v1 em `/favorites/export`, a exportação de
progresso e as mutações existentes não foram modificados. Não há nova tabela,
migração, privilégio SQL ou binding de autoridade. O provider operacional
continua negando acesso até o contrato Portal ser homologado.

## Retenção

A [DEC-UNI-P0-05](00-governanca/DECISAO-UNI-P0-05-2026-11-03.md) estabelece 120
dias após a perda da última elegibilidade. A idade de `saved_at` e a retirada
de um curso não são esse evento. Favoritos antigos permanecem consultáveis
para um aluno atualmente autorizado, dentro do escopo descrito.

C-123 não implementa expurgo nem presume uma nova fonte de perda de
elegibilidade. A dependência operacional da fonte oficial do Portal e da
homologação da política permanece. A remoção expressa pelo aluno usa a ação já
existente e não inventa esse evento de retenção.

## Verificação preparada

`tests/Feature/RetainedFavoritesFlowTest.php` contém 28 testes Laravel com
SQLite e migrações reais. Só a decisão de autoridade é sintética. Cobrem
isolamento entre pessoas e empresas, identidade forjada, negação padrão,
paginação 50+1, exatamente 50, cursor removido ou estrangeiro, limites seguros,
retirada/republicação, remoção real, versões múltiplas, nunca publicado,
campos omitidos, datas UTC, metadados inválidos inclusive sentinela, snapshot
único, nenhuma escrita e revalidação após sucesso ou erro.

`scripts/check-pg-retained-favorites.php` executa o repositório real no
PostgreSQL descartável da CI. Verifica os filtros e os dois `EXISTS`, ordenação
e continuação, cursor ausente acima de `int4`, formato real de timestamp do
PostgreSQL, privacidade, retirada/republicação e rejeição de metadados inválidos.
Todas as fixtures ficam em uma transação encerrada por rollback.

**Ordem do probe:** depois das migrações e antes de
`university:load-synthetic-editorial`. A invocação é
`php scripts/check-pg-retained-favorites.php` no job PostgreSQL existente.
O script recusa organização editorial ou nomes de fixture preexistentes,
verifica CI/GitHub Actions/repositório e banco descartável fixos antes de
carregar Laravel e confere a conexão efetiva antes da primeira leitura.
Arquivos de ambiente e URLs alternativas de conexão são recusados.
Diagnósticos de falha mostram apenas fase fixa e classe da exceção, sem SQL,
credenciais, mensagens ou rastros.

Os testes PHP e o probe PostgreSQL não foram executados no ambiente local.
No [run 44211440898](https://github.com/rafhael100/imagine-universidade/actions/runs/44211440898),
SHA `89c8767add9f290733c35fdaeafac5606a30ab2e`, o backend passou em **245 testes /
2.801 asserções**, incluindo os 28 Feature deste contrato. O probe PostgreSQL
confirmou o snapshot 50+1, isolamento, cursores removidos/estrangeiros e acima
de `int4`, UTC, retirada/republicação, sentinelas inválidas e rollback. Os
16 invariantes de schema e os outros probes permaneceram aprovados.

Cinco dos seis jobs desse run passaram. O navegador expirou em uma espera do
harness após revogação; o percurso real posterior não executou. O diagnóstico
e o ajuste de sincronização estão documentados no
[registro da interface C123](UNI-C123-GESTAO-FAVORITOS-UI-2026-11-17.md).
Esses resultados validam o backend desse SHA, sem antecipar aprovação do
conjunto ou de commits posteriores.
