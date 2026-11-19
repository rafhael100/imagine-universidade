# C128 — Índice local das seções e parágrafos da aula

## Resultado e escopo

C128 melhora a orientação dentro de uma aula já carregada e autorizada. Quando o texto contém pelo menos duas seções reconhecidas pelo leitor existente, a aula apresenta um índice com os rótulos editoriais exatos. Cada ação leva o foco e a rolagem ao título correspondente. As linhas vazias também passam a separar parágrafos semânticos, mantendo o texto literal e as quebras simples.

A implementação corresponde à leitura acessível e à revisão voluntária previstas em [UNI-02](10-modulos/UNI-02.md), especialmente BASE-UNI-02-02, BASE-UNI-02-05 e BASE-UNI-02-06. A execução deste incremento foi autorizada na rodada de desenvolvimento contínuo; o documento-base, isoladamente, não constitui autorização de programação.

O trabalho foi preparado no checkout isolado `dev/uni-c128-lesson-sections-2026-11-17`, derivado do checkpoint `f6c14e8`. Esse checkpoint é uma base de integração, sem atribuir a ele resultado de release ou homologação.

## Leitura literal e reconhecimento existente

`splitLessonSections` permanece intacta. O conjunto de rótulos reconhecidos continua sendo:

- `EXEMPLO FICTÍCIO`
- `APLICAÇÃO OPCIONAL`
- `CUIDADO IMPORTANTE`

As mesmas regras anteriores de delimitador, posição e texto não vazio continuam em vigor. C128 não reconhece títulos livres, Markdown, HTML ou novos rótulos. Um rótulo no começo do corpo que o parser anterior trata como texto continua sendo texto. Rótulos repetidos mantêm suas ocorrências e sua ordem; não são deduplicados.

O limite autoritativo do corpo permanece o contrato existente de até 30 mil caracteres Unicode, validado antes da renderização. A nova apresentação não acrescenta corte, resumo, conversão de caracteres ou limite de quantidade de seções. O comportamento anterior de `splitLessonSections`, inclusive o tratamento de espaços nas extremidades de seus blocos, também não foi alterado.

Para cada `section.text` retornado pelo parser:

1. Uma ou mais linhas vazias, inclusive linhas com espaços ou tabulações, delimitam parágrafos.
2. Cada trecho não vazio torna-se um elemento `p.lesson-paragraph`, preenchido exclusivamente por `textContent`.
3. Os caracteres do delimitador ficam como nós de texto entre os parágrafos. A concatenação dos nós de conteúdo reconstrói exatamente `section.text`.
4. Quebras simples, CRLF, indentação interna, caracteres combinantes e caracteres astrais permanecem nos trechos originais.

O CSS `white-space: pre-wrap` mantém as quebras simples visíveis. Não há interpretação de marcação nem links extraídos do conteúdo. O texto completo continua visível, sem acordeão, passos obrigatórios ou requisito de concluir uma revisão.

## Índice e acessibilidade

O índice aparece no início de `.lesson-text`, depois do título principal da aula e antes de seu conteúdo. A condição é a existência de duas ou mais ocorrências de headings reconhecidos. Aulas sem esse conjunto mantêm apenas seu conteúdo e seus parágrafos.

O índice usa um `nav` identificado como “Índice das seções desta aula”, com o texto “Nesta aula”, uma lista ordenada e botões nativos. Os textos dos botões são os mesmos textos dos respectivos `h4`, sem substituição ou abreviação. Enter e Espaço usam o comportamento nativo do botão; não foram criados atalhos de teclado.

Os headings recebem `tabindex="-1"` e IDs gerados a partir de curso, aula, geração da leitura e posição da seção. Nenhuma palavra do material é usada na construção de IDs. Mesmo labels repetidos apontam para elementos diferentes. O botão declara o alvo em `aria-controls` e em `data-lesson-section-id`.

