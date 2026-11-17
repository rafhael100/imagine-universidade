# UNI C-112 — Ajuda contextual da aula com contingência estática

**17/11/2026 · Proposta em branch privada, sem ativação operacional ou deploy.**

## Finalidade e escopo aprovado

A área do aluno passa a oferecer **Ajuda desta aula**, disponível depois que o detalhe e o progresso foram validados. O aluno pode rever trechos do material ou enviar uma dúvida educativa ao endpoint de Tutor já existente. Quando a tutoria está indisponível, a interface mantém uma consulta útil ao conteúdo da própria aula.

O avanço atende ao método de revisão voluntária de **BASE-UNI-02-02/03/05**, à orientação contextual e contingência de **BASE-UNI-05-01/03/06**, e à busca educativa com fonte e separação de suporte de **BASE-UNI-10-01/03/04/06**. São referências funcionais, sem alegação de homologação integral desses módulos. A vinculação entre telas de outros produtos e códigos de contexto de UNI-09 continua dependendo de contrato específico.

Fontes de escopo: [UNI-02](10-modulos/UNI-02.md), [UNI-05](10-modulos/UNI-05.md), [UNI-10](10-modulos/UNI-10.md), [política P0-07](00-governanca/DECISAO-UNI-P0-07-AGENTES-IA-2026-11-04.md) e [contrato preparatório C-38](UNI-C38-CONTRATO-TUTOR-SOMENTE-LEITURA-2026-11-15.md).

## Comportamento entregue

1. **Revisão direta:** “Rever trechos da aula” funciona sem requisição ao Tutor. Com uma dúvida escrita, procura palavras no material atual; sem dúvida, mostra os primeiros trechos para revisão.
2. **Consulta voluntária:** o formulário aceita de 3 a 500 caracteres Unicode, desconsiderando espaços externos. Uma consulta só ocorre ao enviar o formulário. O corpo contém apenas `question`, enviado por POST ao endpoint da aula atual.
3. **Fonte da resposta:** uma resposta recebida precisa trazer texto não vazio e `source.lesson_slug` e `source.course_version` exatamente iguais aos da aula aberta. Campos adicionais são descartados. O limite de 12.000 bytes UTF-8 corresponde ao `strlen` aplicado pelo controller PHP.
4. **Apresentação:** tanto a orientação quanto os trechos são inseridos como texto no DOM. Marcação HTML recebida é exibida literalmente. A referência mostra o título e a versão da aula; “Voltar ao texto desta aula” leva o foco ao texto já aberto.
5. **Contingência:** falhas temporárias, inclusive 503 e 429, oferecem trechos literais relacionados à pergunta. O painel identifica essa apresentação como material da aula. Se não há correspondência, informa a limitação e oferece revisão do texto completo.
6. **Fonte retirada:** HTTP 404 não exibe trechos de contingência. O aluno pode reabrir as aulas do curso por ação manual, mantendo o ID da aula como alvo exato.
7. **Estudo livre:** consultar ajuda não marca conclusão, não altera notas e não impõe pré-requisito. Ler, concluir e navegar continuam disponíveis durante indisponibilidade da tutoria.

O painel orienta a usar exemplos fictícios e deixar de fora dados de clientes, senhas e informações pessoais. Falhas técnicas e solicitações de conta são encaminhadas em texto ao suporte oficial pelo Portal, sem inventar URL, chamado ou integração de suporte.

## Recuperação literal do material

`lessonHelpExcerpts` examina somente o corpo da aula já validada. A comparação local usa palavras da pergunta, normalização de acentos e uma pequena lista de termos comuns que não ajudam a localizar conteúdo. A ordenação usa a quantidade de palavras encontradas e preserva a ordem da fonte nos empates.

O painel mostra no máximo três trechos correspondentes à dúvida, ou quatro trechos na revisão direta sem pergunta. Cada trecho tem até 700 caracteres Unicode; janelas sobrepostas permitem localizar termos no fim de parágrafos longos. Trechos parciais são identificados e sempre remetem ao texto completo.

Essa busca é literal. Não produz explicações novas, não infere conhecimento ausente e não acrescenta conteúdo de outra aula. A ausência de correspondência é um resultado válido.

## Fronteiras preservadas

