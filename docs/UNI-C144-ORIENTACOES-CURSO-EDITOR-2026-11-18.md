# C144 — orientações opcionais no editor de cursos

**Data:** 18/11/2026 · **Base:** `b29f06e8a71f68d8d10129e88a8b66f8ce7fe6ad`, com C141–143.

## Capacidade entregue

O editor recebe os campos **Para quem** (`audience`) e **Conhecimentos úteis**
(`suggested_knowledge`). Eles concretizam a orientação de público e os
pré-requisitos informativos previstos em BASE-UNI-03-01/03-05. Os campos são
opcionais, permanecem vazios quando não há informação e não criam uma condição
para estudar ou publicar o curso.

Os textos pertencem ao cadastro atual do curso. Não são apresentados como
snapshot de uma versão histórica. A consulta de aulas arquivadas continua
separada e não recebe esses campos neste recorte.

| Campo da API | Controle estável | Rótulo |
| --- | --- | --- |
| `audience` | `#course-audience` | Para quem |
| `suggested_knowledge` | `#course-suggested-knowledge` | Conhecimentos úteis |

Ambos são textareas associados a uma explicação comum, que informa o caráter
opcional e o limite de 500 caracteres. Não há conteúdo pré-preenchido novo,
novo endpoint ou gravação automática.

## Contrato de leitura e escrita

O normalizador editorial aceita campo ausente ou `null` e o representa como
string vazia no formulário. Strings de até 500 caracteres Unicode são mantidas
literalmente; tipos inválidos e valores maiores tornam inválido o catálogo
inteiro. Não há corte de conteúdo nem aceitação parcial de uma resposta.

Os textareas não usam `maxlength`: o limite nativo contaria unidades UTF-16 e
poderia impedir 500 caracteres fora do plano básico, embora fossem válidos no
backend. Antes da escrita, a interface conta os caracteres com `Array.from`.
A verificação inicial de 1.000 unidades UTF-16 apenas evita construir um array
para uma string que certamente ultrapassa 500 caracteres; nenhuma string de
até 500 caracteres Unicode é excluída por essa verificação.

Se o texto exceder o limite, a interface mantém os dois formulários, informa
qual campo deve ser reduzido e devolve o foco a ele. Não inicia HTTP, não ativa
a escrita pendente e não transforma uma validação local em resultado incerto.
Espaços externos são retirados ao compor o payload, conforme o comportamento
dos demais textos do formulário; o buffer visível não é modificado por essa
validação.

| Operação | Campo vazio | Campo preenchido |
| --- | --- | --- |
| Criação | Omite a chave; o backend aplica `null` | Envia a string |
| PATCH sem mudança nesse campo | Omite a chave | Omite a chave |
| PATCH com edição explícita | Envia `null` para limpar | Envia a nova string |

A baseline dos dois campos é capturada antes de `beginWrite()`, junto à
baseline da ordem. Cada orientação é comparada separadamente, considerando o
texto sem espaços externos. Assim, alterar só o título, resumo ou ordem não
reenvia orientações anteriores, e uma limpeza não apaga o campo irmão.

Os recibos C136, a precondição de ordem C137 e a sequência de consultas após
salvar continuam sendo usados. Não há consulta preventiva ou repetição de
uma escrita incerta.

## Preservação dos rascunhos e publicação

Os dois campos participam de:

- preenchimento a partir do curso autorizado e bloqueio de edição em curso
  publicado, catálogo indisponível ou resultado de escrita incerto;
- detecção de alterações não salvas, confirmação de descarte na troca de
  curso e aviso ao sair da página;
- guarda de publicação e invalidação do preflight pelo evento `input` já
  existente no formulário do curso;
- snapshot literal C129, que passa a conter sete campos de curso e quatro
  campos de aula, preservando a proteção durante reordenação;
- preservação do formulário irmão C113: salvar a aula primeiro mantém
  literalmente as duas orientações ainda não salvas;
- limpeza por revogação 403/419 e recuperação manual autorizada.

