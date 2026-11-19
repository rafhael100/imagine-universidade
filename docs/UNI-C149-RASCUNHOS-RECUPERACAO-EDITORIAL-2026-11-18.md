# UNI C149 — Preservar rascunhos quando a recuperação editorial falha

## Problema confirmado

Depois de uma gravação sem confirmação, o editor mantém os campos e pede
consulta manual. Se essa consulta falhava no catálogo ou na lista de aulas,
`loadAdminCatalog()` apagava os dois formulários enquanto a alteração ainda
estava incerta. A leitura parcial também podia substituir o título do curso
antes de falhar ao carregar as aulas.

O caso foi reproduzido executando os handlers reais da view com HTTP e DOM
sintéticos. A regressão nova falha no código anterior `4d0c2fb4` e passa com a
correção.

## Comportamento

A confirmação da consulta permite substituir os campos por uma leitura
completa e válida. A recuperação agora captura os onze campos literais,
seleção e filtro de aulas antes dessa leitura.

- Falha HTTP, JSON inválido, envelope incompleto ou interrupção de rede em
  qualquer uma das duas leituras preserva os campos, inclusive espaços,
  quebras de linha e caracteres Unicode.
- Os campos ficam desabilitados e identificados como não confirmados. As
  listas são esvaziadas e `catalogReady` e `lessonsReady` continuam falsos.
  Conservar o buffer não concede autoridade para gravar, publicar ou navegar.
- Repetir ou cancelar a consulta não repete POST, PATCH ou DELETE. Uma
  recuperação completa aceita substitui os campos pelo estado autorizado do
  servidor; curso removido não reaparece por causa do buffer.
- Revogação 403, sessão expirada 419 e respostas tardias após negação continuam
  apagando os dados privados. O snapshot não é restaurado nesse caso.

O aviso de falha explica que os campos foram mantidos e pede nova consulta,
sem atribuir a operação anterior a sucesso ou falha definitivos.

## Verificação

- `node scripts/check-editorial-write-receipts.mjs`: **42 cenários aprovados**,
  incluindo treze novos casos de recuperação. O harness passou a conferir os
  onze campos, inclusive Para quem e Conhecimentos úteis.
- O checker completo de UI passou após a integração dos helpers C147.
- Revisão independente verificou o ramo de aula já selecionada, mudança
  concorrente do curso para publicado e JSON tardio após revogação, sem
  restauração de autoridade.
- O módulo Chromium existente recebeu quatorze verificações de falha de
  recuperação, recuperação válida e negação. Sintaxe validada localmente;
  execução de navegador depende da CI do commit integrado.

Não há mudança de backend, migração, permissão, retenção ou endpoint. O estado
operacional continua em `HOLD_NO_GO`; esta correção não representa merge,
implantação ou aceite editorial do acervo.
