# C-134 — datas UTC na exportação privada de progresso

Referência da rodada: **17/11/2026**. Preparação e verificações locais realizadas
em 18/11/2026, sobre a base `c19bea9`, com C-131/C-132 integradas. Esta referência
identifica a base de trabalho e não afirma aprovação da CI deste recorte.

## Problema e evidência

O requisito [BASE-UNI-07-04](10-modulos/UNI-07.md) inclui exportar os dados
educacionais próprios conforme a política. O endpoint existente
`GET /universidade/private/progress/export` devolvia `completed_at` como a
string obtida diretamente pelo PDO. A coluna é `timestampTz` na migração do
progresso; PostgreSQL pode representar o fuso com horas apenas, como `+00` ou
`+03`.

O normalizador real `sanitizedProgressExport`, na view do aluno, aceita UTC
com `Z` e offsets `±HH:MM`, mas não aceita `±HH`. A incompatibilidade foi
reproduzida localmente executando essa função real em Node:

| `completed_at` recebido | Resultado anterior do parser, preservado nesta entrega |
| --- | --- |
| `2026-11-17 10:00:00+00` | Recusado |
| `2026-11-17 13:00:00+03` | Recusado |
| `2026-11-17T10:00:00Z` | Aceito |
| `2026-11-17 10:00:00` | Aceito |

Isso explica por que um percurso com SQLite pode aceitar o download enquanto
uma representação legítima de PostgreSQL exige normalização no servidor.
A reprodução acima demonstra o comportamento do parser; a confirmação do PDO
real faz parte da extensão de probe preparada para CI.

## Alteração mínima

O mapeamento de `completed_at` em `UniversityCatalogRepository::exportProgress`
passa a reutilizar `privateReferenceTimestamp`, já utilizado nas referências
privadas retidas e no histórico de progresso. O DTO usa
**`YYYY-MM-DDTHH:MM:SSZ`**, com o instante convertido para UTC e precisão de
segundos, conforme esse helper existente.

Exemplos esperados:

| Representação armazenada/lida | Campo exportado |
| --- | --- |
| `2026-11-17 13:00:00+03` | `2026-11-17T10:00:00Z` |
| `2026-11-17T15:30:00+05:30` | `2026-11-17T10:00:00Z` |
| `2026-11-17T13:30:00.123456+0330` | `2026-11-17T10:00:00Z` |
| `2026-01-01 00:30:00+02` | `2025-12-31T22:30:00Z` |

Uma representação sem fuso segue o tratamento UTC já definido pelo helper.
Não há uso de `now()` como substituição de data, correção silenciosa de um dia
inválido ou alteração dos registros de progresso.

O helper recusa tipo/formato inválido e avisos ou erros do parser de data. A
conversão de todas as linhas termina antes de construir a resposta. Se uma
data inválida aparecer depois de linhas válidas, a exceção segue o tratamento
existente: **503 `temporarily_unavailable`**, sem `Content-Disposition` e sem
referências parciais. O middleware de GET ainda revalida a autoridade antes de
liberar essa resposta, inclusive se houver revogação durante a leitura.

## Compatibilidade e limites

O contrato permanece **schema v1**, com escopo
`current_authenticated_student` e os mesmos quatro campos por referência:
`course_slug`, `course_version`, `lesson_slug`, `completed_at`. Nome do arquivo,
headers privados, limite de 5.000 registros, recusa de overflow por sentinela
5.001, ordenação, consulta, isolamento por pessoa/empresa e rechecagens de
autoridade permanecem intactos.

Referências próprias a versões arquivadas continuam exportáveis; a retirada
ou republicação do curso não transfere uma conclusão antiga nem libera o
conteúdo retirado. Não entram títulos, corpos, IDs internos ou identidades.
Uma lista válida vazia continua sendo um arquivo válido vazio.

A representação textual da data muda para uma forma canônica que já é aceita
pelo consumidor existente. Datas armazenadas, `created_at`, `updated_at`,
versões e referências não são regravadas. A mudança não inicia, reinicia ou
altera o relógio de retenção aprovado, que depende da perda oficial da última
elegibilidade.

A view do aluno e seu parser não foram modificados nem relaxados. O limite
numérico legado de versão no parser também permanece fora deste recorte;
esta entrega corrige especificamente a representação de `completed_at`.
Favoritos, posição de leitura, exportação dessas preferências e C-133 não são
alterados.

## Testes preparados

`tests/Feature/ProgressExportTimestampFlowTest.php` contém **11 métodos de
teste**, usando as migrações, consultas, rota e middleware reais com SQLite
isolado. Apenas decisões Portal e dados são sintéticos. Cobertura:

