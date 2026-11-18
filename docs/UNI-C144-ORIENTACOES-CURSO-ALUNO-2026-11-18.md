# C144 — Orientações opcionais na abertura do curso

Data de referência: 18/11/2026. Base do recorte do aluno: `b29f06e8a71f68d8d10129e88a8b66f8ce7fe6ad`, que inclui C141–143. Este documento descreve a interface do aluno; o cadastro editorial e o transporte dos campos pelo servidor são recortes separados da C144.

## Finalidade e contrato

Os requisitos BASE-UNI-03-01 e BASE-UNI-03-05, registrados em `docs/10-modulos/UNI-03.md`, preveem público do curso e pré-requisitos informativos, sem bloqueio acadêmico obrigatório. A interface passa a apresentar duas orientações opcionais recebidas no catálogo autorizado:

| Campo de `GET /courses` | Rótulo | Tratamento |
| --- | --- | --- |
| `audience` | Para quem | Ausente ou `null` normaliza para `""`; string com até 500 caracteres Unicode. |
| `suggested_knowledge` | Conhecimentos úteis | Ausente ou `null` normaliza para `""`; string com até 500 caracteres Unicode. |

O limite usa o contador por pontos de código já existente em `studentText`, compatível com os limites Unicode do contrato. Uma string de 500 caracteres astrais é válida, embora ocupe 1.000 unidades UTF-16. Valores de outro tipo e strings com 501 caracteres invalidam a resposta do catálogo inteira; não há coerção nem aceitação parcial. As demais regras do normalizador continuam em vigor, inclusive IDs seguros, categorias, duplicatas, totais de aulas e allowlist.

Uma string vazia ou composta apenas de espaços e quebras é válida, mas não ocupa um bloco visual. Quando houver texto, ele é atribuído literalmente com `textContent`: espaços, quebras de linha, caracteres Unicode e sinais de HTML/Markdown são preservados. O CSS usa `white-space: pre-wrap` e `overflow-wrap: anywhere`. Não existe interpretação de marcação, resumo ou preenchimento de conteúdo pela interface.

## Apresentação e ciclo de vida

O painel aparece na área do curso selecionado, após a ação de favorito e antes da localização/lista de aulas. Tem o título **Orientações do curso** e a nota **Orientações opcionais para o estudo.** Cada rótulo só aparece quando seu campo contém texto; se ambos estiverem vazios, o painel inteiro fica oculto.

Seletores estáveis para a integração:

| Seletor | Conteúdo |
| --- | --- |
| `#course-guidance` | Painel completo. |
| `#course-guidance-audience` | Somente o texto de `audience`. |
| `#course-guidance-knowledge` | Somente o texto de `suggested_knowledge`. |
| `#course-guidance-audience-group` | Rótulo Para quem e seu texto. |
| `#course-guidance-knowledge-group` | Rótulo Conhecimentos úteis e seu texto. |

`renderCourseGuidance` deriva a apresentação do catálogo atual validado e do proprietário da lista de aulas, já verificado por `lessonFilterCurrent`. Não adiciona cache nem estado global. A orientação pertence ao cadastro atual do curso; ela não é apresentada como metadado de uma versão arquivada e não é copiada para históricos ou arquivos privados.

O bloco fica vazio e oculto antes da seleção, enquanto a biblioteca é atualizada ou a lista do novo curso está pendente, quando essa lista falha, quando a seleção é descartada e após revogação. Uma lista validada vazia pode apresentar orientações do curso mesmo sem aulas publicadas. Respostas antigas de outro curso não conseguem restaurar orientações, pois os guards existentes descartam essa lista antes de liberar seu proprietário.

A atualização válida do catálogo pode mudar ou remover as orientações sem recriar o corpo da aula. O curso presente conserva seleção, gerações de navegação, elemento do leitor, pergunta ainda não enviada, foco e consulta local das aulas. A omissão do curso segue a reconciliação C130; 403/419 seguem a purga existente. A conclusão confirmada permanece confirmada quando o catálogo posterior muda ou retira o curso.

