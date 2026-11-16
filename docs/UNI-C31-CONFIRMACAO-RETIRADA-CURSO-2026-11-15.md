# UNI C-31 — confirmação de retirada do ar e histórico de progresso

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

A publicação cria versões editoriais. O backend ao retirar um curso do ar arquiva a versão anterior e cria novo rascunho com IDs de aulas diferentes. O histórico anterior não é apagado, mas as conclusões da nova versão não são herdadas automaticamente. A UI administrativa agora informa isso claramente e exige confirmação antes da requisição de despublicação. O ID do curso é capturado antes da confirmação e revisto ao retomá-la para evitar operar no curso errado. Se o editor navegar para outro curso durante a operação, a atualização posterior preserva a seleção atual.

O contrato de UI Node testa a função pura de mensagem, a presença da confirmação e o uso do ID capturado. Esta etapa não altera a política de progressos, não faz migração de dados nem publica conteúdo. A homologação ainda precisa de testes no navegador e validação editorial independente.