- `TutorGateway` permanece vinculado a `DisabledTutorGateway`; nenhum modelo, fornecedor, credencial, ferramenta operacional ou egress foi habilitado.
- A API mantém a escolha da fonte publicada no servidor, autorização vigente do Portal e revalidação da fonte após a consulta ao gateway. Nesta rodada, o controller também executa `freshGrant` e relê a fonte quando o gateway lança exceção: revogação ou retirada da aula durante a falha retorna 403, sem liberar a contingência de 503 para uma fonte inválida.
- O formulário é single-flight. Cliques repetidos não iniciam outra consulta enquanto a atual está pendente. Não há envio, repetição ou consulta automática ao abrir a aula.
- O contexto captura curso, aula e `lessonRequest`. Navegação, nova seleção, filtro, indisponibilidade da biblioteca e revogação impedem que respostas antigas restaurem ajuda ou material.
- HTTP 403/419 conserva o fluxo de `lockAccess`, que limpa a área privada e bloqueia novas ações. Selecionar material estático enquanto uma consulta está pendente não permite contornar essa revogação.
- Pergunta e resposta ficam apenas no painel atual. Não foi criado histórico, armazenamento local, indexação, persistência ou envio a sistemas externos.
- A leitura estática de material e a marcação de conclusão continuam independentes da disponibilidade do Tutor.

`api()` passa a preservar `httpStatus` no objeto `Error` para distinguir fonte ausente de indisponibilidade temporária. O comportamento de autorização e as mensagens genéricas existentes permanecem sob o mesmo fluxo.

## Verificação implementada

`scripts/check-student-help.mjs` executa as funções e handlers reais extraídos de `student.blade.php`, com DOM e respostas HTTP controlados. **40 cenários passaram localmente**, abrangendo:

- allowlist, origem e versão exatas, ausência de fonte e respostas malformadas;
- limite de 500 caracteres Unicode na pergunta e de 12.000 bytes UTF-8 na resposta;
- conteúdo literal, ausência de correspondência e preservação de caracteres astrais;
- consulta somente por ação explícita, single-flight e repetição manual;
- HTML recebido como texto, sem elementos executáveis;
- contingência 503/429 com leitura e conclusão disponíveis;
- respostas atrasadas após navegar, filtrar, selecionar novamente ou perder acesso;
- revogação 403/419 e fonte ausente 404 com reabertura do alvo correto.

O checker é verificável com `node scripts/check-student-help.mjs`. Ele não executa modelo, Portal real ou serviço operacional.

Dois testes Feature adicionais em `PortalBoundaryFlowTest.php` verificam a integração do controller: falha do gateway combinada com revogação de acesso e falha combinada com retirada da fonte. Ambos exigem HTTP 403, ausência do detalhe interno da falha e nenhum registro de conclusão. Sua execução pertence ao QA PHP da branch; a implementação não os apresenta como homologação de um provedor real.

## Contrato para QA Chromium

| Elemento | Seletor |
|---|---|
| Painel contextual | `[data-lesson-help]` |
| Dúvida | `#lesson-help-question` |
| Envio | `#lesson-help-submit` |
| Área de resultado | `#lesson-help-answer` |
| Revisão estática | `[data-help-static]` |
| Referência à aula aberta | `[data-help-source]` |
| Recuperação de fonte ausente | `[data-help-reload]` |

A resposta positiva da fixture deve ser `{reply: "texto sintético", source: {lesson_slug: "visitas-ficticias", course_version: 1}}` para a aula 11 já usada pelo laboratório. O modo padrão deve continuar sendo HTTP 503. Casos de navegador devem observar: zero POST antes de ação explícita; material útil no 503; resposta válida e HTML literal; rejeição de fonte incompatível; pergunta de 500 caracteres astrais; single-flight; resposta atrasada após navegação/filtro; e limpeza por 403/419. A fixture 404 deve oferecer recuperação manual sem trechos antigos.

O cabeçalho do painel usa `h4` e suas ações usam `secondary`; os seletores anteriores `#lesson-content h3` e `#lesson-content button.primary` continuam identificando, respectivamente, título da aula e conclusão.

**Limite de evidência:** a execução Chromium oficial e os gates integrados pertencem à rodada de QA da branch. A aprovação de P0-07 continua sendo política-base; esta entrega não declara IA real, Portal operacional, homologação de fornecedor ou prontidão para deploy.
