# C144 — integração das orientações opcionais do curso

Data: 18/11/2026. Base integrada: `b29f06e8a71f68d8d10129e88a8b66f8ce7fe6ad`.

## Resultado funcional

O editor pode preencher **Para quem** e **Conhecimentos úteis**, com até 500 caracteres Unicode em cada campo. Os textos são opcionais e pertencem ao cadastro atual do curso. O aluno os vê somente no curso autorizado selecionado; campos vazios não ocupam espaço. A apresentação é literal, preserva quebras de linha e não condiciona a abertura ou a conclusão de aulas.

O recorte atende à orientação de público e aos pré-requisitos informativos de BASE-UNI-03-01/03-05. Não altera a taxonomia atual do MVP nem preenche automaticamente conteúdo editorial. Os contratos estão detalhados nos documentos de [backend](UNI-C144-ORIENTACOES-CURSO-BACKEND-2026-11-18.md), [editor](UNI-C144-ORIENTACOES-CURSO-EDITOR-2026-11-18.md) e [aluno](UNI-C144-ORIENTACOES-CURSO-ALUNO-2026-11-18.md).

## Compatibilidade e publicação

A migration adiciona duas colunas opcionais aos cursos existentes, inicialmente nulas. O PATCH omite cada orientação inalterada; somente a edição explícita substitui ou limpa o campo. Uma alteração em outro dado do curso conserva o texto atual, inclusive quando outra sessão já o atualizou. Não existe compare-and-swap geral de texto: a proteção de concorrência da ordem permanece com seu contrato anterior.

Os dois campos participam do hash de conferência, comparado sob o lock já existente. Uma conferência emitida antes desta mudança precisa ser refeita, inclusive em cursos com os campos vazios. A interface continua tratando o hash como opaco. Cursos publicados permanecem somente para leitura até a retirada autorizada. As orientações não passam a representar metadados históricos de uma versão arquivada.

A leitura usa o catálogo já autorizado, sem novo endpoint, consulta extra do aluno, cache ou armazenamento no navegador. Atualização pendente, falha da lista, troca, retirada e revogação limpam o painel conforme as guardas existentes. Uma atualização válida do curso preserva o leitor, foco, rascunho da pergunta, filtros e referências pessoais.

## Integração e revisão

Os quatro extratores antigos do aluno e o checker principal receberam a função real `renderCourseGuidance`, com sua dependência existente `lessonFilterCurrent`. As expectativas de allowlist passaram a incluir os dois campos normalizados vazios; os campos internos continuam excluídos. O assert do aluno compara objetos após JSON round-trip para não depender da ordem das propriedades ou do realm. A primeira execução integrada parou apenas na ordem das propriedades da string esperada do editor; a expectativa foi corrigida e a segunda execução completa passou.

Os novos focais e módulos foram registrados uma vez nos runners existentes. A revisão independente liberou backend, interfaces, checkers, documentação e as adaptações mecânicas. O coordenador revisou os módulos Chromium e o delta da jornada Laravel. Nenhum guard, bootstrap, workflow, grant ou binding foi alterado.

## Verificação local concluída

| Verificação | Resultado |
| --- | --- |
| `node scripts/check-ui-contract.mjs` | PASS completo, incluindo os 16 cenários novos do editor e os 32 do aluno, além dos focais anteriores. |
| Sintaxe JavaScript | PASS nos dois focais, dois módulos novos e dois runners modificados. |
| Cerca de escrita | PASS nos mesmos 15 caminhos HTTP com revalidação Portal na transação. |
| `git diff --check` | PASS. |

Não houve execução local de PHP, PostgreSQL, Docker ou navegador. A execução anterior [44237563589](https://github.com/rafhael100/imagine-universidade/actions/runs/44237563589), da base C141–C143, aprovou os seis jobs com 391 testes PHP/5.128 asserções, 804 verificações sintéticas e 245 no Laravel real; esses números não são apresentados como resultado da C144.

## Runtime preparado, pendente da CI deste recorte

- Nove métodos Feature exercitam HTTP, migrations, validação Unicode, omissão/limpeza, hash, publicação/retirada, escopos, autoridade, leitura sem escrita e rollback dos campos opcionais.
- O probe PostgreSQL preserva as 16 invariantes anteriores e acrescenta uma verificação somente de leitura das duas colunas `varchar(500)` anuláveis.
- Os módulos Chromium acrescentam 13 checks editoriais e 20 do aluno, com fixtures por página e esperas limitadas.
- A jornada Laravel acrescenta 14 verificações usando as três identidades e os dois cursos já existentes, com respostas de negócio reais. Criação/edição usam os POST/PATCH anteriores; a única escrita adicional é a limpeza explícita de um campo em rascunho. O aluno não recebe requisições adicionais.

A jornada real mantém os payloads exatos de concorrência C137 e verifica que as orientações omitidas persistem. Os arrays de preservação recebem os campos ao final, sem mudar índices anteriores. A limpeza ocorre depois da prova anterior de invalidação do arquivo pela edição da aula, preservando sua causa. O percurso confere publicação, troca para curso sem orientações, retorno, retirada, revogação e nova autorização.

Quatro capturas estão preparadas: `framework-course-guidance-editor-desktop.png`, `framework-course-guidance-editor-mobile.png`, `framework-course-guidance-student-desktop.png` e `framework-course-guidance-student-mobile.png`, com desktop de 1440 px e celular de 390 px. Sua preparação não equivale à execução ou revisão visual.

## Limites mantidos

O trabalho permanece na PR de rascunho, sem merge, deploy, VPS, DNS ou acesso operacional. `UnavailablePortalAuthority` e `DisabledTutorGateway` continuam como padrões; os 13 gates permanecem `HOLD_NO_GO`/`NOT_VERIFIED`. A mudança não altera elegibilidade, cobrança, retenção ou dados de clientes e não cria prova, nota, certificado ou ranking.

## Evidência do SHA integrado C144

A execução [Actions 44239547982](https://github.com/rafhael100/imagine-universidade/actions/runs/44239547982), no SHA `33e89a34c6fabc22df63e968a164589caf377479`, concluiu os seis jobs com sucesso: **400 testes PHP / 5.325 asserções** (39 Unit/169 e 361 Feature/5.156), **17 invariantes PostgreSQL**, **837 verificações Chromium sintéticas** e **259 verificações no Laravel real**, com persistência aprovada. Os nove métodos Feature, a verificação das colunas opcionais, os 33 checks sintéticos e os 14 da jornada preparados acima foram executados.

As quatro capturas reais de editor e aluno foram examinadas em desktop e 390 px: campos e rótulos legíveis, texto literal e quebras preservadas, sem transbordamento horizontal. O artefato `14398524869` foi baixado e verificado pelo SHA-256 `9693271925084ed24b2dfa889ab2426a7ef8829380605f4ecacad1d95df84301`. Esse resultado substitui a pendência de runtime descrita na preparação; a PR continua em rascunho e os gates operacionais permanecem `HOLD_NO_GO`/`NOT_VERIFIED`.
