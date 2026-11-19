# C-122 — consulta editorial de versões arquivadas

17/11/2026 · Backend candidato para revisão e CI. **HOLD_NO_GO** operacional.

## Evidência executada

O commit `98e32b357248c8bd40cb68f38edcb47d338942b6` passou nos seis jobs da
[execução 44209334123](https://github.com/rafhael100/imagine-universidade/actions/runs/44209334123).
Foram **39 testes Unit/169 asserções e 178 Feature/2.350**, totalizando
**217 testes e 2.519 asserções**. Os 21 testes deste contrato estão incluídos.

O probe executou o repositório real no PostgreSQL e confirmou as páginas com
sentinela, empates no cursor composto, Unicode integral, vínculo exato,
ausência de dados pessoais/corpos nos índices e parâmetros além de int4 sem
erro de conversão. As fixtures foram revertidas. O navegador concluiu 419
verificações sintéticas e 98 no fluxo real do Laravel, inclusive preservação
do arquivo depois da edição e republicação da versão seguinte.

A correção de descarte do HTTP200 tardio e a inspeção visual do leitor estão
registradas no [documento da interface](UNI-C122-CONSULTA-VERSOES-EDITORIAIS-UI-2026-11-17.md).
Os resultados permanecem limitados ao SHA e ao laboratório citados.

## Recorte e fontes

Permitir ao editor consultar versões arquivadas, navegar pelos metadados de
suas aulas e abrir o texto de uma aula específica. A entrega cobre a consulta
de versões prevista em [BASE-UNI-03-06](10-modulos/UNI-03.md), dentro dos temas
de controle de versões de [UNI-04-04](10-modulos/UNI-04.md) e rastreabilidade de
[UNI-14-05](10-modulos/UNI-14.md).

O recorte não completa a associação a versões reais de produtos, fontes,
modelos de IA ou aprovação humana. Esses dados não existem neste contrato.
Também não introduz restauração, cópia para rascunho, publicação, edição,
exclusão, exportação editorial ou qualquer outra mutação.

Somente versões `archived` entram nos três endpoints. Rascunhos e versões
publicadas continuam nas consultas e formulários atuais. A aula arquivada pode
ter `is_published=false`; isso não impede a leitura pelo editor autorizado e
não concede acesso ao aluno.

## Cadastro atual versus conteúdo histórico

`educational_courses` guarda título, descrição e categoria globais atuais. Não
existe uma cópia desses campos em cada versão. Por isso, **nenhum DTO histórico
retorna título, descrição ou categoria do curso**. O painel pode usar o catálogo
administrativo como contexto, identificado como cadastro atual, separado das
aulas históricas.

Título, slug, corpo e ordem da aula pertencem à versão referenciada pelo seu
registro. A retirada editorial já preserva essas aulas e cria novos IDs para o
rascunho seguinte. A consulta não remapeia uma aula antiga por slug ou título.
Também não apresenta `created_at`/`updated_at` como data de publicação,
homologação ou arquivamento; essas datas não são emitidas nesta entrega.

## Autoridade e rotas

Base `/universidade/private/admin`, com middleware `university.grant:manage`
(permissão `university:manage`), empresa editorial
canônica `imagine-editorial` e curso `is_shared=true`. Identidade, empresa e
permissão vêm do grant verificado; query strings e headers não ampliam escopo.
Um gestor de empresa cliente não adquire acesso editorial por possuir MANAGE.

| GET | Finalidade |
|---|---|
| `/courses/{courseId}/versions?before_version=N` | Metadados de versões arquivadas, da maior para a menor |
| `/courses/{courseId}/versions/{courseVersion}/lessons?after_sort_order=S&after_lesson_id=I` | Metadados das aulas da versão exata, por ordem e ID crescentes |
| `/courses/{courseId}/versions/{courseVersion}/lessons/{lessonId}` | Um corpo de aula, limitado ao curso, versão e ID informados |

`courseVersion` é sempre o **número da versão dentro do curso**, não a PK da
tabela de versões. IDs e números de versão são inteiros positivos seguros para
JavaScript. `sort_order` é inteiro seguro não negativo. Rotas numéricas fora
desse domínio são recusadas antes de conversões que poderiam transbordar.

O repositório verifica o curso editorial antes de consultar seu histórico. No
detalhe, curso, número da versão, status `archived` e ID da aula precisam
coincidir. Todos os caminhos são somente leitura, sem acesso a progresso,
favoritos, marcador pessoal, conversas ou identificadores de operadores.

## DTOs v1

### Índice de versões

```json
{
  "schema_version": 1,
  "scope": "editorial_archived_content",
  "course_id": 10,
  "versions": [
    {"version": 3, "status": "archived", "lesson_count": 8}
  ],
  "next_before_version": null
}
```

`lesson_count` conta somente as aulas daquela versão. Um subselect correlacionado
calcula a contagem no mesmo snapshot SQL do índice. Nenhum corpo é selecionado.
Curso próprio existente sem versões arquivadas retorna uma lista vazia válida.

### Índice de aulas

```json
{
  "schema_version": 1,
  "scope": "editorial_archived_content",
  "course_id": 10,
  "course_version": 3,
  "status": "archived",
  "lessons": [
    {"id": 20, "slug": "aula-exemplo", "title": "Título histórico", "sort_order": 0}
  ],
  "next_after": null
}
```

Quando houver outra página, `next_after` terá exatamente
`{"sort_order":0,"lesson_id":20}`, correspondente à última aula devolvida.
Uma versão arquivada sem aulas retorna lista vazia válida.

### Detalhe de uma aula

```json
{
  "schema_version": 1,
  "scope": "editorial_archived_content",
  "course_id": 10,
  "course_version": 3,
  "status": "archived",
  "lesson": {
    "id": 20,
    "slug": "aula-exemplo",
    "title": "Título histórico",
    "body": "Texto integral daquela aula e versão.",
    "sort_order": 0
  }
}
```

Slug segue o padrão editorial ASCII existente, até 120 caracteres. Título é
texto não vazio de até 200 pontos de código Unicode; corpo é texto não vazio
de até 30.000 pontos de código. Esses tetos correspondem aos contratos
editoriais atuais. A consulta não impõe retrospectivamente os mínimos de
digitação de novos rascunhos. Texto é entregue integralmente, sem `slice`,
reticências ou truncamento. Campos armazenados incompatíveis causam 503.

## Paginação e limites

Os índices têm **50 registros por página**. A consulta lê no máximo 51 para
identificar a existência de outra página. `next_before_version` ou `next_after`
fica `null` somente quando não há a linha sentinela. Isso não se confunde com
um limite global de versões ou aulas: páginas adicionais continuam disponíveis.

O cursor de versões precisa corresponder a uma versão arquivada do mesmo
curso. O cursor de aulas exige o par completo `after_sort_order` e
`after_lesson_id`, pertencente à versão selecionada. A ordenação composta
preserva aulas com a mesma ordem; a próxima página não pula os empates.
Os cursors são referências de paginação, nunca autorização.

Novas versões arquivadas, de número maior, não deslocam as páginas antigas
percorridas com `before_version`. Atualizar a primeira página é a ação explícita
para consultar o início mais recente. A UI não precisa baixar todas as páginas
ou todos os corpos para mostrar o histórico.

PostgreSQL usa `integer` em versão e ordem, enquanto a validação HTTP aceita
inteiros seguros. Os parâmetros dessas comparações são convertidos por
`CAST(? AS BIGINT)`, sem cast na coluna. Assim, por exemplo, `2147483648` resulta
em versão inexistente ou cursor inválido, sem provocar um erro de conversão
int4 ou introduzir um teto arbitrário de negócio no navegador.

## Falhas e revalidação

| Condição | Resposta |
|---|---|
| Identidade, empresa ou permissão não autorizada; revogação; autoridade indisponível | `403 {"error":"access_denied"}` |
| Curso, versão ou aula fora do escopo; versão não arquivada; rota fora do domínio numérico | `404 {"error":"not_found"}` |
| Cursor malformado, par incompleto ou âncora de outro escopo | `422 {"error":"invalid_cursor"}` |
| Banco, organização editorial ou integridade do DTO indisponível | `503 {"error":"temporarily_unavailable"}` |

O helper do controller revalida o grant após a leitura, inclusive quando a
consulta falha. O middleware GET faz a última revalidação antes de liberar a
resposta. Erros não carregam dados parciais, título atual ou conteúdo de aula.
As respostas mantêm `no-store` e a fronteira privada existente.

## Verificação preparada

`EditorialArchivedVersionsFlowTest` contém **21 testes Feature** com Laravel,
SQLite e migrações reais. Somente a autoridade Portal é sintética. Os cenários
incluem publicação/retirada/edição posterior pelos endpoints existentes,
distinção de cadastro atual, versão numérica versus PK, vínculo triplo,
paginação 50+1 e exatamente 50, empates de ordem, curso sem histórico, versão
vazia, cursors inválidos, escopo editorial, negação padrão, Unicode completo,
DTO inválido, consultas sem corpos/pessoas, ausência de mutações, revogação,
mudança de grant, erro de banco e limite int4 do PostgreSQL.

`scripts/check-pg-editorial-archives.php` prepara o ensaio do repositório real no
PostgreSQL descartável da CI. Guardas exigem GitHub Actions, repositório, host,
banco e credenciais sintéticos exatos; a configuração efetiva é conferida antes
da primeira consulta. Fixtures recusam colisão com organizações existentes e
ficam em uma única transação, revertida em `finally`.

O probe deve executar **após migrations e antes do seed editorial**. Exercita
55 versões, 55 aulas com empates, uma aula no limite Unicode, curso estrangeiro
e não compartilhado, exclusão de rascunho, metadados atuais ausentes, resposta
de âncoras acima de int4, escopo de MANAGE e somente SELECTs editoriais. O corpo
de aula aparece somente no detalhe, sem cópia integral em índices.

Nenhuma migração, sequência, grant, binding ou provider novo é necessário.
Os workflows e os ensaios de interface são integrados pelo responsável pelo
lote. A execução PHP/PHPUnit/PostgreSQL/Chromium não ocorreu localmente; os
resultados reais devem ser conferidos na CI de integração. Os gates de operação
permanecem intactos.
