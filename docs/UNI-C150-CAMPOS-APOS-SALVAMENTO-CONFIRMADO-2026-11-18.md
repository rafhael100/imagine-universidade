# UNI C-150 — Manter os campos quando a leitura após salvar falha

## Problema reproduzido

Depois de receber um recibo válido de criação ou edição, o editor consulta o
catálogo e as aulas para apresentar o estado salvo. `refreshLessons` limpava
o formulário antes de concluir essa leitura. Se a consulta falhasse, o painel
mantinha o bloqueio de novas gravações, mas perdia os campos visíveis da aula
e sua seleção. Uma edição de curso também podia preencher parcialmente o
formulário e depois falhar na consulta de aulas.

A reprodução executou os handlers reais da view com um servidor sintético que
efetivamente atualiza seus registros antes de emitir o recibo correto. O texto
salvo permaneceu no servidor. Portanto, esta correção trata da perda do buffer
visível e da orientação de recuperação; não demonstra perda permanente de
conteúdo no banco. O rascunho independente do curso já era preservado durante
o salvamento de uma aula.

## Comportamento corrigido

- Os quatro caminhos de salvamento — criar/editar curso e criar/editar aula —
  ativam a preservação somente depois de validar o respectivo recibo.
- A captura exige a gravação ainda em andamento (`writePending`) e a opção
  explícita da consulta após salvar. Navegação comum, publicação, retirada e
  exclusão confirmada não ativam esse comportamento.
- Se o catálogo ou sua lista de aulas falhar por HTTP, conexão, JSON inválido
  ou resposta incompleta, os onze campos literais, a seleção anterior e o
  filtro local são restaurados como buffers desabilitados.
- As listas são invalidadas; prontidão, novas gravações e publicação continuam
  bloqueadas. A operação não é repetida. Somente uma nova consulta manual pode
  substituir os campos e restabelecer a edição.
- A mensagem e o diálogo informam que o salvamento foi confirmado e a
  atualização da tela falhou. A distinção permanece quando outra consulta
  manual falha. Nova escrita, recuperação completa e revogação limpam essa
  indicação.
- Os helpers de captura e restauração também atendem à recuperação C149,
  preservando o tratamento anterior de recibos incertos.

Um curso ou uma aula ausente em uma resposta completa válida permanece
ausente. A preservação não reconstrói recursos excluídos. O ID de uma criação
confirmada é guardado separadamente dos buffers como alvo da próxima consulta;
nenhum objeto ou baseline é construído a partir do recibo. A recuperação só
seleciona o curso ou a aula criada depois de encontrá-los nas listas frescas
validadas. A ausência válida do alvo limpa a seleção normalmente.

403/419 sempre limpam os dados privados. Respostas JSON tardias não restauram
o snapshot após a perda de acesso. A restauração confere a geração da consulta
e não altera o tratamento global de conflitos de ordem editorial.

## Verificação

`scripts/check-editorial-write-receipts.mjs` executou **74 cenários**, sendo
32 adicionais sobre a candidata C149. Os novos cenários cobrem os quatro
salvamentos, falha de cada etapa, campos literais e aula selecionada, conteúdo
efetivamente salvo no fixture, cancelamento e repetição da consulta manual,
ausência válida de curso/aula, revogação e JSON tardio. Confirmam também que
exclusão confirmada e leitura comum mantêm a limpeza anterior.

O módulo `scripts/qa-browser-editorial-write-receipts.cjs` prepara mais
**18 verificações em Chromium**, incluindo as entradas e os cliques reais da
interface. Seus recibos válidos correspondem a alterações no fixture;
nenhuma resposta sintética é apresentada como integração operacional.

Executados nesta edição: checker focal, suíte Node principal, verificação de
sintaxe do módulo Chromium e `git diff --check`. A execução do módulo Chromium
fica a cargo do runner de CI existente; seus guards não foram contornados.

Não há alteração de endpoint, schema, permissões, dependências ou política de
retenção. Esta entrega não realiza merge, deploy, publicação ou alteração da
VPS e não modifica os gates operacionais.
