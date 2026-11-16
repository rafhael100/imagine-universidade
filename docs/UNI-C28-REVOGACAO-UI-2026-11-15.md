# UNI C-28 — Limpeza de tela após revogação HTTP

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

Em HTTP 403 ou 419, a área do aluno limpa cursos, aulas, progresso e seleção, invalida respostas antigas e desabilita filtros e busca. A área administrativa elimina cursos/aulas em memória, apaga os campos do editor e desabilita controles de publicação. Ambas rejeitam novos pedidos HTTP nesta sessão sem renovar credenciais; o usuário deve voltar ao Portal.

O contrato Node testa invariantes de código e a sintaxe de ambas as views. As verificações ainda não substituem testes de navegador, revogação real e homologação com o Portal. O backend continua sendo a autoridade final. A implementação padrão UnavailablePortalAuthority segue negando todos os acessos. Sem merge, deploy ou dados reais.
