# UNI C-29 — proteção contra requisições de edição fora de ordem

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

O painel editorial poderia exibir as aulas do curso anterior quando o administrador mudava rapidamente entre cursos: duas respostas HTTP podiam chegar em ordem diferente. Agora refreshLessons usa token monotônico e ID do curso capturados antes do fetch. Resposta de curso antigo, seleção alterada e revogação são ignoradas. refreshCourses adota token próprio, e nova seleção invalida requisições anteriores. Funções que modificam o DOM verificam a revogação antes de reativar controles.

O teste de contrato Node simula duas requisições invertidas e uma resposta após revogação; valida que apenas aulas do curso atual permanecem em estado. Isso ainda exige ensaio manual de navegador e integridade da autorização server-side. Nenhuma permissão, tabela, login ou deploy foi criado.
