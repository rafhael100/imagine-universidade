# C143 — controles da nova aula e validade da prévia editorial

**Base de implementação:** `92d8452` · **Data:** 18/11/2026

Este recorte corrige dois comportamentos da edição já existente. Ele mantém o
fluxo de criação e revisão textual de UNI-04, a prévia local C41 e a preservação
dos formulários C113. Não acrescenta campos, endpoints, gravações ou aprovação
editorial.

## Defeitos reproduzidos

### Identificador habilitado antes de existir um curso

O comando **Novo curso** executava `fillCourse()` e depois `resetLesson()`.
`fillCourse()` desabilitava corretamente o formulário da aula sem curso salvo,
mas o reset seguinte reativava seu identificador incondicionalmente.

Era possível digitar nesse campo habilitado e tentar salvar o curso. A guarda
do formulário irmão impedia o POST e orientava salvar a aula ou usar **Nova
aula**, enquanto esses dois botões estavam desabilitados. Apagar manualmente
o identificador permitia prosseguir; não havia perda do formulário do curso.

### Prévia anterior permanecia visível depois de editar o texto

Depois de abrir **Pré-visualizar aula**, editar o título ou conteúdo não
invalidava a prévia. O painel continuava mostrando os valores anteriores sob
a explicação de que representava o formulário atual. Clicar novamente no
botão atualizava o texto, mas não havia indicação de que a exibição anterior
estava desatualizada.

As duas sequências foram reproduzidas em Node com o script real da view e o
harness editorial existente, antes desta correção. A reprodução não executou
Laravel nem navegador.

## Comportamento corrigido

`resetLesson()` calcula a disponibilidade do identificador a partir do curso
selecionado, de `draft()` e da escrita pendente. Assim, resetar o formulário não
reativa o campo sem curso, com catálogo ou aulas indisponíveis, em curso
publicado ou enquanto o resultado de uma escrita permanece incerto. A guarda
de revogação já existente continua anterior ao reset.

Quando um curso novo é salvo, as consultas autorizadas de curso e aulas
continuam habilitando o formulário de nova aula. O identificador de uma aula
já selecionada continua imutável. **Nova aula** conserva a confirmação de
descarte explícito anterior, inclusive depois de resultado incerto; a C143
apenas impede que esse reset reative o identificador nesse estado.

Eventos `input` em **Título da aula** e **Conteúdo** escondem a prévia e removem
seu corpo antigo. Os valores dos dois formulários, a seleção e as gerações de
consulta permanecem intactos. Uma nova prévia exige o clique já existente e
usa o texto atual, sem HTTP nem salvamento automático.

Editar ordem ou outros campos que não fazem parte do texto mostrado não
invalida a prévia. Busca e filtros locais conservam o comportamento anterior.
Os listeners de conferência de publicação e de ordenação permanecem no lugar.

## Regressões e verificação

O checker existente `scripts/check-editor-draft-preservation.mjs` passou com
**13 cenários**. Foram acrescentados somente dois cenários:

1. Novo curso deixa todos os controles da aula indisponíveis, permite salvar
   o curso e habilita a nova aula após as consultas autorizadas.
2. Editar título e corpo invalida a prévia sem substituir qualquer formulário
   nem emitir HTTP; editar a ordem conserva a prévia, e um novo clique mostra
   o texto atual.

O cenário existente de resposta incerta também passou a conferir cancelamento
e aceite do descarte local: os campos do curso ficam preservados, o
identificador continua desabilitado e não há nova requisição nem liberação da
barreira de escrita.

O módulo existente `scripts/qa-browser-editor-drafts.cjs` tem **quatro checks
adicionais preparados**, totalizando 19. A extensão usa uma página com fixture
própria em 390 px para conferir os controles nativos desabilitados, criação do
curso, eventos de edição, prévia textual atual e ausência de HTTP nas ações
locais. As 15 verificações anteriores continuam presentes. Este módulo não
foi executado localmente; sua execução Chromium depende da CI.

Verificações locais concluídas:

- `node scripts/check-editor-draft-preservation.mjs` — PASS, 13 cenários.
- `node scripts/check-ui-contract.mjs` — PASS completo, incluindo os checkers
  editoriais e de aluno já integrados na base.
- `node --check scripts/qa-browser-editor-drafts.cjs` — PASS.
- `git diff --check` — PASS.

Não houve execução local de PHP, PostgreSQL ou navegador. Os resultados acima
não antecipam a CI nem a homologação operacional.

## Integração

O runner e o checker principal já chamam os dois arquivos estendidos; não é
necessário registrar um módulo novo. Nenhum extrator ou fixture legado precisou
ser adaptado. A view muda somente no reset e nos dois listeners de prévia;
os trechos de auditoria ficam fora deste recorte.