As orientações não alteram a autorização para abrir ou concluir aulas. Sua exibição não cria controles de aceite, ranking, gravação de navegação, requisição adicional, armazenamento local ou mudança na exportação de progresso, favoritos e posição.

## Integração dos checks existentes

Este recorte modifica somente a view do aluno e adiciona seu checker, módulo Chromium e este documento. A integração dos runners e dos extratores antigos pertence ao coordenador:

1. Incluir a função real `renderCourseGuidance` nos extratores de `check-student-help.mjs`, `check-student-favorites.mjs`, `check-student-favorites-export.mjs` e no conjunto do aluno de `check-error-body-cleanup.mjs`. Todos já incluem `lessonFilterCurrent`, dependência da função nova.
2. Em `check-ui-contract.mjs`, disponibilizar a função no conjunto executado pelos fluxos do aluno e acrescentar `audience: ""` e `suggested_knowledge: ""` à expectativa normalizada da allowlist. Preservar os asserts de exclusão dos demais campos.
3. Importar `check-student-course-guidance.mjs` e chamar `qa-browser-student-course-guidance.cjs` com a assinatura já utilizada pelos módulos: `{browser, base, ensureLocalPage, check, pageErrors}`.

As fixtures HTTP legadas podem continuar omitindo os campos. Os checkers que executam o script completo da view recebem os novos elementos e a função automaticamente. O checker do limite de versão da exportação de progresso não extrai os hooks modificados e não requer alteração.

## Verificação desta entrega

- `node scripts/check-student-course-guidance.mjs`: **32 cenários passaram**, executando o script completo e os handlers reais da view, com DOM e HTTP sintéticos. A cobertura inclui campos opcionais, tipos JSON, Unicode 500/501, literalidade, allowlist, curso vazio, mudança de curso, respostas antigas, recuperação manual, catálogo retirado, preservação exata do leitor/foco, filtros, conclusão e revogação.
- `node --check scripts/qa-browser-student-course-guidance.cjs`: sintaxe válida. O módulo prepara **20 checks Chromium**, em contexto isolado e com rotas por página, incluindo a largura de 390 px, texto literal, quantidades exatas das leituras existentes, recuperação, preservação do leitor e resposta tardia após revogação. As interações e esperas de página usam 8 s; navegação usa 15 s. Início/término de operações retidas e limpeza têm limite explícito de 8 s, com liberação dos gates pelos cenários e no `finally`.
- `git diff --check`: passou.

Não foram executados navegador, PHP, PostgreSQL ou serviços locais. Os 20 checks Chromium estão preparados, sem resultado de CI presumido. A suíte principal depende das adaptações mecânicas acima e será executada na integração, junto ao percurso Laravel real coordenado fora deste recorte.

## Evidência do SHA integrado C144

A execução [Actions 44239547982](https://github.com/rafhael100/imagine-universidade/actions/runs/44239547982), no SHA `33e89a34c6fabc22df63e968a164589caf377479`, concluiu os seis jobs com sucesso: **400 testes PHP / 5.325 asserções** (39 Unit/169 e 361 Feature/5.156), **17 invariantes PostgreSQL**, **837 verificações Chromium sintéticas** e **259 verificações no Laravel real**, com persistência aprovada. Os nove métodos Feature, a verificação das colunas opcionais, os 33 checks sintéticos e os 14 da jornada preparados acima foram executados.

As quatro capturas reais de editor e aluno foram examinadas em desktop e 390 px: campos e rótulos legíveis, texto literal e quebras preservadas, sem transbordamento horizontal. O artefato `14398524869` foi baixado e verificado pelo SHA-256 `9693271925084ed24b2dfa889ab2426a7ef8829380605f4ecacad1d95df84301`. Esse resultado substitui a pendência de runtime descrita na preparação; a PR continua em rascunho e os gates operacionais permanecem `HOLD_NO_GO`/`NOT_VERIFIED`.
