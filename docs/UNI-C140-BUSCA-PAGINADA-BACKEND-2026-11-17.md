# C140 — continuação manual da busca privada de aulas

Referência: rodada de desenvolvimento de **17/11/2026**. Implementação e verificações estáticas em **18/11/2026**.

Base: `8368d5261915412233726eafacd5e057bd04e303`, no worktree C140 backend. Esta identificação não afirma aprovação desta entrega na CI.

## Necessidade já prevista

Os itens `BASE-UNI-03-04`, `BASE-UNI-10-01` e `BASE-UNI-10-04` de `docs/08-fechamento-candidato/02-BASE-FUNCIONAL-14-MODULOS.md` preveem localização de materiais educativos, busca e proteção do conteúdo privado. A C104 implementou a primeira busca por expressão no título do curso, título da aula e corpo, limitada a oito resultados, sem continuação.

Uma leitura local de `content/mvp-cursos-v1.json` encontrou **10 cursos e 35 aulas**. Aplicando a mesma inclusão literal aos três campos, os termos ASCII `visitas`, `leads` e `clientes` correspondem, respectivamente, a **16, 17 e 18 aulas**. Esses números foram calculados em Node sobre o arquivo com status `editorial_draft`; não são uma consulta ao banco, uma afirmação de publicação do acervo ou uma medição de uso por alunos. Eles demonstram uma necessidade concreta de alcançar resultados posteriores aos oito primeiros quando esse conteúdo estiver publicado.

O limite inicial da C104 era deliberado. Esta entrega acrescenta navegação limitada por páginas, sem tratar esse recorte anterior como uma falha de autorização e sem criar ranking, IA, histórico de busca ou recomendação por perfil.

## Contrato HTTP e compatibilidade

O endpoint continua **`POST /universidade/private/search`**, com capacidade `university:view`, sessão do servidor, CSRF e `throttle:20,1`. Termo e cursor seguem no corpo, nunca em uma nova URL de busca.

| Corpo | Resposta de sucesso |
| --- | --- |
| `{query}` ou `{query,paginated:false}` | Exatamente o envelope legado `{results}`. |
| `{query,paginated:true}` ou cursor explicitamente nulo | Primeira página no envelope C140. |
| `{query,paginated:true,cursor:"..."}` | Continuação validada da mesma expressão. |

O modo novo exige o booleano JSON `true`; strings e números não ativam paginação. Um cursor não nulo exige esse modo. Cursor vazio, não textual, com controles/espaços, Unicode ou mais de **2048 bytes** é inválido. `null` representa o início, sem gravar estado. O controller lê esses novos campos do JSON bruto para não transformar uma string vazia em um cursor inicial por efeito do middleware de normalização.

O envelope paginado contém somente:

```json
{
  "schema_version": 1,
  "scope": "current_published_editorial_lessons",
  "results": [
    {
      "course_id": 1,
      "course_title": "Título atual do curso",
      "lesson_id": 2,
      "lesson_title": "Título da aula publicada",
      "snippet": "Trecho curto do conteúdo publicado."
    }
  ],
  "next_cursor": null
}
```

Cada página lê **no máximo nove linhas** e devolve **no máximo oito resultados**. A nona linha determina a existência da continuação. `next_cursor` é uma string ASCII opaca de até 2048 bytes quando há outra página; caso contrário, é `null`. Zero resultados é um sucesso vazio explícito, sem cursor.

Os cinco campos de cada resultado e a geração do trecho curto são os mesmos do método legado. `searchPublishedLessons(PortalGrant, string): ?array` conserva sua assinatura e seu retorno. Consulta base e mapper foram extraídos para uso comum; o caminho legado não precisa criar ou decodificar um cursor.

A validação anterior da expressão permanece: termo literal Unicode de 3 a 60 caracteres, sem curingas SQL. Espaços repetidos são normalizados no domínio. O hash do cursor usa a expressão normalizada em minúsculas, de acordo com o padrão textual que alimenta o `LIKE` existente. Não há busca semântica nem promessa nova de equivalência entre acentos.

## Cursor, ordem e contexto ao vivo

`PublishedLessonSearchCursor` usa `Crypt::encryptString()` e `decryptString()` do Laravel, com a chave da aplicação já existente. O prefixo de formato é `s1.`. O conteúdo autenticado inclui:

