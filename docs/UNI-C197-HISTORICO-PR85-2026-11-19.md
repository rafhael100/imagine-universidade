# Histórico acumulado da PR #85 — snapshot anterior à síntese C197

Capturado em 19/11/2026, branch de revisão SHA c39e78664cc3775511b6d43c80ccf7d98dc9f2bc.
Os estados de CI abaixo são HISTÓRICOS, válidos nas SHAs citadas, e não indicam autorização de merge, deploy ou acesso real.

---

## C193–C196 — Restauração e fronteira de transporte PG18 (19/11/2026)

**HEAD de código `c39e78664cc3775511b6d43c80ccf7d98dc9f2bc` — DRAFT / HOLD_NO_GO / NO-MERGE / NO-DEPLOY.**

- **C193:** o ensaio descartável de PG18 confirma além de cursos/aulas os fingerprints de todas as tabelas, colunas, constraints/FKs, índices, RLS, triggers e sequências; restaura com `--single-transaction` e `--exit-on-error` e detecta adulteração de texto apenas no clone. [Código e documento C193](https://github.com/rafhael100/imagine-universidade/blob/c39e78664cc3775511b6d43c80ccf7d98dc9f2bc/docs/UNI-C193-RESTORE-INTEGRIDADE-RELACIONAL-2026-11-19.md).
- **C194:** controle negativo alterna RLS e remove índice de expiração de nonce **somente na cópia restaurada**; as duas divergências são detectadas e o original permanece intacto. [CI 6/6 SUCCESS #44523193159](https://github.com/rafhael100/imagine-universidade/actions/runs/44523193159).
- **C195:** [roteiro de homologação real privada](https://github.com/rafhael100/imagine-universidade/blob/c39e78664cc3775511b6d43c80ccf7d98dc9f2bc/docs/UNI-C195-ROTEIRO-HOMOLOGACAO-BACKUP-RESTORE-2026-11-19.md) define evidências necessárias de recuperação, segregação, segurança e RPO/RTO, **sem tocar na VPS ou R2**.
- **C196:** script de backup sintético recusa `PGHOST`, `PGHOSTADDR`, `PGSERVICE` e outros overrides libpq antes de consultar; fixa Unix socket local e verifica `uni_ci`. Docker confirmou tentativa de redirecionamento bloqueada e restauração normal aprovada. [CI integral #44524521465](https://github.com/rafhael100/imagine-universidade/actions/runs/44524521465) — aguardar resultado definitivo do browser-lab; demais cinco jobs aprovados.

**O que NÃO foi comprovado:** backup na VPS, R2 operacional, backup diário, retenção, RPO/RTO, restauração em máquina independente, SSO real ou serviço Imagine ativo. O gate `real_backup_restoration_and_rollback` e os demais 12 permanecem `NOT_VERIFIED`. Portal #886 bloqueia o acesso real. Nenhum merge, deploy, DNS, credencial de cliente ou despesa nova.

---

## C189 — 19/11/2026 | DRAFT / HOLD_NO_GO

**HEAD:** [`d1efaaffac0a`](https://github.com/rafhael100/imagine-universidade/commit/d1efaaffac0a5b95a288d6f1e915c67a0834dc2f). [CI integral #44512827806](https://github.com/rafhael100/imagine-universidade/actions/runs/44512827806) — **EM EXECUÇÃO** (`[uni-full-qa]`, incluindo Chromium/Docker/staging; não presumir aprovação).

- **C189:** teste de regressão em Chromium prova que reimportar o CSV idêntico, após exportação, é um no-op que preserva as observações e a confirmação pendente de arquivo salvo. [Documento](https://github.com/rafhael100/imagine-universidade/blob/d1efaaffac0a5b95a288d6f1e915c67a0834dc2f/docs/UNI-C189-REIMPORTACAO-IDENTICA-MANTEM-CONFIRMACAO-2026-11-19.md).
- **C187–C188:** [CI #44512377471](https://github.com/rafhael100/imagine-universidade/actions/runs/44512377471) **3 jobs SUCCESS / 3 SKIPPED intencionalmente**; esta CI da C189 verifica **também** os cenários Chromium e os laboratórios completos.
- **C185–C186:** [CI #44511460136](https://github.com/rafhael100/imagine-universidade/actions/runs/44511460136) **6/6 SUCCESS**, na SHA exata `9d8b1545`.

Sem merge da `main`, deploy, VPS, DNS, cobrança, SSO, grants ou clientes reais. Todos os 13 gates permanecem `NOT_VERIFIED` / `HOLD_NO_GO`. Bloqueio da fonte oficial: [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886).

---

## C187–C188 — 19/11/2026 | DRAFT / HOLD_NO_GO

**HEAD exata:** [`9c180a4fc74a`](https://github.com/rafhael100/imagine-universidade/commit/9c180a4fc74ac846593a0e5c3e2d98d5c474c863). [Actions #44512377471](https://github.com/rafhael100/imagine-universidade/actions/runs/44512377471) — **EM EXECUÇÃO: sem conclusão presumida**.

- **C187:** preflight do gerador de pacote de revisão editorial recusa symlink em **qualquer diretório ancestral**, antes de criar a pasta de saída; regressão assegura que o destino real não receba arquivos via atalho. [Documento](https://github.com/rafhael100/imagine-universidade/blob/9c180a4fc74ac846593a0e5c3e2d98d5c474c863/docs/UNI-C187-PREFLIGHT-ANCESTRAIS-OUTPUT-EDITORIAL-2026-11-19.md).
- **C188:** `resumo-revisao.txt` prefixa cada linha de observação multiline não autenticada, impedindo que linhas `CURSO:` ou `Pendentes: 0` pareçam cabeçalhos/contagens oficiais. CSV íntegro preservado; regressão Chromium real. [Documento](https://github.com/rafhael100/imagine-universidade/blob/9c180a4fc74ac846593a0e5c3e2d98d5c474c863/docs/UNI-C188-RELATORIO-NOTAS-MULTILINHA-2026-11-19.md).
- **C185/C186:** [CI #44511460136 — 6/6 SUCCESS](https://github.com/rafhael100/imagine-universidade/actions/runs/44511460136) na SHA exata `9d8b1545`. Ambos os commits de C187/C188 chegaram à branch de revisão por **fast-forward verificado**, sem merge de PR/main. CI da HEAD atual segue necessária.

**13 gates `NOT_VERIFIED` e `HOLD_NO_GO`**, Portal [#886](https://github.com/rafhael100/imagine-portal/issues/886) sem fonte oficial autenticada. Nenhum merge de PR/main, deploy, VPS, DNS, custos, clientes reais ou grants.

---

## C185–C186 — 19/11/2026 | DRAFT / HOLD_NO_GO

**HEAD:** [`9d8b1545ba61`](https://github.com/rafhael100/imagine-universidade/commit/9d8b1545ba61b7e8335a4c0ddf417afd4cdf45e2). [CI da SHA](https://github.com/rafhael100/imagine-universidade/actions/runs/44511460136) — **EM EXECUÇÃO**, sem presumir sucesso.

- **C185:** durante importação CSV, os quatro campos editoriais agora ficam bloqueados. O handler descarta inclusive evento `input` forçado que tentaria alterar o estado `Map` durante `File.arrayBuffer()`. Chromium retarda a leitura, tenta a alteração e verifica o desbloqueio ao concluir. [Documento](https://github.com/rafhael100/imagine-universidade/blob/9d8b1545ba61b7e8335a4c0ddf417afd4cdf45e2/docs/UNI-C185-LOCK-EDICAO-DURANTE-IMPORTACAO-2026-11-19.md).
- **C186:** exportação CSV, resumo e confirmação do salvamento ficam indisponíveis durante a leitura. Uma falha de importação restaura o reconhecimento pendente somente quando o estado das 35 aulas está intacto; teste Chromium confirma preservação das observações e da confirmação após CSV com hash adulterado. [Documento](https://github.com/rafhael100/imagine-universidade/blob/9d8b1545ba61b7e8335a4c0ddf417afd4cdf45e2/docs/UNI-C186-EXPORTACAO-PAUSADA-DURANTE-IMPORTACAO-2026-11-19.md).

**13 gates `NOT_VERIFIED` / `HOLD_NO_GO`.** Portal [#886](https://github.com/rafhael100/imagine-portal/issues/886) continua sem fonte oficial homologada; sem merge, deploy, VPS, DNS, despesas, SSO, dados reais ou acesso de clientes.

---

## C181–C184 — 19/11/2026 | DRAFT / HOLD_NO_GO

**HEAD exata:** [`7b329ab2e31a`](https://github.com/rafhael100/imagine-universidade/commit/7b329ab2e31a58087a8c1cb679dc74c219e4b94f). **CI para esta SHA:** [Actions #44504868388](https://github.com/rafhael100/imagine-universidade/actions/runs/44504868388) — **iniciada, ainda não confirmada como completa**. **CI anterior da C181/C182:** [Actions #44502423282](https://github.com/rafhael100/imagine-universidade/actions/runs/44502423282) **6/6 SUCCESS na SHA `5aad81a`**; não confundir com a SHA atual.

- **C181:** o gerador recusa diretório já preenchido antes de sobrescrever `revisao.csv`; teste simula edições humanas e confirma preservação byte a byte. [Documento](https://github.com/rafhael100/imagine-universidade/blob/7b329ab2e31a58087a8c1cb679dc74c219e4b94f/docs/UNI-C181-EXPORTACAO-REVISOR-SEM-SOBRESCRITA-2026-11-19.md).
- **C182:** renderizador recusa IDs duplicados e manifesto com quantidade incorreta de hashes, impedindo perder uma das 35 aulas no `Map`. [Documento](https://github.com/rafhael100/imagine-universidade/blob/7b329ab2e31a58087a8c1cb679dc74c219e4b94f/docs/UNI-C182-UNICIDADE-IDENTIDADES-ACERVO-2026-11-19.md).
- **C183:** navegador e CLI passam a rejeitar controles ASCII BEL/DEL no nome do revisor; 2 testes negativos Node e regressões Chromium. [Documento](https://github.com/rafhael100/imagine-universidade/blob/7b329ab2e31a58087a8c1cb679dc74c219e4b94f/docs/UNI-C183-PARIDADE-REVISOR-CONTROLES-2026-11-19.md).
- **C184:** após iniciar o download, a revisão continua marcada como não salva até o revisor confirmar no próprio dispositivo que `revisao.csv` existe; qualquer edição invalida a confirmação. Inclui UI offline, teste de aviso ao fechar e regressão Chromium. [Documento](https://github.com/rafhael100/imagine-universidade/blob/7b329ab2e31a58087a8c1cb679dc74c219e4b94f/docs/UNI-C184-CONFIRMACAO-SALVAMENTO-CSV-2026-11-19.md).

A [PR empilhada #87](https://github.com/rafhael100/imagine-universidade/pull/87) foi absorvida por avanço **fast-forward somente da branch de revisão**, sem merge de PR na `main` ou produção. `ops/release-gates.json` permanece **13 `NOT_VERIFIED`, `HOLD_NO_GO`**. Sem deploy, VPS, DNS, despesas, SSO, credenciais, dados reais ou grants. Fonte oficial de serviços elegíveis e revogação no Portal [#886](https://github.com/rafhael100/imagine-portal/issues/886) continua sem homologação; as 35 aulas exigem aceite humano real.

---

## C179–C180 — 19/11/2026 | DRAFT / HOLD_NO_GO

**HEAD:** [`3add0c8123a7`](https://github.com/rafhael100/imagine-universidade/commit/3add0c8123a7edc0f12a29319735a229ea29583b). **CI desta SHA:** [Actions #44499137210](https://github.com/rafhael100/imagine-universidade/actions/runs/44499137210) — pendente no momento deste registro; não inferir sucesso de SHAs anteriores. [CI C177–C178 6/6 SUCCESS](https://github.com/rafhael100/imagine-universidade/actions/runs/44498234208).

- **C179:** trava reentrância na importação CSV; captura modo merge/replace antes de I/O, bloqueia os controles enquanto processa e restaura no finally. Chromium simula leitura retardada, segundo evento, troca forçada de modo e preservação de revisão. [Documento](https://github.com/rafhael100/imagine-universidade/blob/3add0c8123a7edc0f12a29319735a229ea29583b/docs/UNI-C179-IMPORTACAO-CSV-SEM-CORRIDA-2026-11-19.md).
- **C180:** valida tamanho de CSV em bytes (máximo 1.000.000) e tipo arquivo regular no CLI **antes da leitura**, com fechamento do descritor mesmo sob erro. Node e Chromium têm cenários adversariais de 1.000.001 bytes. [Documento](https://github.com/rafhael100/imagine-universidade/blob/3add0c8123a7edc0f12a29319735a229ea29583b/docs/UNI-C180-LIMITE-BYTES-CSV-2026-11-19.md).
- **13 gates:** todos `NOT_VERIFIED`, `release_decision=HOLD_NO_GO`. Portal [#886](https://github.com/rafhael100/imagine-portal/issues/886) segue sem autoridade comercial oficial, revogação e SSO homologados. Sem merge/deploy ou permissões reais.

---

## C177–C178 — 19/11/2026 | DRAFT / HOLD_NO_GO

**HEAD atual:** [`90c8e53c3287`](https://github.com/rafhael100/imagine-universidade/commit/90c8e53c32876e351b88135d6a54949260c5e719). **CI desta HEAD:** [Actions #44498234208](https://github.com/rafhael100/imagine-universidade/actions/runs/44498234208) — PENDENTE na criação; conferir conclusão antes de afirmar sucesso.

- **C177:** contador `aria-live` de busca e rótulos dos 10 cursos só sofrem mutação se a contagem exibida mudar. Testes com MutationObserver cobrem silêncio em digitações repetidas e anúncio ao efetivamente mudar pendências. [Documento](https://github.com/rafhael100/imagine-universidade/blob/90c8e53c32876e351b88135d6a54949260c5e719/docs/UNI-C177-ANUNCIOS-CONTAGENS-EDITORIAIS-2026-11-19.md).
- **C178:** importação CSV do revisor e CLI agora exigem UTF-8 íntegro com `TextDecoder(fatal:true)`; bytes inválidos deixam de ser silenciosamente convertidos para U+FFFD. Testes negativos em Chromium e CLI preservam as 35 revisões/merge atômico. [Documento](https://github.com/rafhael100/imagine-universidade/blob/90c8e53c32876e351b88135d6a54949260c5e719/docs/UNI-C178-CSV-UTF8-ESTRITO-2026-11-19.md).
- **Sem merge, deploy, VPS, DNS, despesas, cliente real, SSO, grants ou modificação de main.** Os **13 gates** continuam `NOT_VERIFIED` e `HOLD_NO_GO`; Portal [#886](https://github.com/rafhael100/imagine-portal/issues/886) segue bloqueador.

---

## Continuidade C174–C176 — 19/11/2026 | DRAFT / HOLD_NO_GO

**HEAD:** [`d965fe29be82`](https://github.com/rafhael100/imagine-universidade/commit/d965fe29be824cddffd7334d3804aaa549eb6cd2). **CI desta HEAD:** [Actions #44495684027](https://github.com/rafhael100/imagine-universidade/actions/runs/44495684027) — in_progress/PENDENTE. **Não usar CI de SHAs anteriores como validação da HEAD.**

- **C174 — substituição consciente de CSV:** mesmo sem alterações locais exige confirmação quando há diferenças, informa quantidade de aulas que mudarão; cancelar preserva 35 linhas e importar planilha idêntica é operação sem efeito. [Documento](https://github.com/rafhael100/imagine-universidade/blob/d965fe29be824cddffd7334d3804aaa549eb6cd2/docs/UNI-C174-CONFIRMACAO-SUBSTITUICAO-CSV-2026-11-19.md). [CI aplicável #44493104816](https://github.com/rafhael100/imagine-universidade/actions/runs/44493104816) **3 jobs SUCCESS**, 3 jobs laboratoriais SKIPPED intencionalmente nessa SHA.
- **C175 — defesa contra Unicode invisível:** recusa `U+200B..U+200F`, `U+2060..U+2069`, marca direcional, `U+2028..` e BOM interno no revisor/observação. Validador canônico ampliado **31→37 casos**; importação e exportação exercitadas em navegador real. [Documento](https://github.com/rafhael100/imagine-universidade/blob/d965fe29be824cddffd7334d3804aaa549eb6cd2/docs/UNI-C175-CONTROLES-UNICODE-ZERO-WIDTH-2026-11-19.md). **[CI #44493530309: 6/6 SUCCESS](https://github.com/rafhael100/imagine-universidade/actions/runs/44493530309)**, 412 PHPUnit/5.616 asserts, 965 Chromium sintético, 267 navegador Laravel/SQLite, 97 paridade Portal e Docker/staging aprovados.
- **C176 — acessibilidade de anúncios:** campos `aria-live` passam a não reescrever o mesmo texto a cada digitação sem mudança. Nova regressão com `MutationObserver` verifica silêncio em notas repetidas e atualização real de contagem ao mudar status. [Documento](https://github.com/rafhael100/imagine-universidade/blob/d965fe29be824cddffd7334d3804aaa549eb6cd2/docs/UNI-C176-ACESSIBILIDADE-ARIA-LIVE-2026-11-19.md). **Aguardando CI da HEAD exata.**

**Todos os 13 gates seguem `NOT_VERIFIED` e `release_decision=HOLD_NO_GO`.** Integração comercial Portal [#886](https://github.com/rafhael100/imagine-portal/issues/886) sem autoridade oficial de contratos, revogação, sessão business/MFA ou editor staff. A aprovação humana das 35 aulas não existe. Sem merge, deploy, alterações na VPS, autorização real, despesas, DNS ou clientes.

---

## C173 — Parser CSV estrito e mesclagem atômica · 19/11/2026

**HEAD atual:** [`c835e4801ca4`](https://github.com/rafhael100/imagine-universidade/commit/c835e4801ca425a6e490c702909869c95868e5e3) — [CI #44486523705](https://github.com/rafhael100/imagine-universidade/actions/runs/44486523705) **em execução**, não confundir com os checks aprovados da C172.

- Corrigida aceitação ambígua de conteúdo adicionado após aspas de fechamento, tanto no navegador offline quanto no CLI. Entradas inválidas como `"PENDING_HUMAN_"REVIEW` não poderão mais ser silenciosamente tratadas como válidas.
- Regressões para status e slug do CSV, além de importação no Chromium que preserva as duas revisões locais em caso de rejeição. Tratamento de aspas escapadas, BOM, Excel com ponto e vírgula e notas multilinha preservado.
- [Documentação e critérios de aceite](https://github.com/rafhael100/imagine-universidade/blob/c835e4801ca425a6e490c702909869c95868e5e3/docs/UNI-C173-CSV-CANONICO-QUOTES-2026-11-19.md).

**DRAFT / HOLD_NO_GO / 13 gates sem verificação / Portal #886 pendente / nenhuma alteração de produção.**

---

## C172 — Defesa editorial contra controles Unicode invisíveis · 19/11/2026

**HEAD nova:** [`5998ac7f61f7`](https://github.com/rafhael100/imagine-universidade/commit/5998ac7f61f70ec5f04fa26c8673f1dffa1800b8) — **[CI #44484975016 — 6/6 SUCCESS](https://github.com/rafhael100/imagine-universidade/actions/runs/44484975016)**; 412 PHPUnit, 29 cenários CSV, 959 Chromium e 267 navegador Laravel/SQLite.

- Alinhamento navegador/CLI na recusa de caracteres de direção invisíveis nos nomes dos revisores e observações (`U+200E/U+200F`, `U+2028..U+202E`, `U+2066..U+2069`), evitando confusão visual no relatório humano.
- +6 cenários de validação canônica e testes Chromium reais de importação atômica e bloqueio de exportação adulterada; textos correntes com acentos preservados.
- [Documento e critérios de teste](https://github.com/rafhael100/imagine-universidade/blob/5998ac7f61f70ec5f04fa26c8673f1dffa1800b8/docs/UNI-C172-SEGURANCA-REVISAO-UNICODE-2026-11-19.md).

**DRAFT / HOLD_NO_GO / sem autoridade editorial autenticada, concessão de acesso, merge ou deploy.** Portal #886 e os 13 gates continuam pendentes.

---

## Conclusão da rodada C160–C171 — 19/11/2026

**HEAD verificada:** `f52fd31b5296885c195bb019da34116198e6d95a` — **[Actions #44480230135: 6/6 SUCCESS](https://github.com/rafhael100/imagine-universidade/actions/runs/44480230135)** na mesma SHA.

**Resultados confirmados:** PHPUnit 39 Unit/169 asserções + 373 Feature/5.447 asserções = **412 testes, 5.616 asserções**. **956 checks Chromium sintético** (inclui revisor editorial offline, CSV, revisão paralela, mesclagem atômica, acessibilidade/teclado e variações de viewport), **267 checks do navegador contra Laravel/SQLite real**; **97 checks de paridade Portal V4**; Docker PostgreSQL, imagens staging e pacote de revisão editorial aprovados.

**Artefatos de revisão da mesma execução:**
- [Pacote editorial completo — revisão humana PENDENTE](https://github.com/rafhael100/imagine-universidade/actions/runs/44480230135/artifacts/14507438810), incluindo `revisao-navegavel.html`, CSV editável e 35 hashes
- [Relatório de 13 gates e próxima evidência de cada um](https://github.com/rafhael100/imagine-universidade/actions/runs/44480230135/artifacts/14508261172)
- [Capturas e acessibilidade sintética](https://github.com/rafhael100/imagine-universidade/actions/runs/44480230135/artifacts/14508476314)
- [Navegação Laravel/SQLite sintética](https://github.com/rafhael100/imagine-universidade/actions/runs/44480230135/artifacts/14507314851)

**Correções de CI reais desta rodada:** C168 corrigiu disputa por um diálogo; C170/C171 removeram listener residual, eliminaram fechamento antecipado da aba do teste e preservaram notas locais contra mesclagem. Nenhum teste foi desabilitado.

**Integração de produto continua BLOQUEADA:** [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) necessita fonte oficial autenticada de serviços elegíveis ATIVOS, revisão/revogação independente, política de SKUs, SSO empresarial/MFA e equipe editorial autorizada. Os demais 13 gates em `ops/release-gates.json` seguem `NOT_VERIFIED`. A diferença histórica da `main` foi auditada na C169; nenhum merge/rebase/deploy foi feito.

**DRAFT / HOLD_NO_GO / NO-MERGE / NO-DEPLOY / sem alteração na VPS ou clientes reais.**

---

## Continuação C160–C170 — 19/11/2026

**HEAD:** `56df17ecabec2bd282b6d74fa7f1ef977a28df39` — [GitHub Actions #44479876607](https://github.com/rafhael100/imagine-universidade/actions/runs/44479876607), validação integral em execução. **Não usar checks de SHAs anteriores como prova da HEAD atual.**

- **C160:** contagem de aulas pendentes por curso; atalhos para próxima pendente e próxima com ajustes
- **C161:** cenários Portal V4 fixado para cancelamento do último serviço, suspensão, trial, revisão, reativação e revogação; continuam sempre não autorizadores
- **C162:** CSV humano recusado se houver fórmulas, controle invisível, reviewer inválido ou observações acima do limite; preserva observações multiline
- **C163:** busca offline por curso/aula e filtros por situação, sem requisições HTTP
- **C164:** auditoria axe WCAG 2.1 A/AA, teclado e viewports 320/390/768/1440 do HTML editorial no Chromium real
- **C165:** download de resumo de pendências para a coordenação; não substitui CSV editável
- **C166:** próximo tipo de evidência exigido para cada um dos 13 gates, com status HOLD_NO_GO preservado
- **C167–C168:** importação em modo mesclagem conservadora, sem destruir notas locais; substituição total exige opção explícita e confirmação
- **C169:** 6 documentos de governança SHA idêntico à main auditada; apenas README entre os sete arquivos exclusivos da main está divergente; sem merge/rebase
- **C170:** corrigido erro real da CI #44479147373 (dois handlers de diálogo), adicionados vetos à perda de revisor local e observação pendente de outra pessoa

**QA:** C160/C161/C162/C163/C165/C166 tinham validação aplicável aprovada; a C168 teve 5 jobs verdes e falhou no browser por conflito de listeners, corrigido na C170. Exigir 6/6 jobs verdes na SHA acima antes de declarar fechamento técnico.

**Release:** nenhum novo acesso, login, fonte comercial real ou autorização Portal. Todos os 13 gates continuam NOT_VERIFIED. Portal [#886](https://github.com/rafhael100/imagine-portal/issues/886), aceite editorial, AppSec/DBA/LGPD, staging privado, backup real e autorização explícita de produção pendentes. **DRAFT / HOLD_NO_GO / NO-MERGE / NO-DEPLOY.**

---

## Continuação C157–C159 — revisor editorial offline — 18/11/2026

**HEAD** `8136792074a5a21f80897561896c2e784663c6a8` — **DRAFT / HOLD_NO_GO / NO-MERGE / NO-DEPLOY**.

- **C157:** novo `revisao-navegavel.html` no ZIP editorial. Ler as 35 aulas (10 cursos), navegar, registrar observações/revisores/evidências de issue e exportar `revisao.csv`. Conteúdo em memória, script e CSS com CSP hash, sem rede, backend ou armazenamento automático. A palavra "aprovado" é uma **alegação não autenticada**. [Documento C157](https://github.com/rafhael100/imagine-universidade/blob/8136792074a5a21f80897561896c2e784663c6a8/docs/UNI-C157-REVISAO-EDITORIAL-NAVEGAVEL-2026-11-18.md).
- **C158:** ensaio real de Chromium offline com download do CSV e validação pelo parser canônico, confirmação de 34 pendentes/1 ajuste, rejeição de fórmula e zero HTTP. [Documento C158](https://github.com/rafhael100/imagine-universidade/blob/8136792074a5a21f80897561896c2e784663c6a8/docs/UNI-C158-QA-CHROMIUM-REVISAO-EDITORIAL-2026-11-18.md).
- **C159:** reimportação de CSV com validação **integral e atômica** dos 35 pares curso/aula, hash atualizado, status/revisor/evidência e confirmação antes de substituir rascunho local. Um CSV adulterado não altera o estado. [Documento C159](https://github.com/rafhael100/imagine-universidade/blob/8136792074a5a21f80897561896c2e784663c6a8/docs/UNI-C159-REIMPORTACAO-REVISAO-EDITORIAL-2026-11-18.md).
- [GitHub Actions em execução para esta HEAD](https://github.com/rafhael100/imagine-universidade/actions/runs/44398559556). Não inferir conclusão integral dos jobs ainda. Não há integração Portal oficial, aprovação editorial, merge ou deploy.

**Bloqueador de negócio**: [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886), além dos outros 12 gates; `ops/release-gates.json` segue `HOLD_NO_GO`.

---

## Continuação C154–C156 — 18/11/2026 | HEAD `c7d76af1553b259eece061594987153ad2a9ce67`

**Decisão: DRAFT / HOLD_NO_GO / NO-MERGE / NO-DEPLOY.** Testes sintéticos não comprovam serviço ativo oficial ou autorização Portal.

- **C154 — CI Chromium**: deadline global foi ampliado de 180 s para 300 s com checkpoint a cada 100 asserts, preservando os mesmos cenários. [Run #44350248396 — 6/6 jobs SUCCESS](https://github.com/rafhael100/imagine-universidade/actions/runs/44350248396) na SHA `f10564a`; **904 checks Chromium e 267 checks contra Laravel/SQLite**. O timeout de C137 deixou de encerrar o navegador.
- **C155 — paridade Portal V4**: teste adversarial da interface real `8f469b7` com quatro fontes injetadas sinteticamente (serviços, revogação, SKUs, cobertura) e negativos para instalação, webhook, carência, tenant/revisões e ausência de cobertura. **75 checks, sem grant**; [run #44352238564 SUCCESS (validation + Portal parity + editorial)](https://github.com/rafhael100/imagine-universidade/actions/runs/44352238564).
- **C156 — pendências P0**: geração read-only de `readiness.json`, `gates.csv` e `PENDENCIAS-LANCAMENTO.md`, com 13 gates e áreas **sugeridas**, nunca aprovação automática. [Run #44353249279 SUCCESS nos 3 jobs aplicáveis](https://github.com/rafhael100/imagine-universidade/actions/runs/44353249279); [artefato PENDENCIAS-LANCAMENTO-P0](https://github.com/rafhael100/imagine-universidade/actions/runs/44353249279/artifacts/14449417061). Docker, navegador e staging **SKIPPED intencionalmente nesta HEAD**; a última rodada completa é a C154.

**Pendência impeditiva central:** [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) — fonte oficial de contratos ativos/cobertura vigente, revogação independente e SSO/identidade empresarial ainda não homologados. Aceite editorial, AppSec/DBA/LGPD, ensaio privado VPS, backup/rollback e autorização de publicação continuam bloqueados.

---

## Continuação C151–C153 — proteção contra troca de sessão — 18/11/2026

**HEAD `92aa98e8a9eb4162557ca4aee5009c9b80c3ee00`**. QA integral [Actions: consultar os runs](https://github.com/rafhael100/imagine-universidade/actions/workflows/uni-branch-qa-isolated.yml). **Aguardar resultado desta HEAD; os checks de SHAs anteriores não validam o novo commit.**

- **C151 (middleware GET/HEAD)**: a sessão do servidor precisa manter empresa e credencial da primeira autorização, tanto antes quanto depois da segunda consulta ao Portal. Três novos cenários HTTP passaram na CI de `788d24e`.
- **C152 (gravações e leituras do controller)**: `freshGrant` confere novamente a sessão depois de consultar o Portal, antes de permitir a transação. Dois novos cenários de conclusão e favorito passaram no job PHP/PostgreSQL de `a9c6cae`.
- **C153 (vínculo desde o início da requisição)**: o middleware guarda somente um digest efêmero da credencial inicial e `freshGrant` exige o mesmo valor antes de chamar a autoridade. Regressão nova: trocar por outra credencial igualmente válida para a mesma pessoa/empresa antes da segunda conferência não pode concluir a aula. **CI desta HEAD em execução.**

Documentação: [C151](https://github.com/rafhael100/imagine-universidade/blob/92aa98e8a9eb4162557ca4aee5009c9b80c3ee00/docs/UNI-C151-SESSION-CONTEXT-IMUTAVEL-APOS-LEITURA-2026-11-18.md), [C152](https://github.com/rafhael100/imagine-universidade/blob/92aa98e8a9eb4162557ca4aee5009c9b80c3ee00/docs/UNI-C152-SESSION-CONTEXT-IMUTAVEL-EM-ESCRITAS-2026-11-18.md), [C153](https://github.com/rafhael100/imagine-universidade/blob/92aa98e8a9eb4162557ca4aee5009c9b80c3ee00/docs/UNI-C153-VINCULO-CREDENCIAL-ORIGINAL-EM-ESCRITAS-2026-11-18.md).

Os 13 bloqueios continuam em `HOLD_NO_GO`. Sem login real, integração de serviços ativos, merge, deploy, DNS ou escrita na VPS.

---

## Continuação C-147–C-150 — 18/11/2026

A continuação acrescenta uma prática opcional durante a aula e corrige duas situações em que uma falha de consulta podia apagar os campos visíveis do editor. Também fecha a janela de validade do candidato Portal durante uma espera SQL.

**Código desta entrega:** `5d95620f95ebf29ade2e2b4ab9dbf7dd7c0bab5f` — [Actions #44297441916](https://github.com/rafhael100/imagine-universidade/actions/runs/44297441916). Os números históricos abaixo pertencem aos respectivos SHAs.

- **C147 — Reflexão opcional:** painel recolhido na aula, até 2.000 caracteres Unicode, revisão com trechos literais e fonte/versão. Texto temporário, sem envio, armazenamento, nota ou condição para concluir. Mantém a reflexão na mesma aula e limpa em troca, indisponibilidade ou revogação.
- **C148 — Validade após SQL:** a reserva única recusa candidato que expirou durante a espera e conserva o nonce consumido. Mantém o relógio do chamador e não concede acesso. SQLite e PostgreSQL exercitam a classe real; o laboratório acompanha e reverte a mesma transação pelo Laravel.
- **C149 — Recuperação de resultado incerto:** falha no catálogo ou nas aulas durante consulta de uma escrita incerta conserva os onze campos, seleção e filtro como buffers desabilitados. Somente uma leitura válida completa os substitui; 403/419 e respostas tardias não restauram dados privados.
- **C150 — Salvamento confirmado, leitura falha:** nos quatro caminhos de criar/editar curso e aula, conserva os campos visíveis e informa que a gravação já foi confirmada. A recuperação seleciona o item recém-criado somente quando seu ID aparece em listas frescas validadas. Nenhuma repetição automática; exclusões confirmadas e navegação comum mantêm o comportamento anterior. A reprodução demonstra perda do buffer visual, sem alegar perda do conteúdo já salvo no servidor.

**Revisão:** suíte Node completa aprovada, incluindo 30 cenários da reflexão e 74 de recibos/recuperação editorial; 15 caminhos HTTP de escrita preservados. Revisões independentes confirmaram limpeza em 403/419, respostas tardias, seleção de criações recuperadas, ausência de replay e equivalência dos caminhos de exclusão/navegação. Capturas da reflexão em desktop e 390 px conferidas visualmente, sem corte ou sobreposição.

Documentos: [C147](https://github.com/rafhael100/imagine-universidade/blob/5d95620f95ebf29ade2e2b4ab9dbf7dd7c0bab5f/docs/UNI-C147-REFLEXAO-OPCIONAL-2026-11-18.md), [C148](https://github.com/rafhael100/imagine-universidade/blob/5d95620f95ebf29ade2e2b4ab9dbf7dd7c0bab5f/docs/UNI-C148-NONCE-EXPIRACAO-APOS-SQL-2026-11-18.md), [C149](https://github.com/rafhael100/imagine-universidade/blob/5d95620f95ebf29ade2e2b4ab9dbf7dd7c0bab5f/docs/UNI-C149-RASCUNHOS-RECUPERACAO-EDITORIAL-2026-11-18.md) e [C150](https://github.com/rafhael100/imagine-universidade/blob/5d95620f95ebf29ade2e2b4ab9dbf7dd7c0bab5f/docs/UNI-C150-CAMPOS-APOS-SALVAMENTO-CONFIRMADO-2026-11-18.md).

### CI final aprovada no mesmo SHA

Os seis jobs concluíram com sucesso: `validation`, `portal-contract-parity`, `docker-lab`, `browser-lab`, `editorial-review-pack` e `staging-image-lab`.

| Evidência executada | Resultado |
|---|---|
| PHPUnit Unit + Feature | **406 testes / 5.560 asserções** — 39/169 e 367/5.391 |
| Chromium com respostas sintéticas e views reais | **904 verificações**; aluno/editor, recuperação, revogação, 320/390/768/1440 px e varredura de acessibilidade |
| Navegador com Laravel e SQLite reais | **267 verificações**; respostas de negócio sem interceptação |
| Contrato Portal fixado por SHA | **47 verificações** de compatibilidade e negação padrão |
| PostgreSQL | Expiração durante SQL, hash consumido, concorrência, rollback e **24 asserções** de privilégios aprovados |

Os ambientes são descartáveis e as identidades são sintéticas. A candidata mantém `HOLD_NO_GO`: fonte oficial de serviços ativos/revogação/SSO do Portal, revisão editorial do acervo e homologação operacional continuam dependências documentadas. Esta entrega não muda base da PR, gates, credenciais ou infraestrutura e não realiza merge/deploy.

## Problema e comportamento implementado

A continuação permite estudar e retomar material de forma privada e reduz perda de trabalho editorial. As alterações permanecem nesta PR de revisão.

- **C-145 — Texto Unicode no editor:** títulos, descrição e corpo usam os limites Unicode já aceitos pelo servidor. Retira limites nativos incompatíveis, preserva os mínimos legados de leitura, valida envio/prévia antes de qualquer escrita e mostra o texto válido completo, incluindo o último caractere. Entradas inválidas conservam os onze campos e recebem foco.
- **C-146 — Entrada da busca:** o campo de pesquisa deixa de cortar letras Unicode antes do handler. A validação existente de 3 a 60 caracteres continua local e no servidor; expressões inválidas ficam disponíveis para correção, sem POST, cursor anterior ou alteração do estudo.
- **C-144 — Orientações do curso:** Para quem e Conhecimentos úteis, opcionais, até 500 caracteres Unicode por campo. O editor preserva campos inalterados e envia `null` somente para limpeza explícita; os textos participam da conferência de publicação. O aluno vê texto literal do curso autorizado, sem requisito acadêmico, pedido extra ou gravação; falha, retirada e revogação ocultam as orientações sem interferir no estudo e nos dados pessoais.
- **C-141 — Remoção de favorito incerta:** o botão do curso deixa de inferir sucesso de DELETE pela ausência na lista de publicados. Usa a recuperação manual de referências retidas, sem GET automático nem replay. Página vazia não confirma exclusão; as duas ordens de consulta permitem novas ações explícitas, preservando estudo, PUT e revogação.
- **C-142 — Histórico editorial:** cursor passa a aceitar o intervalo positivo seguro, inclusive acima de int4. A UI valida página, IDs, ordem, cursor e datas antes de exibir; erro ou envelope incompleto informa indisponibilidade, sem falso histórico vazio. Paginação e recuperação preservam formulários e não resolvem uma escrita incerta.
- **C-143 — Formulário e prévia:** Novo curso mantém todos os campos de aula bloqueados até salvar o curso. Alterar título/conteúdo invalida a prévia anterior; nova visualização usa o texto atual. Descarte explícito, buffers, ordenação e guards permanecem.
- **C-140 — Busca paginada:** páginas explícitas de até oito aulas, com continuação e reinício; nenhuma acumulação ou gravação da consulta. Cursor cifrado vinculado à expressão e à referência editorial exata, conferida antes/depois da leitura, com autoridade revalidada também nas falhas. O envelope legado permanece disponível. Atualizar a biblioteca ou mudar a consulta invalida respostas antigas e impede que um `finally` antigo libere a busca nova. Paginar preserva o leitor, favoritos, progresso e posição; escolher um resultado abre a aula exata.
- **C-138 — IDs de rota:** os 16 endpoints legados verificam a magnitude do decimal antes de converter para inteiro. Overflow devolve 404 privado sem consulta ou chamada ao Tutor; zero, zeros iniciais, inteiros representáveis e retornos específicos de recursos ausentes são preservados. Grants/CSRF e as revalidações continuam nos mesmos pontos.
- **C-139 — Recuperação editorial:** o painel orienta a consulta manual e a não repetição de uma operação incerta, sem atribuir todo conflito a falha de conexão. Alteração somente de texto, com CTA e comportamento preservados.
- **C-137 — Ordem do curso:** editar título/resumo/categoria sem alterar a posição omite a ordem e conserva a mudança concorrente. Uma alteração numérica explícita compara a ordem esperada sob o lock; conflito não grava nem audita e requer consulta manual. Preserva criação, contratos legados, aula selecionada e filtros. A proteção é específica da ordem, sem CAS geral do texto.
- **C-136 — Confirmação das escritas editoriais:** os sete handlers restantes exigem os indicadores exatos de criação, edição, exclusão, publicação e retirada antes de atualizar os formulários. Recibos incompletos/contraditórios preservam os nove campos e bloqueiam novas gravações até consulta manual; não repetem a operação. Revogação mantém prioridade.
- **C-135 — Versões no arquivo de progresso:** remove o teto local de um milhão, ausente do contrato do backend; mantém inteiro seguro positivo, datas, allowlist, escopo e limite de 5.000 referências. **37 cenários Node** exercitam sanitizador, JSON real e handler até o Blob do download.
- **C-133 — Edição concorrente:** salvar somente texto omite a ordem e o backend conserva o valor atual. Alteração numérica explícita envia a posição esperada; comparação estrita sob lock do curso rejeita divergência com 409, sem alteração de conteúdo/auditoria. A interface exige `saved: true`, preserva ambos os formulários e o filtro quando há conflito ou recibo incerto, e aguarda recuperação manual sem replay. A proteção é da posição numérica, sem CAS geral de conteúdo; clientes legados continuam documentados.
- **C-134 — Exportação UTC:** o backend normaliza a data de conclusão com o helper privado existente, incluindo offsets curtos do PostgreSQL, para UTC com precisão de segundos. Dado inválido impede o arquivo inteiro. Escopo, referência arquivada, limite 5.000/5.001, autoridade e datas armazenadas permanecem intactos.
- **C-131/C-132 — Localizar aulas:** busca local por título/slug no editor e no curso aberto pelo aluno. A seleção permanece visível fora dos resultados sem aumentar a contagem. O editor preserva formulários, arquivo e ordem completa; o aluno conserva a sequência, a próxima pendente, o leitor e as preferências. Filtrar/limpar não faz HTTP nem usa armazenamento. Revogação ou retirada limpa o estado local.
- **C-129 — Ordem editorial:** Subir/Descer altera a ordem completa das aulas de um rascunho em uma transação. O servidor compara o snapshot, calcula o destino exato, normaliza as posições e registra uma auditoria; repetição idêntica confirmada não grava de novo. Rascunhos não salvos bloqueiam a ação; conflito ou resultado incerto preserva os formulários e exige consulta manual. Publicados e versões arquivadas ficam protegidos.
- **C-130 — Curso retirado durante a leitura:** um catálogo completo validado que omita o curso aberto encerra a leitura anterior e invalida respostas pendentes. Mantém elegibilidade global e referências pessoais; não repete conclusão nem escreve histórico ou preferência.
- **C-127/C-128 — Leitura e teclado:** a navegação explícita entrega foco ao título autorizado ou à mensagem atual, preservando interações feitas durante a espera. Botões antigos não reabrem aulas. Um índice local navega entre seções editoriais exatas, com parágrafos literais completos, sem chamadas HTTP ou registro de leitura.
- **C-126 — Histórico pessoal de conclusões:** consulta manual e paginada de referências próprias, com curso/aula/versão exatos, data UTC original e disponibilidade. A retirada conserva o registro; republicar não o remapeia. A conclusão invalida a consulta no início e no fim da tentativa, inclusive após navegação ou resposta incerta, sem inserir linha otimista, buscar automaticamente ou reconciliar pelo histórico.
- **C-125 — Outros cursos deste tema:** até três cursos da mesma categoria, na ordem editorial já autorizada, com justificativa e opção de ocultar nesta visita. O clique revalida o contexto e usa as leituras privadas existentes; sem perfil, ranking, armazenamento de preferência ou alteração de progresso/favoritos/posição.
- **C-124 — Catálogo editorial:** filtros locais de texto, categoria e publicação, com contagem e curso em edição visível fora dos critérios. Filtrar e limpar preservam os dois formulários e a leitura histórica, sem novas requisições.
- **C-123 — Gerenciar favoritos:** consulta privada paginada das referências próprias, inclusive cursos indisponíveis, com data original e disponibilidade. Remoção usa o DELETE existente e exige recibo exato; uma falha permanece não confirmada, sem inferência a partir de uma página vazia nem repetição automática. Curso, aula e filtros são preservados.
- **C-122 — Versões arquivadas:** consulta editorial paginada de versões anteriores e aulas; o corpo é solicitado somente após selecionar a aula. O painel preserva ambos os rascunhos, identifica o cadastro atual separadamente e invalida leituras pendentes após mutações ou revogação. São três GETs sob MANAGE, sem novos caminhos de escrita, schema ou grants.
- **C-121 — Aula guardada:** uma posição explícita por pessoa e empresa, com curso/aula/versão exatos. Salvar, retomar, remover e exportar usam contratos privados; navegar ou concluir não move a posição. Conflitos entre abas exigem nova consulta e ação, sem replay automático. A retirada deixa a referência indisponível e a republicação não a remapeia.
- **Concorrência da posição:** revisão aleatória e comparação no banco; remoção apaga referência/data e preserva um slot vazio com nova revisão. GET inicial emite ticket cifrado de 300 segundos sem criar registro. A primeira inserção revalida autorização e prazo após eventual espera, com rollback em caso de negação. Datas deste contrato são UTC ISO8601.
- **C-116/C-118 — Favoritos e exportação:** salvar/remover curso, filtros e arquivo próprio de slug/data, incluindo referências retidas de cursos retirados. Escritas e downloads tardios não restauram estado após revogação.
- **C-119 — Visão do acervo:** totais e categorias editoriais, aulas da versão mais recente e avisos de ausência de aula/descrição. Um SELECT agregado, sem consulta de dados individuais; alterações invalidam o painel e preservam os formulários.
- **C-112/C-113:** ajuda opcional com fonte/versão e material literal quando o Tutor está indisponível; preservação de rascunhos independentes de curso e aula.
- **C-108–C-111:** fronteira privada, alvo exato da busca, validação de respostas e conferência do hash editorial.
- **C-114/C-115/C-120:** inventário somente de leitura, ambiente sem credencial do proprietário dentro da aplicação, descarte HTTP limitado sem atrasar revogação e espera de PostgreSQL por consulta TCP autenticada.

**C-117** percorre Chromium → Laravel HTTP → SQLite, com sessões e CSRF reais. Somente a autoridade das três identidades sintéticas é substituída em `tests/Browser`, fora da imagem runtime. Nenhuma resposta de negócio é simulada nesse percurso.

## Execução completa aprovada, C-145–C-146

**HEAD `4d0c2fb4e0125d6ebaa0e3677e8c91b340c0af7a` — [Actions #44240939718](https://github.com/rafhael100/imagine-universidade/actions/runs/44240939718): seis jobs concluídos com sucesso.**

| Verificação | Resultado efetivamente executado |
| --- | --- |
| PHP | **404 testes / 5.546 asserções**: 39 Unit/169 + 365 Feature/5.377, incluindo os quatro métodos novos para limites Unicode. |
| PostgreSQL | **17 invariantes** aprovadas; schema e contratos de persistência permanecem. |
| Chromium sintético | **852 verificações**, incluindo as 12 editoriais e três de busca com entrada nativa adicionadas. |
| Chromium pelo Laravel real | **259 verificações** contra a produção atual, persistência aprovada e respostas de negócio reais. |
| Demais jobs | Paridade Portal, Docker, imagem de laboratório e pacote editorial aprovados. |

A suíte Node principal completa também passou, com 21 cenários no focal editorial e os 34 anteriores de busca; sintaxe, diff, os mesmos 15 caminhos de escrita e revisões independentes concluídos. O runtime confirmou textos nos limites, prévia integral, rejeições sem efeitos e preservação dos formulários. Nenhum extrator ou fixture anterior precisou mudar.

## Execução completa aprovada, C-144

**HEAD `33e89a34c6fabc22df63e968a164589caf377479` — [Actions #44239547982](https://github.com/rafhael100/imagine-universidade/actions/runs/44239547982): seis jobs concluídos com sucesso.**

| Verificação | Resultado efetivamente executado |
| --- | --- |
| PHP | **400 testes / 5.325 asserções**: 39 Unit/169 + 361 Feature/5.156, incluindo os nove métodos C144. |
| PostgreSQL | **17 invariantes de schema** aprovadas; duas colunas opcionais `varchar(500)` verificadas. Os gates de concorrência e as 24 asserções de privilégios também passaram. |
| Chromium sintético | **837 verificações**, incluindo 13 novas do editor e 20 do aluno. |
| Chromium pelo Laravel real | **259 verificações**, incluindo 14 C144, com persistência aprovada e respostas de negócio reais. |
| Demais jobs | Paridade Portal, Docker, imagem de laboratório e pacote editorial aprovados. |

A suíte Node principal completa passou, incluindo os 16 cenários editoriais e 32 do aluno novos. Sintaxe, diff, os mesmos 15 caminhos de escrita e revisões independentes foram aprovados.

As quatro capturas reais de editor/aluno foram examinadas em desktop e 390 px: campos legíveis, quebra de texto preservada e marcação exibida literalmente. O artefato `imagine-universidade-framework-browser-evidence` (`14398524869`) foi conferido pelo SHA-256 `9693271925084ed24b2dfa889ab2426a7ef8829380605f4ecacad1d95df84301`. A jornada reutiliza três perfis/dois cursos e acrescenta apenas um PATCH explícito de limpeza editorial, sem requisição adicional do aluno.

## Execução completa aprovada, C-141–C-143

**HEAD `b29f06e8a71f68d8d10129e88a8b66f8ce7fe6ad` — [Actions #44237563589](https://github.com/rafhael100/imagine-universidade/actions/runs/44237563589): seis jobs concluídos com sucesso.**

| Verificação | Resultado efetivamente executado |
| --- | --- |
| PHP | **391 testes / 5.128 asserções**: 39 Unit/169 + 352 Feature/4.959; inclui os sete cenários HTTP C142. |
| Chromium sintético | **804 verificações**, incluindo recuperação de DELETE incerto, validação/paginação da auditoria e estado do formulário/prévia. |
| Chromium pelo Laravel real | **245 verificações** com respostas de negócio reais; persistência de sessões e aprendizagem aprovada. |
| Demais gates da CI | Paridade Portal, Docker, imagem de laboratório e pacote editorial aprovados; nenhuma liberação operacional. |

A suíte Node principal completa também passou: C141 com 61/79 cenários nos checkers de favoritos, C142 com 27 e C143 com 13. Sintaxe, diff e cerca dos 15 caminhos de escrita passaram; revisões independentes concluídas. Os limites de publicação permanecem inalterados.

## Execução completa aprovada, C-140

**SHA `92d8452b5cb3e65308a11044747f75d6c77e9cd5` — [Actions #44235137343](https://github.com/rafhael100/imagine-universidade/actions/runs/44235137343): os seis jobs aprovados.**

| Verificação | Resultado observado |
|---|---|
| PHP | **384 testes / 5.035 asserções**: 39 Unit/169 + 345 Feature/4.866; inclui os 25 métodos C140. |
| PostgreSQL | **15 verificações C140 aprovadas**, usando repository/codec reais: sete páginas com empates, sentinela SQL de 9 registros, cursor autenticado, autoridade, referência revalidada, int4, nenhum dado pessoal e restauração do savepoint. Demais probes, 16 invariantes e 24 verificações de privilégios aprovados. |
| Node e Chromium sintético | Suíte Node completa com **34 cenários C140**; **773 verificações Chromium**, incluindo as 27 novas. |
| Chromium pelo Laravel real | **245 verificações**, incluindo 13 C140, e persistência aprovada. Nove aulas em 8→1→reinício, seleção da aula exata e retorno ao estudo; três POSTs explícitos de busca, sem outra mutação. Revogação e nova sessão não restauram a consulta. |
| Inspeção visual | Capturas reais desktop/390px inspecionadas: títulos/trechos, página atual, continuação e reinício legíveis, sem transbordamento. Captura do conflito editorial confirma também o texto C139. Artefato 14396658994 conferido por SHA256. |
| Outros jobs | Paridade Portal, Docker, imagens e pacote editorial aprovados. |

## Execução completa aprovada, C-138/C-139

**SHA `f458bacef4dbc32ca59b4dfbf0db7b833f65294f` — [Actions #44233262064](https://github.com/rafhael100/imagine-universidade/actions/runs/44233262064): os seis jobs aprovados.** Logs confirmam **359 testes PHP / 4.726 asserções** (39 Unit/169 + 320 Feature/4.557), **746 verificações Chromium sintéticas**, **232 pelo Laravel/SQLite real** e persistência aprovada. Inclui os oito métodos C138 e o texto C139. Probes PostgreSQL, Portal, Docker, imagens e pacote editorial aprovados.

O primeiro run [#44231820243](https://github.com/rafhael100/imagine-universidade/actions/runs/44231820243), SHA `1e223288`, aprovou backend/probes/746 sintéticos, mas o percurso real parou após a verificação29 porque o corpo de um PATCH409 estava indisponível (`network=aborted`). C120 drena erros e pode cancelar o stream em seus limites; o log não prova a condição específica. A correção restrita do runner usa status409/503, Content-Type e headers privados/sem redirect nas três respostas de erro, mantendo banco/auditoria/formulários/recuperação/material literal e contagem de requisições. DTOs exatos permanecem nos Feature; sem replay, mock ou alteração de produto. O run completo acima confirma essa correção.

## Execução completa aprovada, C-136/C-137

**SHA `8368d5261915412233726eafacd5e057bd04e303` — [Actions #44230182074](https://github.com/rafhael100/imagine-universidade/actions/runs/44230182074): os seis jobs aprovados.**

| Verificação | Resultado observado |
|---|---|
| PHP | **351 testes / 3.959 asserções**: 39 Unit/169 + 312 Feature/3.790; inclui os 23 métodos C137. |
| PostgreSQL | **11 novos checks C137 aprovados**: ordem omitida, contenção real de PATCH/publicação, commit do peer após liberação, conflitos sem efeitos, legado, autoridade, isolamento e rollback após auditoria. Exatamente quatro edições confirmadas auditadas; aulas/publicação/versões preservadas. Demais probes, 16 invariantes e 24 verificações de privilégios aprovados. |
| Chromium com falhas controladas | **746 verificações**, incluindo 23 C136 e 21 C137, com os sete recibos, buffers, recuperação manual e revogação. |
| Chromium pelo Laravel real | **232 verificações**, persistência aprovada. Duas sessões confirmaram metadados e ordem independentes, 409 sem efeitos/auditoria, consulta cancelada/aceita e nova ação restaurando o curso. Sem respostas de negócio simuladas. |
| Inspeção visual | Captura real do conflito de ordem do curso inspecionada: resumo/posição locais preservados, aviso legível, gravações bloqueadas e recuperação manual disponível. A mensagem genérica foi refinada na C139 posterior. |
| Outros jobs | Paridade Portal, Docker, imagens e pacote editorial aprovados. |

## Execução completa aprovada, C-133–C-135

**SHA `2bec87cbb1ce998a518311575c18457125a7ae89` — [Actions #44228136328](https://github.com/rafhael100/imagine-universidade/actions/runs/44228136328): os seis jobs aprovados.**

| Verificação | Resultado observado |
|---|---|
| PHP | **328 testes / 3.721 asserções**: 39 Unit/169 + 289 Feature/3.552. |
| PostgreSQL e privilégios | **9 checks C133 e 6 C134 aprovados**, além dos probes anteriores: ordem, contenção real, conflito sem efeitos e rollback; normalização UTC sob três timezones com registros preservados. **16 invariantes, 24 verificações de privilégios e 15 caminhos de escrita HTTP**. |
| Chromium com falhas controladas | **702 verificações**, incluindo as 19 C133; checks Node incluem 28 C133, 7 C134 e 37 C135. |
| Chromium pelo Laravel real | **221 verificações**, persistência aprovada e duas sessões da mesma identidade editorial. Texto preserva a ordem concorrente; alteração explícita/conflito/consulta manual funcionam com auditoria intacta na rejeição. |
| Exportação real | Botão baixou JSON com cabeçalhos/nome/allowlist/UTC corretos, igual à resposta real e sem escrita. Referência e data original preservadas após republicação. |
| Inspeção visual | Captura real do conflito de ordem da aula inspecionada: campos/aviso legíveis, gravações bloqueadas e recuperação manual visível. |
| Outros jobs | Paridade Portal, Docker, imagens e pacote editorial aprovados. |

O primeiro runtime [#44227212699](https://github.com/rafhael100/imagine-universidade/actions/runs/44227212699), SHA `3894f107`, aprovou cinco jobs/backend/probes e 702 checks sintéticos. Parou no harness: selecionar o curso já selecionado não atualiza aulas. O SHA completo acima corrigiu somente a preparação, saindo/reabrindo a seleção sem criar registro, com produto e asserções preservados.

## Execução completa aprovada, C-127–C-132

**SHA `8099229f696331625264e2792d0c3b75a937ff3a` — [Actions #44225106281](https://github.com/rafhael100/imagine-universidade/actions/runs/44225106281): os seis jobs aprovados.**

| Verificação | Resultado observado |
|---|---|
| PHP | **296 testes / 3.398 asserções**: 39 Unit/169 + 257 Feature/3.229. |
| PostgreSQL e privilégios | Reordenação C129 com duas sessões, locks, 600 aulas/três lotes, uma auditoria, no-op, conflitos e rollback; demais probes aprovados. **16 invariantes, 24 verificações de privilégios, 15 caminhos de escrita HTTP**. |
| Chromium com falhas controladas | **683 verificações**, aluno/editor em 320/390/768/1440 e varredura axe sem violações graves/críticas. |
| Chromium pelo Laravel real | **206 verificações**, persistência aprovada, sessões/CSRF reais e nenhuma resposta de negócio simulada. |
| Inspeção visual | Índice/seções, reordenação e filtros de aulas em desktop/390 px inspecionados; controles legíveis e sem transbordamento nos recortes. Contagem, pin e campos preservados também verificados pelos asserts. |
| Outros jobs | Paridade oficial Portal, Docker, imagens e pacote editorial aprovados. Sem deploy ou aprovação humana dos textos. |

Os incrementos aprovados abrangem foco explícito, índice literal da aula, ordenação atômica de rascunhos, reconciliação de curso retirado e localização local de aulas no editor/aluno. As duas buscas preservam a seleção fora do filtro e a sequência completa, sem HTTP ao filtrar.

### Diagnósticos preservados

- `3beec99` / Actions #44222038694: Feature identificou 405 em ID inválido; o parser antes da conversão corrigiu para o 404 exigido.
- `1d439bd` / Actions #44222871749: backend/probes aprovados; a premissa de foco entre páginas do harness C127 foi corrigida conforme a [documentação oficial](https://playwright.dev/docs/pages#multiple-pages). O ensaio usa o listener real de blur controlado e não afirma troca nativa de janela.
- `c19bea9` / Actions #44224418993: cinco jobs aprovados; o teste de consulta inválida era barrado pelo minlength nativo. A fixture `texto!` aciona o parser real sem mudar HTML, handler ou asserts.
- `8099229` confirma a execução integral após essas correções. PHP, PostgreSQL, Docker e navegador foram executados somente nos laboratórios autorizados de CI.

## Referência anterior completa, C-126

**SHA `b67b9a44f92f538a2f595324b6e24dc78304e9c1` — [Actions #44216815401](https://github.com/rafhael100/imagine-universidade/actions/runs/44216815401): os 6 jobs foram aprovados.**

| Verificação | Resultado observado |
|---|---|
| Backend | **270 testes PHP / 3.111 asserções**: 39 Unit/169 + 231 Feature/2.942, incluindo 25 Feature de histórico pessoal. |
| PostgreSQL18 e privilégios | Probes aprovados, incluindo histórico 50+1 por ID decrescente, cursor removido/acima de int4, UTC, isolamento e disponibilidade da versão exata. **16 invariantes de schema, 24 verificações de privilégios e 14 caminhos de escrita**. |
| Navegador com falhas controladas | **523 verificações Chromium**, incluindo 28 C126; aluno/editor em 320/390/768/1440 e varredura axe sem violações graves/críticas. |
| Navegador pelo Laravel real | **169 verificações**, incluindo consulta manual em duas empresas, invalidação nas fronteiras da conclusão, retirada/republicação, purga na revogação e restauração manual da mesma referência. Persistência aprovada. |
| Inspeção visual | Histórico legível em 1440 e 390 pixels, com data UTC, versão e disponibilidade. Referências indisponíveis sem navegação; sem transbordamento horizontal. |
| Portal, Docker e imagens | Paridade oficial fixada, backup/restauração e PHP/Nginx/PostgreSQL com separação owner/runtime aprovados. Sem deploy. |
| Pacote editorial | Material e hashes íntegros; revisão humana pendente, sem aprovação ou publicação. |

O histórico usa o mesmo escopo retido do export existente; o cursor é somente um limite numérico, sem consulta de âncora. Todos os 51 registros são validados antes do corte. Sem novo schema, grant, política de retenção ou escrita HTTP; a data reutiliza o helper UTC de favoritos retidos.

## Dependências e limites

Base #84 (`2933e668d5c592c7fd5efded88d9f74aae0c471e`), dependente de #81; os textos da #83 permanecem separados. Não houve mudança de base, merge ou implantação.

**DRAFT / HOLD_NO_GO / NO-MERGE / NO-DEPLOY.** Mantidos `UnavailablePortalAuthority`, `DisabledTutorGateway`, os 13 critérios operacionais e [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886). Sem alteração de VPS, DNS, cobrança, credenciais reais ou dados de clientes.

O marcador não cria evento de perda de elegibilidade nem purger. Slots vazios também pertencem à futura retenção autorizada; eliminação excepcional antecipada precisa invalidar sessões/tickets utilizáveis antes da remoção física. A Universidade permanece benefício exclusivo de clientes com serviço Imagine elegível ativo, sem provas, notas ou certificados.

## Registros principais

- [C145 limites Unicode e prévia integral](https://github.com/rafhael100/imagine-universidade/blob/4d0c2fb4e0125d6ebaa0e3677e8c91b340c0af7a/docs/UNI-C145-LIMITES-UNICODE-EDITOR-2026-11-18.md).
- [C146 entrada Unicode na pesquisa privada](https://github.com/rafhael100/imagine-universidade/blob/4d0c2fb4e0125d6ebaa0e3677e8c91b340c0af7a/docs/UNI-C146-LIMITE-UNICODE-PESQUISA-2026-11-18.md).

- [C144 integração e validação](https://github.com/rafhael100/imagine-universidade/blob/4d0c2fb4e0125d6ebaa0e3677e8c91b340c0af7a/docs/UNI-C144-INTEGRACAO-ORIENTACOES-CURSO-2026-11-18.md).
- [C144 contrato e migration](https://github.com/rafhael100/imagine-universidade/blob/4d0c2fb4e0125d6ebaa0e3677e8c91b340c0af7a/docs/UNI-C144-ORIENTACOES-CURSO-BACKEND-2026-11-18.md).
- [C144 editor](https://github.com/rafhael100/imagine-universidade/blob/4d0c2fb4e0125d6ebaa0e3677e8c91b340c0af7a/docs/UNI-C144-ORIENTACOES-CURSO-EDITOR-2026-11-18.md).
- [C144 aluno](https://github.com/rafhael100/imagine-universidade/blob/4d0c2fb4e0125d6ebaa0e3677e8c91b340c0af7a/docs/UNI-C144-ORIENTACOES-CURSO-ALUNO-2026-11-18.md).

- [C141 recuperação da remoção de favoritos](https://github.com/rafhael100/imagine-universidade/blob/33e89a34c6fabc22df63e968a164589caf377479/docs/UNI-C141-RECUPERACAO-REMOCAO-FAVORITOS-2026-11-18.md).
- [C142 consulta do histórico editorial](https://github.com/rafhael100/imagine-universidade/blob/33e89a34c6fabc22df63e968a164589caf377479/docs/UNI-C142-HISTORICO-EDITORIAL-2026-11-18.md).
- [C143 formulário e prévia](https://github.com/rafhael100/imagine-universidade/blob/33e89a34c6fabc22df63e968a164589caf377479/docs/UNI-C143-ESTADO-FORMULARIO-EDITORIAL-2026-11-18.md).
- [C140 backend e cursores](https://github.com/rafhael100/imagine-universidade/blob/b29f06e8a71f68d8d10129e88a8b66f8ce7fe6ad/docs/UNI-C140-BUSCA-PAGINADA-BACKEND-2026-11-17.md).
- [C140 interface, concorrência e integração](https://github.com/rafhael100/imagine-universidade/blob/b29f06e8a71f68d8d10129e88a8b66f8ce7fe6ad/docs/UNI-C140-PAGINACAO-BUSCA-PRIVADA-UI-2026-11-17.md).
- [C138 IDs legados, compatibilidade e fontes](https://github.com/rafhael100/imagine-universidade/blob/92d8452b5cb3e65308a11044747f75d6c77e9cd5/docs/UNI-C138-LIMITE-IDS-ROTAS-2026-11-17.md).
- [C139 orientação de recuperação e evidência C136](https://github.com/rafhael100/imagine-universidade/blob/1e223288cdaad68ae2758d4fbcfa8c0e97d6b6b4/docs/UNI-C136-RECIBOS-ESCRITAS-EDITORIAIS-2026-11-17.md).

- [C136 recibos editoriais](https://github.com/rafhael100/imagine-universidade/blob/8368d5261915412233726eafacd5e057bd04e303/docs/UNI-C136-RECIBOS-ESCRITAS-EDITORIAIS-2026-11-17.md).
- [C137 backend da ordem dos cursos](https://github.com/rafhael100/imagine-universidade/blob/8368d5261915412233726eafacd5e057bd04e303/docs/UNI-C137-PRECONDICAO-ORDEM-CURSO-BACKEND-2026-11-17.md).
- [C137 interface e percurso real](https://github.com/rafhael100/imagine-universidade/blob/8368d5261915412233726eafacd5e057bd04e303/docs/UNI-C137-ORDEM-CURSO-CONCORRENTE-UI-2026-11-17.md).

- [C135 versões válidas na exportação](https://github.com/rafhael100/imagine-universidade/blob/2bec87cbb1ce998a518311575c18457125a7ae89/docs/UNI-C135-VERSAO-EXPORTACAO-PROGRESSO-2026-11-17.md).

- [C133 backend: preservação e pré-condição da ordem](https://github.com/rafhael100/imagine-universidade/blob/3894f10715be4d52a9a3d4d946cc9923617e05f5/docs/UNI-C133-PRECONDICAO-ORDEM-AULA-BACKEND-2026-11-17.md).
- [C133 interface e recuperação manual](https://github.com/rafhael100/imagine-universidade/blob/3894f10715be4d52a9a3d4d946cc9923617e05f5/docs/UNI-C133-ORDEM-AULA-CONCORRENTE-UI-2026-11-17.md).
- [C134 exportação de progresso em UTC](https://github.com/rafhael100/imagine-universidade/blob/3894f10715be4d52a9a3d4d946cc9923617e05f5/docs/UNI-C134-EXPORTACAO-PROGRESSO-UTC-2026-11-17.md).

- [Busca de aulas no editor](https://github.com/rafhael100/imagine-universidade/blob/c19bea9ed404e83c02cab83b6b2cdedc3c955c35/docs/UNI-C131-BUSCA-AULAS-EDITOR-2026-11-17.md).
- [Localizar aulas no curso do aluno](https://github.com/rafhael100/imagine-universidade/blob/c19bea9ed404e83c02cab83b6b2cdedc3c955c35/docs/UNI-C132-LOCALIZAR-AULAS-CURSO-2026-11-17.md).
- [Reordenação: backend, transação e concorrência](https://github.com/rafhael100/imagine-universidade/blob/c19bea9ed404e83c02cab83b6b2cdedc3c955c35/docs/UNI-C129-REORDENACAO-AULAS-BACKEND-2026-11-17.md).
- [Reordenação: interface e recuperação](https://github.com/rafhael100/imagine-universidade/blob/c19bea9ed404e83c02cab83b6b2cdedc3c955c35/docs/UNI-C129-ORDENACAO-AULAS-UI-2026-11-17.md).
- [Reconciliação do catálogo do aluno](https://github.com/rafhael100/imagine-universidade/blob/c19bea9ed404e83c02cab83b6b2cdedc3c955c35/docs/UNI-C130-RECONCILIACAO-CATALOGO-ALUNO-2026-11-17.md).
- [Foco após navegação explícita](https://github.com/rafhael100/imagine-universidade/blob/c19bea9ed404e83c02cab83b6b2cdedc3c955c35/docs/UNI-C127-FOCO-NAVEGACAO-2026-11-17.md).
- [Índice e parágrafos da aula](https://github.com/rafhael100/imagine-universidade/blob/c19bea9ed404e83c02cab83b6b2cdedc3c955c35/docs/UNI-C128-INDICE-SECOES-AULA-2026-11-17.md).

- [Histórico pessoal: backend e paginação](https://github.com/rafhael100/imagine-universidade/blob/b67b9a44f92f538a2f595324b6e24dc78304e9c1/docs/UNI-C126-HISTORICO-CONCLUSOES-BACKEND-2026-11-17.md).
- [Histórico pessoal: interface e concorrência](https://github.com/rafhael100/imagine-universidade/blob/b67b9a44f92f538a2f595324b6e24dc78304e9c1/docs/UNI-C126-HISTORICO-CONCLUSOES-UI-2026-11-17.md).

- [Sugestões opcionais por categoria](https://github.com/rafhael100/imagine-universidade/blob/f6c14e8c9189f9eea3d990718b37929b1270adea/docs/UNI-C125-CURSOS-CONTEXTUAIS-2026-11-17.md).

- [Filtros editoriais](https://github.com/rafhael100/imagine-universidade/blob/fad8c3916a44ca91f843c36d1c9ea26396d0800f/docs/UNI-C124-FILTROS-CATALOGO-EDITORIAL-2026-11-17.md).
- [Favoritos retidos: backend](https://github.com/rafhael100/imagine-universidade/blob/fad8c3916a44ca91f843c36d1c9ea26396d0800f/docs/UNI-C123-FAVORITOS-RETIDOS-BACKEND-2026-11-17.md).
- [Favoritos retidos: interface e diagnóstico da CI](https://github.com/rafhael100/imagine-universidade/blob/fad8c3916a44ca91f843c36d1c9ea26396d0800f/docs/UNI-C123-GESTAO-FAVORITOS-UI-2026-11-17.md).

- [Histórico: backend e contrato](https://github.com/rafhael100/imagine-universidade/blob/98e32b357248c8bd40cb68f38edcb47d338942b6/docs/UNI-C122-HISTORICO-VERSOES-EDITORIAIS-BACKEND-2026-11-17.md).
- [Histórico: interface, recuperação e correção](https://github.com/rafhael100/imagine-universidade/blob/98e32b357248c8bd40cb68f38edcb47d338942b6/docs/UNI-C122-CONSULTA-VERSOES-EDITORIAIS-UI-2026-11-17.md).

- [Guia técnico](https://github.com/rafhael100/imagine-universidade/blob/98e32b357248c8bd40cb68f38edcb47d338942b6/README-DEV.md).
- [Marcador: backend, concorrência e retenção](https://github.com/rafhael100/imagine-universidade/blob/98e32b357248c8bd40cb68f38edcb47d338942b6/docs/UNI-C121-MARCADOR-PRIVADO-LEITURA-BACKEND-2026-11-17.md).
- [Marcador: interface e recuperação](https://github.com/rafhael100/imagine-universidade/blob/98e32b357248c8bd40cb68f38edcb47d338942b6/docs/UNI-C121-POSICAO-LEITURA-UI-2026-11-17.md).
- [Percurso pelo framework](https://github.com/rafhael100/imagine-universidade/blob/98e32b357248c8bd40cb68f38edcb47d338942b6/docs/UNI-C117-FLUXO-REAL-FRAMEWORK-BROWSER-2026-11-17.md).
- [Limpeza HTTP e prontidão do PostgreSQL](https://github.com/rafhael100/imagine-universidade/blob/98e32b357248c8bd40cb68f38edcb47d338942b6/docs/UNI-C120-LIMPEZA-RESPOSTA-HTTP-2026-11-17.md).
