# C146 — entrada Unicode na pesquisa privada de aulas

Data: 18/11/2026. Base: `33e89a34c6fabc22df63e968a164589caf377479`.

## Divergência corrigida

A pesquisa já valida de 3 a 60 caracteres Unicode, com letras, números, espaço e hífen, tanto no handler do aluno quanto no controller. Entretanto, o campo HTML tinha `maxlength="60"` e `minlength="3"`, contados em unidades UTF-16. Uma letra fora do plano básico ocupa duas dessas unidades: uma expressão válida de 60 letras poderia ser cortada para 30 na entrada nativa antes de chegar ao handler.

O campo deixa de impor esses dois limites nativos. A validação existente por pontos de código continua sendo aplicada antes de qualquer requisição e informa o intervalo permitido. `required`, rótulo, autorização, bloqueio durante consulta, normalização, paginação, privacidade e regras de caracteres permanecem. Não há novo helper, endpoint, armazenamento ou alteração do limite aceito pelo servidor.

Uma expressão acima do limite permanece visível para ser corrigida e não é enviada ou truncada. A busca anterior e seu cursor são descartados pelo tratamento já existente; o estudo aberto continua preservado.

## Verificação

O módulo Chromium C140 existente recebeu **três verificações preparadas**, reutilizando a página e o leitor já abertos:

1. Inserir nativamente 60 letras `𐐀` (120 unidades UTF-16), confirmar o valor completo e o POST privado com a expressão exata, mantendo estudo, URL, ausência de armazenamento e de escrita de aprendizagem.
2. Recusar duas letras Unicode localmente, mantendo o texto no campo e sem requisição.
3. Recusar 61 letras Unicode da mesma forma, sem página ou cursor antigo ativo.

Não foi criado novo harness. O checker `check-private-search-pages.mjs` passou com seus **34 cenários anteriores** inalterados; sintaxe do módulo e `git diff --check` passaram. A execução Chromium permanece pendente na CI do SHA integrado. Não foi executado navegador local nem presumida sua aprovação.

O contrato HTTP fica em `UniversityController::searchLessons`, e a validação do consumidor permanece em `studentText` e nos handlers de pesquisa da view. Esta correção não altera Portal, Tutor, grants, CSRF, throttling, schema ou release gates; não autoriza merge ou implantação.

## Integração C145–C146

O coordenador integrou as duas correções sobre o SHA `33e89a34c6fabc22df63e968a164589caf377479`. A suíte Node principal completa passou na combinação, incluindo os 21 cenários do editor e os 34 cenários anteriores de busca. Não foi necessário alterar extratores, expectativas antigas ou fixtures. Sintaxe dos dois módulos, diff e a cerca dos mesmos 15 caminhos de escrita também passaram. Revisões independentes conferiram produção, ensaios e documentação.

A CI integrada ainda precisa executar os quatro métodos Feature preparados para os limites editoriais e as 15 verificações Chromium adicionais (12 editoriais, três de busca), além dos percursos anteriores. Nenhum resultado de runtime é presumido nesta preparação. A base C144 já concluiu seis jobs com 400 testes PHP/5.325 asserções, 837 verificações sintéticas e 259 no Laravel real; as quatro capturas de orientações da base foram examinadas. A PR continua em rascunho, sem merge ou implantação, e os 13 gates operacionais permanecem `HOLD_NO_GO`/`NOT_VERIFIED`.