- Propósito fixo `university.published-lesson-search.v1` e hash SHA-256 da expressão normalizada.
- Ordem e ID do curso.
- ID da linha de versão e número exato da versão.
- Ordem e ID da aula que encerrou a página devolvida.

IDs e versões são inteiros positivos seguros; ordens são inteiros não negativos seguros. O limite seguro é `9007199254740991`, sem introduzir um teto arbitrário de versão. Todos os registros lidos, inclusive a sentinela, passam pela validação dos componentes do cursor. Um identificador que seria arredondado no navegador recusa a página inteira.

O token não contém a expressão em texto, pessoa, empresa, histórico, progresso ou credencial. Não é autorização. O catálogo editorial publicado é comum aos clientes elegíveis; outro cliente autorizado pode utilizar o mesmo limite de navegação, mas continua precisando de sua própria sessão e concessão atual. Nenhuma leitura pessoal participa da consulta.

A ordem continua **`c.sort_order, c.id, l.sort_order, l.id`**, crescente, sem score. Para a próxima página, o repository:

1. Valida o grant, a expressão e a autenticidade, estrutura e vínculo do cursor.
2. Resolve as organizações pelo grant e pela organização editorial fixa.
3. Relê a aula de referência com os mesmos JOINs, filtros de publicação e condição textual da busca.
4. Compara curso, versão e ambos os pares de ordem/ID com a referência autenticada.
5. Executa a comparação lexicográfica estritamente posterior a essa tupla, com parâmetros vinculados e limite nove.
6. Relê a referência depois da consulta da página, recusando uma mudança que ocorreu durante essa leitura.
7. Confere a validade temporal do grant e monta os resultados e eventual continuação.

As comparações numéricas de ordem usam `CAST(? AS BIGINT)` nos parâmetros para manter o comportamento definido no PostgreSQL também para limites seguros acima de `int4`. Não há concatenação de expressão, IDs ou cursor no SQL.

O cursor é uma navegação sobre o **catálogo atual**, sem snapshot persistido ou bloqueio editorial. Retirada, mudança de versão, remoção da referência, alteração de sua ordem ou perda de correspondência com a expressão exigem reinício. Mudanças em outros resultados podem afetar páginas posteriores; a entrega não promete visão global congelada ou ausência de repetição diante de qualquer reordenação externa. Se uma ordem mudar e depois voltar exatamente ao valor anterior, sem alterar os demais componentes, a comparação pode aceitar novamente aquela referência. Não existe contador de revisão do catálogo nesta entrega.

Não há TTL inventado para essa navegação. A autorização e a referência são rechecadas a cada uso. A criptografia usa aleatoriedade, portanto duas emissões para a mesma referência podem gerar strings diferentes; igualdade textual de tokens não define a identidade de uma página.

## Erros e autorização

| Condição | Resultado |
| --- | --- |
| Cursor malformado, adulterado, de outro propósito ou de outra expressão | `422 {"error":"invalid_cursor"}` |
| Referência ausente, fora do escopo publicado ou divergente da tupla/versão | `409 {"error":"search_context_changed"}` |
| Falha de banco/criptografia ou integridade numérica | `503 {"error":"temporarily_unavailable"}` |
| Autoridade negada, expirada, indisponível ou com pessoa/empresa/permissão/revisão diferente | `403 {"error":"access_denied"}` |

A expressão inválida conserva a validação HTTP `422` anterior. Falha de CSRF permanece `419` no middleware. Não há mensagem com o cursor, a consulta, SQL, nomes de tabelas ou detalhes do registro que mudou.

Como a leitura usa POST, ela não depende da rechecagem final destinada a GET/HEAD no middleware. `searchLessons()` consulta `freshGrant()` **depois do sucesso ou da falha do repository**, incluindo os erros de cursor, antes de devolver qualquer resultado. A negação prevalece sobre `409`, `422` de cursor e `503`. Essa correção também cobre uma falha da consulta legada sem mudar seu envelope de sucesso. Não há escrita que poderia já ter sido confirmada quando essa revalidação acontece.

Os filtros compartilhados continuam exigindo curso da organização `imagine-editorial`, compartilhado e publicado, versão `published` e aula publicada. Campos de organização, pessoa, curso ou limite enviados pelo cliente não modificam esses filtros. Os cabeçalhos privados e `no-store` permanecem no mesmo limite de resposta existente.

## Ensaios preparados