A ativação válida executa `focus({preventScroll: true})` no heading e depois `scrollIntoView({block: "start", behavior: "auto"})`. O deslocamento é imediato, sem animação imposta. O heading mantém margem de rolagem e o indicador global de foco. O índice cabe na coluna da aula, e os botões permitem quebra de linha no layout móvel.

| Elemento | Seletor estável |
|---|---|
| Região de índice | `.lesson-text [data-lesson-sections]` |
| Ação de salto | `.lesson-text [data-lesson-section-id]` |
| Heading de destino | `.lesson-text h4[data-lesson-section]` |
| Parágrafo literal | `.lesson-paragraph` |

O foco da origem da ajuda contextual continua disponível no wrapper `.lesson-text`, que mantém seu `tabIndex=-1` anterior. C128 não altera o painel de ajuda nem sua fonte.

## Autoridade e ações antigas

Cada ação captura o curso, a aula, `courseRequest` e `lessonRequest` existentes no momento da renderização. Antes de atuar, exige simultaneamente:

- Acesso ainda permitido e biblioteca autorizada.
- Curso ainda presente no catálogo atual.
- Mesmo curso, mesma aula e mesmas gerações de solicitação.
- Wrapper, botão e heading conectados ao documento.
- Wrapper pertencente ao conteúdo atual da aula, com botão e heading ainda dentro dele.

Assim, um botão retirado da página ou mantido por uma referência antiga não pode comandar foco ou rolagem após troca de curso, aula, filtro ou revogação. Reabrir a mesma aula também gera novos destinos e torna o índice anterior inerte.

Existe uma segunda verificação depois de `focus()`: o foco pode acionar outro handler de navegação sincronicamente. Se o contexto mudou nesse intervalo, o heading antigo não recebe a rolagem. O scroll só ocorre quando o foco efetivamente permaneceu no destino esperado.

A reautorização existente da biblioteca preserva a aula corrente quando obtém sucesso. C128 respeita esse comportamento: bloqueia saltos enquanto `libraryReady` é falso e permite o mesmo destino após sucesso apenas se curso, aula e gerações continuarem válidos. Não associa a validade do índice a tokens de favoritos, exportação ou atualização do progresso.

## Independência dos demais fluxos

O índice atua somente no DOM já autorizado. Não faz chamadas de API, não muda hash ou URL, não acessa armazenamento persistente, não registra visualização, tempo, rolagem ou posição de leitura, e não marca conclusão.

O corpo e o índice continuam a ser removidos pelos caminhos existentes de troca de seleção e revogação. C128 não altera `api`, `discardErrorBody`, validação HTTP, início ou encerramento de conclusão, busca, favoritos, histórico ou posição guardada. Não há alteração de backend, rota, schema, grants, exportação v1, Portal ou provider de Tutor.

A funcionalidade não depende da implementação de C127. C127 trata o foco associado à navegação entre cursos e aulas; C128 trata apenas um salto síncrono dentro da aula corrente. A integração deve preservar os cancelamentos de intenção antiga por interação/foco de C127, sem transformar um salto de seção em uma nova navegação.

## Verificações executadas

### Funções reais em Node VM — 34 cenários aprovados

`scripts/check-lesson-sections.mjs` executa o script completo da view e seus handlers. Somente a chamada de inicialização automática é retirada; DOM e HTTP são as fronteiras sintéticas.

A cobertura verifica:

- Ausência de índice quando não há duas seções reconhecidas; regras do parser existente preservadas.
- Labels exatos, ordem, ocorrência repetida, IDs únicos e semântica nativa dos controles.
- Reconstrução literal dos blocos e parágrafos visíveis, com CRLF, linhas vazias, indentação, Unicode e HTML/Markdown inertes.
- Corpo válido com 30 mil codepoints, sem cortar o último caractere astral.
- Foco e rolagem no alvo exato, sem requisição, mudança de URL, armazenamento ou alteração do estado de estudo.
- Guards de curso, aula, catálogo, geração, autoridade, conexão e pertencimento ao wrapper.
- Navegação síncrona disparada por foco, nova geração da mesma aula e leitura de aula pendente.
- Filtros existentes, reautorização da biblioteca, 403/419 e JSON tardio após revogação.