- Conclusão pelo endpoint real e exportação UTC com os campos privados exatos.
- Representações sem fuso, offsets curtos e completos, UTC, frações e mudança
  de dia/ano, sem regravar a data original.
- Recusa integral de datas inválidas depois de referências válidas, sem anexo
  ou resposta parcial.
- Mesma pessoa em duas empresas, colega na mesma empresa e contexto forjado
  sem ampliar o escopo; dado malformado de outra pessoa não interfere.
- Exclusão de curso estrangeiro, não compartilhado ou nunca publicado; vazio
  válido permanece distinto de falha.
- Retirada e republicação preservando a referência e o instante originais.
- Fronteira de 5.000/5.001 registros com inserções de fixture em lotes.
- Uma única consulta de metadados, sem consulta de conteúdo ou escrita de
  negócio.
- Revogação após a leitura, rechecagem final de GET após erro de conversão e
  após sucesso, e manutenção do provider operacional `deny-all`.

`scripts/check-pg-progress-history.php` foi ampliado no passo existente,
**antes do seed editorial**, com **seis verificações adicionais previstas**:
envelope e escopo v1; allowlist e datas canônicas; três representações reais
de conexão PostgreSQL; e preservação integral dos registros armazenados.

O probe reutiliza as fixtures e a transação já existentes. Há entradas em
offset `+03`, `+00` e formato UTC `Z`. Para conferir a saída real do PDO, muda
somente `TimeZone` da transação por `set_config(..., true)`, com valores fixos
vinculados: `UTC`, `Etc/GMT-3` e `Asia/Kolkata`. Verifica os sufixos devolvidos
`+00`, `+03` e `+05:30`, enquanto exige que o DTO completo da exportação seja
idêntico. Restaura o fuso anterior antes da comparação dos registros; o
`finally` anterior continua revertendo a transação inteira.

As guardas de CI, repositório, ambiente, banco descartável, configuração
efetiva e colisão de fixtures não mudaram. O probe não imprime SQL, credenciais
ou registros. Não foi criado outro job, serviço ou laboratório.

## Verificação local e integração pendente

**Executado localmente:**

- `node scripts/check-progress-export-timestamps.mjs`: **7 cenários PASS**,
  executando o parser real e inalterado. Cobrem aceitação do UTC esperado,
  rejeição continuada de offsets curtos/compactos, compatibilidade v1, recusa de
  tipos/formato inválidos, allowlist, escopo e limite integral de arquivo.
- `git diff --check`: aprovado.

**Preparado, sem execução local de PHP, PostgreSQL ou navegador:** os 11
métodos Feature e as seis verificações adicionais no probe PG. Eles dependem
da CI do SHA integrado. Nenhum resultado de runtime é presumido.

Arquivos para integração:

- `app/Domain/Learning/UniversityCatalogRepository.php` — somente o mapeamento
  de data da exportação de progresso.
- `tests/Feature/ProgressExportTimestampFlowTest.php`.
- `scripts/check-pg-progress-history.php` — passo existente, mesma invocação.
- `scripts/check-progress-export-timestamps.mjs` — importação na suíte Node
  principal pela integração.
- Este documento.

Não há alteração de rotas, controller, schema, grants, view, workflows,
bindings operacionais ou gates de lançamento.

## Integração preparada

O checker focal foi incluído na suíte Node principal, que passou integralmente com a C133. A revisão independente do mapper, dos testes, do probe e do complemento do percurso real não encontrou bloqueadores.

O runner Laravel/SQLite substitui a consulta direta anterior à exportação por um clique em **Exportar meu progresso** e a leitura do arquivo realmente baixado. Acrescenta **duas verificações preparadas** para cabeçalhos/nome, allowlist/envelope, UTC canônico, igualdade integral com a resposta real e ausência de escritas. A asserção anterior de curso/aula/versão após republicação permanece e passa a comparar também a data com a referência original obtida no histórico. A sintaxe passou; a execução depende da CI do SHA integrado, sem simular respostas de negócio.

## Backend executado em CI

No SHA `3894f10715be4d52a9a3d4d946cc9923617e05f5`, o [run 44227212699](https://github.com/rafhael100/imagine-universidade/actions/runs/44227212699) aprovou **328 testes PHP / 3.721 asserções**, incluindo os 11 métodos C134. O probe PostgreSQL confirmou o DTO canônico idêntico sob UTC, Etc/GMT-3 e Asia/Kolkata e a preservação integral dos registros originais, além do escopo/allowlist. Essas seis verificações foram executadas no banco descartável real.

Cinco jobs foram aprovados e o módulo Chromium sintético completou 702 verificações. A jornada Laravel parou antes do download, por uma preparação C133 de atualização de seleção já corrigida no runner. Portanto, o download real C134 continua pendente da execução seguinte; os resultados acima não presumem sua conclusão.
