# C-119 — visão geral do acervo editorial

17/11/2026 · Backend candidato para revisão e QA. **HOLD_NO_GO** operacional.

## Objetivo

Oferecer ao editor uma visão agregada do acervo institucional, conforme
[BASE-UNI-01-06](10-modulos/UNI-01.md): indicadores autorizados de qualidade e
operações. O painel mostra quantidades de cursos e aulas atuais, sua distribuição
por categoria e avisos sobre cursos sem aulas ou resumo.

Esses indicadores não consultam alunos, favoritos, progresso ou conversas do
Tutor. Não são aprovação editorial, avaliação pedagógica ou autorização de
publicação. Cursos sem resumo representam um aviso de informação opcional,
coerente com o diagnóstico de publicação existente.

## Contrato HTTP

`GET /universidade/private/admin/overview` exige grant `university:manage` e a
organização editorial canônica `imagine-editorial`. Uma permissão de gestão de
uma empresa cliente não permite consultar o painel institucional.

Resposta de exemplo, com catálogo vazio válido:

```json
{
  "schema_version": 1,
  "scope": "current_editorial_catalog",
  "totals": {
    "courses": 0,
    "published_courses": 0,
    "draft_courses": 0,
    "current_lessons": 0,
    "courses_without_lessons": 0,
    "courses_without_summary": 0
  },
  "categories": [
    {"category":"metodologia","courses":0,"published_courses":0,"draft_courses":0,"current_lessons":0},
    {"category":"negocios","courses":0,"published_courses":0,"draft_courses":0,"current_lessons":0},
    {"category":"sistemas","courses":0,"published_courses":0,"draft_courses":0,"current_lessons":0}
  ]
}
```

As três categorias aparecem sempre nessa ordem, inclusive quando não têm cursos.
Todos os contadores são inteiros não negativos e seguros para representação no
navegador. A resposta não contém IDs, slugs, títulos, conteúdo, pessoa, empresa
cliente ou detalhes do grant.

| Contador | Regra |
|---|---|
| `courses` | Cursos compartilhados pertencentes à organização editorial autorizada |
| `published_courses` | Cursos desse conjunto com `is_published=true`, seguindo o catálogo administrativo existente |
| `draft_courses` | Cursos desse conjunto com `is_published=false`; soma com publicados equivale a `courses` |
| `current_lessons` | Quantidade de aulas da versão de maior número de cada curso, como em `adminLessons` |
| `courses_without_lessons` | Cursos cuja versão mais recente não tem aulas, incluindo curso sem versão |
| `courses_without_summary` | Cursos com resumo nulo, vazio ou formado somente por espaços, tabulações, LF, CR ou VT |

As categorias contêm somente os quatro primeiros contadores. Os avisos de
ausência de aulas e resumo aparecem nos totais, conforme o contrato. A quantidade
de aulas considera a versão selecionada pelo editor; não comprova que seu
conteúdo esteja revisado, aprovado ou publicado.

## Consulta consistente e limitada ao editorial

`UniversityCatalogRepository::adminOverview` verifica o grant e resolve a
organização editorial. Depois executa **um único SELECT agregado** para todos os
indicadores:

1. Uma subconsulta encontra o maior número de versão por curso compartilhado da
   organização editorial.
2. Outra conta as aulas dessa versão, incluindo zero quando ela estiver vazia.
3. O SELECT principal agrupa os cursos por categoria e calcula todos os
   contadores e avisos.

Os totais são somados a partir das mesmas linhas agregadas que alimentam as
categorias. Não existem consultas independentes para cada cartão. Uma alteração
posterior no acervo não mistura indicadores de instantes diferentes na mesma
resposta.

O maior número da versão determina a escolha, independentemente da ordem de
inserção dos registros ou do seu ID. Após retirada e clonagem editorial, contam
as aulas do novo rascunho. As aulas das versões anteriores não são somadas, e
permanecem disponíveis apenas conforme as regras históricas já existentes.

O SELECT acessa somente cursos, versões e aulas editoriais; a resolução inicial
usa organizações. Não consulta tabelas pessoais, não inclui identidade do aluno
em filtros e não grava dados. Os papéis SQL existentes já possuem os SELECTs
necessários; não há migração ou alteração de grants.

## Negação e falhas

O controller consulta novamente a autoridade após a leitura, comparando pessoa,
organização, permissão e revisão. O middleware GET faz outra revalidação antes
de liberar a resposta. A política privada de headers e `no-store` permanece
aplicada a sucesso e erro.

| Situação | Resultado |
|---|---|
| Organização editorial presente e catálogo sem cursos | 200 com totais e categorias zerados |
| Estudante, visitante, gestor de empresa cliente ou contexto forjado | 403 `access_denied` |
| Revogação, mudança de contexto ou autoridade indisponível durante a leitura | 403 `access_denied` |
| Organização editorial ausente, falha no banco ou categoria armazenada desconhecida | 503 `temporarily_unavailable` |
| Contador inválido, inconsistente ou acima do limite de representação segura | 503 `temporarily_unavailable` |

Falha não é convertida em catálogo vazio. Categorias desconhecidas não são
descartadas silenciosamente, pois isso alteraria o significado dos totais.

## Testes preparados

`tests/Feature/EditorialOverviewFlowTest.php` acrescenta 16 testes com banco,
migrações e endpoints Laravel reais, usando apenas decisões de autoridade
sintéticas. A cobertura inclui:

- Catálogo vazio, ordem das categorias, tipos inteiros e headers privados.
- Exclusão de cursos privados e de outras empresas; parâmetros e headers não
  mudam o escopo.
- Maior número da versão com inserção fora de ordem e vários históricos arquivados.
- Criação, publicação, retirada e exclusão de aula do rascunho pelos endpoints
  reais, sem somar a aula arquivada.
- Cursos sem versão e resumos nulos, vazios ou com espaços em branco.
- Uma única consulta agregada: o teste altera categoria e resumo depois do SELECT
  e exige que a primeira resposta conserve o snapshot anterior; a próxima
  consulta mostra a alteração.
- Ausência de consultas a progresso, favoritos e Tutor; registros pessoais
  permanecem inalterados.
- Visitante, aluno, gestor de cliente, sessão forjada, provider deny-all, grant
  malformado e organização editorial ausente.
- Erro de banco, categoria desconhecida, revogação e mudança de identidade,
  permissão ou revisão durante a leitura, incluindo a última revalidação GET.

O probe `scripts/check-pg-editorial-overview.php` executa o repositório real no
PostgreSQL descartável. Verifica booleans, tipos de SUM, categorias, resumos com
whitespace, versões fora de ordem e escopo editorial. Suas fixtures pertencem a
uma transação e são revertidas no `finally`; ele recusa organizações de fixture
preexistentes e confirma a limpeza antes de terminar.

**Ordem na CI:** após as migrações e antes de
`university:load-synthetic-editorial`. O probe exige o repositório GitHub
esperado, ambiente de teste e o banco PostgreSQL local fixo do laboratório.
Não aceita arquivos de ambiente operacionais ou URL alternativa de conexão e
confere também a configuração efetiva do Laravel antes de consultar o banco.

Validações locais: `node scripts/check-write-fence.mjs` e `git diff --check`,
ambas aprovadas. PHP, PHPUnit e o probe
PostgreSQL devem ser executados pela CI; nenhum resultado foi presumido a partir
da leitura do código. O provider normal continua deny-all e os gates de
liberação não mudam por esta entrega.