O checker principal existente também passou. A única adaptação nele troca dois asserts estáticos da construção de um único parágrafo/heading por asserts equivalentes da construção semântica atual. Os contratos e os asserts dos demais fluxos foram preservados.

### Chromium — 20 verificações preparadas, execução pendente

`scripts/qa-browser-lesson-sections.cjs` exporta a mesma assinatura dos módulos existentes:

```js
module.exports = async function ({browser, base, ensureLocalPage, check, pageErrors}) { /* ... */ }
```

O módulo usa contexto isolado, rotas por página e a view real. As verificações incluem quantidade de seções, conteúdo literal, alvos, clique, Enter, Espaço, preservação de estado/URL, largura de 390 pixels, CRLF, marcação inerte, limite Unicode, repetição de labels, troca de aula/filtro, nova geração, 403/419 e resposta tardia após revogação.

As esperas e o cleanup possuem prazo. Uma resposta retida é liberada no `finally`; a requisição tardia é observada por settlement da função real, estado da página e `networkidle`, sem `Response.finished`.

`node --check` do módulo e `git diff --check` passaram. Não houve execução local de Chromium, PHP, PostgreSQL, servidor de laboratório ou serviço real. A contagem de 20 descreve verificações preparadas, não resultado de CI.

## Integração preparada com C127 e Laravel

O checker e o módulo foram conectados aos runners principais, preservando
C126 e os guards de foco de C127. A suíte principal completa passou, incluindo
os 34 cenários de seções e os 64 de foco. O harness de C128 recebeu primitivas
de documento/janela para os observadores de C127, sem remover asserções.

O percurso Laravel real prepara seis verificações adicionais sobre o material
fictício já criado pelo editor: três rótulos e quatro parágrafos exatos, clique,
Enter, Espaço, preservação do estado privado/URL sem requisições e leitura a
390 pixels. Capturas de `.lesson-text` em desktop e celular registram o índice
e o corpo completo. Não foi alterado o bootstrap, a identidade sintética ou
o conteúdo da fixture para acomodar o teste. A sintaxe do runner passou;
execução e inspeção das novas capturas continuam pendentes da CI integrada.

## Integração e limites

O coordenador integra o novo checker ao principal, o módulo ao runner sintético e o percurso real após revisão. Nenhum runner ou workflow foi alterado neste incremento isolado.

Arquivos entregues:

- `resources/views/university/student.blade.php`: CSS e `lessonTextFragment`.
- `scripts/check-ui-contract.mjs`: dois asserts semânticos adaptados.
- `scripts/check-lesson-sections.mjs`: 34 cenários reais de VM.
- `scripts/qa-browser-lesson-sections.cjs`: 20 verificações Chromium preparadas.
- Este documento.

Não foi efetuado stage, commit, push ou deploy por este trabalho. Revisão visual e confirmação de navegador dependem da integração e de sua rodada de CI; nenhum resultado foi presumido.

## Confirmação integrada em 18/11/2026

O [run 44225106281](https://github.com/rafhael100/imagine-universidade/actions/runs/44225106281), no SHA **8099229f696331625264e2792d0c3b75a937ff3a**, aprovou os **seis jobs**. A suíte completa registrou **683 verificações Chromium** e **206 verificações pelo Laravel/SQLite real**, com persistência aprovada e sem respostas de negócio simuladas nesse segundo percurso.

O módulo C128 completou **20 verificações Chromium** e o percurso real confirmou **6 verificações** de índice e parágrafos. As capturas reais do índice e do corpo foram inspecionadas em 1440 e 390 px: texto literal completo, botões legíveis e disposição sem transbordamento horizontal.

Esta evidência substitui as pendências de execução descritas na preparação acima somente para esse SHA. Não valida alterações posteriores e não altera revisão humana, integração operacional, os 13 gates HOLD_NO_GO ou a proibição de merge/deploy.
