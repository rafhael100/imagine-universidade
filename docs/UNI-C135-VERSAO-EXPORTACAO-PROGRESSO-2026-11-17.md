# C135 — Versões válidas na exportação de progresso

Referência: rodada de desenvolvimento de 2026-11-17. Verificação local realizada em 2026-11-18.

Base de trabalho: `8099229f696331625264e2792d0c3b75a937ff3a`. Essa identificação não afirma aprovação desta entrega na CI.

## Incompatibilidade reproduzida

O sanitizador de exportação do aluno, `sanitizedProgressExport`, exigia um inteiro seguro positivo para `course_version` e acrescentava o teto `1000000`. Esse último limite não pertence ao contrato do servidor.

A leitura do código confirmou:

- A migration `database/migrations/2026_11_04_000001_create_educational_core_tables.php` declara `educational_course_versions.version` como `unsignedInteger`, com unicidade por curso. Ela não define um teto de um milhão.
- `UniversityCatalogRepository::exportProgress`, em `app/Domain/Learning/UniversityCatalogRepository.php`, seleciona `v.version` e o devolve como inteiro. Não aplica esse teto.
- O probe `scripts/check-pg-progress-history.php` cria uma versão publicada `1000001`, registra conclusões e consulta a exportação existente, além do histórico paginado. O teste `test_dates_are_utc_and_safe_versions_are_not_limited_by_legacy_export_ui_caps`, em `tests/Feature/ProgressHistoryFlowTest.php`, também usa essa versão no histórico.
- Os validadores de referências do histórico usam inteiros positivos representáveis com precisão em JavaScript. O consumidor da exportação é o handler explícito de `#export-progress`, que sanitiza antes de gerar o JSON do arquivo.

Antes da alteração, uma execução Node VM extraiu a função real da view e passou dois envelopes produzidos por `JSON.parse`, iguais em todos os demais campos:

| `course_version` | Resultado anterior | Resultado após C135 |
|---|---|---|
| `1000000` | Arquivo aceito | Arquivo aceito |
| `1000001` | `null`; arquivo inteiro rejeitado | Arquivo aceito, versão preservada |

Uma conclusão legítima de versão `1000001` impedia, portanto, a exportação completa. A rejeição não dizia respeito à identidade ou à disponibilidade daquela referência; vinha exclusivamente do teto numérico local.

## Alteração restrita

Foi removida somente a condição `item.course_version > 1000000` em `resources/views/university/student.blade.php`.

Continuam obrigatórios `Number.isSafeInteger(item.course_version)` e `item.course_version >= 1`. O intervalo aceito pelo parser é, assim, de `1` a `Number.MAX_SAFE_INTEGER` (`9007199254740991`), inclusive. Strings numéricas, booleanos, valores ausentes, nulos, fracionários, não finitos ou fora da faixa segura continuam rejeitados.

Essa é uma regra de representação do consumidor JavaScript. Ela não modifica o tipo SQL nem afirma que todos os números dessa faixa possam ser armazenados em cada banco suportado. A correção permite que o navegador aceite versões válidas do servidor acima do teto artificial.

A validação trabalha sobre números já interpretados por `JSON.parse`, assim como `response.json()`. Uma notação decimal ou exponencial que resulte no mesmo inteiro seguro, como `1000001.0` ou `1.000001e6`, representa a mesma versão. A entrega não introduz um parser da notação numérica original nem muda a serialização de inteiros do backend.

## Contratos preservados

O formato continua `schema_version: 1`, `scope: "current_authenticated_student"` e `completions`. Cada referência exportada contém apenas `course_slug`, `course_version`, `lesson_slug` e `completed_at`. Campos extras de identidade, empresa, IDs de conteúdo, título ou corpo não entram no arquivo.

Permanecem os slugs estritos de até 120 caracteres, a expressão de timestamp e seu limite de 40 caracteres, o teto de 5000 referências, o histórico vazio legítimo e a rejeição integral de um payload inválido. Datas aceitas são copiadas literalmente; não há conversão nem ampliação de formatos nesta entrega. A questão separada de normalização de timestamps do servidor não é corrigida por C135.

