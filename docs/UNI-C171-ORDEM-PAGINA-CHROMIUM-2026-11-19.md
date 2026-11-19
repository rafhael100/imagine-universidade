# UNI C171 — Ciclo de vida correto da página de ensaio Chromium

A execução [#44479876607](https://github.com/rafhael100/imagine-universidade/actions/runs/44479876607)
teve validação principal e paridade Portal verdes; a etapa Chromium
falhou porque o teste fechou `importedPage` antes de tentar selecionar
o modo mesclagem no último cenário C170. O encerramento disparou
`Target page, context or browser has been closed`.

A remoção do `close()` prematuro deixa a página aberta até terminar
o teste de nota pendente remota. O encerramento correto ao final do
teste já existia e foi preservado. Um segundo teste aguarda mensagem
específica para evitar falso sucesso decorrente de erro anterior.
Não há exclusão de verificações nem aumento de permissões.

HOLD_NO_GO / sem merge, deploy, login ou autorização real.
