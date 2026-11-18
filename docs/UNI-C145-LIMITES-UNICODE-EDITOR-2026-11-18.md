# C145 — limites Unicode consistentes no editor

**Data:** 18/11/2026 · **Base:** `33e89a3`, com C144.

## Defeito corrigido

O editor contava unidades UTF-16 ao receber títulos, resumos e corpos de
aulas. Assim, 101 caracteres `🧭` no título, 251 no resumo ou 15.001 no corpo
ultrapassavam, respectivamente, os limites JavaScript de 200, 500 e 30.000,
embora o texto ainda estivesse dentro dos limites Unicode do contrato HTTP.
Os campos HTML também impunham `maxlength` nessa unidade. A prévia local
cortava o corpo com `slice(0,30000)`, perdendo parte de uma aula válida.

A correção está em `resources/views/university/admin.blade.php`. Os limites
existentes de `UniversityController::createCourse`, `updateCourse`,
`createLesson` e `updateLesson` permanecem os mesmos; nenhum endpoint, payload,
grant, regra de publicação ou dado persistido foi alterado.

## Leitura, envio e prévia

| Texto | Leitura editorial | Envio e prévia local |
| --- | --- | --- |
| Título de curso ou aula | String não branca, até 200 codepoints | De 3 a 200 codepoints |
| Descrição curta | `null` ou string de até 500 codepoints | Opcional, até 500 codepoints |
| Corpo da aula | String de até 30.000 codepoints; vazio continua aceito na consulta | De 10 a 30.000 codepoints |

As contagens usam `Array.from(text).length`, sem normalizar ou truncar texto.
Contam codepoints Unicode, conforme o contrato de tamanho adotado, e não
agrupamentos visuais de caracteres. Nos parsers, a verificação rápida de
unidades UTF-16 só rejeita strings maiores que duas vezes o máximo, antes
da contagem exata. Nenhum texto válido é excluído por esse atalho.

Os mínimos de leitura anteriores foram preservados. Um título curto ou um
corpo vazio já recebido não torna a lista indisponível por uma nova regra;
os mínimos HTTP são aplicados quando a pessoa tenta salvar ou abrir a prévia.
Uma resposta com qualquer item acima do máximo continua sendo rejeitada por
inteiro, sem lista parcial ou texto cortado.

Foram removidos somente os atributos de comprimento de `#course-title`,
`#course-summary`, `#lesson-title` e `#lesson-body`. Os campos obrigatórios
continuam com `required`; identificadores ASCII mantêm seus limites e pattern.
As orientações opcionais da C144 já tinham validação Unicode e permanecem
inalteradas.

Antes de `beginWrite()`, os handlers reais de criação e edição validam os
textos. Um valor inválido mostra o limite, recebe foco e mantém os onze campos
literais dos dois formulários. Não há HTTP, gravação pendente, resultado
incerto ou tentativa automática. O tratamento anterior de espaços externos
na composição dos payloads foi preservado; a validação não modifica o buffer.

`showLessonPreview()` aplica os mesmos limites de título e corpo.
`previewLessonParts()` deixou de fazer o corte fixo e continua separando as
seções pelo formato existente. A renderização permanece textual, sem HTML.
O leitor de versões arquivadas já validava por codepoints e mostrava o corpo
inteiro; não precisou de mudança. Uma regressão cobre também esse caminho.

## Evidência executada localmente

O harness existente `scripts/check-editorial-course-context.mjs` executa o
script completo e os handlers reais, com DOM, diálogos e HTTP sintéticos.
**21 cenários passaram:** os 16 anteriores foram preservados e cinco cenários
focais foram acrescentados. A cobertura nova verifica os limites de leitura,
POST/PATCH nos máximos e mínimos, rejeição de excedentes e mínimos inválidos,
foco, ausência de HTTP, preservação literal dos formulários e prévias local
e arquivada com 30.000 codepoints até o marcador final `<b>FIM</b>`.

O cenário anterior de resposta incerta foi reforçado com título e resumo
Unicode máximos: os buffers permanecem intactos até a recuperação manual,
que aceita os textos completos na releitura autorizada.

`node scripts/check-ui-contract.mjs` passou integralmente, incluindo os
checkers existentes de rascunhos, prévia, arquivo, ordenação, recibos,
preflight e revogação. `git diff --check` passou. A revisão independente
releu o núcleo e o focal e executou os 21 cenários sem encontrar bloqueadores.

## Ensaios preparados e integração

As frentes paralelas prepararam quatro métodos Feature HTTP em
`tests/Feature/EditorialUnicodeTextFlowTest.php` e estenderam o módulo
`scripts/qa-browser-editorial-course-context.cjs` de 13 para 25 verificações.
O delta do módulo foi lido em conjunto com a produção, sem bloqueador de
integração. PHP e navegador não foram executados localmente; a aprovação
desses ensaios depende da CI.

Esta frente altera somente a view editorial, o focal existente e este
documento. Não há helper global novo, dependência adicional para extratores
ou adaptação necessária de fixtures legadas. `previewLessonParts()` continua
executável isoladamente pelo checker principal. Backend, runner, workflows,
view do aluno e módulo de navegador permanecem sob as outras frentes.

Não houve stage, commit, push, implantação ou alteração de gates nesta frente.

## Integração C145–C146

O coordenador integrou as duas correções sobre o SHA `33e89a34c6fabc22df63e968a164589caf377479`. A suíte Node principal completa passou na combinação, incluindo os 21 cenários do editor e os 34 cenários anteriores de busca. Não foi necessário alterar extratores, expectativas antigas ou fixtures. Sintaxe dos dois módulos, diff e a cerca dos mesmos 15 caminhos de escrita também passaram. Revisões independentes conferiram produção, ensaios e documentação.

A CI integrada ainda precisa executar os quatro métodos Feature preparados para os limites editoriais e as 15 verificações Chromium adicionais (12 editoriais, três de busca), além dos percursos anteriores. Nenhum resultado de runtime é presumido nesta preparação. A base C144 já concluiu seis jobs com 400 testes PHP/5.325 asserções, 837 verificações sintéticas e 259 no Laravel real; as quatro capturas de orientações da base foram examinadas. A PR continua em rascunho, sem merge ou implantação, e os 13 gates operacionais permanecem `HOLD_NO_GO`/`NOT_VERIFIED`.