O escopo por organização e pessoa continua na consulta do servidor: `p.educational_organization_id` e `p.subject_key`, com conteúdo da organização editorial compartilhado e versões publicadas ou arquivadas. O controlador conserva sua revalidação de autoridade. O navegador não recebe novos parâmetros de empresa ou pessoa e não passa a decidir esse isolamento.

O endpoint permanece `GET /universidade/private/progress/export`, acionado por clique. O nome do arquivo continua `imagine-universidade-progresso.json`. Não foram alterados o handler de download, a proteção contra cliques concorrentes, a negação de download após revogação, o descarte da URL temporária, o tratamento de falha ou a recuperação manual. Não há novo endpoint, escrita, armazenamento local, schema, grant ou regra de retenção.

## Verificação executada

`node scripts/check-progress-export-version.mjs` passou **37 cenários**, executando o sanitizador e o handler reais extraídos da view. HTTP, DOM mínimo e primitivas de download são sintéticos; o conteúdo do Blob resultante é lido e comparado ao envelope esperado.

A cobertura verifica:

- O limite anterior e sua ultrapassagem legítima, fronteiras numéricas representáveis e o máximo inteiro seguro, com preservação exata da versão.
- Valores JSON de tipos diferentes, ausência, zero, negativos, frações, números acima da faixa segura e overflow numérico; não há coerção de strings.
- Allowlist, schema, escopo, slugs, timestamps literais, histórico vazio, 5000/5001 referências e rejeição integral quando uma linha é inválida.
- O clique real com versão `1000001`, arquivo sanitizado e nome/MIME existentes, remoção do link e revogação da URL temporária.
- Resposta inválida sem download, recuperação por novo clique, resposta após negação de acesso e clique repetido durante a requisição.

Também passaram `node scripts/check-ui-contract.mjs` completo e `git diff --check`. Nenhum checker legado precisou mudar; suas asserções existentes foram preservadas.

Não foram executados PHP, PostgreSQL, aplicação, servidor ou Chromium localmente. Não foi criado módulo Chromium adicional: a alteração de produção é um único predicado, sem mudança de DOM ou de fluxo, e o checker focal exercita o handler real até o JSON produzido. A execução integrada e a CI ficam com a integração do projeto; esta entrega não presume seus resultados.

## Integração

São três arquivos: a view, `scripts/check-progress-export-version.mjs` e este documento. O novo checker pode ser importado pelo checker principal como `import "./check-progress-export-version.mjs";`, sob a responsabilidade da integração. Não há nova dependência, adaptação de mock legado ou alteração de runner necessária para carregar o teste.

O worktree desta entrega não contém mudanças de backend, workflow ou runner. Não foram feitos stage, commit ou push.

Na integração, o checker de 37 cenários foi importado pela suíte principal, preservando a cobertura C134 de timestamps. A revisão independente de código, testes e documentação foi concluída sem bloqueadores. Não foi acrescentado módulo Chromium: o predicado é exercitado no handler real em Node, enquanto o percurso Laravel existente verifica o download pelo botão e o probe PostgreSQL já possui referência legítima de versão 1000001. Esses ensaios complementares não são descritos como uma jornada única PostgreSQL → navegador.

## CI integrada executada

O [run 44228136328](https://github.com/rafhael100/imagine-universidade/actions/runs/44228136328), SHA `2bec87cbb1ce998a518311575c18457125a7ae89`, aprovou os **seis jobs**. O checker principal executou os **37 cenários C135**; a rodada completou **328 testes PHP / 3.721 asserções**, probes PostgreSQL, **702 verificações Chromium sintéticas** e **221 pelo Laravel/SQLite real**, incluindo o download pelo botão e a preservação da referência/data depois da republicação. Não houve execução local desses runtimes nem alteração de gates de lançamento.