### Feature HTTP / SQLite

`tests/Feature/PaginatedLessonSearchFlowTest.php` prepara **25 testes** com migrations, rotas, middleware, banco, repository e codec reais; somente as decisões do Portal são sintéticas.

Cobertura: equivalência legado/primeira página; DTO e limites; zero/oito/nove resultados; sequência com empates nos cursos e aulas; repetição explícita de leitura; consulta parametrizada e ausência de writes/dados pessoais; escopo adverso e campos forjados; autenticidade, propósito, tipos, tamanho e vínculo à expressão; retirada/republicação por HTTP real; referência removida, reordenada ou alterada durante a consulta; alterações externas sem promessa de snapshot; sentinela insegura; default deny, capacidade, revogação, revisão, pessoa e indisponibilidade; erro de banco com rechecagem; CSRF e rota POST com o limiter anterior.

### PostgreSQL real no job existente

`scripts/check-pg-progress-history.php` ganhou **15 verificações C140** antes das asserções anteriores de histórico. Elas invocam `UniversityCatalogRepository::searchPublishedLessonsPage()` e `PublishedLessonSearchCursor` reais. Não é um espelho de SQL em PDO.

O bloco reutiliza as 55 aulas publicadas de uma versão `1000001`, mais a aula atual de outro curso, e os escopos adversos já existentes. Percorre sete páginas de oito resultados com empates, confere o limite SQL nove, os parâmetros do `LIKE`, a equivalência do legado, a versão exata, as falhas de cursor e contexto, valores acima de `int4`, a mudança entre o SELECT da página e a segunda leitura da referência, e a ausência de escrita ou leitura de dados pessoais pela busca.

As alterações sintéticas de ordem/publicação ficam dentro de um savepoint. O rollback e uma comparação integral dos registros confirmam a restauração antes dos testes anteriores. Guards, fixtures principais, assertions anteriores, rollback final, topologia e jobs permanecem intactos. A chave utilizada é a chave sintética já definida nos jobs isolados; não foi criada credencial operacional.

## Evidência local e integração

Executados localmente:

- Leitura do acervo em Node, com as contagens documentadas acima.
- `node scripts/check-write-fence.mjs`: **15 caminhos de escrita aprovados**, sem alterações nesses caminhos.
- `git diff --check`: sem erros de whitespace.

**Não foram executados PHP, PostgreSQL, Docker ou Chromium localmente.** Os 25 testes Feature e 15 checks PostgreSQL desta entrega estão preparados para a CI autorizada. Não se afirma sucesso desses ensaios antes do resultado da CI.

A interface C140, seu checker, módulo Chromium e integração nos runners são entregas separadas. A interface deve substituir a página, manter no máximo oito resultados no DOM, exigir cliques de próxima página/reinício e descartar respostas obsoletas ao mudar a consulta, recarregar a biblioteca ou perder acesso. Um clique de resultado continua usando a leitura autorizada da aula exata pelo fluxo existente.

Não houve alteração de schema, grants, endpoints, provider Portal, retenção, exportações, conteúdo editorial ou gates de lançamento. Não foram realizados stage, commit, push, merge, deploy ou operação na VPS por esta entrega de backend.

## Runtime integrado confirmado

O SHA `92d8452b5cb3e65308a11044747f75d6c77e9cd5`, [run 44235137343](https://github.com/rafhael100/imagine-universidade/actions/runs/44235137343), encerrou os **seis jobs com sucesso**. Os logs de validação confirmam **384 testes PHP / 5.035 asserções** (39 Unit/169 e 345 Feature/4.866), incluindo os 25 testes C140, e as **15 verificações PostgreSQL C140** com restauração do savepoint antes dos cenários anteriores.

O navegador sintético passou **773 verificações**, incluindo as 27 C140. A jornada pelo Laravel/SQLite real passou **245 verificações**, incluindo as 13 novas, e a conferência de persistência. A leitura real percorreu nove aulas em duas páginas, abriu a referência exata e reiniciou sem gravar progresso, favoritos ou posição. Os contratos e efeitos são verificados contra respostas reais do framework, sem interceptação de respostas de negócio nesse percurso.

Paridade Portal, Docker, imagens e pacote editorial também foram aprovados. Os providers padrão e os 13 gates operacionais permanecem inalterados; a aprovação do laboratório não autoriza acesso real nem publicação.