O hash continua opaco. A interface envia o `content_hash` retornado pela
conferência atual e não implementa cálculo de hash. O backend C144 inclui os
dois textos no hash verificado sob lock; a aprovação editorial independente
continua com suas exigências anteriores.

## Verificação local

`scripts/check-editorial-course-context.mjs` executa o script completo da view
e seus handlers reais, substituindo somente DOM, diálogos e HTTP por fixtures.
**16 cenários passaram.** Eles cobrem compatibilidade de leitura, allowlist,
Unicode 500/501, criação, omissão e limpeza independente, orientação atualizada
em outra sessão, descarte, rascunhos irmãos, preflight atrasado, hash opaco,
snapshot de reordenação, resposta incerta, catálogo inválido e revogação.

Os 11 checkers editoriais existentes também passaram individualmente, sem
alteração de suas fixtures ou asserts: conferência de publicação, preservação
de rascunhos, visão do acervo, versões arquivadas, filtros de cursos e aulas,
reordenação, PATCH de aula e curso, recibos editoriais e auditoria.

O checker principal foi executado e parou na expectativa anterior do DTO
normalizado de curso. Essa expectativa ainda não contém `audience:''` e
`suggested_knowledge:''`; a adaptação foi comunicada ao root, responsável pelo
arquivo. Não se declara o principal integralmente aprovado neste worktree.

`node --check scripts/qa-browser-editorial-course-context.cjs` e
`git diff --check` passaram. Não houve execução local de PHP, PostgreSQL ou
navegador.

## Ensaio de navegador preparado

`scripts/qa-browser-editorial-course-context.cjs` prepara **13 verificações**
no módulo chamado pelo runner sintético existente. Cada página possui suas
fixtures e rotas. O ensaio cobre controles nativos em 390 px, edição Unicode
sem truncamento, criação e limpeza, omissão no PATCH, preservação dos dois
formulários, publicação com hash retornado, campos publicados somente leitura,
recuperação manual e 403/419.

O módulo configura oito segundos para interações e esperas, quinze segundos
para navegação e oito segundos para encerramento de páginas/contexto. Não
inicia servidor ou navegador por conta própria e não usa observadores do corpo
de respostas de erro para confirmar uma ação. Sua execução permanece pendente
na CI; os números acima descrevem checks preparados, não aprovação do browser.

## Integração e limites do recorte

Arquivos próprios: view editorial, checker focal, módulo Chromium e este
documento. Backend, view do aluno, runner principal/real e README pertencem às
outras frentes da C144 e não foram alterados aqui.

O root precisa importar o focal e registrar o módulo no runner, além de
acrescentar os dois campos vazios à expectativa de allowlist editorial em
`scripts/check-ui-contract.mjs`. A validação permanece autocontida em
`validatedAdminCourses`, sem dependência de novo helper para extratores.

Não houve alteração de gates, bindings Portal, permissões ou política de
retenção; não houve stage, commit, push ou implantação por esta frente.

## Evidência do SHA integrado C144

A execução [Actions 44239547982](https://github.com/rafhael100/imagine-universidade/actions/runs/44239547982), no SHA `33e89a34c6fabc22df63e968a164589caf377479`, concluiu os seis jobs com sucesso: **400 testes PHP / 5.325 asserções** (39 Unit/169 e 361 Feature/5.156), **17 invariantes PostgreSQL**, **837 verificações Chromium sintéticas** e **259 verificações no Laravel real**, com persistência aprovada. Os nove métodos Feature, a verificação das colunas opcionais, os 33 checks sintéticos e os 14 da jornada preparados acima foram executados.

As quatro capturas reais de editor e aluno foram examinadas em desktop e 390 px: campos e rótulos legíveis, texto literal e quebras preservadas, sem transbordamento horizontal. O artefato `14398524869` foi baixado e verificado pelo SHA-256 `9693271925084ed24b2dfa889ab2426a7ef8829380605f4ecacad1d95df84301`. Esse resultado substitui a pendência de runtime descrita na preparação; a PR continua em rascunho e os gates operacionais permanecem `HOLD_NO_GO`/`NOT_VERIFIED`.
